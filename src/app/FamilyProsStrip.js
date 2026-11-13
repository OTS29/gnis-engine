'use client';
import { useEffect, useState } from 'react';
import { CATEGORIES } from '@/lib/familyLabels';

// "Family-ready" professionals for the landing page. Draws nothing when there are none or the feature is not open to this visitor.
export default function FamilyProsStrip() {
  const [pros, setPros] = useState([]);
  useEffect(() => {
    let alive = true;
    (async () => { try { const j = await (await fetch('/api/public/family-pros')).json(); if (alive && j.ok) setPros(j.pros || []); } catch {} })();
    return () => { alive = false; };
  }, []);
  if (!pros.length) return null;
  return (
    <div className="max-w-6xl mx-auto mt-6">
      <p className="mb-3 text-[11px] font-black uppercase tracking-widest text-amber-300">Family-ready professionals</p>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {pros.map((p) => (
          <li key={p.slug} className="rounded-2xl border border-amber-400/40 bg-slate-900 p-4 text-white">
            <span className="family-glow inline-block rounded-full bg-amber-400 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-950">Family-ready</span>
            <p className="mt-3 text-base font-black leading-snug">{p.name}</p>
            <p className="mt-1 text-xs text-slate-400">{p.place || 'Nigeria'}</p>
            <p className="mt-2 text-xs text-slate-300">{p.categories.map((c) => CATEGORIES[c]).filter(Boolean).join(', ')}</p>
            <p className="mt-1 text-[11px] text-slate-400">{p.trust}{p.confirmed ? ` · ${p.confirmed} confirmed ${p.confirmed === 1 ? 'job' : 'jobs'}` : ''}</p>
            <a href={`/family/book/${p.slug}`} className="mt-3 inline-block rounded-xl bg-amber-400 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-emerald-950 transition hover:bg-amber-300">Book for family</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
