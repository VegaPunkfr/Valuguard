/**
 * GHOST TAX — BACKGROUND OSINT WORKER (SERVER-ONLY)
 *
 * ══════════════════════════════════════════════════════════════
 *  Le système nerveux de Ghost Tax.
 *
 *  L'Interceptor scanne une fois → le Worker surveille en continu.
 *
 *  OSINT Interceptor: PHOTO   (one-shot, Rail A)
 *  OSINT Worker:      FILM    (continu, Rail B — 2000 EUR/mois)
 * ══════════════════════════════════════════════════════════════
 *
 * ARCHITECTURE:
 *
 *   ┌──────────────────────────────────────────────────────┐
 *   │            CRON TRIGGER (Vercel / external)           │
 *   │            /api/cron/osint-worker                     │
 *   └────────────────────────┬─────────────────────────────┘
 *                            │
 *                            ▼
 *   ┌──────────────────────────────────────────────────────┐
 *   │           FOR EACH monitoring_active ORG:             │
 *   │                                                       │
 *   │  1. Load baseline (previous OSINT scan)               │
 *   │  2. Run fresh OSINT Interceptor scan                  │
 *   │  3. DIFF: baseline vs fresh → detect changes          │
 *   │  4. Score drift severity                              │
 *   │  5. Generate alerts if threshold crossed              │
 *   │  6. Persist new baseline + drift record               │
 *   │  7. Dispatch notifications (email / webhook / slack)  │
 *   └──────────────────────────────────────────────────────┘
 *
 * DRIFT DETECTION:
 *  - New vendor appeared → "Nouveau vendor détecté"
 *  - Vendor disappeared → "Vendor potentiellement abandonné (charges fantômes?)"
 *  - Category expanded → "Expansion catégorie {x}: +{n} vendors"
 *  - Risk score increased → "Score de risque en hausse: {old} → {new}"
 *  - Hiring signal → "Recrutement {vendor}: budget incoming"
 *  - Cost exposure changed → "Exposition mise à jour: +{delta} EUR"
 */

import {
  executeOsintInterceptor,
  type OsintReport,
} from "./osint-interceptor";
import type { ProofSignal } from "@/lib/analysis";

// ══════════════════════════════════════════════════════
//  TYPES
// ══════════════════════════════════════════════════════

export interface OsintBaseline {
  orgId: string;
  domain: string;
  lastScanAt: Date;
  report: OsintReport;
  vendorFingerprint: string[];  // Sorted list of canonical vendor IDs
  totalSpendEur: [number, number];
  scores: {
    stackComplexity: number;
    governanceRisk: number;
    shadowRisk: number;
    osintConfidence: number;
  };
}

export type DriftType =
  | "vendor_added"          // New vendor detected
  | "vendor_removed"        // Vendor no longer detected (ghost charge risk)
  | "category_expanded"     // More vendors in a category
  | "category_contracted"   // Fewer vendors in a category
  | "risk_increased"        // Governance/shadow risk went up
  | "risk_decreased"        // Risk improved
  | "spend_increased"       // Estimated spend grew
  | "spend_decreased"       // Estimated spend shrank
  | "hiring_signal"         // New job postings mentioning vendors
  | "security_degraded"     // Security posture worsened
  | "stack_complexity_jump"; // Rapid vendor proliferation

export type DriftSeverity = "critical" | "high" | "medium" | "low" | "info";

export interface OsintDrift {
  type: DriftType;
  severity: DriftSeverity;
  description: string;
  details: string;
  impactEurDelta: [number, number] | null;  // Change in EUR exposure
  vendor?: string;
  category?: string;
  previousValue?: string | number;
  currentValue?: string | number;
  detectedAt: Date;
  actionRequired: boolean;
  suggestedAction: string;
}

export interface OsintWorkerResult {
  orgId: string;
  domain: string;
  runId: string;
  executedAt: Date;
  executionMs: number;

  // Scan results
  currentReport: OsintReport;
  hadBaseline: boolean;

