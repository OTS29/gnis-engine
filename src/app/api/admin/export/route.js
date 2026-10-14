import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requireAdmin, loadUsers, logAdmin } from '@/lib/admin';

export const runtime = 'nodejs';

const d = (v) => (v ? new Date(v).toISOString().slice(0, 16).replace('T', ' ') : '');

export async function GET(req) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 403 });
    const users = await loadUsers();
    const base = process.env.NEXT_PUBLIC_SITE_URL || '';

    const head = ['Name', 'Email', 'Role', 'Status', 'Country', 'Region', 'Profession', 'Rate', 'Address', 'Postcode', 'ID type', 'Plan', 'Plan ends', 'Website', 'Published', 'Bookings', 'Orders', 'Page views', 'Score', 'Joined', 'Last login', 'Admin note'];
    const rows = users.map((u) => [
      u.name || '', u.email, u.role, u.suspended ? 'Deactivated' : 'Active', u.country || '', u.region || '', u.skill || '', u.rate || '',
      u.address || '', u.postcode || '', u.verification_method || '',
      u.plan_active ? (u.plan === 'biz' ? 'Business' : 'Professional') : 'Starter', u.plan_active ? d(u.expires_at) : '',
      u.slug ? `${base}/site/${u.slug}` : '', u.published ? 'Yes' : 'No', u.bookings, u.orders, u.views, u.score, d(u.created_at), d(u.last_login_at), u.admin_note || '',
    ]);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([head, ...rows]);
    ws['!cols'] = head.map((h, i) => ({ wch: [22, 30, 8, 12, 10, 10, 18, 10, 26, 10, 14, 13, 16, 40, 10, 9, 8, 10, 8, 16, 16, 30][i] }));
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };
    XLSX.utils.book_append_sheet(wb, ws, 'Users');

    const best = [...users].filter((u) => u.role === 'pro').sort((a, b) => b.score - a.score).slice(0, 50);
    const bws = XLSX.utils.aoa_to_sheet([['Rank', 'Name', 'Email', 'Profession', 'Bookings', 'Orders', 'Page views', 'Score'], ...best.map((u, i) => [i + 1, u.name || '', u.email, u.skill || '', u.bookings, u.orders, u.views, u.score])]);
    bws['!cols'] = [6, 22, 30, 18, 9, 8, 11, 8].map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(wb, bws, 'Best users');

    const c = {};
    for (const u of users) { let k = String(u.country || u.region || 'Unknown').toUpperCase(); if (k === 'UK') k = 'GB'; c[k] = (c[k] || 0) + 1; }
    const cws = XLSX.utils.aoa_to_sheet([['Country', 'Users'], ...Object.entries(c).sort((a, b) => b[1] - a[1])]);
    cws['!cols'] = [{ wch: 18 }, { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, cws, 'By country');

    await logAdmin(admin, 'export', null, `Exported ${users.length} users`);
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new Response(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="gnis-users-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (e) {
    console.error('ADMIN_EXPORT_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Export failed' }, { status: 500 });
  }
}
