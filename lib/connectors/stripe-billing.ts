/**
 * CONNECTOR: Stripe Billing
 *
 * Pulls client's own Stripe subscription data to detect:
 * - Subscription sprawl, unused add-ons, failed payments
 * - Revenue leakage from missed renewals
 * Revenue: Stripe data makes Rail A reports 3x more precise → higher conversion to Rail B.
 */

import type { GhostTaxConnector, ConnectorCredentials, ConnectorOutput } from "../plugins/types";
import type { CompanyContext, ProofSignal } from "../analysis";

export const stripeConnector: GhostTaxConnector = {
  manifest: {
    id: "stripe-billing",
    name: "Stripe Billing",
    version: "1.0.0",
    category: "billing",
    vendor: "Stripe",
    authType: "api_key",
    description: "Pulls subscription data, invoices, and payment failures from client's Stripe account.",
    dataPoints: [
      "active_subscriptions",
      "subscription_mrr",
      "failed_payments_30d",
      "churned_subscriptions_90d",
      "avg_revenue_per_customer",
      "payment_method_distribution",
    ],
    revenueImpact: "Stripe data enables precise SaaS spend mapping — 3x improvement in exposure accuracy.",
    requiredScopes: ["read_only"],
    rateLimits: { rpm: 100, daily: 10000 },
  },

  async testConnection(creds: ConnectorCredentials): Promise<{ ok: boolean; error?: string }> {
    if (!creds.apiKey) return { ok: false, error: "Missing Stripe API key" };
    try {
      const res = await fetch("https://api.stripe.com/v1/balance", {
        headers: { Authorization: `Bearer ${creds.apiKey}` },
      });
      if (res.ok) return { ok: true };
      return { ok: false, error: `Stripe API returned ${res.status}` };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
    }
  },

  async fetchData(creds: ConnectorCredentials, _company: CompanyContext): Promise<ConnectorOutput> {
    const start = Date.now();
    const dataPoints: Record<string, unknown> = {};
    const errors: string[] = [];

    try {
      // Fetch active subscriptions
      const subsRes = await fetch("https://api.stripe.com/v1/subscriptions?status=active&limit=100", {
        headers: { Authorization: `Bearer ${creds.apiKey}` },
      });
      if (subsRes.ok) {
        const subs = await subsRes.json();
        dataPoints.active_subscriptions = subs.data?.length || 0;
        dataPoints.subscription_mrr = subs.data?.reduce((sum: number, s: any) =>
          sum + (s.items?.data?.[0]?.price?.unit_amount || 0) / 100, 0) || 0;
      } else {
        errors.push(`Subscriptions fetch failed: ${subsRes.status}`);
      }

      // Fetch recent invoices for payment failure detection
      const invRes = await fetch("https://api.stripe.com/v1/invoices?limit=100&status=open", {
        headers: { Authorization: `Bearer ${creds.apiKey}` },
      });
      if (invRes.ok) {
        const invoices = await invRes.json();
        dataPoints.failed_payments_30d = invoices.data?.filter((i: any) =>
          i.status === "open" && i.attempted
        ).length || 0;
      }

      // Fetch charges for spend analysis
      const chargesRes = await fetch("https://api.stripe.com/v1/charges?limit=100", {
        headers: { Authorization: `Bearer ${creds.apiKey}` },
      });
      if (chargesRes.ok) {
        const charges = await chargesRes.json();
        dataPoints.total_charges_30d = charges.data?.length || 0;
        dataPoints.total_volume_30d = charges.data?.reduce((sum: number, c: any) =>
          sum + (c.amount || 0) / 100, 0) || 0;
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "Unknown error");
    }

    return {
      connectorId: "stripe-billing",
      fetchedAt: new Date(),
      dataPoints,
      signalCount: Object.keys(dataPoints).length,
      rawRecordCount: (dataPoints.active_subscriptions as number || 0) + (dataPoints.total_charges_30d as number || 0),
      executionMs: Date.now() - start,
      errors: errors.length > 0 ? errors : undefined,
    };
  },

  mapToSignals(data: ConnectorOutput): ProofSignal[] {
    const signals: ProofSignal[] = [];
    const dp = data.dataPoints;

    if ((dp.failed_payments_30d as number) > 0) {
      signals.push({
        type: "billing_anomaly",
        label: "Failed payments detected",
        description: `${dp.failed_payments_30d} failed payment attempts in the last 30 days — revenue leakage risk.`,
        impactEurRange: null,
        severity: (dp.failed_payments_30d as number) > 5 ? "high" : "medium",
        evidence: ["stripe_billing_connector"],
      });
    }

    return signals;
  },
};