  // Drift analysis
  drifts: OsintDrift[];
  driftCount: number;
  criticalDriftCount: number;
  totalDriftImpactEur: [number, number];

  // Alerts
  alerts: OsintAlert[];
  alertsDispatched: number;

  // Scoring delta
  scoreDelta: {
    stackComplexity: number;   // positive = increased
    governanceRisk: number;
    shadowRisk: number;
    osintConfidence: number;
  };

  // Narrative
  driftSummary: string;
  alertSummary: string;
}

export interface OsintAlert {
  severity: DriftSeverity;
  title: string;
  body: string;
  channel: "email" | "webhook" | "dashboard";
  dispatched: boolean;
  dispatchedAt: Date | null;
}

export interface MonitoringTarget {
  orgId: string;
  domain: string;
  headcount?: number;
  email: string;             // CFO email for alerts
  alertThreshold: DriftSeverity;  // Only alert above this severity
  webhookUrl?: string;       // Optional webhook for integrations
  lastScanAt: Date | null;
  baseline: OsintBaseline | null;
}

// ══════════════════════════════════════════════════════
//  DRIFT DETECTOR
// ══════════════════════════════════════════════════════

function detectDrifts(
  baseline: OsintBaseline,
  current: OsintReport,
): OsintDrift[] {
  const drifts: OsintDrift[] = [];
  const now = new Date();

  const oldVendors = new Set(baseline.vendorFingerprint);
  const newVendors = new Set(current.detectedVendors.map((v) => v.canonical));

  // ── New vendors ──────────────────────────────
  for (const vendor of current.detectedVendors) {
    if (!oldVendors.has(vendor.canonical)) {
      const isCritical = vendor.estimatedAnnualEur[1] > 10000 || vendor.category === "ai_llm";
      drifts.push({
        type: "vendor_added",
        severity: isCritical ? "high" : "medium",
        description: `Nouveau vendor d\u00e9tect\u00e9: ${vendor.name}`,
        details:
          `${vendor.name} (${vendor.category}) appara\u00eet pour la premi\u00e8re fois dans le scan OSINT. ` +
          `D\u00e9tect\u00e9 via ${vendor.detectionMethods.join(", ")}. ` +
          `Co\u00fbt estim\u00e9: ${vendor.estimatedAnnualEur[0].toLocaleString()}-${vendor.estimatedAnnualEur[1].toLocaleString()} EUR/an.`,
        impactEurDelta: vendor.estimatedAnnualEur,
        vendor: vendor.name,
        category: vendor.category,
        detectedAt: now,
        actionRequired: isCritical,
        suggestedAction: isCritical
          ? `V\u00e9rifier si ${vendor.name} est approuv\u00e9 par procurement. Co\u00fbt potentiel significatif.`
          : `Documenter l'utilisation de ${vendor.name} dans le registre IT.`,
      });
    }
  }

  // ── Removed vendors ──────────────────────────
  for (const oldVendorId of baseline.vendorFingerprint) {
    if (!newVendors.has(oldVendorId)) {
      const oldVendor = baseline.report.detectedVendors.find((v) => v.canonical === oldVendorId);
      if (!oldVendor) continue;

      drifts.push({
        type: "vendor_removed",
        severity: oldVendor.estimatedAnnualEur[1] > 5000 ? "high" : "medium",
        description: `Vendor disparu: ${oldVendor.name}`,
        details:
          `${oldVendor.name} n'est plus d\u00e9tect\u00e9 dans le scan OSINT. ` +
          `RISQUE: si les charges continuent d'\u00eatre pr\u00e9lev\u00e9es, c'est une charge fant\u00f4me. ` +
          `Dernier co\u00fbt estim\u00e9: ${oldVendor.estimatedAnnualEur[0].toLocaleString()}-${oldVendor.estimatedAnnualEur[1].toLocaleString()} EUR/an.`,
        impactEurDelta: [0, oldVendor.estimatedAnnualEur[1]],
        vendor: oldVendor.name,
        category: oldVendor.category,
        previousValue: oldVendor.estimatedAnnualEur[1],
        currentValue: 0,
        detectedAt: now,
        actionRequired: true,
        suggestedAction:
          `V\u00e9rifier imm\u00e9diatement si les pr\u00e9l\u00e8vements ${oldVendor.name} sont toujours actifs. ` +
          `Si oui, annuler l'abonnement (charge fant\u00f4me potentielle: ${oldVendor.estimatedAnnualEur[1].toLocaleString()} EUR/an).`,
      });
    }
  }

  // ── Category expansion/contraction ───────────
  const oldCategoryCounts: Record<string, number> = {};
  const newCategoryCounts: Record<string, number> = {};
  baseline.report.detectedVendors.forEach((v) => {
    oldCategoryCounts[v.category] = (oldCategoryCounts[v.category] || 0) + 1;
  });
  current.detectedVendors.forEach((v) => {
    newCategoryCounts[v.category] = (newCategoryCounts[v.category] || 0) + 1;
  });

  for (const cat of new Set([...Object.keys(oldCategoryCounts), ...Object.keys(newCategoryCounts)])) {
    const oldCount = oldCategoryCounts[cat] || 0;
    const newCount = newCategoryCounts[cat] || 0;
    const delta = newCount - oldCount;

    if (delta >= 2) {
      drifts.push({
        type: "category_expanded",
        severity: cat === "ai_llm" ? "high" : "medium",
        description: `Expansion ${cat}: +${delta} vendors`,
        details: `La cat\u00e9gorie "${cat}" est pass\u00e9e de ${oldCount} \u00e0 ${newCount} vendors. Proliferation en cours.`,
        impactEurDelta: null,
        category: cat,
        previousValue: oldCount,
        currentValue: newCount,
        detectedAt: now,
        actionRequired: delta >= 3,
        suggestedAction: `Auditer la cat\u00e9gorie "${cat}": ${newCount} outils pour un m\u00eame besoin indique une consolidation possible.`,
      });
    }
  }

  // ── Risk score changes ───────────────────────
  const riskDelta = current.governanceRiskScore - baseline.scores.governanceRisk;
  if (Math.abs(riskDelta) >= 10) {
    drifts.push({
      type: riskDelta > 0 ? "risk_increased" : "risk_decreased",
      severity: riskDelta > 20 ? "critical" : riskDelta > 10 ? "high" : "medium",
      description: riskDelta > 0
        ? `Risque gouvernance en hausse: ${baseline.scores.governanceRisk} \u2192 ${current.governanceRiskScore}`
        : `Risque gouvernance en baisse: ${baseline.scores.governanceRisk} \u2192 ${current.governanceRiskScore}`,
      details: riskDelta > 0
        ? `Le score de risque gouvernance a augment\u00e9 de ${riskDelta} points. Surveillance IT insuffisante d\u00e9tect\u00e9e.`
        : `Am\u00e9lioration de ${Math.abs(riskDelta)} points dans la gouvernance IT.`,
      impactEurDelta: null,
      previousValue: baseline.scores.governanceRisk,
      currentValue: current.governanceRiskScore,
      detectedAt: now,
      actionRequired: riskDelta > 15,
      suggestedAction: riskDelta > 0
        ? "Renforcer la politique d'approbation SaaS et auditer les achats r\u00e9cents."
        : "Continuer les am\u00e9liorations. Documenter les progr\u00e8s.",
    });
  }

  // ── Spend exposure changes ───────────────────
  const spendDelta = current.totalEstimatedSpendEur[1] - baseline.totalSpendEur[1];
  const spendDeltaPct = baseline.totalSpendEur[1] > 0
    ? (spendDelta / baseline.totalSpendEur[1])
    : 0;

  if (Math.abs(spendDeltaPct) >= 0.1) { // >10% change
    drifts.push({
      type: spendDelta > 0 ? "spend_increased" : "spend_decreased",
      severity: spendDeltaPct > 0.25 ? "high" : "medium",
      description: spendDelta > 0
        ? `Exposition en hausse: +${fmtEur(spendDelta)} (${Math.round(spendDeltaPct * 100)}%)`
        : `Exposition en baisse: ${fmtEur(spendDelta)} (${Math.round(spendDeltaPct * 100)}%)`,
      details:
        `Estimation d'exposition pass\u00e9e de ${baseline.totalSpendEur[1].toLocaleString()} \u00e0 ${current.totalEstimatedSpendEur[1].toLocaleString()} EUR/an. ` +
        `Variation: ${spendDelta > 0 ? "+" : ""}${spendDelta.toLocaleString()} EUR (${Math.round(spendDeltaPct * 100)}%).`,
      impactEurDelta: [Math.min(0, spendDelta), Math.max(0, spendDelta)],
      previousValue: baseline.totalSpendEur[1],
      currentValue: current.totalEstimatedSpendEur[1],
      detectedAt: now,
      actionRequired: spendDeltaPct > 0.2,
      suggestedAction: spendDelta > 0
        ? `Investiguer les ${Math.abs(current.totalVendorsDetected - baseline.report.totalVendorsDetected)} nouveaux vendors et leur justification m\u00e9tier.`
        : "Valider que la r\u00e9duction n'est pas due \u00e0 des d\u00e9parts de vendors non annul\u00e9s.",
    });
  }

  // ── Stack complexity jump ────────────────────
  const complexityDelta = current.stackComplexityScore - baseline.scores.stackComplexity;
  if (complexityDelta >= 15) {
    drifts.push({
      type: "stack_complexity_jump",
      severity: complexityDelta >= 25 ? "critical" : "high",
      description: `Complexit\u00e9 stack en forte hausse: +${complexityDelta} points`,
      details:
        `Score de complexit\u00e9 pass\u00e9 de ${baseline.scores.stackComplexity} \u00e0 ${current.stackComplexityScore}. ` +
        `Proliferation rapide de vendors d\u00e9tect\u00e9e. Risque de perte de contr\u00f4le.`,
      impactEurDelta: null,
      previousValue: baseline.scores.stackComplexity,
      currentValue: current.stackComplexityScore,
      detectedAt: now,
      actionRequired: true,
      suggestedAction:
        "URGENT: R\u00e9union governance IT n\u00e9cessaire. " +
        "Impl\u00e9menter un gel d'achats SaaS non approuv\u00e9s et auditer les 30 derniers jours.",
    });
  }

  // Sort by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  drifts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return drifts;
}

