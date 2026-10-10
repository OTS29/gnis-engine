import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { sql } from '@/lib/db';
import { hit, clientIp } from '@/lib/rateLimit';

export const runtime = 'nodejs';

// Cookie-free page view counter. Visitors are counted as a daily hash of IP + browser, never stored raw.
export async function POST(req) {
  try {
    const ua = req.headers.get('user-agent') || '';
    if (!ua || /bot|crawl|spider|preview|monitor|headless/i.test(ua)) return NextResponse.json({ ok: true });
    const ip = clientIp(req);
    if (!(await hit(`view:${ip}`, 120, 3600)).allowed) return NextResponse.json({ ok: true });
    const { slug } = await req.json();
    const [site] = await sql`select id from sites where slug = ${String(slug || '')} and published`;
    if (!site) return NextResponse.json({ ok: true });
    const visitor = crypto.createHash('sha256').update(`${ip}|${ua}|${new Date().toISOString().slice(0, 10)}`).digest('hex').slice(0, 24);
    await sql`insert into site_views (site_id, visitor) values (${site.id}, ${visitor})`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('SITE_VIEW_FAULT:', e);
    return NextResponse.json({ ok: true });
  }
}
