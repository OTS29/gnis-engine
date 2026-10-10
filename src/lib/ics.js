const pad = (n) => String(n).padStart(2, '0');
const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

// date = 'YYYY-MM-DD', time = 'HH:MM'. Times are "floating", so they show at the same clock time wherever the customer is.
function stamp(date, time, addMin = 0) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d, hh, mm + addMin));
  return `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}T${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}00`;
}

export function buildIcs({ uid, title, date, time, minutes = 60, location, description }) {
  const now = new Date();
  const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}00Z`;
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GNIS Engine//Bookings//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT', `UID:${uid}@gnis-engine`, `DTSTAMP:${dtstamp}`,
    `DTSTART:${stamp(date, time)}`, `DTEND:${stamp(date, time, minutes)}`,
    `SUMMARY:${esc(title)}`, `LOCATION:${esc(location)}`, `DESCRIPTION:${esc(description)}`,
    'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Appointment reminder', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}

export function googleCalendarUrl({ title, date, time, minutes = 60, location, description }) {
  const q = new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${stamp(date, time)}/${stamp(date, time, minutes)}`, details: description || '', location: location || '' });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

export function durationMinutes(text) {
  const s = String(text || '').toLowerCase();
  const h = s.match(/(\d+(?:\.\d+)?)\s*h/);
  const m = s.match(/(\d+)\s*m/);
  const mins = (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
  if (mins) return Math.round(mins);
  const bare = s.match(/^\s*(\d+)\s*$/);
  return bare ? Number(bare[1]) : 60;
}