// ══════════════════════════════════════════════════════
//  ALERT GENERATOR
// ══════════════════════════════════════════════════════

function generateAlerts(
  drifts: OsintDrift[],
  target: MonitoringTarget,
): OsintAlert[] {
  const alerts: OsintAlert[] = [];
  const thresholdOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  const threshold = thresholdOrder[target.alertThreshold];

  for (const drift of drifts) {
    const driftLevel = thresholdOrder[drift.severity];
    if (driftLevel > threshold) continue; // Below threshold

    // Email alert
    alerts.push({
      severity: drift.severity,
      title: `[Ghost Tax] ${drift.description}`,
      body: formatAlertEmail(drift, target),
      channel: "email",
      dispatched: false,
      dispatchedAt: null,
    });

    // Dashboard alert (always)
    alerts.push({
      severity: drift.severity,
      title: drift.description,
      body: drift.details,
      channel: "dashboard",
      dispatched: true, // Dashboard alerts are "dispatched" by being stored
      dispatchedAt: new Date(),
    });

    // Webhook if configured
    if (target.webhookUrl) {
      alerts.push({
        severity: drift.severity,
        title: drift.description,
        body: JSON.stringify({
          type: drift.type,
          severity: drift.severity,
          description: drift.description,
          vendor: drift.vendor,
          impactEurDelta: drift.impactEurDelta,
          actionRequired: drift.actionRequired,
          suggestedAction: drift.suggestedAction,
        }),
        channel: "webhook",
        dispatched: false,
        dispatchedAt: null,
      });
    }
  }

  return alerts;
}

