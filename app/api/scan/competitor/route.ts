/**
 * GHOST TAX — COMPETITOR SCAN API
 *
 * GET /api/scan/competitor?source=acme.com&target=competitor.com&ref=abc123
 *
 * Viral loop endpoint: lets existing customers scan their competitors.
 * The comparison preview teases enough value to convert the competitor
 * (or the customer) into a full paid scan.
 *
 * Flow:
 *   1. Validate both domains
 *   2. Verify source domain has an existing report (must be a customer)
 *   3. Run enrichCompany(target) for competitor tech stack
 *   4. Generate comparison preview: "Your competitor uses X tools you don't"
 *   5. Return JSON with comparison data + CTA to purchase full scan
 *
 * Viral loop:
 *   Customer scans competitor -> competitor gets curious ->
 *   competitor scans themselves -> new customer
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase";

// ── Constants ────────────────────────────────────────────

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://ghost-tax.com";

const DOMAIN_REGEX =
  /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

// ── Domain Validation ────────────────────────────────────

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

// ── GET Handler ──────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const rawSource = searchParams.get("source");
  const rawTarget = searchParams.get("target");
  const refCode = searchParams.get("ref") || "";

  // ── 1. Validate parameters ────────────────────────────

  if (!rawSource) {
    return NextResponse.json(
      { error: "Missing required parameter: source" },
      { status: 400 }
    );
  }

  if (!rawTarget) {
    // If no target, redirect to the competitor scan landing page
    // where the customer can enter a competitor domain
    const redirectUrl = `${SITE_URL}/intel?mode=competitor&source=${encodeURIComponent(rawSource)}&ref=${encodeURIComponent(refCode)}`;
    return NextResponse.redirect(redirectUrl);
  }

  const sourceDomain = sanitizeDomain(rawSource);
  const targetDomain = sanitizeDomain(rawTarget);

  if (!sourceDomain) {
    return NextResponse.json(
      { error: "Invalid source domain format" },
      { status: 400 }
    );
  }

  if (!targetDomain) {
    return NextResponse.json(
      { error: "Invalid target domain format" },
      { status: 400 }
    );
  }

  if (sourceDomain === targetDomain) {
    return NextResponse.json(
      { error: "Source and target domains must be different" },
      { status: 400 }
    );
  }

  // ── 2. Verify source has existing report ──────────────

  const supabase = createAdminSupabase();

  if (!supabase) {
    return NextResponse.json(
      { error: "Service temporarily unavailable" },
      { status: 503 }
    );
  }

  const { data: sourceReport, error: sourceError } = await (supabase as any)
    .from("audit_requests")
    .select("id, run_id, domain, report_data, status")
    .eq("domain", sourceDomain)
    .in("status", ["delivered", "followup_scheduled"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sourceError) {
    console.error("[Ghost Tax] Competitor scan — source lookup error:", sourceError);
    return NextResponse.json(
      { error: "Failed to verify source report" },
      { status: 500 }
    );
  }

  if (!sourceReport) {
    return NextResponse.json(
      {
        error: "No existing report found for source domain",
        message:
          "You must have a completed Ghost Tax report before scanning competitors.",
        cta: {
          label: "Scan your company first",
          url: `${SITE_URL}/intel?domain=${encodeURIComponent(sourceDomain)}`,
        },
      },
      { status: 403 }
    );
  }

  // ── 3. Enrich competitor via Exa ──────────────────────

  // Dynamic import to avoid circular dependencies
  let enrichCompany: (domain: string) => Promise<{
    domain: string;
    signals: Array<{ source: string; title: string; snippet: string; url: string; category: string }>;
    techMentions: string[];
    hiringSignals: string[];
    summary: string;
    vendorsByCategory: Record<string, string[]>;
    queryErrors: string[];
  }>;

  try {
    const exaModule = await import("@/lib/exa");
    enrichCompany = exaModule.enrichCompany;
  } catch {
    return NextResponse.json(
      { error: "Enrichment service unavailable" },
      { status: 503 }
    );
  }

  let targetEnrichment;
  try {
    targetEnrichment = await enrichCompany(targetDomain);
  } catch (err) {
    console.error("[Ghost Tax] Competitor enrichment error:", err);
    return NextResponse.json(
      { error: "Failed to enrich competitor domain" },
      { status: 502 }
    );
  }

  // ── 4. Generate comparison preview ────────────────────

  // Extract source vendor data from existing report
  const sourceReportData = (sourceReport as any).report_data as Record<string, unknown> | null;
  const sourceVendors = extractVendorsFromReport(sourceReportData);
  const targetVendors = flattenVendorsByCategory(targetEnrichment.vendorsByCategory);

  // Tools competitor uses that source doesn't
  const competitorUnique = targetVendors.filter(
    (v) => !sourceVendors.includes(v)
  );

  // Tools source uses that competitor doesn't
  const sourceUnique = sourceVendors.filter(
    (v) => !targetVendors.includes(v)
  );

  // Tools both use (overlap = potential consolidation)
  const sharedTools = sourceVendors.filter((v) => targetVendors.includes(v));

  // Category-level comparison
  const categoryComparison = buildCategoryComparison(
    sourceReportData,
    targetEnrichment.vendorsByCategory
  );

  // ── 5. Track viral event ──────────────────────────────

  try {
    // Dynamic import to avoid circular deps with viral-loop
    const { trackViralEvent } = await import("@/lib/viral-loop");
    await trackViralEvent({
      type: "competitor_scan_initiated",
      sourceRunId: (sourceReport as any).run_id,
      targetDomain,
      metadata: {
        ref_code: refCode,
        competitor_tools_found: targetVendors.length,
        unique_to_competitor: competitorUnique.length,
      },
    });
  } catch {
    // Non-fatal — tracking failure must never break the scan
  }

  // ── 6. Return comparison + CTA ────────────────────────

  return NextResponse.json({
    source: {
      domain: sourceDomain,
      toolCount: sourceVendors.length,
    },
    competitor: {
      domain: targetDomain,
      toolCount: targetVendors.length,
      summary: targetEnrichment.summary,
      hiringSignals: targetEnrichment.hiringSignals.slice(0, 5),
    },
    comparison: {
      competitorUniqueTools: competitorUnique.slice(0, 15),
      sourceUniqueTools: sourceUnique.slice(0, 15),
      sharedTools: sharedTools.slice(0, 15),
      competitorUniqueCount: competitorUnique.length,
      sourceUniqueCount: sourceUnique.length,
      sharedCount: sharedTools.length,
      categoryComparison,
      headline:
        competitorUnique.length > 0
          ? `Your competitor uses ${competitorUnique.length} tool${competitorUnique.length === 1 ? "" : "s"} you don't`
          : "Your tech stacks are closely aligned",
      insight:
        competitorUnique.length > 3
          ? `${targetDomain} has a broader tool footprint. This could mean higher exposure — or strategic investments you're missing.`
          : competitorUnique.length > 0
            ? `${targetDomain} has a few different tools. A full scan would reveal whether they represent risk or opportunity.`
            : `Similar stacks often mean similar blind spots. A full competitor scan would reveal hidden exposure differences.`,
    },
    cta: {
      fullScan: {
        label: `Get the full ${targetDomain} Ghost Tax report`,
        url: `${SITE_URL}/intel?domain=${encodeURIComponent(targetDomain)}&ref=${encodeURIComponent(refCode)}&utm_source=competitor_scan&utm_medium=viral`,
        priceEur: 490,
      },
      shareWithCompetitor: {
        label: `Send this to ${targetDomain}'s CFO`,
        url: `${SITE_URL}/intel?domain=${encodeURIComponent(targetDomain)}&ref=${encodeURIComponent(refCode)}&utm_source=competitor_share&utm_medium=viral`,
      },
    },
    meta: {
      generatedAt: new Date().toISOString(),
      sourceRunId: (sourceReport as any).run_id,
      refCode,
      isPreview: true,
      note: "This is a preview comparison. Purchase a full scan for complete exposure analysis with financial quantification.",
    },
  });
}

// ── Helper: Extract vendors from existing report ─────────

function extractVendorsFromReport(
  reportData: Record<string, unknown> | null
): string[] {
  if (!reportData) return [];

  const vendors: string[] = [];

  // Try vendorPressureMap.vendorDrifts
  const pressureMap = reportData.vendorPressureMap as
    | { vendorDrifts?: Array<{ vendor: string }> }
    | undefined;

  if (pressureMap?.vendorDrifts) {
    for (const drift of pressureMap.vendorDrifts) {
      if (drift.vendor && !vendors.includes(drift.vendor)) {
        vendors.push(drift.vendor);
      }
    }
  }

  // Try negotiation.vendorLeverageMap
  const negotiation = reportData.negotiation as
    | { vendorLeverageMap?: Array<{ vendor: string }> }
    | undefined;

  if (negotiation?.vendorLeverageMap) {
    for (const entry of negotiation.vendorLeverageMap) {
      if (entry.vendor && !vendors.includes(entry.vendor)) {
        vendors.push(entry.vendor);
      }
    }
  }

  return vendors;
}

// ── Helper: Flatten vendorsByCategory ────────────────────

function flattenVendorsByCategory(
  vendorsByCategory: Record<string, string[]>
): string[] {
  const all: string[] = [];
  for (const category of Object.keys(vendorsByCategory)) {
    for (const vendor of vendorsByCategory[category]) {
      if (!all.includes(vendor)) {
        all.push(vendor);
      }
    }
  }
  return all;
}

// ── Helper: Category-level comparison ────────────────────

function buildCategoryComparison(
  sourceReportData: Record<string, unknown> | null,
  targetVendorsByCategory: Record<string, string[]>
): Array<{
  category: string;
  sourceCount: number;
  competitorCount: number;
  delta: number;
}> {
  // Extract source categories from report
  const sourceCategories: Record<string, number> = {};

  const pressureMap = sourceReportData?.vendorPressureMap as
    | { vendorDrifts?: Array<{ vendor: string; category: string }> }
    | undefined;

  if (pressureMap?.vendorDrifts) {
    for (const drift of pressureMap.vendorDrifts) {
      const cat = drift.category || "uncategorized";
      sourceCategories[cat] = (sourceCategories[cat] || 0) + 1;
    }
  }

  // Build comparison for all categories present in either
  const allCategories = new Set<string>([
    ...Object.keys(sourceCategories),
    ...Object.keys(targetVendorsByCategory),
  ]);

  return Array.from(allCategories)
    .map((category) => {
      const sourceCount = sourceCategories[category] || 0;
      const competitorCount =
        targetVendorsByCategory[category]?.length || 0;
      return {
        category,
        sourceCount,
        competitorCount,
        delta: competitorCount - sourceCount,
      };
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}
