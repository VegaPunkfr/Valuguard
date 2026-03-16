/**
 * GHOST TAX — BEHAVIORAL ORCHESTRATOR CRON (Every 2 hours)
 *
 * Runs the behavior-driven engagement orchestrator.
 * Replaces time-based drip as the primary nurture engine.
 * The drip cron still exists as fallback for leads with no behavioral signals.
 *
 * Schedule: every 2 hours
 * Auth: CRON_SECRET
 * Max: 50 actions per run
 *
 * GET /api/cron/orchestrator
 * Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from "next/server";
import { runOrchestrator } from "@/lib/orchestrator";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Verify cron secret
  if (!process.env.CRON_SECRET) {
    return new Response("CRON_SECRET not configured", { status: 503 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runOrchestrator();

    console.log(
      `[Orchestrator] Complete in ${result.durationMs}ms: ` +
        `${result.processed} domains processed, ` +
        `${result.actionsFired} actions fired, ` +
        `${result.emailsSent} emails sent, ` +
        `${result.suppressed} suppressed, ` +
        `${result.errors} errors`
    );

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Orchestrator] Cron failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
