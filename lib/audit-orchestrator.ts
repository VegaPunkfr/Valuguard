/**
 * VALUGUARD — AUDIT ORCHESTRATOR (SERVER-ONLY)
 *
 * Sprint 3, Brique 4 : Lie enrichissement (Sprint 2) + analyse (Sprint 3).
 *
 * Pipeline :
 *   1. Récupère le DecisionMaker enrichi (Sprint 2)
 *   2. Lance shadow-cost + infrastructure scan en parallèle
 *   3. Lance revenue-intel + peer-gap en parallèle
 *   4. Agrège en AuditReportPayload (prêt pour pdf-report + chiffrement)
 *
 * Graceful degradation :
 *   - Si peer-gap échoue → rapport généré sans (peerGap: null)
 *   - Si revenue-intel échoue → fallback avec valeurs conservatrices
 *   - Seul shadow-bill est critique (pas de rapport sans)
 *
 * Usage :
 *   import { orchestrateAudit } from "@/lib/audit-orchestrator";
 *   const report = await orchestrateAudit("acme.com", { industry: "technology" });
 */

import { analyzeInfrastructure } from "@/lib/engines/shadow-bill";
import { calculateShadowCost } from "@/lib/engines/shadow-cost";
import { computeFinancialImpact } from "@/lib/engines/revenue-intel";
import { analyzePeerGap } from "@/lib/engines/peer-gap";
import { findDecisionMaker } from "@/lib/engines/enrichment";
import { saveAuditResult } from "@/lib/db/osint-storage";
import { fireSniperCampaign } from "@/lib/outreach/mailer";
import type {
  AuditReportPayload,
  ShadowBillResult,
  FinancialImpact,
  PeerGapScore,
  CompanyMetrics,
} from "@/types/audit";
import type { DecisionMaker } from "@/lib/engines/enrichment";

// ══════════════════════════════════════════════════════
//  OPTIONS
// ══════════════════════════════════════════════════════

export interface OrchestratorOptions {
  industry?: string;
  headcountOverride?: number;
  estimatedArrEur?: number;
  skipEnrichment?: boolean;
  skipPeerGap?: boolean;
  skipOutreach?: boolean;
  persist?: boolean;
  geoMarket?: string;
  companyName?: string;
}

// ══════════════════════════════════════════════════════
//  MAIN: orchestrateAudit()
// ══════════════════════════════════════════════════════

