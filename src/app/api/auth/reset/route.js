import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { sql } from '@/lib/db';
import { hit, clientIp } from '@/lib/rateLimit';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    if (!(await hit(`reset:ip:${clientIp(req)}`, 15, 3600)).allowed) {
      return NextResponse.json({ ok: false, error: 'Too many attempts. Please try again later.' }, { status: 429 });
    }
    const b = await req.json();
    const token = String(b.token || '');
    const password = String(b.password || '');
    if (password.length < 8) return NextResponse.json({ ok: false, error: 'Password must be at least 8 characters' }, { status: 400 });
    if (!/^[a-f0-9]{64}$/.test(token)) return NextResponse.json({ ok: false, error: 'This link is not valid. Ask for a new one.' }, { status: 400 });

    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const [r] = await sql`select user_id from password_resets where token_hash = ${hash} and used_at is null and expires_at > now()`;
    if (!r) return NextResponse.json({ ok: false, error: 'This link has expired or was already used. Ask for a new one.' }, { status: 400 });

    const pw = await bcrypt.hash(password, 12);
    await sql`update users set password_hash = ${pw}, sessions_valid_after = now() where id::text = ${r.user_id}`;
    await sql`update password_resets set used_at = now() where token_hash = ${hash}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('RESET_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Could not reset the password' }, { status: 500 });
  }
}
