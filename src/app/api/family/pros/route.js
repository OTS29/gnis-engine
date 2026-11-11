import { sql } from '@/lib/db';
import { guard, json } from '@/lib/familyGuard';
import { proStats } from '@/lib/familyDb';

export const runtime = 'nodejs';

// Verified professionals who accept family bookings. Optional ?slug= for one.
export async function GET(req) {
  const g = await guard(req); if (g.res) return g.res;
  const slug = new URL(req.url).searchParams.get('slug') || '';
  const rows = await sql`select s.id::text as id, s.slug, s.data->>'businessName' as name, s.data->>'tagline' as tagline, s.data->>'location' as location,
      case when jsonb_typeof(s.data->'services') = 'array' then s.data->'services' else '[]'::jsonb end as services, fp.categories
    from family_pros fp join sites s on s.id::text = fp.site_id join users u on u.id::text = s.owner_id::text
    where fp.enabled and fp.status = 'verified' and s.published and coalesce(u.suspended, false) = false
      and upper(coalesce(s.data->>'currency', '')) = 'NGN' and (${slug} = '' or s.slug = ${slug})
    order by s.updated_at desc limit 50`;
  const pros = [];
  for (const r of rows) {
    const stats = await proStats(r.id);
    pros.push({
      slug: r.slug, name: r.name, tagline: r.tagline, location: r.location, categories: r.categories,
      services: (Array.isArray(r.services) ? r.services : []).filter((x) => x && x.name && Number(x.price) > 0).map((x) => ({ name: x.name, price: Number(x.price), duration: x.duration || '' })),
      trust: stats.level, confirmed: stats.confirmed, ratingAvg: stats.ratingN ? Math.round(stats.ratingAvg * 10) / 10 : null, ratingN: stats.ratingN,
    });
  }
  return json({ ok: true, pros, fx: Number(process.env.FAMILY_FX_NGN_PER_GBP) > 0 ? Number(process.env.FAMILY_FX_NGN_PER_GBP) : null });
}
