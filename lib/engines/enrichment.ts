/**
 * GHOST TAX — WATERFALL ENRICHMENT ENGINE (SERVER-ONLY)
 *
 * Sprint 2: findDecisionMaker() — Waterfall CFO/Finance Director discovery.
 *
 * Cascade:
 *   1. Apollo.io (/people/match) — APOLLO_API_KEY
 *   2. Dropcontact (/enrich) — DROPCONTACT_API_KEY
 *   3. Test profile — if no API keys, returns John Doe for flow validation
 *
 * 429 Protection:
 *   - If any API returns 429, waits 2s before cascading to next step
 *   - Uses fetchWithRetry for base resilience (exponential backoff)
 *
 * Usage:
 *   import { findDecisionMaker } from "@/lib/engines/enrichment";
 *   const result = await findDecisionMaker("acme.com");
 */

import { fetchWithRetry } from "@/lib/network/fetch-retry";

// ══════════════════════════════════════════════════════
//  TYPES
// ══════════════════════════════════════════════════════

export interface DecisionMaker {
  firstName: string;
  lastName: string;
  fullName: string;
  title: string;
  email: string | null;
  linkedinUrl: string | null;
  phone: string | null;
  source: "apollo" | "dropcontact" | "test_profile";
  confidence: number;               // 0-100
  domain: string;
}

export interface EnrichmentResult {
  target: DecisionMaker | null;
  source: "apollo" | "dropcontact" | "test_profile" | "none";
  executionMs: number;
  errors: string[];                 // Non-fatal errors from each cascade step
  rateLimited: boolean;             // True if any API returned 429
}

// Backward compat alias
export type CFOTarget = DecisionMaker;

// Target titles ranked by priority
const DECISION_MAKER_TITLES = [
  "cfo", "chief financial officer",
  "finance director", "directeur financier", "directrice financière",
  "vp finance", "vice president finance",
  "head of finance", "responsable financier",
  "financial controller", "contrôleur financier",
  "cto", "chief technology officer",    // Fallback if no finance target
  "cio", "chief information officer",
  "head of it", "dsi", "directeur des systèmes d'information",
];

// 429 cooldown before cascading to next API
const RATE_LIMIT_COOLDOWN_MS = 2_000;

// ══════════════════════════════════════════════════════
//  APOLLO.IO — Primary source (/people/match)
// ══════════════════════════════════════════════════════

interface ApolloSearchResult {
  target: DecisionMaker | null;
  rateLimited: boolean;
  error: string | null;
}

