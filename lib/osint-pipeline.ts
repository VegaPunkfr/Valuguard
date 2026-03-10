/**
 * GHOST TAX — OSINT ACQUISITION PIPELINE (SERVER-ONLY)
 *
 * Zero-touch, fail-safe, idempotent acquisition engine.
 * Architecture: Radar → Dedup → Brain → State Machine → Closer
 *
 * Flow:
 *   1. Exa OSINT queries (funding rounds, FinOps hiring, cost-cutting signals)
 *   2. Idempotent upsert into osint_prospects (dedup by domain)
 *   3. Enrichment via analysis engine (exposure estimation)
 *   4. Intent scoring → state transition → outreach trigger
 *
 * State machine (osint_prospects.status):
 *   DISCOVERED → ENRICHING → SCORED → READY_FOR_OUTREACH → OUTREACH_SENT → CONVERTED | DEAD
 *
 * Constraints:
 *   - Exponential backoff on Exa rate limits (429)
 *   - Idempotent: domain is UNIQUE, upsert on conflict
 *   - Zero spam: unsubscribed/bounced domains blacklisted forever
 *   - Extraction logic separated from send logic (queue pattern)
 *   - Confidence cap 85 on all scores
 *
 * Exports: runOSINTRadar, enrichProspect, scoreAndRoute, processOutreachQueue
 * Required env: EXA_API_KEY, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY
 */

import Exa from "exa-js";
import { createAdminSupabase } from "@/lib/supabase";
import { enrichCompany, type EnrichmentResult } from "@/lib/exa";
import { estimateExposure, sendOutreachEmail, buildTouchEmail, detectGeoMarket, detectLeadLocale, validateAndEnrichLead } from "@/lib/outreach";
import type { OutreachLead } from "@/lib/outreach";

// ── Supabase helper (osint_prospects not in generated types) ──

function osintTable() {
  const sb = createAdminSupabase();
  if (!sb) return null;
  // Cast: osint_prospects table not in Database type yet (migration 009)
  return { sb, from: (table: string) => (sb as any).from(table) };
}

// ── Types ──────────────────────────────────────────────────

export type ProspectStatus =
  | "DISCOVERED"
  | "ENRICHING"
  | "SCORED"
  | "READY_FOR_OUTREACH"
  | "OUTREACH_SENT"
  | "NURTURING"
  | "CONVERTED"
  | "DEAD";

export interface OSINTProspect {
  id?: string;
  domain: string;
  company_name: string | null;
  industry: string | null;
  headcount: number | null;
  source_signal: string;
  source_query: string;
  source_url: string | null;
  intent_score: number;
  exposure_low_eur: number | null;
  exposure_high_eur: number | null;
  geo_market: string | null;
  locale: string;
  enrichment_data: Record<string, unknown> | null;
  status: ProspectStatus;
  status_changed_at: string;
  last_error: string | null;
  retry_count: number;
  outreach_sent_at: string | null;
  created_at?: string;
  updated_at?: string;
}

interface ExaSearchResult {
  title: string;
  url: string;
  text?: string;
  publishedDate?: string;
  author?: string;
}

// ── Constants ──────────────────────────────────────────────

const MAX_RETRIES = 4;
const BASE_DELAY_MS = 1000;
const MAX_PROSPECTS_PER_RUN = 25;
const INTENT_THRESHOLD = 70;
const OUTREACH_BATCH_SIZE = 10;

// OSINT queries — high-signal B2B events that correlate with SaaS overspend
const OSINT_QUERIES = [
  {
    query: "Series B Series C funding round 2026 technology company",
    signal: "funding_round",
    category: "financial",
  },
  {
    query: "FinOps cloud cost optimization hiring 2026",
    signal: "finops_hiring",
    category: "hiring",
  },
  {
    query: "SaaS spending rationalization cost cutting enterprise 2026",
    signal: "cost_cutting",
    category: "intent",
  },
  {
    query: "IT procurement digital transformation mid-market 2026",
    signal: "procurement_overhaul",
    category: "intent",
  },
  {
    query: "cloud migration AWS Azure GCP enterprise cost overrun 2026",
    signal: "cloud_migration",
    category: "tech_stack",
  },
  {
    query: "CFO technology spend audit SaaS rationalization 2026",
    signal: "cfo_audit",
    category: "intent",
  },
  {
    query: "DORA GDPR SOC2 compliance SaaS vendor management Europe 2026",
    signal: "compliance_pressure",
    category: "compliance",
  },
  {
    query: "startup scale-up headcount growth 200 500 employees technology 2026",
    signal: "rapid_growth",
    category: "hiring",
  },
] as const;

