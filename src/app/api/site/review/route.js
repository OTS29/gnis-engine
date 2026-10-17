import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { readReviewToken } from '@/lib/reviews';
import { hit, clientIp } from '@/lib/rateLimit';
import { sameOrigin } from '@/lib/security';

export const runtime = 'nodejs';

const h = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const html = (body, status = 200) => new NextResponse(
  `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your review</title></head>
  <body style="font-family:system-ui,Segoe UI,sans-serif;background:#f9fafb;margin:0;padding:24px;color:#111827"><div style="max-width:460px;margin:40px auto;background:#fff;border-radius:16px;padding:28px;box-shadow:0 1px 8px rgba(0,0,0,.08)">${body}</div></body></html>`,
  { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });

async function save(p, rating, comment) {
  const [b] = await sql`select b.id, b.customer, b.site_id, lower(b.status) as st from site_bookings b where b.id::text = ${p.b} and b.site_id::text = ${p.s}`;
  if (!b || b.st !== 'completed') return null;
  const name = String(b.customer || '').trim().split(/\s+/)[0] || 'Customer';
  await sql`insert into site_reviews (site_id, booking_id, customer, rating, comment) values (${b.site_id}, ${p.b}, ${name}, ${rating}, ${comment})
    on conflict (booking_id) do update set rating = excluded.rating, comment = case when excluded.comment <> '' then excluded.comment else site_reviews.comment end`;
  return b;
}

// Opened from the star links in the email. Saves the rating straight away, then offers an optional comment.
export async function GET(req) {
  try {
    const u = new URL(req.url);
    const t = u.searchParams.get('t');
    const p = readReviewToken(t);
    const r = Math.round(Number(u.searchParams.get('r')));
    if (!p || !(r >= 1 && r <= 5)) return html('<h2>This link has expired</h2><p>Sorry, we could not open this review link.</p>', 400);
    // Nothing is saved on this page view, because some email programs open every link to scan it. The rating is saved when the button is pressed.
    return html(`<h2 style="margin-top:0">Your rating: ${'★'.repeat(r)}${'☆'.repeat(5 - r)}</h2>
      <p style="color:#4b5563">Add a few words if you like (optional), then press Send. It helps other people choose.</p>
      <form method="post" action="/api/site/review"><input type="hidden" name="t" value="${h(t)}"><input type="hidden" name="r" value="${r}">
      <textarea name="c" maxlength="400" rows="4" style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #d1d5db;border-radius:8px;font:inherit" placeholder="Your comment"></textarea>
      <button style="margin-top:12px;background:#111827;color:#fff;border:0;border-radius:8px;padding:12px 22px;font-weight:700;font-size:15px">Send my rating</button></form>`);
  } catch (e) {
    console.error('REVIEW_GET_FAULT:', e);
    return html('<h2>Something went wrong</h2><p>Please try again later.</p>', 500);
  }
}

export async function POST(req) {
  try {
    if (!sameOrigin(req)) return html('<h2>Not allowed</h2>', 403);
    if (!(await hit(`review:ip:${clientIp(req)}`, 20, 3600)).allowed) return html('<h2>Too many requests</h2><p>Please try again later.</p>', 429);
    const f = await req.formData();
    const p = readReviewToken(f.get('t'));
    const r = Math.round(Number(f.get('r')));
    const c = String(f.get('c') || '').replace(/\s+/g, ' ').trim().slice(0, 400);
    if (!p || !(r >= 1 && r <= 5)) return html('<h2>This link has expired</h2>', 400);
    const ok = await save(p, r, c);
    if (!ok) return html('<h2>Sorry</h2><p>We could not find that visit.</p>', 404);
    return html('<h2 style="margin-top:0">Thank you for your review!</h2><p style="color:#4b5563">It is now shown on the business page. You can close this window.</p>');
  } catch (e) {
    console.error('REVIEW_POST_FAULT:', e);
    return html('<h2>Something went wrong</h2><p>Please try again later.</p>', 500);
  }
}
