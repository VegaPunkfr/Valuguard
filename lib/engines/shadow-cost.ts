/**
 * VALUGUARD — SHADOW COST ENGINE (SERVER-ONLY)
 *
 * Sprint 3, Brique 1 : Calcule la dette technique et le gaspillage financier.
 *
 * Entrée : InfrastructureAnalysis (Sprint 1)
 * Sortie  : ShadowBillResult (ventilation par catégorie, waste factor, top drivers)
 *
 * Le shadow-bill.ts existant détecte les vendors + calcule le waste brut.
 * Ce module ajoute la couche d'analyse financière avancée :
 *   - Ventilation par catégorie fonctionnelle
 *   - Shadow IT surcharge (non-détecté estimé)
 *   - Score de maturité infrastructure
 *   - Top 3 waste drivers (format CFO-ready)
 *
 * Usage:
 *   import { calculateShadowCost } from "@/lib/engines/shadow-cost";
 *   const result = calculateShadowCost(infrastructureAnalysis);
 */

import type { InfrastructureAnalysis, DetectedVendor } from "@/lib/engines/shadow-bill";
import { computeTVARFromAnalysis } from "@/lib/engines/shadow-bill";
import type {
  ShadowBillResult,
  CostCategory,
  WasteDriver,
  TVARResult,
} from "@/types/audit";

// ══════════════════════════════════════════════════════
//  BENCHMARK — Coûts moyens standards 2026 (EUR/an)
//  Source: Gartner IT Key Metrics 2026, Flexera SaaS Trends
// ══════════════════════════════════════════════════════

const CATEGORY_BENCHMARKS: Record<string, {
  optimalCostPerUser: number;
  wasteTolerance: number;     // % acceptable
  maturityWeight: number;     // Poids dans le score maturité
}> = {
  CRM:           { optimalCostPerUser: 800,   wasteTolerance: 0.15, maturityWeight: 12 },
  ERP:           { optimalCostPerUser: 2_500, wasteTolerance: 0.10, maturityWeight: 15 },
  HR:            { optimalCostPerUser: 80,    wasteTolerance: 0.20, maturityWeight: 8 },
  Identity:      { optimalCostPerUser: 50,    wasteTolerance: 0.10, maturityWeight: 10 },
  Communication: { optimalCostPerUser: 80,    wasteTolerance: 0.20, maturityWeight: 5 },
  Productivity:  { optimalCostPerUser: 100,   wasteTolerance: 0.25, maturityWeight: 8 },
  Observability: { optimalCostPerUser: 1_500, wasteTolerance: 0.15, maturityWeight: 10 },
  Support:       { optimalCostPerUser: 400,   wasteTolerance: 0.20, maturityWeight: 7 },
  Data:          { optimalCostPerUser: 2_000, wasteTolerance: 0.15, maturityWeight: 10 },
  Security:      { optimalCostPerUser: 150,   wasteTolerance: 0.10, maturityWeight: 15 },
  Design:        { optimalCostPerUser: 100,   wasteTolerance: 0.30, maturityWeight: 3 },
  Finance:       { optimalCostPerUser: 5_000, wasteTolerance: 0.10, maturityWeight: 10 },
  DevTools:      { optimalCostPerUser: 200,   wasteTolerance: 0.25, maturityWeight: 5 },
  Marketing:     { optimalCostPerUser: 300,   wasteTolerance: 0.25, maturityWeight: 5 },
  AI:            { optimalCostPerUser: 200,   wasteTolerance: 0.20, maturityWeight: 8 },
};

// ══════════════════════════════════════════════════════
//  MAIN: calculateShadowCost()
// ══════════════════════════════════════════════════════

export async function calculateShadowCost(
  analysis: InfrastructureAnalysis,
  tvarOverrides?: {
    monthlyRevenue?: number;
    peerGapScore?: number;
    vulnerabilityScore?: number;
  },
): Promise<ShadowBillResult> {
  const categories = buildCategoryBreakdown(analysis);
  const shadowIt = estimateShadowItSurcharge(analysis);
  const maturity = computeMaturityScore(analysis, categories);
  const topDrivers = extractTopWasteDrivers(analysis, categories);

  // ── TVAR Engine ──
  const tvar = await computeTVARFromAnalysis(analysis, tvarOverrides);

  const totalWaste = analysis.totalWasteEur + shadowIt;
  const totalSpend = analysis.totalEstimatedSpendEur + shadowIt;
  const wasteFactor = totalSpend > 0
    ? Math.min(100, Math.round((totalWaste / totalSpend) * 100))
    : 0;

  return {
    domain: analysis.domain,
    computedAt: new Date().toISOString(),
    totalAnnualSpendEur: totalSpend,
    totalWasteEur: totalWaste,
    wasteFactor,
    tvar,
    categories,
    topWasteDrivers: topDrivers,
    shadowItSurchargeEur: shadowIt,
    infraMaturityScore: maturity,
    sourceAnalysis: analysis,
  };
}

// ══════════════════════════════════════════════════════
//  CATEGORY BREAKDOWN
// ══════════════════════════════════════════════════════

function buildCategoryBreakdown(
  analysis: InfrastructureAnalysis,
): CostCategory[] {
  const grouped = groupVendorsByCategory(analysis.detectedVendors);
  const overlapMap = buildOverlapWasteMap(analysis);

  return Array.from(grouped.entries()).map(([category, vendors]) => {
    const annualSpend = vendors.reduce((s, v) => s + v.estimatedAnnualCostEur, 0);
    const overlapWaste = vendors.reduce(
      (s, v) => s + (overlapMap.get(v.key) ?? 0), 0,
    );
    const benchmark = CATEGORY_BENCHMARKS[category];
    const underUtilWaste = Math.round(annualSpend * 0.15);
    const wasteEur = overlapWaste + underUtilWaste;
    const wastePercent = annualSpend > 0
      ? Math.round((wasteEur / annualSpend) * 100)
      : 0;

    return {
      category,
      vendorCount: vendors.length,
      vendors: vendors.map((v) => v.displayName),
      annualSpendEur: annualSpend,
      wasteEur,
      wastePercent: Math.min(100, wastePercent),
    };
  }).sort((a, b) => b.wasteEur - a.wasteEur);
}

