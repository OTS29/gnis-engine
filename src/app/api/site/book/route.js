import { NextResponse, after } from 'next/server';
import jwt from 'jsonwebtoken';
import { sql } from '@/lib/db';
import { hit, clientIp } from '@/lib/rateLimit';
import { notifyNewBooking } from '@/lib/notify';
import { startDeposit } from '@/lib/deposits';
import { planOfUser, limitsFor } from '@/lib/plans';

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

    const [row] = await sql`insert into site_bookings (site_id, customer, contact, service, price, list_price, source, date, time, status)
              values (${site.id}, ${customer}, ${contact}, ${match.name}, ${price}, ${listPrice}, ${source}, ${date}, ${time}, 'pending')
              returning id`;

    after(async () => {
      try { await notifyNewBooking({ data: site.data }, { id: row.id, customer, contact, service: match.name, price, date, time }); }
      catch (e) { console.error('NOTIFY_NEW_FAULT:', e); }
    });

    // Deposit: only when the seller turned it on, their plan includes it, and a payment provider is connected.
    let payUrl = null;
    if (Number(site.data?.depositPercent) > 0 && price > 0 && limitsFor(await planOfUser(site.owner_id)).deposits) {
      payUrl = await startDeposit(req, site, { id: row.id, price, service: match.name, contact, customer });
    }
    return NextResponse.json({ ok: true, price, payUrl }, { status: 201 });
  } catch (e) {
    console.error('SITE_BOOK_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Booking failed' }, { status: 500 });
  }
}
