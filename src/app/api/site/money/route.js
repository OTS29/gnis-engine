import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession, isOwnerRole } from '@/lib/session';

export const runtime = 'nodejs';

// "What did I earn?" Numbers come straight from the owner's bookings and gift cards.
export async function GET(req) {
  try {
    const s = getSession(req);
    if (!isOwnerRole(s)) return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 401 });
    const [site] = await sql`select id from sites where owner_id::text = ${String(s.userId)}`;
    if (!site) return NextResponse.json({ ok: true, data: null });
    const fee = Math.max(0, Number(process.env.PLATFORM_FEE_PERCENT ?? 3)) || 0;
    const [m] = await sql`select
        coalesce(sum(price) filter (where lower(status) = 'completed' and date::date >= date_trunc('month', (now() at time zone 'Europe/London'))::date), 0)::float8 as month_earned,
        coalesce(sum(price) filter (where lower(status) = 'completed' and date::date >= date_trunc('month', (now() at time zone 'Europe/London'))::date - interval '1 month' and date::date < date_trunc('month', (now() at time zone 'Europe/London'))::date), 0)::float8 as last_month_earned,
        coalesce(sum(price) filter (where lower(status) = 'completed' and date::date >= (now() at time zone 'Europe/London')::date - 30), 0)::float8 as d30_earned,
        count(*) filter (where lower(status) = 'completed' and date::date >= (now() at time zone 'Europe/London')::date - 30)::int as d30_visits,
        coalesce(sum(price) filter (where lower(status) in ('pending', 'approved') and date::date >= (now() at time zone 'Europe/London')::date), 0)::float8 as upcoming,
        count(*) filter (where lower(status) in ('pending', 'approved') and date::date >= (now() at time zone 'Europe/London')::date)::int as upcoming_n,
        coalesce(sum(deposit_amount) filter (where deposit_paid and created_at >= now() - interval '30 days'), 0)::float8 as deposits30,
        coalesce(sum(price) filter (where lower(status) = 'no_show' and date::date >= (now() at time zone 'Europe/London')::date - 30), 0)::float8 as lost30,
        count(*) filter (where lower(status) = 'no_show' and date::date >= (now() at time zone 'Europe/London')::date - 30)::int as no_show30,
        coalesce(sum(gift_applied) filter (where date::date >= (now() at time zone 'Europe/London')::date - 30), 0)::float8 as gift_used30
      from site_bookings where site_id = ${site.id} and coalesce(source, 'website') <> 'import'`;
    const [g] = await sql`select coalesce(sum(amount) filter (where status = 'active' and created_at >= now() - interval '30 days'), 0)::float8 as sold30,
        coalesce(sum(balance) filter (where status = 'active'), 0)::float8 as owed
      from gift_cards where site_id = ${site.id}`;
    const top = await sql`select service, count(*)::int as n, coalesce(sum(price), 0)::float8 as total from site_bookings
      where site_id = ${site.id} and lower(status) = 'completed' and date::date >= (now() at time zone 'Europe/London')::date - 30 and coalesce(source, 'website') <> 'import'
      group by 1 order by 3 desc limit 3`;
    const online30 = m.deposits30 + g.sold30;
    return NextResponse.json({ ok: true, data: { ...m, giftSold30: g.sold30, giftOwed: g.owed, feePercent: fee, feeEstimate30: Math.round(online30 * fee) / 100, onlineCollected30: online30, topServices: top } });
  } catch (e) {
    console.error('MONEY_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Could not load' }, { status: 500 });
  }
}
