'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const input = { width: '100%', boxSizing: 'border-box', padding: '12px 44px 12px 12px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 15 };

function Eye({ on }) {
  return on ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  );
}

function Form() {
  const token = useSearchParams().get('token') || '';
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg('');
    try {
      const r = await fetch('/api/auth/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password: pw }) });
      const j = await r.json().catch(() => ({}));
      if (j.ok) setDone(true); else setMsg(j.error || 'Something went wrong');
    } catch { setMsg('Network error. Try again.'); }
    setBusy(false);
  };

  return (
    <div style={{ maxWidth: 420, margin: '80px auto', padding: 24, background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', fontFamily: 'system-ui, sans-serif', color: '#111827' }}>
      <h2 style={{ marginTop: 0 }}>Choose a new password</h2>
      {done ? (
        <>
          <p>Your password has been changed. You can log in with it now.</p>
          <a href="/" style={{ display: 'inline-block', background: '#16a34a', color: '#fff', padding: '10px 18px', borderRadius: 8, textDecoration: 'none', fontWeight: 700 }}>Go to log in</a>
        </>
      ) : !token ? (
        <p>This link is missing its code. Open the link from your email again, or <a href="/" style={{ color: '#2563eb' }}>ask for a new one</a>.</p>
      ) : (
        <form onSubmit={submit}>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <input style={input} type={show ? 'text' : 'password'} required minLength={8} autoComplete="new-password" placeholder="New password (min 8 characters)" value={pw} onChange={(e) => setPw(e.target.value)} />
            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 0, cursor: 'pointer', color: '#6b7280' }}><Eye on={show} /></button>
          </div>
          {msg && <div style={{ color: '#b91c1c', fontSize: 14, marginBottom: 10 }}>{msg}</div>}
          <button type="submit" disabled={busy} style={{ width: '100%', background: '#16a34a', color: '#fff', border: 0, borderRadius: 10, padding: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>{busy ? 'Saving…' : 'Save new password'}</button>
        </form>
      )}
    </div>
  );
}

export default function ResetPassword() {
  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
      <Suspense fallback={null}><Form /></Suspense>
    </div>
  );
}
