import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession, isOwnerRole } from '@/lib/session';

export const runtime = 'nodejs';

const niceRound = (n) => (n >= 20 ? Math.round(n) : Math.round(n * 2) / 2);

export async function GET(req) {
  try {
    const s = getSession(req);
    if (!isOwnerRole(s)) return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 401 });
    const [site] = await sql`select id, data from sites where owner_id = ${s.userId}`;
    if (!site) return NextResponse.json({ ok: true, data: null });
    const id = site.id;

    const [views, bk, ord, daily, rep, busy, perService, neg, statuses] = await Promise.all([
      sql`select count(*)::int as views, count(distinct visitor)::int as visitors from site_views where site_id = ${id} and viewed_at > now() - interval '30 days'`,
      sql`select count(*)::int as n, coalesce(sum(price) filter (where lower(status) in ('approved','completed')), 0)::float8 as revenue
          from site_bookings where site_id = ${id} and created_at > now() - interval '30 days'`,
      sql`select count(*)::int as n, coalesce(sum(total) filter (where status in ('paid','fulfilled')), 0)::float8 as revenue
          from site_orders where site_id = ${id} and created_at > now() - interval '30 days'`,
      sql`select to_char(d::date, 'DD Mon') as day,
            (coalesce(b.rev, 0) + coalesce(o.rev, 0))::float8 as revenue, coalesce(b.n, 0)::int as bookings
          from generate_series(current_date - 29, current_date, interval '1 day') d
          left join (select created_at::date as day, sum(price) filter (where lower(status) in ('approved','completed')) as rev, count(*) as n
                     from site_bookings where site_id = ${id} group by 1) b on b.day = d::date
          left join (select created_at::date as day, sum(total) filter (where status in ('paid','fulfilled')) as rev
                     from site_orders where site_id = ${id} group by 1) o on o.day = d::date
          order by d`,
      sql`select count(*)::int as customers, count(*) filter (where n > 1)::int as repeaters
          from (select lower(contact) as c, count(*) as n from site_bookings where site_id = ${id} and lower(status) <> 'cancelled' group by 1) x`,
      sql`select extract(dow from date::date)::int as dow, extract(hour from time::time)::int as hr, count(*)::int as n
          from site_bookings where site_id = ${id} and lower(status) <> 'cancelled' group by 1, 2`,
      sql`select service, count(*) filter (where created_at > now() - interval '30 days')::int as n30,
            count(*)::int as n_all, coalesce(sum(price) filter (where lower(status) in ('approved','completed')), 0)::float8 as revenue
          from site_bookings where site_id = ${id} and lower(status) <> 'cancelled' group by service`,
      sql`select count(*) filter (where source = 'negotiated')::int as n, count(*)::int as total,
            coalesce(avg((list_price - price) / nullif(list_price, 0)) filter (where source = 'negotiated'), 0)::float8 as avg_discount
          from site_bookings where site_id = ${id} and lower(status) <> 'cancelled'`,
      sql`select lower(status) as st, count(*)::int as n from site_bookings where site_id = ${id} group by 1`,
    ]);

    const v = views[0], b = bk[0], o = ord[0], r = rep[0], n = neg[0];
    const st = Object.fromEntries(statuses.map((x) => [x.st, x.n]));
    const resolved = (st.completed || 0) + (st.no_show || 0);

    const dows = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const byDow = dows.map((d, i) => ({ label: d, n: busy.filter((x) => x.dow === i).reduce((t, x) => t + x.n, 0) }));
    const byHour = Array.from({ length: 24 }, (_, h) => ({ label: `${String(h).padStart(2, '0')}:00`, n: busy.filter((x) => x.hr === h).reduce((t, x) => t + x.n, 0) })).filter((x, i) => i >= 6 && i <= 22);

    // Demand-based price suggestions: compare each service with the average demand across the seller's services.
    const services = site.data?.services || [];
    const map = new Map(perService.map((x) => [x.service, x]));
    const n30s = services.map((sv) => map.get(sv.name)?.n30 || 0);
    const total30 = n30s.reduce((t, x) => t + x, 0);
    const avg = services.length ? total30 / services.length : 0;
    const suggestions = services.map((sv, i) => {
      const m = map.get(sv.name) || { n30: 0, n_all: 0, revenue: 0 };
      const index = avg > 0 ? m.n30 / avg : 0;
      let action = 'keep', suggested = sv.price, reason = 'Demand is in line with your other services.';
      if (total30 < 5) reason = 'Not enough bookings yet (needs at least 5 in 30 days).';
      else if (index >= 1.5) { action = 'raise'; suggested = niceRound(sv.price * 1.1); reason = `Demand is ${index.toFixed(1)}x your average. A 10% rise is likely to hold.`; }
      else if (index <= 0.5 && services.length >= 3 && total30 >= 10) { action = 'promote'; suggested = niceRound(sv.price * 0.9); reason = `Demand is ${index.toFixed(1)}x your average. Promote it, or try 10% off.`; }
      return { name: sv.name, price: sv.price, bookings30: m.n30, bookingsAll: m.n_all, revenue: m.revenue, action, suggested, reason };
    });

    return NextResponse.json({
      ok: true,
      data: {
        views30: v.views, visitors30: v.visitors,
        bookings30: b.n, orders30: o.n,
        revenue30: Math.round((b.revenue + o.revenue) * 100) / 100,
        conversion: v.visitors > 0 ? Math.round((b.n / v.visitors) * 1000) / 10 : null,
        customers: r.customers, repeaters: r.repeaters,
        repeatRate: r.customers > 0 ? Math.round((r.repeaters / r.customers) * 1000) / 10 : null,
        noShowRate: resolved > 0 ? Math.round(((st.no_show || 0) / resolved) * 1000) / 10 : null,
        resolved,
        negotiated: n.n, negotiatedShare: n.total > 0 ? Math.round((n.n / n.total) * 1000) / 10 : 0, avgDiscount: Math.round(n.avg_discount * 1000) / 10,
        daily, byDow, byHour, suggestions,
      },
    });
  } catch (e) {
    console.error('SITE_ANALYTICS_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Could not load analytics' }, { status: 500 });
  }
}
