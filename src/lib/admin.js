import { sql } from '@/lib/db';
import { liveSession } from '@/lib/session';

// Admin only. The role is re-checked in the database, so a removed admin loses access straight away.
export async function requireAdmin(req) {
  const s = await liveSession(req);
  if (!s || !s.userId) return null;
  try {
    const [u] = await sql`select id, email, role from users where id = ${s.userId}`;
    if (!u || u.role !== 'admin') return null;
    return { id: String(u.id), email: u.email };
  } catch {
    return null;
  }
}

export async function logAdmin(admin, action, target, detail) {
  try {
    await sql`insert into admin_log (admin_id, admin_email, action, target_id, target_email, detail)
      values (${admin.id}, ${admin.email}, ${action}, ${target?.id ? String(target.id) : null}, ${target?.email || null}, ${detail || null})`;
  } catch (e) {
    console.error('ADMIN_LOG_FAULT:', e);
  }
}

// One row per user with the numbers used to rank them. ID numbers are deliberately left out.
export async function loadUsers() {
  const rows = await sql`
    select u.id::text as id, u.email, u.name, u.role, u.region, u.country, u.skill, u.rate, u.address, u.postcode,
           u.verification_method, u.created_at, u.last_login_at, coalesce(u.suspended, false) as suspended, u.admin_note,
           st.slug, st.published,
           coalesce(b.n, 0)::int as bookings,
           coalesce(o.n, 0)::int as orders,
           coalesce(v.n, 0)::int as views,
           sp.plan, sp.cycle, sp.expires_at, coalesce(sp.expires_at > now(), false) as plan_active
    from users u
    left join sites st on st.owner_id::text = u.id::text
    left join (select site_id, count(*) n from site_bookings group by site_id) b on b.site_id = st.id
    left join (select site_id, count(*) n from site_orders group by site_id) o on o.site_id = st.id
    left join (select site_id, count(*) n from site_views group by site_id) v on v.site_id = st.id
    left join seller_plans sp on sp.user_id = u.id::text
    order by u.created_at desc`;
  return rows.map((r) => ({ ...r, score: Math.round((r.bookings + r.orders * 2 + r.views / 20) * 10) / 10 }));
}
