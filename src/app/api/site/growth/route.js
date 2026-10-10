import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession, isOwnerRole } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const s = getSession(req);
    if (!isOwnerRole(s)) return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 401 });
    const [site] = await sql`select id, slug, ref_code from sites where owner_id = ${s.userId}`;
    if (!site) return NextResponse.json({ ok: true, data: null });

    let code = site.ref_code;
    for (let i = 0; i < 5 && !code; i++) {
      const c = Math.random().toString(36).slice(2, 10);
      try { await sql`update sites set ref_code = ${c} where id = ${site.id} and ref_code is null`; code = c; } catch {}
    }
    const [r] = await sql`select count(*)::int as signups,
        count(*) filter (where exists (select 1 from sites x where x.owner_id::text = referee_user_id))::int as published
      from referrals where referrer_user_id = ${String(s.userId)}`;
    return NextResponse.json({ ok: true, data: { refCode: code, slug: site.slug, signups: r.signups, published: r.published } });
  } catch (e) {
    console.error('SITE_GROWTH_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Could not load growth data' }, { status: 500 });
  }
}
