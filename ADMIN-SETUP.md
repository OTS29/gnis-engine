# Admin console (v10)

1. Run `sql-v10.sql` in the Neon SQL Editor (Read-only OFF).
2. Make yourself admin (use the email you LOG IN with):
   update users set role = 'admin' where email = 'YOUR-LOGIN-EMAIL';
3. Push v10, wait for Ready, log out and log in again, then open /admin.

Notes
- Export: "Download Excel" on /admin. ID numbers are never exported.
- Deactivate blocks login and unpublishes their site. A person already logged in keeps their session
  for up to 7 days, but their public page is offline straight away.
- Delete is permanent. Export first if you need a record.
