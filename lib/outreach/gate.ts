/**
 * LOT 1 / OBS-0 — Quality Gate
 * Évalue les 4 métriques doctrinales et retourne PASS/PARTIAL/FAIL.
 */

import { createAdminSupabase } from "@/lib/supabase";

export const THRESHOLDS = {
  COVERAGE_MIN: 0.9,
  ORPHAN_RATE_MAX: 0.05,
  RESEND_RECON_MIN: 0.7,
  SENT_WITHOUT_EVENT_MAX: 0,
} as const;

export type GateStatus = "PASS" | "PARTIAL" | "FAIL";

export interface GateReport {
  status: GateStatus;
  metrics: {
    coverage: number;
    orphan_rate: number;
    resend_reconciliation: number | null; // null si Resend indisponible
    sent_without_event: number;
    total_sent_accounts: number;
    total_bootstrap_events: number;
    total_orphans: number;
    resend_available: boolean;
  };
  reasons: string[];
}

export async function evaluateGate(): Promise<GateReport> {
  const supabase = createAdminSupabase();
  if (!supabase) {
    return {
      status: "FAIL",
      metrics: {
        coverage: 0,
        orphan_rate: 0,
        resend_reconciliation: null,
        sent_without_event: 0,
        total_sent_accounts: 0,
        total_bootstrap_events: 0,
        total_orphans: 0,
        resend_available: false,
      },
      reasons: ["supabase_not_configured"],
    };
  }

  // Sent accounts count
  const { count: totalSent } = await (supabase as any)
    .from("sprint_accounts")
    .select("id", { count: "exact", head: true })
    .eq("status", "SENT");

  // Sent accounts WITH at least one outreach_event SEND_*
  const { data: coveredRows } = await (supabase as any)
    .from("outreach_events")
    .select("client_id")
    .in("kind", ["SEND_SUCCESS", "SEND_ATTEMPT"])
    .not("client_id", "is", null);
  const coveredIds = new Set<string>((coveredRows ?? []).map((r: any) => r.client_id));

  // Sent-without-event : sprint_accounts SENT not in coveredIds
  const { data: sentAccounts } = await (supabase as any)
    .from("sprint_accounts")
    .select("id")
    .eq("status", "SENT");
  const sentWithoutEvent = (sentAccounts ?? []).filter((r: any) => !coveredIds.has(r.id)).length;

  // Bootstrap events count
  const { count: totalBootstrap } = await (supabase as any)
    .from("outreach_events")
    .select("id", { count: "exact", head: true })
    .in("ingest_mode", ["bootstrap", "internal_backfill"]);

  // Orphans count (bootstrap only)
  const { count: totalOrphans } = await (supabase as any)
    .from("outreach_events")
    .select("id", { count: "exact", head: true })
    .eq("orphan", true);

  // Resend reconciliation (resend_only or matched / total bootstrap)
  const { count: resendRecon } = await (supabase as any)
    .from("outreach_events")
    .select("id", { count: "exact", head: true })
    .in("reconciliation", ["resend_only", "matched"]);

  const { count: resendAvailCount } = await (supabase as any)
    .from("outreach_events")
    .select("id", { count: "exact", head: true })
    .eq("provider", "resend");
  const resendAvailable = (resendAvailCount ?? 0) > 0;

  const coverage = totalSent && totalSent > 0 ? coveredIds.size / totalSent : 0;
  const orphanRate =
    totalBootstrap && totalBootstrap > 0 ? (totalOrphans ?? 0) / totalBootstrap : 0;
  const resendRecRate = resendAvailable
    ? totalBootstrap && totalBootstrap > 0
      ? (resendRecon ?? 0) / totalBootstrap
      : 0
    : null;

  const reasons: string[] = [];
  let status: GateStatus = "PASS";

  if (sentWithoutEvent > THRESHOLDS.SENT_WITHOUT_EVENT_MAX) {
    status = "FAIL";
    reasons.push(`sent_without_event=${sentWithoutEvent} > 0`);
  }
  if (coverage < THRESHOLDS.COVERAGE_MIN) {
    status = "FAIL";
    reasons.push(`coverage=${coverage.toFixed(3)} < ${THRESHOLDS.COVERAGE_MIN}`);
  }
  if (status !== "FAIL") {
    if (orphanRate > THRESHOLDS.ORPHAN_RATE_MAX) {
      status = "PARTIAL";
      reasons.push(`orphan_rate=${orphanRate.toFixed(3)} > ${THRESHOLDS.ORPHAN_RATE_MAX}`);
    }
    if (
      resendAvailable &&
      resendRecRate !== null &&
      resendRecRate < THRESHOLDS.RESEND_RECON_MIN
    ) {
      status = "PARTIAL";
      reasons.push(
        `resend_reconciliation=${resendRecRate.toFixed(3)} < ${THRESHOLDS.RESEND_RECON_MIN}`,
      );
    }
    if (!resendAvailable) {
      status = status === "PASS" ? "PARTIAL" : status;
      reasons.push("resend_unavailable_fallback_internal_only");
    }
  }

  return {
    status,
    metrics: {
      coverage,
      orphan_rate: orphanRate,
      resend_reconciliation: resendRecRate,
      sent_without_event: sentWithoutEvent,
      total_sent_accounts: totalSent ?? 0,
      total_bootstrap_events: totalBootstrap ?? 0,
      total_orphans: totalOrphans ?? 0,
      resend_available: resendAvailable,
    },
    reasons,
  };
}
