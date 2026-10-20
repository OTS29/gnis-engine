import { cache } from 'react';
import { sql } from '@/lib/db';
import { notFound, permanentRedirect } from 'next/navigation';
import SiteRenderer from '@/components/SiteRenderer';
import { publicData } from '@/lib/siteDefaults';
import { SITE_URL } from '@/lib/site';
import { providerForSite } from '@/lib/payments';
import { planOfUser, limitsFor } from '@/lib/plans';
import { getTop } from '@/lib/leaderboard';

// Cached for 60 seconds. Saving in the dashboard refreshes it straight away.
export const revalidate = 60;

const load = cache(async (slug) => {
  const [site] = await sql`select id, owner_id, slug, template, data, stripe_ready, stripe_account_id, pay_provider, pay_account, pay_ready from sites where slug = ${slug} and published`;
  if (!site) return null;
  const [c] = await sql`select count(*)::int as n from site_bookings where site_id = ${site.id} and lower(status) <> 'cancelled' and coalesce(source, 'website') <> 'import'`;
  let realReviews = [], ratingAvg = 0, ratingN = 0;
  try {
    realReviews = await sql`select customer as name, rating, comment as text from site_reviews where site_id = ${site.id} and not hidden order by created_at desc limit 12`;
    const [a] = await sql`select avg(rating)::float8 as avg, count(*)::int as n from site_reviews where site_id = ${site.id} and not hidden`;
    ratingAvg = a?.avg ? Math.round(a.avg * 10) / 10 : 0; ratingN = a?.n || 0;
  } catch {}
  const badge = limitsFor(await planOfUser(site.owner_id)).badge;
  let topRank = 0;
  try { topRank = ((await getTop(5)).find((t) => t.slug === slug) || {}).rank || 0; } catch {}
  return { site, count: c?.n || 0, badge, topRank, realReviews, ratingAvg, ratingN };
});

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const found = await load(slug);
  if (!found) return {};
  const d = found.site.data || {};
  const title = `${d.businessName || 'Book online'}${d.location ? ` · ${d.location}` : ''}`;
  const description = [d.tagline, d.about].filter(Boolean).join(' ').slice(0, 155);
  const image = typeof d.hero === 'string' && d.hero.startsWith('https://') ? [d.hero] : undefined;
  return {
    title, description,
    alternates: { canonical: `${SITE_URL}/site/${slug}` },
    openGraph: { title, description, url: `${SITE_URL}/site/${slug}`, type: 'website', images: image },
    twitter: { card: image ? 'summary_large_image' : 'summary', title, description },
  };
}

export default async function SitePage({ params }) {
  const { slug } = await params;
  const found = await load(slug);
  if (!found) {
    // An old address (after the owner changed it) forwards to the current one.
    let to = null;
    try { const [r] = await sql`select st.slug from site_slug_redirects r join sites st on st.id::text = r.site_id where r.old_slug = ${slug} and st.published`; to = r?.slug || null; } catch {}
    if (to && to !== slug) permanentRedirect(`/site/${to}`);
    notFound();
  }
  const { site, count, badge, topRank, realReviews, ratingAvg, ratingN } = found;
  const d = site.data || {};
  const ld = {
    '@context': 'https://schema.org', '@type': 'LocalBusiness', name: d.businessName, description: d.tagline,
    telephone: d.phone || undefined, email: d.email || undefined, address: d.location || undefined, openingHours: d.hours || undefined,
    url: `${SITE_URL}/site/${slug}`, image: typeof d.hero === 'string' && d.hero.startsWith('https://') ? d.hero : undefined,
    aggregateRating: ratingN >= 1 ? { '@type': 'AggregateRating', ratingValue: ratingAvg, reviewCount: ratingN } : undefined,
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <SiteRenderer slug={site.slug} template={site.template} data={publicData(site.data)} payOnline={!!providerForSite(site)} bookingCount={count} showBadge={badge} topRank={topRank} realReviews={realReviews} ratingAvg={ratingAvg} ratingN={ratingN} />
    </>
  );
}
