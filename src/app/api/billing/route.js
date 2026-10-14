import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession, isOwnerRole } from '@/lib/session';
import { hit } from '@/lib/rateLimit';
import { getStripe, baseUrl } from '@/lib/stripe';
import { paystack, flutterwave, toMinor, newRef } from '@/lib/payments';
import { billingRegion, providerForRegion, priceFor, PLAN_NAMES } from '@/lib/billing';
import { REGIONS, PLANS, REGION_ORDER } from '@/lib/regions';

export const runtime = 'nodejs';

async function ctx(req, chosen) {
  const s = getSession(req);
  if (!isOwnerRole(s)) return { error: NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 401 }) };
  const [site] = await sql`select data from sites where owner_id = ${s.userId}`;
  // The seller may pick their country; otherwise we use where they are.
  const picked = REGION_ORDER.includes(String(chosen || '').toUpperCase()) ? String(chosen).toUpperCase() : null;
  const region = picked || billingRegion(req, site?.data?.currency);
  return { s, region, provider: providerForRegion(region) };
}

export async function GET(req) {
  try {
    const chosen = new URL(req.url).searchParams.get('region');
    const { s, region, provider, error } = await ctx(req, chosen);
    if (error) return error;
    const [current] = await sql`select plan, cycle, status, provider, expires_at, (expires_at > now()) as active from seller_plans where user_id = ${String(s.userId)}`;
    const prices = {};
    for (const plan of ['pro', 'biz']) prices[plan] = { monthly: priceFor(region, plan, 'monthly'), yearly: priceFor(region, plan, 'yearly') };
    return NextResponse.json({ ok: true, region, regionName: REGIONS[region].name, regions: REGION_ORDER.map((c) => ({ code: c, name: REGIONS[c].name, currency: REGIONS[c].currency })), currency: REGIONS[region].currency, provider, prices, current: current || null });
  } catch (e) {
    console.error('BILLING_GET_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Could not load billing' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const b = await req.json();
    const { s, region, provider, error } = await ctx(req, b.region);
    if (error) return error;
    if (!(await hit(`billing:${s.userId}`, 15, 3600)).allowed) return NextResponse.json({ ok: false, error: 'Too many attempts. Try again later.' }, { status: 429 });
    const plan = b.plan === 'biz' ? 'biz' : 'pro';
    const cycle = b.cycle === 'yearly' ? 'yearly' : 'monthly';
    if (!PLANS[region]) return NextResponse.json({ ok: false, error: 'Plans are not available in your region yet.' }, { status: 400 });
    if (!provider) return NextResponse.json({ ok: false, error: 'Card payments for plans are not switched on for your region yet.' }, { status: 400 });
    const price = priceFor(region, plan, cycle);
    const [u] = await sql`select email from users where id = ${s.userId}`;
    const email = u?.email || undefined;
    const base = baseUrl(req);
    const ref = newRef('p', String(s.userId).slice(0, 8));
    const label = `GNIS ${PLAN_NAMES[plan]} (${cycle})`;

    await sql`insert into plan_payments (ref, user_id, plan, cycle, currency, amount, provider, status)
      values (${ref}, ${String(s.userId)}, ${plan}, ${cycle}, ${price.currency}, ${price.amount}, ${provider}, 'pending')`;

    if (provider === 'stripe') {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ quantity: 1, price_data: { currency: price.currency.toLowerCase(), unit_amount: toMinor(price.amount), recurring: { interval: cycle === 'yearly' ? 'year' : 'month' }, product_data: { name: label } } }],
        metadata: { kind: 'plan', ref },
        customer_email: email,
        success_url: `${base}/dashboard?tab=billing&plan=done`,
        cancel_url: `${base}/dashboard?tab=billing`,
      });
      return NextResponse.json({ ok: true, url: session.url });
    }

    const back = `${base}/api/pay/return?plan=${encodeURIComponent(ref)}&p=${provider}`;
    const payer = email || `user-${String(s.userId).slice(0, 8)}@${new URL(base).hostname}`;
    if (provider === 'paystack') {
      const { j } = await paystack('POST', '/transaction/initialize', { email: payer, amount: toMinor(price.amount), currency: price.currency, reference: ref, callback_url: back, metadata: { kind: 'plan' } });
      if (j?.status && j?.data?.authorization_url) return NextResponse.json({ ok: true, url: j.data.authorization_url });
      console.error('PAYSTACK_PLAN_FAULT:', JSON.stringify(j));
    } else {
      const { j } = await flutterwave('POST', '/payments', { tx_ref: ref, amount: price.amount, currency: price.currency, redirect_url: back, customer: { email: payer }, customizations: { title: label }, meta: { kind: 'plan' } });
      if (j?.status === 'success' && j?.data?.link) return NextResponse.json({ ok: true, url: j.data.link });
      console.error('FLUTTERWAVE_PLAN_FAULT:', JSON.stringify(j));
    }
    return NextResponse.json({ ok: false, error: 'The payment provider could not start the payment. Try again shortly.' }, { status: 502 });
  } catch (e) {
    console.error('BILLING_POST_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Could not start payment' }, { status: 500 });
  }
}
