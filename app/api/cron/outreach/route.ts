/**
 * GHOST TAX — OUTREACH CRON HANDLER
 *
 * GET /api/cron/outreach
 *
 * Triggered daily at 9:00 AM UTC by Vercel Cron.
 * Queries leads that need their next drip touch and
 * delegates to the drip handler.
 *
 * Vercel Cron sends a GET request with the CRON_SECRET header
 * for authentication.
 *
 * Config in vercel.json:
 *   { "crons": [{ "path": "/api/cron/outreach", "schedule": "0 9 * * *" }] }
 */

import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  // ── Auth: Vercel Cron sends Authorization header ───
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const provided = request.headers.get("authorization")?.replace("Bearer ", "");
    if (provided !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  console.log("[Ghost Tax Cron] Outreach drip processing started");

  // ── Delegate to the drip handler ───────────────────
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ghost-tax.com";
  const authHeader = cronSecret || process.env.OUTREACH_API_KEY || "";

  try {
    const response = await fetch(`${siteUrl}/api/outreach/drip`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": authHeader,
      },
    });

    const result = await response.json();

    console.log(`[Ghost Tax Cron] Drip processing complete:`, result);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron execution failed";
    console.error("[Ghost Tax Cron] Failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
