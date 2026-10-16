import { NextResponse } from 'next/server';
import { getTop } from '@/lib/leaderboard';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const items = await getTop(10);
    return NextResponse.json({ ok: true, items }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } });
  } catch (e) {
    console.error('PUBLIC_TOP_FAULT:', e);
    return NextResponse.json({ ok: false, items: [] }, { status: 500 });
  }
}
