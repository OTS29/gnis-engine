'use client';
import { useState } from 'react';
import { FROM_COUNTRIES, TO_COUNTRIES } from '@/lib/diaspora';

const inp = 'w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-green-500/40';
const lbl = 'block text-[10px] font-black uppercase tracking-widest text-slate-400 mt-4 mb-1';

export default function FamilyForm() {
  const [f, setF] = useState({ role: 'customer', from: 'GB', to: 'NG', consent: false, website: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/family/waitlist', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(f) });
      const j = await r.json().catch(() => ({}));
      if (j.ok) setDone(true); else setErr(j.error || 'Something went wrong. Please try again.');
    } catch { setErr('Could not connect. Please try again.'); }
    setBusy(false);
  };

  if (done) return <div className="mt-4 bg-green-500/10 border border-green-500/40 rounded-2xl p-5 text-sm">You are on the list. We will email you when this opens. Nothing has been charged.</div>;

  return (
    <form onSubmit={submit} className="mt-2">
      <label className={lbl}>I am</label>
      <div className="grid sm:grid-cols-2 gap-2">
        {[['customer', 'Abroad, booking for family'], ['pro', 'A professional offering services']].map(([v, l]) => (
          <label key={v} className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm cursor-pointer ${f.role === v ? 'border-green-500 bg-green-500/10' : 'border-slate-800 bg-slate-900'}`}>
            <input type="radio" name="role" value={v} checked={f.role === v} onChange={set('role')} /> {l}
          </label>
        ))}
      </div>
      <label className={lbl} htmlFor="em">Email</label>
      <input id="em" type="email" required autoComplete="email" className={inp} onChange={set('email')} />
      <div className="grid grid-cols-2 gap-3">
        <div><label className={lbl} htmlFor="fr">{f.role === 'pro' ? 'Customers would be in' : 'I live in'}</label>
          <select id="fr" className={inp} value={f.from} onChange={set('from')}>{Object.entries(FROM_COUNTRIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div><label className={lbl} htmlFor="to">{f.role === 'pro' ? 'I work in' : 'My family is in'}</label>
          <select id="to" className={inp} value={f.to} onChange={set('to')}>{Object.entries(TO_COUNTRIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
      </div>
      <label className={lbl} htmlFor="nt">{f.role === 'pro' ? 'What do you offer? (optional)' : 'What would you book? (optional)'}</label>
      <input id="nt" maxLength={300} className={inp} placeholder={f.role === 'pro' ? 'Barbing, braids, cleaning…' : 'Hair for my mum, cleaning for my sister…'} onChange={set('note')} />
      {/* Hidden from people. Bots fill it in and are ignored. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}><label>Website<input tabIndex={-1} autoComplete="off" onChange={set('website')} /></label></div>
      <label className="mt-5 flex items-start gap-3 text-sm text-slate-300 cursor-pointer">
        <input type="checkbox" className="mt-1" checked={f.consent} onChange={set('consent')} />
        <span>I agree that GNIS may email me about this feature. No payment is taken and I can ask to be removed at any time.</span>
      </label>
      {err && <p className="mt-4 text-sm text-amber-400" role="alert">{err}</p>}
      <button disabled={busy} className="mt-5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition">{busy ? 'Saving…' : 'Join the waiting list'}</button>
    </form>
  );
}
