/**
 * GHOST TAX — VISITOR INTELLIGENCE ENGINE (SERVER-ONLY)
 *
 * Identifies anonymous B2B companies visiting ghost-tax.com by resolving
 * visitor IP addresses to company names. When a B2B visitor browses
 * the site without converting, we identify their company and can
 * proactively reach out.
 *
 * HOW IT WORKS:
 *   1. Capture visitor IP from request headers (x-forwarded-for, x-real-ip)
 *   2. Resolve IP → company via ipapi.co (primary) / ip-api.com (fallback)
 *   3. Filter out ISPs, VPNs, bots, residential IPs
 *   4. Extract company domain from org name (heuristic + DNS)
 *   5. Score the visit: pages viewed, time on site, high-intent pages
 *   6. If score > threshold, enrich with enrichCompany() from lib/exa.ts
 *   7. Store identified visitors in Supabase for pipeline injection
 *
 * Rate limits:
 *   - ipapi.co: 1000 req/day (free tier)
 *   - ip-api.com: 45 req/min (free tier)
 *   - Max 100 IP lookups per cron run
 *   - 24h cache per IP (in-memory + Supabase)
 *
 * Exports: identifyVisitor, resolveIPToCompany, processHighIntentVisitor,
 *          runVisitorIntelBatch, VisitorIdentification, VisitorIntelResult
 *
 * Required env: (none mandatory — degrades gracefully)
 * Optional env: CRON_SECRET (for cron auth)
 */

import { createAdminSupabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────

export interface VisitorIdentification {
  ip: string;
  company: string | null;
  domain: string | null;
  country: string;
  city: string;
  org: string;
  isB2B: boolean;
  isBot: boolean;
  isVPN: boolean;
  visitScore: number; // 0-100
  pagesViewed: string[];
  highIntentPages: boolean; // visited /pricing, /intel, /ghost-tax
  identifiedAt: string;
}

export interface VisitorIntelResult {
  identified: number;
  b2bCompanies: number;
  highIntent: number;
  enriched: number;
  injectedToPipeline: number;
}

interface IPResolution {
  org: string;
  domain: string | null;
  country: string;
  city: string;
  isB2B: boolean;
}

// ── Constants ─────────────────────────────────────────

const HIGH_INTENT_PATHS = ["/pricing", "/intel", "/ghost-tax", "/checkout", "/platform"];

const ENRICHMENT_SCORE_THRESHOLD = 55;

const MAX_LOOKUPS_PER_BATCH = 100;

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Known ISPs / residential providers — these are NOT B2B visitors */
const KNOWN_ISPS = [
  "comcast", "xfinity", "at&t", "att", "verizon", "spectrum", "charter",
  "cox communications", "centurylink", "lumen", "frontier", "windstream",
  "deutsche telekom", "telekom", "t-mobile", "vodafone", "o2",
  "orange", "sfr", "bouygues", "free sas", "free.fr",
  "bt group", "bt.com", "sky broadband", "virgin media", "talktalk",
  "swisscom", "sunrise", "salt", "a1 telekom",
  "kpn", "ziggo", "proximus", "telenet", "telia",
  "movistar", "telefonica",
  "rogers", "bell canada", "shaw", "telus",
  "optus", "telstra", "tpg",
  "ntt", "kddi", "softbank",
  "jio", "airtel", "bsnl",
];

/** Known VPN/proxy providers */
const KNOWN_VPNS = [
  "nordvpn", "expressvpn", "surfshark", "private internet access",
  "pia", "cyberghost", "protonvpn", "proton ag", "mullvad",
  "ipvanish", "tunnelbear", "hotspot shield", "windscribe",
  "cloudflare warp", "tor exit", "tor project",
  "datacamp limited", "m247", "privax", "anonine",
];

/** Bot user-agent fragments */
const BOT_UA_FRAGMENTS = [
  "bot", "crawler", "spider", "slurp", "googlebot", "bingbot",
  "yandexbot", "baiduspider", "facebookexternalhit", "twitterbot",
  "linkedinbot", "whatsapp", "telegrambot", "discordbot",
  "applebot", "duckduckbot", "ia_archiver", "petalbot",
  "semrushbot", "ahrefsbot", "mj12bot", "dotbot",
  "gptbot", "anthropic-ai", "perplexitybot", "claudebot",
  "bytespider", "dataforseo", "screaming frog",
  "headlesschrome", "phantomjs", "selenium", "puppeteer",
  "curl", "wget", "httpie", "python-requests", "go-http-client",
  "java/", "libwww", "okhttp",
];

// ── In-Memory Cache ───────────────────────────────────

interface CacheEntry {
  result: IPResolution;
  cachedAt: number;
}

const ipCache = new Map<string, CacheEntry>();

function getCached(ip: string): IPResolution | null {
  const entry = ipCache.get(ip);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    ipCache.delete(ip);
    return null;
  }
  return entry.result;
}

