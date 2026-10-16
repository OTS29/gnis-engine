import { sql } from '@/lib/db';
import { PLANS, planPrices, REGIONS, regionFor, AFRICA } from '@/lib/regions';
import { activateGift } from '@/lib/giftcards';
import { verifyPayment, paystackOn, flutterwaveOn, stripeOn } from '@/lib/payments';

export const PLAN_NAMES = { pro: 'Professional', biz: 'Business' };

// Region for plan pricing comes from the server (visitor country), never from the browser.
export function billingRegion(req, siteCurrency) {
  const fromIp = regionFor(req.headers.get('x-vercel-ip-country') || '');
  if (fromIp) return fromIp;
  const byCur = { GBP: 'GB', EUR: 'EU', USD: 'US', CAD: 'CA', AUD: 'AU', NGN: 'NG', GHS: 'GH', KES: 'KE', ZAR: 'ZA' };
  return byCur[String(siteCurrency || '').toUpperCase()] || 'GB';
}

export function providerForRegion(region) {
  if (AFRICA.includes(region)) return paystackOn() ? 'paystack' : flutterwaveOn() ? 'flutterwave' : null;
  return stripeOn() ? 'stripe' : null;
}

export function priceFor(region, plan, cycle) {
  if (!PLANS[region]?.[plan]) return null;
  const p = planPrices(region, cycle)[plan];
  const monthly = PLANS[region][plan];
  return {
    currency: REGIONS[region].currency,
    // What is charged in one go: a month, or a whole year.
    amount: cycle === 'yearly' ? p.billedYearly : monthly,
    perMonth: p.perMonth,
  };
}

// Referral reward: when a referred business pays for the first time, the person who referred them gets one free month
// of Professional (up to 12 a year). Safe to call twice, because each referral is rewarded only once.
async function rewardReferrer(refereeId) {
  try {
    const [r] = await sql`update referrals set rewarded_at = now() where referee_user_id = ${String(refereeId)} and rewarded_at is null returning referrer_user_id`;
    if (!r) return;
    const [c] = await sql`select count(*)::int as n from referrals where referrer_user_id = ${r.referrer_user_id} and rewarded_at is not null`;
    if (c.n > 12) return;
    await sql`insert into seller_plans (user_id, plan, cycle, status, provider, currency, amount, expires_at, updated_at)
      values (${r.referrer_user_id}, 'pro', 'monthly', 'active', 'referral', 'GBP', 0, now() + interval '1 month', now())
      on conflict (user_id) do update set status = 'active',
        plan = case when seller_plans.plan = 'biz' and coalesce(seller_plans.expires_at, now()) > now() then 'biz' else 'pro' end,
        expires_at = greatest(coalesce(seller_plans.expires_at, now()), now()) + interval '1 month', updated_at = now()`;
  } catch (e) { console.error('REFERRAL_REWARD_FAULT:', e); }
}

async function activate(row, provider, subId) {
  const months = row.cycle === 'yearly' ? 12 : 1;
  await sql`insert into seller_plans (user_id, plan, cycle, status, provider, currency, amount, stripe_subscription_id, expires_at, updated_at)
    values (${row.user_id}, ${row.plan}, ${row.cycle}, 'active', ${provider}, ${row.currency}, ${row.amount}, ${subId || null}, now() + (${months}::int * interval '1 month'), now())
    on conflict (user_id) do update set plan = excluded.plan, cycle = excluded.cycle, status = 'active', provider = excluded.provider,
      currency = excluded.currency, amount = excluded.amount, stripe_subscription_id = excluded.stripe_subscription_id,
      expires_at = greatest(coalesce(seller_plans.expires_at, now()), now()) + (${months}::int * interval '1 month'), updated_at = now()`;
  await rewardReferrer(row.user_id);
}

// Called by return pages and webhooks. Safe to call many times for the same reference.
export async function settlePlan(ref, provider, { trusted = false, subId = null } = {}) {
  const [row] = await sql`select * from plan_payments where ref = ${ref}`;
  if (!row || row.status === 'paid') return !!row;
  if (!trusted) {
    const v = await verifyPayment(provider, ref);
    if (!v.paid || v.currency !== row.currency || v.amount + 0.01 < Number(row.amount)) return false;
  }
  const done = await sql`update plan_payments set status = 'paid' where ref = ${ref} and status = 'pending' returning ref`;
  if (done.length) await activate(row, provider, subId);
  return true;
}

export async function settleOrder(ref, provider) {
  const [o] = await sql`select o.id, o.total::float8 as total, o.status, s.data from site_orders o join sites s on s.id = o.site_id where o.pay_ref = ${ref}`;
  if (!o) return false;
  if (o.status === 'paid' || o.status === 'fulfilled') return true;
  const v = await verifyPayment(provider, ref);
  const cur = String(o.data?.currency || 'GBP').toUpperCase();
  if (!v.paid || v.currency !== cur || v.amount + 0.01 < o.total) return false;
  await sql`update site_orders set status = 'paid' where id = ${o.id} and status = 'pending'`;
  return true;
}

export async function settleDeposit(ref, provider) {
  const [b] = await sql`select b.id, b.deposit_amount::float8 as amt, b.deposit_paid, s.data from site_bookings b join sites s on s.id = b.site_id where b.pay_ref = ${ref}`;
  if (!b) return false;
  if (b.deposit_paid) return true;
  const v = await verifyPayment(provider, ref);
  const cur = String(b.data?.currency || 'GBP').toUpperCase();
  if (!v.paid || v.currency !== cur || v.amount + 0.01 < (b.amt || 0)) return false;
  await sql`update site_bookings set deposit_paid = true where id = ${b.id}`;
  return true;
}

export async function settleGift(ref, provider) {
  const [c] = await sql`select id, status, amount::float8 as amt, currency from gift_cards where pay_ref = ${ref}`;
  if (!c) return false;
  if (c.status !== 'pending') return true;
  const v = await verifyPayment(provider, ref);
  if (!v.paid || v.currency !== String(c.currency).toUpperCase() || v.amount + 0.01 < c.amt) return false;
  await activateGift(c.id);
  return true;
}

export const settleAny = (ref, provider) => {
  const r = String(ref);
  if (r.startsWith('gnis-p')) return settlePlan(ref, provider);
  if (r.startsWith('gnis-d')) return settleDeposit(ref, provider);
  if (r.startsWith('gnis-g')) return settleGift(ref, provider);
  return settleOrder(ref, provider);
};
