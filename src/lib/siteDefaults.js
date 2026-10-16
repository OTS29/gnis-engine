export const TEMPLATE_LIST = [
  { id: 'classic', name: 'Classic', blurb: 'Clean and trustworthy' },
  { id: 'bold', name: 'Bold', blurb: 'Big type, strong colour' },
  { id: 'minimal', name: 'Minimal', blurb: 'Quiet and spacious' },
  { id: 'elegant', name: 'Elegant', blurb: 'Serif, refined' },
  { id: 'dark', name: 'Dark Studio', blurb: 'Dark, premium feel' },
];

export const ACCENTS = ['#2563eb', '#059669', '#dc2626', '#d97706', '#7c3aed', '#db2777', '#0f172a'];

export const BOOKING_STATUSES = ['pending', 'approved', 'completed', 'cancelled', 'no_show'];
export const ORDER_STATUSES = ['pending', 'paid', 'fulfilled', 'cancelled'];

export const CURRENCIES = ['GBP', 'EUR', 'USD', 'CAD', 'AUD', 'CHF', 'NGN', 'GHS', 'KES', 'ZAR'];
// Currencies we let Stripe charge in. Others work for bookings and pay-in-person orders only.
export const STRIPE_CURRENCIES = ['GBP', 'EUR', 'USD', 'CAD', 'AUD', 'CHF'];
export const LANGUAGES = [
  { id: 'en', name: 'English', locale: 'en-GB' },
  { id: 'fr', name: 'Français', locale: 'fr-FR' },
  { id: 'es', name: 'Español', locale: 'es-ES' },
  { id: 'pt', name: 'Português', locale: 'pt-PT' },
  { id: 'de', name: 'Deutsch', locale: 'de-DE' },
];

export function formatMoney(amount, currency = 'GBP', lang = 'en') {
  const locale = (LANGUAGES.find((l) => l.id === lang) || LANGUAGES[0]).locale;
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: Number.isInteger(Number(amount)) ? 0 : 2 }).format(Number(amount) || 0);
  } catch {
    return `${currency} ${(Number(amount) || 0).toFixed(2)}`;
  }
}

export const DEFAULT_DATA = {
  businessName: 'Your Business Name',
  tagline: 'What you do, in one line',
  about: 'Tell visitors who you are, your experience and why they should book you.',
  phone: '',
  email: '',
  location: '',
  hours: 'Mon–Sat, 9am–6pm',
  accent: '#2563eb',
  hero: '',
  currency: 'GBP',
  language: 'en',
  taxRate: 0,
  taxIncluded: true,
  vatNumber: '',
  depositPercent: 0,
  whatsappReminders: false,
  giftCards: false,
  rebookDays: 0,
  announcement: '',
  showInTop: false,
  whatsapp: '',
  instagram: '',
  facebook: '',
  tiktok: '',
  faqs: [],
  reviews: [],
  services: [{ name: 'Consultation', price: 30, duration: '30 min', desc: 'A first session to talk through what you need.', negotiable: false, minPrice: 0 }],
  products: [],
  gallery: [],
};

const str = (v, n) => String(v ?? '').slice(0, n);

export function mergeData(d) {
  const x = d && typeof d === 'object' ? d : {};
  return {
    ...DEFAULT_DATA,
    ...x,
    faqs: Array.isArray(x.faqs) ? x.faqs : [],
    reviews: Array.isArray(x.reviews) ? x.reviews : [],
    services: Array.isArray(x.services) ? x.services : DEFAULT_DATA.services,
    products: Array.isArray(x.products) ? x.products : [],
    gallery: Array.isArray(x.gallery) ? x.gallery : [],
  };
}

