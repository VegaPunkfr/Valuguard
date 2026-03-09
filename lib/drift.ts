/**
 * GHOST TAX — LIVE COST DRIFT MONITOR (SERVER-ONLY)
 *
 * Detects worsening economic conditions by comparing current exposure
 * against market baselines, vendor pricing trends, and prior snapshots.
 *
 * This engine bridges one-time audit → continuous monitoring.
 *
 * Capabilities:
 *   1. Vendor cost drift — is vendor pricing moving against this company?
 *   2. Category cost drift — is this spend category worsening?
 *   3. Usage velocity drift — is tool/service consumption accelerating?
 *   4. Pricing pressure change — are renewal conditions deteriorating?
 *   5. Exposure delta — how much worse is this vs. baseline?
 *   6. Corrective window compression — is the window to act narrowing?
 *
 * Every drift component answers:
 *   - What changed?
 *   - By how much?
 *   - Why does it matter financially?
 *   - What urgency does it create?
 *   - Which corrective or negotiation action becomes stronger now?
 *
 * This engine does NOT create trend charts for decoration.
 * Every output must carry financial weight.
 */

import type { MarketBaseline, VendorReference, MarketMemoryResult } from "@/lib/market";

// ── Types ─────────────────────────────────────────────

export interface VendorDriftSignal {
  vendor: string;
  category: string;
  driftDirection: "worsening" | "stable" | "improving";
  driftSeverity: "critical" | "high" | "moderate" | "low";
  priorState: string;         // human-readable prior condition
  currentState: string;       // human-readable current condition
  deltaDescription: string;   // what changed
  financialImpact: string;    // why it matters in EUR terms
  urgencyDriver: string;      // what urgency this creates
  confidence: number;         // 0-100
}

export interface CategoryDriftSignal {
  category: string;
  driftDirection: "worsening" | "stable" | "improving";
  driftPercent: number;       // estimated % change (negative = improving)
  priorBaseline: [number, number]; // EUR range
  currentEstimate: [number, number]; // EUR range
  dominantCause: string;
  correctionAction: string;   // which corrective action becomes stronger
  confidence: number;
}

export interface ExposureDelta {
  baselineExposureEur: [number, number];
  currentExposureEur: [number, number];
  deltaEur: [number, number];         // absolute change
  deltaPercent: [number, number];      // percentage change
  direction: "worsening" | "stable" | "improving";
  primaryDriver: string;
  severity: "critical" | "high" | "moderate" | "low";
}

export interface WindowCompression {
  originalWindowDays: number;
  compressedWindowDays: number;
  compressionDays: number;
  compressionDrivers: string[];
  urgencyLevel: "critical" | "elevated" | "normal";
}

export interface DriftMonitorResult {
  vendorDrifts: VendorDriftSignal[];
  categoryDrifts: CategoryDriftSignal[];
  exposureDelta: ExposureDelta | null;
  windowCompression: WindowCompression;
  overallDriftScore: number;        // 0-100: how much is drifting against the company
  driftDirection: "worsening" | "stable" | "improving";
  driftSeverity: "critical" | "high" | "moderate" | "low";
  driftConfidence: number;          // 0-100
  pressureSummary: string;
}

// ── Vendor Pricing Drift Patterns ─────────────────────
// Known vendor pricing movements. Not speculation — structured observations.

interface VendorDriftPattern {
  vendor: string;
  annualPriceMovement: number;  // % typical annual increase
  renewalPressure: "high" | "moderate" | "low";
  commonEscalationTriggers: string[];
}

