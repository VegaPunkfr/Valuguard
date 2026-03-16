/**
 * GHOST TAX — POST-PAYMENT DELIVERY PIPELINE (SERVER-ONLY)
 *
 * Triggered by Stripe checkout.session.completed webhook.
 * Executes the full paid delivery flow:
 *
 *   1. Create canonical run_id + audit_request record
 *   2. Run full enrichment (Exa)
 *   3. Run extended intelligence pipeline (all engines)
 *   4. Build structured report object
 *   5. Persist report to database
 *   6. Send delivery email
 *   7. Schedule follow-up
 *
 * Idempotency: uses Stripe session ID as dedup key.
 * All API keys remain server-side.
 */

import { createAdminSupabase } from "@/lib/supabase";
import {
  runDecisionIntelligence,
  type CompanyContext,
  type DecisionIntelligence,
} from "@/lib/analysis";
import { generateViralEmailBlock } from "@/lib/viral-loop";
import { encryptJSON, isEncryptionConfigured } from "@/lib/crypto";

// ── Types ─────────────────────────────────────────────

export interface DeliveryInput {
  stripeSessionId: string;
  email: string;
  domain: string;
  companyName?: string;
  locale?: string;
  headcount?: number;
  monthlySpendEur?: number;
  industry?: string;
}

export interface StructuredReport {
  runId: string;
  generatedAt: string;
  company: {
    domain: string;
    name: string;
    industry: string;
    headcount: number | null;
  };
  executiveSnapshot: {
    diagnosisSummary: string;
    exposureRangeEur: [number, number];
    ninetyDayRecoverableEur: [number, number];
    confidenceRange: string;
    timeToImpactDays: number;
    pressureScore: number;
    recommendedActionPath: string;
  };
  exposureAnalysis: {
    lowEur: number;
    highEur: number;
    confidence: number;
    confidenceGrade: string;
    basis: string;
    lossVelocity: {
      daily: [number, number];
      weekly: [number, number];
      monthly: [number, number];
      yearly: [number, number];
    };
    costOfDelay: {
      daily: [number, number];
      monthly: [number, number];
      quarterly: [number, number];
      projected90: [number, number];
    };
  };
  vendorPressureMap: {
    vendorDrifts: Array<{
      vendor: string;
      category: string;
      severity: string;
      description: string;
      financialImpact: string;
      urgencyDriver: string;
    }>;
    categoryDrifts: Array<{
      category: string;
      driftPercent: number;
      dominantCause: string;
      correctionAction: string;
    }>;
    overallDriftScore: number;
    driftDirection: string;
    windowCompression: {
      originalDays: number;
      compressedDays: number;
      drivers: string[];
    };
  };
  negotiationPlaybooks: Array<{
    vendor: string;
    readinessScore: number;
    suggestedApproach: string;
    pressureAngle: string;
    benchmarkSupport: string;
    steps: string[];
    economicArguments: Array<{
      headline: string;
      eurImpact: [number, number];
      timeframe: string;
      audience: string;
    }>;
  }>;
  correctiveRoadmap: {
    scenarios: {
      conservative: { label: string; savingsEur: [number, number]; paybackMonths: number; actions: Array<{ title: string; owner: string; effort: string }> };
      base: { label: string; savingsEur: [number, number]; paybackMonths: number; actions: Array<{ title: string; owner: string; effort: string }> };
      aggressive: { label: string; savingsEur: [number, number]; paybackMonths: number; actions: Array<{ title: string; owner: string; effort: string }> };
    };
    causalGraph: {
      dominantCause: string;
      secondaryCauses: string[];
      correctionOrder: Array<{ step: number; action: string; rationale: string }>;
    };
    correctionMomentum: {
      recoveryWindowDays: number;
      paybackMonths: number;
      readinessScore: number;
      readinessDrivers: string[];
    };
  };
  confidenceModel: {
    overall: number;
    weakestLayer: string;
    strongestLayer: string;
    summary: string;
  };
  decisionPack: {
    cfoMemo: string;
    cioOpsMemo: string;
    procurementSummary: string;
    boardOnePager: string;
  };
  proofSummary: {
    observedCount: number;
    inferredCount: number;
    estimatedCount: number;
    methodologySummary: string;
    boundaries: string[];
  };
  meta: {
    analysisId: string;
    dataSources: string[];
    overallConfidence: number;
    limitations: string[];
  };
}

export interface DeliveryResult {
  success: boolean;
  runId: string;
  error?: string;
}