export function cleanData(d) {
  const x = mergeData(d);
  const img = (v) => (typeof v === 'string' && (v.startsWith('data:image/') || /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i.test(v)) ? v : '');
  return {
    businessName: str(x.businessName, 80),
    tagline: str(x.tagline, 140),
    about: str(x.about, 1500),
    phone: str(x.phone, 40),
    email: str(x.email, 120),
    location: str(x.location, 120),
    hours: str(x.hours, 120),
    accent: /^#[0-9a-fA-F]{6}$/.test(x.accent) ? x.accent : DEFAULT_DATA.accent,
    hero: img(x.hero),
    currency: CURRENCIES.includes(x.currency) ? x.currency : 'GBP',
    language: LANGUAGES.some((l) => l.id === x.language) ? x.language : 'en',
    taxRate: Math.min(30, Math.max(0, Number(x.taxRate) || 0)),
    taxIncluded: x.taxIncluded !== false,
    vatNumber: str(x.vatNumber, 30),
    depositPercent: Math.min(100, Math.max(0, Math.round(Number(x.depositPercent) || 0))),
    whatsappReminders: !!x.whatsappReminders,
    showInTop: !!x.showInTop,
    announcement: str(x.announcement, 160),
    whatsapp: str(x.whatsapp, 30).replace(/[^\d+\s()-]/g, ''),
    instagram: str(x.instagram, 100).replace(/[\s<>"']/g, ''),
    facebook: str(x.facebook, 100).replace(/[\s<>"']/g, ''),
    tiktok: str(x.tiktok, 100).replace(/[\s<>"']/g, ''),
    faqs: x.faqs.slice(0, 8).map((f) => ({ q: str(f?.q, 140), a: str(f?.a, 600) })).filter((f) => f.q && f.a),
    reviews: x.reviews.slice(0, 6).map((r) => ({ name: str(r?.name, 60), text: str(r?.text, 400) })).filter((r) => r.name && r.text),
    giftCards: !!x.giftCards,
    rebookDays: [0, 14, 21, 28, 42, 56, 90].includes(Number(x.rebookDays)) ? Number(x.rebookDays) : 0,
    services: x.services.slice(0, 30).map((s) => {
      const price = Math.max(0, Number(s.price) || 0);
      const minPrice = Math.min(price, Math.max(0, Number(s.minPrice) || 0));
      const negotiable = !!s.negotiable && minPrice > 0 && minPrice < price;
      return { name: str(s.name, 80), price, duration: str(s.duration, 30), desc: str(s.desc, 300), negotiable, minPrice: negotiable ? minPrice : 0 };
    }).filter((s) => s.name),
    products: x.products.slice(0, 30).map((p) => ({
      name: str(p.name, 80), price: Math.max(0, Number(p.price) || 0), desc: str(p.desc, 300), image: img(p.image),
    })).filter((p) => p.name),
    gallery: x.gallery.slice(0, 12).map(img).filter(Boolean),
  };
}

const CC = { GBP: '44', NGN: '234', GHS: '233', KES: '254', ZAR: '27', USD: '1', CAD: '1', AUD: '61', EUR: '353', CHF: '41' };
// WhatsApp chat link from a phone number. Returns '' when the number is not usable.
export function waUrl(number, currency) {
  let d = String(number || '').replace(/[^\d+]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  else if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = (CC[String(currency).toUpperCase()] || '44') + d.slice(1);
  return /^\d{10,15}$/.test(d) ? `https://wa.me/${d}` : '';
}
// Social profile link from a handle ("@jojo") or a full link. Only the real network's address is allowed.
export function socialUrl(kind, v) {
  const s = String(v || '').trim();
  if (!s) return '';
  const host = { instagram: 'instagram.com', facebook: 'facebook.com', tiktok: 'tiktok.com' }[kind];
  if (!host) return '';
  if (/^https?:\/\//i.test(s)) {
    try { const u = new URL(s); return u.hostname === host || u.hostname.endsWith('.' + host) ? u.toString() : ''; } catch { return ''; }
  }
  const handle = s.replace(/^@/, '').replace(/[^A-Za-z0-9._-]/g, '');
  if (!handle) return '';
  return kind === 'tiktok' ? `https://tiktok.com/@${handle}` : `https://${host}/${handle}`;
}

// What visitors are allowed to see. The lowest accepted price must never leave the server.
export function publicData(d) {
  const x = mergeData(d);
  return { ...x, services: x.services.map(({ minPrice, ...rest }) => rest) };
}

// Gross amount for a price given the seller's tax settings.
export function withTax(price, data) {
  const rate = Number(data?.taxRate) || 0;
  if (!rate || data?.taxIncluded !== false) return Number(price) || 0;
  return Math.round((Number(price) || 0) * (1 + rate / 100) * 100) / 100;
}
