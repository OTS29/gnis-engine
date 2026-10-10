'use client';
import { useState } from 'react';

const T = {
  classic: { bg: '#ffffff', fg: '#111827', mute: '#6b7280', card: '#f9fafb', line: '#e5e7eb', font: 'system-ui, sans-serif', head: 'system-ui, sans-serif', hw: 700, hs: 'clamp(28px,5vw,44px)', radius: 14, heroBg: 'accent-soft' },
  bold: { bg: '#ffffff', fg: '#0b0b0b', mute: '#444', card: '#f4f4f4', line: '#0b0b0b', font: 'system-ui, sans-serif', head: 'system-ui, sans-serif', hw: 900, hs: 'clamp(36px,8vw,72px)', radius: 4, heroBg: 'accent' },
  minimal: { bg: '#fcfcfb', fg: '#222', mute: '#888', card: '#ffffff', line: '#ececec', font: 'system-ui, sans-serif', head: 'system-ui, sans-serif', hw: 300, hs: 'clamp(28px,5vw,48px)', radius: 2, heroBg: 'none' },
  elegant: { bg: '#faf7f2', fg: '#2a2118', mute: '#7a6a58', card: '#ffffff', line: '#e6dccb', font: 'Georgia, serif', head: 'Georgia, "Times New Roman", serif', hw: 400, hs: 'clamp(30px,5.5vw,52px)', radius: 6, heroBg: 'none' },
  dark: { bg: '#0b0d12', fg: '#f3f4f6', mute: '#9ca3af', card: '#151922', line: '#252b38', font: 'system-ui, sans-serif', head: 'system-ui, sans-serif', hw: 700, hs: 'clamp(30px,6vw,56px)', radius: 14, heroBg: 'none' },
};

const gbp = (n) => (Number(n) ? `£${Number(n)}` : 'Free');

