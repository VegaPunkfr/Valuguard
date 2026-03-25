/**
 * GHOST TAX — FINANCIAL THESIS KERNEL (SERVER-ONLY)
 *
 * The conviction core. Turns evidence into monetizable financial reasoning.
 *
 * 8 hardened dimensions:
 *   1. Certainty discipline (OBSERVED / DERIVED / ESTIMATED / WITHHELD)
 *   2. Discomfort creation (why inaction is unsafe)
 *   3. Political utility (internal resistance map)
 *   4. Offer routing (Rail A / B / C)
 *   5. Conversion learning (ledger event)
 *   6. Loss framing (dominant + secondary)
 *   7. Output compression (flash verdict / control note / decision pack)
 *   8. No-fantasy policy (hard reject if confidence too low for tier)
 */

import type {
  DecisionIntelligence,
  ProofSignal,
} from "@/lib/analysis";

// ── Certainty Classification ────────────────────────

export type CertaintyClass = "OBSERVED" | "DERIVED" | "ESTIMATED" | "WITHHELD";

export interface ClassifiedClaim {
  statement: string;
  certainty: CertaintyClass;
  source: string;
  confidence: number; // 0-100
  impact_eur: [number, number] | null;
}

// ── Loss Framing ────────────────────────────────────

export type LossFrame =
  | "revenue_leakage"
  | "margin_erosion"
  | "decision_latency"
  | "vendor_over_capture"
  | "operational_drag"
  | "governance_blind_spot"
  | "escalation_risk"
  | "compounding_inefficiency";

// ── Offer Rail ──────────────────────────────────────

export type OfferRail = "A" | "B" | "C";

export interface OfferRouting {
  recommended_rail: OfferRail;
  rationale: string;
  price_eur: number;
  label: string;
}

// ── Internal Resistance Map ─────────────────────────

export interface StakeholderResistance {
  role: string;
  likely_objection: string;
  blind_spot: string;
  response_angle: string;
  supporting_proof: string;
}

// ── Output Layers ───────────────────────────────────

export interface FlashVerdict {
  verdict: string; // one-line institutional verdict
}

export interface ControlNote {
  headline: string;
  exposure_range_eur: [number, number];
  dominant_frame: string;
  consequence: string;
  inaction_cost_monthly: [number, number];
  confidence_summary: string;
  recommended_action: string;
}

// ── Conversion Ledger Event ─────────────────────────

export interface ConversionEvent {
  domain: string;
  timestamp: string;
  dominant_loss_frame: LossFrame;
  severity_band: "low" | "medium" | "high";
  confidence_band: "low" | "moderate" | "high";
  offer_rail_shown: OfferRail;
  tier: "preview" | "premium";
  exposure_range_eur: [number, number];
  signal_count: number;
  observed_count: number;
}

// ── Financial Thesis Kernel ─────────────────────────

export interface FinancialThesis {
  // Core claim
  detected_exposure: ThesisExposure[];
  likely_leak_source: LeakSource[];
  business_consequence: string;
  estimated_annual_impact: { low: number; central: number; high: number; currency: "EUR" };

  // Certainty discipline
  confidence_level: {
    observed: number;
    causal: number;
    financial: number;
    overall: number;
  };
  classified_claims: ClassifiedClaim[];

  // Loss framing
  dominant_frame: LossFrame;
  secondary_frames: LossFrame[];

  // Discomfort creation
  cost_of_inaction: {
    daily_eur: [number, number];
    monthly_eur: [number, number];
    quarterly_eur: [number, number];
    narrative: string;
    why_inaction_unsafe: string;
  };

  // Decision priority
  decision_priority: {
    level: "low" | "medium" | "high";
    rationale: string;
    urgency_driver: string;
  };

  // Political utility (premium only — withheld in preview)
  internal_resistance_map: StakeholderResistance[];

  // Offer routing
  offer: OfferRouting;

  // Output layers
  flash_verdict: FlashVerdict;
  control_note: ControlNote;

  // Proof boundary
  proof_boundary: {
    public_claims: ClassifiedClaim[];
    private_claims: ClassifiedClaim[];
    withheld_sections: string[];
  };
}

// ── Supporting types ────────────────────────────────

