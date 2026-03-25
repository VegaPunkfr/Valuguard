/**
 * VALUGUARD — AUDIT TRIGGER (POST /api/audit/run)
 *
 * Point d'entrée pour lancer orchestrateAudit() sur un domaine.
 * Protégé par API key (AUDIT_API_KEY) — pas d'accès public.
 *
 * Body: { domain: string, options?: OrchestratorOptions }
 * Response: { success, domain, tvar, urgencyScore, executionMs }
 *
 * Usage:
 *   curl -X POST https://ghost-tax.com/api/audit/run \
 *     -H "Authorization: Bearer $AUDIT_API_KEY" \
 *     -H "Content-Type: application/json" \
 *     -d '{"domain": "acme.com"}'
 */

import { NextRequest, NextResponse } from "next/server";
import { orchestrateAudit } from "@/lib/audit-orchestrator";
import type { OrchestratorOptions } from "@/lib/audit-orchestrator";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // ── Auth: API key required ──
  const authHeader = request.headers.get("authorization");
  const apiKey = process.env.AUDIT_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "AUDIT_API_KEY not configured." },
      { status: 500 },
    );
  }

  const token = authHeader?.replace(/^Bearer\s+/i, "");
  if (token !== apiKey) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 },
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const rawDomain = typeof body.domain === "string" ? body.domain.trim() : "";
    const domain = rawDomain
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "")
      .toLowerCase();

    if (!domain || !domain.includes(".") || domain.length < 3) {
      return NextResponse.json(
        { error: "Invalid domain." },
        { status: 400 },
      );
    }

    // ── Options (all optional) ──
    const options: OrchestratorOptions = {};
    if (typeof body.industry === "string") options.industry = body.industry;
    if (typeof body.headcount === "number") options.headcountOverride = body.headcount;
    if (typeof body.estimatedArrEur === "number") options.estimatedArrEur = body.estimatedArrEur;
    if (body.skipEnrichment === true) options.skipEnrichment = true;
    if (body.skipPeerGap === true) options.skipPeerGap = true;
    if (body.skipOutreach === true) options.skipOutreach = true;
    if (typeof body.geoMarket === "string") options.geoMarket = body.geoMarket;
    if (typeof body.companyName === "string") options.companyName = body.companyName;

    // ── Run ──
    const payload = await orchestrateAudit(domain, options);

    return NextResponse.json({
      success: true,
      domain: payload.domain,
      tvar: payload.shadowBill.tvar.totalValueAtRisk,
      urgencyScore: payload.urgencyScore,
      executionMs: payload.executionMs,
      decisionMaker: payload.decisionMaker
        ? {
            name: payload.decisionMaker.fullName,
            title: payload.decisionMaker.title,
            email: payload.decisionMaker.email,
          }
        : null,
      magicLink: `/audit/${encodeURIComponent(payload.domain)}`,
      warnings: payload.warnings,
    });
  } catch (err) {
    console.error("[Audit Run] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Audit failed. Please retry." },
      { status: 500 },
    );
  }
}
