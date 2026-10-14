# v12: deposits, plan limits, WhatsApp, more trades

## Install order
1. Neon SQL Editor (Read-only OFF): run sql-v12.sql.
2. unzip -o, npm run build, git add -A, git commit, git push.
3. Admin > Users > click yourself > "Give a plan" > Business > 12 months > Apply plan.
   (Your own account becomes Starter after this update, so the GNIS badge would show on your own site.)

## What the plans now do
Starter: up to 8 services, 8 products, 6 photos, 2 staff, small "Website built with GNIS" link, no deposits, no automatic WhatsApp.
Professional: 30 services, 30 products, 12 photos, 5 staff, deposits, automatic WhatsApp, no badge.
Business: as Professional with 10 staff.
Nothing a user already saved is deleted. Starter users who already have more simply cannot add more.
The WhatsApp button on the Bookings tab (opens WhatsApp with a ready message) works on every plan, no setup.

## Booking deposits
Dashboard > Design > Deposits and WhatsApp > choose a percentage > Save.
Needs card payments connected in the Payments tab and the provider keys in Vercel.
The customer is sent to pay the deposit straight after requesting the booking. The Bookings tab shows
"Deposit paid" or "Deposit unpaid". If the customer closes the payment page, the booking stays pending as unpaid.
The same 3 percent platform fee applies (PLATFORM_FEE_PERCENT).

## Automatic WhatsApp (optional, needs Twilio)
Vercel variables: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM (like +14155238886).
WhatsApp only lets a business start a chat with an approved template. Create one in Twilio (Content Template Builder) with
variables {{1}} name, {{2}} service, {{3}} business, {{4}} date, {{5}} time, then set TWILIO_WHATSAPP_TEMPLATE_SID.
Without a template, messages only arrive in the Twilio sandbox or inside a 24-hour customer-started chat.
If WhatsApp is not sent, the reminder falls back to SMS.

## More trades
15 new landing pages under /for/... (laundry, phone repair, caterers, plumbers, electricians and more).
