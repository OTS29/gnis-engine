import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getStripe } from '@/lib/stripe';

export const runtime = 'nodejs';

export async function POST(req) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return NextResponse.json({ ok: false }, { status: 400 });
  try {
    const raw = await req.text();
    const event = stripe.webhooks.constructEvent(raw, req.headers.get('stripe-signature'), secret);
    if (event.type === 'checkout.session.completed') {
      const orderId = event.data.object.metadata?.order_id;
      if (orderId) await sql`update site_orders set status = 'paid' where id = ${orderId}`;
    }
    return NextResponse.json({ received: true });
  } catch (e) {
    console.error('STRIPE_WEBHOOK_FAULT:', e);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
