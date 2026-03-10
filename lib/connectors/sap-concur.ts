/**
 * CONNECTOR: SAP Concur
 *
 * Pulls expense reports and vendor payments for spend categorization.
 * Detects SaaS charges hiding in expense reports (shadow IT via credit cards).
 * Revenue: Concur data reveals the "dark spend" — charges procurement never sees.
 */

import type { GhostTaxConnector, ConnectorCredentials, ConnectorOutput } from "../plugins/types";
import type { ProofSignal } from "../analysis";

// Known SaaS vendors that appear in expense reports
const SAAS_EXPENSE_PATTERNS = [
  "aws", "amazon web services", "google cloud", "azure", "microsoft",
  "salesforce", "slack", "zoom", "dropbox", "notion", "figma",
  "datadog", "snowflake", "twilio", "sendgrid", "hubspot",
  "github", "gitlab", "jira", "atlassian", "confluence",
  "monday.com", "asana", "clickup", "linear", "canva",
  "openai", "anthropic", "chatgpt", "copilot",
  "grammarly", "loom", "miro", "airtable",
];

export const sapConcurConnector: GhostTaxConnector = {
  manifest: {
    id: "sap-concur",
    name: "SAP Concur",
    version: "1.0.0",
    category: "finance",
    vendor: "SAP",
    authType: "oauth2",
    description: "Pulls expense reports to detect SaaS charges hidden in employee expenses (shadow IT via credit cards).",
    dataPoints: [
      "total_expense_reports",
      "saas_charges_in_expenses",
      "shadow_it_vendors",
      "unclassified_tech_spend",
      "recurring_expense_patterns",
      "top_vendors_by_spend",
    ],
    revenueImpact: "Dark spend in expense reports averages 8-15% of total SaaS spend — invisible to procurement.",
    requiredScopes: ["expense.report.read", "expense.entry.read"],
    rateLimits: { rpm: 30, daily: 5000 },
  },

  async testConnection(creds: ConnectorCredentials): Promise<{ ok: boolean; error?: string }> {
    if (!creds.accessToken) return { ok: false, error: "Missing SAP Concur OAuth token" };
    try {
      const baseUrl = creds.metadata?.datacenter === "eu"
        ? "https://eu2.concursolutions.com"
        : "https://us2.concursolutions.com";
      const res = await fetch(`${baseUrl}/api/v3.0/common/suppliers?limit=1`, {
        headers: { Authorization: `Bearer ${creds.accessToken}`, Accept: "application/json" },
      });
      return res.ok ? { ok: true } : { ok: false, error: `Concur API returned ${res.status}` };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
    }
  },

  async fetchData(creds: ConnectorCredentials): Promise<ConnectorOutput> {
    const start = Date.now();
    const dataPoints: Record<string, unknown> = {};
    const errors: string[] = [];
    const baseUrl = creds.metadata?.datacenter === "eu"
      ? "https://eu2.concursolutions.com"
      : "https://us2.concursolutions.com";
    const headers = { Authorization: `Bearer ${creds.accessToken}`, Accept: "application/json" };

    try {
      // Fetch expense reports from last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const dateFilter = sixMonthsAgo.toISOString().split("T")[0];

      const reportsRes = await fetch(
        `${baseUrl}/api/v3.0/expense/reports?modifiedDateAfter=${dateFilter}&limit=100`,
        { headers }
      );
      if (reportsRes.ok) {
        const reports = await reportsRes.json();
        const reportItems = reports.Items || [];
        dataPoints.total_expense_reports = reportItems.length;
        dataPoints.total_expense_amount = reportItems.reduce((sum: number, r: any) => sum + (r.Total || 0), 0);

        // Scan expense entries for SaaS vendor names
        const saasCharges: { vendor: string; amount: number; count: number }[] = [];
        const vendorCounts: Record<string, { amount: number; count: number }> = {};

        for (const report of reportItems.slice(0, 50)) { // Limit to 50 reports for rate limiting
          const entriesRes = await fetch(
            `${baseUrl}/api/v3.0/expense/entries?reportID=${report.ID}&limit=100`,
            { headers }
          );
          if (entriesRes.ok) {
            const entries = await entriesRes.json();
            for (const entry of entries.Items || []) {
              const vendorName = (entry.VendorDescription || entry.VendorName || "").toLowerCase();
              const desc = (entry.Description || "").toLowerCase();
              const combined = vendorName + " " + desc;

              const matchedSaaS = SAAS_EXPENSE_PATTERNS.find(p => combined.includes(p));
              if (matchedSaaS) {
                if (!vendorCounts[matchedSaaS]) vendorCounts[matchedSaaS] = { amount: 0, count: 0 };
                vendorCounts[matchedSaaS].amount += entry.TransactionAmount || 0;
                vendorCounts[matchedSaaS].count += 1;
              }
            }
          }
        }

        for (const [vendor, data] of Object.entries(vendorCounts)) {
          saasCharges.push({ vendor, ...data });
        }
        saasCharges.sort((a, b) => b.amount - a.amount);

        dataPoints.saas_charges_in_expenses = saasCharges;
        dataPoints.shadow_it_vendor_count = saasCharges.length;
        dataPoints.shadow_it_total_spend = saasCharges.reduce((s, c) => s + c.amount, 0);
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "Unknown error");
    }

    return {
      connectorId: "sap-concur",
      fetchedAt: new Date(),
      dataPoints,
      signalCount: Object.keys(dataPoints).length,
      rawRecordCount: (dataPoints.total_expense_reports as number) || 0,
      executionMs: Date.now() - start,
      errors: errors.length > 0 ? errors : undefined,
    };
  },

  mapToSignals(data: ConnectorOutput): ProofSignal[] {
    const signals: ProofSignal[] = [];
    const dp = data.dataPoints;
    const shadowSpend = dp.shadow_it_total_spend as number;
    const shadowVendors = dp.shadow_it_vendor_count as number;

    if (shadowSpend && shadowSpend > 500) {
      const annualized: [number, number] = [
        Math.round(shadowSpend * 1.5), // 6 months extrapolated conservatively
        Math.round(shadowSpend * 2.2), // with growth factor
      ];
      signals.push({
        type: "shadow_it_expense",
        label: `${shadowVendors} SaaS vendors in expense reports (shadow IT)`,
        description: `${shadowVendors} SaaS vendors totaling ${shadowSpend.toLocaleString()} EUR found in expense reports — bypassing procurement. Annualized: ${annualized[0].toLocaleString()}-${annualized[1].toLocaleString()} EUR.`,
        impactEurRange: annualized,
        severity: shadowSpend > 10000 ? "critical" : "high",
        evidence: ["sap_concur_connector", "expense_entry_scan"],
      });
    }

    return signals;
  },
};
