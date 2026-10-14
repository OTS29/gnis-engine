-- Run in the Neon SQL Editor with "Read-only" OFF, BEFORE you push v8. Safe to run twice.
DO $$
BEGIN
  EXECUTE 'ALTER TABLE sites ADD COLUMN IF NOT EXISTS pay_provider text';
  EXECUTE 'ALTER TABLE sites ADD COLUMN IF NOT EXISTS pay_account text';
  EXECUTE 'ALTER TABLE sites ADD COLUMN IF NOT EXISTS pay_ready boolean DEFAULT false';

  EXECUTE 'ALTER TABLE site_orders ADD COLUMN IF NOT EXISTS pay_ref text';
  EXECUTE 'CREATE INDEX IF NOT EXISTS site_orders_pay_ref ON site_orders (pay_ref)';

  EXECUTE 'CREATE TABLE IF NOT EXISTS plan_payments (
    ref text PRIMARY KEY,
    user_id text NOT NULL,
    plan text NOT NULL,
    cycle text NOT NULL,
    currency text NOT NULL,
    amount numeric NOT NULL,
    provider text NOT NULL,
    status text NOT NULL DEFAULT ''pending'',
    created_at timestamptz NOT NULL DEFAULT now()
  )';

  EXECUTE 'CREATE TABLE IF NOT EXISTS seller_plans (
    user_id text PRIMARY KEY,
    plan text NOT NULL,
    cycle text NOT NULL,
    status text NOT NULL DEFAULT ''active'',
    provider text,
    currency text,
    amount numeric,
    stripe_subscription_id text,
    expires_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now()
  )';
  EXECUTE 'CREATE INDEX IF NOT EXISTS seller_plans_sub ON seller_plans (stripe_subscription_id)';
END $$;