function formatAlertEmail(drift: OsintDrift, target: MonitoringTarget): string {
  return [
    `Ghost Tax — Alerte OSINT pour ${target.domain}`,
    "",
    `Sev\u00e9rit\u00e9: ${drift.severity.toUpperCase()}`,
    `Type: ${drift.type}`,
    "",
    drift.description,
    "",
    drift.details,
    "",
    drift.impactEurDelta
      ? `Impact estim\u00e9: ${drift.impactEurDelta[0].toLocaleString()}-${drift.impactEurDelta[1].toLocaleString()} EUR/an`
      : "",
    "",
    `Action recommand\u00e9e: ${drift.suggestedAction}`,
    "",
    "---",
    "Ghost Tax \u2014 Decision Intelligence",
    `Scan du ${new Date().toLocaleDateString("fr-FR")}`,
  ].filter(Boolean).join("\n");
}

// ══════════════════════════════════════════════════════
//  NARRATIVE GENERATOR
// ══════════════════════════════════════════════════════

function generateDriftSummary(drifts: OsintDrift[], domain: string): string {
  if (drifts.length === 0) {
    return `Aucun changement significatif d\u00e9tect\u00e9 pour ${domain} depuis le dernier scan.`;
  }

  const critical = drifts.filter((d) => d.severity === "critical").length;
  const high = drifts.filter((d) => d.severity === "high").length;
  const newVendors = drifts.filter((d) => d.type === "vendor_added").length;
  const removedVendors = drifts.filter((d) => d.type === "vendor_removed").length;

  const parts: string[] = [];
  parts.push(`${drifts.length} changement${drifts.length > 1 ? "s" : ""} d\u00e9tect\u00e9${drifts.length > 1 ? "s" : ""} pour ${domain}.`);

  if (critical > 0) parts.push(`${critical} CRITIQUE${critical > 1 ? "S" : ""}.`);
  if (high > 0) parts.push(`${high} s\u00e9v\u00e8re${high > 1 ? "s" : ""}.`);
  if (newVendors > 0) parts.push(`+${newVendors} nouveau${newVendors > 1 ? "x" : ""} vendor${newVendors > 1 ? "s" : ""}.`);
  if (removedVendors > 0) parts.push(`${removedVendors} vendor${removedVendors > 1 ? "s" : ""} disparu${removedVendors > 1 ? "s" : ""}.`);

  const totalImpact = drifts.reduce((s, d) => s + (d.impactEurDelta?.[1] || 0), 0);
  if (totalImpact > 0) {
    parts.push(`Impact potentiel: ${totalImpact.toLocaleString()} EUR/an.`);
  }

  const actionRequired = drifts.filter((d) => d.actionRequired).length;
  if (actionRequired > 0) {
    parts.push(`${actionRequired} action${actionRequired > 1 ? "s" : ""} requise${actionRequired > 1 ? "s" : ""}.`);
  }

  return parts.join(" ");
}

