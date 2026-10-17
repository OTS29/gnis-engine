import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { sql } from '@/lib/db';
import { getSession, isOwnerRole } from '@/lib/session';
import { planOfUser, limitsFor } from '@/lib/plans';
import { safeCell } from '@/lib/security';
import { cleanRange, londonToday } from '@/lib/finance';

export const runtime = 'nodejs';

// Excel file for the chosen dates: summary, every completed visit, every expense, and sales per staff member.
export async function GET(req) {
  try {
    const s = getSession(req);
    if (!isOwnerRole(s)) return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 401 });
    if (!limitsFor(await planOfUser(s.userId)).finance) return NextResponse.json({ ok: false, error: 'Professional plan feature' }, { status: 402 });
    const [site] = await sql`select id from sites where owner_id::text = ${String(s.userId)}`;
    if (!site) return NextResponse.json({ ok: false, error: 'No site' }, { status: 404 });
    const { from, to } = cleanRange(Object.fromEntries(new URL(req.url).searchParams), londonToday());
    const visits = await sql`select b.date::text as date, b.customer, b.service, b.price::float8 as price, coalesce(ss.name, '') as staff
      from site_bookings b left join site_staff ss on ss.id::text = b.staff_id and ss.site_id = b.site_id
      where b.site_id = ${site.id} and lower(b.status) = 'completed' and coalesce(b.source, 'website') <> 'import' and b.date::date between ${from}::date and ${to}::date
      order by b.date, b.time limit 20000`;
    const exps = await sql`select spent_on::text as date, category, amount::float8 as amount, note from site_expenses
      where site_id = ${site.id} and spent_on between ${from}::date and ${to}::date order by spent_on limit 20000`;
    const income = visits.reduce((t, v) => t + (v.price || 0), 0);
    const spent = exps.reduce((t, v) => t + (v.amount || 0), 0);
    const r2 = (n) => Math.round(n * 100) / 100;
    const staff = new Map();
    for (const v of visits) { const k = v.staff || 'Not assigned'; const x = staff.get(k) || { n: 0, t: 0 }; x.n++; x.t += v.price || 0; staff.set(k, x); }
    const wb = XLSX.utils.book_new();
    const add = (name, rows, cols) => { const ws = XLSX.utils.aoa_to_sheet(rows); ws['!cols'] = cols.map((w) => ({ wch: w })); XLSX.utils.book_append_sheet(wb, ws, name); };
    add('Summary', [['From', from], ['To', to], ['Income from completed visits', r2(income)], ['Expenses', r2(spent)], ['Profit', r2(income - spent)], ['Visits', visits.length]], [32, 16]);
    add('Visits', [['Date', 'Customer', 'Service', 'Price', 'Staff'], ...visits.map((v) => [v.date, safeCell(v.customer), safeCell(v.service), v.price, safeCell(v.staff)])], [12, 24, 26, 12, 18]);
    add('Expenses', [['Date', 'Category', 'Amount', 'Note'], ...exps.map((v) => [v.date, v.category, v.amount, safeCell(v.note)])], [12, 16, 12, 40]);
    add('Staff', [['Staff', 'Visits', 'Income'], ...[...staff.entries()].map(([k, x]) => [safeCell(k), x.n, r2(x.t)])], [22, 10, 14]);
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new Response(buf, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="money-${from}-to-${to}.xlsx"`, 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('FINANCE_EXPORT_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Export failed' }, { status: 500 });
  }
}
