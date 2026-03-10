/**
 * GHOST TAX — HEALTH CHECK ENDPOINT
 *
 * GET /api/health
 *
 * Returns system health status for uptime monitoring.
 * Checks: database, Stripe, Resend, Exa connectivity.
 */

import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface HealthCheck {
  name: string;
  status: "ok" | "degraded" | "down";
  latencyMs?: number;
  error?: string;
}

export async function GET() {
  const checks: HealthCheck[] = [];
  const start = Date.now();

  // ── Database Check ─────────────────────────────────
  try {
    const dbStart = Date.now();
    const supabase = createAdminSupabase();
    if (supabase) {
      const { error } = await (supabase as any)
        .from("audit_requests")
        .select("id")
        .limit(1);
      checks.push({
        name: "database",
        status: error ? "degraded" : "ok",
        latencyMs: Date.now() - dbStart,
        ...(error && { error: error.message }),
      });
    } else {
      checks.push({ name: "database", status: "down", error: "Not configured" });
    }
  } catch (err) {
    checks.push({
      name: "database",
      status: "down",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }

  // ── Stripe Check ───────────────────────────────────
  checks.push({
    name: "stripe",
    status: process.env.STRIPE_SECRET_KEY ? "ok" : "down",
    ...(!process.env.STRIPE_SECRET_KEY && { error: "STRIPE_SECRET_KEY not set" }),
  });

  // ── Resend Check ───────────────────────────────────
  checks.push({
    name: "resend",
    status: process.env.RESEND_API_KEY ? "ok" : "down",
    ...(!process.env.RESEND_API_KEY && { error: "RESEND_API_KEY not set" }),
  });

  // ── Exa Check ──────────────────────────────────────
  checks.push({
    name: "exa",
    status: process.env.EXA_API_KEY ? "ok" : "degraded",
    ...(!process.env.EXA_API_KEY && { error: "EXA_API_KEY not set (enrichment disabled)" }),
  });

  // ── OpenAI Check ───────────────────────────────────
  checks.push({
    name: "openai",
    status: process.env.OPENAI_API_KEY ? "ok" : "degraded",
    ...(!process.env.OPENAI_API_KEY && { error: "OPENAI_API_KEY not set (embeddings disabled)" }),
  });

  // ── Overall Status ─────────────────────────────────
  const hasDown = checks.some(c => c.status === "down");
  const hasDegraded = checks.some(c => c.status === "degraded");
  const overall = hasDown ? "down" : hasDegraded ? "degraded" : "ok";

  return NextResponse.json(
    {
      status: overall,
      timestamp: new Date().toISOString(),
      totalLatencyMs: Date.now() - start,
      checks,
    },
    { status: overall === "down" ? 503 : 200 },
  );
}
