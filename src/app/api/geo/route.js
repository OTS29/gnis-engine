import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Vercel adds the visitor's country to every request. Nothing is stored.
export async function GET(req) {
  const country = req.headers.get('x-vercel-ip-country') || '';
  return NextResponse.json({ ok: true, country }, { headers: { 'Cache-Control': 'private, no-store' } });
}
