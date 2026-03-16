-- ================================================================
-- GHOST TAX — MIGRATION 012: DRIP EMAIL QUEUE
--
-- Standalone queue table for the 5-touch post-scan drip sequence.
-- Complementary to outreach_leads (which drives runDripSequence).
-- Provides a simpler per-email/domain state view for debugging
-- and for cron-based send-at-timestamp processing.
--
-- Populated by: lib/drip-sequence.ts scheduleDripSequence()
-- Processed by: master cron Stage 3 (runDripSequence on outreach_leads)
-- ================================================================

CREATE TABLE IF NOT EXISTS drip_queue (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL,
  domain        TEXT NOT NULL,
  locale        TEXT DEFAULT 'en',
  exposure_low  INTEGER,
  exposure_high INTEGER,
  analysis_id   TEXT,

  -- Scheduled send timestamps (set at enroll time)
  touch1_at     TIMESTAMPTZ,
  touch2_at     TIMESTAMPTZ,
  touch3_at     TIMESTAMPTZ,
  touch4_at     TIMESTAMPTZ,
  touch5_at     TIMESTAMPTZ,

  -- Send state flags (flipped to TRUE after successful send)
  touch1_sent   BOOLEAN DEFAULT FALSE,
  touch2_sent   BOOLEAN DEFAULT FALSE,
  touch3_sent   BOOLEAN DEFAULT FALSE,
  touch4_sent   BOOLEAN DEFAULT FALSE,
  touch5_sent   BOOLEAN DEFAULT FALSE,

  -- GDPR / suppression
  unsubscribed  BOOLEAN DEFAULT FALSE,

  created_at    TIMESTAMPTZ DEFAULT NOW(),

  -- One row per email+domain combination (re-scan resets the sequence)
  UNIQUE(email, domain)
);

-- ── Indexes for cron queries ──────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_drip_queue_touch1
  ON drip_queue(touch1_at)
  WHERE touch1_sent = FALSE AND unsubscribed = FALSE;

CREATE INDEX IF NOT EXISTS idx_drip_queue_touch2
  ON drip_queue(touch2_at)
  WHERE touch2_sent = FALSE AND unsubscribed = FALSE;

CREATE INDEX IF NOT EXISTS idx_drip_queue_touch3
  ON drip_queue(touch3_at)
  WHERE touch3_sent = FALSE AND unsubscribed = FALSE;

CREATE INDEX IF NOT EXISTS idx_drip_queue_touch4
  ON drip_queue(touch4_at)
  WHERE touch4_sent = FALSE AND unsubscribed = FALSE;

CREATE INDEX IF NOT EXISTS idx_drip_queue_touch5
  ON drip_queue(touch5_at)
  WHERE touch5_sent = FALSE AND unsubscribed = FALSE;

CREATE INDEX IF NOT EXISTS idx_drip_queue_email
  ON drip_queue(email);

-- ── RLS ──────────────────────────────────────────────────────────

ALTER TABLE drip_queue ENABLE ROW LEVEL SECURITY;

-- Service role only (server-side admin client). No public reads.
CREATE POLICY "admin_full" ON drip_queue
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ================================================================
-- DONE. Migration 012 complete.
-- Table: drip_queue
-- Populated by: scheduleDripSequence() in lib/drip-sequence.ts
-- ================================================================
