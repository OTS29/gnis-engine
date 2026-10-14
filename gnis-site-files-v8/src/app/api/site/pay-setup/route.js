import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getSession, isOwnerRole } from '@/lib/session';
import { hit } from '@/lib/rateLimit';
import { AFRICA_CURRENCIES, CURRENCY_COUNTRY, paystackOn, flutterwaveOn, listBanks, resolveAccount, paystack, flutterwave, feePercent } from '@/lib/payments';

export const runtime = 'nodejs';

const clean = (v) => String(v || '').replace(/[^0-9A-Za-z]/g, '').slice(0, 20);

async function owner(req) {
  const s = getSession(req);
  if (!isOwnerRole(s)) return { error: NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 401 }) };
  const [site] = await sql`select id, data, pay_provider, pay_account, pay_ready from sites where owner_id = ${s.userId}`;
  if (!site) return { error: NextResponse.json({ ok: false, error: 'Save your site first.' }, { status: 400 }) };
  if (!(await hit(`paysetup:${s.userId}`, 40, 3600)).allowed) return { error: NextResponse.json({ ok: false, error: 'Too many attempts. Try again later.' }, { status: 429 }) };
  return { s, site };
}

// Status, and the bank list when ?provider=paystack|flutterwave&banks=1
export async function GET(req) {
  try {
    const { site, error } = await owner(req);
    if (error) return error;
    const cur = String(site.data?.currency || 'GBP').toUpperCase();
    const country = CURRENCY_COUNTRY[cur] || null;
    const u = new URL(req.url);
    if (u.searchParams.get('banks') === '1') {
      const provider = u.searchParams.get('provider') === 'flutterwave' ? 'flutterwave' : 'paystack';
      if (!country) return NextResponse.json({ ok: false, error: 'Set your currency to NGN, GHS, KES or ZAR first.' }, { status: 400 });
      return NextResponse.json({ ok: true, banks: await listBanks(provider, country) });
    }
    return NextResponse.json({
      ok: true, currency: cur, country,
      africa: AFRICA_CURRENCIES.includes(cur),
      paystack: { configured: paystackOn() }, flutterwave: { configured: flutterwaveOn() },
      active: site.pay_ready ? site.pay_provider : null,
    });
  } catch (e) {
    console.error('PAY_SETUP_GET_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Could not load payment setup' }, { status: 500 });
  }
}

// Check a bank account name before saving.
export async function POST(req) {
  try {
    const { error } = await owner(req);
    if (error) return error;
    const b = await req.json();
    const provider = b.provider === 'flutterwave' ? 'flutterwave' : 'paystack';
    const name = await resolveAccount(provider, clean(b.bankCode), clean(b.accountNumber));
    return NextResponse.json({ ok: true, accountName: name });
  } catch (e) {
    console.error('PAY_SETUP_RESOLVE_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Could not check the account' }, { status: 500 });
  }
}

// Create the seller's payout account at the provider and switch card payments on.
export async function PUT(req) {
  try {
    const { site, error } = await owner(req);
    if (error) return error;
    const b = await req.json();
    const provider = b.provider === 'flutterwave' ? 'flutterwave' : 'paystack';
    if (provider === 'paystack' && !paystackOn()) return NextResponse.json({ ok: false, error: 'Paystack is not switched on for the platform yet.' }, { status: 400 });
    if (provider === 'flutterwave' && !flutterwaveOn()) return NextResponse.json({ ok: false, error: 'Flutterwave is not switched on for the platform yet.' }, { status: 400 });

    const cur = String(site.data?.currency || 'GBP').toUpperCase();
    const country = CURRENCY_COUNTRY[cur];
    if (!country) return NextResponse.json({ ok: false, error: 'Set your currency to NGN, GHS, KES or ZAR first (Design tab, Region and tax).' }, { status: 400 });
    const bankCode = clean(b.bankCode), accountNumber = clean(b.accountNumber);
    if (!bankCode || accountNumber.length < 6) return NextResponse.json({ ok: false, error: 'Choose your bank and enter your account number.' }, { status: 400 });
    const business = String(site.data?.businessName || 'My business').slice(0, 60);
    const pct = feePercent();

    let account = null;
    if (provider === 'paystack') {
      const { j } = await paystack('POST', '/subaccount', {
        business_name: business, settlement_bank: bankCode, bank_code: bankCode, account_number: accountNumber, percentage_charge: pct,
      });
      account = j?.data?.subaccount_code || null;
      if (!account) { console.error('PAYSTACK_SUBACCOUNT_FAULT:', JSON.stringify(j)); return NextResponse.json({ ok: false, error: j?.message || 'Paystack could not create the payout account. Check the bank and number.' }, { status: 400 }); }
    } else {
      const phone = String(site.data?.phone || '').replace(/[^0-9+]/g, '');
      if (phone.length < 7) return NextResponse.json({ ok: false, error: 'Add your phone number on the Design tab first. Flutterwave needs it.' }, { status: 400 });
      const { j } = await flutterwave('POST', '/subaccounts', {
        account_bank: bankCode, account_number: accountNumber, business_name: business, business_mobile: phone, country,
        split_type: 'percentage', split_value: pct / 100,
      });
      account = j?.data?.subaccount_id || null;
      if (!account) { console.error('FLUTTERWAVE_SUBACCOUNT_FAULT:', JSON.stringify(j)); return NextResponse.json({ ok: false, error: j?.message || 'Flutterwave could not create the payout account. Check the bank and number.' }, { status: 400 }); }
    }
    await sql`update sites set pay_provider = ${provider}, pay_account = ${account}, pay_ready = true where id = ${site.id}`;
    return NextResponse.json({ ok: true, provider });
  } catch (e) {
    console.error('PAY_SETUP_PUT_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Could not save the payout account' }, { status: 500 });
  }
}

// Turn card payments off (customers then pay in person).
export async function DELETE(req) {
  try {
    const { site, error } = await owner(req);
    if (error) return error;
    await sql`update sites set pay_ready = false where id = ${site.id}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('PAY_SETUP_DELETE_FAULT:', e);
    return NextResponse.json({ ok: false, error: 'Could not update' }, { status: 500 });
  }
}
