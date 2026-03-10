/**
 * GHOST TAX — DECISION INTELLIGENCE ENGINE (SERVER-ONLY)
 *
 * Central decision module. Fuses:
 *   1. Exa enrichment (public signals)
 *   2. Vector memory (historical patterns, peer data)
 *   3. Ghost Tax heuristic model (entropy, kappa, exposure calc)
 *
 * Output contract — Autonomous Buyer Decision Room (Decision Acceleration):
 *   1. Diagnosis (one-liner + expanded)
 *   2. Exposure (EUR range, numeric confidence 0-100, benchmark quality)
 *   3. Loss Velocity (temporal leakage: daily/weekly/monthly/yearly)
 *   4. Peer Comparison (benchmark position, percentile, category medians)
 *   5. Proof (observed / inferred / estimated signal separation)
 *   6. Correction Momentum (recovery window, payback, readiness score)
 *   7. Decision Pressure Score (composite urgency 0-100)
 *   8. Scenarios (conservative / base / aggressive with owners & actions)
 *   9. Decision Pack (CFO memo, CIO/Ops memo, procurement summary, board slide)
 *
 * Confidence discipline:
 *   - Never fake precision when evidence is weak
 *   - Always output ranges, not point estimates
 *   - Numeric confidence 0-100, never string-only
 *   - Separate observed from inferred from estimated
 *   - Refuse the illusion of certainty
 */

import { enrichCompany, type EnrichmentResult } from "@/lib/exa";
import {
  findSimilarCompanies,
  findSimilarLeakPatterns,
  findRemediationProtocols,
  storeVectors,
  type SimilarityResult,
  type VectorEntry,
} from "@/lib/vectors";
import { buildMarketMemory, type MarketMemoryResult } from "@/lib/market";
import { computeDriftMonitor, type DriftMonitorResult } from "@/lib/drift";
import { buildNegotiationIntelligence, type NegotiationIntelligenceResult } from "@/lib/negotiation";

// ── Input ─────────────────────────────────────────────

export interface CompanyContext {
  domain: string;
  name?: string;
  industry?: string;
  headcount?: number;
  monthlySpendEur?: number;
  saasToolCount?: number;
}

// ── Output — Decision Room Contract ───────────────────

export interface ProofSignal {
  type: string;
  label: string;
  description: string;
  impactEurRange: [number, number] | null;
  severity: "critical" | "high" | "medium" | "low";
  evidence: string[];
}

export interface ScenarioAction {
  title: string;
  owner: string;
  effort: "trivial" | "easy" | "moderate" | "significant";
  savingsEurRange: [number, number] | null;
}

export interface Scenario {
  label: string;
  annualSavingsEur: [number, number];
  owners: string[];
  actions: ScenarioAction[];
  paybackMonths: number;
  disruption: "none" | "low" | "moderate" | "high";
}

export interface LossVelocity {
  yearlyLossEur: [number, number];
  monthlyLossEur: [number, number];
  weeklyLossEur: [number, number];
  dailyLossEur: [number, number];
  confidence: number; // 0-100, inherited from exposure
  softened: boolean; // true when confidence < 50
}

export interface PeerComparison {
  efficiencyPercentile: number | null; // null when benchmark insufficient
  categoryMedianExposureEur: number | null;
  categoryTopQuartileExposureEur: number | null;
  benchmarkConfidence: number; // 0-100
  insufficientBenchmark: boolean;
  category: string;
}

export interface CorrectionMomentum {
  medianRecoveryWindowDays: number;
  expectedPaybackMonths: number;
  actionComplexityScore: number; // 0-100, lower = simpler
  executionReadinessScore: number; // 0-100, higher = more ready
  readinessDrivers: string[];
}

// ── Causal Graph ──────────────────────────────────────

export interface CausalNode {
  id: string;
  label: string;
  type: "root" | "mechanism" | "symptom" | "impact";
}

export interface CausalEdge {
  from: string;
  to: string;
  relationship: string;
}

export interface CausalGraph {
  dominantCause: string;
  secondaryCauses: string[];
  propagationChain: string[]; // human-readable chain
  leveragePoints: { lever: string; why: string; signalTypes: string[] }[];
  correctionOrder: { step: number; action: string; rationale: string }[];
  nodes: CausalNode[];
  edges: CausalEdge[];
}

// ── Granular Confidence Model ─────────────────────────

export interface ConfidenceModel {
  signalConfidence: number;      // 0-100: quality of detected signals
  exposureConfidence: number;    // 0-100: how trustworthy is the EUR range
  benchmarkConfidence: number;   // 0-100: peer comparison reliability
  scenarioConfidence: number;    // 0-100: how grounded are the action plans
  causalConfidence: number;      // 0-100: how well-supported is the causal model
  simulationConfidence: number;  // 0-100: how reliable are simulator lever outputs
  overall: number;               // 0-100: weighted composite
  weakestLayer: string;          // which layer is least reliable
  strongestLayer: string;        // which layer is most reliable
  summary: string;               // one-sentence confidence posture
}

// ── Decision Friction / Org Impact ────────────────────

export interface StakeholderImpact {
  role: string;
  impactLevel: "high" | "moderate" | "low";
  reason: string;
  likelyResistance: "high" | "moderate" | "low" | "none";
}

export interface DecisionFriction {
  frictionScore: number;                  // 0-100, higher = harder to execute
  ownershipAmbiguityScore: number;        // 0-100, higher = more ambiguous
  stakeholderMap: StakeholderImpact[];
  implementationBurden: string;           // one-sentence summary
  politicalFrictionSummary: string;       // where resistance sits
  crossFunctionalDependencies: number;    // how many functions must coordinate
}

// ── Proof Engine ─────────────────────────────────────

export interface ProofEngine {
  signalDensity: number;         // 0-100: detected patterns vs known categories
  patternCoverage: number;       // 0-100: breadth across spend/governance/procurement/duplication
  benchmarkConfidence: number;   // 0-100: peer comparison reliability
  evidenceStrength: "strong" | "moderate" | "directional";
  detectionScope: number;        // 0-100: how much of the surface area was scannable
  modelSupportLevel: number;     // 0-100: confidence model has enough signal
  summary: string;
}

// ── Cost of Delay ────────────────────────────────────

export interface CostOfDelay {
  dailyCostOfDelay: [number, number];
  monthlyCostOfDelay: [number, number];
  quarterlyCostOfDelay: [number, number];
  projectedDelayLoss90: [number, number]; // adjusted by correction readiness
  readinessMultiplier: number;            // 0-1, how much readiness affects loss
}

// ── Counterfactual Simulator (server-side precomputation) ──

export interface CorrectionLever {
  id: string;
  label: string;
  description: string;
  applicableSignalTypes: string[];
  exposureReductionEur: [number, number];  // how much this lever removes
  pressureReduction: number;               // how much this reduces pressure (0-30)
  recoveryAccelerationDays: number;        // how many days faster
  confidence: number;                      // 0-100 confidence in this lever's impact
  available: boolean;                      // true if relevant signals were detected
  effortLevel: "low" | "moderate" | "significant"; // implementation effort
}

export interface CounterfactualPrecompute {
  availableLevers: CorrectionLever[];
  baselineExposure: [number, number];
  baselinePressure: number;
  baselineRecoveryDays: number;
}

export interface ExecutiveSnapshot {
  diagnosisSummary: string;
  exposureRangeEur: [number, number];
  ninetyDayRecoverableEur: [number, number];
  recommendedActionPath: string;
  confidenceRange: string;        // e.g. "moderate (42/100)"
  timeToImpactDays: number;
  pressureScore: number;
}

export interface DecisionIntelligence {
  executiveSnapshot: ExecutiveSnapshot;

  companyContext: {
    domain: string;
    name: string;
    industry: string;
    headcount: number | null;
    techFootprint: string[];
    enrichmentSummary: string;
    signalCount: number;
  };

  diagnosis: {
    oneLiner: string;
    expanded: string;
  };

  exposure: {
    lowEur: number;
    highEur: number;
    confidence: number; // 0-100
    confidenceGrade: "high" | "moderate" | "low";
    benchmarkQuality: "strong" | "moderate" | "weak";
    basis: string;
    timeToImpactDays: number;
    ninetyDayRecoverableEur: [number, number];
  };

  lossVelocity: LossVelocity;

  peerComparison: PeerComparison;

  proof: {
    observedSignals: ProofSignal[];
    inferredSignals: ProofSignal[];
    estimatedSignals: ProofSignal[];
    confidenceDrivers: string[];
    methodologySummary: string;
    boundaries: string[];
    freshnessSummary: string;
  };

  correctionMomentum: CorrectionMomentum;

  decisionPressureScore: number; // 0-100

  causalGraph: CausalGraph;
  confidenceModel: ConfidenceModel;
  decisionFriction: DecisionFriction;
  counterfactual: CounterfactualPrecompute;
  proofEngine: ProofEngine;
  costOfDelay: CostOfDelay;
  marketMemory: MarketMemoryResult;
  driftMonitor: DriftMonitorResult;
  negotiationIntelligence: NegotiationIntelligenceResult;

  scenarios: {
    conservative: Scenario;
    base: Scenario;
    aggressive: Scenario;
  };

  decisionPack: {
    cfoMemo: string;
    cioOpsMemo: string;
    procurementSummary: string;
    boardOnePager: string;
    consensusView: {
      strongEvidence: string[];
      directionalEvidence: string[];
      keyUncertainties: string[];
      recommendedAction: string;
      requiresDeeperValidation: string[];
    };
  };

  meta: {
    analysisId: string;
    completedAt: string;
    dataSources: string[];
    overallConfidence: number; // 0-100
    limitations: string[];
  };
}

// ── Main pipeline ─────────────────────────────────────

