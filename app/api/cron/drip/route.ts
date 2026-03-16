/**
 * GHOST TAX — DRIP SEQUENCE CRON (Every 4 hours)
 *
 * Sends 5-touch nurture emails to free scan leads.
 * Converts scan users into Decision Pack buyers.
 *
 * Protected by CRON_SECRET to prevent unauthorized triggers.
 * Vercel Cron calls this automatically via vercel.json.
 *
 * GET /api/cron/drip
 * Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from "next/server";
import { runDripSequence } from "@/lib/drip-sequence";

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
    const start = Date.now();
    const result = await runDripSequence();
    const durationMs = Date.now() - start;

    console.log(
      `[Drip Sequence] Complete in ${durationMs}ms: ${result.processed} processed, ` +
        `${result.emailsSent} emails sent, ${result.skipped} skipped, ${result.errors} errors`,
    );

    return NextResponse.json({ ...result, durationMs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Drip Sequence] Cron failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
