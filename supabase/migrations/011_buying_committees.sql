-- ================================================================
-- GHOST TAX — MIGRATION 011: BUYING COMMITTEES
--
-- Stores buying committee state detected by lib/buying-committee.ts.
-- When 2+ stakeholders from the same company domain interact,
-- the system flags a buying committee and tracks conviction,
-- stage progression, and recommended rail.
-- ================================================================

-- ═══════════ BUYING COMMITTEES TABLE ═══════════

CREATE TABLE IF NOT EXISTS buying_committees (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  domain              TEXT NOT NULL UNIQUE,
  company_name        TEXT,
  stakeholders        JSONB NOT NULL DEFAULT '[]',
  committee_size      INTEGER NOT NULL DEFAULT 1,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  formation_date      TIMESTAMPTZ,
  total_conviction    INTEGER NOT NULL DEFAULT 0,
  stage               TEXT NOT NULL DEFAULT 'forming'
                      CHECK (stage IN ('forming', 'evaluating', 'deciding', 'ready')),
  recommended_rail    TEXT NOT NULL DEFAULT 'A'
                      CHECK (recommended_rail IN ('A', 'B_STABILIZE', 'B_MONITOR')),
  estimated_deal_size NUMERIC NOT NULL DEFAULT 490,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Domain lookup (primary query path)
CREATE INDEX IF NOT EXISTS idx_bc_domain
  ON buying_committees (domain);

-- Active committees with 2+ stakeholders (pipeline dashboard)
CREATE INDEX IF NOT EXISTS idx_bc_active_pipeline
  ON buying_committees (total_conviction DESC)
  WHERE is_active = TRUE AND committee_size >= 2;

-- Stage filtering for outreach prioritization
CREATE INDEX IF NOT EXISTS idx_bc_stage
  ON buying_committees (stage)
  WHERE is_active = TRUE;

-- Deal size for revenue forecasting
CREATE INDEX IF NOT EXISTS idx_bc_deal_size
  ON buying_committees (estimated_deal_size DESC)
  WHERE committee_size >= 2;

ALTER TABLE buying_committees ENABLE ROW LEVEL SECURITY;

-- Service role only — never exposed to client
CREATE POLICY "service_role_full_access" ON buying_committees
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ═══════════ AUTO-UPDATE TRIGGER ═══════════

CREATE OR REPLACE FUNCTION update_bc_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bc_updated_at ON buying_committees;
CREATE TRIGGER trg_bc_updated_at
  BEFORE UPDATE ON buying_committees
  FOR EACH ROW EXECUTE FUNCTION update_bc_updated_at();

-- ================================================================
-- DONE. Migration 011 complete.
-- Table: buying_committees
-- ================================================================
