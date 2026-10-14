import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { baseUrl } from '@/lib/stripe';
import { settleAny } from '@/lib/billing';

export const runtime = 'nodejs';

// Customers come back here from Paystack or Flutterwave. We check the payment with the provider before saying "paid".
export async function GET(req) {
  const u = new URL(req.url);
  const base = baseUrl(req);
  const slug = (u.searchParams.get('slug') || '').replace(/[^a-z0-9-]/gi, '');
  const provider = u.searchParams.get('p') === 'flutterwave' ? 'flutterwave' : 'paystack';
  const orderId = parseInt(u.searchParams.get('o') || '', 10);
  const planRef = u.searchParams.get('plan') || '';
  try {
    if (planRef) {
      const ok = await settleAny(planRef, provider);
      return NextResponse.redirect(`${base}/dashboard?tab=billing&plan=${ok ? 'done' : 'failed'}`);
    }
    if (orderId) {
      const [o] = await sql`select pay_ref from site_orders where id = ${orderId}`;
      const ok = o?.pay_ref ? await settleAny(o.pay_ref, provider) : false;
      return NextResponse.redirect(`${base}/site/${slug}${ok ? '?paid=1' : ''}`);
    }
  } catch (e) {
    console.error('PAY_RETURN_FAULT:', e);
  }
  return NextResponse.redirect(`${base}/site/${slug}`);
}
