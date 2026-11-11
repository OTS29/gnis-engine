import { NextResponse } from 'next/server';
import { getStripe, baseUrl } from '@/lib/stripe';
import { adsMode, settleAd } from '@/lib/ads';

export const runtime = 'nodejs';

// Where Stripe sends the advertiser after paying. The payment is checked with Stripe itself, not trusted from the address.
export async function GET(req) {
  const base = baseUrl(req);
  try {
    if (adsMode() === 'off') return NextResponse.redirect(`${base}/dashboard`);
    const sid = new URL(req.url).searchParams.get('session_id') || '';
    const stripe = getStripe();
    if (!stripe || !/^cs_[A-Za-z0-9_]+$/.test(sid)) return NextResponse.redirect(`${base}/dashboard/ads`);
    const session = await stripe.checkout.sessions.retrieve(sid);
    if (session?.metadata?.kind === 'ad' && session.metadata.ad_id) await settleAd(session.metadata.ad_id, session);
    return NextResponse.redirect(`${base}/dashboard/ads?paid=1`);
  } catch (e) {
    console.error('ADS_CONFIRM_FAULT:', e);
    return NextResponse.redirect(`${base}/dashboard/ads`);
  }
}