export interface ThesisExposure {
  type: string;
  label: string;
  severity: "critical" | "high" | "medium" | "low";
  certainty: CertaintyClass;
  description: string;
  impact_eur_range: [number, number] | null;
}

export interface LeakSource {
  category: string;
  origin: string;
  mechanism: string;
  certainty: CertaintyClass;
}

// ── BUILD ───────────────────────────────────────────

export function buildFinancialThesis(result: DecisionIntelligence): FinancialThesis | null {
  const observed = result.proof?.observedSignals || [];
  const inferred = result.proof?.inferredSignals || [];
  const estimated = result.proof?.estimatedSignals || [];
  const allSignals = [...observed, ...inferred, ...estimated];

  if (allSignals.length < 2) return null;

  // ── Confidence ────────────────────────────────────
  const cm = result.confidenceModel;
  const observedConf = cm?.signalConfidence || computeObservedConfidence(observed);
  const causalConf = cm?.causalConfidence || (result.causalGraph ? 40 : 15);
  const financialConf = cm?.exposureConfidence || result.exposure?.confidence || 20;
  const overall = cm?.overall || Math.round(observedConf * 0.4 + causalConf * 0.3 + financialConf * 0.3);

  // ── NO-FANTASY POLICY ─────────────────────────────
  // If overall confidence < 20, reject — never produce premium-looking but weakly grounded thesis
  if (overall < 20 && observed.length === 0) return null;

  const confidence_level = { observed: observedConf, causal: causalConf, financial: financialConf, overall };

  // ── Classified claims (certainty discipline) ──────
  const classified_claims: ClassifiedClaim[] = [
    ...observed.map(s => ({
      statement: `${s.label}: ${s.description}`,
      certainty: "OBSERVED" as CertaintyClass,
      source: s.evidence?.[0] || "Ghost Tax scan",
      confidence: 70,
      impact_eur: s.impactEurRange,
    })),
    ...inferred.map(s => ({
      statement: `${s.label}: ${s.description}`,
      certainty: "DERIVED" as CertaintyClass,
      source: s.evidence?.[0] || "Pattern analysis",
      confidence: 45,
      impact_eur: s.impactEurRange,
    })),
    ...estimated.map(s => ({
      statement: `${s.label}: ${s.description}`,
      certainty: "ESTIMATED" as CertaintyClass,
      source: "Statistical modeling",
      confidence: 25,
      impact_eur: s.impactEurRange,
    })),
  ];

  // ── Detected exposures ────────────────────────────
  const detected_exposure: ThesisExposure[] = allSignals.map(s => ({
    type: s.type,
    label: s.label,
    severity: s.severity,
    certainty: classifyCertainty(s, observed, inferred),
    description: s.description,
    impact_eur_range: s.impactEurRange,
  }));

  // ── Leak sources ──────────────────────────────────
  const likely_leak_source = buildLeakSources(result, observed);

  // ── Business consequence ──────────────────────────
  const business_consequence = result.diagnosis?.expanded || result.diagnosis?.oneLiner || "Financial exposure detected requiring further analysis.";

  // ── Annual impact ─────────────────────────────────
  const lowEur = result.exposure?.lowEur || 0;
  const highEur = result.exposure?.highEur || 0;
  const central = Math.round((lowEur + highEur) / 2);

  // ── Loss framing ──────────────────────────────────
  const { dominant_frame, secondary_frames } = selectLossFraming(result, detected_exposure);

  // ── Cost of inaction + discomfort ─────────────────
  const lv = result.lossVelocity;
  const cod = result.costOfDelay;
  const monthly = lv?.monthlyLossEur || [0, 0] as [number, number];
  const cost_of_inaction = {
    daily_eur: lv?.dailyLossEur || [0, 0] as [number, number],
    monthly_eur: monthly,
    quarterly_eur: cod?.quarterlyCostOfDelay || [0, 0] as [number, number],
    narrative: buildInactionNarrative(monthly, dominant_frame),
    why_inaction_unsafe: buildWhyInactionUnsafe(result, dominant_frame, monthly, confidence_level),
  };

  // ── Decision priority ─────────────────────────────
  const pressure = result.decisionPressureScore || 0;
  const decision_priority = {
    level: (pressure >= 60 ? "high" : pressure >= 35 ? "medium" : "low") as "low" | "medium" | "high",
    rationale: buildPriorityRationale(result, pressure),
    urgency_driver: result.executiveSnapshot?.recommendedActionPath || "Conduct full exposure analysis",
  };

  // ── Internal resistance map ───────────────────────
  const internal_resistance_map = buildResistanceMap(result, dominant_frame, detected_exposure);

  // ── Offer routing ─────────────────────────────────
  const offer = routeOffer(result, confidence_level, decision_priority, detected_exposure);

  // ── Output layers ─────────────────────────────────
  const flash_verdict = buildFlashVerdict(result, dominant_frame, lowEur, highEur);
  const control_note = buildControlNote(result, dominant_frame, lowEur, highEur, monthly, confidence_level);

  // ── Proof boundary ────────────────────────────────
  const proof_boundary = buildProofBoundary(classified_claims);

  return {
    detected_exposure,
    likely_leak_source,
    business_consequence,
    estimated_annual_impact: { low: lowEur, central, high: highEur, currency: "EUR" },
    confidence_level,
    classified_claims,
    dominant_frame,
    secondary_frames,
    cost_of_inaction,
    decision_priority,
    internal_resistance_map,
    offer,
    flash_verdict,
    control_note,
    proof_boundary,
  };
}

