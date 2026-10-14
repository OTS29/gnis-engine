# Payments setup (v8)

Three providers sit behind one checkout. Each stays off until its keys are in Vercel.

| Region | Shop payments | Plan payments |
|---|---|---|
| UK, Europe, USA, Canada, Australia | Stripe Connect | Stripe subscription (renews itself) |
| Nigeria, Ghana, Kenya, South Africa | Paystack or Flutterwave (seller chooses) | Paystack (or Flutterwave if Paystack is off), paid one month or one year at a time |

## Environment variables (Vercel, Settings, Environment Variables)

| Name | Where to find it |
|---|---|
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe dashboard, Developers |
| `PAYSTACK_SECRET_KEY` | Paystack dashboard, Settings, API Keys. Use the test key first |
| `FLUTTERWAVE_SECRET_KEY` | Flutterwave dashboard, Settings, API keys. Use the test key first |
| `FLUTTERWAVE_WEBHOOK_HASH` | You make it up: any long random text. Paste the same text in Flutterwave's webhook settings as the "secret hash" |
| `PLATFORM_FEE_PERCENT` | Optional, default 3. Your cut of each shop payment |

Mark all of these as **Secret**. Redeploy after adding them.

## Webhooks (give each provider your address)

- Stripe: `https://gnis-engine.vercel.app/api/stripe/webhook` for `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`
- Paystack: `https://gnis-engine.vercel.app/api/paystack/webhook`
- Flutterwave: `https://gnis-engine.vercel.app/api/flutterwave/webhook`, with your secret hash

Payments also confirm themselves when the customer comes back to your site, so a missed webhook will not lose a payment.

## How a payment is confirmed

The server never trusts the browser. For Paystack and Flutterwave it asks the provider whether the payment happened, and checks the amount and currency match the order. Only then does the order turn "paid", or the plan turn on.

## Known limits (be honest about these)

- Paystack, Flutterwave and Stripe each need your business verified before live payments. Test mode works straight away.
- Plans for Africa are paid per period (one month or one year), not auto-renewing. Add reminders before you rely on it.
- Plans are priced by the visitor's country as seen by the server. A VPN could pick a cheaper region. Watch for this.
- The platform fee for Paystack and Flutterwave is set when the seller's payout account is created. Changing `PLATFORM_FEE_PERCENT` later only affects new sellers.
- Provider fees are paid out of the platform's share by default. Keep the platform fee above the provider's charges (about 3% or more) so you do not lose money.
- Paid features are not locked behind plans yet. A decision is needed on what each plan includes.
- Flutterwave: this uses their v3 API. Check your account supports v3 keys.
