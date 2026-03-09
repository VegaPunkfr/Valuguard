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

// Vercel serverless: analysis pipeline takes 10-30s (Exa + OpenAI + vectors)
export const maxDuration = 60;

// ── Rate limiter ──────────────────────────────────────

const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 5;
const rateMap = new Map<string, { count: number; resetAt: number }>();

function checkRate(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (entry && now > entry.resetAt) rateMap.delete(ip);

  const current = rateMap.get(ip);
  if (!current) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (current.count >= RATE_MAX) return false;
  current.count++;
  return true;
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
  // Rate limit
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  if (!checkRate(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again." },
      { status: 429 },
    );
  }

  // Parse body
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
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
