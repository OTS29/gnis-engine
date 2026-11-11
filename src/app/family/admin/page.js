'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shell, api, inp, btn, btnGhost, btnWarn, card, when } from '../ui';
import { CATEGORIES, DISPUTE_REASONS, STATUS_LABEL, fmtMoney } from '@/lib/familyLabels';

function Settle({ bookingId, afterRelease, onDone }) {
  const [decision, setDecision] = useState(afterRelease ? 'close' : 'refund');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const go = async () => {
    setBusy(true); setMsg('');
    const r = await api('/api/family/admin', { method: 'POST', body: { action: 'resolve', bookingId, decision, amount: Number(amount), note } });
    setBusy(false); if (r.ok) onDone(); else setMsg(r.error);
  };
  return (
    <div className="mt-3 grid gap-2">
      <select className={inp} value={decision} onChange={(e) => setDecision(e.target.value)}>
        {afterRelease ? <option value="close">Close the report (money already paid out)</option> : <>
          <option value="refund">Refund the customer in full</option><option value="release">Pay the professional in full</option><option value="split">Split: refund part, pay the rest</option></>}
      </select>
      {decision === 'split' && <input className={inp} inputMode="decimal" placeholder="Amount to refund" value={amount} onChange={(e) => setAmount(e.target.value)} />}
      <input className={inp} maxLength={500} placeholder="Short note explaining your decision (required)" value={note} onChange={(e) => setNote(e.target.value)} />
      <div><button className={btnWarn} disabled={busy} onClick={go}>{busy ? 'Working…' : 'Apply decision'}</button></div>
      {msg && <p className="text-sm text-amber-400">{msg}</p>}
    </div>
  );
}

function Admin() {
  const [d, setD] = useState(null);
  const load = () => api('/api/family/admin').then(setD);
  useEffect(() => { load(); }, []);
  const pro = async (action, siteId) => { await api('/api/family/admin', { method: 'POST', body: { action, siteId } }); load(); };
  if (!d) return <p className="mt-8 text-slate-400 text-sm">Loading…</p>;
  if (!d.ok) return <p className="mt-8 text-amber-400 text-sm">{d.error}</p>;
  return (
    <div className="mt-6 space-y-6">
      <section className={card}>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Professionals</p>
        {!d.pros.length && <p className="mt-2 text-sm text-slate-400">Nobody has opted in yet.</p>}
        {d.pros.map((p) => (
          <div key={p.site_id} className="mt-3 border-t border-slate-800 pt-3 text-sm">
            <p className="font-bold">{p.name} <span className="text-slate-400 font-normal">· {p.owner} · {p.email}</span></p>
            <p className="text-slate-400">Offers: {(p.categories || []).map((c) => CATEGORIES[c]).join(', ') || 'none'} · ID: {(p.id_method || '').toUpperCase()} ending {p.id_last4 || '?'} {p.id_note ? `· "${p.id_note}"` : ''}</p>
            <p className="text-slate-400">Status: <b className={p.status === 'verified' ? 'text-green-400' : 'text-amber-300'}>{p.status}</b> · <Link className="underline" href={`/site/${p.slug}`}>view site</Link></p>
            <div className="mt-2 flex flex-wrap gap-2">
              {p.status !== 'verified' && <button className={btn} onClick={() => pro('approve_pro', p.site_id)}>Mark verified</button>}
              {p.status === 'verified' && <button className={btnGhost} onClick={() => pro('reject_pro', p.site_id)}>Remove verification</button>}
              <button className={btnWarn} onClick={() => pro('suspend_pro', p.site_id)}>Suspend</button>
            </div>
          </div>
        ))}
        <p className="mt-3 text-xs text-slate-500">Only mark someone verified after you have checked their identity yourself. A NIN or BVN provider check comes in a later step.</p>
      </section>

      <section className={card}>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Open disputes and reports</p>
        {!d.disputes.length && <p className="mt-2 text-sm text-slate-400">None.</p>}
        {d.disputes.map((x) => (
          <div key={x.id} className="mt-3 border-t border-slate-800 pt-3 text-sm">
            <p className="font-bold">{x.service_name} · {x.business} · {fmtMoney(x.price_local, x.local_currency)}</p>
            <p className="text-slate-400">{DISPUTE_REASONS[x.reason] || x.reason}{x.details ? `: "${x.details}"` : ''} · opened {when(x.opened_at)} · job is "{STATUS_LABEL[x.booking_status] || x.booking_status}"{x.after_release ? ' · already paid out' : ''}</p>
            <p><Link className="underline text-green-400" href={`/family/jobs/${x.booking_id}`}>Open the job to see photos and log</Link></p>
            <Settle bookingId={x.booking_id} afterRelease={x.after_release} onDone={load} />
          </div>
        ))}
      </section>

      <section className={card}>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Needs a decision</p>
        {!d.stale.length && !d.stuck.length && <p className="mt-2 text-sm text-slate-400">Nothing waiting.</p>}
        {d.stale.map((x) => (
          <div key={x.id} className="mt-3 border-t border-slate-800 pt-3 text-sm">
            <p className="font-bold">{x.service_name} · {x.business}</p>
            <p className="text-slate-400">Done {when(x.proof_submitted_at)}. No code and no reply for 5 days. <Link className="underline text-green-400" href={`/family/jobs/${x.id}`}>Open job</Link></p>
            <Settle bookingId={x.id} onDone={load} />
          </div>
        ))}
        {d.stuck.map((x) => (
          <div key={x.id} className="mt-3 border-t border-slate-800 pt-3 text-sm">
            <p className="font-bold">{x.service_name} · {x.business}</p>
            <p className="text-slate-400">Confirmed {when(x.confirmed_at)} but the payout did not complete. Choose "Pay the professional in full" to retry.</p>
            <Settle bookingId={x.id} onDone={load} />
          </div>
        ))}
      </section>

      <section className={card}>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Jobs by status</p>
        <p className="mt-2 text-sm text-slate-300">{d.counts.length ? d.counts.map((c) => `${STATUS_LABEL[c.status] || c.status}: ${c.n}`).join(' · ') : 'No jobs yet.'}</p>
      </section>

      <section className={card}>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Waiting list</p>
        <p className="mt-2 text-sm text-slate-300">{d.waitlist.length ? d.waitlist.map((w) => `${w.people} ${w.role === 'pro' ? 'professionals' : 'customers'} (${w.from_country} to ${w.to_country})`).join(' · ') : 'Nobody yet.'}</p>
      </section>
    </div>
  );
}

export default function Page() {
  return <Shell title="Family bookings: admin">{(st) => (st.admin ? <Admin /> : <p className="mt-8 text-amber-400 text-sm">Admins only.</p>)}</Shell>;
}
