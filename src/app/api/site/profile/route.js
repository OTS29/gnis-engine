import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { sql } from '@/lib/db';
import { hit } from '@/lib/rateLimit';
import { sameOrigin } from '@/lib/security';
import { liveSession, isOwnerRole } from '@/lib/session';
import { cleanCountry } from '@/lib/countries';

export const runtime = 'nodejs';

// Words that are already used by the website itself. Nobody can take these as a business address.
const RESERVED = new Set(['admin', 'api', 'dashboard', 'site', 'clock', 'for', 'r', 'portal', 'terms', 'privacy', 'reset-password', 'login', 'signup', 'sitemap', 'robots', 'www', 'app', 'gnis', 'support', 'help', 'billing', 'pricing', 'top', 'directory', 'auth', 'static', 'public']);
const WAIT_DAYS = 7;

const cleanSlug = (v) => String(v || '').toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

export async function GET(req) {
  try {
    const s = await liveSession(req);
    if (!isOwnerRole(s)) return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 401 });
    const [row] = await sql`select st.slug, st.slug_changed_at, u.country
      from users u left join sites st on st.owner_id::text = u.id::text where u.id::text = ${String(s.userId)}`;
    let nextChange = null;
    if (row?.slug_changed_at) {
      const t = new Date(row.slug_changed_at).getTime() + WAIT_DAYS * 86400000;
      if (t > Date.now()) nextChange = new Date(t).toISOString().slice(0, 10);
    }
    return NextResponse.json({ ok: true, data: { slug: row?.slug || null, country: cleanCountry(row?.country) || '', nextChange } });
  } catch (e) {
    console.error('PROFILE_GET_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Could not load' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    if (!sameOrigin(req)) return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 403 });
    const s = await liveSession(req);
    if (!isOwnerRole(s)) return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 401 });
    if (!(await hit(`profile:${s.userId}`, 30, 3600)).allowed) return NextResponse.json({ ok: false, error: 'Too many changes. Try again later.' }, { status: 429 });
    const body = await req.json();
    const out = {};

    if (Object.prototype.hasOwnProperty.call(body, 'country')) {
      const c = cleanCountry(body.country);
      if (body.country && !c) return NextResponse.json({ ok: false, error: 'Choose a country from the list.' }, { status: 400 });
      await sql`update users set country = ${c || null} where id::text = ${String(s.userId)}`;
      out.country = c;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'slug')) {
      const slug = cleanSlug(body.slug);
      const [site] = await sql`select id::text as id, slug, slug_changed_at from sites where owner_id::text = ${String(s.userId)}`;
      if (!site) return NextResponse.json({ ok: false, error: 'Save your site first.' }, { status: 400 });
      if (slug !== site.slug) {
        if (slug.length < 3 || !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug)) return NextResponse.json({ ok: false, error: 'Use 3 to 40 letters, numbers or dashes.' }, { status: 400 });
        if (RESERVED.has(slug)) return NextResponse.json({ ok: false, error: 'That address is reserved. Choose another.' }, { status: 400 });
        if (site.slug_changed_at && new Date(site.slug_changed_at).getTime() + WAIT_DAYS * 86400000 > Date.now()) {
          return NextResponse.json({ ok: false, error: `You can change your address once every ${WAIT_DAYS} days.` }, { status: 429 });
        }
        const [taken] = await sql`select 1 as x from sites where slug = ${slug} and id::text <> ${site.id}`;
        const [held] = await sql`select 1 as x from site_slug_redirects where old_slug = ${slug} and site_id <> ${site.id}`;
        if (taken || held) return NextResponse.json({ ok: false, error: 'That address is already taken. Try another.' }, { status: 409 });

        // Keep the old address working: it forwards to the new one.
        await sql`insert into site_slug_redirects (old_slug, site_id) values (${site.slug}, ${site.id}) on conflict (old_slug) do update set site_id = excluded.site_id`;
        await sql`delete from site_slug_redirects where old_slug = ${slug} and site_id = ${site.id}`;
        await sql`update sites set slug = ${slug}, slug_changed_at = now() where id::text = ${site.id}`;
        revalidatePath(`/site/${site.slug}`);
        revalidatePath(`/site/${slug}`);
      }
      out.slug = slug;
    }
    return NextResponse.json({ ok: true, ...out });
  } catch (e) {
    console.error('PROFILE_PUT_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Could not save' }, { status: 500 });
  }
}
