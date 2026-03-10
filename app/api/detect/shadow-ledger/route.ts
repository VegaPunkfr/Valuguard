/**
 * GHOST TAX — SHADOW LEDGER API (SERVER-ONLY)
 *
 * POST /api/detect/shadow-ledger
 *
 * Accepts connector data (Concur, QuickBooks, Stripe) + optional
 * orphan report + approved vendor list, runs the Shadow Ledger Engine,
 * returns the full forensic report.
 *
 * Expected payload:
 * {
 *   connectorData: Record<string, ConnectorOutput>,
 *   orphanReport?: OrphanReport,
 *   approvedVendors?: string[],
 *   runId?: string,
 * }
 *
 * Security: requires CRON_SECRET or org auth (future).
 */

import { NextRequest, NextResponse } from "next/server";
import { executeShadowLedger } from "@/lib/engines/shadow-ledger";

export const maxDuration = 60;
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // Auth guard
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Validate required fields
    if (!body.connectorData || typeof body.connectorData !== "object") {
      return NextResponse.json(
        { error: "connectorData is required (Record<string, ConnectorOutput>)" },
        { status: 400 },
      );
    }

    const validSources = ["sap-concur", "quickbooks", "stripe-billing"];
    const providedSources = Object.keys(body.connectorData);

    if (providedSources.length === 0) {
      return NextResponse.json(
        { error: "At least one data source required (sap-concur, quickbooks, or stripe-billing)" },
        { status: 400 },
      );
    }

    const unknownSources = providedSources.filter((s) => !validSources.includes(s));
    if (unknownSources.length > 0) {
      return NextResponse.json(
        { error: `Unknown data sources: ${unknownSources.join(", ")}. Valid: ${validSources.join(", ")}` },
        { status: 400 },
      );
    }

    // Size guard: max 50MB payload (expense data can be large)
    const payloadSize = JSON.stringify(body.connectorData).length;
    if (payloadSize > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Payload too large (max 50MB)" },
        { status: 413 },
      );
    }

    const report = await executeShadowLedger({
      connectorData: body.connectorData,
      orphanReport: body.orphanReport || null,
      approvedVendors: body.approvedVendors || [],
      runId: body.runId || crypto.randomUUID(),
    });

    return NextResponse.json(report);
  } catch (err) {
    console.error("[shadow-ledger] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
