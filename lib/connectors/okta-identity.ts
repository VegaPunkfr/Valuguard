/**
 * CONNECTOR: Okta Identity
 *
 * Pulls SSO app assignments and login data to map actual SaaS usage.
 * The "ground truth" for which tools people actually use.
 * Revenue: Okta data transforms guesswork into observed intelligence — Rail A report quality 5x.
 */

import type { GhostTaxConnector, ConnectorCredentials, ConnectorOutput } from "../plugins/types";
import type { ProofSignal } from "../analysis";

export const oktaConnector: GhostTaxConnector = {
  manifest: {
    id: "okta-identity",
    name: "Okta Identity",
    version: "1.0.0",
    category: "identity",
    vendor: "Okta",
    authType: "api_key",
    description: "Pulls SSO app assignments, user activity, and authentication logs for usage-based intelligence.",
    dataPoints: [
      "total_users",
      "active_users_30d",
      "assigned_apps",
      "app_usage_by_user",
      "deprovisioned_users",
      "apps_with_no_logins_30d",
      "shadow_apps_detected",
    ],
    revenueImpact: "Okta SSO data is the ground truth for SaaS usage — transforms estimated signals to observed signals.",
    requiredScopes: ["okta.users.read", "okta.apps.read", "okta.logs.read"],
    rateLimits: { rpm: 600, daily: 50000 },
  },

  async testConnection(creds: ConnectorCredentials): Promise<{ ok: boolean; error?: string }> {
    if (!creds.apiKey || !creds.metadata?.domain) {
      return { ok: false, error: "Missing Okta API token or domain" };
    }
    try {
      const res = await fetch(`https://${creds.metadata.domain}/api/v1/org`, {
        headers: { Authorization: `SSWS ${creds.apiKey}` },
      });
      return res.ok ? { ok: true } : { ok: false, error: `Okta API returned ${res.status}` };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
    }
  },

  async fetchData(creds: ConnectorCredentials): Promise<ConnectorOutput> {
    const start = Date.now();
    const dataPoints: Record<string, unknown> = {};
    const errors: string[] = [];
    const domain = creds.metadata?.domain || "";
    const headers = { Authorization: `SSWS ${creds.apiKey}` };

    try {
      // Fetch all users
      const usersRes = await fetch(`https://${domain}/api/v1/users?limit=200&filter=status eq "ACTIVE"`, { headers });
      if (usersRes.ok) {
        const users = await usersRes.json();
        dataPoints.total_users = users.length;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const active = users.filter((u: any) =>
          u.lastLogin && new Date(u.lastLogin) > thirtyDaysAgo
        );
        dataPoints.active_users_30d = active.length;
        dataPoints.inactive_users_30d = users.length - active.length;
      }

      // Fetch apps
      const appsRes = await fetch(`https://${domain}/api/v1/apps?limit=200&filter=status eq "ACTIVE"`, { headers });
      if (appsRes.ok) {
        const apps = await appsRes.json();
        dataPoints.assigned_apps = apps.length;
        dataPoints.app_list = apps.map((a: any) => ({
          name: a.label,
          status: a.status,
          signOnMode: a.signOnMode,
          created: a.created,
        }));

        // Detect apps with low SSO adoption (potential shadow IT indicator)
        const samlApps = apps.filter((a: any) => a.signOnMode === "SAML_2_0" || a.signOnMode === "OPENID_CONNECT");
        const nonSsoApps = apps.filter((a: any) => a.signOnMode === "BROWSER_PLUGIN" || a.signOnMode === "BOOKMARK");
        dataPoints.sso_apps = samlApps.length;
        dataPoints.non_sso_apps = nonSsoApps.length;
      }

      // Fetch recent system logs for app usage
      const logsRes = await fetch(
        `https://${domain}/api/v1/logs?since=${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()}&filter=eventType eq "user.authentication.sso"&limit=1000`,
        { headers }
      );
      if (logsRes.ok) {
        const logs = await logsRes.json();
        const appUsage: Record<string, Set<string>> = {};
        for (const log of logs) {
          const app = log.target?.[0]?.displayName || "Unknown";
          const user = log.actor?.id || "Unknown";
          if (!appUsage[app]) appUsage[app] = new Set();
          appUsage[app].add(user);
        }
        dataPoints.app_active_users = Object.fromEntries(
          Object.entries(appUsage).map(([app, users]) => [app, users.size])
        );
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "Unknown error");
    }

    return {
      connectorId: "okta-identity",
      fetchedAt: new Date(),
      dataPoints,
      signalCount: Object.keys(dataPoints).length,
      rawRecordCount: ((dataPoints.total_users as number) || 0) + ((dataPoints.assigned_apps as number) || 0),
      executionMs: Date.now() - start,
      errors: errors.length > 0 ? errors : undefined,
    };
  },

  mapToSignals(data: ConnectorOutput): ProofSignal[] {
    const signals: ProofSignal[] = [];
    const dp = data.dataPoints;

    const nonSso = dp.non_sso_apps as number;
    if (nonSso && nonSso > 5) {
      signals.push({
        type: "shadow_it",
        label: `${nonSso} apps without SSO integration`,
        description: `${nonSso} applications use browser plugin or bookmark auth instead of SAML/OIDC — shadow IT and security risk.`,
        impactEurRange: null,
        severity: nonSso > 15 ? "high" : "medium",
        evidence: ["okta_identity_connector", "app_signOnMode"],
      });
    }

    const inactive = dp.inactive_users_30d as number;
    const total = dp.total_users as number;
    if (inactive && inactive > 5) {
      signals.push({
        type: "inactive_sso_users",
        label: `${inactive} Okta users inactive 30+ days`,
        description: `${inactive} of ${total} users haven't authenticated via SSO in 30 days — likely have active licenses across multiple SaaS tools.`,
        impactEurRange: [Math.round(inactive * 100 * 12 * 0.3), Math.round(inactive * 100 * 12)],
        severity: "high",
        evidence: ["okta_identity_connector", "lastLogin"],
      });
    }

    return signals;
  },
};
