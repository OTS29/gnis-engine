-- Run in the Neon SQL Editor with "Read-only" OFF, BEFORE you push v10. Safe to run twice.
DO $$
BEGIN
  EXECUTE 'ALTER TABLE users ADD COLUMN IF NOT EXISTS country text';
  EXECUTE 'ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false';
  EXECUTE 'ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_note text';
  EXECUTE 'ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at timestamptz';

  EXECUTE 'CREATE TABLE IF NOT EXISTS admin_log (
    id bigserial PRIMARY KEY,
    admin_id text NOT NULL,
    admin_email text,
    action text NOT NULL,
    target_id text,
    target_email text,
    detail text,
    created_at timestamptz NOT NULL DEFAULT now()
  )';
  EXECUTE 'CREATE INDEX IF NOT EXISTS admin_log_time ON admin_log (created_at DESC)';
END $$;