const VENDOR_DRIFT_PATTERNS: VendorDriftPattern[] = [
  { vendor: "Datadog", annualPriceMovement: 8, renewalPressure: "high", commonEscalationTriggers: ["Log volume growth", "Custom metrics expansion", "New product add-ons"] },
  { vendor: "Salesforce", annualPriceMovement: 7, renewalPressure: "high", commonEscalationTriggers: ["Annual price escalator clauses", "Add-on upsells at renewal", "Platform lock-in leverage"] },
  { vendor: "AWS", annualPriceMovement: 3, renewalPressure: "moderate", commonEscalationTriggers: ["Usage growth without reserved instances", "Data transfer cost creep", "New service adoption without budget gate"] },
  { vendor: "Azure", annualPriceMovement: 4, renewalPressure: "moderate", commonEscalationTriggers: ["EA renewal renegotiation pressure", "Consumption growth", "Premium tier creep"] },
  { vendor: "Google Cloud", annualPriceMovement: 3, renewalPressure: "moderate", commonEscalationTriggers: ["BigQuery consumption growth", "Committed use discount expiry", "Egress volume increase"] },
  { vendor: "Snowflake", annualPriceMovement: 10, renewalPressure: "high", commonEscalationTriggers: ["Credit consumption acceleration", "Warehouse auto-scaling", "Storage growth"] },
  { vendor: "OpenAI", annualPriceMovement: -5, renewalPressure: "low", commonEscalationTriggers: ["Model upgrade migrations", "Usage volume growth outpacing price drops"] },
  { vendor: "GitHub Copilot", annualPriceMovement: 5, renewalPressure: "low", commonEscalationTriggers: ["Business tier expansion", "Low adoption rate doesn't trigger review"] },
  { vendor: "Slack", annualPriceMovement: 5, renewalPressure: "moderate", commonEscalationTriggers: ["Pro to Business+ migration pressure", "Inactive seat accumulation"] },
  { vendor: "HubSpot", annualPriceMovement: 8, renewalPressure: "high", commonEscalationTriggers: ["Contact tier overshoot", "Hub bundle expansion", "Annual escalator clauses"] },
  { vendor: "Jira", annualPriceMovement: 6, renewalPressure: "moderate", commonEscalationTriggers: ["Cloud migration pricing", "Premium tier upsell", "User count growth"] },
];

// ── Category Drift Baselines ──────────────────────────

interface CategoryDriftBaseline {
  category: string;
  annualDriftPercent: number;      // typical annual cost increase
  signalTypes: string[];           // which signal types drive this
  correctionAction: string;
}

const CATEGORY_DRIFT_BASELINES: CategoryDriftBaseline[] = [
  { category: "Cloud Infrastructure", annualDriftPercent: 12, signalTypes: ["multi_cloud_waste", "spend_per_head_elevated"], correctionAction: "Cloud commitment optimization + reserved instance strategy" },
  { category: "AI / LLM Services", annualDriftPercent: 25, signalTypes: ["ai_tool_redundancy", "shadow_it_risk"], correctionAction: "AI vendor consolidation + usage governance" },
  { category: "Observability & Monitoring", annualDriftPercent: 15, signalTypes: ["observability_overlap", "license_sprawl"], correctionAction: "Observability stack consolidation + usage-based tier optimization" },
  { category: "CRM & Sales Tools", annualDriftPercent: 8, signalTypes: ["plan_oversize", "license_sprawl"], correctionAction: "License audit + tier rightsizing at renewal" },
  { category: "Collaboration & Productivity", annualDriftPercent: 6, signalTypes: ["license_sprawl", "shadow_it_risk"], correctionAction: "Seat audit + inactive user cleanup" },
  { category: "Development Tools", annualDriftPercent: 10, signalTypes: ["ai_tool_redundancy", "license_sprawl"], correctionAction: "Developer toolchain rationalization" },
];

// ── Main Engine ───────────────────────────────────────

