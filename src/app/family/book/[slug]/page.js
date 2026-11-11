'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Shell, api, inp, lbl, btn, card } from '../../ui';
import { CATEGORIES, DISCLOSURE, fmtMoney } from '@/lib/familyLabels';

function Form() {
  const { slug } = useParams();
  const router = useRouter();
  const [d, setD] = useState(null);
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ service: '', category: '', recipientName: '', recipientPhone: '', recipientArea: '', date: '', time: '10:00', notes: '', consentRecipient: false, acceptDisclosure: false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  useEffect(() => { api(`/api/family/pros?slug=${encodeURIComponent(slug)}`).then((r) => { setD(r); const p = r.pros?.[0]; if (p) setF((x) => ({ ...x, service: p.services[0]?.name || '', category: p.categories[0] || '' })); }); }, [slug]);
  if (!d) return <p className="mt-8 text-slate-400 text-sm">Loading…</p>;
  const p = d.pros?.[0];
  if (!p) return <p className="mt-8 text-amber-400 text-sm">{d.error || 'This professional is not available for family bookings.'}</p>;
  const svc = p.services.find((s) => s.name === f.service);

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    const r = await api('/api/family/bookings', { method: 'POST', body: { ...f, slug } });
    setBusy(false);
    if (r.ok) router.push(`/family/jobs/${r.id}`); else setErr(r.error || 'Something went wrong.');
  };

  return (
    <form onSubmit={submit} className="mt-6">
      <div className={card}>
        <p className="text-lg font-bold">{p.name}</p>
        <p className="text-sm text-slate-400">{p.location} · {p.trust}</p>
      </div>
      <label className={lbl} htmlFor="sv">Service</label>
      <select id="sv" className={inp} value={f.service} onChange={set('service')}>{p.services.map((s) => <option key={s.name} value={s.name}>{s.name} · {fmtMoney(s.price, 'NGN')}</option>)}</select>
      {svc && d.fx ? <p className="text-xs text-slate-500 mt-1">About {fmtMoney(svc.price / d.fx, 'GBP')} at the test rate. The real amount is set by the payment provider.</p> : null}
      <label className={lbl} htmlFor="ct">Type of service</label>
      <select id="ct" className={inp} value={f.category} onChange={set('category')}>{p.categories.map((c) => <option key={c} value={c}>{CATEGORIES[c]}</option>)}</select>
      <label className={lbl} htmlFor="rn">Your family member's name</label>
      <input id="rn" className={inp} maxLength={80} required value={f.recipientName} onChange={set('recipientName')} />
      <label className={lbl} htmlFor="rp">Their phone number in Nigeria</label>
      <input id="rp" className={inp} inputMode="tel" placeholder="0803 123 4567" required value={f.recipientPhone} onChange={set('recipientPhone')} />
      <label className={lbl} htmlFor="ra">Area or address for the service</label>
      <input id="ra" className={inp} maxLength={120} required value={f.recipientArea} onChange={set('recipientArea')} />
      <div className="grid grid-cols-2 gap-3">
        <div><label className={lbl} htmlFor="dt">Date</label><input id="dt" type="date" min={today} required className={inp} value={f.date} onChange={set('date')} /></div>
        <div><label className={lbl} htmlFor="tm">Time</label><input id="tm" type="time" required className={inp} value={f.time} onChange={set('time')} /></div>
      </div>
      <label className={lbl} htmlFor="nt">Notes for the professional (optional)</label>
      <input id="nt" className={inp} maxLength={300} value={f.notes} onChange={set('notes')} />

      <div className={`${card} mt-6 space-y-3 text-sm`}>
        <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" className="mt-1" checked={f.consentRecipient} onChange={set('consentRecipient')} /><span>My family member knows about this booking and agrees to receive a text message with a one-time code. They should only give the code to the professional after the job is done and they are happy.</span></label>
        <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" className="mt-1" checked={f.acceptDisclosure} onChange={set('acceptDisclosure')} /><span>{DISCLOSURE(p.name)}</span></label>
      </div>
      <p className="text-xs text-slate-500 mt-3">The professional has 24 hours to accept. You pay only after they accept.</p>
      {err && <p className="mt-4 text-sm text-amber-400" role="alert">{err}</p>}
      <button disabled={busy} className={`${btn} mt-5`}>{busy ? 'Sending…' : 'Send request'}</button>
    </form>
  );
}

export default function Page() { return <Shell title="Book for family">{() => <Form />}</Shell>; }
