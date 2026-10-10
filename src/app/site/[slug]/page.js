import { sql } from '@/lib/db';
import { notFound } from 'next/navigation';
import SiteRenderer from '@/components/SiteRenderer';
import { publicData } from '@/lib/siteDefaults';

// Cached for 60 seconds. Saving in the dashboard refreshes it straight away.
export const revalidate = 60;

export default async function SitePage({ params }) {
  const { slug } = await params;
  const [site] = await sql`select id, slug, template, data, stripe_ready from sites where slug = ${slug} and published`;
  if (!site) notFound();
  const [c] = await sql`select count(*)::int as n from site_bookings where site_id = ${site.id} and lower(status) <> 'cancelled'`;
  return <SiteRenderer slug={site.slug} template={site.template} data={publicData(site.data)} payOnline={!!site.stripe_ready} bookingCount={c?.n || 0} />;
}
