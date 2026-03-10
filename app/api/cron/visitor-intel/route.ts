/**
 * GHOST TAX — VISITOR INTELLIGENCE CRON ENDPOINT
 *
 * Processes recent anonymous visitor data to identify B2B companies
 * browsing ghost-tax.com. Enriches high-intent visitors and injects
 * them into the sales pipeline.
 *
 * Schedule: every 6 hours
 * Auth: requires CRON_SECRET (Vercel sets this automatically for cron jobs)
 * Max duration: 120s (IP resolution + Exa enrichment can be slow)
 *
 * Configure in vercel.json with a 6-hour schedule.
 */

import { NextRequest, NextResponse } from "next/server";
import { runVisitorIntelBatch } from "@/lib/visitor-intel";

export const maxDuration = 120;

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sets this automatically for cron jobs)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    const results = await runVisitorIntelBatch();

    return NextResponse.json({
      ok: true,
      ...results,
      durationMs: Date.now() - startTime,
      ranAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Visitor Intel Cron] Fatal error:", err);

    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
        durationMs: Date.now() - startTime,
      },
      { status: 500 },
    );
  }
}
