/**
 * VALUGUARD — SPRINT 3 AUDIT TYPES (SHARED)
 *
 * Types centraux pour le moteur d'asymétrie commerciale.
 * Importés par shadow-bill, revenue-intel, peer-gap, orchestrator.
 *
 * Inclut le moteur TVAR (Total Value At Risk) :
 *   TVAR = Gaspillage Tech + Perte Performance + Risque Sécurité
 */

import type { InfrastructureAnalysis, DetectedVendor } from "@/lib/engines/shadow-bill";
import type { DecisionMaker } from "@/lib/engines/enrichment";

// ══════════════════════════════════════════════════════
//  TVAR — TOTAL VALUE AT RISK (Moteur Financier)
// ══════════════════════════════════════════════════════

export type TechCategory = "CRM" | "CLOUD" | "MARKETING" | "DATA" | "SECURITY"
  | "ERP" | "HR" | "IDENTITY" | "COMMUNICATION" | "PRODUCTIVITY"
  | "OBSERVABILITY" | "SUPPORT" | "DESIGN" | "FINANCE" | "DEVTOOLS" | "AI";

export interface DetectedTech {
  id: string;
  name: string;
  category: TechCategory;
  estimatedMonthlyCost: number;
}

export interface TargetContext {
  estimatedMonthlyRevenue: number;
  peerGapScore: number;            // 0-1
  vulnerabilityScore: number;      // 0-1
}

export interface TVARBreakdown {
  techWaste: number;
  performanceLoss: number;
  securityRiskExposure: number;
}

export interface TVARResult {
  totalValueAtRisk: number;
  breakdown: TVARBreakdown;
  detectedRedundancies: string[];
}

// ══════════════════════════════════════════════════════
//  SHADOW BILL RESULT
// ══════════════════════════════════════════════════════

/** Ventilation du coût par catégorie fonctionnelle */
export interface CostCategory {
  category: string;
  vendorCount: number;
  vendors: string[];
  annualSpendEur: number;
  wasteEur: number;
  wastePercent: number;
}

/** Résultat complet du moteur Shadow Cost */
export interface ShadowBillResult {
  domain: string;
  computedAt: string;

  /** Dépense totale détectée (EUR/an) */
  totalAnnualSpendEur: number;
  /** Gaspillage total (EUR/an) */
  totalWasteEur: number;
  /** Waste Factor global (0-100) */
  wasteFactor: number;

  /** TVAR — Total Value At Risk (EUR/mois) */
  tvar: TVARResult;

  /** Ventilation par catégorie */
  categories: CostCategory[];

  /** Top 3 postes de gaspillage (pour le choc CFO) */
  topWasteDrivers: WasteDriver[];

  /** Shadow IT non-cartographié — coût estimé additionnel */
  shadowItSurchargeEur: number;

  /** Score de maturité infra (0-100, 100 = optimal) */
  infraMaturityScore: number;

  /** Données sources */
  sourceAnalysis: InfrastructureAnalysis;
}

export interface WasteDriver {
  label: string;
  annualWasteEur: number;
  explanation: string;
  severity: "critical" | "high" | "medium" | "low";
}

// ══════════════════════════════════════════════════════
//  FINANCIAL IMPACT (REVENUE INTEL)
// ══════════════════════════════════════════════════════

export interface CompanyMetrics {
  domain: string;
  estimatedHeadcount: number;
  industry: string;
  estimatedArrEur?: number;
}

export interface FinancialImpact {
  domain: string;
  computedAt: string;

  /** Revenu en danger (EUR/an) — perte directe liée au waste */
  revenueAtRiskEur: number;
  /** Fourchette basse */
  revenueAtRiskLowEur: number;
  /** Fourchette haute */
  revenueAtRiskHighEur: number;

  /** Impact EBITDA (points de pourcentage perdus) */
  ebitdaImpactPoints: number;

  /** Projection 12 mois si inaction (EUR cumulés perdus) */
  inactionCost12MonthsEur: number;

  /** Coût journalier de l'inaction */
  dailyBleedEur: number;

  /** Ratio waste/headcount (EUR gaspillés par employé) */
  wastePerEmployeeEur: number;

  /** Potentiel de récupération à 90 jours (EUR) */
  recoveryPotential90DaysEur: number;

  /** Confidence (0-85, doctrine) */
  confidence: number;
}

// ══════════════════════════════════════════════════════
//  PEER GAP (ANALYSE CONCURRENTIELLE)
// ══════════════════════════════════════════════════════

export interface PeerCompany {
  name: string;
  domain: string;
  techMaturityScore: number;
  stackAdvantages: string[];
}

export interface PeerGapScore {
  domain: string;
  computedAt: string;

  /** Score de retard technologique (0-100, 0 = en avance, 100 = retard critique) */
  gapScore: number;
  /** Interprétation humaine */
  gapVerdict: "leader" | "aligned" | "lagging" | "critical";

  /** Concurrents benchmarkés */
  peers: PeerCompany[];

  /** Catégories où la cible est en retard */
  gapCategories: GapCategory[];

  /** Coût estimé du retard (EUR/an) */
  competitiveRiskEur: number;

  /** Confidence (0-85) */
  confidence: number;
}

export interface GapCategory {
  category: string;
  targetStatus: "absent" | "outdated" | "adequate" | "leading";
  peerBenchmark: string;
  riskLevel: "critical" | "high" | "medium" | "low";
  explanation: string;
}

// ══════════════════════════════════════════════════════
//  AUDIT REPORT PAYLOAD (ORCHESTRATEUR)
// ══════════════════════════════════════════════════════

export interface AuditReportPayload {
  /** Métadonnées */
  domain: string;
  generatedAt: string;
  executionMs: number;
  version: "3.0";

  /** Cible identifiée (Sprint 2) */
  decisionMaker: DecisionMaker | null;

  /** Moteur Shadow Cost */
  shadowBill: ShadowBillResult;

  /** Renseignement Financier */
  financialImpact: FinancialImpact;

  /** Analyse concurrentielle (nullable — graceful degradation) */
  peerGap: PeerGapScore | null;

  /** Score d'urgence global (0-100) */
  urgencyScore: number;

  /** Résumé exécutif (1 phrase choc pour le CFO) */
  executiveSummary: string;

  /** Erreurs non-fatales rencontrées */
  warnings: string[];
}
