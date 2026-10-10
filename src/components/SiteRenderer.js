'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatMoney, withTax } from '@/lib/siteDefaults';
import { tr } from '@/lib/i18n';
import CookieBanner from '@/components/CookieBanner';

const T = {
  classic: { bg: '#ffffff', alt: '#f6f8fb', fg: '#111827', mute: '#6b7280', card: '#ffffff', line: '#e5e7eb', font: 'system-ui, -apple-system, "Segoe UI", sans-serif', head: 'system-ui, -apple-system, "Segoe UI", sans-serif', hw: 800, radius: 16, upper: false, nav: 'rgba(255,255,255,.88)', navFg: '#111827', foot: '#0f172a', footFg: '#cbd5e1' },
  bold: { bg: '#ffffff', alt: '#f1f1f1', fg: '#0b0b0b', mute: '#444', card: '#ffffff', line: '#0b0b0b', font: 'system-ui, -apple-system, "Segoe UI", sans-serif', head: 'system-ui, -apple-system, "Segoe UI", sans-serif', hw: 900, radius: 4, upper: true, nav: 'rgba(255,255,255,.92)', navFg: '#0b0b0b', foot: '#0b0b0b', footFg: '#d4d4d4' },
  minimal: { bg: '#fcfcfb', alt: '#f4f4f2', fg: '#222', mute: '#888', card: '#ffffff', line: '#ececec', font: 'system-ui, -apple-system, "Segoe UI", sans-serif', head: 'system-ui, -apple-system, "Segoe UI", sans-serif', hw: 300, radius: 2, upper: false, nav: 'rgba(252,252,251,.9)', navFg: '#222', foot: '#222', footFg: '#bbb' },
  elegant: { bg: '#faf7f2', alt: '#f3ece1', fg: '#2a2118', mute: '#7a6a58', card: '#ffffff', line: '#e6dccb', font: 'Georgia, serif', head: 'Georgia, "Times New Roman", serif', hw: 400, radius: 6, upper: false, nav: 'rgba(250,247,242,.92)', navFg: '#2a2118', foot: '#2a2118', footFg: '#d9cdb9' },
  dark: { bg: '#0b0d12', alt: '#10131a', fg: '#f3f4f6', mute: '#9ca3af', card: '#151922', line: '#252b38', font: 'system-ui, -apple-system, "Segoe UI", sans-serif', head: 'system-ui, -apple-system, "Segoe UI", sans-serif', hw: 800, radius: 16, upper: false, nav: 'rgba(11,13,18,.82)', navFg: '#f3f4f6', foot: '#07080c', footFg: '#9ca3af' },
};


function useCountUp(target, run) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (!target) { setV(0); return; }
    let raf, start;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / 1200);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, run]);
  return v;
}

