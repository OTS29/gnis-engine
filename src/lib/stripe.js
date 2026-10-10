import Stripe from 'stripe';

let client;
export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

export function baseUrl(req) {
  return process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
}
