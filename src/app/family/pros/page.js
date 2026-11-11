'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shell, api, card, btn } from '../ui';
import { CATEGORIES, fmtMoney } from '@/lib/familyLabels';

function List() {
  const [d, setD] = useState(null);
  useEffect(() => { api('/api/family/pros').then(setD); }, []);
  if (!d) return <p className="mt-8 text-slate-400 text-sm">Loading…</p>;
  if (!d.ok) return <p className="mt-8 text-amber-400 text-sm">{d.error}</p>;
  if (!d.pros.length) return <div className={`${card} mt-8 text-sm text-slate-300`}>No verified professionals yet. In test mode, a professional opts in on the "I'm a professional" page and an admin verifies them.</div>;
  return (
    <div className="mt-6 space-y-4">
      {d.pros.map((p) => (
        <div key={p.slug} className={card}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-lg font-bold">{p.name}</p>
              <p className="text-sm text-slate-400">{p.location}{p.tagline ? ` · ${p.tagline}` : ''}</p>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-green-600/50 text-green-400">{p.trust}</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">Verified · {(p.categories || []).map((c) => CATEGORIES[c]).join(', ')} · {p.confirmed} confirmed {p.confirmed === 1 ? 'job' : 'jobs'}{p.ratingAvg ? ` · ${p.ratingAvg}/5 (${p.ratingN})` : ''}</p>
          <ul className="mt-3 text-sm text-slate-300 space-y-1">
            {p.services.slice(0, 5).map((s) => <li key={s.name}>{s.name}: <b>{fmtMoney(s.price, 'NGN')}</b>{d.fx ? <span className="text-slate-500"> (about {fmtMoney(s.price / d.fx, 'GBP')})</span> : null}</li>)}
          </ul>
          <Link href={`/family/book/${p.slug}`} className={`${btn} inline-block mt-4`}>Book for family</Link>
        </div>
      ))}
    </div>
  );
}

export default function Page() { return <Shell title="Find a professional">{() => <List />}</Shell>; }
