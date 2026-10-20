# Put Clean It on GNIS (about 30 minutes)

Goal: customers book and pay on GNIS, and you keep your current Clean It website as the front door.

## Before you start
1. Run `sql-v19.sql` in Neon, then install v19 and push to Vercel (steps in NOTES-v19.md).
2. Sign in to GNIS with the account that will own Clean It (tayestephen75@yahoo.com).
3. In /admin use "Give a plan" to give that account Professional, so deposits, invoices and the Money tab work.

## Step 1: Choose one brand name
Your site says "Cleanit" in the header but "London Sparkle Cleaning" in the title, footer and email.
Pick ONE name and use it everywhere (website, GNIS, Monzo, insurance, invoices).

## Step 2: Build the Clean It page in GNIS (Dashboard)
- **Design tab:** business name, one-line tagline ("Reliable home and office cleaning across London"), about text, phone, email, location (London), hours, accent colour, hero photo.
- **Services tab:** one service per row with a real price and duration. Suggested starting list (change the prices to yours):
  - Domestic clean (regular)
  - Deep clean
  - Airbnb / short-let turnover
  - Office clean
  - End of tenancy clean
- **Gallery tab:** upload 6 to 12 before/after photos from your current site.
- **FAQ and reviews:** copy your FAQ. Use only real reviews (the Reviews tab collects them after each completed visit).
- Press **Save**. Your page is now live at `/site/your-address`.

## Step 3: Set the web address and country
Design tab, "Your web address and country" box: choose `clean-it` (or your final brand name) and country United Kingdom. Save.

## Step 4: Fill in the invoice details
Design tab, "Invoice and receipt details": registered name and company number (once you have them), registered office address, and a note such as your bank transfer details (never shown on the public page).
Also set the tax rate to 0 until you are VAT registered, and your VAT number later.

## Step 5: Point your current website at GNIS
On your Clean It website project, make every **Book Now** button open your GNIS page:
`https://gnis-engine.vercel.app/site/clean-it`
(use your real address from Step 3). Later, a custom address like `book.yourdomain.co.uk` can point to the same page.

## Step 6: Get paid
- **Now:** customers can book; you take payment in cash or bank transfer. After each job, open Dashboard > Bookings, set the method and press **Mark paid**, then **Print receipt** or **Email it**.
- **After the company and Monzo account exist:** Dashboard > Payments to connect card payments. Money is paid out to the business bank account you choose there.

## Step 7: Test everything
1. Open your live page in a private window and make a test booking.
2. In Bookings, approve it, mark it completed and paid, print the receipt.
3. Check the Money tab shows the income. Add one test expense and delete it.
4. Compare the Money tab with your bank statement once a week. The bank statement is the final truth.
