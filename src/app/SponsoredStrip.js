'use client';
import { useEffect, useRef, useState } from 'react';

// Rotating "Sponsored" strip. Nothing is drawn unless there is a live advert or the advertiser sign-up is open.
// It pauses while someone hovers or focuses it, and does not rotate on its own for people who asked for less motion.
export default function SponsoredStrip() {
  const [data, setData] = useState({ ads: [], adsOpen: false });
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const seen = useRef(new Set());

  useEffect(() => {
    let alive = true;
    (async () => { try { const j = await (await fetch('/api/public/ads')).json(); if (alive && j.ok) setData({ ads: j.ads || [], adsOpen: !!j.adsOpen }); } catch {} })();
    return () => { alive = false; };
  }, []);

  const n = data.ads.length;
  useEffect(() => {
    if (n < 2 || paused) return;
    let reduce = false;
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch {}
    if (reduce) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), 6000);
    return () => clearInterval(t);
  }, [n, paused]);

  const ad = n ? data.ads[i % n] : null;
  useEffect(() => {
    if (!ad || seen.current.has(ad.id)) return;
    seen.current.add(ad.id);
    try { fetch('/api/public/ads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: ad.id, event: 'view' }), keepalive: true }); } catch {}
  }, [ad]);

  if (!n && !data.adsOpen) return null;

  const click = () => { try { fetch('/api/public/ads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: ad.id, event: 'click' }), keepalive: true }); } catch {} };

  return (
    <section aria-label="Sponsored" className="mb-8" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      {ad ? (
        <div className="rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-400/10 via-slate-900 to-slate-900 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-950">Sponsored</span>
            {n > 1 && (
              <div className="flex items-center gap-1.5" role="group" aria-label="Choose an advert">
                {data.ads.map((a, k) => (
                  <button key={a.id} onClick={() => setI(k)} aria-label={`Show advert ${k + 1} of ${n}`} aria-current={k === i % n} className={`h-2.5 rounded-full transition-all ${k === i % n ? 'w-6 bg-amber-400' : 'w-2.5 bg-slate-600 hover:bg-slate-500'}`} />
                ))}
              </div>
            )}
          </div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-lg font-black leading-snug text-white">{ad.headline}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">{ad.body}</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{ad.business}{ad.place ? ` · ${ad.place}` : ''}</p>
            </div>
            <a href={`/site/${ad.slug}`} onClick={click} className="shrink-0 rounded-xl bg-amber-400 px-5 py-3 text-center text-[11px] font-black uppercase tracking-widest text-emerald-950 transition hover:bg-amber-300">{ad.cta}</a>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-amber-400/40 p-5 text-center">
          <p className="text-sm font-bold text-slate-300">Your business could be here.</p>
          <a href="/dashboard/ads" className="mt-2 inline-block text-[11px] font-black uppercase tracking-widest text-amber-300 underline">Advertise on GNIS</a>
        </div>
      )}
      {ad && data.adsOpen && (<p className="mt-2 text-right text-[11px] text-slate-500"><a href="/dashboard/ads" className="underline hover:text-slate-300">Advertise your business</a></p>)}
    </section>
  );
}
