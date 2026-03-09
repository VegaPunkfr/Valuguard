-- 007: Referral tracking system
-- Supports referral-based growth: 50 EUR credit per converted referral (Rail A).
-- Seed rows (status='seed') represent registered referrers with no referred_email.
-- Referral rows (status='pending'|'converted'|'expired') track actual referrals.

CREATE TABLE IF NOT EXISTS referrals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_email  text NOT NULL,
  referrer_code   text NOT NULL,
  referred_email  text,
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('seed', 'pending', 'converted', 'expired')),
  reward_eur      numeric NOT NULL DEFAULT 0,
  converted_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Unique index on referrer_code + referred_email to prevent duplicate referrals.
-- Seed rows have NULL referred_email, so only one seed per code is enforced by
-- the separate unique index below.
CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_code_referred
  ON referrals (referrer_code, referred_email)
  WHERE referred_email IS NOT NULL;

-- Fast lookup by referrer_code (used by GET endpoint + trackReferral)
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_code
  ON referrals (referrer_code);

-- Fast lookup by referrer_email (used by getReferralStats)
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_email
  ON referrals (referrer_email);

-- Fast lookup by referred_email (used by convertReferral on payment)
CREATE INDEX IF NOT EXISTS idx_referrals_referred_email
  ON referrals (referred_email)
  WHERE referred_email IS NOT NULL;

-- Ensure only one seed row per referrer_code
CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_seed_unique
  ON referrals (referrer_code)
  WHERE status = 'seed';

-- RLS enabled — only service_role (admin client) can access
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- No public policies — only createAdminSupabase() (service_role) bypasses RLS
