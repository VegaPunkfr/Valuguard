/**
 * GHOST TAX — OSINT SECURE STORAGE (SERVER-ONLY)
 *
 * Persists audit results into Supabase `osint_prospects` table
 * with AES-256-GCM encryption via lib/crypto.ts.
 *
 * Flow:
 *   1. Serialize InfrastructureAnalysis to JSON
 *   2. Encrypt via encryptJSON() (AES-256-GCM, iv:tag:cipher format)
 *   3. Upsert into osint_prospects.enrichment_data (JSONB)
 *   4. Return persisted record ID or null on failure
 *
 * Graceful degradation: if ENCRYPTION_MASTER_KEY is not set,
 * data is stored in cleartext (dev mode).
 *
 * Usage:
 *   import { saveAuditResult, loadAuditResult } from "@/lib/db/osint-storage";
 *   const id = await saveAuditResult("acme.com", analysisData);
 *   const data = await loadAuditResult("acme.com");
 */

import { createAdminSupabase } from "@/lib/supabase";
import {
  encryptJSON,
  decryptJSON,
  isEncryptionConfigured,
} from "@/lib/crypto";
import type { InfrastructureAnalysis } from "@/lib/engines/shadow-bill";
import type { DecisionMaker } from "@/lib/engines/enrichment";

// ══════════════════════════════════════════════════════
//  TYPES
// ══════════════════════════════════════════════════════

export interface EnrichmentPayload {
  infrastructure: InfrastructureAnalysis;
  decisionMaker?: DecisionMaker | null;
  enrichedAt?: string;
  enrichmentSource?: "apollo" | "dropcontact" | "test_profile" | "none";
}

export interface StoredAudit {
  domain: string;
  status: string;
  enrichment_data: {
    _encrypted: boolean;
    _encryptedAt?: string;
    payload: string;               // Encrypted JSON string (or cleartext in dev)
    shadowBillVersion: string;
  } | EnrichmentPayload;           // Cleartext fallback
  intent_score: number;
  exposure_low_eur: number;
  exposure_high_eur: number;
  geo_market: string | null;
  persisted_at: string;
}

export interface SaveResult {
  success: boolean;
  domain: string;
  encrypted: boolean;
  error?: string;
}

// ══════════════════════════════════════════════════════
//  SAVE — Encrypt + Upsert
// ══════════════════════════════════════════════════════

/**
 * Persist an infrastructure analysis to osint_prospects.
 *
 * - Encrypts enrichment_data if ENCRYPTION_MASTER_KEY is configured
 * - Upserts on domain (unique constraint)
 * - Sets status to DISCOVERED
 * - Extracts key financial metrics for indexed columns
 */
export async function saveAuditResult(
  domain: string,
  analysis: InfrastructureAnalysis,
  options?: {
    status?: string;
    geoMarket?: string;
    companyName?: string;
    decisionMaker?: DecisionMaker | null;
    enrichmentSource?: "apollo" | "dropcontact" | "test_profile" | "none";
  },
): Promise<SaveResult> {
  const cleanDomain = domain
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .toLowerCase();

  const supabase = createAdminSupabase();
  if (!supabase) {
    return {
      success: false,
      domain: cleanDomain,
      encrypted: false,
      error: "Supabase not configured",
    };
  }

  // ── Build full enrichment payload ──────────────────
  const fullPayload: EnrichmentPayload = {
    infrastructure: analysis,
    decisionMaker: options?.decisionMaker ?? null,
    enrichedAt: new Date().toISOString(),
    enrichmentSource: options?.enrichmentSource ?? "none",
  };

  // ── Encrypt payload ────────────────────────────────
  let enrichmentData: Record<string, unknown>;
  const encrypted = isEncryptionConfigured();

  if (encrypted) {
    enrichmentData = {
      _encrypted: true,
      _encryptedAt: new Date().toISOString(),
      payload: encryptJSON(fullPayload),
      shadowBillVersion: "2.0",
    };
  } else {
    // Dev mode: store cleartext with flag
    enrichmentData = {
      _encrypted: false,
      ...fullPayload,
      shadowBillVersion: "2.0",
    };
  }

  // ── Detect geo market from TLD ─────────────────────
  const tld = cleanDomain.split(".").pop()?.toLowerCase() || "";
  let geoMarket = options?.geoMarket || null;
  if (!geoMarket) {
    if (tld === "fr") geoMarket = "FR";
    else if (tld === "de" || tld === "at" || tld === "ch") geoMarket = "DE";
    else if (tld === "nl" || tld === "be") geoMarket = "NL";
    else if (tld === "com" || tld === "us" || tld === "io") geoMarket = "US";
    else geoMarket = "EU";
  }

  // ── Upsert into osint_prospects ────────────────────
  try {
    const { error } = await (supabase
      .from("osint_prospects") as ReturnType<typeof supabase.from>)
      .upsert(
        {
          domain: cleanDomain,
          company_name: options?.companyName || cleanDomain,
          status: options?.status || "DISCOVERED",
          intent_score: analysis.confidence,
          exposure_low_eur: analysis.totalWasteEur,
          exposure_high_eur: analysis.totalEstimatedSpendEur,
          enrichment_data: enrichmentData,
          geo_market: geoMarket,
          status_changed_at: new Date().toISOString(),
        } as Record<string, unknown>,
        { onConflict: "domain" },
      );

    if (error) {
      console.error("[OSINT Storage] Supabase upsert failed:", error.message);
      return {
        success: false,
        domain: cleanDomain,
        encrypted,
        error: error.message,
      };
    }

    return { success: true, domain: cleanDomain, encrypted };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[OSINT Storage] Exception:", msg);
    return { success: false, domain: cleanDomain, encrypted, error: msg };
  }
}

