/**
 * GHOST TAX — SHADOW-BILL SCANNER (SERVER-ONLY)
 *
 * Moteur de détection OSINT par Certificate Transparency.
 *
 * Pipeline:
 *   1. Query crt.sh via fetchWithRetry (3 retries, 15s timeout)
 *   2. Extract unique subdomains, strip wildcards
 *   3. Match STRICT against SAAS_MATRIX (30 vendors)
 *   4. Estimate company size from certificate volume
 *   5. Calculate SaaS Waste (overlaps + under-utilization)
 *
 * Zero credentials. Zero access. Just public CT logs.
 *
 * Usage:
 *   import { analyzeInfrastructure } from "@/lib/engines/shadow-bill";
 *   const result = await analyzeInfrastructure("acme.com");
 */

import { fetchJSONWithRetry } from "@/lib/network/fetch-retry";
import {
  SAAS_MATRIX,
  matchSubdomainFQDN,
  type SaasMatrixEntry,
} from "@/lib/constants/saas-matrix";
import type {
  TechCategory,
  DetectedTech,
  TargetContext,
  TVARResult,
} from "@/types/audit";

// ══════════════════════════════════════════════════════
//  TYPES
// ══════════════════════════════════════════════════════

export interface DetectedVendor {
  key: string;
  displayName: string;
  category: string;
  matchedSubdomain: string;
  estimatedSeats: number;
  estimatedAnnualCostEur: number;
  costPerUser: number;
  overlapGroup: string;
}

export interface OverlapDetection {
  group: string;
  vendors: string[];
  redundantSpendEur: number;
  wasteRatio: number;            // 0.25-0.35
  explanation: string;
}

export interface InfrastructureAnalysis {
  domain: string;
  scannedAt: string;
  executionMs: number;

  // CT-Log raw extraction
  rawCertificateCount: number;
  uniqueSubdomainCount: number;
  subdomains: string[];

  // Company size estimation
  estimatedHeadcount: number;
  sizeConfidence: number;        // 0-100
  sizeBasis: string;

  // Vendor detection (strict dictionary match only)
  detectedVendors: DetectedVendor[];
  vendorCount: number;
  categoriesDetected: string[];

  // Financial estimation
  totalEstimatedSpendEur: number;
  overlaps: OverlapDetection[];
  overlapWasteEur: number;
  underUtilizationWasteEur: number;
  totalWasteEur: number;
  wastePercentage: number;

  // Hemorrhage metrics
  dailyWasteEur: number;
  weeklyWasteEur: number;
  monthlyWasteEur: number;

  // Confidence
  confidence: number;            // 0-85 (capped — Ghost Tax doctrine)
}

// ══════════════════════════════════════════════════════
//  CT-LOG ENTRY TYPE
// ══════════════════════════════════════════════════════

interface CTLogEntry {
  issuer_ca_id?: number;
  issuer_name?: string;
  common_name?: string;
  name_value: string;
  id?: number;
  entry_timestamp?: string;
  not_before?: string;
  not_after?: string;
}

// ══════════════════════════════════════════════════════
//  COMPANY SIZE ESTIMATOR
//  Heuristic: certificate volume correlates with org size
// ══════════════════════════════════════════════════════

function estimateHeadcount(
  uniqueSubdomains: number,
  rawCerts: number,
): { headcount: number; confidence: number; basis: string } {
  // Calibration table (empirical, conservative):
  //   <10 subs → 20-50 employees (small)
  //   10-30 subs → 50-200 employees (mid)
  //   30-80 subs → 200-1000 employees (large)
  //   80+ subs → 1000+ employees (enterprise)

  let headcount: number;
  let confidence: number;
  let basis: string;

  if (uniqueSubdomains < 5) {
    headcount = 30;
    confidence = 25;
    basis = `${uniqueSubdomains} sous-domaines → estimation basse (TPE/startup)`;
  } else if (uniqueSubdomains < 15) {
    headcount = Math.round(uniqueSubdomains * 8);
    confidence = 40;
    basis = `${uniqueSubdomains} sous-domaines → profil PME (${headcount} employés estimés)`;
  } else if (uniqueSubdomains < 40) {
    headcount = Math.round(uniqueSubdomains * 12);
    confidence = 55;
    basis = `${uniqueSubdomains} sous-domaines + ${rawCerts} certificats → profil mid-market`;
  } else if (uniqueSubdomains < 100) {
    headcount = Math.round(uniqueSubdomains * 15);
    confidence = 65;
    basis = `${uniqueSubdomains} sous-domaines → profil ETI/grand groupe`;
  } else {
    headcount = Math.round(Math.min(uniqueSubdomains * 18, 10000));
    confidence = 70;
    basis = `${uniqueSubdomains} sous-domaines (${rawCerts} certs) → profil enterprise`;
  }

  return { headcount, confidence: Math.min(75, confidence), basis };
}

