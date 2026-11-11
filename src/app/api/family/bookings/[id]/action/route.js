import { sql } from '@/lib/db';
import { hit } from '@/lib/rateLimit';
import { guard, json } from '@/lib/familyGuard';
import { loadJob, moveStatus, logEvent, expireStale } from '@/lib/familyDb';
import { holdFunds, releaseFunds, refundFunds, LiveProviderMissing } from '@/lib/familyPay';
import { can, hashCode, sameHash, newCode, codeSecret, DISPUTE_REASONS, MAX_CODE_TRIES, MAX_RESENDS, CODE_HOURS } from '@/lib/familyFlow';

export const runtime = 'nodejs';

const providerMsg = (e) => (e instanceof LiveProviderMissing ? 'Live payments are not connected yet.' : 'The payment step failed. Nothing was lost; please try again or contact support.');

// Confirmed jobs are paid out straight away (pretend payout in test mode).
async function releaseNow(job, actorType, actorId) {
  try {
    await releaseFunds(job);
    const done = await moveStatus(job.id, 'confirmed', 'released');
    await logEvent(job.id, 'provider', null, 'released', {});
    return { ok: true, status: done ? 'released' : 'confirmed' };
  } catch (e) {
    console.error('FAMILY_RELEASE_FAULT:', e);
    await logEvent(job.id, 'system', null, 'release_failed', { by: actorType });
    return { ok: false, status: 'confirmed', error: 'The job is confirmed, but the payout did not go through. Support will retry it.' };
  }
}

