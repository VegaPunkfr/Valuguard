/**
 * GHOST TAX — DECISION INTELLIGENCE STREAMING ENDPOINT
 *
 * POST /api/intel
 * Body: { domain: string, name?: string, industry?: string, headcount?: number, monthlySpendEur?: number }
 *
 * Streams DecisionIntelligence phases as newline-delimited JSON (NDJSON).
 * Each line is a self-contained JSON object with { phase, status, data }.
 *
 * Phase order (doctrine — non-negotiable):
 *   enrichment → context → exposure → lossVelocity → costOfDelay → diagnosis →
 *   causalGraph → proofEngine → proof → marketMemory → peerComparison →
 *   driftMonitor → correctionMomentum → scenarios → counterfactual →
 *   decisionFriction → decisionPressure → negotiation → confidenceModel →
 *   decisionPack → executiveSnapshot → complete
 *
 * Security:
 *   - All API keys (Exa, OpenAI) used server-side only
 *   - No secrets exposed to client
 *   - Rate limiting via simple in-memory guard
 */

import { NextRequest, NextResponse } from "next/server";
import {
  runDecisionIntelligence,
  type CompanyContext,
} from "@/lib/analysis";
import {
  executePhasePlugins,
  listPlugins,
  listConnectors,
  type PluginContext,
  type PluginOutput,
  type PipelineResult,
} from "@/lib/plugins";
import { scheduleDripSequence } from "@/lib/drip-sequence";

// Vercel serverless: analysis pipeline takes 10-30s (Exa + OpenAI + vectors)
export const maxDuration = 60;

// ── Rate limiter (sliding window, in-memory) ─────────
//
// TODO: Replace with Redis/Vercel KV when scaling beyond a single instance.
// In-memory state resets on every deploy and is not shared across serverless
// isolates. Acceptable for early-stage traffic (<100 RPM) but will need a
// distributed store (Vercel KV, Upstash Redis, or Supabase row-level check)
// once we hit multi-instance concurrency.
//

/** Max requests per window per IP */
const RATE_MAX = parseInt(process.env.RATE_LIMIT_MAX || "5", 10);
/** Sliding window size in ms */
const RATE_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10);
/** Evict stale entries every N checks to prevent unbounded memory growth */
const EVICT_INTERVAL = 50;

let checkCounter = 0;

/** Per-IP sliding window: store an array of request timestamps */
const rateMap = new Map<string, number[]>();

function checkRate(ip: string): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const windowStart = now - RATE_WINDOW_MS;

  // Periodic eviction of stale IPs to bound memory
  checkCounter++;
  if (checkCounter % EVICT_INTERVAL === 0) {
    for (const [key, timestamps] of rateMap) {
      if (timestamps.length === 0 || timestamps[timestamps.length - 1] < windowStart) {
        rateMap.delete(key);
      }
    }
  }

  let timestamps = rateMap.get(ip);
  if (!timestamps) {
    timestamps = [];
    rateMap.set(ip, timestamps);
  }

  // Drop timestamps outside the sliding window
  while (timestamps.length > 0 && timestamps[0] < windowStart) {
    timestamps.shift();
  }

  if (timestamps.length >= RATE_MAX) {
    const resetMs = timestamps[0] + RATE_WINDOW_MS - now;
    return { allowed: false, remaining: 0, resetMs };
  }

  timestamps.push(now);
  return { allowed: true, remaining: RATE_MAX - timestamps.length, resetMs: RATE_WINDOW_MS };
}

// ── Validation ────────────────────────────────────────

function validateDomain(domain: unknown): string | null {
  if (typeof domain !== "string") return null;
  const clean = domain.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (clean.length < 3 || clean.length > 253) return null;
  if (!clean.includes(".")) return null;
  return clean;
}

// ── Route Handler ─────────────────────────────────────

