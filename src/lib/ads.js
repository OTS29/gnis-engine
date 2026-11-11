import { sql } from '@/lib/db';
import { liveSession, isOwnerRole } from '@/lib/session';
import { NextResponse } from 'next/server';

// ADS_MODE: off (default) | test | live.
//  off  = nobody sees anything about adverts.
//  test = admins and ADS_TESTERS (comma separated emails) can place adverts; payment is pretend and the advert is only
//         shown to those same people, never to the public.
//  live = real card payments. Needs ADS_LIVE_OK=yes as a second switch, so setting live by mistake does nothing.
export function adsMode() {
  const m = String(process.env.ADS_MODE || 'off').toLowerCase();
  if (m === 'live') return process.env.ADS_LIVE_OK === 'yes' ? 'live' : 'test';
  return m === 'test' ? 'test' : 'off';
}
export function isAdTester(email, role) {
  if (role === 'admin') return true;
  const list = String(process.env.ADS_TESTERS || '').toLowerCase().split(',').map((x) => x.trim()).filter(Boolean);
  return !!email && list.includes(String(email).toLowerCase());
}

// SUGGESTED prices in GBP. Change them here. Prices are always set by the server, never by the browser.
export const AD_CURRENCY = 'GBP';
export const PACKAGES = [
  { id: 'd7', days: 7, price: 12, label: '7 days' },
  { id: 'd14', days: 14, price: 20, label: '14 days' },
  { id: 'd30', days: 30, price: 35, label: '30 days' },
];
export const CTAS = ['View business', 'Book now', 'See services'];
export const TERMS_VERSION = 'draft-1';
export const MAX_OPEN_ADS = 3;

export const STATUS_LABEL = {
  pending_payment: 'Waiting for payment', pending_review: 'Paid, waiting for review', live: 'Live', rejected: 'Not approved', cancelled: 'Cancelled', expired: 'Finished',
};

const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
// Adverts may only send people to the advertiser's own GNIS page, so no links, emails or phone numbers inside the text.
const OUTSIDE = /(https?:|www\.|\S+@\S+|\.com\b|\.co\.uk\b|\.ng\b|\bwhatsapp\b|\d[\d\s-]{7,}\d)/i;

export function validateAd(b) {
  const headline = clean(b?.headline, 60);
  const body = clean(b?.body, 140);
  const cta = CTAS.includes(b?.cta) ? b.cta : CTAS[0];
  const pkg = PACKAGES.find((p) => p.id === b?.packageId);
  if (headline.length < 3) return { ok: false, error: 'Add a headline of at least 3 characters.' };
  if (body.length < 10) return { ok: false, error: 'Add a short description of at least 10 characters.' };
  if (OUTSIDE.test(headline) || OUTSIDE.test(body)) return { ok: false, error: 'Please remove web links, emails and phone numbers. Your advert sends people to your GNIS page.' };
  if (!pkg) return { ok: false, error: 'Choose how long the advert should run.' };
  if (b?.agree !== true) return { ok: false, error: 'Please tick the box to agree to the advertising terms.' };
  return { ok: true, value: { headline, body, cta, pkg } };
}

let ready;
export async function ensureAds() {
  if (!ready) {
    ready = (async () => {
      await sql`create table if not exists ad_campaigns (
        id bigserial primary key,
        owner_id text not null, site_slug text not null, business_name text,
        headline text not null, body text not null, cta text not null default 'View business',
        package_id text not null, days int not null, amount numeric(10,2) not null, currency text not null default 'GBP',
        is_test boolean not null default true,
        status text not null default 'pending_payment',
        payment_ref text, payment_intent text, paid_at timestamptz,
        terms_version text, review_note text, reviewed_at timestamptz, reviewed_by text,
        starts_at timestamptz, ends_at timestamptz,
        views int not null default 0, clicks int not null default 0,
        refund_status text, created_at timestamptz not null default now())`;
      await sql`create index if not exists ad_campaigns_live_idx on ad_campaigns (status, ends_at)`;
      await sql`create index if not exists ad_campaigns_owner_idx on ad_campaigns (owner_id)`;
    })().catch((e) => { ready = null; throw e; });
  }
  return ready;
}

const json = (body, status = 200) => NextResponse.json(body, { status });

// Checks who is calling. { res } is the answer to send back when they are not allowed; otherwise { mode, user }.
export async function adsGuard(req, { admin = false } = {}) {
  const mode = adsMode();
  if (mode === 'off') return { res: json({ ok: false, error: 'Not available' }, 404) };
  const s = await liveSession(req);
  if (!isOwnerRole(s)) return { res: json({ ok: false, error: 'Please log in with a business account.' }, 401) };
  const [u] = await sql`select email, role from users where id::text = ${String(s.userId)}`;
  const user = { id: String(s.userId), email: u?.email || '', role: u?.role || s.role };
  if (admin && user.role !== 'admin') return { res: json({ ok: false, error: 'Admins only' }, 403) };
  if (mode === 'test' && !isAdTester(user.email, user.role)) return { res: json({ ok: false, error: 'Not available' }, 404) };
  return { mode, user };
}

// Called once a real payment is confirmed (by the Stripe return page and by the Stripe webhook). Safe to call twice.
export async function settleAd(adId, session) {
  await ensureAds();
  const id = Number(adId);
  if (!id || !session) return { ok: false };
  const [ad] = await sql`select id, amount, currency, is_test from ad_campaigns where id = ${id}`;
  if (!ad || ad.is_test) return { ok: false };
  if (session.payment_status !== 'paid') return { ok: false };
  if (Number(session.amount_total) !== Math.round(Number(ad.amount) * 100) || String(session.currency || '').toUpperCase() !== String(ad.currency).toUpperCase()) return { ok: false, error: 'amount_mismatch' };
  const r = await sql`update ad_campaigns set status = 'pending_review', paid_at = now(), payment_intent = ${session.payment_intent || null}
    where id = ${id} and status = 'pending_payment' returning id`;
  return { ok: true, changed: r.length > 0 };
}
