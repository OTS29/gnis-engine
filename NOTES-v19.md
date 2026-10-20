GNIS v19

NEW
- Invoices and receipts: in Bookings, each booking has Mark paid (cash, bank transfer, card, other), Print invoice / Print receipt and Email it. Numbers count up per business (INV-0001, INV-0002...). Shows company name, number, registered address, VAT number, tax, gift card and deposit already paid, and balance due. Customers get a private link in the email.
- Invoice details in Design tab (registered name, company number, address, a note such as bank details). The note is never shown on your public website.
- Web address and country in Design tab. Changing the address keeps the old one working (it forwards). One change every 7 days. Country decides which directory list you appear in.

SECURITY
- Deactivated users and users whose password was reset are signed out straight away (checked in the database on every private page).
- Role changes now take effect immediately, without logging in again.
- Sign-up now keeps only the last 4 characters of an ID number (old ones are masked by the SQL).
- Older downloads (bookings, orders, timesheet) are protected against spreadsheet formula tricks.

INSTALL
1. Run sql-v19.sql in Neon first (SQL Editor, paste, Run).
2. Unzip with: unzip -o gnis-site-files-v19.zip
3. git add . && git commit -m "v19" && git push
Clean It checklist: CLEAN-IT-SETUP.md