// ── LOSS FRAMING ────────────────────────────────────

function selectLossFraming(
  result: DecisionIntelligence,
  exposures: ThesisExposure[],
): { dominant_frame: LossFrame; secondary_frames: LossFrame[] } {
  const scores: Record<LossFrame, number> = {
    revenue_leakage: 0,
    margin_erosion: 0,
    decision_latency: 0,
    vendor_over_capture: 0,
    operational_drag: 0,
    governance_blind_spot: 0,
    escalation_risk: 0,
    compounding_inefficiency: 0,
  };

  const severityWeight = { critical: 4, high: 3, medium: 2, low: 1 };

  for (const e of exposures) {
    const w = severityWeight[e.severity] || 1;
    const t = e.type.toLowerCase();

    if (t.includes("license") || t.includes("waste") || t.includes("unused")) scores.revenue_leakage += w;
    if (t.includes("cost") || t.includes("price") || t.includes("inflation")) scores.margin_erosion += w;
    if (t.includes("overlap") || t.includes("duplicate") || t.includes("sprawl")) scores.operational_drag += w;
    if (t.includes("vendor") || t.includes("lock") || t.includes("renewal")) scores.vendor_over_capture += w;
    if (t.includes("shadow") || t.includes("governance") || t.includes("compliance")) scores.governance_blind_spot += w;
    if (t.includes("risk") || t.includes("security")) scores.escalation_risk += w;
  }

  // Boost from pressure and drift
  if ((result.decisionPressureScore || 0) > 60) scores.decision_latency += 3;
  if (result.driftMonitor?.overallDriftScore && result.driftMonitor.overallDriftScore > 30) scores.compounding_inefficiency += 2;

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]) as [LossFrame, number][];
  const dominant_frame = sorted[0][1] > 0 ? sorted[0][0] : "compounding_inefficiency";
  const secondary_frames = sorted.slice(1, 3).filter(([, s]) => s > 0).map(([f]) => f);

  return { dominant_frame, secondary_frames };
}

// ── DISCOMFORT CREATION ─────────────────────────────

