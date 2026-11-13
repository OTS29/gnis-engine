import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';
import { diasporaMode, isTester } from '@/lib/diaspora';
import { ensureFamily, proStats } from '@/lib/familyDb';
import { areaOf } from '@/lib/searchTerms';

export const runtime = 'nodejs';
const out = (pros = []) => NextResponse.json({ ok: true, pros }, { headers: { 'Cache-Control': 'private, no-store' } });

// Professionals who switched on family bookings and were verified, for the landing page strip.
// Off: nothing. Test: only testers and admins who are logged in. Live: everyone.
export async function GET(req) {
  try {
    const mode = diasporaMode();
    if (mode === 'off') return out();
    if (mode === 'test') {
      const s = getSession(req);
      if (!s?.userId) return out();
      const [u] = await sql`select email, role from users where id::text = ${String(s.userId)}`;
      if (!u || !isTester(u.email, u.role)) return out();
    }
    await ensureFamily();
    const rows = await sql`select s.id::text as id, s.slug, s.data->>'businessName' as name, s.data->>'location' as location, fp.categories
      from family_pros fp join sites s on s.id::text = fp.site_id join users u on u.id::text = s.owner_id::text
      where fp.enabled and fp.status = 'verified' and s.published and coalesce(u.suspended, false) = false
        and upper(coalesce(s.data->>'currency', '')) = 'NGN'
      order by s.updated_at desc limit 8`;
    const pros = [];
    for (const r of rows) {
      const st = await proStats(r.id);
      pros.push({ slug: r.slug, name: r.name || 'Business', place: areaOf(r.location), categories: r.categories || [], trust: st.level, confirmed: st.confirmed });
    }
    return out(pros);
  } catch (e) {
    console.error('PUBLIC_FAMILY_PROS_FAULT:', e);
    return out();
  }
}
