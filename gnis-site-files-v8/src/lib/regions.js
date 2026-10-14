// Regional pricing and detection. Edit the numbers in PLANS to change what each region sees.
// Prices are FIXED per region (not converted from pounds), so they never move with exchange rates.

export const REGIONS = {
  GB: { name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', locale: 'en-GB', sample: 1 },
  EU: { name: 'Europe', flag: '🇪🇺', currency: 'EUR', locale: 'en-IE', sample: 1.1 },
  US: { name: 'United States', flag: '🇺🇸', currency: 'USD', locale: 'en-US', sample: 1.25 },
  CA: { name: 'Canada', flag: '🇨🇦', currency: 'CAD', locale: 'en-CA', sample: 1.7 },
  AU: { name: 'Australia', flag: '🇦🇺', currency: 'AUD', locale: 'en-AU', sample: 1.9 },
  NG: { name: 'Nigeria', flag: '🇳🇬', currency: 'NGN', locale: 'en-NG', sample: 160 },
  GH: { name: 'Ghana', flag: '🇬🇭', currency: 'GHS', locale: 'en-GH', sample: 3.2 },
  KE: { name: 'Kenya', flag: '🇰🇪', currency: 'KES', locale: 'en-KE', sample: 42 },
  ZA: { name: 'South Africa', flag: '🇿🇦', currency: 'ZAR', locale: 'en-ZA', sample: 10 },
  OTHER: { name: 'Other countries', flag: '🌍', currency: 'USD', locale: 'en-US', sample: 1.25 },
};

export const REGION_ORDER = ['GB', 'EU', 'US', 'CA', 'AU', 'NG', 'GH', 'KE', 'ZA', 'OTHER'];
export const AFRICA = ['NG', 'GH', 'KE', 'ZA'];

// Monthly price of each paid plan, in the region's own currency.
export const PLANS = {
  GB: { pro: 12, biz: 29 },
  EU: { pro: 14, biz: 33 },
  US: { pro: 15, biz: 36 },
  CA: { pro: 20, biz: 48 },
  AU: { pro: 22, biz: 54 },
  NG: { pro: 6000, biz: 15000 },
  GH: { pro: 90, biz: 220 },
  KE: { pro: 1000, biz: 2500 },
  ZA: { pro: 180, biz: 450 },
  OTHER: { pro: 10, biz: 25 },
};

export const ID_METHODS = {
  NG: [['nin', 'NIN', '11-digit National ID Number (NIN)'], ['bvn', 'BVN', '11-digit Bank Verification Number (BVN)']],
  GH: [['ghana_card', 'Ghana Card', 'Ghana Card number']],
  KE: [['national_id', 'National ID', 'National ID number']],
  ZA: [['sa_id', 'SA ID', '13-digit South African ID number']],
};

const EU = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'];

export function regionFor(country) {
  const c = String(country || '').toUpperCase();
  if (c === 'GB' || c === 'UK') return 'GB';
  if (EU.includes(c)) return 'EU';
  if (REGIONS[c]) return c; // US, CA, AU, NG, GH, KE, ZA
  return c ? 'OTHER' : null;
}

// Fallback when the server gives no country: use the browser time zone, then the browser language.
const TZ = { 'Africa/Lagos': 'NG', 'Africa/Accra': 'GH', 'Africa/Nairobi': 'KE', 'Africa/Johannesburg': 'ZA', 'Europe/London': 'GB', 'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'America/Toronto': 'CA', 'America/Vancouver': 'CA' };
export function guessRegion() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (TZ[tz]) return TZ[tz];
    if (tz.startsWith('Europe/')) return 'EU';
    if (tz.startsWith('America/')) return 'US';
    const lang = (navigator.language || '').split('-')[1];
    return regionFor(lang) || 'GB';
  } catch {
    return 'GB';
  }
}

export function money(amount, region) {
  const r = REGIONS[region] || REGIONS.GB;
  try {
    return new Intl.NumberFormat(r.locale, { style: 'currency', currency: r.currency, maximumFractionDigits: 0 }).format(Number(amount) || 0);
  } catch {
    return `${r.currency} ${Math.round(Number(amount) || 0)}`;
  }
}

export function symbolOf(region) {
  const r = REGIONS[region] || REGIONS.GB;
  try {
    const part = new Intl.NumberFormat(r.locale, { style: 'currency', currency: r.currency, maximumFractionDigits: 0 }).formatToParts(0).find((p) => p.type === 'currency');
    return part ? part.value : r.currency;
  } catch {
    return r.currency;
  }
}

// Turns a sample price in pounds into a believable local sample price, rounded to a friendly number.
export function scalePrice(base, region) {
  const f = (REGIONS[region] || REGIONS.GB).sample;
  if (f === 1) return base;
  const v = base * f;
  if (v < 20) return Math.max(1, Math.round(v));
  if (v < 100) return Math.round(v / 5) * 5;
  const step = Math.pow(10, Math.floor(Math.log10(v)) - 1) * 5;
  return Math.round(v / step) * step;
}

export function planPrices(region, cycle) {
  const p = PLANS[region] || PLANS.GB;
  const out = {};
  for (const k of ['pro', 'biz']) {
    const m = p[k];
    const round = (n) => (n >= 1000 ? Math.round(n / 10) * 10 : Math.round(n));
    out[k] = {
      perMonth: cycle === 'yearly' ? round(m * 0.8) : m,
      billedYearly: round(m * 12 * 0.8),
    };
  }
  return out;
}
