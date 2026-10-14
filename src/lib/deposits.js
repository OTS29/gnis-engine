import { sql } from '@/lib/db';
import { getStripe, baseUrl } from '@/lib/stripe';
import { providerForSite, paystack, flutterwave, toMinor, newRef, feePercent } from '@/lib/payments';

// Asks the customer to pay a deposit for a booking. Returns a payment page URL, or null when deposits are not possible
// (no payment provider connected, amount too small, or the provider refused). The booking itself is never lost.
export async function startDeposit(req, site, booking) {
  try {
    const cur = String(site.data?.currency || 'GBP').toUpperCase();
    const pct = Math.min(100, Math.max(0, Number(site.data?.depositPercent) || 0));
    const amount = Math.round(booking.price * pct) / 100;
    if (!pct || amount < 0.5) return null;
    const provider = providerForSite(site);
    if (!provider) return null;

    const base = baseUrl(req);
    const slug = site.slug;
    await sql`update site_bookings set deposit_amount = ${amount} where id = ${booking.id}`;
    const label = `Deposit: ${booking.service}`.slice(0, 80);

    if (provider === 'stripe') {
      const stripe = getStripe();
      const fee = feePercent();
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{ quantity: 1, price_data: { currency: cur.toLowerCase(), unit_amount: Math.round(amount * 100), product_data: { name: label } } }],
        payment_intent_data: { application_fee_amount: Math.round(amount * 100 * fee / 100), transfer_data: { destination: site.stripe_account_id } },
        metadata: { kind: 'deposit', booking_id: String(booking.id) },
        customer_email: booking.contact.includes('@') ? booking.contact : undefined,
        success_url: `${base}/site/${slug}?deposit=1`,
        cancel_url: `${base}/site/${slug}?deposit=0`,
      });
      return session.url || null;
    }

    const ref = newRef('d', booking.id);
    await sql`update site_bookings set pay_ref = ${ref} where id = ${booking.id}`;
    const back = `${base}/api/pay/return?slug=${encodeURIComponent(slug)}&p=${provider}&d=${booking.id}`;
    const email = booking.contact.includes('@') ? booking.contact : `booking-${booking.id}@${new URL(base).hostname}`;
    if (provider === 'paystack') {
      const { j } = await paystack('POST', '/transaction/initialize', {
        email, amount: toMinor(amount), currency: cur, reference: ref, callback_url: back,
        subaccount: site.pay_account, metadata: { kind: 'deposit', booking_id: booking.id },
      });
      if (j?.status && j?.data?.authorization_url) return j.data.authorization_url;
      console.error('PAYSTACK_DEPOSIT_FAULT:', JSON.stringify(j));
    } else {
      const { j } = await flutterwave('POST', '/payments', {
        tx_ref: ref, amount, currency: cur, redirect_url: back,
        customer: { email, name: booking.customer },
        customizations: { title: label },
        subaccounts: [{ id: site.pay_account }],
        meta: { kind: 'deposit', booking_id: booking.id },
      });
      if (j?.status === 'success' && j?.data?.link) return j.data.link;
      console.error('FLUTTERWAVE_DEPOSIT_FAULT:', JSON.stringify(j));
    }
    return null;
  } catch (e) {
    console.error('START_DEPOSIT_FAULT:', e);
    return null;
  }
}
