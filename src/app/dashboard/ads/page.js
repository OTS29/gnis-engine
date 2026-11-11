'use client';

import { useEffect, useState } from 'react';

const box = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 12 };
const input = { padding: '9px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box' };
const lbl = { display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', margin: '12px 0 4px' };
const btn = (bg = '#059669') => ({ background: bg, color: '#fff', border: 0, borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' });
const money = (n, c) => { try { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: c }).format(n); } catch { return `${c} ${n}`; } };
const when = (v) => (v ? new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const call = async (url, method = 'GET', body) => {
  try {
    const r = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    return { ...j, status: r.status };
  } catch { return { ok: false, error: 'Network error', status: 0 }; }
};

function Preview({ headline, body, cta, name }) {
  return (
    <div style={{ background: '#0f172a', color: '#fff', borderRadius: 14, padding: 16, border: '1px solid #f59e0b66' }}>
      <span style={{ background: '#fbbf24', color: '#052e16', borderRadius: 999, padding: '2px 10px', fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>Sponsored</span>
      <p style={{ margin: '10px 0 0', fontSize: 17, fontWeight: 800 }}>{headline || 'Your headline'}</p>
      <p style={{ margin: '6px 0 0', fontSize: 14, color: '#cbd5e1', lineHeight: 1.5 }}>{body || 'A short line about what you offer.'}</p>
      <p style={{ margin: '8px 0 10px', fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>{name || 'Your business'}</p>
      <span style={{ background: '#fbbf24', color: '#052e16', borderRadius: 10, padding: '9px 16px', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, display: 'inline-block' }}>{cta}</span>
    </div>
  );
}

function Settle({ id, onDone }) {
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  return (
    <div style={{ marginTop: 8 }}>
      <input style={input} placeholder="Reason (needed to reject or remove)" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        {onDone.canApprove && <button style={btn()} onClick={async () => { const r = await call('/api/ads/admin', 'POST', { action: 'approve', id }); if (r.ok) onDone.reload(); else setMsg(r.error); }}>Approve</button>}
        <button style={btn('#dc2626')} onClick={async () => { const r = await call('/api/ads/admin', 'POST', { action: onDone.canApprove ? 'reject' : 'remove', id, note }); if (r.ok) onDone.reload(); else setMsg(r.error); }}>{onDone.canApprove ? 'Reject' : 'Take down'}</button>
      </div>
      {msg && <p style={{ color: '#b45309', fontSize: 13 }}>{msg}</p>}
    </div>
  );
}

export default function AdsPage() {
  const [d, setD] = useState(null);
  const [adm, setAdm] = useState(null);
  const [f, setF] = useState({ headline: '', body: '', cta: 'View business', packageId: 'd14', agree: false });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    const r = await call('/api/ads');
    setD(r);
    if (r.ok && r.isAdmin) { const a = await call('/api/ads/admin'); if (a.ok) setAdm(a); }
  };
  useEffect(() => { load(); }, []);

  if (!d) return <main style={{ padding: 24 }}>Loading…</main>;
  if (!d.ok) return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: 24 }}>Advertise on GNIS</h1>
      <p style={{ color: '#4b5563' }}>{d.status === 401 ? 'Please log in with your business account first.' : 'Adverts are not open yet. Check back soon.'}</p>
      <a href="/dashboard" style={{ color: '#059669', fontWeight: 600 }}>Back to dashboard</a>
    </main>
  );

  const pkg = d.packages.find((p) => p.id === f.packageId) || d.packages[0];
  const submit = async () => {
    setBusy(true); setMsg('');
    const c = await call('/api/ads', 'POST', { action: 'create', ...f });
    if (!c.ok) { setBusy(false); setMsg(c.error || 'Could not save the advert.'); return; }
    const p = await call('/api/ads', 'POST', { action: 'pay', id: c.id });
    setBusy(false);
    if (!p.ok) { setMsg(p.error || 'Could not start payment.'); load(); return; }
    if (p.url) { window.location.href = p.url; return; }
    setF({ headline: '', body: '', cta: 'View business', packageId: 'd14', agree: false });
    setMsg('Test payment done. An admin now reviews your advert.');
    load();
  };
  const cancel = async (id) => { const r = await call('/api/ads', 'POST', { action: 'cancel', id }); setMsg(r.ok ? (r.refund === 'refunded' ? 'Cancelled and refunded.' : 'Cancelled.') : r.error); load(); };

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '20px 16px 60px', fontFamily: 'system-ui, sans-serif', color: '#111827' }}>
      <a href="/dashboard" style={{ color: '#059669', fontWeight: 600, fontSize: 14 }}>Back to dashboard</a>
      <h1 style={{ fontSize: 28, margin: '10px 0 4px' }}>Advertise your business</h1>
      <p style={{ color: '#4b5563', marginTop: 0 }}>Your advert appears in the Sponsored strip above the business search on the GNIS home page and sends people to your GNIS page.</p>
      {d.mode === 'test' && <p style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>Test mode. Payment is pretend and no real money is taken. Only admins and testers see test adverts.</p>}
      {msg && <p role="alert" style={{ background: '#ecfdf5', border: '1px solid #34d399', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>{msg}</p>}

      {!d.site?.published ? (
        <div style={box}>Publish your GNIS page first. Your advert sends people to it. <a href="/dashboard" style={{ color: '#059669', fontWeight: 600 }}>Open dashboard</a></div>
      ) : (
        <div style={box}>
          <label style={lbl} htmlFor="h">Headline ({f.headline.length}/60)</label>
          <input id="h" style={input} maxLength={60} value={f.headline} onChange={(e) => setF({ ...f, headline: e.target.value })} placeholder="e.g. Knotless braids, booked in minutes" />
          <label style={lbl} htmlFor="b">Short description ({f.body.length}/140)</label>
          <textarea id="b" style={{ ...input, minHeight: 70 }} maxLength={140} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} placeholder="What you offer and why people should choose you" />
          <label style={lbl} htmlFor="c">Button</label>
          <select id="c" style={input} value={f.cta} onChange={(e) => setF({ ...f, cta: e.target.value })}>{d.ctas.map((c) => <option key={c}>{c}</option>)}</select>
          <p style={lbl}>How long should it run?</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
            {d.packages.map((p) => (
              <label key={p.id} style={{ border: `2px solid ${f.packageId === p.id ? '#059669' : '#e5e7eb'}`, borderRadius: 10, padding: 12, cursor: 'pointer', background: f.packageId === p.id ? '#ecfdf5' : '#fff' }}>
                <input type="radio" name="pkg" checked={f.packageId === p.id} onChange={() => setF({ ...f, packageId: p.id })} /> <b>{p.label}</b>
                <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{money(p.price, d.currency)}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>about {money(p.price / p.days, d.currency)} a day</div>
              </label>
            ))}
          </div>
          <p style={lbl}>Preview</p>
          <Preview headline={f.headline} body={f.body} cta={f.cta} name={d.site.name} />
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, margin: '16px 0 0', cursor: 'pointer' }}>
            <input type="checkbox" checked={f.agree} onChange={(e) => setF({ ...f, agree: e.target.checked })} style={{ marginTop: 3 }} />
            <span>I confirm this advert is true and for my own business. I agree to the advertising terms (draft): adverts are checked before they go live, are marked Sponsored, run for the days I choose from the day they are approved, and are not refunded once live. If an advert is not approved, I am refunded.</span>
          </label>
          {msg && <p style={{ color: '#b45309', fontSize: 13 }}>{msg}</p>}
          <button style={{ ...btn(), marginTop: 14, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={submit}>{busy ? 'Please wait…' : d.mode === 'test' ? `Pay ${money(pkg.price, d.currency)} (test, pretend money)` : `Pay ${money(pkg.price, d.currency)} by card`}</button>
        </div>
      )}

      <h2 style={{ fontSize: 18, marginTop: 24 }}>Your adverts</h2>
      {!d.ads.length && <p style={{ color: '#6b7280', fontSize: 14 }}>No adverts yet.</p>}
      {d.ads.map((a) => (
        <div key={a.id} style={box}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <b>{a.headline}</b>
            <span style={{ fontSize: 12, fontWeight: 800, color: a.status === 'live' ? '#059669' : '#6b7280' }}>{d.statusLabel[a.status] || a.status}{a.isTest ? ' (test)' : ''}</span>
          </div>
          <p style={{ margin: '4px 0', fontSize: 13, color: '#4b5563' }}>{a.body}</p>
          <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{a.days} days · {money(a.amount, a.currency)}{a.startsAt ? ` · ${when(a.startsAt)} to ${when(a.endsAt)}` : ''} · {a.views} views · {a.clicks} clicks</p>
          {a.status === 'rejected' && a.note && <p style={{ margin: '6px 0 0', fontSize: 13, color: '#b45309' }}>Reason: {a.note}</p>}
          {['pending_payment', 'pending_review'].includes(a.status) && <button style={{ ...btn('#6b7280'), marginTop: 8, padding: '6px 12px' }} onClick={() => cancel(a.id)}>Cancel{a.status === 'pending_review' ? ' and refund' : ''}</button>}
        </div>
      ))}

      {adm && (
        <>
          <h2 style={{ fontSize: 18, marginTop: 28 }}>Admin: adverts to review</h2>
          {!adm.review.length && <p style={{ color: '#6b7280', fontSize: 14 }}>Nothing waiting.</p>}
          {adm.review.map((a) => (
            <div key={a.id} style={box}>
              <b>{a.headline}</b> <span style={{ fontSize: 12, color: '#6b7280' }}>{a.business} · {a.days} days · {money(a.amount, a.currency)}{a.isTest ? ' · test' : ' · paid'}</span>
              <p style={{ margin: '4px 0', fontSize: 13 }}>{a.body}</p>
              <p style={{ margin: 0, fontSize: 12 }}><a href={`/site/${a.slug}`} target="_blank" rel="noreferrer" style={{ color: '#059669' }}>Open their page</a> · button: {a.cta}</p>
              <Settle id={a.id} onDone={{ canApprove: true, reload: load }} />
            </div>
          ))}
          <h2 style={{ fontSize: 18, marginTop: 20 }}>Admin: live adverts</h2>
          {!adm.live.length && <p style={{ color: '#6b7280', fontSize: 14 }}>None live.</p>}
          {adm.live.map((a) => (
            <div key={a.id} style={box}>
              <b>{a.headline}</b> <span style={{ fontSize: 12, color: '#6b7280' }}>{a.business} · ends {when(a.endsAt)} · {a.views} views · {a.clicks} clicks{a.isTest ? ' · test' : ''}</span>
              <Settle id={a.id} onDone={{ canApprove: false, reload: load }} />
            </div>
          ))}
        </>
      )}
    </main>
  );
}
