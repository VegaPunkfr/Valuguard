/**
 * PLUGIN: Vendor Risk Scorer
 *
 * Scores each detected vendor on lock-in risk, financial exposure,
 * and switching cost. Feeds negotiation engine with leverage data.
 * Revenue: justifies Rail B (stabilization needs risk scores per vendor).
 */

import type { GhostTaxPlugin, PluginContext, PluginOutput, PluginInsight } from "./types";

interface VendorRiskProfile {
  vendor: string;
  lockInScore: number;        // 0-100
  switchingCostEur: [number, number];
  contractRigidity: number;   // 0-100
  alternativeCount: number;
  dataPortability: "easy" | "moderate" | "difficult" | "locked";
  overallRisk: number;        // 0-100
}

const KNOWN_LOCK_IN_PATTERNS: Record<string, Partial<VendorRiskProfile>> = {
  salesforce: { lockInScore: 82, dataPortability: "difficult", contractRigidity: 75 },
  oracle: { lockInScore: 90, dataPortability: "locked", contractRigidity: 88 },
  sap: { lockInScore: 88, dataPortability: "locked", contractRigidity: 85 },
  microsoft: { lockInScore: 70, dataPortability: "moderate", contractRigidity: 60 },
  google: { lockInScore: 55, dataPortability: "moderate", contractRigidity: 45 },
  aws: { lockInScore: 72, dataPortability: "difficult", contractRigidity: 50 },
  adobe: { lockInScore: 65, dataPortability: "moderate", contractRigidity: 60 },
  servicenow: { lockInScore: 78, dataPortability: "difficult", contractRigidity: 70 },
  workday: { lockInScore: 85, dataPortability: "locked", contractRigidity: 80 },
  snowflake: { lockInScore: 60, dataPortability: "moderate", contractRigidity: 55 },
  databricks: { lockInScore: 58, dataPortability: "moderate", contractRigidity: 50 },
  slack: { lockInScore: 40, dataPortability: "easy", contractRigidity: 30 },
  zoom: { lockInScore: 25, dataPortability: "easy", contractRigidity: 20 },
  hubspot: { lockInScore: 55, dataPortability: "moderate", contractRigidity: 45 },
  atlassian: { lockInScore: 60, dataPortability: "moderate", contractRigidity: 50 },
};

function scoreVendor(vendor: string, monthlySpend: number): VendorRiskProfile {
  const key = vendor.toLowerCase().replace(/[^a-z]/g, "");
  const known = Object.entries(KNOWN_LOCK_IN_PATTERNS).find(([k]) => key.includes(k));
  const base = known?.[1] ?? {};

  const lockInScore = base.lockInScore ?? 50;
  const contractRigidity = base.contractRigidity ?? 50;
  const dataPortability = base.dataPortability ?? "moderate";

  const portabilityMultiplier =
    dataPortability === "locked" ? 3.5 :
    dataPortability === "difficult" ? 2.5 :
    dataPortability === "moderate" ? 1.5 : 0.8;

  const switchLow = Math.round(monthlySpend * 2 * portabilityMultiplier);
  const switchHigh = Math.round(monthlySpend * 6 * portabilityMultiplier);

  const alternativeCount =
    lockInScore > 80 ? 1 :
    lockInScore > 60 ? 3 :
    lockInScore > 40 ? 5 : 8;

  const overallRisk = Math.min(85, Math.round(
    lockInScore * 0.4 + contractRigidity * 0.3 +
    (dataPortability === "locked" ? 30 : dataPortability === "difficult" ? 20 : 10) * 0.3
  ));

  return {
    vendor,
    lockInScore,
    switchingCostEur: [switchLow, switchHigh],
    contractRigidity,
    alternativeCount,
    dataPortability,
    overallRisk,
  };
}

export const vendorRiskScorerPlugin: GhostTaxPlugin = {
  manifest: {
    id: "vendor-risk-scorer",
    name: "Vendor Risk Scorer",
    version: "1.0.0",
    category: "scoring",
    phases: ["post-enrichment", "analysis"],
    description: "Scores vendor lock-in risk, switching costs, and data portability per detected vendor.",
    revenueImpact: "Justifies Rail B stabilization — clients need per-vendor risk scores to prioritize action.",
  },

  async execute(ctx: PluginContext): Promise<PluginOutput> {
    const start = Date.now();
    const insights: PluginInsight[] = [];
    const scores: Record<string, number> = {};
    const vendorProfiles: VendorRiskProfile[] = [];

    // Extract vendor names from signals
    const vendors = new Set<string>();
    for (const signal of ctx.signals) {
      const match = signal.label.match(/(?:vendor|tool|platform):\s*(.+)/i) ||
                    signal.description.match(/(Salesforce|Oracle|SAP|Microsoft|Google|AWS|Adobe|ServiceNow|Workday|Snowflake|Slack|Zoom|HubSpot|Atlassian|Databricks)/gi);
      if (match) {
        const names = match.slice(1);
        names.forEach(n => vendors.add(n.trim()));
      }
    }

    // Also extract from enrichment data
    const enrichVendors = ctx.enrichment?.detectedVendors as string[] | undefined;
    if (enrichVendors) enrichVendors.forEach(v => vendors.add(v));

    // Extract from pipeline market memory (vendor references)
    const marketRefs = ctx.pipeline?.marketMemory?.vendorReferences;
    if (marketRefs && Array.isArray(marketRefs)) {
      marketRefs.forEach((ref: { vendor: string }) => {
        if (ref.vendor) vendors.add(ref.vendor);
      });
    }

    scores.global_exposure_score = ctx.pipeline?.globalExposureScore || 0;
    scores.decision_pressure = ctx.pipeline?.decisionPressureScore || 0;

    const estimatedPerVendorSpend = (ctx.company.monthlySpendEur || 50000) / Math.max(vendors.size, 10);

    for (const vendor of vendors) {
      const profile = scoreVendor(vendor, estimatedPerVendorSpend);
      vendorProfiles.push(profile);
      scores[`vendor_risk_${vendor.toLowerCase().replace(/\s+/g, "_")}`] = profile.overallRisk;

      if (profile.overallRisk >= 70) {
        insights.push({
          id: `vrs-${vendor.toLowerCase().replace(/\s+/g, "-")}`,
          label: `High lock-in risk: ${vendor}`,
          description: `${vendor} has a lock-in score of ${profile.lockInScore}/100 with ${profile.dataPortability} data portability. Estimated switching cost: ${profile.switchingCostEur[0].toLocaleString()}-${profile.switchingCostEur[1].toLocaleString()} EUR.`,
          severity: profile.overallRisk >= 80 ? "critical" : "high",
          eurImpact: profile.switchingCostEur,
          confidence: Math.min(75, profile.lockInScore),
          source: "vendor-risk-scorer",
        });
      }
    }

    return {
      pluginId: "vendor-risk-scorer",
      scores,
      insights,
      metadata: { vendorProfiles, vendorCount: vendors.size },
      executionMs: Date.now() - start,
    };
  },
};
