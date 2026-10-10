import { NextResponse, after } from 'next/server';
import { sql } from '@/lib/db';
import { getSession, isOwnerRole } from '@/lib/session';
import { BOOKING_STATUSES } from '@/lib/siteDefaults';
import { riskFor, siteBaseRate } from '@/lib/risk';
import { notifyStatus } from '@/lib/notify';

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
    const hist = await sql`select lower(b.contact) as c,
        count(*) filter (where lower(b.status) = 'no_show')::int as no_show,
        count(*) filter (where lower(b.status) = 'cancelled')::int as cancelled,
        count(*) filter (where lower(b.status) in ('completed', 'approved'))::int as completed
      from site_bookings b join sites st on st.id = b.site_id where st.owner_id = ${s.userId} group by 1`;
    const map = new Map(hist.map((h) => [h.c, { noShow: h.no_show, cancelled: h.cancelled, completed: h.completed }]));
    const totals = hist.reduce((t, h) => ({ completed: t.completed + h.completed, no_show: t.no_show + h.no_show }), { completed: 0, no_show: 0 });
    const base = siteBaseRate(totals);
    const data = rows.map((r) => {
      const risk = riskFor(r, map.get(String(r.contact).toLowerCase()), base);
      return { ...r, risk: ['pending', 'approved'].includes(r.status) ? risk : null };
    });
    return NextResponse.json({ ok: true, data });
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

    const [row] = await sql`select b.id, b.customer, b.contact, b.service, b.price::float8 as price,
        b.date::text as date, left(b.time::text, 5) as time, lower(b.status) as prev, st.data
      from site_bookings b join sites st on st.id = b.site_id where b.id = ${id} and st.owner_id = ${s.userId}`;
    if (!row) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

    await sql`update site_bookings set status = ${status} where id = ${id}`;
    if (row.prev !== status) {
      after(async () => {
        try { await notifyStatus({ data: row.data }, row, status); } catch (e) { console.error('NOTIFY_STATUS_FAULT:', e); }
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('SITE_BOOKINGS_PUT_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Update failed' }, { status: 500 });
  }
}
