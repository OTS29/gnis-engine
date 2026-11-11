// "Book for family back home". One switch controls everything: DIASPORA_MODE in Vercel.
//   off  (default)  only the explainer page and the waiting list work
//   test            invited testers only, pretend payments, no real money (later steps)
//   live            needs DIASPORA_LIVE_OK=yes as well. Without it, live is treated as test.
export function diasporaMode() {
  const m = String(process.env.DIASPORA_MODE || 'off').trim().toLowerCase();
  if (m === 'live') return String(process.env.DIASPORA_LIVE_OK || '').trim().toLowerCase() === 'yes' ? 'live' : 'test';
  return m === 'test' ? 'test' : 'off';
}

// Comma-separated emails in DIASPORA_TESTERS. Admins are always allowed to test.
export function isTester(email, role) {
  if (role === 'admin') return true;
  const list = String(process.env.DIASPORA_TESTERS || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
  return !!email && list.includes(String(email).toLowerCase());
}

export const FROM_COUNTRIES = { GB: 'United Kingdom', US: 'United States', CA: 'Canada', IE: 'Ireland', DE: 'Germany', FR: 'France', OTHER: 'Another country' };
export const TO_COUNTRIES = { NG: 'Nigeria', GH: 'Ghana', KE: 'Kenya', ZA: 'South Africa', OTHER: 'Another country' };

// Pure function, no database. Returns { ok:true, value } or { ok:false, error }.
export function validateWaitlist(b) {
  const x = b && typeof b === 'object' ? b : {};
  if (String(x.website || '').trim()) return { ok: false, error: 'Thanks.', silent: true }; // hidden field: bots fill it in
  const email = String(x.email || '').trim().toLowerCase();
  if (email.length > 160 || !/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/.test(email)) return { ok: false, error: 'Please enter a valid email address.' };
  const role = x.role === 'pro' ? 'pro' : x.role === 'customer' ? 'customer' : null;
  if (!role) return { ok: false, error: 'Please choose whether you are booking for family or offering a service.' };
  if (x.consent !== true) return { ok: false, error: 'Please tick the box so we can email you about this.' };
  const from = Object.hasOwn(FROM_COUNTRIES, x.from) ? x.from : 'GB';
  const to = Object.hasOwn(TO_COUNTRIES, x.to) ? x.to : 'NG';
  const note = String(x.note || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 300);
  return { ok: true, value: { email, role, from, to, note } };
}