export default function SiteRenderer({ slug, template = 'classic', data, preview = false }) {
  const t = T[template] || T.classic;
  const a = data.accent || '#2563eb';
  const [form, setForm] = useState({ customer: '', contact: '', service: '', date: '', time: '' });
  const [state, setState] = useState({ busy: false, msg: '', ok: false });

  const heroStyle = data.hero
    ? { backgroundImage: `linear-gradient(rgba(0,0,0,.45),rgba(0,0,0,.55)),url(${data.hero})`, backgroundSize: 'cover', backgroundPosition: 'center', color: '#fff' }
    : t.heroBg === 'accent' ? { background: a, color: '#fff' }
    : t.heroBg === 'accent-soft' ? { background: a + '14', color: t.fg }
    : { background: t.bg, color: t.fg };

  const submit = async (e) => {
    e.preventDefault();
    if (preview) { setState({ busy: false, ok: false, msg: 'Preview only. Bookings work on your live site.' }); return; }
    setState({ busy: true, msg: '', ok: false });
    try {
      const r = await fetch('/api/site/book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, ...form }) });
      const j = await r.json();
      if (j.ok) { setState({ busy: false, ok: true, msg: 'Request sent! You will be contacted to confirm.' }); setForm({ customer: '', contact: '', service: '', date: '', time: '' }); }
      else setState({ busy: false, ok: false, msg: j.error || 'Something went wrong' });
    } catch { setState({ busy: false, ok: false, msg: 'Network error. Try again.' }); }
  };

  const wrap = { maxWidth: 960, margin: '0 auto', padding: '0 20px' };
  const sec = { padding: '48px 0' };
  const h2 = { fontFamily: t.head, fontWeight: t.hw, fontSize: 24, margin: '0 0 20px', textTransform: template === 'bold' ? 'uppercase' : 'none' };
  const card = { background: t.card, border: `1px solid ${t.line}`, borderRadius: t.radius, padding: 18 };
  const input = { width: '100%', padding: '12px 14px', border: `1px solid ${t.line}`, borderRadius: t.radius, background: t.bg, color: t.fg, fontSize: 16, boxSizing: 'border-box', fontFamily: t.font };
  const btn = { background: a, color: '#fff', border: 0, padding: '13px 22px', borderRadius: t.radius, fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: t.font };

  return (
    <div style={{ background: t.bg, color: t.fg, fontFamily: t.font, minHeight: '100%', lineHeight: 1.55 }}>
      <header style={{ ...heroStyle, padding: '72px 0 64px' }}>
        <div style={wrap}>
          <h1 style={{ fontFamily: t.head, fontWeight: t.hw, fontSize: t.hs, margin: 0, lineHeight: 1.1, textTransform: template === 'bold' ? 'uppercase' : 'none' }}>{data.businessName}</h1>
          <p style={{ fontSize: 18, opacity: 0.85, margin: '14px 0 24px', maxWidth: 560 }}>{data.tagline}</p>
          <a href="#book" style={{ ...btn, display: 'inline-block', textDecoration: 'none', background: heroStyle.color === '#fff' && !data.hero && t.heroBg === 'accent' ? '#fff' : a, color: heroStyle.color === '#fff' && !data.hero && t.heroBg === 'accent' ? a : '#fff' }}>Book now</a>
        </div>
      </header>

      <main style={wrap}>
        {data.about && (<section style={sec}><h2 style={h2}>About</h2><p style={{ color: t.mute, whiteSpace: 'pre-wrap', maxWidth: 680 }}>{data.about}</p></section>)}

        {data.services.length > 0 && (
          <section style={sec}><h2 style={h2}>Services</h2>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))' }}>
              {data.services.map((s, i) => (
                <div key={i} style={card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontWeight: 600 }}><span>{s.name}</span><span style={{ color: a }}>{gbp(s.price)}</span></div>
                  {s.duration && <div style={{ color: t.mute, fontSize: 13 }}>{s.duration}</div>}
                  {s.desc && <p style={{ color: t.mute, fontSize: 14, margin: '8px 0 0' }}>{s.desc}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {data.products.length > 0 && (
          <section style={sec}><h2 style={h2}>Products</h2>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
              {data.products.map((p, i) => (
                <div key={i} style={{ ...card, padding: 0, overflow: 'hidden' }}>
                  {p.image && <img src={p.image} alt={p.name} style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />}
                  <div style={{ padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}><span>{p.name}</span><span style={{ color: a }}>{gbp(p.price)}</span></div>
                    {p.desc && <p style={{ color: t.mute, fontSize: 14, margin: '6px 0 0' }}>{p.desc}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {data.gallery.length > 0 && (
          <section style={sec}><h2 style={h2}>Gallery</h2>
            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))' }}>
              {data.gallery.map((g, i) => (<img key={i} src={g} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: t.radius }} />))}
            </div>
          </section>
        )}

        <section id="book" style={sec}><h2 style={h2}>Book</h2>
          <form onSubmit={submit} style={{ ...card, display: 'grid', gap: 12, maxWidth: 520 }}>
            <input style={input} placeholder="Your name" required value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} />
            <input style={input} placeholder="Phone or email" required value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
            <select style={input} required value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}>
              <option value="">Choose a service</option>
              {data.services.map((s, i) => (<option key={i} value={s.name}>{s.name} ({gbp(s.price)})</option>))}
            </select>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
              <input style={input} type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              <input style={input} type="time" required value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </div>
            <button style={{ ...btn, opacity: state.busy ? 0.6 : 1 }} disabled={state.busy}>{state.busy ? 'Sending…' : 'Request booking'}</button>
            {state.msg && <div style={{ fontSize: 14, color: state.ok ? '#059669' : '#dc2626' }}>{state.msg}</div>}
          </form>
        </section>

        <section style={{ ...sec, color: t.mute, fontSize: 14 }}>
          {data.location && <div>📍 {data.location}</div>}
          {data.hours && <div>🕒 {data.hours}</div>}
          {data.phone && <div>📞 {data.phone}</div>}
          {data.email && <div>✉️ {data.email}</div>}
        </section>
      </main>
      <footer style={{ textAlign: 'center', padding: '24px 0 36px', color: t.mute, fontSize: 12 }}>© {data.businessName}</footer>
    </div>
  );
}
