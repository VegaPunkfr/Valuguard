/**
 * CONNECTOR: QuickBooks
 *
 * Pulls expense/vendor data from QuickBooks Online for spend categorization.
 * Identifies ungoverned SaaS purchases, duplicate vendor payments.
 * Revenue: accounting data is the ground truth for exposure — highest-confidence signals.
 */

import type { GhostTaxConnector, ConnectorCredentials, ConnectorOutput } from "../plugins/types";
import type { CompanyContext, ProofSignal } from "../analysis";

export const quickbooksConnector: GhostTaxConnector = {
  manifest: {
    id: "quickbooks",
    name: "QuickBooks Online",
    version: "1.0.0",
    category: "finance",
    vendor: "Intuit",
    authType: "oauth2",
    description: "Pulls vendor expenses, recurring charges, and payment data for precise spend mapping.",
    dataPoints: [
      "vendor_list",
      "recurring_expenses",
      "expense_by_category",
      "duplicate_vendors",
      "unclassified_expenses",
      "yoy_spend_change",
    ],
    revenueImpact: "Accounting data gives highest-confidence exposure signals — upgrades report from 'estimated' to 'observed'.",
    requiredScopes: ["com.intuit.quickbooks.accounting.readonly"],
    rateLimits: { rpm: 500, daily: 50000 },
  },

  async testConnection(creds: ConnectorCredentials): Promise<{ ok: boolean; error?: string }> {
    if (!creds.accessToken) return { ok: false, error: "Missing OAuth access token" };
    try {
      const res = await fetch("https://quickbooks.api.intuit.com/v3/company/companyinfo", {
        headers: { Authorization: `Bearer ${creds.accessToken}`, Accept: "application/json" },
      });
      return res.ok ? { ok: true } : { ok: false, error: `QuickBooks API returned ${res.status}` };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
    }
  },

  async fetchData(creds: ConnectorCredentials, _company: CompanyContext): Promise<ConnectorOutput> {
    const start = Date.now();
    const dataPoints: Record<string, unknown> = {};
    const errors: string[] = [];

    try {
      const realmId = creds.metadata?.realmId || "";

      // Fetch vendor list
      const vendorRes = await fetch(
        `https://quickbooks.api.intuit.com/v3/company/${realmId}/query?query=SELECT * FROM Vendor MAXRESULTS 500`,
        { headers: { Authorization: `Bearer ${creds.accessToken}`, Accept: "application/json" } }
      );
      if (vendorRes.ok) {
        const vendors = await vendorRes.json();
        const vendorList = vendors.QueryResponse?.Vendor || [];
        dataPoints.vendor_count = vendorList.length;
        dataPoints.vendor_names = vendorList.map((v: any) => v.DisplayName);

        // Detect potential duplicates (similar names)
        const names = vendorList.map((v: any) => (v.DisplayName || "").toLowerCase());
        const duplicates: string[] = [];
        for (let i = 0; i < names.length; i++) {
          for (let j = i + 1; j < names.length; j++) {
            if (names[i] && names[j] && (
              names[i].includes(names[j]) || names[j].includes(names[i]) ||
              levenshteinSimilar(names[i], names[j])
            )) {
              duplicates.push(`${vendorList[i].DisplayName} / ${vendorList[j].DisplayName}`);
            }
          }
        }
        dataPoints.duplicate_vendors = duplicates;
      }

      // Fetch expenses by category
      const expenseRes = await fetch(
        `https://quickbooks.api.intuit.com/v3/company/${realmId}/query?query=SELECT * FROM Purchase WHERE TxnDate >= '2025-01-01' MAXRESULTS 500`,
        { headers: { Authorization: `Bearer ${creds.accessToken}`, Accept: "application/json" } }
      );
      if (expenseRes.ok) {
        const expenses = await expenseRes.json();
        const purchaseList = expenses.QueryResponse?.Purchase || [];
        dataPoints.expense_count = purchaseList.length;
        dataPoints.total_expenses = purchaseList.reduce((sum: number, p: any) => sum + (p.TotalAmt || 0), 0);

        // Categorize
        const byCategory: Record<string, number> = {};
        for (const p of purchaseList) {
          const cat = p.Line?.[0]?.AccountBasedExpenseLineDetail?.AccountRef?.name || "Unclassified";
          byCategory[cat] = (byCategory[cat] || 0) + (p.TotalAmt || 0);
        }
        dataPoints.expense_by_category = byCategory;
        dataPoints.unclassified_expenses = byCategory["Unclassified"] || 0;
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "Unknown error");
    }

    return {
      connectorId: "quickbooks",
      fetchedAt: new Date(),
      dataPoints,
      signalCount: Object.keys(dataPoints).length,
      rawRecordCount: (dataPoints.vendor_count as number || 0) + (dataPoints.expense_count as number || 0),
      executionMs: Date.now() - start,
      errors: errors.length > 0 ? errors : undefined,
    };
  },

  mapToSignals(data: ConnectorOutput): ProofSignal[] {
    const signals: ProofSignal[] = [];
    const dp = data.dataPoints;
    const duplicates = dp.duplicate_vendors as string[] | undefined;

    if (duplicates && duplicates.length > 0) {
      signals.push({
        type: "duplicate_vendor",
        label: `${duplicates.length} potential duplicate vendors`,
        description: `Detected ${duplicates.length} vendor pairs with similar names — possible duplicate payments: ${duplicates.slice(0, 3).join("; ")}.`,
        impactEurRange: null,
        severity: duplicates.length > 5 ? "high" : "medium",
        evidence: ["quickbooks_connector"],
      });
    }

    if ((dp.unclassified_expenses as number) > 1000) {
      signals.push({
        type: "unclassified_spend",
        label: "Unclassified expenses detected",
        description: `${(dp.unclassified_expenses as number).toLocaleString()} EUR in unclassified expenses — shadow IT risk.`,
        impactEurRange: [Math.round((dp.unclassified_expenses as number) * 0.3), dp.unclassified_expenses as number],
        severity: "medium",
        evidence: ["quickbooks_connector"],
      });
    }

    return signals;
  },
};

function levenshteinSimilar(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 3) return false;
  let diff = 0;
  const minLen = Math.min(a.length, b.length);
  for (let i = 0; i < minLen; i++) {
    if (a[i] !== b[i]) diff++;
  }
  return diff <= 2 && minLen > 4;
}
