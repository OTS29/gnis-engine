import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession, isOwnerRole } from '@/lib/session';
import { hit } from '@/lib/rateLimit';
import { planOfUser } from '@/lib/plans';
import { askClaude, extractJson, HONESTY } from '@/lib/ai';
import { TEMPLATE_LIST, ACCENTS, CURRENCIES, mergeData } from '@/lib/siteDefaults';

export const runtime = 'nodejs';
export const maxDuration = 60;

const s = (v, n) => String(v ?? '').slice(0, n);

async function managerContext(userId) {
  const [site] = await sql`select id, data from sites where owner_id = ${userId}`;
  if (!site) return 'The owner has not saved a website yet, so there are no business numbers.';
  const d = mergeData(site.data);
  const [m] = await sql`select
      count(*) filter (where created_at >= now() - interval '30 days' and coalesce(source,'website') <> 'import')::int as requests30,
      count(*) filter (where lower(status)='completed' and date::date >= current_date - 30 and coalesce(source,'website') <> 'import')::int as done30,
      coalesce(sum(price) filter (where lower(status)='completed' and date::date >= current_date - 30 and coalesce(source,'website') <> 'import'),0)::float8 as earned30,
      count(*) filter (where lower(status)='no_show' and date::date >= current_date - 30)::int as noshow30,
      count(*) filter (where lower(status)='cancelled' and date::date >= current_date - 30)::int as cancelled30,
      count(*) filter (where lower(status)='pending')::int as waiting
    from site_bookings where site_id = ${site.id}`;
  const services = d.services.slice(0, 15).map((x) => `${x.name} (${x.price} ${d.currency}${x.duration ? ', ' + x.duration : ''})`).join('; ');
  return `Business: ${d.businessName}. Location: ${d.location || 'not set'}. Currency: ${d.currency}. Services: ${services || 'none'}. Last 30 days: ${m.requests30} booking requests, ${m.done30} completed visits, ${Math.round(m.earned30)} ${d.currency} earned from completed visits, ${m.noshow30} no-shows, ${m.cancelled30} cancelled, ${m.waiting} waiting for a reply. Deposit: ${d.depositPercent}%. Reviews on site: ${d.reviews.length}.`;
}