function buildWhyInactionUnsafe(
  result: DecisionIntelligence,
  frame: LossFrame,
  monthly: [number, number],
  confidence: { overall: number },
): string {
  const monthly_low = Math.round(monthly[0]);
  const monthly_high = Math.round(monthly[1]);
  const drift = result.driftMonitor;

  const frameNarrative: Record<LossFrame, string> = {
    revenue_leakage: `Detected spend patterns indicate ongoing revenue leakage. At current rates, €${monthly_low.toLocaleString()}–€${monthly_high.toLocaleString()} per month exits the organization without corresponding value capture.`,
    margin_erosion: `Vendor pricing dynamics are compressing margins. Without renegotiation or consolidation, per-unit costs will continue to escalate as renewal cycles lock in higher baselines.`,
    decision_latency: `The absence of centralized spend visibility delays corrective action. Each month of delayed response compounds the exposure by allowing drift to normalize as operational baseline.`,
    vendor_over_capture: `Current vendor relationships exhibit lock-in characteristics. Auto-renewal clauses and escalation terms are structured to transfer value from the organization to suppliers.`,
    operational_drag: `Tool fragmentation creates coordination overhead across teams. This manifests as duplicated workflows, inconsistent data, and reduced operational throughput.`,
    governance_blind_spot: `Unmonitored technology adoption creates compliance and security gaps. Shadow IT detected outside formal procurement channels increases organizational risk surface.`,
    escalation_risk: `Current exposure trajectory elevates the probability of a material financial event. The longer the current state persists, the more likely it triggers board-level scrutiny.`,
    compounding_inefficiency: `Detected inefficiencies are not static. They compound as organizational complexity grows, team count increases, and vendor relationships mature into unfavorable terms.`,
  };

  let narrative = frameNarrative[frame];

  // Add drift context if available
  if (drift && drift.overallDriftScore > 30) {
    narrative += ` Drift severity: ${drift.driftSeverity}. Overall drift score: ${drift.overallDriftScore}/100. Direction: ${drift.driftDirection}.`;
  }

  // Confidence qualifier
  if (confidence.overall < 40) {
    narrative += " Note: this assessment is based on limited public data. A deeper analysis would refine these estimates.";
  }

  return narrative;
}

function buildInactionNarrative(monthly: [number, number], frame: LossFrame): string {
  const low = Math.round(monthly[0]);
  const high = Math.round(monthly[1]);
  if (low === 0 && high === 0) {
    return "Without intervention, current inefficiencies will compound as organizational complexity increases.";
  }
  return `Current trajectory: €${low.toLocaleString()}–€${high.toLocaleString()} per month in unaddressed ${frame.replace(/_/g, " ")}. Over 12 months: €${(low * 12).toLocaleString()}–€${(high * 12).toLocaleString()}.`;
}

// ── POLITICAL UTILITY ───────────────────────────────

function buildResistanceMap(
  result: DecisionIntelligence,
  frame: LossFrame,
  exposures: ThesisExposure[],
): StakeholderResistance[] {
  const topExposure = exposures[0]?.label || "technology spend exposure";
  const exposureRange = result.executiveSnapshot?.exposureRangeEur;
  const rangeStr = exposureRange ? `€${Math.round(exposureRange[0]).toLocaleString()}–€${Math.round(exposureRange[1]).toLocaleString()}` : "significant";

  return [
    {
      role: "CFO",
      likely_objection: "We already track our major vendor costs.",
      blind_spot: "Tracking invoices is not the same as detecting hidden exposure. Invoice-level visibility misses license waste, shadow procurement, and contractual drift.",
      response_angle: `This analysis identified ${rangeStr} in annual exposure that does not appear in standard cost reporting. The gap exists between invoiced amounts and realized value.`,
      supporting_proof: `OBSERVED: ${topExposure}. Standard financial reporting captures spend, not waste.`,
    },
    {
      role: "CTO / CIO",
      likely_objection: "Our IT team manages the technology stack effectively.",
      blind_spot: "Operational management focuses on uptime and functionality, not financial efficiency. License utilization, vendor overlap, and pricing drift fall outside typical IT KPIs.",
      response_angle: `The detected exposure originates from ${frame.replace(/_/g, " ")}, which is a financial governance issue, not an IT operations issue. No fault is implied.`,
      supporting_proof: `${exposures.filter(e => e.certainty === "OBSERVED").length} directly observed anomalies in the current technology footprint.`,
    },
    {
      role: "Procurement",
      likely_objection: "We negotiated competitive rates.",
      blind_spot: "Negotiated rates at signing do not account for post-signature drift: auto-renewals, seat creep, tier escalation, and vendor consolidation plays.",
      response_angle: "This is not about negotiation quality. It is about what happens between renewals. Most organizations lose 15–30% of negotiated savings to post-signature drift within 18 months.",
      supporting_proof: `Vendor capture patterns detected: auto-renewal clauses, escalation terms, and underutilized capacity.`,
    },
    {
      role: "COO",
      likely_objection: "This is an IT problem, not an operations problem.",
      blind_spot: "Technology spend is the second largest controllable cost in most mid-market organizations. Operational efficiency depends on tool utilization, not just tool availability.",
      response_angle: `Operational drag from tool fragmentation affects cross-functional throughput. The ${rangeStr} exposure includes coordination overhead, duplicated workflows, and data inconsistency costs.`,
      supporting_proof: `Tool overlap and fragmentation signals detected across multiple functional categories.`,
    },
    {
      role: "CEO / Board",
      likely_objection: "Is this material enough to warrant attention?",
      blind_spot: "Individual line items appear small. The aggregate exposure — when compounded with drift — crosses materiality thresholds within 12–18 months.",
      response_angle: `At ${rangeStr} annual exposure with compounding drift, this represents a controllable cost that directly impacts EBITDA. The Decision Pack provides a board-ready summary.`,
      supporting_proof: `Conservative estimate: ${rangeStr}/year. This is recoverable without organizational disruption or vendor replacement.`,
    },
  ];
}

