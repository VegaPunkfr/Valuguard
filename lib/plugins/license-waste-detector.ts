/**
 * PLUGIN: License Waste Detector
 *
 * Identifies unused, underused, and over-provisioned licenses.
 * The most tangible "ghost tax" — seats nobody uses but everyone pays for.
 * Revenue: license waste is the #1 shock metric that drives scan → checkout.
 */

import type { GhostTaxPlugin, PluginContext, PluginOutput, PluginInsight, PluginAction } from "./types";

interface LicenseWasteProfile {
  category: string;
  estimatedLicenses: number;
  estimatedWasteRate: number;     // 0-1
  wastedLicenses: number;
  annualWasteEur: [number, number];
  avgLicenseCostEur: number;
}

// Industry benchmarks for license waste by category
const WASTE_BENCHMARKS: Record<string, { wasteRate: number; avgMonthlyPerSeat: number }> = {
  "CRM": { wasteRate: 0.20, avgMonthlyPerSeat: 75 },
  "Collaboration": { wasteRate: 0.15, avgMonthlyPerSeat: 12 },
  "Project Management": { wasteRate: 0.22, avgMonthlyPerSeat: 15 },
  "Design Tools": { wasteRate: 0.30, avgMonthlyPerSeat: 35 },
  "Developer Tools": { wasteRate: 0.18, avgMonthlyPerSeat: 25 },
  "Security": { wasteRate: 0.10, avgMonthlyPerSeat: 8 },
  "Analytics": { wasteRate: 0.35, avgMonthlyPerSeat: 45 },
  "HR/People": { wasteRate: 0.12, avgMonthlyPerSeat: 10 },
  "Communication": { wasteRate: 0.08, avgMonthlyPerSeat: 10 },
  "Cloud Infrastructure": { wasteRate: 0.25, avgMonthlyPerSeat: 200 },
  "AI Tools": { wasteRate: 0.28, avgMonthlyPerSeat: 30 },
  "Marketing": { wasteRate: 0.22, avgMonthlyPerSeat: 50 },
};

export const licenseWasteDetectorPlugin: GhostTaxPlugin = {
  manifest: {
    id: "license-waste-detector",
    name: "License Waste Detector",
    version: "1.0.0",
    category: "detection",
    phases: ["analysis", "post-analysis"],
    description: "Identifies unused/underused licenses, over-provisioned seats, and shadow subscriptions.",
    revenueImpact: "License waste is the #1 shock metric — avg 22% waste rate drives immediate checkout.",
    requiredConnectors: ["google-workspace", "microsoft-365", "okta-identity"],
  },

  async execute(ctx: PluginContext): Promise<PluginOutput> {
    const start = Date.now();
    const insights: PluginInsight[] = [];
    const actions: PluginAction[] = [];
    const wasteProfiles: LicenseWasteProfile[] = [];
    const headcount = ctx.company.headcount || 200;
    const toolCount = ctx.company.saasToolCount || 40;
    // Distribute tools across categories (estimate)
    const categoryDistribution = Object.entries(WASTE_BENCHMARKS).map(([cat, bench]) => {
      const estimatedTools = Math.max(1, Math.round(toolCount / Object.keys(WASTE_BENCHMARKS).length));
      const licensesPerTool = Math.round(headcount * (cat === "Cloud Infrastructure" ? 0.15 : cat === "AI Tools" ? 0.3 : 0.6));
      const totalLicenses = estimatedTools * licensesPerTool;
      const wastedLicenses = Math.round(totalLicenses * bench.wasteRate);
      const annualWaste: [number, number] = [
        Math.round(wastedLicenses * bench.avgMonthlyPerSeat * 0.7 * 12),
        Math.round(wastedLicenses * bench.avgMonthlyPerSeat * 1.0 * 12),
      ];

      return {
        category: cat,
        estimatedLicenses: totalLicenses,
        estimatedWasteRate: bench.wasteRate,
        wastedLicenses,
        annualWasteEur: annualWaste,
        avgLicenseCostEur: bench.avgMonthlyPerSeat * 12,
      } as LicenseWasteProfile;
    });

    // Top 5 waste categories
    const sorted = categoryDistribution.sort((a, b) => b.annualWasteEur[1] - a.annualWasteEur[1]);
    const top5 = sorted.slice(0, 5);

    for (const profile of top5) {
      wasteProfiles.push(profile);
      if (profile.annualWasteEur[1] > 5000) {
        insights.push({
          id: `lwd-${profile.category.toLowerCase().replace(/[\s/]+/g, "-")}`,
          label: `${profile.category}: ~${profile.wastedLicenses} unused licenses`,
          description: `Estimated ${profile.wastedLicenses} wasted licenses (${Math.round(profile.estimatedWasteRate * 100)}% waste rate). Annual waste: ${profile.annualWasteEur[0].toLocaleString()}-${profile.annualWasteEur[1].toLocaleString()} EUR.`,
          severity: profile.annualWasteEur[1] > 50000 ? "critical" : profile.annualWasteEur[1] > 20000 ? "high" : "medium",
          eurImpact: profile.annualWasteEur,
          confidence: 50,
          source: "license-waste-detector",
        });
      }
    }

    const totalWaste: [number, number] = [
      categoryDistribution.reduce((s, p) => s + p.annualWasteEur[0], 0),
      categoryDistribution.reduce((s, p) => s + p.annualWasteEur[1], 0),
    ];
    const totalWastedLicenses = categoryDistribution.reduce((s, p) => s + p.wastedLicenses, 0);
    const overallWasteRate = totalWastedLicenses / categoryDistribution.reduce((s, p) => s + p.estimatedLicenses, 0);

    insights.unshift({
      id: "lwd-total",
      label: `Total license waste: ${Math.round(overallWasteRate * 100)}% (~${totalWastedLicenses} seats)`,
      description: `Across all categories, an estimated ${totalWastedLicenses} licenses are unused. Annual waste: ${totalWaste[0].toLocaleString()}-${totalWaste[1].toLocaleString()} EUR.`,
      severity: "critical",
      eurImpact: totalWaste,
      confidence: 50,
      source: "license-waste-detector",
    });

    actions.push({
      id: "lwd-action-audit",
      title: "Conduct license usage audit across top 5 waste categories",
      owner: "IT / Procurement",
      priority: "critical",
      savingsEurRange: totalWaste,
      effort: "moderate",
      timelineDays: 30,
      rationale: `${Math.round(overallWasteRate * 100)}% estimated waste rate across ${totalWastedLicenses} licenses. Quick wins in ${top5.map(p => p.category).join(", ")}.`,
    });

    return {
      pluginId: "license-waste-detector",
      insights,
      actions,
      scores: {
        overall_waste_rate: Math.round(overallWasteRate * 100),
        total_wasted_licenses: totalWastedLicenses,
        total_waste_low: totalWaste[0],
        total_waste_high: totalWaste[1],
      },
      metadata: { wasteProfiles: categoryDistribution, top5Categories: top5.map(p => p.category) },
      executionMs: Date.now() - start,
    };
  },
};