// ══════════════════════════════════════════════════════
//  OVERLAP DETECTION
// ══════════════════════════════════════════════════════

const OVERLAP_WASTE_RATIOS: Record<string, { ratio: number; label: string }> = {
  crm:            { ratio: 0.30, label: "CRM multiples — données client fragmentées, pipeline inexact" },
  erp:            { ratio: 0.25, label: "ERP multiples — processus dupliqués, coût d'intégration" },
  hr:             { ratio: 0.30, label: "Outils RH redondants — données collaborateur fragmentées" },
  identity:       { ratio: 0.25, label: "Identity providers multiples — shadow auth, risque sécurité" },
  pm:             { ratio: 0.35, label: "Gestion de projet dupliquée — licences inutilisées, adoption fragmentée" },
  comms:          { ratio: 0.25, label: "Plateformes de communication redondantes" },
  observability:  { ratio: 0.35, label: "Monitoring redondant — ingestion données dupliquée (coût #1)" },
  support:        { ratio: 0.30, label: "Outils support multiples — tickets dispersés" },
  "data-warehouse": { ratio: 0.30, label: "Data warehouses multiples — coûts ingestion cumulés" },
  edr:            { ratio: 0.25, label: "Solutions EDR redondantes — couverture dupliquée" },
  design:         { ratio: 0.25, label: "Outils design multiples — licences sous-utilisées" },
  ai:             { ratio: 0.35, label: "Providers AI multiples — coûts API incontrôlés, risque compliance" },
  itsm:           { ratio: 0.25, label: "ITSM tools multiples" },
};

function detectOverlaps(vendors: DetectedVendor[]): OverlapDetection[] {
  const groups = new Map<string, DetectedVendor[]>();
  for (const v of vendors) {
    const g = groups.get(v.overlapGroup) || [];
    g.push(v);
    groups.set(v.overlapGroup, g);
  }

  const overlaps: OverlapDetection[] = [];

  for (const [group, members] of groups) {
    if (members.length < 2) continue;

    const overlapConfig = OVERLAP_WASTE_RATIOS[group] || { ratio: 0.25, label: "Outils redondants" };

    // Waste = ratio × sum of all but the most expensive vendor
    const sorted = [...members].sort((a, b) => b.estimatedAnnualCostEur - a.estimatedAnnualCostEur);
    const redundant = sorted.slice(1);
    const redundantSpend = redundant.reduce((s, v) => s + v.estimatedAnnualCostEur, 0);
    const waste = Math.round(redundantSpend * overlapConfig.ratio);

    overlaps.push({
      group,
      vendors: members.map((v) => v.displayName),
      redundantSpendEur: waste,
      wasteRatio: overlapConfig.ratio,
      explanation: `${overlapConfig.label} (${members.length} outils détectés : ${members.map((v) => v.displayName).join(", ")})`,
    });
  }

  return overlaps;
}

// ══════════════════════════════════════════════════════
//  MAIN: analyzeInfrastructure()
// ══════════════════════════════════════════════════════

/**
 * Full infrastructure analysis pipeline.
 *
 * 1. Query crt.sh for all certificates (resilient, 3 retries)
 * 2. Extract + deduplicate subdomains
 * 3. Match against SAAS_MATRIX (strict dictionary)
 * 4. Estimate company size from cert volume
 * 5. Calculate financial waste
 *
 * Returns structured InfrastructureAnalysis.
 */
