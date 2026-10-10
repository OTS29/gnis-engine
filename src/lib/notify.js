import { sendEmail } from '@/lib/email';
import { sendSms } from '@/lib/sms';
import { buildIcs, googleCalendarUrl, durationMinutes } from '@/lib/ics';
import { formatMoney } from '@/lib/siteDefaults';
import { mail } from '@/lib/i18n';

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());
const h = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function ctx(site, b) {
  const data = site.data || {};
  const lang = data.language || 'en';
  const svc = (data.services || []).find((s) => s.name === b.service);
  const date = String(b.date).slice(0, 10);
  const time = String(b.time).slice(0, 5);
  return {
    data, lang, date, time,
    minutes: durationMinutes(svc?.duration),
    vars: { name: b.customer, service: b.service, date, time, business: data.businessName || '', price: formatMoney(b.price, data.currency, lang) },
  };
}

function page(accent, title, body, extra = '') {
  return `<div style="font-family:system-ui,Segoe UI,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111827">
    <h2 style="margin:0 0 12px;color:${h(accent)}">${h(title)}</h2><p style="font-size:16px;line-height:1.55">${h(body)}</p>${extra}</div>`;
}

export async function notifyNewBooking(site, b) {
  const { data, lang, vars } = ctx(site, b);
  const jobs = [];
  if (isEmail(b.contact)) jobs.push(sendEmail({ to: b.contact.trim(), subject: mail(lang, 'newSubject'), html: page(data.accent || '#2563eb', mail(lang, 'newSubject'), mail(lang, 'newBody', vars)), replyTo: isEmail(data.email) ? data.email : undefined }));
  if (isEmail(data.email)) {
    const line = `${b.customer} (${b.contact}) requested ${b.service} on ${vars.date} at ${vars.time} for ${vars.price}.`;
    jobs.push(sendEmail({ to: data.email, subject: `New booking request: ${b.customer}`, html: page(data.accent || '#2563eb', 'New booking request', line, '<p style="font-size:14px;color:#6b7280">Open your dashboard to approve or decline it.</p>') }));
  }
  await Promise.allSettled(jobs);
}

export async function notifyStatus(site, b, status) {
  const { data, lang, vars, date, time, minutes } = ctx(site, b);
  if (!isEmail(b.contact) || !['approved', 'cancelled'].includes(status)) return;
  const accent = data.accent || '#2563eb';
  if (status === 'approved') {
    const ev = { title: `${b.service} · ${data.businessName}`, date, time, minutes, location: data.location, description: `Booking with ${data.businessName}` };
    const ics = buildIcs({ uid: `booking-${b.id}`, ...ev });
    const link = googleCalendarUrl(ev);
    await sendEmail({
      to: b.contact.trim(), subject: mail(lang, 'okSubject'),
      html: page(accent, mail(lang, 'okSubject'), mail(lang, 'okBody', vars), `<p><a href="${h(link)}" style="color:${h(accent)}">${h(mail(lang, 'addCal'))}</a></p>`),
      attachments: [{ filename: 'booking.ics', content: Buffer.from(ics).toString('base64'), content_type: 'text/calendar' }],
      replyTo: isEmail(data.email) ? data.email : undefined,
    });
  } else {
    await sendEmail({ to: b.contact.trim(), subject: mail(lang, 'cancelSubject'), html: page(accent, mail(lang, 'cancelSubject'), mail(lang, 'cancelBody', vars)), replyTo: isEmail(data.email) ? data.email : undefined });
  }
}

export async function sendReminder(site, b) {
  const { data, lang, vars } = ctx(site, b);
  const accent = data.accent || '#2563eb';
  if (isEmail(b.contact)) {
    await sendEmail({ to: b.contact.trim(), subject: mail(lang, 'remSubject'), html: page(accent, mail(lang, 'remSubject'), mail(lang, 'remBody', vars)), replyTo: isEmail(data.email) ? data.email : undefined });
  } else {
    await sendSms(b.contact, mail(lang, 'sms', vars));
  }
}
