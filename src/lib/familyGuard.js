import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';
import { diasporaMode, isTester } from '@/lib/diaspora';
import { ensureFamily } from '@/lib/familyDb';

const fail = (error, status) => ({ res: NextResponse.json({ ok: false, error }, { status }) });

// Every family route starts here. Returns { res } to stop, or { mode, user } to carry on.
export async function guard(req, { admin = false } = {}) {
  try {
    const mode = diasporaMode();
    if (mode === 'off') return fail('This feature is not available yet.', 404);
    const s = getSession(req);
    if (!s?.userId) return fail('Please log in first.', 401);
    const [u] = await sql`select id::text as id, email, name, role, coalesce(suspended, false) as suspended from users where id::text = ${String(s.userId)}`;
    if (!u || u.suspended) return fail('Please log in first.', 401);
    if (mode === 'test' && !isTester(u.email, u.role)) return fail('Test mode: invited testers only.', 403);
    if (admin && u.role !== 'admin') return fail('Not allowed.', 403);
    await ensureFamily();
    return { mode, user: u };
  } catch (e) {
    console.error('FAMILY_GUARD_FAULT:', e);
    return fail('Something went wrong. Please try again.', 500);
  }
}

export const json = (data, status = 200) => NextResponse.json(data, { status });