export async function runDecisionIntelligence(
  input: CompanyContext,
): Promise<DecisionIntelligence> {
  const analysisId = `vg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const dataSources: string[] = [];
  const limitations: string[] = [];

  // ── Step 1: Exa enrichment ──────────────────────────
  const enrichment = await enrichCompany(input.domain);
  if (enrichment.signals.length > 0) {
    dataSources.push("exa_research");
  } else {
    limitations.push("Limited public information available for this domain.");
  }

  // ── Step 2: Vector memory queries (parallel) ────────
  const companyDesc = describeCompany(input, enrichment);
  const leakQuery = `SaaS AI cloud spend leaks ${input.industry || ""} ${enrichment.techMentions.join(" ")} ${input.headcount || 100} employees`;
  const protoQuery = `Cost optimization corrective protocol ${enrichment.techMentions.join(" ")} ${input.industry || "technology"}`;

  const [similarCompanies, leakPatterns, protocols] = await Promise.all([
    findSimilarCompanies(companyDesc),
    findSimilarLeakPatterns(leakQuery),
    findRemediationProtocols(protoQuery),
  ]);

  if (similarCompanies.length > 0 || leakPatterns.length > 0) {
    dataSources.push("vector_memory");
  } else {
    limitations.push("No similar historical cases found in vector memory.");
  }

  dataSources.push("heuristic_engine");

  // ── Step 3: Detect signals ──────────────────────────
  const detectedSignals = detectSignals(input, enrichment, leakPatterns);

  // ── Step 4: Classify signals by evidence tier ───────
  const { observed, inferred, estimated } = classifySignals(detectedSignals);

  // ── Step 5: Build output in decision hierarchy ──────
  const exposure = computeExposure(input, detectedSignals, enrichment);
  const lossVelocity = computeLossVelocity(exposure);
  const peerComparison = computePeerComparison(input, exposure, enrichment);
  const diagnosis = buildDiagnosis(input, detectedSignals, exposure, enrichment);
  const proof = buildProof(observed, inferred, estimated, enrichment, dataSources);
  const scenarios = buildScenarios(detectedSignals, exposure, protocols);
  const correctionMomentum = computeCorrectionMomentum(detectedSignals, scenarios, exposure);

  const overallConfidence = deriveConfidenceScore(
    enrichment.signals.length,
    similarCompanies.length,
    detectedSignals.length,
    !!input.monthlySpendEur,
  );

  if (overallConfidence < 30) {
    limitations.push(
      "Overall confidence is low. Results should be treated as preliminary indicators, not financial commitments.",
    );
  }

  // ── Step 6: Persist for future vector queries ───────
  await persistToMemory(input, enrichment, detectedSignals).catch(() => {});

  const decisionPressureScore = computeDecisionPressure(
    exposure, lossVelocity, peerComparison, correctionMomentum, overallConfidence,
  );

  const causalGraph = buildCausalGraph(detectedSignals);
  const decisionFriction = computeDecisionFriction(detectedSignals, scenarios, correctionMomentum);
  const counterfactual = buildCounterfactual(detectedSignals, exposure, decisionPressureScore, correctionMomentum);
  const confidenceModel = buildConfidenceModel(
    detectedSignals, exposure, peerComparison, scenarios, causalGraph, counterfactual, overallConfidence,
  );

  const proofEngine = buildProofEngine(detectedSignals, exposure, peerComparison, enrichment, confidenceModel);
  const costOfDelay = computeCostOfDelay(lossVelocity, correctionMomentum);

  // ── Step 7: Market Memory, Drift, Negotiation ───────
  const resolvedIndustry = input.industry || inferIndustry(enrichment);
  const signalTypes = detectedSignals.map(s => s.type);

  const marketMemory = await buildMarketMemory(
    resolvedIndustry, input.headcount, enrichment.techMentions, signalTypes, enrichment,
  );

  if (marketMemory.memoryDepth !== "none") {
    dataSources.push("market_memory");
  }

  const driftMonitor = computeDriftMonitor(
    exposure, signalTypes, enrichment.techMentions, marketMemory, correctionMomentum,
  );

  const negotiationIntelligence = buildNegotiationIntelligence(
    exposure, signalTypes, enrichment.techMentions, marketMemory, driftMonitor,
    peerComparison, correctionMomentum, scenarios,
  );

  const decisionPack = buildDecisionPack(
    input, diagnosis, exposure, detectedSignals, scenarios,
    confidenceModel, decisionFriction, causalGraph, peerComparison, correctionMomentum, decisionPressureScore,
  );

  const executiveSnapshot = buildExecutiveSnapshot(
    diagnosis, exposure, scenarios, confidenceModel, correctionMomentum, decisionPressureScore,
  );

  return {
    executiveSnapshot,
    companyContext: {
      domain: input.domain,
      name: input.name || input.domain,
      industry: input.industry || inferIndustry(enrichment),
      headcount: input.headcount || null,
      techFootprint: enrichment.techMentions,
      enrichmentSummary: enrichment.summary,
      signalCount: enrichment.signals.length,
    },
    diagnosis,
    exposure,
    lossVelocity,
    peerComparison,
    proof,
    correctionMomentum,
    decisionPressureScore,
    causalGraph,
    confidenceModel,
    decisionFriction,
    counterfactual,
    proofEngine,
    costOfDelay,
    marketMemory,
    driftMonitor,
    negotiationIntelligence,
    scenarios,
    decisionPack,
    meta: {
      analysisId,
      completedAt: new Date().toISOString(),
      dataSources,
      overallConfidence,
      limitations,
    },
  };
}

// ── Signal Detection ──────────────────────────────────

interface InternalSignal {
  type: string;
  label: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  impactMonthlyEur: [number, number] | null;
  source: "exa" | "vector" | "heuristic";
  confidence: "low" | "medium" | "high";
  evidence: string[];
  evidenceTier: "observed" | "inferred" | "estimated";
}

function detectSignals(
  input: CompanyContext,
  enrichment: EnrichmentResult,
  vectorPatterns: SimilarityResult[],
): InternalSignal[] {
  const signals: InternalSignal[] = [];
  const tech = enrichment.techMentions;
  const headcount = input.headcount || 100;

  // ── Redundant AI tools ──────────────────────────────
  const aiTools = tech.filter((t) =>
    ["OpenAI", "Anthropic", "GitHub Copilot", "ChatGPT"].includes(t),
  );
  if (aiTools.length >= 2) {
    signals.push({
      type: "ai_tool_redundancy",
      label: "AI Tool Redundancy",
      severity: "high",
      description: `${aiTools.length} overlapping AI tools detected (${aiTools.join(", ")}). Capability duplication likely.`,
      impactMonthlyEur: [400, 4500],
      source: "heuristic",
      confidence: aiTools.length >= 3 ? "medium" : "low",
      evidence: [`Public references to: ${aiTools.join(", ")}`],
      evidenceTier: "inferred",
    });
  }

  // ── Overlapping observability ───────────────────────
  const obsTools = tech.filter((t) =>
    ["Datadog", "Amplitude", "Mixpanel", "Segment"].includes(t),
  );
  if (obsTools.length >= 2) {
    signals.push({
      type: "observability_overlap",
      label: "Observability Overlap",
      severity: "medium",
      description: `${obsTools.length} monitoring/analytics platforms detected (${obsTools.join(", ")}). Feature overlap is structurally common.`,
      impactMonthlyEur: [250, 2500],
      source: "heuristic",
      confidence: "low",
      evidence: [`Public references to: ${obsTools.join(", ")}`],
      evidenceTier: "inferred",
    });
  }

  // ── Oversized enterprise plans ──────────────────────
  if (headcount < 50 && tech.includes("Salesforce")) {
    signals.push({
      type: "plan_oversize",
      label: "Plan Oversize",
      severity: "high",
      description: `Salesforce detected for ~${headcount} employees. Enterprise tier commonly oversized for organizations under 50.`,
      impactMonthlyEur: [600, 3500],
      source: "heuristic",
      confidence: "low",
      evidence: ["Headcount under 50", "Salesforce detected in public stack"],
      evidenceTier: "inferred",
    });
  }

  // ── Multi-cloud commitment waste ────────────────────
  const clouds = tech.filter((t) =>
    ["AWS", "Azure", "Google Cloud", "GCP"].includes(t),
  );
  if (clouds.length >= 2) {
    signals.push({
      type: "multi_cloud_waste",
      label: "Multi-Cloud Waste",
      severity: "high",
      description: `${clouds.length} cloud providers detected (${clouds.join(", ")}). Underutilized commitments are structurally likely.`,
      impactMonthlyEur: [800, 7000],
      source: "heuristic",
      confidence: "low",
      evidence: [`Public references to: ${clouds.join(", ")}`],
      evidenceTier: "inferred",
    });
  }

  // ── Shadow IT (hiring-driven) ───────────────────────
  if (enrichment.hiringSignals.length >= 3) {
    signals.push({
      type: "shadow_it_risk",
      label: "Shadow IT Risk",
      severity: "medium",
      description: `${enrichment.hiringSignals.length} hiring signals detected. Rapid team growth correlates strongly with ungoverned tool adoption.`,
      impactMonthlyEur: [150, 1800],
      source: "exa",
      confidence: "low",
      evidence: enrichment.hiringSignals.slice(0, 3).map((s) => s.slice(0, 100)),
      evidenceTier: "observed",
    });
  }

  // ── Large SaaS footprint (tool sprawl) ──────────────
  const totalTools = input.saasToolCount || tech.length;
  if (totalTools >= 8) {
    const inactivePct = totalTools >= 15 ? 0.25 : 0.15;
    const estMonthly = Math.round(totalTools * inactivePct * 50);
    signals.push({
      type: "license_sprawl",
      label: "License Sprawl",
      severity: totalTools >= 15 ? "critical" : "medium",
      description: `${totalTools} tools detected. Industry data indicates ${Math.round(inactivePct * 100)}% inactive license rate at this scale.`,
      impactMonthlyEur: [Math.round(estMonthly * 0.5), Math.round(estMonthly * 2)],
      source: "heuristic",
      confidence: "low",
      evidence: [`${totalTools} tools in detected footprint`],
      evidenceTier: "estimated",
    });
  }

  // ── Headcount-driven entropy (declared spend exists) ─
  if (input.monthlySpendEur && headcount >= 50) {
    const perEmployee = input.monthlySpendEur / headcount;
    if (perEmployee > 500) {
      signals.push({
        type: "spend_per_head_elevated",
        label: "Elevated Per-Employee Spend",
        severity: "high",
        description: `Monthly IT spend per employee is ~${Math.round(perEmployee)} EUR — above the 400 EUR/head industry median for ${input.industry || "technology"}.`,
        impactMonthlyEur: [Math.round((perEmployee - 400) * headcount * 0.3), Math.round((perEmployee - 400) * headcount * 0.6)],
        source: "heuristic",
        confidence: input.monthlySpendEur ? "medium" : "low",
        evidence: [`Declared spend: ${input.monthlySpendEur} EUR/mo`, `Headcount: ${headcount}`],
        evidenceTier: input.monthlySpendEur ? "observed" : "estimated",
      });
    }
  }

  // ── Vector-matched historical patterns ──────────────
  for (const pattern of vectorPatterns.slice(0, 2)) {
    if (pattern.similarity > 0.55) {
      const meta = pattern.metadata as Record<string, string>;
      signals.push({
        type: meta.signal_type || "historical_pattern_match",
        label: meta.signal_type?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Historical Pattern",
        severity: "medium",
        description: pattern.content.slice(0, 200),
        impactMonthlyEur: null,
        source: "vector",
        confidence: pattern.similarity > 0.75 ? "medium" : "low",
        evidence: [`Vector similarity: ${Math.round(pattern.similarity * 100)}%`],
        evidenceTier: "inferred",
      });
    }
  }

  // Sort: critical > high > medium > low
  const w = { critical: 4, high: 3, medium: 2, low: 1 };
  signals.sort((a, b) => w[b.severity] - w[a.severity]);

  return signals;
}

// ── Signal Classification ─────────────────────────────

function classifySignals(signals: InternalSignal[]) {
  const observed: ProofSignal[] = [];
  const inferred: ProofSignal[] = [];
  const estimated: ProofSignal[] = [];

  for (const s of signals) {
    const proof: ProofSignal = {
      type: s.type,
      label: s.label,
      description: s.description,
      impactEurRange: s.impactMonthlyEur
        ? [s.impactMonthlyEur[0] * 12, s.impactMonthlyEur[1] * 12]
        : null,
      severity: s.severity,
      evidence: s.evidence,
    };

    if (s.evidenceTier === "observed") observed.push(proof);
    else if (s.evidenceTier === "inferred") inferred.push(proof);
    else estimated.push(proof);
  }

  return { observed, inferred, estimated };
}

// ── Diagnosis ─────────────────────────────────────────

function buildDiagnosis(
  input: CompanyContext,
  signals: InternalSignal[],
  exposure: DecisionIntelligence["exposure"],
  enrichment: EnrichmentResult,
): DecisionIntelligence["diagnosis"] {
  const name = input.name || input.domain;
  const critCount = signals.filter((s) => s.severity === "critical").length;
  const highCount = signals.filter((s) => s.severity === "high").length;
  const totalSignals = signals.length;

  if (totalSignals === 0) {
    return {
      oneLiner: `Insufficient public signals to assess ${name}. Manual intake recommended.`,
      expanded: `The enrichment pipeline found limited public data for ${name}. This does not mean the organization is free of exposure — it means detection confidence is too low for automated assessment. A manual data intake (billing CSVs, license exports) would unlock full diagnostic capability.`,
    };
  }

  const fmtRange = `${fmtEur(exposure.lowEur)}–${fmtEur(exposure.highEur)}`;

  // Dominant signal for the one-liner
  const dominant = signals[0];
  const dominantLabel = dominant.label.toLowerCase();

  let urgency = "moderate";
  if (critCount >= 2 || (critCount >= 1 && highCount >= 2)) urgency = "high";
  else if (highCount === 0 && critCount === 0) urgency = "low";

  const oneLiner =
    urgency === "high"
      ? `${name} shows ${fmtRange}/yr exposure driven primarily by ${dominantLabel}. Corrective window is compressing.`
      : urgency === "moderate"
        ? `${name} has an estimated ${fmtRange}/yr exposure, with ${dominantLabel} as the leading signal.`
        : `${name} shows preliminary signals suggesting ${fmtRange}/yr in addressable spend.`;

  const expanded = [
    `${totalSignals} signal${totalSignals > 1 ? "s" : ""} detected across ${enrichment.techMentions.length} technologies.`,
    critCount > 0 ? `${critCount} critical-severity signal${critCount > 1 ? "s" : ""} require immediate attention.` : null,
    highCount > 0 ? `${highCount} high-severity signal${highCount > 1 ? "s" : ""} identified.` : null,
    `Confidence: ${exposure.confidence}/100 (${exposure.benchmarkQuality} benchmark quality).`,
    exposure.confidence < 50
      ? "Declared spend data would materially improve accuracy."
      : null,
  ].filter(Boolean).join(" ");

  return { oneLiner, expanded };
}

// ── Exposure Computation ──────────────────────────────

function computeExposure(
  input: CompanyContext,
  signals: InternalSignal[],
  enrichment: EnrichmentResult,
): DecisionIntelligence["exposure"] {
  const headcount = input.headcount || 100;
  const monthlySpend = input.monthlySpendEur || headcount * 380;

  // Sum signal-level impacts
  let signalLow = 0;
  let signalHigh = 0;
  for (const s of signals) {
    if (s.impactMonthlyEur) {
      signalLow += s.impactMonthlyEur[0];
      signalHigh += s.impactMonthlyEur[1];
    }
  }

  // Baseline: 12-22% of annual spend is typical Ghost Tax
  const baselineLow = Math.round(monthlySpend * 12 * 0.12);
  const baselineHigh = Math.round(monthlySpend * 12 * 0.22);

  const lowEur = Math.max(signalLow * 12, baselineLow);
  const highEur = Math.max(signalHigh * 12, baselineHigh);

  // Numeric confidence 0-100
  const hasRealSignals = signals.filter((s) => s.impactMonthlyEur !== null).length;
  const hasExa = enrichment.signals.length > 0;
  const hasDeclaredSpend = !!input.monthlySpendEur;

  let confidence = 15; // base
  confidence += Math.min(hasRealSignals * 8, 40); // up to 40 from signals
  if (hasExa) confidence += 15;
  if (hasDeclaredSpend) confidence += 20;
  if (input.headcount) confidence += 10;
  confidence = Math.min(confidence, 95); // never claim 100

  let benchmarkQuality: "strong" | "moderate" | "weak" = "weak";
  if (confidence >= 60) benchmarkQuality = "strong";
  else if (confidence >= 35) benchmarkQuality = "moderate";

  const basis =
    benchmarkQuality === "strong"
      ? "Based on declared spend, detected signals, and enrichment data."
      : benchmarkQuality === "moderate"
        ? "Based on detected signals and industry baseline. Declared spend would improve accuracy."
        : "Based on headcount-derived baseline. Limited evidence available.";

  // Time to impact: more severe signals = shorter time
  const criticalCount = signals.filter((s) => s.severity === "critical").length;
  const highCount = signals.filter((s) => s.severity === "high").length;
  const hiringActive = enrichment.hiringSignals.length >= 2;
  let timeToImpactDays = 90;
  timeToImpactDays -= criticalCount * 15;
  timeToImpactDays -= highCount * 8;
  if (hiringActive) timeToImpactDays -= 10;
  timeToImpactDays = Math.max(14, Math.min(90, timeToImpactDays));

  // 90-day recoverable: what can be addressed in first 90 days
  const easySignals = signals.filter(
    (s) => s.impactMonthlyEur !== null && ["ai_tool_redundancy", "plan_oversize", "license_sprawl"].includes(s.type),
  );
  let recover90Low = 0;
  let recover90High = 0;
  for (const s of easySignals) {
    if (s.impactMonthlyEur) {
      recover90Low += s.impactMonthlyEur[0] * 3; // 3 months
      recover90High += s.impactMonthlyEur[1] * 3;
    }
  }

  // ── Confidence discipline: widen ranges when evidence is weak ──
  // Low confidence (<35): ranges expand 40% to reflect real uncertainty.
  // Moderate confidence (35-59): ranges expand 15%.
  // High confidence (>=60): ranges used as-is.
  let finalLow = lowEur;
  let finalHigh = highEur;
  let finalRecover90Low = recover90Low;
  let finalRecover90High = recover90High;

  if (confidence < 35) {
    // Low confidence: widen range outward — lower the low, raise the high
    finalLow = Math.round(lowEur * 0.7);
    finalHigh = Math.round(highEur * 1.4);
    finalRecover90Low = Math.round(recover90Low * 0.6);
    finalRecover90High = Math.round(recover90High * 1.3);
  } else if (confidence < 60) {
    finalLow = Math.round(lowEur * 0.85);
    finalHigh = Math.round(highEur * 1.15);
    finalRecover90Low = Math.round(recover90Low * 0.85);
    finalRecover90High = Math.round(recover90High * 1.1);
  }

  const confidenceGrade: "high" | "moderate" | "low" =
    confidence >= 60 ? "high" : confidence >= 35 ? "moderate" : "low";

  return {
    lowEur: finalLow,
    highEur: finalHigh,
    confidence,
    confidenceGrade,
    benchmarkQuality,
    basis,
    timeToImpactDays,
    ninetyDayRecoverableEur: [finalRecover90Low, finalRecover90High],
  };
}

// ── Proof Architecture ────────────────────────────────

function buildProof(
  observed: ProofSignal[],
  inferred: ProofSignal[],
  estimated: ProofSignal[],
  enrichment: EnrichmentResult,
  dataSources: string[],
): DecisionIntelligence["proof"] {
  const confidenceDrivers: string[] = [];

  if (observed.length > 0) {
    confidenceDrivers.push(`${observed.length} signal${observed.length > 1 ? "s" : ""} based on directly observed evidence (hiring data, declared spend).`);
  }
  if (inferred.length > 0) {
    confidenceDrivers.push(`${inferred.length} signal${inferred.length > 1 ? "s" : ""} inferred from public technology footprint.`);
  }
  if (estimated.length > 0) {
    confidenceDrivers.push(`${estimated.length} signal${estimated.length > 1 ? "s" : ""} estimated from industry benchmarks.`);
  }

  const boundaries: string[] = [
    "Analysis is based on publicly available information and declared inputs only.",
    "No access to internal billing systems, contracts, or utilization data.",
    "Actual exposure may differ from estimates — ranges reflect structural uncertainty.",
  ];

  if (enrichment.signals.length === 0) {
    boundaries.push("No public enrichment data found — exposure is estimated from industry baselines only.");
  }

  const freshnessSummary = enrichment.signals.length > 0
    ? `Enrichment data collected at analysis time from ${dataSources.includes("exa_research") ? "Exa neural search" : "public sources"}.`
    : "No real-time enrichment data available for this domain.";

  return {
    observedSignals: observed,
    inferredSignals: inferred,
    estimatedSignals: estimated,
    confidenceDrivers,
    methodologySummary: "Heuristic signal detection fused with Exa public enrichment and vector-based peer comparison. Each signal is classified by evidence tier (observed > inferred > estimated) and assigned bounded impact ranges.",
    boundaries,
    freshnessSummary,
  };
}

// ── Scenarios ─────────────────────────────────────────

const PROTOCOL_MAP: Record<
  string,
  { title: string; effort: "trivial" | "easy" | "moderate" | "significant"; owner: string }
> = {
  ai_tool_redundancy: { title: "Consolidate AI tool subscriptions", effort: "easy", owner: "CTO / Engineering Lead" },
  observability_overlap: { title: "Audit and rationalize monitoring stack", effort: "moderate", owner: "CTO / Platform Team" },
  plan_oversize: { title: "Downgrade to appropriate vendor tier", effort: "easy", owner: "IT Procurement" },
  multi_cloud_waste: { title: "Review cloud commitments and utilization", effort: "significant", owner: "CTO / Cloud Architect" },
  shadow_it_risk: { title: "Implement procurement governance policy", effort: "moderate", owner: "CIO / IT Operations" },
  license_sprawl: { title: "Run license utilization audit across all tools", effort: "moderate", owner: "IT Operations" },
  spend_per_head_elevated: { title: "Per-employee spend optimization review", effort: "moderate", owner: "CFO / Finance" },
};

function buildScenarios(
  signals: InternalSignal[],
  exposure: DecisionIntelligence["exposure"],
  vectorProtocols: SimilarityResult[],
): DecisionIntelligence["scenarios"] {
  // Build actions from signals
  const allActions: ScenarioAction[] = [];
  for (const signal of signals) {
    const mapped = PROTOCOL_MAP[signal.type];
    if (!mapped) continue;
    allActions.push({
      title: mapped.title,
      owner: mapped.owner,
      effort: mapped.effort,
      savingsEurRange: signal.impactMonthlyEur
        ? [signal.impactMonthlyEur[0] * 12, signal.impactMonthlyEur[1] * 12]
        : null,
    });
  }

  // Supplement from vector memory
  for (const proto of vectorProtocols.slice(0, 2)) {
    const meta = proto.metadata as Record<string, string>;
    allActions.push({
      title: meta.title || "Historical corrective protocol",
      owner: meta.owner || "IT Operations",
      effort: (meta.effort as ScenarioAction["effort"]) || "moderate",
      savingsEurRange: null,
    });
  }

  const uniqueOwners = [...new Set(allActions.map((a) => a.owner))];

  // Conservative: only easy/trivial actions
  const conservativeActions = allActions.filter((a) => a.effort === "easy" || a.effort === "trivial");
  const conservativeLow = conservativeActions.reduce((sum, a) => sum + (a.savingsEurRange?.[0] || 0), 0);
  const conservativeHigh = conservativeActions.reduce((sum, a) => sum + (a.savingsEurRange?.[1] || 0), 0);

  // Base: easy + moderate
  const baseActions = allActions.filter((a) => a.effort !== "significant");
  const baseLow = baseActions.reduce((sum, a) => sum + (a.savingsEurRange?.[0] || 0), 0);
  const baseHigh = baseActions.reduce((sum, a) => sum + (a.savingsEurRange?.[1] || 0), 0);

  // Aggressive: all actions
  const aggressiveLow = allActions.reduce((sum, a) => sum + (a.savingsEurRange?.[0] || 0), 0);
  const aggressiveHigh = allActions.reduce((sum, a) => sum + (a.savingsEurRange?.[1] || 0), 0);

  return {
    conservative: {
      label: "Quick Wins Only",
      annualSavingsEur: [
        conservativeLow || Math.round(exposure.lowEur * 0.25),
        conservativeHigh || Math.round(exposure.highEur * 0.35),
      ],
      owners: uniqueOwners.slice(0, 2),
      actions: conservativeActions.length > 0 ? conservativeActions : allActions.slice(0, 1),
      paybackMonths: 1,
      disruption: "none",
    },
    base: {
      label: "Structured Optimization",
      annualSavingsEur: [
        baseLow || Math.round(exposure.lowEur * 0.55),
        baseHigh || Math.round(exposure.highEur * 0.65),
      ],
      owners: uniqueOwners.slice(0, 4),
      actions: baseActions.length > 0 ? baseActions : allActions.slice(0, 3),
      paybackMonths: 3,
      disruption: "low",
    },
    aggressive: {
      label: "Full Corrective Protocol",
      annualSavingsEur: [
        aggressiveLow || Math.round(exposure.lowEur * 0.75),
        aggressiveHigh || Math.round(exposure.highEur * 0.85),
      ],
      owners: uniqueOwners,
      actions: allActions,
      paybackMonths: 6,
      disruption: "moderate",
    },
  };
}

// ── Decision Pack ─────────────────────────────────────

function buildDecisionPack(
  input: CompanyContext,
  diagnosis: DecisionIntelligence["diagnosis"],
  exposure: DecisionIntelligence["exposure"],
  signals: InternalSignal[],
  scenarios: DecisionIntelligence["scenarios"],
  confidence: ConfidenceModel,
  friction: DecisionFriction,
  causal: CausalGraph,
  peer: PeerComparison,
  momentum: CorrectionMomentum,
  pressureScore: number,
): DecisionIntelligence["decisionPack"] {
  const name = input.name || input.domain;
  const range = `${fmtEur(exposure.lowEur)}–${fmtEur(exposure.highEur)}`;
  const baseRange = `${fmtEur(scenarios.base.annualSavingsEur[0])}–${fmtEur(scenarios.base.annualSavingsEur[1])}`;
  const recover90 = `${fmtEur(exposure.ninetyDayRecoverableEur[0])}–${fmtEur(exposure.ninetyDayRecoverableEur[1])}`;
  const confLabel = confidence.overall >= 60 ? "strong" : confidence.overall >= 35 ? "moderate" : "directional";
  const confCaveat = confLabel === "strong"
    ? "Confidence is solid. Estimates are grounded in declared inputs and multiple corroborating signals."
    : confLabel === "moderate"
      ? "Confidence is moderate. Declared spend data or internal license exports would improve estimate precision."
      : "Confidence is directional only. These figures should be treated as preliminary indicators pending deeper data intake.";

  const topSignals = signals.slice(0, 5);

  // ── CFO MEMO ──────────────────────────────────────

  const cfoMemo = [
    `FINANCIAL EXPOSURE MEMO — ${name.toUpperCase()}`,
    `Prepared: ${new Date().toISOString().slice(0, 10)}`,
    "",
    "SITUATION",
    diagnosis.oneLiner,
    "",
    "ESTIMATED FINANCIAL EXPOSURE",
    `Annual exposure range: ${range}/yr`,
    `90-day recoverable: ${recover90}`,
    `Daily leakage: ${fmtEur(Math.round(exposure.lowEur / 365))}–${fmtEur(Math.round(exposure.highEur / 365))}/day`,
    peer.efficiencyPercentile !== null
      ? `Peer position: P${peer.efficiencyPercentile} in ${peer.category} (higher = worse)`
      : "Peer position: Insufficient data for percentile ranking.",
    "",
    "WHY THE MODEL REACHED THIS CONCLUSION",
    `${signals.length} signal${signals.length !== 1 ? "s" : ""} detected. Primary driver: ${causal.dominantCause || "multiple overlapping factors"}.`,
    ...topSignals.map((s) => `- ${s.label}: ${s.description.slice(0, 140)}`),
    "",
    `Propagation: ${causal.propagationChain.length > 0 ? causal.propagationChain.join(" -> ") : "Not modeled due to insufficient signals."}`,
    "",
    "RECOMMENDED ACTION PATH",
    `Path: ${scenarios.base.label}`,
    `Expected recovery: ${baseRange}/yr`,
    `Payback period: ${scenarios.base.paybackMonths} months`,
    `Operational disruption: ${scenarios.base.disruption}`,
    `Implementation burden: ${friction.implementationBurden}`,
    "",
    "EXPECTED 90-DAY IMPACT",
    `Recoverable in first 90 days: ${recover90}`,
    `Time to measurable impact: ${exposure.timeToImpactDays} days`,
    `Decision pressure: ${pressureScore}/100`,
    "",
    "KEY UNCERTAINTIES",
    confCaveat,
    `Overall confidence: ${confidence.overall}/100 (${confLabel})`,
    `Weakest analytical layer: ${confidence.weakestLayer}`,
    ...exposure.confidence < 50 ? ["- Exposure estimate is based on limited inputs. Range may be wider than shown."] : [],
    ...peer.insufficientBenchmark ? ["- Peer benchmarking is unavailable. Percentile positioning could not be calculated."] : [],
    "",
    "PROPOSED NEXT DECISION",
    pressureScore >= 60
      ? `Decision pressure is elevated (${pressureScore}/100). Recommend initiating structured review within ${Math.min(exposure.timeToImpactDays, 30)} days.`
      : `Decision pressure is moderate (${pressureScore}/100). Recommend scheduling review to determine whether structured optimization is warranted.`,
    "",
    `WHY DELAY MATTERS`,
    `At current leakage velocity, each month of inaction represents approximately ${fmtEur(Math.round((exposure.lowEur + exposure.highEur) / 24))} in avoidable exposure. The ${recover90} 90-day window compresses as contracts renew and commitments auto-extend.`,
  ].join("\n");

  // ── CIO / IT / OPS MEMO ──────────────────────────

  const cioOpsMemo = [
    `OPERATIONAL EXPOSURE BRIEF — ${name.toUpperCase()}`,
    `Prepared: ${new Date().toISOString().slice(0, 10)}`,
    "",
    "TOOLING & GOVERNANCE OVERVIEW",
    `${signals.length} anomalies detected across ${input.headcount || "unknown"}-person organization.`,
    `Technology footprint: ${input.saasToolCount || signals.length} tools detected.`,
    `Dominant structural issue: ${causal.dominantCause || "fragmented technology governance"}`,
    "",
    "FRAGMENTATION & OVERLAP",
    ...topSignals.map((s) => `- ${s.label} [${s.severity.toUpperCase()}]: ${s.description.slice(0, 140)}`),
    "",
    "GOVERNANCE IMPLICATIONS",
    causal.propagationChain.length > 0
      ? `Causation chain: ${causal.propagationChain.join(" -> ")}`
      : "Causal chain could not be fully mapped with current signal density.",
    causal.secondaryCauses.length > 0
      ? `Contributing factors: ${causal.secondaryCauses.join("; ")}`
      : "",
    "",
    "IMPLEMENTATION BURDEN",
    `Friction score: ${friction.frictionScore}/100`,
    `Ownership ambiguity: ${friction.ownershipAmbiguityScore}/100`,
    `Cross-functional coordination: ${friction.crossFunctionalDependencies} functions involved`,
    friction.implementationBurden,
    friction.politicalFrictionSummary,
    "",
    "RECOMMENDED ACTIONS BY OWNER",
    ...scenarios.base.actions.slice(0, 6).map((a) => `- [${a.owner}] ${a.title} (effort: ${a.effort})${a.savingsEurRange ? ` — ${fmtEur(a.savingsEurRange[0])}–${fmtEur(a.savingsEurRange[1])}/yr` : ""}`),
    "",
    "ARCHITECTURE SIMPLIFICATION PATH",
    ...causal.leveragePoints.slice(0, 3).map((lp, i) => `${i + 1}. ${lp.lever}: ${lp.why}`),
    "",
    "OPERATIONAL DISRUPTION",
    `Base scenario disruption: ${scenarios.base.disruption}`,
    `Recovery window: ${momentum.medianRecoveryWindowDays} days`,
    `Payback period: ${momentum.expectedPaybackMonths} months`,
    `Execution readiness: ${momentum.executionReadinessScore}/100`,
    "",
    "CONFIDENCE NOTE",
    confCaveat,
    `Signal detection confidence: ${confidence.signalConfidence}/100`,
  ].join("\n");

  // ── PROCUREMENT SUMMARY ──────────────────────────

  const procurementSummary = [
    `PROCUREMENT ACTION SUMMARY — ${name.toUpperCase()}`,
    `Prepared: ${new Date().toISOString().slice(0, 10)}`,
    "",
    "CATEGORY EXPOSURE",
    `Total addressable waste: ${range}/yr`,
    `Vendor overlap and duplication are the primary cost drivers.`,
    "",
    "VENDOR RATIONALIZATION OPPORTUNITIES",
    ...topSignals.map((s, i) => `${i + 1}. ${s.label} — ${s.impactMonthlyEur ? `${fmtEur(s.impactMonthlyEur[0] * 12)}–${fmtEur(s.impactMonthlyEur[1] * 12)}/yr` : "Impact not quantified"} [${s.severity.toUpperCase()}]`),
    "",
    "CONTRACT RATIONALIZATION",
    "- Identify contracts eligible for tier downgrade or consolidation",
    "- Review auto-renewal clauses on overlapping subscriptions",
    "- Audit seat utilization against licensed capacity",
    "",
    "APPROVAL & GOVERNANCE",
    `${friction.crossFunctionalDependencies} stakeholder functions are implicated.`,
    friction.politicalFrictionSummary,
    "",
    "PHASED COMMERCIAL PATH",
    `Phase 1 (0-30 days): Quick wins — ${scenarios.conservative.label}`,
    ...scenarios.conservative.actions.slice(0, 3).map((a) => `  - ${a.title}`),
    `Phase 2 (30-90 days): Structured optimization — ${scenarios.base.label}`,
    ...scenarios.base.actions.filter((a) => a.effort === "moderate").slice(0, 3).map((a) => `  - ${a.title}`),
    `Phase 3 (90+ days): Full corrective protocol if warranted`,
    "",
    "WHAT IS KNOWN VS ESTIMATED",
    `Observed signals: ${signals.filter((s) => s.evidenceTier === "observed").length}`,
    `Inferred signals: ${signals.filter((s) => s.evidenceTier === "inferred").length}`,
    `Estimated signals: ${signals.filter((s) => s.evidenceTier === "estimated").length}`,
    confCaveat,
    "",
    "SOURCING LEVERAGE",
    peer.efficiencyPercentile !== null && peer.efficiencyPercentile >= 50
      ? `Organization is at P${peer.efficiencyPercentile} in ${peer.category}. Below-median efficiency creates meaningful negotiation leverage with incumbent vendors.`
      : "Peer benchmarking data is insufficient for sourcing leverage assessment.",
  ].join("\n");

  // ── BOARD ONE-PAGER ──────────────────────────────

  const boardOnePager = [
    `${name.toUpperCase()} — TECHNOLOGY SPEND EXPOSURE`,
    `${new Date().toISOString().slice(0, 10)}`,
    "",
    "PROBLEM",
    diagnosis.oneLiner,
    "",
    "EXPOSURE",
    `${range}/yr annual exposure | ${recover90} recoverable in 90 days`,
    "",
    "KEY DRIVER",
    causal.dominantCause || topSignals[0]?.label || "Multiple overlapping cost factors",
    "",
    "SELECTED PATH",
    `${scenarios.base.label}: ${baseRange}/yr recovery potential`,
    `Payback: ${scenarios.base.paybackMonths} months | Disruption: ${scenarios.base.disruption}`,
    "",
    "IMPACT WINDOW",
    `First measurable impact: ${exposure.timeToImpactDays} days`,
    `Full recovery window: ${momentum.medianRecoveryWindowDays} days`,
    "",
    "IMPLEMENTATION POSTURE",
    friction.frictionScore <= 40
      ? "Low implementation friction. Can proceed within existing operational cadence."
      : friction.frictionScore <= 65
        ? "Moderate friction. Requires cross-functional coordination but manageable within current structures."
        : "High friction. Dedicated program management recommended.",
    "",
    "MAIN UNCERTAINTY",
    `Confidence: ${confidence.overall}/100 (${confLabel}). ${confidence.weakestLayer} is the least reliable analytical layer.`,
    exposure.confidence < 50 ? "Exposure estimates are preliminary. Declared spend data would materially improve accuracy." : "",
    "",
    "STRATEGIC RELEVANCE",
    pressureScore >= 60
      ? `Decision pressure is elevated (${pressureScore}/100). Delaying action compounds exposure at ${fmtEur(Math.round(exposure.lowEur / 12))}–${fmtEur(Math.round(exposure.highEur / 12))}/month.`
      : `Decision pressure is moderate (${pressureScore}/100). Structured review is recommended to validate findings before commitment.`,
  ].filter(Boolean).join("\n");

  // ── CONSENSUS VIEW ───────────────────────────────

  const strongEvidence: string[] = [];
  const directionalEvidence: string[] = [];
  const keyUncertainties: string[] = [];
  const requiresDeeperValidation: string[] = [];

  for (const s of signals) {
    if (s.evidenceTier === "observed" && (s.confidence === "medium" || s.confidence === "high")) {
      strongEvidence.push(`${s.label}: ${s.description.slice(0, 120)}`);
    } else if (s.evidenceTier === "inferred") {
      directionalEvidence.push(`${s.label}: ${s.description.slice(0, 120)}`);
    } else {
      requiresDeeperValidation.push(`${s.label}: ${s.description.slice(0, 120)}`);
    }
  }

  if (confidence.exposureConfidence < 40) {
    keyUncertainties.push("Exposure estimate has low confidence. Actual range may differ materially.");
  }
  if (peer.insufficientBenchmark) {
    keyUncertainties.push("Peer benchmarking could not be performed. Percentile positioning is unavailable.");
  }
  if (confidence.scenarioConfidence < 40) {
    keyUncertainties.push("Scenario savings estimates are weakly grounded. Treat as directional.");
  }
  if (confidence.causalConfidence < 40) {
    keyUncertainties.push("Causal model has limited signal coverage. Root cause attribution is approximate.");
  }
  if (exposure.confidence < 50) {
    keyUncertainties.push("Declared spend data was not provided. Baseline is estimated from industry averages.");
  }
  if (friction.frictionScore >= 60) {
    keyUncertainties.push(`Implementation friction is high (${friction.frictionScore}/100). Execution complexity may affect timeline.`);
  }

  const recommendedAction = `${scenarios.base.label}: pursue ${baseRange}/yr recovery with ${scenarios.base.disruption} disruption over a ${scenarios.base.paybackMonths}-month payback period. ${pressureScore >= 60 ? "Urgency is elevated — recommend initiating within 30 days." : "Recommend scheduling structured review to validate before commitment."}`;

  const consensusView = {
    strongEvidence: strongEvidence.length > 0 ? strongEvidence : ["No strongly supported evidence available. All findings are directional."],
    directionalEvidence,
    keyUncertainties: keyUncertainties.length > 0 ? keyUncertainties : ["No major uncertainties identified at current confidence level."],
    recommendedAction,
    requiresDeeperValidation: requiresDeeperValidation.length > 0 ? requiresDeeperValidation : ["All detected signals have at least directional support."],
  };

  return { cfoMemo, cioOpsMemo, procurementSummary, boardOnePager, consensusView };
}

// ── Loss Velocity ─────────────────────────────────────

function computeLossVelocity(
  exposure: DecisionIntelligence["exposure"],
): LossVelocity {
  const lowYearly = exposure.lowEur;
  const highYearly = exposure.highEur;

  return {
    yearlyLossEur: [lowYearly, highYearly],
    monthlyLossEur: [Math.round(lowYearly / 12), Math.round(highYearly / 12)],
    weeklyLossEur: [Math.round(lowYearly / 52), Math.round(highYearly / 52)],
    dailyLossEur: [Math.round(lowYearly / 365), Math.round(highYearly / 365)],
    confidence: exposure.confidence,
    softened: exposure.confidence < 50,
  };
}

// ── Peer Comparison ───────────────────────────────────

// Industry benchmark medians (EUR/yr exposure per employee)
// Source: Flexera 2024, Zylo 2024, Gartner 2025 composite
const INDUSTRY_BENCHMARKS: Record<string, { medianPerHead: number; topQuartilePerHead: number }> = {
  "Technology / SaaS": { medianPerHead: 1800, topQuartilePerHead: 900 },
  "Financial Services": { medianPerHead: 2200, topQuartilePerHead: 1100 },
  "Healthcare": { medianPerHead: 1600, topQuartilePerHead: 800 },
  "Retail & E-commerce": { medianPerHead: 1400, topQuartilePerHead: 700 },
  "Manufacturing": { medianPerHead: 1200, topQuartilePerHead: 600 },
  "Media & Advertising": { medianPerHead: 1900, topQuartilePerHead: 950 },
  "Professional Services": { medianPerHead: 1500, topQuartilePerHead: 750 },
  "Technology": { medianPerHead: 1800, topQuartilePerHead: 900 },
};

function computePeerComparison(
  input: CompanyContext,
  exposure: DecisionIntelligence["exposure"],
  enrichment: EnrichmentResult,
): PeerComparison {
  const industry = input.industry || inferIndustry(enrichment);
  const headcount = input.headcount;
  const benchmark = INDUSTRY_BENCHMARKS[industry];

  // Insufficient data: no headcount or no benchmark
  if (!headcount || !benchmark) {
    return {
      efficiencyPercentile: null,
      categoryMedianExposureEur: null,
      categoryTopQuartileExposureEur: null,
      benchmarkConfidence: 0,
      insufficientBenchmark: true,
      category: industry,
    };
  }

  const categoryMedian = benchmark.medianPerHead * headcount;
  const categoryTopQuartile = benchmark.topQuartilePerHead * headcount;
  const midExposure = (exposure.lowEur + exposure.highEur) / 2;

  // Percentile: how the company compares (higher = worse)
  // If exposure equals median, percentile ~50. Scale linearly.
  let percentile: number;
  if (midExposure <= categoryTopQuartile) {
    percentile = Math.round((midExposure / categoryTopQuartile) * 25);
  } else if (midExposure <= categoryMedian) {
    percentile = 25 + Math.round(((midExposure - categoryTopQuartile) / (categoryMedian - categoryTopQuartile)) * 25);
  } else {
    // Above median — worse than 50th percentile
    const overRatio = midExposure / categoryMedian;
    percentile = Math.min(95, Math.round(50 + (overRatio - 1) * 30));
  }

  // Benchmark confidence depends on declared spend + headcount + industry match
  let benchmarkConf = 20;
  if (input.monthlySpendEur) benchmarkConf += 30;
  if (headcount) benchmarkConf += 20;
  if (benchmark) benchmarkConf += 15;
  if (enrichment.signals.length > 0) benchmarkConf += 15;
  benchmarkConf = Math.min(benchmarkConf, 90);

  return {
    efficiencyPercentile: percentile,
    categoryMedianExposureEur: Math.round(categoryMedian),
    categoryTopQuartileExposureEur: Math.round(categoryTopQuartile),
    benchmarkConfidence: benchmarkConf,
    insufficientBenchmark: benchmarkConf < 30,
    category: industry,
  };
}

// ── Correction Momentum ───────────────────────────────

function computeCorrectionMomentum(
  signals: InternalSignal[],
  scenarios: DecisionIntelligence["scenarios"],
  exposure: DecisionIntelligence["exposure"],
): CorrectionMomentum {
  // Median recovery window: based on signal severity mix
  const criticalCount = signals.filter((s) => s.severity === "critical").length;
  const highCount = signals.filter((s) => s.severity === "high").length;
  const totalActions = scenarios.base.actions.length;

  // More severe = longer recovery, but more actions = more surface area to optimize
  let recoveryDays = 60;
  recoveryDays += criticalCount * 15;
  recoveryDays += highCount * 10;
  recoveryDays -= Math.min(totalActions * 3, 15); // more actions = parallel execution
  recoveryDays = Math.max(30, Math.min(180, recoveryDays));

  // Action complexity: weighted average of effort levels
  const effortWeights = { trivial: 10, easy: 25, moderate: 55, significant: 85 };
  const allActions = scenarios.base.actions;
  const complexitySum = allActions.reduce(
    (sum, a) => sum + (effortWeights[a.effort] || 50), 0,
  );
  const actionComplexityScore = allActions.length > 0
    ? Math.round(complexitySum / allActions.length)
    : 50;

  // Execution readiness: composite of confidence + action count + ownership + disruption
  const readinessDrivers: string[] = [];
  let readiness = 0;

  // Signal confidence (0-25)
  const confScore = Math.min(25, Math.round(exposure.confidence * 0.25));
  readiness += confScore;
  if (confScore >= 15) readinessDrivers.push("Strong signal confidence supports action clarity.");
  else readinessDrivers.push("Signal confidence is limited — manual validation recommended.");

  // Corrective action count (0-25)
  const actionScore = Math.min(25, totalActions * 5);
  readiness += actionScore;
  if (totalActions >= 3) readinessDrivers.push(`${totalActions} corrective actions identified — execution surface is defined.`);
  else readinessDrivers.push("Few corrective actions identified — deeper intake may reveal more.");

  // Ownership clarity (0-25)
  const uniqueOwners = new Set(allActions.map((a) => a.owner)).size;
  const ownerScore = Math.min(25, uniqueOwners * 8);
  readiness += ownerScore;
  if (uniqueOwners >= 2) readinessDrivers.push(`${uniqueOwners} distinct owners identified — reduces single-point bottleneck.`);
  else readinessDrivers.push("Actions concentrated on single owner — execution bottleneck risk.");

  // Disruption (0-25): lower disruption = higher readiness
  const disruptionMap = { none: 25, low: 20, moderate: 12, high: 5 };
  const disruptionScore = disruptionMap[scenarios.base.disruption] || 12;
  readiness += disruptionScore;
  if (disruptionScore >= 20) readinessDrivers.push("Low operational disruption — can proceed without major change management.");
  else readinessDrivers.push("Moderate-to-high disruption — change management planning recommended.");

  return {
    medianRecoveryWindowDays: recoveryDays,
    expectedPaybackMonths: scenarios.base.paybackMonths,
    actionComplexityScore,
    executionReadinessScore: Math.min(100, readiness),
    readinessDrivers,
  };
}

// ── Decision Pressure Score ───────────────────────────

function computeDecisionPressure(
  exposure: DecisionIntelligence["exposure"],
  lossVelocity: LossVelocity,
  peer: PeerComparison,
  _momentum: CorrectionMomentum,
  overallConfidence: number,
): number {
  let score = 0;

  // Exposure magnitude (0-25): scaled by midpoint
  const midExposure = (exposure.lowEur + exposure.highEur) / 2;
  if (midExposure >= 500_000) score += 25;
  else if (midExposure >= 200_000) score += 20;
  else if (midExposure >= 100_000) score += 15;
  else if (midExposure >= 50_000) score += 10;
  else score += 5;

  // Loss velocity (0-20): daily loss rate
  const dailyMid = (lossVelocity.dailyLossEur[0] + lossVelocity.dailyLossEur[1]) / 2;
  if (dailyMid >= 1500) score += 20;
  else if (dailyMid >= 800) score += 15;
  else if (dailyMid >= 400) score += 10;
  else if (dailyMid >= 150) score += 5;

  // Benchmark gap (0-20): percentile position
  if (peer.efficiencyPercentile !== null) {
    if (peer.efficiencyPercentile >= 75) score += 20;
    else if (peer.efficiencyPercentile >= 60) score += 15;
    else if (peer.efficiencyPercentile >= 50) score += 10;
    else score += 5;
  }

  // Confidence adjustment (0-15): higher confidence = more pressure (justified)
  score += Math.round(overallConfidence * 0.15);

  // Recovery window compression (0-20): shorter window = more pressure
  if (exposure.timeToImpactDays <= 21) score += 20;
  else if (exposure.timeToImpactDays <= 45) score += 15;
  else if (exposure.timeToImpactDays <= 60) score += 10;
  else score += 5;

  return Math.min(95, Math.max(5, score)); // never claim 0 or 100
}

// ── Confidence ────────────────────────────────────────

function deriveConfidenceScore(
  exaSignals: number,
  vectorMatches: number,
  detectedSignals: number,
  hasDeclaredSpend: boolean,
): number {
  let score = 10; // base
  score += Math.min(exaSignals * 4, 25);
  score += Math.min(vectorMatches * 5, 20);
  score += Math.min(detectedSignals * 6, 30);
  if (hasDeclaredSpend) score += 15;
  return Math.min(score, 95);
}

// ── Memory Persistence ────────────────────────────────

async function persistToMemory(
  input: CompanyContext,
  enrichment: EnrichmentResult,
  signals: InternalSignal[],
): Promise<void> {
  const entries: VectorEntry[] = [];

  if (enrichment.signals.length > 0) {
    entries.push({
      category: "company_profile",
      content: describeCompany(input, enrichment),
      metadata: {
        domain: input.domain,
        industry: input.industry || "unknown",
        headcount: input.headcount || null,
        tech_count: enrichment.techMentions.length,
      },
    });
  }

  for (const signal of signals.filter((s) => s.source !== "vector")) {
    entries.push({
      category: "financial_signal",
      content: `${signal.type}: ${signal.description}`,
      metadata: {
        domain: input.domain,
        signal_type: signal.type,
        severity: signal.severity,
        confidence: signal.confidence,
      },
    });
  }

  if (entries.length > 0) {
    await storeVectors(entries);
  }
}

// ── Causal Graph ──────────────────────────────────

const CAUSAL_PATTERNS: Record<string, {
  rootCause: string;
  chain: string[];
  leveragePoint: string;
  leverageWhy: string;
}> = {
  ai_tool_redundancy: {
    rootCause: "Unmanaged AI adoption across teams",
    chain: ["Unmanaged AI adoption", "Duplicate capabilities across teams", "Fragmented tool ownership", "Compounding license spend"],
    leveragePoint: "Vendor consolidation",
    leverageWhy: "Reducing overlapping AI tools eliminates the largest per-seat redundancy",
  },
  observability_overlap: {
    rootCause: "Organic monitoring stack growth without rationalization",
    chain: ["Organic tool growth", "Feature overlap across monitoring platforms", "Redundant data ingestion pipelines", "Inflated observability cost"],
    leveragePoint: "Stack rationalization",
    leverageWhy: "Consolidating monitoring tools reduces both license and data ingestion costs",
  },
  plan_oversize: {
    rootCause: "Vendor-led upselling to enterprise tiers",
    chain: ["Vendor-led upselling", "Enterprise tier on sub-enterprise usage", "Unused feature capacity", "Avoidable license overspend"],
    leveragePoint: "License right-sizing",
    leverageWhy: "Downgrading to appropriate tier is low-effort with immediate savings",
  },
  multi_cloud_waste: {
    rootCause: "Multi-cloud drift without commitment governance",
    chain: ["Multi-cloud adoption", "Fragmented commitment utilization", "Underused reserved capacity", "Commitment waste across providers"],
    leveragePoint: "Cloud commitment optimization",
    leverageWhy: "Centralizing cloud governance recaptures underutilized commitments",
  },
  shadow_it_risk: {
    rootCause: "Rapid team growth outpacing procurement governance",
    chain: ["Rapid team growth", "Ungoverned tool adoption", "Shadow spending outside procurement", "Policy lag creates untracked exposure"],
    leveragePoint: "Procurement gating",
    leverageWhy: "A lightweight approval workflow prevents shadow spend before it accumulates",
  },
  license_sprawl: {
    rootCause: "Portfolio growth without deprovisioning discipline",
    chain: ["Organic portfolio expansion", "Inactive licenses accumulate", "No deprovisioning workflow", "Sprawl-driven waste"],
    leveragePoint: "License rationalization",
    leverageWhy: "Periodic utilization audits eliminate the largest hidden cost category",
  },
  spend_per_head_elevated: {
    rootCause: "Baseline cost drift above industry median",
    chain: ["Baseline cost drift", "Per-employee spend above category median", "Weak procurement gating", "Structural overspend entrenched"],
    leveragePoint: "Spend governance",
    leverageWhy: "Establishing per-head spend targets creates a self-correcting budget constraint",
  },
  historical_pattern_match: {
    rootCause: "Historical pattern detected from similar organizations",
    chain: ["Similar organizational profile", "Matched historical leak pattern", "Likely analogous exposure"],
    leveragePoint: "Pattern-informed review",
    leverageWhy: "Historical precedent suggests targeted review of matched areas",
  },
};

function buildCausalGraph(signals: InternalSignal[]): CausalGraph {
  if (signals.length === 0) {
    return {
      dominantCause: "Insufficient signals for causal analysis",
      secondaryCauses: [],
      propagationChain: [],
      leveragePoints: [],
      correctionOrder: [],
      nodes: [],
      edges: [],
    };
  }

  const dominant = signals[0];
  const dominantPattern = CAUSAL_PATTERNS[dominant.type] || CAUSAL_PATTERNS.historical_pattern_match;

  const secondaryCauses: string[] = [];
  const allLeveragePoints: CausalGraph["leveragePoints"] = [];
  const nodes: CausalNode[] = [];
  const edges: CausalEdge[] = [];
  const seenLevers = new Set<string>();

  for (const signal of signals) {
    const pattern = CAUSAL_PATTERNS[signal.type];
    if (!pattern) continue;

    if (signal !== dominant) {
      secondaryCauses.push(pattern.rootCause);
    }

    // Build nodes and edges for this causal chain
    const chainIds: string[] = [];
    for (let j = 0; j < pattern.chain.length; j++) {
      const nodeId = `${signal.type}_${j}`;
      const nodeType: CausalNode["type"] = j === 0 ? "root" : j === pattern.chain.length - 1 ? "impact" : j === 1 ? "mechanism" : "symptom";
      nodes.push({ id: nodeId, label: pattern.chain[j], type: nodeType });
      chainIds.push(nodeId);
      if (j > 0) {
        edges.push({ from: chainIds[j - 1], to: nodeId, relationship: "leads to" });
      }
    }

    if (!seenLevers.has(pattern.leveragePoint)) {
      seenLevers.add(pattern.leveragePoint);
      allLeveragePoints.push({
        lever: pattern.leveragePoint,
        why: pattern.leverageWhy,
        signalTypes: [signal.type],
      });
    } else {
      const existing = allLeveragePoints.find((l) => l.lever === pattern.leveragePoint);
      if (existing) existing.signalTypes.push(signal.type);
    }
  }

  // Correction order: prioritize by leverage (impact * ease)
  const correctionOrder = allLeveragePoints.map((lp, i) => ({
    step: i + 1,
    action: lp.lever,
    rationale: lp.why,
  }));

  return {
    dominantCause: dominantPattern.rootCause,
    secondaryCauses: secondaryCauses.slice(0, 4),
    propagationChain: dominantPattern.chain,
    leveragePoints: allLeveragePoints,
    correctionOrder,
    nodes,
    edges,
  };
}

// ── Granular Confidence Model ─────────────────────

function buildConfidenceModel(
  signals: InternalSignal[],
  exposure: DecisionIntelligence["exposure"],
  peer: PeerComparison,
  scenarios: DecisionIntelligence["scenarios"],
  _causalGraph: CausalGraph,
  counterfactual: CounterfactualPrecompute,
  overallConfidence: number,
): ConfidenceModel {
  // Signal confidence: based on evidence tier distribution
  const observed = signals.filter((s) => s.evidenceTier === "observed").length;
  const inferred = signals.filter((s) => s.evidenceTier === "inferred").length;
  const estimated = signals.filter((s) => s.evidenceTier === "estimated").length;
  const total = signals.length;
  let signalConfidence = 10;
  if (total > 0) {
    signalConfidence = Math.round(
      ((observed * 90 + inferred * 55 + estimated * 25) / total) * 0.9,
    );
  }
  signalConfidence = Math.min(90, Math.max(5, signalConfidence));

  // Exposure confidence: already computed
  const exposureConfidence = exposure.confidence;

  // Benchmark confidence: from peer comparison
  const benchmarkConfidence = peer.benchmarkConfidence;

  // Scenario confidence: how many actions have quantified savings
  const baseActions = scenarios.base.actions;
  const quantified = baseActions.filter((a) => a.savingsEurRange !== null).length;
  let scenarioConfidence = 10;
  if (baseActions.length > 0) {
    scenarioConfidence = Math.round((quantified / baseActions.length) * 70) + 10;
  }
  scenarioConfidence = Math.min(85, scenarioConfidence);

  // Causal confidence: based on signal-to-pattern coverage
  const mappedSignals = signals.filter((s) => CAUSAL_PATTERNS[s.type] !== undefined).length;
  let causalConfidence = 10;
  if (total > 0) {
    causalConfidence = Math.round((mappedSignals / total) * 75) + 10;
  }
  causalConfidence = Math.min(85, causalConfidence);

  // Simulation confidence: based on lever availability and signal coverage
  const availableLevers = counterfactual.availableLevers.filter((l) => l.available);
  let simulationConfidence = 10;
  if (availableLevers.length > 0) {
    const avgLeverConf = availableLevers.reduce((s, l) => s + l.confidence, 0) / availableLevers.length;
    simulationConfidence = Math.min(80, Math.round(avgLeverConf * 0.7 + availableLevers.length * 5));
  }

  // Identify weakest/strongest
  const layers: { name: string; score: number }[] = [
    { name: "Signal detection", score: signalConfidence },
    { name: "Exposure estimation", score: exposureConfidence },
    { name: "Peer benchmarking", score: benchmarkConfidence },
    { name: "Scenario modeling", score: scenarioConfidence },
    { name: "Causal analysis", score: causalConfidence },
    { name: "Simulation modeling", score: simulationConfidence },
  ];
  layers.sort((a, b) => a.score - b.score);
  const weakestLayer = layers[0].name;
  const strongestLayer = layers[layers.length - 1].name;

  // Summary
  const avgConf = Math.round(layers.reduce((s, l) => s + l.score, 0) / layers.length);
  let summary: string;
  if (avgConf >= 60) {
    summary = `Confidence is solid across most layers. ${strongestLayer} is the strongest foundation. ${weakestLayer} would benefit from additional data.`;
  } else if (avgConf >= 35) {
    summary = `Confidence is moderate. ${strongestLayer} provides the best grounding. ${weakestLayer} is the primary gap — declared spend or internal data would improve it.`;
  } else {
    summary = `Confidence is limited across all layers. Results are directional indicators. ${weakestLayer} is the weakest layer. Manual data intake would materially improve all estimates.`;
  }

  return {
    signalConfidence,
    exposureConfidence,
    benchmarkConfidence,
    scenarioConfidence,
    causalConfidence,
    simulationConfidence,
    overall: overallConfidence,
    weakestLayer,
    strongestLayer,
    summary,
  };
}

// ── Proof Engine Computation ──────────────────────

const KNOWN_EXPOSURE_CATEGORIES = [
  "ai_tool_redundancy",
  "observability_overlap",
  "plan_oversize",
  "multi_cloud_waste",
  "shadow_it_risk",
  "license_sprawl",
  "spend_per_head_elevated",
];

const PATTERN_DOMAINS = {
  spend: ["spend_per_head_elevated", "plan_oversize"],
  governance: ["shadow_it_risk"],
  procurement: ["license_sprawl", "plan_oversize"],
  duplication: ["ai_tool_redundancy", "observability_overlap", "multi_cloud_waste"],
};

function buildProofEngine(
  signals: InternalSignal[],
  exposure: DecisionIntelligence["exposure"],
  peer: PeerComparison,
  enrichment: EnrichmentResult,
  confidenceModel: ConfidenceModel,
): ProofEngine {
  const detectedTypes = new Set(signals.map((s) => s.type));

  // Signal density: what percentage of known categories did we detect?
  const matchedCategories = KNOWN_EXPOSURE_CATEGORIES.filter((c) => detectedTypes.has(c)).length;
  const signalDensity = Math.round((matchedCategories / KNOWN_EXPOSURE_CATEGORIES.length) * 100);

  // Pattern coverage: breadth across the four domains
  let domainsHit = 0;
  for (const types of Object.values(PATTERN_DOMAINS)) {
    if (types.some((t) => detectedTypes.has(t))) domainsHit++;
  }
  const patternCoverage = Math.round((domainsHit / Object.keys(PATTERN_DOMAINS).length) * 100);

  // Benchmark confidence: from peer comparison
  const benchmarkConfidence = peer.benchmarkConfidence;

  // Evidence strength: composite
  const avgConf = confidenceModel.overall;
  const evidenceStrength: ProofEngine["evidenceStrength"] =
    avgConf >= 60 ? "strong" : avgConf >= 35 ? "moderate" : "directional";

  // Detection scope: how much surface area could we actually scan
  let detectionScope = 20; // base: we always have heuristics
  if (enrichment.signals.length > 0) detectionScope += 30; // exa enrichment available
  if (enrichment.techMentions.length >= 5) detectionScope += 15; // good tech visibility
  if (exposure.confidence >= 50) detectionScope += 20; // declared spend
  detectionScope = Math.min(95, detectionScope);

  // Model support level: enough signal to justify recommendations
  const signalCount = signals.length;
  const hasQuantified = signals.some((s) => s.impactMonthlyEur !== null);
  let modelSupportLevel = 10;
  if (signalCount >= 1) modelSupportLevel += 15;
  if (signalCount >= 3) modelSupportLevel += 20;
  if (hasQuantified) modelSupportLevel += 20;
  if (enrichment.signals.length > 0) modelSupportLevel += 15;
  if (exposure.confidence >= 40) modelSupportLevel += 10;
  modelSupportLevel = Math.min(90, modelSupportLevel);

  // Summary
  let summary: string;
  if (modelSupportLevel >= 60) {
    summary = `Detection covered ${domainsHit} of 4 exposure domains with ${matchedCategories} pattern match${matchedCategories !== 1 ? "es" : ""}. Evidence base supports quantified recommendations.`;
  } else if (modelSupportLevel >= 35) {
    summary = `Detection identified ${matchedCategories} pattern${matchedCategories !== 1 ? "s" : ""} across ${domainsHit} domain${domainsHit !== 1 ? "s" : ""}. Directional recommendations are supported; declared spend would strengthen the model.`;
  } else {
    summary = `Limited detection surface — ${matchedCategories} pattern${matchedCategories !== 1 ? "s" : ""} identified. Results are preliminary. Additional data inputs would materially improve coverage.`;
  }

  return {
    signalDensity,
    patternCoverage,
    benchmarkConfidence,
    evidenceStrength,
    detectionScope,
    modelSupportLevel,
    summary,
  };
}

// ── Cost of Delay Computation ────────────────────

function computeCostOfDelay(
  lossVelocity: LossVelocity,
  correctionMomentum: CorrectionMomentum,
): CostOfDelay {
  const daily = lossVelocity.dailyLossEur;
  const monthly: [number, number] = [daily[0] * 30, daily[1] * 30];
  const quarterly: [number, number] = [daily[0] * 90, daily[1] * 90];

  // Readiness multiplier: low readiness means delay costs compound faster
  // High readiness (80+) = 1.0x, low readiness (20) = 1.4x
  const readiness = correctionMomentum.executionReadinessScore;
  const readinessMultiplier = 1 + (1 - Math.min(readiness, 100) / 100) * 0.4;

  const projectedDelayLoss90: [number, number] = [
    Math.round(quarterly[0] * readinessMultiplier),
    Math.round(quarterly[1] * readinessMultiplier),
  ];

  return {
    dailyCostOfDelay: daily,
    monthlyCostOfDelay: monthly,
    quarterlyCostOfDelay: quarterly,
    projectedDelayLoss90,
    readinessMultiplier: Math.round(readinessMultiplier * 100) / 100,
  };
}

// ── Decision Friction / Org Impact ────────────────

const STAKEHOLDER_MAP: Record<string, { role: string; triggerTypes: string[]; reason: string }> = {
  cfo: { role: "CFO / Finance", triggerTypes: ["spend_per_head_elevated", "multi_cloud_waste", "license_sprawl"], reason: "Budget authority over IT spend categories. Required for approval of any cost restructuring." },
  cio: { role: "CIO / IT Director", triggerTypes: ["shadow_it_risk", "license_sprawl", "observability_overlap"], reason: "Owns technology governance and tool portfolio decisions." },
  cto: { role: "CTO / Engineering", triggerTypes: ["ai_tool_redundancy", "observability_overlap", "multi_cloud_waste"], reason: "Controls technical stack decisions and engineering tooling budgets." },
  procurement: { role: "Procurement", triggerTypes: ["plan_oversize", "license_sprawl", "spend_per_head_elevated"], reason: "Vendor contract authority. Needed for renegotiation and tier adjustments." },
  security: { role: "Security / Compliance", triggerTypes: ["shadow_it_risk", "ai_tool_redundancy"], reason: "Must approve any tool changes that affect data handling or compliance posture." },
};

function computeDecisionFriction(
  signals: InternalSignal[],
  scenarios: DecisionIntelligence["scenarios"],
  momentum: CorrectionMomentum,
): DecisionFriction {
  const signalTypes = new Set(signals.map((s) => s.type));
  const baseActions = scenarios.base.actions;
  const uniqueOwners = new Set(baseActions.map((a) => a.owner));

  // Build stakeholder impact map
  const stakeholderMap: StakeholderImpact[] = [];
  for (const [, sh] of Object.entries(STAKEHOLDER_MAP)) {
    const relevantSignals = sh.triggerTypes.filter((t) => signalTypes.has(t));
    if (relevantSignals.length === 0) continue;

    const impactLevel: StakeholderImpact["impactLevel"] =
      relevantSignals.length >= 2 ? "high" : "moderate";

    // Resistance correlates with disruption and complexity
    let resistance: StakeholderImpact["likelyResistance"] = "low";
    if (scenarios.base.disruption === "high" || scenarios.base.disruption === "moderate") {
      resistance = "moderate";
    }
    if (sh.role.includes("Engineering") && signalTypes.has("ai_tool_redundancy")) {
      resistance = "moderate"; // engineers resist tool consolidation
    }

    stakeholderMap.push({
      role: sh.role,
      impactLevel,
      reason: sh.reason,
      likelyResistance: resistance,
    });
  }

  // Ownership ambiguity: how distributed is ownership?
  const ownerCount = uniqueOwners.size;
  let ownershipAmbiguityScore: number;
  if (ownerCount <= 1) ownershipAmbiguityScore = 15; // clear, single owner
  else if (ownerCount <= 2) ownershipAmbiguityScore = 30;
  else if (ownerCount <= 3) ownershipAmbiguityScore = 50;
  else ownershipAmbiguityScore = Math.min(85, 50 + ownerCount * 8);

  // Friction score: composite of complexity, ambiguity, stakeholder count, disruption
  const disruptionWeight = { none: 0, low: 10, moderate: 25, high: 40 };
  let frictionScore = 0;
  frictionScore += Math.round(momentum.actionComplexityScore * 0.3);
  frictionScore += Math.round(ownershipAmbiguityScore * 0.25);
  frictionScore += Math.min(20, stakeholderMap.length * 5);
  frictionScore += disruptionWeight[scenarios.base.disruption] || 15;
  frictionScore = Math.min(90, Math.max(10, frictionScore));

  // Implementation burden summary
  let implementationBurden: string;
  if (frictionScore >= 65) {
    implementationBurden = `High implementation burden. ${ownerCount} distinct ownership domains, ${stakeholderMap.length} stakeholders impacted, and ${scenarios.base.disruption} operational disruption. Requires dedicated program management.`;
  } else if (frictionScore >= 40) {
    implementationBurden = `Moderate implementation burden. ${ownerCount} ownership domains involved. Can be executed within existing operational cadence with clear ownership assignment.`;
  } else {
    implementationBurden = `Low implementation burden. Actions are concentrated, ownership is clear, and disruption is minimal. Can proceed without formal change management.`;
  }

  // Political friction summary
  const highResistance = stakeholderMap.filter((s) => s.likelyResistance === "high" || s.likelyResistance === "moderate");
  let politicalFrictionSummary: string;
  if (highResistance.length === 0) {
    politicalFrictionSummary = "No significant political friction expected. Actions align with typical operational authority.";
  } else {
    const resistors = highResistance.map((s) => s.role).join(", ");
    politicalFrictionSummary = `Likely resistance from: ${resistors}. Recommend pre-alignment before formal execution begins.`;
  }

  return {
    frictionScore,
    ownershipAmbiguityScore,
    stakeholderMap,
    implementationBurden,
    politicalFrictionSummary,
    crossFunctionalDependencies: stakeholderMap.length,
  };
}

// ── Counterfactual Precomputation ──────────────────

const LEVER_DEFINITIONS: {
  id: string;
  label: string;
  description: string;
  signalTypes: string[];
  pressureReduction: number;
  recoveryAcceleration: number;
  effortLevel: "low" | "moderate" | "significant";
}[] = [
  { id: "vendor_consolidation", label: "Vendor Consolidation", description: "Merge overlapping tools into fewer, governed subscriptions.", signalTypes: ["ai_tool_redundancy", "observability_overlap"], pressureReduction: 15, recoveryAcceleration: 15, effortLevel: "moderate" },
  { id: "license_rationalization", label: "License Rationalization", description: "Audit utilization and remove inactive licenses. Downgrade oversized tiers.", signalTypes: ["license_sprawl", "plan_oversize"], pressureReduction: 12, recoveryAcceleration: 10, effortLevel: "low" },
  { id: "procurement_gating", label: "Procurement Gating", description: "Implement approval workflow for new tool purchases above threshold.", signalTypes: ["shadow_it_risk", "spend_per_head_elevated"], pressureReduction: 10, recoveryAcceleration: 20, effortLevel: "moderate" },
  { id: "cloud_optimization", label: "Cloud Commitment Optimization", description: "Review and reallocate underutilized cloud commitments.", signalTypes: ["multi_cloud_waste"], pressureReduction: 12, recoveryAcceleration: 10, effortLevel: "significant" },
  { id: "governance_hardening", label: "Governance Hardening", description: "Establish category-level spend policies and periodic review cycles.", signalTypes: ["shadow_it_risk", "license_sprawl", "spend_per_head_elevated"], pressureReduction: 8, recoveryAcceleration: 25, effortLevel: "moderate" },
];

function buildCounterfactual(
  signals: InternalSignal[],
  exposure: DecisionIntelligence["exposure"],
  decisionPressureScore: number,
  momentum: CorrectionMomentum,
): CounterfactualPrecompute {
  const signalTypes = new Set(signals.map((s) => s.type));

  const levers: CorrectionLever[] = LEVER_DEFINITIONS.map((def) => {
    const matchingSignals = signals.filter((s) => def.signalTypes.includes(s.type));
    const available = matchingSignals.length > 0;

    // Compute exposure reduction from matching signals
    let reductionLow = 0;
    let reductionHigh = 0;
    for (const ms of matchingSignals) {
      if (ms.impactMonthlyEur) {
        reductionLow += ms.impactMonthlyEur[0] * 12;
        reductionHigh += ms.impactMonthlyEur[1] * 12;
      }
    }

    // If no quantified signals, estimate as % of exposure
    if (reductionLow === 0 && available) {
      reductionLow = Math.round(exposure.lowEur * 0.08);
      reductionHigh = Math.round(exposure.highEur * 0.12);
    }

    // Confidence in this lever
    let leverConfidence = 10;
    if (available) {
      const observedMatch = matchingSignals.filter((s) => s.evidenceTier === "observed").length;
      const inferredMatch = matchingSignals.filter((s) => s.evidenceTier === "inferred").length;
      leverConfidence = Math.min(80, 20 + observedMatch * 25 + inferredMatch * 15);
    }

    return {
      id: def.id,
      label: def.label,
      description: def.description,
      applicableSignalTypes: def.signalTypes.filter((t) => signalTypes.has(t)),
      exposureReductionEur: [reductionLow, reductionHigh] as [number, number],
      pressureReduction: available ? def.pressureReduction : 0,
      recoveryAccelerationDays: available ? def.recoveryAcceleration : 0,
      confidence: leverConfidence,
      available,
      effortLevel: def.effortLevel,
    };
  });

  return {
    availableLevers: levers,
    baselineExposure: [exposure.lowEur, exposure.highEur],
    baselinePressure: decisionPressureScore,
    baselineRecoveryDays: momentum.medianRecoveryWindowDays,
  };
}

// ── Executive Snapshot ─────────────────────────────

function buildExecutiveSnapshot(
  diagnosis: DecisionIntelligence["diagnosis"],
  exposure: DecisionIntelligence["exposure"],
  scenarios: DecisionIntelligence["scenarios"],
  confidence: ConfidenceModel,
  _momentum: CorrectionMomentum,
  pressureScore: number,
): ExecutiveSnapshot {
  const confLabel = confidence.overall >= 60 ? "strong" : confidence.overall >= 35 ? "moderate" : "directional";
  return {
    diagnosisSummary: diagnosis.oneLiner,
    exposureRangeEur: [exposure.lowEur, exposure.highEur],
    ninetyDayRecoverableEur: exposure.ninetyDayRecoverableEur,
    recommendedActionPath: scenarios.base.label,
    confidenceRange: `${confLabel} (${confidence.overall}/100)`,
    timeToImpactDays: exposure.timeToImpactDays,
    pressureScore,
  };
}

// ── Helpers ───────────────────────────────────────────

function fmtEur(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 10_000) return Math.round(n / 1000) + "k";
  return Math.round(n).toLocaleString("fr-FR");
}

function describeCompany(
  input: CompanyContext,
  enrichment: EnrichmentResult,
): string {
  return [
    `Company: ${input.name || input.domain}`,
    input.industry ? `Industry: ${input.industry}` : null,
    input.headcount ? `Headcount: ~${input.headcount}` : null,
    input.monthlySpendEur
      ? `Monthly IT spend: ~${input.monthlySpendEur} EUR`
      : null,
    enrichment.techMentions.length > 0
      ? `Tech stack: ${enrichment.techMentions.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join(". ");
}

function inferIndustry(enrichment: EnrichmentResult): string {
  const text = enrichment.signals
    .map((s) => s.snippet)
    .join(" ")
    .toLowerCase();

  if (text.includes("fintech") || text.includes("banking")) return "Financial Services";
  if (text.includes("healthcare") || text.includes("medical")) return "Healthcare";
  if (text.includes("e-commerce") || text.includes("retail")) return "Retail & E-commerce";
  if (text.includes("saas") || text.includes("software")) return "Technology / SaaS";
  if (text.includes("manufacturing")) return "Manufacturing";
  if (text.includes("media") || text.includes("advertising")) return "Media & Advertising";
  return "Technology";
}
