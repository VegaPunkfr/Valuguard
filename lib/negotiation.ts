/**
 * GHOST TAX — NEGOTIATION INTELLIGENCE ENGINE (SERVER-ONLY)
 *
 * Converts proof + benchmark + drift + scenario analysis into
 * structured leverage outputs.
 *
 * This engine produces:
 *   1. Negotiation readiness assessment
 *   2. Leverage point extraction (vendor-specific)
 *   3. Vendor pressure framing (what to say, why it works)
 *   4. Economic argument generation (EUR-grounded)
 *   5. Renewal pressure framing (timing-aware)
 *   6. Negotiation playbook preview (structured, not generic)
 *
 * This engine does NOT:
 *   - Produce fluffy sales copy
 *   - Generate generic procurement templates
 *   - Hallucinate exact market pricing without evidence
 *   - Act like a legal contract AI
 *
 * Every output is:
 *   - Financially grounded
 *   - Evidence-based
 *   - Confidence-aware
 *   - Operational
 */

import type { VendorReference, MarketMemoryResult } from "@/lib/market";
import type { VendorDriftSignal, DriftMonitorResult } from "@/lib/drift";

// ── Types ─────────────────────────────────────────────

export interface LeveragePoint {
  vendor: string;
  leverageType: "pricing" | "competitive" | "usage" | "contract" | "consolidation";
  strength: "strong" | "moderate" | "directional";
  argument: string;           // the actual argument to make
  evidenceBasis: string;      // what supports this argument
  expectedOutcome: string;    // realistic outcome range
  confidence: number;         // 0-100
}

export interface VendorPressureFrame {
  vendor: string;
  pressureAngle: string;     // the framing to use
  benchmarkSupport: string;  // what benchmark data backs it
  driftSupport: string;      // what drift data backs it
  urgencyFrame: string;      // why act now
  suggestedAction: string;   // what to do next
}

export interface EconomicArgument {
  argumentType: "exposure_reduction" | "cost_avoidance" | "efficiency_gain" | "risk_mitigation";
  headline: string;
  eurImpact: [number, number]; // annual EUR range
  timeframe: string;
  supportStrength: "strong" | "moderate" | "directional";
  internalAudience: string;  // who this argument works best on
}

export interface NegotiationPlaybook {
  vendor: string;
  readinessScore: number;          // 0-100
  leveragePoints: LeveragePoint[];
  pressureFrame: VendorPressureFrame;
  economicArguments: EconomicArgument[];
  renewalTiming: string;
  suggestedApproach: "aggressive" | "measured" | "exploratory";
  playBookPreview: string[];       // key steps (3-5)
}

export interface NegotiationReadiness {
  overallReadiness: number;         // 0-100
  readinessGrade: "ready" | "near-ready" | "preparation-needed" | "insufficient";
  strongestLeverage: string;
  weakestArea: string;
  criticalGap: string | null;
}

export interface NegotiationIntelligenceResult {
  readiness: NegotiationReadiness;
  leveragePoints: LeveragePoint[];
  vendorPlaybooks: NegotiationPlaybook[];
  topEconomicArguments: EconomicArgument[];
  negotiationConfidence: number;     // 0-100
  internalMemoFrame: string;         // one-paragraph internal decision memo
  summary: string;
}

// ── Main Engine ───────────────────────────────────────

export function buildNegotiationIntelligence(
  exposure: { lowEur: number; highEur: number; confidence: number },
  _detectedSignalTypes: string[],
  _techFootprint: string[],
  marketMemory: MarketMemoryResult,
  driftMonitor: DriftMonitorResult,
  peerComparison: { efficiencyPercentile: number | null; benchmarkConfidence: number; insufficientBenchmark: boolean },
  correctionMomentum: { medianRecoveryWindowDays: number; executionReadinessScore: number; expectedPaybackMonths: number },
  scenarios: { base: { annualSavingsEur: [number, number] } },
): NegotiationIntelligenceResult {

  // 1. Extract leverage points
  const leveragePoints = extractLeveragePoints(
    marketMemory.vendorReferences, driftMonitor.vendorDrifts, exposure, peerComparison,
  );

  // 2. Build vendor-specific playbooks
  const vendorPlaybooks = buildVendorPlaybooks(
    leveragePoints, driftMonitor.vendorDrifts, marketMemory.vendorReferences, exposure,
  );

  // 3. Generate economic arguments
  const topEconomicArguments = generateEconomicArguments(
    exposure, scenarios, peerComparison, driftMonitor, correctionMomentum,
  );

  // 4. Assess negotiation readiness
  const readiness = assessReadiness(
    leveragePoints, exposure, peerComparison, driftMonitor, correctionMomentum,
  );

  // 5. Confidence
  const negotiationConfidence = computeNegotiationConfidence(
    leveragePoints, marketMemory, driftMonitor, peerComparison,
  );

  // 6. Internal memo frame
  const internalMemoFrame = buildInternalMemoFrame(
    readiness, leveragePoints, topEconomicArguments, exposure, negotiationConfidence,
  );

  return {
    readiness,
    leveragePoints,
    vendorPlaybooks,
    topEconomicArguments,
    negotiationConfidence,
    internalMemoFrame,
    summary: buildNegotiationSummary(readiness, leveragePoints, vendorPlaybooks, negotiationConfidence),
  };
}

