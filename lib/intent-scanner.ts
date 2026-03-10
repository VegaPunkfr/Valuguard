/**
 * GHOST TAX — INTENT-BASED OSINT ENGINE (SERVER-ONLY)
 *
 * Proactively discovers companies matching Ghost Tax's ICP by scanning
 * for public buying intent signals via Exa neural search.
 *
 * Runs daily via cron. Finds 20-50 qualified prospects per scan.
 * Deduplicates against existing vault_sessions and outreach_leads.
 *
 * Signal categories: FUNDING, HIRING_IT, COST_CUTTING, SAAS_COMPLAINTS,
 * CLOUD_MIGRATION, NEW_EXEC, COMPLIANCE, M_AND_A, RENEWAL
 *
 * Confidence scores capped at 85 per doctrine.
 *
 * Exports: scanForIntentSignals(), deduplicateAgainstPipeline(), scoreIntentProspect()
 * Required env: EXA_API_KEY, SUPABASE_SERVICE_ROLE_KEY
 */

import Exa from "exa-js";
import { createAdminSupabase } from "@/lib/supabase";

// ── Singleton ─────────────────────────────────────────

let _exa: Exa | null = null;

function getExa(): Exa | null {
  if (_exa) return _exa;

  const key = process.env.EXA_API_KEY;
  if (!key) {
    console.warn("[Intent Scanner] EXA_API_KEY not set. Intent scanning disabled.");
    return null;
  }

  _exa = new Exa(key);
  return _exa;
}

// ── Types ─────────────────────────────────────────────

export type IntentCategory =
  | "FUNDING"
  | "HIRING_IT"
  | "COST_CUTTING"
  | "SAAS_COMPLAINTS"
  | "CLOUD_MIGRATION"
  | "NEW_EXEC"
  | "COMPLIANCE"
  | "M_AND_A"
  | "RENEWAL"
  | "DORA_REGULATION"
  | "FINOPS_HIRING"
  | "TENDER_RFP";

export interface DetectedIntent {
  category: IntentCategory;
  evidence: string;
  url: string;
  publishedDate: string | null;
  strength: number; // 0-100
}

export interface IntentSignalResult {
  domain: string;
  companyName: string;
  signals: DetectedIntent[];
  intentScore: number;
  grade: "HOT" | "WARM" | "COOL";
  estimatedHeadcount: [number, number];
  industry: string;
  geoMarket: "us" | "dach" | "nl" | "fr" | "eu" | "other";
  sourceUrls: string[];
  detectedAt: string;
}

// ── Signal Query Definitions ──────────────────────────

interface SignalQuery {
  category: IntentCategory;
  query: string;
}