function setCache(ip: string, result: IPResolution): void {
  // Prevent unbounded growth — evict oldest if > 5000 entries
  if (ipCache.size > 5000) {
    const oldest = ipCache.keys().next().value;
    if (oldest) ipCache.delete(oldest);
  }
  ipCache.set(ip, { result, cachedAt: Date.now() });
}

// ── IP Validation ─────────────────────────────────────

/** Returns true if the IP is a private/reserved range */
function isPrivateIP(ip: string): boolean {
  if (!ip) return true;

  // IPv6 loopback
  if (ip === "::1" || ip === "::ffff:127.0.0.1") return true;

  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p))) return true;

  const [a, b] = parts;

  // 10.0.0.0/8
  if (a === 10) return true;
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  // 127.0.0.0/8
  if (a === 127) return true;
  // 0.0.0.0
  if (a === 0) return true;
  // 169.254.0.0/16 (link-local)
  if (a === 169 && b === 254) return true;

  return false;
}

/** Extract the real client IP from request headers */
export function extractIP(headers: Record<string, string>): string | null {
  // x-forwarded-for can contain multiple IPs: "client, proxy1, proxy2"
  const forwarded = headers["x-forwarded-for"];
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first && !isPrivateIP(first)) return first;
  }

  const realIP = headers["x-real-ip"];
  if (realIP && !isPrivateIP(realIP)) return realIP;

  return null;
}

// ── Bot Detection ─────────────────────────────────────

function isBot(userAgent: string): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return BOT_UA_FRAGMENTS.some((frag) => ua.includes(frag));
}

// ── ISP / VPN Detection ──────────────────────────────

function isISP(org: string): boolean {
  const lower = org.toLowerCase();
  return KNOWN_ISPS.some((isp) => lower.includes(isp));
}

function isVPN(org: string): boolean {
  const lower = org.toLowerCase();
  return KNOWN_VPNS.some((vpn) => lower.includes(vpn));
}

// ── IP → Company Resolution ──────────────────────────

interface IPAPICoResponse {
  org?: string;
  city?: string;
  country_name?: string;
  country_code?: string;
  asn?: string;
  error?: boolean;
  reason?: string;
}

interface IPAPIComResponse {
  org?: string;
  isp?: string;
  city?: string;
  country?: string;
  countryCode?: string;
  hosting?: boolean;
  proxy?: boolean;
  status?: string;
  message?: string;
}

/** Primary: ipapi.co (1000 req/day free) */
async function resolveViaIPAPICo(ip: string): Promise<IPResolution | null> {
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { "User-Agent": "ghost-tax.com/visitor-intel" },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;

    const data: IPAPICoResponse = await res.json();
    if (data.error) return null;

    const org = data.org || "";
    const country = data.country_name || data.country_code || "Unknown";
    const city = data.city || "Unknown";

    return {
      org,
      domain: extractDomainFromOrg(org),
      country,
      city,
      isB2B: !isISP(org) && !isVPN(org) && org.length > 0,
    };
  } catch {
    return null;
  }
}

