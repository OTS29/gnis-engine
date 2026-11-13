import { sql } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { SITE_URL } from '@/lib/site';

const h = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Emails the professional when a new family booking request arrives, so a request is not missed for the 24 hours it stays open.
// Sends nothing if email is not set up. Never includes the family member's phone number.
export async function notifyProOfRequest(bookingId) {
  const [r] = await sql`select b.id, b.service_name, b.scheduled_date::text as d, b.scheduled_time as t, b.recipient_area as area, b.is_test,
      to_char(b.respond_by at time zone 'Europe/London', 'DD Mon HH24:MI') as respond_by, s.data->>'businessName' as business, u.email as pro_email
    from family_bookings b join sites s on s.id::text = b.site_id join users u on u.id::text = s.owner_id::text
    where b.id = ${bookingId}`;
  if (!r?.pro_email) return { ok: false, skipped: true };
  const link = `${SITE_URL}/family/jobs/${r.id}`;
  const tag = r.is_test ? ' (test)' : '';
  const when = `${r.d} at ${r.t}`;
  const subject = `New family booking request${tag}: ${r.service_name}`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto;color:#111827">
    <h2 style="margin:0 0 8px">New family booking request${h(tag)}</h2>
    <p style="margin:0 0 12px">Hi ${h(r.business || 'there')}, someone abroad would like to book you for a family member.</p>
    <table style="border-collapse:collapse;font-size:15px">
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Service</td><td><b>${h(r.service_name)}</b></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">When</td><td>${h(when)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Where</td><td>${h(r.area)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Reply before</td><td><b>${h(r.respond_by)}</b> (London time)</td></tr>
    </table>
    <p style="margin:18px 0"><a href="${h(link)}" style="background:#059669;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700;display:inline-block">Accept or decline</a></p>
    <p style="font-size:13px;color:#6b7280">If you do not reply in time the request expires and the customer is not charged.</p></div>`;
  const text = `New family booking request${tag}\n${r.service_name}, ${when}, ${r.area}\nReply before ${r.respond_by} (London time).\nOpen: ${link}`;
  return sendEmail({ to: r.pro_email, subject, html, text });
}
