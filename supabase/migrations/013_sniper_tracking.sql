-- ================================================================
-- GHOST TAX — MIGRATION 013: SNIPER OUTREACH TRACKING
--
-- Adds tracking columns for the Sniper Outreach engine (Sprint 4).
-- - opened_at: first time the audit link was opened
-- - sniper_sent_at: when the sniper email was fired
-- - Extends status CHECK to include 'OPENED'
-- ================================================================

-- Add new columns
ALTER TABLE osint_prospects
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sniper_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tracking_id TEXT;

-- Unique index on tracking_id for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_osint_tracking_id
  ON osint_prospects (tracking_id)
  WHERE tracking_id IS NOT NULL;

-- Extend status CHECK to include OPENED
-- Drop old constraint, add new one
ALTER TABLE osint_prospects DROP CONSTRAINT IF EXISTS osint_prospects_status_check;
ALTER TABLE osint_prospects
  ADD CONSTRAINT osint_prospects_status_check
  CHECK (status IN (
    'DISCOVERED', 'ENRICHING', 'SCORED',
    'READY_FOR_OUTREACH', 'OUTREACH_SENT', 'OPENED',
    'NURTURING', 'CONVERTED', 'DEAD', 'AUDITED', 'PAID'
  ));

-- Index for opened audits (conversion funnel)
CREATE INDEX IF NOT EXISTS idx_osint_opened
  ON osint_prospects (opened_at DESC)
  WHERE opened_at IS NOT NULL;

-- ================================================================
-- DONE. Migration 013 complete.
-- Added: opened_at, sniper_sent_at, tracking_id columns
-- Extended status: + OPENED, AUDITED
-- ================================================================
