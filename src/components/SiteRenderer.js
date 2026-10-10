'use client';
import { useEffect, useMemo, useRef, useState } from 'react';

const T = {
  classic: { bg: '#ffffff', fg: '#111827', mute: '#6b7280', card: '#f9fafb', line: '#e5e7eb', font: 'system-ui, sans-serif', head: 'system-ui, sans-serif', hw: 700, hs: 'clamp(28px,5vw,44px)', radius: 14, heroBg: 'accent-soft' },
  bold: { bg: '#ffffff', fg: '#0b0b0b', mute: '#444', card: '#f4f4f4', line: '#0b0b0b', font: 'system-ui, sans-serif', head: 'system-ui, sans-serif', hw: 900, hs: 'clamp(36px,8vw,72px)', radius: 4, heroBg: 'accent' },
  minimal: { bg: '#fcfcfb', fg: '#222', mute: '#888', card: '#ffffff', line: '#ececec', font: 'system-ui, sans-serif', head: 'system-ui, sans-serif', hw: 300, hs: 'clamp(28px,5vw,48px)', radius: 2, heroBg: 'none' },
  elegant: { bg: '#faf7f2', fg: '#2a2118', mute: '#7a6a58', card: '#ffffff', line: '#e6dccb', font: 'Georgia, serif', head: 'Georgia, "Times New Roman", serif', hw: 400, hs: 'clamp(30px,5.5vw,52px)', radius: 6, heroBg: 'none' },
  dark: { bg: '#0b0d12', fg: '#f3f4f6', mute: '#9ca3af', card: '#151922', line: '#252b38', font: 'system-ui, sans-serif', head: 'system-ui, sans-serif', hw: 700, hs: 'clamp(30px,6vw,56px)', radius: 14, heroBg: 'none' },
};

const gbp = (n) => (Number(n) ? `£${Number(n)}` : 'Free');
const money = (n) => `£${(Math.round(n * 100) / 100).toFixed(2)}`;