// ── OFFER ROUTING ───────────────────────────────────

function routeOffer(
  result: DecisionIntelligence,
  confidence: { overall: number },
  priority: { level: string },
  exposures: ThesisExposure[],
): OfferRouting {
  const headcount = result.companyContext?.headcount || 0;
  const exposureHigh = result.exposure?.highEur || 0;
  const criticalCount = exposures.filter(e => e.severity === "critical").length;

  // Rail C: enterprise — high exposure + large org + multiple critical signals
  if (exposureHigh > 500_000 && headcount > 500 && criticalCount >= 3 && confidence.overall >= 50) {
    return {
      recommended_rail: "C",
      rationale: `Enterprise-grade exposure (€${Math.round(exposureHigh).toLocaleString()}) across ${criticalCount} critical vectors in a ${headcount}+ employee organization. Requires institutional containment protocol.`,
      price_eur: 0, // custom pricing
      label: "Enterprise Containment Protocol",
    };
  }

  // Rail B: stabilization — significant exposure + medium-large org
  if (exposureHigh > 100_000 && headcount > 100 && priority.level === "high" && confidence.overall >= 40) {
    return {
      recommended_rail: "B",
      rationale: `Exposure exceeds €100k with high decision pressure. Organization scale (${headcount} employees) warrants structured 30/60/90 stabilization.`,
      price_eur: 4990,
      label: "Stabilization Protocol 30/60/90",
    };
  }

  // Rail A: detection — default
  return {
    recommended_rail: "A",
    rationale: "Financial exposure detection provides the decision foundation. Unlock the full Decision Pack to quantify and prioritize corrective action.",
    price_eur: 490,
    label: "Financial Exposure Detection",
  };
}

// ── OUTPUT LAYERS ───────────────────────────────────

function buildFlashVerdict(
  result: DecisionIntelligence,
  frame: LossFrame,
  low: number,
  high: number,
): FlashVerdict {
  const domain = result.companyContext?.domain || "this organization";
  const frameLabel = frame.replace(/_/g, " ");

  if (high === 0) {
    return { verdict: `${domain}: insufficient data for financial thesis. Additional context required.` };
  }

  return {
    verdict: `${domain}: €${Math.round(low).toLocaleString()}–€${Math.round(high).toLocaleString()} annual exposure detected. Primary vector: ${frameLabel}.`,
  };
}

function buildControlNote(
  result: DecisionIntelligence,
  frame: LossFrame,
  low: number,
  high: number,
  monthly: [number, number],
  confidence: { overall: number },
): ControlNote {
  const frameLabel = frame.replace(/_/g, " ");
  const confGrade = confidence.overall >= 60 ? "high" : confidence.overall >= 35 ? "moderate" : "limited";

  return {
    headline: `${result.companyContext?.domain || "Organization"} — ${frameLabel} exposure requiring attention`,
    exposure_range_eur: [low, high],
    dominant_frame: frameLabel,
    consequence: result.diagnosis?.oneLiner || "Financial exposure detected in technology spend.",
    inaction_cost_monthly: monthly,
    confidence_summary: `Assessment confidence: ${confGrade} (${confidence.overall}/100). Based on ${result.proof?.observedSignals?.length || 0} observed signals, ${result.proof?.inferredSignals?.length || 0} derived patterns, ${result.proof?.estimatedSignals?.length || 0} statistical estimates.`,
    recommended_action: result.executiveSnapshot?.recommendedActionPath || "Unlock full Decision Pack for quantified action plan.",
  };
}

// ── PROOF BOUNDARY ──────────────────────────────────

