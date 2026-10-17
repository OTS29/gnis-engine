import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { sameOrigin } from '@/lib/security';
import { getSession, isOwnerRole } from '@/lib/session';

export const runtime = 'nodejs';

// Your customers, built from your bookings. Notes and "do not remind" are saved per customer.
export async function GET(req) {
  try {
    const s = getSession(req);
    if (!isOwnerRole(s)) return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 401 });
    const [site] = await sql`select id from sites where owner_id = ${s.userId}`;
    if (!site) return NextResponse.json({ ok: true, data: [] });
    const rows = await sql`select lower(trim(b.contact)) as k,
        (array_agg(b.customer order by b.created_at desc))[1] as name,
        (array_agg(b.contact order by b.created_at desc))[1] as contact,
        count(*)::int as bookings,
        count(*) filter (where lower(b.status) = 'completed')::int as completed,
        count(*) filter (where lower(b.status) = 'no_show')::int as no_shows,
        coalesce(sum(b.price) filter (where lower(b.status) = 'completed'), 0)::float8 as spent,
        max(b.date::text) filter (where lower(b.status) = 'completed') as last_visit,
        min(b.date::text) filter (where lower(b.status) in ('pending', 'approved') and b.date::date >= (now() at time zone 'Europe/London')::date) as next_booking,
        (array_agg(b.service order by b.date desc))[1] as last_service,
        coalesce(max(sc.notes), '') as notes, coalesce(bool_or(sc.rebook_optout), false) as optout,
        max(sc.last_rebook_at)::text as last_rebook
      from site_bookings b
      left join site_customers sc on sc.site_id = b.site_id and sc.contact_key = lower(trim(b.contact))
      where b.site_id = ${site.id} group by 1 order by max(b.created_at) desc limit 1000`;
    return NextResponse.json({ ok: true, data: rows });
  } catch (e) {
    console.error('CUSTOMERS_GET_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Could not load customers' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    if (!sameOrigin(req)) return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 403 });
    const s = getSession(req);
    if (!isOwnerRole(s)) return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 401 });
    const b = await req.json();
    const key = String(b.key || '').trim().toLowerCase().slice(0, 120);
    if (!key) return NextResponse.json({ ok: false, error: 'Missing customer' }, { status: 400 });
    const [site] = await sql`select id from sites where owner_id = ${s.userId}`;
    if (!site) return NextResponse.json({ ok: false, error: 'No site' }, { status: 404 });
    const [known] = await sql`select 1 as x from site_bookings where site_id = ${site.id} and lower(trim(contact)) = ${key} limit 1`;
    if (!known) return NextResponse.json({ ok: false, error: 'Customer not found' }, { status: 404 });
    if (typeof b.notes === 'string') {
      await sql`insert into site_customers (site_id, contact_key, notes) values (${site.id}, ${key}, ${b.notes.slice(0, 1000)})
        on conflict (site_id, contact_key) do update set notes = excluded.notes`;
    }
    if (typeof b.optout === 'boolean') {
      await sql`insert into site_customers (site_id, contact_key, rebook_optout) values (${site.id}, ${key}, ${b.optout})
        on conflict (site_id, contact_key) do update set rebook_optout = excluded.rebook_optout`;
    }
    if (b.contacted === true) {
      await sql`insert into site_customers (site_id, contact_key, last_rebook_at) values (${site.id}, ${key}, now())
        on conflict (site_id, contact_key) do update set last_rebook_at = now()`;
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('CUSTOMERS_PUT_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Could not save' }, { status: 500 });
  }
}
