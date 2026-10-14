import crypto from 'crypto';
import { STRIPE_CURRENCIES } from '@/lib/siteDefaults';

// Africa-side providers handle these currencies. Stripe handles STRIPE_CURRENCIES.
export const AFRICA_CURRENCIES = ['NGN', 'GHS', 'KES', 'ZAR'];
export const CURRENCY_COUNTRY = { NGN: 'NG', GHS: 'GH', KES: 'KE', ZAR: 'ZA' };
const PAYSTACK_COUNTRY = { NG: 'nigeria', GH: 'ghana', KE: 'kenya', ZA: 'south africa' };

export const stripeOn = () => !!process.env.STRIPE_SECRET_KEY;
export const paystackOn = () => !!process.env.PAYSTACK_SECRET_KEY;
export const flutterwaveOn = () => !!process.env.FLUTTERWAVE_SECRET_KEY;

export const toMinor = (n) => Math.round((Number(n) || 0) * 100);
export const feePercent = () => Math.min(20, Math.max(0, Number(process.env.PLATFORM_FEE_PERCENT ?? 3)));
export const newRef = (kind, id) => `gnis-${kind}${id}-${crypto.randomBytes(5).toString('hex')}`;

async function call(url, headers, method = 'GET', body) {
  const r = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, j };
}
export const paystack = (method, path, body) => call(`https://api.paystack.co${path}`, { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }, method, body);
export const flutterwave = (method, path, body) => call(`https://api.flutterwave.com/v3${path}`, { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` }, method, body);

// Which provider can take card payments for this seller's shop right now (or null = pay in person).
export function providerForSite(site) {
  const cur = String(site?.data?.currency || 'GBP').toUpperCase();
  if (AFRICA_CURRENCIES.includes(cur) && site?.pay_ready && site?.pay_account) {
    if (site.pay_provider === 'paystack' && paystackOn()) return 'paystack';
    if (site.pay_provider === 'flutterwave' && flutterwaveOn()) return 'flutterwave';
  }
  if (site?.stripe_ready && site?.stripe_account_id && stripeOn() && STRIPE_CURRENCIES.includes(cur)) return 'stripe';
  return null;
}

// Asks the provider whether a payment really happened. Never trust the browser or a webhook body alone.
export async function verifyPayment(provider, ref) {
  try {
    if (provider === 'paystack') {
      const { j } = await paystack('GET', `/transaction/verify/${encodeURIComponent(ref)}`);
      const d = j?.data;
      return { paid: !!(j?.status && d?.status === 'success'), amount: (Number(d?.amount) || 0) / 100, currency: String(d?.currency || '').toUpperCase() };
    }
    if (provider === 'flutterwave') {
      const { j } = await flutterwave('GET', `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(ref)}`);
      const d = j?.data;
      return { paid: j?.status === 'success' && d?.status === 'successful', amount: Number(d?.amount) || 0, currency: String(d?.currency || '').toUpperCase() };
    }
  } catch (e) {
    console.error('VERIFY_PAYMENT_FAULT:', e);
  }
  return { paid: false, amount: 0, currency: '' };
}

export async function listBanks(provider, country) {
  if (provider === 'paystack') {
    const out = [];
    let next = '';
    for (let i = 0; i < 12; i++) {
      const q = `/bank?country=${encodeURIComponent(PAYSTACK_COUNTRY[country])}&use_cursor=true&perPage=100${next ? `&next=${encodeURIComponent(next)}` : ''}`;
      const { j } = await paystack('GET', q);
      for (const b of j?.data || []) if (b.active !== false && !b.is_deleted) out.push({ code: String(b.code), name: b.name, type: b.type || '' });
      next = j?.meta?.next || '';
      if (!next) break;
    }
    const banks = out.filter((b) => b.type !== 'mobile_money');
    return (banks.length ? banks : out).sort((a, b) => a.name.localeCompare(b.name));
  }
  const { j } = await flutterwave('GET', `/banks/${country}`);
  return (j?.data || []).map((b) => ({ code: String(b.code), name: b.name })).sort((a, b) => a.name.localeCompare(b.name));
}

export async function resolveAccount(provider, bankCode, accountNumber) {
  try {
    if (provider === 'paystack') {
      const { j } = await paystack('GET', `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`);
      return j?.data?.account_name || null;
    }
    const { j } = await flutterwave('POST', '/accounts/resolve', { account_number: accountNumber, account_bank: bankCode });
    return j?.data?.account_name || null;
  } catch {
    return null;
  }
}
