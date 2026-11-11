import { sql } from '@/lib/db';
import { FAMILY_SCHEMA, FAMILY_TABLES_LAST } from '@/lib/familySchema';
import { trustLevel } from '@/lib/familyFlow';

let ready;
// Creates the tables the first time. Cheap after that: one lookup.
export function ensureFamily() {
  if (!ready) {
    ready = (async () => {
      const [r] = await sql`select to_regclass(${'public.' + FAMILY_TABLES_LAST}) as t`;
      if (r?.t) return;
      for (const stmt of FAMILY_SCHEMA) await sql.query(stmt);
    })().catch((e) => { ready = undefined; throw e; });
  }
  return ready;
}

export const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s || ''));

export async function logEvent(bookingId, actorType, actorId, event, detail = {}) {
  try {
    await sql`insert into family_events (booking_id, actor_type, actor_id, event, detail) values (${bookingId}::uuid, ${actorType}, ${actorId ? String(actorId) : null}, ${event}, ${JSON.stringify(detail)}::jsonb)`;
  } catch (e) { console.error('FAMILY_EVENT_FAULT:', e); }
}

// Requests nobody answered in 24 hours expire. Runs whenever jobs are read.
export async function expireStale() {
  const rows = await sql`update family_bookings set status = 'expired' where status = 'requested' and respond_by < now() returning id`;
  for (const r of rows) await logEvent(r.id, 'system', null, 'expired', {});
}

// Moves a job from one status to another only if it is still in the status we expect (guards against double clicks).
export async function moveStatus(id, from, to) {
  const rows = await sql`update family_bookings set status = ${to}::text,
      accepted_at = case when ${to}::text = 'accepted' then now() else accepted_at end,
      paid_at = case when ${to}::text = 'funds_held' then now() else paid_at end,
      started_at = case when ${to}::text = 'in_progress' then now() else started_at end,
      proof_submitted_at = case when ${to}::text = 'proof_submitted' then now() else proof_submitted_at end,
      confirmed_at = case when ${to}::text = 'confirmed' then now() else confirmed_at end,
      released_at = case when ${to}::text = 'released' then now() else released_at end,
      refunded_at = case when ${to}::text = 'refunded' then now() else refunded_at end
    where id = ${id}::uuid and status = ${from}::text returning *`;
  return rows[0] || null;
}

// The job plus who the viewer is on it.
export async function loadJob(id, user) {
  if (!isUuid(id)) return null;
  const [b] = await sql`select b.*, s.slug, s.owner_id::text as owner_id, s.data->>'businessName' as business, s.data->>'location' as business_location
    from family_bookings b join sites s on s.id::text = b.site_id where b.id = ${id}::uuid`;
  if (!b) return null;
  const isSender = b.sender_user_id === user.id;
  const isPro = b.owner_id === user.id;
  const isAdmin = user.role === 'admin';
  if (!isSender && !isPro && !isAdmin) return null;
  return { booking: b, isSender, isPro, isAdmin };
}

export async function proStats(siteId) {
  const [s] = await sql`select
      (select count(*) from family_bookings where site_id = ${siteId} and status = 'released' and confirmed_by in ('recipient_code', 'sender'))::int as confirmed,
      (select count(*) from family_disputes d join family_bookings b on b.id = d.booking_id where b.site_id = ${siteId})::int as disputes,
      (select coalesce(avg(r.rating), 0) from family_ratings r join family_bookings b on b.id = r.booking_id where b.site_id = ${siteId})::float8 as rating_avg,
      (select count(*) from family_ratings r join family_bookings b on b.id = r.booking_id where b.site_id = ${siteId})::int as rating_n`;
  return { confirmed: s.confirmed, disputes: s.disputes, ratingAvg: Number(s.rating_avg) || 0, ratingN: s.rating_n, level: trustLevel({ confirmed: s.confirmed, disputes: s.disputes, ratingAvg: Number(s.rating_avg) || 0, ratingN: s.rating_n }) };
}
