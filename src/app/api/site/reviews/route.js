import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession, isOwnerRole } from '@/lib/session';

export const runtime = 'nodejs';

// The owner's reviews. Owners can hide a review from their page, but cannot edit what a customer wrote.
export async function GET(req) {
  try {
    const s = getSession(req);
    if (!isOwnerRole(s)) return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 401 });
    const rows = await sql`select r.id, r.customer, r.rating, r.comment, r.hidden,
        to_char(r.created_at at time zone 'Europe/London', 'YYYY-MM-DD') as created
      from site_reviews r join sites st on st.id = r.site_id
      where st.owner_id::text = ${String(s.userId)} order by r.created_at desc limit 200`;
    return NextResponse.json({ ok: true, data: rows });
  } catch (e) {
    console.error('REVIEWS_GET_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Could not load reviews' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const s = getSession(req);
    if (!isOwnerRole(s)) return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 401 });
    const b = await req.json();
    const [u] = await sql`update site_reviews r set hidden = ${!!b.hidden} from sites st
      where r.id = ${Number(b.id)} and st.id = r.site_id and st.owner_id::text = ${String(s.userId)} returning r.id`;
    if (!u) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('REVIEWS_PUT_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Update failed' }, { status: 500 });
  }
}