// Blacklist: domains that should never be contacted
const DOMAIN_BLACKLIST = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com",
  "icloud.com", "protonmail.com", "tutanota.com", "mail.com",
  "example.com", "test.com", "localhost",
]);

// ── Exa Client with Exponential Backoff ────────────────────

let _exa: Exa | null = null;

function getExaClient(): Exa | null {
  if (_exa) return _exa;
  const key = process.env.EXA_API_KEY;
  if (!key) return null;
  _exa = new Exa(key);
  return _exa;
}

async function exaSearchWithBackoff(
  query: string,
  opts: { numResults: number; startPublishedDate?: string },
): Promise<ExaSearchResult[]> {
  const exa = getExaClient();
  if (!exa) return [];

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await exa.searchAndContents(query, {
        type: "neural",
        numResults: opts.numResults,
        startPublishedDate: opts.startPublishedDate,
        text: { maxCharacters: 500 },
      });

      return (res.results || []).map((r: any) => ({
        title: r.title || "",
        url: r.url || "",
        text: r.text || "",
        publishedDate: r.publishedDate || null,
        author: r.author || null,
      }));
    } catch (err: any) {
      const status = err?.status || err?.response?.status;
      const isRateLimit = status === 429;
      const isServerError = status >= 500;

      if ((isRateLimit || isServerError) && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500;
        console.warn(`[OSINT] Exa ${status} on attempt ${attempt + 1}, backing off ${Math.round(delay)}ms`);
        await sleep(delay);
        continue;
      }

      console.error(`[OSINT] Exa query failed after ${attempt + 1} attempts:`, err?.message || err);
      return [];
    }
  }

  return [];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Domain Extraction ──────────────────────────────────────

function extractDomainFromResult(result: ExaSearchResult): string | null {
  try {
    // Try URL first
    if (result.url) {
      const hostname = new URL(result.url).hostname.replace(/^www\./, "");
      // Skip news/aggregator domains
      if (isNewsSite(hostname)) return null;
      return hostname;
    }
    return null;
  } catch {
    return null;
  }
}

const NEWS_SITES = new Set([
  "techcrunch.com", "crunchbase.com", "bloomberg.com", "reuters.com",
  "forbes.com", "businessinsider.com", "venturebeat.com", "sifted.eu",
  "theinformation.com", "pitchbook.com", "cbinsights.com", "wired.com",
  "zdnet.com", "theregister.com", "arstechnica.com", "hacker-news.com",
  "news.ycombinator.com", "reddit.com", "twitter.com", "x.com",
  "linkedin.com", "medium.com", "substack.com", "youtube.com",
  "github.com", "wikipedia.org", "google.com", "amazon.com",
]);

function isNewsSite(domain: string): boolean {
  return NEWS_SITES.has(domain) || domain.endsWith(".gov") || domain.endsWith(".edu");
}

function extractCompanyName(result: ExaSearchResult): string | null {
  // Try to extract from title before first " - ", " | ", " — "
  const title = result.title || "";
  const sep = title.match(/^(.+?)[\s]*[—|\-|][\s]*/);
  if (sep && sep[1] && sep[1].length < 60) return sep[1].trim();
  return null;
}

function guessIndustry(text: string): string | null {
  const t = text.toLowerCase();
  if (t.includes("fintech") || t.includes("financial technology")) return "fintech";
  if (t.includes("healthcare") || t.includes("healthtech")) return "healthcare";
  if (t.includes("saas") || t.includes("software as a service")) return "saas_tech";
  if (t.includes("e-commerce") || t.includes("ecommerce")) return "ecommerce";
  if (t.includes("cybersecurity") || t.includes("security")) return "security";
  if (t.includes("ai ") || t.includes("artificial intelligence") || t.includes("machine learning")) return "ai_ml";
  if (t.includes("logistics") || t.includes("supply chain")) return "logistics";
  if (t.includes("insurance") || t.includes("insurtech")) return "insurance";
  if (t.includes("manufacturing") || t.includes("industrial")) return "manufacturing";
  if (t.includes("telecom")) return "telecom";
  if (t.includes("energy") || t.includes("cleantech")) return "energy";
  if (t.includes("real estate") || t.includes("proptech")) return "real_estate";
  return "technology"; // safe default for B2B OSINT
}

function guessHeadcount(text: string): number | null {
  // Look for employee count patterns
  const match = text.match(/(\d[\d,]*)\s*(?:employees?|staff|people|headcount|team members)/i);
  if (match) {
    const num = parseInt(match[1].replace(/,/g, ""), 10);
    if (num > 5 && num < 100000) return num;
  }
  return null;
}