export async function POST(req) {
  try {
    const session = getSession(req);
    if (!isOwnerRole(session)) return NextResponse.json({ ok: false, error: 'Please log in first.' }, { status: 401 });
    const plan = await planOfUser(session.userId);
    const daily = plan === 'starter' ? 5 : 40;
    const lim = await hit(`ai:${session.userId}`, daily, 86400);
    if (!lim.allowed) return NextResponse.json({ ok: false, error: plan === 'starter' ? `You used your ${daily} free AI requests for today. Professional gives 40 a day.` : 'Daily AI limit reached. Try again tomorrow.' }, { status: 429 });

    const raw = await req.text();
    if (raw.length > 4_200_000) return NextResponse.json({ ok: false, error: 'That file is too big. Keep it under 3 MB.' }, { status: 413 });
    const b = JSON.parse(raw);
    const tool = String(b.tool || '');

    if (tool === 'website') {
      const desc = s(b.description, 1500);
      if (desc.length < 15) return NextResponse.json({ ok: false, error: 'Describe your business in a sentence or two.' }, { status: 400 });
      const r = await askClaude({
        maxTokens: 2200,
        system: `You write website content for small service businesses. ${HONESTY} Do not invent reviews, awards, years in business, qualifications or prices the owner did not give. If the owner did not give a price, set price to 0. Reply with JSON only, no other text, in exactly this shape: {"businessName":"","tagline":"max 90 chars","about":"2 short paragraphs, first person, warm","template":"one of ${TEMPLATE_LIST.map((t) => t.id).join('|')}","accent":"one of ${ACCENTS.join('|')}","hours":"","services":[{"name":"","price":0,"duration":"","desc":"one sentence"}],"faqs":[{"q":"","a":""}]}. Give 3 to 6 services and 3 to 4 FAQs.`,
        content: `Business description from the owner:\n${desc}\nLocation: ${s(b.location, 100) || 'not given'}\nCurrency: ${CURRENCIES.includes(b.currency) ? b.currency : 'GBP'}`,
      });
      if (!r.ok) return NextResponse.json(r, { status: 502 });
      const j = extractJson(r.text);
      if (!j) return NextResponse.json({ ok: false, error: 'The AI answer could not be read. Try again.' }, { status: 502 });
      return NextResponse.json({ ok: true, draft: j });
    }

    if (tool === 'apply') {
      // Applies an AI draft to the owner's own site. Only text fields are touched; photos, payments and bookings are left alone.
      const d = b.draft || {};
      const [site] = await sql`select data, template from sites where owner_id = ${session.userId}`;
      if (!site) return NextResponse.json({ ok: false, error: 'Open the Dashboard and save your site once first, then apply.' }, { status: 400 });
      const cur = mergeData(site.data);
      const next = {
        ...cur,
        businessName: s(d.businessName, 80) || cur.businessName,
        tagline: s(d.tagline, 140) || cur.tagline,
        about: s(d.about, 1500) || cur.about,
        hours: s(d.hours, 120) || cur.hours,
        accent: ACCENTS.includes(d.accent) ? d.accent : cur.accent,
        faqs: Array.isArray(d.faqs) && d.faqs.length ? d.faqs.slice(0, 8).map((f) => ({ q: s(f.q, 140), a: s(f.a, 600) })) : cur.faqs,
        services: Array.isArray(d.services) && d.services.length ? d.services.slice(0, 12).map((x) => ({ name: s(x.name, 80), price: Math.max(0, Number(x.price) || 0), duration: s(x.duration, 30), desc: s(x.desc, 300), negotiable: false, minPrice: 0 })) : cur.services,
      };
      const template = TEMPLATE_LIST.some((t) => t.id === d.template) ? d.template : site.template;
      return NextResponse.json({ ok: true, template, data: next });
    }

    if (tool === 'plan') {
      const a = b.answers || {};
      const r = await askClaude({
        maxTokens: 2500,
        system: `You help a first-time small business owner write a simple launch plan. ${HONESTY} Use these headings exactly: What you sell and to whom; Start-up checklist (legal, insurance, accounts, tools); Pricing idea (use only the owner's numbers and show the working); First 30 days (week by week); First 10 customers (free or cheap ways to find them); Risks and what to check before spending money. Keep it under 700 words. Use hyphen bullets. End with one line: This is guidance, not legal or financial advice.`,
        content: Object.entries({ Idea: a.idea, Place: a.place, 'Who the customers are': a.customers, 'Starting money': a.budget, 'Hours per week the owner can work': a.hours, 'Experience': a.experience }).map(([k, v]) => `${k}: ${s(v, 400) || 'not given'}`).join('\n'),
      });
      return NextResponse.json(r, { status: r.ok ? 200 : 502 });
    }

    if (tool === 'manager') {
      const q = s(b.question, 800);
      if (q.length < 3) return NextResponse.json({ ok: false, error: 'Ask a question.' }, { status: 400 });
      const ctx = await managerContext(session.userId);
      const r = await askClaude({
        maxTokens: 1200,
        system: `You are the business advisor inside GNIS for one small business owner. ${HONESTY} The numbers below come from the owner's own GNIS account and are the only facts you have. Answer the question, then give at most 3 clear next actions. Under 250 words.`,
        content: `Owner's GNIS data:\n${ctx}\n\nQuestion: ${q}`,
      });
      return NextResponse.json(r, { status: r.ok ? 200 : 502 });
    }

    if (tool === 'opportunity') {
      const r = await askClaude({
        maxTokens: 1500,
        system: `You help an owner judge a business idea in one local area. ${HONESTY} You have NO market data. Everything you say is reasoning from what the owner typed, and you must start with the line: "This is reasoning from your answers, not market data." Give: what looks promising, what looks risky, and a "Check this yourself this week" list of 5 concrete tests (count competitors on Google Maps, ask 10 people, price-check 3 competitors, test with a small ad or a WhatsApp post, get supplier quotes). Under 350 words.`,
        content: `Idea: ${s(b.idea, 300)}\nArea: ${s(b.area, 150)}\nCompetitors the owner found nearby: ${s(b.competitors, 300) || 'not counted yet'}\nWhat nearby competitors charge: ${s(b.prices, 200) || 'not checked yet'}\nWhy the owner thinks people need it: ${s(b.demand, 400) || 'not given'}`,
      });
      return NextResponse.json(r, { status: r.ok ? 200 : 502 });
    }

    if (tool === 'document') {
      const q = s(b.question, 600) || 'Summarise this and list the key numbers and anything I should act on.';
      const name = s(b.name, 100).toLowerCase();
      let content;
      if (b.pdf) {
        const data = String(b.pdf).replace(/^data:application\/pdf;base64,/, '');
        content = [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }, { type: 'text', text: q }];
      } else if (b.text) {
        content = `File: ${name}\n\n${s(b.text, 60000)}\n\nQuestion: ${q}`;
      } else return NextResponse.json({ ok: false, error: 'Add a PDF, CSV or text file.' }, { status: 400 });
      const r = await askClaude({
        maxTokens: 1500, content,
        system: `You read business documents (price lists, invoices, quotes, statements, spreadsheets exported as CSV). ${HONESTY} Use only what is in the document. Quote the figures you rely on. If the document does not answer the question, say so. Under 350 words.`,
      });
      return NextResponse.json(r, { status: r.ok ? 200 : 502 });
    }

    return NextResponse.json({ ok: false, error: 'Unknown tool' }, { status: 400 });
  } catch (e) {
    console.error('AI_ROUTE_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Something went wrong. Try again.' }, { status: 500 });
  }
}
