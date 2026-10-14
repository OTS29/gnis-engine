import { NextResponse, after } from 'next/server';
import crypto from 'crypto';
import { sql } from '@/lib/db';
import { hit, clientIp } from '@/lib/rateLimit';
import { sendEmail } from '@/lib/email';
import { baseUrl } from '@/lib/stripe';

export const runtime = 'nodejs';

// Always answers "ok" so nobody can use this to find out which emails have accounts.
export async function POST(req) {
  try {
    if (!(await hit(`forgot:ip:${clientIp(req)}`, 8, 3600)).allowed) {
      return NextResponse.json({ ok: false, error: 'Too many requests. Please try again later.' }, { status: 429 });
    }
    const b = await req.json();
    const email = String(b.email || '').trim().toLowerCase().slice(0, 120);
    if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ ok: false, error: 'Enter a valid email address' }, { status: 400 });
    if (!(await hit(`forgot:email:${email}`, 3, 3600)).allowed) return NextResponse.json({ ok: true });

    const [u] = await sql`select id::text as id, name, coalesce(suspended, false) as suspended from users where email = ${email} limit 1`;
    if (u && !u.suspended) {
      const token = crypto.randomBytes(32).toString('hex');
      const hash = crypto.createHash('sha256').update(token).digest('hex');
      await sql`delete from password_resets where user_id = ${u.id}`;
      await sql`insert into password_resets (token_hash, user_id, expires_at) values (${hash}, ${u.id}, now() + interval '1 hour')`;
      const link = `${baseUrl(req)}/reset-password?token=${token}`;
      after(async () => {
        await sendEmail({
          to: email,
          subject: 'Reset your GNIS password',
          text: `Hello${u.name ? ' ' + u.name : ''},\n\nUse this link to choose a new password. It works once and expires in one hour:\n${link}\n\nIf you did not ask for this, ignore this email. Your password has not changed.`,
          html: `<p>Hello${u.name ? ' ' + u.name : ''},</p><p>Use the button below to choose a new password. It works once and expires in one hour.</p><p><a href="${link}" style="background:#16a34a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Choose a new password</a></p><p style="color:#6b7280;font-size:13px">If you did not ask for this, ignore this email. Your password has not changed.</p>`,
        });
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('FORGOT_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Something went wrong. Try again.' }, { status: 500 });
  }
}
