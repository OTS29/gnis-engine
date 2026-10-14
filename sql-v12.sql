-- Run in the Neon SQL Editor with "Read-only" OFF, BEFORE you push v12. Safe to run twice.
DO $$
BEGIN
  EXECUTE 'ALTER TABLE site_bookings ADD COLUMN IF NOT EXISTS pay_ref text';
  EXECUTE 'ALTER TABLE site_bookings ADD COLUMN IF NOT EXISTS deposit_amount numeric';
  EXECUTE 'ALTER TABLE site_bookings ADD COLUMN IF NOT EXISTS deposit_paid boolean NOT NULL DEFAULT false';
  EXECUTE 'CREATE INDEX IF NOT EXISTS site_bookings_pay_ref ON site_bookings (pay_ref)';
END $$;
