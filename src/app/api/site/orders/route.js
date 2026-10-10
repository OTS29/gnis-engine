import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession, isOwnerRole } from '@/lib/session';
import { ORDER_STATUSES } from '@/lib/siteDefaults';

export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const s = getSession(req);
    if (!isOwnerRole(s)) return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 401 });
    const rows = await sql`select o.id, o.customer, o.contact, o.items, o.total::float8 as total, o.status,
        to_char(o.created_at at time zone 'Europe/London', 'YYYY-MM-DD HH24:MI') as created
      from site_orders o join sites st on st.id = o.site_id
      where st.owner_id = ${s.userId} order by o.created_at desc limit 300`;
    return NextResponse.json({ ok: true, data: rows });
  } catch (e) {
    console.error('SITE_ORDERS_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Could not load orders' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const s = getSession(req);
    if (!isOwnerRole(s)) return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 401 });
    const { id, status } = await req.json();
    if (!ORDER_STATUSES.includes(status)) return NextResponse.json({ ok: false, error: 'Bad status' }, { status: 400 });
    await sql`update site_orders set status = ${status}
      where id = ${id} and site_id in (select id from sites where owner_id = ${s.userId})`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('SITE_ORDERS_PUT_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Update failed' }, { status: 500 });
  }
}
