/**
 * PLUGIN: Compliance Cost Checker
 *
 * Estimates hidden compliance costs from ungoverned SaaS/AI usage.
 * GDPR, SOC 2, ISO 27001 implications of shadow IT.
 * Revenue: compliance fear is the strongest CFO trigger — "you're exposed" drives instant checkout.
 */

import type { GhostTaxPlugin, PluginContext, PluginOutput, PluginInsight, PluginAction } from "./types";

interface ComplianceRisk {
  framework: string;
  riskLevel: "critical" | "high" | "medium" | "low";
  description: string;
  potentialFineEur: [number, number];
  remediationCostEur: [number, number];
  likelihood: number; // 0-100
}

const COMPLIANCE_FRAMEWORKS = {
  GDPR: {
    maxFinePct: 0.04, // 4% of annual revenue
    baseRisk: 0.35,
    triggers: ["data processing", "personal data", "gdpr", "privacy", "data protection", "dpo", "data breach"],
  },
  SOC2: {
    baseAuditCost: 50000,
    baseRisk: 0.25,
    triggers: ["soc 2", "soc2", "audit", "compliance", "security controls", "access management"],
  },
  ISO27001: {
    baseCertCost: 35000,
    baseRisk: 0.20,
    triggers: ["iso 27001", "iso27001", "information security", "isms", "security management"],
  },
  DORA: {
    baseRisk: 0.15,
    triggers: ["financial services", "banking", "insurance", "dora", "digital operational resilience"],
  },
  NIS2: {
    baseRisk: 0.20,
    triggers: ["critical infrastructure", "nis2", "network security", "essential services"],
  },
};

export const complianceCheckerPlugin: GhostTaxPlugin = {
  manifest: {
    id: "compliance-checker",
    name: "Compliance Cost Checker",
    version: "1.0.0",
    category: "detection",
    phases: ["post-enrichment", "analysis"],
    description: "Estimates hidden compliance costs from ungoverned SaaS/AI — GDPR fines, audit gaps, shadow IT risk.",
    revenueImpact: "Compliance fear drives 40% of Rail A purchases. CFOs buy on regulatory risk alone.",
  },

  async execute(ctx: PluginContext): Promise<PluginOutput> {
    const start = Date.now();
    const insights: PluginInsight[] = [];
    const actions: PluginAction[] = [];
    const risks: ComplianceRisk[] = [];
    const monthlySpend = ctx.company.monthlySpendEur || 50000;
    const annualSpend = monthlySpend * 12;
    const headcount = ctx.company.headcount || 200;
    const industry = (ctx.company.industry || "technology").toLowerCase();

    const combined = (JSON.stringify(ctx.enrichment) + " " + ctx.signals.map(s => `${s.label} ${s.description}`).join(" ") + " " + industry).toLowerCase();

    // Use pipeline causal graph for governance gap detection
    const causalNodes = ctx.pipeline?.causalGraph?.nodes || [];
    const governanceGaps = causalNodes.filter(n =>
      n.label.toLowerCase().includes("governance") ||
      n.label.toLowerCase().includes("shadow") ||
      n.label.toLowerCase().includes("ungoverned")
    ).length;

    // GDPR exposure (applies to all EU companies)
    const gdprTriggered = COMPLIANCE_FRAMEWORKS.GDPR.triggers.some(t => combined.includes(t)) || governanceGaps > 0;
    const estimatedRevenue = annualSpend * 8; // Rough: IT spend is ~12% of revenue
    const gdprFine: [number, number] = [
      Math.round(estimatedRevenue * 0.005),
      Math.round(estimatedRevenue * 0.02),
    ];
    risks.push({
      framework: "GDPR",
      riskLevel: gdprTriggered ? "critical" : "high",
      description: "Ungoverned SaaS tools processing personal data without documented DPIAs or vendor DPAs.",
      potentialFineEur: gdprFine,
      remediationCostEur: [15000, 45000],
      likelihood: gdprTriggered ? 45 : 25,
    });
    insights.push({
      id: "cc-gdpr",
      label: "GDPR exposure from ungoverned SaaS",
      description: `Shadow IT tools likely processing personal data without DPIAs. Potential fine exposure: ${gdprFine[0].toLocaleString()}-${gdprFine[1].toLocaleString()} EUR.`,
      severity: "critical",
      eurImpact: gdprFine,
      confidence: gdprTriggered ? 55 : 40,
      source: "compliance-checker",
    });

    // Shadow AI compliance risk
    const aiTriggered = combined.includes("ai") || combined.includes("chatgpt") || combined.includes("copilot") || combined.includes("openai");
    if (aiTriggered || headcount > 50) {
      const aiRiskCost: [number, number] = [
        Math.round(annualSpend * 0.02),
        Math.round(annualSpend * 0.08),
      ];
      risks.push({
        framework: "EU AI Act",
        riskLevel: "high",
        description: "Shadow AI tools in use without governance framework — EU AI Act compliance gap.",
        potentialFineEur: [Math.round(estimatedRevenue * 0.01), Math.round(estimatedRevenue * 0.03)],
        remediationCostEur: aiRiskCost,
        likelihood: 35,
      });
      insights.push({
        id: "cc-ai-act",
        label: "Shadow AI: EU AI Act compliance gap",
        description: `Ungoverned AI tools create regulatory exposure under EU AI Act. Governance cost: ${aiRiskCost[0].toLocaleString()}-${aiRiskCost[1].toLocaleString()} EUR.`,
        severity: "high",
        eurImpact: aiRiskCost,
        confidence: 45,
        source: "compliance-checker",
      });
    }

    // SOC 2 gap (if B2B SaaS company)
    if (combined.includes("saas") || combined.includes("software") || industry.includes("tech")) {
      risks.push({
        framework: "SOC 2",
        riskLevel: "medium",
        description: "Ungoverned vendor access may violate SOC 2 access control requirements.",
        potentialFineEur: [0, 0],
        remediationCostEur: [30000, 80000],
        likelihood: 30,
      });
    }

    // Financial services specific (DORA)
    if (industry.includes("financ") || industry.includes("bank") || industry.includes("insur")) {
      const doraFine: [number, number] = [
        Math.round(estimatedRevenue * 0.005),
        Math.round(estimatedRevenue * 0.01),
      ];
      risks.push({
        framework: "DORA",
        riskLevel: "critical",
        description: "Digital Operational Resilience Act — third-party ICT risk management requirements.",
        potentialFineEur: doraFine,
        remediationCostEur: [50000, 150000],
        likelihood: 40,
      });
    }

    actions.push({
      id: "cc-action-governance",
      title: "Implement SaaS governance framework for compliance",
      owner: "CISO / DPO / IT",
      priority: "critical",
      savingsEurRange: [
        risks.reduce((s, r) => s + r.remediationCostEur[0], 0),
        risks.reduce((s, r) => s + r.potentialFineEur[1], 0),
      ],
      effort: "significant",
      timelineDays: 90,
      rationale: `${risks.length} compliance frameworks at risk. Proactive governance costs less than reactive remediation.`,
    });

    return {
      pluginId: "compliance-checker",
      insights,
      actions,
      scores: {
        compliance_risk_count: risks.length,
        frameworks_at_risk: risks.filter(r => r.riskLevel === "critical" || r.riskLevel === "high").length,
        total_fine_exposure_low: risks.reduce((s, r) => s + r.potentialFineEur[0], 0),
        total_fine_exposure_high: risks.reduce((s, r) => s + r.potentialFineEur[1], 0),
      },
      metadata: { risks },
      executionMs: Date.now() - start,
    };
  },
};
