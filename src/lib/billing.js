import { sql } from '@/lib/db';
import { PLANS, planPrices, REGIONS, regionFor, AFRICA } from '@/lib/regions';
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

async function activate(row, provider, subId) {
  const months = row.cycle === 'yearly' ? 12 : 1;
  await sql`insert into seller_plans (user_id, plan, cycle, status, provider, currency, amount, stripe_subscription_id, expires_at, updated_at)
    values (${row.user_id}, ${row.plan}, ${row.cycle}, 'active', ${provider}, ${row.currency}, ${row.amount}, ${subId || null}, now() + (${months}::int * interval '1 month'), now())
    on conflict (user_id) do update set plan = excluded.plan, cycle = excluded.cycle, status = 'active', provider = excluded.provider,
      currency = excluded.currency, amount = excluded.amount, stripe_subscription_id = excluded.stripe_subscription_id,
      expires_at = greatest(coalesce(seller_plans.expires_at, now()), now()) + (${months}::int * interval '1 month'), updated_at = now()`;
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

export const settleAny = (ref, provider) => (String(ref).startsWith('gnis-p') ? settlePlan(ref, provider) : settleOrder(ref, provider));
