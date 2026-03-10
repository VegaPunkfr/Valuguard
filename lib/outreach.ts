/**
 * GHOST TAX — OUTREACH ENGINE v2 (SERVER-ONLY)
 *
 * 2026 upgrade: email validation, geo-aware pricing, market-aware
 * exposure estimation, better rate limiting, locale detection.
 *
 * Core logic for the drip email sequence.
 * Called by /api/outreach/drip route.
 *
 * Exports: OutreachLead, OutreachSendResult, estimateExposure,
 *          buildTouchEmail, sendOutreachEmail, checkRateLimit,
 *          recordSend, getNextSendDate, DRIP_SCHEDULE,
 *          validateAndEnrichLead, detectLeadLocale
 */

import { getDripTemplate, type DripData, DRIP_SCHEDULE as TEMPLATE_SCHEDULE } from "./drip-templates";
import { quickValidateEmail, extractCompanyDomain } from "./email-validation";

// ── Types ────────────────────────────────────────────────

export interface OutreachLead {
  email: string;
  name?: string;
  company?: string;
  domain: string;
  headcount?: number;
  industry?: string;
  locale: string;
  source?: string;
  // v2 additions
  geoMarket?: "us" | "dach" | "fr" | "eu" | "other";
  emailQuality?: "corporate" | "free" | "suspicious";
  intentSignals?: string[];
}

export interface OutreachSendResult {
  email: string;
  success: boolean;
  error?: string;
  touch: number;
  id?: string;
}

// ── Re-export schedule from drip-templates ───────────────

export const DRIP_SCHEDULE = TEMPLATE_SCHEDULE;

// ── Geo Market Detection ─────────────────────────────────

const US_TLDS = new Set([".com", ".us", ".io", ".co", ".ai", ".dev", ".app"]);
const DE_TLDS = new Set([".de", ".at", ".ch"]);
const FR_TLDS = new Set([".fr", ".be", ".lu"]);
const DE_ISPS = new Set(["gmx.de", "web.de", "t-online.de", "freenet.de", "posteo.de"]);
const FR_ISPS = new Set(["orange.fr", "wanadoo.fr", "free.fr", "sfr.fr", "laposte.net"]);

export function detectGeoMarket(domain: string, locale?: string): "us" | "dach" | "fr" | "eu" | "other" {
  const d = domain.toLowerCase();

  // Known ISPs
  if (DE_ISPS.has(d)) return "dach";
  if (FR_ISPS.has(d)) return "fr";

  // Locale hint
  if (locale === "de") return "dach";
  if (locale === "fr") return "fr";

  // TLD-based detection
  for (const tld of DE_TLDS) { if (d.endsWith(tld)) return "dach"; }
  for (const tld of FR_TLDS) { if (d.endsWith(tld)) return "fr"; }

  // US-biased for .com/.io etc (majority of Ghost Tax traffic)
  for (const tld of US_TLDS) { if (d.endsWith(tld)) return "us"; }

  // EU catch-all
  if (d.endsWith(".eu") || d.endsWith(".nl") || d.endsWith(".es") || d.endsWith(".it") || d.endsWith(".se")) {
    return "eu";
  }

  return "other";
}

export function detectLeadLocale(domain: string, locale?: string): "en" | "fr" | "de" {
  const geo = detectGeoMarket(domain, locale);
  if (geo === "dach") return "de";
  if (geo === "fr") return "fr";
  return "en";
}

// ── Lead Validation & Enrichment ─────────────────────────

export interface LeadValidation {
  valid: boolean;
  reason?: string;
  enrichedLocale: "en" | "fr" | "de";
  geoMarket: "us" | "dach" | "fr" | "eu" | "other";
  emailQuality: "corporate" | "free" | "suspicious";
  companyDomain: string | null;
}

export function validateAndEnrichLead(lead: OutreachLead): LeadValidation {
  // Quick email check (no DNS)
  const emailCheck = quickValidateEmail(lead.email);
  if (!emailCheck.valid) {
    return {
      valid: false,
      reason: "Invalid email format",
      enrichedLocale: "en",
      geoMarket: "other",
      emailQuality: "suspicious",
      companyDomain: null,
    };
  }

  if (emailCheck.isDisposable) {
    return {
      valid: false,
      reason: "Disposable email address",
      enrichedLocale: "en",
      geoMarket: "other",
      emailQuality: "suspicious",
      companyDomain: null,
    };
  }

  const companyDomain = extractCompanyDomain(lead.email);
  const geoMarket = detectGeoMarket(lead.domain || emailCheck.domain, lead.locale);
  const enrichedLocale = detectLeadLocale(lead.domain || emailCheck.domain, lead.locale);

  return {
    valid: true,
    enrichedLocale,
    geoMarket,
    emailQuality: emailCheck.isFree ? "free" : "corporate",
    companyDomain,
  };
}

// ── Exposure Estimation v2 ───────────────────────────────

