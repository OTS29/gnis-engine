import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { sameOrigin } from '@/lib/security';
import { getStripe } from '@/lib/stripe';
import { adsGuard, ensureAds } from '@/lib/ads';

export const runtime = 'nodejs';
const json = (b, s = 200) => NextResponse.json(b, { status: s });
const row = (r) => ({ id: String(r.id), headline: r.headline, body: r.body, cta: r.cta, business: r.business_name, slug: r.site_slug, days: r.days, amount: Number(r.amount), currency: r.currency,
  isTest: r.is_test, status: r.status, paidAt: r.paid_at, startsAt: r.starts_at, endsAt: r.ends_at, views: r.views, clicks: r.clicks });

export async function GET(req) {
  try {
    const g = await adsGuard(req, { admin: true }); if (g.res) return g.res;
    await ensureAds();
    const review = await sql`select * from ad_campaigns where status = 'pending_review' order by paid_at asc limit 50`;
    const live = await sql`select * from ad_campaigns where status = 'live' and ends_at > now() order by ends_at asc limit 50`;
    return json({ ok: true, review: review.map(row), live: live.map(row) });
  } catch (e) {
    console.error('ADS_ADMIN_GET_FAULT:', e);
    return json({ ok: false, error: 'Could not load' }, 500);
  }
}

export async function POST(req) {
  try {
    if (!sameOrigin(req)) return json({ ok: false, error: 'Blocked' }, 403);
    const g = await adsGuard(req, { admin: true }); if (g.res) return g.res;
    await ensureAds();
    const b = await req.json().catch(() => ({}));
    const id = Number(b.id);
    const note = String(b.note || '').trim().slice(0, 300);
    if (!id) return json({ ok: false, error: 'Missing advert' }, 400);
    const [ad] = await sql`select * from ad_campaigns where id = ${id}`;
    if (!ad) return json({ ok: false, error: 'Advert not found' }, 404);

    if (b.action === 'approve') {
      const r = await sql`update ad_campaigns set status = 'live', starts_at = now(), ends_at = now() + make_interval(days => ${ad.days}), reviewed_at = now(), reviewed_by = ${g.user.email}
        where id = ${id} and status = 'pending_review' returning id`;
      if (!r.length) return json({ ok: false, error: 'This advert is no longer waiting for review.' }, 409);
      return json({ ok: true });
    }
    if (b.action === 'reject') {
      if (!note) return json({ ok: false, error: 'Add a short reason so the advertiser knows why.' }, 400);
      const r = await sql`update ad_campaigns set status = 'rejected', review_note = ${note}, reviewed_at = now(), reviewed_by = ${g.user.email}
        where id = ${id} and status = 'pending_review' returning id`;
      if (!r.length) return json({ ok: false, error: 'This advert is no longer waiting for review.' }, 409);
      let refund = 'none';
      if (!ad.is_test && ad.payment_intent) {
        try { await getStripe().refunds.create({ payment_intent: ad.payment_intent }); refund = 'refunded'; } catch (e) { console.error('AD_REFUND_FAULT:', e?.message); refund = 'failed'; }
        await sql`update ad_campaigns set refund_status = ${refund} where id = ${id}`;
      }
      return json({ ok: true, refund });
    }
    if (b.action === 'remove') {
      if (!note) return json({ ok: false, error: 'Add a short reason.' }, 400);
      const r = await sql`update ad_campaigns set status = 'rejected', review_note = ${note}, ends_at = now(), reviewed_at = now(), reviewed_by = ${g.user.email}, refund_status = 'manual_check'
        where id = ${id} and status = 'live' returning id`;
      if (!r.length) return json({ ok: false, error: 'This advert is not live.' }, 409);
      return json({ ok: true, refund: 'manual_check' });
    }
    return json({ ok: false, error: 'Unknown action' }, 400);
  } catch (e) {
    console.error('ADS_ADMIN_POST_FAULT:', e);
    return json({ ok: false, error: 'Something went wrong' }, 500);
  }
}
