// Sends email through Resend (https://resend.com). If RESEND_API_KEY is not set, nothing is sent and nothing breaks.
export async function sendEmail({ to, subject, html, text, attachments, replyTo }) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return { ok: false, skipped: true };
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'Bookings <onboarding@resend.dev>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text,
        reply_to: replyTo || undefined,
        attachments,
      }),
    });
    if (!r.ok) console.error('EMAIL_FAULT:', r.status, await r.text());
    return { ok: r.ok };
  } catch (e) {
    console.error('EMAIL_FAULT:', e);
    return { ok: false };
  }
}