// ── Leverage Extraction ───────────────────────────────

function extractLeveragePoints(
  vendorRefs: VendorReference[],
  vendorDrifts: VendorDriftSignal[],
  exposure: { lowEur: number; highEur: number; confidence: number },
  peerComparison: { efficiencyPercentile: number | null; benchmarkConfidence: number; insufficientBenchmark: boolean },
): LeveragePoint[] {
  const points: LeveragePoint[] = [];

  // Vendor-specific leverage from drift
  for (const drift of vendorDrifts) {
    if (drift.driftDirection !== "worsening") continue;

    const ref = vendorRefs.find(vr => vr.vendor === drift.vendor);
    const leverageType = ref?.negotiationLeverage === "high" ? "competitive" : "pricing";

    points.push({
      vendor: drift.vendor,
      leverageType,
      strength: drift.driftSeverity === "critical" || drift.driftSeverity === "high" ? "strong" : "moderate",
      argument: `${drift.vendor} pricing is trending ${drift.driftSeverity === "critical" ? "aggressively" : "materially"} against your organization. ${drift.financialImpact}`,
      evidenceBasis: drift.deltaDescription,
      expectedOutcome: ref?.negotiationLeverage === "high"
        ? `Competitive alternatives exist. Renegotiation could yield 10-25% reduction.`
        : `Tier rightsizing and renewal timing optimization could yield 5-15% reduction.`,
      confidence: drift.confidence,
    });
  }

  // Consolidation leverage (when multiple vendors in same category)
  const vendorsByCategory = new Map<string, VendorReference[]>();
  for (const ref of vendorRefs) {
    const list = vendorsByCategory.get(ref.category) || [];
    list.push(ref);
    vendorsByCategory.set(ref.category, list);
  }

  for (const [category, vendors] of vendorsByCategory) {
    if (vendors.length < 2) continue;
    const names = vendors.map(v => v.vendor).join(", ");
    points.push({
      vendor: names,
      leverageType: "consolidation",
      strength: vendors.length >= 3 ? "strong" : "moderate",
      argument: `Multiple vendors detected in ${category}: ${names}. Consolidation creates competitive leverage and reduces total cost.`,
      evidenceBasis: `${vendors.length} overlapping vendors in ${category} category`,
      expectedOutcome: `Consolidation to primary vendor + competitive bid could yield 15-30% category reduction.`,
      confidence: Math.min(...vendors.map(v => v.confidence)),
    });
  }

  // Benchmark leverage (when below median)
  if (!peerComparison.insufficientBenchmark && peerComparison.efficiencyPercentile !== null && peerComparison.efficiencyPercentile >= 50) {
    points.push({
      vendor: "All vendors",
      leverageType: "pricing",
      strength: peerComparison.benchmarkConfidence >= 50 ? "strong" : "moderate",
      argument: `Your organization sits at P${peerComparison.efficiencyPercentile} in IT spend efficiency — below the industry median. This creates a defensible position for across-the-board renegotiation.`,
      evidenceBasis: `Peer benchmarking confidence: ${peerComparison.benchmarkConfidence}/100`,
      expectedOutcome: `Structured vendor review could close the gap to P50, reducing annual exposure by an estimated ${Math.round(exposure.lowEur * 0.2)}-${Math.round(exposure.highEur * 0.35)} EUR.`,
      confidence: peerComparison.benchmarkConfidence,
    });
  }

  return points.sort((a, b) => {
    const sOrder = { strong: 0, moderate: 1, directional: 2 };
    return sOrder[a.strength] - sOrder[b.strength];
  });
}