// ── Run ID Generation ─────────────────────────────────

function generateRunId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `vgd_${ts}_${rand}`;
}

// ── Main Pipeline ─────────────────────────────────────
//
// State machine:
//   (new)  → processing → report_persisted → delivered
//                       ↘ failed
//
// Idempotency: if a row already exists for this Stripe session
// and is past "processing", we skip. If stuck in "processing"
// (previous crash), we re-run from analysis onward.

export async function executeDeliveryPipeline(
  input: DeliveryInput,
): Promise<DeliveryResult> {
  const runId = generateRunId();

  console.log(`[Ghost Tax Delivery] Starting pipeline ${runId} for ${input.domain}`);

  const supabase = createAdminSupabase();

  // ── Step 1: Idempotency check ───────────────────────
  if (supabase) {
    const { data: existing } = await (supabase as any)
      .from("audit_requests")
      .select("id, status, run_id")
      .eq("stripe_payment_intent_id", input.stripeSessionId)
      .single();

    if (existing) {
      // Already delivered or scheduled — skip entirely
      if (existing.status === "delivered" || existing.status === "followup_scheduled") {
        console.log(`[Ghost Tax Delivery] Already delivered for session ${input.stripeSessionId}`);
        return { success: true, runId: existing.run_id || runId };
      }
      // "processing" means a previous attempt crashed — we'll re-run
      // "pending" or "paid" means first real attempt — proceed
    }
  }

  // ── Step 2: Create/update audit request → processing ─
  if (supabase) {
    const { error: upsertError } = await (supabase as any)
      .from("audit_requests")
      .upsert({
        email: input.email,
        company_name: input.companyName || input.domain,
        domain: input.domain,
        run_id: runId,
        headcount: input.headcount || null,
        estimated_monthly_spend: input.monthlySpendEur || null,
        locale: input.locale || "en",
        status: "processing",
        stripe_payment_intent_id: input.stripeSessionId,
      }, {
        onConflict: "stripe_payment_intent_id",
      });

    if (upsertError) {
      console.error("[Ghost Tax Delivery] Failed to create audit request:", upsertError.message);
    }
  }

  // ── Step 3: Run full intelligence pipeline ──────────
  let intelligence: DecisionIntelligence;
  try {
    const context: CompanyContext = {
      domain: input.domain,
      name: input.companyName,
      industry: input.industry,
      headcount: input.headcount,
      monthlySpendEur: input.monthlySpendEur,
    };

    intelligence = await runDecisionIntelligence(context);
    console.log(`[Ghost Tax Delivery] Analysis complete for ${runId}, confidence: ${intelligence.meta.overallConfidence}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    console.error(`[Ghost Tax Delivery] Analysis failed for ${runId}:`, message);

    if (supabase) {
      await (supabase as any)
        .from("audit_requests")
        .update({ status: "failed" })
        .eq("run_id", runId);
    }

    return { success: false, runId, error: message };
  }

  // ── Step 4: Build structured report ─────────────────
  const report = buildStructuredReport(runId, input, intelligence);

  // ── Step 5: Persist report BEFORE sending email ─────
  // This ensures the report survives even if email delivery fails.
  const followupAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(); // 14 days
  if (supabase) {
    // ALE: Encrypt financial data at rest if ENCRYPTION_MASTER_KEY is configured
    const reportPayload = isEncryptionConfigured()
      ? { _encrypted: true, data: encryptJSON(report) }
      : report;

    const { error: reportError } = await (supabase as any)
      .from("audit_requests")
      .update({
        report_data: reportPayload,
        followup_at: followupAt,
      })
      .eq("run_id", runId);

    if (reportError) {
      console.error("[Ghost Tax Delivery] Failed to persist report:", reportError.message);
      // Non-fatal: we still attempt email so the customer gets something
    }
  }

  // ── Step 6: Send delivery email ─────────────────────
  let emailSent = false;
  try {
    await sendDeliveryEmail(input.email, report, input.locale || "en");
    emailSent = true;
    console.log(`[Ghost Tax Delivery] Email sent to ${input.email} for ${runId}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email send failed";
    console.error(`[Ghost Tax Delivery] Email failed for ${runId}:`, message);
  }

  // ── Step 7: Mark delivered (or note email failure) ──
  if (supabase) {
    await (supabase as any)
      .from("audit_requests")
      .update({
        status: "delivered",
        delivered_at: new Date().toISOString(),
        ...(emailSent ? {} : { report_data: { ...report, _emailFailed: true } }),
      })
      .eq("run_id", runId);
  }

  console.log(`[Ghost Tax Delivery] Pipeline complete: ${runId} (email: ${emailSent ? "sent" : "FAILED"})`);
  return { success: true, runId };
}

// ── Report Builder ────────────────────────────────────

function buildStructuredReport(
  runId: string,
  _input: DeliveryInput,
  intel: DecisionIntelligence,
): StructuredReport {
  return {
    runId,
    generatedAt: new Date().toISOString(),
    company: {
      domain: intel.companyContext.domain,
      name: intel.companyContext.name,
      industry: intel.companyContext.industry,
      headcount: intel.companyContext.headcount,
    },
    executiveSnapshot: {
      diagnosisSummary: intel.executiveSnapshot.diagnosisSummary,
      exposureRangeEur: intel.executiveSnapshot.exposureRangeEur,
      ninetyDayRecoverableEur: intel.executiveSnapshot.ninetyDayRecoverableEur,
      confidenceRange: intel.executiveSnapshot.confidenceRange,
      timeToImpactDays: intel.executiveSnapshot.timeToImpactDays,
      pressureScore: intel.executiveSnapshot.pressureScore,
      recommendedActionPath: intel.executiveSnapshot.recommendedActionPath,
    },
    exposureAnalysis: {
      lowEur: intel.exposure.lowEur,
      highEur: intel.exposure.highEur,
      confidence: intel.exposure.confidence,
      confidenceGrade: intel.exposure.confidenceGrade,
      basis: intel.exposure.basis,
      lossVelocity: {
        daily: intel.lossVelocity.dailyLossEur,
        weekly: intel.lossVelocity.weeklyLossEur,
        monthly: intel.lossVelocity.monthlyLossEur,
        yearly: intel.lossVelocity.yearlyLossEur,
      },
      costOfDelay: {
        daily: intel.costOfDelay.dailyCostOfDelay,
        monthly: intel.costOfDelay.monthlyCostOfDelay,
        quarterly: intel.costOfDelay.quarterlyCostOfDelay,
        projected90: intel.costOfDelay.projectedDelayLoss90,
      },
    },
    vendorPressureMap: {
      vendorDrifts: intel.driftMonitor.vendorDrifts.map(vd => ({
        vendor: vd.vendor,
        category: vd.category,
        severity: vd.driftSeverity,
        description: vd.deltaDescription,
        financialImpact: vd.financialImpact,
        urgencyDriver: vd.urgencyDriver,
      })),
      categoryDrifts: intel.driftMonitor.categoryDrifts.map(cd => ({
        category: cd.category,
        driftPercent: cd.driftPercent,
        dominantCause: cd.dominantCause,
        correctionAction: cd.correctionAction,
      })),
      overallDriftScore: intel.driftMonitor.overallDriftScore,
      driftDirection: intel.driftMonitor.driftDirection,
      windowCompression: {
        originalDays: intel.driftMonitor.windowCompression.originalWindowDays,
        compressedDays: intel.driftMonitor.windowCompression.compressedWindowDays,
        drivers: intel.driftMonitor.windowCompression.compressionDrivers,
      },
    },
    negotiationPlaybooks: intel.negotiationIntelligence.vendorPlaybooks.map(pb => ({
      vendor: pb.vendor,
      readinessScore: pb.readinessScore,
      suggestedApproach: pb.suggestedApproach,
      pressureAngle: pb.pressureFrame.pressureAngle,
      benchmarkSupport: pb.pressureFrame.benchmarkSupport,
      steps: pb.playBookPreview,
      economicArguments: pb.economicArguments.map(ea => ({
        headline: ea.headline,
        eurImpact: ea.eurImpact,
        timeframe: ea.timeframe,
        audience: ea.internalAudience,
      })),
    })),
    correctiveRoadmap: {
      scenarios: {
        conservative: {
          label: intel.scenarios.conservative.label,
          savingsEur: intel.scenarios.conservative.annualSavingsEur,
          paybackMonths: intel.scenarios.conservative.paybackMonths,
          actions: intel.scenarios.conservative.actions.map(a => ({ title: a.title, owner: a.owner, effort: a.effort })),
        },
        base: {
          label: intel.scenarios.base.label,
          savingsEur: intel.scenarios.base.annualSavingsEur,
          paybackMonths: intel.scenarios.base.paybackMonths,
          actions: intel.scenarios.base.actions.map(a => ({ title: a.title, owner: a.owner, effort: a.effort })),
        },
        aggressive: {
          label: intel.scenarios.aggressive.label,
          savingsEur: intel.scenarios.aggressive.annualSavingsEur,
          paybackMonths: intel.scenarios.aggressive.paybackMonths,
          actions: intel.scenarios.aggressive.actions.map(a => ({ title: a.title, owner: a.owner, effort: a.effort })),
        },
      },
      causalGraph: {
        dominantCause: intel.causalGraph.dominantCause,
        secondaryCauses: intel.causalGraph.secondaryCauses,
        correctionOrder: intel.causalGraph.correctionOrder,
      },
      correctionMomentum: {
        recoveryWindowDays: intel.correctionMomentum.medianRecoveryWindowDays,
        paybackMonths: intel.correctionMomentum.expectedPaybackMonths,
        readinessScore: intel.correctionMomentum.executionReadinessScore,
        readinessDrivers: intel.correctionMomentum.readinessDrivers,
      },
    },
    confidenceModel: {
      overall: intel.confidenceModel.overall,
      weakestLayer: intel.confidenceModel.weakestLayer,
      strongestLayer: intel.confidenceModel.strongestLayer,
      summary: intel.confidenceModel.summary,
    },
    decisionPack: {
      cfoMemo: intel.decisionPack.cfoMemo,
      cioOpsMemo: intel.decisionPack.cioOpsMemo,
      procurementSummary: intel.decisionPack.procurementSummary,
      boardOnePager: intel.decisionPack.boardOnePager,
    },
    proofSummary: {
      observedCount: intel.proof.observedSignals.length,
      inferredCount: intel.proof.inferredSignals.length,
      estimatedCount: intel.proof.estimatedSignals.length,
      methodologySummary: intel.proof.methodologySummary,
      boundaries: intel.proof.boundaries,
    },
    meta: {
      analysisId: intel.meta.analysisId,
      dataSources: intel.meta.dataSources,
      overallConfidence: intel.meta.overallConfidence,
      limitations: intel.meta.limitations,
    },
  };
}

// ── Email Sender ──────────────────────────────────────

async function sendDeliveryEmail(
  to: string,
  report: StructuredReport,
  locale: string,
): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn("[Ghost Tax Delivery] RESEND_API_KEY not set. Email logged only.");
    console.log("[Ghost Tax Delivery] Would send report to:", to, "Run:", report.runId);
    return;
  }

  const subject = locale === "fr"
    ? `Ghost Tax — Votre rapport d'exposition financiere (${report.company.name})`
    : `Ghost Tax — Your Financial Exposure Report (${report.company.name})`;

  const htmlBody = buildReportEmailHtml(report, locale);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Ghost Tax <reports@ghost-tax.com>",
      to: [to],
      subject,
      html: htmlBody,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "Unknown error");
    throw new Error(`Resend API error ${response.status}: ${errBody}`);
  }
}