// ══════════════════════════════════════════════════════
//  LOAD — Fetch + Decrypt
// ══════════════════════════════════════════════════════

/**
 * Retrieve and decrypt an audit result from osint_prospects.
 * Returns the full EnrichmentPayload (infrastructure + decisionMaker) or null.
 */
export async function loadAuditResult(
  domain: string,
): Promise<EnrichmentPayload | null> {
  const cleanDomain = domain
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .toLowerCase();

  const supabase = createAdminSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await (supabase
      .from("osint_prospects") as ReturnType<typeof supabase.from>)
      .select("enrichment_data")
      .eq("domain", cleanDomain)
      .order("status_changed_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    const row = data as Record<string, unknown>;
    const enrichment = row.enrichment_data as Record<string, unknown>;
    if (!enrichment) return null;

    // Check if encrypted
    if (enrichment._encrypted === true && typeof enrichment.payload === "string") {
      try {
        const decrypted = decryptJSON<EnrichmentPayload | InfrastructureAnalysis>(
          enrichment.payload as string,
        );
        // Handle v1 format (InfrastructureAnalysis only, no wrapper)
        if (decrypted && "domain" in decrypted && "detectedVendors" in decrypted) {
          return {
            infrastructure: decrypted as InfrastructureAnalysis,
            decisionMaker: null,
            enrichmentSource: "none",
          };
        }
        return decrypted as EnrichmentPayload;
      } catch {
        console.warn("[OSINT Storage] Decryption failed for", cleanDomain);
        return null;
      }
    }

    // Cleartext (dev mode) — strip internal flags
    const { _encrypted, shadowBillVersion, ...rest } = enrichment;

    // Handle v1 cleartext (no wrapper, InfrastructureAnalysis directly)
    if ("domain" in rest && "detectedVendors" in rest) {
      return {
        infrastructure: rest as unknown as InfrastructureAnalysis,
        decisionMaker: null,
        enrichmentSource: "none",
      };
    }

    return rest as unknown as EnrichmentPayload;
  } catch (err) {
    console.error("[OSINT Storage] Load error:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Convenience: load only the InfrastructureAnalysis (backward compat).
 */
export async function loadInfrastructureAnalysis(
  domain: string,
): Promise<InfrastructureAnalysis | null> {
  const payload = await loadAuditResult(domain);
  return payload?.infrastructure ?? null;
}

// ══════════════════════════════════════════════════════
//  BATCH — List recent audits
// ══════════════════════════════════════════════════════

/**
 * List recent audit domains with metadata (no decryption).
 * For admin dashboards and pipeline monitoring.
 */
export async function listRecentAudits(
  limit: number = 50,
  status?: string,
): Promise<Array<{
  domain: string;
  status: string;
  intent_score: number;
  exposure_low_eur: number;
  exposure_high_eur: number;
  geo_market: string | null;
  status_changed_at: string;
}>> {
  const supabase = createAdminSupabase();
  if (!supabase) return [];

  let query = (supabase
    .from("osint_prospects") as ReturnType<typeof supabase.from>)
    .select("domain, status, intent_score, exposure_low_eur, exposure_high_eur, geo_market, status_changed_at")
    .order("status_changed_at", { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq("status", status);
  }

  const { data } = await query;
  return (data as Array<Record<string, unknown>> || []).map((row) => ({
    domain: row.domain as string,
    status: row.status as string,
    intent_score: (row.intent_score as number) || 0,
    exposure_low_eur: (row.exposure_low_eur as number) || 0,
    exposure_high_eur: (row.exposure_high_eur as number) || 0,
    geo_market: (row.geo_market as string) || null,
    status_changed_at: (row.status_changed_at as string) || "",
  }));
}