// ── Vendor Playbooks ──────────────────────────────────

function buildVendorPlaybooks(
  leveragePoints: LeveragePoint[],
  vendorDrifts: VendorDriftSignal[],
  vendorRefs: VendorReference[],
  exposure: { lowEur: number; highEur: number },
): NegotiationPlaybook[] {
  // Group leverage points by vendor
  const vendorMap = new Map<string, LeveragePoint[]>();
  for (const lp of leveragePoints) {
    if (lp.leverageType === "consolidation") continue; // handle separately
    const list = vendorMap.get(lp.vendor) || [];
    list.push(lp);
    vendorMap.set(lp.vendor, list);
  }

  const playbooks: NegotiationPlaybook[] = [];

  for (const [vendor, points] of vendorMap) {
    const drift = vendorDrifts.find(vd => vd.vendor === vendor);
    const ref = vendorRefs.find(vr => vr.vendor === vendor);

    const pressureFrame: VendorPressureFrame = {
      vendor,
      pressureAngle: drift
        ? `${vendor} pricing has been trending against your organization. ${drift.deltaDescription}`
        : `${vendor} represents a significant cost center with optimization potential.`,
      benchmarkSupport: ref
        ? `Market reference: ${ref.typicalPriceRange[0]}-${ref.typicalPriceRange[1]} EUR/${ref.pricingModel}. ${ref.commonOverspendPatterns[0]} is the most common overspend pattern.`
        : "Limited market reference data available for this vendor.",
      driftSupport: drift
        ? `Annual pricing movement: ~${drift.deltaDescription}`
        : "No specific drift data available.",
      urgencyFrame: drift?.urgencyDriver || "Proactive renegotiation preserves more leverage than reactive renewal.",
      suggestedAction: ref?.negotiationLeverage === "high"
        ? "Initiate competitive evaluation before renewal window."
        : "Request pricing review and tier optimization meeting.",
    };

    // Estimate this vendor's share of exposure
    const vendorExposureShare = 0.15; // conservative 15% default
    const vendorEurLow = Math.round(exposure.lowEur * vendorExposureShare);
    const vendorEurHigh = Math.round(exposure.highEur * vendorExposureShare);

    const economicArgs: EconomicArgument[] = [{
      argumentType: "cost_avoidance",
      headline: `${vendor} cost optimization opportunity`,
      eurImpact: [Math.round(vendorEurLow * 0.15), Math.round(vendorEurHigh * 0.25)],
      timeframe: "Annual, recurring",
      supportStrength: points[0]?.strength || "directional",
      internalAudience: "CFO / Procurement",
    }];

    const readinessScore = Math.round(
      (points.reduce((s, p) => s + p.confidence, 0) / Math.max(points.length, 1)) * 0.7 +
      (drift ? 15 : 0) +
      (ref?.negotiationLeverage === "high" ? 10 : 5)
    );

    const suggestedApproach = readinessScore >= 60 ? "aggressive"
      : readinessScore >= 35 ? "measured"
      : "exploratory";

    playbooks.push({
      vendor,
      readinessScore: Math.min(readinessScore, 85),
      leveragePoints: points,
      pressureFrame,
      economicArguments: economicArgs,
      renewalTiming: drift?.urgencyDriver || "Review before next renewal cycle",
      suggestedApproach,
      playBookPreview: buildPlaybookSteps(vendor, suggestedApproach, ref),
    });
  }

  return playbooks.sort((a, b) => b.readinessScore - a.readinessScore);
}

function buildPlaybookSteps(vendor: string, approach: "aggressive" | "measured" | "exploratory", ref: VendorReference | undefined): string[] {
  if (approach === "aggressive") {
    return [
      `Audit current ${vendor} usage, seats, and tier alignment`,
      `Research competitive alternatives and obtain reference pricing`,
      `Present cost analysis with competitive alternatives to ${vendor} account team`,
      `Negotiate multi-year commitment in exchange for rate reduction`,
      `Set quarterly review cadence to prevent drift recurrence`,
    ];
  }
  if (approach === "measured") {
    return [
      `Review ${vendor} contract terms, renewal date, and escalation clauses`,
      `Identify unused features, seats, or tiers eligible for downgrade`,
      `Request pricing review meeting with ${vendor} account representative`,
      `Align internal stakeholders on acceptable outcome range`,
    ];
  }
  return [
    `Inventory current ${vendor} usage and total cost of ownership`,
    `Compare against ${ref?.category || "category"} market references`,
    `Determine if renegotiation is warranted before next renewal`,
  ];
}

