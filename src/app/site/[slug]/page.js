import { sql } from '@/lib/db';
import { notFound } from 'next/navigation';
import SiteRenderer from '@/components/SiteRenderer';
import { publicData } from '@/lib/siteDefaults';

export const dynamic = 'force-dynamic';

export default async function SitePage({ params }) {
  const { slug } = await params;
  const [site] = await sql`select slug, template, data, stripe_ready from sites where slug = ${slug} and published`;
  if (!site) notFound();
  return <SiteRenderer slug={site.slug} template={site.template} data={publicData(site.data)} payOnline={!!site.stripe_ready} />;
}
