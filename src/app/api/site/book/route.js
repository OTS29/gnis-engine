import { NextResponse, after } from 'next/server';
import jwt from 'jsonwebtoken';
import { sql } from '@/lib/db';
import { hit, isBlocked, clientIp } from '@/lib/rateLimit';
import { notifyNewBooking } from '@/lib/notify';
import { startDeposit } from '@/lib/deposits';
import { planOfUser, limitsFor } from '@/lib/plans';
import { normCode } from '@/lib/giftcards';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    if (!(await hit(`book:ip:${clientIp(req)}`, 10, 3600)).allowed) {
      return NextResponse.json({ ok: false, error: 'Too many requests. Please try again later.' }, { status: 429 });
    }
    const b = await req.json();
    const slug = String(b.slug || '');
    const customer = String(b.customer || '').trim().slice(0, 80);
    const contact = String(b.contact || '').trim().slice(0, 120);
    const service = String(b.service || '').trim();
    const date = String(b.date || '');
    const time = String(b.time || '');

    if (!slug || !customer || !contact || !service) {
      return NextResponse.json({ ok: false, error: 'Please fill in all fields' }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
      return NextResponse.json({ ok: false, error: 'Invalid date or time' }, { status: 400 });
    }

    const [site] = await sql`select id, owner_id, slug, data, stripe_account_id, stripe_ready, pay_provider, pay_account, pay_ready from sites where slug = ${slug} and published`;
    if (!site) return NextResponse.json({ ok: false, error: 'Site not found' }, { status: 404 });

    const match = (site.data?.services || []).find((s) => s.name === service);
    if (!match) return NextResponse.json({ ok: false, error: 'Unknown service' }, { status: 400 });

    const listPrice = Number(match.price) || 0;
    let price = listPrice;
    let source = 'website';

    // A locked price comes from a token the server signed after a successful negotiation.
    if (b.lockToken) {
      try {
        const p = jwt.verify(String(b.lockToken), process.env.JWT_SECRET);
        if (p.typ === 'lock' && p.slug === slug && p.service === match.name && Number(p.price) <= listPrice) {
          price = Number(p.price);
          source = 'negotiated';
        }
      } catch {
        return NextResponse.json({ ok: false, error: 'Your agreed price expired. Please negotiate again.' }, { status: 400 });
      }
    }

    const limits = limitsFor(await planOfUser(site.owner_id));

    // Loyalty: every Nth completed visit gets a percentage off (never combined with a negotiated price).
    let loyaltyPct = 0;
    const every = Number(site.data?.loyaltyEvery) || 0;
    if (every >= 2 && limits.loyalty && source !== 'negotiated' && price > 0) {
      const [lv] = await sql`select count(*)::int as n from site_bookings where site_id = ${site.id} and lower(trim(contact)) = ${contact.toLowerCase()} and lower(status) = 'completed'`;
      if (((lv?.n || 0) + 1) % every === 0) {
        loyaltyPct = Math.min(50, Math.max(5, Number(site.data?.loyaltyPercent) || 10));
        price = Math.round(price * (100 - loyaltyPct)) / 100;
      }
    }

    // Gift card code typed at booking: check it now, take the money off after the booking is saved.
    let card = null;
    const code = b.giftCode ? normCode(b.giftCode) : '';
    if (b.giftCode && !code) return NextResponse.json({ ok: false, error: 'That gift card code does not look right.' }, { status: 400 });
    if (code) {
      const gk = `giftfail:${site.id}:${clientIp(req)}`;
      if (await isBlocked(gk, 6)) return NextResponse.json({ ok: false, error: 'Too many wrong codes. Please try again later.' }, { status: 429 });
      [card] = await sql`select id, balance::float8 as balance, currency from gift_cards where code = ${code} and site_id = ${site.id} and status = 'active'`;
      if (!card || !(card.balance > 0)) { await hit(gk, 6, 3600); return NextResponse.json({ ok: false, error: 'That gift card was not found or has no balance left.' }, { status: 400 }); }
      if (String(card.currency).toUpperCase() !== String(site.data?.currency || 'GBP').toUpperCase()) return NextResponse.json({ ok: false, error: 'That gift card is in a different currency.' }, { status: 400 });
    }

    const [row] = await sql`insert into site_bookings (site_id, customer, contact, service, price, list_price, source, date, time, status, loyalty_applied)
              values (${site.id}, ${customer}, ${contact}, ${match.name}, ${price}, ${listPrice}, ${source}, ${date}, ${time}, 'pending', ${loyaltyPct > 0})
              returning id`;

    let giftApplied = 0;
    if (card) {
      const amt = Math.round(Math.min(card.balance, price) * 100) / 100;
      if (amt > 0) {
        // One atomic statement: the balance can never go below zero, even if two people use the code at once.
        const [u] = await sql`update gift_cards set balance = balance - ${amt}, last_used_at = now() where id = ${card.id} and status = 'active' and balance >= ${amt} returning id`;
        if (u) {
          giftApplied = amt;
          await sql`update site_bookings set gift_code = ${code}, gift_applied = ${amt} where id = ${row.id}`;
        }
      }
    }

    after(async () => {
      try { await notifyNewBooking({ data: site.data }, { id: row.id, customer, contact, service: match.name, price, date, time }); }
      catch (e) { console.error('NOTIFY_NEW_FAULT:', e); }
    });

    // Deposit: only when the seller turned it on, their plan includes it, and a payment provider is connected.
    let payUrl = null;
    const payable = Math.round((price - giftApplied) * 100) / 100;
    if (Number(site.data?.depositPercent) > 0 && payable > 0 && limits.deposits) {
      payUrl = await startDeposit(req, site, { id: row.id, price: payable, service: match.name, contact, customer });
    }
    return NextResponse.json({ ok: true, price, payUrl, giftApplied, loyaltyPct }, { status: 201 });
  } catch (e) {
    console.error('SITE_BOOK_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Booking failed' }, { status: 500 });
  }
}
