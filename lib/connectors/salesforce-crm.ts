/**
 * CONNECTOR: Salesforce CRM
 *
 * Pulls license usage, user activity, and feature adoption.
 * Salesforce is the #1 overpaid SaaS in enterprise — avg 20% license waste.
 * Revenue: Salesforce optimization is a standalone Rail B offering.
 */

import type { GhostTaxConnector, ConnectorCredentials, ConnectorOutput } from "../plugins/types";
import type { CompanyContext, ProofSignal } from "../analysis";

export const salesforceConnector: GhostTaxConnector = {
  manifest: {
    id: "salesforce-crm",
    name: "Salesforce CRM",
    version: "1.0.0",
    category: "crm",
    vendor: "Salesforce",
    authType: "oauth2",
    description: "Pulls user activity, license types, feature adoption, and storage usage from Salesforce.",
    dataPoints: [
      "total_licenses",
      "active_users_30d",
      "login_frequency",
      "license_types",
      "storage_used_gb",
      "api_usage",
      "custom_objects_count",
      "integration_count",
    ],
    revenueImpact: "Salesforce is #1 overpaid SaaS — avg 20% license waste. Optimization saves 50-200k EUR/yr for mid-market.",
    requiredScopes: ["api", "id"],
    rateLimits: { rpm: 100, daily: 15000 },
  },

  async testConnection(creds: ConnectorCredentials): Promise<{ ok: boolean; error?: string }> {
    if (!creds.accessToken) return { ok: false, error: "Missing Salesforce OAuth token" };
    const instanceUrl = creds.metadata?.instanceUrl || "https://login.salesforce.com";
    try {
      const res = await fetch(`${instanceUrl}/services/data/v59.0/limits`, {
        headers: { Authorization: `Bearer ${creds.accessToken}` },
      });
      return res.ok ? { ok: true } : { ok: false, error: `Salesforce API returned ${res.status}` };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
    }
  },

  async fetchData(creds: ConnectorCredentials): Promise<ConnectorOutput> {
    const start = Date.now();
    const dataPoints: Record<string, unknown> = {};
    const errors: string[] = [];
    const instanceUrl = creds.metadata?.instanceUrl || "";
    const headers = { Authorization: `Bearer ${creds.accessToken}` };

    try {
      // Fetch user list with login history
      const usersRes = await fetch(
        `${instanceUrl}/services/data/v59.0/query?q=SELECT+Id,Name,IsActive,LastLoginDate,Profile.Name,UserType+FROM+User+WHERE+IsActive=true`,
        { headers }
      );
      if (usersRes.ok) {
        const users = await usersRes.json();
        const records = users.records || [];
        dataPoints.total_licenses = records.length;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const active = records.filter((u: any) =>
          u.LastLoginDate && new Date(u.LastLoginDate) > thirtyDaysAgo
        );
        dataPoints.active_users_30d = active.length;
        dataPoints.inactive_users_30d = records.length - active.length;

        // License type distribution
        const licenseTypes: Record<string, number> = {};
        for (const u of records) {
          const type = u.Profile?.Name || u.UserType || "Standard";
          licenseTypes[type] = (licenseTypes[type] || 0) + 1;
        }
        dataPoints.license_types = licenseTypes;
      }

      // Fetch org limits
      const limitsRes = await fetch(`${instanceUrl}/services/data/v59.0/limits`, { headers });
      if (limitsRes.ok) {
        const limits = await limitsRes.json();
        dataPoints.storage_used_mb = limits.DataStorageMB?.Max - limits.DataStorageMB?.Remaining;
        dataPoints.storage_max_mb = limits.DataStorageMB?.Max;
        dataPoints.api_calls_used = limits.DailyApiRequests?.Max - limits.DailyApiRequests?.Remaining;
        dataPoints.api_calls_max = limits.DailyApiRequests?.Max;
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "Unknown error");
    }

    return {
      connectorId: "salesforce-crm",
      fetchedAt: new Date(),
      dataPoints,
      signalCount: Object.keys(dataPoints).length,
      rawRecordCount: (dataPoints.total_licenses as number) || 0,
      executionMs: Date.now() - start,
      errors: errors.length > 0 ? errors : undefined,
    };
  },

  mapToSignals(data: ConnectorOutput): ProofSignal[] {
    const signals: ProofSignal[] = [];
    const dp = data.dataPoints;
    const total = dp.total_licenses as number;
    const inactive = dp.inactive_users_30d as number;

    if (inactive && inactive > 3) {
      const wasteRate = inactive / total;
      const costPerLicense = 150 * 12; // ~150€/month avg Salesforce license
      const waste: [number, number] = [
        Math.round(inactive * costPerLicense * 0.5),
        Math.round(inactive * costPerLicense),
      ];
      signals.push({
        type: "license_waste",
        label: `Salesforce: ${inactive} inactive licenses (${Math.round(wasteRate * 100)}% waste)`,
        description: `${inactive} of ${total} Salesforce users haven't logged in for 30+ days. Waste: ${waste[0].toLocaleString()}-${waste[1].toLocaleString()} EUR/yr.`,
        impactEurRange: waste,
        severity: waste[1] > 50000 ? "critical" : "high",
        evidence: ["salesforce_connector", "user_login_activity"],
      });
    }

    return signals;
  },
};
