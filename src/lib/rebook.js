import jwt from 'jsonwebtoken';
import { sql } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { planOfUser, limitsFor } from '@/lib/plans';
import { mail } from '@/lib/i18n';
import { SITE_URL } from '@/lib/site';

const h = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());
export const contactKey = (c) => String(c || '').trim().toLowerCase();

export function unsubToken(siteId, key) {
  return jwt.sign({ typ: 'unsub', s: String(siteId), k: key }, process.env.JWT_SECRET, { expiresIn: '3y' });
}

// Sends "time to book again" emails. One message per completed visit, never to people who already have a future booking,
// asked not to be contacted, or whose seller is on the Starter plan. Called once a day from the reminders cron.
export async function runRebook(maxSend = 80) {
  const sites = await sql`select s.id, s.slug, s.owner_id::text as owner, s.data, (s.data->>'rebookDays')::int as days
    from sites s where s.published and coalesce((s.data->>'rebookDays')::int, 0) > 0 limit 300`;
  let sent = 0;
  for (const site of sites) {
    if (sent >= maxSend) break;
    try {
      if (!limitsFor(await planOfUser(site.owner)).rebook) continue;
      const days = site.days;
      const rows = await sql`select lower(trim(b.contact)) as k, (array_agg(b.customer order by b.date desc))[1] as customer,
          (array_agg(b.contact order by b.date desc))[1] as contact, (array_agg(b.service order by b.date desc))[1] as service,
          max(b.date::text) filter (where lower(b.status) = 'completed') as last_done,
          bool_or(lower(b.status) in ('pending', 'approved') and b.date::date >= (now() at time zone 'Europe/London')::date) as upcoming
        from site_bookings b where b.site_id = ${site.id} group by 1`;
      for (const r of rows) {
        if (sent >= maxSend) break;
        if (!r.last_done || r.upcoming || !isEmail(r.contact)) continue;
        const [due] = await sql`select (${r.last_done}::date <= ((now() at time zone 'Europe/London')::date - ${days}::int)
            and ${r.last_done}::date >= ((now() at time zone 'Europe/London')::date - 365)) as ok`;
        if (!due?.ok) continue;
        const [c] = await sql`select rebook_optout, last_rebook_at from site_customers where site_id = ${site.id} and contact_key = ${r.k}`;
        if (c?.rebook_optout) continue;
        if (c?.last_rebook_at && new Date(c.last_rebook_at).toISOString().slice(0, 10) >= String(r.last_done).slice(0, 10)) continue;

        const data = site.data || {};
        const lang = data.language || 'en';
        const accent = data.accent || '#2563eb';
        const vars = { name: r.customer, service: r.service, business: data.businessName || '' };
        const link = `${SITE_URL}/site/${site.slug}`;
        const stop = `${SITE_URL}/api/site/unsub?t=${encodeURIComponent(unsubToken(site.id, r.k))}`;
        const res = await sendEmail({
          to: r.contact.trim(), subject: mail(lang, 'rebookSubject', vars),
          html: `<div style="font-family:system-ui,Segoe UI,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111827">
            <h2 style="margin:0 0 12px;color:${h(accent)}">${h(mail(lang, 'rebookSubject', vars))}</h2>
            <p style="font-size:16px;line-height:1.55">${h(mail(lang, 'rebookBody', vars))}</p>
            <p><a href="${h(link)}" style="display:inline-block;background:${h(accent)};color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700">${h(mail(lang, 'rebookBtn', vars))}</a></p>
            <p style="font-size:12px;color:#9ca3af;margin-top:28px"><a href="${h(stop)}" style="color:#9ca3af">${h(mail(lang, 'rebookStop', vars))}</a></p></div>`,
          replyTo: isEmail(data.email) ? data.email : undefined,
        });
        if (res?.skipped) return { sent, note: 'email not configured' };
        // Mark as handled even when the send failed once, so a bad address is not retried every day.
        await sql`insert into site_customers (site_id, contact_key, last_rebook_at) values (${site.id}, ${r.k}, now())
          on conflict (site_id, contact_key) do update set last_rebook_at = now()`;
        if (res?.ok !== false) sent++;
      }
    } catch (e) { console.error('REBOOK_SITE_FAULT:', e); }
  }
  return { sent };
}