function groupVendorsByCategory(
  vendors: DetectedVendor[],
): Map<string, DetectedVendor[]> {
  const map = new Map<string, DetectedVendor[]>();
  for (const v of vendors) {
    const list = map.get(v.category) || [];
    list.push(v);
    map.set(v.category, list);
  }
  return map;
}

/** Distribue le waste des overlaps aux vendors individuels */
function buildOverlapWasteMap(
  analysis: InfrastructureAnalysis,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const overlap of analysis.overlaps) {
    if (overlap.vendors.length < 2) continue;
    // Répartir le waste équitablement entre les vendors redondants (sauf le principal)
    const perVendor = Math.round(
      overlap.redundantSpendEur / (overlap.vendors.length - 1),
    );
    // Attribuer aux vendors non-principaux
    for (let i = 1; i < overlap.vendors.length; i++) {
      const vendor = analysis.detectedVendors.find(
        (v) => v.displayName === overlap.vendors[i],
      );
      if (vendor) {
        map.set(vendor.key, (map.get(vendor.key) ?? 0) + perVendor);
      }
    }
  }
  return map;
}

// ══════════════════════════════════════════════════════
//  SHADOW IT SURCHARGE
// ══════════════════════════════════════════════════════

/**
 * Estime le coût du Shadow IT non détecté.
 *
 * Heuristique : plus l'entreprise est grande et moins on détecte
 * de catégories, plus le shadow IT est probable.
 * Gartner 2025 : 30-40% du budget IT est shadow.
 */
function estimateShadowItSurcharge(
  analysis: InfrastructureAnalysis,
): number {
  const totalCategories = Object.keys(CATEGORY_BENCHMARKS).length;
  const detectedCategories = analysis.categoriesDetected.length;
  const coverageRatio = detectedCategories / totalCategories;

  // Ratio de shadow IT : inversement proportionnel à la couverture
  // Plus on détecte de catégories, moins le shadow IT est important
  const shadowRatio = Math.max(0.10, 0.35 * (1 - coverageRatio));

  // Appliqué au spend détecté
  return Math.round(analysis.totalEstimatedSpendEur * shadowRatio);
}

// ══════════════════════════════════════════════════════
//  MATURITY SCORE
// ══════════════════════════════════════════════════════

/**
 * Score de maturité infrastructure (0-100).
 *
 * Facteurs positifs : couverture catégories, SSO, observabilité
 * Facteurs négatifs : overlaps, waste élevé, shadow IT
 */
function computeMaturityScore(
  analysis: InfrastructureAnalysis,
  categories: CostCategory[],
): number {
  let score = 50; // Base neutre

  // Bonus : couverture catégories critiques
  const criticalCats = ["Identity", "Security", "Observability"];
  for (const cat of criticalCats) {
    if (analysis.categoriesDetected.includes(cat)) score += 8;
  }

  // Bonus : variété de catégories
  score += Math.min(15, analysis.categoriesDetected.length * 2);

  // Malus : overlaps
  score -= Math.min(20, analysis.overlaps.length * 6);

  // Malus : waste factor élevé
  if (analysis.wastePercentage > 30) score -= 15;
  else if (analysis.wastePercentage > 20) score -= 8;

  // Malus : très peu de vendors (sous-investissement)
  if (analysis.vendorCount < 3) score -= 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ══════════════════════════════════════════════════════
//  TOP WASTE DRIVERS
// ══════════════════════════════════════════════════════

function extractTopWasteDrivers(
  analysis: InfrastructureAnalysis,
  categories: CostCategory[],
): WasteDriver[] {
  const drivers: WasteDriver[] = [];

  // Driver 1 : Overlaps (si existent)
  if (analysis.overlaps.length > 0) {
    const totalOverlapWaste = analysis.overlapWasteEur;
    drivers.push({
      label: `${analysis.overlaps.length} chevauchements SaaS détectés`,
      annualWasteEur: totalOverlapWaste,
      explanation: analysis.overlaps
        .map((o) => `${o.vendors.join(" + ")} (${o.group})`)
        .join(", "),
      severity: totalOverlapWaste > 50_000 ? "critical" : "high",
    });
  }

  // Driver 2 : Sous-utilisation globale
  if (analysis.underUtilizationWasteEur > 0) {
    drivers.push({
      label: "Licences sous-utilisées (benchmark industrie 15%)",
      annualWasteEur: analysis.underUtilizationWasteEur,
      explanation: `${analysis.vendorCount} outils × estimation conservatrice 15% de sous-utilisation`,
      severity: analysis.underUtilizationWasteEur > 30_000 ? "high" : "medium",
    });
  }

  // Driver 3 : Catégorie la plus coûteuse en waste
  const topCat = categories[0];
  if (topCat && topCat.wasteEur > 0 && drivers.length < 3) {
    drivers.push({
      label: `Catégorie ${topCat.category} — surcoût détecté`,
      annualWasteEur: topCat.wasteEur,
      explanation: `${topCat.vendorCount} outil(s) : ${topCat.vendors.join(", ")} — ${topCat.wastePercent}% de waste`,
      severity: topCat.wastePercent > 35 ? "critical" : "medium",
    });
  }

  return drivers
    .sort((a, b) => b.annualWasteEur - a.annualWasteEur)
    .slice(0, 3);
}
