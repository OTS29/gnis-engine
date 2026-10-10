import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';

// The AI only writes the wording. The decision and the price are always computed here,
// and the seller's lowest price is never sent to the model or to the visitor until it is the final offer.
async function wording(business, service, decision, price, offer) {
  const fallback = {
    accept: `Deal! £${price} for ${service} is agreed. Choose a date and time below to lock it in.`,
    counter: `Thanks for the offer. The best I can do right now is £${price} for ${service}. Would that work?`,
    final: `That's my lowest price: £${price} for ${service}. Take it or leave it, but I'd love to have you in.`,
  }[decision];
  if (!process.env.ANTHROPIC_API_KEY) return fallback;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 6000);
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: ctl.signal,
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 120,
        system: `You are the friendly booking assistant for ${business}. Reply in 1-2 short sentences, warm and professional, no emojis. Only mention the one price you are given. Never invent discounts, other prices or limits.`,
        messages: [{ role: 'user', content: `Customer offered £${offer} for "${service}". Decision: ${decision.toUpperCase()}. The price to state is £${price}. ${decision === 'accept' ? 'Confirm the deal and tell them to pick a date and time.' : decision === 'final' ? 'Say this is the final lowest price.' : 'Politely counter at that price.'}` }],
      }),
    });
    clearTimeout(t);
    const j = await r.json();
    const text = j?.content?.[0]?.text?.trim();
    return text && text.includes(String(price)) ? text : fallback;
  } catch {
    return fallback;
  }
}

export async function POST(req) {
  try {
    const b = await req.json();
    const slug = String(b.slug || '');
    const service = String(b.service || '');
    const offer = Math.round((Number(b.offer) || 0) * 100) / 100;
    if (!(offer > 0)) return NextResponse.json({ ok: false, error: 'Enter an amount in £' }, { status: 400 });

    const [site] = await sql`select data from sites where slug = ${slug} and published`;
    const svc = (site?.data?.services || []).find((s) => s.name === service);
    if (!svc) return NextResponse.json({ ok: false, error: 'Service not found' }, { status: 404 });

    const list = Number(svc.price) || 0;
    const floor = Number(svc.minPrice) || 0;
    if (!svc.negotiable || !(floor > 0 && floor < list)) {
      return NextResponse.json({ ok: false, error: 'The price for this service is fixed.' }, { status: 400 });
    }

    let round = 0;
    if (b.state) {
      try {
        const p = jwt.verify(String(b.state), process.env.JWT_SECRET);
        if (p.typ === 'neg' && p.slug === slug && p.service === service) round = Math.min(3, Number(p.round) || 0);
      } catch {}
    }

    const margin = list - floor;
    const steps = [0.25, 0.5, 0.75, 1];
    const need = steps.map((s) => Math.max(floor, Math.ceil(list - margin * s)));
    const threshold = need[round];
    const business = site.data?.businessName || 'this business';

    if (offer >= threshold) {
      const price = Math.min(offer, list);
      const lockToken = jwt.sign({ typ: 'lock', slug, service, price }, process.env.JWT_SECRET, { expiresIn: '1h' });
      return NextResponse.json({ ok: true, decision: 'accept', price, message: await wording(business, service, 'accept', price, offer), lockToken });
    }

    const decision = round >= 3 ? 'final' : 'counter';
    const price = threshold;
    const state = jwt.sign({ typ: 'neg', slug, service, round: Math.min(3, round + 1) }, process.env.JWT_SECRET, { expiresIn: '1h' });
    return NextResponse.json({ ok: true, decision, price, message: await wording(business, service, decision, price, offer), state });
  } catch (e) {
    console.error('SITE_NEGOTIATE_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Could not negotiate right now' }, { status: 500 });
  }
}
