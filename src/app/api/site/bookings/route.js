import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession, isOwnerRole } from '@/lib/session';
import { BOOKING_STATUSES } from '@/lib/siteDefaults';

export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const s = getSession(req);
    if (!isOwnerRole(s)) return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 401 });
    const rows = await sql`select b.id, b.customer, b.contact, b.service, b.price::float8 as price,
        b.list_price::float8 as list_price, coalesce(b.source, 'website') as source,
        b.date::text as date, left(b.time::text, 5) as time, lower(b.status) as status,
        to_char(b.created_at at time zone 'Europe/London', 'YYYY-MM-DD HH24:MI') as created
      from site_bookings b join sites st on st.id = b.site_id
      where st.owner_id = ${s.userId} order by b.created_at desc limit 500`;
    return NextResponse.json({ ok: true, data: rows });
  } catch (e) {
    console.error('SITE_BOOKINGS_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Could not load bookings' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const s = getSession(req);
    if (!isOwnerRole(s)) return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 401 });
    const { id, status } = await req.json();
    if (!BOOKING_STATUSES.includes(status)) return NextResponse.json({ ok: false, error: 'Bad status' }, { status: 400 });
    await sql`update site_bookings set status = ${status}
      where id = ${id} and site_id in (select id from sites where owner_id = ${s.userId})`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('SITE_BOOKINGS_PUT_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Update failed' }, { status: 500 });
  }
}
