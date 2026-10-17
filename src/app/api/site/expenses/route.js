import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession, isOwnerRole } from '@/lib/session';
import { planOfUser, limitsFor } from '@/lib/plans';
import { sameOrigin } from '@/lib/security';
import { hit } from '@/lib/rateLimit';
import { EXPENSE_CATEGORIES, isIso, addDays, londonToday } from '@/lib/finance';

export const runtime = 'nodejs';

async function owner(req) {
  if (!sameOrigin(req)) return { err: NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 403 }) };
  const s = getSession(req);
  if (!isOwnerRole(s)) return { err: NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 401 }) };
  if (!limitsFor(await planOfUser(s.userId)).finance) return { err: NextResponse.json({ ok: false, error: 'Expenses and profit are a Professional plan feature.' }, { status: 402 }) };
  if (!(await hit(`exp:${s.userId}`, 300, 3600)).allowed) return { err: NextResponse.json({ ok: false, error: 'Too many changes. Try again later.' }, { status: 429 }) };
  const [site] = await sql`select id from sites where owner_id::text = ${String(s.userId)}`;
  if (!site) return { err: NextResponse.json({ ok: false, error: 'Save your site first' }, { status: 400 }) };
  return { site };
}

function clean(b) {
  const today = londonToday();
  const date = String(b.date || '');
  const amount = Math.round((Number(b.amount) || 0) * 100) / 100;
  const category = EXPENSE_CATEGORIES.includes(b.category) ? b.category : 'Other';
  const note = String(b.note || '').replace(/\s+/g, ' ').trim().slice(0, 200);
  if (!isIso(date) || date > addDays(today, 31) || date < addDays(today, -1830)) return { error: 'Choose a valid date.' };
  if (!(amount > 0) || amount > 10000000) return { error: 'Enter an amount above zero.' };
  return { date, amount, category, note };
}

export async function POST(req) {
  try {
    const o = await owner(req); if (o.err) return o.err;
    const c = clean(await req.json());
    if (c.error) return NextResponse.json({ ok: false, error: c.error }, { status: 400 });
    const [r] = await sql`insert into site_expenses (site_id, spent_on, category, amount, note) values (${o.site.id}, ${c.date}, ${c.category}, ${c.amount}, ${c.note}) returning id`;
    return NextResponse.json({ ok: true, id: r.id });
  } catch (e) {
    console.error('EXPENSE_POST_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Could not save' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const o = await owner(req); if (o.err) return o.err;
    const b = await req.json();
    const c = clean(b);
    if (c.error) return NextResponse.json({ ok: false, error: c.error }, { status: 400 });
    const [r] = await sql`update site_expenses set spent_on = ${c.date}, category = ${c.category}, amount = ${c.amount}, note = ${c.note} where id = ${Number(b.id)} and site_id = ${o.site.id} returning id`;
    if (!r) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('EXPENSE_PUT_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Could not save' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const o = await owner(req); if (o.err) return o.err;
    const id = Number(new URL(req.url).searchParams.get('id'));
    const [r] = await sql`delete from site_expenses where id = ${id} and site_id = ${o.site.id} returning id`;
    if (!r) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('EXPENSE_DELETE_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Could not delete' }, { status: 500 });
  }
}
