/**
 * PLUGIN: Board Report Generator
 *
 * Auto-generates board-ready executive materials from intelligence data.
 * One-page board slide, CFO memo, CIO action summary.
 * Revenue: "the report sells itself internally" — the board slide is the viral loop.
 */

import type { GhostTaxPlugin, PluginContext, PluginOutput, PluginInsight } from "./types";

interface BoardMaterial {
  type: "board_slide" | "cfo_memo" | "cio_action_summary" | "procurement_brief" | "audit_committee_note";
  title: string;
  sections: BoardSection[];
  generatedAt: string;
}

interface BoardSection {
  heading: string;
  content: string;
  dataPoints?: Record<string, string>;
  severity?: "critical" | "high" | "medium" | "low";
}

function formatEur(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M EUR`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k EUR`;
  return `${value} EUR`;
}

export const boardReportGeneratorPlugin: GhostTaxPlugin = {
  manifest: {
    id: "board-report-generator",
    name: "Board Report Generator",
    version: "1.0.0",
    category: "reporting",
    phases: ["report"],
    description: "Generates board-ready executive materials: slides, CFO memos, CIO action summaries.",
    revenueImpact: "Board materials are the viral loop — CFO shares with board → board asks CIO to act → Rail B/C.",
  },

  async execute(ctx: PluginContext): Promise<PluginOutput> {
    const start = Date.now();
    const insights: PluginInsight[] = [];
    const materials: BoardMaterial[] = [];
    const monthlySpend = ctx.company.monthlySpendEur || 50000;
    const annualSpend = monthlySpend * 12;
    const company = ctx.company.name || ctx.company.domain;

    // Use REAL pipeline data instead of signal-level guessing
    const p = ctx.pipeline;
    const criticalCount = ctx.signals.filter(s => s.severity === "critical").length;
    const highCount = ctx.signals.filter(s => s.severity === "high").length;

    // CFO Shock Screen: use pipeline exposure (calculated), not signal sums
    const totalExposureLow = p?.exposure?.lowEur ||
      ctx.signals.reduce((s, sig) => s + (sig.impactEurRange?.[0] || 0), 0);
    const totalExposureHigh = p?.exposure?.highEur ||
      ctx.signals.reduce((s, sig) => s + (sig.impactEurRange?.[1] || 0), 0);

    // Economic Engine data
    const dailyLoss = p?.lossVelocity?.dailyLossEur;
    const monthlyLoss = p?.lossVelocity?.monthlyLossEur;
    const costOfDelay90 = p?.costOfDelay?.projectedDelayLoss90;
    const pressureScore = p?.decisionPressureScore || 0;
    const recoverable90 = p?.exposure?.ninetyDayRecoverableEur;

    // Confidence Layer
    const confidence = p?.confidenceModel;
    const confidenceGrade = p?.exposure?.confidenceGrade || "moderate";
    const globalScore = p?.globalExposureScore || 0;

    // Executive Snapshot (earned summary)
    const snapshot = p?.executiveSnapshot;

    // Board Slide (one-pager) — now with REAL pipeline data
    materials.push({
      type: "board_slide",
      title: `IT Cost Exposure — ${company}`,
      sections: [
        {
          heading: "Exposure Summary",
          content: snapshot?.diagnosisSummary || `Annual IT spend: ${formatEur(annualSpend)}. Detected exposure: ${formatEur(totalExposureLow)}-${formatEur(totalExposureHigh)}.`,
          dataPoints: {
            "Annual IT Spend": formatEur(annualSpend),
            "Detected Exposure": `${formatEur(totalExposureLow)}-${formatEur(totalExposureHigh)}`,
            "Exposure Rate": `${Math.round(totalExposureLow / annualSpend * 100)}-${Math.round(totalExposureHigh / annualSpend * 100)}%`,
            "Daily Leakage": dailyLoss ? `${formatEur(dailyLoss[0])}-${formatEur(dailyLoss[1])}` : "—",
            "90-Day Recoverable": recoverable90 ? `${formatEur(recoverable90[0])}-${formatEur(recoverable90[1])}` : "—",
            "Decision Pressure": `${pressureScore}/100`,
            "Confidence": `${confidenceGrade} (${confidence?.overall || 0}/100)`,
            "Global Exposure Score": `${globalScore}/100`,
            "Critical Findings": `${criticalCount}`,
            "High Findings": `${highCount}`,
          },
          severity: criticalCount > 0 ? "critical" : highCount > 0 ? "high" : "medium",
        },
        {
          heading: "Top 3 Findings",
          content: ctx.signals.slice(0, 3).map((s, i) =>
            `${i + 1}. ${s.label}: ${s.description.slice(0, 120)}`
          ).join("\n"),
        },
        {
          heading: "Recommended Action",
          content: `Commission a Stabilization Protocol (30/60/90 day roadmap) to capture ${formatEur(totalExposureLow)}-${formatEur(totalExposureHigh)} in recoverable exposure.`,
        },
      ],
      generatedAt: new Date().toISOString(),
    });

    // CFO Memo — uses Economic Engine (real velocity, cost of delay)
    materials.push({
      type: "cfo_memo",
      title: `CFO Brief: Hidden IT Cost Exposure — ${company}`,
      sections: [
        {
          heading: "Bottom Line",
          content: snapshot?.diagnosisSummary ||
            `Your organization is losing an estimated ${formatEur(totalExposureLow)}-${formatEur(totalExposureHigh)} annually to unoptimized IT spending. This represents ${Math.round(totalExposureLow / annualSpend * 100)}-${Math.round(totalExposureHigh / annualSpend * 100)}% of your IT budget.`,
          severity: "critical",
        },
        {
          heading: "Financial Impact (Economic Engine)",
          dataPoints: {
            "Daily leakage": dailyLoss
              ? `${formatEur(dailyLoss[0])}-${formatEur(dailyLoss[1])}`
              : `${formatEur(Math.round(totalExposureLow / 365))}-${formatEur(Math.round(totalExposureHigh / 365))}`,
            "Monthly leakage": monthlyLoss
              ? `${formatEur(monthlyLoss[0])}-${formatEur(monthlyLoss[1])}`
              : `${formatEur(Math.round(totalExposureLow / 12))}-${formatEur(Math.round(totalExposureHigh / 12))}`,
            "90-day cost of inaction": costOfDelay90
              ? `${formatEur(costOfDelay90[0])}-${formatEur(costOfDelay90[1])}`
              : "—",
            "90-day recoverable": recoverable90
              ? `${formatEur(recoverable90[0])}-${formatEur(recoverable90[1])}`
              : "—",
            "3-year compound exposure": `${formatEur(Math.round(totalExposureLow * 3.4))}-${formatEur(Math.round(totalExposureHigh * 3.4))}`,
            "Decision pressure": `${pressureScore}/100`,
          },
          content: "Cost of delay compounds — every month without action adds to the cumulative exposure.",
        },
        {
          heading: "Confidence Assessment",
          dataPoints: {
            "Overall confidence": `${confidence?.overall || 0}/100 (${confidenceGrade})`,
            "Signal confidence": `${confidence?.signalConfidence || 0}/100`,
            "Exposure confidence": `${confidence?.exposureConfidence || 0}/100`,
            "Weakest layer": confidence?.weakestLayer || "—",
            "Strongest layer": confidence?.strongestLayer || "—",
          },
          content: confidence?.summary || "Confidence assessment pending deeper analysis.",
        },
        {
          heading: "Required Decision",
          content: snapshot?.recommendedActionPath ||
            "Authorize a Stabilization Protocol to: (1) audit all vendor contracts, (2) right-size licenses, (3) consolidate overlapping tools, (4) renegotiate top-10 contracts.",
        },
      ],
      generatedAt: new Date().toISOString(),
    });

    // CIO Action Summary
    materials.push({
      type: "cio_action_summary",
      title: `CIO Action Summary: IT Spend Optimization — ${company}`,
      sections: [
        {
          heading: "Immediate Actions (30 days)",
          content: "1. License usage audit across top 5 spend categories\n2. Cancel zombie subscriptions (estimated 15-22% of tools unused)\n3. Build renewal calendar with 90-day advance alerts",
        },
        {
          heading: "Short-term (60 days)",
          content: "1. Consolidate overlapping tools (communication, PM, storage)\n2. Renegotiate top 3 vendor contracts approaching renewal\n3. Implement SaaS governance policy",
        },
        {
          heading: "Medium-term (90 days)",
          content: "1. Deploy continuous monitoring for cost drift\n2. Establish procurement approval workflow\n3. Report savings to board with updated exposure metrics",
        },
      ],
      generatedAt: new Date().toISOString(),
    });

    // Procurement Brief
    materials.push({
      type: "procurement_brief",
      title: `Procurement Action Brief — ${company}`,
      sections: [
        {
          heading: "Negotiation Priorities",
          content: "Focus on contracts renewing in the next 90 days. Use competitive alternatives as leverage. Target 15-25% reduction on enterprise contracts.",
        },
        {
          heading: "License Optimization",
          content: "Right-size all seat-based licenses. Audit actual vs purchased usage. Downgrade over-provisioned tiers.",
        },
      ],
      generatedAt: new Date().toISOString(),
    });

    // Audit Committee Note
    materials.push({
      type: "audit_committee_note",
      title: `Audit Committee: IT Vendor Governance — ${company}`,
      sections: [
        {
          heading: "Governance Gap",
          content: `${criticalCount + highCount} high/critical findings in IT vendor management. Compliance risk from ungoverned SaaS and shadow AI usage.`,
          severity: "high",
        },
        {
          heading: "Recommendation",
          content: "Mandate quarterly IT spend review. Require procurement approval for new vendor onboarding. Implement vendor risk scoring.",
        },
      ],
      generatedAt: new Date().toISOString(),
    });

    insights.push({
      id: "brg-materials",
      label: `${materials.length} board-ready documents generated`,
      description: `Board slide, CFO memo, CIO action summary, procurement brief, and audit committee note — ready for internal circulation.`,
      severity: "medium",
      eurImpact: null,
      confidence: 75,
      source: "board-report-generator",
    });

    return {
      pluginId: "board-report-generator",
      insights,
      scores: {
        materials_generated: materials.length,
        critical_findings: criticalCount,
        high_findings: highCount,
        total_exposure_low: totalExposureLow,
        total_exposure_high: totalExposureHigh,
      },
      metadata: { materials },
      executionMs: Date.now() - start,
    };
  },
};
