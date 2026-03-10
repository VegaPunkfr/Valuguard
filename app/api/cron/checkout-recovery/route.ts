/**
 * GHOST TAX -- CHECKOUT RECOVERY CRON (Hourly)
 *
 * Sends recovery emails to abandoned Stripe checkout sessions.
 * 3-step sequence: 1h, 24h, 72h after abandonment.
 *
 * Protected by CRON_SECRET to prevent unauthorized triggers.
 * Vercel Cron calls this automatically via vercel.json.
 *
 * GET /api/cron/checkout-recovery
 * Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from "next/server";
import { runCheckoutRecovery } from "@/lib/checkout-recovery";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sets this automatically for cron jobs)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runCheckoutRecovery();

    console.log(
      `[Checkout Recovery] Complete: ${result.processed} processed, ` +
        `${result.emailsSent} emails sent, ${result.recovered} recovered, ` +
        `${result.skipped} skipped, ${result.errors} errors`,
    );

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Checkout Recovery] Cron failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
