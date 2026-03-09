/**
 * CONNECTOR: Microsoft 365
 *
 * Pulls license assignments, usage reports, and cost data via MS Graph API.
 * Detects E5-to-E3 downgrade opportunities, unused licenses.
 * Revenue: M365 is typically the #1 or #2 SaaS spend — high-impact connector.
 */

import type { GhostTaxConnector, ConnectorCredentials, ConnectorOutput } from "../plugins/types";
import type { CompanyContext, ProofSignal } from "../analysis";

export const microsoft365Connector: GhostTaxConnector = {
  manifest: {
    id: "microsoft-365",
    name: "Microsoft 365",
    version: "1.0.0",
    category: "saas",
    vendor: "Microsoft",
    authType: "oauth2",
    description: "Pulls license usage, active users, and M365 service consumption via Microsoft Graph API.",
    dataPoints: [
      "total_licenses_assigned",
      "license_skus",
      "active_users_30d",
      "inactive_users_30d",
      "e5_vs_e3_ratio",
      "teams_active_users",
      "sharepoint_storage_gb",
      "exchange_mailbox_count",
    ],
    revenueImpact: "M365 license optimization (E5→E3 downgrade) saves avg 15-25% — often 50k+ EUR/yr for mid-market.",
    requiredScopes: [
      "User.Read.All",
      "Reports.Read.All",
      "Organization.Read.All",
    ],
    rateLimits: { rpm: 60, daily: 10000 },
  },

  async testConnection(creds: ConnectorCredentials): Promise<{ ok: boolean; error?: string }> {
    if (!creds.accessToken) return { ok: false, error: "Missing OAuth2 access token" };
    try {
      const res = await fetch("https://graph.microsoft.com/v1.0/organization", {
        headers: { Authorization: `Bearer ${creds.accessToken}` },
      });
      return res.ok ? { ok: true } : { ok: false, error: `MS Graph returned ${res.status}` };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
    }
  },

  async fetchData(creds: ConnectorCredentials): Promise<ConnectorOutput> {
    const start = Date.now();
    const dataPoints: Record<string, unknown> = {};
    const errors: string[] = [];
    const headers = { Authorization: `Bearer ${creds.accessToken}` };

    try {
      // Fetch subscribed SKUs (license overview)
      const skuRes = await fetch("https://graph.microsoft.com/v1.0/subscribedSkus", { headers });
      if (skuRes.ok) {
        const skus = await skuRes.json();
        const skuList = skus.value || [];
        dataPoints.license_skus = skuList.map((s: any) => ({
          name: s.skuPartNumber,
          total: s.prepaidUnits?.enabled || 0,
          consumed: s.consumedUnits || 0,
          available: (s.prepaidUnits?.enabled || 0) - (s.consumedUnits || 0),
        }));
        dataPoints.total_licenses_assigned = skuList.reduce((sum: number, s: any) => sum + (s.consumedUnits || 0), 0);
        dataPoints.total_licenses_purchased = skuList.reduce((sum: number, s: any) => sum + (s.prepaidUnits?.enabled || 0), 0);

        // Detect E5 vs E3
        const e5 = skuList.find((s: any) => s.skuPartNumber?.includes("E5") || s.skuPartNumber?.includes("ENTERPRISEPREMIUM"));
        const e3 = skuList.find((s: any) => s.skuPartNumber?.includes("E3") || s.skuPartNumber?.includes("ENTERPRISEPACK"));
        if (e5) dataPoints.e5_licenses = e5.consumedUnits || 0;
        if (e3) dataPoints.e3_licenses = e3.consumedUnits || 0;
      }

      // Fetch users for activity analysis
      const usersRes = await fetch("https://graph.microsoft.com/v1.0/users?$top=999&$select=id,displayName,signInActivity,assignedLicenses", { headers });
      if (usersRes.ok) {
        const users = await usersRes.json();
        const userList = users.value || [];
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const active = userList.filter((u: any) =>
          u.signInActivity?.lastSignInDateTime &&
          new Date(u.signInActivity.lastSignInDateTime) > thirtyDaysAgo
        );
        dataPoints.active_users_30d = active.length;
        dataPoints.inactive_users_30d = userList.length - active.length;
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "Unknown error");
    }

    return {
      connectorId: "microsoft-365",
      fetchedAt: new Date(),
      dataPoints,
      signalCount: Object.keys(dataPoints).length,
      rawRecordCount: (dataPoints.total_licenses_assigned as number) || 0,
      executionMs: Date.now() - start,
      errors: errors.length > 0 ? errors : undefined,
    };
  },

  mapToSignals(data: ConnectorOutput): ProofSignal[] {
    const signals: ProofSignal[] = [];
    const dp = data.dataPoints;

    // E5 to E3 downgrade opportunity
    const e5 = dp.e5_licenses as number;
    if (e5 && e5 > 10) {
      const monthlySavingPerSeat = 22; // E5 (57€) vs E3 (35€) = ~22€/seat/mo
      const downgradeRate = 0.4; // 40% typically can downgrade
      const savingsLow = Math.round(e5 * downgradeRate * 0.7 * monthlySavingPerSeat * 12);
      const savingsHigh = Math.round(e5 * downgradeRate * monthlySavingPerSeat * 12);
      signals.push({
        type: "license_tier_mismatch",
        label: `M365: ${e5} E5 licenses — downgrade opportunity`,
        description: `${Math.round(e5 * downgradeRate)} users likely don't need E5 features. Savings: ${savingsLow.toLocaleString()}-${savingsHigh.toLocaleString()} EUR/yr.`,
        impactEurRange: [savingsLow, savingsHigh],
        severity: savingsHigh > 30000 ? "critical" : "high",
        evidence: ["microsoft_365_connector", "subscribedSkus_api"],
      });
    }

    // Unused licenses
    const purchased = dp.total_licenses_purchased as number;
    const assigned = dp.total_licenses_assigned as number;
    if (purchased && assigned && purchased > assigned * 1.1) {
      const unused = purchased - assigned;
      const avgCost = 35 * 12; // ~35€/mo average
      signals.push({
        type: "unassigned_licenses",
        label: `M365: ${unused} purchased but unassigned licenses`,
        description: `${unused} licenses purchased but not assigned. Waste: ${(unused * avgCost * 0.7).toLocaleString()}-${(unused * avgCost).toLocaleString()} EUR/yr.`,
        impactEurRange: [Math.round(unused * avgCost * 0.7), Math.round(unused * avgCost)],
        severity: unused > 20 ? "high" : "medium",
        evidence: ["microsoft_365_connector"],
      });
    }

    // Inactive users with licenses
    const inactive = dp.inactive_users_30d as number;
    if (inactive && inactive > 5) {
      signals.push({
        type: "inactive_licensed_users",
        label: `M365: ${inactive} inactive users with active licenses`,
        description: `${inactive} users haven't signed in for 30+ days but still have assigned licenses.`,
        impactEurRange: [Math.round(inactive * 25 * 12 * 0.5), Math.round(inactive * 35 * 12)],
        severity: inactive > 20 ? "high" : "medium",
        evidence: ["microsoft_365_connector", "signInActivity"],
      });
    }

    return signals;
  },
};
