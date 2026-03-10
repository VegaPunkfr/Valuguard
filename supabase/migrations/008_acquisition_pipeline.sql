-- ================================================================
-- GHOST TAX — MIGRATION 008: ACQUISITION PIPELINE TABLES
--
-- Supports four new server-side engines:
--   1. Visitor Intelligence (lib/visitor-intel.ts)
--   2. Intent Scanner (lib/intent-scanner.ts)
--   3. Viral Loop (lib/viral-loop.ts)
--   4. Checkout Recovery (lib/checkout-recovery.ts)
--
-- Also extends vault_sessions and outreach_leads with columns
-- referenced by flywheel.ts and the intent-scan cron.
--
-- All tables use IF NOT EXISTS. All ALTER use ADD COLUMN IF NOT EXISTS.
-- RLS enabled on every new table. No public policies — service_role only.
-- ================================================================


-- ════════════════════════════════════════════════════════════════
-- TABLE: visitor_intel_cache
-- Caches IP-to-company resolutions with 24h TTL.
-- Used by lib/visitor-intel.ts resolveIPToCompany().
-- Privacy: stores ip_hash (FNV-1a), never raw IP.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS visitor_intel_cache (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash     TEXT NOT NULL,
  org         TEXT NOT NULL DEFAULT '',
  domain      TEXT,
  country     TEXT NOT NULL DEFAULT 'Unknown',
  city        TEXT NOT NULL DEFAULT 'Unknown',
  is_b2b      BOOLEAN NOT NULL DEFAULT FALSE,
  cached_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique on ip_hash for upsert (onConflict: "ip_hash")
CREATE UNIQUE INDEX IF NOT EXISTS idx_vic_ip_hash
  ON visitor_intel_cache (ip_hash);

-- TTL cleanup: find stale entries
CREATE INDEX IF NOT EXISTS idx_vic_cached_at
  ON visitor_intel_cache (cached_at);

-- Domain lookup for cross-referencing
CREATE INDEX IF NOT EXISTS idx_vic_domain
  ON visitor_intel_cache (domain)
  WHERE domain IS NOT NULL;

ALTER TABLE visitor_intel_cache ENABLE ROW LEVEL SECURITY;

-- No public policies — only service_role (createAdminSupabase) can access


-- ════════════════════════════════════════════════════════════════
-- TABLE: visitor_intel_raw
-- Raw visitor data before processing.
-- Populated by visitor tracking middleware, consumed by batch processor.
-- Fields: ip, headers (JSONB), pages_viewed (TEXT[]), processed flag.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS visitor_intel_raw (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip            TEXT NOT NULL,
  headers       JSONB NOT NULL DEFAULT '{}',
  pages_viewed  TEXT[] NOT NULL DEFAULT '{}',
  processed     BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Batch processor queries: unprocessed in last 6h, ordered by created_at DESC
CREATE INDEX IF NOT EXISTS idx_vir_unprocessed
  ON visitor_intel_raw (created_at DESC)
  WHERE processed = FALSE;

-- IP lookup for getVisitorPages()
CREATE INDEX IF NOT EXISTS idx_vir_ip_created
  ON visitor_intel_raw (ip, created_at DESC);

-- Time-based cleanup
CREATE INDEX IF NOT EXISTS idx_vir_created_at
  ON visitor_intel_raw (created_at DESC);

ALTER TABLE visitor_intel_raw ENABLE ROW LEVEL SECURITY;

-- No public policies — only service_role can access


-- ════════════════════════════════════════════════════════════════
-- TABLE: visitor_intel_pipeline
-- High-intent B2B visitors enriched and ready for outreach.
-- Populated by lib/visitor-intel.ts processHighIntentVisitor().
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS visitor_intel_pipeline (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company             TEXT,
  domain              TEXT,
  country             TEXT NOT NULL DEFAULT 'Unknown',
  city                TEXT NOT NULL DEFAULT 'Unknown',
  org                 TEXT,
  visit_score         INTEGER NOT NULL DEFAULT 0,
  pages_viewed        TEXT[] NOT NULL DEFAULT '{}',
  high_intent         BOOLEAN NOT NULL DEFAULT FALSE,
  enrichment_summary  TEXT,
  tech_mentions       JSONB DEFAULT '[]',
  signals_count       INTEGER NOT NULL DEFAULT 0,
  intent_signals      TEXT[] DEFAULT '{}',
  geo_market          TEXT,
  identified_at       TIMESTAMPTZ,
  enriched_at         TIMESTAMPTZ,
  status              TEXT NOT NULL DEFAULT 'new'
                      CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'dismissed')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Domain lookup for dedup and cross-referencing
CREATE INDEX IF NOT EXISTS idx_vip_domain
  ON visitor_intel_pipeline (domain)
  WHERE domain IS NOT NULL;

-- Status-based querying
CREATE INDEX IF NOT EXISTS idx_vip_status
  ON visitor_intel_pipeline (status);

-- Score-based prioritization
CREATE INDEX IF NOT EXISTS idx_vip_score
  ON visitor_intel_pipeline (visit_score DESC);

-- Time-based queries
CREATE INDEX IF NOT EXISTS idx_vip_created_at
  ON visitor_intel_pipeline (created_at DESC);

-- Geo market filtering
CREATE INDEX IF NOT EXISTS idx_vip_geo_market
  ON visitor_intel_pipeline (geo_market)
  WHERE geo_market IS NOT NULL;

ALTER TABLE visitor_intel_pipeline ENABLE ROW LEVEL SECURITY;

-- No public policies — only service_role can access


-- ════════════════════════════════════════════════════════════════
-- EXTEND: vault_sessions
-- Add domain column (referenced by flywheel.ts, checkout-recovery.ts,
-- intent-scan cron) and locale column.
-- Also extend status CHECK to include 'intent_detected'.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE vault_sessions
  ADD COLUMN IF NOT EXISTS domain TEXT;

-- Index on domain for dedup and cross-referencing
CREATE INDEX IF NOT EXISTS idx_vault_domain
  ON vault_sessions (domain)
  WHERE domain IS NOT NULL;

-- Extend status CHECK to support new pipeline states
-- (Drop + re-add since PG doesn't support ALTER CHECK)
ALTER TABLE vault_sessions DROP CONSTRAINT IF EXISTS vault_sessions_status_check;
ALTER TABLE vault_sessions ADD CONSTRAINT vault_sessions_status_check
  CHECK (status IN (
    'pending', 'contacted', 'qualified', 'converted', 'lost',
    'intent_detected', 'scan_sent', 'expired'
  ));


-- ════════════════════════════════════════════════════════════════
-- EXTEND: outreach_leads
-- Add columns referenced by intent-scan cron and flywheel outreach.
-- Fields: company, locale, drip_step, last_sent_at, next_send_at,
--         unsubscribed, converted, geo_market, email_quality.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE outreach_leads
  ADD COLUMN IF NOT EXISTS company TEXT,
  ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS drip_step INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_send_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS unsubscribed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS converted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS geo_market TEXT,
  ADD COLUMN IF NOT EXISTS email_quality TEXT DEFAULT 'unknown';

-- Extend status CHECK to include intent pipeline states
ALTER TABLE outreach_leads DROP CONSTRAINT IF EXISTS outreach_leads_status_check;
ALTER TABLE outreach_leads ADD CONSTRAINT outreach_leads_status_check
  CHECK (status IN (
    'new', 'contacted', 'replied', 'qualified', 'converted',
    'unsubscribed', 'bounced', 'intent_detected', 'nurturing'
  ));

-- Index for drip sequence cron: find active leads needing next email
CREATE INDEX IF NOT EXISTS idx_outreach_next_send
  ON outreach_leads (next_send_at)
  WHERE unsubscribed = FALSE AND converted = FALSE AND next_send_at IS NOT NULL;

-- Index for geo-market segmentation
CREATE INDEX IF NOT EXISTS idx_outreach_geo_market
  ON outreach_leads (geo_market)
  WHERE geo_market IS NOT NULL;

-- Index on domain for dedup against intent scanner
CREATE INDEX IF NOT EXISTS idx_outreach_domain
  ON outreach_leads (domain)
  WHERE domain IS NOT NULL;


-- ════════════════════════════════════════════════════════════════
-- EXTEND: events
-- Ensure the events table supports viral loop tracking.
-- The table already has event_name TEXT and properties JSONB.
-- Viral events use event_name = 'viral.*' with properties including
-- source_run_id, target_email, target_domain.
--
-- The viral-loop.ts inserts WITHOUT organization_id or user_id
-- (server-side anonymous tracking), so we need these to be nullable.
-- They already are (REFERENCES allows NULL by default).
--
-- Add a composite index for viral event queries.
-- ════════════════════════════════════════════════════════════════

-- Index for viral event queries by event_name + source_run_id
CREATE INDEX IF NOT EXISTS idx_events_viral
  ON events (event_name, (properties->>'source_run_id'))
  WHERE event_name LIKE 'viral.%';

-- Index for event_name filtering (general)
CREATE INDEX IF NOT EXISTS idx_events_name
  ON events (event_name);

-- Ensure events can be inserted by service_role without auth
-- (viral tracking is server-side, no auth context)
-- The existing RLS requires auth.uid() for INSERT, which would block
-- server-side viral event inserts via service_role. Service_role
-- bypasses RLS, so no policy change needed.


-- ════════════════════════════════════════════════════════════════
-- EXTEND: audit_requests
-- Add monitoring status values for subscription lifecycle.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE audit_requests DROP CONSTRAINT IF EXISTS audit_requests_status_check;
ALTER TABLE audit_requests ADD CONSTRAINT audit_requests_status_check
  CHECK (status IN (
    'pending', 'paid', 'processing', 'delivered', 'failed',
    'followup_scheduled', 'lost',
    'monitoring_active', 'monitoring_cancelled', 'monitoring_paused',
    'report_persisted'
  ));


-- ════════════════════════════════════════════════════════════════
-- DONE. Migration 008 complete.
-- Tables created: visitor_intel_cache, visitor_intel_raw, visitor_intel_pipeline
-- Tables extended: vault_sessions (+domain), outreach_leads (+8 cols),
--                  events (+viral index), audit_requests (+status values)
-- ════════════════════════════════════════════════════════════════
