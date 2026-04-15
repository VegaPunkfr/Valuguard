/**
 * LOT 1 / OBS-0 — Quality Gate runner
 * Usage : tsx scripts/obs-gate.ts
 * Prérequis : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY dans .env.local
 * Dépendance : dotenv (devDependencies)
 * Lit les 4 métriques, affiche le rapport, insère BOOTSTRAP_BATCH_FINISHED status.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { evaluateGate } from "@/lib/outreach/gate";
import { emitIngestEvent } from "@/lib/outreach/events";

async function main() {
  const report = await evaluateGate();
  console.log(JSON.stringify(report, null, 2));

  await emitIngestEvent({
    event_type: "BOOTSTRAP_BATCH_FINISHED",
    actor: "scripts/obs-gate",
    reason: `gate_status=${report.status}`,
    payload: { gate_status: report.status, metrics: report.metrics, reasons: report.reasons },
  });

  if (report.status === "FAIL") process.exit(2);
  process.exit(0);
}

main().catch((err) => {
  console.error("[OBS-GATE] FATAL:", err);
  process.exit(1);
});
