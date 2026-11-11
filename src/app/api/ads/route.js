import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { hit } from '@/lib/rateLimit';
import { sameOrigin } from '@/lib/security';
import { getStripe, baseUrl } from '@/lib/stripe';
import { adsGuard, ensureAds, validateAd, PACKAGES, CTAS, AD_CURRENCY, STATUS_LABEL, TERMS_VERSION, MAX_OPEN_ADS } from '@/lib/ads';

export const runtime = 'nodejs';
const json = (b, s = 200) => NextResponse.json(b, { status: s });

const shape = (r) => ({
  id: String(r.id), headline: r.headline, body: r.body, cta: r.cta, slug: r.site_slug, business: r.business_name,
  days: r.days, amount: Number(r.amount), currency: r.currency, isTest: r.is_test,
  status: r.status === 'live' && r.ends_at && new Date(r.ends_at) <= new Date() ? 'expired' : r.status,
  startsAt: r.starts_at, endsAt: r.ends_at, views: r.views, clicks: r.clicks, note: r.review_note || '', createdAt: r.created_at,
});

export async function GET(req) {
  try {
    const g = await adsGuard(req); if (g.res) return g.res;
    await ensureAds();
    const [site] = await sql`select slug, data->>'businessName' as name, published from sites where owner_id::text = ${g.user.id} limit 1`;
    const rows = await sql`select * from ad_campaigns where owner_id = ${g.user.id} order by created_at desc limit 50`;
    return json({ ok: true, mode: g.mode, isAdmin: g.user.role === 'admin', currency: AD_CURRENCY, packages: PACKAGES, ctas: CTAS, statusLabel: STATUS_LABEL,
      site: site ? { slug: site.slug, name: site.name || '', published: !!site.published } : null, ads: rows.map(shape) });
  } catch (e) {
    console.error('ADS_GET_FAULT:', e);
    return json({ ok: false, error: 'Could not load adverts' }, 500);
  }
}

export async function POST(req) {
  try {
    if (!sameOrigin(req)) return json({ ok: false, error: 'Blocked' }, 403);
    const g = await adsGuard(req); if (g.res) return g.res;
    await ensureAds();
    const b = await req.json().catch(() => ({}));
    const action = String(b.action || '');
    if (!(await hit(`ads:${g.user.id}`, 30, 3600)).allowed) return json({ ok: false, error: 'Too many attempts. Try again later.' }, 429);

    if (action === 'create') {
      const v = validateAd(b);
      if (!v.ok) return json(v, 400);
      const [site] = await sql`select slug, data->>'businessName' as name, published from sites where owner_id::text = ${g.user.id} limit 1`;
      if (!site || !site.published) return json({ ok: false, error: 'Publish your GNIS page first. Your advert sends people to it.' }, 400);
      const [open] = await sql`select count(*)::int as n from ad_campaigns where owner_id = ${g.user.id} and status in ('pending_payment', 'pending_review', 'live') and (ends_at is null or ends_at > now())`;
      if (open.n >= MAX_OPEN_ADS) return json({ ok: false, error: `You can have up to ${MAX_OPEN_ADS} adverts open at once.` }, 400);
      const { headline, body, cta, pkg } = v.value;
      const [row] = await sql`insert into ad_campaigns (owner_id, site_slug, business_name, headline, body, cta, package_id, days, amount, currency, is_test, terms_version)
        values (${g.user.id}, ${site.slug}, ${site.name || ''}, ${headline}, ${body}, ${cta}, ${pkg.id}, ${pkg.days}, ${pkg.price}, ${AD_CURRENCY}, ${g.mode !== 'live'}, ${TERMS_VERSION}) returning id`;
      return json({ ok: true, id: String(row.id) });
    }

    const id = Number(b.id);
    if (!id) return json({ ok: false, error: 'Missing advert' }, 400);
    const [ad] = await sql`select * from ad_campaigns where id = ${id} and owner_id = ${g.user.id}`;
    if (!ad) return json({ ok: false, error: 'Advert not found' }, 404);

    if (action === 'pay') {
      if (ad.status !== 'pending_payment') return json({ ok: false, error: 'This advert is not waiting for payment.' }, 400);
      if (ad.is_test !== (g.mode !== 'live')) return json({ ok: false, error: 'This advert was made in a different mode. Please create it again.' }, 400);
      if (ad.is_test) {
        await sql`update ad_campaigns set status = 'pending_review', paid_at = now(), payment_ref = 'test' where id = ${id} and status = 'pending_payment'`;
        return json({ ok: true, test: true });
      }
      const stripe = getStripe();
      if (!stripe) return json({ ok: false, error: 'Card payments are not set up yet.' }, 400);
      const base = baseUrl(req);
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{ quantity: 1, price_data: { currency: String(ad.currency).toLowerCase(), unit_amount: Math.round(Number(ad.amount) * 100), product_data: { name: `GNIS advert: ${ad.days} days` } } }],
        metadata: { kind: 'ad', ad_id: String(ad.id) },
        success_url: `${base}/api/ads/confirm?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/dashboard/ads?cancelled=1`,
      });
      await sql`update ad_campaigns set payment_ref = ${session.id} where id = ${id}`;
      return json({ ok: true, url: session.url });
    }

    if (action === 'cancel') {
      if (!['pending_payment', 'pending_review'].includes(ad.status)) return json({ ok: false, error: 'This advert can no longer be cancelled.' }, 400);
      let refund = null;
      if (ad.status === 'pending_review' && !ad.is_test && ad.payment_intent) {
        try { await getStripe().refunds.create({ payment_intent: ad.payment_intent }); refund = 'refunded'; } catch (e) { console.error('AD_REFUND_FAULT:', e?.message); refund = 'failed'; }
      }
      await sql`update ad_campaigns set status = 'cancelled', refund_status = ${refund} where id = ${id} and status in ('pending_payment', 'pending_review')`;
      return json({ ok: true, refund });
    }
    return json({ ok: false, error: 'Unknown action' }, 400);
  } catch (e) {
    console.error('ADS_POST_FAULT:', e);
    return json({ ok: false, error: 'Something went wrong' }, 500);
  }
}
