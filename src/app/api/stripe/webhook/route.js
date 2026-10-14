import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getStripe } from '@/lib/stripe';
import { settlePlan } from '@/lib/billing';

export const runtime = 'nodejs';

export async function POST(req) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return NextResponse.json({ ok: false }, { status: 400 });
  try {
    const raw = await req.text();
    const event = stripe.webhooks.constructEvent(raw, req.headers.get('stripe-signature'), secret);
    const o = event.data.object;

    if (event.type === 'checkout.session.completed') {
      if (o.metadata?.order_id) await sql`update site_orders set status = 'paid' where id = ${o.metadata.order_id}`;
      if (o.metadata?.kind === 'plan' && o.metadata?.ref) await settlePlan(o.metadata.ref, 'stripe', { trusted: true, subId: o.subscription || null });
    }

    // Renewals: set the plan expiry to the end of the period Stripe just billed.
    if (event.type === 'invoice.paid') {
      const subId = o.subscription || o.parent?.subscription_details?.subscription;
      const end = o.lines?.data?.[0]?.period?.end;
      if (subId && end) await sql`update seller_plans set expires_at = to_timestamp(${end}), status = 'active', updated_at = now() where stripe_subscription_id = ${subId}`;
    }
    if (event.type === 'customer.subscription.deleted') {
      await sql`update seller_plans set status = 'canceled', updated_at = now() where stripe_subscription_id = ${o.id}`;
    }
    return NextResponse.json({ received: true });
  } catch (e) {
    console.error('STRIPE_WEBHOOK_FAULT:', e);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
