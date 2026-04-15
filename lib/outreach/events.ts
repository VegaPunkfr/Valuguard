/**
 * GHOST TAX — OUTREACH EVENTS HELPER (LOT 1)
 *
 * Central helper for emitting outreach events into the append-only event log.
 * Fire-and-forget pattern: failures NEVER break the caller (send path must stay resilient).
 *
 * Doctrine P2 invariants:
 *  - 13 kinds fermés (enum canonique)
 *  - strategy_version = FK stricte vers strategies.version
 *  - strategy_assignment_mode ∈ {native, retroactive, absent}
 *  - ingest_mode ∈ {live, bootstrap, internal_backfill}
 *  - append-only (trigger DB refuse UPDATE/DELETE)
 */

import { createAdminSupabase } from "@/lib/supabase";

export const OUTREACH_KINDS = [
  "SEND_ATTEMPT",
  "SEND_SUCCESS",
  "SEND_FAIL",
  "DELIVERED",
  "OPENED",
  "CLICKED",
  "REPLIED",
  "BOUNCE",
  "COMPLAINED",
  "UNSUBSCRIBED",
  "DEFER",
  "REJECT",
  "REVIEW",
] as const;
export type OutreachKind = (typeof OUTREACH_KINDS)[number];

export const INGEST_MODES = ["live", "bootstrap", "internal_backfill"] as const;
export type IngestMode = (typeof INGEST_MODES)[number];

export const STRATEGY_ASSIGNMENT_MODES = ["native", "retroactive", "absent"] as const;
export type StrategyAssignmentMode = (typeof STRATEGY_ASSIGNMENT_MODES)[number];

export const RECONCILIATION_STATES = ["resend_only", "internal_only", "matched"] as const;
export type ReconciliationState = (typeof RECONCILIATION_STATES)[number];

export interface OutreachEventInput {
  at?: string; // ISO timestamp ; defaults to NOW() côté DB
  client_id?: string | null;
  orphan?: boolean;

  strategy_version: string; // MUST reference strategies.version (use 'pre-doctrine' sentinel if unknown)
  strategy_assignment_mode: StrategyAssignmentMode;

  mandate_id?: string | null;
  attempt_id?: string | null;

  kind: OutreachKind;
  provider: string; // 'resend' | 'internal' | 'manual' | 'gmail-imap' | ...
  provider_event_id?: string | null;
  provider_event_type?: string | null;

  payload?: Record<string, unknown>;
  derived?: Record<string, unknown>;

  actor?: string | null;

  ingest_mode: IngestMode;
  bootstrap_batch_id?: string | null;
  reconciliation?: ReconciliationState | null;

  parent_event_id?: number | null;
}

/**
 * Emit a single outreach event. Fire-and-forget.
 * Returns { ok: true, id } on success, { ok: false, error } on failure.
 * NEVER throws. Caller MUST NOT await for correctness (use it for observability).
 */
export async function emitOutreachEvent(
  event: OutreachEventInput,
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  try {
    const supabase = createAdminSupabase();
    if (!supabase) return { ok: false, error: "supabase_not_configured" };

    const row = {
      at: event.at ?? new Date().toISOString(),
      client_id: event.client_id ?? null,
      orphan: event.orphan ?? false,
      strategy_version: event.strategy_version,
      strategy_assignment_mode: event.strategy_assignment_mode,
      mandate_id: event.mandate_id ?? null,
      attempt_id: event.attempt_id ?? null,
      kind: event.kind,
      provider: event.provider,
      provider_event_id: event.provider_event_id ?? null,
      provider_event_type: event.provider_event_type ?? null,
      payload: event.payload ?? {},
      derived: event.derived ?? {},
      actor: event.actor ?? null,
      ingest_mode: event.ingest_mode,
      bootstrap_batch_id: event.bootstrap_batch_id ?? null,
      reconciliation: event.reconciliation ?? null,
      parent_event_id: event.parent_event_id ?? null,
    };

    const { data, error } = await (supabase as any)
      .from("outreach_events")
      .insert(row)
      .select("id")
      .single();

    if (error) {
      // Duplicate provider_event_id or bootstrap batch collision → swallowed silently (idempotent)
      if (error.code === "23505") {
        return { ok: false, error: "duplicate_event (idempotent)" };
      }
      return { ok: false, error: error.message };
    }

    return { ok: true, id: data.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

/**
 * Emit an ingest-side event (plumbing: bootstrap batches, reconciliation, cursor moves).
 * Separate table, not visible to V5 drawer/journal.
 */
export async function emitIngestEvent(input: {
  event_type:
    | "BOOTSTRAP_BATCH_STARTED"
    | "BOOTSTRAP_BATCH_FINISHED"
    | "BOOTSTRAP_BATCH_FAILED"
    | "PROVIDER_CONFIRMED"
    | "RECONCILED"
    | "ORPHAN_RESOLVED"
    | "REIMPORT_TRIGGERED"
    | "CURSOR_ADVANCED";
  actor?: string | null;
  reason?: string | null;
  payload?: Record<string, unknown>;
  target_event_id?: number | null;
  batch_id?: string | null;
}): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  try {
    const supabase = createAdminSupabase();
    if (!supabase) return { ok: false, error: "supabase_not_configured" };

    const { data, error } = await (supabase as any)
      .from("outreach_ingest_events")
      .insert({
        event_type: input.event_type,
        actor: input.actor ?? null,
        reason: input.reason ?? null,
        payload: input.payload ?? {},
        target_event_id: input.target_event_id ?? null,
        batch_id: input.batch_id ?? null,
      })
      .select("id")
      .single();

    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

/**
 * Fetch the currently ACTIVE strategy version — used by live emitters
 * to snapshot the strategy_version at emit time.
 * Falls back to 'pre-doctrine' sentinel if none ACTIVE.
 */
export async function getActiveStrategyVersion(): Promise<{
  version: string;
  mode: StrategyAssignmentMode;
}> {
  try {
    const supabase = createAdminSupabase();
    if (!supabase) return { version: "pre-doctrine", mode: "absent" };

    const { data, error } = await (supabase as any)
      .from("strategies")
      .select("version")
      .eq("status", "ACTIVE")
      .limit(1)
      .maybeSingle();

    if (error || !data) return { version: "pre-doctrine", mode: "absent" };
    return { version: data.version, mode: "native" };
  } catch {
    return { version: "pre-doctrine", mode: "absent" };
  }
}
