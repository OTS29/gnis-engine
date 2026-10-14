import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdmin, loadUsers } from '@/lib/admin';

export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 403 });
    const users = await loadUsers();
    const now = Date.now();
    const day = 86400000;
    const since = (d) => users.filter((u) => u.created_at && now - new Date(u.created_at).getTime() < d * day).length;
    const active30 = users.filter((u) => u.last_login_at && now - new Date(u.last_login_at).getTime() < 30 * day).length;

    const count = (key) => {
      const m = {};
      for (const u of users) { const k = key(u) || 'Unknown'; m[k] = (m[k] || 0) + 1; }
      return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, n }));
    };
    const months = {};
    for (const u of users) { if (u.created_at) { const k = new Date(u.created_at).toISOString().slice(0, 7); months[k] = (months[k] || 0) + 1; } }
    const monthly = Object.entries(months).sort().slice(-12).map(([month, n]) => ({ month, n }));

    const [t] = await sql`select (select count(*) from site_bookings)::int as bookings, (select count(*) from site_orders)::int as orders`;
    return NextResponse.json({
      ok: true,
      totals: {
        users: users.length,
        pros: users.filter((u) => u.role === 'pro').length,
        clients: users.filter((u) => u.role === 'client').length,
        admins: users.filter((u) => u.role === 'admin').length,
        suspended: users.filter((u) => u.suspended).length,
        withSite: users.filter((u) => u.slug).length,
        published: users.filter((u) => u.published).length,
        paying: users.filter((u) => u.plan_active).length,
        new7: since(7), new30: since(30), active30,
        bookings: t.bookings, orders: t.orders,
      },
      byCountry: count((u) => u.country || u.region),
      byProfession: count((u) => (u.role === 'pro' ? u.skill : null)).filter((x) => x.name !== 'Unknown'),
      monthly,
    });
  } catch (e) {
    console.error('ADMIN_OVERVIEW_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Could not load overview' }, { status: 500 });
  }
}
