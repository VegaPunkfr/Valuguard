/**
 * GHOST TAX — OSINT CRON WORKER
 *
 * Zero-touch, three-phase pipeline executed sequentially:
 *   Phase 1: RADAR — Exa OSINT queries → upsert DISCOVERED prospects
 *   Phase 2: BRAIN — Enrich + score DISCOVERED → SCORED | READY_FOR_OUTREACH
 *   Phase 3: CLOSER — Send outreach for READY_FOR_OUTREACH → OUTREACH_SENT
 *
 * Designed for Vercel Cron (maxDuration 60s).
 * Each phase is independently fail-safe: a crash in Phase 2
 * doesn't lose Phase 1 results (already persisted).
 *
 * Schedule: Daily at 07:00 UTC (configured in vercel.json)
 */

import { NextResponse } from "next/server";
import {
  runOSINTRadar,
  enrichAndScoreProspects,
  processOutreachQueue,
  getOSINTPipelineStats,
} from "@/lib/osint-pipeline";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Cron auth: Vercel sends CRON_SECRET header
function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // Dev mode: no auth
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const log: Record<string, unknown> = { startedAt: new Date().toISOString() };

  // ── Phase 1: RADAR ─────────────────────────────────────
  try {
    const radar = await runOSINTRadar();
    log.radar = radar;
  } catch (err: any) {
    log.radar = { error: err?.message || "Radar crashed" };
    console.error("[OSINT Cron] Radar phase failed:", err);
  }

  // ── Phase 2: BRAIN ─────────────────────────────────────
  // Only run if we have time left (keep 15s buffer for Phase 3)
  const elapsed1 = Date.now() - startTime;
  if (elapsed1 < 35_000) {
    try {
      const brain = await enrichAndScoreProspects();
      log.brain = brain;
    } catch (err: any) {
      log.brain = { error: err?.message || "Brain crashed" };
      console.error("[OSINT Cron] Brain phase failed:", err);
    }
  } else {
    log.brain = { skipped: "Time budget exceeded after radar phase" };
  }

  // ── Phase 3: CLOSER ────────────────────────────────────
  const elapsed2 = Date.now() - startTime;
  if (elapsed2 < 50_000) {
    try {
      const closer = await processOutreachQueue();
      log.closer = closer;
    } catch (err: any) {
      log.closer = { error: err?.message || "Closer crashed" };
      console.error("[OSINT Cron] Closer phase failed:", err);
    }
  } else {
    log.closer = { skipped: "Time budget exceeded after brain phase" };
  }

  // ── Pipeline Stats ─────────────────────────────────────
  try {
    log.pipeline = await getOSINTPipelineStats();
  } catch {
    log.pipeline = {};
  }

  log.durationMs = Date.now() - startTime;
  log.completedAt = new Date().toISOString();

  console.log("[OSINT Cron] Complete:", JSON.stringify(log));

  return NextResponse.json(log);
}
