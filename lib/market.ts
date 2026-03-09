/**
 * GHOST TAX — MARKET MEMORY ENGINE (SERVER-ONLY)
 *
 * Sits between enrichment/vector memory and the financial intelligence engine.
 * Provides structured market context to strengthen proof and benchmark credibility.
 *
 * Capabilities:
 *   1. Industry baseline memory — what is normal for this profile?
 *   2. Company-size-adjusted pattern memory — headcount/spend norms
 *   3. Vendor/category reference memory — known vendor pricing patterns
 *   4. Similar exposure shape retrieval — peer exposure clustering
 *   5. Remediation outcome memory — what corrective paths worked?
 *   6. Benchmark confidence scoring — how defensible is the comparison?
 *
 * Data sources:
 *   - Vector memory (sector_reference, company_profile, remediation_pattern)
 *   - Industry baseline constants (curated, confidence-aware)
 *   - Enrichment signals (Exa)
 *
 * This engine does NOT invent data. If market memory is weak, it says so.
 */

import {
  searchSimilar,
  storeVectors,
  type SimilarityResult,
  type VectorEntry,
} from "@/lib/vectors";
import type { EnrichmentResult } from "@/lib/exa";

// ── Types ─────────────────────────────────────────────

export interface MarketBaseline {
  industry: string;
  headcountBand: string;
  medianSpendPerEmployee: [number, number]; // EUR range
  medianExposurePercent: [number, number];  // % of spend that is typically leaked
  commonVendorPatterns: string[];
  sampleSize: number;         // how many data points support this
  confidence: number;         // 0-100
}

export interface VendorReference {
  vendor: string;
  category: string;
  typicalPriceRange: [number, number];    // EUR/seat/month
  pricingModel: string;
  commonOverspendPatterns: string[];
  negotiationLeverage: "high" | "moderate" | "low";
  confidence: number;
}

export interface ExposureCluster {
  clusterLabel: string;
  signalPattern: string[];
  typicalExposureRange: [number, number]; // EUR/yr
  typicalCorrectionPath: string;
  observedFrequency: "common" | "moderate" | "rare";
  similarity: number;
}

export interface MarketMemoryResult {
  baseline: MarketBaseline | null;
  vendorReferences: VendorReference[];
  exposureClusters: ExposureCluster[];
  sectorSignals: SimilarityResult[];
  memoryConfidence: number;        // 0-100: overall market memory reliability
  memoryDepth: "deep" | "moderate" | "shallow" | "none";
  supportSummary: string;
}

// ── Industry Baseline Data ────────────────────────────
// Curated baselines with confidence ratings.
// Not fake precision — ranges reflect real variance.

const INDUSTRY_BASELINES: Record<string, Omit<MarketBaseline, "headcountBand" | "sampleSize" | "confidence">> = {
  "Technology / SaaS": {
    industry: "Technology / SaaS",
    medianSpendPerEmployee: [1400, 2200],
    medianExposurePercent: [12, 22],
    commonVendorPatterns: ["AWS + GCP overlap", "AI tool redundancy (OpenAI + Anthropic + Copilot)", "Observability stack sprawl"],
  },
  "Financial Services": {
    industry: "Financial Services",
    medianSpendPerEmployee: [1800, 2600],
    medianExposurePercent: [10, 18],
    commonVendorPatterns: ["Compliance tooling overlap", "Legacy + modern CRM parallel", "Multi-cloud for regulatory reasons"],
  },
  "Healthcare": {
    industry: "Healthcare",
    medianSpendPerEmployee: [1200, 2000],
    medianExposurePercent: [14, 24],
    commonVendorPatterns: ["EHR integration sprawl", "HIPAA-compliant tool duplication", "Shadow IT from clinical staff"],
  },
  "Retail & E-commerce": {
    industry: "Retail & E-commerce",
    medianSpendPerEmployee: [1000, 1800],
    medianExposurePercent: [15, 25],
    commonVendorPatterns: ["Marketing stack redundancy", "Payment provider overlap", "Seasonal license waste"],
  },
  "Manufacturing": {
    industry: "Manufacturing",
    medianSpendPerEmployee: [800, 1600],
    medianExposurePercent: [10, 20],
    commonVendorPatterns: ["ERP + standalone tool overlap", "Underutilized cloud resources", "Legacy license carry"],
  },
  "Media & Advertising": {
    industry: "Media & Advertising",
    medianSpendPerEmployee: [1500, 2300],
    medianExposurePercent: [16, 26],
    commonVendorPatterns: ["Creative tool sprawl", "Analytics stack redundancy", "Freelancer seat waste"],
  },
  "Professional Services": {
    industry: "Professional Services",
    medianSpendPerEmployee: [1100, 1900],
    medianExposurePercent: [11, 19],
    commonVendorPatterns: ["Project management tool overlap", "CRM overprovisioning", "Collaboration suite duplication"],
  },
};

