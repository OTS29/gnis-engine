import crypto from 'crypto';
import { sql } from '@/lib/db';
import { getStripe, baseUrl } from '@/lib/stripe';
import { providerForSite, paystack, flutterwave, toMinor, newRef, feePercent } from '@/lib/payments';
import { sendEmail } from '@/lib/email';
import { formatMoney } from '@/lib/siteDefaults';
import { mail } from '@/lib/i18n';

// Smallest gift card we allow per currency (keeps tiny, fee-losing payments out). The largest is 200x the smallest.
export const GIFT_MIN = { GBP: 5, EUR: 5, USD: 5, CAD: 5, AUD: 5, CHF: 5, NGN: 2000, GHS: 30, KES: 500, ZAR: 80 };
export const giftBounds = (cur) => { const min = GIFT_MIN[String(cur).toUpperCase()] || 5; return { min, max: min * 200 }; };

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I so codes are easy to read out loud
export function makeCode() {
  const b = crypto.randomBytes(8);
  let s = '';
  for (let i = 0; i < 8; i++) s += ALPHABET[b[i] % ALPHABET.length];
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}
export const normCode = (c) => {
  const s = String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return s.length === 8 ? `${s.slice(0, 4)}-${s.slice(4)}` : '';
};

const h = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());

// Creates a pending card and a payment page. Returns { payUrl } or { error }.
export async function startGiftPurchase(req, site, g) {
  const cur = String(site.data?.currency || 'GBP').toUpperCase();
  const provider = providerForSite(site);
  if (!provider) return { error: 'This business cannot take card payments yet.' };
  let id = null;
  for (let i = 0; i < 5 && !id; i++) {
    try {
      const [row] = await sql`insert into gift_cards (site_id, code, amount, balance, currency, buyer_name, buyer_email, recipient_name, recipient_email, message, status)
        values (${site.id}, ${makeCode()}, ${g.amount}, ${g.amount}, ${cur}, ${g.buyerName}, ${g.buyerEmail}, ${g.recipientName}, ${g.recipientEmail}, ${g.message}, 'pending')
        returning id`;
      id = row.id;
    } catch (e) { if (i === 4) throw e; }
  }
  const base = baseUrl(req);
  const label = `Gift card: ${site.data?.businessName || 'Gift card'}`.slice(0, 80);
  try {
    if (provider === 'stripe') {
      const stripe = getStripe();
      const fee = feePercent();
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{ quantity: 1, price_data: { currency: cur.toLowerCase(), unit_amount: Math.round(g.amount * 100), product_data: { name: label } } }],
        payment_intent_data: { application_fee_amount: Math.round(g.amount * 100 * fee / 100), transfer_data: { destination: site.stripe_account_id } },
        metadata: { kind: 'giftcard', card_id: String(id) },
        customer_email: g.buyerEmail,
        success_url: `${base}/site/${site.slug}?gift=1`,
        cancel_url: `${base}/site/${site.slug}?gift=0`,
      });
      if (session.url) return { payUrl: session.url };
    } else {
      const ref = newRef('g', id);
      await sql`update gift_cards set pay_ref = ${ref} where id = ${id}`;
      const back = `${base}/api/pay/return?slug=${encodeURIComponent(site.slug)}&p=${provider}&g=${id}`;
      if (provider === 'paystack') {
        const { j } = await paystack('POST', '/transaction/initialize', {
          email: g.buyerEmail, amount: toMinor(g.amount), currency: cur, reference: ref, callback_url: back,
          subaccount: site.pay_account, metadata: { kind: 'giftcard', card_id: id },
        });
        if (j?.status && j?.data?.authorization_url) return { payUrl: j.data.authorization_url };
        console.error('PAYSTACK_GIFT_FAULT:', JSON.stringify(j));
      } else {
        const { j } = await flutterwave('POST', '/payments', {
          tx_ref: ref, amount: g.amount, currency: cur, redirect_url: back,
          customer: { email: g.buyerEmail, name: g.buyerName },
          customizations: { title: label },
          subaccounts: [{ id: site.pay_account }],
          meta: { kind: 'giftcard', card_id: id },
        });
        if (j?.status === 'success' && j?.data?.link) return { payUrl: j.data.link };
        console.error('FLUTTERWAVE_GIFT_FAULT:', JSON.stringify(j));
      }
    }
  } catch (e) { console.error('START_GIFT_FAULT:', e); }
  await sql`delete from gift_cards where id = ${id} and status = 'pending'`;
  return { error: 'Could not start the payment. Please try again.' };
}

// Marks a card paid (once only) and emails the code. Safe to call many times.
export async function activateGift(id) {
  const [c] = await sql`update gift_cards set status = 'active' where id = ${id} and status = 'pending'
    returning id, code, amount::float8 as amount, currency, buyer_name, buyer_email, recipient_name, recipient_email, message, site_id`;
  if (!c) return;
  try {
    const [site] = await sql`select data, slug from sites where id = ${c.site_id}`;
    const data = site?.data || {};
    const lang = data.language || 'en';
    const vars = { name: c.recipient_name || c.buyer_name || '', business: data.businessName || '', amount: formatMoney(c.amount, c.currency, lang), code: c.code, from: c.buyer_name || '' };
    const accent = data.accent || '#2563eb';
    const card = (intro) => `<div style="font-family:system-ui,Segoe UI,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111827">
      <h2 style="margin:0 0 12px;color:${h(accent)}">${h(mail(lang, 'giftSubject', vars))}</h2>
      <p style="font-size:16px;line-height:1.55">${h(intro)}</p>
      ${c.message ? `<p style="font-size:15px;font-style:italic;color:#374151">“${h(c.message)}”</p>` : ''}
      <div style="border:2px dashed ${h(accent)};border-radius:12px;padding:18px;text-align:center;margin:16px 0">
        <div style="font-size:14px;color:#6b7280">${h(vars.amount)}</div>
        <div style="font-size:30px;font-weight:800;letter-spacing:3px">${h(c.code)}</div>
      </div>
      <p style="font-size:14px;color:#6b7280">${h(mail(lang, 'giftHow', vars))}</p></div>`;
    const replyTo = isEmail(data.email) ? data.email : undefined;
    const jobs = [];
    const toRecipient = isEmail(c.recipient_email);
    if (toRecipient) jobs.push(sendEmail({ to: c.recipient_email, subject: mail(lang, 'giftSubject', vars), html: card(mail(lang, 'giftBodyGift', vars)), replyTo }));
    if (isEmail(c.buyer_email)) jobs.push(sendEmail({ to: c.buyer_email, subject: mail(lang, 'giftSubject', vars), html: card(mail(lang, toRecipient ? 'giftBodyBuyerSent' : 'giftBodyBuyer', vars)), replyTo }));
    if (isEmail(data.email)) jobs.push(sendEmail({ to: data.email, subject: `Gift card sold: ${vars.amount}`, html: `<p>${h(c.buyer_name)} bought a ${h(vars.amount)} gift card (${h(c.code)}). See it in your dashboard, Gift cards tab.</p>` }));
    await Promise.allSettled(jobs);
  } catch (e) { console.error('GIFT_EMAIL_FAULT:', e); }
}
