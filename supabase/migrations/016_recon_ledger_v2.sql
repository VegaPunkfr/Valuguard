-- ══════════════════════════════════════════════════════════════════
-- RECON LEDGER V2 — 6-Layer Operational Memory System
-- Migration 016 · Ghost Tax · April 2026
-- ══════════════════════════════════════════════════════════════════

-- ┌─────────────────────────────────────────────────────────┐
-- │ LAYER 1: DISCOVERY MEMORY                              │
-- │ What was searched, when, why, and what came back        │
-- └─────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS recon_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'apollo',
  search_type TEXT NOT NULL DEFAULT 'people_search',
  strategic_intent TEXT,
  trigger_source TEXT NOT NULL DEFAULT 'manual',
  query_payload JSONB NOT NULL DEFAULT '{}',
  filters_summary TEXT NOT NULL DEFAULT '',
  result_count INTEGER DEFAULT 0,
  useful_count INTEGER DEFAULT 0,
  credits_consumed INTEGER DEFAULT 0,
  session_quality TEXT DEFAULT 'unknown'
    CHECK (session_quality IN ('productive','mixed','empty','unknown')),
  reuse_recommended BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recon_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES recon_sessions(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL DEFAULT 'person'
    CHECK (entity_type IN ('person','company')),
  external_id TEXT,
  source_method TEXT DEFAULT 'search'
    CHECK (source_method IN ('search','enrichment','waterfall','import','sync','webhook','manual')),
  rank_in_results INTEGER,
  raw_payload JSONB NOT NULL DEFAULT '{}',
  normalized JSONB NOT NULL DEFAULT '{}',
  has_email BOOLEAN DEFAULT false,
  has_phone BOOLEAN DEFAULT false,
  captured_at TIMESTAMPTZ DEFAULT now()
);

