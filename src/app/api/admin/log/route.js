import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';

export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 403 });
    const rows = await sql`select id, admin_email, action, target_email, detail, to_char(created_at at time zone 'Europe/London', 'YYYY-MM-DD HH24:MI') as at from admin_log order by id desc limit 200`;
    return NextResponse.json({ ok: true, data: rows });
  } catch (e) {
    console.error('ADMIN_LOG_GET_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Could not load the log' }, { status: 500 });
  }
}
