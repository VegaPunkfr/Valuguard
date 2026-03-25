/**
 * GHOST TAX — SEVERITY ROUTER (SERVER-ONLY)
 *
 * Routes prospects based on Financial Thesis.
 * Builds tier-appropriate outputs with certainty discipline.
 */

import type { DecisionIntelligence } from "@/lib/analysis";
import {
  buildFinancialThesis,
  buildConversionEvent,
  type FinancialThesis,
  type ConversionEvent,
} from "@/lib/financial-thesis";

// ── Types ───────────────────────────────────────────

export type SeverityTier = "reject" | "preview" | "premium";

export interface SeverityResult {
  tier: SeverityTier;
  thesis: FinancialThesis | null;
  conversionEvent: ConversionEvent | null;
  reason: string;
}

export interface RejectResponse {
  tier: "reject";
  reason: string;
  suggestion: string;
}

// ── Route Prospect ──────────────────────────────────

export function routeProspect(result: DecisionIntelligence): SeverityResult {
  const thesis = buildFinancialThesis(result);

  if (!thesis) {
    return { tier: "reject", thesis: null, conversionEvent: null, reason: "Insufficient evidence to form a financial thesis." };
  }

  const { confidence_level, classified_claims, decision_priority } = thesis;
  const observedCount = classified_claims.filter(c => c.certainty === "OBSERVED").length;

  // NO-FANTASY POLICY: never produce premium-looking output with weak grounding
  if (confidence_level.overall < 25) {
    return { tier: "reject", thesis: null, conversionEvent: null, reason: `Confidence too low (${confidence_level.overall}/100) for credible output. No-fantasy policy applied.` };
  }

  // Premium: strong thesis with observed grounding
  if (confidence_level.overall >= 40 && observedCount >= 2) {
    const event = buildConversionEvent(thesis, result.companyContext?.domain || "", "premium");
    return {
      tier: "premium",
      thesis,
      conversionEvent: event,
      reason: `${classified_claims.length} claims. ${observedCount} OBSERVED. Confidence: ${confidence_level.overall}/100. Priority: ${decision_priority.level}.`,
    };
  }

  // Preview: thesis exists but lacks full observed grounding
  const event = buildConversionEvent(thesis, result.companyContext?.domain || "", "preview");
  return {
    tier: "preview",
    thesis,
    conversionEvent: event,
    reason: `Thesis formed. Confidence: ${confidence_level.overall}/100. ${observedCount} OBSERVED fact(s). Full analysis recommended.`,
  };
}

// ── Reject builder ──────────────────────────────────

export function buildRejectResponse(): RejectResponse {
  return {
    tier: "reject",
    reason: "Insufficient public signal density for this domain.",
    suggestion: "Provide additional context (industry, headcount, monthly SaaS spend) to improve diagnostic accuracy.",
  };
}

// ── Preview Output (discomfort, not information) ────

export interface PreviewOutput {
  tier: "preview";
  flash_verdict: string;
  control_note: {
    headline: string;
    exposure_range_eur: [number, number];
    dominant_frame: string;
    consequence: string;
    inaction_cost_monthly: [number, number];
    confidence_summary: string;
  };
  why_inaction_unsafe: string;
  public_claims: Array<{
    statement: string;
    certainty: string;
    confidence: number;
  }>;
  offer: {
    recommended_rail: string;
    label: string;
    price_eur: number;
    rationale: string;
  };
  withheld_sections: string[];
}

export function buildPreviewOutput(thesis: FinancialThesis): PreviewOutput {
  return {
    tier: "preview",
    flash_verdict: thesis.flash_verdict.verdict,
    control_note: {
      headline: thesis.control_note.headline,
      exposure_range_eur: thesis.control_note.exposure_range_eur,
      dominant_frame: thesis.control_note.dominant_frame,
      consequence: thesis.control_note.consequence,
      inaction_cost_monthly: thesis.control_note.inaction_cost_monthly,
      confidence_summary: thesis.control_note.confidence_summary,
    },
    why_inaction_unsafe: thesis.cost_of_inaction.why_inaction_unsafe,
    public_claims: thesis.proof_boundary.public_claims.map(c => ({
      statement: c.statement,
      certainty: c.certainty,
      confidence: c.confidence,
    })),
    offer: {
      recommended_rail: thesis.offer.recommended_rail,
      label: thesis.offer.label,
      price_eur: thesis.offer.price_eur,
      rationale: thesis.offer.rationale,
    },
    withheld_sections: thesis.proof_boundary.withheld_sections,
  };
}

// ── Premium Output (political utility + full thesis) ─

export interface PremiumOutput {
  tier: "premium";
  flash_verdict: string;
  control_note: {
    headline: string;
    exposure_range_eur: [number, number];
    dominant_frame: string;
    consequence: string;
    inaction_cost_monthly: [number, number];
    confidence_summary: string;
    recommended_action: string;
  };
  why_inaction_unsafe: string;
  classified_claims: Array<{
    statement: string;
    certainty: string;
    confidence: number;
    impact_eur: [number, number] | null;
  }>;
  internal_resistance_map: Array<{
    role: string;
    likely_objection: string;
    blind_spot: string;
    response_angle: string;
    supporting_proof: string;
  }>;
  offer: {
    recommended_rail: string;
    label: string;
    price_eur: number;
    rationale: string;
  };
  withheld_sections: string[];
}

export function buildPremiumOutput(thesis: FinancialThesis): PremiumOutput {
  return {
    tier: "premium",
    flash_verdict: thesis.flash_verdict.verdict,
    control_note: {
      headline: thesis.control_note.headline,
      exposure_range_eur: thesis.control_note.exposure_range_eur,
      dominant_frame: thesis.control_note.dominant_frame,
      consequence: thesis.control_note.consequence,
      inaction_cost_monthly: thesis.control_note.inaction_cost_monthly,
      confidence_summary: thesis.control_note.confidence_summary,
      recommended_action: thesis.control_note.recommended_action,
    },
    why_inaction_unsafe: thesis.cost_of_inaction.why_inaction_unsafe,
    classified_claims: thesis.proof_boundary.public_claims.map(c => ({
      statement: c.statement,
      certainty: c.certainty,
      confidence: c.confidence,
      impact_eur: c.impact_eur,
    })),
    internal_resistance_map: thesis.internal_resistance_map,
    offer: {
      recommended_rail: thesis.offer.recommended_rail,
      label: thesis.offer.label,
      price_eur: thesis.offer.price_eur,
      rationale: thesis.offer.rationale,
    },
    withheld_sections: thesis.proof_boundary.withheld_sections,
  };
}
