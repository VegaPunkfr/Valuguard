/**
 * CONNECTOR: Jira / Atlassian
 *
 * Pulls project and user data to detect license waste in Atlassian suite.
 * Revenue: Atlassian is in 70% of tech companies — easy win for license audit.
 */

import type { GhostTaxConnector, ConnectorCredentials, ConnectorOutput } from "../plugins/types";
import type { CompanyContext, ProofSignal } from "../analysis";

export const jiraConnector: GhostTaxConnector = {
  manifest: {
    id: "jira-projects",
    name: "Jira / Atlassian",
    version: "1.0.0",
    category: "project",
    vendor: "Atlassian",
    authType: "api_key",
    description: "Pulls project data, user activity, and license info from Jira Cloud for usage analysis.",
    dataPoints: [
      "total_users",
      "active_users_30d",
      "project_count",
      "issues_created_30d",
      "atlassian_products",
      "inactive_users",
    ],
    revenueImpact: "Atlassian license waste (inactive Jira/Confluence users) is a common quick-win finding.",
    requiredScopes: ["read:jira-work", "read:jira-user"],
    rateLimits: { rpm: 60, daily: 5000 },
  },

  async testConnection(creds: ConnectorCredentials): Promise<{ ok: boolean; error?: string }> {
    if (!creds.apiKey || !creds.metadata?.email || !creds.metadata?.domain) {
      return { ok: false, error: "Missing API token, email, or Atlassian domain" };
    }
    try {
      const auth = Buffer.from(`${creds.metadata.email}:${creds.apiKey}`).toString("base64");
      const res = await fetch(`https://${creds.metadata.domain}.atlassian.net/rest/api/3/myself`, {
        headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
      });
      return res.ok ? { ok: true } : { ok: false, error: `Jira API returned ${res.status}` };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
    }
  },

  async fetchData(creds: ConnectorCredentials): Promise<ConnectorOutput> {
    const start = Date.now();
    const dataPoints: Record<string, unknown> = {};
    const errors: string[] = [];
    const domain = creds.metadata?.domain || "";
    const auth = Buffer.from(`${creds.metadata?.email}:${creds.apiKey}`).toString("base64");
    const headers = { Authorization: `Basic ${auth}`, Accept: "application/json" };

    try {
      // Fetch users
      const usersRes = await fetch(
        `https://${domain}.atlassian.net/rest/api/3/users/search?maxResults=1000`,
        { headers }
      );
      if (usersRes.ok) {
        const users = await usersRes.json();
        const activeUsers = users.filter((u: any) => u.active);
        dataPoints.total_users = activeUsers.length;
      }

      // Fetch projects
      const projRes = await fetch(
        `https://${domain}.atlassian.net/rest/api/3/project/search?maxResults=100`,
        { headers }
      );
      if (projRes.ok) {
        const projects = await projRes.json();
        dataPoints.project_count = projects.total || projects.values?.length || 0;
      }

      // Fetch recent issues to gauge activity
      const jql = encodeURIComponent("created >= -30d ORDER BY created DESC");
      const issueRes = await fetch(
        `https://${domain}.atlassian.net/rest/api/3/search?jql=${jql}&maxResults=0`,
        { headers }
      );
      if (issueRes.ok) {
        const issues = await issueRes.json();
        dataPoints.issues_created_30d = issues.total || 0;
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "Unknown error");
    }

    return {
      connectorId: "jira-projects",
      fetchedAt: new Date(),
      dataPoints,
      signalCount: Object.keys(dataPoints).length,
      rawRecordCount: (dataPoints.total_users as number) || 0,
      executionMs: Date.now() - start,
      errors: errors.length > 0 ? errors : undefined,
    };
  },

  mapToSignals(data: ConnectorOutput): ProofSignal[] {
    const signals: ProofSignal[] = [];
    const dp = data.dataPoints;
    const totalUsers = dp.total_users as number;
    const issues = dp.issues_created_30d as number;

    // Low activity per user suggests over-provisioning
    if (totalUsers && issues && totalUsers > 10) {
      const issuesPerUser = issues / totalUsers;
      if (issuesPerUser < 2) {
        const estimatedInactive = Math.round(totalUsers * 0.3);
        const costPerSeat = 8.15 * 12; // Jira Standard ~8.15€/mo
        const waste: [number, number] = [
          Math.round(estimatedInactive * costPerSeat * 0.5),
          Math.round(estimatedInactive * costPerSeat),
        ];
        signals.push({
          type: "low_adoption",
          label: `Jira: low activity (${issuesPerUser.toFixed(1)} issues/user/month)`,
          description: `~${estimatedInactive} users likely inactive. Waste: ${waste[0].toLocaleString()}-${waste[1].toLocaleString()} EUR/yr.`,
          impactEurRange: waste,
          severity: "medium",
          evidence: ["jira_connector", "issue_activity"],
        });
      }
    }

    return signals;
  },
};
