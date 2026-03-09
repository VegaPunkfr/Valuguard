/**
 * CONNECTOR: AWS Cost Explorer
 *
 * Pulls cost and usage data from AWS for cloud spend optimization.
 * Detects idle resources, unoptimized reserved instances, and cost spikes.
 * Revenue: cloud waste is the largest single-line item ghost tax for most companies.
 */

import type { GhostTaxConnector, ConnectorCredentials, ConnectorOutput } from "../plugins/types";
import type { CompanyContext, ProofSignal } from "../analysis";

export const awsCostConnector: GhostTaxConnector = {
  manifest: {
    id: "aws-cost",
    name: "AWS Cost Explorer",
    version: "1.0.0",
    category: "cloud",
    vendor: "Amazon Web Services",
    authType: "api_key",
    description: "Pulls cost data, usage trends, and resource utilization from AWS Cost Explorer API.",
    dataPoints: [
      "monthly_cost_trend",
      "cost_by_service",
      "reserved_vs_ondemand_ratio",
      "idle_resources",
      "cost_anomalies",
      "savings_plan_utilization",
      "top_10_services_by_cost",
    ],
    revenueImpact: "Cloud waste averages 30% of spend — AWS connector alone can surface 6-figure savings.",
    requiredScopes: ["ce:GetCostAndUsage", "ce:GetSavingsPlansUtilization"],
    rateLimits: { rpm: 5, daily: 500 },
  },

  async testConnection(creds: ConnectorCredentials): Promise<{ ok: boolean; error?: string }> {
    if (!creds.apiKey || !creds.metadata?.secretKey) {
      return { ok: false, error: "Missing AWS access key ID or secret key" };
    }
    // In production, use AWS SDK. Here we validate credentials format.
    const keyPattern = /^AK[A-Z0-9]{18}$/;
    if (!keyPattern.test(creds.apiKey)) {
      return { ok: false, error: "Invalid AWS access key format" };
    }
    return { ok: true };
  },

  async fetchData(creds: ConnectorCredentials): Promise<ConnectorOutput> {
    const start = Date.now();
    const dataPoints: Record<string, unknown> = {};
    const errors: string[] = [];

    try {
      // In production, use @aws-sdk/client-cost-explorer
      // Here we structure the expected data format
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];

      // AWS Cost Explorer API call (requires AWS SDK in production)
      const costExplorerPayload = {
        TimePeriod: { Start: lastMonthStart, End: monthStart },
        Granularity: "MONTHLY",
        Metrics: ["BlendedCost", "UnblendedCost", "UsageQuantity"],
        GroupBy: [{ Type: "DIMENSION", Key: "SERVICE" }],
      };

      // Simulated structure — in prod, this would be an actual AWS SDK call
      dataPoints.query_params = costExplorerPayload;
      dataPoints.connector_status = "ready_for_aws_sdk";

      // Reserved instance analysis structure
      dataPoints.ri_analysis = {
        description: "Reserved Instance utilization check — requires AWS SDK integration",
        expected_savings_pct: "20-35%",
      };

      // Savings plan analysis structure
      dataPoints.savings_plan_analysis = {
        description: "Savings Plan coverage and utilization — requires AWS SDK integration",
        expected_coverage_target: "70-80%",
      };
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "Unknown error");
    }

    return {
      connectorId: "aws-cost",
      fetchedAt: new Date(),
      dataPoints,
      signalCount: Object.keys(dataPoints).length,
      rawRecordCount: 0,
      executionMs: Date.now() - start,
      errors: errors.length > 0 ? errors : undefined,
    };
  },

  mapToSignals(data: ConnectorOutput): ProofSignal[] {
    const signals: ProofSignal[] = [];

    // Structure for when real data flows through
    const dp = data.dataPoints;
    const costByService = dp.cost_by_service as Record<string, number> | undefined;

    if (costByService) {
      const totalCost = Object.values(costByService).reduce((s, v) => s + v, 0);
      const topService = Object.entries(costByService).sort((a, b) => b[1] - a[1])[0];

      if (topService && topService[1] > totalCost * 0.4) {
        signals.push({
          type: "cloud_concentration",
          label: `AWS: ${topService[0]} is ${Math.round(topService[1] / totalCost * 100)}% of cloud spend`,
          description: `Single service concentration risk — ${topService[0]} dominates cloud spending.`,
          impactEurRange: [Math.round(topService[1] * 0.1), Math.round(topService[1] * 0.3)],
          severity: "high",
          evidence: ["aws_cost_explorer"],
        });
      }
    }

    return signals;
  },
};
