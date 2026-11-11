import { sql } from '@/lib/db';
import { guard, json } from '@/lib/familyGuard';
import { CATEGORIES } from '@/lib/familyFlow';
import { proStats } from '@/lib/familyDb';

export const runtime = 'nodejs';

async function mySite(uid) {
  const [s] = await sql`select id::text as id, slug, published, data->>'businessName' as name, data->>'currency' as currency from sites where owner_id::text = ${uid}`;
  return s || null;
}

// The professional's own opt-in state.
export async function GET(req) {
  const g = await guard(req); if (g.res) return g.res;
  const site = await mySite(g.user.id);
  if (!site) return json({ ok: true, site: null });
  const [fp] = await sql`select enabled, status, categories, id_method, id_last4, id_note, verified_at from family_pros where site_id = ${site.id}`;
  return json({ ok: true, site, pro: fp || null, stats: fp ? await proStats(site.id) : null, categories: CATEGORIES });
}

// Opt in or out. Verification is approved by an admin by hand in this version.
export async function POST(req) {
  const g = await guard(req); if (g.res) return g.res;
  const site = await mySite(g.user.id);
  if (!site) return json({ ok: false, error: 'Create and publish your GNIS site first.' }, 400);
  const b = await req.json().catch(() => ({}));
  if (!site.published) return json({ ok: false, error: 'Publish your site first (Design tab, then Save).' }, 400);
  if (String(site.currency).toUpperCase() !== 'NGN') return json({ ok: false, error: 'For now family bookings are for Nigeria only. Set your site currency to NGN in the Design tab.' }, 400);
  const enabled = b.enabled === true;
  const categories = (Array.isArray(b.categories) ? b.categories : []).filter((c) => Object.hasOwn(CATEGORIES, c)).slice(0, 3);
  if (enabled && !categories.length) return json({ ok: false, error: 'Choose at least one type of service.' }, 400);
  const method = ['nin', 'bvn', 'manual'].includes(b.idMethod) ? b.idMethod : null;
  const last4 = String(b.idLast4 || '').trim();
  if (last4 && !/^[A-Za-z0-9]{4}$/.test(last4)) return json({ ok: false, error: 'Enter only the LAST 4 characters of your ID number. Never send the full number.' }, 400);
  const note = String(b.idNote || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 300);
  if (enabled && !(method && last4)) return json({ ok: false, error: 'Choose your ID type and enter its last 4 characters so we can verify you.' }, 400);
  await sql`insert into family_pros (site_id, enabled, categories, id_method, id_last4, id_note)
    values (${site.id}, ${enabled}, ${categories}::text[], ${method}, ${last4 || null}, ${note})
    on conflict (site_id) do update set enabled = excluded.enabled, categories = excluded.categories,
      id_method = coalesce(excluded.id_method, family_pros.id_method), id_last4 = coalesce(excluded.id_last4, family_pros.id_last4),
      id_note = excluded.id_note, updated_at = now()`;
  return json({ ok: true });
}