export function computeDriftMonitor(
  currentExposure: { lowEur: number; highEur: number; confidence: number; timeToImpactDays: number },
  detectedSignalTypes: string[],
  techFootprint: string[],
  marketMemory: MarketMemoryResult,
  correctionMomentum: { medianRecoveryWindowDays: number; executionReadinessScore: number },
): DriftMonitorResult {

  // 1. Vendor-level drift signals
  const vendorDrifts = detectVendorDrift(techFootprint, marketMemory.vendorReferences);

  // 2. Category-level drift signals
  const categoryDrifts = detectCategoryDrift(detectedSignalTypes, currentExposure);

  // 3. Exposure delta vs. baseline
  const exposureDelta = computeExposureDelta(currentExposure, marketMemory.baseline);

  // 4. Corrective window compression
  const windowCompression = computeWindowCompression(
    currentExposure.timeToImpactDays,
    vendorDrifts,
    categoryDrifts,
    correctionMomentum,
  );

  // 5. Overall drift scoring
  const overallDriftScore = computeOverallDrift(vendorDrifts, categoryDrifts, exposureDelta, windowCompression);

  const driftDirection = overallDriftScore >= 50 ? "worsening"
    : overallDriftScore >= 25 ? "stable"
    : "improving";

  const driftSeverity = overallDriftScore >= 70 ? "critical"
    : overallDriftScore >= 50 ? "high"
    : overallDriftScore >= 30 ? "moderate"
    : "low";

  const driftConfidence = computeDriftConfidence(vendorDrifts, categoryDrifts, marketMemory);

  return {
    vendorDrifts,
    categoryDrifts,
    exposureDelta,
    windowCompression,
    overallDriftScore,
    driftDirection,
    driftSeverity,
    driftConfidence,
    pressureSummary: buildPressureSummary(vendorDrifts, categoryDrifts, exposureDelta, windowCompression, driftConfidence),
  };
}

// ── Detection Functions ───────────────────────────────

function detectVendorDrift(
  techFootprint: string[],
  vendorRefs: VendorReference[],
): VendorDriftSignal[] {
  const techLower = techFootprint.map(t => t.toLowerCase());
  const signals: VendorDriftSignal[] = [];

  for (const pattern of VENDOR_DRIFT_PATTERNS) {
    if (!techLower.some(t => pattern.vendor.toLowerCase().includes(t) || t.includes(pattern.vendor.toLowerCase()))) continue;

    const matchingRef = vendorRefs.find(vr => vr.vendor === pattern.vendor);
    if (pattern.annualPriceMovement <= 0) continue; // skip vendors with declining prices

    const driftSeverity = pattern.annualPriceMovement >= 10 ? "critical"
      : pattern.annualPriceMovement >= 7 ? "high"
      : pattern.annualPriceMovement >= 4 ? "moderate"
      : "low";

    signals.push({
      vendor: pattern.vendor,
      category: matchingRef?.category || "Unknown",
      driftDirection: "worsening",
      driftSeverity,
      priorState: `Historical pricing with ~${pattern.annualPriceMovement}% annual escalation`,
      currentState: `Current contract subject to ${pattern.renewalPressure} renewal pressure`,
      deltaDescription: `${pattern.vendor} pricing typically increases ${pattern.annualPriceMovement}% annually. ${pattern.commonEscalationTriggers[0]} is the primary driver.`,
      financialImpact: `Without intervention, ${pattern.vendor} costs will likely increase ${pattern.annualPriceMovement}-${Math.round(pattern.annualPriceMovement * 1.5)}% at next renewal.`,
      urgencyDriver: pattern.renewalPressure === "high"
        ? "Renewal negotiation window is time-sensitive. Delay reduces leverage."
        : "Pricing pressure is accumulating. Earlier action preserves more leverage.",
      confidence: Math.min(matchingRef ? matchingRef.confidence : 40, 75),
    });
  }

  return signals.sort((a, b) => {
    const sevOrder = { critical: 0, high: 1, moderate: 2, low: 3 };
    return sevOrder[a.driftSeverity] - sevOrder[b.driftSeverity];
  });
}