const SIGNAL_QUERIES: SignalQuery[] = [
  // FUNDING
  { category: "FUNDING", query: "Series B funding round 2026 SaaS company raised million" },
  { category: "FUNDING", query: "startup raises Series A B C venture capital 2026 enterprise" },
  { category: "FUNDING", query: "growth equity investment mid-market company 2026" },

  // HIRING_IT
  { category: "HIRING_IT", query: "hiring VP of IT Head of Procurement CTO appointment 2026" },
  { category: "HIRING_IT", query: "appointed new CIO Chief Information Officer technology leader" },
  { category: "HIRING_IT", query: "hiring IT Director procurement manager enterprise software" },

  // COST_CUTTING
  { category: "COST_CUTTING", query: "company layoffs cost reduction initiative restructuring 2026" },
  { category: "COST_CUTTING", query: "operational efficiency cost optimization corporate restructuring" },
  { category: "COST_CUTTING", query: "budget cuts IT spending reduction workforce optimization 2026" },

  // SAAS_COMPLAINTS
  { category: "SAAS_COMPLAINTS", query: "too many SaaS tools software sprawl shadow IT problem" },
  { category: "SAAS_COMPLAINTS", query: "SaaS spend out of control subscription fatigue tool consolidation" },
  { category: "SAAS_COMPLAINTS", query: "software license waste unused subscriptions duplicate tools" },

  // CLOUD_MIGRATION
  { category: "CLOUD_MIGRATION", query: "migrating to AWS Azure GCP cloud migration project 2026" },
  { category: "CLOUD_MIGRATION", query: "cloud costs increasing cloud spend optimization FinOps" },
  { category: "CLOUD_MIGRATION", query: "hybrid cloud strategy multi-cloud cost management" },

  // NEW_EXEC
  { category: "NEW_EXEC", query: "appointed new CFO Chief Financial Officer joins company 2026" },
  { category: "NEW_EXEC", query: "new CIO CTO joins executive leadership change technology" },
  { category: "NEW_EXEC", query: "new Head of Finance VP Operations executive hire 2026" },

  // COMPLIANCE
  { category: "COMPLIANCE", query: "DORA compliance deadline financial services technology risk 2026" },
  { category: "COMPLIANCE", query: "NIS2 directive compliance cybersecurity regulation Europe" },
  { category: "COMPLIANCE", query: "SOC 2 audit preparation compliance certification enterprise" },

  // M_AND_A
  { category: "M_AND_A", query: "acquisition announced merger integration technology company 2026" },
  { category: "M_AND_A", query: "post-acquisition IT integration consolidation synergies" },
  { category: "M_AND_A", query: "company merger software stack consolidation due diligence" },

  // RENEWAL
  { category: "RENEWAL", query: "enterprise contract renewal vendor evaluation RFP process 2026" },
  { category: "RENEWAL", query: "software vendor selection procurement process enterprise" },
  { category: "RENEWAL", query: "renegotiating SaaS contracts vendor consolidation evaluation" },

  // ── GEO-SPECIFIC: US ──────────────────────────────────
  { category: "COMPLIANCE", query: "SOC 2 Type II audit 2026 SaaS enterprise compliance certification" },
  { category: "COMPLIANCE", query: "FedRAMP authorization cloud compliance government contractor 2026" },
  { category: "COST_CUTTING", query: "quarterly earnings SaaS expense cloud costs operating expenses 10-Q SEC filing 2026" },
  { category: "FUNDING", query: "raised Series B C growth round 2026 SaaS enterprise software United States" },

  // ── GEO-SPECIFIC: GERMANY / DACH ──────────────────────
  { category: "DORA_REGULATION", query: "DORA Digital Operational Resilience Act compliance bank insurance Germany 2025 2026" },
  { category: "DORA_REGULATION", query: "DORA Verordnung IT-Risikomanagement Finanzdienstleister Deutschland Compliance" },
  { category: "COMPLIANCE", query: "NIS2 Richtlinie Umsetzung Deutschland Cybersicherheit kritische Infrastruktur 2026" },
  { category: "COST_CUTTING", query: "IT-Kostenoptimierung Digitalisierung Mittelstand Deutschland Cloud Kosten senken" },
  { category: "HIRING_IT", query: "CIO CFO Leiter IT Einkaufsleiter neuer Vorstand ernannt Deutschland 2026" },
  { category: "SAAS_COMPLAINTS", query: "zu viele SaaS Tools Software Wildwuchs Shadow IT Problem Unternehmen Deutschland" },
  { category: "FINOPS_HIRING", query: "Cloud-Kostenoptimierung FinOps Engineer hiring Deutschland AWS Azure Kostenmanagement" },

  // ── GEO-SPECIFIC: NETHERLANDS ─────────────────────────
  { category: "TENDER_RFP", query: "IT procurement tender Netherlands Dutch company SaaS vendor selection RFP 2026" },
  { category: "COST_CUTTING", query: "Dutch company cost reduction IT optimization Netherlands digital transformation 2026" },
  { category: "FUNDING", query: "Dutch startup raised funding Netherlands Series A B venture capital 2026" },
  { category: "NEW_EXEC", query: "appointed CIO CFO CTO Netherlands Dutch company new executive leadership 2026" },
  { category: "COMPLIANCE", query: "DORA NIS2 compliance Netherlands financial services Dutch bank insurance regulation" },
];

// ── ICP Matching ──────────────────────────────────────

const GEO_INDICATORS: Record<string, string[]> = {
  // Order matters: most specific first (NL before EU, DACH before generic)
  nl: [".nl", "netherlands", "dutch", "amsterdam", "rotterdam", "eindhoven", "utrecht", "den haag", "the hague", "nederland"],
  dach: [".de", ".ch", ".at", "germany", "switzerland", "austria", "berlin", "munich", "zurich", "vienna", "deutschland", "schweiz", "frankfurt", "hamburg", "düsseldorf"],
  fr: [".fr", "france", "paris", "lyon", "marseille"],
  us: [".com", ".us", ".io", "united states", "usa", "california", "new york", "texas", "san francisco", "silicon valley"],
  eu: [".eu", ".be", ".es", ".it", ".se", ".dk", ".fi", ".no", ".pt", ".ie", "europe", "european", "belgium", "spain", "italy", "sweden", "denmark"],
};

