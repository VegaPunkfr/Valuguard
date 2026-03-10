/**
 * GHOST TAX — OSINT BACKGROUND WORKER CRON (SERVER-ONLY)
 *
 * GET /api/cron/osint-worker
 *
 * Triggered by Vercel Cron (weekly) or external scheduler.
 * Scans all monitoring_active organizations via OSINT,
 * detects drift vs baseline, generates alerts.
 *
 * Security: requires CRON_SECRET.
 * Schedule: Weekly (recommended) or daily for high-value clients.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  executeOsintWorkerBatch,
  type MonitoringTarget,
} from "@/lib/engines/osint-worker";

export const maxDuration = 300; // 5 minutes for batch processing
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    // Auth guard — cron-only
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: Fetch monitoring_active organizations from Supabase
    // For now, this is a stub that shows the expected flow.
    //
    // const supabase = createAdminSupabase();
    // const { data: orgs } = await supabase
    //   .from("audit_requests")
    //   .select("*")
    //   .eq("status", "monitoring_active");
    //
    // const targets: MonitoringTarget[] = orgs.map(org => ({
    //   orgId: org.id,
    //   domain: org.domain,
    //   headcount: org.headcount,
    //   email: org.email,
    //   alertThreshold: "high",
    //   lastScanAt: org.last_osint_scan_at,
    //   baseline: org.osint_baseline ? JSON.parse(org.osint_baseline) : null,
    // }));

    const targets: MonitoringTarget[] = [];

    if (targets.length === 0) {
      return NextResponse.json({
        message: "No monitoring targets found",
        scanned: 0,
        driftsDetected: 0,
        alertsGenerated: 0,
      });
    }

    const results = await executeOsintWorkerBatch(targets);

    // TODO: Persist results to Supabase
    // - Update osint_baseline for each org
    // - Insert drift records into monitoring_reports
    // - Dispatch email alerts via Resend
    // - Fire webhook alerts

    const totalDrifts = results.reduce((s, r) => s + r.driftCount, 0);
    const totalAlerts = results.reduce((s, r) => s + r.alerts.length, 0);
    const criticalCount = results.reduce((s, r) => s + r.criticalDriftCount, 0);

    return NextResponse.json({
      scanned: results.length,
      driftsDetected: totalDrifts,
      criticalDrifts: criticalCount,
      alertsGenerated: totalAlerts,
      executionMs: results.reduce((s, r) => s + r.executionMs, 0),
      results: results.map((r) => ({
        domain: r.domain,
        drifts: r.driftCount,
        critical: r.criticalDriftCount,
        alerts: r.alerts.length,
        summary: r.driftSummary,
      })),
    });
  } catch (err) {
    console.error("[osint-worker-cron] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
