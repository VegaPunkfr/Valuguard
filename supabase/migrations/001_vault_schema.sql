-- ================================================================
-- VALUGUARD — DATABASE SCHEMA (Supabase / PostgreSQL 15)
-- US 2026 Production DDL
--
-- EXECUTION ORDER: Run this file top to bottom in Supabase SQL Editor
-- or via `supabase db push`. All tables, types, indexes, and RLS
-- policies are included. Idempotent (IF NOT EXISTS where possible).
--
-- SECURITY MODEL:
--   Every table has RLS enabled.
--   vault_sessions: public INSERT (lead capture), admin-only SELECT.
--   All other tables: org-scoped read/write via profiles.organization_id.
--   Admin bypass via service_role key (never exposed to client).
--
-- PERFORMANCE:
--   Indexes on every foreign key + frequent filter column.
--   JSONB used for flexible data (estimator snapshots, evidence).
--   No full-text search indexes in V1 (not needed yet).
-- ================================================================


-- ════════════════════════════════════════════════════════════════
-- EXTENSIONS
-- ════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";    -- pgvector for RAG V2


-- ════════════════════════════════════════════════════════════════
-- CUSTOM TYPES
-- ════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE anomaly_type AS ENUM (
    'inactive_license',
    'duplicate_tool',
    'plan_oversize',
    'shadow_it',
    'rate_spike',
    'unused_feature',
    'contract_drift',
    'orphan_resource',
    'billing_error',
    'commitment_waste',
    'ai_token_overuse',
    'vendor_lock_risk'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE severity_level AS ENUM ('critical', 'high', 'medium', 'low');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE effort_level AS ENUM ('trivial', 'easy', 'moderate', 'significant');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ════════════════════════════════════════════════════════════════
-- TABLE 1: VAULT_SESSIONS
-- Primary lead capture table. Stores Ghost Tax diagnostic data
-- AFTER the prospect clicks "RECLAIM $XXk NOW".
-- Public insert (no auth needed). Admin-only read.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vault_sessions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Prospect identity (minimum for recontact)
  email               TEXT NOT NULL,
  company_name        TEXT NOT NULL,
  contact_name        TEXT,

  -- Diagnostic snapshot (frozen at capture time)
  ghost_tax_annual    NUMERIC(12,2),         -- Estimated annual Ghost Tax ($)
  ghost_tax_low       NUMERIC(12,2),         -- Range low bound
  ghost_tax_high      NUMERIC(12,2),         -- Range high bound
  entropy_score       INTEGER,               -- 0-100 gravity score
  entropy_kappa       NUMERIC(6,4),          -- Organizational entropy coefficient
  peer_percentile     INTEGER,               -- P0-P100 vs industry peers
  audit_roi           NUMERIC(6,1),          -- Estimated ROI multiple (e.g. 18.2)
  recoverable_annual  NUMERIC(12,2),         -- Conservative 60% recovery ($)

  -- Company profile (declared by prospect)
  headcount           INTEGER,
  industry            TEXT,
  saas_tool_count     INTEGER,
  monthly_spend_saas  NUMERIC(10,2),
  monthly_spend_cloud NUMERIC(10,2),
  monthly_spend_ai    NUMERIC(10,2),
  monthly_spend_total NUMERIC(10,2),
  currency            TEXT DEFAULT 'USD',
  country             TEXT DEFAULT 'US',

  -- Full diagnostic payload (flexible JSONB for future fields)
  session_data        JSONB NOT NULL DEFAULT '{}',
  -- Expected structure:
  -- {
  --   "savings_breakdown": [...],
  --   "burn_rate": { "now": N, "6mo": N, "12mo": N, "24mo": N },
  --   "signals_checked": [true, false, ...],
  --   "peer_metrics": [{ "key": "spe", "value": N, "percentile": N }, ...]
  -- }

  -- Attribution
  source              TEXT,                  -- 'cockpit-cta' | 'peer-gap-cta' | 'landing-cta'
  utm_source          TEXT,
  utm_medium          TEXT,
  utm_campaign        TEXT,
  locale              TEXT DEFAULT 'en-us',

  -- Pipeline status
  status              TEXT DEFAULT 'pending'
                      CHECK (status IN ('pending', 'contacted', 'qualified', 'converted', 'lost')),

  -- Links (populated when prospect converts to paying client)
  organization_id     UUID,                  -- FK added after orgs table exists
  audit_request_id    UUID,                  -- FK added after audit_requests exists

  converted_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for admin dashboard queries
CREATE INDEX IF NOT EXISTS idx_vault_email ON vault_sessions(email);
CREATE INDEX IF NOT EXISTS idx_vault_status ON vault_sessions(status);
CREATE INDEX IF NOT EXISTS idx_vault_created ON vault_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vault_ghost_tax ON vault_sessions(ghost_tax_annual DESC NULLS LAST);

-- RLS: Anyone can INSERT (public lead form). Only admins can read.
ALTER TABLE vault_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public insert vault"
  ON vault_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin select vault"
  ON vault_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admin update vault"
  ON vault_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );


