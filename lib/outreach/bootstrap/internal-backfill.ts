/**
 * LOT 1 / OBS-0 — Internal backfill
 * Pour chaque sprint_accounts.status='SENT' qui n'a aucun outreach_event SEND_*,
 * crée un event synthétique ingest_mode='internal_backfill', reconciliation='internal_only'.
 */

import { createAdminSupabase } from "@/lib/supabase";
import { emitOutreachEvent } from "@/lib/outreach/events";
import { deterministicAttemptId } from "./resolver";

export async function runInternalBackfill(opts: {
  batchId: string;
}): Promise<{ synthesized: number; skipped: number; failed: number }> {
  const supabase = createAdminSupabase();
  if (!supabase) throw new Error("supabase_not_configured");

  // 1. Récupère tous les sprint_accounts SENT
  const { data: sent } = await (supabase as any)
    .from("sprint_accounts")
    .select("id, contact_email, domain, last_action_at, status")
    .eq("status", "SENT");

  if (!sent) return { synthesized: 0, skipped: 0, failed: 0 };

  let synthesized = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of sent) {
    // 2. Vérifie qu'aucun SEND_SUCCESS n'existe déjà pour ce client
    const { data: existing } = await (supabase as any)
      .from("outreach_events")
      .select("id")
      .eq("client_id", row.id)
      .in("kind", ["SEND_SUCCESS", "SEND_ATTEMPT"])
      .limit(1);

    if (existing && existing.length > 0) {
      skipped++;
      continue;
    }

    // 3. Synthèse SEND_SUCCESS internal_backfill
    const attemptId = deterministicAttemptId("internal", row.id);
    const r = await emitOutreachEvent({
      at: row.last_action_at ?? new Date().toISOString(),
      client_id: row.id,
      orphan: false,
      strategy_version: "pre-doctrine",
      strategy_assignment_mode: "absent",
      attempt_id: attemptId,
      kind: "SEND_SUCCESS",
      provider: "internal-backfill",
      provider_event_id: null,
      payload: { sprint_account_id: row.id, status: row.status },
      derived: {
        source: "sprint_accounts",
        to: row.contact_email,
        domain: row.domain,
        note: "Synthetic event — pas de trace Resend retrouvée",
      },
      actor: "bootstrap",
      ingest_mode: "internal_backfill",
      bootstrap_batch_id: opts.batchId,
      reconciliation: "internal_only",
    });

    if (r.ok) synthesized++;
    else if (r.error.includes("duplicate")) skipped++;
    else failed++;
  }

  return { synthesized, skipped, failed };
}