async function searchApollo(domain: string): Promise<ApolloSearchResult> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    return { target: null, rateLimited: false, error: "APOLLO_API_KEY not configured" };
  }

  try {
    const resp = await fetchWithRetry(
      "https://api.apollo.io/api/v1/people/match",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "X-Api-Key": apiKey,
        },
        body: JSON.stringify({
          organization_domain: domain,
          person_titles: [
            "CFO", "Chief Financial Officer",
            "Finance Director", "VP Finance",
            "Head of Finance", "Directeur Financier",
          ],
          page: 1,
          per_page: 5,
        }),
      },
      {
        retries: 2,
        timeoutMs: 12_000,
        baseDelayMs: 1_500,
        // Don't retry on 429 — we handle it ourselves with cascade cooldown
        retryOnStatus: [500, 502, 503, 504],
        onRetry: (attempt, status, delay) => {
          console.warn(
            `[Enrichment] Apollo retry ${attempt} (status=${status}, delay=${Math.round(delay)}ms)`,
          );
        },
      },
    );

    // ── 429 Rate Limit: signal to cascade with cooldown ──
    if (resp.status === 429) {
      console.warn("[Enrichment] Apollo 429 — rate limited, cooling down 2s before cascade");
      return { target: null, rateLimited: true, error: "Apollo: 429 rate limited" };
    }

    if (!resp.ok) {
      return {
        target: null,
        rateLimited: false,
        error: `Apollo: HTTP ${resp.status}`,
      };
    }

    const data = await resp.json() as {
      people?: Array<{
        first_name?: string;
        last_name?: string;
        title?: string;
        email?: string;
        linkedin_url?: string;
        phone_numbers?: Array<{ sanitized_number?: string }>;
      }>;
      person?: {
        first_name?: string;
        last_name?: string;
        title?: string;
        email?: string;
        linkedin_url?: string;
        phone_numbers?: Array<{ sanitized_number?: string }>;
      };
    };

    // /people/match can return either `person` (single) or `people` (array)
    const candidates = data.people || (data.person ? [data.person] : []);
    if (candidates.length === 0) {
      return { target: null, rateLimited: false, error: "Apollo: no results for " + domain };
    }

    // Find best match by title priority
    const ranked = candidates
      .filter((p) => p.first_name && p.last_name && p.title)
      .sort((a, b) => titlePriority(a.title || "") - titlePriority(b.title || ""));

    const best = ranked[0];
    if (!best) {
      return { target: null, rateLimited: false, error: "Apollo: no titled candidates" };
    }

    const phone = best.phone_numbers?.[0]?.sanitized_number || null;

    return {
      target: {
        firstName: best.first_name || "",
        lastName: best.last_name || "",
        fullName: `${best.first_name} ${best.last_name}`.trim(),
        title: best.title || "",
        email: best.email || null,
        linkedinUrl: best.linkedin_url || null,
        phone,
        source: "apollo",
        confidence: best.email ? 80 : 60,
        domain,
      },
      rateLimited: false,
      error: null,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[Enrichment] Apollo error:", msg);
    return { target: null, rateLimited: false, error: `Apollo: ${msg}` };
  }
}

// ══════════════════════════════════════════════════════
//  DROPCONTACT — EU fallback (/enrich, GDPR-compliant)
// ══════════════════════════════════════════════════════

interface DropcontactSearchResult {
  target: DecisionMaker | null;
  rateLimited: boolean;
  error: string | null;
}

async function searchDropcontact(domain: string): Promise<DropcontactSearchResult> {
  const apiKey = process.env.DROPCONTACT_API_KEY;
  if (!apiKey) {
    return { target: null, rateLimited: false, error: "DROPCONTACT_API_KEY not configured" };
  }

  try {
    const resp = await fetchWithRetry(
      "https://api.dropcontact.com/enrich",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Access-Token": apiKey,
        },
        body: JSON.stringify({
          data: [{ company: domain, website: domain }],
          siren: false,
          language: "en",
        }),
      },
      {
        retries: 2,
        timeoutMs: 12_000,
        baseDelayMs: 1_500,
        retryOnStatus: [500, 502, 503, 504],
        onRetry: (attempt, status, delay) => {
          console.warn(
            `[Enrichment] Dropcontact retry ${attempt} (status=${status}, delay=${Math.round(delay)}ms)`,
          );
        },
      },
    );

    // ── 429 Rate Limit ──
    if (resp.status === 429) {
      console.warn("[Enrichment] Dropcontact 429 — rate limited");
      return { target: null, rateLimited: true, error: "Dropcontact: 429 rate limited" };
    }

    if (!resp.ok) {
      return {
        target: null,
        rateLimited: false,
        error: `Dropcontact: HTTP ${resp.status}`,
      };
    }

    const data = await resp.json() as {
      data?: Array<{
        first_name?: string;
        last_name?: string;
        full_name?: string;
        job_title?: string;
        email?: Array<{ email?: string; qualification?: string }>;
        linkedin?: string;
        phone?: string;
      }>;
      request_id?: string;
    };

    if (!data.data || data.data.length === 0) {
      return { target: null, rateLimited: false, error: "Dropcontact: no results for " + domain };
    }

    const person = data.data[0];
    if (!person.first_name || !person.last_name) {
      return { target: null, rateLimited: false, error: "Dropcontact: incomplete data" };
    }

    const email = person.email?.find((e) => e.qualification !== "invalid")?.email || null;

    return {
      target: {
        firstName: person.first_name,
        lastName: person.last_name,
        fullName: person.full_name || `${person.first_name} ${person.last_name}`,
        title: person.job_title || "Finance Director",
        email,
        linkedinUrl: person.linkedin || null,
        phone: person.phone || null,
        source: "dropcontact",
        confidence: email ? 70 : 50,
        domain,
      },
      rateLimited: false,
      error: null,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[Enrichment] Dropcontact error:", msg);
    return { target: null, rateLimited: false, error: `Dropcontact: ${msg}` };
  }
}

