import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';
import { hit, clientIp } from '@/lib/rateLimit';
import { adsMode, isAdTester, ensureAds } from '@/lib/ads';
import { areaOf } from '@/lib/searchTerms';

export const runtime = 'nodejs';
const json = (b, s = 200) => NextResponse.json(b, { status: s, headers: { 'Cache-Control': 'private, no-store' } });

// Live adverts for the landing page. The public only ever sees adverts that were paid for and approved.
// In test mode, test adverts are shown only to the admin and testers who are logged in.
export async function GET(req) {
  try {
    const mode = adsMode();
    if (mode === 'off') return json({ ok: true, ads: [], adsOpen: false });
    await ensureAds();
    let tester = false;
    const s = getSession(req);
    if (s?.userId) {
      const [u] = await sql`select email, role from users where id::text = ${String(s.userId)}`;
      tester = isAdTester(u?.email, u?.role);
    }
    const adsOpen = mode === 'live' || tester;
    const rows = await sql`select a.id, a.headline, a.body, a.cta, a.site_slug as slug, coalesce(s.data->>'businessName', a.business_name) as business, s.data->>'location' as location
      from ad_campaigns a
      join sites s on s.slug = a.site_slug and s.published
      join users u on u.id::text = a.owner_id and coalesce(u.suspended, false) = false
      where a.status = 'live' and a.starts_at <= now() and a.ends_at > now() and (a.is_test = false or ${tester})
      order by random() limit 8`;
    return json({ ok: true, adsOpen, ads: rows.map((r) => ({ id: String(r.id), headline: r.headline, body: r.body, cta: r.cta, slug: r.slug, business: r.business || '', place: areaOf(r.location) })) });
  } catch (e) {
    console.error('PUBLIC_ADS_FAULT:', e);
    return json({ ok: true, ads: [], adsOpen: false });
  }
}

// Counts a view or a click. Rate limited so numbers cannot be pumped up easily.
export async function POST(req) {
  try {
    if (adsMode() === 'off') return json({ ok: true });
    const b = await req.json().catch(() => ({}));
    const id = Number(b.id);
    const ev = b.event === 'click' ? 'click' : 'view';
    if (!id) return json({ ok: true });
    if (!(await hit(`adev:${ev}:${id}:${clientIp(req)}`, ev === 'click' ? 5 : 20, 3600)).allowed) return json({ ok: true });
    if (ev === 'click') await sql`update ad_campaigns set clicks = clicks + 1 where id = ${id} and status = 'live'`;
    else await sql`update ad_campaigns set views = views + 1 where id = ${id} and status = 'live'`;
    return json({ ok: true });
  } catch {
    return json({ ok: true });
  }
}
