// The only place money status changes. GNIS never holds money: a real provider would, and these functions only
// send it instructions and mirror its answer. In this version only the "sandbox" (pretend) provider exists.
// There is deliberately NO live provider yet, so live payments cannot happen even if the mode is switched on.
import crypto from 'crypto';
import { sql } from '@/lib/db';

export class LiveProviderMissing extends Error {
  constructor() { super('No live payment provider is connected yet.'); this.code = 'LIVE_PROVIDER_MISSING'; }
}

const amountOf = (b) => (b.charge_amount != null ? { amount: Number(b.charge_amount), currency: b.charge_currency } : { amount: Number(b.price_local), currency: b.local_currency });

function requireSandbox(booking) {
  if (!booking.is_test) throw new LiveProviderMissing();
}

export async function holdFunds(booking) {
  requireSandbox(booking);
  const { amount, currency } = amountOf(booking);
  const ref = 'sbx_' + crypto.randomBytes(6).toString('hex');
  await sql`insert into family_payments (booking_id, provider, provider_ref, hold_status, amount, currency, is_test, held_at)
    values (${booking.id}::uuid, 'sandbox', ${ref}, 'held', ${amount}, ${currency}, true, now())
    on conflict (booking_id) do nothing`;
  return { provider: 'sandbox', ref };
}

export async function releaseFunds(booking) {
  requireSandbox(booking);
  const rows = await sql`update family_payments set hold_status = 'released', released_at = now() where booking_id = ${booking.id}::uuid and hold_status = 'held' returning id`;
  if (!rows.length) throw new Error('There is no held payment to release.');
  return { ok: true };
}

export async function refundFunds(booking, partialAmount = null) {
  requireSandbox(booking);
  const [p] = await sql`select amount from family_payments where booking_id = ${booking.id}::uuid and hold_status = 'held'`;
  if (!p) throw new Error('There is no held payment to refund.');
  const full = Number(p.amount);
  const part = partialAmount == null ? full : Math.min(full, Math.max(0, Number(partialAmount)));
  const rows = await sql`update family_payments set hold_status = ${part >= full ? 'refunded' : 'released'}::text, refund_amount = ${part}, refunded_at = now(),
      released_at = case when ${part >= full} then released_at else now() end
    where booking_id = ${booking.id}::uuid and hold_status = 'held' returning id`;
  if (!rows.length) throw new Error('There is no held payment to refund.');
  return { ok: true, refunded: part };
}
