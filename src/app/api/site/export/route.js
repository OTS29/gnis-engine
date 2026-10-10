import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { sql } from '@/lib/db';
import { getSession, isOwnerRole } from '@/lib/session';

export const runtime = 'nodejs';

function send(wb, name) {
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${name}-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}

export async function GET(req) {
  try {
    const s = getSession(req);
    if (!isOwnerRole(s)) return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 401 });
    const type = new URL(req.url).searchParams.get('type') || 'bookings';
    const wb = XLSX.utils.book_new();

    if (type === 'bookings') {
      const rows = await sql`select b.id, b.customer, b.contact, b.service, b.list_price::float8 as list_price, b.price::float8 as price,
          coalesce(b.source, 'website') as source, b.date::text as date, left(b.time::text, 5) as time, lower(b.status) as status,
          to_char(b.created_at at time zone 'Europe/London', 'YYYY-MM-DD HH24:MI') as created
        from site_bookings b join sites st on st.id = b.site_id where st.owner_id = ${s.userId} order by b.date desc, b.time desc`;
      const head = ['Ref', 'Customer', 'Contact', 'Service', 'Listed price', 'Agreed price', 'How booked', 'Service date', 'Service time', 'Status', 'Booked on'];
      const data = rows.map((r) => [r.id, r.customer, r.contact, r.service, r.list_price ?? r.price, r.price, r.source === 'negotiated' ? 'Negotiated price' : 'Website', r.date, r.time, r.status, r.created]);
      const ws = XLSX.utils.aoa_to_sheet([head, ...data]);
      ws['!cols'] = head.map((h, i) => ({ wch: [6, 22, 26, 24, 16, 16, 18, 14, 12, 12, 18][i] }));
      XLSX.utils.book_append_sheet(wb, ws, 'Bookings');

      const count = (st) => rows.filter((r) => r.status === st).length;
      const earned = rows.filter((r) => r.status === 'approved' || r.status === 'completed').reduce((t, r) => t + (r.price || 0), 0);
      const customers = new Set(rows.map((r) => String(r.contact).trim().toLowerCase())).size;
      const summary = XLSX.utils.aoa_to_sheet([
        ['Summary', ''],
        ['Total bookings', rows.length],
        ['Unique customers', customers],
        ['Pending', count('pending')],
        ['Approved', count('approved')],
        ['Completed', count('completed')],
        ['Cancelled', count('cancelled')],
        ['Value of approved + completed', Math.round(earned * 100) / 100],
        ['Negotiated bookings', rows.filter((r) => r.source === 'negotiated').length],
      ]);
      summary['!cols'] = [{ wch: 36 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, summary, 'Summary');
      return send(wb, 'bookings');
    }

    if (type === 'orders') {
      const rows = await sql`select o.id, o.customer, o.contact, o.items, o.total::float8 as total, o.status,
          to_char(o.created_at at time zone 'Europe/London', 'YYYY-MM-DD HH24:MI') as created
        from site_orders o join sites st on st.id = o.site_id where st.owner_id = ${s.userId} order by o.created_at desc`;
      const head = ['Order', 'Customer', 'Contact', 'Items', 'Total', 'Status', 'Ordered on'];
      const data = rows.map((r) => [r.id, r.customer, r.contact, (r.items || []).map((i) => `${i.qty} x ${i.name}`).join(', '), r.total, r.status, r.created]);
      const ws = XLSX.utils.aoa_to_sheet([head, ...data]);
      ws['!cols'] = head.map((h, i) => ({ wch: [7, 22, 26, 44, 12, 12, 18][i] }));
      XLSX.utils.book_append_sheet(wb, ws, 'Orders');
      return send(wb, 'orders');
    }

    if (type === 'timesheet') {
      const rows = await sql`select s.name,
          to_char(h.clock_in at time zone 'Europe/London', 'YYYY-MM-DD') as day,
          to_char(h.clock_in at time zone 'Europe/London', 'HH24:MI') as clock_in,
          to_char(h.clock_out at time zone 'Europe/London', 'HH24:MI') as clock_out,
          round((extract(epoch from (coalesce(h.clock_out, now()) - h.clock_in)) / 3600)::numeric, 2)::float8 as hours
        from site_shifts h join site_staff s on s.id = h.staff_id join sites st on st.id = s.site_id
        where st.owner_id = ${s.userId} order by h.clock_in desc`;
      const head = ['Staff', 'Date', 'Clock in', 'Clock out', 'Hours'];
      const ws = XLSX.utils.aoa_to_sheet([head, ...rows.map((r) => [r.name, r.day, r.clock_in, r.clock_out || 'still working', r.hours])]);
      ws['!cols'] = [{ wch: 22 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 8 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Timesheet');
      return send(wb, 'timesheet');
    }

    return NextResponse.json({ ok: false, error: 'Unknown export' }, { status: 400 });
  } catch (e) {
    console.error('SITE_EXPORT_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Export failed' }, { status: 500 });
  }
}