// ── Intent Scoring ─────────────────────────────────────────

interface IntentScoreBreakdown {
  score: number;
  components: Record<string, number>;
}

function computeIntentScore(
  signal: string,
  enrichment: EnrichmentResult | null,
  headcount: number | null,
  industry: string | null,
): IntentScoreBreakdown {
  const components: Record<string, number> = {};

  // 1. Signal type weight (0-30)
  const signalWeights: Record<string, number> = {
    funding_round: 25,
    finops_hiring: 28,
    cost_cutting: 30,
    procurement_overhaul: 22,
    cloud_migration: 20,
    cfo_audit: 30,
    compliance_pressure: 18,
    rapid_growth: 22,
  };
  components.signal_type = signalWeights[signal] ?? 15;

  // 2. Company size fit (0-20) — sweet spot 100-2000 employees
  const hc = headcount ?? 100;
  if (hc >= 200 && hc <= 2000) components.size_fit = 20;
  else if (hc >= 100 && hc <= 5000) components.size_fit = 15;
  else if (hc >= 50) components.size_fit = 10;
  else components.size_fit = 5;

  // 3. Industry fit (0-15) — high-spend industries score higher
  const highSpendIndustries = new Set(["saas_tech", "fintech", "technology", "financial_services", "consulting", "ai_ml"]);
  const midSpendIndustries = new Set(["healthcare", "ecommerce", "insurance", "telecom", "media"]);
  if (industry && highSpendIndustries.has(industry)) components.industry_fit = 15;
  else if (industry && midSpendIndustries.has(industry)) components.industry_fit = 10;
  else components.industry_fit = 7;

  // 4. Enrichment signal density (0-20) — more signals = higher intent
  if (enrichment) {
    const signalCount = enrichment.signals.length;
    const intentCount = enrichment.intentSignals.length;
    components.signal_density = Math.min(20, Math.round(
      (signalCount / 10) * 8 + (intentCount / 3) * 12
    ));
  } else {
    components.signal_density = 5; // unknown = conservative
  }

  // Sum, cap at 85 (confidence discipline)
  const raw = Object.values(components).reduce((a, b) => a + b, 0);
  const score = Math.min(85, raw);

  return { score, components };
}

// ── 1. THE RADAR — OSINT Ingestion ─────────────────────────

export async function runOSINTRadar(): Promise<{
  queriesRun: number;
  resultsFound: number;
  prospectsUpserted: number;
  errors: string[];
}> {
  const db = osintTable();
  if (!db) {
    return { queriesRun: 0, resultsFound: 0, prospectsUpserted: 0, errors: ["No Supabase client"] };
  }

  const errors: string[] = [];
  let totalResults = 0;
  let totalUpserted = 0;

  // 30-day window for fresh signals
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Fetch blacklisted domains (bounced/unsubscribed)
  const { data: blacklistedRows } = await db.from("osint_prospects")
    .select("domain")
    .in("status", ["DEAD"])
    .limit(5000);
  const blacklisted = new Set([
    ...DOMAIN_BLACKLIST,
    ...(blacklistedRows || []).map((r: any) => r.domain),
  ]);

  for (const q of OSINT_QUERIES) {
    try {
      const results = await exaSearchWithBackoff(q.query, {
        numResults: 10,
        startPublishedDate: startDate,
      });
      totalResults += results.length;

      for (const result of results) {
        const domain = extractDomainFromResult(result);
        if (!domain || blacklisted.has(domain)) continue;

        const companyName = extractCompanyName(result);
        const industry = guessIndustry([result.title, result.text || ""].join(" "));
        const headcount = guessHeadcount(result.text || "");
        const geoMarket = detectGeoMarket(domain);
        const locale = detectLeadLocale(domain);

        // IDEMPOTENT UPSERT — domain is UNIQUE constraint
        const { error } = await db.from("osint_prospects")
          .upsert(
            {
              domain,
              company_name: companyName,
              industry,
              headcount,
              source_signal: q.signal,
              source_query: q.query,
              source_url: result.url,
              geo_market: geoMarket,
              locale,
              status: "DISCOVERED",
              status_changed_at: new Date().toISOString(),
              retry_count: 0,
              last_error: null,
            },
            {
              onConflict: "domain",
              ignoreDuplicates: false,
            }
          );

        if (error) {
          if (error.code === "23505" || error.message?.includes("duplicate")) continue;
          errors.push(`Upsert ${domain}: ${error.message}`);
        } else {
          totalUpserted++;
        }
      }
    } catch (err: any) {
      errors.push(`Query "${q.signal}": ${err?.message || "unknown"}`);
    }

    // Polite delay between queries to avoid hammering Exa
    await sleep(500);
  }

  console.log(`[OSINT Radar] Queries: ${OSINT_QUERIES.length}, Results: ${totalResults}, Upserted: ${totalUpserted}`);
  return {
    queriesRun: OSINT_QUERIES.length,
    resultsFound: totalResults,
    prospectsUpserted: totalUpserted,
    errors,
  };
}

