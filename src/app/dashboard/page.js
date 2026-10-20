'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { logout } from '@/app/auth/action';
import SiteRenderer from '@/components/SiteRenderer';
import { TEMPLATE_LIST, ACCENTS, DEFAULT_DATA, BOOKING_STATUSES, ORDER_STATUSES, CURRENCIES, STRIPE_CURRENCIES, LANGUAGES, mergeData, formatMoney } from '@/lib/siteDefaults';
import { PROFESSIONS } from '@/lib/professions';
import { COUNTRY_CODES } from '@/lib/countries';

const TABS = [
  { id: 'design', l: 'Design' },
  { id: 'services', l: 'Services' },
  { id: 'products', l: 'Products' },
  { id: 'gallery', l: 'Gallery' },
  { id: 'analytics', l: 'Analytics' },
  { id: 'money', l: 'Money' },
  { id: 'bookings', l: 'Bookings' },
  { id: 'customers', l: 'Customers' },
  { id: 'reviews', l: 'Reviews' },
  { id: 'orders', l: 'Orders' },
  { id: 'giftcards', l: 'Gift cards' },
  { id: 'staff', l: 'Staff' },
  { id: 'growth', l: 'Growth' },
  { id: 'payments', l: 'Payments' },
  { id: 'billing', l: 'Billing' },
];

const STATUS_COLOR = { pending: '#d97706', approved: '#2563eb', completed: '#059669', paid: '#059669', fulfilled: '#2563eb', cancelled: '#dc2626', no_show: '#7f1d1d' };
const RISK_COLOR = { low: '#059669', medium: '#d97706', high: '#dc2626' };

function Bars({ items, color = '#2563eb', fmt = (v) => v }) {
  const max = Math.max(1, ...items.map((i) => i.n));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 110 }}>
      {items.map((i) => (
        <div key={i.label} title={`${i.label}: ${fmt(i.n)}`} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
          <div style={{ width: '100%', background: color, borderRadius: '3px 3px 0 0', height: `${Math.max(2, (i.n / max) * 90)}%`, opacity: i.n ? 1 : 0.2 }} />
          <div style={{ fontSize: 9, color: '#6b7280', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden' }}>{i.label.length > 5 ? i.label.slice(0, 2) : i.label}</div>
        </div>
      ))}
    </div>
  );
}