export async function orchestrateAudit(
  domain: string,
  options: OrchestratorOptions = {},
): Promise<AuditReportPayload> {
  const start = Date.now();
  const warnings: string[] = [];
  const cleanDomain = normalizeDomain(domain);

  // ── Phase 1 : Enrichissement + Infrastructure (parallel) ──
  const [enrichmentResult, infraAnalysis] = await Promise.all([
    resolveEnrichment(cleanDomain, options.skipEnrichment),
    analyzeInfrastructure(cleanDomain, options.headcountOverride),
  ]);

  const decisionMaker = enrichmentResult.target;
  if (enrichmentResult.errors.length > 0) {
    warnings.push(...enrichmentResult.errors);
  }

  // ── Phase 2 : Shadow Cost + TVAR (async — base pour tout le reste) ──
  const shadowBill = await calculateShadowCost(infraAnalysis);

  // ── Phase 3 : Revenue Intel + Peer Gap (parallel) ──
  const metrics = buildMetrics(cleanDomain, infraAnalysis, options);

  const [financialImpact, peerGap] = await Promise.all([
    safeRevenueIntel(shadowBill, metrics, warnings),
    safePeerGap(
      cleanDomain,
      options.industry ?? "default",
      infraAnalysis.detectedVendors,
      options.skipPeerGap,
      warnings,
    ),
  ]);

  // ── Phase 4 : Agrégation ──
  const urgencyScore = computeUrgencyScore(
    shadowBill, financialImpact, peerGap,
  );
  const executiveSummary = generateExecutiveSummary(
    cleanDomain, shadowBill, financialImpact, urgencyScore,
  );

  const payload: AuditReportPayload = {
    domain: cleanDomain,
    generatedAt: new Date().toISOString(),
    executionMs: Date.now() - start,
    version: "3.0",
    decisionMaker,
    shadowBill,
    financialImpact,
    peerGap,
    urgencyScore,
    executiveSummary,
    warnings,
  };

  // ── Phase 5 : Persistence optionnelle ──
  if (options.persist !== false) {
    await persistAudit(payload, options);
  }

  // ── Phase 6 : Sniper Outreach (non-fatal) ──
  if (options.skipOutreach !== true && payload.decisionMaker?.email) {
    try {
      const sniperResult = await fireSniperCampaign(payload);
      if (!sniperResult.success && sniperResult.error) {
        warnings.push(`Sniper outreach failed: ${sniperResult.error}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      warnings.push(`Sniper outreach exception: ${msg}`);
    }
  }

  return payload;
}

// ══════════════════════════════════════════════════════
//  ENRICHMENT RESOLVER
// ══════════════════════════════════════════════════════

async function resolveEnrichment(
  domain: string,
  skip?: boolean,
): Promise<{ target: DecisionMaker | null; errors: string[] }> {
  if (skip) {
    return { target: null, errors: ["Enrichment skipped by caller"] };
  }

  try {
    const result = await findDecisionMaker(domain);
    return { target: result.target, errors: result.errors };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { target: null, errors: [`Enrichment failed: ${msg}`] };
  }
}

// ══════════════════════════════════════════════════════
//  SAFE WRAPPERS (graceful degradation)
// ══════════════════════════════════════════════════════

async function safeRevenueIntel(
  shadowBill: ShadowBillResult,
  metrics: CompanyMetrics,
  warnings: string[],
): Promise<FinancialImpact> {
  try {
    return computeFinancialImpact(shadowBill, metrics);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    warnings.push(`Revenue Intel failed: ${msg}`);
    return buildFallbackFinancialImpact(metrics, shadowBill);
  }
}

// Re-export TVAR types for consumers
export type { TVARResult, TVARBreakdown, TechCategory, DetectedTech, TargetContext } from "@/types/audit";

async function safePeerGap(
  domain: string,
  industry: string,
  vendors: Array<{
    key: string;
    displayName: string;
    category: string;
    matchedSubdomain: string;
    estimatedSeats: number;
    estimatedAnnualCostEur: number;
    costPerUser: number;
    overlapGroup: string;
  }>,
  skip?: boolean,
  warnings?: string[],
): Promise<PeerGapScore | null> {
  if (skip) return null;

  try {
    return await analyzePeerGap(domain, industry, vendors);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    warnings?.push(`Peer Gap failed: ${msg}`);
    return null;
  }
}

// ══════════════════════════════════════════════════════
//  URGENCY SCORE (0-100)
// ══════════════════════════════════════════════════════

function computeUrgencyScore(
  shadowBill: ShadowBillResult,
  financialImpact: FinancialImpact,
  peerGap: PeerGapScore | null,
): number {
  let score = 0;

  // Waste factor (0-25 points)
  score += Math.min(25, Math.round(shadowBill.wasteFactor * 0.4));

  // TVAR magnitude (0-20 points) — le chiffre qui tue
  const tvarK = shadowBill.tvar.totalValueAtRisk / 1000;
  if (tvarK > 100) score += 20;
  else if (tvarK > 50) score += 15;
  else if (tvarK > 20) score += 10;
  else score += 5;

  // Redundancies (0-10 points) — preuve tangible
  score += Math.min(10, shadowBill.tvar.detectedRedundancies.length * 3);

  // Daily bleed (0-20 points)
  if (financialImpact.dailyBleedEur > 500) score += 20;
  else if (financialImpact.dailyBleedEur > 200) score += 14;
  else if (financialImpact.dailyBleedEur > 50) score += 8;
  else score += 3;

  // EBITDA impact (0-15 points)
  score += Math.min(15, Math.round(financialImpact.ebitdaImpactPoints * 3));

  // Peer gap (0-10 points)
  if (peerGap) {
    score += Math.min(10, Math.round(peerGap.gapScore * 0.15));
  }

  return Math.min(100, Math.max(0, score));
}

// ══════════════════════════════════════════════════════
//  EXECUTIVE SUMMARY (1 phrase choc CFO)
// ══════════════════════════════════════════════════════

function generateExecutiveSummary(
  domain: string,
  shadowBill: ShadowBillResult,
  financialImpact: FinancialImpact,
  urgencyScore: number,
): string {
  const tvarK = Math.round(shadowBill.tvar.totalValueAtRisk / 1000);
  const wasteK = Math.round(shadowBill.totalWasteEur / 1000);
  const daily = financialImpact.dailyBleedEur;
  const ebitda = financialImpact.ebitdaImpactPoints;
  const redundancies = shadowBill.tvar.detectedRedundancies.length;

  if (urgencyScore >= 70) {
    return `${domain} : TVAR ${tvarK}k EUR/mois — ${wasteK}k EUR/an de gaspillage SaaS, ${redundancies} redondance(s), ${daily} EUR/jour d'hémorragie, ${ebitda} pts d'EBITDA impactés. Intervention immédiate requise.`;
  }
  if (urgencyScore >= 40) {
    return `${domain} : Valeur Totale à Risque ${tvarK}k EUR/mois — ${wasteK}k EUR/an non optimisé (${daily} EUR/jour). Impact EBITDA : ${ebitda} pts. Audit correctif recommandé sous 30 jours.`;
  }
  const recovK = Math.round(
    financialImpact.recoveryPotential90DaysEur / 1000,
  );
  return `${domain} : TVAR ${tvarK}k EUR/mois — ${wasteK}k EUR/an d'optimisation identifiée. Potentiel récupérable à 90 jours : ${recovK}k EUR.`;
}

// ══════════════════════════════════════════════════════
//  PERSISTENCE
// ══════════════════════════════════════════════════════

async function persistAudit(
  payload: AuditReportPayload,
  options: OrchestratorOptions,
): Promise<void> {
  try {
    await saveAuditResult(
      payload.domain,
      payload.shadowBill.sourceAnalysis,
      {
        status: "AUDITED",
        geoMarket: options.geoMarket,
        companyName: options.companyName ?? payload.domain,
        decisionMaker: payload.decisionMaker,
        enrichmentSource: payload.decisionMaker?.source,
      },
    );
  } catch (err) {
    console.error(
      "[Orchestrator] Persistence failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

// ══════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════

function normalizeDomain(domain: string): string {
  return domain
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .toLowerCase();
}

function buildMetrics(
  domain: string,
  infra: { estimatedHeadcount: number },
  options: OrchestratorOptions,
): CompanyMetrics {
  return {
    domain,
    estimatedHeadcount: options.headcountOverride ?? infra.estimatedHeadcount,
    industry: options.industry ?? "default",
    estimatedArrEur: options.estimatedArrEur,
  };
}

function buildFallbackFinancialImpact(
  metrics: CompanyMetrics,
  shadowBill: ShadowBillResult,
): FinancialImpact {
  const waste = shadowBill.totalWasteEur;
  return {
    domain: metrics.domain,
    computedAt: new Date().toISOString(),
    revenueAtRiskEur: waste,
    revenueAtRiskLowEur: Math.round(waste * 0.65),
    revenueAtRiskHighEur: Math.round(waste * 1.45),
    ebitdaImpactPoints: 0,
    inactionCost12MonthsEur: Math.round(waste * 1.15),
    dailyBleedEur: Math.round(waste / 365),
    wastePerEmployeeEur: metrics.estimatedHeadcount > 0
      ? Math.round(waste / metrics.estimatedHeadcount)
      : 0,
    recoveryPotential90DaysEur: Math.round(waste * 0.30),
    confidence: 20,
  };
}
