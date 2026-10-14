import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { sql } from '@/lib/db';
import { getSession, isOwnerRole } from '@/lib/session';
import { cleanData, TEMPLATE_LIST } from '@/lib/siteDefaults';
import { planOfUser, limitsFor, PLAN_LABEL } from '@/lib/plans';

export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const session = getSession(req);
    if (!isOwnerRole(session)) return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 401 });

    const [site] = await sql`select slug, template, data, stripe_account_id, stripe_ready from sites where owner_id = ${session.userId}`;
    const plan = await planOfUser(session.userId);
    if (!site) return NextResponse.json({ ok: true, data: null, plan, limits: limitsFor(plan) });
    const { stripe_account_id, ...rest } = site;
    return NextResponse.json({ ok: true, data: { ...rest, stripeConnected: !!stripe_account_id }, plan, limits: limitsFor(plan) });
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

    const [existing] = await sql`select slug, data from sites where owner_id = ${session.userId}`;

    // Plan limits: you can always keep what you already have, but you cannot add beyond your plan.
    const plan = await planOfUser(session.userId);
    const lim = limitsFor(plan);
    const before = existing?.data || {};
    for (const [key, label] of [['services', 'services'], ['products', 'products'], ['gallery', 'photos']]) {
      const had = Array.isArray(before[key]) ? before[key].length : 0;
      const now = data[key].length;
      if (now > lim[key] && now > had) {
        return NextResponse.json({ ok: false, upgrade: true, error: `The ${PLAN_LABEL[plan]} plan allows up to ${lim[key]} ${label}. Upgrade in the Billing tab to add more.` }, { status: 402 });
      }
    }
    if (!lim.deposits) data.depositPercent = 0;
    if (!lim.whatsappAuto) data.whatsappReminders = false;
    const json2 = JSON.stringify(data);

    if (existing) {
      await sql`update sites set template = ${template}, data = ${json2}::jsonb, updated_at = now()
                where owner_id = ${session.userId}`;
      revalidatePath(`/site/${existing.slug}`);
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
              values (${session.userId}, ${slug}, ${template}, ${json2}::jsonb)`;

    // Credit whoever referred this seller (cookie set by /r/CODE). Never blocks saving.
    try {
      const ref = (req.headers.get('cookie') || '').split(';').map((c) => c.trim()).find((c) => c.startsWith('gnis_ref='));
      const code = ref ? ref.split('=')[1] : '';
      if (/^[a-z0-9]{4,16}$/.test(code)) {
        const [r] = await sql`select owner_id from sites where ref_code = ${code}`;
        if (r && String(r.owner_id) !== String(session.userId)) {
          await sql`insert into referrals (referrer_user_id, referee_user_id) values (${String(r.owner_id)}, ${String(session.userId)})
                    on conflict (referee_user_id) do nothing`;
        }
      }
    } catch (e) { console.error('REFERRAL_FAULT:', e); }
    return NextResponse.json({ ok: true, slug }, { status: 201 });
  } catch (e) {
    console.error('SITE_SAVE_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Save failed' }, { status: 500 });
  }
}
