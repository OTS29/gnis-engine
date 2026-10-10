'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { logout } from '@/app/auth/action';
import SiteRenderer from '@/components/SiteRenderer';
import { TEMPLATE_LIST, ACCENTS, DEFAULT_DATA, mergeData } from '@/lib/siteDefaults';

const TABS = [
  { id: 'design', l: 'Design' },
  { id: 'services', l: 'Services' },
  { id: 'products', l: 'Products' },
  { id: 'gallery', l: 'Gallery' },
  { id: 'bookings', l: 'Bookings' },
];

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

export default function Dashboard() {
  const [tab, setTab] = useState('design');
  const [template, setTemplate] = useState('classic');
  const [data, setData] = useState(mergeData(DEFAULT_DATA));
  const [slug, setSlug] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef(null);
  const target = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/site');
        if (r.status === 401) { window.location.href = '/'; return; }
        const j = await r.json();
        if (j.data) { setTemplate(j.data.template || 'classic'); setData(mergeData(j.data.data)); setSlug(j.data.slug); }
        const b = await fetch('/api/site/bookings');
        const bj = await b.json();
        if (bj.ok) setBookings(bj.data || []);
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
    try {
      const r = await fetch('/api/site', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ template, data }) });
      const j = await r.json();
      if (j.ok) { setSlug(j.slug); setMsg('Saved ✓'); } else setMsg(j.error || 'Save failed');
    } catch { setMsg('Network error'); }
    setSaving(false);
  };

  const setStatus = async (id, status) => {
    setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, status } : b)));
    await fetch('/api/site/bookings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
  };

  const importOld = () => {
    try {
      const keys = Object.keys(localStorage);
      const sKey = keys.find((k) => /service/i.test(k));
      const raw = sKey && JSON.parse(localStorage.getItem(sKey));
      if (Array.isArray(raw) && raw.length) {
        const services = raw.map((s) => ({ name: String(s.name || s.title || ''), price: Number(s.price) || 0, duration: String(s.duration || ''), desc: String(s.desc || s.description || '') })).filter((s) => s.name);
        setData((d) => ({ ...d, services })); setMsg(`Imported ${services.length} services`);
      } else setMsg('Nothing to import');
    } catch { setMsg('Nothing to import'); }
  };

  const base = typeof window !== 'undefined' ? window.location.origin : '';
  const box = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 14 };
  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 15, boxSizing: 'border-box', marginBottom: 8 };
  const btn = (bg = '#111827') => ({ background: bg, color: '#fff', border: 0, padding: '10px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 });
  const lbl = { fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', margin: '4px 0' };

  if (loading) return <div style={{ padding: 40, fontFamily: 'system-ui' }}>Loading…</div>;

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
        <div style={{ flex: '1 1 420px', minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto' }}>
            {TABS.map((x) => (
              <button key={x.id} onClick={() => setTab(x.id)} style={{ ...btn(tab === x.id ? '#111827' : '#fff'), color: tab === x.id ? '#fff' : '#111827', border: '1px solid #e5e7eb' }}>{x.l}{x.id === 'bookings' && bookings.length ? ` (${bookings.length})` : ''}</button>
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
            <button style={btn('#6b7280')} onClick={importOld}>Import old services from this browser</button>
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
                <button style={btn('#dc2626')} onClick={() => delItem('services', i)}>Delete</button>
              </div>
            ))}
            <button style={btn()} onClick={() => addItem('services', { name: '', price: 0, duration: '', desc: '' })}>+ Add service</button>
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
            {bookings.length === 0 && <div style={box}>No bookings yet. Share your live site link to get started.</div>}
            {bookings.map((b) => (
              <div key={b.id} style={box}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}><span>{b.customer}</span><span>£{Number(b.price) || 0}</span></div>
                <div style={{ fontSize: 14, color: '#374151' }}>{b.service} · {String(b.date).slice(0, 10)} {String(b.time).slice(0, 5)}</div>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>{b.contact}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginRight: 6 }}>{b.status}</span>
                  {['confirmed', 'done', 'cancelled'].map((s) => (<button key={s} style={{ ...btn(s === 'cancelled' ? '#dc2626' : '#059669'), padding: '6px 10px', fontSize: 12 }} onClick={() => setStatus(b.id, s)}>{s}</button>))}
                </div>
              </div>
            ))}
          </>)}
        </div>

        <div style={{ flex: '1 1 420px', minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>LIVE PREVIEW</div>
          <div style={{ border: '1px solid #d1d5db', borderRadius: 12, overflow: 'hidden', maxHeight: '80vh', overflowY: 'auto', background: '#fff' }}>
            <SiteRenderer slug={slug || ''} template={template} data={data} preview />
          </div>
        </div>
      </div>
    </div>
  );
}
