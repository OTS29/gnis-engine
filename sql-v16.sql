-- Run in the Neon SQL Editor with "Read-only" OFF, BEFORE you push v16. Safe to run twice. Run this block on its own.
DO $$
BEGIN
  EXECUTE 'ALTER TABLE referrals ADD COLUMN IF NOT EXISTS rewarded_at timestamptz';
END $$;
