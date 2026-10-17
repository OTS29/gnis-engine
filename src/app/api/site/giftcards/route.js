import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { sameOrigin } from '@/lib/security';
import { getSession, isOwnerRole } from '@/lib/session';
import { normCode } from '@/lib/giftcards';

export const runtime = 'nodejs';

// The owner's gift cards: list them, and use up some balance when a customer pays with one.
export async function GET(req) {
  try {
    const s = getSession(req);
    if (!isOwnerRole(s)) return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 401 });
    const rows = await sql`select g.id, g.code, g.amount::float8 as amount, g.balance::float8 as balance, g.currency, g.buyer_name, g.buyer_email,
        g.recipient_name, g.recipient_email, g.status,
        to_char(g.created_at at time zone 'Europe/London', 'YYYY-MM-DD') as created
      from gift_cards g join sites st on st.id = g.site_id
      where st.owner_id = ${s.userId} and g.status = 'active' order by g.created_at desc limit 500`;
    return NextResponse.json({ ok: true, data: rows });
  } catch (e) {
    console.error('GIFTCARDS_GET_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Could not load gift cards' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    if (!sameOrigin(req)) return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 403 });
    const s = getSession(req);
    if (!isOwnerRole(s)) return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 401 });
    const b = await req.json();
    const code = normCode(b.code);
    if (!code) return NextResponse.json({ ok: false, error: 'That code does not look right. It has 8 letters and numbers.' }, { status: 400 });
    const [card] = await sql`select g.id, g.balance::float8 as balance, g.currency from gift_cards g join sites st on st.id = g.site_id
      where g.code = ${code} and g.status = 'active' and st.owner_id = ${s.userId}`;
    if (!card) return NextResponse.json({ ok: false, error: 'No active gift card with that code for your business.' }, { status: 404 });

    if (b.amount == null || b.amount === '') return NextResponse.json({ ok: true, balance: card.balance, currency: card.currency });
    const amt = Math.round((Number(b.amount) || 0) * 100) / 100;
    if (!(amt > 0)) return NextResponse.json({ ok: false, error: 'Enter an amount to use.' }, { status: 400 });
    // One atomic statement: the balance can never go below zero, even if two people press the button at once.
    const [u] = await sql`update gift_cards set balance = balance - ${amt}, last_used_at = now()
      where id = ${card.id} and status = 'active' and balance >= ${amt} returning balance::float8 as balance`;
    if (!u) return NextResponse.json({ ok: false, error: `That is more than the balance left (${card.balance}).` }, { status: 400 });
    return NextResponse.json({ ok: true, balance: u.balance, currency: card.currency, used: amt });
  } catch (e) {
    console.error('GIFTCARDS_POST_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Something went wrong' }, { status: 500 });
  }
}