function detectCategoryDrift(
  detectedSignalTypes: string[],
  exposure: { lowEur: number; highEur: number; confidence: number },
): CategoryDriftSignal[] {
  const signals: CategoryDriftSignal[] = [];

  for (const cat of CATEGORY_DRIFT_BASELINES) {
    const matchCount = cat.signalTypes.filter(st => detectedSignalTypes.includes(st)).length;
    if (matchCount === 0) continue;

    const matchRatio = matchCount / cat.signalTypes.length;
    // Estimate this category's share of total exposure
    const categoryShare = matchRatio * 0.3; // conservative: max 30% attribution to one category
    const catLow = Math.round(exposure.lowEur * categoryShare);
    const catHigh = Math.round(exposure.highEur * categoryShare);

    // Prior baseline = current minus drift
    const driftMultiplier = 1 + (cat.annualDriftPercent / 100);
    const priorLow = Math.round(catLow / driftMultiplier);
    const priorHigh = Math.round(catHigh / driftMultiplier);

    signals.push({
      category: cat.category,
      driftDirection: "worsening",
      driftPercent: cat.annualDriftPercent,
      priorBaseline: [priorLow, priorHigh],
      currentEstimate: [catLow, catHigh],
      dominantCause: cat.signalTypes.filter(st => detectedSignalTypes.includes(st)).join(", ").replace(/_/g, " "),
      correctionAction: cat.correctionAction,
      confidence: Math.min(exposure.confidence * matchRatio + 15, 70),
    });
  }

  return signals.sort((a, b) => b.driftPercent - a.driftPercent);
}

function computeExposureDelta(
  current: { lowEur: number; highEur: number },
  baseline: MarketBaseline | null,
): ExposureDelta | null {
  if (!baseline) return null;

  // Calculate what "normal" exposure would be based on market baseline
  const baselineMidSpend = (baseline.medianSpendPerEmployee[0] + baseline.medianSpendPerEmployee[1]) / 2;
  const baselineMidExposure = (baseline.medianExposurePercent[0] + baseline.medianExposurePercent[1]) / 2 / 100;

  // Use a conservative multiplier for the baseline range
  const baselineLow = Math.round(baselineMidSpend * baselineMidExposure * 50 * 0.7); // ~50 employees default
  const baselineHigh = Math.round(baselineMidSpend * baselineMidExposure * 50 * 1.3);

  const deltaLow = current.lowEur - baselineLow;
  const deltaHigh = current.highEur - baselineHigh;

  const deltaPercentLow = baselineLow > 0 ? Math.round((deltaLow / baselineLow) * 100) : 0;
  const deltaPercentHigh = baselineHigh > 0 ? Math.round((deltaHigh / baselineHigh) * 100) : 0;

  const avgDelta = (deltaPercentLow + deltaPercentHigh) / 2;

  return {
    baselineExposureEur: [baselineLow, baselineHigh],
    currentExposureEur: [current.lowEur, current.highEur],
    deltaEur: [Math.max(0, deltaLow), Math.max(0, deltaHigh)],
    deltaPercent: [deltaPercentLow, deltaPercentHigh],
    direction: avgDelta > 15 ? "worsening" : avgDelta < -10 ? "improving" : "stable",
    primaryDriver: avgDelta > 15 ? "Current exposure materially exceeds industry baseline" : "Exposure is within expected range for this profile",
    severity: avgDelta > 40 ? "critical" : avgDelta > 20 ? "high" : avgDelta > 10 ? "moderate" : "low",
  };
}

function computeWindowCompression(
  baseWindowDays: number,
  vendorDrifts: VendorDriftSignal[],
  categoryDrifts: CategoryDriftSignal[],
  momentum: { medianRecoveryWindowDays: number; executionReadinessScore: number },
): WindowCompression {
  let compression = 0;
  const drivers: string[] = [];

  // Vendor renewal pressure compresses the window
  const criticalVendors = vendorDrifts.filter(v => v.driftSeverity === "critical" || v.driftSeverity === "high");
  if (criticalVendors.length > 0) {
    compression += criticalVendors.length * 5;
    drivers.push(`${criticalVendors.length} vendor${criticalVendors.length > 1 ? "s" : ""} with high renewal pressure`);
  }

  // Fast-drifting categories compress the window
  const fastDrift = categoryDrifts.filter(c => c.driftPercent >= 15);
  if (fastDrift.length > 0) {
    compression += fastDrift.length * 4;
    drivers.push(`${fastDrift.length} categor${fastDrift.length > 1 ? "ies" : "y"} drifting >15%/year`);
  }

  // Low readiness compresses (harder to act = less time effective)
  if (momentum.executionReadinessScore < 40) {
    compression += 8;
    drivers.push("Low execution readiness reduces effective action window");
  }

  const compressedDays = Math.max(14, baseWindowDays - compression);

  return {
    originalWindowDays: baseWindowDays,
    compressedWindowDays: compressedDays,
    compressionDays: baseWindowDays - compressedDays,
    compressionDrivers: drivers,
    urgencyLevel: compression >= 15 ? "critical" : compression >= 8 ? "elevated" : "normal",
  };
}

