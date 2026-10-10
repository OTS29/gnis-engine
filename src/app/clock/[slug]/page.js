'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';

export default function Clock() {
  const { slug } = useParams();
  const [code, setCode] = useState('');
  const [who, setWho] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const call = async (action) => {
    setBusy(true); setMsg('');
    try {
      const r = await fetch('/api/site/clock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, code, action }) });
      const j = await r.json();
      if (j.ok) {
        setWho(j);
        if (action === 'in') setMsg('Clocked in. Have a good shift!');
        if (action === 'out') setMsg('Clocked out. See you next time!');
      } else { setMsg(j.error || 'Something went wrong'); if (action === 'status') setWho(null); }
    } catch { setMsg('Network error. Try again.'); }
    setBusy(false);
  };

  const box = { maxWidth: 420, margin: '8vh auto', padding: 24, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, fontFamily: 'system-ui, sans-serif' };
  const inp = { width: '100%', padding: 14, fontSize: 24, letterSpacing: 8, textAlign: 'center', border: '1px solid #d1d5db', borderRadius: 10, boxSizing: 'border-box' };
  const btn = (bg) => ({ background: bg, color: '#fff', border: 0, padding: '14px 18px', borderRadius: 10, fontSize: 17, fontWeight: 600, cursor: 'pointer', width: '100%', marginTop: 12 });

  return (
    <div className="clk" style={{ background: '#f3f4f6', color: '#111827', colorScheme: 'light', minHeight: '100vh', padding: '0 16px' }}>
      <style>{`.clk{color-scheme:light}.clk input{color:#111827 !important;background:#fff !important;-webkit-text-fill-color:#111827;font-size:24px !important;-webkit-appearance:none;appearance:none}.clk input::placeholder{color:#9ca3af !important;-webkit-text-fill-color:#9ca3af}`}</style>
      <div style={box}>
        <h1 style={{ fontSize: 22, margin: '0 0 4px' }}>Staff clock in</h1>
        <p style={{ color: '#6b7280', margin: '0 0 16px', fontSize: 14 }}>Enter your 6-digit code.</p>
        {!who ? (
          <form onSubmit={(e) => { e.preventDefault(); call('status'); }}>
            <input style={inp} inputMode="numeric" autoComplete="off" maxLength={6} placeholder="••••••" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
            <button style={btn('#111827')} disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Continue'}</button>
          </form>
        ) : (
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>Hi {who.name}</div>
            <div style={{ color: who.clockedIn ? '#059669' : '#6b7280', margin: '4px 0 8px' }}>{who.clockedIn ? `Working since ${who.since}` : 'Not clocked in'}</div>
            {who.clockedIn
              ? <button style={btn('#dc2626')} disabled={busy} onClick={() => call('out')}>Clock out</button>
              : <button style={btn('#059669')} disabled={busy} onClick={() => call('in')}>Clock in</button>}
            {who.recent?.length > 0 && (
              <div style={{ marginTop: 18, fontSize: 13, color: '#374151' }}>
                <strong>Recent shifts</strong>
                {who.recent.map((s, i) => (<div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}><span>{s.clock_in}{s.clock_out ? ` → ${s.clock_out}` : ' → now'}</span><span>{s.hours} h</span></div>))}
              </div>
            )}
            <button style={{ ...btn('#6b7280'), marginTop: 18 }} onClick={() => { setWho(null); setCode(''); setMsg(''); }}>Done</button>
          </div>
        )}
        {msg && <div style={{ marginTop: 12, fontSize: 14, color: /rror|not|already|wrong/i.test(msg) ? '#dc2626' : '#059669' }}>{msg}</div>}
      </div>
    </div>
  );
}
