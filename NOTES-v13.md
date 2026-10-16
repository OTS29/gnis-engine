# v13: Customers, rebooking emails, gift cards

## Run first (Neon SQL Editor, Read-only OFF)
Paste the whole of `sql-v13.sql` as one block and Run. It makes two new tables (site_customers, gift_cards). Safe to run twice.

## What is new
- Customers tab: everyone who booked, how many visits, what they spent, last and next visit, private notes, Email/WhatsApp button, Download (CSV, opens in Excel).
- Rebooking emails: Design tab > "Bring customers back" > choose "After 28 days" (for example). Each day the reminders job emails customers whose visit you marked Completed that long ago and who have nothing booked. One email per visit. Each email has a "Stop these reminders" link, and you can switch a customer off on the Customers tab. Professional and Business plans only. Email only (needs Resend working).
- Gift cards: Design tab > tick "Sell gift cards on my site". A Gift cards section appears on the public site. Buyer pays by card, the code is emailed to them (and to the person they are giving it to). Gift cards tab: type a code, check the balance, take off what they spend. Professional and Business plans only. Needs card payments connected.

## Notes
- Needs the daily cron (CRON_SECRET already set) for rebooking. You do not need to edit vercel.json: it runs inside the existing reminders job.
- Gift card page text and the new emails are English for now; other languages fall back to English.
- Gift cards are redeemed by you in the dashboard (online redemption at booking is not built yet).
