/**
 * PLUGIN: Contract Analyzer
 *
 * Detects hidden contract traps: auto-renewal clauses, price escalation,
 * minimum commitments, termination penalties. Feeds negotiation playbooks.
 * Revenue: auto-renewal detection alone justifies 490 EUR Rail A.
 */

import type { GhostTaxPlugin, PluginContext, PluginOutput, PluginInsight, PluginAction } from "./types";

interface ContractTrap {
  type: "auto_renewal" | "price_escalation" | "minimum_commit" | "termination_penalty" | "usage_overage" | "shadow_clause";
  vendor: string;
  description: string;
  annualCostEur: [number, number];
  severity: "critical" | "high" | "medium" | "low";
  actionable: boolean;
}

const CONTRACT_TRAP_PATTERNS: Record<string, { type: ContractTrap["type"]; severity: ContractTrap["severity"]; multiplier: number }[]> = {
  auto_renewal: [
    { type: "auto_renewal", severity: "high", multiplier: 1.0 },
  ],
  price_escalation: [
    { type: "price_escalation", severity: "critical", multiplier: 0.08 }, // 8% typical annual increase
  ],
  minimum_commit: [
    { type: "minimum_commit", severity: "medium", multiplier: 0.15 }, // 15% over-provisioned
  ],
  termination_penalty: [
    { type: "termination_penalty", severity: "high", multiplier: 0.25 }, // 25% of contract value
  ],
  usage_overage: [
    { type: "usage_overage", severity: "medium", multiplier: 0.12 }, // 12% in overage fees
  ],
};

export const contractAnalyzerPlugin: GhostTaxPlugin = {
  manifest: {
    id: "contract-analyzer",
    name: "Contract Analyzer",
    version: "1.0.0",
    category: "detection",
    phases: ["analysis", "post-analysis"],
    description: "Detects auto-renewal traps, price escalation clauses, minimum commits, and termination penalties.",
    revenueImpact: "Auto-renewal detection alone saves 10-30% of contract value. Key Rail A value prop.",
  },

  async execute(ctx: PluginContext): Promise<PluginOutput> {
    const start = Date.now();
    const insights: PluginInsight[] = [];
    const actions: PluginAction[] = [];
    const traps: ContractTrap[] = [];
    const monthlySpend = ctx.company.monthlySpendEur || 50000;
    const annualSpend = monthlySpend * 12;

    // Detect contract traps from enrichment signals
    const enrichText = JSON.stringify(ctx.enrichment).toLowerCase();
    const signalText = ctx.signals.map(s => `${s.label} ${s.description}`).join(" ").toLowerCase();
    const combined = enrichText + " " + signalText;

    // Auto-renewal detection
    if (combined.includes("auto-renew") || combined.includes("auto renew") || combined.includes("automatic renewal")) {
      const costRange: [number, number] = [
        Math.round(annualSpend * 0.05),
        Math.round(annualSpend * 0.15),
      ];
      traps.push({
        type: "auto_renewal",
        vendor: "Multiple vendors",
        description: "Auto-renewal clauses detected — contracts renew without renegotiation window.",
        annualCostEur: costRange,
        severity: "high",
        actionable: true,
      });
      insights.push({
        id: "ca-auto-renewal",
        label: "Auto-renewal trap detected",
        description: `Estimated ${costRange[0].toLocaleString()}-${costRange[1].toLocaleString()} EUR/yr locked in auto-renewals without renegotiation.`,
        severity: "high",
        eurImpact: costRange,
        confidence: 65,
        source: "contract-analyzer",
      });
      actions.push({
        id: "ca-action-renewal-calendar",
        title: "Build renewal calendar with 90-day advance alerts",
        owner: "Procurement / IT",
        priority: "high",
        savingsEurRange: costRange,
        effort: "easy",
        timelineDays: 7,
        rationale: "Prevents lock-in by ensuring every contract gets a renegotiation window.",
      });
    }

    // Price escalation detection
    if (combined.includes("price increase") || combined.includes("cost escalat") || combined.includes("rate hike") || combined.includes("pricing change")) {
      const escRange: [number, number] = [
        Math.round(annualSpend * 0.05),
        Math.round(annualSpend * 0.12),
      ];
      traps.push({
        type: "price_escalation",
        vendor: "SaaS vendors",
        description: "Price escalation signals detected — vendors increasing rates without proportional value.",
        annualCostEur: escRange,
        severity: "critical",
        actionable: true,
      });
      insights.push({
        id: "ca-price-escalation",
        label: "Vendor price escalation detected",
        description: `Estimated ${escRange[0].toLocaleString()}-${escRange[1].toLocaleString()} EUR/yr in above-inflation price increases.`,
        severity: "critical",
        eurImpact: escRange,
        confidence: 60,
        source: "contract-analyzer",
      });
    }

    // Minimum commitment trap
    if (combined.includes("minimum commit") || combined.includes("minimum spend") || combined.includes("floor commitment")) {
      const commitRange: [number, number] = [
        Math.round(annualSpend * 0.08),
        Math.round(annualSpend * 0.20),
      ];
      traps.push({
        type: "minimum_commit",
        vendor: "Enterprise vendors",
        description: "Minimum commitment clauses likely over-provisioned vs actual usage.",
        annualCostEur: commitRange,
        severity: "medium",
        actionable: true,
      });
      insights.push({
        id: "ca-min-commit",
        label: "Over-provisioned minimum commitments",
        description: `Estimated ${commitRange[0].toLocaleString()}-${commitRange[1].toLocaleString()} EUR/yr in committed spend above actual usage.`,
        severity: "medium",
        eurImpact: commitRange,
        confidence: 55,
        source: "contract-analyzer",
      });
    }

    // Termination penalty detection
    if (combined.includes("termination") || combined.includes("early exit") || combined.includes("cancellation fee")) {
      const penaltyRange: [number, number] = [
        Math.round(annualSpend * 0.10),
        Math.round(annualSpend * 0.30),
      ];
      traps.push({
        type: "termination_penalty",
        vendor: "Enterprise vendors",
        description: "Early termination penalties create switching barriers.",
        annualCostEur: penaltyRange,
        severity: "high",
        actionable: true,
      });
    }

    // Usage overage detection
    if (combined.includes("overage") || combined.includes("over limit") || combined.includes("excess usage") || combined.includes("additional seat")) {
      const overageRange: [number, number] = [
        Math.round(annualSpend * 0.03),
        Math.round(annualSpend * 0.10),
      ];
      traps.push({
        type: "usage_overage",
        vendor: "Usage-based vendors",
        description: "Usage overage fees detected — likely paying premium rates for excess consumption.",
        annualCostEur: overageRange,
        severity: "medium",
        actionable: true,
      });
    }

    const totalTrapCost: [number, number] = [
      traps.reduce((sum, t) => sum + t.annualCostEur[0], 0),
      traps.reduce((sum, t) => sum + t.annualCostEur[1], 0),
    ];

    return {
      pluginId: "contract-analyzer",
      insights,
      actions,
      scores: {
        contract_trap_count: traps.length,
        total_contract_exposure_low: totalTrapCost[0],
        total_contract_exposure_high: totalTrapCost[1],
      },
      metadata: { traps, totalTrapCost },
      executionMs: Date.now() - start,
    };
  },
};