// ── Core Scanner ──────────────────────────────────────

/**
 * Scans Exa for public intent signals matching Ghost Tax ICP.
 * Returns scored and graded prospects ready for outreach pipeline.
 */
export async function scanForIntentSignals(
  options?: { maxResults?: number; daysBack?: number }
): Promise<IntentSignalResult[]> {
  const exa = getExa();
  if (!exa) {
    console.warn("[Intent Scanner] Exa client unavailable. Returning empty results.");
    return [];
  }

  const maxResults = options?.maxResults ?? 50;
  const daysBack = options?.daysBack ?? 30;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);
  const startPublished = startDate.toISOString().split("T")[0];

  // Run all signal queries in parallel batches (3 concurrent to avoid rate limits)
  const allRawResults: Array<{ category: IntentCategory; results: ExaResult[] }> = [];
  const batchSize = 3;

  for (let i = 0; i < SIGNAL_QUERIES.length; i += batchSize) {
    const batch = SIGNAL_QUERIES.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(async (sq) => {
        try {
          const res = await exa.searchAndContents(sq.query, {
            type: "neural",
            useAutoprompt: true,
            numResults: 10,
            startPublishedDate: startPublished,
            text: { maxCharacters: 1500 },
          });
          return {
            category: sq.category,
            results: (res.results ?? []) as ExaResult[],
          };
        } catch (err) {
          console.error(`[Intent Scanner] Query failed for ${sq.category}: ${sq.query}`, err);
          return { category: sq.category, results: [] as ExaResult[] };
        }
      })
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        allRawResults.push(result.value);
      }
    }
  }

  // Extract and aggregate prospects by domain
  const prospectMap = new Map<string, IntentSignalResult>();

  for (const { category, results } of allRawResults) {
    for (const r of results) {
      const extracted = extractCompanyInfo(r, category);
      if (!extracted) continue;

      const key = extracted.domain.toLowerCase();
      const existing = prospectMap.get(key);

      if (existing) {
        // Merge signals
        existing.signals.push(...extracted.signals);
        existing.sourceUrls.push(...extracted.sourceUrls.filter((u) => !existing.sourceUrls.includes(u)));
        // Update headcount if new estimate is more specific
        if (extracted.estimatedHeadcount[1] - extracted.estimatedHeadcount[0] < existing.estimatedHeadcount[1] - existing.estimatedHeadcount[0]) {
          existing.estimatedHeadcount = extracted.estimatedHeadcount;
        }
        if (extracted.industry && extracted.industry !== "unknown") {
          existing.industry = extracted.industry;
        }
      } else {
        prospectMap.set(key, extracted);
      }
    }
  }

  // Score all prospects
  const prospects = Array.from(prospectMap.values()).map((p) => {
    const { score, grade } = scoreIntentProspect(p.signals, p.domain);
    return { ...p, intentScore: score, grade: grade as "HOT" | "WARM" | "COOL" };
  });

  // Sort by score descending, take top N
  prospects.sort((a, b) => b.intentScore - a.intentScore);
  return prospects.slice(0, maxResults);
}

// ── Company Extraction ────────────────────────────────

interface ExaResult {
  url: string;
  title: string;
  text?: string;
  publishedDate?: string;
  author?: string;
}

