'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { logout } from '@/app/auth/action';
import SiteRenderer from '@/components/SiteRenderer';
import { TEMPLATE_LIST, ACCENTS, DEFAULT_DATA, BOOKING_STATUSES, ORDER_STATUSES, mergeData } from '@/lib/siteDefaults';

const TABS = [
  { id: 'design', l: 'Design' },
  { id: 'services', l: 'Services' },
  { id: 'products', l: 'Products' },
  { id: 'gallery', l: 'Gallery' },
  { id: 'bookings', l: 'Bookings' },
  { id: 'orders', l: 'Orders' },
  { id: 'staff', l: 'Staff' },
  { id: 'payments', l: 'Payments' },
];

const STATUS_COLOR = { pending: '#d97706', approved: '#2563eb', completed: '#059669', paid: '#059669', fulfilled: '#2563eb', cancelled: '#dc2626' };

function compress(file, max = 900, q = 0.7) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = reject;
    r.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', q));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
}

const getJson = async (url) => { try { const r = await fetch(url); return await r.json(); } catch { return { ok: false }; } };
const sendJson = async (url, method, body) => {
  try { const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return await r.json(); } catch { return { ok: false, error: 'Network error' }; }
};

export default function Dashboard() {
  const [tab, setTab] = useState('design');
  const [template, setTemplate] = useState('classic');
  const [data, setData] = useState(mergeData(DEFAULT_DATA));
  const [slug, setSlug] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [staff, setStaff] = useState({ staff: [], shifts: [] });
  const [newStaff, setNewStaff] = useState('');
  const [stripe, setStripe] = useState({ connected: false, ready: false, configured: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const fileRef = useRef(null);
  const target = useRef(null);

  const loadStaff = async () => { const j = await getJson('/api/site/staff'); if (j.ok) setStaff({ staff: j.staff, shifts: j.shifts }); };
  const loadStripe = async () => { const j = await getJson('/api/site/stripe'); if (j.ok) setStripe({ connected: j.connected, ready: j.ready, configured: j.configured }); };

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/site');
        if (r.status === 401) { window.location.href = '/'; return; }
        const j = await r.json();
        if (j.data) { setTemplate(j.data.template || 'classic'); setData(mergeData(j.data.data)); setSlug(j.data.slug); }
        const [b, o] = await Promise.all([getJson('/api/site/bookings'), getJson('/api/site/orders')]);
        if (b.ok) setBookings(b.data || []);
        if (o.ok) setOrders(o.data || []);
        if (j.data) { loadStaff(); loadStripe(); }
        if (new URLSearchParams(window.location.search).get('stripe') === 'done') setTab('payments');
      } catch {}
      setLoading(false);
    })();
  }, []);

  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));
  const setItem = (k, i, patch) => setData((d) => ({ ...d, [k]: d[k].map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
  const addItem = (k, item) => setData((d) => ({ ...d, [k]: [...d[k], item] }));
  const delItem = (k, i) => setData((d) => ({ ...d, [k]: d[k].filter((_, j) => j !== i) }));

  const sizeKB = useMemo(() => Math.round(JSON.stringify(data).length / 1024), [data]);
  const tooBig = sizeKB > 3800;

  const pick = (kind, idx) => { target.current = { kind, idx }; fileRef.current?.click(); };
  const onFile = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const { kind, idx } = target.current || {};
    try {
      if (kind === 'gallery') {
        const imgs = [];
        for (const f of files.slice(0, 12 - data.gallery.length)) imgs.push(await compress(f, 900));
        setData((d) => ({ ...d, gallery: [...d.gallery, ...imgs].slice(0, 12) }));
      } else if (kind === 'hero') set('hero', await compress(files[0], 1400, 0.7));
      else if (kind === 'product') setItem('products', idx, { image: await compress(files[0], 700) });
    } catch { setMsg('Could not read that image'); }
  };

  const save = async () => {
    setSaving(true); setMsg('');
    const j = await sendJson('/api/site', 'PUT', { template, data });
    if (j.ok) { const first = !slug; setSlug(j.slug); setMsg('Saved ✓'); if (first) { loadStaff(); loadStripe(); } } else setMsg(j.error || 'Save failed');
    setSaving(false);
  };

  const setBookingStatus = async (id, status) => {
    setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, status } : b)));
    await sendJson('/api/site/bookings', 'PUT', { id, status });
  };
  const setOrderStatus = async (id, status) => {
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, status } : o)));
    await sendJson('/api/site/orders', 'PUT', { id, status });
  };

  const addStaff = async () => {
    const j = await sendJson('/api/site/staff', 'POST', { name: newStaff });
    if (j.ok) { setNewStaff(''); loadStaff(); } else setMsg(j.error || 'Could not add staff');
  };
  const newCode = async (id) => { await sendJson('/api/site/staff', 'PATCH', { id }); loadStaff(); };
  const removeStaff = async (id) => { if (confirm('Remove this staff member?')) { await sendJson('/api/site/staff', 'DELETE', { id }); loadStaff(); } };

  const connectStripe = async () => {
    const j = await sendJson('/api/site/stripe', 'POST', {});
    if (j.ok && j.url) window.location.href = j.url; else setMsg(j.error || 'Could not start Stripe setup');
  };

  const liveUrl = slug && typeof window !== 'undefined' ? `${window.location.origin}/site/${slug}` : '';
  const clockUrl = slug && typeof window !== 'undefined' ? `${window.location.origin}/clock/${slug}` : '';
  const copy = async (text) => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} };

  const box = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 14 };
  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 15, boxSizing: 'border-box', marginBottom: 8 };
  const btn = (bg = '#111827') => ({ background: bg, color: '#fff', border: 0, padding: '10px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 });
  const sm = (bg) => ({ ...btn(bg), padding: '6px 10px', fontSize: 12 });
  const lbl = { fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', margin: '4px 0' };
  const pill = (s) => ({ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#fff', background: STATUS_COLOR[s] || '#6b7280', padding: '2px 8px', borderRadius: 999 });

  if (loading) return <div style={{ padding: 40, fontFamily: 'system-ui' }}>Loading…</div>;

  const needSave = (
    <div style={box}>Save your site first (press <strong>Save</strong> at the top). Then this section will work.</div>
  );

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#f3f4f6', minHeight: '100vh' }}>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onFile} />
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 5 }}>
        <strong>My site</strong>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: tooBig ? '#dc2626' : '#6b7280' }}>{sizeKB} KB / 3800</span>
          {msg && <span style={{ fontSize: 13 }}>{msg}</span>}
          {slug && <a href={`/site/${slug}`} target="_blank" rel="noreferrer" style={{ fontSize: 14, color: '#2563eb' }}>View live site ↗</a>}
          <button style={btn('#2563eb')} onClick={save} disabled={saving || tooBig}>{saving ? 'Saving…' : 'Save'}</button>
          <form action={logout}><button style={btn('#6b7280')}>Log out</button></form>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, padding: 16, maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ flex: '1 1 440px', minWidth: 0 }}>
          {slug && (
            <div style={{ ...box, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: '#6b7280' }}>Your link:</span>
              <code style={{ fontSize: 13, wordBreak: 'break-all', flex: '1 1 200px' }}>{liveUrl}</code>
              <button style={sm('#374151')} onClick={() => copy(liveUrl)}>{copied ? 'Copied ✓' : 'Copy'}</button>
              <a style={{ ...sm('#25d366'), textDecoration: 'none' }} target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`Book with ${data.businessName}: ${liveUrl}`)}`}>WhatsApp</a>
            </div>
          )}

          <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto' }}>
            {TABS.map((x) => (
              <button key={x.id} onClick={() => setTab(x.id)} style={{ ...btn(tab === x.id ? '#111827' : '#fff'), color: tab === x.id ? '#fff' : '#111827', border: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>
                {x.l}{x.id === 'bookings' && bookings.filter((b) => b.status === 'pending').length ? ` (${bookings.filter((b) => b.status === 'pending').length})` : ''}{x.id === 'orders' && orders.filter((o) => o.status === 'pending' || o.status === 'paid').length ? ` (${orders.filter((o) => o.status === 'pending' || o.status === 'paid').length})` : ''}
              </button>
            ))}
          </div>

          {tab === 'design' && (<>
            <div style={box}>
              <strong>Template</strong>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 8, marginTop: 10 }}>
                {TEMPLATE_LIST.map((t) => (
                  <button key={t.id} onClick={() => setTemplate(t.id)} style={{ textAlign: 'left', padding: 10, borderRadius: 10, cursor: 'pointer', border: template === t.id ? '2px solid #2563eb' : '1px solid #d1d5db', background: template === t.id ? '#eff6ff' : '#fff' }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{t.blurb}</div>
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 14 }}><span style={lbl}>Accent colour</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {ACCENTS.map((c) => (<button key={c} onClick={() => set('accent', c)} aria-label={c} style={{ width: 30, height: 30, borderRadius: '50%', background: c, cursor: 'pointer', border: data.accent === c ? '3px solid #111827' : '2px solid #fff', boxShadow: '0 0 0 1px #d1d5db' }} />))}
                </div>
              </div>
            </div>
            <div style={box}>
              <span style={lbl}>Business name</span><input style={inp} value={data.businessName} onChange={(e) => set('businessName', e.target.value)} />
              <span style={lbl}>Tagline</span><input style={inp} value={data.tagline} onChange={(e) => set('tagline', e.target.value)} />
              <span style={lbl}>About</span><textarea style={{ ...inp, minHeight: 90 }} value={data.about} onChange={(e) => set('about', e.target.value)} />
              <span style={lbl}>Phone</span><input style={inp} value={data.phone} onChange={(e) => set('phone', e.target.value)} />
              <span style={lbl}>Email</span><input style={inp} value={data.email} onChange={(e) => set('email', e.target.value)} />
              <span style={lbl}>Location</span><input style={inp} value={data.location} onChange={(e) => set('location', e.target.value)} />
              <span style={lbl}>Opening hours</span><input style={inp} value={data.hours} onChange={(e) => set('hours', e.target.value)} />
              <span style={lbl}>Header image</span>
              <button style={btn('#374151')} onClick={() => pick('hero')}>{data.hero ? 'Change image' : 'Upload image'}</button>
              {data.hero && <button style={{ ...btn('#dc2626'), marginLeft: 8 }} onClick={() => set('hero', '')}>Remove</button>}
            </div>
          </>)}

          {tab === 'services' && (<>
            {data.services.map((s, i) => (
              <div key={i} style={box}>
                <input style={inp} placeholder="Service name" value={s.name} onChange={(e) => setItem('services', i, { name: e.target.value })} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={inp} type="number" min="0" placeholder="Price £" value={s.price} onChange={(e) => setItem('services', i, { price: e.target.value })} />
                  <input style={inp} placeholder="Duration" value={s.duration} onChange={(e) => setItem('services', i, { duration: e.target.value })} />
                </div>
                <input style={inp} placeholder="Short description" value={s.desc} onChange={(e) => setItem('services', i, { desc: e.target.value })} />
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, marginBottom: 8 }}>
                  <input type="checkbox" checked={!!s.negotiable} onChange={(e) => setItem('services', i, { negotiable: e.target.checked })} />
                  Let customers negotiate this price with the AI assistant
                </label>
                {s.negotiable && (
                  <div>
                    <span style={lbl}>Lowest price you would accept (£), kept private</span>
                    <input style={inp} type="number" min="0" value={s.minPrice || ''} onChange={(e) => setItem('services', i, { minPrice: e.target.value })} />
                    {!(Number(s.minPrice) > 0 && Number(s.minPrice) < Number(s.price)) && <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 8 }}>The lowest price must be above £0 and below the listed price, otherwise negotiation stays off.</div>}
                  </div>
                )}
                <button style={btn('#dc2626')} onClick={() => delItem('services', i)}>Delete</button>
              </div>
            ))}
            <button style={btn()} onClick={() => addItem('services', { name: '', price: 0, duration: '', desc: '', negotiable: false, minPrice: 0 })}>+ Add service</button>
            <p style={{ fontSize: 12, color: '#6b7280' }}>The AI starts near your listed price and steps down. It never goes below your lowest price, and a locked price is signed by the server so it cannot be changed by the customer.</p>
          </>)}

          {tab === 'products' && (<>
            {data.products.map((p, i) => (
              <div key={i} style={box}>
                <input style={inp} placeholder="Product name" value={p.name} onChange={(e) => setItem('products', i, { name: e.target.value })} />
                <input style={inp} type="number" min="0" placeholder="Price £" value={p.price} onChange={(e) => setItem('products', i, { price: e.target.value })} />
                <input style={inp} placeholder="Short description" value={p.desc} onChange={(e) => setItem('products', i, { desc: e.target.value })} />
                {p.image && <img src={p.image} alt="" style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 8, display: 'block', marginBottom: 8 }} />}
                <button style={btn('#374151')} onClick={() => pick('product', i)}>{p.image ? 'Change photo' : 'Add photo'}</button>
                <button style={{ ...btn('#dc2626'), marginLeft: 8 }} onClick={() => delItem('products', i)}>Delete</button>
              </div>
            ))}
            <button style={btn()} onClick={() => addItem('products', { name: '', price: 0, desc: '', image: '' })}>+ Add product</button>
            <p style={{ fontSize: 12, color: '#6b7280' }}>Customers can add products to a cart and check out. Connect payouts in the Payments tab to take card payments.</p>
          </>)}

          {tab === 'gallery' && (<div style={box}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(100px,1fr))', gap: 8, marginBottom: 12 }}>
              {data.gallery.map((g, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={g} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8 }} />
                  <button onClick={() => delItem('gallery', i)} style={{ position: 'absolute', top: 4, right: 4, ...btn('#dc2626'), padding: '2px 8px' }}>×</button>
                </div>
              ))}
            </div>
            <button style={btn()} onClick={() => pick('gallery')} disabled={data.gallery.length >= 12}>+ Add photos ({data.gallery.length}/12)</button>
            <p style={{ fontSize: 12, color: '#6b7280' }}>Photos are compressed automatically.</p>
          </div>)}

          {tab === 'bookings' && (<>
            <div style={{ ...box, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 14 }}>{bookings.length} bookings · {new Set(bookings.map((b) => String(b.contact).toLowerCase())).size} customers</span>
              <a href="/api/site/export?type=bookings" style={{ ...btn('#059669'), textDecoration: 'none' }}>Download Excel</a>
            </div>
            {bookings.length === 0 && <div style={box}>No bookings yet. Share your live site link to get started.</div>}
            {bookings.map((b) => (
              <div key={b.id} style={box}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                  <span>{b.customer}</span>
                  <span>£{Number(b.price) || 0}{b.source === 'negotiated' && b.list_price && Number(b.list_price) !== Number(b.price) ? <span style={{ color: '#6b7280', fontWeight: 400, textDecoration: 'line-through', marginLeft: 6 }}>£{Number(b.list_price)}</span> : null}</span>
                </div>
                <div style={{ fontSize: 14, color: '#374151' }}>{b.service} · {b.date} {b.time}</div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>{b.contact}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Booked {b.created} · {b.source === 'negotiated' ? 'negotiated price' : 'website'}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={pill(b.status)}>{b.status}</span>
                  {BOOKING_STATUSES.filter((s) => s !== b.status).map((s) => (<button key={s} style={sm(STATUS_COLOR[s])} onClick={() => setBookingStatus(b.id, s)}>{s}</button>))}
                </div>
              </div>
            ))}
          </>)}

          {tab === 'orders' && (<>
            <div style={{ ...box, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 14 }}>{orders.length} orders</span>
              <a href="/api/site/export?type=orders" style={{ ...btn('#059669'), textDecoration: 'none' }}>Download Excel</a>
            </div>
            {orders.length === 0 && <div style={box}>No orders yet.</div>}
            {orders.map((o) => (
              <div key={o.id} style={box}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}><span>#{o.id} · {o.customer}</span><span>£{Number(o.total).toFixed(2)}</span></div>
                <div style={{ fontSize: 14, color: '#374151' }}>{(o.items || []).map((i) => `${i.qty} × ${i.name}`).join(', ')}</div>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>{o.contact} · {o.created}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={pill(o.status)}>{o.status}</span>
                  {ORDER_STATUSES.filter((s) => s !== o.status).map((s) => (<button key={s} style={sm(STATUS_COLOR[s])} onClick={() => setOrderStatus(o.id, s)}>{s}</button>))}
                </div>
              </div>
            ))}
          </>)}

          {tab === 'staff' && (!slug ? needSave : <>
            <div style={box}>
              <strong>Staff clock in / out</strong>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '6px 0 10px' }}>Each person gets a private 6-digit code. They open the clock page, enter it and tap Clock in or Clock out.</p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
                <code style={{ fontSize: 13, wordBreak: 'break-all', flex: '1 1 200px' }}>{clockUrl}</code>
                <button style={sm('#374151')} onClick={() => copy(clockUrl)}>Copy clock page link</button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ ...inp, marginBottom: 0 }} placeholder="Staff name" value={newStaff} onChange={(e) => setNewStaff(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addStaff(); }} />
                <button style={btn()} onClick={addStaff}>Add</button>
              </div>
            </div>
            {staff.staff.map((s) => (
              <div key={s.id} style={box}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                  <span>{s.name}</span>
                  <span style={{ fontFamily: 'monospace', letterSpacing: 2 }}>{s.code}</span>
                </div>
                <div style={{ fontSize: 13, color: s.working_since ? '#059669' : '#6b7280', margin: '4px 0 8px' }}>{s.working_since ? `Clocked in since ${s.working_since}` : 'Not clocked in'} · {Number(s.hours_7d).toFixed(1)} h in last 7 days</div>
                <button style={sm('#374151')} onClick={() => newCode(s.id)}>New code</button>
                <button style={{ ...sm('#dc2626'), marginLeft: 6 }} onClick={() => removeStaff(s.id)}>Remove</button>
              </div>
            ))}
            {staff.shifts.length > 0 && (
              <div style={box}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <strong>Recent shifts</strong>
                  <a href="/api/site/export?type=timesheet" style={{ ...sm('#059669'), textDecoration: 'none' }}>Download timesheet</a>
                </div>
                {staff.shifts.map((h) => (<div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderTop: '1px solid #f3f4f6' }}><span>{h.name} · {h.clock_in}{h.clock_out ? ` → ${h.clock_out.slice(11)}` : ' → now'}</span><span>{Number(h.hours).toFixed(2)} h</span></div>))}
              </div>
            )}
          </>)}

          {tab === 'payments' && (!slug ? needSave : <div style={box}>
            <strong>Get paid by card</strong>
            <p style={{ fontSize: 14, color: '#374151' }}>Connect your bank account through Stripe, our payment partner. You enter your sort code and account number on Stripe's own secure page, so we never see or store them. Customer card payments for your products then go straight to your bank.</p>
            {!stripe.configured && <p style={{ fontSize: 13, color: '#dc2626' }}>Card payments are not switched on for the platform yet.</p>}
            {stripe.ready ? (
              <div style={{ color: '#059669', fontWeight: 600 }}>Payouts connected ✓ Card payments are live on your shop.</div>
            ) : (<>
              {stripe.connected && <p style={{ fontSize: 13, color: '#d97706' }}>Setup started but not finished. Continue to finish verification.</p>}
              <button style={btn('#2563eb')} onClick={connectStripe} disabled={!stripe.configured}>{stripe.connected ? 'Continue Stripe setup' : 'Connect payouts with Stripe'}</button>
              <button style={{ ...btn('#6b7280'), marginLeft: 8 }} onClick={loadStripe}>Refresh status</button>
            </>)}
            <p style={{ fontSize: 12, color: '#6b7280', marginTop: 14 }}>Until payouts are connected, customers can still place orders and pay you in person.</p>
          </div>)}
        </div>

        <div style={{ flex: '1 1 420px', minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>LIVE PREVIEW</div>
          <div style={{ border: '1px solid #d1d5db', borderRadius: 12, overflow: 'hidden', maxHeight: '80vh', overflowY: 'auto', background: '#fff' }}>
            <SiteRenderer slug={slug || ''} template={template} data={data} preview payOnline={stripe.ready} />
          </div>
        </div>
      </div>
    </div>
  );
}
