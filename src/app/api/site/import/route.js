import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { sameOrigin } from '@/lib/security';
import { hit } from '@/lib/rateLimit';
import { liveSession, isOwnerRole } from '@/lib/session';

export const runtime = 'nodejs';

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const isPhone = (s) => /^\+?[\d\s()-]{7,20}$/.test(s);

// Bring your existing customers in. Each one is saved as one past, completed visit (marked "import"), so they show in Customers,
// in "Due for a visit" and in rebooking emails. Imports never count towards the public stats or the Top businesses list.
export async function POST(req) {
  try {
    if (!sameOrigin(req)) return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 403 });
    const s = await liveSession(req);
    if (!isOwnerRole(s)) return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 401 });
    if (!(await hit(`import:${s.userId}`, 20, 3600)).allowed) return NextResponse.json({ ok: false, error: 'Too many imports. Try again later.' }, { status: 429 });
    const b = await req.json();
    if (b.consent !== true) return NextResponse.json({ ok: false, error: 'Please confirm you have permission to contact these customers.' }, { status: 400 });
    const [site] = await sql`select id from sites where owner_id::text = ${String(s.userId)}`;
    if (!site) return NextResponse.json({ ok: false, error: 'Save your site first' }, { status: 400 });
    const rows = Array.isArray(b.rows) ? b.rows.slice(0, 500) : [];
    const today = new Date().toISOString().slice(0, 10);
    const seen = new Set();
    const names = [], contacts = [], services = [], prices = [], dates = [];
    let skipped = 0;
    for (const r of rows) {
      const contact = String(r?.contact || '').trim().slice(0, 120);
      const key = contact.toLowerCase();
      if (!contact || !(isEmail(contact) || isPhone(contact)) || seen.has(key)) { skipped++; continue; }
      seen.add(key);
      let d = String(r?.lastVisit || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d > today || isNaN(new Date(d).getTime())) d = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      names.push(String(r?.name || 'Customer').trim().slice(0, 80) || 'Customer');
      contacts.push(contact);
      services.push(String(r?.service || 'Previous visit').trim().slice(0, 80) || 'Previous visit');
      prices.push(Math.max(0, Math.min(100000, Number(r?.spent) || 0)));
      dates.push(d);
    }
    if (!contacts.length) return NextResponse.json({ ok: false, error: 'No usable rows. Each row needs an email or phone number.' }, { status: 400 });
    // Customers you already have are left alone.
    const existing = await sql`select distinct lower(trim(contact)) as k from site_bookings where site_id = ${site.id}`;
    const have = new Set(existing.map((e) => e.k));
    const keep = contacts.map((c, i) => i).filter((i) => !have.has(contacts[i].toLowerCase()));
    if (!keep.length) return NextResponse.json({ ok: true, added: 0, skipped: rows.length, note: 'All of these customers were already in your list.' });
    await sql`insert into site_bookings (site_id, customer, contact, service, price, list_price, source, date, time, status)
      select st.id, t.n, t.c, t.sv, t.p, t.p, 'import', t.d::date, '00:00', 'completed'
      from sites st, unnest(${keep.map((i) => names[i])}::text[], ${keep.map((i) => contacts[i])}::text[], ${keep.map((i) => services[i])}::text[], ${keep.map((i) => prices[i])}::float8[], ${keep.map((i) => dates[i])}::text[]) as t(n, c, sv, p, d)
      where st.id = ${site.id}`;
    return NextResponse.json({ ok: true, added: keep.length, skipped: rows.length - keep.length });
  } catch (e) {
    console.error('IMPORT_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Import failed' }, { status: 500 });
  }
}