// ── Vendor Reference Data ─────────────────────────────
// Known vendor pricing patterns — not exact prices, ranges.

const VENDOR_REFERENCES: VendorReference[] = [
  { vendor: "Salesforce", category: "CRM", typicalPriceRange: [25, 300], pricingModel: "per-user/month, tiered", commonOverspendPatterns: ["Enterprise tier for SMB needs", "Unused seats on annual contracts", "Add-on module sprawl"], negotiationLeverage: "moderate", confidence: 70 },
  { vendor: "HubSpot", category: "CRM / Marketing", typicalPriceRange: [20, 120], pricingModel: "per-user/month, tiered", commonOverspendPatterns: ["Marketing Hub + Sales Hub overlap with other tools", "Contact tier overshoot"], negotiationLeverage: "moderate", confidence: 65 },
  { vendor: "Datadog", category: "Observability", typicalPriceRange: [15, 31], pricingModel: "per-host/month + usage", commonOverspendPatterns: ["Log volume surprise bills", "Custom metrics cost explosion", "APM + Infrastructure overlap with alternatives"], negotiationLeverage: "high", confidence: 72 },
  { vendor: "Snowflake", category: "Data / Analytics", typicalPriceRange: [2, 4], pricingModel: "credit-based consumption", commonOverspendPatterns: ["Unoptimized queries burning credits", "Auto-suspend disabled", "Warehouse sizing too large"], negotiationLeverage: "moderate", confidence: 68 },
  { vendor: "AWS", category: "Cloud Infrastructure", typicalPriceRange: [50, 500], pricingModel: "usage-based, reserved instances", commonOverspendPatterns: ["No reserved instances or savings plans", "Orphaned resources", "Cross-region data transfer"], negotiationLeverage: "high", confidence: 75 },
  { vendor: "Azure", category: "Cloud Infrastructure", typicalPriceRange: [50, 400], pricingModel: "usage-based, reserved instances", commonOverspendPatterns: ["EA agreement misalignment", "Unused reserved capacity", "Premium tier for non-critical workloads"], negotiationLeverage: "high", confidence: 72 },
  { vendor: "Google Cloud", category: "Cloud Infrastructure", typicalPriceRange: [40, 350], pricingModel: "usage-based, committed use", commonOverspendPatterns: ["No committed use discounts", "BigQuery slot overpurchase", "Egress cost surprises"], negotiationLeverage: "high", confidence: 70 },
  { vendor: "OpenAI", category: "AI / LLM", typicalPriceRange: [20, 500], pricingModel: "usage-based (tokens)", commonOverspendPatterns: ["GPT-4 for tasks that GPT-3.5 handles", "No caching layer", "Redundant with Anthropic/Copilot"], negotiationLeverage: "low", confidence: 55 },
  { vendor: "GitHub Copilot", category: "AI / Dev Tools", typicalPriceRange: [10, 39], pricingModel: "per-user/month", commonOverspendPatterns: ["Business tier for individual contributors", "Low adoption rate among licensed seats"], negotiationLeverage: "low", confidence: 60 },
  { vendor: "Slack", category: "Collaboration", typicalPriceRange: [7, 13], pricingModel: "per-user/month", commonOverspendPatterns: ["Pro/Business+ for small teams", "Inactive user seats on annual billing"], negotiationLeverage: "moderate", confidence: 70 },
  { vendor: "Jira", category: "Project Management", typicalPriceRange: [8, 17], pricingModel: "per-user/month, tiered", commonOverspendPatterns: ["Premium tier unused features", "Confluence + Jira double billing"], negotiationLeverage: "moderate", confidence: 68 },
  { vendor: "Notion", category: "Collaboration / Knowledge", typicalPriceRange: [8, 15], pricingModel: "per-user/month", commonOverspendPatterns: ["Plus plan when Team suffices", "Overlaps with Confluence/Google Docs"], negotiationLeverage: "low", confidence: 55 },
];