export async function POST(req, { params }) {
  const g = await guard(req); if (g.res) return g.res;
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const action = String(b.action || '');
  await expireStale();
  const ctx = await loadJob(id, g.user);
  if (!ctx) return json({ ok: false, error: 'Job not found.' }, 404);
  const job = ctx.booking;
  const who = { isPro: ctx.isPro, isSender: ctx.isSender };
  const c = can(action, job.status, who);
  if (!c.ok) return json({ ok: false, error: c.error }, c.forbidden ? 403 : 409);

  if (action === 'accept' || action === 'decline') {
    const m = await moveStatus(job.id, 'requested', c.to);
    if (!m) return json({ ok: false, error: 'This job has just changed. Refresh the page.' }, 409);
    await logEvent(job.id, 'pro', g.user.id, action, {});
    return json({ ok: true, status: c.to });
  }

  if (action === 'pay') {
    try { await holdFunds(job); } catch (e) { console.error('FAMILY_HOLD_FAULT:', e); return json({ ok: false, error: providerMsg(e) }, 502); }
    const m = await moveStatus(job.id, 'accepted', 'funds_held');
    if (!m) return json({ ok: false, error: 'This job has just changed. Refresh the page.' }, 409);
    await logEvent(job.id, 'provider', null, 'funds_held', { provider: 'sandbox' });
    return json({ ok: true, status: 'funds_held' });
  }

  if (action === 'cancel') {
    if (job.status === 'funds_held') {
      try { await refundFunds(job); } catch (e) { console.error('FAMILY_REFUND_FAULT:', e); return json({ ok: false, error: providerMsg(e) }, 502); }
      const m = await moveStatus(job.id, 'funds_held', 'refunded');
      if (!m) return json({ ok: false, error: 'This job has just changed. Refresh the page.' }, 409);
      await logEvent(job.id, 'sender', g.user.id, 'cancelled_refunded', {});
      return json({ ok: true, status: 'refunded' });
    }
    const m = await moveStatus(job.id, job.status, 'cancelled');
    if (!m) return json({ ok: false, error: 'This job has just changed. Refresh the page.' }, 409);
    await logEvent(job.id, 'sender', g.user.id, 'cancelled', {});
    return json({ ok: true, status: 'cancelled' });
  }

  if (action === 'confirm_code') {
    const code = String(b.code || '').replace(/\s/g, '');
    if (!/^\d{6}$/.test(code)) return json({ ok: false, error: 'Enter the 6-digit code.' }, 400);
    const [row] = await sql`select code_hash, expires_at, locked_at from family_codes where booking_id = ${job.id}::uuid`;
    if (!row) return json({ ok: false, error: 'No code has been issued for this job.' }, 409);
    if (row.locked_at) return json({ ok: false, error: 'Too many wrong codes. The sender can confirm the job instead, or contact support.' }, 423);
    if (new Date(row.expires_at) < new Date()) return json({ ok: false, error: 'This code has expired. Ask for a new code.' }, 410);
    // Count the try first, so fast repeated guesses cannot beat the limit.
    const [t] = await sql`update family_codes set attempts = attempts + 1, locked_at = case when attempts + 1 >= ${MAX_CODE_TRIES} then now() else locked_at end where booking_id = ${job.id}::uuid and locked_at is null returning attempts`;
    if (!t) return json({ ok: false, error: 'Too many wrong codes. The sender can confirm the job instead, or contact support.' }, 423);
    if (!sameHash(row.code_hash, hashCode(codeSecret(), job.id, code))) {
      await logEvent(job.id, 'pro', g.user.id, 'code_wrong', { attempts: t.attempts });
      const left = MAX_CODE_TRIES - t.attempts;
      return json({ ok: false, error: left > 0 ? `That code is not right. ${left} ${left === 1 ? 'try' : 'tries'} left.` : 'Too many wrong codes. The sender can confirm the job instead, or contact support.' }, 400);
    }
    await sql`update family_codes set used_at = now() where booking_id = ${job.id}::uuid`;
    const m = await moveStatus(job.id, 'proof_submitted', 'confirmed');
    if (!m) return json({ ok: false, error: 'This job has just changed. Refresh the page.' }, 409);
    await sql`update family_bookings set confirmed_by = 'recipient_code' where id = ${job.id}::uuid`;
    await logEvent(job.id, 'recipient', null, 'code_confirmed', {});
    const r = await releaseNow(job, 'pro', g.user.id);
    return json({ ok: true, status: r.status, warning: r.error });
  }

  if (action === 'sender_confirm') {
    const m = await moveStatus(job.id, 'proof_submitted', 'confirmed');
    if (!m) return json({ ok: false, error: 'This job has just changed. Refresh the page.' }, 409);
    await sql`update family_bookings set confirmed_by = 'sender' where id = ${job.id}::uuid`;
    await logEvent(job.id, 'sender', g.user.id, 'sender_confirmed', {});
    const r = await releaseNow(job, 'sender', g.user.id);
    return json({ ok: true, status: r.status, warning: r.error });
  }

  if (action === 'dispute') {
    const reason = Object.hasOwn(DISPUTE_REASONS, b.reason) ? b.reason : null;
    if (!reason) return json({ ok: false, error: 'Choose what went wrong.' }, 400);
    const details = String(b.details || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 500);
    const m = await moveStatus(job.id, job.status, 'disputed');
    if (!m) return json({ ok: false, error: 'This job has just changed. Refresh the page.' }, 409);
    await sql`insert into family_disputes (booking_id, opened_by, reason, details) values (${job.id}::uuid, ${g.user.id}, ${reason}, ${details})`;
    await logEvent(job.id, 'sender', g.user.id, 'dispute_opened', { reason });
    return json({ ok: true, status: 'disputed' });
  }

  if (action === 'report') {
    const [r] = await sql`select 1 as ok from family_bookings where id = ${job.id}::uuid and released_at > now() - interval '7 days'`;
    if (!r) return json({ ok: false, error: 'Problems can only be reported within 7 days of completion.' }, 409);
    const [open] = await sql`select 1 as x from family_disputes where booking_id = ${job.id}::uuid and status = 'open'`;
    if (open) return json({ ok: false, error: 'You have already reported a problem on this job.' }, 409);
    const reason = Object.hasOwn(DISPUTE_REASONS, b.reason) ? b.reason : null;
    if (!reason) return json({ ok: false, error: 'Choose what went wrong.' }, 400);
    const details = String(b.details || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 500);
    await sql`insert into family_disputes (booking_id, opened_by, reason, details, after_release) values (${job.id}::uuid, ${g.user.id}, ${reason}, ${details}, true)`;
    await logEvent(job.id, 'sender', g.user.id, 'problem_reported_after_payout', { reason });
    return json({ ok: true, status: 'released' });
  }

  if (action === 'resend_code') {
    if (!(await hit(`fam:resend:${job.id}`, 6, 3600)).allowed) return json({ ok: false, error: 'Too many requests. Try again later.' }, 429);
    const code = newCode();
    const rows = await sql`update family_codes set code_hash = ${hashCode(codeSecret(), job.id, code)}, test_code = ${job.is_test ? code : null},
        attempts = 0, locked_at = null, resend_count = resend_count + 1, expires_at = now() + make_interval(hours => ${CODE_HOURS}), sent_at = now()
      where booking_id = ${job.id}::uuid and resend_count < ${MAX_RESENDS} returning resend_count`;
    if (!rows.length) return json({ ok: false, error: 'No more new codes can be sent for this job. The sender can confirm it instead.' }, 409);
    await logEvent(job.id, 'pro', g.user.id, 'code_resent', { n: rows[0].resend_count });
    return json({ ok: true, status: 'proof_submitted' });
  }

  if (action === 'rate') {
    const rating = Math.round(Number(b.rating));
    if (!(rating >= 1 && rating <= 5)) return json({ ok: false, error: 'Choose 1 to 5 stars.' }, 400);
    const comment = String(b.comment || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 300);
    const rows = await sql`insert into family_ratings (booking_id, rating, comment) values (${job.id}::uuid, ${rating}, ${comment}) on conflict (booking_id) do nothing returning booking_id`;
    if (!rows.length) return json({ ok: false, error: 'You have already rated this job.' }, 409);
    await logEvent(job.id, 'sender', g.user.id, 'rated', { rating });
    return json({ ok: true, status: job.status });
  }

  return json({ ok: false, error: 'Unknown action.' }, 400);
}
