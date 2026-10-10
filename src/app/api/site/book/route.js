import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const b = await req.json();
    const slug = String(b.slug || '');
    const customer = String(b.customer || '').trim().slice(0, 80);
    const contact = String(b.contact || '').trim().slice(0, 120);
    const service = String(b.service || '').trim();
    const date = String(b.date || '');
    const time = String(b.time || '');

    if (!slug || !customer || !contact || !service) {
      return NextResponse.json({ ok: false, error: 'Please fill in all fields' }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
      return NextResponse.json({ ok: false, error: 'Invalid date or time' }, { status: 400 });
    }

    const [site] = await sql`select id, data from sites where slug = ${slug} and published`;
    if (!site) return NextResponse.json({ ok: false, error: 'Site not found' }, { status: 404 });

    const match = (site.data?.services || []).find((s) => s.name === service);
    if (!match) return NextResponse.json({ ok: false, error: 'Unknown service' }, { status: 400 });

    const listPrice = Number(match.price) || 0;
    let price = listPrice;
    let source = 'website';

    // A locked price comes from a token the server signed after a successful negotiation.
    if (b.lockToken) {
      try {
        const p = jwt.verify(String(b.lockToken), process.env.JWT_SECRET);
        if (p.typ === 'lock' && p.slug === slug && p.service === match.name && Number(p.price) <= listPrice) {
          price = Number(p.price);
          source = 'negotiated';
        }
      } catch {
        return NextResponse.json({ ok: false, error: 'Your agreed price expired. Please negotiate again.' }, { status: 400 });
      }
    }

    await sql`insert into site_bookings (site_id, customer, contact, service, price, list_price, source, date, time, status)
              values (${site.id}, ${customer}, ${contact}, ${match.name}, ${price}, ${listPrice}, ${source}, ${date}, ${time}, 'pending')`;
    return NextResponse.json({ ok: true, price }, { status: 201 });
  } catch (e) {
    console.error('SITE_BOOK_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Booking failed' }, { status: 500 });
  }
}
