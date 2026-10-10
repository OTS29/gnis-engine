import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function POST(req) {
  try {
    const b = await req.json();
    const slug = String(b.slug || '');
    const code = String(b.code || '').trim();
    const action = String(b.action || 'status');

    const [staff] = /^\d{6}$/.test(code)
      ? await sql`select s.id, s.name from site_staff s join sites st on st.id = s.site_id
                  where st.slug = ${slug} and s.code = ${code} and s.active`
      : [];
    if (!staff) {
      await wait(800);
      return NextResponse.json({ ok: false, error: 'Code not recognised' }, { status: 404 });
    }

    const [open] = await sql`select id from site_shifts where staff_id = ${staff.id} and clock_out is null order by clock_in desc limit 1`;

    if (action === 'in') {
      if (open) return NextResponse.json({ ok: false, error: 'You are already clocked in' }, { status: 400 });
      await sql`insert into site_shifts (staff_id) values (${staff.id})`;
    } else if (action === 'out') {
      if (!open) return NextResponse.json({ ok: false, error: 'You are not clocked in' }, { status: 400 });
      await sql`update site_shifts set clock_out = now() where id = ${open.id}`;
    }

    const [cur] = await sql`select to_char(clock_in at time zone 'Europe/London', 'DD Mon HH24:MI') as since
      from site_shifts where staff_id = ${staff.id} and clock_out is null order by clock_in desc limit 1`;
    const recent = await sql`select to_char(clock_in at time zone 'Europe/London', 'DD Mon HH24:MI') as clock_in,
        to_char(clock_out at time zone 'Europe/London', 'HH24:MI') as clock_out,
        round((extract(epoch from (coalesce(clock_out, now()) - clock_in)) / 3600)::numeric, 2)::float8 as hours
      from site_shifts where staff_id = ${staff.id} order by clock_in desc limit 5`;
    return NextResponse.json({ ok: true, name: staff.name, clockedIn: !!cur, since: cur?.since || null, recent });
  } catch (e) {
    console.error('SITE_CLOCK_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Something went wrong' }, { status: 500 });
  }
}