// ── 2. THE BRAIN — Enrich & Score ──────────────────────────

export async function enrichAndScoreProspects(): Promise<{
  processed: number;
  readyForOutreach: number;
  errors: string[];
}> {
  const db = osintTable();
  if (!db) return { processed: 0, readyForOutreach: 0, errors: ["No Supabase client"] };

  const errors: string[] = [];

  // Fetch DISCOVERED prospects (oldest first, limit batch)
  const { data: prospects, error: fetchErr } = await db.from("osint_prospects")
    .select("*")
    .eq("status", "DISCOVERED")
    .order("created_at", { ascending: true })
    .limit(MAX_PROSPECTS_PER_RUN);

  if (fetchErr || !prospects?.length) {
    return { processed: 0, readyForOutreach: 0, errors: fetchErr ? [fetchErr.message] : [] };
  }

  let readyCount = 0;

  for (const prospect of prospects as any[]) {
    try {
      // Transition: DISCOVERED → ENRICHING (optimistic lock)
      await db.from("osint_prospects")
        .update({ status: "ENRICHING", status_changed_at: new Date().toISOString() })
        .eq("id", prospect.id)
        .eq("status", "DISCOVERED");

      // Run Exa enrichment
      let enrichment: EnrichmentResult | null = null;
      try {
        enrichment = await enrichCompany(prospect.domain);
      } catch (err: any) {
        console.warn(`[OSINT] Enrichment failed for ${prospect.domain}:`, err?.message);
      }

      // Update headcount/industry from enrichment if we guessed wrong
      const headcount = prospect.headcount || guessHeadcount(
        enrichment?.signals?.map((s: any) => s.snippet).join(" ") || ""
      );
      const industry = prospect.industry || (enrichment?.signals?.length
        ? guessIndustry(enrichment.signals.map((s: any) => s.snippet).join(" "))
        : "technology"
      );

      // Compute intent score
      const { score, components } = computeIntentScore(
        prospect.source_signal,
        enrichment,
        headcount,
        industry,
      );

      // Compute exposure estimation
      const geoMarket = prospect.geo_market || "eu";
      const exposure = estimateExposure(headcount || 100, industry, geoMarket);

      // Determine next status
      const nextStatus: ProspectStatus = score >= INTENT_THRESHOLD ? "READY_FOR_OUTREACH" : "SCORED";
      if (nextStatus === "READY_FOR_OUTREACH") readyCount++;

      // Transition: ENRICHING → SCORED | READY_FOR_OUTREACH
      await db.from("osint_prospects")
        .update({
          status: nextStatus,
          status_changed_at: new Date().toISOString(),
          intent_score: score,
          exposure_low_eur: exposure.low,
          exposure_high_eur: exposure.high,
          headcount,
          industry,
          enrichment_data: {
            score_components: components,
            signal_count: enrichment?.signals?.length ?? 0,
            intent_signals: enrichment?.intentSignals ?? [],
            tech_mentions: enrichment?.techMentions ?? [],
            summary: enrichment?.summary ?? null,
            vendors_by_category: enrichment?.vendorsByCategory ?? {},
          },
          last_error: null,
        })
        .eq("id", prospect.id);

    } catch (err: any) {
      const msg = err?.message || "unknown error";
      errors.push(`${prospect.domain}: ${msg}`);

      // Increment retry, kill if too many failures
      const newRetry = (prospect.retry_count || 0) + 1;
      await db.from("osint_prospects")
        .update({
          status: newRetry >= 3 ? "DEAD" : "DISCOVERED",
          retry_count: newRetry,
          last_error: msg,
          status_changed_at: new Date().toISOString(),
        })
        .eq("id", prospect.id);
    }

    // Polite delay between enrichments
    await sleep(300);
  }

  console.log(`[OSINT Brain] Processed: ${prospects.length}, Ready: ${readyCount}`);
  return { processed: prospects.length, readyForOutreach: readyCount, errors };
}

// ── 3. THE CLOSER — Outreach Queue Processor ───────────────