// 2026 industry benchmarks: per-employee SaaS waste (USD/yr)
// Sources: Flexera 2026 State of ITAM, Zylo SaaS Management Index, Gartner
const INDUSTRY_SPEND: Record<string, { perEmployee: number; wasteRangeLow: number; wasteRangeHigh: number }> = {
  technology:           { perEmployee: 18_000, wasteRangeLow: 0.22, wasteRangeHigh: 0.38 },
  saas_tech:            { perEmployee: 20_000, wasteRangeLow: 0.25, wasteRangeHigh: 0.40 },
  financial_services:   { perEmployee: 15_000, wasteRangeLow: 0.20, wasteRangeHigh: 0.35 },
  finance:              { perEmployee: 14_000, wasteRangeLow: 0.18, wasteRangeHigh: 0.32 },
  healthcare:           { perEmployee: 11_000, wasteRangeLow: 0.15, wasteRangeHigh: 0.30 },
  healthcare_tech:      { perEmployee: 16_000, wasteRangeLow: 0.22, wasteRangeHigh: 0.38 },
  retail:               { perEmployee: 8_500,  wasteRangeLow: 0.18, wasteRangeHigh: 0.33 },
  ecommerce:            { perEmployee: 12_000, wasteRangeLow: 0.20, wasteRangeHigh: 0.35 },
  manufacturing:        { perEmployee: 7_000,  wasteRangeLow: 0.15, wasteRangeHigh: 0.28 },
  professional_services:{ perEmployee: 12_000, wasteRangeLow: 0.20, wasteRangeHigh: 0.35 },
  legal:                { perEmployee: 14_000, wasteRangeLow: 0.18, wasteRangeHigh: 0.32 },
  education:            { perEmployee: 6_000,  wasteRangeLow: 0.12, wasteRangeHigh: 0.25 },
  government:           { perEmployee: 5_000,  wasteRangeLow: 0.10, wasteRangeHigh: 0.22 },
  energy:               { perEmployee: 9_000,  wasteRangeLow: 0.15, wasteRangeHigh: 0.30 },
  logistics:            { perEmployee: 8_000,  wasteRangeLow: 0.15, wasteRangeHigh: 0.28 },
  media:                { perEmployee: 13_000, wasteRangeLow: 0.20, wasteRangeHigh: 0.35 },
  insurance:            { perEmployee: 12_000, wasteRangeLow: 0.18, wasteRangeHigh: 0.32 },
  real_estate:          { perEmployee: 9_000,  wasteRangeLow: 0.15, wasteRangeHigh: 0.28 },
  defense:              { perEmployee: 10_000, wasteRangeLow: 0.15, wasteRangeHigh: 0.28 },
  telecom:              { perEmployee: 11_000, wasteRangeLow: 0.18, wasteRangeHigh: 0.32 },
  consulting:           { perEmployee: 14_000, wasteRangeLow: 0.22, wasteRangeHigh: 0.38 },
  nonprofit:            { perEmployee: 5_000,  wasteRangeLow: 0.12, wasteRangeHigh: 0.25 },
};

const DEFAULT_SPEND = { perEmployee: 10_000, wasteRangeLow: 0.15, wasteRangeHigh: 0.30 };

/** Estimate exposure range based on headcount + industry + geo market (2026 benchmarks) */
export function estimateExposure(
  headcount?: number,
  industry?: string,
  geoMarket?: string,
): {
  low: number;
  high: number;
  annual: number;
  entropyScore: number;
  peerPercentile: number;
  industryAvg: number;
  currency: "USD" | "EUR";
} {
  const hc = headcount ?? 100;
  const normalizedIndustry = (industry || "").toLowerCase().replace(/[\s-]+/g, "_");
  const benchmark = INDUSTRY_SPEND[normalizedIndustry] || DEFAULT_SPEND;

  // Geo multiplier: US companies spend ~30% more on SaaS than EU
  const geoMultiplier = geoMarket === "us" ? 1.30
    : geoMarket === "dach" ? 0.90 // German efficiency → lower waste
    : geoMarket === "fr" ? 0.95
    : 1.0;

  // Size multiplier: larger orgs have more waste (tool sprawl)
  const sizeMultiplier = hc >= 1000 ? 1.15
    : hc >= 500 ? 1.08
    : hc >= 200 ? 1.0
    : hc >= 50 ? 0.90
    : 0.75;

  const adjustedPerEmployee = benchmark.perEmployee * geoMultiplier * sizeMultiplier;
  const totalSpend = hc * adjustedPerEmployee;

  const low = Math.round(totalSpend * benchmark.wasteRangeLow);
  const high = Math.round(totalSpend * benchmark.wasteRangeHigh);
  const annual = Math.round((low + high) / 2);

  // Entropy score: complexity from company size + industry + geo (capped at 85)
  const baseEntropy = 30 + Math.log10(Math.max(1, hc)) * 18;
  const industryEntropy = normalizedIndustry.includes("tech") ? 8
    : normalizedIndustry.includes("finance") ? 6
    : 3;
  const entropyScore = Math.min(85, Math.round(baseEntropy + industryEntropy + (hc % 5)));

  // Peer percentile based on waste ratio
  const wasteRatio = (benchmark.wasteRangeLow + benchmark.wasteRangeHigh) / 2;
  const peerPercentile = Math.min(95, Math.round(40 + wasteRatio * 150 + Math.log10(Math.max(1, hc)) * 8));

  // Industry average for ~200 employees
  const industryAvg = Math.round(200 * benchmark.perEmployee * ((benchmark.wasteRangeLow + benchmark.wasteRangeHigh) / 2));

  // Currency based on geo
  const currency = geoMarket === "us" ? "USD" as const : "EUR" as const;

  return { low, high, annual, entropyScore, peerPercentile, industryAvg, currency };
}

