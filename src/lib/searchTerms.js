import { COUNTRY_CODES } from '@/lib/countries';

// Turns what a person types ("salon", "plumber in lagos") into safe search patterns.
// Everything returned is made only of letters, digits, spaces and hyphens, so it is safe inside a regular expression.

// Words people use for a trade, and the words we look for on business pages for each.
export const SYNONYMS = {
  salon: ['salon', 'hair', 'beauty', 'braid', 'nail', 'barber'],
  hairdresser: ['hair', 'salon', 'braid', 'barber'],
  hairdressers: ['hair', 'salon', 'braid', 'barber'],
  hair: ['hair', 'salon', 'braid', 'barber'],
  barber: ['barber', 'fade', 'hair'],
  barbershop: ['barber', 'fade', 'hair'],
  braider: ['braid', 'hair'],
  braiding: ['braid', 'hair'],
  nails: ['nail', 'manicure', 'pedicure'],
  nail: ['nail', 'manicure', 'pedicure'],
  makeup: ['makeup', 'make-up', 'bridal', 'mua'],
  mua: ['makeup', 'make-up', 'bridal'],
  beauty: ['beauty', 'makeup', 'nail', 'lash', 'skin', 'salon'],
  plumber: ['plumb', 'pipe', 'boiler', 'drain'],
  plumbing: ['plumb', 'pipe', 'boiler', 'drain'],
  electrician: ['electric', 'wiring', 'socket'],
  cleaner: ['clean', 'maid', 'laundry'],
  cleaning: ['clean', 'maid', 'laundry'],
  mechanic: ['mechanic', 'garage', 'mot', 'car service'],
  garage: ['mechanic', 'garage', 'mot'],
  tutor: ['tutor', 'lesson', 'teach'],
  teacher: ['tutor', 'lesson', 'teach'],
  trainer: ['trainer', 'fitness', 'gym', 'coach'],
  gym: ['trainer', 'fitness', 'gym'],
  photographer: ['photo'],
  photography: ['photo'],
};

// Trades shown as ideas when the search box is empty or being typed in.
export const POPULAR_TRADES = ['Hairdresser', 'Barber', 'Braider', 'Nail technician', 'Makeup artist', 'Cleaner', 'Plumber', 'Electrician', 'Mechanic', 'Tutor', 'Personal trainer', 'Photographer'];

const clean = (s, max = 40) => String(s || '').toLowerCase().replace(/[^a-z0-9\- ]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

// "plumber in lagos" -> { what: 'plumber', where: 'lagos' }
export function splitQuery(q) {
  const s = String(q || '').trim();
  const m = s.match(/^(.*?)\s+(?:in|near|around|at)\s+(.+)$/i);
  return m ? { what: m[1].trim(), where: m[2].trim() } : { what: s, where: '' };
}

// What to look for: the phrase, each word, and the trade words that mean the same thing.
export function whatPattern(q) {
  const phrase = clean(q);
  if (!phrase) return '';
  const set = new Set([phrase]);
  for (const w of phrase.split(' ')) {
    if (w.length < 3) continue;
    set.add(w);
    const stem = w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : '';
    if (stem) set.add(stem);
    for (const t of SYNONYMS[w] || []) set.add(t);
    for (const t of SYNONYMS[stem] || []) set.add(t);
  }
  for (const t of SYNONYMS[phrase] || []) set.add(t);
  return [...set].slice(0, 12).join('|');
}

export function wherePattern(q) {
  const p = clean(q, 60);
  return p.length >= 2 ? p : '';
}

// "Nigeria" -> "NG" so a country name also finds businesses listed under that country.
export function countryFromName(q) {
  const p = clean(q, 60);
  if (!p) return '';
  try {
    const dn = new Intl.DisplayNames(['en'], { type: 'region' });
    if (p === 'uk' || p === 'united kingdom' || p === 'england' || p === 'britain') return 'GB';
    for (const c of COUNTRY_CODES) { if (String(dn.of(c) || '').toLowerCase() === p) return c; }
  } catch {}
  return '';
}

// The last two parts of a free-text address, for example "Peckham, London".
export const areaOf = (loc) => String(loc || '').split(',').map((x) => x.trim()).filter(Boolean).slice(-2).join(', ');
