/**
 * PLUGIN: Consolidation Advisor
 *
 * Identifies overlapping tools and recommends consolidation.
 * Tool sprawl is the #2 ghost tax after license waste.
 * Revenue: consolidation roadmap is core Rail B deliverable.
 */

import type { GhostTaxPlugin, PluginContext, PluginOutput, PluginInsight, PluginAction } from "./types";

interface OverlapCluster {
  category: string;
  tools: string[];
  overlapScore: number;       // 0-100
  consolidationTarget: string;
  annualSavingsEur: [number, number];
  migrationEffort: "trivial" | "easy" | "moderate" | "significant";
  migrationRisk: "low" | "moderate" | "high";
}

// Known functional overlaps in enterprise SaaS
const OVERLAP_CATEGORIES: Record<string, { tools: string[]; avgMonthly: number; consolidateInto: string }> = {
  "Communication": {
    tools: ["Slack", "Teams", "Zoom", "Google Meet", "WebEx", "Discord", "Mattermost"],
    avgMonthly: 8,
    consolidateInto: "Single platform (Teams or Slack)",
  },
  "Project Management": {
    tools: ["Jira", "Asana", "Monday", "Trello", "Linear", "ClickUp", "Notion", "Basecamp"],
    avgMonthly: 12,
    consolidateInto: "Primary PM tool + Notion for docs",
  },
  "CRM": {
    tools: ["Salesforce", "HubSpot", "Pipedrive", "Zoho CRM", "Dynamics 365"],
    avgMonthly: 65,
    consolidateInto: "Single CRM platform",
  },
  "Cloud Storage": {
    tools: ["Google Drive", "OneDrive", "Dropbox", "Box", "SharePoint"],
    avgMonthly: 10,
    consolidateInto: "Platform-native storage (Drive or OneDrive)",
  },
  "Analytics": {
    tools: ["Tableau", "Looker", "Power BI", "Metabase", "Amplitude", "Mixpanel", "Heap"],
    avgMonthly: 40,
    consolidateInto: "Single BI platform + product analytics",
  },
  "Email Marketing": {
    tools: ["Mailchimp", "SendGrid", "Constant Contact", "ActiveCampaign", "Brevo", "HubSpot"],
    avgMonthly: 35,
    consolidateInto: "CRM-integrated email platform",
  },
  "Design": {
    tools: ["Figma", "Sketch", "Adobe XD", "Canva", "InVision", "Miro"],
    avgMonthly: 15,
    consolidateInto: "Figma + Canva for non-designers",
  },
  "Documentation": {
    tools: ["Confluence", "Notion", "Google Docs", "Gitbook", "Slite", "Coda"],
    avgMonthly: 8,
    consolidateInto: "Single knowledge base",
  },
};

export const consolidationAdvisorPlugin: GhostTaxPlugin = {
  manifest: {
    id: "consolidation-advisor",
    name: "Consolidation Advisor",
    version: "1.0.0",
    category: "action",
    phases: ["post-analysis", "report"],
    description: "Identifies overlapping tools and generates consolidation roadmap with migration risk assessment.",
    revenueImpact: "Consolidation roadmap is core Rail B deliverable — avg 15-30% spend reduction.",
  },

  async execute(ctx: PluginContext): Promise<PluginOutput> {
    const start = Date.now();
    const insights: PluginInsight[] = [];
    const actions: PluginAction[] = [];
    const clusters: OverlapCluster[] = [];
    const headcount = ctx.company.headcount || 200;
    const toolCount = ctx.company.saasToolCount || 40;

    const combined = (JSON.stringify(ctx.enrichment) + " " + ctx.signals.map(s => `${s.label} ${s.description}`).join(" ")).toLowerCase();

    for (const [category, config] of Object.entries(OVERLAP_CATEGORIES)) {
      const detectedTools = config.tools.filter(t => combined.includes(t.toLowerCase()));
      // Even without detection, estimate overlap based on tool count
      const estimatedInCategory = Math.max(detectedTools.length, Math.round(toolCount / Object.keys(OVERLAP_CATEGORIES).length));

      if (estimatedInCategory >= 2) {
        const redundantTools = estimatedInCategory - 1;
        const savings: [number, number] = [
          Math.round(redundantTools * config.avgMonthly * headcount * 0.3 * 12),
          Math.round(redundantTools * config.avgMonthly * headcount * 0.6 * 12),
        ];
        // Cap savings at reasonable levels
        const cappedSavings: [number, number] = [
          Math.min(savings[0], ctx.company.monthlySpendEur! * 2 || 100000),
          Math.min(savings[1], ctx.company.monthlySpendEur! * 4 || 200000),
        ];

        clusters.push({
          category,
          tools: detectedTools.length > 0 ? detectedTools : [`~${estimatedInCategory} tools`],
          overlapScore: Math.min(85, 30 + redundantTools * 20),
          consolidationTarget: config.consolidateInto,
          annualSavingsEur: cappedSavings,
          migrationEffort: redundantTools > 3 ? "significant" : redundantTools > 1 ? "moderate" : "easy",
          migrationRisk: category === "CRM" ? "high" : category === "Project Management" ? "moderate" : "low",
        });
      }
    }

    // Sort by savings potential
    clusters.sort((a, b) => b.annualSavingsEur[1] - a.annualSavingsEur[1]);
    const top3 = clusters.slice(0, 3);

    for (const cluster of top3) {
      insights.push({
        id: `ca-${cluster.category.toLowerCase().replace(/\s+/g, "-")}`,
        label: `${cluster.category}: ${cluster.tools.length > 1 ? cluster.tools.join(", ") : cluster.tools[0]} overlap`,
        description: `Consolidation to ${cluster.consolidationTarget} could save ${cluster.annualSavingsEur[0].toLocaleString()}-${cluster.annualSavingsEur[1].toLocaleString()} EUR/yr. Migration effort: ${cluster.migrationEffort}.`,
        severity: cluster.annualSavingsEur[1] > 50000 ? "critical" : "high",
        eurImpact: cluster.annualSavingsEur,
        confidence: 45,
        source: "consolidation-advisor",
      });
    }

    const totalSavings: [number, number] = [
      clusters.reduce((s, c) => s + c.annualSavingsEur[0], 0),
      clusters.reduce((s, c) => s + c.annualSavingsEur[1], 0),
    ];

    actions.push({
      id: "ca-action-consolidate",
      title: `Consolidate ${clusters.length} overlapping tool categories`,
      owner: "IT / Procurement",
      priority: "high",
      savingsEurRange: totalSavings,
      effort: "significant",
      timelineDays: 180,
      rationale: `${clusters.length} categories with redundant tools. Top opportunity: ${top3[0]?.category || "TBD"}.`,
    });

    return {
      pluginId: "consolidation-advisor",
      insights,
      actions,
      scores: {
        overlap_cluster_count: clusters.length,
        total_consolidation_savings_low: totalSavings[0],
        total_consolidation_savings_high: totalSavings[1],
      },
      metadata: { clusters },
      executionMs: Date.now() - start,
    };
  },
};