function buildProofBoundary(claims: ClassifiedClaim[]): FinancialThesis["proof_boundary"] {
  // Public: OBSERVED claims + top 2 DERIVED (label only for tension)
  const public_claims: ClassifiedClaim[] = [
    ...claims.filter(c => c.certainty === "OBSERVED"),
    ...claims
      .filter(c => c.certainty === "DERIVED")
      .slice(0, 2)
      .map(c => ({ ...c, statement: c.statement.split(":")[0] })), // label only
  ];

  // Private: all claims with full detail
  const private_claims = claims;

  return {
    public_claims,
    private_claims,
    withheld_sections: [
      "Full vendor-by-vendor impact breakdown",
      "Negotiation leverage playbooks",
      "Correction protocols with 30/60/90 timeline",
      "Board-ready CFO memo",
      "CIO operational brief",
      "Procurement action summary",
      "Scenario analysis (conservative/base/aggressive)",
      "Internal resistance map with stakeholder response angles",
    ],
  };
}

// ── CONVERSION EVENT BUILDER ────────────────────────

export function buildConversionEvent(
  thesis: FinancialThesis,
  domain: string,
  tier: "preview" | "premium",
): ConversionEvent {
  const confBand = thesis.confidence_level.overall >= 60 ? "high" : thesis.confidence_level.overall >= 35 ? "moderate" : "low";
  return {
    domain,
    timestamp: new Date().toISOString(),
    dominant_loss_frame: thesis.dominant_frame,
    severity_band: thesis.decision_priority.level,
    confidence_band: confBand as "low" | "moderate" | "high",
    offer_rail_shown: thesis.offer.recommended_rail,
    tier,
    exposure_range_eur: [thesis.estimated_annual_impact.low, thesis.estimated_annual_impact.high],
    signal_count: thesis.classified_claims.length,
    observed_count: thesis.classified_claims.filter(c => c.certainty === "OBSERVED").length,
  };
}

// ── HELPERS ─────────────────────────────────────────

function classifyCertainty(signal: ProofSignal, observed: ProofSignal[], inferred: ProofSignal[]): CertaintyClass {
  if (observed.some(o => o.type === signal.type && o.label === signal.label)) return "OBSERVED";
  if (inferred.some(i => i.type === signal.type && i.label === signal.label)) return "DERIVED";
  return "ESTIMATED";
}

function computeObservedConfidence(observed: ProofSignal[]): number {
  if (observed.length === 0) return 10;
  if (observed.length === 1) return 30;
  if (observed.length <= 3) return 50;
  return Math.min(75, 50 + observed.length * 5);
}

function buildPriorityRationale(result: DecisionIntelligence, pressure: number): string {
  if (pressure >= 60) {
    const criticals = (result.proof?.observedSignals || []).filter(s => s.severity === "critical");
    return `${criticals.length} critical exposure${criticals.length > 1 ? "s" : ""} detected with high financial consequence. Delay increases cumulative loss.`;
  }
  if (pressure >= 35) return "Moderate exposure across multiple categories. Action within 90 days recommended.";
  return "Low-severity signals. Monitoring recommended. Reassess in 90 days.";
}

function buildLeakSources(result: DecisionIntelligence, observed: ProofSignal[]): LeakSource[] {
  const sources: LeakSource[] = [];
  const causal = result.causalGraph;
  if (causal) {
    const roots = causal.nodes?.filter(n => n.type === "root") || [];
    const mechanisms = causal.nodes?.filter(n => n.type === "mechanism") || [];
    for (const root of roots) {
      const mech = mechanisms.find(m => causal.edges?.some(e => e.from === root.id && e.to === m.id));
      sources.push({
        category: root.label,
        origin: causal.dominantCause || root.label,
        mechanism: mech?.label || causal.propagationChain?.[0] || "Indirect cost propagation",
        certainty: observed.length > 0 ? "OBSERVED" : "DERIVED",
      });
    }
  }
  if (sources.length === 0) {
    const allSignals = [...(result.proof?.observedSignals || []), ...(result.proof?.inferredSignals || [])];
    const top = allSignals[0];
    if (top) sources.push({ category: top.type, origin: top.label, mechanism: top.description, certainty: observed.length > 0 ? "OBSERVED" : "DERIVED" });
  }
  return sources;
}
