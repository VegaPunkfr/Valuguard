-- ================================================================
-- GHOST TAX — MIGRATION 009: OSINT PROSPECTS TABLE
--
-- State machine for the zero-touch OSINT acquisition pipeline.
-- Domain is UNIQUE for idempotent upsert (no duplicate scanning).
-- RLS enabled — service_role only (no public access).
--
-- States: DISCOVERED → ENRICHING → SCORED → READY_FOR_OUTREACH
--         → OUTREACH_SENT → NURTURING → CONVERTED | DEAD
-- ================================================================

CREATE TABLE IF NOT EXISTS osint_prospects (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain            TEXT NOT NULL,
  company_name      TEXT,
  industry          TEXT,
  headcount         INTEGER,
  source_signal     TEXT NOT NULL,
  source_query      TEXT NOT NULL,
  source_url        TEXT,
  intent_score      INTEGER NOT NULL DEFAULT 0,
  exposure_low_eur  INTEGER,
  exposure_high_eur INTEGER,
  geo_market        TEXT,
  locale            TEXT NOT NULL DEFAULT 'en',
  enrichment_data   JSONB DEFAULT '{}',
  status            TEXT NOT NULL DEFAULT 'DISCOVERED'
                    CHECK (status IN (
                      'DISCOVERED', 'ENRICHING', 'SCORED',
                      'READY_FOR_OUTREACH', 'OUTREACH_SENT',
                      'NURTURING', 'CONVERTED', 'DEAD'
                    )),
  status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error        TEXT,
  retry_count       INTEGER NOT NULL DEFAULT 0,
  outreach_sent_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- UNIQUE on domain: enables idempotent upsert, zero duplicate scanning
CREATE UNIQUE INDEX IF NOT EXISTS idx_osint_domain
  ON osint_prospects (domain);

-- Status-based queue processing (DISCOVERED for enrichment, READY for outreach)
CREATE INDEX IF NOT EXISTS idx_osint_status
  ON osint_prospects (status, created_at ASC);

-- Intent score ranking for prioritized outreach
CREATE INDEX IF NOT EXISTS idx_osint_intent_score
  ON osint_prospects (intent_score DESC)
  WHERE status = 'READY_FOR_OUTREACH';

-- Geo market segmentation
CREATE INDEX IF NOT EXISTS idx_osint_geo_market
  ON osint_prospects (geo_market)
  WHERE geo_market IS NOT NULL;

-- Time-based cleanup and reporting
CREATE INDEX IF NOT EXISTS idx_osint_created_at
  ON osint_prospects (created_at DESC);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_osint_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_osint_updated_at ON osint_prospects;
CREATE TRIGGER trg_osint_updated_at
  BEFORE UPDATE ON osint_prospects
  FOR EACH ROW EXECUTE FUNCTION update_osint_updated_at();

-- RLS: service_role only
ALTER TABLE osint_prospects ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- DONE. Migration 009 complete.
-- Table: osint_prospects (domain UNIQUE, state machine, JSONB enrichment)
-- Indexes: domain, status+created_at, intent_score, geo_market, created_at
-- Trigger: auto-update updated_at
-- ================================================================
