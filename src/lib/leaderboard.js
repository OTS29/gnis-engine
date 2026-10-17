import { sql } from '@/lib/db';

// Ranks businesses that chose to appear (Design tab > "Show my business in Top businesses").
// Rank is by visits marked Completed in the last 30 days, so it cannot be gamed by sign-ups alone.
// A business needs at least MIN_DONE completed visits in 30 days to appear.
export const MIN_DONE = 3;

const area = (loc) => String(loc || '').split(',').map((x) => x.trim()).filter(Boolean).slice(-2).join(', ');

export async function getTop(limit = 10) {
  const rows = await sql`
    with b as (
      select site_id, lower(trim(contact)) as k, lower(status) as st, date::date as d, created_at from site_bookings where coalesce(source, 'website') <> 'import'
    ), per as (
      select site_id, k, count(*) filter (where st = 'completed')::int as done, min(created_at) as first_seen from b group by 1, 2
    ), agg as (
      select p.site_id,
        (select count(*) from b x where x.site_id = p.site_id and x.st = 'completed' and x.d >= (now() at time zone 'Europe/London')::date - 30)::int as done30,
        count(*) filter (where p.done >= 1)::int as customers,
        count(*) filter (where p.done >= 2)::int as returning_customers,
        count(*) filter (where p.first_seen >= now() - interval '30 days')::int as new30
      from per p group by 1
    )
    select s.slug, s.data->>'businessName' as name, s.data->>'location' as location, u.skill, agg.done30, agg.customers, agg.returning_customers, agg.new30,
      (select avg(rating) from site_reviews r where r.site_id = s.id and not r.hidden)::float8 as rating,
      (select count(*) from site_reviews r where r.site_id = s.id and not r.hidden)::int as rating_n
    from agg join sites s on s.id = agg.site_id join users u on u.id::text = s.owner_id::text
    where s.published and coalesce(u.suspended, false) = false
      and coalesce((s.data->>'showInTop')::boolean, false) = true
      and agg.done30 >= ${MIN_DONE}
    order by agg.done30 desc, (agg.returning_customers::float / nullif(agg.customers, 0)) desc nulls last, agg.new30 desc
    limit ${limit}`;
  return rows.map((r, i) => ({
    rank: i + 1,
    slug: r.slug,
    name: r.name || 'Business',
    area: area(r.location),
    skill: r.skill || '',
    visits30: r.done30,
    returnRate: r.customers >= 3 ? Math.round((r.returning_customers / r.customers) * 100) : null,
    newCustomers30: r.new30,
    rating: r.rating_n >= 3 ? Math.round(r.rating * 10) / 10 : null,
  }));
}
