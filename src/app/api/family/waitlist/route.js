import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { hit, clientIp } from '@/lib/rateLimit';
import { getSession } from '@/lib/session';
import { validateWaitlist } from '@/lib/diaspora';

export const runtime = 'nodejs';

// Creates the table the first time it is used, so nothing has to be run in Neon for step 1.
let ready;
function ensure() {
  if (!ready) {
    ready = (async () => {
      await sql`create table if not exists diaspora_waitlist (
        id bigserial primary key,
        email text not null,
        role text not null check (role in ('customer', 'pro')),
        from_country text not null default 'GB',
        to_country text not null default 'NG',
        note text not null default '',
        consent_at timestamptz not null default now(),
        unsubscribed boolean not null default false,
        created_at timestamptz not null default now())`;
      await sql`create unique index if not exists diaspora_waitlist_email_role on diaspora_waitlist (lower(email), role)`;
    })().catch((e) => { ready = undefined; throw e; });
  }
  return ready;
}

// Public sign-up. Takes no payment. Works in every mode.
export async function POST(req) {
  try {
    if (!(await hit(`fam:wl:${clientIp(req)}`, 5, 3600)).allowed) {
      return NextResponse.json({ ok: false, error: 'Too many sign-ups from this connection. Please try again later.' }, { status: 429 });
    }
    const raw = await req.text();
    if (raw.length > 4000) return NextResponse.json({ ok: false, error: 'That was too long.' }, { status: 413 });
    let body;
    try { body = JSON.parse(raw); } catch { return NextResponse.json({ ok: false, error: 'Something went wrong.' }, { status: 400 }); }
    const v = validateWaitlist(body);
    if (!v.ok) return NextResponse.json(v.silent ? { ok: true } : { ok: false, error: v.error }, { status: v.silent ? 200 : 400 });
    const { email, role, from, to, note } = v.value;
    await ensure();
    // Same message whether or not the email was already on the list.
    await sql`insert into diaspora_waitlist (email, role, from_country, to_country, note)
      values (${email}, ${role}, ${from}, ${to}, ${note})
      on conflict (lower(email), role) do update set from_country = excluded.from_country, to_country = excluded.to_country,
        note = excluded.note, unsubscribed = false, consent_at = now()`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('FAMILY_WAITLIST_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Could not save that. Please try again.' }, { status: 500 });
  }
}

// Admin only: how many people are waiting. Open /api/family/waitlist while logged in as admin.
export async function GET(req) {
  try {
    const s = getSession(req);
    if (!s || s.role !== 'admin') return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 401 });
    await ensure();
    const summary = await sql`select role, from_country, to_country, count(*)::int as people from diaspora_waitlist where not unsubscribed group by 1, 2, 3 order by people desc`;
    const recent = await sql`select email, role, from_country, to_country, note, created_at from diaspora_waitlist where not unsubscribed order by created_at desc limit 100`;
    return NextResponse.json({ ok: true, summary, recent });
  } catch (e) {
    console.error('FAMILY_WAITLIST_ADMIN_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Could not load.' }, { status: 500 });
  }
}
