/**
 * GHOST TAX — REVENUE INTELLIGENCE API
 *
 * GET /api/admin/revenue — Full revenue dashboard
 * GET /api/admin/revenue?view=pipeline — Pipeline only
 * GET /api/admin/revenue?view=funnel&period=month — Funnel metrics
 * GET /api/admin/revenue?view=cohorts — Cohort analysis
 * GET /api/admin/revenue?view=forecast&months=6 — Revenue forecast
 * GET /api/admin/revenue?view=cron — Cron health
 *
 * Auth: x-admin-token header must match ADMIN_TOKEN env var.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getRevenueDashboard,
  getPipelineValue,
  getFunnelMetrics,
  getCohortAnalysis,
  getRevenueForecast,
  getCronHealth,
} from "@/lib/revenue-intel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // ── Auth ──
  const token = req.headers.get("x-admin-token");
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || !token || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const view = req.nextUrl.searchParams.get("view") || "dashboard";

  try {
    switch (view) {
      case "pipeline": {
        const data = await getPipelineValue();
        return NextResponse.json({ pipeline: data, generatedAt: new Date().toISOString() });
      }

      case "funnel": {
        const period = (req.nextUrl.searchParams.get("period") || "month") as
          "day" | "week" | "month" | "quarter";
        const data = await getFunnelMetrics(period);
        return NextResponse.json({ funnel: data, generatedAt: new Date().toISOString() });
      }

      case "cohorts": {
        const data = await getCohortAnalysis();
        return NextResponse.json({ cohorts: data, generatedAt: new Date().toISOString() });
      }

      case "forecast": {
        const months = parseInt(req.nextUrl.searchParams.get("months") || "6", 10);
        const data = await getRevenueForecast(Math.min(24, Math.max(1, months)));
        return NextResponse.json({ forecast: data, generatedAt: new Date().toISOString() });
      }

      case "cron": {
        const data = await getCronHealth();
        return NextResponse.json({ cronHealth: data, generatedAt: new Date().toISOString() });
      }

      case "dashboard":
      default: {
        const data = await getRevenueDashboard();
        return NextResponse.json({ dashboard: data });
      }
    }
  } catch (err) {
    console.error("[Revenue Intel] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