// ── Email Template ────────────────────────────────────

function fmtEur(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 10_000) return Math.round(n / 1000) + "k";
  return Math.round(n).toLocaleString("fr-FR");
}

function buildReportEmailHtml(report: StructuredReport, locale: string): string {
  const isEn = locale !== "fr";

  const vendorDriftRows = report.vendorPressureMap.vendorDrifts.slice(0, 5).map(vd =>
    `<tr>
      <td style="padding:6px 10px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-weight:600">${vd.vendor}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #E2E8F0;color:${vd.severity === 'critical' ? '#DC2626' : vd.severity === 'high' ? '#D97706' : '#475569'};text-transform:uppercase;font-size:11px">${vd.severity}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #E2E8F0;color:#475569;font-size:12px">${vd.description}</td>
    </tr>`
  ).join("");

  const scenarioRows = (["conservative", "base", "aggressive"] as const).map(key => {
    const sc = report.correctiveRoadmap.scenarios[key];
    return `<tr>
      <td style="padding:6px 10px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-weight:600">${sc.label}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #E2E8F0;color:#059669;font-family:monospace;font-weight:700">${fmtEur(sc.savingsEur[0])}-${fmtEur(sc.savingsEur[1])} &euro;/yr</td>
      <td style="padding:6px 10px;border-bottom:1px solid #E2E8F0;color:#475569">${sc.paybackMonths} ${isEn ? "months" : "mois"}</td>
    </tr>`;
  }).join("");

  const playbookSections = report.negotiationPlaybooks.slice(0, 3).map(pb =>
    `<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:16px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="color:#0F172A;font-weight:700;font-size:14px">${pb.vendor}</span>
        <span style="background:rgba(5,150,105,0.08);color:#059669;padding:2px 8px;border-radius:4px;font-size:11px;text-transform:uppercase">${pb.suggestedApproach}</span>
      </div>
      <p style="color:#475569;font-size:12px;line-height:1.5;margin:0 0 8px 0">${pb.pressureAngle}</p>
      ${pb.steps.map((step, i) => `<p style="color:#64748B;font-size:11px;margin:2px 0;padding-left:8px;border-left:2px solid #E2E8F0"><span style="color:#0F172A;font-weight:700;margin-right:4px">${i + 1}.</span>${step}</p>`).join("")}
    </div>`
  ).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:640px;margin:0 auto;padding:32px 16px">

  <!-- Header -->
  <div style="margin-bottom:24px">
    <p style="font-size:10px;letter-spacing:0.2em;color:#0F172A;text-transform:uppercase;margin:0 0 8px 0">GHOST TAX CORRECTIVE PROTOCOL</p>
    <h1 style="font-size:20px;color:#0F172A;margin:0 0 4px 0">${isEn ? "Financial Exposure Report" : "Rapport d'Exposition Financiere"}</h1>
    <p style="font-size:12px;color:#64748B;margin:0">${report.company.name} | ${report.company.domain} | ${report.runId}</p>
  </div>

  <!-- Executive Snapshot -->
  <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:20px;margin-bottom:16px">
    <p style="font-size:9px;letter-spacing:0.1em;color:#0F172A;text-transform:uppercase;margin:0 0 10px 0">${isEn ? "EXECUTIVE SNAPSHOT" : "SYNTHESE EXECUTIVE"}</p>
    <p style="font-size:14px;color:#0F172A;line-height:1.5;margin:0 0 16px 0">${report.executiveSnapshot.diagnosisSummary}</p>
    <table style="width:100%;border-collapse:collapse">
      <tr>
        <td style="text-align:center;padding:8px">
          <p style="font-size:8px;color:#64748B;margin:0 0 4px 0;letter-spacing:0.08em">${isEn ? "EXPOSURE RANGE" : "EXPOSITION"}</p>
          <p style="font-family:monospace;font-size:18px;font-weight:800;color:#DC2626;margin:0">${fmtEur(report.executiveSnapshot.exposureRangeEur[0])}-${fmtEur(report.executiveSnapshot.exposureRangeEur[1])} &euro;/yr</p>
        </td>
        <td style="text-align:center;padding:8px">
          <p style="font-size:8px;color:#64748B;margin:0 0 4px 0;letter-spacing:0.08em">90-DAY RECOVERABLE</p>
          <p style="font-family:monospace;font-size:18px;font-weight:800;color:#059669;margin:0">${fmtEur(report.executiveSnapshot.ninetyDayRecoverableEur[0])}-${fmtEur(report.executiveSnapshot.ninetyDayRecoverableEur[1])} &euro;</p>
        </td>
        <td style="text-align:center;padding:8px">
          <p style="font-size:8px;color:#64748B;margin:0 0 4px 0;letter-spacing:0.08em">CONFIDENCE</p>
          <p style="font-family:monospace;font-size:14px;font-weight:700;color:#D97706;margin:0">${report.executiveSnapshot.confidenceRange}</p>
        </td>
      </tr>
    </table>
  </div>

  <!-- Cost of Delay -->
  <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:16px;margin-bottom:16px">
    <p style="font-size:9px;letter-spacing:0.1em;color:#DC2626;text-transform:uppercase;margin:0 0 10px 0">${isEn ? "COST OF DELAY" : "COUT DU RETARD"}</p>
    <table style="width:100%;border-collapse:collapse">
      <tr>
        <td style="text-align:center;padding:8px">
          <p style="font-size:8px;color:#64748B;margin:0 0 4px 0">${isEn ? "EVERY DAY" : "PAR JOUR"}</p>
          <p style="font-family:monospace;font-size:18px;font-weight:900;color:#DC2626;margin:0">${fmtEur(report.exposureAnalysis.costOfDelay.daily[0])}-${fmtEur(report.exposureAnalysis.costOfDelay.daily[1])} &euro;</p>
        </td>
        <td style="text-align:center;padding:8px">
          <p style="font-size:8px;color:#64748B;margin:0 0 4px 0">${isEn ? "EVERY MONTH" : "PAR MOIS"}</p>
          <p style="font-family:monospace;font-size:16px;font-weight:800;color:#D97706;margin:0">${fmtEur(report.exposureAnalysis.costOfDelay.monthly[0])}-${fmtEur(report.exposureAnalysis.costOfDelay.monthly[1])} &euro;</p>
        </td>
        <td style="text-align:center;padding:8px">
          <p style="font-size:8px;color:#64748B;margin:0 0 4px 0">90-DAY</p>
          <p style="font-family:monospace;font-size:16px;font-weight:800;color:#D97706;margin:0">${fmtEur(report.exposureAnalysis.costOfDelay.projected90[0])}-${fmtEur(report.exposureAnalysis.costOfDelay.projected90[1])} &euro;</p>
        </td>
      </tr>
    </table>
  </div>

  <!-- Vendor Pressure Map -->
  ${report.vendorPressureMap.vendorDrifts.length > 0 ? `
  <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:16px;margin-bottom:16px">
    <p style="font-size:9px;letter-spacing:0.1em;color:#D97706;text-transform:uppercase;margin:0 0 10px 0">${isEn ? "VENDOR PRESSURE MAP" : "CARTE DE PRESSION FOURNISSEURS"}</p>
    <table style="width:100%;border-collapse:collapse;font-size:12px">${vendorDriftRows}</table>
    ${report.vendorPressureMap.windowCompression.compressedDays < report.vendorPressureMap.windowCompression.originalDays
      ? `<p style="font-size:11px;color:#DC2626;margin:10px 0 0 0">${isEn ? "Corrective window compressed by" : "Fenetre corrective comprimee de"} ${report.vendorPressureMap.windowCompression.originalDays - report.vendorPressureMap.windowCompression.compressedDays} ${isEn ? "days" : "jours"}</p>`
      : ""}
  </div>` : ""}

  <!-- Negotiation Playbooks -->
  ${report.negotiationPlaybooks.length > 0 ? `
  <div style="margin-bottom:16px">
    <p style="font-size:9px;letter-spacing:0.1em;color:#059669;text-transform:uppercase;margin:0 0 10px 0">${isEn ? "NEGOTIATION PLAYBOOKS" : "PROTOCOLES DE NEGOCIATION"}</p>
    ${playbookSections}
  </div>` : ""}

  <!-- Corrective Scenarios -->
  <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:16px;margin-bottom:16px">
    <p style="font-size:9px;letter-spacing:0.1em;color:#059669;text-transform:uppercase;margin:0 0 10px 0">${isEn ? "CORRECTIVE SCENARIOS" : "SCENARIOS CORRECTIFS"}</p>
    <table style="width:100%;border-collapse:collapse;font-size:12px">${scenarioRows}</table>
    <p style="font-size:11px;color:#64748B;margin:10px 0 0 0">${isEn ? "Dominant cause" : "Cause dominante"}: ${report.correctiveRoadmap.causalGraph.dominantCause}</p>
  </div>

  <!-- CFO Memo -->
  <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:16px;margin-bottom:16px">
    <p style="font-size:9px;letter-spacing:0.1em;color:#0F172A;text-transform:uppercase;margin:0 0 10px 0">CFO MEMO</p>
    <pre style="font-size:11px;color:#475569;line-height:1.6;margin:0;white-space:pre-wrap;font-family:-apple-system,sans-serif">${report.decisionPack.cfoMemo}</pre>
  </div>

  <!-- Confidence -->
  <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:16px;margin-bottom:16px">
    <p style="font-size:9px;letter-spacing:0.1em;color:#0F172A;text-transform:uppercase;margin:0 0 8px 0">${isEn ? "CONFIDENCE POSTURE" : "POSTURE DE CONFIANCE"}</p>
    <p style="font-size:12px;color:#475569;line-height:1.5;margin:0">${report.confidenceModel.summary}</p>
    <p style="font-size:10px;color:#64748B;margin:8px 0 0 0">${isEn ? "Overall" : "Global"}: ${report.confidenceModel.overall}/100 | ${isEn ? "Weakest" : "Plus faible"}: ${report.confidenceModel.weakestLayer} | ${isEn ? "Strongest" : "Plus fort"}: ${report.confidenceModel.strongestLayer}</p>
  </div>

  <!-- Methodology -->
  <div style="padding:12px;border-top:1px solid #E2E8F0;margin-top:16px">
    <p style="font-size:9px;color:#64748B;margin:0 0 4px 0">${report.proofSummary.methodologySummary}</p>
    <p style="font-size:9px;color:#94A3B8;margin:0">${isEn ? "Sources" : "Sources"}: ${report.meta.dataSources.join(", ")} | ID: ${report.meta.analysisId}</p>
    ${report.meta.limitations.map(l => `<p style="font-size:9px;color:#94A3B8;margin:2px 0">${l}</p>`).join("")}
  </div>

  <!-- Next Steps Divider -->
  <div style="border-top:1px solid #E2E8F0;margin:24px 0 8px 0"></div>
  <p style="font-size:9px;letter-spacing:0.2em;color:#64748B;text-transform:uppercase;text-align:center;margin:0 0 20px 0">${isEn ? "RECOMMENDED NEXT STEPS" : "PROCHAINES ETAPES RECOMMANDEES"}</p>

  <!-- UPSELL: Rail B Stabilize (30/60/90 Plan) -->
  <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.06)">
    <table style="width:100%;border-collapse:collapse"><tr>
      <td style="vertical-align:top;padding-right:16px">
        <p style="font-size:9px;letter-spacing:0.15em;color:#D97706;text-transform:uppercase;margin:0 0 10px 0">${isEn ? "RAIL B — STABILIZATION PROTOCOL" : "RAIL B — PROTOCOLE DE STABILISATION"}</p>
        <p style="font-size:15px;color:#0F172A;font-weight:700;margin:0 0 8px 0">${isEn ? "Structured 30/60/90-Day Corrective Plan" : "Plan Correctif Structure 30/60/90 Jours"}</p>
        <p style="font-size:12px;color:#475569;line-height:1.6;margin:0 0 14px 0">${isEn
          ? "Vendor-specific negotiation playbooks, phased execution roadmap, and internal decision packs (CFO memo, board one-pager, procurement brief)."
          : "Protocoles de negociation par fournisseur, feuille de route d'execution phasee et dossiers de decision internes (memo CFO, one-pager board, brief procurement)."}</p>
        <table style="border-collapse:collapse;margin-bottom:14px">
          <tr><td style="padding:3px 10px 3px 0;font-size:11px;color:#64748B">${isEn ? "Deliverables" : "Livrables"}</td><td style="padding:3px 0;font-size:11px;color:#475569">${isEn ? "Corrective roadmap + negotiation scripts + decision packs" : "Feuille de route corrective + scripts de negociation + dossiers de decision"}</td></tr>
          <tr><td style="padding:3px 10px 3px 0;font-size:11px;color:#64748B">${isEn ? "Timeline" : "Delai"}</td><td style="padding:3px 0;font-size:11px;color:#475569">${isEn ? "Delivered within 5 business days" : "Livre sous 5 jours ouvrables"}</td></tr>
          <tr><td style="padding:3px 10px 3px 0;font-size:11px;color:#64748B">${isEn ? "Investment" : "Investissement"}</td><td style="padding:3px 0;font-size:11px;color:#0F172A;font-weight:700;font-family:monospace">2 500 EUR <span style="color:#64748B;font-weight:400;font-family:-apple-system,sans-serif">(${isEn ? "one-time" : "one-shot"})</span></td></tr>
        </table>
        <a href="https://ghost-tax.com/pricing?ref=report&domain=${encodeURIComponent(report.company.domain)}&rail=B_SETUP" style="display:inline-block;background:#D97706;color:#fff;padding:10px 28px;border-radius:6px;font-size:13px;font-weight:700;text-decoration:none;letter-spacing:0.02em">${isEn ? "Request Stabilization Plan" : "Demander le Plan de Stabilisation"}</a>
      </td>
    </tr></table>
  </div>

  <!-- UPSELL: Rail B Monitor (Continuous) -->
  <div style="background:linear-gradient(135deg,#F8FAFC 0%,#F1F5F9 100%);border:1px solid #E2E8F0;border-radius:12px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.06)">
    <table style="width:100%;border-collapse:collapse"><tr>
      <td style="vertical-align:top;padding-right:16px">
        <p style="font-size:9px;letter-spacing:0.15em;color:#3b82f6;text-transform:uppercase;margin:0 0 10px 0">${isEn ? "RAIL B — CONTINUOUS MONITORING" : "RAIL B — MONITORING CONTINU"}</p>
        <p style="font-size:15px;color:#0F172A;font-weight:700;margin:0 0 8px 0">${isEn ? "Exposure drifts 15-25% annually without oversight." : "L'exposition derive de 15-25% par an sans surveillance."}</p>
        <p style="font-size:12px;color:#475569;line-height:1.6;margin:0 0 14px 0">${isEn
          ? `At ${fmtEur(report.exposureAnalysis.costOfDelay.monthly[0])}-${fmtEur(report.exposureAnalysis.costOfDelay.monthly[1])} EUR/month in compounding delay costs, continuous monitoring delivers 10x+ ROI.`
          : `A ${fmtEur(report.exposureAnalysis.costOfDelay.monthly[0])}-${fmtEur(report.exposureAnalysis.costOfDelay.monthly[1])} EUR/mois de couts de retard composes, le monitoring continu offre un ROI de 10x+.`}</p>
        <table style="border-collapse:collapse;margin-bottom:14px">
          <tr><td style="padding:4px 0"><span style="display:inline-block;width:6px;height:6px;background:#059669;border-radius:50%;margin-right:8px;vertical-align:middle"></span><span style="font-size:11px;color:#475569">${isEn ? "Monthly drift analysis & vendor pressure alerts" : "Analyse de derive mensuelle et alertes pression fournisseurs"}</span></td></tr>
          <tr><td style="padding:4px 0"><span style="display:inline-block;width:6px;height:6px;background:#059669;border-radius:50%;margin-right:8px;vertical-align:middle"></span><span style="font-size:11px;color:#475569">${isEn ? "Executive-ready report for CFO/board distribution" : "Rapport pret pour distribution CFO/board"}</span></td></tr>
          <tr><td style="padding:4px 0"><span style="display:inline-block;width:6px;height:6px;background:#059669;border-radius:50%;margin-right:8px;vertical-align:middle"></span><span style="font-size:11px;color:#475569">${isEn ? "Renewal window targeting & negotiation timing" : "Ciblage des fenetres de renouvellement et timing de negociation"}</span></td></tr>
        </table>
        <table style="border-collapse:collapse;margin-bottom:14px">
          <tr><td style="padding:3px 10px 3px 0;font-size:11px;color:#64748B">${isEn ? "Investment" : "Investissement"}</td><td style="padding:3px 0;font-size:11px;color:#0F172A;font-weight:700;font-family:monospace">2 000 EUR/mo <span style="color:#64748B;font-weight:400;font-family:-apple-system,sans-serif">(${isEn ? "cancel anytime" : "sans engagement"})</span></td></tr>
        </table>
        <a href="https://ghost-tax.com/pricing?ref=report&domain=${encodeURIComponent(report.company.domain)}&rail=B_MONITOR" style="display:inline-block;background:#3b82f6;color:#fff;padding:10px 28px;border-radius:6px;font-size:13px;font-weight:700;text-decoration:none;letter-spacing:0.02em">${isEn ? "Activate Continuous Monitoring" : "Activer le Monitoring Continu"}</a>
        <span style="font-size:10px;color:#64748B;margin-left:12px;vertical-align:middle">${isEn ? "No call required." : "Aucun appel requis."}</span>
      </td>
    </tr></table>
  </div>

  <!-- Viral Loop CTAs -->
  ${generateViralEmailBlock({
    runId: report.runId,
    domain: report.company.domain,
    companyName: report.company.name,
    locale: (locale === "fr" ? "fr" : locale === "de" ? "de" : "en") as "en" | "fr" | "de",
  })}

  <!-- Footer -->
  <div style="text-align:center;padding:24px 0;border-top:1px solid #E2E8F0;margin-top:16px">
    <p style="font-size:11px;color:#64748B;margin:0 0 8px 0">${isEn ? "Questions about this report?" : "Questions sur ce rapport?"}</p>
    <p style="font-size:11px;color:#3b82f6;margin:0 0 20px 0">audits@ghost-tax.com</p>

    <!-- Trust Footer -->
    <div style="border-top:1px solid #E2E8F0;padding-top:16px;margin-top:8px">
      <p style="font-size:10px;color:#94A3B8;letter-spacing:0.06em;margin:0 0 12px 0">SOC 2 in progress &middot; GDPR compliant &middot; Data deleted within 30 days</p>
      <p style="font-size:11px;color:#64748B;font-weight:600;margin:0 0 4px 0">Ghost Tax SAS</p>
      <p style="font-size:10px;color:#94A3B8;margin:0">Decision Intelligence for IT Spend</p>
    </div>
  </div>

</div>
</body>
</html>`;
}
