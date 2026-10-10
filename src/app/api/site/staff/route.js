import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession, isOwnerRole } from '@/lib/session';
import crypto from 'crypto';

export const runtime = 'nodejs';

async function ownerSite(req) {
  const s = getSession(req);
  if (!isOwnerRole(s)) return null;
  const [site] = await sql`select id from sites where owner_id = ${s.userId}`;
  return site || null;
}

async function freshCode(siteId) {
  for (let i = 0; i < 20; i++) {
    const code = String(crypto.randomInt(100000, 1000000));
    const [t] = await sql`select 1 as x from site_staff where site_id = ${siteId} and code = ${code}`;
    if (!t) return code;
  }
  throw new Error('no code');
}

export async function GET(req) {
  try {
    const site = await ownerSite(req);
    if (!site) return NextResponse.json({ ok: false, error: 'Save your site first' }, { status: 401 });
    const staff = await sql`select s.id, s.name, s.code,
        (select to_char(clock_in at time zone 'Europe/London', 'YYYY-MM-DD HH24:MI') from site_shifts where staff_id = s.id and clock_out is null order by clock_in desc limit 1) as working_since,
        coalesce((select sum(extract(epoch from (coalesce(clock_out, now()) - clock_in))) / 3600 from site_shifts where staff_id = s.id and clock_in > now() - interval '7 days'), 0)::float8 as hours_7d
      from site_staff s where s.site_id = ${site.id} and s.active order by s.name`;
    const shifts = await sql`select h.id, s.name,
        to_char(h.clock_in at time zone 'Europe/London', 'YYYY-MM-DD HH24:MI') as clock_in,
        to_char(h.clock_out at time zone 'Europe/London', 'YYYY-MM-DD HH24:MI') as clock_out,
        (extract(epoch from (coalesce(h.clock_out, now()) - h.clock_in)) / 3600)::float8 as hours
      from site_shifts h join site_staff s on s.id = h.staff_id
      where s.site_id = ${site.id} order by h.clock_in desc limit 60`;
    return NextResponse.json({ ok: true, staff, shifts });
  } catch (e) {
    console.error('SITE_STAFF_GET_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Could not load staff' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const site = await ownerSite(req);
    if (!site) return NextResponse.json({ ok: false, error: 'Save your site first' }, { status: 401 });
    const { name } = await req.json();
    const clean = String(name || '').trim().slice(0, 60);
    if (!clean) return NextResponse.json({ ok: false, error: 'Enter a name' }, { status: 400 });
    const code = await freshCode(site.id);
    await sql`insert into site_staff (site_id, name, code) values (${site.id}, ${clean}, ${code})`;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error('SITE_STAFF_POST_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Could not add staff' }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const site = await ownerSite(req);
    if (!site) return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 401 });
    const { id } = await req.json();
    const code = await freshCode(site.id);
    await sql`update site_staff set code = ${code} where id = ${id} and site_id = ${site.id}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('SITE_STAFF_PATCH_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Could not change code' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const site = await ownerSite(req);
    if (!site) return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 401 });
    const { id } = await req.json();
    await sql`update site_staff set active = false where id = ${id} and site_id = ${site.id}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('SITE_STAFF_DELETE_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Could not remove staff' }, { status: 500 });
  }
}
