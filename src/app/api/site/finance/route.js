import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession, isOwnerRole } from '@/lib/session';
import { planOfUser, limitsFor } from '@/lib/plans';
import { cleanRange, addDays, londonToday } from '@/lib/finance';

export const runtime = 'nodejs';

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Income, expenses and profit for a date range, grouped by day / week / month, with optional staff and service filters.
export async function GET(req) {
  try {
    const s = getSession(req);
    if (!isOwnerRole(s)) return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 401 });
    const [site] = await sql`select id from sites where owner_id::text = ${String(s.userId)}`;
    if (!site) return NextResponse.json({ ok: true, data: null });
    const pro = limitsFor(await planOfUser(s.userId)).finance;
    const u = new URL(req.url);
    const today = londonToday();
    // Starter plan: this month, by day, no filters, no expenses.
    const q = pro ? Object.fromEntries(u.searchParams) : { from: `${today.slice(0, 8)}01`, to: today, group: 'day' };
    const { from, to, group, span } = cleanRange(q, today);
    const staff = pro ? String(q.staff || 'all').slice(0, 60) : 'all';
    const service = pro ? String(q.service || '').slice(0, 80) : '';
    const filtered = staff !== 'all' || service !== '';

    const income = await sql`select date_trunc(${group}, b.date::date)::date::text as k, coalesce(sum(b.price), 0)::float8 as income, count(*)::int as visits
      from site_bookings b
      where b.site_id = ${site.id} and lower(b.status) = 'completed' and coalesce(b.source, 'website') <> 'import'
        and b.date::date between ${from}::date and ${to}::date
        and (${staff} = 'all' or (${staff} = 'none' and b.staff_id is null) or b.staff_id = ${staff})
        and (${service} = '' or b.service = ${service})
      group by 1 order by 1`;

    let shop = [];
    if (!filtered) {
      try {
        shop = await sql`select date_trunc(${group}, (o.created_at at time zone 'Europe/London')::date)::date::text as k, coalesce(sum(o.total), 0)::float8 as income
          from site_orders o where o.site_id = ${site.id} and lower(o.status) in ('paid', 'fulfilled')
            and (o.created_at at time zone 'Europe/London')::date between ${from}::date and ${to}::date group by 1`;
      } catch (e) { console.error('FINANCE_SHOP_FAULT:', e); }
    }

    let expenses = [];
    let expList = [];
    let byCategory = [];
    if (pro) {
      expenses = await sql`select date_trunc(${group}, spent_on)::date::text as k, coalesce(sum(amount), 0)::float8 as total from site_expenses
        where site_id = ${site.id} and spent_on between ${from}::date and ${to}::date group by 1`;
      expList = await sql`select id, spent_on::text as date, category, amount::float8 as amount, note from site_expenses
        where site_id = ${site.id} and spent_on between ${from}::date and ${to}::date order by spent_on desc, id desc limit 200`;
      byCategory = await sql`select category, coalesce(sum(amount), 0)::float8 as total from site_expenses
        where site_id = ${site.id} and spent_on between ${from}::date and ${to}::date group by 1 order by 2 desc`;
    }

    const map = new Map();
    const row = (k) => { if (!map.has(k)) map.set(k, { bucket: k, income: 0, shop: 0, expenses: 0, visits: 0 }); return map.get(k); };
    for (const x of income) { const r = row(x.k); r.income += x.income; r.visits += x.visits; }
    for (const x of shop) row(x.k).shop += x.income;
    for (const x of expenses) row(x.k).expenses += x.total;
    const series = [...map.values()].sort((a, b) => a.bucket.localeCompare(b.bucket)).map((r) => ({
      bucket: r.bucket, visits: r.visits, income: r2(r.income + r.shop), expenses: r2(r.expenses), profit: r2(r.income + r.shop - r.expenses),
    }));
    const sum = (k) => r2(series.reduce((t, x) => t + x[k], 0));
    const totals = { income: sum('income'), expenses: sum('expenses'), profit: sum('profit'), visits: series.reduce((t, x) => t + x.visits, 0) };
    totals.avg = totals.visits ? r2((totals.income) / totals.visits) : 0;

    // The period just before this one, for "up or down" comparison.
    const pTo = addDays(from, -1), pFrom = addDays(pTo, -(span - 1));
    const [pi] = await sql`select coalesce(sum(b.price), 0)::float8 as v from site_bookings b
      where b.site_id = ${site.id} and lower(b.status) = 'completed' and coalesce(b.source, 'website') <> 'import' and b.date::date between ${pFrom}::date and ${pTo}::date
        and (${staff} = 'all' or (${staff} = 'none' and b.staff_id is null) or b.staff_id = ${staff}) and (${service} = '' or b.service = ${service})`;
    let prevExp = 0;
    if (pro) { const [pe] = await sql`select coalesce(sum(amount), 0)::float8 as v from site_expenses where site_id = ${site.id} and spent_on between ${pFrom}::date and ${pTo}::date`; prevExp = pe.v; }
    const prev = { income: r2(pi.v), expenses: r2(prevExp), profit: r2(pi.v - prevExp) };

    let byStaff = [], byService = [], services = [], staffList = [];
    if (pro) {
      byStaff = await sql`select coalesce(b.staff_id, '') as id, coalesce(max(ss.name), 'Not assigned') as name, count(*)::int as visits, coalesce(sum(b.price), 0)::float8 as income
        from site_bookings b left join site_staff ss on ss.id::text = b.staff_id and ss.site_id = b.site_id
        where b.site_id = ${site.id} and lower(b.status) = 'completed' and coalesce(b.source, 'website') <> 'import' and b.date::date between ${from}::date and ${to}::date
          and (${service} = '' or b.service = ${service}) group by 1 order by 4 desc`;
      byService = await sql`select b.service, count(*)::int as visits, coalesce(sum(b.price), 0)::float8 as income from site_bookings b
        where b.site_id = ${site.id} and lower(b.status) = 'completed' and coalesce(b.source, 'website') <> 'import' and b.date::date between ${from}::date and ${to}::date
          and (${staff} = 'all' or (${staff} = 'none' and b.staff_id is null) or b.staff_id = ${staff}) group by 1 order by 3 desc limit 10`;
      services = (await sql`select distinct service from site_bookings where site_id = ${site.id} order by 1 limit 60`).map((x) => x.service);
      staffList = await sql`select id::text as id, name from site_staff where site_id = ${site.id} and active order by name`;
    }
    return NextResponse.json({ ok: true, data: { pro, from, to, group, staff, service, filtered, series, totals, prev, byStaff, byService, byCategory, expenses: expList, services, staffList } });
  } catch (e) {
    console.error('FINANCE_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Could not load' }, { status: 500 });
  }
}