export async function analyzeInfrastructure(
  domain: string,
  headcountOverride?: number,
): Promise<InfrastructureAnalysis> {
  const start = Date.now();
  const cleanDomain = domain
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .toLowerCase();

  // ── Step 1: Query crt.sh ───────────────────────────
  const entries = await fetchJSONWithRetry<CTLogEntry[]>(
    `https://crt.sh/?q=%25.${encodeURIComponent(cleanDomain)}&output=json`,
    { method: "GET" },
    {
      retries: 3,
      timeoutMs: 15_000,
      baseDelayMs: 2_000,
      onRetry: (attempt, status, delay) => {
        console.warn(
          `[Shadow-Bill] crt.sh retry ${attempt} (status=${status}, delay=${Math.round(delay)}ms)`,
        );
      },
    },
  );

  const rawCertCount = entries?.length ?? 0;

  // ── Step 2: Extract unique subdomains ──────────────
  const subdomainSet = new Set<string>();

  if (entries) {
    for (const entry of entries) {
      for (const raw of entry.name_value.split("\n")) {
        const name = raw.trim().toLowerCase().replace(/^\*\./, "");
        if (!name || name === cleanDomain) continue;
        if (!name.endsWith(`.${cleanDomain}`)) continue;
        subdomainSet.add(name);
      }
    }
  }

  const subdomains = Array.from(subdomainSet).sort();

  // ── Step 3: Estimate company size ──────────────────
  const sizeEstimate = estimateHeadcount(subdomains.length, rawCertCount);
  const headcount = headcountOverride ?? sizeEstimate.headcount;

  // ── Step 4: Match against SAAS_MATRIX (strict) ─────
  const seenKeys = new Set<string>();
  const detectedVendors: DetectedVendor[] = [];

  for (const sub of subdomains) {
    const entry = matchSubdomainFQDN(sub);
    if (!entry || seenKeys.has(entry.key)) continue;
    seenKeys.add(entry.key);

    const estimatedSeats = Math.max(
      entry.minDeployment,
      Math.round(headcount * 0.5),
    );
    const cost = Math.round(entry.estimatedAnnualCostPerUser * estimatedSeats);

    detectedVendors.push({
      key: entry.key,
      displayName: entry.displayName,
      category: entry.category,
      matchedSubdomain: sub,
      estimatedSeats,
      estimatedAnnualCostEur: cost,
      costPerUser: entry.estimatedAnnualCostPerUser,
      overlapGroup: entry.overlapGroup,
    });
  }

  // Sort by cost descending
  detectedVendors.sort((a, b) => b.estimatedAnnualCostEur - a.estimatedAnnualCostEur);

  // ── Step 5: Financial calculation ──────────────────
  const totalSpend = detectedVendors.reduce(
    (s, v) => s + v.estimatedAnnualCostEur,
    0,
  );

  const overlaps = detectOverlaps(detectedVendors);
  const overlapWaste = overlaps.reduce((s, o) => s + o.redundantSpendEur, 0);

  // 15% general under-utilization (industry benchmark: 25% avg, we're conservative)
  const underUtilWaste = Math.round(totalSpend * 0.15);
  const totalWaste = overlapWaste + underUtilWaste;
  const wastePercentage =
    totalSpend > 0 ? Math.round((totalWaste / totalSpend) * 100) : 0;

  const categories = [...new Set(detectedVendors.map((v) => v.category))];

  // Confidence: capped at 85 (Ghost Tax doctrine)
  const confidence = Math.min(
    85,
    10 +
      Math.min(20, subdomains.length) +
      Math.min(30, detectedVendors.length * 5) +
      Math.min(15, overlaps.length * 8) +
      (rawCertCount > 50 ? 10 : 0),
  );

  return {
    domain: cleanDomain,
    scannedAt: new Date().toISOString(),
    executionMs: Date.now() - start,

    rawCertificateCount: rawCertCount,
    uniqueSubdomainCount: subdomains.length,
    subdomains: subdomains.slice(0, 100), // Cap payload

    estimatedHeadcount: headcount,
    sizeConfidence: sizeEstimate.confidence,
    sizeBasis: sizeEstimate.basis,

    detectedVendors,
    vendorCount: detectedVendors.length,
    categoriesDetected: categories,

    totalEstimatedSpendEur: totalSpend,
    overlaps,
    overlapWasteEur: overlapWaste,
    underUtilizationWasteEur: underUtilWaste,
    totalWasteEur: totalWaste,
    wastePercentage,

    dailyWasteEur: Math.round(totalWaste / 365),
    weeklyWasteEur: Math.round(totalWaste / 52),
    monthlyWasteEur: Math.round(totalWaste / 12),

    confidence,
  };
}

// ══════════════════════════════════════════════════════
//  TVAR — TOTAL VALUE AT RISK ENGINE
//
//  Formule :
//    TVAR = Gaspillage Tech + Perte Performance + Risque Sécurité
//
//  Algorithme :
//    - techWaste : 80% du coût mensuel des outils redondants par catégorie
//                + 20% de sous-utilisation standard pour les outils uniques
//    - performanceLoss : revenueM × peerGapScore × 0.05
//    - securityRisk : (revenueM × 0.5) × vulnerabilityScore
// ══════════════════════════════════════════════════════

/**
 * Calcule la Valeur Totale à Risque (TVAR).
 *
 * Prend un techStack normalisé + contexte cible.
 * Retourne le TVAR mensuel avec breakdown tripartite.
 */