function extractCompanyInfo(result: ExaResult, category: IntentCategory): IntentSignalResult | null {
  const { url, title, text, publishedDate } = result;
  if (!title && !text) return null;

  const combined = `${title ?? ""} ${text ?? ""}`;

  // Extract domain from URL
  let domain: string;
  try {
    const parsed = new URL(url);
    domain = parsed.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }

  // Skip news aggregators — we want company-specific articles
  const newsAggregators = [
    "techcrunch.com", "reuters.com", "bloomberg.com", "cnbc.com",
    "forbes.com", "wsj.com", "ft.com", "theverge.com", "wired.com",
    "zdnet.com", "venturebeat.com", "sifted.eu", "businessinsider.com",
  ];
  const isNewsSource = newsAggregators.some((n) => domain.includes(n));

  // For news sources, try to extract the company domain from content
  let companyName = extractCompanyName(title ?? "", combined);
  let companyDomain = isNewsSource ? extractDomainFromText(combined) : domain;

  if (!companyName) {
    // Last resort: use the first capitalized multi-word in title
    const titleMatch = (title ?? "").match(/([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})/);
    companyName = titleMatch?.[1] ?? "Unknown";
  }

  if (!companyDomain || companyDomain === "unknown") {
    companyDomain = domain;
  }

  // Build evidence string
  const evidenceSnippet = (text ?? title ?? "").slice(0, 300).replace(/\n/g, " ").trim();

  const signal: DetectedIntent = {
    category,
    evidence: evidenceSnippet,
    url,
    publishedDate: publishedDate ?? null,
    strength: computeSignalStrength(category, combined),
  };

  return {
    domain: companyDomain,
    companyName,
    signals: [signal],
    intentScore: 0, // scored later
    grade: "COOL",  // scored later
    estimatedHeadcount: estimateHeadcount(combined),
    industry: detectIndustry(combined),
    geoMarket: detectGeoMarket(companyDomain, combined),
    sourceUrls: [url],
    detectedAt: new Date().toISOString(),
  };
}

function extractCompanyName(title: string, text: string): string | null {
  // Pattern: "CompanyName raises $X", "CompanyName announces", "CompanyName appoints"
  const patterns = [
    /^([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,3})\s+(?:raises|announces|appoints|hires|names|selects|completes|launches|secures|closes)/i,
    /(?:^|\.\s+)([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,3})\s+(?:has raised|has announced|has appointed)/i,
    /(?:company|firm|startup)\s+([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,3})/i,
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern) ?? text.match(pattern);
    if (match?.[1]) {
      const name = match[1].trim();
      // Filter out common false positives
      if (name.length > 1 && !["The", "This", "That", "When", "What", "How", "Why"].includes(name)) {
        return name;
      }
    }
  }

  return null;
}

function extractDomainFromText(text: string): string | null {
  // Look for explicit domain mentions
  const domainPattern = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?)/g;
  const matches = Array.from(text.matchAll(domainPattern));

  const newsAggregators = [
    "techcrunch.com", "reuters.com", "bloomberg.com", "cnbc.com",
    "forbes.com", "wsj.com", "ft.com", "theverge.com", "wired.com",
    "zdnet.com", "venturebeat.com", "sifted.eu", "businessinsider.com",
    "twitter.com", "linkedin.com", "facebook.com", "youtube.com",
    "medium.com", "substack.com", "github.com",
  ];

  for (const m of matches) {
    const d = m[1].toLowerCase();
    if (!newsAggregators.some((n) => d.includes(n))) {
      return d;
    }
  }

  return null;
}

// ── Signal Strength ───────────────────────────────────

