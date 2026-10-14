import { toE164 } from '@/lib/sms';

// Automatic WhatsApp messages through Twilio. Nothing is sent unless these Vercel variables are set:
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM (your WhatsApp-enabled Twilio number, like +14155238886)
// Optional: TWILIO_WHATSAPP_TEMPLATE_SID, the Content SID of a template WhatsApp has approved. WhatsApp only lets a business
// message a customer first with an approved template, so real use needs one. Template variables sent: 1 name, 2 service,
// 3 business, 4 date, 5 time.
export async function sendWhatsApp(to, body, vars) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const num = toE164(to);
  if (!sid || !token || !from || !num) return { ok: false, skipped: true };
  try {
    const p = new URLSearchParams({ To: `whatsapp:${num}`, From: `whatsapp:${from.replace(/^whatsapp:/, '')}` });
    const tpl = process.env.TWILIO_WHATSAPP_TEMPLATE_SID;
    if (tpl && vars) {
      p.set('ContentSid', tpl);
      p.set('ContentVariables', JSON.stringify({ 1: vars.name, 2: vars.service, 3: vars.business, 4: vars.date, 5: vars.time }));
    } else {
      p.set('Body', body);
    }
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: p.toString(),
    });
    if (!r.ok) console.error('WHATSAPP_FAULT:', r.status, await r.text());
    return { ok: r.ok };
  } catch (e) {
    console.error('WHATSAPP_FAULT:', e);
    return { ok: false };
  }
}
