import crypto from 'crypto';
import { sql } from '@/lib/db';
import { guard, json } from '@/lib/familyGuard';
import { loadJob, moveStatus, logEvent } from '@/lib/familyDb';
import { checkPhoto, PROOF_MOVES, newCode, hashCode, codeSecret, CODE_HOURS } from '@/lib/familyFlow';

export const runtime = 'nodejs';
export const maxDuration = 30;

// The professional adds a before or after photo taken with the in-app camera.
export async function POST(req, { params }) {
  const g = await guard(req); if (g.res) return g.res;
  const { id } = await params;
  const raw = await req.text();
  if (raw.length > 1_300_000) return json({ ok: false, error: 'The photo is too large. Try again.' }, 413);
  let body; try { body = JSON.parse(raw); } catch { return json({ ok: false, error: 'Something went wrong.' }, 400); }
  const ctx = await loadJob(id, g.user);
  if (!ctx || !ctx.isPro) return json({ ok: false, error: 'Job not found.' }, 404);
  const job = ctx.booking;
  const p = checkPhoto(body);
  if (!p.ok) return json(p, 400);
  const move = PROOF_MOVES[p.value.kind];
  if (job.status !== move.from) {
    return json({ ok: false, error: p.value.kind === 'before' ? 'The before photo can only be added once the customer has paid.' : 'Add the before photo first, and the after photo while the job is in progress.' }, 409);
  }
  const sha = crypto.createHash('sha256').update(p.value.b64).digest('hex');
  const dup = await sql`select 1 as x from family_proofs where sha256 = ${sha}`;
  if (dup.length) {
    await logEvent(job.id, 'pro', g.user.id, 'duplicate_photo_rejected', {});
    return json({ ok: false, error: 'This photo has already been used. Take a new photo with the camera.' }, 409);
  }
  const ins = await sql`insert into family_proofs (booking_id, kind, image_b64, sha256, captured_at_claimed, lat, lng, accuracy_m, device_note)
    values (${job.id}::uuid, ${p.value.kind}, ${p.value.b64}, ${sha}, ${p.value.claimedAt}, ${p.value.lat}, ${p.value.lng}, ${p.value.accuracy}, ${p.value.note})
    on conflict do nothing returning id`;
  if (!ins.length) return json({ ok: false, error: 'This photo was already added.' }, 409);
  const m = await moveStatus(job.id, move.from, move.to);
  if (!m) return json({ ok: false, error: 'This job has just changed. Refresh the page.' }, 409);
  await logEvent(job.id, 'pro', g.user.id, `${p.value.kind}_photo`, { note: p.value.note });

  if (p.value.kind === 'after') {
    // The code only exists from this moment, so nobody can ask for it before the job is done.
    const code = newCode();
    await sql`insert into family_codes (booking_id, code_hash, test_code, sent_via, sent_at, expires_at)
      values (${job.id}::uuid, ${hashCode(codeSecret(), job.id, code)}, ${job.is_test ? code : null}, ${job.is_test ? 'screen_test' : null}, now(), now() + make_interval(hours => ${CODE_HOURS}))
      on conflict (booking_id) do nothing`;
    await logEvent(job.id, 'system', null, 'code_issued', { via: job.is_test ? 'screen_test' : 'pending_provider' });
  }
  return json({ ok: true, status: move.to });
}
