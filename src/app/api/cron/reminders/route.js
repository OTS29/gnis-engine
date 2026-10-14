import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { sendReminder } from '@/lib/notify';
import { planOfUser, limitsFor } from '@/lib/plans';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Called once a day by Vercel Cron (see vercel.json). Sends a reminder for every approved booking happening tomorrow.
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    const rows = await sql`select b.id, b.customer, b.contact, b.service, b.price::float8 as price,
        b.date::text as date, left(b.time::text, 5) as time, st.data, st.owner_id::text as owner
      from site_bookings b join sites st on st.id = b.site_id
      where lower(b.status) = 'approved' and b.reminder_sent_at is null
        and b.date::date = ((now() at time zone 'Europe/London')::date + 1)
      limit 200`;
    let sent = 0;
    const allowed = new Map();
    for (const row of rows) {
      try {
        if (!allowed.has(row.owner)) allowed.set(row.owner, limitsFor(await planOfUser(row.owner)).whatsappAuto);
        await sendReminder({ data: row.data, wa: !!row.data?.whatsappReminders && allowed.get(row.owner) }, row);
        await sql`update site_bookings set reminder_sent_at = now() where id = ${row.id}`;
        sent++;
      } catch (e) { console.error('REMINDER_FAULT:', e); }
    }
    return NextResponse.json({ ok: true, found: rows.length, sent });
  } catch (e) {
    console.error('CRON_REMINDERS_FAULT:', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