export async function processOutreachQueue(): Promise<{
  sent: number;
  skipped: number;
  errors: string[];
}> {
  const db = osintTable();
  if (!db) return { sent: 0, skipped: 0, errors: ["No Supabase client"] };

  const errors: string[] = [];
  let sent = 0;
  let skipped = 0;

  // Fetch READY_FOR_OUTREACH prospects (highest intent first)
  const { data: prospects, error: fetchErr } = await db.from("osint_prospects")
    .select("*")
    .eq("status", "READY_FOR_OUTREACH")
    .order("intent_score", { ascending: false })
    .limit(OUTREACH_BATCH_SIZE);

  if (fetchErr || !prospects?.length) {
    return { sent: 0, skipped: 0, errors: fetchErr ? [fetchErr.message] : [] };
  }

  for (const prospect of prospects as any[]) {
    try {
      // Build outreach lead from prospect data
      const lead: OutreachLead = {
        email: `info@${prospect.domain}`,
        domain: prospect.domain,
        company: prospect.company_name || prospect.domain,
        headcount: prospect.headcount || undefined,
        industry: prospect.industry || undefined,
        locale: prospect.locale || "en",
        geoMarket: prospect.geo_market || "eu",
        source: "osint_pipeline",
        intentSignals: prospect.enrichment_data?.intent_signals || [],
      };

      // Validate lead
      const validation = validateAndEnrichLead(lead);
      if (!validation.valid) {
        skipped++;
        await db.from("osint_prospects")
          .update({
            status: "DEAD",
            last_error: `Validation failed: ${validation.reason}`,
            status_changed_at: new Date().toISOString(),
          })
          .eq("id", prospect.id);
        continue;
      }

      // Build first-touch email
      const exposure = estimateExposure(
        prospect.headcount || 100,
        prospect.industry || "technology",
        prospect.geo_market || "eu",
      );
      const emailContent = buildTouchEmail(1, lead, exposure, prospect.locale || "en");

      // Send via Resend
      const result = await sendOutreachEmail({
        to: lead.email,
        subject: emailContent.subject,
        html: emailContent.html,
        tags: [
          { name: "source", value: "osint_pipeline" },
          { name: "domain", value: prospect.domain },
          { name: "intent_score", value: String(prospect.intent_score) },
        ],
      });

      if (result.success) {
        sent++;
        // Transition: READY_FOR_OUTREACH → OUTREACH_SENT
        await db.from("osint_prospects")
          .update({
            status: "OUTREACH_SENT",
            outreach_sent_at: new Date().toISOString(),
            status_changed_at: new Date().toISOString(),
          })
          .eq("id", prospect.id);

        // Also insert into outreach_leads for drip sequence tracking
        await db.from("outreach_leads")
          .upsert(
            {
              email: lead.email,
              domain: prospect.domain,
              company: prospect.company_name,
              locale: prospect.locale || "en",
              status: "contacted",
              drip_step: 1,
              last_sent_at: new Date().toISOString(),
              next_send_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
              geo_market: prospect.geo_market,
              source: "osint_pipeline",
            },
            { onConflict: "domain" }
          );
      } else {
        errors.push(`Send to ${prospect.domain}: ${result.error}`);
        await db.from("osint_prospects")
          .update({
            last_error: result.error || "Send failed",
            retry_count: (prospect.retry_count || 0) + 1,
            status: (prospect.retry_count || 0) >= 2 ? "DEAD" : "READY_FOR_OUTREACH",
            status_changed_at: new Date().toISOString(),
          })
          .eq("id", prospect.id);
      }
    } catch (err: any) {
      errors.push(`${prospect.domain}: ${err?.message || "unknown"}`);
    }

    // Rate limit: 1 email per second
    await sleep(1000);
  }

  console.log(`[OSINT Closer] Sent: ${sent}, Skipped: ${skipped}`);
  return { sent, skipped, errors };
}

// ── 4. STATS — Pipeline Visibility ─────────────────────────

export async function getOSINTPipelineStats(): Promise<Record<string, number>> {
  const db = osintTable();
  if (!db) return {};

  const statuses: ProspectStatus[] = [
    "DISCOVERED", "ENRICHING", "SCORED", "READY_FOR_OUTREACH",
    "OUTREACH_SENT", "NURTURING", "CONVERTED", "DEAD",
  ];

  const counts: Record<string, number> = {};

  for (const status of statuses) {
    const { count } = await db.from("osint_prospects")
      .select("*", { count: "exact", head: true })
      .eq("status", status);
    counts[status] = count ?? 0;
  }

  return counts;
}
