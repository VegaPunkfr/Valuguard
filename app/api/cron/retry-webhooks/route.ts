/**
 * GHOST TAX — WEBHOOK RETRY CRON ENDPOINT
 *
 * Processes the webhook retry queue on a schedule.
 * Vercel Cron calls this endpoint (configure in vercel.json).
 *
 * Recommended schedule: every 5 minutes.
 * Configure in vercel.json with path "/api/cron/retry-webhooks"
 *
 * Protected by CRON_SECRET to prevent unauthorized triggers.
 */

import { NextRequest, NextResponse } from "next/server";
import { processRetryQueue, getDeadLetterQueue } from "@/lib/webhook-retry";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sets this automatically for cron jobs)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    const results = await processRetryQueue();

    const summary = {
      processed: results.length,
      completed: results.filter((r) => r.status === "completed").length,
      retrying: results.filter((r) => r.status === "retrying").length,
      deadLettered: results.filter((r) => r.status === "dead_letter").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      durationMs: Date.now() - startTime,
      results,
    };

    // Log dead letter count for monitoring visibility
    if (summary.deadLettered > 0) {
      const dlQueue = await getDeadLetterQueue();
      console.error(
        `[Webhook Retry Cron] ${summary.deadLettered} job(s) moved to dead letter. ` +
        `Total dead-lettered: ${dlQueue.length}`,
      );
    }

    if (results.length > 0) {
      console.log(
        `[Webhook Retry Cron] Processed ${summary.processed}: ` +
        `${summary.completed} completed, ${summary.retrying} retrying, ` +
        `${summary.deadLettered} dead-lettered (${summary.durationMs}ms)`,
      );
    }

    return NextResponse.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Webhook Retry Cron] Fatal error:", message);
    return NextResponse.json(
      { error: message, durationMs: Date.now() - startTime },
      { status: 500 },
    );
  }
}
