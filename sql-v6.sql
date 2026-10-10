-- Run this in the Neon SQL Editor with "Read-only" switched OFF. Safe to run twice.
DO $$
DECLARE site_id_type text;
BEGIN
  SELECT format_type(atttypid, atttypmod) INTO site_id_type
  FROM pg_attribute WHERE attrelid = 'sites'::regclass AND attname = 'id' AND NOT attisdropped;

  EXECUTE format('CREATE TABLE IF NOT EXISTS site_views (
    id bigserial PRIMARY KEY,
    site_id %s NOT NULL,
    visitor text NOT NULL,
    viewed_at timestamptz NOT NULL DEFAULT now()
  )', site_id_type);
  EXECUTE 'CREATE INDEX IF NOT EXISTS site_views_site_time ON site_views (site_id, viewed_at)';

  EXECUTE 'ALTER TABLE site_bookings ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz';
  EXECUTE 'ALTER TABLE sites ADD COLUMN IF NOT EXISTS ref_code text';
  EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS sites_ref_code_uq ON sites (ref_code)';

  EXECUTE 'CREATE TABLE IF NOT EXISTS referrals (
    id bigserial PRIMARY KEY,
    referrer_user_id text NOT NULL,
    referee_user_id text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now()
  )';
END $$;
