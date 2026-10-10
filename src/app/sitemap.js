import { sql } from '@/lib/db';
import { PROFESSIONS } from '@/lib/professions';
import { SITE_URL } from '@/lib/site';

export const revalidate = 3600;

export default async function sitemap() {
  const now = new Date();
  const fixed = [
    { url: SITE_URL, lastModified: now, priority: 1 },
    { url: `${SITE_URL}/privacy`, lastModified: now, priority: 0.2 },
    { url: `${SITE_URL}/terms`, lastModified: now, priority: 0.2 },
    ...PROFESSIONS.map((p) => ({ url: `${SITE_URL}/for/${p.slug}`, lastModified: now, priority: 0.8 })),
  ];
  let sites = [];
  try {
    const rows = await sql`select slug, updated_at from sites where published order by updated_at desc limit 5000`;
    sites = rows.map((r) => ({ url: `${SITE_URL}/site/${r.slug}`, lastModified: r.updated_at ? new Date(r.updated_at) : now, priority: 0.6 }));
  } catch {}
  return [...fixed, ...sites];
}
