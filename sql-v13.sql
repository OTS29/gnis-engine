-- Run in the Neon SQL Editor with "Read-only" OFF, BEFORE you push v13. Safe to run twice. Run this ONE block on its own.
DO $$
DECLARE t text;
BEGIN
  SELECT data_type INTO t FROM information_schema.columns WHERE table_name = 'sites' AND column_name = 'id' LIMIT 1;
  t := CASE WHEN t = 'uuid' THEN 'uuid' WHEN t = 'bigint' THEN 'bigint' ELSE 'integer' END;
  EXECUTE format('CREATE TABLE IF NOT EXISTS site_customers (
      site_id %s NOT NULL,
      contact_key text NOT NULL,
      notes text NOT NULL DEFAULT '''',
      rebook_optout boolean NOT NULL DEFAULT false,
      last_rebook_at timestamptz,
      PRIMARY KEY (site_id, contact_key))', t);
  EXECUTE format('CREATE TABLE IF NOT EXISTS gift_cards (
      id bigserial PRIMARY KEY,
      site_id %s NOT NULL,
      code text NOT NULL UNIQUE,
      amount numeric NOT NULL,
      balance numeric NOT NULL,
      currency text NOT NULL,
      buyer_name text,
      buyer_email text,
      recipient_name text,
      recipient_email text,
      message text,
      status text NOT NULL DEFAULT ''pending'',
      pay_ref text,
      created_at timestamptz NOT NULL DEFAULT now(),
      last_used_at timestamptz)', t);
  EXECUTE 'CREATE INDEX IF NOT EXISTS gift_cards_site ON gift_cards (site_id)';
  EXECUTE 'CREATE INDEX IF NOT EXISTS gift_cards_pay_ref ON gift_cards (pay_ref)';
END $$;