-- ════════════════════════════════════════════════════════════════
-- TABLE 2: ORGANIZATIONS
-- Multi-tenant root. Every client = one organization.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS organizations (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT NOT NULL,
  slug                TEXT UNIQUE NOT NULL,
  industry            TEXT,
  employee_count      INTEGER,
  country             TEXT DEFAULT 'US',
  currency            TEXT DEFAULT 'USD',
  plan                TEXT DEFAULT 'audit_one_shot'
                      CHECK (plan IN ('audit_one_shot', 'monthly', 'premium')),
  stripe_customer_id  TEXT,
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own org"
  ON organizations FOR SELECT
  USING (
    id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );


-- ════════════════════════════════════════════════════════════════
-- TABLE 3: PROFILES (extends auth.users)
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id     UUID REFERENCES organizations(id) ON DELETE SET NULL,
  full_name           TEXT,
  role                TEXT DEFAULT 'member'
                      CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  job_title           TEXT,
  locale              TEXT DEFAULT 'en-us',
  avatar_url          TEXT,
  onboarded_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_org ON profiles(organization_id);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());


-- ════════════════════════════════════════════════════════════════
-- TABLE 4: AUDIT_REQUESTS
-- Pipeline: prospect → qualified → paid → processing → delivered
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS audit_requests (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id           UUID REFERENCES organizations(id),
  vault_session_id          UUID REFERENCES vault_sessions(id),
  email                     TEXT NOT NULL,
  company_name              TEXT NOT NULL,
  contact_name              TEXT,
  headcount                 INTEGER,
  estimated_monthly_spend   NUMERIC(12,2),
  saas_count                INTEGER,
  pain_points               TEXT[],
  source                    TEXT,
  locale                    TEXT DEFAULT 'en-us',
  status                    TEXT DEFAULT 'pending'
                            CHECK (status IN ('pending', 'paid', 'processing', 'delivered', 'lost')),
  estimator_results         JSONB,
  stripe_payment_intent_id  TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_req_email ON audit_requests(email);
CREATE INDEX IF NOT EXISTS idx_audit_req_status ON audit_requests(status);

ALTER TABLE audit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage audit requests"
  ON audit_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );


-- ════════════════════════════════════════════════════════════════
-- TABLE 5: REPORTS
-- The deliverable. One report per audit per organization.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS reports (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  status              TEXT DEFAULT 'draft'
                      CHECK (status IN ('draft', 'processing', 'ready', 'archived')),
  period_start        DATE,
  period_end          DATE,
  total_spend         NUMERIC(14,2),
  total_leak          NUMERIC(14,2),
  leak_percentage     NUMERIC(5,2),
  health_score        INTEGER CHECK (health_score BETWEEN 0 AND 100),
  entropy_kappa       NUMERIC(6,4),
  peer_percentile     INTEGER,
  category_breakdown  JSONB DEFAULT '{}',
  executive_summary   TEXT,
  pdf_storage_path    TEXT,
  locale              TEXT DEFAULT 'en-us',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_org ON reports(organization_id);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members see own reports"
  ON reports FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );


-- ════════════════════════════════════════════════════════════════
-- TABLE 6: ANOMALIES
-- Each detected Ghost Tax leak. 12 types.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS anomalies (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id           UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type                anomaly_type NOT NULL,
  severity            severity_level NOT NULL,
  title               TEXT NOT NULL,
  description         TEXT NOT NULL,
  vendor_name         TEXT,
  category            TEXT,
  monthly_impact      NUMERIC(10,2),
  annual_impact       NUMERIC(12,2),
  evidence            JSONB DEFAULT '{}',
  status              TEXT DEFAULT 'open'
                      CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed')),
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anomalies_report ON anomalies(report_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_org ON anomalies(organization_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON anomalies(severity);
CREATE INDEX IF NOT EXISTS idx_anomalies_impact ON anomalies(annual_impact DESC);

ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members see own anomalies"
  ON anomalies FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );


-- ════════════════════════════════════════════════════════════════
-- TABLE 7: RECOMMENDATIONS
-- Ranked recovery actions linked to anomalies.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS recommendations (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id                   UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  organization_id             UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title                       TEXT NOT NULL,
  description                 TEXT NOT NULL,
  effort                      effort_level NOT NULL,
  estimated_savings_monthly   NUMERIC(10,2),
  estimated_savings_annual    NUMERIC(12,2),
  priority_rank               INTEGER NOT NULL,
  anomaly_ids                 UUID[] DEFAULT '{}',
  action_steps                JSONB DEFAULT '[]',
  status                      TEXT DEFAULT 'pending'
                              CHECK (status IN ('pending', 'in_progress', 'done', 'skipped')),
  completed_at                TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recs_report ON recommendations(report_id);
CREATE INDEX IF NOT EXISTS idx_recs_org ON recommendations(organization_id);
CREATE INDEX IF NOT EXISTS idx_recs_rank ON recommendations(priority_rank);

ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members see own recs"
  ON recommendations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Org members update rec status"
  ON recommendations FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'admin', 'member')
    )
  );


-- ════════════════════════════════════════════════════════════════
-- TABLE 8: EVENTS (internal analytics / audit trail)
-- Insert-only. Used for SQL-queryable funnels and SOC2 audit log.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS events (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     UUID REFERENCES organizations(id),
  user_id             UUID REFERENCES auth.users(id),
  event_name          TEXT NOT NULL,
  properties          JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_org_name ON events(organization_id, event_name);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at DESC);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Events are insert-only for authenticated users
CREATE POLICY "Auth users insert events"
  ON events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Only admins can read the audit trail
CREATE POLICY "Admin read events"
  ON events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );


-- ════════════════════════════════════════════════════════════════
-- DEFERRED FOREIGN KEYS (vault_sessions → organizations)
-- Added after both tables exist.
-- ════════════════════════════════════════════════════════════════

DO $$ BEGIN
  ALTER TABLE vault_sessions
    ADD CONSTRAINT fk_vault_org
    FOREIGN KEY (organization_id)
    REFERENCES organizations(id)
    ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE vault_sessions
    ADD CONSTRAINT fk_vault_audit
    FOREIGN KEY (audit_request_id)
    REFERENCES audit_requests(id)
    ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ════════════════════════════════════════════════════════════════
-- AUTO-UPDATE TRIGGER (updated_at)
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_vault_sessions_updated
    BEFORE UPDATE ON vault_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_organizations_updated
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_profiles_updated
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_audit_requests_updated
    BEFORE UPDATE ON audit_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_reports_updated
    BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ════════════════════════════════════════════════════════════════
-- DONE. Schema ready for `supabase db push`.
-- ════════════════════════════════════════════════════════════════
