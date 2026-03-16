/**
 * GHOST TAX — BATCH DOMAIN SCANNER
 *
 * POST /api/scan/batch
 * Body: { domains: string[], secret: string }
 *
 * Scans multiple domains in parallel via Exa enrichment,
 * estimates exposure, detects geo market, and injects into
 * outreach_leads as "batch_scan" source.
 *
 * Protected by CRON_SECRET (same as cron routes).
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase";
import { estimateExposure, detectGeoMarket } from "@/lib/outreach";

// ── Config ───────────────────────────────────────────────

const MAX_DOMAINS = 25;
const CONCURRENCY = 3; // Exa rate limit safe

const DOMAIN_REGEX =
  /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

// ── Types ────────────────────────────────────────────────

interface ScanResult {
  domain: string;
  status: "success" | "error";
  geoMarket: string;
  vendorCount: number;
  vendors: string[];
  vendorsByCategory: Record<string, string[]>;
  signals: number;
  hiringSignals: string[];
  intentSignals: string[];
  exposure: {
    low: number;
    high: number;
    annual: number;
    currency: string;
  };
  summary: string;
  error?: string;
}

// ── Helpers ──────────────────────────────────────────────

function sanitizeDomain(raw: string): string | null {
  const cleaned = raw
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .trim();

  if (!cleaned || cleaned.length > 253 || !DOMAIN_REGEX.test(cleaned)) {
    return null;
  }
  return cleaned;
}

async function scanDomain(
  domain: string,
  enrichCompany: (d: string) => Promise<{
    domain: string;
    signals: Array<{ category: string }>;
    techMentions: string[];
    hiringSignals: string[];
    summary: string;
    vendorsByCategory: Record<string, string[]>;
    intentSignals?: Array<{ type: string; confidence: number }>;
    geoMarket?: string;
    queryErrors: string[];
  }>
): Promise<ScanResult> {
  try {
    const enrichment = await enrichCompany(domain);
    const geo = enrichment.geoMarket || detectGeoMarket(domain);
    const vendors = enrichment.techMentions || [];
    const exposure = estimateExposure(undefined, undefined, geo);
    const intents = (enrichment.intentSignals || []).map(
      (s) => `${s.type} (${Math.round(s.confidence * 100)}%)`
    );

    return {
      domain,
      status: "success",
      geoMarket: geo,
      vendorCount: vendors.length,
      vendors,
      vendorsByCategory: enrichment.vendorsByCategory || {},
      signals: enrichment.signals?.length || 0,
      hiringSignals: enrichment.hiringSignals?.slice(0, 5) || [],
      intentSignals: intents,
      exposure: {
        low: exposure.low,
        high: exposure.high,
        annual: exposure.annual,
        currency: exposure.currency,
      },
      summary: enrichment.summary,
    };
  } catch (err) {
    return {
      domain,
      status: "error",
      geoMarket: detectGeoMarket(domain),
      vendorCount: 0,
      vendors: [],
      vendorsByCategory: {},
      signals: 0,
      hiringSignals: [],
      intentSignals: [],
      exposure: { low: 0, high: 0, annual: 0, currency: "EUR" },
      summary: "",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ── Parallel batch with concurrency limit ────────────────

async function scanBatch(
  domains: string[],
  enrichCompany: (d: string) => Promise<unknown>,
  concurrency: number
): Promise<ScanResult[]> {
  const results: ScanResult[] = [];

  for (let i = 0; i < domains.length; i += concurrency) {
    const batch = domains.slice(i, i + concurrency);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const batchResults = await Promise.all(batch.map((d) => scanDomain(d, enrichCompany as any)));
    results.push(...batchResults);
  }

  return results;
}

// ── POST Handler ─────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Auth check
  const body = await request.json();
  const secret = body.secret;

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawDomains: string[] = body.domains;

  if (!Array.isArray(rawDomains) || rawDomains.length === 0) {
    return NextResponse.json(
      { error: "domains must be a non-empty array" },
      { status: 400 }
    );
  }

  if (rawDomains.length > MAX_DOMAINS) {
    return NextResponse.json(
      { error: `Max ${MAX_DOMAINS} domains per batch` },
      { status: 400 }
    );
  }

  // Sanitize domains
  const domains: string[] = [];
  const invalid: string[] = [];

  for (const raw of rawDomains) {
    const clean = sanitizeDomain(raw);
    if (clean) {
      domains.push(clean);
    } else {
      invalid.push(raw);
    }
  }

  if (domains.length === 0) {
    return NextResponse.json(
      { error: "No valid domains", invalid },
      { status: 400 }
    );
  }

  // Import enrichment dynamically
  let enrichCompany: (domain: string) => Promise<unknown>;
  try {
    const exaModule = await import("@/lib/exa");
    enrichCompany = exaModule.enrichCompany;
  } catch {
    return NextResponse.json(
      { error: "Enrichment service unavailable" },
      { status: 503 }
    );
  }

  // Scan all domains
  const startMs = Date.now();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results = await scanBatch(domains, enrichCompany as any, CONCURRENCY);
  const durationMs = Date.now() - startMs;

  // Inject successful scans into outreach_leads
  const supabase = createAdminSupabase();
  let injected = 0;

  if (supabase) {
    const rows = results
      .filter((r) => r.status === "success" && r.vendorCount > 0)
      .map((r) => ({
        domain: r.domain,
        email: `cfo@${r.domain}`, // placeholder — needs manual enrichment
        source: "batch_scan",
        status: "intent_detected",
        drip_step: 0,
        geo_market: r.geoMarket,
        exposure_low: r.exposure.low,
        exposure_high: r.exposure.high,
        vendor_count: r.vendorCount,
        vendors: r.vendors,
        intent_signals: r.intentSignals,
        metadata: {
          summary: r.summary,
          vendorsByCategory: r.vendorsByCategory,
          hiringSignals: r.hiringSignals,
          scannedAt: new Date().toISOString(),
        },
      }));

    if (rows.length > 0) {
      const { error } = await (supabase as any)
        .from("outreach_leads")
        .upsert(rows, { onConflict: "domain", ignoreDuplicates: false });

      if (!error) {
        injected = rows.length;
      } else {
        console.error("[Ghost Tax] Batch scan — inject error:", error);
      }
    }
  }

  // Build summary
  const successful = results.filter((r) => r.status === "success");
  const failed = results.filter((r) => r.status === "error");
  const totalVendors = successful.reduce((sum, r) => sum + r.vendorCount, 0);
  const totalExposure = successful.reduce((sum, r) => sum + r.exposure.annual, 0);

  return NextResponse.json({
    success: true,
    summary: {
      scanned: domains.length,
      successful: successful.length,
      failed: failed.length,
      invalid: invalid.length,
      injected,
      totalVendors,
      totalExposureEur: totalExposure,
      durationMs,
    },
    results,
    invalid: invalid.length > 0 ? invalid : undefined,
  });
}
