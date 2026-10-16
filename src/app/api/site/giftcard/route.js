import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { hit, clientIp } from '@/lib/rateLimit';
import { planOfUser, limitsFor } from '@/lib/plans';
import { providerForSite } from '@/lib/payments';
import { startGiftPurchase, giftBounds } from '@/lib/giftcards';

export const runtime = 'nodejs';

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());

// A visitor buys a gift card. We create a pending card and send them to the payment page.
export async function POST(req) {
  try {
    if (!(await hit(`gift:ip:${clientIp(req)}`, 8, 3600)).allowed) {
      return NextResponse.json({ ok: false, error: 'Too many requests. Please try again later.' }, { status: 429 });
    }
    const b = await req.json();
    const [site] = await sql`select id, owner_id, slug, data, stripe_account_id, stripe_ready, pay_provider, pay_account, pay_ready from sites where slug = ${String(b.slug || '')} and published`;
    if (!site || !site.data?.giftCards) return NextResponse.json({ ok: false, error: 'Gift cards are not available here.' }, { status: 404 });
    if (!limitsFor(await planOfUser(site.owner_id)).giftCards) return NextResponse.json({ ok: false, error: 'Gift cards are not available here.' }, { status: 404 });
    if (!providerForSite(site)) return NextResponse.json({ ok: false, error: 'This business cannot take card payments yet.' }, { status: 400 });

    const cur = String(site.data.currency || 'GBP').toUpperCase();
    const { min, max } = giftBounds(cur);
    const amount = Math.round((Number(b.amount) || 0) * 100) / 100;
    if (!(amount >= min && amount <= max)) return NextResponse.json({ ok: false, error: `Choose an amount between ${min} and ${max}.` }, { status: 400 });
    const buyerEmail = String(b.buyerEmail || '').trim().slice(0, 120);
    if (!isEmail(buyerEmail)) return NextResponse.json({ ok: false, error: 'Please enter your email so we can send the code.' }, { status: 400 });
    const recipientEmail = String(b.recipientEmail || '').trim().slice(0, 120);
    if (recipientEmail && !isEmail(recipientEmail)) return NextResponse.json({ ok: false, error: 'Their email does not look right.' }, { status: 400 });

    const r = await startGiftPurchase(req, site, {
      amount, buyerEmail, recipientEmail: recipientEmail || null,
      buyerName: String(b.buyerName || '').trim().slice(0, 80) || 'A friend',
      recipientName: String(b.recipientName || '').trim().slice(0, 80) || null,
      message: String(b.message || '').trim().slice(0, 300) || null,
    });
    if (r.error) return NextResponse.json({ ok: false, error: r.error }, { status: 502 });
    return NextResponse.json({ ok: true, payUrl: r.payUrl });
  } catch (e) {
    console.error('GIFT_BUY_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Could not start the purchase' }, { status: 500 });
  }
}