export default function SiteRenderer({ slug, template = 'classic', data, preview = false, payOnline = false }) {
  const t = T[template] || T.classic;
  const a = data.accent || '#2563eb';

  const [form, setForm] = useState({ customer: '', contact: '', service: '', date: '', time: '' });
  const [state, setState] = useState({ busy: false, msg: '', ok: false });

  // negotiation
  const [chat, setChat] = useState([]);
  const [offer, setOffer] = useState('');
  const [neg, setNeg] = useState({ state: null, busy: false, lock: null, open: false });
  const chatEnd = useRef(null);

  // cart
  const [cart, setCart] = useState({});
  const [buyer, setBuyer] = useState({ customer: '', contact: '' });
  const [shop, setShop] = useState({ busy: false, msg: '', ok: false });
  const [paidBanner, setPaidBanner] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('paid') === '1') setPaidBanner(true);
  }, []);
  useEffect(() => { chatEnd.current?.scrollIntoView({ block: 'nearest' }); }, [chat]);

  const selected = data.services.find((s) => s.name === form.service);
  const locked = neg.lock && neg.lock.service === form.service ? neg.lock : null;
  const cartLines = useMemo(() => data.products.filter((p) => cart[p.name]).map((p) => ({ ...p, qty: cart[p.name] })), [cart, data.products]);
  const cartTotal = cartLines.reduce((s, l) => s + (Number(l.price) || 0) * l.qty, 0);
  const cartCount = cartLines.reduce((s, l) => s + l.qty, 0);

  const changeService = (name) => {
    setForm((f) => ({ ...f, service: name }));
    setChat([]); setOffer(''); setNeg({ state: null, busy: false, lock: null, open: false });
  };

  const sendOffer = async (value) => {
    const amount = Number(value ?? offer);
    if (!(amount > 0)) return;
    if (preview) { setChat((c) => [...c, { who: 'me', text: `£${amount}` }, { who: 'ai', text: 'Preview only. Negotiation works on your live site.' }]); setOffer(''); return; }
    setChat((c) => [...c, { who: 'me', text: `I can do £${amount}` }]);
    setOffer('');
    setNeg((n) => ({ ...n, busy: true }));
    try {
      const r = await fetch('/api/site/negotiate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, service: form.service, offer: amount, state: neg.state }) });
      const j = await r.json();
      if (!j.ok) { setChat((c) => [...c, { who: 'ai', text: j.error || 'Sorry, something went wrong.' }]); setNeg((n) => ({ ...n, busy: false })); return; }
      setChat((c) => [...c, { who: 'ai', text: j.message, counter: j.decision !== 'accept' ? j.price : null }]);
      setNeg((n) => ({ ...n, busy: false, state: j.state || n.state, lock: j.decision === 'accept' ? { service: form.service, price: j.price, token: j.lockToken } : null }));
    } catch {
      setChat((c) => [...c, { who: 'ai', text: 'Network error. Please try again.' }]);
      setNeg((n) => ({ ...n, busy: false }));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (preview) { setState({ busy: false, ok: false, msg: 'Preview only. Bookings work on your live site.' }); return; }
    setState({ busy: true, msg: '', ok: false });
    try {
      const r = await fetch('/api/site/book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, ...form, lockToken: locked?.token }) });
      const j = await r.json();
      if (j.ok) {
        setState({ busy: false, ok: true, msg: `Request sent at ${money(j.price)}. You will be contacted to confirm.` });
        setForm({ customer: '', contact: '', service: '', date: '', time: '' });
        setChat([]); setNeg({ state: null, busy: false, lock: null, open: false });
      } else setState({ busy: false, ok: false, msg: j.error || 'Something went wrong' });
    } catch { setState({ busy: false, ok: false, msg: 'Network error. Try again.' }); }
  };

  const checkout = async () => {
    if (preview) { setShop({ busy: false, ok: false, msg: 'Preview only. Checkout works on your live site.' }); return; }
    setShop({ busy: true, msg: '', ok: false });
    try {
      const items = cartLines.map((l) => ({ name: l.name, qty: l.qty }));
      const r = await fetch('/api/site/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, items, ...buyer }) });
      const j = await r.json();
      if (j.ok && j.url) { window.location.href = j.url; return; }
      if (j.ok) { setCart({}); setShop({ busy: false, ok: true, msg: 'Order placed! You pay when you collect or receive it.' }); return; }
      setShop({ busy: false, ok: false, msg: j.error || 'Checkout failed' });
    } catch { setShop({ busy: false, ok: false, msg: 'Network error. Try again.' }); }
  };

  const heroStyle = data.hero
    ? { backgroundImage: `linear-gradient(rgba(0,0,0,.45),rgba(0,0,0,.55)),url(${data.hero})`, backgroundSize: 'cover', backgroundPosition: 'center', color: '#fff' }
    : t.heroBg === 'accent' ? { background: a, color: '#fff' }
    : t.heroBg === 'accent-soft' ? { background: a + '14', color: t.fg }
    : { background: t.bg, color: t.fg };
  const whiteBtn = heroStyle.color === '#fff' && !data.hero && t.heroBg === 'accent';

  const wrap = { maxWidth: 960, margin: '0 auto', padding: '0 20px' };
  const sec = { padding: '48px 0' };
  const h2 = { fontFamily: t.head, fontWeight: t.hw, fontSize: 24, margin: '0 0 20px', textTransform: template === 'bold' ? 'uppercase' : 'none' };
  const card = { background: t.card, border: `1px solid ${t.line}`, borderRadius: t.radius, padding: 18 };
  const input = { width: '100%', padding: '12px 14px', border: `1px solid ${t.line}`, borderRadius: t.radius, background: t.bg, color: t.fg, fontSize: 16, boxSizing: 'border-box', fontFamily: t.font };
  const btn = { background: a, color: '#fff', border: 0, padding: '13px 22px', borderRadius: t.radius, fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: t.font };
  const ghost = { background: 'transparent', color: a, border: `1px solid ${a}`, padding: '8px 14px', borderRadius: t.radius, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: t.font };

  return (
    <div style={{ background: t.bg, color: t.fg, fontFamily: t.font, minHeight: '100%', lineHeight: 1.55 }}>
      {paidBanner && <div style={{ background: '#059669', color: '#fff', textAlign: 'center', padding: 12, fontWeight: 600 }}>Payment received. Thank you! The seller will be in touch.</div>}
      <header style={{ ...heroStyle, padding: '72px 0 64px' }}>
        <div style={wrap}>
          <h1 style={{ fontFamily: t.head, fontWeight: t.hw, fontSize: t.hs, margin: 0, lineHeight: 1.1, textTransform: template === 'bold' ? 'uppercase' : 'none' }}>{data.businessName}</h1>
          <p style={{ fontSize: 18, opacity: 0.85, margin: '14px 0 24px', maxWidth: 560 }}>{data.tagline}</p>
          <a href="#book" style={{ ...btn, display: 'inline-block', textDecoration: 'none', background: whiteBtn ? '#fff' : a, color: whiteBtn ? a : '#fff' }}>Book now</a>
          {data.products.length > 0 && <a href="#shop" style={{ ...btn, display: 'inline-block', textDecoration: 'none', marginLeft: 10, background: 'transparent', border: '2px solid currentColor', color: 'inherit' }}>Shop{cartCount ? ` (${cartCount})` : ''}</a>}
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
                  {s.negotiable && <div style={{ marginTop: 8, fontSize: 12, color: a, fontWeight: 600 }}>Price negotiable</div>}
                </div>
              ))}
            </div>
          </section>
        )}

        {data.products.length > 0 && (
          <section id="shop" style={sec}><h2 style={h2}>Shop</h2>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
              {data.products.map((p, i) => (
                <div key={i} style={{ ...card, padding: 0, overflow: 'hidden' }}>
                  {p.image && <img src={p.image} alt={p.name} style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />}
                  <div style={{ padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}><span>{p.name}</span><span style={{ color: a }}>{gbp(p.price)}</span></div>
                    {p.desc && <p style={{ color: t.mute, fontSize: 14, margin: '6px 0 10px' }}>{p.desc}</p>}
                    {cart[p.name] ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button style={ghost} onClick={() => setCart((c) => { const n = { ...c }; if (n[p.name] > 1) n[p.name] -= 1; else delete n[p.name]; return n; })}>−</button>
                        <strong>{cart[p.name]}</strong>
                        <button style={ghost} onClick={() => setCart((c) => ({ ...c, [p.name]: Math.min(20, (c[p.name] || 0) + 1) }))}>+</button>
                      </div>
                    ) : (
                      <button style={{ ...btn, padding: '9px 16px', fontSize: 14 }} onClick={() => setCart((c) => ({ ...c, [p.name]: 1 }))}>Add to cart</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {cartCount > 0 && (
              <div style={{ ...card, marginTop: 20, maxWidth: 520 }}>
                <strong>Your cart</strong>
                {cartLines.map((l) => (<div key={l.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginTop: 6 }}><span>{l.qty} × {l.name}</span><span>{money(l.price * l.qty)}</span></div>))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, margin: '12px 0', borderTop: `1px solid ${t.line}`, paddingTop: 10 }}><span>Total</span><span>{money(cartTotal)}</span></div>
                <div style={{ display: 'grid', gap: 10 }}>
                  <input style={input} placeholder="Your name" value={buyer.customer} onChange={(e) => setBuyer({ ...buyer, customer: e.target.value })} />
                  <input style={input} placeholder="Phone or email" value={buyer.contact} onChange={(e) => setBuyer({ ...buyer, contact: e.target.value })} />
                  <button style={{ ...btn, opacity: shop.busy ? 0.6 : 1 }} disabled={shop.busy} onClick={checkout}>{shop.busy ? 'Please wait…' : payOnline ? `Pay ${money(cartTotal)} by card` : 'Place order (pay in person)'}</button>
                </div>
              </div>
            )}
            {shop.msg && <div style={{ marginTop: 10, fontSize: 14, color: shop.ok ? '#059669' : '#dc2626' }}>{shop.msg}</div>}
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
            <select style={input} required value={form.service} onChange={(e) => changeService(e.target.value)}>
              <option value="">Choose a service</option>
              {data.services.map((s, i) => (<option key={i} value={s.name}>{s.name} ({gbp(s.price)})</option>))}
            </select>

            {selected?.negotiable && (
              <div style={{ border: `1px dashed ${a}`, borderRadius: t.radius, padding: 12 }}>
                {locked ? (
                  <div style={{ fontWeight: 600, color: '#059669' }}>Price locked: {money(locked.price)} <span style={{ color: t.mute, fontWeight: 400 }}>(listed {money(selected.price)})</span></div>
                ) : !neg.open ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14 }}>This price is negotiable. Want to haggle?</span>
                    <button type="button" style={ghost} onClick={() => { setNeg((n) => ({ ...n, open: true })); setChat([{ who: 'ai', text: `Hi! ${selected.name} is listed at ${money(selected.price)}. What price did you have in mind?` }]); }}>Negotiate price</button>
                  </div>
                ) : (
                  <div>
                    <div style={{ maxHeight: 220, overflowY: 'auto', display: 'grid', gap: 8, marginBottom: 10 }}>
                      {chat.map((m, i) => (
                        <div key={i} style={{ justifySelf: m.who === 'me' ? 'end' : 'start', maxWidth: '85%' }}>
                          <div style={{ background: m.who === 'me' ? a : t.bg, color: m.who === 'me' ? '#fff' : t.fg, border: m.who === 'me' ? 0 : `1px solid ${t.line}`, borderRadius: 12, padding: '8px 12px', fontSize: 14 }}>{m.text}</div>
                          {m.counter != null && i === chat.length - 1 && !neg.busy && <button type="button" style={{ ...ghost, marginTop: 6, padding: '6px 12px' }} onClick={() => sendOffer(m.counter)}>Accept {money(m.counter)}</button>}
                        </div>
                      ))}
                      {neg.busy && <div style={{ fontSize: 13, color: t.mute }}>Typing…</div>}
                      <div ref={chatEnd} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input style={input} type="number" min="1" step="0.01" placeholder="Your offer £" value={offer} onChange={(e) => setOffer(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendOffer(); } }} />
                      <button type="button" style={{ ...btn, padding: '10px 16px' }} disabled={neg.busy} onClick={() => sendOffer()}>Offer</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
              <input style={input} type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              <input style={input} type="time" required value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </div>
            <button style={{ ...btn, opacity: state.busy ? 0.6 : 1 }} disabled={state.busy}>{state.busy ? 'Sending…' : locked ? `Request booking at ${money(locked.price)}` : 'Request booking'}</button>
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
      <footer style={{ textAlign: 'center', padding: '24px 0 36px', color: t.mute, fontSize: 12 }}>
        © {data.businessName} · <a href={`/clock/${slug}`} style={{ color: 'inherit' }}>Staff</a>
      </footer>
    </div>
  );
}
