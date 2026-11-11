import { sql } from '@/lib/db';
import { guard, json } from '@/lib/familyGuard';
import { loadJob, expireStale } from '@/lib/familyDb';
import { DISCLOSURE, CODE_HOURS } from '@/lib/familyFlow';

export const runtime = 'nodejs';

export async function GET(req, { params }) {
  const g = await guard(req); if (g.res) return g.res;
  const { id } = await params;
  await expireStale();
  const ctx = await loadJob(id, g.user);
  if (!ctx) return json({ ok: false, error: 'Job not found.' }, 404);
  const b = ctx.booking;
  const proofs = await sql`select id, kind, received_at, lat, lng, accuracy_m, captured_at_claimed, device_note from family_proofs where booking_id = ${b.id}::uuid order by id`;
  const events = await sql`select actor_type, event, at from family_events where booking_id = ${b.id}::uuid order by id`;
  const [payment] = await sql`select provider, hold_status, amount, currency, refund_amount, is_test from family_payments where booking_id = ${b.id}::uuid`;
  const disputes = await sql`select id, reason, details, after_release, status, refund_amount, resolution_note, opened_at from family_disputes where booking_id = ${b.id}::uuid order by id`;
  const [rating] = await sql`select rating, comment from family_ratings where booking_id = ${b.id}::uuid`;
  const [code] = await sql`select attempts, resend_count, locked_at, expires_at, test_code from family_codes where booking_id = ${b.id}::uuid`;
  const mine = ctx.isSender || ctx.isAdmin;
  return json({
    ok: true,
    me: { isSender: ctx.isSender, isPro: ctx.isPro, isAdmin: ctx.isAdmin },
    disclosure: DISCLOSURE(b.business),
    job: {
      id: b.id, status: b.status, business: b.business, slug: b.slug, service: b.service_name, category: b.service_category,
      priceLocal: Number(b.price_local), localCurrency: b.local_currency, chargeAmount: b.charge_amount == null ? null : Number(b.charge_amount), chargeCurrency: b.charge_currency,
      recipientName: b.recipient_name, recipientPhone: b.recipient_phone, recipientArea: b.recipient_area, date: String(b.scheduled_date).slice(0, 10), time: b.scheduled_time,
      notes: b.notes, isTest: b.is_test, createdAt: b.created_at, respondBy: b.respond_by, releasedAt: b.released_at, confirmedBy: b.confirmed_by,
    },
    proofs, events, payment: payment || null, disputes, rating: rating || null,
    code: code ? { attempts: code.attempts, resends: code.resend_count, locked: !!code.locked_at, expiresAt: code.expires_at, hours: CODE_HOURS } : null,
    // Test mode only: the sender sees the code on screen instead of the recipient getting a text. The professional never sees it.
    testCode: b.is_test && mine && ctx.isSender && b.status === 'proof_submitted' && code ? code.test_code : null,
  });
}