// ══════════════════════════════════════════════════════
//  PROOF SIGNAL GENERATOR — Drift → Pipeline
// ══════════════════════════════════════════════════════

export function driftsToSignals(drifts: OsintDrift[]): ProofSignal[] {
  return drifts
    .filter((d) => d.severity === "critical" || d.severity === "high")
    .map((d) => ({
      type: `osint_drift_${d.type}`,
      label: d.description,
      description: d.details,
      impactEurRange: d.impactEurDelta,
      severity: d.severity === "critical" ? "critical" as const
        : d.severity === "high" ? "high" as const : "medium" as const,
      evidence: [
        `osint_worker_${d.type}`,
        d.vendor || "aggregate",
        d.previousValue != null ? `prev_${d.previousValue}` : "no_baseline",
      ],
    }));
}

// ══════════════════════════════════════════════════════
//  MAIN ORCHESTRATOR
// ══════════════════════════════════════════════════════

export async function executeOsintWorker(config: {
  target: MonitoringTarget;
  jobPostings?: string[];
  runId?: string;
}): Promise<OsintWorkerResult> {
  const start = Date.now();
  const { target } = config;
  const runId = config.runId || crypto.randomUUID();

  // ── Phase 1: Fresh OSINT scan ───────────────────
  const currentReport = await executeOsintInterceptor({
    domain: target.domain,
    headcount: target.headcount,
    jobPostings: config.jobPostings,
    runId,
  });

  // ── Phase 2: Drift detection ────────────────────
  let drifts: OsintDrift[] = [];
  let scoreDelta = { stackComplexity: 0, governanceRisk: 0, shadowRisk: 0, osintConfidence: 0 };

  if (target.baseline) {
    drifts = detectDrifts(target.baseline, currentReport);

    scoreDelta = {
      stackComplexity: currentReport.stackComplexityScore - target.baseline.scores.stackComplexity,
      governanceRisk: currentReport.governanceRiskScore - target.baseline.scores.governanceRisk,
      shadowRisk: currentReport.shadowRiskScore - target.baseline.scores.shadowRisk,
      osintConfidence: currentReport.osintConfidence - target.baseline.scores.osintConfidence,
    };
  }

  // ── Phase 3: Alert generation ───────────────────
  const alerts = generateAlerts(drifts, target);

  // ── Phase 4: Aggregates ─────────────────────────
  const totalDriftImpact: [number, number] = [
    drifts.reduce((s, d) => s + (d.impactEurDelta?.[0] || 0), 0),
    drifts.reduce((s, d) => s + (d.impactEurDelta?.[1] || 0), 0),
  ];

  const criticalCount = drifts.filter((d) => d.severity === "critical").length;

  // ── Phase 5: Narratives ─────────────────────────
  const driftSummary = generateDriftSummary(drifts, target.domain);
  const alertSummary = alerts.length > 0
    ? `${alerts.filter((a) => a.channel === "email").length} emails d'alerte g\u00e9n\u00e9r\u00e9s. ` +
      `${criticalCount} critique${criticalCount !== 1 ? "s" : ""}, ` +
      `${drifts.filter((d) => d.severity === "high").length} s\u00e9v\u00e8re${drifts.filter((d) => d.severity === "high").length !== 1 ? "s" : ""}.`
    : "Aucune alerte d\u00e9clench\u00e9e.";

  return {
    orgId: target.orgId,
    domain: target.domain,
    runId,
    executedAt: new Date(),
    executionMs: Date.now() - start,
    currentReport,
    hadBaseline: target.baseline !== null,
    drifts,
    driftCount: drifts.length,
    criticalDriftCount: criticalCount,
    totalDriftImpactEur: totalDriftImpact,
    alerts,
    alertsDispatched: alerts.filter((a) => a.dispatched).length,
    scoreDelta,
    driftSummary,
    alertSummary,
  };
}

// ══════════════════════════════════════════════════════
//  BATCH PROCESSOR — For cron execution
// ══════════════════════════════════════════════════════

export async function executeOsintWorkerBatch(
  targets: MonitoringTarget[],
): Promise<OsintWorkerResult[]> {
  const results: OsintWorkerResult[] = [];

  // Process sequentially to respect rate limits
  for (const target of targets) {
    try {
      const result = await executeOsintWorker({ target });
      results.push(result);

      // Brief pause between scans (DNS rate limiting)
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (err) {
      console.error(`[osint-worker] Failed for ${target.domain}:`, err);
    }
  }

  return results;
}

// ── Helper ──────────────────────────────────────

function fmtEur(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M\u2009EUR`;
  if (abs >= 1e3) return `${Math.round(n / 1e3)}k\u2009EUR`;
  return `${Math.round(n)}\u2009EUR`;
}
