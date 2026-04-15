/**
 * LOT 1 / OBS-0 — Resend historical pull
 * Pulls /emails and /events paginated. Idempotent. Uses bootstrap_cursors for resume.
 */

import { createAdminSupabase } from "@/lib/supabase";
import { emitOutreachEvent, emitIngestEvent, type OutreachKind } from "@/lib/outreach/events";
import { resolveClientId, deterministicAttemptId } from "./resolver";

const RESEND_API = "https://api.resend.com";
const SOURCE_KEY = "resend";

function resendKindFromEvent(type: string): OutreachKind | null {
  const map: Record<string, OutreachKind> = {
    "email.sent": "SEND_SUCCESS",
    "email.delivered": "DELIVERED",
    "email.delivery_delayed": "SEND_ATTEMPT",
    "email.opened": "OPENED",
    "email.clicked": "CLICKED",
    "email.bounced": "BOUNCE",
    "email.complained": "COMPLAINED",
    "email.failed": "SEND_FAIL",
  };
  return map[type] ?? null;
}

export async function pullResendHistory(opts: {
  apiKey: string;
  batchId: string;
  sinceIso?: string;
  maxPages?: number;
}): Promise<{
  imported: number;
  orphans: number;
  failed: number;
  cursor: string | null;
}> {
  const supabase = createAdminSupabase();
  if (!supabase) throw new Error("supabase_not_configured");

  let cursor: string | null = null;
  let imported = 0;
  let orphans = 0;
  let failed = 0;
  const maxPages = opts.maxPages ?? 100;

  // Resume from previous cursor if exists
  const { data: cursorRow } = await (supabase as any)
    .from("bootstrap_cursors")
    .select("last_cursor")
    .eq("source", SOURCE_KEY)
    .maybeSingle();
  if (cursorRow?.last_cursor) cursor = cursorRow.last_cursor;

  for (let page = 0; page < maxPages; page++) {
    const url = new URL(`${RESEND_API}/emails`);
    url.searchParams.set("limit", "100");
    if (cursor) url.searchParams.set("after", cursor);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${opts.apiKey}` },
    });
    if (!res.ok) {
      await emitIngestEvent({
        event_type: "BOOTSTRAP_BATCH_FAILED",
        batch_id: opts.batchId,
        reason: `resend_api_http_${res.status}`,
        payload: { page, cursor },
      });
      break;
    }

    const body: any = await res.json();
    const items: any[] = body.data ?? [];
    if (items.length === 0) {
      cursor = null;
      break;
    }

    for (const email of items) {
      const toEmail = Array.isArray(email.to) ? email.to[0] : email.to;
      const resolved = await resolveClientId({
        tagClientId: email.tags?.client_id ?? null,
        toEmail,
        toDomain: toEmail?.split("@")[1] ?? null,
      });

      const clientId = resolved.ok ? resolved.client_id : null;
      const orphan = !resolved.ok;
      if (orphan) orphans++;

      // Base SEND_SUCCESS event from /emails
      const attemptId = email.tags?.attempt_id ?? deterministicAttemptId("resend", email.id);
      const r = await emitOutreachEvent({
        at: email.created_at ?? new Date().toISOString(),
        client_id: clientId,
        orphan,
        strategy_version: email.tags?.strategy_version ?? "pre-doctrine",
        strategy_assignment_mode: email.tags?.strategy_version ? "retroactive" : "absent",
        attempt_id: attemptId,
        kind: "SEND_SUCCESS",
        provider: "resend",
        provider_event_id: email.id,
        provider_event_type: "email.sent",
        payload: email,
        derived: {
          to: toEmail,
          subject: email.subject,
          from: email.from,
          source: "resend_api_emails",
          orphan_reason: resolved.ok ? null : resolved.reason,
        },
        actor: "bootstrap",
        ingest_mode: "bootstrap",
        bootstrap_batch_id: opts.batchId,
        reconciliation: "resend_only",
      });
      if (r.ok) imported++;
      else if (!r.error.includes("duplicate")) failed++;

      cursor = email.id; // paginate par ID
    }

    // Persist cursor
    await (supabase as any)
      .from("bootstrap_cursors")
      .upsert({
        source: SOURCE_KEY,
        last_cursor: cursor,
        last_batch_id: opts.batchId,
        last_imported_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    await emitIngestEvent({
      event_type: "CURSOR_ADVANCED",
      batch_id: opts.batchId,
      payload: { cursor, page, imported_so_far: imported },
    });

    if (items.length < 100) break; // dernière page
  }

  return { imported, orphans, failed, cursor };
}
