'use client';

import { useEffect, useState } from 'react';

const box = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 12 };
const pill = (status) => ({ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: status === 'confirmed' || status === 'paid' ? '#dcfce7' : status === 'cancelled' ? '#fee2e2' : '#f3f4f6', color: status === 'confirmed' || status === 'paid' ? '#166534' : status === 'cancelled' ? '#991b1b' : '#374151' });

function money(n, cur) {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur || 'GBP' }).format(Number(n) || 0); } catch { return `${cur || ''} ${n}`; }
}

export default function ClientPortal() {
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/portal/bookings');
        if (r.status === 401) { window.location.href = '/'; return; }
        const j = await r.json();
        setState({ loading: false, ...j });
      } catch { setState({ loading: false, ok: false, error: 'Network error' }); }
    })();
  }, []);

  const logout = async () => {
    try { await fetch('/api/portal/logout', { method: 'POST' }); } catch {}
    window.location.href = '/';
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', fontFamily: 'system-ui, sans-serif', color: '#111827' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>My bookings</strong>
        <span style={{ display: 'flex', gap: 10 }}>
          <a href="/" style={{ fontSize: 14, color: '#2563eb', textDecoration: 'none', alignSelf: 'center' }}>Find a professional</a>
          <button onClick={logout} style={{ background: '#6b7280', color: '#fff', border: 0, borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}>Log out</button>
        </span>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: 20 }}>
        {state.loading && <div style={box}>Loading…</div>}
        {!state.loading && !state.ok && <div style={{ ...box, color: '#b91c1c' }}>{state.error || 'Something went wrong'}</div>}

        {!state.loading && state.ok && (<>
          <div style={{ marginBottom: 12, fontSize: 15 }}>Hello{state.name ? `, ${state.name}` : ''}. Bookings and orders made with <b>{state.email}</b> appear here.</div>

          <h3 style={{ margin: '18px 0 8px' }}>Bookings</h3>
          {state.bookings.length === 0 && <div style={box}>No bookings yet. Book a professional using the same email address as your account and it will show here.</div>}
          {state.bookings.map((b) => (
            <div key={b.id} style={box}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <strong>{b.service}</strong><span style={pill(b.status)}>{b.status}</span>
              </div>
              <div style={{ fontSize: 14, color: '#374151', marginTop: 4 }}>{b.business || 'Professional'} · {String(b.date).slice(0, 10)} at {String(b.time).slice(0, 5)}</div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                {b.slug && <a href={`/site/${b.slug}`} style={{ color: '#2563eb' }}>Open their page to rebook</a>}
              </div>
            </div>
          ))}

          <h3 style={{ margin: '18px 0 8px' }}>Orders</h3>
          {state.orders.length === 0 && <div style={box}>No orders yet.</div>}
          {state.orders.map((o) => (
            <div key={o.id} style={box}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <strong>{o.business || 'Shop order'}</strong><span style={pill(o.status)}>{o.status}</span>
              </div>
              <div style={{ fontSize: 14, color: '#374151', marginTop: 4 }}>
                {(Array.isArray(o.items) ? o.items : []).map((i) => `${i.qty || 1} × ${i.name}`).join(', ')} · {money(o.total, o.currency)}
              </div>
            </div>
          ))}
        </>)}
      </main>
    </div>
  );
}