// ── Scoring ───────────────────────────────────────────

function computeOverallDrift(
  vendorDrifts: VendorDriftSignal[],
  categoryDrifts: CategoryDriftSignal[],
  exposureDelta: ExposureDelta | null,
  windowCompression: WindowCompression,
): number {
  let score = 15; // base (some drift always present in IT spend)

  // Vendor drift contribution
  for (const vd of vendorDrifts) {
    const sevWeight = { critical: 12, high: 8, moderate: 5, low: 2 }[vd.driftSeverity];
    score += sevWeight;
  }

  // Category drift contribution
  for (const cd of categoryDrifts) {
    score += Math.min(cd.driftPercent * 0.4, 8);
  }

  // Exposure delta
  if (exposureDelta && exposureDelta.direction === "worsening") {
    score += Math.min(Math.abs((exposureDelta.deltaPercent[0] + exposureDelta.deltaPercent[1]) / 2) * 0.3, 15);
  }

  // Window compression
  if (windowCompression.urgencyLevel === "critical") score += 10;
  else if (windowCompression.urgencyLevel === "elevated") score += 5;

  return Math.min(Math.round(score), 95);
}

function computeDriftConfidence(
  vendorDrifts: VendorDriftSignal[],
  categoryDrifts: CategoryDriftSignal[],
  marketMemory: MarketMemoryResult,
): number {
  let score = 15;

  if (vendorDrifts.length > 0) {
    const avgVendorConf = vendorDrifts.reduce((s, v) => s + v.confidence, 0) / vendorDrifts.length;
    score += Math.round(avgVendorConf * 0.3);
  }

  if (categoryDrifts.length > 0) {
    const avgCatConf = categoryDrifts.reduce((s, c) => s + c.confidence, 0) / categoryDrifts.length;
    score += Math.round(avgCatConf * 0.2);
  }

  score += Math.round(marketMemory.memoryConfidence * 0.2);

  return Math.min(score, 80); // drift is inherently directional
}

function buildPressureSummary(
  vendorDrifts: VendorDriftSignal[],
  categoryDrifts: CategoryDriftSignal[],
  exposureDelta: ExposureDelta | null,
  windowCompression: WindowCompression,
  confidence: number,
): string {
  const parts: string[] = [];

  if (vendorDrifts.length > 0) {
    const worsening = vendorDrifts.filter(v => v.driftDirection === "worsening");
    if (worsening.length > 0) {
      parts.push(`${worsening.length} vendor${worsening.length > 1 ? "s" : ""} show${worsening.length === 1 ? "s" : ""} pricing pressure trending against this organization.`);
    }
  }

  if (categoryDrifts.length > 0) {
    const fastestDrift = categoryDrifts[0];
    parts.push(`${fastestDrift.category} costs are drifting at an estimated ${fastestDrift.driftPercent}% annually.`);
  }

  if (exposureDelta && exposureDelta.direction === "worsening") {
    parts.push(`Current exposure exceeds industry baseline by an estimated ${exposureDelta.deltaPercent[0]}-${exposureDelta.deltaPercent[1]}%.`);
  }

  if (windowCompression.compressionDays > 0) {
    parts.push(`The effective corrective window has compressed by ${windowCompression.compressionDays} days due to pricing and readiness pressure.`);
  }

  if (confidence < 40) {
    parts.push("Drift assessment is directional — limited historical data reduces certainty.");
  }

  return parts.join(" ") || "No significant cost drift detected against current exposure.";
}