// ══════════════════════════════════════════════════════
//  TEST PROFILE — Flow validation fallback
// ══════════════════════════════════════════════════════

function getTestProfile(domain: string): DecisionMaker {
  return {
    firstName: "John",
    lastName: "Doe",
    fullName: "John Doe",
    title: "CFO (Test Profile)",
    email: `cfo@${domain}`,
    linkedinUrl: null,
    phone: null,
    source: "test_profile",
    confidence: 10,
    domain,
  };
}

// ══════════════════════════════════════════════════════
//  MAIN: findDecisionMaker() — Waterfall Enrichment
// ══════════════════════════════════════════════════════

/**
 * Find the CFO/Finance Director for a domain using waterfall enrichment.
 *
 * Cascade: Apollo (/people/match) → Dropcontact (/enrich) → Test Profile.
 *
 * 429 Protection:
 * - If Apollo returns 429, waits 2s before trying Dropcontact
 * - If Dropcontact also returns 429, waits 2s then falls back to test profile or null
 */
export async function findDecisionMaker(domain: string): Promise<EnrichmentResult> {
  const start = Date.now();
  const errors: string[] = [];
  let rateLimited = false;
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();

  // ── Attempt 1: Apollo (/people/match) ────────────
  if (process.env.APOLLO_API_KEY) {
    const apollo = await searchApollo(cleanDomain);

    if (apollo.error) errors.push(apollo.error);

    if (apollo.rateLimited) {
      rateLimited = true;
      // Cooldown before cascade
      await sleep(RATE_LIMIT_COOLDOWN_MS);
    }

    if (apollo.target) {
      return {
        target: apollo.target,
        source: "apollo",
        executionMs: Date.now() - start,
        errors,
        rateLimited,
      };
    }
  } else {
    errors.push("Apollo: APOLLO_API_KEY not configured");
  }

  // ── Attempt 2: Dropcontact (/enrich) ─────────────
  if (process.env.DROPCONTACT_API_KEY) {
    const dc = await searchDropcontact(cleanDomain);

    if (dc.error) errors.push(dc.error);

    if (dc.rateLimited) {
      rateLimited = true;
      // Cooldown before giving up
      await sleep(RATE_LIMIT_COOLDOWN_MS);
    }

    if (dc.target) {
      return {
        target: dc.target,
        source: "dropcontact",
        executionMs: Date.now() - start,
        errors,
        rateLimited,
      };
    }
  } else {
    errors.push("Dropcontact: DROPCONTACT_API_KEY not configured");
  }

  // ── Fallback: Test Profile ───────────────────────
  const hasAnyKey = process.env.APOLLO_API_KEY || process.env.DROPCONTACT_API_KEY;
  if (!hasAnyKey) {
    return {
      target: getTestProfile(cleanDomain),
      source: "test_profile",
      executionMs: Date.now() - start,
      errors,
      rateLimited,
    };
  }

  // All APIs tried, no results
  return {
    target: null,
    source: "none",
    executionMs: Date.now() - start,
    errors,
    rateLimited,
  };
}

/**
 * Backward compat: findCFOTarget() is an alias for findDecisionMaker().
 */
export const findCFOTarget = findDecisionMaker;

// ── Helpers ──────────────────────────────────────────

function titlePriority(title: string): number {
  const lower = title.toLowerCase();
  for (let i = 0; i < DECISION_MAKER_TITLES.length; i++) {
    if (lower.includes(DECISION_MAKER_TITLES[i])) return i;
  }
  return DECISION_MAKER_TITLES.length;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
