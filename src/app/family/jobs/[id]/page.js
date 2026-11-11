'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Shell, api, inp, lbl, btn, btnGhost, btnWarn, card, when, dayText } from '../../ui';
import Camera from '../../Camera';
import { STATUS_LABEL, DISPUTE_REASONS, fmtMoney } from '@/lib/familyLabels';

const EVENT = {
  requested: 'Request sent', accept: 'Accepted by the professional', decline: 'Declined by the professional', expired: 'No reply in 24 hours, request expired',
  funds_held: 'Payment received and held', before_photo: 'Before photo added', after_photo: 'After photo added', code_issued: 'One-time code created for your family member',
  code_wrong: 'A wrong code was entered', code_confirmed: 'Family member confirmed with the code', sender_confirmed: 'Confirmed by the person who booked', released: 'Professional paid',
  cancelled: 'Cancelled', cancelled_refunded: 'Cancelled and refunded', dispute_opened: 'Dispute opened', problem_reported_after_payout: 'Problem reported after payment',
  code_resent: 'New code created', rated: 'Rated', release_failed: 'Payout failed, will be retried', duplicate_photo_rejected: 'A reused photo was rejected',
  settled_refund: 'Refunded after review', settled_release: 'Paid after review', settled_split: 'Part refunded after review', report_closed: 'Report reviewed and closed',
};

