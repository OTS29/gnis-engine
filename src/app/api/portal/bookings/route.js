import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { liveSession } from '@/lib/session';

export const runtime = 'nodejs';

// A signed-in client sees bookings and orders made with their own email address.
export async function GET(req) {
  try {
    const s = await liveSession(req);
    if (!s || !s.userId) return NextResponse.json({ ok: false, error: 'Please log in' }, { status: 401 });
    const [u] = await sql`select email, name from users where id = ${s.userId}`;
    const email = String(u?.email || '').trim().toLowerCase();
    if (!email) return NextResponse.json({ ok: true, name: u?.name || '', email: '', bookings: [], orders: [] });

    const bookings = await sql`
      select b.id, b.customer, b.service, b.price, b.date, b.time, b.status,
             s.slug, s.data->>'businessName' as business
      from site_bookings b join sites s on s.id = b.site_id
      where lower(trim(b.contact)) = ${email}
      order by b.date desc, b.time desc limit 100`;
    const orders = await sql`
      select o.id, o.items, o.total, o.status,
             s.slug, s.data->>'businessName' as business, s.data->>'currency' as currency
      from site_orders o join sites s on s.id = o.site_id
      where lower(trim(o.contact)) = ${email}
      order by o.id desc limit 100`;
    return NextResponse.json({ ok: true, name: u?.name || '', email, bookings, orders });
  } catch (e) {
    console.error('PORTAL_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Could not load your bookings' }, { status: 500 });
  }
}
