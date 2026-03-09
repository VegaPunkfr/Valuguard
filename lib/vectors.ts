/**
 * GHOST TAX — VECTOR MEMORY LAYER (SERVER-ONLY)
 *
 * Uses Supabase pgvector for similarity search across:
 *   - company profiles (enrichment data)
 *   - financial signals (anomaly patterns)
 *   - audit cases (historical outcomes)
 *   - remediation patterns (corrective protocols)
 *
 * Architecture:
 *   Exa collects → Vectors store + understand → UI reveals
 *
 * Embedding strategy:
 *   OpenAI text-embedding-3-small (1536 dimensions)
 *   Falls back to a deterministic hash embedding for dev/demo mode
 *
 * Required env: OPENAI_API_KEY (for real embeddings)
 * Required env: SUPABASE_SERVICE_ROLE_KEY (for admin writes)
 */

import { createAdminSupabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────

export type VectorCategory =
  | "company_profile"
  | "financial_signal"
  | "audit_case"
  | "remediation_pattern"
  | "evidence_fragment"
  | "sector_reference";

export interface VectorEntry {
  id?: string;
  category: VectorCategory;
  content: string;
  metadata: Record<string, unknown>;
  embedding?: number[];
}

export interface SimilarityResult {
  id: string;
  category: VectorCategory;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

// ── Embedding ─────────────────────────────────────────

const EMBEDDING_DIM = 1536;

async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    // Deterministic fallback for dev/demo: hash-based pseudo-embedding
    return hashEmbedding(text);
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text.slice(0, 8000),
    }),
  });

  if (!response.ok) {
    console.warn("[Ghost Tax] OpenAI embedding failed, using hash fallback");
    return hashEmbedding(text);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Deterministic hash-based pseudo-embedding for dev mode.
 * NOT suitable for production similarity — only for schema validation.
 */
function hashEmbedding(text: string): number[] {
  const embedding = new Float64Array(EMBEDDING_DIM);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  const rng = mulberry32(Math.abs(hash));
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    embedding[i] = rng() * 2 - 1;
  }
  // Normalize to unit vector
  const norm = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
  return Array.from(embedding.map((v) => v / norm));
}

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Store ─────────────────────────────────────────────

export async function storeVector(entry: VectorEntry): Promise<string | null> {
  const supabase = createAdminSupabase();
  if (!supabase) {
    console.warn("[Ghost Tax] Supabase not configured. Vector not stored.");
    return null;
  }

  const embedding = entry.embedding || (await generateEmbedding(entry.content));

  const { data, error } = await (supabase as any)
    .from("vg_vectors")
    .insert({
      category: entry.category,
      content: entry.content,
      metadata: entry.metadata,
      embedding: JSON.stringify(embedding),
    })
    .select("id")
    .single();

  if (error) {
    console.error("[Ghost Tax] Vector insert failed:", error.message);
    return null;
  }

  return data?.id || null;
}

/**
 * Store multiple vectors in a batch (e.g. after Exa enrichment).
 */
export async function storeVectors(entries: VectorEntry[]): Promise<number> {
  let stored = 0;
  // Process in batches of 5 to avoid overloading the embedding API
  for (let i = 0; i < entries.length; i += 5) {
    const batch = entries.slice(i, i + 5);
    const results = await Promise.all(batch.map((e) => storeVector(e)));
    stored += results.filter(Boolean).length;
  }
  return stored;
}

// ── Search ────────────────────────────────────────────

export async function searchSimilar(
  query: string,
  options: {
    category?: VectorCategory;
    limit?: number;
    threshold?: number;
  } = {},
): Promise<SimilarityResult[]> {
  const supabase = createAdminSupabase();
  if (!supabase) {
    console.warn("[Ghost Tax] Supabase not configured. Vector search unavailable.");
    return [];
  }

  const { category, limit = 5, threshold = 0.3 } = options;
  const queryEmbedding = await generateEmbedding(query);

  const { data, error } = await (supabase as any).rpc("vg_match_vectors", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: limit,
    match_threshold: threshold,
    filter_category: category || null,
  });

  if (error) {
    console.error("[Ghost Tax] Vector search failed:", error.message);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    category: row.category,
    content: row.content,
    metadata: row.metadata,
    similarity: row.similarity,
  }));
}

/**
 * Find companies with similar financial patterns.
 */
export async function findSimilarCompanies(
  companyDescription: string,
  limit = 5,
): Promise<SimilarityResult[]> {
  return searchSimilar(companyDescription, {
    category: "company_profile",
    limit,
    threshold: 0.4,
  });
}

/**
 * Find similar cost leakage cases.
 */
export async function findSimilarLeakPatterns(
  anomalyDescription: string,
  limit = 5,
): Promise<SimilarityResult[]> {
  return searchSimilar(anomalyDescription, {
    category: "financial_signal",
    limit,
    threshold: 0.35,
  });
}

/**
 * Find applicable remediation protocols.
 */
export async function findRemediationProtocols(
  issueDescription: string,
  limit = 3,
): Promise<SimilarityResult[]> {
  return searchSimilar(issueDescription, {
    category: "remediation_pattern",
    limit,
    threshold: 0.3,
  });
}