function Job() {
  const { id } = useParams();
  const [d, setD] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  const [reason, setReason] = useState('not_done');
  const [details, setDetails] = useState('');
  const [rate, setRate] = useState(5);
  const [comment, setComment] = useState('');
  const [open, setOpen] = useState('');

  const load = () => api(`/api/family/bookings/${id}`).then(setD);
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (body) => {
    setBusy(true); setMsg('');
    const r = await api(`/api/family/bookings/${id}/action`, { method: 'POST', body });
    setBusy(false);
    if (!r.ok) setMsg(r.error || 'Something went wrong.'); else if (r.warning) setMsg(r.warning);
    setOpen(''); setCode('');
    await load();
    return r;
  };
  const sendPhoto = async (p) => {
    const r = await api(`/api/family/bookings/${id}/proofs`, { method: 'POST', body: p });
    if (r.ok) await load();
    return r;
  };

  if (!d) return <p className="mt-8 text-slate-400 text-sm">Loading…</p>;
  if (!d.ok) return <p className="mt-8 text-amber-400 text-sm">{d.error}</p>;
  const j = d.job, me = d.me, st = j.status;
  const S = me.isSender, P = me.isPro;
  const before = d.proofs.find((x) => x.kind === 'before'), after = d.proofs.find((x) => x.kind === 'after');
  const money = (n, c) => fmtMoney(n, c);
  const openDispute = d.disputes.find((x) => x.status === 'open');
  const within7 = j.releasedAt && Date.now() - new Date(j.releasedAt).getTime() < 7 * 864e5;

  return (
    <div className="mt-6">
      {j.isTest && <p className="text-xs text-amber-300 mb-3">Test job. Pretend money, not real.</p>}
      <div className={card}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-lg font-bold">{j.service} for {j.recipientName}</p>
          <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-green-600/50 text-green-400">{STATUS_LABEL[st] || st}</span>
        </div>
        <p className="mt-2 text-sm text-slate-300">{j.business} · {dayText(j.date)} at {j.time}</p>
        <p className="text-sm text-slate-400">Where: {j.recipientArea}{(P || me.isAdmin) ? ` · Phone: ${j.recipientPhone}` : ''}</p>
        <p className="text-sm text-slate-400">Price: {money(j.priceLocal, j.localCurrency)}{j.chargeAmount != null && j.chargeCurrency !== j.localCurrency ? ` (about ${money(j.chargeAmount, j.chargeCurrency)})` : ''}</p>
        {j.notes && <p className="text-sm text-slate-400">Notes: {j.notes}</p>}
        {d.payment && <p className="text-xs text-slate-500 mt-2">Payment: {d.payment.hold_status} ({d.payment.provider}){d.payment.refund_amount ? `, refunded ${money(d.payment.refund_amount, d.payment.currency)}` : ''}</p>}
        <p className="mt-3 text-xs text-slate-500">{d.disclosure}</p>
      </div>

      {msg && <p className="mt-4 text-sm text-amber-400" role="alert">{msg}</p>}

      <div className={`${card} mt-4`}>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">What happens next</p>

        {st === 'requested' && P && <div className="mt-3"><p className="text-sm">Accept this job? Reply before {when(j.respondBy)}.</p>
          <div className="mt-3 flex gap-2"><button className={btn} disabled={busy} onClick={() => act({ action: 'accept' })}>Accept</button><button className={btnGhost} disabled={busy} onClick={() => act({ action: 'decline' })}>Decline</button></div></div>}
        {st === 'requested' && S && !P && <p className="mt-3 text-sm">Waiting for {j.business} to accept. You will not be charged until they do.</p>}
        {st === 'requested' && S && <div className="mt-3"><button className={btnGhost} disabled={busy} onClick={() => act({ action: 'cancel' })}>Cancel request</button></div>}

        {st === 'accepted' && S && <div className="mt-3"><p className="text-sm">{j.business} accepted. Pay to confirm the booking. The money is held until the job is done and confirmed.</p>
          <div className="mt-3 flex gap-2"><button className={btn} disabled={busy} onClick={() => act({ action: 'pay' })}>{j.isTest ? 'Pay (test, pretend money)' : 'Pay'}</button><button className={btnGhost} disabled={busy} onClick={() => act({ action: 'cancel' })}>Cancel</button></div></div>}
        {st === 'accepted' && P && !S && <p className="mt-3 text-sm">Waiting for the customer to pay.</p>}

        {st === 'funds_held' && P && <div className="mt-3"><p className="text-sm">The customer has paid and the money is held. When you start the job, take a <b>before</b> photo with the camera.</p><Camera kind="before" label="Take before photo" onSubmit={sendPhoto} /></div>}
        {st === 'funds_held' && S && !P && <p className="mt-3 text-sm">Paid. Waiting for {j.business} to start the job.</p>}
        {st === 'funds_held' && S && <div className="mt-3"><button className={btnGhost} disabled={busy} onClick={() => act({ action: 'cancel' })}>Cancel and refund</button></div>}

        {st === 'in_progress' && P && <div className="mt-3"><p className="text-sm">Job in progress. When it is finished, take an <b>after</b> photo. Your customer's family member will then get a code to confirm the job.</p><Camera kind="after" label="Take after photo" onSubmit={sendPhoto} /></div>}
        {st === 'in_progress' && S && !P && <p className="mt-3 text-sm">The job has started.</p>}

        {st === 'proof_submitted' && P && <div className="mt-3">
          <p className="text-sm">Job done. Ask {j.recipientName} for the 6-digit code that was sent to them. They should only give it to you if they are happy.</p>
          <label className={lbl} htmlFor="cd">Code from {j.recipientName}</label>
          <input id="cd" className={inp} inputMode="numeric" maxLength={6} placeholder="000000" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          <div className="mt-3 flex flex-wrap gap-2"><button className={btn} disabled={busy || code.length !== 6} onClick={() => act({ action: 'confirm_code', code })}>Confirm and get paid</button>
            <button className={btnGhost} disabled={busy} onClick={() => act({ action: 'resend_code' })}>Send a new code</button></div>
          {d.code && <p className="mt-2 text-xs text-slate-500">{d.code.locked ? 'Too many wrong tries. The customer can confirm the job instead.' : `Wrong tries so far: ${d.code.attempts}. New codes sent: ${d.code.resends} of 3.`}</p>}
        </div>}
        {st === 'proof_submitted' && S && <div className="mt-3">
          <p className="text-sm">{j.business} says the job is done. Look at the photos below. A one-time code has been created for {j.recipientName}; the professional is paid when they give it to them.</p>
          {d.testCode && <p className="mt-3 text-sm bg-amber-500/10 border border-amber-500/40 rounded-xl px-4 py-3 text-amber-200">Test mode: the code for {j.recipientName} is <b className="tracking-widest">{d.testCode}</b>. In real use it is sent by text message and you never see it.</p>}
          <div className="mt-3 flex flex-wrap gap-2"><button className={btn} disabled={busy} onClick={() => act({ action: 'sender_confirm' })}>The job is done, pay {j.business}</button><button className={btnWarn} disabled={busy} onClick={() => setOpen(open === 'dispute' ? '' : 'dispute')}>Something is wrong</button></div>
        </div>}
        {st === 'in_progress' && S && <div className="mt-3"><button className={btnWarn} disabled={busy} onClick={() => setOpen(open === 'dispute' ? '' : 'dispute')}>Something is wrong</button></div>}

        {st === 'disputed' && <p className="mt-3 text-sm">A dispute is open{openDispute ? ` (${DISPUTE_REASONS[openDispute.reason] || openDispute.reason})` : ''}. The money stays held while an admin reviews the photos and the log.</p>}
        {st === 'confirmed' && <p className="mt-3 text-sm">Confirmed. The payout is being completed.</p>}
        {st === 'released' && <p className="mt-3 text-sm">All done. {j.confirmedBy === 'recipient_code' ? 'The family member confirmed with the code.' : j.confirmedBy === 'admin' ? 'An admin settled this job.' : 'The customer confirmed.'}</p>}
        {['declined', 'expired', 'cancelled', 'refunded', 'failed'].includes(st) && <p className="mt-3 text-sm">This job is closed.</p>}

        {open === 'dispute' && S && <div className="mt-4 border-t border-slate-800 pt-4">
          <label className={lbl} htmlFor="rs">What went wrong?</label>
          <select id="rs" className={inp} value={reason} onChange={(e) => setReason(e.target.value)}>{Object.entries(DISPUTE_REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <label className={lbl} htmlFor="dd">Tell us more (optional)</label>
          <input id="dd" className={inp} maxLength={500} value={details} onChange={(e) => setDetails(e.target.value)} />
          <button className={`${btnWarn} mt-3`} disabled={busy} onClick={() => act({ action: 'dispute', reason, details })}>Open a dispute</button>
          <p className="mt-2 text-xs text-slate-500">The money stays held. An admin reviews it and can refund, pay the professional or split it.</p>
        </div>}

        {st === 'released' && S && !d.rating && <div className="mt-4 border-t border-slate-800 pt-4">
          <label className={lbl} htmlFor="rt">Rate this job</label>
          <select id="rt" className={inp} value={rate} onChange={(e) => setRate(Number(e.target.value))}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} {n === 1 ? 'star' : 'stars'}</option>)}</select>
          <input className={`${inp} mt-2`} maxLength={300} placeholder="A short comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
          <button className={`${btn} mt-3`} disabled={busy} onClick={() => act({ action: 'rate', rating: rate, comment })}>Send rating</button>
        </div>}
        {st === 'released' && d.rating && <p className="mt-3 text-sm text-slate-400">Rated {d.rating.rating}/5{d.rating.comment ? `: ${d.rating.comment}` : ''}</p>}
        {st === 'released' && S && within7 && !openDispute && <div className="mt-4 border-t border-slate-800 pt-4">
          <button className={btnGhost} onClick={() => setOpen(open === 'report' ? '' : 'report')}>Report a problem</button>
          {open === 'report' && <div className="mt-3"><p className="text-xs text-slate-500">The professional has already been paid, so GNIS cannot take the money back. An admin will review it and it counts against their trust level.</p>
            <select className={`${inp} mt-2`} value={reason} onChange={(e) => setReason(e.target.value)}>{Object.entries(DISPUTE_REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <input className={`${inp} mt-2`} maxLength={500} placeholder="Tell us more (optional)" value={details} onChange={(e) => setDetails(e.target.value)} />
            <button className={`${btnWarn} mt-3`} disabled={busy} onClick={() => act({ action: 'report', reason, details })}>Send report</button></div>}
        </div>}
        {st === 'released' && openDispute && <p className="mt-3 text-sm text-amber-300">Your report is being reviewed.</p>}
      </div>

      {(before || after) && <div className={`${card} mt-4`}>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Proof photos</p>
        <div className="mt-3 grid sm:grid-cols-2 gap-4">
          {[before, after].filter(Boolean).map((p) => (
            <div key={p.id}>
              <img src={`/api/family/proofs/${p.id}`} alt={`${p.kind} photo`} className="w-full rounded-xl bg-slate-800" />
              <p className="mt-1 text-xs text-slate-400"><b className="uppercase">{p.kind}</b> · received {when(p.received_at)}</p>
              <p className="text-xs text-slate-500">Phone location {Number(p.lat).toFixed(4)}, {Number(p.lng).toFixed(4)}{p.accuracy_m ? ` (±${Math.round(p.accuracy_m)} m)` : ''}{p.device_note ? ` · note: ${p.device_note.replace(/_/g, ' ')}` : ''}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">Photos come from the in-app camera. The time and place come from the phone and can be faked, so they are evidence, not proof.</p>
      </div>}

      <div className={`${card} mt-4`}>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Log</p>
        <ul className="mt-3 space-y-1 text-sm text-slate-300">
          {d.events.map((e, i) => <li key={i}><span className="text-slate-500">{when(e.at)}</span> · {EVENT[e.event] || e.event.replace(/_/g, ' ')}</li>)}
        </ul>
      </div>
    </div>
  );
}

export default function Page() { return <Shell title="Job">{() => <Job />}</Shell>; }
