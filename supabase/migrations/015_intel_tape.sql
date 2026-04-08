-- ══════════════════════════════════════════════════════════════════
-- INTEL TAPE — Apollo Search Memory System
-- Migration 015 · Ghost Tax · April 2026
-- ══════════════════════════════════════════════════════════════════

-- 1. SEARCH SESSIONS — memory of every search executed
CREATE TABLE IF NOT EXISTS intel_search_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'apollo',
  search_type TEXT NOT NULL DEFAULT 'people_search',
  query_payload JSONB NOT NULL DEFAULT '{}',
  filters_summary TEXT,
  trigger_source TEXT NOT NULL DEFAULT 'manual',
  result_count INTEGER DEFAULT 0,
  enrichment_flags JSONB DEFAULT '{}',
  notes TEXT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. RESULT SNAPSHOTS — frozen view of results at capture time
CREATE TABLE IF NOT EXISTS intel_result_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES intel_search_sessions(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL DEFAULT 'person',
  external_id TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}',
  normalized JSONB NOT NULL DEFAULT '{}',
  rank_in_results INTEGER,
  source_method TEXT DEFAULT 'search',
  has_email BOOLEAN DEFAULT false,
  has_phone BOOLEAN DEFAULT false,
  captured_at TIMESTAMPTZ DEFAULT now()
);

-- 3. CANONICAL ENTITIES — deduplicated living memory per person/company
CREATE TABLE IF NOT EXISTS intel_canonical_entities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL DEFAULT 'person',
  canonical_name TEXT NOT NULL,
  canonical_email TEXT,
  canonical_title TEXT,
  canonical_company TEXT,
  canonical_domain TEXT,
  canonical_country TEXT,
  canonical_industry TEXT,
  external_ids JSONB DEFAULT '[]',
  dedupe_key TEXT UNIQUE,
  first_seen_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  last_enriched_at TIMESTAMPTZ,
  source_count INTEGER DEFAULT 1,
  search_session_count INTEGER DEFAULT 1,
  appearance_count INTEGER DEFAULT 1,
  contact_status TEXT DEFAULT 'new',
  reusable_tags TEXT[] DEFAULT '{}',
  tech_stack JSONB DEFAULT '[]',
  enrichment_history JSONB DEFAULT '[]',
  campaign_links JSONB DEFAULT '[]',
  freshness_score INTEGER DEFAULT 100,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. ENTITY-SESSION PIVOT — tracks which entities appeared in which sessions
CREATE TABLE IF NOT EXISTS intel_entity_sessions (
  entity_id UUID REFERENCES intel_canonical_entities(id) ON DELETE CASCADE,
  session_id UUID REFERENCES intel_search_sessions(id) ON DELETE CASCADE,
  snapshot_id UUID REFERENCES intel_result_snapshots(id) ON DELETE SET NULL,
  appeared_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (entity_id, session_id)
);

-- 5. ENRICHMENT EVENTS — log of every enrichment action
CREATE TABLE IF NOT EXISTS intel_enrichment_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id UUID REFERENCES intel_canonical_entities(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  provider TEXT DEFAULT 'apollo',
  before_state JSONB DEFAULT '{}',
  after_state JSONB DEFAULT '{}',
  credits_consumed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_sessions_created ON intel_search_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_provider ON intel_search_sessions(provider);
CREATE INDEX IF NOT EXISTS idx_snapshots_session ON intel_result_snapshots(session_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_external ON intel_result_snapshots(external_id);
CREATE INDEX IF NOT EXISTS idx_entities_dedupe ON intel_canonical_entities(dedupe_key);
CREATE INDEX IF NOT EXISTS idx_entities_domain ON intel_canonical_entities(canonical_domain);
CREATE INDEX IF NOT EXISTS idx_entities_status ON intel_canonical_entities(contact_status);
CREATE INDEX IF NOT EXISTS idx_entities_seen ON intel_canonical_entities(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_entities_name ON intel_canonical_entities USING gin(to_tsvector('english', canonical_name || ' ' || COALESCE(canonical_company, '')));
CREATE INDEX IF NOT EXISTS idx_enrichment_entity ON intel_enrichment_events(entity_id);

-- RLS
ALTER TABLE intel_search_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_result_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_canonical_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_entity_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_enrichment_events ENABLE ROW LEVEL SECURITY;

-- Service role only (cockpit API routes use service role)
CREATE POLICY "service_role_sessions" ON intel_search_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_snapshots" ON intel_result_snapshots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_entities" ON intel_canonical_entities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_entity_sessions" ON intel_entity_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_enrichment" ON intel_enrichment_events FOR ALL USING (true) WITH CHECK (true);
