import { sql } from '@/lib/db';
import { hit } from '@/lib/rateLimit';
import { guard, json } from '@/lib/familyGuard';
import { validateBooking, TERMS_VERSION } from '@/lib/familyFlow';
import { expireStale, logEvent } from '@/lib/familyDb';
import { notifyProOfRequest } from '@/lib/familyNotify';

export const runtime = 'nodejs';

// My jobs: as the sender, as the professional, or both.
export async function GET(req) {
  const g = await guard(req); if (g.res) return g.res;
  await expireStale();
  const rows = await sql`select b.id, b.status, b.service_name, b.service_category, b.price_local, b.local_currency, b.charge_amount, b.charge_currency, b.recipient_name,
      b.scheduled_date::text as scheduled_date, b.scheduled_time, b.created_at, b.is_test, s.data->>'businessName' as business,
      (b.sender_user_id = ${g.user.id}) as as_sender, (s.owner_id::text = ${g.user.id}) as as_pro
    from family_bookings b join sites s on s.id::text = b.site_id
    where b.sender_user_id = ${g.user.id} or s.owner_id::text = ${g.user.id}
    order by b.created_at desc limit 100`;
  return json({ ok: true, jobs: rows });
}

// The sender asks a verified professional to do a job for a family member.
export async function POST(req) {
  const g = await guard(req); if (g.res) return g.res;
  if (!(await hit(`fam:book:${g.user.id}`, 10, 3600)).allowed) return json({ ok: false, error: 'Too many requests. Please try again later.' }, 429);
  const b = await req.json().catch(() => ({}));
  const [row] = await sql`select s.id::text as id, s.owner_id::text as owner_id, s.data, fp.categories
    from sites s join family_pros fp on fp.site_id = s.id::text
    where s.slug = ${String(b.slug || '')} and s.published and fp.enabled and fp.status = 'verified'`;
  if (!row) return json({ ok: false, error: 'That professional is not available for family bookings.' }, 404);
  if (g.mode === 'live' && row.owner_id === g.user.id) return json({ ok: false, error: 'You cannot book your own business.' }, 400);
  const data = row.data || {};
  if (String(data.currency).toUpperCase() !== 'NGN') return json({ ok: false, error: 'This professional is not set up for Nigerian bookings.' }, 400);
  const services = (Array.isArray(data.services) ? data.services : []).filter((x) => x && x.name && Number(x.price) > 0);
  const v = validateBooking(b, { categories: row.categories || [], serviceNames: services.map((x) => x.name) });
  if (!v.ok) return json(v, 400);
  const svc = services.find((x) => x.name === v.value.service);
  const price = Number(svc.price);
  const fx = Number(process.env.FAMILY_FX_NGN_PER_GBP);
  const chargeAmount = fx > 0 ? Math.round((price / fx) * 100) / 100 : null;
  const [made] = await sql`insert into family_bookings (site_id, sender_user_id, service_name, service_category, price_local, local_currency, charge_amount, charge_currency,
      recipient_name, recipient_phone, recipient_area, scheduled_date, scheduled_time, notes, is_test, terms_version, disclosure_accepted_at, recipient_consent_confirmed, respond_by)
    values (${row.id}, ${g.user.id}, ${v.value.service}, ${v.value.category}, ${price}, 'NGN', ${chargeAmount}, ${fx > 0 ? 'GBP' : 'NGN'},
      ${v.value.name}, ${v.value.phone}, ${v.value.area}, ${v.value.date}::date, ${v.value.time}, ${v.value.notes}, ${g.mode !== 'live'}, ${TERMS_VERSION}, now(), true, now() + interval '24 hours')
    returning id`;
  await logEvent(made.id, 'sender', g.user.id, 'requested', { service: v.value.service, category: v.value.category, test: g.mode !== 'live' });
  // A failed email must never lose the booking.
  try { await notifyProOfRequest(made.id); } catch (e) { console.error('FAMILY_NOTIFY_FAULT:', e?.message); }
  return json({ ok: true, id: made.id }, 201);
}