// ── Email Builder ────────────────────────────────────────

/** Build a drip email for a given touch using the drip-templates engine */
export function buildTouchEmail(
  touch: number,
  lead: OutreachLead,
  exposure: ReturnType<typeof estimateExposure>,
  locale: string,
): { subject: string; html: string; text: string } {
  const dripData: DripData = {
    companyName: lead.company || lead.domain,
    email: lead.email,
    domain: lead.domain,
    exposureLowEur: exposure.low,
    exposureHighEur: exposure.high,
    ghostTaxAnnual: exposure.annual,
    entropyScore: exposure.entropyScore,
    peerPercentile: exposure.peerPercentile,
    industryAvg: exposure.industryAvg,
    scanDate: new Date(Date.now() - touch * 3 * 24 * 60 * 60 * 1000).toISOString(),
    locale: (locale === "fr" || locale === "de") ? locale : "en",
  };

  return getDripTemplate(touch, dripData);
}

// ── Email Sender ─────────────────────────────────────────

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  tags?: Array<{ name: string; value: string }>;
}

export async function sendOutreachEmail(
  params: SendEmailParams,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.log("[Outreach] No RESEND_API_KEY — dry run for", params.to);
    return { success: true, id: "dry-run" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Ghost Tax <reports@ghost-tax.com>",
        to: [params.to],
        subject: params.subject,
        html: params.html,
        tags: params.tags,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, id: data.id };
    }

    const errorText = await res.text();
    console.error("[Outreach] Send failed:", res.status, errorText);
    return { success: false, error: `${res.status}: ${errorText}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Send failed";
    console.error("[Outreach] Send error:", msg);
    return { success: false, error: msg };
  }
}

// ── Rate Limiting (in-memory, per-invocation) ────────────
// v2: higher limit per batch, tracks per-domain limits

let sendCount = 0;
let domainCounts: Record<string, number> = {};
const MAX_SENDS_PER_BATCH = 100; // Doubled from v1
const MAX_SENDS_PER_DOMAIN = 5;  // Prevent spamming one domain

export function checkRateLimit(domain?: string): { allowed: boolean; remaining: number; retryAfterMs: number; reason?: string } {
  const remaining = MAX_SENDS_PER_BATCH - sendCount;

  if (remaining <= 0) {
    return { allowed: false, remaining: 0, retryAfterMs: 60_000, reason: "Batch limit reached" };
  }

  // Per-domain limit
  if (domain) {
    const domainCount = domainCounts[domain] || 0;
    if (domainCount >= MAX_SENDS_PER_DOMAIN) {
      return { allowed: false, remaining, retryAfterMs: 0, reason: `Domain limit (${MAX_SENDS_PER_DOMAIN}/batch) for ${domain}` };
    }
  }

  return { allowed: true, remaining, retryAfterMs: 0 };
}

export function recordSend(domain?: string): void {
  sendCount++;
  if (domain) {
    domainCounts[domain] = (domainCounts[domain] || 0) + 1;
  }
}

export function resetRateLimits(): void {
  sendCount = 0;
  domainCounts = {};
}

// ── Schedule Helpers ─────────────────────────────────────

// ── Unsubscribe Token ────────────────────────────────────

/** Decode a base64url-encoded unsubscribe token back to email */
export function decodeUnsubscribeToken(token: string): string {
  return Buffer.from(token, "base64url").toString("utf-8");
}

/** Get the next send date for a given touch step relative to now */
export function getNextSendDate(nextStep: number): Date {
  const schedule = DRIP_SCHEDULE.find(s => s.step === nextStep);
  if (!schedule) {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d;
  }

  const prevSchedule = DRIP_SCHEDULE.find(s => s.step === nextStep - 1);
  const intervalDays = prevSchedule
    ? schedule.delayDays - prevSchedule.delayDays
    : schedule.delayDays;

  const d = new Date();
  d.setDate(d.getDate() + intervalDays);
  return d;
}

// ── Price Display Helper ─────────────────────────────────

export function getCtaPrice(geoMarket: string): string {
  return geoMarket === "us" ? "$990" : "€890";
}

export function getCtaCurrency(geoMarket: string): "USD" | "EUR" {
  return geoMarket === "us" ? "USD" : "EUR";
}
