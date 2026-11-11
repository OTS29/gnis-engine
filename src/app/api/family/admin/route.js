import { sql } from '@/lib/db';
import { guard, json } from '@/lib/familyGuard';
import { moveStatus, logEvent, isUuid, expireStale } from '@/lib/familyDb';
import { holdFunds as _h, releaseFunds, refundFunds, LiveProviderMissing } from '@/lib/familyPay';

export const runtime = 'nodejs';

export async function GET(req) {
  const g = await guard(req, { admin: true }); if (g.res) return g.res;
  await expireStale();
  const pending = await sql`select fp.site_id, fp.status, fp.categories, fp.id_method, fp.id_last4, fp.id_note, fp.enabled, s.slug, s.data->>'businessName' as name, u.email, u.name as owner
    from family_pros fp join sites s on s.id::text = fp.site_id join users u on u.id::text = s.owner_id::text
    where fp.status <> 'suspended' and (fp.status = 'pending' or fp.enabled) order by fp.created_at desc limit 100`;
  const disputes = await sql`select d.id, d.reason, d.details, d.after_release, d.status, d.opened_at, b.id as booking_id, b.status as booking_status, b.service_name, b.price_local, b.local_currency, s.data->>'businessName' as business
    from family_disputes d join family_bookings b on b.id = d.booking_id join sites s on s.id::text = b.site_id where d.status = 'open' order by d.opened_at limit 100`;
  const stale = await sql`select b.id, b.service_name, b.proof_submitted_at, s.data->>'businessName' as business from family_bookings b join sites s on s.id::text = b.site_id
    where b.status = 'proof_submitted' and b.proof_submitted_at < now() - interval '5 days' order by b.proof_submitted_at limit 100`;
  const stuck = await sql`select b.id, b.service_name, b.confirmed_at, s.data->>'businessName' as business from family_bookings b join sites s on s.id::text = b.site_id where b.status = 'confirmed' order by b.confirmed_at limit 100`;
  const counts = await sql`select status, count(*)::int as n, bool_or(is_test) as any_test from family_bookings group by status order by n desc`;
  let waitlist = [];
  const [w] = await sql`select to_regclass('public.diaspora_waitlist') as t`;
  if (w?.t) waitlist = await sql`select role, from_country, to_country, count(*)::int as people from diaspora_waitlist where not unsubscribed group by 1, 2, 3 order by people desc`;
  return json({ ok: true, pros: pending, disputes, stale, stuck, counts, waitlist });
}

async function adminSettle(job, decision, amount, note, admin) {
  // decision: release | refund | split. Allowed while the money is still held (or a payout needs retrying).
  if (decision === 'refund') {
    await refundFunds(job);
    const m = await moveStatus(job.id, job.status, 'refunded');
    return { to: 'refunded', ok: !!m };
  }
  if (decision === 'split') {
    const total = Number(job.charge_amount ?? job.price_local);
    const refund = Number(amount);
    if (!(refund > 0 && refund < total)) throw Object.assign(new Error('bad split'), { user: `Enter an amount between 0 and ${total}.` });
    await refundFunds(job, refund);
  } else {
    // retry of a payout that failed after confirmation: the money is still held
    await releaseFunds(job);
  }
  let from = job.status;
  if (from !== 'confirmed') { const c = await moveStatus(job.id, from, 'confirmed'); if (!c) return { ok: false }; from = 'confirmed'; }
  await sql`update family_bookings set confirmed_by = 'admin' where id = ${job.id}::uuid`;
  const m = await moveStatus(job.id, 'confirmed', 'released');
  return { to: 'released', ok: !!m };
}

export async function POST(req) {
  const g = await guard(req, { admin: true }); if (g.res) return g.res;
  const b = await req.json().catch(() => ({}));
  const action = String(b.action || '');

  if (action === 'approve_pro' || action === 'reject_pro' || action === 'suspend_pro') {
    const siteId = String(b.siteId || '');
    const status = action === 'approve_pro' ? 'verified' : action === 'suspend_pro' ? 'suspended' : 'pending';
    const rows = await sql`update family_pros set status = ${status}::text, reviewed_by = ${g.user.email}, verified_at = case when ${status}::text = 'verified' then now() else null end,
        enabled = case when ${status}::text = 'suspended' then false else enabled end, updated_at = now() where site_id = ${siteId} returning site_id`;
    if (!rows.length) return json({ ok: false, error: 'Professional not found.' }, 404);
    return json({ ok: true });
  }

  if (action === 'resolve') {
    const id = String(b.bookingId || '');
    if (!isUuid(id)) return json({ ok: false, error: 'Job not found.' }, 404);
    const decision = ['release', 'refund', 'split', 'close'].includes(b.decision) ? b.decision : null;
    if (!decision) return json({ ok: false, error: 'Choose a decision.' }, 400);
    const note = String(b.note || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 500);
    if (note.length < 3) return json({ ok: false, error: 'Write a short note explaining the decision.' }, 400);
    const [job] = await sql`select * from family_bookings where id = ${id}::uuid`;
    if (!job) return json({ ok: false, error: 'Job not found.' }, 404);
    const [open] = await sql`select id, after_release from family_disputes where booking_id = ${id}::uuid and status = 'open' order by id limit 1`;
    try {
      if (open?.after_release || decision === 'close') {
        // Money was already paid out, so there is nothing to move. The report still counts against the professional's trust level.
        if (!open) return json({ ok: false, error: 'There is no open report on this job.' }, 409);
        await sql`update family_disputes set status = 'resolved_release', resolution_note = ${note}, resolved_by = ${g.user.email}, resolved_at = now() where id = ${open.id}`;
        await logEvent(id, 'admin', g.user.id, 'report_closed', { note });
        return json({ ok: true });
      }
      if (!['disputed', 'proof_submitted', 'confirmed', 'in_progress'].includes(job.status)) return json({ ok: false, error: `This job cannot be settled while it is "${job.status}".` }, 409);
      const r = await adminSettle(job, decision, b.amount, note, g.user);
      if (!r.ok) return json({ ok: false, error: 'This job has just changed. Refresh the page.' }, 409);
      if (open) {
        const st = decision === 'refund' ? 'resolved_refund' : decision === 'split' ? 'resolved_split' : 'resolved_release';
        await sql`update family_disputes set status = ${st}::text, refund_amount = ${decision === 'split' ? Number(b.amount) : decision === 'refund' ? Number(job.charge_amount ?? job.price_local) : null}, resolution_note = ${note}, resolved_by = ${g.user.email}, resolved_at = now() where id = ${open.id}`;
      }
      await logEvent(id, 'admin', g.user.id, `settled_${decision}`, { note });
      return json({ ok: true, status: r.to });
    } catch (e) {
      if (e?.user) return json({ ok: false, error: e.user }, 400);
      console.error('FAMILY_ADMIN_SETTLE_FAULT:', e);
      return json({ ok: false, error: e instanceof LiveProviderMissing ? 'Live payments are not connected yet.' : 'The payment step failed. Nothing was changed.' }, 502);
    }
  }
  return json({ ok: false, error: 'Unknown action.' }, 400);
}