export default function SiteRenderer({ slug, template = 'classic', data, preview = false, payOnline = false, bookingCount = 0 }) {
  const t = T[template] || T.classic;
  const a = data.accent || '#2563eb';
  const root = useRef(null);
  const lang = data.language || 'en';
  const cur = data.currency || 'GBP';
  const L = (key, vars) => tr(lang, key, vars);
  const money = (n) => formatMoney(Math.round((Number(n) || 0) * 100) / 100, cur, lang);
  const gbp = (n) => (Number(n) ? money(n) : L('free'));
  const taxRate = Number(data.taxRate) || 0;

  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [ready, setReady] = useState(false);

  const [form, setForm] = useState({ customer: '', contact: '', service: '', date: '', time: '' });
  const [state, setState] = useState({ busy: false, msg: '', ok: false });
  const [chat, setChat] = useState([]);
  const [offer, setOffer] = useState('');
  const [neg, setNeg] = useState({ state: null, busy: false, lock: null, open: false });
  const chatEnd = useRef(null);
  const [cart, setCart] = useState({});
  const [buyer, setBuyer] = useState({ customer: '', contact: '' });
  const [shop, setShop] = useState({ busy: false, msg: '', ok: false });
  const [paidBanner, setPaidBanner] = useState(false);

  const count = useCountUp(bookingCount, ready);

  useEffect(() => {
    setReady(true);
    if (new URLSearchParams(window.location.search).get('paid') === '1') setPaidBanner(true);
  }, []);

  // scroll-reveal animations (content stays visible if JS is unavailable)
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    el.classList.add('sr-js');
    const items = el.querySelectorAll('.sr-reveal');
    if (!('IntersectionObserver' in window)) { items.forEach((n) => n.classList.add('sr-in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('sr-in'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    items.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [data.services.length, data.products.length, data.gallery.length, cart && Object.keys(cart).length]);

  // navbar shadow once the page is scrolled (window on the live page, the panel in the dashboard preview)
  useEffect(() => {
    const el = root.current;
    const scroller = preview ? el?.parentElement : window;
    if (!scroller) return;
    const on = () => setScrolled((preview ? scroller.scrollTop : window.scrollY) > 24);
    scroller.addEventListener('scroll', on, { passive: true });
    return () => scroller.removeEventListener('scroll', on);
  }, [preview]);

  useEffect(() => {
    if (preview || !slug) return;
    try {
      if (sessionStorage.getItem('gnis_v_' + slug)) return;
      sessionStorage.setItem('gnis_v_' + slug, '1');
    } catch {}
    fetch('/api/site/view', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug }), keepalive: true }).catch(() => {});
  }, [slug, preview]);

  useEffect(() => { chatEnd.current?.scrollIntoView({ block: 'nearest' }); }, [chat]);
  useEffect(() => { const k = (e) => e.key === 'Escape' && setLightbox(null); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);

  const go = (id) => {
    setMenu(false);
    root.current?.querySelector(`[data-sec="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const selected = data.services.find((s) => s.name === form.service);
  const locked = neg.lock && neg.lock.service === form.service ? neg.lock : null;
  const cartLines = useMemo(() => data.products.filter((p) => cart[p.name]).map((p) => ({ ...p, qty: cart[p.name] })), [cart, data.products]);
  const cartNet = cartLines.reduce((s, l) => s + (Number(l.price) || 0) * l.qty, 0);
  const cartTotal = Math.round(cartLines.reduce((s, l) => s + withTax(l.price, data) * l.qty, 0) * 100) / 100;
  const cartTax = taxRate ? (data.taxIncluded !== false ? cartTotal - cartTotal / (1 + taxRate / 100) : cartTotal - cartNet) : 0;
  const cartCount = cartLines.reduce((s, l) => s + l.qty, 0);

  const changeService = (name) => {
    setForm((f) => ({ ...f, service: name }));
    setChat([]); setOffer(''); setNeg({ state: null, busy: false, lock: null, open: false });
  };

  const sendOffer = async (value) => {
    const amount = Number(value ?? offer);
    if (!(amount > 0)) return;
    if (preview) { setChat((c) => [...c, { who: 'me', text: money(amount) }, { who: 'ai', text: 'Preview only. Negotiation works on your live site.' }]); setOffer(''); return; }
    setChat((c) => [...c, { who: 'me', text: L('offerMsg', { amt: money(amount) }) }]);
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
        setState({ busy: false, ok: true, msg: L('sentOk', { amt: money(j.price) }) });
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
      if (j.ok) { setCart({}); setShop({ busy: false, ok: true, msg: L('orderOk') }); return; }
      setShop({ busy: false, ok: false, msg: j.error || 'Checkout failed' });
    } catch { setShop({ busy: false, ok: false, msg: 'Network error. Try again.' }); }
  };

  const hasGallery = data.gallery.length > 0;
  const hasProducts = data.products.length > 0;
  const heroH = preview ? 560 : '100svh';
  const links = [['home', L('home')], ...(hasGallery ? [['gallery', L('gallery')]] : []), ['services', L('services')], ...(hasProducts ? [['shop', L('shop')]] : []), ['about', L('about')], ['contact', L('contact')]];
  const words = [...data.services.map((s) => s.name), ...data.products.map((p) => p.name)].filter(Boolean);
  const ticker = words.length ? [...words, ...words, ...words, ...words] : [];
  const marqueeImgs = data.gallery.length >= 3 ? [...data.gallery, ...data.gallery] : data.gallery;

  const heroBg = data.hero ? {} : template === 'dark' ? { background: `radial-gradient(1200px 600px at 20% 10%, ${a}55, transparent 60%), #0b0d12` } : template === 'minimal' || template === 'elegant' ? { background: `linear-gradient(135deg, ${a}22, ${t.alt})` } : { background: `linear-gradient(135deg, ${a}, ${a}bb)` };
  const heroText = data.hero || template === 'dark' || template === 'classic' && false ? '#fff' : (template === 'minimal' || template === 'elegant') ? t.fg : '#fff';

  const css = `
.sr-root *{box-sizing:border-box}
.sr-root{--a:${a};overflow-x:hidden;-webkit-text-size-adjust:100%}
.sr-wrap{width:100%;max-width:1280px;margin:0 auto;padding:0 clamp(16px,4vw,48px)}
.sr-sec{padding:clamp(56px,9vw,112px) 0}
.sr-h2{font-weight:${t.hw};font-size:clamp(26px,4vw,42px);line-height:1.1;margin:0 0 8px;letter-spacing:-.02em;${t.upper ? 'text-transform:uppercase;' : ''}}
.sr-sub{color:${t.mute};margin:0 0 clamp(24px,4vw,44px);max-width:620px}
.sr-nav{position:sticky;top:0;z-index:30;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);transition:box-shadow .3s,background .3s}
.sr-nav-in{display:flex;align-items:center;justify-content:space-between;gap:16px;height:64px}
.sr-links{display:flex;align-items:center;gap:6px}
.sr-link{background:none;border:0;cursor:pointer;font:inherit;font-size:15px;font-weight:600;padding:8px 12px;border-radius:999px;color:inherit;opacity:.85;transition:background .2s,opacity .2s}
.sr-link:hover{opacity:1;background:${a}1a}
.sr-cartbtn{position:relative}
.sr-badge{position:absolute;top:-2px;right:-2px;min-width:18px;height:18px;border-radius:9px;background:${a};color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 4px}
.sr-burger{display:none;background:none;border:0;cursor:pointer;color:inherit;padding:8px}
.sr-btn{background:${a};color:#fff;border:0;padding:14px 26px;border-radius:${Math.max(t.radius, 8)}px;font:inherit;font-size:16px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block;transition:transform .2s,box-shadow .2s,opacity .2s}
.sr-btn:hover{transform:translateY(-2px);box-shadow:0 10px 24px ${a}55}
.sr-btn:disabled{opacity:.6;transform:none;box-shadow:none;cursor:default}
.sr-ghost{background:transparent;color:${a};border:1.5px solid ${a};padding:8px 16px;border-radius:${Math.max(t.radius, 8)}px;font:inherit;font-size:14px;font-weight:700;cursor:pointer;transition:background .2s}
.sr-ghost:hover{background:${a}14}
.sr-hero{position:relative;display:flex;align-items:flex-end;overflow:hidden}
.sr-hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;animation:sr-zoom 18s ease-out both}
.sr-hero-shade{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.62),rgba(0,0,0,.08) 55%,rgba(0,0,0,.18))}
.sr-hero-in{position:relative;width:100%;padding-bottom:clamp(40px,8vh,96px);padding-top:96px}
.sr-hero h1{font-weight:${t.hw};font-size:clamp(38px,8vw,92px);line-height:1.02;letter-spacing:-.03em;margin:0;max-width:16ch;${t.upper ? 'text-transform:uppercase;' : ''}animation:sr-up .9s .1s both}
.sr-hero p{font-size:clamp(16px,2vw,22px);margin:18px 0 28px;max-width:560px;opacity:.92;animation:sr-up .9s .25s both}
.sr-hero-cta{display:flex;gap:12px;flex-wrap:wrap;animation:sr-up .9s .4s both}
.sr-stats{display:flex;gap:clamp(20px,5vw,56px);flex-wrap:wrap;margin-top:clamp(28px,5vh,56px);animation:sr-up .9s .55s both}
.sr-stat b{display:block;font-size:clamp(26px,4vw,40px);font-weight:800;line-height:1}
.sr-stat span{font-size:13px;opacity:.85}
.sr-ticker{overflow:hidden;background:${a};color:#fff;padding:14px 0;white-space:nowrap}
.sr-track{display:inline-flex;width:max-content;animation:sr-scroll 40s linear infinite}
.sr-track span{font-weight:800;font-size:clamp(15px,2vw,20px);letter-spacing:.06em;text-transform:uppercase;padding:0 22px}
.sr-track span:after{content:"✦";margin-left:44px;opacity:.7}
.sr-marq{overflow:hidden;margin:0 calc(-1 * clamp(16px,4vw,48px));-webkit-mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent);mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)}
.sr-mtrack{display:flex;gap:16px;width:max-content;animation:sr-scroll 45s linear infinite}
.sr-marq:hover .sr-mtrack,.sr-ticker:hover .sr-track{animation-play-state:paused}
.sr-mtrack img{height:clamp(200px,32vw,340px);width:auto;border-radius:${t.radius}px;display:block;cursor:zoom-in;transition:transform .35s}
.sr-mtrack img:hover{transform:scale(1.03)}
.sr-grid{display:grid;gap:clamp(12px,2vw,24px);grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr))}
.sr-card{background:${t.card};border:1px solid ${t.line};border-radius:${t.radius}px;padding:clamp(18px,2.4vw,28px);transition:transform .3s,box-shadow .3s}
.sr-card:hover{transform:translateY(-4px);box-shadow:0 18px 40px rgba(0,0,0,.12)}
.sr-prod{padding:0;overflow:hidden}
.sr-prod img{width:100%;height:220px;object-fit:cover;display:block;transition:transform .5s}
.sr-prod:hover img{transform:scale(1.06)}
.sr-input{width:100%;padding:13px 14px;border:1px solid ${t.line};border-radius:${Math.max(t.radius - 4, 6)}px;background:${t.bg};color:${t.fg};font:inherit;font-size:16px}
.sr-input:focus{outline:2px solid ${a};outline-offset:1px}
.sr-reveal{transition:opacity .8s ease,transform .8s ease}
.sr-js .sr-reveal{opacity:0;transform:translateY(28px)}
.sr-js .sr-reveal.sr-in{opacity:1;transform:none}
.sr-d1{transition-delay:.08s}.sr-d2{transition-delay:.16s}.sr-d3{transition-delay:.24s}
.sr-split{display:grid;gap:clamp(28px,5vw,64px);grid-template-columns:1fr 1fr;align-items:start}
.sr-foot{display:grid;gap:32px;grid-template-columns:1.4fr 1fr 1fr 1.2fr}
.sr-foot a,.sr-foot button{color:inherit;opacity:.8;text-decoration:none;background:none;border:0;font:inherit;padding:0;cursor:pointer;display:block;margin:0 0 8px;text-align:left}
.sr-foot a:hover,.sr-foot button:hover{opacity:1}
.sr-lb{position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:80;display:flex;align-items:center;justify-content:center;padding:20px;cursor:zoom-out}
.sr-lb img{max-width:100%;max-height:92vh;border-radius:12px}
@keyframes sr-scroll{to{transform:translateX(-50%)}}
@keyframes sr-up{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
@keyframes sr-zoom{from{transform:scale(1.08)}to{transform:scale(1)}}
@media (max-width:860px){
  .sr-links{display:none}
  .sr-burger{display:block}
  .sr-menu{display:flex;flex-direction:column;padding:8px 16px 16px}
  .sr-menu .sr-link{text-align:left;padding:14px 12px;font-size:17px;border-radius:10px}
  .sr-split{grid-template-columns:1fr}
  .sr-foot{grid-template-columns:1fr 1fr}
  .sr-hero h1{max-width:100%}
}
@media (max-width:520px){.sr-foot{grid-template-columns:1fr}.sr-hero-cta .sr-btn{flex:1 1 100%;text-align:center}}
@media (prefers-reduced-motion:reduce){
  .sr-track,.sr-mtrack,.sr-hero-img,.sr-hero h1,.sr-hero p,.sr-hero-cta,.sr-stats{animation:none!important}
  .sr-js .sr-reveal{opacity:1;transform:none}
}`;

  const input = 'sr-input';
  const burgerIcon = menu ? (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
  ) : (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
  );

  return (
    <div ref={root} className="sr-root" style={{ background: t.bg, color: t.fg, fontFamily: t.font, lineHeight: 1.6, minHeight: '100%' }}>
      <style>{css}</style>

      {paidBanner && <div style={{ background: '#059669', color: '#fff', textAlign: 'center', padding: 12, fontWeight: 600 }}>{L('paidOk')}</div>}

      <nav className="sr-nav" style={{ background: t.nav, color: t.navFg, boxShadow: scrolled ? '0 4px 24px rgba(0,0,0,.12)' : 'none', borderBottom: `1px solid ${scrolled ? t.line : 'transparent'}` }}>
        <div className="sr-wrap">
          <div className="sr-nav-in">
            <button className="sr-link" style={{ fontWeight: 800, fontSize: 18, padding: '8px 0', opacity: 1, fontFamily: t.head }} onClick={() => go('home')}>{data.businessName}</button>
            <div className="sr-links">
              {links.map(([id, label]) => (<button key={id} className="sr-link" onClick={() => go(id)}>{label}</button>))}
              <button className="sr-link sr-cartbtn" onClick={() => go(hasProducts ? 'shop' : 'book')} aria-label={`Cart, ${cartCount} items`}>
                {L('cart')}{cartCount > 0 && <span className="sr-badge">{cartCount}</span>}
              </button>
              <button className="sr-btn" style={{ padding: '10px 20px', fontSize: 15, marginLeft: 6 }} onClick={() => go('book')}>{L('bookNow')}</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="sr-mobile-actions">
              <button className="sr-burger sr-cartbtn" onClick={() => go(hasProducts ? 'shop' : 'book')} aria-label="Cart">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M3 4h2.5l2.2 10.2a1 1 0 0 0 1 .8h8.6a1 1 0 0 0 1-.8L20 8H6.2" /></svg>
                {cartCount > 0 && <span className="sr-badge">{cartCount}</span>}
              </button>
              <button className="sr-burger" onClick={() => setMenu((m) => !m)} aria-label="Menu" aria-expanded={menu}>{burgerIcon}</button>
            </div>
          </div>
          {menu && (
            <div className="sr-menu">
              {links.map(([id, label]) => (<button key={id} className="sr-link" onClick={() => go(id)}>{label}</button>))}
              <button className="sr-btn" style={{ marginTop: 8 }} onClick={() => go('book')}>{L('bookNow')}</button>
            </div>
          )}
        </div>
      </nav>

      <header data-sec="home" className="sr-hero" style={{ minHeight: heroH, color: heroText, ...heroBg }}>
        {data.hero && (<><img className="sr-hero-img" src={data.hero} alt="" /><div className="sr-hero-shade" /></>)}
        <div className="sr-wrap sr-hero-in">
          <h1>{data.businessName}</h1>
          <p>{data.tagline}</p>
          <div className="sr-hero-cta">
            <button className="sr-btn" onClick={() => go('book')}>{L('bookNow')}</button>
            <button className="sr-btn" style={{ background: 'transparent', border: '2px solid currentColor', color: 'inherit' }} onClick={() => go(hasGallery ? 'gallery' : 'services')}>{hasGallery ? L('seeWork') : L('ourServices')}</button>
          </div>
          <div className="sr-stats">
            {bookingCount > 0 && <div className="sr-stat"><b>{count}+</b><span>{L('bookingsMade')}</span></div>}
            {data.services.length > 0 && <div className="sr-stat"><b>{data.services.length}</b><span>{data.services.length === 1 ? L('service') : L('servicesPl')}</span></div>}
            {data.location && <div className="sr-stat"><b style={{ fontSize: 'clamp(16px,2vw,20px)', paddingTop: 6 }}>{data.location}</b><span>{L('findUs')}</span></div>}
          </div>
        </div>
      </header>

      {ticker.length > 0 && (
        <div className="sr-ticker" aria-hidden="true"><div className="sr-track">{ticker.map((w, i) => (<span key={i}>{w}</span>))}</div></div>
      )}

      {hasGallery && (
        <section data-sec="gallery" className="sr-sec" style={{ background: t.bg }}>
          <div className="sr-wrap">
            <h2 className="sr-h2 sr-reveal">{L('ourWork')}</h2>
            <p className="sr-sub sr-reveal sr-d1">{L('ourWorkSub')}</p>
            {data.gallery.length >= 3 ? (
              <div className="sr-marq sr-reveal"><div className="sr-mtrack">{marqueeImgs.map((g, i) => (<img key={i} src={g} alt="" loading="lazy" onClick={() => setLightbox(g)} />))}</div></div>
            ) : (
              <div className="sr-grid">{data.gallery.map((g, i) => (<img key={i} className="sr-reveal" src={g} alt="" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: t.radius, cursor: 'zoom-in' }} onClick={() => setLightbox(g)} />))}</div>
            )}
          </div>
        </section>
      )}

      {data.services.length > 0 && (
        <section data-sec="services" className="sr-sec" style={{ background: hasGallery ? t.alt : t.bg }}>
          <div className="sr-wrap">
            <h2 className="sr-h2 sr-reveal">{L('services')}</h2>
            <p className="sr-sub sr-reveal sr-d1">{L('servicesSub')}</p>
            <div className="sr-grid">
              {data.services.map((s, i) => (
                <div key={i} className={`sr-card sr-reveal sr-d${(i % 3) + 1}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontWeight: 700, fontSize: 18 }}><span>{s.name}</span><span style={{ color: a }}>{gbp(s.price)}</span></div>
                  {s.duration && <div style={{ color: t.mute, fontSize: 13, marginTop: 2 }}>{s.duration}</div>}
                  {s.desc && <p style={{ color: t.mute, fontSize: 15, margin: '10px 0 0' }}>{s.desc}</p>}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 16 }}>
                    {s.negotiable ? <span style={{ fontSize: 12, color: a, fontWeight: 700 }}>{L('priceNegotiable')}</span> : <span />}
                    <button className="sr-ghost" onClick={() => { changeService(s.name); go('book'); }}>{L('bookThis')}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {hasProducts && (
        <section data-sec="shop" className="sr-sec" style={{ background: t.bg }}>
          <div className="sr-wrap">
            <h2 className="sr-h2 sr-reveal">{L('shop')}</h2>
            <p className="sr-sub sr-reveal sr-d1">{L('shopSub')}</p>
            <div className="sr-grid">
              {data.products.map((p, i) => (
                <div key={i} className={`sr-card sr-prod sr-reveal sr-d${(i % 3) + 1}`}>
                  {p.image ? <img src={p.image} alt={p.name} loading="lazy" /> : <div style={{ height: 120, background: `${a}14` }} />}
                  <div style={{ padding: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontWeight: 700, fontSize: 17 }}><span>{p.name}</span><span style={{ color: a }}>{gbp(p.price)}</span></div>
                    {p.desc && <p style={{ color: t.mute, fontSize: 14, margin: '6px 0 14px' }}>{p.desc}</p>}
                    {cart[p.name] ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button className="sr-ghost" onClick={() => setCart((c) => { const n = { ...c }; if (n[p.name] > 1) n[p.name] -= 1; else delete n[p.name]; return n; })}>−</button>
                        <strong>{cart[p.name]}</strong>
                        <button className="sr-ghost" onClick={() => setCart((c) => ({ ...c, [p.name]: Math.min(20, (c[p.name] || 0) + 1) }))}>+</button>
                      </div>
                    ) : (
                      <button className="sr-btn" style={{ padding: '10px 18px', fontSize: 14 }} onClick={() => setCart((c) => ({ ...c, [p.name]: 1 }))}>{L('addToCart')}</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="sr-card sr-reveal" style={{ marginTop: 32, maxWidth: 560 }}>
              <strong style={{ fontSize: 18 }}>{L('yourCart')} {cartCount > 0 && `(${cartCount})`}</strong>
              {cartCount === 0 ? <p style={{ color: t.mute, margin: '8px 0 0' }}>{L('cartEmpty')}</p> : (<>
                {cartLines.map((l) => (<div key={l.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, marginTop: 8 }}><span>{l.qty} × {l.name}</span><span>{money(l.price * l.qty)}</span></div>))}
                {taxRate > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: t.mute, marginTop: 10 }}><span>{data.taxIncluded !== false ? L('inclTax', { rate: taxRate }) : `${L('tax')} (${taxRate}%)`}</span><span>{money(cartTax)}</span></div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, margin: '14px 0', borderTop: `1px solid ${t.line}`, paddingTop: 12 }}><span>{L('total')}</span><span>{money(cartTotal)}</span></div>
                <div style={{ display: 'grid', gap: 10 }}>
                  <input className={input} placeholder={L('yourName')} value={buyer.customer} onChange={(e) => setBuyer({ ...buyer, customer: e.target.value })} />
                  <input className={input} placeholder={L('phoneOrEmail')} value={buyer.contact} onChange={(e) => setBuyer({ ...buyer, contact: e.target.value })} />
                  <button className="sr-btn" disabled={shop.busy} onClick={checkout}>{shop.busy ? L('pleaseWait') : payOnline ? L('payByCard', { amt: money(cartTotal) }) : L('placeOrder')}</button>
                </div>
              </>)}
              {shop.msg && <div style={{ marginTop: 10, fontSize: 14, color: shop.ok ? '#059669' : '#dc2626' }}>{shop.msg}</div>}
            </div>
          </div>
        </section>
      )}

      <section data-sec="about" className="sr-sec" style={{ background: t.alt }}>
        <div className="sr-wrap sr-split">
          <div>
            <h2 className="sr-h2 sr-reveal">{L('aboutUs')}</h2>
            <p className="sr-reveal sr-d1" style={{ color: t.mute, whiteSpace: 'pre-wrap', fontSize: 17, maxWidth: 560 }}>{data.about}</p>
          </div>
          <div className="sr-card sr-reveal sr-d2">
            <strong style={{ fontSize: 18 }}>{L('openingHours')}</strong>
            <p style={{ color: t.mute, margin: '8px 0 0' }}>{data.hours || L('contactHours')}</p>
            {data.location && (<><strong style={{ fontSize: 18, display: 'block', marginTop: 20 }}>{L('findUs')}</strong><p style={{ color: t.mute, margin: '8px 0 0' }}>{data.location}</p></>)}
          </div>
        </div>
      </section>

      <section data-sec="book" className="sr-sec" style={{ background: t.bg }}>
        <div className="sr-wrap sr-split">
          <div>
            <h2 className="sr-h2 sr-reveal">{L('bookAppointment')}</h2>
            <p className="sr-sub sr-reveal sr-d1">{L('bookSub')}</p>
            {bookingCount > 0 && <p className="sr-reveal sr-d2" style={{ color: a, fontWeight: 700 }}>{L('bookingsSoFar', { n: bookingCount })}</p>}
          </div>
          <form onSubmit={submit} className="sr-card sr-reveal sr-d1" style={{ display: 'grid', gap: 12 }}>
            <input className={input} placeholder={L('yourName')} required value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} />
            <input className={input} placeholder={L('phoneOrEmail')} required value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
            <select className={input} required value={form.service} onChange={(e) => changeService(e.target.value)}>
              <option value="">{L('chooseService')}</option>
              {data.services.map((s, i) => (<option key={i} value={s.name}>{s.name} ({gbp(s.price)})</option>))}
            </select>

            {selected?.negotiable && (
              <div style={{ border: `1px dashed ${a}`, borderRadius: Math.max(t.radius - 4, 6), padding: 14 }}>
                {locked ? (
                  <div style={{ fontWeight: 700, color: '#059669' }}>{L('priceLocked', { amt: money(locked.price) })} <span style={{ color: t.mute, fontWeight: 400 }}>({L('listed', { amt: money(selected.price) })})</span></div>
                ) : !neg.open ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14 }}>{L('negotiableQ')}</span>
                    <button type="button" className="sr-ghost" onClick={() => { setNeg((n) => ({ ...n, open: true })); setChat([{ who: 'ai', text: L('negHi', { service: selected.name, price: money(selected.price) }) }]); }}>{L('negotiate')}</button>
                  </div>
                ) : (
                  <div>
                    <div style={{ maxHeight: 240, overflowY: 'auto', display: 'grid', gap: 8, marginBottom: 10 }}>
                      {chat.map((m, i) => (
                        <div key={i} style={{ justifySelf: m.who === 'me' ? 'end' : 'start', maxWidth: '88%' }}>
                          <div style={{ background: m.who === 'me' ? a : t.alt, color: m.who === 'me' ? '#fff' : t.fg, borderRadius: 14, padding: '9px 13px', fontSize: 14 }}>{m.text}</div>
                          {m.counter != null && i === chat.length - 1 && !neg.busy && <button type="button" className="sr-ghost" style={{ marginTop: 6, padding: '6px 12px' }} onClick={() => sendOffer(m.counter)}>{L('accept', { amt: money(m.counter) })}</button>}
                        </div>
                      ))}
                      {neg.busy && <div style={{ fontSize: 13, color: t.mute }}>{L('typing')}</div>}
                      <div ref={chatEnd} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input className={input} type="number" min="1" step="0.01" placeholder={L('yourOffer')} value={offer} onChange={(e) => setOffer(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendOffer(); } }} />
                      <button type="button" className="sr-btn" style={{ padding: '10px 18px' }} disabled={neg.busy} onClick={() => sendOffer()}>{L('offer')}</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
              <input className={input} type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              <input className={input} type="time" required value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </div>
            <button className="sr-btn" disabled={state.busy}>{state.busy ? L('sending') : locked ? L('requestBookingAt', { amt: money(locked.price) }) : L('requestBooking')}</button>
            {state.msg && <div style={{ fontSize: 14, color: state.ok ? '#059669' : '#dc2626' }}>{state.msg}</div>}
          </form>
        </div>
      </section>

      <footer data-sec="contact" style={{ background: t.foot, color: t.footFg, padding: 'clamp(48px,7vw,88px) 0 28px' }}>
        <div className="sr-wrap">
          <div className="sr-foot">
            <div>
              <div style={{ color: '#fff', fontFamily: t.head, fontWeight: 800, fontSize: 22, marginBottom: 12 }}>{data.businessName}</div>
              <p style={{ margin: 0, maxWidth: 320, fontSize: 15 }}>{data.tagline}</p>
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, marginBottom: 12 }}>{L('quickLinks')}</div>
              {links.map(([id, label]) => (<button key={id} onClick={() => go(id)}>{label}</button>))}
              <button onClick={() => go('book')}>{L('bookNow')}</button>
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, marginBottom: 12 }}>{L('openingHours')}</div>
              <p style={{ margin: 0, fontSize: 15 }}>{data.hours || L('contactHours')}</p>
              {bookingCount > 0 && <p style={{ margin: '12px 0 0', fontSize: 14 }}>{bookingCount}+ {L('bookingsMade')}</p>}
              {data.vatNumber && <p style={{ margin: '12px 0 0', fontSize: 13 }}>{L('vatNo')} {data.vatNumber}</p>}
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, marginBottom: 12 }}>{L('contact')}</div>
              {data.phone && <a href={`tel:${data.phone.replace(/\s/g, '')}`}>📞 {data.phone}</a>}
              {data.email && <a href={`mailto:${data.email}`}>✉️ {data.email}</a>}
              {data.location && <a href={`https://www.google.com/maps/search/${encodeURIComponent(data.location)}`} target="_blank" rel="noreferrer">📍 {data.location}</a>}
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,.12)', marginTop: 36, paddingTop: 20, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', fontSize: 13 }}>
            <span>© {new Date().getFullYear()} {data.businessName}. {L('rights')}</span>
            <span style={{ display: 'flex', gap: 14 }}><a href="/privacy" style={{ color: 'inherit', display: 'inline', margin: 0 }}>{L('privacy')}</a><a href="/terms" style={{ color: 'inherit', display: 'inline', margin: 0 }}>{L('terms')}</a><a href={`/clock/${slug}`} style={{ color: 'inherit', display: 'inline', margin: 0 }}>{L('staffLogin')}</a></span>
          </div>
        </div>
      </footer>

      {!preview && <CookieBanner lang={lang} accent={a} />}

      {lightbox && (<div className="sr-lb" onClick={() => setLightbox(null)}><img src={lightbox} alt="" /></div>)}
    </div>
  );
}
