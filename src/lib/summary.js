import { sql } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { formatMoney } from '@/lib/siteDefaults';
import { SITE_URL } from '@/lib/site';

const h = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());

// Monday morning email to each business owner: last 7 days at a glance. Sent at most once per Monday per business.
export async function runWeekly(maxSend = 60) {
  const [d] = await sql`select extract(isodow from (now() at time zone 'Europe/London'))::int as dow, (now() at time zone 'Europe/London')::date::text as today`;
  if (d.dow !== 1) return { sent: 0, note: 'not Monday' };
  const sites = await sql`select s.id, s.data, u.email as owner_email from sites s join users u on u.id::text = s.owner_id::text
    where s.published and coalesce(u.suspended, false) = false and coalesce((s.data->>'weeklySummary')::boolean, true) = true
      and not exists (select 1 from owner_summaries o where o.site_id = s.id and o.last_sent = ${d.today}::date) limit ${maxSend}`;
  let sent = 0;
  for (const s of sites) {
    try {
      const data = s.data || {};
      const to = isEmail(data.email) ? data.email : s.owner_email;
      if (!isEmail(to)) continue;
      const [m] = await sql`select
          count(*) filter (where created_at >= now() - interval '7 days' and coalesce(source, 'website') <> 'import')::int as new_bookings,
          count(*) filter (where lower(status) = 'completed' and date::date >= (now() at time zone 'Europe/London')::date - 7 and coalesce(source, 'website') <> 'import')::int as done,
          coalesce(sum(price) filter (where lower(status) = 'completed' and date::date >= (now() at time zone 'Europe/London')::date - 7 and coalesce(source, 'website') <> 'import'), 0)::float8 as earned,
          count(*) filter (where lower(status) = 'no_show' and date::date >= (now() at time zone 'Europe/London')::date - 7)::int as no_shows,
          count(*) filter (where lower(status) in ('pending', 'approved') and date::date between (now() at time zone 'Europe/London')::date and (now() at time zone 'Europe/London')::date + 6)::int as coming,
          count(*) filter (where lower(status) = 'pending')::int as waiting
        from site_bookings where site_id = ${s.id}`;
      const [r] = await sql`select count(*)::int as n, coalesce(avg(rating), 0)::float8 as avg from site_reviews where site_id = ${s.id} and created_at >= now() - interval '7 days'`;
      const [due] = await sql`select count(*)::int as n from (
          select lower(trim(contact)) as k, max(date::date) filter (where lower(status) = 'completed') as last_done,
            bool_or(lower(status) in ('pending', 'approved') and date::date >= (now() at time zone 'Europe/London')::date) as upcoming
          from site_bookings where site_id = ${s.id} group by 1) x
        where x.last_done is not null and not x.upcoming and x.last_done <= (now() at time zone 'Europe/London')::date - ${Number(data.rebookDays) || 28}::int
          and x.last_done >= (now() at time zone 'Europe/London')::date - 365`;
      const money = (v) => formatMoney(v, data.currency, data.language || 'en');
      const accent = data.accent || '#2563eb';
      const row = (label, val) => `<tr><td style="padding:8px 0;color:#6b7280">${h(label)}</td><td style="padding:8px 0;text-align:right;font-weight:700">${h(val)}</td></tr>`;
      const tips = [];
      if (m.waiting > 0) tips.push(`${m.waiting} booking${m.waiting > 1 ? 's are' : ' is'} still waiting for your answer.`);
      if (due.n > 0) tips.push(`${due.n} customer${due.n > 1 ? 's are' : ' is'} due for a visit. Open Customers and send them a message.`);
      if (m.no_shows > 0) tips.push('Turn on deposits in Payments to cut no-shows.');
      const res = await sendEmail({
        to: to.trim(), subject: `Your week at ${data.businessName || 'your business'}`,
        html: `<div style="font-family:system-ui,Segoe UI,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111827">
          <h2 style="margin:0 0 4px;color:${h(accent)}">Your week at a glance</h2>
          <p style="margin:0 0 14px;color:#6b7280;font-size:14px">${h(data.businessName || '')} · last 7 days</p>
          <table style="width:100%;border-collapse:collapse;font-size:15px">
            ${row('Money from completed visits', money(m.earned))}${row('Visits completed', String(m.done))}${row('New booking requests', String(m.new_bookings))}
            ${row('Coming up this week', String(m.coming))}${row('No-shows', String(m.no_shows))}${row('New reviews', r.n ? `${r.n} (average ${r.avg.toFixed(1)} of 5)` : '0')}
          </table>
          ${tips.length ? `<p style="margin:18px 0 6px;font-weight:700">To do</p><ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.6">${tips.map((t) => `<li>${h(t)}</li>`).join('')}</ul>` : ''}
          <p style="margin-top:20px"><a href="${h(SITE_URL)}/dashboard" style="display:inline-block;background:${h(accent)};color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700">Open my dashboard</a></p>
          <p style="font-size:12px;color:#9ca3af;margin-top:24px">Turn this email off in your dashboard, Design tab, "Weekly summary".</p></div>`,
      });
      if (res?.skipped) return { sent, note: 'email not configured' };
      await sql`insert into owner_summaries (site_id, last_sent) values (${s.id}, ${d.today}::date) on conflict (site_id) do update set last_sent = excluded.last_sent`;
      if (res?.ok !== false) sent++;
    } catch (e) { console.error('WEEKLY_FAULT:', e); }
  }
  return { sent };
}
