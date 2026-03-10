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
    const { error: reportError } = await (supabase as any)
      .from("audit_requests")
      .update({
        report_data: report,
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
      <td style="padding:6px 10px;border-bottom:1px solid #1a1f2e;color:#e4e9f4;font-weight:600">${vd.vendor}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #1a1f2e;color:${vd.severity === 'critical' ? '#ef4444' : vd.severity === 'high' ? '#f59e0b' : '#8d9bb5'};text-transform:uppercase;font-size:11px">${vd.severity}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #1a1f2e;color:#8d9bb5;font-size:12px">${vd.description}</td>
    </tr>`
  ).join("");

  const scenarioRows = (["conservative", "base", "aggressive"] as const).map(key => {
    const sc = report.correctiveRoadmap.scenarios[key];
    return `<tr>
      <td style="padding:6px 10px;border-bottom:1px solid #1a1f2e;color:#e4e9f4;font-weight:600">${sc.label}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #1a1f2e;color:#34d399;font-family:monospace;font-weight:700">${fmtEur(sc.savingsEur[0])}-${fmtEur(sc.savingsEur[1])} &euro;/yr</td>
      <td style="padding:6px 10px;border-bottom:1px solid #1a1f2e;color:#8d9bb5">${sc.paybackMonths} ${isEn ? "months" : "mois"}</td>
    </tr>`;
  }).join("");

  const playbookSections = report.negotiationPlaybooks.slice(0, 3).map(pb =>
    `<div style="background:#0e1221;border:1px solid #1a1f2e;border-radius:8px;padding:16px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="color:#e4e9f4;font-weight:700;font-size:14px">${pb.vendor}</span>
        <span style="background:rgba(52,211,153,0.1);color:#34d399;padding:2px 8px;border-radius:4px;font-size:11px;text-transform:uppercase">${pb.suggestedApproach}</span>
      </div>
      <p style="color:#8d9bb5;font-size:12px;line-height:1.5;margin:0 0 8px 0">${pb.pressureAngle}</p>
      ${pb.steps.map((step, i) => `<p style="color:#55637d;font-size:11px;margin:2px 0;padding-left:8px;border-left:2px solid #1a1f2e"><span style="color:#60a5fa;font-weight:700;margin-right:4px">${i + 1}.</span>${step}</p>`).join("")}
    </div>`
  ).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#060912;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:640px;margin:0 auto;padding:32px 16px">

  <!-- Header -->
  <div style="margin-bottom:24px">
    <p style="font-size:10px;letter-spacing:0.2em;color:#3b82f6;text-transform:uppercase;margin:0 0 8px 0">GHOST TAX CORRECTIVE PROTOCOL</p>
    <h1 style="font-size:20px;color:#e4e9f4;margin:0 0 4px 0">${isEn ? "Financial Exposure Report" : "Rapport d'Exposition Financiere"}</h1>
    <p style="font-size:12px;color:#55637d;margin:0">${report.company.name} | ${report.company.domain} | ${report.runId}</p>
  </div>

  <!-- Executive Snapshot -->
  <div style="background:#0e1221;border:1px solid rgba(239,68,68,0.15);border-radius:8px;padding:20px;margin-bottom:16px">
    <p style="font-size:9px;letter-spacing:0.1em;color:#3b82f6;text-transform:uppercase;margin:0 0 10px 0">${isEn ? "EXECUTIVE SNAPSHOT" : "SYNTHESE EXECUTIVE"}</p>
    <p style="font-size:14px;color:#e4e9f4;line-height:1.5;margin:0 0 16px 0">${report.executiveSnapshot.diagnosisSummary}</p>
    <table style="width:100%;border-collapse:collapse">
      <tr>
        <td style="text-align:center;padding:8px">
          <p style="font-size:8px;color:#55637d;margin:0 0 4px 0;letter-spacing:0.08em">${isEn ? "EXPOSURE RANGE" : "EXPOSITION"}</p>
          <p style="font-family:monospace;font-size:18px;font-weight:800;color:#ef4444;margin:0">${fmtEur(report.executiveSnapshot.exposureRangeEur[0])}-${fmtEur(report.executiveSnapshot.exposureRangeEur[1])} &euro;/yr</p>
        </td>
        <td style="text-align:center;padding:8px">
          <p style="font-size:8px;color:#55637d;margin:0 0 4px 0;letter-spacing:0.08em">90-DAY RECOVERABLE</p>
          <p style="font-family:monospace;font-size:18px;font-weight:800;color:#34d399;margin:0">${fmtEur(report.executiveSnapshot.ninetyDayRecoverableEur[0])}-${fmtEur(report.executiveSnapshot.ninetyDayRecoverableEur[1])} &euro;</p>
        </td>
        <td style="text-align:center;padding:8px">
          <p style="font-size:8px;color:#55637d;margin:0 0 4px 0;letter-spacing:0.08em">CONFIDENCE</p>
          <p style="font-family:monospace;font-size:14px;font-weight:700;color:#f59e0b;margin:0">${report.executiveSnapshot.confidenceRange}</p>
        </td>
      </tr>
    </table>
  </div>

  <!-- Cost of Delay -->
  <div style="background:#0e1221;border:1px solid rgba(239,68,68,0.10);border-radius:8px;padding:16px;margin-bottom:16px">
    <p style="font-size:9px;letter-spacing:0.1em;color:#ef4444;text-transform:uppercase;margin:0 0 10px 0">${isEn ? "COST OF DELAY" : "COUT DU RETARD"}</p>
    <table style="width:100%;border-collapse:collapse">
      <tr>
        <td style="text-align:center;padding:8px">
          <p style="font-size:8px;color:#55637d;margin:0 0 4px 0">${isEn ? "EVERY DAY" : "PAR JOUR"}</p>
          <p style="font-family:monospace;font-size:18px;font-weight:900;color:#ef4444;margin:0">${fmtEur(report.exposureAnalysis.costOfDelay.daily[0])}-${fmtEur(report.exposureAnalysis.costOfDelay.daily[1])} &euro;</p>
        </td>
        <td style="text-align:center;padding:8px">
          <p style="font-size:8px;color:#55637d;margin:0 0 4px 0">${isEn ? "EVERY MONTH" : "PAR MOIS"}</p>
          <p style="font-family:monospace;font-size:16px;font-weight:800;color:#f59e0b;margin:0">${fmtEur(report.exposureAnalysis.costOfDelay.monthly[0])}-${fmtEur(report.exposureAnalysis.costOfDelay.monthly[1])} &euro;</p>
        </td>
        <td style="text-align:center;padding:8px">
          <p style="font-size:8px;color:#55637d;margin:0 0 4px 0">90-DAY</p>
          <p style="font-family:monospace;font-size:16px;font-weight:800;color:#f59e0b;margin:0">${fmtEur(report.exposureAnalysis.costOfDelay.projected90[0])}-${fmtEur(report.exposureAnalysis.costOfDelay.projected90[1])} &euro;</p>
        </td>
      </tr>
    </table>
  </div>

  <!-- Vendor Pressure Map -->
  ${report.vendorPressureMap.vendorDrifts.length > 0 ? `
  <div style="background:#0e1221;border:1px solid rgba(245,158,11,0.12);border-radius:8px;padding:16px;margin-bottom:16px">
    <p style="font-size:9px;letter-spacing:0.1em;color:#f59e0b;text-transform:uppercase;margin:0 0 10px 0">${isEn ? "VENDOR PRESSURE MAP" : "CARTE DE PRESSION FOURNISSEURS"}</p>
    <table style="width:100%;border-collapse:collapse;font-size:12px">${vendorDriftRows}</table>
    ${report.vendorPressureMap.windowCompression.compressedDays < report.vendorPressureMap.windowCompression.originalDays
      ? `<p style="font-size:11px;color:#ef4444;margin:10px 0 0 0">${isEn ? "Corrective window compressed by" : "Fenetre corrective comprimee de"} ${report.vendorPressureMap.windowCompression.originalDays - report.vendorPressureMap.windowCompression.compressedDays} ${isEn ? "days" : "jours"}</p>`
      : ""}
  </div>` : ""}

  <!-- Negotiation Playbooks -->
  ${report.negotiationPlaybooks.length > 0 ? `
  <div style="margin-bottom:16px">
    <p style="font-size:9px;letter-spacing:0.1em;color:#34d399;text-transform:uppercase;margin:0 0 10px 0">${isEn ? "NEGOTIATION PLAYBOOKS" : "PROTOCOLES DE NEGOCIATION"}</p>
    ${playbookSections}
  </div>` : ""}

  <!-- Corrective Scenarios -->
  <div style="background:#0e1221;border:1px solid rgba(52,211,153,0.12);border-radius:8px;padding:16px;margin-bottom:16px">
    <p style="font-size:9px;letter-spacing:0.1em;color:#34d399;text-transform:uppercase;margin:0 0 10px 0">${isEn ? "CORRECTIVE SCENARIOS" : "SCENARIOS CORRECTIFS"}</p>
    <table style="width:100%;border-collapse:collapse;font-size:12px">${scenarioRows}</table>
    <p style="font-size:11px;color:#55637d;margin:10px 0 0 0">${isEn ? "Dominant cause" : "Cause dominante"}: ${report.correctiveRoadmap.causalGraph.dominantCause}</p>
  </div>

  <!-- CFO Memo -->
  <div style="background:#0e1221;border:1px solid #1a1f2e;border-radius:8px;padding:16px;margin-bottom:16px">
    <p style="font-size:9px;letter-spacing:0.1em;color:#3b82f6;text-transform:uppercase;margin:0 0 10px 0">CFO MEMO</p>
    <pre style="font-size:11px;color:#8d9bb5;line-height:1.6;margin:0;white-space:pre-wrap;font-family:-apple-system,sans-serif">${report.decisionPack.cfoMemo}</pre>
  </div>

  <!-- Confidence -->
  <div style="background:#0e1221;border:1px solid #1a1f2e;border-radius:8px;padding:16px;margin-bottom:16px">
    <p style="font-size:9px;letter-spacing:0.1em;color:#3b82f6;text-transform:uppercase;margin:0 0 8px 0">${isEn ? "CONFIDENCE POSTURE" : "POSTURE DE CONFIANCE"}</p>
    <p style="font-size:12px;color:#8d9bb5;line-height:1.5;margin:0">${report.confidenceModel.summary}</p>
    <p style="font-size:10px;color:#55637d;margin:8px 0 0 0">${isEn ? "Overall" : "Global"}: ${report.confidenceModel.overall}/100 | ${isEn ? "Weakest" : "Plus faible"}: ${report.confidenceModel.weakestLayer} | ${isEn ? "Strongest" : "Plus fort"}: ${report.confidenceModel.strongestLayer}</p>
  </div>

  <!-- Methodology -->
  <div style="padding:12px;border-top:1px solid #1a1f2e;margin-top:16px">
    <p style="font-size:9px;color:#55637d;margin:0 0 4px 0">${report.proofSummary.methodologySummary}</p>
    <p style="font-size:9px;color:#3a4560;margin:0">${isEn ? "Sources" : "Sources"}: ${report.meta.dataSources.join(", ")} | ID: ${report.meta.analysisId}</p>
    ${report.meta.limitations.map(l => `<p style="font-size:9px;color:#3a4560;margin:2px 0">${l}</p>`).join("")}
  </div>

  <!-- UPSELL: Rail B Monitor -->
  <div style="background:linear-gradient(135deg,#0e1221 0%,#121828 100%);border:2px solid rgba(59,130,246,0.3);border-radius:12px;padding:24px;margin-bottom:16px;text-align:center">
    <p style="font-size:9px;letter-spacing:0.15em;color:#3b82f6;text-transform:uppercase;margin:0 0 12px 0">${isEn ? "PROTECT THIS EXPOSURE" : "PROTEGEZ CETTE EXPOSITION"}</p>
    <p style="font-size:16px;color:#e4e9f4;font-weight:700;margin:0 0 8px 0">${isEn ? "Your exposure drifts 15-25% per year without monitoring." : "Votre exposition derive de 15-25% par an sans monitoring."}</p>
    <p style="font-size:13px;color:#8d9bb5;line-height:1.6;margin:0 0 16px 0">${isEn
      ? `At ${fmtEur(report.exposureAnalysis.costOfDelay.monthly[0])}-${fmtEur(report.exposureAnalysis.costOfDelay.monthly[1])} EUR/month in delay costs, continuous monitoring at 2,000 EUR/month delivers 10x+ ROI.`
      : `A ${fmtEur(report.exposureAnalysis.costOfDelay.monthly[0])}-${fmtEur(report.exposureAnalysis.costOfDelay.monthly[1])} EUR/mois de cout de retard, le monitoring continu a 2 000 EUR/mois offre un ROI de 10x+.`}</p>
    <div style="margin-bottom:12px">
      <span style="display:inline-block;background:rgba(52,211,153,0.1);color:#34d399;padding:4px 12px;border-radius:4px;font-size:11px;margin:2px">${isEn ? "Monthly drift alerts" : "Alertes de derive mensuelles"}</span>
      <span style="display:inline-block;background:rgba(52,211,153,0.1);color:#34d399;padding:4px 12px;border-radius:4px;font-size:11px;margin:2px">${isEn ? "Vendor pressure tracking" : "Suivi pression fournisseurs"}</span>
      <span style="display:inline-block;background:rgba(52,211,153,0.1);color:#34d399;padding:4px 12px;border-radius:4px;font-size:11px;margin:2px">${isEn ? "Executive report" : "Rapport executif"}</span>
    </div>
    <a href="https://ghost-tax.com/pricing?ref=report&domain=${encodeURIComponent(report.company.domain)}&rail=B_MONITOR" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.02em">${isEn ? "Activate Continuous Monitoring" : "Activer le Monitoring Continu"}</a>
    <p style="font-size:10px;color:#55637d;margin:10px 0 0 0">${isEn ? "Instant activation. No call required." : "Activation instantanee. Aucun appel requis."}</p>
  </div>

  <!-- UPSELL: Rail B Setup -->
  <div style="background:#0e1221;border:1px solid rgba(245,158,11,0.2);border-radius:8px;padding:16px;margin-bottom:16px;text-align:center">
    <p style="font-size:9px;letter-spacing:0.15em;color:#f59e0b;text-transform:uppercase;margin:0 0 8px 0">${isEn ? "NEED A CORRECTIVE PLAN?" : "BESOIN D'UN PLAN CORRECTIF?"}</p>
    <p style="font-size:12px;color:#8d9bb5;line-height:1.5;margin:0 0 12px 0">${isEn
      ? "Get a structured 30/60/90-day stabilization protocol with vendor-specific negotiation playbooks. One-time: 2,500 EUR."
      : "Obtenez un protocole de stabilisation 30/60/90 jours structure avec des protocoles de negociation par fournisseur. One-shot: 2 500 EUR."}</p>
    <a href="https://ghost-tax.com/pricing?ref=report&domain=${encodeURIComponent(report.company.domain)}&rail=B_SETUP" style="display:inline-block;border:1px solid #f59e0b;color:#f59e0b;padding:8px 24px;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none">${isEn ? "View Stabilization Plans" : "Voir les Plans de Stabilisation"}</a>
  </div>

  <!-- Viral Loop CTAs -->
  ${generateViralEmailBlock({
    runId: report.runId,
    domain: report.company.domain,
    companyName: report.company.name,
    locale: (locale === "fr" ? "fr" : locale === "de" ? "de" : "en") as "en" | "fr" | "de",
  })}

  <!-- Footer -->
  <div style="text-align:center;padding:24px 0;border-top:1px solid #1a1f2e;margin-top:16px">
    <p style="font-size:11px;color:#55637d;margin:0 0 8px 0">${isEn ? "Questions about this report?" : "Questions sur ce rapport?"}</p>
    <p style="font-size:11px;color:#3b82f6;margin:0">audits@ghost-tax.com</p>
  </div>

</div>
</body>
</html>`;
}
