/**
 * GHOST TAX — OSINT INTERCEPTOR API (SERVER-ONLY)
 *
 * POST /api/detect/osint
 *
 * Scans a domain using OSINT techniques (DNS, HTTP, Certs)
 * to reconstruct the technology stack. Zero credentials required.
 *
 * Expected payload:
 * {
 *   domain: string,         // Target domain (e.g., "company.com")
 *   headcount?: number,     // Estimated employees (default: 100)
 *   jobPostings?: string[], // Optional pre-fetched job descriptions
 * }
 *
 * Security: requires CRON_SECRET or org auth (future).
 * Cost: FREE — no external API calls (DNS, HTTP, crt.sh are public).
 */

import { NextRequest, NextResponse } from "next/server";
import { executeOsintInterceptor } from "@/lib/engines/osint-interceptor";

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

    // Validate domain
    if (!body.domain || typeof body.domain !== "string") {
      return NextResponse.json(
        { error: "domain is required (e.g., 'company.com')" },
        { status: 400 },
      );
    }

    // Sanitize domain
    const domain = body.domain
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .toLowerCase()
      .trim();

    if (!domain.includes(".") || domain.length > 253) {
      return NextResponse.json(
        { error: "Invalid domain format" },
        { status: 400 },
      );
    }

    const report = await executeOsintInterceptor({
      domain,
      headcount: typeof body.headcount === "number" ? body.headcount : undefined,
      jobPostings: Array.isArray(body.jobPostings) ? body.jobPostings : undefined,
      runId: crypto.randomUUID(),
    });

    return NextResponse.json(report);
  } catch (err) {
    console.error("[osint-interceptor] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