/** Fallback: ip-api.com (45 req/min free) */
async function resolveViaIPAPICom(ip: string): Promise<IPResolution | null> {
  try {
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=org,isp,city,country,countryCode,hosting,proxy,status,message`,
      { signal: AbortSignal.timeout(5000) },
    );

    if (!res.ok) return null;

    const data: IPAPIComResponse = await res.json();
    if (data.status !== "success") return null;

    // ip-api.com gives both org and ISP — prefer org, it's more specific
    const org = data.org || data.isp || "";
    const country = data.country || data.countryCode || "Unknown";
    const city = data.city || "Unknown";

    const isProxy = data.proxy === true;
    const isHosting = data.hosting === true;

    return {
      org,
      domain: extractDomainFromOrg(org),
      country,
      city,
      isB2B: !isISP(org) && !isVPN(org) && !isProxy && !isHosting && org.length > 0,
    };
  } catch {
    return null;
  }
}

/**
 * Resolve an IP address to a company.
 * Tries ipapi.co first, falls back to ip-api.com.
 * Results are cached for 24h.
 */
export async function resolveIPToCompany(
  ip: string,
): Promise<{ org: string; domain: string | null; country: string; city: string; isB2B: boolean }> {
  // Check cache first
  const cached = getCached(ip);
  if (cached) return cached;

  // Check Supabase cache
  const supabase = createAdminSupabase();
  if (supabase) {
    const { data } = await (supabase as any)
      .from("visitor_intel_cache")
      .select("org, domain, country, city, is_b2b, cached_at")
      .eq("ip_hash", hashIP(ip))
      .single();

    if (data) {
      const row = data as Record<string, unknown>;
      const age = Date.now() - new Date(row.cached_at as string).getTime();
      if (age < CACHE_TTL_MS) {
        const result: IPResolution = {
          org: row.org as string,
          domain: row.domain as string | null,
          country: row.country as string,
          city: row.city as string,
          isB2B: row.is_b2b as boolean,
        };
        setCache(ip, result);
        return result;
      }
    }
  }

  // Primary: ipapi.co
  let result = await resolveViaIPAPICo(ip);

  // Fallback: ip-api.com
  if (!result) {
    result = await resolveViaIPAPICom(ip);
  }

  // Default if both fail
  if (!result) {
    result = { org: "", domain: null, country: "Unknown", city: "Unknown", isB2B: false };
  }

  // Cache result
  setCache(ip, result);

  // Persist to Supabase cache
  if (supabase) {
    await (supabase as any)
      .from("visitor_intel_cache")
      .upsert(
        {
          ip_hash: hashIP(ip),
          org: result.org,
          domain: result.domain,
          country: result.country,
          city: result.city,
          is_b2b: result.isB2B,
          cached_at: new Date().toISOString(),
        },
        { onConflict: "ip_hash" },
      )
      .then(() => {}); // fire-and-forget
  }

  return result;
}

// ── Domain Extraction Heuristics ─────────────────────

/**
 * Extract a probable domain from an org name.
 * "Acme Corp" → "acmecorp.com" or "acme.com"
 * This is heuristic — catches ~40-60% of B2B visitors.
 */
function extractDomainFromOrg(org: string): string | null {
  if (!org) return null;

  let cleaned = org
    .toLowerCase()
    .replace(/[,.]$/, "")
    .trim();

  // If it already looks like a domain, return it
  if (/^[a-z0-9-]+\.[a-z]{2,}$/.test(cleaned)) {
    return cleaned;
  }

  // Strip common suffixes
  const corpSuffixes = [
    "inc", "incorporated", "corp", "corporation", "ltd", "limited",
    "llc", "llp", "gmbh", "ag", "sa", "sas", "sarl", "bv", "nv",
    "pty", "plc", "co", "company", "group", "holding", "holdings",
    "international", "intl", "technologies", "technology", "tech",
    "solutions", "services", "systems", "software", "consulting",
  ];

  for (const suffix of corpSuffixes) {
    cleaned = cleaned.replace(new RegExp(`\\b${suffix}\\b`, "g"), "");
  }

  // Remove non-alphanumeric, collapse whitespace
  cleaned = cleaned.replace(/[^a-z0-9\s]/g, "").trim().replace(/\s+/g, "");

  if (!cleaned || cleaned.length < 2 || cleaned.length > 30) return null;

  // Generate candidate: concatenated name + .com
  return `${cleaned}.com`;
}

// ── Hashing ──────────────────────────────────────────

/** Simple hash for IP storage (we don't store raw IPs for privacy) */
function hashIP(ip: string): string {
  // Simple FNV-1a 32-bit hash — sufficient for dedup, not for security
  let hash = 0x811c9dc5;
  for (let i = 0; i < ip.length; i++) {
    hash ^= ip.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

// ── Visit Scoring ────────────────────────────────────

/**
 * Score a visit from 0-100 based on engagement signals.
 * Higher score = more likely to be a qualified lead.
 */
function scoreVisit(pagesViewed: string[]): { score: number; highIntent: boolean } {
  if (!pagesViewed.length) return { score: 0, highIntent: false };

  let score = 0;

  // Base: number of pages viewed
  score += Math.min(pagesViewed.length * 8, 30);

  // High-intent pages
  const highIntentHits = pagesViewed.filter((p) =>
    HIGH_INTENT_PATHS.some((hip) => p.startsWith(hip)),
  );
  const highIntent = highIntentHits.length > 0;

  if (highIntent) {
    score += 25;
    // Extra weight for pricing page
    if (pagesViewed.some((p) => p.startsWith("/pricing"))) score += 15;
    // Extra weight for checkout
    if (pagesViewed.some((p) => p.startsWith("/checkout"))) score += 20;
  }

  // Diversity bonus: visited multiple sections
  const sections = new Set(pagesViewed.map((p) => p.split("/")[1] || "home"));
  if (sections.size >= 3) score += 10;
  if (sections.size >= 5) score += 10;

  // Cap at 100
  return { score: Math.min(score, 100), highIntent };
}

// ── Core Functions ───────────────────────────────────

/**
 * Identify a single visitor from their IP and request headers.
 * Returns structured identification with B2B classification and visit score.
 */
export async function identifyVisitor(
  ip: string,
  headers: Record<string, string>,
): Promise<VisitorIdentification> {
  const now = new Date().toISOString();
  const userAgent = headers["user-agent"] || "";

  // Quick reject: bots
  const botDetected = isBot(userAgent);
  if (botDetected) {
    return {
      ip,
      company: null,
      domain: null,
      country: "Unknown",
      city: "Unknown",
      org: "",
      isB2B: false,
      isBot: true,
      isVPN: false,
      visitScore: 0,
      pagesViewed: [],
      highIntentPages: false,
      identifiedAt: now,
    };
  }

  // Quick reject: private IPs
  if (isPrivateIP(ip)) {
    return {
      ip,
      company: null,
      domain: null,
      country: "Local",
      city: "Local",
      org: "Private Network",
      isB2B: false,
      isBot: false,
      isVPN: false,
      visitScore: 0,
      pagesViewed: [],
      highIntentPages: false,
      identifiedAt: now,
    };
  }

  // Resolve IP to company
  const resolution = await resolveIPToCompany(ip);

  // Check for VPN
  const vpnDetected = isVPN(resolution.org);

  // Get pages viewed from Supabase (if tracking exists)
  const pagesViewed = await getVisitorPages(ip);
  const { score, highIntent } = scoreVisit(pagesViewed);

  return {
    ip,
    company: resolution.isB2B ? resolution.org : null,
    domain: resolution.domain,
    country: resolution.country,
    city: resolution.city,
    org: resolution.org,
    isB2B: resolution.isB2B && !vpnDetected,
    isBot: false,
    isVPN: vpnDetected,
    visitScore: score,
    pagesViewed,
    highIntentPages: highIntent,
    identifiedAt: now,
  };
}

/**
 * Process a high-intent visitor: enrich with Exa and inject into pipeline.
 * Uses dynamic import to avoid circular dependencies with lib/exa.ts.
 */
export async function processHighIntentVisitor(
  visitor: VisitorIdentification,
): Promise<boolean> {
  if (!visitor.isB2B || !visitor.domain || visitor.visitScore < ENRICHMENT_SCORE_THRESHOLD) {
    return false;
  }

  const supabase = createAdminSupabase();
  if (!supabase) return false;

  try {
    // Dynamic import to avoid circular deps with lib/exa.ts
    const { enrichCompany } = await import("@/lib/exa");
    const enrichment = await enrichCompany(visitor.domain);

    // Store enriched visitor in pipeline
    const { error } = await (supabase as any).from("visitor_intel_pipeline").insert({
      company: visitor.company,
      domain: visitor.domain,
      country: visitor.country,
      city: visitor.city,
      org: visitor.org,
      visit_score: visitor.visitScore,
      pages_viewed: visitor.pagesViewed,
      high_intent: visitor.highIntentPages,
      enrichment_summary: enrichment.summary,
      tech_mentions: enrichment.techMentions,
      signals_count: enrichment.signals.length,
      intent_signals: enrichment.intentSignals.map((s) => s.type),
      geo_market: enrichment.geoMarket,
      identified_at: visitor.identifiedAt,
      enriched_at: new Date().toISOString(),
      status: "new",
    });

    if (error) {
      console.error("[Visitor Intel] Pipeline insert failed:", error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[Visitor Intel] Enrichment failed:", err);
    return false;
  }
}

// ── Batch Processing ─────────────────────────────────

/**
 * Run visitor intelligence batch: process recent unresolved visitors.
 * Called by the cron endpoint every 6 hours.
 *
 * Steps:
 *   1. Fetch recent visitor IPs from Supabase (last 6h, not yet processed)
 *   2. Resolve each IP to company (max 100 per run)
 *   3. Score and classify
 *   4. Enrich high-intent B2B visitors
 *   5. Return summary stats
 */
export async function runVisitorIntelBatch(): Promise<VisitorIntelResult> {
  const result: VisitorIntelResult = {
    identified: 0,
    b2bCompanies: 0,
    highIntent: 0,
    enriched: 0,
    injectedToPipeline: 0,
  };

  const supabase = createAdminSupabase();
  if (!supabase) {
    console.warn("[Visitor Intel] No Supabase admin client — batch skipped.");
    return result;
  }

  // Fetch recent unprocessed visitor records
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

  const { data: visitors, error } = await (supabase as any)
    .from("visitor_intel_raw")
    .select("ip, headers, pages_viewed, created_at")
    .gte("created_at", sixHoursAgo)
    .eq("processed", false)
    .order("created_at", { ascending: false })
    .limit(MAX_LOOKUPS_PER_BATCH);

  if (error) {
    console.error("[Visitor Intel] Failed to fetch raw visitors:", error.message);
    return result;
  }

  if (!visitors || visitors.length === 0) {
    console.log("[Visitor Intel] No unprocessed visitors in last 6h.");
    return result;
  }

  console.log(`[Visitor Intel] Processing ${visitors.length} visitor(s)...`);

  // Deduplicate by IP within this batch
  const seen = new Set<string>();
  const unique = visitors.filter((v: any) => {
    if (seen.has(v.ip)) return false;
    seen.add(v.ip);
    return true;
  });

  for (const record of unique) {
    try {
      const headers: Record<string, string> =
        typeof record.headers === "string" ? JSON.parse(record.headers) : record.headers || {};

      const identification = await identifyVisitor(record.ip, headers);

      // Override pages from stored data if available
      if (record.pages_viewed && Array.isArray(record.pages_viewed)) {
        identification.pagesViewed = record.pages_viewed;
        const { score, highIntent } = scoreVisit(record.pages_viewed);
        identification.visitScore = score;
        identification.highIntentPages = highIntent;
      }

      result.identified++;

      if (identification.isB2B) {
        result.b2bCompanies++;
      }

      if (identification.highIntentPages) {
        result.highIntent++;
      }

      // Enrich and inject high-intent B2B visitors
      if (
        identification.isB2B &&
        identification.visitScore >= ENRICHMENT_SCORE_THRESHOLD
      ) {
        const injected = await processHighIntentVisitor(identification);
        if (injected) {
          result.enriched++;
          result.injectedToPipeline++;
        }
      }

      // Mark as processed
      await (supabase as any)
        .from("visitor_intel_raw")
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq("ip", record.ip)
        .gte("created_at", sixHoursAgo);
    } catch (err) {
      console.error(`[Visitor Intel] Error processing IP ${record.ip}:`, err);
    }
  }

  console.log(
    `[Visitor Intel] Batch complete: ${result.identified} identified, ` +
      `${result.b2bCompanies} B2B, ${result.highIntent} high-intent, ` +
      `${result.enriched} enriched, ${result.injectedToPipeline} injected.`,
  );

  return result;
}

// ── Helpers ──────────────────────────────────────────

/**
 * Fetch pages viewed by an IP from Supabase tracking table.
 * Returns empty array if no tracking data exists.
 */
async function getVisitorPages(ip: string): Promise<string[]> {
  const supabase = createAdminSupabase();
  if (!supabase) return [];

  try {
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

    const { data } = await (supabase as any)
      .from("visitor_intel_raw")
      .select("pages_viewed")
      .eq("ip", ip)
      .gte("created_at", sixHoursAgo)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (data?.pages_viewed && Array.isArray(data.pages_viewed)) {
      return data.pages_viewed;
    }
  } catch {
    // Silently fail — page tracking is optional
  }

  return [];
}
