'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export async function api(path, { method = 'GET', body } = {}) {
  try {
    const r = await fetch(path, { method, credentials: 'same-origin', headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({ ok: false, error: 'Something went wrong. Please try again.' }));
    return { ...j, httpStatus: r.status };
  } catch {
    return { ok: false, error: 'Could not connect. Please check your internet and try again.' };
  }
}

export const inp = 'w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-green-500/40';
export const lbl = 'block text-[10px] font-black uppercase tracking-widest text-slate-400 mt-4 mb-1';
export const btn = 'bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition';
export const btnGhost = 'border border-slate-700 hover:border-slate-500 disabled:opacity-50 text-slate-200 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition';
export const btnWarn = 'bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition';
export const card = 'bg-slate-900 border border-slate-800 rounded-2xl p-5';

const NAV = [['/family/pros', 'Find a professional'], ['/family/jobs', 'My jobs'], ['/family/pro', "I'm a professional"]];

// Wraps every family page: checks the mode and the visitor, shows the test banner, and only then shows the page.
export function Shell({ title, children }) {
  const [st, setSt] = useState(null);
  useEffect(() => { api('/api/family/status').then(setSt); }, []);
  let body;
  if (!st) body = <p className="mt-8 text-slate-400 text-sm">Loading…</p>;
  else if (st.mode === 'off') body = <div className={`${card} mt-8`}><p>This feature is not open yet.</p><Link href="/family" className="underline text-green-400 text-sm">Join the waiting list</Link></div>;
  else if (!st.signedIn) body = <div className={`${card} mt-8`}><p>Please log in first.</p><p className="text-sm text-slate-400 mt-1">Log in from the <Link href="/" className="underline text-green-400">home page</Link>, then come back to this page.</p></div>;
  else if (!st.allowed) body = <div className={`${card} mt-8`}><p>Test mode: invited testers only.</p></div>;
  else body = children(st);
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-3xl mx-auto px-5 sm:px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="text-green-500 font-black italic text-2xl tracking-tighter">GNIS</Link>
          <nav className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
            {NAV.map(([h, t]) => <Link key={h} href={h} className="underline-offset-4 hover:underline">{t}</Link>)}
            {st?.admin && <Link href="/family/admin" className="underline-offset-4 hover:underline text-amber-300">Admin</Link>}
          </nav>
        </div>
        {st && st.mode !== 'off' && <p className="mt-5 text-xs bg-amber-500/10 border border-amber-500/40 text-amber-300 rounded-xl px-4 py-3">{st.mode === 'test' ? 'TEST MODE. Pretend money only. Nothing real is charged or paid.' : 'Live mode.'}</p>}
        <h1 className="mt-6 text-2xl md:text-4xl font-black italic uppercase tracking-tighter leading-none">{title}</h1>
        {body}
      </div>
    </main>
  );
}

export const when = (d) => { try { return new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }); } catch { return ''; } };
export const dayText = (d) => { try { return new Date(String(d).slice(0, 10) + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); } catch { return String(d); } };