function computeSignalStrength(category: IntentCategory, text: string): number {
  const lower = text.toLowerCase();
  let strength = 40; // baseline

  switch (category) {
    case "FUNDING": {
      // Higher funding = stronger signal
      const amountMatch = lower.match(/\$(\d+(?:\.\d+)?)\s*(m|million|b|billion)/);
      if (amountMatch) {
        const num = parseFloat(amountMatch[1]);
        const unit = amountMatch[2];
        const amountM = (unit === "b" || unit === "billion") ? num * 1000 : num;
        if (amountM >= 100) strength = 80;
        else if (amountM >= 50) strength = 70;
        else if (amountM >= 20) strength = 60;
        else if (amountM >= 5) strength = 50;
      }
      if (/series\s*[b-f]/i.test(lower)) strength = Math.max(strength, 65);
      break;
    }

    case "HIRING_IT": {
      if (/\b(cio|cto|cfo|vp|vice president|head of)\b/i.test(lower)) strength = 70;
      if (/\b(chief information|chief technology|chief financial)\b/i.test(lower)) strength = 75;
      break;
    }

    case "COST_CUTTING": {
      const layoffMatch = lower.match(/(\d+(?:,\d+)?)\s*(?:employees|workers|staff|people|jobs)/);
      if (layoffMatch) {
        const count = parseInt(layoffMatch[1].replace(",", ""));
        if (count >= 1000) strength = 80;
        else if (count >= 500) strength = 70;
        else if (count >= 100) strength = 60;
        else strength = 50;
      }
      if (/restructuring|reorganiz/i.test(lower)) strength = Math.max(strength, 60);
      break;
    }

    case "SAAS_COMPLAINTS": {
      // Any public complaint about SaaS sprawl is a strong signal
      if (/sprawl|too many|out of control|duplicate|redundant/i.test(lower)) strength = 75;
      if (/shadow it/i.test(lower)) strength = 70;
      break;
    }

    case "CLOUD_MIGRATION": {
      if (/migrating|migration/i.test(lower)) strength = 65;
      if (/cloud cost|cloud spend|finops/i.test(lower)) strength = 70;
      if (/multi-cloud|hybrid cloud/i.test(lower)) strength = 60;
      break;
    }

    case "NEW_EXEC": {
      if (/\bcfo\b|chief financial/i.test(lower)) strength = 75; // CFO = highest ICP fit
      if (/\bcio\b|chief information/i.test(lower)) strength = 70;
      if (/\bcto\b|chief technology/i.test(lower)) strength = 60;
      break;
    }

    case "COMPLIANCE": {
      if (/dora/i.test(lower)) strength = 75;
      if (/nis2/i.test(lower)) strength = 70;
      if (/soc\s*2/i.test(lower)) strength = 65;
      if (/deadline|must comply|mandatory/i.test(lower)) strength = Math.max(strength, 70);
      break;
    }

    case "M_AND_A": {
      if (/acquisition|acquired|acquires/i.test(lower)) strength = 70;
      if (/merger|merging/i.test(lower)) strength = 65;
      if (/post-acquisition|integration/i.test(lower)) strength = 75; // active pain
      break;
    }

    case "RENEWAL": {
      if (/rfp|request for proposal/i.test(lower)) strength = 75;
      if (/vendor evaluation|vendor selection/i.test(lower)) strength = 70;
      if (/renegotiat/i.test(lower)) strength = 70;
      if (/contract renewal/i.test(lower)) strength = 60;
      break;
    }

    case "DORA_REGULATION": {
      // DORA is mandatory for EU financial services — very high intent
      if (/bank|versicherung|insurance|finanzdienstleist/i.test(lower)) strength = 80;
      if (/deadline|must comply|verpflichtend|mandatory/i.test(lower)) strength = Math.max(strength, 80);
      if (/dora.*compliance|dora.*umsetzung/i.test(lower)) strength = 75;
      break;
    }

    case "FINOPS_HIRING": {
      // FinOps roles = active cloud cost optimization = strong ICP signal
      if (/finops|cloud cost|kostenoptimierung/i.test(lower)) strength = 75;
      if (/hiring|stellenangebot|vacature/i.test(lower)) strength = Math.max(strength, 70);
      break;
    }

    case "TENDER_RFP": {
      // Public procurement tenders = guaranteed budget + active buying
      if (/tender|aanbesteding|ausschreibung/i.test(lower)) strength = 80;
      if (/rfp|request for proposal/i.test(lower)) strength = 75;
      if (/saas|cloud|software/i.test(lower)) strength = Math.max(strength, 70);
      break;
    }
  }

  // Cap at 85 per doctrine
  return Math.min(strength, 85);
}

// ── Headcount Estimation ──────────────────────────────

function estimateHeadcount(text: string): [number, number] {
  const lower = text.toLowerCase();

  // Direct mentions
  const employeeMatch = lower.match(/(\d+(?:,\d+)?)\+?\s*(?:employees|people|staff|workers|team members)/);
  if (employeeMatch) {
    const count = parseInt(employeeMatch[1].replace(",", ""));
    // Return as range with 30% margin
    const low = Math.max(10, Math.floor(count * 0.7));
    const high = Math.ceil(count * 1.3);
    return [low, high];
  }

  // Layoff size implies total headcount
  const layoffMatch = lower.match(/(?:laid off|cutting|reducing)\s*(\d+(?:,\d+)?)/);
  if (layoffMatch) {
    const layoffs = parseInt(layoffMatch[1].replace(",", ""));
    // Layoffs typically 5-20% of workforce
    return [layoffs * 5, layoffs * 20];
  }

  // Funding implies size
  const fundingMatch = lower.match(/\$(\d+(?:\.\d+)?)\s*(m|million|b|billion)/);
  if (fundingMatch) {
    const num = parseFloat(fundingMatch[1]);
    const unit = fundingMatch[2];
    const amountM = (unit === "b" || unit === "billion") ? num * 1000 : num;
    if (amountM >= 100) return [500, 5000];
    if (amountM >= 50) return [200, 2000];
    if (amountM >= 20) return [100, 1000];
    if (amountM >= 5) return [50, 500];
    return [20, 200];
  }

  // Series stage
  if (/series\s*[d-f]/i.test(lower)) return [500, 5000];
  if (/series\s*[c]/i.test(lower)) return [200, 2000];
  if (/series\s*[b]/i.test(lower)) return [100, 1000];
  if (/series\s*[a]/i.test(lower)) return [30, 300];

  // Default: unknown mid-market range
  return [50, 500];
}