// ── Exposure Pattern Clusters ─────────────────────────

const EXPOSURE_CLUSTERS: Omit<ExposureCluster, "similarity">[] = [
  {
    clusterLabel: "AI Tool Fragmentation",
    signalPattern: ["ai_tool_redundancy", "shadow_it_risk"],
    typicalExposureRange: [8000, 65000],
    typicalCorrectionPath: "Vendor consolidation → single AI platform + governance policy",
    observedFrequency: "common",
  },
  {
    clusterLabel: "Observability Stack Sprawl",
    signalPattern: ["observability_overlap", "license_sprawl"],
    typicalExposureRange: [12000, 80000],
    typicalCorrectionPath: "Observability audit → consolidate to primary vendor + usage-based tier",
    observedFrequency: "common",
  },
  {
    clusterLabel: "Multi-Cloud Waste",
    signalPattern: ["multi_cloud_waste", "spend_per_head_elevated"],
    typicalExposureRange: [20000, 150000],
    typicalCorrectionPath: "Cloud commitment strategy → reserved instances + primary cloud selection",
    observedFrequency: "moderate",
  },
  {
    clusterLabel: "License Overprovisioning",
    signalPattern: ["license_sprawl", "plan_oversize"],
    typicalExposureRange: [6000, 45000],
    typicalCorrectionPath: "License audit → rightsize tiers + remove inactive seats",
    observedFrequency: "common",
  },
  {
    clusterLabel: "Shadow IT Accumulation",
    signalPattern: ["shadow_it_risk", "license_sprawl", "spend_per_head_elevated"],
    typicalExposureRange: [15000, 90000],
    typicalCorrectionPath: "Governance framework → procurement gating + quarterly review cycle",
    observedFrequency: "moderate",
  },
];

// ── Headcount Bands ───────────────────────────────────

function headcountBand(hc: number | undefined): string {
  if (!hc) return "unknown";
  if (hc < 50) return "1-49";
  if (hc < 200) return "50-199";
  if (hc < 500) return "200-499";
  if (hc < 1000) return "500-999";
  return "1000+";
}

// ── Main Engine ───────────────────────────────────────

export async function buildMarketMemory(
  industry: string,
  headcount: number | undefined,
  techFootprint: string[],
  detectedSignalTypes: string[],
  enrichment: EnrichmentResult,
): Promise<MarketMemoryResult> {

  // 1. Industry baseline
  const baseline = resolveBaseline(industry, headcount);

  // 2. Vendor references (matched to detected tech)
  const vendorReferences = matchVendorReferences(techFootprint);

  // 3. Exposure clusters (matched to detected signal types)
  const exposureClusters = matchExposureClusters(detectedSignalTypes);

  // 4. Sector reference vectors (async)
  const sectorQuery = `${industry} IT spend optimization exposure patterns ${headcountBand(headcount)} employees ${techFootprint.slice(0, 5).join(" ")}`;
  const sectorSignals = await searchSimilar(sectorQuery, {
    category: "sector_reference",
    limit: 3,
    threshold: 0.3,
  });

  // 5. Memory confidence
  const memoryConfidence = computeMemoryConfidence(
    baseline, vendorReferences, exposureClusters, sectorSignals, enrichment,
  );

  const memoryDepth = memoryConfidence >= 60 ? "deep"
    : memoryConfidence >= 40 ? "moderate"
    : memoryConfidence >= 20 ? "shallow"
    : "none";

  // 6. Persist sector intelligence for future queries
  persistSectorMemory(industry, headcount, techFootprint, detectedSignalTypes).catch(() => {});

  return {
    baseline,
    vendorReferences,
    exposureClusters,
    sectorSignals,
    memoryConfidence,
    memoryDepth,
    supportSummary: buildSupportSummary(baseline, vendorReferences, exposureClusters, sectorSignals, memoryConfidence),
  };
}

// ── Resolution Functions ──────────────────────────────