// ── Economic Arguments ────────────────────────────────

function generateEconomicArguments(
  exposure: { lowEur: number; highEur: number; confidence: number },
  scenarios: { base: { annualSavingsEur: [number, number] } },
  peerComparison: { efficiencyPercentile: number | null; insufficientBenchmark: boolean },
  driftMonitor: DriftMonitorResult,
  momentum: { medianRecoveryWindowDays: number; expectedPaybackMonths: number },
): EconomicArgument[] {
  const args: EconomicArgument[] = [];

  // Core exposure reduction argument
  args.push({
    argumentType: "exposure_reduction",
    headline: "Annual IT cost exposure reduction through structured optimization",
    eurImpact: scenarios.base.annualSavingsEur,
    timeframe: `Recoverable within ${momentum.medianRecoveryWindowDays} days, payback in ${momentum.expectedPaybackMonths} months`,
    supportStrength: exposure.confidence >= 60 ? "strong" : exposure.confidence >= 35 ? "moderate" : "directional",
    internalAudience: "CFO / Finance",
  });

  // Drift cost avoidance
  if (driftMonitor.driftDirection === "worsening" && driftMonitor.categoryDrifts.length > 0) {
    const totalDriftLow = driftMonitor.categoryDrifts.reduce((s, c) => s + (c.currentEstimate[0] - c.priorBaseline[0]), 0);
    const totalDriftHigh = driftMonitor.categoryDrifts.reduce((s, c) => s + (c.currentEstimate[1] - c.priorBaseline[1]), 0);
    args.push({
      argumentType: "cost_avoidance",
      headline: "Cost drift prevention — stop worsening conditions before next renewal cycle",
      eurImpact: [Math.max(0, totalDriftLow), Math.max(0, totalDriftHigh)],
      timeframe: "Annualized, compounding if unaddressed",
      supportStrength: driftMonitor.driftConfidence >= 50 ? "moderate" : "directional",
      internalAudience: "CFO / Procurement",
    });
  }

  // Peer efficiency gap
  if (!peerComparison.insufficientBenchmark && peerComparison.efficiencyPercentile !== null && peerComparison.efficiencyPercentile >= 50) {
    const gapPercent = (peerComparison.efficiencyPercentile - 50) / 100;
    args.push({
      argumentType: "efficiency_gain",
      headline: `Close the efficiency gap to industry median (currently P${peerComparison.efficiencyPercentile})`,
      eurImpact: [Math.round(exposure.lowEur * gapPercent), Math.round(exposure.highEur * gapPercent)],
      timeframe: "12-18 months phased implementation",
      supportStrength: "moderate",
      internalAudience: "CIO / CFO",
    });
  }

  return args;
}

// ── Readiness Assessment ──────────────────────────────

function assessReadiness(
  leveragePoints: LeveragePoint[],
  exposure: { lowEur: number; highEur: number; confidence: number },
  peerComparison: { efficiencyPercentile: number | null; benchmarkConfidence: number; insufficientBenchmark: boolean },
  driftMonitor: DriftMonitorResult,
  momentum: { executionReadinessScore: number },
): NegotiationReadiness {
  let score = 10; // base

  // Leverage availability
  const strongPoints = leveragePoints.filter(lp => lp.strength === "strong");
  score += Math.min(strongPoints.length * 10, 25);
  score += Math.min((leveragePoints.length - strongPoints.length) * 5, 15);

  // Evidence quality
  if (exposure.confidence >= 50) score += 10;
  if (!peerComparison.insufficientBenchmark) score += 8;
  if (driftMonitor.driftDirection === "worsening") score += 7;

  // Execution readiness
  score += Math.round(momentum.executionReadinessScore * 0.15);

  score = Math.min(score, 90);

  const grade = score >= 65 ? "ready"
    : score >= 45 ? "near-ready"
    : score >= 25 ? "preparation-needed"
    : "insufficient";

  // Identify strongest and weakest
  const strongest = strongPoints.length > 0
    ? `${strongPoints[0].vendor} — ${strongPoints[0].leverageType} leverage`
    : leveragePoints.length > 0
    ? `${leveragePoints[0].vendor} — ${leveragePoints[0].leverageType} leverage`
    : "No strong leverage identified";

  const weakest = peerComparison.insufficientBenchmark
    ? "Benchmark data insufficient — reduces negotiation defensibility"
    : exposure.confidence < 35
    ? "Exposure confidence too low for strong economic arguments"
    : driftMonitor.driftConfidence < 30
    ? "Limited drift data reduces urgency framing"
    : "All areas at acceptable levels";

  const criticalGap = score < 25
    ? "Insufficient evidence to support structured negotiation. More data collection required."
    : null;

  return {
    overallReadiness: score,
    readinessGrade: grade,
    strongestLeverage: strongest,
    weakestArea: weakest,
    criticalGap,
  };
}

