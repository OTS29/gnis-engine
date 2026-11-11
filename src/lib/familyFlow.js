// Pure rules for "Book for family back home": no database, no network. Easy to test.
import crypto from 'crypto';

import { STATUS_LABEL, CATEGORIES, DISPUTE_REASONS, TERMS_VERSION, CODE_HOURS, MAX_CODE_TRIES, MAX_RESENDS, DISCLOSURE, fmtMoney } from './familyLabels.js';
export { STATUS_LABEL, CATEGORIES, DISPUTE_REASONS, TERMS_VERSION, CODE_HOURS, MAX_CODE_TRIES, MAX_RESENDS, DISCLOSURE, fmtMoney };

// action -> who may do it, from which status, to which status
export const ACTIONS = {
  accept: { actor: 'pro', from: ['requested'], to: 'accepted' },
  decline: { actor: 'pro', from: ['requested'], to: 'declined' },
  pay: { actor: 'sender', from: ['accepted'], to: 'funds_held' },
  cancel: { actor: 'sender', from: ['requested', 'accepted', 'funds_held'], to: 'cancelled' },
  confirm_code: { actor: 'pro', from: ['proof_submitted'], to: 'confirmed' },
  sender_confirm: { actor: 'sender', from: ['proof_submitted'], to: 'confirmed' },
  dispute: { actor: 'sender', from: ['in_progress', 'proof_submitted'], to: 'disputed' },
  resend_code: { actor: 'pro', from: ['proof_submitted'], to: 'proof_submitted' },
  rate: { actor: 'sender', from: ['released'], to: 'released' },
  report: { actor: 'sender', from: ['released'], to: 'released' },
};

// Photo uploads move the job too
export const PROOF_MOVES = { before: { from: 'funds_held', to: 'in_progress' }, after: { from: 'in_progress', to: 'proof_submitted' } };

export function can(action, status, who) {
  const a = ACTIONS[action];
  if (!a) return { ok: false, error: 'Unknown action.' };
  if (!a.from.includes(status)) return { ok: false, error: `That cannot be done while the job is "${STATUS_LABEL[status] || status}".` };
  const allowed = a.actor === 'pro' ? !!who?.isPro : !!who?.isSender;
  if (!allowed) return { ok: false, error: 'You are not allowed to do that on this job.', forbidden: true };
  return { ok: true, to: a.to };
}

// Nigerian mobile numbers only (Phase 1). Returns +234XXXXXXXXXX or null.
export function normPhoneNG(raw) {
  const d = String(raw || '').replace(/[\s().-]/g, '');
  let n = null;
  if (/^\+234\d{10}$/.test(d)) n = d.slice(4);
  else if (/^234\d{10}$/.test(d)) n = d.slice(3);
  else if (/^0\d{10}$/.test(d)) n = d.slice(1);
  if (!n || !/^[789][01]\d{8}$/.test(n)) return null;
  return '+234' + n;
}

const clean = (v, n) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);

// Checks what the sender typed. today is passed in so it can be tested.
export function validateBooking(b, { categories = [], serviceNames = [], today = new Date() } = {}) {
  const x = b && typeof b === 'object' ? b : {};
  const name = clean(x.recipientName, 80);
  if (name.length < 2) return { ok: false, error: "Enter your family member's name." };
  const phone = normPhoneNG(x.recipientPhone);
  if (!phone) return { ok: false, error: 'Enter a Nigerian mobile number, for example 0803 123 4567 or +234 803 123 4567.' };
  const area = clean(x.recipientArea, 120);
  if (area.length < 2) return { ok: false, error: 'Enter the area or address where the service is needed.' };
  const date = String(x.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date + 'T00:00:00Z'))) return { ok: false, error: 'Choose a date.' };
  const t0 = new Date(today.toISOString().slice(0, 10) + 'T00:00:00Z').getTime();
  const d0 = Date.parse(date + 'T00:00:00Z');
  if (d0 < t0) return { ok: false, error: 'The date cannot be in the past.' };
  if (d0 > t0 + 180 * 86400000) return { ok: false, error: 'Choose a date within the next 6 months.' };
  const time = String(x.time || '');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return { ok: false, error: 'Choose a time.' };
  const category = String(x.category || '');
  if (!categories.includes(category) || !CATEGORIES[category]) return { ok: false, error: 'Choose the type of service.' };
  const service = String(x.service || '');
  if (!serviceNames.includes(service)) return { ok: false, error: 'Choose a service.' };
  if (x.consentRecipient !== true) return { ok: false, error: 'Please confirm your family member knows about this booking and agrees to receive a text message.' };
  if (x.acceptDisclosure !== true) return { ok: false, error: 'Please tick the box to confirm you have read the notice about independent professionals.' };
  return { ok: true, value: { name, phone, area, date, time, category, service, notes: clean(x.notes, 300) } };
}

export const newCode = () => String(crypto.randomInt(100000, 1000000));
export const hashCode = (secret, bookingId, code) => crypto.createHmac('sha256', String(secret)).update(`${bookingId}:${code}`).digest('hex');
export function sameHash(a, b) {
  const x = Buffer.from(String(a), 'hex'), y = Buffer.from(String(b), 'hex');
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}
export const codeSecret = () => process.env.FAMILY_CODE_SECRET || process.env.JWT_SECRET || '';

// Counts only completed jobs the recipient or sender confirmed. Thresholds are a starting suggestion.
export function trustLevel({ confirmed = 0, disputes = 0, ratingAvg = 0, ratingN = 0 } = {}) {
  const jobs = Number(confirmed) || 0, dis = Number(disputes) || 0;
  const rate = jobs + dis > 0 ? dis / (jobs + dis) : 0;
  if (jobs + dis >= 4 && rate >= 0.25) return 'Under review';
  if (jobs >= 10 && rate < 0.05 && ratingN >= 3 && Number(ratingAvg) >= 4.5) return 'Trusted';
  if (jobs >= 3 && rate < 0.1) return 'Rising';
  return 'New';
}

// Photo upload checks (pure)
export function checkPhoto(p, now = Date.now()) {
  const x = p && typeof p === 'object' ? p : {};
  const kind = x.kind === 'before' || x.kind === 'after' ? x.kind : null;
  if (!kind) return { ok: false, error: 'Unknown photo type.' };
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(x.image || ''));
  if (!m) return { ok: false, error: 'The photo must be taken with the in-app camera.' };
  if (m[1].length > 900000) return { ok: false, error: 'The photo is too large. Try again.' };
  const bytes = Buffer.from(m[1].slice(0, 16), 'base64');
  if (!(bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)) return { ok: false, error: 'That is not a valid photo.' };
  const lat = Number(x.lat), lng = Number(x.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return { ok: false, error: 'Location is required. Allow location access and try again.' };
  const claimed = Date.parse(x.capturedAt);
  const skew = Number.isFinite(claimed) ? Math.abs(now - claimed) : null;
  const notes = [];
  if (skew === null) notes.push('no_device_time'); else if (skew > 15 * 60 * 1000) notes.push('device_clock_off');
  const acc = Number(x.accuracy);
  return { ok: true, value: { kind, b64: m[1], lat, lng, accuracy: Number.isFinite(acc) ? acc : null, claimedAt: Number.isFinite(claimed) ? new Date(claimed).toISOString() : null, note: notes.join(',') } };
}
