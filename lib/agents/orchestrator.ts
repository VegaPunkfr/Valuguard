/**
 * GHOST TAX — DECISION ROOM ORCHESTRATOR (SERVER-ONLY)
 *
 * Pipeline séquentiel d'agents autonomes:
 *
 *   ┌─────────────────────────────────────────────────────────┐
 *   │                    DECISION ROOM                        │
 *   │                                                         │
 *   │  ┌─────────┐    ┌──────────┐    ┌─────────────┐       │
 *   │  │EXTRACTEUR│───▶│ ANALYSTE │───▶│ NÉGOCIATEUR │       │
 *   │  │ (Vision) │    │  (Data)  │    │   (LLM)     │       │
 *   │  └─────────┘    └──────────┘    └─────────────┘       │
 *   │      PDF           Contract       Waste                │
 *   │      ───▶          + Usage        Analysis             │
 *   │      Contract      ───▶           ───▶                 │
 *   │      Data          Waste          Negotiation           │
 *   │                    Analysis       Pack                  │
 *   └─────────────────────────────────────────────────────────┘
 *
 * Chaque agent:
 * 1. Reçoit le contexte des agents précédents
 * 2. Exécute son analyse via OpenAI structured output
 * 3. Passe son output au suivant
 * 4. Log son exécution (durée, tokens, erreurs)
 *
 * L'orchestrateur gère:
 * - Le séquencement strict (extracteur AVANT analyste AVANT négociateur)
 * - La propagation d'erreurs (si extracteur échoue, on stop tout)
 * - Le budget tokens (monitoring des coûts OpenAI)
 * - La persistance du résultat final en Supabase
 */

import { executeExtractor } from "./extractor";
import { executeAnalyst } from "./analyst";
import { executeNegotiator } from "./negotiator";
import type {
  AgentContext,
  DecisionRoomResult,
} from "./types";
import type { OrphanReport } from "@/lib/engines/orphan-detector";

// ── Configuration ───────────────────────────────────

const MAX_TOTAL_TOKENS = 25_000; // Budget guard (~$0.40 par exécution)
const AGENT_TIMEOUT_MS = 60_000; // 60s par agent max

// ── Timeout wrapper ─────────────────────────────────

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  agentId: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Agent ${agentId} timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

// ── Main Orchestrator ───────────────────────────────

export async function executeDecisionRoom(config: {
  pdfBase64: string;
  companyName: string;
  orphanReport?: OrphanReport | null;
  locale?: "en" | "fr" | "de";
  runId?: string;
  orgId?: string;
}): Promise<DecisionRoomResult> {
  const start = Date.now();
  const locale = config.locale || "fr";
  const runId = config.runId || crypto.randomUUID();

  const context: AgentContext = {
    runId,
    orgId: config.orgId || "unknown",
    locale,
    startedAt: new Date(),
    phases: [],
  };

  let totalTokens = 0;

  // ── Phase 1: EXTRACTEUR ─────────────────────────

  const extractorResult = await withTimeout(
    executeExtractor(config.pdfBase64, locale),
    AGENT_TIMEOUT_MS,
    "extractor",
  );

  context.phases.push(extractorResult.phase);
  totalTokens += extractorResult.phase.tokensUsed || 0;

  if (extractorResult.phase.status === "failed") {
    throw new Error(`Agent Extracteur failed: ${extractorResult.phase.error}`);
  }

  // Budget check
  if (totalTokens > MAX_TOTAL_TOKENS * 0.5) {
    console.warn(`[decision-room] Token budget warning after extractor: ${totalTokens}/${MAX_TOTAL_TOKENS}`);
  }

  // ── Phase 2: ANALYSTE ───────────────────────────

  const analystResult = await withTimeout(
    executeAnalyst(
      extractorResult.data,
      config.orphanReport || null,
      locale,
    ),
    AGENT_TIMEOUT_MS,
    "analyst",
  );

  context.phases.push(analystResult.phase);
  totalTokens += analystResult.phase.tokensUsed || 0;

  if (analystResult.phase.status === "failed") {
    throw new Error(`Agent Analyste failed: ${analystResult.phase.error}`);
  }

  // ── Phase 3: NÉGOCIATEUR ────────────────────────

  const negotiatorResult = await withTimeout(
    executeNegotiator(
      extractorResult.data,
      analystResult.data,
      config.companyName,
      locale,
    ),
    AGENT_TIMEOUT_MS,
    "negotiator",
  );

  context.phases.push(negotiatorResult.phase);
  totalTokens += negotiatorResult.phase.tokensUsed || 0;

  if (negotiatorResult.phase.status === "failed") {
    throw new Error(`Agent Négociateur failed: ${negotiatorResult.phase.error}`);
  }

  // ── Assemble Result ─────────────────────────────

  const result: DecisionRoomResult = {
    runId,
    executedAt: new Date(),
    totalExecutionMs: Date.now() - start,

    contractData: extractorResult.data,
    wasteAnalysis: analystResult.data,
    negotiationPack: negotiatorResult.data,

    phases: context.phases,
    totalTokensUsed: totalTokens,
  };

  return result;
}
