-- ================================================================
-- GHOST TAX — MIGRATION 010: DRIP STATE TRACKING
--
-- Enables the 5-touch post-scan drip sequence (drip-architect skill).
-- Tracks per-lead, per-sequence state with branching logic.
-- Also adds connector_credentials for OAuth connector activation.
-- ================================================================

-- ═══════════ DRIP STATE TABLE ═══════════

CREATE TABLE IF NOT EXISTS drip_state (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id       UUID NOT NULL,
  lead_email    TEXT NOT NULL,
  domain        TEXT,
  sequence      TEXT NOT NULL DEFAULT 'post_scan',
  current_touch INTEGER DEFAULT 0,
  status        TEXT DEFAULT 'active'
                CHECK (status IN ('active', 'paused', 'completed', 'converted', 'unsubscribed', 'dead')),
  branch        TEXT DEFAULT 'default'
                CHECK (branch IN ('default', 'opened', 'not_opened', 'clicked', 'replied')),
  last_sent_at  TIMESTAMPTZ,
  next_touch_at TIMESTAMPTZ,
  opened_count  INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  replied       BOOLEAN DEFAULT FALSE,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lead_id, sequence)
);

-- Cron query: find active drips needing next touch
CREATE INDEX IF NOT EXISTS idx_drip_next_touch
  ON drip_state (next_touch_at)
  WHERE status = 'active' AND next_touch_at IS NOT NULL;

-- Lead lookup
CREATE INDEX IF NOT EXISTS idx_drip_lead_email
  ON drip_state (lead_email);

-- Domain lookup for dedup
CREATE INDEX IF NOT EXISTS idx_drip_domain
  ON drip_state (domain)
  WHERE domain IS NOT NULL;

-- Status filtering
CREATE INDEX IF NOT EXISTS idx_drip_status
  ON drip_state (status);

ALTER TABLE drip_state ENABLE ROW LEVEL SECURITY;

-- ═══════════ CONNECTOR CREDENTIALS TABLE ═══════════
-- Stores OAuth tokens/service account creds for the 5 active connectors.
-- Encrypted at rest via Supabase (pgcrypto or application-level).
-- RLS: service_role only. Never exposed to client.

CREATE TABLE IF NOT EXISTS connector_credentials (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID,
  connector_id    TEXT NOT NULL,
  connector_name  TEXT NOT NULL,
  auth_type       TEXT NOT NULL DEFAULT 'oauth2'
                  CHECK (auth_type IN ('oauth2', 'service_account', 'api_key', 'basic')),
  credentials     JSONB NOT NULL DEFAULT '{}',
  scopes          TEXT[] DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'active', 'expired', 'revoked', 'error')),
  last_sync_at    TIMESTAMPTZ,
  last_error      TEXT,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, connector_id)
);

-- Connector lookup
CREATE INDEX IF NOT EXISTS idx_cc_connector_id
  ON connector_credentials (connector_id);

-- Org lookup
CREATE INDEX IF NOT EXISTS idx_cc_org_id
  ON connector_credentials (organization_id)
  WHERE organization_id IS NOT NULL;

-- Active connectors for sync crons
CREATE INDEX IF NOT EXISTS idx_cc_active
  ON connector_credentials (connector_id, status)
  WHERE status = 'active';

ALTER TABLE connector_credentials ENABLE ROW LEVEL SECURITY;

-- ═══════════ AUTO-UPDATE TRIGGERS ═══════════

CREATE OR REPLACE FUNCTION update_drip_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_drip_updated_at ON drip_state;
CREATE TRIGGER trg_drip_updated_at
  BEFORE UPDATE ON drip_state
  FOR EACH ROW EXECUTE FUNCTION update_drip_updated_at();

CREATE OR REPLACE FUNCTION update_cc_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cc_updated_at ON connector_credentials;
CREATE TRIGGER trg_cc_updated_at
  BEFORE UPDATE ON connector_credentials
  FOR EACH ROW EXECUTE FUNCTION update_cc_updated_at();

-- ================================================================
-- DONE. Migration 010 complete.
-- Tables: drip_state, connector_credentials
-- ================================================================
