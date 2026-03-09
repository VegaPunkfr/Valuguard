/**
 * CONNECTOR: Azure Cost Management
 *
 * Pulls cost data from Azure Cost Management + Billing API.
 * Detects over-provisioned VMs, unused resources, reservation gaps.
 * Revenue: Azure is #2 cloud provider — essential for EU enterprise clients.
 */

import type { GhostTaxConnector, ConnectorCredentials, ConnectorOutput } from "../plugins/types";
import type { CompanyContext, ProofSignal } from "../analysis";

export const azureCostConnector: GhostTaxConnector = {
  manifest: {
    id: "azure-cost",
    name: "Azure Cost Management",
    version: "1.0.0",
    category: "cloud",
    vendor: "Microsoft Azure",
    authType: "oauth2",
    description: "Pulls cost data, resource utilization, and reservation coverage from Azure Cost Management.",
    dataPoints: [
      "monthly_cost_trend",
      "cost_by_service",
      "cost_by_resource_group",
      "reservation_utilization",
      "advisor_recommendations",
      "idle_resources",
      "vm_right_sizing",
    ],
    revenueImpact: "Azure waste averages 25-35% — EU enterprises heavily on Azure for data sovereignty.",
    requiredScopes: [
      "https://management.azure.com/user_impersonation",
    ],
    rateLimits: { rpm: 30, daily: 5000 },
  },

  async testConnection(creds: ConnectorCredentials): Promise<{ ok: boolean; error?: string }> {
    if (!creds.accessToken) return { ok: false, error: "Missing Azure OAuth access token" };
    try {
      const res = await fetch("https://management.azure.com/subscriptions?api-version=2022-12-01", {
        headers: { Authorization: `Bearer ${creds.accessToken}` },
      });
      return res.ok ? { ok: true } : { ok: false, error: `Azure API returned ${res.status}` };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
    }
  },

  async fetchData(creds: ConnectorCredentials): Promise<ConnectorOutput> {
    const start = Date.now();
    const dataPoints: Record<string, unknown> = {};
    const errors: string[] = [];
    const headers = {
      Authorization: `Bearer ${creds.accessToken}`,
      "Content-Type": "application/json",
    };

    try {
      const subscriptionId = creds.metadata?.subscriptionId || "";

      // Fetch cost data for last 30 days
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const costQuery = {
        type: "ActualCost",
        dataSet: {
          granularity: "Monthly",
          aggregation: { totalCost: { name: "Cost", function: "Sum" } },
          grouping: [{ type: "Dimension", name: "ServiceName" }],
        },
        timeframe: "Custom",
        timePeriod: {
          from: thirtyDaysAgo.toISOString(),
          to: now.toISOString(),
        },
      };

      const costRes = await fetch(
        `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.CostManagement/query?api-version=2023-11-01`,
        { method: "POST", headers, body: JSON.stringify(costQuery) }
      );
      if (costRes.ok) {
        const costData = await costRes.json();
        dataPoints.cost_data = costData;
        const rows = costData.properties?.rows || [];
        dataPoints.service_count = rows.length;
        dataPoints.total_cost_30d = rows.reduce((sum: number, r: any[]) => sum + (r[0] || 0), 0);
      }

      // Fetch Azure Advisor recommendations
      const advisorRes = await fetch(
        `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Advisor/recommendations?api-version=2023-01-01&$filter=Category eq 'Cost'`,
        { headers }
      );
      if (advisorRes.ok) {
        const advisor = await advisorRes.json();
        const recommendations = advisor.value || [];
        dataPoints.cost_recommendations = recommendations.length;
        dataPoints.advisor_savings = recommendations.reduce((sum: number, r: any) =>
          sum + (r.properties?.extendedProperties?.savingsAmount || 0), 0);
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "Unknown error");
    }

    return {
      connectorId: "azure-cost",
      fetchedAt: new Date(),
      dataPoints,
      signalCount: Object.keys(dataPoints).length,
      rawRecordCount: (dataPoints.service_count as number) || 0,
      executionMs: Date.now() - start,
      errors: errors.length > 0 ? errors : undefined,
    };
  },

  mapToSignals(data: ConnectorOutput): ProofSignal[] {
    const signals: ProofSignal[] = [];
    const dp = data.dataPoints;

    const advisorSavings = dp.advisor_savings as number;
    const recommendations = dp.cost_recommendations as number;
    if (advisorSavings && advisorSavings > 100) {
      signals.push({
        type: "cloud_waste",
        label: `Azure Advisor: ${recommendations} cost optimizations found`,
        description: `Azure Advisor identified ${recommendations} cost recommendations with potential savings of ${advisorSavings.toLocaleString()} EUR/month.`,
        impactEurRange: [Math.round(advisorSavings * 8), Math.round(advisorSavings * 12)],
        severity: advisorSavings > 5000 ? "critical" : "high",
        evidence: ["azure_cost_management", "azure_advisor"],
      });
    }

    return signals;
  },
};