// ── Industry Detection ────────────────────────────────

function detectIndustry(text: string): string {
  const lower = text.toLowerCase();

  const industryKeywords: Record<string, string[]> = {
    "technology": ["saas", "software", "tech company", "platform", "api", "developer"],
    "fintech": ["fintech", "payment", "banking tech", "neobank", "insurtech"],
    "financial services": ["bank", "insurance", "asset management", "private equity", "hedge fund", "financial institution"],
    "healthcare": ["healthcare", "healthtech", "hospital", "medical", "pharma", "biotech", "clinical"],
    "retail": ["retail", "e-commerce", "ecommerce", "consumer brand", "d2c", "marketplace"],
    "manufacturing": ["manufacturing", "industrial", "factory", "supply chain", "logistics"],
    "professional services": ["consulting", "advisory", "law firm", "accounting", "professional services"],
    "telecommunications": ["telecom", "telecommunications", "mobile operator", "carrier"],
    "media": ["media", "entertainment", "gaming", "publishing", "streaming"],
    "education": ["education", "edtech", "university", "learning platform"],
    "energy": ["energy", "oil", "gas", "renewable", "utilities", "cleantech"],
  };

  for (const [industry, keywords] of Object.entries(industryKeywords)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return industry;
    }
  }

  return "unknown";
}

// ── Geo Market Detection ──────────────────────────────

function detectGeoMarket(domain: string, text: string): "us" | "dach" | "nl" | "fr" | "eu" | "other" {
  const combined = `${domain} ${text}`.toLowerCase();

  // Check each geo in priority order (most specific first — NL before EU)
  for (const [geo, indicators] of Object.entries(GEO_INDICATORS)) {
    if (indicators.some((ind) => combined.includes(ind.toLowerCase()))) {
      return geo as "us" | "dach" | "nl" | "fr" | "eu" | "other";
    }
  }

  return "other";
}

// ── Scoring Engine ────────────────────────────────────

/**
 * Scores a prospect 0-100 based on signal strength, recency, ICP fit,
 * and multi-signal multiplier. Returns score and grade.
 */
export function scoreIntentProspect(
  signals: DetectedIntent[],
  domain: string
): { score: number; grade: "HOT" | "WARM" | "COOL" } {
  if (!signals.length) return { score: 0, grade: "COOL" };

  // 1. Average signal strength (0-85)
  const avgStrength = signals.reduce((sum, s) => sum + s.strength, 0) / signals.length;

  // 2. Recency score: most recent signal determines recency
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  let bestRecency = 0.3; // default if no date

  for (const s of signals) {
    if (s.publishedDate) {
      const age = now - new Date(s.publishedDate).getTime();
      const recency = Math.max(0.3, 1 - (age / thirtyDaysMs) * 0.7);
      bestRecency = Math.max(bestRecency, recency);
    }
  }

  // 3. ICP fit based on domain TLD and signal categories
  let icpFit = 0.5; // neutral
  const domainLower = domain.toLowerCase();

  // B2B indicators
  if (/\.(io|ai|co|tech|dev|cloud)$/.test(domainLower)) icpFit = 0.8;
  if (/\.(de|ch|at|fr|eu|nl|be)$/.test(domainLower)) icpFit = Math.max(icpFit, 0.75); // EU target market

  // High-value signal categories for Ghost Tax
  const highValueCategories: IntentCategory[] = ["COST_CUTTING", "SAAS_COMPLAINTS", "NEW_EXEC", "COMPLIANCE", "RENEWAL", "DORA_REGULATION", "TENDER_RFP", "FINOPS_HIRING"];
  const hasHighValue = signals.some((s) => highValueCategories.includes(s.category));
  if (hasHighValue) icpFit = Math.max(icpFit, 0.85);

  // DORA + TENDER are ultra-high intent (mandatory/budget-committed)
  const ultraHighCategories: IntentCategory[] = ["DORA_REGULATION", "TENDER_RFP"];
  const hasUltraHigh = signals.some((s) => ultraHighCategories.includes(s.category));
  if (hasUltraHigh) icpFit = Math.max(icpFit, 0.95);

  // 4. Multi-signal multiplier
  const uniqueCategories = new Set(signals.map((s) => s.category)).size;
  const multiSignalMultiplier = 1 + (uniqueCategories - 1) * 0.15; // +15% per additional category

  // Composite score
  let score = Math.round(avgStrength * bestRecency * icpFit * multiSignalMultiplier);

  // Cap at 85 per doctrine
  score = Math.min(score, 85);

  // Grade thresholds
  let grade: "HOT" | "WARM" | "COOL";
  if (score >= 60) grade = "HOT";
  else if (score >= 35) grade = "WARM";
  else grade = "COOL";

  return { score, grade };
}

