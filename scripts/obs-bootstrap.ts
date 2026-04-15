/**
 * LOT 1 / OBS-0 — Bootstrap runner
 * Usage : tsx scripts/obs-bootstrap.ts
 * Prérequis : RESEND_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY dans .env.local
 * Dépendance : dotenv (ajouté en devDependencies package.json)
 * Idempotent. Rejouable.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { emitIngestEvent } from "@/lib/outreach/events";
import { pullResendHistory } from "@/lib/outreach/bootstrap/resend-pull";
import { runInternalBackfill } from "@/lib/outreach/bootstrap/internal-backfill";

function ulid(): string {
  // simple monotonic-ish id — suffit pour batch_id
  return (
    Date.now().toString(36).toUpperCase() +
    Math.random().toString(36).slice(2, 10).toUpperCase()
  );
}

async function main() {
  const batchId = `obs0-${ulid()}`;
  const apiKey = process.env.RESEND_API_KEY;

  console.log(`[OBS-0] Starting batch ${batchId}`);
  await emitIngestEvent({
    event_type: "BOOTSTRAP_BATCH_STARTED",
    batch_id: batchId,
    actor: "scripts/obs-bootstrap",
    payload: { has_resend_key: !!apiKey, started_at: new Date().toISOString() },
  });

  let resendResult: Awaited<ReturnType<typeof pullResendHistory>> | null = null;
  let resendError: string | null = null;

  if (apiKey) {
    try {
      console.log(`[OBS-0] Pulling Resend history...`);
      resendResult = await pullResendHistory({ apiKey, batchId });
      console.log(`[OBS-0] Resend:`, resendResult);
    } catch (err) {
      resendError = err instanceof Error ? err.message : "unknown";
      console.error(`[OBS-0] Resend pull failed:`, resendError);
    }
  } else {
    resendError = "RESEND_API_KEY not set — skipping Resend pull";
    console.warn(`[OBS-0] ${resendError}`);
  }

  console.log(`[OBS-0] Running internal backfill...`);
  const internalResult = await runInternalBackfill({ batchId });
  console.log(`[OBS-0] Internal backfill:`, internalResult);

  await emitIngestEvent({
    event_type: "BOOTSTRAP_BATCH_FINISHED",
    batch_id: batchId,
    actor: "scripts/obs-bootstrap",
    payload: {
      resend: resendResult,
      resend_error: resendError,
      internal: internalResult,
      finished_at: new Date().toISOString(),
    },
  });

  console.log(`[OBS-0] Batch ${batchId} finished.`);
}

main().catch((err) => {
  console.error("[OBS-0] FATAL:", err);
  process.exit(1);
});
