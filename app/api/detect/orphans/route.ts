/**
 * GHOST TAX — ORPHAN LICENSE DETECTION API (SERVER-ONLY)
 *
 * POST /api/detect/orphans
 *
 * Accepts IAM + SaaS credentials, runs cross-reference engine,
 * returns orphan report with financial impact.
 *
 * Security: credentials never persisted, used in-memory only.
 * Auth: requires CRON_SECRET or valid org session (future).
 */

import { NextRequest, NextResponse } from "next/server";
import { detectOrphanLicenses } from "@/lib/engines/orphan-detector";
import type { ConnectorCredentials } from "@/lib/plugins/types";

export const maxDuration = 60; // Vercel Pro timeout
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
    const { iamProvider, iamCreds, saasProvider, saasCreds, runId } = body;

    if (!iamProvider || !["okta", "entra"].includes(iamProvider)) {
      return NextResponse.json(
        { error: "iamProvider must be 'okta' or 'entra'" },
        { status: 400 },
      );
    }

    if (!saasProvider || saasProvider !== "salesforce") {
      return NextResponse.json(
        { error: "saasProvider must be 'salesforce' (more coming)" },
        { status: 400 },
      );
    }

    if (!iamCreds || (!iamCreds.apiKey && !iamCreds.accessToken)) {
      return NextResponse.json(
        { error: "iamCreds must include apiKey (Okta) or accessToken (Entra)" },
        { status: 400 },
      );
    }

    if (!saasCreds || !saasCreds.accessToken) {
      return NextResponse.json(
        { error: "saasCreds must include accessToken" },
        { status: 400 },
      );
    }

    const report = await detectOrphanLicenses({
      iamProvider,
      iamCreds: iamCreds as ConnectorCredentials,
      saasProvider,
      saasCreds: saasCreds as ConnectorCredentials,
      runId: runId || crypto.randomUUID(),
    });

    return NextResponse.json(report);
  } catch (err) {
    console.error("[orphan-detection] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Orphan detection failed. Please retry." },
      { status: 500 },
    );
  }
}