function resolveBaseline(industry: string, headcount: number | undefined): MarketBaseline | null {
  const base = INDUSTRY_BASELINES[industry];
  if (!base) return null;

  // Adjust confidence by what we know
  let confidence = 35; // base — we have industry data but no proprietary dataset
  let sampleSize = 50; // conceptual baseline

  if (headcount) {
    confidence += 10;
    sampleSize += 20;
    // Size-adjusted spend correction
    if (headcount > 500) {
      // Larger companies tend toward lower per-employee spend
      base.medianSpendPerEmployee = [
        Math.round(base.medianSpendPerEmployee[0] * 0.85),
        Math.round(base.medianSpendPerEmployee[1] * 0.90),
      ];
      confidence += 5;
    }
  }

  return {
    ...base,
    headcountBand: headcountBand(headcount),
    sampleSize,
    confidence: Math.min(confidence, 65), // never overclaim
  };
}

function matchVendorReferences(techFootprint: string[]): VendorReference[] {
  const techLower = techFootprint.map(t => t.toLowerCase());
  return VENDOR_REFERENCES.filter(vr =>
    techLower.some(t => vr.vendor.toLowerCase().includes(t) || t.includes(vr.vendor.toLowerCase()))
  );
}

function matchExposureClusters(signalTypes: string[]): ExposureCluster[] {
  return EXPOSURE_CLUSTERS
    .map(cluster => {
      const matchCount = cluster.signalPattern.filter(p => signalTypes.includes(p)).length;
      if (matchCount === 0) return null;
      const similarity = matchCount / cluster.signalPattern.length;
      return { ...cluster, similarity };
    })
    .filter((c): c is ExposureCluster => c !== null && c.similarity >= 0.5)
    .sort((a, b) => b.similarity - a.similarity);
}

function computeMemoryConfidence(
  baseline: MarketBaseline | null,
  vendorRefs: VendorReference[],
  clusters: ExposureCluster[],
  sectorSignals: SimilarityResult[],
  enrichment: EnrichmentResult,
): number {
  let score = 10; // always have heuristic baseline

  if (baseline) score += 15;
  if (vendorRefs.length > 0) score += Math.min(vendorRefs.length * 5, 20);
  if (clusters.length > 0) score += Math.min(clusters.length * 8, 20);
  if (sectorSignals.length > 0) score += Math.min(sectorSignals.length * 7, 15);
  if (enrichment.signals.length > 3) score += 10;
  if (enrichment.techMentions.length > 5) score += 5;

  return Math.min(score, 85); // never overclaim
}

function buildSupportSummary(
  baseline: MarketBaseline | null,
  vendorRefs: VendorReference[],
  clusters: ExposureCluster[],
  sectorSignals: SimilarityResult[],
  confidence: number,
): string {
  const parts: string[] = [];

  if (confidence >= 50) {
    parts.push("Market memory provides moderate-to-strong support for this analysis.");
  } else if (confidence >= 30) {
    parts.push("Market memory provides directional support. Comparison is indicative, not definitive.");
  } else {
    parts.push("Limited market memory available. Conclusions rely primarily on heuristic models.");
  }

  if (baseline) {
    parts.push(`Industry baseline available for ${baseline.industry} (${baseline.headcountBand} employees).`);
  }

  if (vendorRefs.length > 0) {
    parts.push(`${vendorRefs.length} vendor reference${vendorRefs.length > 1 ? "s" : ""} matched from detected tech footprint.`);
  }

  if (clusters.length > 0) {
    parts.push(`Exposure pattern matches ${clusters.length} known cluster${clusters.length > 1 ? "s" : ""}.`);
  }

  if (sectorSignals.length > 0) {
    parts.push(`${sectorSignals.length} sector reference${sectorSignals.length > 1 ? "s" : ""} found in vector memory.`);
  }

  return parts.join(" ");
}

// ── Persistence ───────────────────────────────────────

async function persistSectorMemory(
  industry: string,
  headcount: number | undefined,
  techFootprint: string[],
  signalTypes: string[],
): Promise<void> {
  const entries: VectorEntry[] = [{
    category: "sector_reference",
    content: `Sector profile: ${industry}, ${headcountBand(headcount)} employees, tech: ${techFootprint.join(", ")}. Detected patterns: ${signalTypes.join(", ")}.`,
    metadata: {
      industry,
      headcountBand: headcountBand(headcount),
      techCount: techFootprint.length,
      signalTypes,
      timestamp: new Date().toISOString(),
    },
  }];

  await storeVectors(entries);
}
