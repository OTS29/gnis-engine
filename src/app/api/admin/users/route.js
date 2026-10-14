import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sql } from '@/lib/db';
import { requireAdmin, loadUsers, logAdmin } from '@/lib/admin';

export const runtime = 'nodejs';

const ROLES = ['pro', 'client', 'admin'];
const deny = () => NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 403 });
const bad = (error, status = 400) => NextResponse.json({ ok: false, error }, { status });
const txt = (v, n) => String(v ?? '').trim().slice(0, n);

function tempPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.randomBytes(12), (b) => chars[b % chars.length]).join('');
}

export async function GET(req) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return deny();
    return NextResponse.json({ ok: true, data: await loadUsers() });
  } catch (e) {
    console.error('ADMIN_USERS_GET_FAULT:', e);
    return bad('Could not load users', 500);
  }
}

// Add a user by hand. They get a temporary password to change.
export async function POST(req) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return deny();
    const b = await req.json();
    const email = txt(b.email, 120).toLowerCase();
    const role = ROLES.includes(b.role) ? b.role : 'client';
    if (!/^\S+@\S+\.\S+$/.test(email)) return bad('Enter a valid email address');
    const password = txt(b.password, 100) || tempPassword();
    if (password.length < 8) return bad('Password must be at least 8 characters');
    const hash = await bcrypt.hash(password, 12);
    const rows = await sql`insert into users (email, password_hash, name, role, region, country, skill)
      values (${email}, ${hash}, ${txt(b.name, 80) || null}, ${role}, ${txt(b.country, 4) || null}, ${txt(b.country, 4) || null}, ${txt(b.skill, 80) || null})
      on conflict (email) do nothing returning id::text as id, email`;
    if (!rows.length) return bad('A user with that email already exists');
    await logAdmin(admin, 'add_user', rows[0], `Role ${role}`);
    return NextResponse.json({ ok: true, user: rows[0], password });
  } catch (e) {
    console.error('ADMIN_USERS_POST_FAULT:', e);
    return bad('Could not add the user', 500);
  }
}

export async function PATCH(req) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return deny();
    const b = await req.json();
    const id = String(b.id || '');
    const [u] = await sql`select id::text as id, email, role from users where id::text = ${id}`;
    if (!u) return bad('User not found', 404);
    const self = u.id === admin.id;
    const act = String(b.action || '');

    if (act === 'edit') {
      await sql`update users set name = ${txt(b.name, 80) || null}, country = ${txt(b.country, 4) || null}, skill = ${txt(b.skill, 80) || null} where id::text = ${id}`;
      await logAdmin(admin, 'edit', u, 'Changed name, country or profession');
      return NextResponse.json({ ok: true });
    }
    if (act === 'note') {
      await sql`update users set admin_note = ${txt(b.note, 1000) || null} where id::text = ${id}`;
      await logAdmin(admin, 'note', u, 'Updated private note');
      return NextResponse.json({ ok: true });
    }
    if (act === 'role') {
      if (!ROLES.includes(b.role)) return bad('Unknown role');
      if (self) return bad('You cannot change your own role');
      await sql`update users set role = ${b.role} where id::text = ${id}`;
      await logAdmin(admin, 'role', u, `${u.role} to ${b.role}`);
      return NextResponse.json({ ok: true });
    }
    if (act === 'suspend' || act === 'unsuspend') {
      if (self) return bad('You cannot deactivate yourself');
      if (u.role === 'admin') return bad('Change their role first, then deactivate');
      const on = act === 'suspend';
      await sql`update users set suspended = ${on} where id::text = ${id}`;
      // Deactivating also takes their public page offline. Reactivating does not republish it: they do that by saving.
      if (on) await sql`update sites set published = false where owner_id::text = ${id}`;
      await logAdmin(admin, act, u, on ? 'Login blocked and site unpublished' : 'Login allowed again');
      return NextResponse.json({ ok: true });
    }
    if (act === 'reset_password') {
      const password = tempPassword();
      const hash = await bcrypt.hash(password, 12);
      await sql`update users set password_hash = ${hash} where id::text = ${id}`;
      await logAdmin(admin, 'reset_password', u, 'Temporary password issued');
      return NextResponse.json({ ok: true, password });
    }
    return bad('Unknown action');
  } catch (e) {
    console.error('ADMIN_USERS_PATCH_FAULT:', e);
    return bad('Could not update the user', 500);
  }
}

// Permanent delete. The admin must type the user's email to confirm.
export async function DELETE(req) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return deny();
    const b = await req.json();
    const id = String(b.id || '');
    const [u] = await sql`select id::text as id, email, role from users where id::text = ${id}`;
    if (!u) return bad('User not found', 404);
    if (u.id === admin.id) return bad('You cannot delete yourself');
    if (u.role === 'admin') return bad('Change their role first, then delete');
    if (String(b.confirm || '').trim().toLowerCase() !== String(u.email).toLowerCase()) return bad('Type the exact email to confirm');

    await logAdmin(admin, 'delete', u, 'Permanent delete (site, bookings, orders and plan records removed)');
    const [site] = await sql`select id from sites where owner_id::text = ${id}`;
    const tryRun = async (fn) => { try { await fn(); } catch (e) { console.error('ADMIN_DELETE_STEP:', e?.message); } };
    if (site) {
      await tryRun(() => sql`delete from site_shifts where staff_id in (select id from site_staff where site_id = ${site.id})`);
      await tryRun(() => sql`delete from site_staff where site_id = ${site.id}`);
      await tryRun(() => sql`delete from site_views where site_id = ${site.id}`);
      await tryRun(() => sql`delete from site_bookings where site_id = ${site.id}`);
      await tryRun(() => sql`delete from site_orders where site_id = ${site.id}`);
      await tryRun(() => sql`delete from sites where id = ${site.id}`);
    }
    await tryRun(() => sql`delete from seller_plans where user_id = ${id}`);
    await tryRun(() => sql`delete from plan_payments where user_id = ${id}`);
    await tryRun(() => sql`delete from referrals where referrer_user_id = ${id} or referee_user_id = ${id}`);
    try {
      await sql`delete from users where id::text = ${id}`;
    } catch (e) {
      console.error('ADMIN_DELETE_USER_FAULT:', e);
      return bad('Their account is still linked to other records, so it could not be deleted. Deactivate them instead.', 409);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('ADMIN_USERS_DELETE_FAULT:', e);
    return bad('Could not delete the user', 500);
  }
}
