import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession, isOwnerRole } from '@/lib/session';
import { getStripe, baseUrl } from '@/lib/stripe';

export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const s = getSession(req);
    if (!isOwnerRole(s)) return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 401 });
    const [site] = await sql`select id, stripe_account_id from sites where owner_id = ${s.userId}`;
    const stripe = getStripe();
    if (!site?.stripe_account_id || !stripe) return NextResponse.json({ ok: true, connected: false, ready: false, configured: !!stripe });
    const acct = await stripe.accounts.retrieve(site.stripe_account_id);
    const ready = !!(acct.charges_enabled && acct.payouts_enabled);
    await sql`update sites set stripe_ready = ${ready} where id = ${site.id}`;
    return NextResponse.json({ ok: true, connected: true, ready, configured: true });
  } catch (e) {
    console.error('SITE_STRIPE_GET_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Could not check Stripe' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const s = getSession(req);
    if (!isOwnerRole(s)) return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 401 });
    const stripe = getStripe();
    if (!stripe) return NextResponse.json({ ok: false, error: 'Stripe is not configured yet (missing STRIPE_SECRET_KEY).' }, { status: 400 });
    const [site] = await sql`select id, stripe_account_id from sites where owner_id = ${s.userId}`;
    if (!site) return NextResponse.json({ ok: false, error: 'Save your site first, then connect payouts.' }, { status: 400 });

    let account = site.stripe_account_id;
    if (!account) {
      const created = await stripe.accounts.create({
        type: 'express',
        country: 'GB',
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      });
      account = created.id;
      await sql`update sites set stripe_account_id = ${account} where id = ${site.id}`;
    }
    const base = baseUrl(req);
    const link = await stripe.accountLinks.create({
      account,
      refresh_url: `${base}/dashboard`,
      return_url: `${base}/dashboard?stripe=done`,
      type: 'account_onboarding',
    });
    return NextResponse.json({ ok: true, url: link.url });
  } catch (e) {
    console.error('SITE_STRIPE_POST_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Could not start Stripe setup. Make sure Connect is enabled in your Stripe dashboard.' }, { status: 500 });
  }
}
