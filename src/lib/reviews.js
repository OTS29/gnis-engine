import jwt from 'jsonwebtoken';
import { sql } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { mail } from '@/lib/i18n';
import { SITE_URL } from '@/lib/site';

const h = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());

export const reviewToken = (bookingId, siteId) => jwt.sign({ typ: 'rev', b: String(bookingId), s: String(siteId) }, process.env.JWT_SECRET, { expiresIn: '45d' });
export const readReviewToken = (t) => { try { const p = jwt.verify(String(t || ''), process.env.JWT_SECRET); return p.typ === 'rev' ? p : null; } catch { return null; } };

// Asks customers for a star rating the day after a visit is marked Completed. One email per visit, only to real email addresses,
// never for imported customers and never to someone who asked not to be contacted.
export async function askReviews(maxSend = 60) {
  const rows = await sql`select b.id, b.customer, b.contact, b.service, st.id as site_id, st.data
    from site_bookings b join sites st on st.id = b.site_id
    where lower(b.status) = 'completed' and b.review_asked_at is null and coalesce(b.source, 'website') <> 'import'
      and st.published and b.date::date <= (now() at time zone 'Europe/London')::date - 1
      and b.date::date >= (now() at time zone 'Europe/London')::date - 14
      and not exists (select 1 from site_customers sc where sc.site_id = b.site_id and sc.contact_key = lower(trim(b.contact)) and sc.rebook_optout)
    order by b.date desc limit ${maxSend}`;
  let sent = 0;
  for (const r of rows) {
    try {
      // Mark first so a crash can never cause the same person to be emailed twice.
      const [m] = await sql`update site_bookings set review_asked_at = now() where id = ${r.id} and review_asked_at is null returning id`;
      if (!m || !isEmail(r.contact)) continue;
      const data = r.data || {};
      const lang = data.language || 'en';
      const accent = data.accent || '#2563eb';
      const vars = { name: String(r.customer || '').split(' ')[0], service: r.service, business: data.businessName || '' };
      const tok = encodeURIComponent(reviewToken(r.id, r.site_id));
      const stars = [1, 2, 3, 4, 5].map((n) => `<a href="${h(`${SITE_URL}/api/site/review?t=${tok}&r=${n}`)}" style="text-decoration:none;font-size:34px;color:#f59e0b;padding:0 3px">★</a>`).join('');
      const res = await sendEmail({
        to: r.contact.trim(), subject: mail(lang, 'reviewSubject', vars),
        html: `<div style="font-family:system-ui,Segoe UI,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111827">
          <h2 style="margin:0 0 12px;color:${h(accent)}">${h(mail(lang, 'reviewSubject', vars))}</h2>
          <p style="font-size:16px;line-height:1.55">${h(mail(lang, 'reviewBody', vars))}</p>
          <p style="margin:18px 0">${stars}</p></div>`,
        replyTo: isEmail(data.email) ? data.email : undefined,
      });
      if (res?.skipped) { await sql`update site_bookings set review_asked_at = null where id = ${r.id}`; return { sent, note: 'email not configured' }; }
      if (res?.ok !== false) sent++;
    } catch (e) { console.error('REVIEW_ASK_FAULT:', e); }
  }
  return { sent };
}
