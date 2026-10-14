# v11
1. Run sql-v11.sql in Neon (Read-only OFF).
2. Unzip, npm run build, push.
3. Password eye: login and register forms. Reset link: "Forgot?" on the login form.
4. Reset emails need RESEND_API_KEY and a verified sending domain (EMAIL_FROM) in Vercel, otherwise
   Resend only delivers to your own address. Until then use Admin > Users > Reset password.
