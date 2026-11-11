'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shell, api, inp, lbl, btn, card } from '../ui';

function Setup() {
  const [d, setD] = useState(null);
  const [f, setF] = useState({ enabled: true, categories: [], idMethod: 'nin', idLast4: '', idNote: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const load = () => api('/api/family/pro').then((r) => {
    setD(r);
    if (r.pro) setF({ enabled: r.pro.enabled, categories: r.pro.categories || [], idMethod: r.pro.id_method || 'nin', idLast4: r.pro.id_last4 || '', idNote: r.pro.id_note || '' });
  });
  useEffect(() => { load(); }, []);
  if (!d) return <p className="mt-8 text-slate-400 text-sm">Loading…</p>;
  if (!d.ok) return <p className="mt-8 text-amber-400 text-sm">{d.error}</p>;
  if (!d.site) return <div className={`${card} mt-8 text-sm`}>You need a GNIS site first. Create and publish one in your <Link href="/dashboard" className="underline text-green-400">Dashboard</Link>, set the currency to NGN, then come back.</div>;
  const toggle = (c) => setF((p) => ({ ...p, categories: p.categories.includes(c) ? p.categories.filter((x) => x !== c) : [...p.categories, c] }));
  const save = async (e) => {
    e.preventDefault(); setBusy(true); setMsg('');
    const r = await api('/api/family/pro', { method: 'POST', body: f });
    setBusy(false); setMsg(r.ok ? 'Saved.' : r.error); if (r.ok) load();
  };
  const status = d.pro?.status;
  return (
    <form onSubmit={save} className="mt-6">
      <div className={card}>
        <p className="font-bold">{d.site.name}</p>
        <p className="text-sm text-slate-400">Status: <b className={status === 'verified' ? 'text-green-400' : 'text-amber-300'}>{!d.pro ? 'Not set up' : status === 'verified' ? 'Verified' : status === 'suspended' ? 'Suspended' : 'Waiting for verification'}</b>{d.stats ? ` · Trust level: ${d.stats.level} · ${d.stats.confirmed} confirmed jobs` : ''}</p>
        <p className="text-xs text-slate-500 mt-2">Phase 1 is for Nigeria. Your site must be published and its currency set to NGN. Customers abroad ask you to do a job for a family member. They pay first and the money is held. You are paid when the family member gives you a one-time code after the job.</p>
      </div>
      <label className="mt-5 flex items-center gap-3 text-sm cursor-pointer"><input type="checkbox" checked={f.enabled} onChange={(e) => setF((p) => ({ ...p, enabled: e.target.checked }))} /> Accept family bookings from abroad</label>
      <p className={lbl}>What you offer</p>
      <div className="flex flex-wrap gap-3 text-sm">{Object.entries(d.categories).map(([k, v]) => <label key={k} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={f.categories.includes(k)} onChange={() => toggle(k)} /> {v}</label>)}</div>
      <p className="text-xs text-slate-500 mt-1">Services and prices come from your Services tab. Only services with a price above 0 are shown.</p>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={lbl} htmlFor="im">ID type</label><select id="im" className={inp} value={f.idMethod} onChange={(e) => setF((p) => ({ ...p, idMethod: e.target.value }))}><option value="nin">NIN</option><option value="bvn">BVN</option><option value="manual">Other ID</option></select></div>
        <div><label className={lbl} htmlFor="il">Last 4 characters only</label><input id="il" className={inp} maxLength={4} value={f.idLast4} onChange={(e) => setF((p) => ({ ...p, idLast4: e.target.value }))} /></div>
      </div>
      <p className="text-xs text-slate-500 mt-1">Never type your full NIN or BVN here. An admin checks your identity by hand in this test version.</p>
      <label className={lbl} htmlFor="in">Note for the admin (optional)</label>
      <input id="in" className={inp} maxLength={300} value={f.idNote} onChange={(e) => setF((p) => ({ ...p, idNote: e.target.value }))} />
      {msg && <p className="mt-4 text-sm text-amber-300" role="alert">{msg}</p>}
      <button disabled={busy} className={`${btn} mt-5`}>{busy ? 'Saving…' : 'Save'}</button>
      <p className="mt-6 text-sm"><Link href="/family/jobs" className="underline text-green-400">See my jobs</Link></p>
    </form>
  );
}

export default function Page() { return <Shell title="Family bookings: professionals">{() => <Setup />}</Shell>; }
