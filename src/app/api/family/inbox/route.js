import { sql } from '@/lib/db';
import { guard, json } from '@/lib/familyGuard';
import { expireStale } from '@/lib/familyDb';

export const runtime = 'nodejs';

// What needs attention for the logged-in person. Used by the dashboard badge and pop-up.
//  requests = new requests waiting for me to accept or decline (as the professional)
//  todo     = other jobs where it is my turn to act as the professional (photos, code)
//  toPay    = jobs I booked that the professional accepted and I have not paid yet
export async function GET(req) {
  const g = await guard(req); if (g.res) return g.res;
  await expireStale();
  const requests = await sql`select b.id::text as id, b.service_name as service, b.scheduled_date::text as date, b.scheduled_time as time,
      b.respond_by, b.is_test as "isTest"
    from family_bookings b join sites s on s.id::text = b.site_id
    where s.owner_id::text = ${g.user.id} and b.status = 'requested' and b.respond_by > now()
    order by b.created_at asc limit 20`;
  const [c] = await sql`select
      (select count(*) from family_bookings b join sites s on s.id::text = b.site_id
         where s.owner_id::text = ${g.user.id} and b.status in ('funds_held', 'in_progress', 'proof_submitted'))::int as todo,
      (select count(*) from family_bookings where sender_user_id = ${g.user.id} and status = 'accepted')::int as to_pay`;
  return json({ ok: true, requests, todo: c.todo, toPay: c.to_pay, total: requests.length + c.todo + c.to_pay });
}