export async function POST(request: NextRequest) {
  // Rate limit (sliding window per IP)
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const rate = checkRate(ip);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rate.resetMs / 1000)),
          "X-RateLimit-Limit": String(RATE_MAX),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil((Date.now() + rate.resetMs) / 1000)),
        },
      },
    );
  }

  // Parse body
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // ── Honeypot: hidden field "corporate_id" — bots fill it, humans send "" ──
  if (typeof body.corporate_id === "string" && body.corporate_id.trim().length > 0) {
    // Bot detected: return fake 200 to waste its time, process nothing
    return NextResponse.json({ phase: "complete", status: "complete", data: null });
  }

  // Validate domain
  const domain = validateDomain(body.domain);
  if (!domain) {
    return NextResponse.json(
      { error: "A valid company domain is required (e.g. acme.com)." },
      { status: 400 },
    );
  }

  const input: CompanyContext = {
    domain,
    name: typeof body.name === "string" ? body.name.trim() : undefined,
    industry: typeof body.industry === "string" ? body.industry.trim() : undefined,
    headcount: typeof body.headcount === "number" ? body.headcount : undefined,
    monthlySpendEur: typeof body.monthlySpendEur === "number" ? body.monthlySpendEur : undefined,
    saasToolCount: typeof body.saasToolCount === "number" ? body.saasToolCount : undefined,
  };

  // Create a streaming response using NDJSON
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(phase: string, status: string, data: unknown) {
        const line = JSON.stringify({ phase, status, data }) + "\n";
        controller.enqueue(encoder.encode(line));
      }

      send("enrichment", "running", null);

      try {
        const result = await runDecisionIntelligence(input);

        // Stream in doctrine order: exposure → window → cause → correction
        // Evidence arrives before conclusions. Snapshot is last (earned summary).
        send("context", "complete", result.companyContext);
        send("exposure", "complete", result.exposure);
        send("lossVelocity", "complete", result.lossVelocity);
        send("costOfDelay", "complete", result.costOfDelay);
        send("diagnosis", "complete", result.diagnosis);
        send("causalGraph", "complete", result.causalGraph);
        send("proofEngine", "complete", result.proofEngine);
        send("proof", "complete", result.proof);
        send("marketMemory", "complete", result.marketMemory);
        send("peerComparison", "complete", result.peerComparison);
        send("driftMonitor", "complete", result.driftMonitor);
        send("correctionMomentum", "complete", result.correctionMomentum);
        send("scenarios", "complete", result.scenarios);
        send("counterfactual", "complete", result.counterfactual);
        send("decisionFriction", "complete", result.decisionFriction);
        send("decisionPressure", "complete", result.decisionPressureScore);
        send("negotiation", "complete", result.negotiationIntelligence);
        send("confidenceModel", "complete", result.confidenceModel);
        send("decisionPack", "complete", result.decisionPack);
        send("executiveSnapshot", "complete", result.executiveSnapshot);

        // ── Plugin SDK: feed FULL pipeline result to plugins ──────
        // Global SaaS Exposure Score: composite of exposure confidence,
        // pressure, proof density, and peer deviation
        const globalExposureScore = Math.min(85, Math.round(
          (result.exposure.confidence * 0.3) +
          (result.decisionPressureScore * 0.25) +
          (result.proofEngine.signalDensity * 0.2) +
          (result.confidenceModel.overall * 0.15) +
          ((result.peerComparison.efficiencyPercentile || 50) * 0.1)
        ));

        const pipelineResult: PipelineResult = {
          exposure: result.exposure,
          lossVelocity: result.lossVelocity,
          costOfDelay: result.costOfDelay,
          confidenceModel: result.confidenceModel,
          proofEngine: result.proofEngine,
          peerComparison: result.peerComparison,
          marketMemory: result.marketMemory,
          driftMonitor: result.driftMonitor,
          causalGraph: result.causalGraph,
          decisionFriction: result.decisionFriction,
          decisionPressureScore: result.decisionPressureScore,
          correctionMomentum: result.correctionMomentum,
          counterfactual: result.counterfactual,
          negotiationIntelligence: result.negotiationIntelligence,
          executiveSnapshot: result.executiveSnapshot,
          scenarios: result.scenarios,
          decisionPack: result.decisionPack,
          globalExposureScore,
        };

        const pluginCtx: PluginContext = {
          company: input,
          enrichment: {},
          signals: [
            ...(result.proof?.observedSignals || []),
            ...(result.proof?.inferredSignals || []),
            ...(result.proof?.estimatedSignals || []),
          ],
          connectorData: {},
          locale: "en",
          rail: "A",
          runId: result.meta?.analysisId || crypto.randomUUID(),
          pipeline: pipelineResult,
        };

        const pluginPhases = [
          "post-enrichment",
          "analysis",
          "post-analysis",
          "report",
        ] as const;

        const allPluginOutputs: PluginOutput[] = [];
        for (const phase of pluginPhases) {
          const outputs = await executePhasePlugins(phase, pluginCtx);
          allPluginOutputs.push(...outputs);
        }

        if (allPluginOutputs.length > 0) {
          send("plugins", "complete", {
            pluginCount: listPlugins().length,
            connectorCount: listConnectors().length,
            outputs: allPluginOutputs,
            totalInsights: allPluginOutputs.reduce((s, o) => s + (o.insights?.length || 0), 0),
            totalActions: allPluginOutputs.reduce((s, o) => s + (o.actions?.length || 0), 0),
          });
        }

        send("complete", "complete", result.meta);

        // ── Drip: fire-and-forget post-scan nurture ────────────────
        // Triggered only when email is provided AND lead has not purchased.
        // Never blocks the stream. Silently swallowed on any error.
        const emailFromBody = typeof body.email === "string" && body.email.trim() ? body.email.trim() : null;
        if (emailFromBody) {
          scheduleDripSequence({
            email: emailFromBody,
            domain,
            locale: typeof body.locale === "string" ? body.locale : undefined,
            exposureRange: result.exposure
              ? [result.exposure.lowEur ?? 0, result.exposure.highEur ?? 0]
              : undefined,
            analysisId: result.meta?.analysisId,
            companyName: result.companyContext?.name || input.name,
            headcount: input.headcount,
            industry: input.industry,
          }).catch((err) => {
            // Non-fatal — scan must never fail for drip errors
            console.warn("[Ghost Tax] Drip schedule failed (non-fatal):", err instanceof Error ? err.message : err);
          });
        }

        // ── BRIDGE: scan_completed → Founder Mission Control ──
        const commandSecret = process.env.COMMAND_SECRET;
        if (commandSecret && domain) {
          const bridgeUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://ghost-tax.com"}/api/command/ingest?key=${commandSecret}`;
          fetch(bridgeUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "scan_completed",
              domain,
              email: emailFromBody || undefined,
              companyName: result.companyContext?.name || input.name || undefined,
              headcount: input.headcount || undefined,
              industry: input.industry || undefined,
              data: {
                exposureLow: result.exposure?.lowEur,
                exposureHigh: result.exposure?.highEur,
                confidence: result.exposure?.confidence,
                signalCount: result.proof?.observedSignals?.length || 0,
                vendorCount: result.companyContext?.techFootprint?.length || 0,
              },
            }),
          }).catch(() => { /* bridge failure is non-fatal */ });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Analysis failed";
        console.error("[Ghost Tax] Intel pipeline error:", message);
        send("error", "error", {
          error: "Analysis could not be completed. Please try again.",
        });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      "Transfer-Encoding": "chunked",
    },
  });
}
