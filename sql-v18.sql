-- Run in the Neon SQL Editor with "Read-only" OFF, BEFORE you push v18. Safe to run twice. Run this ONE block on its own.
DO $$
DECLARE t text;
BEGIN
  SELECT data_type INTO t FROM information_schema.columns WHERE table_name = 'sites' AND column_name = 'id' LIMIT 1;
  t := CASE WHEN t = 'uuid' THEN 'uuid' WHEN t = 'bigint' THEN 'bigint' ELSE 'integer' END;
  EXECUTE format('CREATE TABLE IF NOT EXISTS site_expenses (
      id bigserial PRIMARY KEY,
      site_id %s NOT NULL,
      spent_on date NOT NULL,
      category text NOT NULL,
      amount numeric NOT NULL,
      note text NOT NULL DEFAULT '''',
      created_at timestamptz NOT NULL DEFAULT now())', t);
  EXECUTE 'CREATE INDEX IF NOT EXISTS site_expenses_site_date ON site_expenses (site_id, spent_on)';
END $$;
