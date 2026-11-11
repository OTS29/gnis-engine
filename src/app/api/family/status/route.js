import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession } from '@/lib/session';
import { diasporaMode, isTester } from '@/lib/diaspora';

export const runtime = 'nodejs';

// Tells the pages which mode is on and whether this visitor may use it. Reveals nothing else.
export async function GET(req) {
  const mode = diasporaMode();
  let signedIn = false, tester = false, admin = false;
  try {
    const s = getSession(req);
    if (s?.userId) {
      const [u] = await sql`select email, role from users where id::text = ${String(s.userId)}`;
      if (u) { signedIn = true; admin = u.role === 'admin'; tester = isTester(u.email, u.role); }
    }
  } catch (e) { console.error('FAMILY_STATUS_FAULT:', e); }
  return NextResponse.json({ ok: true, mode, signedIn, admin, allowed: mode !== 'off' && signedIn && (mode !== 'test' || tester) });
}
