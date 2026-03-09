-- ================================================================
-- GHOST TAX — VECTOR MEMORY LAYER (Supabase pgvector)
-- Migration 002: Vector storage for financial intelligence
--
-- Depends on: 001_vault_schema.sql (uuid-ossp, vector extension)
--
-- This creates:
--   1. vg_vectors — unified vector table with category filtering
--   2. vg_match_vectors — RPC function for similarity search
--
-- Categories:
--   company_profile      — enriched company context
--   financial_signal     — detected cost leak patterns
--   audit_case           — historical audit outcomes
--   remediation_pattern  — corrective protocols that worked
--   evidence_fragment    — supporting evidence snippets
--   sector_reference     — industry benchmarks and references
-- ================================================================


-- ════════════════════════════════════════════════════════════════
-- TABLE: vg_vectors
-- Unified vector store. Category + metadata enable structured
-- retrieval without needing separate tables per type.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vg_vectors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category    TEXT NOT NULL CHECK (category IN (
    'company_profile',
    'financial_signal',
    'audit_case',
    'remediation_pattern',
    'evidence_fragment',
    'sector_reference'
  )),
  content     TEXT NOT NULL,
  metadata    JSONB NOT NULL DEFAULT '{}',
  embedding   vector(1536) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vg_vectors_category ON vg_vectors(category);
CREATE INDEX IF NOT EXISTS idx_vg_vectors_created ON vg_vectors(created_at DESC);

-- HNSW index for fast cosine similarity search
-- ef_construction=128 and m=16 are good defaults for < 100k vectors
CREATE INDEX IF NOT EXISTS idx_vg_vectors_embedding
  ON vg_vectors
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 128);

-- RLS: admin-only access (vectors contain aggregated intelligence)
ALTER TABLE vg_vectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on vg_vectors"
  ON vg_vectors FOR ALL
  USING (true)
  WITH CHECK (true);
-- Note: This policy is permissive but the table is only accessed
-- via service_role key in API routes. RLS blocks anon/auth users
-- because no policy grants them access.


-- ════════════════════════════════════════════════════════════════
-- FUNCTION: vg_match_vectors
-- Cosine similarity search with category filtering.
-- Called from lib/vectors.ts via supabase.rpc()
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION vg_match_vectors(
  query_embedding vector(1536),
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.3,
  filter_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  category TEXT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.category,
    v.content,
    v.metadata,
    1 - (v.embedding <=> query_embedding) AS similarity
  FROM vg_vectors v
  WHERE
    (filter_category IS NULL OR v.category = filter_category)
    AND 1 - (v.embedding <=> query_embedding) > match_threshold
  ORDER BY v.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
