/**
 * VALUGUARD — REVENUE INTELLIGENCE ENGINE (SERVER-ONLY)
 *
 * Sprint 3, Brique 2 : Traduit le Shadow Cost en impact financier direct.
 *
 * Entrée : ShadowBillResult + CompanyMetrics
 * Sortie  : FinancialImpact (Revenue At Risk, EBITDA impact, projections 12 mois)
 *
 * Modèle de calcul :
 *   - Revenue At Risk = f(waste, industry margin, headcount)
 *   - EBITDA Impact = waste / estimated revenue × 100
 *   - Inaction Cost = waste × compound growth factor (12 mois)
 *   - Recovery Potential = waste × recovery rate (90 jours)
 *
 * Doctrine : fourchettes, jamais de point estimates. Confidence ≤ 85.
 *
 * Usage:
 *   import { computeFinancialImpact } from "@/lib/engines/revenue-intel";
 *   const impact = computeFinancialImpact(shadowBill, metrics);
 */

import type {
  ShadowBillResult,
  CompanyMetrics,
  FinancialImpact,
} from "@/types/audit";

// ══════════════════════════════════════════════════════
//  INDUSTRY BENCHMARKS 2026
//  Source: McKinsey Global IT Spending, Gartner Key Metrics
// ══════════════════════════════════════════════════════

interface IndustryProfile {
  /** Revenu moyen par employé (EUR/an) */
  revenuePerEmployee: number;
  /** Marge EBITDA typique (0-1) */
  ebitdaMargin: number;
  /** Budget IT en % du CA */
  itBudgetRatio: number;
  /** Facteur de croissance du waste si inaction (annuel) */
  wasteGrowthFactor: number;
  /** Taux de récupération réaliste à 90 jours */
  recoveryRate90Days: number;
}

const INDUSTRY_PROFILES: Record<string, IndustryProfile> = {
  "technology":       { revenuePerEmployee: 280_000, ebitdaMargin: 0.22, itBudgetRatio: 0.08, wasteGrowthFactor: 1.18, recoveryRate90Days: 0.35 },
  "saas":             { revenuePerEmployee: 250_000, ebitdaMargin: 0.18, itBudgetRatio: 0.12, wasteGrowthFactor: 1.22, recoveryRate90Days: 0.40 },
  "fintech":          { revenuePerEmployee: 320_000, ebitdaMargin: 0.20, itBudgetRatio: 0.10, wasteGrowthFactor: 1.20, recoveryRate90Days: 0.35 },
  "financial":        { revenuePerEmployee: 350_000, ebitdaMargin: 0.25, itBudgetRatio: 0.07, wasteGrowthFactor: 1.15, recoveryRate90Days: 0.30 },
  "healthcare":       { revenuePerEmployee: 200_000, ebitdaMargin: 0.15, itBudgetRatio: 0.05, wasteGrowthFactor: 1.12, recoveryRate90Days: 0.25 },
  "retail":           { revenuePerEmployee: 180_000, ebitdaMargin: 0.08, itBudgetRatio: 0.03, wasteGrowthFactor: 1.10, recoveryRate90Days: 0.30 },
  "manufacturing":    { revenuePerEmployee: 220_000, ebitdaMargin: 0.12, itBudgetRatio: 0.04, wasteGrowthFactor: 1.08, recoveryRate90Days: 0.25 },
  "consulting":       { revenuePerEmployee: 200_000, ebitdaMargin: 0.18, itBudgetRatio: 0.06, wasteGrowthFactor: 1.15, recoveryRate90Days: 0.35 },
  "ecommerce":        { revenuePerEmployee: 300_000, ebitdaMargin: 0.10, itBudgetRatio: 0.09, wasteGrowthFactor: 1.20, recoveryRate90Days: 0.35 },
  "media":            { revenuePerEmployee: 150_000, ebitdaMargin: 0.12, itBudgetRatio: 0.06, wasteGrowthFactor: 1.12, recoveryRate90Days: 0.30 },
  "default":          { revenuePerEmployee: 220_000, ebitdaMargin: 0.15, itBudgetRatio: 0.06, wasteGrowthFactor: 1.15, recoveryRate90Days: 0.30 },
};

// ══════════════════════════════════════════════════════
//  MAIN: computeFinancialImpact()
// ══════════════════════════════════════════════════════

