import { sql } from '@/lib/db';

// What each plan allows. Limits only stop people ADDING more; nothing already saved is ever removed.
export const LIMITS = {
  starter: { services: 8, products: 8, gallery: 6, staff: 2, deposits: false, whatsappAuto: false, giftCards: false, rebook: false, loyalty: false, finance: false, badge: true },
  pro: { services: 30, products: 30, gallery: 12, staff: 5, deposits: true, whatsappAuto: true, giftCards: true, rebook: true, loyalty: true, finance: true, badge: false },
  biz: { services: 30, products: 30, gallery: 12, staff: 10, deposits: true, whatsappAuto: true, giftCards: true, rebook: true, loyalty: true, finance: true, badge: false },
};
export const PLAN_LABEL = { starter: 'Starter', pro: 'Professional', biz: 'Business' };

// 'starter' | 'pro' | 'biz'. Admin accounts count as Business. A lapsed plan counts as Starter.
export async function planOfUser(userId) {
  try {
    const [r] = await sql`select u.role, sp.plan, coalesce(sp.expires_at > now(), false) as active
      from users u left join seller_plans sp on sp.user_id = u.id::text where u.id::text = ${String(userId)}`;
    if (!r) return 'starter';
    if (r.role === 'admin') return 'biz';
    return r.active && (r.plan === 'pro' || r.plan === 'biz') ? r.plan : 'starter';
  } catch (e) {
    console.error('PLAN_LOOKUP_FAULT:', e);
    return 'starter';
  }
}

export const limitsFor = (plan) => LIMITS[plan] || LIMITS.starter;
