import { cache } from 'react';
import { sql } from '@/lib/db';
import { notFound } from 'next/navigation';
import SiteRenderer from '@/components/SiteRenderer';
import { publicData } from '@/lib/siteDefaults';
import { SITE_URL } from '@/lib/site';

// Cached for 60 seconds. Saving in the dashboard refreshes it straight away.
export const revalidate = 60;

const load = cache(async (slug) => {
  const [site] = await sql`select id, slug, template, data, stripe_ready from sites where slug = ${slug} and published`;
  if (!site) return null;
  const [c] = await sql`select count(*)::int as n from site_bookings where site_id = ${site.id} and lower(status) <> 'cancelled'`;
  return { site, count: c?.n || 0 };
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
  if (!found) notFound();
  const { site, count } = found;
  const d = site.data || {};
  const ld = {
    '@context': 'https://schema.org', '@type': 'LocalBusiness', name: d.businessName, description: d.tagline,
    telephone: d.phone || undefined, email: d.email || undefined, address: d.location || undefined, openingHours: d.hours || undefined,
    url: `${SITE_URL}/site/${slug}`, image: typeof d.hero === 'string' && d.hero.startsWith('https://') ? d.hero : undefined,
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <SiteRenderer slug={site.slug} template={site.template} data={publicData(site.data)} payOnline={!!site.stripe_ready} bookingCount={count} />
    </>
  );
}