-- ┌─────────────────────────────────────────────────────────┐
-- │ LAYER 2: ENTITY MEMORY                                 │
-- │ Cumulative knowledge per person and company             │
-- └─────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS recon_people (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dedupe_key TEXT UNIQUE NOT NULL,
  canonical_name TEXT NOT NULL,
  canonical_email TEXT,
  canonical_title TEXT,
  canonical_linkedin TEXT,
  canonical_photo_url TEXT,
  canonical_country TEXT,
  canonical_city TEXT,
  canonical_timezone TEXT,
  external_ids JSONB DEFAULT '[]',
  name_variations JSONB DEFAULT '[]',
  email_variations JSONB DEFAULT '[]',
  title_variations JSONB DEFAULT '[]',
  -- Temporal
  first_seen_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  first_enriched_at TIMESTAMPTZ,
  last_enriched_at TIMESTAMPTZ,
  last_verified_at TIMESTAMPTZ,
  -- Counters
  appearance_count INTEGER DEFAULT 1,
  search_session_count INTEGER DEFAULT 1,
  source_count INTEGER DEFAULT 1,
  enrichment_count INTEGER DEFAULT 0,
  -- Change tracking
  data_version INTEGER DEFAULT 1,
  last_change_summary TEXT,
  job_changed_flag BOOLEAN DEFAULT false,
  contact_improved_flag BOOLEAN DEFAULT false,
  -- Quality
  email_status TEXT DEFAULT 'unknown',
  data_confidence TEXT DEFAULT 'low'
    CHECK (data_confidence IN ('high','medium','low','unknown')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recon_companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dedupe_key TEXT UNIQUE NOT NULL,
  canonical_name TEXT NOT NULL,
  canonical_domain TEXT,
  canonical_industry TEXT,
  canonical_country TEXT,
  canonical_city TEXT,
  employee_count INTEGER,
  revenue_printed TEXT,
  revenue_amount FLOAT,
  tech_stack JSONB DEFAULT '[]',
  keywords JSONB DEFAULT '[]',
  funding_total TEXT,
  latest_funding_stage TEXT,
  headcount_growth_6m FLOAT,
  headcount_growth_12m FLOAT,
  external_ids JSONB DEFAULT '[]',
  name_variations JSONB DEFAULT '[]',
  -- Temporal
  first_seen_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  last_enriched_at TIMESTAMPTZ,
  -- Counters
  appearance_count INTEGER DEFAULT 1,
  search_session_count INTEGER DEFAULT 1,
  data_version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ┌─────────────────────────────────────────────────────────┐
-- │ LAYER 3: RELATIONSHIP MEMORY                           │
-- │ Person ↔ Company links over time                       │
-- └─────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS recon_person_company (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  person_id UUID NOT NULL REFERENCES recon_people(id) ON DELETE CASCADE,
  company_id UUID REFERENCES recon_companies(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  company_domain TEXT,
  title TEXT,
  is_current BOOLEAN DEFAULT true,
  confidence TEXT DEFAULT 'medium'
    CHECK (confidence IN ('high','medium','low')),
  started_at DATE,
  ended_at DATE,
  first_observed_at TIMESTAMPTZ DEFAULT now(),
  last_observed_at TIMESTAMPTZ DEFAULT now(),
  observation_count INTEGER DEFAULT 1,
  source TEXT DEFAULT 'apollo'
);

-- ┌─────────────────────────────────────────────────────────┐
-- │ LAYER 4: ACTION MEMORY                                 │
-- │ Every operational action taken on an entity             │
-- └─────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS recon_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL DEFAULT 'person'
    CHECK (entity_type IN ('person','company')),
  entity_id UUID NOT NULL,
  action_type TEXT NOT NULL
    CHECK (action_type IN (
      'email_drafted','email_sent','email_opened','email_replied','email_bounced',
      'linkedin_viewed','linkedin_connected','linkedin_messaged',
      'injected_to_campaign','removed_from_campaign',
      'enrichment_requested','enrichment_completed',
      'status_changed','priority_changed',
      'tagged','untagged','note_added',
      'marked_revisit','marked_suppress',
      'merged','split'
    )),
  action_data JSONB DEFAULT '{}',
  campaign_id TEXT,
  channel TEXT,
  performed_by TEXT DEFAULT 'operator',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ┌─────────────────────────────────────────────────────────┐
-- │ LAYER 5: OPERATIONAL STATE                             │
-- │ Projected current state per entity — pilotable view     │
-- └─────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS recon_ops_state (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL DEFAULT 'person'
    CHECK (entity_type IN ('person','company')),
  entity_id UUID NOT NULL UNIQUE,
  -- State machine
  current_status TEXT NOT NULL DEFAULT 'discovered'
    CHECK (current_status IN (
      'discovered','reviewed','shortlisted','contacted',
      'replied','nurturing','deferred','qualified',
      'closed','suppressed'
    )),
  previous_status TEXT,
  status_changed_at TIMESTAMPTZ DEFAULT now(),
  -- Priority
  priority_score INTEGER DEFAULT 0,
  priority_reason TEXT,
  -- Next action
  next_action_type TEXT,
  next_action_due_at TIMESTAMPTZ,
  revisit_after TIMESTAMPTZ,
  -- Contact history
  last_contacted_at TIMESTAMPTZ,
  last_contacted_channel TEXT,
  last_response_at TIMESTAMPTZ,
  contact_attempt_count INTEGER DEFAULT 0,
  -- Blockers
  blocked_reason TEXT,
  is_recontactable BOOLEAN DEFAULT true,
  -- Campaign
  active_campaigns TEXT[] DEFAULT '{}',
  -- Computed
  actionable_now BOOLEAN DEFAULT true,
  -- Tags
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ┌─────────────────────────────────────────────────────────┐
-- │ LAYER 6: PATTERN INTELLIGENCE (materialized views)     │
-- │ What works, what doesn't — aggregated for fast read     │
-- └─────────────────────────────────────────────────────────┘

-- Session performance (materialized for speed)
CREATE MATERIALIZED VIEW IF NOT EXISTS recon_session_performance AS
SELECT
  s.id,
  s.search_type,
  s.strategic_intent,
  s.filters_summary,
  s.result_count,
  s.useful_count,
  s.credits_consumed,
  s.session_quality,
  s.created_at,
  CASE WHEN s.credits_consumed > 0
    THEN ROUND(s.useful_count::numeric / s.credits_consumed, 2)
    ELSE 0 END AS yield_rate,
  COUNT(DISTINCT a.id) FILTER (WHERE a.action_type = 'email_sent') AS emails_sent,
  COUNT(DISTINCT a.id) FILTER (WHERE a.action_type = 'email_replied') AS replies,
  COUNT(DISTINCT a.id) FILTER (WHERE a.action_type = 'injected_to_campaign') AS injections
FROM recon_sessions s
LEFT JOIN recon_snapshots snap ON snap.session_id = s.id
LEFT JOIN recon_people p ON p.dedupe_key = (snap.normalized->>'dedupe_key')
LEFT JOIN recon_actions a ON a.entity_id = p.id AND a.entity_type = 'person'
GROUP BY s.id
WITH NO DATA;

-- Entity pivot: link entities to sessions
CREATE TABLE IF NOT EXISTS recon_entity_sessions (
  person_id UUID REFERENCES recon_people(id) ON DELETE CASCADE,
  session_id UUID REFERENCES recon_sessions(id) ON DELETE CASCADE,
  snapshot_id UUID REFERENCES recon_snapshots(id) ON DELETE SET NULL,
  appeared_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (person_id, session_id)
);

-- Merge log: track dedup decisions
CREATE TABLE IF NOT EXISTS recon_merge_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  winner_id UUID NOT NULL,
  loser_id UUID NOT NULL,
  merge_reason TEXT,
  before_state JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ┌─────────────────────────────────────────────────────────┐
-- │ INDEXES                                                │
-- └─────────────────────────────────────────────────────────┘

CREATE INDEX IF NOT EXISTS idx_recon_sess_created ON recon_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recon_sess_intent ON recon_sessions(strategic_intent);
CREATE INDEX IF NOT EXISTS idx_recon_snap_session ON recon_snapshots(session_id);
CREATE INDEX IF NOT EXISTS idx_recon_snap_ext ON recon_snapshots(external_id);
CREATE INDEX IF NOT EXISTS idx_recon_ppl_dedupe ON recon_people(dedupe_key);
CREATE INDEX IF NOT EXISTS idx_recon_ppl_email ON recon_people(canonical_email);
CREATE INDEX IF NOT EXISTS idx_recon_ppl_seen ON recon_people(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_recon_ppl_name_fts ON recon_people USING gin(
  to_tsvector('simple', canonical_name || ' ' || COALESCE(canonical_email,'') || ' ' || COALESCE(canonical_title,''))
);
CREATE INDEX IF NOT EXISTS idx_recon_co_dedupe ON recon_companies(dedupe_key);
CREATE INDEX IF NOT EXISTS idx_recon_co_domain ON recon_companies(canonical_domain);
CREATE INDEX IF NOT EXISTS idx_recon_pc_person ON recon_person_company(person_id);
CREATE INDEX IF NOT EXISTS idx_recon_pc_company ON recon_person_company(company_id);
CREATE INDEX IF NOT EXISTS idx_recon_pc_current ON recon_person_company(is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_recon_act_entity ON recon_actions(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_recon_act_type ON recon_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_recon_act_created ON recon_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recon_ops_entity ON recon_ops_state(entity_id);
CREATE INDEX IF NOT EXISTS idx_recon_ops_status ON recon_ops_state(current_status);
CREATE INDEX IF NOT EXISTS idx_recon_ops_priority ON recon_ops_state(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_recon_ops_actionable ON recon_ops_state(actionable_now) WHERE actionable_now = true;
CREATE INDEX IF NOT EXISTS idx_recon_ops_next ON recon_ops_state(next_action_due_at) WHERE next_action_due_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recon_esess_session ON recon_entity_sessions(session_id);

-- ┌─────────────────────────────────────────────────────────┐
-- │ RLS — service_role only                                │
-- └─────────────────────────────────────────────────────────┘

ALTER TABLE recon_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recon_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE recon_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE recon_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE recon_person_company ENABLE ROW LEVEL SECURITY;
ALTER TABLE recon_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recon_ops_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE recon_entity_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recon_merge_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_all" ON recon_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON recon_snapshots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON recon_people FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON recon_companies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON recon_person_company FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON recon_actions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON recon_ops_state FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON recon_entity_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON recon_merge_log FOR ALL USING (true) WITH CHECK (true);

-- ┌─────────────────────────────────────────────────────────┐
-- │ STATE MACHINE TRANSITIONS (enforced by API, not DB)    │
-- │                                                        │
-- │ discovered → reviewed → shortlisted → contacted        │
-- │                    ↓         ↓            ↓            │
-- │               suppressed  deferred    replied          │
-- │                                          ↓             │
-- │                                      nurturing         │
-- │                                          ↓             │
-- │                                      qualified         │
-- │                                          ↓             │
-- │                                       closed           │
-- │                                                        │
-- │ Any state → suppressed (terminal)                      │
-- │ deferred → discovered (re-entry after revisit_after)   │
-- └─────────────────────────────────────────────────────────┘