// ── Confidence ────────────────────────────────────────

function computeNegotiationConfidence(
  leveragePoints: LeveragePoint[],
  marketMemory: MarketMemoryResult,
  driftMonitor: DriftMonitorResult,
  peerComparison: { benchmarkConfidence: number },
): number {
  let score = 10;

  if (leveragePoints.length > 0) {
    const avgLevConf = leveragePoints.reduce((s, lp) => s + lp.confidence, 0) / leveragePoints.length;
    score += Math.round(avgLevConf * 0.3);
  }

  score += Math.round(marketMemory.memoryConfidence * 0.2);
  score += Math.round(driftMonitor.driftConfidence * 0.15);
  score += Math.round(peerComparison.benchmarkConfidence * 0.15);

  return Math.min(score, 80); // negotiation confidence inherently capped
}

// ── Narrative Builders ────────────────────────────────

function buildInternalMemoFrame(
  readiness: NegotiationReadiness,
  leveragePoints: LeveragePoint[],
  economicArgs: EconomicArgument[],
  exposure: { lowEur: number; highEur: number },
  confidence: number,
): string {
  const parts: string[] = [];

  if (readiness.readinessGrade === "ready" || readiness.readinessGrade === "near-ready") {
    parts.push(`This organization has ${readiness.readinessGrade === "ready" ? "actionable" : "developing"} negotiation leverage.`);
  } else {
    parts.push("Negotiation leverage is limited and requires further evidence collection.");
  }

  if (leveragePoints.length > 0) {
    const strongest = leveragePoints[0];
    parts.push(`Strongest leverage: ${strongest.argument}`);
  }

  if (economicArgs.length > 0) {
    const primary = economicArgs[0];
    parts.push(`Primary economic argument: ${primary.headline} — estimated ${fmtEur(primary.eurImpact[0])}-${fmtEur(primary.eurImpact[1])} EUR/year impact.`);
  }

  parts.push(`Current annual exposure range: ${fmtEur(exposure.lowEur)}-${fmtEur(exposure.highEur)} EUR.`);

  if (confidence < 40) {
    parts.push("Note: Negotiation intelligence confidence is directional. Deeper vendor-level data would strengthen these conclusions.");
  }

  return parts.join(" ");
}

function buildNegotiationSummary(
  readiness: NegotiationReadiness,
  leveragePoints: LeveragePoint[],
  playbooks: NegotiationPlaybook[],
  confidence: number,
): string {
  const parts: string[] = [];

  parts.push(`Negotiation readiness: ${readiness.readinessGrade} (${readiness.overallReadiness}/100).`);

  if (leveragePoints.length > 0) {
    parts.push(`${leveragePoints.length} leverage point${leveragePoints.length > 1 ? "s" : ""} identified.`);
    const strong = leveragePoints.filter(lp => lp.strength === "strong");
    if (strong.length > 0) {
      parts.push(`${strong.length} rated strong.`);
    }
  }

  if (playbooks.length > 0) {
    parts.push(`${playbooks.length} vendor-specific playbook${playbooks.length > 1 ? "s" : ""} generated.`);
  }

  if (confidence < 40) {
    parts.push("Assessment is directional — limited vendor-level data.");
  }

  return parts.join(" ");
}

function fmtEur(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 10_000) return Math.round(n / 1000) + "k";
  return Math.round(n).toLocaleString("fr-FR");
}
