import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession, isOwnerRole } from '@/lib/session';
import { cleanData, TEMPLATE_LIST } from '@/lib/siteDefaults';

export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const session = getSession(req);
    if (!isOwnerRole(session)) return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 401 });

    const [site] = await sql`select slug, template, data from sites where owner_id = ${session.userId}`;
    return NextResponse.json({ ok: true, data: site || null });
  } catch (e) {
    console.error('SITE_GET_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Could not load site' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const session = getSession(req);
    if (!isOwnerRole(session)) return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 401 });

    const raw = await req.text();
    if (raw.length > 4_000_000) {
      return NextResponse.json({ ok: false, error: 'Site is too large. Remove some images.' }, { status: 413 });
    }
    const body = JSON.parse(raw);
    const template = TEMPLATE_LIST.some(t => t.id === body.template) ? body.template : 'classic';
    const data = cleanData(body.data);
    const json = JSON.stringify(data);

    const [existing] = await sql`select slug from sites where owner_id = ${session.userId}`;
    if (existing) {
      await sql`update sites set template = ${template}, data = ${json}::jsonb, updated_at = now()
                where owner_id = ${session.userId}`;
      return NextResponse.json({ ok: true, slug: existing.slug });
    }

    const base = (data.businessName || 'site')
      .toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'site';
    let slug = base;
    for (let i = 0; i < 5; i++) {
      const [taken] = await sql`select 1 as x from sites where slug = ${slug}`;
      if (!taken) break;
      slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    }

    await sql`insert into sites (owner_id, slug, template, data)
              values (${session.userId}, ${slug}, ${template}, ${json}::jsonb)`;
    return NextResponse.json({ ok: true, slug }, { status: 201 });
  } catch (e) {
    console.error('SITE_SAVE_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Save failed' }, { status: 500 });
  }
}