function Line({ points, color = '#059669' }) {
  const w = 600, h = 120, max = Math.max(1, ...points.map((p) => p.v));
  const pts = points.map((p, i) => `${(i / Math.max(1, points.length - 1)) * w},${h - (p.v / max) * (h - 8) - 4}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="120" preserveAspectRatio="none" role="img" aria-label="Revenue over 30 days">
      <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" points={pts} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

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

async function uploadDataUrl(dataUrl) {
  const blob = await (await fetch(dataUrl)).blob();
  const fd = new FormData();
  fd.append('file', blob, 'photo.jpg');
  const r = await fetch('/api/site/upload', { method: 'POST', body: fd });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'Upload failed');
  return j.url;
}
const isData = (v) => typeof v === 'string' && v.startsWith('data:image/');

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
  const [analytics, setAnalytics] = useState(null);
  const [growth, setGrowth] = useState(null);
  const [qr, setQr] = useState('');
  const [payInfo, setPayInfo] = useState(null);
  const [payForm, setPayForm] = useState({ provider: '', bankCode: '', accountNumber: '', accountName: '', busy: false, msg: '', ok: false });
  const [banks, setBanks] = useState([]);
  const [stripeCountry, setStripeCountry] = useState('GB');
  const [billing, setBilling] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [customers, setCustomers] = useState(null);
  const [custQ, setCustQ] = useState('');
  const [custMsg, setCustMsg] = useState('');
  const [dueDays, setDueDays] = useState(0);
  const [showDue, setShowDue] = useState(true);
  const [cards, setCards] = useState(null);
  const [money, setMoney] = useState(null);
  const [fq, setFq] = useState({ preset: 'month', from: '', to: '', group: 'day', staff: 'all', service: '' });
  const [fin, setFin] = useState(null);
  const [exp, setExp] = useState({ date: '', category: 'Supplies', amount: '', note: '', busy: false, msg: '' });
  const [reviews, setReviews] = useState(null);
  const [staffFilter, setStaffFilter] = useState('all');
  const [imp, setImp] = useState({ text: '', consent: false, busy: false, msg: '', ok: false });
  const [redeem, setRedeem] = useState({ code: '', amount: '', msg: '', ok: false, balance: null, busy: false });
  const [plan, setPlan] = useState('starter');
  const [cycle, setCycle] = useState('monthly');
  const [billMsg, setBillMsg] = useState('');
  const [stripe, setStripe] = useState({ connected: false, ready: false, configured: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [prof, setProf] = useState({ slug: '', country: '', nextChange: null, msg: '', ok: false, busy: false, loaded: false });
  const [bookMsg, setBookMsg] = useState('');
  const [payMethod, setPayMethod] = useState({});
  const [copied, setCopied] = useState(false);
  const fileRef = useRef(null);
  const target = useRef(null);

  const loadStaff = async () => { const j = await getJson('/api/site/staff'); if (j.ok) setStaff({ staff: j.staff, shifts: j.shifts }); };
  const loadAnalytics = async () => { const j = await getJson('/api/site/analytics'); if (j.ok) setAnalytics(j.data || null); };
  const loadGrowth = async () => { const j = await getJson('/api/site/growth'); if (j.ok) setGrowth(j.data || null); };
  const loadPay = async () => { const j = await getJson('/api/site/pay-setup'); if (j.ok) setPayInfo(j); };
  const loadBilling = async (r) => { const j = await getJson('/api/billing' + (r ? `?region=${encodeURIComponent(r)}` : '')); if (j.ok) setBilling(j); };
  const pickRegion = (code) => {
    try { localStorage.setItem('gnis_region', code); } catch {}
    setBilling(null);
    loadBilling(code);
  };
  const chooseProvider = async (provider) => {
    setPayForm({ provider, bankCode: '', accountNumber: '', accountName: '', busy: true, msg: '', ok: false });
    setBanks([]);
    const j = await getJson(`/api/site/pay-setup?provider=${provider}&banks=1`);
    if (j.ok) { setBanks(j.banks || []); setPayForm((f) => ({ ...f, busy: false })); }
    else setPayForm((f) => ({ ...f, busy: false, msg: j.error || 'Could not load banks' }));
  };
  const verifyAccount = async () => {
    setPayForm((f) => ({ ...f, busy: true, msg: '', accountName: '' }));
    const j = await sendJson('/api/site/pay-setup', 'POST', { provider: payForm.provider, bankCode: payForm.bankCode, accountNumber: payForm.accountNumber });
    setPayForm((f) => ({ ...f, busy: false, accountName: j.accountName || '', ok: !!j.accountName, msg: j.accountName ? '' : 'Could not confirm the account name automatically. You can still save if the details are right.' }));
  };
  const savePayout = async () => {
    setPayForm((f) => ({ ...f, busy: true, msg: '' }));
    const j = await sendJson('/api/site/pay-setup', 'PUT', { provider: payForm.provider, bankCode: payForm.bankCode, accountNumber: payForm.accountNumber });
    if (j.ok) { setPayForm({ provider: '', bankCode: '', accountNumber: '', accountName: '', busy: false, msg: '', ok: false }); loadPay(); }
    else setPayForm((f) => ({ ...f, busy: false, ok: false, msg: j.error || 'Could not save' }));
  };
  const turnOffCards = async () => { await sendJson('/api/site/pay-setup', 'DELETE', {}); loadPay(); };
  const startPlan = async (plan) => {
    setBillMsg('Opening payment page…');
    const j = await sendJson('/api/billing', 'POST', { plan, cycle, region: billing?.region });
    if (j.ok && j.url) window.location.href = j.url; else setBillMsg(j.error || 'Could not start payment');
  };
  const loadStripe = async () => { const j = await getJson('/api/site/stripe'); if (j.ok) setStripe({ connected: j.connected, ready: j.ready, configured: j.configured }); };

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/site');
        if (r.status === 401) { window.location.href = '/'; return; }
        const j = await r.json();
        if (j.plan) setPlan(j.plan);
        if (j.data) { setTemplate(j.data.template || 'classic'); setData(mergeData(j.data.data)); setSlug(j.data.slug); }
        const [b, o] = await Promise.all([getJson('/api/site/bookings'), getJson('/api/site/orders')]);
        if (b.ok) setBookings(b.data || []);
        if (o.ok) setOrders(o.data || []);
        if (j.data) { loadStaff(); loadStripe(); loadAnalytics(); loadGrowth(); loadPay(); }
        let savedRegion = '';
        try { savedRegion = localStorage.getItem('gnis_region') || ''; } catch {}
        loadBilling(savedRegion);
        getJson('/api/users/get').then((u) => { if (u?.ok && u.data?.role === 'admin') setIsAdmin(true); });
        const qs = new URLSearchParams(window.location.search);
        if (qs.get('stripe') === 'done') setTab('payments');
        if (qs.get('tab') === 'billing') {
          setTab('billing');
          if (qs.get('plan') === 'done') setBillMsg('Payment received. Your plan updates within a minute.');
          if (qs.get('plan') === 'failed') setBillMsg('We could not confirm that payment. If you were charged, contact support.');
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!slug) return;
    if ((tab === 'customers' || tab === 'bookings') && customers === null) getJson('/api/site/customers').then((j) => setCustomers(j.ok ? j.data : []));
    if (tab === 'money' && money === null) getJson('/api/site/money').then((j) => setMoney(j.ok ? (j.data || {}) : {}));
    if (tab === 'reviews' && reviews === null) getJson('/api/site/reviews').then((j) => setReviews(j.ok ? j.data : []));
    if (tab === 'giftcards' && cards === null) getJson('/api/site/giftcards').then((j) => setCards(j.ok ? j.data : []));
  }, [tab, slug]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!slug || prof.loaded) return;
    getJson('/api/site/profile').then((j) => { if (j.ok && j.data) setProf((x) => ({ ...x, slug: j.data.slug || slug, country: j.data.country || '', nextChange: j.data.nextChange || null, loaded: true })); });
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const LONDON = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
  const shift = (iso, n) => new Date(new Date(`${iso}T00:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);
  const rangeOf = (f) => {
    const t = LONDON();
    if (f.preset === 'today') return { from: t, to: t };
    if (f.preset === '7') return { from: shift(t, -6), to: t };
    if (f.preset === '30') return { from: shift(t, -29), to: t };
    if (f.preset === 'month') return { from: `${t.slice(0, 8)}01`, to: t };
    if (f.preset === 'lastmonth') { const first = `${t.slice(0, 8)}01`; const to = shift(first, -1); return { from: `${to.slice(0, 8)}01`, to }; }
    if (f.preset === 'year') return { from: `${t.slice(0, 4)}-01-01`, to: t };
    return { from: f.from || `${t.slice(0, 8)}01`, to: f.to || t };
  };
  const loadFin = async (f = fq) => {
    const r = rangeOf(f);
    const qs = new URLSearchParams({ from: r.from, to: r.to, group: f.group, staff: f.staff, service: f.service });
    const j = await getJson(`/api/site/finance?${qs}`);
    setFin(j.ok ? j.data : { error: j.error || 'Could not load' });
  };
  useEffect(() => { if (slug && tab === 'money') loadFin(); }, [tab, slug, fq]); // eslint-disable-line react-hooks/exhaustive-deps
  const addExpense = async () => {
    setExp((e) => ({ ...e, busy: true, msg: '' }));
    const j = await sendJson('/api/site/expenses', 'POST', { date: exp.date || LONDON(), category: exp.category, amount: exp.amount, note: exp.note });
    if (j.ok) { setExp({ date: '', category: exp.category, amount: '', note: '', busy: false, msg: 'Added ✓' }); loadFin(); }
    else setExp((e) => ({ ...e, busy: false, msg: j.error || 'Could not save' }));
  };
  const delExpense = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    await sendJson(`/api/site/expenses?id=${id}`, 'DELETE');
    loadFin();
  };

  const cur = data.currency || 'GBP';
  const sym = (formatMoney(0, cur, data.language || 'en').replace(/[0-9.,\s]/g, '')) || cur;
  const CC = { GBP: '44', NGN: '234', GHS: '233', KES: '254', ZAR: '27', USD: '1', CAD: '1', AUD: '61', EUR: '353' };
  const waLink = (b) => {
    const raw = String(b.contact || '');
    if (raw.includes('@')) return null;
    let d = raw.replace(/[^\d+]/g, '');
    if (d.startsWith('+')) d = d.slice(1);
    else if (d.startsWith('00')) d = d.slice(2);
    else if (d.startsWith('0')) d = (CC[cur] || '44') + d.slice(1);
    if (!/^\d{10,15}$/.test(d)) return null;
    const text = b.status === 'approved'
      ? `Hi ${b.customer}, a reminder of your ${b.service} booking with ${data.businessName} on ${b.date} at ${b.time}. See you then!`
      : `Hi ${b.customer}, thanks for booking ${b.service} with ${data.businessName} on ${b.date} at ${b.time}. Does that time still suit you?`;
    return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
  };
  const fm = (n) => formatMoney(Math.round((Number(n) || 0) * 100) / 100, cur, data.language || 'en');
  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));
  const saveCustomer = async (c, patch) => {
    setCustomers((list) => list.map((x) => (x.k === c.k ? { ...x, ...patch } : x)));
    const j = await sendJson('/api/site/customers', 'PUT', { key: c.k, ...patch });
    setCustMsg(j.ok ? 'Saved' : (j.error || 'Could not save'));
    setTimeout(() => setCustMsg(''), 1800);
  };
  const dueDaysEff = dueDays || Number(data.rebookDays) || 28;
  const dueList = (customers || []).filter((c) => {
    if (!c.last_visit || c.next_booking || c.optout) return false;
    const ago = (Date.now() - new Date(c.last_visit + 'T12:00:00').getTime()) / 86400000;
    if (ago < dueDaysEff || ago > 365) return false;
    return !(c.last_rebook && String(c.last_rebook).slice(0, 10) >= String(c.last_visit).slice(0, 10));
  });
  const markContacted = (list) => {
    const keys = new Set(list.map((c) => c.k));
    setCustomers((all) => all.map((x) => (keys.has(x.k) ? { ...x, last_rebook: new Date().toISOString() } : x)));
    list.forEach((c) => { sendJson('/api/site/customers', 'PUT', { key: c.k, contacted: true }); });
  };
  const siteUrl = () => `${window.location.origin}/site/${slug}`;
  const dueText = (name) => `Hi${name ? ' ' + name : ''}, it has been a while since your last visit to ${data.businessName}. Would you like to book again? ${siteUrl()}`;
  const emailAllDue = () => {
    const batch = dueList.filter((c) => String(c.contact).includes('@')).slice(0, 25);
    if (!batch.length) return;
    const bcc = batch.map((c) => String(c.contact).trim()).join(',');
    window.location.href = `mailto:?bcc=${encodeURIComponent(bcc)}&subject=${encodeURIComponent(`Time to book again? ${data.businessName}`)}&body=${encodeURIComponent(dueText(''))}`;
    markContacted(batch);
  };
  const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const downloadCustomers = () => {
    const head = ['Name', 'Contact', 'Bookings', 'Completed', 'No-shows', 'Spent', 'Last visit', 'Next booking', 'Notes'];
    const lines = [head.map(csvCell).join(',')].concat((customers || []).map((c) => [c.name, c.contact, c.bookings, c.completed, c.no_shows, c.spent, c.last_visit || '', c.next_booking || '', c.notes].map(csvCell).join(',')));
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'customers.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const rebookLink = (c) => {
    const raw = String(c.contact || '');
    if (raw.includes('@')) return `mailto:${raw}?subject=${encodeURIComponent(`Time to book again? ${data.businessName}`)}`;
    let d = raw.replace(/[^\d+]/g, '');
    if (d.startsWith('+')) d = d.slice(1); else if (d.startsWith('00')) d = d.slice(2); else if (d.startsWith('0')) d = (CC[cur] || '44') + d.slice(1);
    if (!/^\d{10,15}$/.test(d)) return null;
    return `https://wa.me/${d}?text=${encodeURIComponent(`Hi ${c.name}, it has been a while since your ${c.last_service || 'visit'} with ${data.businessName}. Would you like to book again?`)}`;
  };
  const runRedeem = async (use) => {
    setRedeem((r) => ({ ...r, busy: true, msg: '' }));
    const j = await sendJson('/api/site/giftcards', 'POST', use ? { code: redeem.code, amount: redeem.amount } : { code: redeem.code });
    if (j.ok) {
      setRedeem((r) => ({ ...r, busy: false, ok: true, balance: j.balance, amount: '', msg: use ? `Used ${fm(j.used)}. ${fm(j.balance)} left on the card.` : `Balance: ${fm(j.balance)}` }));
      if (use) getJson('/api/site/giftcards').then((x) => setCards(x.ok ? x.data : []));
    } else setRedeem((r) => ({ ...r, busy: false, ok: false, balance: null, msg: j.error || 'Something went wrong' }));
  };
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
        setMsg('Uploading…');
        for (const f of files.slice(0, 12 - data.gallery.length)) imgs.push(await uploadDataUrl(await compress(f, 1200)));
        setData((d) => ({ ...d, gallery: [...d.gallery, ...imgs].slice(0, 12) }));
      } else if (kind === 'hero') { setMsg('Uploading…'); set('hero', await uploadDataUrl(await compress(files[0], 1920, 0.78))); }
      else if (kind === 'product') { setMsg('Uploading…'); setItem('products', idx, { image: await uploadDataUrl(await compress(files[0], 900)) }); }
      setMsg('Photo uploaded. Press Save to publish.');
    } catch (err) { setMsg(err.message || 'Could not upload that image'); }
  };

  const save = async () => {
    setSaving(true); setMsg('');
    let toSave = data;
    try {
      // Move any old in-database photos to image storage so the site loads fast.
      const swap = async (v) => (isData(v) ? await uploadDataUrl(v) : v);
      const needs = isData(data.hero) || data.gallery.some(isData) || data.products.some((p) => isData(p.image));
      if (needs) {
        setMsg('Optimising photos…');
        toSave = {
          ...data,
          hero: await swap(data.hero),
          gallery: await Promise.all(data.gallery.map(swap)),
          products: await Promise.all(data.products.map(async (p) => ({ ...p, image: await swap(p.image) }))),
        };
        setData(toSave);
      }
    } catch (err) { setMsg(err.message || 'Photo upload failed'); setSaving(false); return; }
    const j = await sendJson('/api/site', 'PUT', { template, data: toSave });
    if (j.ok) { const first = !slug; setSlug(j.slug); setMsg('Saved ✓ (live page updates within a minute at most)'); if (first) { loadStaff(); loadStripe(); } } else setMsg(j.error || 'Save failed');
    setSaving(false);
  };

  const setBookingStatus = async (id, status) => {
    setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, status } : b)));
    await sendJson('/api/site/bookings', 'PUT', { id, status });
  };
  const assignStaff = async (id, staffId) => {
    const nm = (staff.staff.find((x) => String(x.id) === String(staffId)) || {}).name || null;
    setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, staff_id: staffId || null, staff_name: nm } : b)));
    await sendJson('/api/site/bookings', 'PUT', { id, staffId: staffId || null });
  };
  const saveProfile = async () => {
    setProf((x) => ({ ...x, busy: true, msg: '' }));
    const j = await sendJson('/api/site/profile', 'PUT', { slug: prof.slug, country: prof.country });
    if (j.ok) {
      if (j.slug) setSlug(j.slug);
      setProf((x) => ({ ...x, busy: false, ok: true, slug: j.slug || x.slug, msg: 'Saved ✓ Your old address still works and forwards to the new one.', nextChange: null }));
      getJson('/api/site/profile').then((r) => { if (r.ok && r.data) setProf((x) => ({ ...x, nextChange: r.data.nextChange || null })); });
    } else setProf((x) => ({ ...x, busy: false, ok: false, msg: j.error || 'Could not save' }));
  };
  const markPaid = async (id, paid) => {
    const method = payMethod[id] || 'cash';
    setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, paid, paid_method: paid ? method : null } : b)));
    await sendJson('/api/site/bookings', 'PUT', { id, paid, method });
  };
  const emailInvoice = async (id) => {
    setBookMsg('Sending…');
    const j = await sendJson('/api/site/invoice', 'POST', { id });
    setBookMsg(j.ok ? 'Sent ✓ The customer has an email with a link to print or save it.' : (j.error || 'Could not send'));
  };
  const hideReview = async (id, hidden) => {
    setReviews((rs) => (rs || []).map((r) => (r.id === id ? { ...r, hidden } : r)));
    await sendJson('/api/site/reviews', 'PUT', { id, hidden });
  };
  const parseCustomers = (text) => {
    const toIso = (v) => { const m = String(v || '').trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : String(v || '').trim(); };
    const out = [];
    for (const line of String(text || '').split(/\r?\n/)) {
      const c = line.split(/[,;\t]/).map((x) => x.trim().replace(/^"|"$/g, ''));
      if (c.every((x) => !x)) continue;
      if (!c.some((x) => x.includes('@') || /\d{7,}/.test(x.replace(/[\s()+-]/g, '')))) continue; // header row
      out.push({ name: c[0], contact: c[1], lastVisit: toIso(c[2]), service: c[3], spent: Number(String(c[4] || '').replace(/[^\d.]/g, '')) || 0 });
    }
    return out;
  };
  const runImport = async () => {
    const rows = parseCustomers(imp.text);
    if (!rows.length) { setImp({ ...imp, msg: 'Nothing to import yet. Each line needs a name and an email or phone.', ok: false }); return; }
    setImp({ ...imp, busy: true, msg: '' });
    const j = await sendJson('/api/site/import', 'POST', { rows, consent: imp.consent });
    if (j.ok) { setImp({ text: '', consent: false, busy: false, ok: true, msg: j.added ? `Added ${j.added} customers${j.skipped ? `, skipped ${j.skipped}` : ''}.` : (j.note || 'Nothing new to add.') }); setCustomers(null); }
    else setImp({ ...imp, busy: false, ok: false, msg: j.error || 'Import failed' });
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

  const makeQr = async () => {
    try {
      const QR = (await import('qrcode')).default;
      setQr(await QR.toDataURL(liveUrl, { width: 600, margin: 2 }));
    } catch { setMsg('Could not make the QR code'); }
  };

  const connectStripe = async () => {
    const j = await sendJson('/api/site/stripe', 'POST', { country: stripeCountry });
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
    <div className="dash" style={{ fontFamily: 'system-ui, sans-serif', background: '#f3f4f6', color: '#111827', colorScheme: 'light', minHeight: '100vh', maxWidth: '100vw', overflowX: 'hidden' }}>
      <style>{`
        .dash{color-scheme:light;-webkit-text-size-adjust:100%}
        .dash input:not([type=checkbox]):not([type=file]),.dash textarea,.dash select{color:#111827 !important;background:#ffffff !important;-webkit-text-fill-color:#111827;font-size:16px !important;color-scheme:light;-webkit-appearance:none;appearance:none}
        .dash input[type=checkbox]{width:18px;height:18px;accent-color:#2563eb}
        .dash input::placeholder,.dash textarea::placeholder{color:#9ca3af !important;-webkit-text-fill-color:#9ca3af}
        .dash *{min-width:0}
        .dash img{max-width:100%}
      `}</style>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onFile} />
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 5 }}>
        <strong>My site</strong>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: tooBig ? '#dc2626' : '#6b7280' }}>{sizeKB} KB / 3800</span>
          {msg && <span style={{ fontSize: 13 }}>{msg}</span>}
          {isAdmin && <a href="/admin" style={{ fontSize: 14, color: '#7c3aed', fontWeight: 600 }}>Admin console</a>}
          {slug && <a href={`/site/${slug}`} target="_blank" rel="noreferrer" style={{ fontSize: 14, color: '#2563eb' }}>View live site ↗</a>}
          <a href="https://cleanit-website.vercel.app/" target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: '#059669', fontWeight: 600 }}>Clean It website ↗</a>
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

          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
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
            <div style={box}>
              <strong>Region and tax</strong>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 10px' }}>Currency and language change what your customers see. Card payments work in {STRIPE_CURRENCIES.join(', ')}; other currencies are pay in person.</p>
              <span style={lbl}>Currency</span>
              <select style={inp} value={cur} onChange={(e) => set('currency', e.target.value)}>{CURRENCIES.map((c) => (<option key={c} value={c}>{c}</option>))}</select>
              <span style={lbl}>Language of your site</span>
              <select style={inp} value={data.language || 'en'} onChange={(e) => set('language', e.target.value)}>{LANGUAGES.map((l) => (<option key={l.id} value={l.id}>{l.name}</option>))}</select>
              <span style={lbl}>Tax rate % (VAT, sales tax). Use 0 if you do not charge tax</span>
              <input style={inp} type="number" min="0" max="30" step="0.1" value={data.taxRate ?? 0} onChange={(e) => set('taxRate', e.target.value)} />
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, marginBottom: 8 }}>
                <input type="checkbox" checked={data.taxIncluded !== false} onChange={(e) => set('taxIncluded', e.target.checked)} /> My listed prices already include tax
              </label>
              <span style={lbl}>VAT / tax number (shown in your footer, optional)</span>
              <input style={inp} value={data.vatNumber || ''} onChange={(e) => set('vatNumber', e.target.value)} />
            </div>
            <div style={box}>
              <strong>Invoice and receipt details</strong>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 10px' }}>Shown on the invoices and receipts you print or email from the Bookings tab. A limited company should add its registered name, number and address.</p>
              <span style={lbl}>Registered business name (optional, for example Your Company Ltd)</span>
              <input style={inp} value={data.legalName || ''} maxLength={120} onChange={(e) => set('legalName', e.target.value)} />
              <span style={lbl}>Company number (optional)</span>
              <input style={inp} value={data.companyNumber || ''} maxLength={30} onChange={(e) => set('companyNumber', e.target.value)} />
              <span style={lbl}>Registered office address (optional, uses your location if empty)</span>
              <input style={inp} value={data.regAddress || ''} maxLength={200} onChange={(e) => set('regAddress', e.target.value)} />
              <span style={lbl}>Note on invoices, for example bank transfer details (never shown on your public site)</span>
              <textarea style={{ ...inp, minHeight: 70 }} value={data.invoiceNote || ''} maxLength={400} onChange={(e) => set('invoiceNote', e.target.value)} />
              <p style={{ fontSize: 12, color: '#6b7280', margin: '0' }}>Press Save at the top to keep these.</p>
            </div>
            {slug && (
              <div style={box}>
                <strong>Your web address and country</strong>
                <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 10px' }}>The country decides which country list you appear under in the directory. If you change your address, the old one keeps working and forwards to the new one. You can change it once every 7 days.</p>
                <span style={lbl}>Web address</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>{typeof window !== 'undefined' ? window.location.host : ''}/site/</span>
                  <input style={{ ...inp, width: 'auto', flex: 1, minWidth: 140, marginBottom: 0 }} value={prof.slug} maxLength={40} onChange={(e) => setProf((x) => ({ ...x, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'), msg: '' }))} />
                </div>
                {prof.nextChange && <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 8px' }}>You changed it recently. You can change it again from {prof.nextChange}.</p>}
                <span style={lbl}>Country of your business</span>
                <select style={inp} value={prof.country} onChange={(e) => setProf((x) => ({ ...x, country: e.target.value, msg: '' }))}>
                  <option value="">Choose a country</option>
                  {COUNTRY_CODES.map((c) => { let n = c; try { n = new Intl.DisplayNames(['en'], { type: 'region' }).of(c) || c; } catch {} return (<option key={c} value={c}>{n}</option>); })}
                </select>
                <button style={btn('#111827')} disabled={prof.busy} onClick={saveProfile}>{prof.busy ? 'Saving…' : 'Save address and country'}</button>
                {prof.msg && <p style={{ fontSize: 13, margin: '8px 0 0', color: prof.ok ? '#059669' : '#dc2626' }}>{prof.msg}</p>}
              </div>
            )}
            <div style={box}>
              <strong>Deposits and WhatsApp</strong>
              {plan === 'starter' && (
                <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 10px' }}>These are Professional plan features. <button type="button" style={{ background: 'none', border: 0, color: '#2563eb', cursor: 'pointer', padding: 0, fontSize: 12, textDecoration: 'underline' }} onClick={() => setTab('billing')}>See plans</button></p>
              )}
              <span style={lbl}>Booking deposit (paid by the customer when they book). Needs card payments connected in the Payments tab</span>
              <select style={inp} disabled={plan === 'starter'} value={Number(data.depositPercent) || 0} onChange={(e) => set('depositPercent', Number(e.target.value))}>
                {[0, 10, 20, 25, 30, 50, 100].map((p) => (<option key={p} value={p}>{p === 0 ? 'No deposit' : `${p}% deposit`}</option>))}
              </select>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, marginBottom: 4, opacity: plan === 'starter' ? 0.5 : 1 }}>
                <input type="checkbox" disabled={plan === 'starter'} checked={!!data.whatsappReminders} onChange={(e) => set('whatsappReminders', e.target.checked)} /> Send confirmations and reminders on WhatsApp automatically
              </label>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '0' }}>Automatic WhatsApp needs a Twilio WhatsApp number set up by the platform owner. On every plan you can message a customer yourself with the WhatsApp button on the Bookings tab.</p>
            </div>
            <div style={box}>
              <strong>Bring customers back and sell gift cards</strong>
              {plan === 'starter' && (
                <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 10px' }}>These are Professional plan features. <button type="button" style={{ background: 'none', border: 0, color: '#2563eb', cursor: 'pointer', padding: 0, fontSize: 12, textDecoration: 'underline' }} onClick={() => setTab('billing')}>See plans</button></p>
              )}
              <span style={lbl}>Automatically email customers to book again after their last completed visit</span>
              <select style={inp} disabled={plan === 'starter'} value={Number(data.rebookDays) || 0} onChange={(e) => set('rebookDays', Number(e.target.value))}>
                {[0, 14, 21, 28, 42, 56, 90].map((n) => (<option key={n} value={n}>{n === 0 ? 'Off' : `After ${n} days`}</option>))}
              </select>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 10px' }}>Only customers who gave an email, whose visit you marked Completed, and who have nothing booked. Each email has a stop link. You can switch off one customer on the Customers tab.</p>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, marginBottom: 4, opacity: plan === 'starter' ? 0.5 : 1 }}>
                <input type="checkbox" disabled={plan === 'starter'} checked={!!data.giftCards} onChange={(e) => set('giftCards', e.target.checked)} /> Sell gift cards on my site
              </label>
              <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Needs card payments connected in the Payments tab. The money goes to you like any other payment.</p>
            </div>
            <div style={box}>
              <strong>Keep customers coming back</strong>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, margin: '6px 0' }}>
                <input type="checkbox" checked={data.weeklySummary !== false} onChange={(e) => set('weeklySummary', e.target.checked)} /> Email me a summary every Monday
              </label>
              <span style={lbl}>Loyalty reward (Professional plan)</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <select style={inp} disabled={plan === 'starter'} value={Number(data.loyaltyEvery) || 0} onChange={(e) => set('loyaltyEvery', Number(e.target.value))}>
                  {[0, 3, 4, 5, 6, 8, 10].map((n) => (<option key={n} value={n}>{n === 0 ? 'Off' : `Every ${n}th visit`}</option>))}
                </select>
                <select style={inp} disabled={plan === 'starter' || !data.loyaltyEvery} value={Number(data.loyaltyPercent) || 10} onChange={(e) => set('loyaltyPercent', Number(e.target.value))}>
                  {[5, 10, 15, 20, 25, 30, 50].map((n) => (<option key={n} value={n}>{n}% off</option>))}
                </select>
              </div>
              <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Customers are matched by the phone or email they book with. The discount is applied automatically on that booking. Press Save after changing this.</p>
            </div>
            <div style={box}>
              <strong>Top businesses</strong>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, margin: '6px 0' }}>
                <input type="checkbox" checked={!!data.showInTop} onChange={(e) => set('showInTop', e.target.checked)} /> Show my business in the public “Top businesses” list
              </label>
              <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Ranked by visits you mark Completed in the last 30 days (you need at least 3). The list shows your business name, area, completed visits, how many customers came back and how many are new. Top 5 get a badge on their page and show first in the directory. Press Save after changing this.</p>
            </div>
            <div style={box}>
              <strong>Contact and social links</strong>
              <span style={lbl}>Announcement bar at the top of your site (optional, for example “Open late on Fridays”)</span>
              <input style={inp} maxLength={160} value={data.announcement || ''} onChange={(e) => set('announcement', e.target.value)} />
              <span style={lbl}>WhatsApp number (shows a green chat button on your site)</span>
              <input style={inp} inputMode="tel" placeholder="08012345678 or +447700900123" value={data.whatsapp || ''} onChange={(e) => set('whatsapp', e.target.value)} />
              <span style={lbl}>Instagram (your @name or full link)</span>
              <input style={inp} placeholder="@yourname" value={data.instagram || ''} onChange={(e) => set('instagram', e.target.value)} />
              <span style={lbl}>Facebook (page name or full link)</span>
              <input style={inp} placeholder="yourpage" value={data.facebook || ''} onChange={(e) => set('facebook', e.target.value)} />
              <span style={lbl}>TikTok (your @name or full link)</span>
              <input style={inp} placeholder="@yourname" value={data.tiktok || ''} onChange={(e) => set('tiktok', e.target.value)} />
            </div>
            <div style={box}>
              <strong>Questions and answers (FAQ)</strong>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 10px' }}>Answer what customers always ask, like “Do you take walk-ins?” or “Do I pay a deposit?”. Up to 8.</p>
              {(data.faqs || []).map((f, i) => (
                <div key={i} style={{ borderTop: i ? '1px solid #f3f4f6' : 'none', paddingTop: i ? 10 : 0, marginTop: i ? 10 : 0 }}>
                  <input style={inp} placeholder="Question" maxLength={140} value={f.q} onChange={(e) => setItem('faqs', i, { q: e.target.value })} />
                  <textarea style={{ ...inp, minHeight: 56 }} placeholder="Answer" maxLength={600} value={f.a} onChange={(e) => setItem('faqs', i, { a: e.target.value })} />
                  <button style={sm('#dc2626')} onClick={() => delItem('faqs', i)}>Remove</button>
                </div>
              ))}
              {(data.faqs || []).length < 8 && <button style={{ ...btn('#374151'), marginTop: 8 }} onClick={() => addItem('faqs', { q: '', a: '' })}>Add a question</button>}
            </div>
            <div style={box}>
              <strong>Customer reviews</strong>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 10px' }}>Only add words a real customer actually said, with their permission. Never invent reviews. Up to 6.</p>
              {(data.reviews || []).map((r, i) => (
                <div key={i} style={{ borderTop: i ? '1px solid #f3f4f6' : 'none', paddingTop: i ? 10 : 0, marginTop: i ? 10 : 0 }}>
                  <input style={inp} placeholder="Customer first name" maxLength={60} value={r.name} onChange={(e) => setItem('reviews', i, { name: e.target.value })} />
                  <textarea style={{ ...inp, minHeight: 56 }} placeholder="What they said" maxLength={400} value={r.text} onChange={(e) => setItem('reviews', i, { text: e.target.value })} />
                  <button style={sm('#dc2626')} onClick={() => delItem('reviews', i)}>Remove</button>
                </div>
              ))}
              {(data.reviews || []).length < 6 && <button style={{ ...btn('#374151'), marginTop: 8 }} onClick={() => addItem('reviews', { name: '', text: '' })}>Add a review</button>}
            </div>
          </>)}

          {tab === 'services' && (<>
            {data.services.map((s, i) => (
              <div key={i} style={box}>
                <input style={inp} placeholder="Service name" value={s.name} onChange={(e) => setItem('services', i, { name: e.target.value })} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={inp} type="number" min="0" placeholder={`Price (${sym})`} value={s.price} onChange={(e) => setItem('services', i, { price: e.target.value })} />
                  <input style={inp} placeholder="Duration" value={s.duration} onChange={(e) => setItem('services', i, { duration: e.target.value })} />
                </div>
                <input style={inp} placeholder="Short description" value={s.desc} onChange={(e) => setItem('services', i, { desc: e.target.value })} />
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, marginBottom: 8 }}>
                  <input type="checkbox" checked={!!s.negotiable} onChange={(e) => setItem('services', i, { negotiable: e.target.checked })} />
                  Let customers negotiate this price with the AI assistant
                </label>
                {s.negotiable && (
                  <div>
                    <span style={lbl}>Lowest price you would accept, kept private</span>
                    <input style={inp} type="number" min="0" value={s.minPrice || ''} onChange={(e) => setItem('services', i, { minPrice: e.target.value })} />
                    {!(Number(s.minPrice) > 0 && Number(s.minPrice) < Number(s.price)) && <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 8 }}>The lowest price must be above 0 and below the listed price, otherwise negotiation stays off.</div>}
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
                <input style={inp} type="number" min="0" placeholder={`Price (${sym})`} value={p.price} onChange={(e) => setItem('products', i, { price: e.target.value })} />
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

          {tab === 'analytics' && (!slug ? needSave : !analytics ? <div style={box}>Loading analytics…</div> : <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 14 }}>
              {[
                ['Revenue (30 days)', fm(analytics.revenue30)],
                ['Visitors (30 days)', analytics.visitors30],
                ['Bookings (30 days)', analytics.bookings30],
                ['Conversion', analytics.conversion == null ? 'n/a' : `${analytics.conversion}%`],
                ['Repeat customers', analytics.repeatRate == null ? 'n/a' : `${analytics.repeatRate}% (${analytics.repeaters}/${analytics.customers})`],
                ['No-show rate', analytics.noShowRate == null ? 'n/a' : `${analytics.noShowRate}%`],
              ].map(([k, v]) => (<div key={k} style={{ ...box, marginBottom: 0 }}><div style={{ fontSize: 12, color: '#6b7280' }}>{k}</div><div style={{ fontSize: 22, fontWeight: 700 }}>{v}</div></div>))}
            </div>
            <div style={box}><strong>Revenue, last 30 days</strong><Line points={analytics.daily.map((d) => ({ v: d.revenue }))} /></div>
            <div style={box}><strong>Busiest days</strong><Bars items={analytics.byDow} /></div>
            <div style={box}><strong>Busiest times</strong><Bars items={analytics.byHour} color="#7c3aed" /></div>
            <div style={box}>
              <strong>Price suggestions from demand</strong>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 10px' }}>Compares bookings for each service over 30 days with your average. These are suggestions, never changed automatically.</p>
              {analytics.suggestions.length === 0 && <div style={{ fontSize: 14 }}>Add services to see suggestions.</div>}
              {analytics.suggestions.map((x) => (
                <div key={x.name} style={{ borderTop: '1px solid #e5e7eb', padding: '10px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontWeight: 600 }}>
                    <span>{x.name}</span>
                    <span style={{ color: x.action === 'raise' ? '#059669' : x.action === 'promote' ? '#d97706' : '#6b7280' }}>{x.action === 'raise' ? `Raise to ${fm(x.suggested)}` : x.action === 'promote' ? `Promote or ${fm(x.suggested)}` : 'Keep price'}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>{x.bookings30} bookings in 30 days · {x.reason}</div>
                </div>
              ))}
            </div>
            <div style={box}>
              <strong>AI negotiation</strong>
              <div style={{ fontSize: 14, marginTop: 6 }}>{analytics.negotiated} negotiated bookings ({analytics.negotiatedShare}% of all). Average discount given: {analytics.avgDiscount}%.</div>
            </div>
          </>)}

          {tab === 'money' && (!slug ? needSave : money === null ? <div style={box}>Loading…</div> : !money.month_earned && money.month_earned !== 0 ? <div style={box}>No numbers yet.</div> : <>
            <div style={box}>
              <strong>Money from completed visits</strong>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 12px' }}>Counts visits you mark Completed on the Bookings tab. Customers you imported are not counted.</p>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <div><div style={{ fontSize: 26, fontWeight: 700 }}>{fm(money.month_earned)}</div><div style={{ fontSize: 12, color: '#6b7280' }}>this month</div></div>
                <div><div style={{ fontSize: 26, fontWeight: 700 }}>{fm(money.last_month_earned)}</div><div style={{ fontSize: 12, color: '#6b7280' }}>last month</div></div>
                <div><div style={{ fontSize: 26, fontWeight: 700 }}>{fm(money.d30_earned)}</div><div style={{ fontSize: 12, color: '#6b7280' }}>last 30 days ({money.d30_visits} visits)</div></div>
              </div>
            </div>
            <div style={box}>
              <strong>Coming up</strong>
              <div style={{ fontSize: 14, marginTop: 6 }}>{money.upcoming_n} bookings worth {fm(money.upcoming)} are waiting or confirmed.</div>
              {money.no_show30 > 0 && <div style={{ fontSize: 14, marginTop: 6, color: '#b45309' }}>{money.no_show30} no-shows in the last 30 days cost about {fm(money.lost30)}. Deposits in the Payments tab help prevent this.</div>}
            </div>
            <div style={box}>
              <strong>Paid online through GNIS (last 30 days)</strong>
              <div style={{ fontSize: 14, marginTop: 6, lineHeight: 1.7 }}>
                Deposits and gift cards collected: {fm(money.onlineCollected30)}<br />
                Estimated platform fee ({money.feePercent}%): {fm(money.feeEstimate30)}<br />
                Gift card balances you still owe customers: {fm(money.giftOwed)}<br />
                Gift cards used at booking: {fm(money.gift_used30)}
              </div>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '8px 0 0' }}>The payment company may also take its own card fee. Your payment provider’s dashboard shows exact payouts.</p>
            </div>
            {money.topServices.length > 0 && <div style={box}>
              <strong>Best earners (30 days)</strong>
              {money.topServices.map((x) => (<div key={x.service} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '6px 0', borderTop: '1px solid #f3f4f6' }}><span>{x.service} · {x.n}</span><span>{fm(x.total)}</span></div>))}
            </div>}

            <div style={box}>
              <strong>Income, expenses and profit</strong>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 10px' }}>Income = visits you marked Completed (at the price booked) plus paid shop orders. Cash, tips and anything not recorded in GNIS are not included, so adjust a booking’s price if the customer paid differently.</p>
              {fin && fin.pro === false && <p style={{ fontSize: 13, margin: '0 0 10px' }}>You are on the free view (this month, by day). Expenses, profit, filters, staff sales and downloads are on the Professional plan. <button type="button" style={{ background: 'none', border: 0, color: '#2563eb', cursor: 'pointer', padding: 0, textDecoration: 'underline' }} onClick={() => setTab('billing')}>See plans</button></p>}
              {(!fin || fin.pro !== false) && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  <select style={{ ...inp, width: 'auto', marginBottom: 0 }} value={fq.preset} onChange={(e) => setFq({ ...fq, preset: e.target.value })}>
                    <option value="today">Today</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="month">This month</option><option value="lastmonth">Last month</option><option value="year">This year</option><option value="custom">Choose dates</option>
                  </select>
                  {fq.preset === 'custom' && <>
                    <input type="date" style={{ ...inp, width: 'auto', marginBottom: 0 }} value={fq.from} onChange={(e) => setFq({ ...fq, from: e.target.value })} />
                    <input type="date" style={{ ...inp, width: 'auto', marginBottom: 0 }} value={fq.to} onChange={(e) => setFq({ ...fq, to: e.target.value })} />
                  </>}
                  <select style={{ ...inp, width: 'auto', marginBottom: 0 }} value={fq.group} onChange={(e) => setFq({ ...fq, group: e.target.value })}>
                    <option value="day">By day</option><option value="week">By week</option><option value="month">By month</option>
                  </select>
                  <select style={{ ...inp, width: 'auto', marginBottom: 0 }} value={fq.staff} onChange={(e) => setFq({ ...fq, staff: e.target.value })}>
                    <option value="all">All staff</option><option value="none">Not assigned</option>
                    {((fin && fin.staffList) || []).map((x) => (<option key={x.id} value={x.id}>{x.name}</option>))}
                  </select>
                  <select style={{ ...inp, width: 'auto', marginBottom: 0 }} value={fq.service} onChange={(e) => setFq({ ...fq, service: e.target.value })}>
                    <option value="">All services</option>
                    {((fin && fin.services) || []).map((x) => (<option key={x} value={x}>{x}</option>))}
                  </select>
                </div>
              )}
              {!fin ? <div style={{ fontSize: 14 }}>Loading…</div> : fin.error ? <div style={{ fontSize: 14, color: '#dc2626' }}>{fin.error}</div> : (() => {
                const pc = (a, b) => (b > 0 ? `${a >= b ? '▲' : '▼'} ${Math.abs(Math.round(((a - b) / b) * 100))}% vs before` : '');
                const maxV = Math.max(1, ...fin.series.map((x) => Math.max(x.income, x.expenses)));
                const lab = (k) => (fin.group === 'month' ? new Date(`${k}T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }) : fin.group === 'week' ? `Week of ${new Date(`${k}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}` : new Date(`${k}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }));
                return (<>
                  <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', margin: '6px 0 14px' }}>
                    <div><div style={{ fontSize: 24, fontWeight: 700 }}>{fm(fin.totals.income)}</div><div style={{ fontSize: 12, color: '#6b7280' }}>income {pc(fin.totals.income, fin.prev.income)}</div></div>
                    {fin.pro && !fin.filtered && <div><div style={{ fontSize: 24, fontWeight: 700 }}>{fm(fin.totals.expenses)}</div><div style={{ fontSize: 12, color: '#6b7280' }}>expenses</div></div>}
                    {fin.pro && !fin.filtered && <div><div style={{ fontSize: 24, fontWeight: 700, color: fin.totals.profit >= 0 ? '#059669' : '#dc2626' }}>{fm(fin.totals.profit)}</div><div style={{ fontSize: 12, color: '#6b7280' }}>profit {pc(fin.totals.profit, fin.prev.profit)}</div></div>}
                    <div><div style={{ fontSize: 24, fontWeight: 700 }}>{fin.totals.visits}</div><div style={{ fontSize: 12, color: '#6b7280' }}>visits · avg {fm(fin.totals.avg)}</div></div>
                  </div>
                  {fin.filtered && <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 10px' }}>Expenses and profit are for the whole business, so they are hidden while a staff or service filter is on.</p>}
                  {fin.series.length === 0 ? <div style={{ fontSize: 14, color: '#6b7280' }}>Nothing recorded for these dates.</div> : (<>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120, overflowX: 'auto', paddingBottom: 4 }}>
                      {fin.series.map((x) => (
                        <div key={x.bucket} title={`${lab(x.bucket)}: income ${fm(x.income)}${fin.pro && !fin.filtered ? `, expenses ${fm(x.expenses)}` : ''}`} style={{ display: 'flex', alignItems: 'flex-end', gap: 1, flex: '1 0 14px', maxWidth: 40, height: '100%' }}>
                          <div style={{ flex: 1, background: '#2563eb', height: `${Math.max(2, (x.income / maxV) * 100)}%`, borderRadius: '3px 3px 0 0' }} />
                          {fin.pro && !fin.filtered && <div style={{ flex: 1, background: '#f59e0b', height: `${Math.max(x.expenses > 0 ? 2 : 0, (x.expenses / maxV) * 100)}%`, borderRadius: '3px 3px 0 0' }} />}
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 10px' }}><span style={{ color: '#2563eb' }}>■</span> income {fin.pro && !fin.filtered && <><span style={{ color: '#f59e0b', marginLeft: 8 }}>■</span> expenses</>}</div>
                    <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid #f3f4f6', borderRadius: 8 }}>
                      {fin.series.slice().reverse().map((x) => (
                        <div key={x.bucket} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, padding: '6px 10px', borderTop: '1px solid #f3f4f6' }}>
                          <span style={{ flex: '1 1 auto' }}>{lab(x.bucket)}</span>
                          <span style={{ width: 80, textAlign: 'right' }}>{fm(x.income)}</span>
                          {fin.pro && !fin.filtered && <span style={{ width: 80, textAlign: 'right', color: '#b45309' }}>{x.expenses ? `−${fm(x.expenses)}` : '–'}</span>}
                          {fin.pro && !fin.filtered && <span style={{ width: 80, textAlign: 'right', fontWeight: 700, color: x.profit >= 0 ? '#059669' : '#dc2626' }}>{fm(x.profit)}</span>}
                        </div>
                      ))}
                    </div>
                  </>)}
                  {fin.pro && <div style={{ marginTop: 10 }}><a style={{ ...btn('#059669'), textDecoration: 'none', display: 'inline-block' }} href={`/api/site/finance-export?from=${fin.from}&to=${fin.to}`}>Download Excel ({fin.from} to {fin.to})</a></div>}
                </>);
              })()}
            </div>

            {fin && fin.pro && !fin.error && <>
              <div style={box}>
                <strong>Sales by staff member</strong>
                <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 8px' }}>Uses the person you chose on each booking in the Bookings tab.</p>
                {fin.byStaff.length === 0 ? <div style={{ fontSize: 14, color: '#6b7280' }}>No completed visits in these dates.</div> : fin.byStaff.map((x) => (
                  <div key={x.id || 'none'} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '6px 0', borderTop: '1px solid #f3f4f6' }}><span>{x.name} · {x.visits} visit{x.visits === 1 ? '' : 's'}</span><strong>{fm(x.income)}</strong></div>
                ))}
              </div>
              {fin.byService.length > 0 && <div style={box}>
                <strong>Income by service</strong>
                {fin.byService.map((x) => (<div key={x.service} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '6px 0', borderTop: '1px solid #f3f4f6' }}><span>{x.service} · {x.visits}</span><span>{fm(x.income)}</span></div>))}
              </div>}
              <div style={box}>
                <strong>Expenses</strong>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '8px 0' }}>
                  <input type="date" style={{ ...inp, width: 'auto', marginBottom: 0 }} value={exp.date} onChange={(e) => setExp({ ...exp, date: e.target.value })} />
                  <select style={{ ...inp, width: 'auto', marginBottom: 0 }} value={exp.category} onChange={(e) => setExp({ ...exp, category: e.target.value })}>
                    {['Rent', 'Supplies', 'Stock', 'Staff pay', 'Marketing', 'Travel', 'Software', 'Utilities', 'Insurance', 'Other'].map((c) => (<option key={c}>{c}</option>))}
                  </select>
                  <input style={{ ...inp, width: 110, marginBottom: 0 }} type="number" min="0" step="0.01" placeholder={`Amount (${sym})`} value={exp.amount} onChange={(e) => setExp({ ...exp, amount: e.target.value })} />
                  <input style={{ ...inp, flex: '1 1 140px', width: 'auto', marginBottom: 0 }} maxLength={200} placeholder="Note (optional)" value={exp.note} onChange={(e) => setExp({ ...exp, note: e.target.value })} />
                  <button style={btn('#2563eb')} disabled={exp.busy || !exp.amount} onClick={addExpense}>Add</button>
                </div>
                {exp.msg && <div style={{ fontSize: 13, color: exp.msg.includes('✓') ? '#059669' : '#dc2626', marginBottom: 6 }}>{exp.msg}</div>}
                <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 6px' }}>Date left empty means today. Showing expenses for the dates chosen above.</p>
                {fin.byCategory.length > 0 && <div style={{ fontSize: 13, margin: '6px 0 8px', color: '#374151' }}>{fin.byCategory.map((c) => `${c.category} ${fm(c.total)}`).join(' · ')}</div>}
                {fin.expenses.length === 0 ? <div style={{ fontSize: 14, color: '#6b7280' }}>No expenses in these dates.</div> : fin.expenses.map((x) => (
                  <div key={x.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 13, padding: '6px 0', borderTop: '1px solid #f3f4f6' }}>
                    <span style={{ flex: 1, minWidth: 0 }}>{x.date} · {x.category}{x.note ? ` · ${x.note}` : ''}</span>
                    <strong>{fm(x.amount)}</strong>
                    <button style={sm('#dc2626')} onClick={() => delExpense(x.id)}>Delete</button>
                  </div>
                ))}
              </div>
            </>}
          </>)}

          {tab === 'reviews' && (!slug ? needSave : reviews === null ? <div style={box}>Loading reviews…</div> : <>
            <div style={box}>
              <strong>Customer reviews</strong>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '6px 0 0' }}>The day after you mark a visit Completed, the customer gets an email with five stars to tap (only if they gave an email). Their rating and comment show on your page and in the directory. You can hide a review, but you cannot change what they wrote.</p>
              {reviews.length > 0 && <p style={{ fontSize: 14, margin: '8px 0 0' }}>Average {(reviews.filter((r) => !r.hidden).reduce((t, r) => t + r.rating, 0) / Math.max(1, reviews.filter((r) => !r.hidden).length)).toFixed(1)} of 5 from {reviews.filter((r) => !r.hidden).length} shown reviews</p>}
            </div>
            {reviews.length === 0 && <div style={box}>No reviews yet. Mark visits Completed and they will start to arrive.</div>}
            {reviews.map((r) => (
              <div key={r.id} style={{ ...box, opacity: r.hidden ? 0.55 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>{r.customer}</strong><span style={{ color: '#f59e0b' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span></div>
                {r.comment && <p style={{ margin: '6px 0', fontSize: 14 }}>{r.comment}</p>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#6b7280' }}><span>{r.created}{r.hidden ? ' · hidden' : ''}</span><button style={sm('#374151')} onClick={() => hideReview(r.id, !r.hidden)}>{r.hidden ? 'Show' : 'Hide'}</button></div>
              </div>
            ))}
          </>)}

          {tab === 'bookings' && (<>
            <div style={{ ...box, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 14 }}>{bookings.length} bookings · {new Set(bookings.map((b) => String(b.contact).toLowerCase())).size} customers</span>
              <a href="/api/site/export?type=bookings" style={{ ...btn('#059669'), textDecoration: 'none' }}>Download Excel</a>
            </div>
            {bookings.length === 0 && <div style={box}>No bookings yet. Share your live site link to get started.</div>}
            {bookings.length > 0 && (() => {
              const today = new Date(Date.now()).toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
              const td = bookings.filter((b) => b.date === today && ['pending', 'approved'].includes(b.status));
              const waiting = bookings.filter((b) => b.status === 'pending').length;
              return (<div style={box}>
                <strong>Today</strong>
                <div style={{ fontSize: 14, marginTop: 6, lineHeight: 1.7 }}>
                  {td.length} appointment{td.length === 1 ? '' : 's'} today, worth {fm(td.reduce((t, b) => t + (Number(b.price) || 0), 0))}<br />
                  {waiting} waiting for your answer · {dueList.length} customers due for a visit
                </div>
                {td.sort((a, b) => String(a.time).localeCompare(String(b.time))).map((b) => (<div key={b.id} style={{ fontSize: 13, color: '#374151', borderTop: '1px solid #f3f4f6', padding: '4px 0', marginTop: 4 }}>{b.time} · {b.customer} · {b.service}{b.staff_name ? ` · ${b.staff_name}` : ''}</div>))}
              </div>);
            })()}
            {staff.staff.length > 0 && bookings.length > 0 && (
              <div style={{ ...box, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13 }}>Show bookings for</span>
                <select style={{ ...inp, width: 'auto', marginBottom: 0 }} value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)}>
                  <option value="all">Everyone</option><option value="none">Not assigned</option>
                  {staff.staff.map((x) => (<option key={x.id} value={String(x.id)}>{x.name}</option>))}
                </select>
              </div>
            )}
            {bookMsg && <div style={{ ...box, fontSize: 13 }}>{bookMsg}</div>}
            {bookings.filter((b) => staffFilter === 'all' || (staffFilter === 'none' ? !b.staff_id : String(b.staff_id) === staffFilter)).map((b) => (
              <div key={b.id} style={box}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                  <span>{b.customer}</span>
                  <span>{fm(b.price)}{b.source === 'negotiated' && b.list_price && Number(b.list_price) !== Number(b.price) ? <span style={{ color: '#6b7280', fontWeight: 400, textDecoration: 'line-through', marginLeft: 6 }}>{fm(b.list_price)}</span> : null}</span>
                </div>
                <div style={{ fontSize: 14, color: '#374151' }}>{b.service} · {b.date} {b.time}</div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>{b.contact}</div>
                {b.risk && b.risk.reasons.length > 0 && <div style={{ fontSize: 12, color: '#6b7280' }}>Why: {b.risk.reasons.join(', ')}</div>}
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Booked {b.created} · {b.source === 'negotiated' ? 'negotiated price' : 'website'}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={pill(b.status)}>{String(b.status).replace('_', ' ')}</span>
                  {b.risk && <span title={b.risk.reasons.join(', ')} style={{ fontSize: 11, fontWeight: 700, color: RISK_COLOR[b.risk.label], border: `1px solid ${RISK_COLOR[b.risk.label]}`, padding: '1px 8px', borderRadius: 999 }}>No-show risk: {b.risk.label} ({Math.round(b.risk.p * 100)}%)</span>}
                  {b.deposit_amount > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: b.deposit_paid ? '#059669' : '#d97706', border: `1px solid ${b.deposit_paid ? '#059669' : '#d97706'}`, padding: '1px 8px', borderRadius: 999 }}>{b.deposit_paid ? `Deposit paid ${fm(b.deposit_amount)}` : `Deposit unpaid ${fm(b.deposit_amount)}`}</span>}
                  {b.gift_applied > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', border: '1px solid #7c3aed', padding: '1px 8px', borderRadius: 999 }}>Gift card −{fm(b.gift_applied)}</span>}
                  {b.loyalty_applied && <span style={{ fontSize: 11, fontWeight: 700, color: '#0891b2', border: '1px solid #0891b2', padding: '1px 8px', borderRadius: 999 }}>Loyalty discount</span>}
                  {staff.staff.length > 0 && (
                    <select style={{ ...inp, width: 'auto', marginBottom: 0, padding: '4px 8px', fontSize: 12 }} value={b.staff_id || ''} onChange={(e) => assignStaff(b.id, e.target.value)}>
                      <option value="">Not assigned</option>
                      {staff.staff.map((x) => (<option key={x.id} value={String(x.id)}>{x.name}</option>))}
                    </select>
                  )}
                  {b.paid && <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', border: '1px solid #059669', padding: '1px 8px', borderRadius: 999 }}>Paid{b.paid_method ? ` · ${b.paid_method}` : ''}</span>}
                  {waLink(b) && <a href={waLink(b)} target="_blank" rel="noreferrer" style={{ ...sm('#25d366'), textDecoration: 'none' }}>WhatsApp</a>}
                  {BOOKING_STATUSES.filter((s) => s !== b.status).map((s) => (<button key={s} style={sm(STATUS_COLOR[s])} onClick={() => setBookingStatus(b.id, s)}>{s.replace('_', ' ')}</button>))}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: '1px solid #f3f4f6' }}>
                  {!b.paid ? (<>
                    <select style={{ ...inp, width: 'auto', marginBottom: 0, padding: '4px 8px', fontSize: 12 }} value={payMethod[b.id] || 'cash'} onChange={(e) => setPayMethod((m) => ({ ...m, [b.id]: e.target.value }))}>
                      <option value="cash">Cash</option><option value="bank transfer">Bank transfer</option><option value="card">Card</option><option value="other">Other</option>
                    </select>
                    <button style={sm('#059669')} onClick={() => markPaid(b.id, true)}>Mark paid</button>
                  </>) : (<button style={sm('#6b7280')} onClick={() => markPaid(b.id, false)}>Undo paid</button>)}
                  <a href={`/api/site/invoice?id=${encodeURIComponent(b.id)}`} target="_blank" rel="noreferrer" style={{ ...sm('#2563eb'), textDecoration: 'none' }}>{b.paid ? 'Print receipt' : 'Print invoice'}</a>
                  {String(b.contact).includes('@') && <button style={sm('#7c3aed')} onClick={() => emailInvoice(b.id)}>Email it</button>}
                </div>
              </div>
            ))}
          </>)}

          {tab === 'customers' && (!slug ? needSave : customers === null ? <div style={box}>Loading customers…</div> : <>
            <div style={{ ...box, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 14 }}>{customers.length} customers · {customers.filter((c) => c.completed >= 3).length} regulars · {fm(customers.reduce((t, c) => t + c.spent, 0))} from completed visits</span>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{custMsg && <span style={{ fontSize: 12, color: '#059669' }}>{custMsg}</span>}<button style={btn('#059669')} onClick={downloadCustomers}>Download</button></span>
            </div>
            <div style={box}>
              <strong>Bring in your existing customers</strong>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 8px' }}>Paste one customer per line: name, email or phone, last visit date (like 2026-09-14), service, amount spent. Only the first two are needed. Or choose a CSV file from Excel.</p>
              <textarea style={{ ...inp, minHeight: 90, fontFamily: 'monospace', fontSize: 13 }} placeholder={'Amina Bello, amina@email.com, 2026-09-14, Braids, 60\nJohn Smith, 07700 900123'} value={imp.text} onChange={(e) => setImp({ ...imp, text: e.target.value, msg: '' })} />
              <input type="file" accept=".csv,.txt" style={{ fontSize: 13, marginBottom: 8 }} onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) f.text().then((t) => setImp((i) => ({ ...i, text: t.slice(0, 200000), msg: '' }))); }} />
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, marginBottom: 8 }}>
                <input type="checkbox" style={{ marginTop: 3 }} checked={imp.consent} onChange={(e) => setImp({ ...imp, consent: e.target.checked })} /> I have permission to contact these customers (they are my own customers and have not asked me to stop).
              </label>
              <button style={btn('#2563eb')} disabled={imp.busy || !imp.text.trim() || !imp.consent} onClick={runImport}>{imp.busy ? 'Importing…' : 'Import customers'}</button>
              {imp.msg && <span style={{ fontSize: 13, marginLeft: 10, color: imp.ok ? '#059669' : '#dc2626' }}>{imp.msg}</span>}
            </div>
            <div style={box}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <strong>Due for a visit: {dueList.length}</strong>
                <span style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                  Last visit over
                  <select style={{ ...inp, width: 'auto', marginBottom: 0, padding: '6px 8px' }} value={dueDaysEff} onChange={(e) => setDueDays(Number(e.target.value))}>
                    {[14, 21, 28, 42, 56, 90].map((n) => (<option key={n} value={n}>{n} days ago</option>))}
                  </select>
                  <button style={sm('#6b7280')} onClick={() => setShowDue(!showDue)}>{showDue ? 'Hide' : 'Show'}</button>
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '6px 0 0' }}>People whose last Completed visit was that long ago, who have nothing booked. Once you message someone they leave this list until their next visit.</p>
              {showDue && dueList.length > 0 && (<>
                {dueList.some((c) => String(c.contact).includes('@')) && (
                  <button style={{ ...btn('#2563eb'), marginTop: 10 }} onClick={emailAllDue}>Email everyone due ({Math.min(25, dueList.filter((c) => String(c.contact).includes('@')).length)} at a time)</button>
                )}
                {dueList.map((c) => {
                  const isMail = String(c.contact).includes('@');
                  const wa = isMail ? null : rebookLink(c);
                  return (
                    <div key={c.k} style={{ borderTop: '1px solid #f3f4f6', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14 }}><b>{c.name}</b> <span style={{ color: '#6b7280' }}>· last visit {c.last_visit}</span></span>
                      {wa && <a href={wa} target="_blank" rel="noreferrer" onClick={() => markContacted([c])} style={{ ...sm('#25d366'), textDecoration: 'none' }}>WhatsApp them</a>}
                      {isMail && <button style={sm('#6b7280')} onClick={() => markContacted([c])}>Mark as messaged</button>}
                    </div>
                  );
                })}
                <p style={{ fontSize: 12, color: '#6b7280', margin: '10px 0 0' }}>Emails go as hidden copies (BCC), so customers cannot see each other. Your email app opens with the message ready. Press send there.</p>
              </>)}
            </div>
            <input style={inp} placeholder="Search by name or contact" value={custQ} onChange={(e) => setCustQ(e.target.value)} />
            {customers.length === 0 && <div style={box}>No customers yet. People appear here after their first booking. Mark visits as Completed on the Bookings tab so spending and regulars are counted.</div>}
            {customers.filter((c) => !custQ || `${c.name} ${c.contact}`.toLowerCase().includes(custQ.toLowerCase())).map((c) => {
              const tag = c.completed >= 3 ? ['Regular', '#059669'] : c.bookings === 1 ? ['New', '#2563eb'] : null;
              const link = rebookLink(c);
              return (
                <div key={c.k} style={box}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontWeight: 600 }}>
                    <span>{c.name}{tag && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: tag[1], border: `1px solid ${tag[1]}`, padding: '1px 8px', borderRadius: 999 }}>{tag[0]}</span>}</span>
                    <span>{fm(c.spent)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>{c.contact}</div>
                  <div style={{ fontSize: 13, color: '#374151', margin: '4px 0 8px' }}>
                    {c.bookings} booking{c.bookings === 1 ? '' : 's'} · {c.completed} completed{c.no_shows > 0 ? ` · ${c.no_shows} no-show${c.no_shows === 1 ? '' : 's'}` : ''}
                    {c.last_visit ? ` · last visit ${c.last_visit}` : ''}{c.next_booking ? ` · next ${c.next_booking}` : ''}
                  </div>
                  <textarea style={{ ...inp, minHeight: 56, resize: 'vertical' }} placeholder="Private notes (preferences, allergies, what they like)" defaultValue={c.notes} onBlur={(e) => { if (e.target.value !== c.notes) saveCustomer(c, { notes: e.target.value }); }} />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {link && <a href={link} target="_blank" rel="noreferrer" style={{ ...sm(String(c.contact).includes('@') ? '#2563eb' : '#25d366'), textDecoration: 'none' }}>{String(c.contact).includes('@') ? 'Email them' : 'WhatsApp them'}</a>}
                    <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, color: '#6b7280' }}>
                      <input type="checkbox" checked={!!c.optout} onChange={(e) => saveCustomer(c, { optout: e.target.checked })} /> Do not send automatic reminders
                    </label>
                  </div>
                </div>
              );
            })}
          </>)}

          {tab === 'giftcards' && (!slug ? needSave : <>
            {plan === 'starter' && <div style={box}>Gift cards are a Professional plan feature. <button type="button" style={{ background: 'none', border: 0, color: '#2563eb', cursor: 'pointer', padding: 0, textDecoration: 'underline' }} onClick={() => setTab('billing')}>See plans</button></div>}
            {!data.giftCards && plan !== 'starter' && <div style={box}>Gift cards are switched off. Turn them on in the Design tab under “Bring customers back and sell gift cards”, then press Save.</div>}
            <div style={box}>
              <strong>Customer paying with a gift card?</strong>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 8px' }}>Type the code they show you, check the balance, then take off what they spend.</p>
              <input style={inp} placeholder="Code, like AB3D-7KQ2" value={redeem.code} onChange={(e) => setRedeem({ ...redeem, code: e.target.value.toUpperCase(), msg: '', balance: null })} />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button style={btn('#374151')} disabled={redeem.busy || !redeem.code} onClick={() => runRedeem(false)}>Check balance</button>
                {redeem.balance !== null && <>
                  <input style={{ ...inp, width: 140, marginBottom: 0 }} type="number" min="0" step="0.01" placeholder={`Use (${sym})`} value={redeem.amount} onChange={(e) => setRedeem({ ...redeem, amount: e.target.value })} />
                  <button style={btn('#059669')} disabled={redeem.busy || !redeem.amount} onClick={() => runRedeem(true)}>Use this amount</button>
                </>}
              </div>
              {redeem.msg && <p style={{ fontSize: 14, margin: '10px 0 0', color: redeem.ok ? '#059669' : '#dc2626' }}>{redeem.msg}</p>}
            </div>
            {cards === null ? <div style={box}>Loading gift cards…</div> : cards.length === 0 ? <div style={box}>No gift cards sold yet.</div> : (
              <div style={box}>
                <strong>{cards.length} sold · {fm(cards.reduce((t, c) => t + c.amount, 0))} · {fm(cards.reduce((t, c) => t + c.balance, 0))} still to be used</strong>
                {cards.map((c) => (
                  <div key={c.id} style={{ borderTop: '1px solid #f3f4f6', marginTop: 10, paddingTop: 10, fontSize: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}><span style={{ letterSpacing: 1 }}>{c.code}</span><span>{fm(c.balance)} / {fm(c.amount)}</span></div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Bought by {c.buyer_name} ({c.buyer_email}) on {c.created}{c.recipient_name ? ` for ${c.recipient_name}` : ''}</div>
                  </div>
                ))}
              </div>
            )}
          </>)}

          {tab === 'orders' && (<>
            <div style={{ ...box, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 14 }}>{orders.length} orders</span>
              <a href="/api/site/export?type=orders" style={{ ...btn('#059669'), textDecoration: 'none' }}>Download Excel</a>
            </div>
            {orders.length === 0 && <div style={box}>No orders yet.</div>}
            {orders.map((o) => (
              <div key={o.id} style={box}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}><span>#{o.id} · {o.customer}</span><span>{fm(o.total)}</span></div>
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

          {tab === 'growth' && (!slug ? needSave : <>
            <div style={box}>
              <strong>Your referral link</strong>
              <p style={{ fontSize: 14, color: '#374151' }}>Share this with other professionals. When they sign up through it, it is counted here. <b>You get one free month of Professional each time a business you referred pays for a plan</b> (up to 12 a year).</p>
              {growth ? (<>
                <code style={{ fontSize: 13, wordBreak: 'break-all', display: 'block', marginBottom: 8 }}>{typeof window !== 'undefined' ? `${window.location.origin}/r/${growth.refCode}` : ''}</code>
                <button style={sm('#374151')} onClick={() => copy(`${window.location.origin}/r/${growth.refCode}`)}>{copied ? 'Copied ✓' : 'Copy link'}</button>
                <a style={{ ...sm('#25d366'), textDecoration: 'none', marginLeft: 8 }} target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`Build a booking website in minutes: ${window.location.origin}/r/${growth.refCode}`)}`}>WhatsApp</a>
                <div style={{ display: 'flex', gap: 24, marginTop: 14 }}>
                  <div><div style={{ fontSize: 24, fontWeight: 700 }}>{growth.signups}</div><div style={{ fontSize: 12, color: '#6b7280' }}>sign-ups</div></div>
                  <div><div style={{ fontSize: 24, fontWeight: 700 }}>{growth.published}</div><div style={{ fontSize: 12, color: '#6b7280' }}>published sites</div></div>
                </div>
              </>) : <div style={{ fontSize: 14 }}>Loading…</div>}
            </div>
            <div style={box}>
              <strong>QR code for your site</strong>
              <p style={{ fontSize: 14, color: '#374151' }}>Print it on a business card, window or flyer. Customers scan it and land on your booking page.</p>
              {qr ? (<>
                <img src={qr} alt="QR code for your site" style={{ width: 200, height: 200, display: 'block', marginBottom: 8, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }} />
                <a style={{ ...btn('#059669'), textDecoration: 'none', display: 'inline-block' }} href={qr} download={`${slug}-qr.png`}>Download PNG</a>
              </>) : <button style={btn('#2563eb')} onClick={makeQr}>Generate QR code</button>}
            </div>
            <div style={box}>
              <strong>Your profession page</strong>
              <p style={{ fontSize: 14, color: '#374151' }}>Public pages that rank on Google for each trade. Share the one that matches your work.</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {PROFESSIONS.map((p) => (<a key={p.slug} href={`/for/${p.slug}`} target="_blank" rel="noreferrer" style={{ ...sm('#374151'), textDecoration: 'none' }}>{p.name}</a>))}
              </div>
            </div>
          </>)}

          {tab === 'payments' && (!slug ? needSave : <>
            <div style={box}>
              <strong>Get paid by card</strong>
              <p style={{ fontSize: 14, color: '#374151' }}>Your shop currency is <b>{cur}</b>. Change it on the Design tab under Region and tax. We never see or store your bank or card details, the payment partner does.</p>
              {payInfo?.active && (
                <div style={{ color: '#059669', fontWeight: 600 }}>
                  Card payments are live through {payInfo.active === 'paystack' ? 'Paystack' : 'Flutterwave'} ✓
                  <button style={{ ...sm('#6b7280'), marginLeft: 10 }} onClick={turnOffCards}>Turn off</button>
                </div>
              )}
            </div>

            {payInfo?.africa ? (
              (payInfo.paystack.configured || payInfo.flutterwave.configured) ? (
                <div style={box}>
                  <strong>Connect your bank account</strong>
                  <p style={{ fontSize: 13, color: '#6b7280' }}>Customer payments go to your bank, minus a small platform fee and the provider's charges.</p>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                    {payInfo.paystack.configured && <button style={btn(payForm.provider === 'paystack' ? '#111827' : '#6b7280')} onClick={() => chooseProvider('paystack')}>Use Paystack</button>}
                    {payInfo.flutterwave.configured && <button style={btn(payForm.provider === 'flutterwave' ? '#111827' : '#6b7280')} onClick={() => chooseProvider('flutterwave')}>Use Flutterwave</button>}
                  </div>
                  {payForm.provider && (<>
                    <span style={lbl}>Bank</span>
                    <select style={inp} value={payForm.bankCode} onChange={(e) => setPayForm({ ...payForm, bankCode: e.target.value, accountName: '', ok: false })}>
                      <option value="">{payForm.busy && !banks.length ? 'Loading banks…' : 'Choose your bank'}</option>
                      {banks.map((bk) => (<option key={bk.code} value={bk.code}>{bk.name}</option>))}
                    </select>
                    <span style={lbl}>Account number</span>
                    <input style={inp} inputMode="numeric" value={payForm.accountNumber} onChange={(e) => setPayForm({ ...payForm, accountNumber: e.target.value.replace(/\D/g, ''), accountName: '', ok: false })} />
                    {payForm.accountName && <div style={{ fontSize: 14, color: '#059669', marginBottom: 8 }}>Account name: <b>{payForm.accountName}</b></div>}
                    <button style={btn('#374151')} disabled={payForm.busy || !payForm.bankCode || payForm.accountNumber.length < 6} onClick={verifyAccount}>Check account name</button>
                    <button style={{ ...btn('#2563eb'), marginLeft: 8 }} disabled={payForm.busy || !payForm.bankCode || payForm.accountNumber.length < 6} onClick={savePayout}>Save and switch on card payments</button>
                    {payForm.msg && <div style={{ fontSize: 13, color: '#dc2626', marginTop: 8 }}>{payForm.msg}</div>}
                  </>)}
                </div>
              ) : (
                <div style={box}><span style={{ fontSize: 14 }}>Card payments in {cur} are not switched on for the platform yet. Customers can still order and pay you in person.</span></div>
              )
            ) : (
              <div style={box}>
                <strong>Connect payouts with Stripe</strong>
                <p style={{ fontSize: 14, color: '#374151' }}>You enter your bank details on Stripe's own secure page. Customer card payments for your products then go straight to your bank.</p>
                {!stripe.configured && <p style={{ fontSize: 13, color: '#dc2626' }}>Card payments are not switched on for the platform yet.</p>}
                {stripe.ready ? (
                  <div style={{ color: '#059669', fontWeight: 600 }}>Payouts connected ✓ Card payments are live on your shop.</div>
                ) : (<>
                  {stripe.connected && <p style={{ fontSize: 13, color: '#d97706' }}>Setup started but not finished. Continue to finish verification.</p>}
                  {!stripe.connected && (<>
                    <span style={lbl}>Country of your business</span>
                    <select style={inp} value={stripeCountry} onChange={(e) => setStripeCountry(e.target.value)}>
                      {[['GB', 'United Kingdom'], ['IE', 'Ireland'], ['FR', 'France'], ['DE', 'Germany'], ['ES', 'Spain'], ['IT', 'Italy'], ['NL', 'Netherlands'], ['BE', 'Belgium'], ['PT', 'Portugal'], ['AT', 'Austria'], ['US', 'United States'], ['CA', 'Canada'], ['AU', 'Australia']].map(([c, n]) => (<option key={c} value={c}>{n}</option>))}
                    </select>
                  </>)}
                  <button style={btn('#2563eb')} onClick={connectStripe} disabled={!stripe.configured}>{stripe.connected ? 'Continue Stripe setup' : 'Connect payouts with Stripe'}</button>
                  <button style={{ ...btn('#6b7280'), marginLeft: 8 }} onClick={loadStripe}>Refresh status</button>
                </>)}
              </div>
            )}
            <p style={{ fontSize: 12, color: '#6b7280' }}>Until payouts are connected, customers can still place orders and pay you in person.</p>
          </>)}

          {tab === 'billing' && (<>
            {billMsg && <div style={{ ...box, color: '#374151' }}>{billMsg}</div>}
            {!billing ? <div style={box}>Loading…</div> : (<>
              <div style={box}>
                <strong>Your plan</strong>
                <div style={{ fontSize: 15, marginTop: 6 }}>
                  {billing.current?.active
                    ? <>{billing.current.plan === 'biz' ? 'Business' : 'Professional'} ({billing.current.cycle}) · {billing.current.status} · renews or ends {new Date(billing.current.expires_at).toLocaleDateString()}</>
                    : 'Starter (free): up to 8 services, 6 photos and 2 staff, with a small GNIS badge on your site'}
                </div>
              </div>
              <div style={box}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button style={btn(cycle === 'monthly' ? '#111827' : '#6b7280')} onClick={() => setCycle('monthly')}>Monthly</button>
                  <button style={btn(cycle === 'yearly' ? '#111827' : '#6b7280')} onClick={() => setCycle('yearly')}>Yearly (save 20%)</button>
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <label style={{ fontSize: 13, color: '#374151' }}>Your country</label>
                  <select value={billing.region} onChange={(e) => pickRegion(e.target.value)} style={{ padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }}>
                    {(billing.regions || []).map((r) => <option key={r.code} value={r.code}>{r.name} ({r.currency})</option>)}
                  </select>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>Prices in {billing.currency}</span>
                </div>
                {[['pro', 'Professional', 'Booking deposits, automatic WhatsApp reminders, up to 30 services and 12 photos, no GNIS badge, up to 5 staff'], ['biz', 'Business', 'Everything in Professional, up to 10 staff, priority support']].map(([key, name, blurb]) => {
                  const p = billing.prices[key][cycle];
                  const f = (n) => { try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: billing.currency, maximumFractionDigits: 0 }).format(n); } catch { return `${billing.currency} ${n}`; } };
                  return (
                    <div key={key} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontWeight: 700 }}><span>{name}</span><span>{f(p.perMonth)}/month</span></div>
                      <div style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 10px' }}>{blurb}{cycle === 'yearly' ? ` · billed ${f(p.amount)} once a year` : ''}</div>
                      <button style={btn('#2563eb')} disabled={!billing.provider} onClick={() => startPlan(key)}>Choose {name}</button>
                    </div>
                  );
                })}
                {!billing.provider && <div style={{ fontSize: 13, color: '#dc2626' }}>Card payments for plans are not switched on for your region yet.</div>}
                {billing.provider && ['paystack', 'flutterwave'].includes(billing.provider) && <div style={{ fontSize: 12, color: '#6b7280' }}>In your region plans are paid for one period at a time. We remind you before your plan ends.</div>}
              </div>
            </>)}
          </>)}
        </div>

        <div style={{ flex: '1 1 420px', minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>LIVE PREVIEW</div>
          <div style={{ border: '1px solid #d1d5db', borderRadius: 12, overflow: 'hidden', maxHeight: '80vh', overflowY: 'auto', background: '#fff' }}>
            <SiteRenderer slug={slug || ''} template={template} data={data} preview payOnline={stripe.ready} showBadge={plan === 'starter'} />
          </div>
        </div>
      </div>
    </div>
  );
}
