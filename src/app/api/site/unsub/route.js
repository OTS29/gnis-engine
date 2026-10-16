import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';

const page = (msg) => new NextResponse(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reminders</title>
<body style="font-family:system-ui,sans-serif;max-width:480px;margin:15vh auto;padding:0 20px;text-align:center;color:#111827"><h2>${msg}</h2></body>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

// The "Stop these reminders" link inside rebooking emails.
export async function GET(req) {
  try {
    const p = jwt.verify(new URL(req.url).searchParams.get('t') || '', process.env.JWT_SECRET);
    if (p.typ !== 'unsub' || !p.s || !p.k) return page('This link is not valid.');
    await sql`insert into site_customers (site_id, contact_key, rebook_optout) values (${p.s}, ${p.k}, true)
      on conflict (site_id, contact_key) do update set rebook_optout = true`;
    return page('Done. You will not get any more reminders from this business.');
  } catch {
    return page('This link is not valid or has expired.');
  }
}