export async function calculateShadowBill(
  techStack: DetectedTech[],
  context: TargetContext,
): Promise<TVARResult> {
  let techWaste = 0;
  const categoriesSeen = new Set<TechCategory>();
  const detectedRedundancies: string[] = [];

  for (const tech of techStack) {
    if (categoriesSeen.has(tech.category)) {
      techWaste += tech.estimatedMonthlyCost * 0.8;
      detectedRedundancies.push(
        `Redondance détectée : ${tech.category} (${tech.name})`,
      );
    } else {
      categoriesSeen.add(tech.category);
      techWaste += tech.estimatedMonthlyCost * 0.2;
    }
  }

  const performanceLoss =
    context.estimatedMonthlyRevenue * context.peerGapScore * 0.05;

  const securityRiskExposure =
    (context.estimatedMonthlyRevenue * 0.5) * context.vulnerabilityScore;

  const totalValueAtRisk = Math.round(
    techWaste + performanceLoss + securityRiskExposure,
  );

  return {
    totalValueAtRisk,
    breakdown: {
      techWaste: Math.round(techWaste),
      performanceLoss: Math.round(performanceLoss),
      securityRiskExposure: Math.round(securityRiskExposure),
    },
    detectedRedundancies,
  };
}

// ══════════════════════════════════════════════════════
//  BRIDGE : InfrastructureAnalysis → TVAR inputs
// ══════════════════════════════════════════════════════

/** Mappe les catégories SaasMatrix → TechCategory TVAR */
const CATEGORY_MAP: Record<string, TechCategory> = {
  CRM: "CRM",
  ERP: "ERP",
  HR: "HR",
  Identity: "IDENTITY",
  Communication: "COMMUNICATION",
  Productivity: "PRODUCTIVITY",
  Observability: "OBSERVABILITY",
  Support: "SUPPORT",
  Data: "DATA",
  Security: "SECURITY",
  Design: "DESIGN",
  Finance: "FINANCE",
  DevTools: "DEVTOOLS",
  Marketing: "MARKETING",
  AI: "AI",
};

/**
 * Convertit un InfrastructureAnalysis en inputs TVAR.
 *
 * - DetectedVendor[] → DetectedTech[] (annuel → mensuel)
 * - Headcount → estimatedMonthlyRevenue (via benchmark 220k EUR/an/employee)
 * - overlaps → peerGapScore (0-1, normalisé)
 * - catégories Security/Identity manquantes → vulnerabilityScore
 */
export function bridgeToTVAR(
  analysis: InfrastructureAnalysis,
  overrides?: {
    monthlyRevenue?: number;
    peerGapScore?: number;
    vulnerabilityScore?: number;
  },
): { techStack: DetectedTech[]; context: TargetContext } {
  // ── Tech Stack ──
  const techStack: DetectedTech[] = analysis.detectedVendors.map((v) => ({
    id: v.key,
    name: v.displayName,
    category: CATEGORY_MAP[v.category] ?? "DATA",
    estimatedMonthlyCost: Math.round(v.estimatedAnnualCostEur / 12),
  }));

  // ── Revenue estimation ──
  const revenuePerEmployee = 220_000; // EUR/an benchmark mid-market
  const estimatedAnnualRevenue = analysis.estimatedHeadcount * revenuePerEmployee;
  const estimatedMonthlyRevenue = overrides?.monthlyRevenue
    ?? Math.round(estimatedAnnualRevenue / 12);

  // ── Peer Gap Score (0-1) ──
  // Normalisé depuis le nombre d'overlaps et waste %
  const peerGapScore = overrides?.peerGapScore
    ?? Math.min(1, (analysis.wastePercentage / 100) + (analysis.overlaps.length * 0.08));

  // ── Vulnerability Score (0-1) ──
  // Absence de catégories critiques (Security, Identity) = vulnérabilité
  const criticalCategories = ["Security", "Identity"];
  const missingCritical = criticalCategories.filter(
    (c) => !analysis.categoriesDetected.includes(c),
  ).length;
  const vulnerabilityScore = overrides?.vulnerabilityScore
    ?? Math.min(1, missingCritical * 0.35 + (analysis.vendorCount < 3 ? 0.2 : 0));

  return {
    techStack,
    context: {
      estimatedMonthlyRevenue,
      peerGapScore,
      vulnerabilityScore,
    },
  };
}

/**
 * Raccourci : calcule le TVAR directement depuis une InfrastructureAnalysis.
 */
export async function computeTVARFromAnalysis(
  analysis: InfrastructureAnalysis,
  overrides?: {
    monthlyRevenue?: number;
    peerGapScore?: number;
    vulnerabilityScore?: number;
  },
): Promise<TVARResult> {
  const { techStack, context } = bridgeToTVAR(analysis, overrides);
  return calculateShadowBill(techStack, context);
}
