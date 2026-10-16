import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';

// Real numbers for the landing page. Nothing here is made up or rounded up.
export async function GET() {
  try {
    const [u] = await sql`select
        count(*) filter (where role = 'pro')::int as businesses,
        count(*) filter (where role in ('pro', 'client'))::int as users,
        count(distinct country) filter (where country is not null and country <> '')::int as countries
      from users where coalesce(suspended, false) = false`;
    const [s] = await sql`select count(*)::int as live_sites from sites where published`;
    const [b] = await sql`select
        count(*)::int as bookings,
        count(*) filter (where (created_at at time zone 'Europe/London')::date = (now() at time zone 'Europe/London')::date)::int as today
      from site_bookings`;
    return NextResponse.json(
      { ok: true, businesses: u.businesses, users: u.users, countries: u.countries, liveSites: s.live_sites, bookings: b.bookings, today: b.today },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } }
    );
  } catch (e) {
    console.error('PUBLIC_STATS_FAULT:', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
