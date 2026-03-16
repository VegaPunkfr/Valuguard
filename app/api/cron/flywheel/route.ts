/**
 * GHOST TAX — INTELLIGENCE ENGINE CRON
 *
 * GET /api/cron/flywheel
 * Schedule: daily 07:00 UTC
 *
 * Runs the full intelligence-driven revenue engine.
 * Maximum 3 emails per lead, ever. Quality over quantity.
 * Every email contains NEW intelligence, not recycled data.
 *
 * Zero human contact. The intelligence sells itself.
 */

import { NextRequest, NextResponse } from "next/server";
import { runEngine } from "@/lib/flywheel";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return new Response("CRON_SECRET not configured", { status: 503 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runEngine();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Engine execution failed";
    console.error("[Ghost Tax Engine] Fatal:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
