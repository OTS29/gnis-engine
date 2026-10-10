// Sends SMS through Twilio. If the Twilio variables are not set, nothing is sent.
export function toE164(raw) {
  const s = String(raw || '').replace(/[^\d+]/g, '');
  if (/^\+\d{8,15}$/.test(s)) return s;
  const cc = process.env.DEFAULT_COUNTRY_CODE || '+44';
  if (/^0\d{9,11}$/.test(s)) return cc + s.slice(1);
  return null;
}

export async function sendSms(to, body) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  const num = toE164(to);
  if (!sid || !token || !from || !num) return { ok: false, skipped: true };
  try {
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: num, From: from, Body: body }).toString(),
    });
    if (!r.ok) console.error('SMS_FAULT:', r.status, await r.text());
    return { ok: r.ok };
  } catch (e) {
    console.error('SMS_FAULT:', e);
    return { ok: false };
  }
}
