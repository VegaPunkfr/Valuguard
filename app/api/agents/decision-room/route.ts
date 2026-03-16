/**
 * GHOST TAX — DECISION ROOM API (SERVER-ONLY)
 *
 * POST /api/agents/decision-room
 *
 * Accepts a PDF contract (base64) + optional orphan report,
 * runs the 3-agent pipeline (Extractor → Analyst → Negotiator),
 * returns the full DecisionRoomResult.
 *
 * Expected payload:
 * {
 *   pdfBase64: string,       // Contract PDF in base64
 *   companyName: string,     // Client company name
 *   locale?: "fr"|"en"|"de", // Output language (default: fr)
 *   orphanReport?: object,   // Optional: output from /api/detect/orphans
 * }
 *
 * Security: requires CRON_SECRET or org auth (future).
 * Cost: ~$0.30-0.50 per execution (3 × GPT-4o calls).
 */

import { NextRequest, NextResponse } from "next/server";
import { executeDecisionRoom } from "@/lib/agents/orchestrator";

export const maxDuration = 120; // 3 agents × 60s max each
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // Auth guard — fail safe if CRON_SECRET not configured
    if (!process.env.CRON_SECRET) {
      return new Response("CRON_SECRET not configured", { status: 503 });
    }
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Validate required fields
    if (!body.pdfBase64 || typeof body.pdfBase64 !== "string") {
      return NextResponse.json(
        { error: "pdfBase64 is required (base64-encoded PDF)" },
        { status: 400 },
      );
    }

    if (!body.companyName || typeof body.companyName !== "string") {
      return NextResponse.json(
        { error: "companyName is required" },
        { status: 400 },
      );
    }

    // Size guard: max 10MB PDF
    const pdfSizeBytes = Buffer.from(body.pdfBase64, "base64").length;
    if (pdfSizeBytes > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "PDF too large (max 10MB)" },
        { status: 413 },
      );
    }

    const locale = ["en", "fr", "de"].includes(body.locale) ? body.locale : "fr";

    const result = await executeDecisionRoom({
      pdfBase64: body.pdfBase64,
      companyName: body.companyName,
      orphanReport: body.orphanReport || null,
      locale,
      runId: crypto.randomUUID(),
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[decision-room] Error:", err);

    // Return partial results if available in error context
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Internal error",
        phase: err instanceof Error ? err.message : undefined,
      },
      { status: 500 },
    );
  }
}
