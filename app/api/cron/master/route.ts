/**
 * GHOST TAX — MASTER CRON ORCHESTRATOR
 *
 * GET /api/cron/master
 * Schedule: daily 06:00 UTC
 *
 * Runs ALL automated systems in the correct order:
 *
 *   1. Intent Scan (find new prospects via OSINT)
 *   2. Checkout Recovery (recover abandoned payments)
 *   3. Flywheel Engine (scan emails, market signals, expiration, monitoring)
 *   4. Outreach Drip (send next touch to active leads)
 *   5. Visitor Intel (process anonymous visitor data)
 *
 * Each stage runs sequentially to prevent resource contention.
 * Individual stages are also available as standalone crons for manual triggering.
 *
 * Security: requires CRON_SECRET.
 */

import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300; // 5 minutes total

interface StageResult {
  stage: string;
  success: boolean;
  durationMs: number;
  data?: Record<string, unknown>;
  error?: string;
}

async function runStage(
  name: string,
  fn: () => Promise<Record<string, unknown>>,
): Promise<StageResult> {
  const start = Date.now();
  try {
    const data = await fn();
    return { stage: name, success: true, durationMs: Date.now() - start, data };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[Master Cron] Stage "${name}" failed:`, error);
    return { stage: name, success: false, durationMs: Date.now() - start, error };
  }
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const provided = req.headers.get("authorization")?.replace("Bearer ", "");
    if (provided !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const masterStart = Date.now();
  const stages: StageResult[] = [];

  console.log("[Master Cron] ════════════════════════════════════════");
  console.log("[Master Cron] Daily automation cycle starting...");
  console.log("[Master Cron] ════════════════════════════════════════");

  // ── Stage 1: Intent-Based OSINT Scan ──────────────────
  stages.push(await runStage("intent_scan", async () => {
    const { scanForIntentSignals, deduplicateAgainstPipeline } = await import("@/lib/intent-scanner");
    const prospects = await scanForIntentSignals({ maxResults: 30, daysBack: 7 });
    const deduped = await deduplicateAgainstPipeline(prospects);
    return {
      rawProspects: prospects.length,
      afterDedup: deduped.length,
      hot: deduped.filter(p => p.grade === "HOT").length,
      warm: deduped.filter(p => p.grade === "WARM").length,
    };
  }));

  // ── Stage 2: Checkout Recovery ────────────────────────
  stages.push(await runStage("checkout_recovery", async () => {
    const { runCheckoutRecovery } = await import("@/lib/checkout-recovery");
    const result = await runCheckoutRecovery();
    return {
      processed: result.processed,
      emailsSent: result.emailsSent,
      skipped: result.skipped,
      errors: result.errors,
    };
  }));

  // ── Stage 3: Flywheel Engine ──────────────────────────
  stages.push(await runStage("flywheel", async () => {
    const { runEngine } = await import("@/lib/flywheel");
    const result = await runEngine();
    return {
      totalProcessed: result.totalProcessed,
      totalSent: result.totalSent,
      totalErrors: result.totalErrors,
      stages: result.stages.map(s => ({ stage: s.stage, sent: s.sent, errors: s.errors })),
    };
  }));

  // ── Stage 4: Outreach Drip ────────────────────────────
  stages.push(await runStage("outreach_drip", async () => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ghost-tax.com";
    const authHeader = cronSecret || process.env.OUTREACH_API_KEY || "";
    const res = await fetch(`${siteUrl}/api/outreach/drip`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": authHeader },
    });
    return await res.json();
  }));

  // ── Stage 5: Visitor Intelligence ─────────────────────
  stages.push(await runStage("visitor_intel", async () => {
    try {
      const { runVisitorIntelBatch } = await import("@/lib/visitor-intel");
      const result = await runVisitorIntelBatch();
      return {
        identified: result.identified,
        b2bCompanies: result.b2bCompanies,
        highIntent: result.highIntent,
        enriched: result.enriched,
      };
    } catch {
      // Visitor intel is optional — may not have data yet
      return { skipped: true, reason: "No visitor data or module not ready" };
    }
  }));

  // ── Summary ───────────────────────────────────────────
  const totalDuration = Date.now() - masterStart;
  const successful = stages.filter(s => s.success).length;
  const failed = stages.filter(s => !s.success).length;

  const summary = {
    success: failed === 0,
    timestamp: new Date().toISOString(),
    totalDurationMs: totalDuration,
    stagesRun: stages.length,
    stagesSucceeded: successful,
    stagesFailed: failed,
    stages,
  };

  console.log("[Master Cron] ════════════════════════════════════════");
  console.log(`[Master Cron] Complete: ${successful}/${stages.length} stages OK (${totalDuration}ms)`);
  if (failed > 0) {
    console.log(`[Master Cron] FAILED: ${stages.filter(s => !s.success).map(s => s.stage).join(", ")}`);
  }
  console.log("[Master Cron] ════════════════════════════════════════");

  return NextResponse.json(summary, { status: failed > 0 ? 207 : 200 });
}
