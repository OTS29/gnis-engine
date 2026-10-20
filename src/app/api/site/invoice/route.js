import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { hit, clientIp } from '@/lib/rateLimit';
import { sameOrigin } from '@/lib/security';
import { liveSession, isOwnerRole } from '@/lib/session';
import { loadInvoice, ensureInvoiceNo, invoiceHtml, invoiceEmail, invoiceLink, readInvoiceToken } from '@/lib/invoice';

export const runtime = 'nodejs';

const page = (html, status = 200) => new Response(html, {
  status,
  headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
});
const plain = (msg, status) => page(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:system-ui;padding:32px;max-width:520px;margin:auto"><p>${msg}</p></body>`, status);

// GET ?id=BOOKING_ID  (signed-in owner)   or   GET ?t=TOKEN  (customer link from the email)
export async function GET(req) {
  try {
    const u = new URL(req.url);
    const t = u.searchParams.get('t');
    let b = null;
    if (t) {
      if (!(await hit(`inv:ip:${clientIp(req)}`, 60, 3600)).allowed) return plain('Too many requests. Please try again later.', 429);
      const p = readInvoiceToken(t);
      if (!p) return plain('This link has expired or is not valid. Ask the business to send it again.', 400);
      b = await loadInvoice(p.b);
      if (!b || String(b.site_id) !== String(p.s)) return plain('Not found.', 404);
    } else {
      const s = await liveSession(req);
      if (!isOwnerRole(s)) return plain('Please sign in to your dashboard first.', 401);
      b = await loadInvoice(u.searchParams.get('id'), s.userId);
      if (!b) return plain('Not found.', 404);
    }
    b = await ensureInvoiceNo(b);
    return page(invoiceHtml(b, { toolbar: true }));
  } catch (e) {
    console.error('INVOICE_GET_FAULT:', e);
    return plain('Could not load this invoice.', 500);
  }
}

// Owner only: email the invoice or receipt to the customer.
export async function POST(req) {
  try {
    if (!sameOrigin(req)) return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 403 });
    const s = await liveSession(req);
    if (!isOwnerRole(s)) return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 401 });
    if (!(await hit(`inv:mail:${s.userId}`, 40, 3600)).allowed) return NextResponse.json({ ok: false, error: 'Too many emails. Try again later.' }, { status: 429 });
    const body = await req.json();
    let b = await loadInvoice(body.id, s.userId);
    if (!b) return NextResponse.json({ ok: false, error: 'Booking not found' }, { status: 404 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(b.contact || '').trim())) return NextResponse.json({ ok: false, error: 'This customer left a phone number, not an email. Use Print and share it yourself.' }, { status: 400 });
    b = await ensureInvoiceNo(b);
    const mail = invoiceEmail(b, invoiceLink(b.id, b.site_id));
    const r = await sendEmail({ to: b.contact.trim(), subject: mail.subject, html: mail.html, replyTo: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.data?.email || '') ? b.data.email : undefined });
    if (r.skipped) return NextResponse.json({ ok: false, error: 'Email is not set up yet. Use Print instead.' }, { status: 400 });
    if (!r.ok) return NextResponse.json({ ok: false, error: 'The email could not be sent.' }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('INVOICE_POST_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Could not send' }, { status: 500 });
  }
}
