import { NextResponse } from 'next/server';

// Referral link: /r/CODE remembers who sent the visitor for 30 days, then sends them to the home page.
export async function GET(req, { params }) {
  const { code } = await params;
  const res = NextResponse.redirect(new URL('/', req.url));
  if (/^[a-z0-9]{4,16}$/i.test(code)) {
    res.cookies.set('gnis_ref', code.toLowerCase(), { maxAge: 60 * 60 * 24 * 30, path: '/', sameSite: 'lax', httpOnly: true, secure: true });
  }
  return res;
}
