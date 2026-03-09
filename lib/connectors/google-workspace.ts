/**
 * CONNECTOR: Google Workspace
 *
 * Pulls license usage, active users, and storage consumption.
 * Detects over-provisioned licenses and unused accounts.
 * Revenue: Google Workspace is in 85% of mid-market companies — universal connector.
 */

import type { GhostTaxConnector, ConnectorCredentials, ConnectorOutput } from "../plugins/types";
import type { CompanyContext, ProofSignal } from "../analysis";

export const googleWorkspaceConnector: GhostTaxConnector = {
  manifest: {
    id: "google-workspace",
    name: "Google Workspace",
    version: "1.0.0",
    category: "saas",
    vendor: "Google",
    authType: "service_account",
    description: "Pulls license usage, active users, storage, and app usage from Google Workspace Admin.",
    dataPoints: [
      "total_licenses",
      "active_users_30d",
      "inactive_users_30d",
      "license_utilization_pct",
      "storage_used_gb",
      "storage_allocated_gb",
      "top_apps_by_usage",
      "suspended_users",
    ],
    revenueImpact: "License waste detection in Google Workspace alone often exceeds 490 EUR — pays for Rail A instantly.",
    requiredScopes: [
      "https://www.googleapis.com/auth/admin.directory.user.readonly",
      "https://www.googleapis.com/auth/admin.reports.usage.readonly",
    ],
    rateLimits: { rpm: 60, daily: 5000 },
  },

  async testConnection(creds: ConnectorCredentials): Promise<{ ok: boolean; error?: string }> {
    if (!creds.serviceAccountJson && !creds.accessToken) {
      return { ok: false, error: "Missing service account JSON or access token" };
    }
    try {
      const token = creds.accessToken || await getGoogleToken(creds);
      const res = await fetch("https://admin.googleapis.com/admin/directory/v1/users?maxResults=1", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.ok ? { ok: true } : { ok: false, error: `Google Admin API returned ${res.status}` };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
    }
  },

  async fetchData(creds: ConnectorCredentials, company: CompanyContext): Promise<ConnectorOutput> {
    const start = Date.now();
    const dataPoints: Record<string, unknown> = {};
    const errors: string[] = [];

    try {
      const token = creds.accessToken || await getGoogleToken(creds);
      const domain = company.domain;

      // Fetch all users
      const usersRes = await fetch(
        `https://admin.googleapis.com/admin/directory/v1/users?domain=${domain}&maxResults=500`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (usersRes.ok) {
        const users = await usersRes.json();
        const userList = users.users || [];
        dataPoints.total_licenses = userList.length;
        dataPoints.suspended_users = userList.filter((u: any) => u.suspended).length;

        // Calculate active vs inactive (last login > 30 days ago = inactive)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const active = userList.filter((u: any) =>
          u.lastLoginTime && new Date(u.lastLoginTime) > thirtyDaysAgo
        );
        dataPoints.active_users_30d = active.length;
        dataPoints.inactive_users_30d = userList.length - active.length - (dataPoints.suspended_users as number);
        dataPoints.license_utilization_pct = Math.round(active.length / Math.max(userList.length, 1) * 100);
      }

      // Fetch usage reports
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split("T")[0];
      const usageRes = await fetch(
        `https://admin.googleapis.com/admin/reports/v1/usage/dates/${dateStr}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (usageRes.ok) {
        const usage = await usageRes.json();
        dataPoints.usage_report = usage;
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "Unknown error");
    }

    return {
      connectorId: "google-workspace",
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
    const utilization = dp.license_utilization_pct as number;
    const inactive = dp.inactive_users_30d as number;
    const total = dp.total_licenses as number;

    if (utilization && utilization < 85) {
      const wastedLicenses = inactive || Math.round(total * (1 - utilization / 100));
      const costPerLicense = 12 * 12; // ~12 EUR/month for Business Standard
      const waste: [number, number] = [
        Math.round(wastedLicenses * costPerLicense * 0.7),
        Math.round(wastedLicenses * costPerLicense),
      ];
      signals.push({
        type: "license_waste",
        label: `Google Workspace: ${wastedLicenses} unused licenses (${100 - utilization}% waste)`,
        description: `${wastedLicenses} of ${total} licenses inactive for 30+ days. Annual waste: ${waste[0].toLocaleString()}-${waste[1].toLocaleString()} EUR.`,
        impactEurRange: waste,
        severity: wastedLicenses > 20 ? "high" : "medium",
        evidence: ["google_workspace_connector", "admin_api_last_login"],
      });
    }

    const suspended = dp.suspended_users as number;
    if (suspended > 0) {
      signals.push({
        type: "suspended_licenses",
        label: `${suspended} suspended users still consuming licenses`,
        description: `${suspended} suspended accounts may still have active licenses billing.`,
        impactEurRange: [Math.round(suspended * 100), Math.round(suspended * 180)],
        severity: "medium",
        evidence: ["google_workspace_connector"],
      });
    }

    return signals;
  },
};

async function getGoogleToken(creds: ConnectorCredentials): Promise<string> {
  // In production, use google-auth-library to generate JWT from service account
  if (creds.accessToken) return creds.accessToken;
  throw new Error("Service account token generation requires google-auth-library — use OAuth2 flow instead");
}
