import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getStripe, baseUrl } from '@/lib/stripe';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const b = await req.json();
    const slug = String(b.slug || '');
    const customer = String(b.customer || '').trim().slice(0, 80);
    const contact = String(b.contact || '').trim().slice(0, 120);
    if (!customer || !contact) return NextResponse.json({ ok: false, error: 'Please add your name and contact' }, { status: 400 });

    const [site] = await sql`select id, data, stripe_account_id, stripe_ready from sites where slug = ${slug} and published`;
    if (!site) return NextResponse.json({ ok: false, error: 'Shop not found' }, { status: 404 });

    const products = site.data?.products || [];
    const lines = [];
    for (const it of Array.isArray(b.items) ? b.items.slice(0, 30) : []) {
      const p = products.find((x) => x.name === it.name);
      const qty = Math.min(20, Math.max(1, parseInt(it.qty, 10) || 1));
      if (p) lines.push({ name: p.name, price: Number(p.price) || 0, qty });
    }
    if (!lines.length) return NextResponse.json({ ok: false, error: 'Your cart is empty' }, { status: 400 });
    const total = Math.round(lines.reduce((t, l) => t + l.price * l.qty, 0) * 100) / 100;

    const [order] = await sql`insert into site_orders (site_id, customer, contact, items, total, status)
      values (${site.id}, ${customer}, ${contact}, ${JSON.stringify(lines)}::jsonb, ${total}, 'pending') returning id`;

    const stripe = getStripe();
    if (stripe && site.stripe_ready && site.stripe_account_id && total >= 0.5) {
      const pct = Math.min(20, Math.max(0, Number(process.env.PLATFORM_FEE_PERCENT ?? 3)));
      const base = baseUrl(req);
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: lines.map((l) => ({ quantity: l.qty, price_data: { currency: 'gbp', unit_amount: Math.round(l.price * 100), product_data: { name: l.name } } })),
        payment_intent_data: {
          application_fee_amount: Math.round(total * 100 * pct / 100),
          transfer_data: { destination: site.stripe_account_id },
        },
        metadata: { order_id: String(order.id) },
        customer_email: contact.includes('@') ? contact : undefined,
        success_url: `${base}/site/${slug}?paid=1`,
        cancel_url: `${base}/site/${slug}`,
      });
      await sql`update site_orders set stripe_session_id = ${session.id} where id = ${order.id}`;
      return NextResponse.json({ ok: true, url: session.url });
    }
    return NextResponse.json({ ok: true, payInPerson: true, orderId: order.id });
  } catch (e) {
    console.error('SITE_CHECKOUT_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Checkout failed' }, { status: 500 });
  }
}