export function computeFinancialImpact(
  shadowBill: ShadowBillResult,
  metrics: CompanyMetrics,
): FinancialImpact {
  const profile = resolveIndustryProfile(metrics.industry);
  const headcount = metrics.estimatedHeadcount;
  const estimatedRevenue = metrics.estimatedArrEur
    ?? estimateRevenue(headcount, profile);

  const revenueAtRisk = computeRevenueAtRisk(
    shadowBill, estimatedRevenue, profile,
  );
  const ebitdaImpact = computeEbitdaImpact(
    shadowBill.totalWasteEur, estimatedRevenue, profile,
  );
  const inactionCost = computeInactionCost(
    shadowBill.totalWasteEur, profile,
  );
  const recoveryPotential = computeRecoveryPotential(
    shadowBill.totalWasteEur, profile,
  );
  const confidence = computeConfidence(shadowBill, metrics);

  return {
    domain: metrics.domain,
    computedAt: new Date().toISOString(),
    revenueAtRiskEur: revenueAtRisk.mid,
    revenueAtRiskLowEur: revenueAtRisk.low,
    revenueAtRiskHighEur: revenueAtRisk.high,
    ebitdaImpactPoints: ebitdaImpact,
    inactionCost12MonthsEur: inactionCost,
    dailyBleedEur: Math.round(shadowBill.totalWasteEur / 365),
    wastePerEmployeeEur: headcount > 0
      ? Math.round(shadowBill.totalWasteEur / headcount)
      : 0,
    recoveryPotential90DaysEur: recoveryPotential,
    confidence,
  };
}

// ══════════════════════════════════════════════════════
//  REVENUE AT RISK — Fourchette [low, mid, high]
// ══════════════════════════════════════════════════════

function computeRevenueAtRisk(
  shadowBill: ShadowBillResult,
  estimatedRevenue: number,
  profile: IndustryProfile,
): { low: number; mid: number; high: number } {
  // Le waste IT impacte le revenu via :
  // 1. Coût direct (gaspillage pur)
  // 2. Coût d'opportunité (budget IT mal alloué → innovation perdue)
  // 3. Friction opérationnelle (overlaps → productivité réduite)

  const directCost = shadowBill.totalWasteEur;
  const opportunityCost = Math.round(directCost * 0.40);
  const frictionCost = Math.round(
    shadowBill.sourceAnalysis.overlaps.length * 8_000,
  );

  const mid = directCost + opportunityCost + frictionCost;
  const low = Math.round(mid * 0.65);
  const high = Math.round(mid * 1.45);

  return { low, mid, high };
}

// ══════════════════════════════════════════════════════
//  EBITDA IMPACT
// ══════════════════════════════════════════════════════

function computeEbitdaImpact(
  totalWaste: number,
  estimatedRevenue: number,
  profile: IndustryProfile,
): number {
  if (estimatedRevenue <= 0) return 0;

  // Waste en points d'EBITDA
  const impactRatio = totalWaste / estimatedRevenue;
  const points = impactRatio * 100;

  // Cap à 15 points — au-delà, c'est de la science-fiction
  return Math.min(15, Math.round(points * 100) / 100);
}

// ══════════════════════════════════════════════════════
//  INACTION COST — Projection 12 mois composée
// ══════════════════════════════════════════════════════

function computeInactionCost(
  currentWaste: number,
  profile: IndustryProfile,
): number {
  // Le waste croît de manière composée :
  // - Renouvellements automatiques (escalation prix 5-15%/an)
  // - Accumulation de shadow IT
  // - Expansion des seats non contrôlée

  let cumulative = 0;
  let monthlyWaste = currentWaste / 12;

  for (let month = 1; month <= 12; month++) {
    monthlyWaste *= Math.pow(profile.wasteGrowthFactor, 1 / 12);
    cumulative += monthlyWaste;
  }

  return Math.round(cumulative);
}

// ══════════════════════════════════════════════════════
//  RECOVERY POTENTIAL — 90 jours
// ══════════════════════════════════════════════════════

function computeRecoveryPotential(
  totalWaste: number,
  profile: IndustryProfile,
): number {
  // Quick wins réalistes en 90 jours :
  // - Résiliation des overlaps évidents
  // - Renégociation des contrats à renouvellement proche
  // - Suppression des licences zombie
  return Math.round(totalWaste * profile.recoveryRate90Days);
}

// ══════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════

function resolveIndustryProfile(industry: string): IndustryProfile {
  const key = industry.toLowerCase().replace(/[^a-z]/g, "");
  return INDUSTRY_PROFILES[key] ?? INDUSTRY_PROFILES["default"];
}

function estimateRevenue(
  headcount: number,
  profile: IndustryProfile,
): number {
  return Math.round(headcount * profile.revenuePerEmployee);
}

function computeConfidence(
  shadowBill: ShadowBillResult,
  metrics: CompanyMetrics,
): number {
  let confidence = 20;

  // Plus on a de vendors détectés, plus on est précis
  confidence += Math.min(25, shadowBill.sourceAnalysis.vendorCount * 4);

  // ARR fourni par l'utilisateur = boost confiance
  if (metrics.estimatedArrEur) confidence += 15;

  // Headcount élevé = plus fiable (loi des grands nombres)
  if (metrics.estimatedHeadcount > 200) confidence += 10;
  else if (metrics.estimatedHeadcount > 50) confidence += 5;

  // Catégories variées = meilleure vision
  confidence += Math.min(10, shadowBill.sourceAnalysis.categoriesDetected.length * 2);

  // Doctrine : cap à 85
  return Math.min(85, confidence);
}
