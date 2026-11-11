import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { whatPattern, wherePattern, areaOf, POPULAR_TRADES, SYNONYMS } from '@/lib/searchTerms';

export const runtime = 'nodejs';

const cleanQ = (s) => String(s || '').trim().slice(0, 40).replace(/[%_\\]/g, ' ');
const cap = (s) => String(s || '').replace(/\b\w/g, (c) => c.toUpperCase());

// Ideas that pop up under the search boxes.
//   kind=what  -> trades, business names and services that exist on GNIS
//   kind=where -> places where published businesses are
// With nothing typed it returns the most common ones.
export async function GET(req) {
  try {
    const u = new URL(req.url);
    const kind = u.searchParams.get('kind') === 'where' ? 'where' : 'what';
    const q = cleanQ(u.searchParams.get('q'));
    const out = [];

    if (kind === 'where') {
      const pat = wherePattern(q);
      const rows = await sql`select s.data->>'location' as loc, count(*)::int as n
        from sites s join users u on u.id::text = s.owner_id::text
        where s.published and coalesce(u.suspended, false) = false and coalesce(s.data->>'location', '') <> ''
          and (${pat} = '' or s.data->>'location' ~* ${pat})
        group by 1 order by 2 desc limit 40`;
      const byArea = new Map();
      for (const r of rows) {
        const a = areaOf(r.loc);
        if (!a) continue;
        byArea.set(a, (byArea.get(a) || 0) + r.n);
      }
      for (const [a, n] of [...byArea.entries()].sort((x, y) => y[1] - x[1]).slice(0, 8)) out.push({ type: 'place', text: a, count: n });
    } else {
      const low = q.toLowerCase();
      // Trade words people use (salon, plumber...) that match what was typed, so "sal" offers "Salon".
      if (low) {
        const words = Object.keys(SYNONYMS).filter((k) => k.startsWith(low)).slice(0, 3);
        for (const w of words) out.push({ type: 'trade', text: cap(w) });
      }
      const pat = whatPattern(q);
      const trades = await sql`select u.skill as t, count(*)::int as n
        from sites s join users u on u.id::text = s.owner_id::text
        where s.published and coalesce(u.suspended, false) = false and coalesce(u.skill, '') <> ''
          and (${pat} = '' or u.skill ~* ${pat})
        group by 1 order by 2 desc limit 5`;
      for (const r of trades) out.push({ type: 'trade', text: cap(r.t), count: r.n });
      if (q.length >= 2) {
        const biz = await sql`select s.data->>'businessName' as name, s.data->>'location' as loc
          from sites s join users u on u.id::text = s.owner_id::text
          where s.published and coalesce(u.suspended, false) = false and s.data->>'businessName' ~* ${pat}
          order by s.updated_at desc limit 4`;
        for (const r of biz) if (r.name) out.push({ type: 'business', text: r.name, sub: areaOf(r.loc) });
      }
      if (!q) for (const t of POPULAR_TRADES) out.push({ type: 'trade', text: t });
    }

    const seen = new Set();
    const items = out.filter((x) => { const k = x.type + x.text.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 10);
    return NextResponse.json({ ok: true, items }, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } });
  } catch (e) {
    console.error('PUBLIC_SUGGEST_FAULT:', e);
    return NextResponse.json({ ok: false, items: [] }, { status: 200 });
  }
}
