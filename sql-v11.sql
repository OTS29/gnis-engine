-- Run in the Neon SQL Editor with "Read-only" OFF, BEFORE you push v11. Safe to run twice.
DO $$
BEGIN
  EXECUTE 'CREATE TABLE IF NOT EXISTS password_resets (
    token_hash text PRIMARY KEY,
    user_id text NOT NULL,
    expires_at timestamptz NOT NULL,
    used_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  )';
  EXECUTE 'CREATE INDEX IF NOT EXISTS password_resets_user ON password_resets (user_id)';
END $$;
