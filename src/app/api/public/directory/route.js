import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';

const cleanQ = (s) => String(s || '').trim().slice(0, 60).replace(/[%_\\]/g, ' ');

// Public list of published businesses. Search by business name, service, trade or place; filter by country.
export async function GET(req) {
  try {
    const u = new URL(req.url);
    const q = cleanQ(u.searchParams.get('q'));
    const country = String(u.searchParams.get('country') || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    const page = Math.max(0, Math.min(50, parseInt(u.searchParams.get('page') || '0', 10) || 0));
    const like = `%${q}%`;

    const rows = await sql`select s.slug, s.data->>'businessName' as name, s.data->>'tagline' as tagline, s.data->>'location' as location,
        s.data->>'currency' as currency, s.data->>'hero' as hero,
        case when jsonb_typeof(s.data->'services') = 'array' then s.data->'services' else '[]'::jsonb end as services,
        u.skill, u.country,
        (select count(*) from site_bookings b where b.site_id = s.id)::int as bookings
      from sites s join users u on u.id::text = s.owner_id::text
      where s.published and coalesce(u.suspended, false) = false
        and (${country} = '' or upper(coalesce(u.country, '')) = ${country}
             or (${country} in ('GB', 'UK') and upper(coalesce(u.country, '')) in ('GB', 'UK')))
        and (${q} = '' or s.data->>'businessName' ilike ${like} or s.data->>'location' ilike ${like}
             or s.data->>'tagline' ilike ${like} or coalesce(u.skill, '') ilike ${like}
             or exists (select 1 from jsonb_array_elements(case when jsonb_typeof(s.data->'services') = 'array' then s.data->'services' else '[]'::jsonb end) sv
                        where sv->>'name' ilike ${like}))
      order by bookings desc, s.updated_at desc
      limit 13 offset ${page * 12}`;

    const hasMore = rows.length > 12;
    const items = rows.slice(0, 12).map((r) => {
      const svc = (Array.isArray(r.services) ? r.services : []).filter((x) => x && x.name);
      const prices = svc.map((x) => Number(x.price)).filter((n) => n > 0);
      return {
        slug: r.slug,
        name: r.name || 'Business',
        tagline: r.tagline || '',
        location: r.location || '',
        currency: r.currency || 'GBP',
        skill: r.skill || '',
        country: r.country || '',
        services: svc.slice(0, 3).map((x) => String(x.name)),
        fromPrice: prices.length ? Math.min(...prices) : null,
        bookings: r.bookings,
        // Only normal web images. Embedded images can be huge and are skipped here.
        hero: typeof r.hero === 'string' && /^https:\/\//i.test(r.hero) ? r.hero : '',
      };
    });

    const countries = await sql`select case when upper(u.country) = 'UK' then 'GB' else upper(u.country) end as code, count(*)::int as n
      from sites s join users u on u.id::text = s.owner_id::text
      where s.published and coalesce(u.suspended, false) = false and u.country is not null and u.country <> ''
      group by 1 order by 2 desc limit 20`;

    return NextResponse.json({ ok: true, items, hasMore, countries }, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } });
  } catch (e) {
    console.error('PUBLIC_DIRECTORY_FAULT:', e);
    return NextResponse.json({ ok: false, items: [], countries: [] }, { status: 500 });
  }
}