// ── Deduplication ─────────────────────────────────────

/**
 * Removes prospects already present in vault_sessions or outreach_leads.
 * Uses admin Supabase client to bypass RLS.
 */
export async function deduplicateAgainstPipeline(
  prospects: IntentSignalResult[]
): Promise<IntentSignalResult[]> {
  if (!prospects.length) return [];

  const supabase = createAdminSupabase();
  if (!supabase) {
    console.warn("[Intent Scanner] Admin Supabase unavailable. Skipping dedup — returning all prospects.");
    return prospects;
  }

  const domains = prospects.map((p) => p.domain.toLowerCase());

  // Check vault_sessions for existing domains
  const { data: existingVault } = await supabase
    .from("vault_sessions")
    .select("domain")
    .in("domain", domains);

  const existingDomains = new Set<string>(
    (existingVault ?? []).map((row: { domain: string }) => row.domain.toLowerCase())
  );

  // Check outreach_leads if the table exists
  try {
    const { data: existingOutreach } = await supabase
      .from("outreach_leads")
      .select("domain")
      .in("domain", domains);

    for (const row of existingOutreach ?? []) {
      existingDomains.add((row as { domain: string }).domain.toLowerCase());
    }
  } catch {
    // Table may not exist yet — that's fine
  }

  const filtered = prospects.filter((p) => !existingDomains.has(p.domain.toLowerCase()));

  const removedCount = prospects.length - filtered.length;
  if (removedCount > 0) {
    console.log(`[Intent Scanner] Dedup removed ${removedCount} already-in-pipeline prospects.`);
  }

  return filtered;
}

// ── Full Pipeline ─────────────────────────────────────

/**
 * Complete daily scan pipeline:
 * 1. Scan Exa for intent signals across all categories
 * 2. Extract and score prospects
 * 3. Deduplicate against existing pipeline
 * 4. Return qualified, ranked prospects
 *
 * Designed for cron invocation. Typical runtime: 30-60s.
 */
export async function runDailyIntentScan(
  options?: { maxResults?: number; daysBack?: number }
): Promise<{
  total: number;
  afterDedup: number;
  hot: number;
  warm: number;
  cool: number;
  prospects: IntentSignalResult[];
}> {
  console.log("[Intent Scanner] Starting daily intent scan...");
  const start = Date.now();

  // Step 1: Scan
  const raw = await scanForIntentSignals(options);
  console.log(`[Intent Scanner] Found ${raw.length} raw prospects from Exa.`);

  // Step 2: Deduplicate
  const deduped = await deduplicateAgainstPipeline(raw);
  console.log(`[Intent Scanner] ${deduped.length} prospects after dedup.`);

  // Step 3: Categorize
  const hot = deduped.filter((p) => p.grade === "HOT");
  const warm = deduped.filter((p) => p.grade === "WARM");
  const cool = deduped.filter((p) => p.grade === "COOL");

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `[Intent Scanner] Scan complete in ${elapsed}s. HOT: ${hot.length}, WARM: ${warm.length}, COOL: ${cool.length}`
  );

  return {
    total: raw.length,
    afterDedup: deduped.length,
    hot: hot.length,
    warm: warm.length,
    cool: cool.length,
    prospects: deduped,
  };
}
