-- Run in the Neon SQL Editor with "Read-only" OFF, BEFORE you push v17. Safe to run twice. Run this ONE block on its own.
DO $$
DECLARE t text;
BEGIN
  SELECT data_type INTO t FROM information_schema.columns WHERE table_name = 'sites' AND column_name = 'id' LIMIT 1;
  t := CASE WHEN t = 'uuid' THEN 'uuid' WHEN t = 'bigint' THEN 'bigint' ELSE 'integer' END;
  EXECUTE format('CREATE TABLE IF NOT EXISTS site_reviews (
      id bigserial PRIMARY KEY,
      site_id %s NOT NULL,
      booking_id text NOT NULL UNIQUE,
      customer text,
      rating int NOT NULL,
      comment text NOT NULL DEFAULT '''',
      hidden boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now())', t);
  EXECUTE 'CREATE INDEX IF NOT EXISTS site_reviews_site ON site_reviews (site_id)';
  EXECUTE format('CREATE TABLE IF NOT EXISTS owner_summaries (
      site_id %s PRIMARY KEY,
      last_sent date)', t);
  EXECUTE 'ALTER TABLE site_bookings ADD COLUMN IF NOT EXISTS gift_code text';
  EXECUTE 'ALTER TABLE site_bookings ADD COLUMN IF NOT EXISTS gift_applied numeric';
  EXECUTE 'ALTER TABLE site_bookings ADD COLUMN IF NOT EXISTS loyalty_applied boolean NOT NULL DEFAULT false';
  EXECUTE 'ALTER TABLE site_bookings ADD COLUMN IF NOT EXISTS staff_id text';
  EXECUTE 'ALTER TABLE site_bookings ADD COLUMN IF NOT EXISTS review_asked_at timestamptz';
END $$;
