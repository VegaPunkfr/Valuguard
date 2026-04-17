/**
 * LOT 1 / OBS-1 — Resend webhook ingest
 * POST /api/webhook/resend
 *
 * - Signature verify via svix headers (Resend uses svix-compatible signing)
 * - Idempotence via UNIQUE(provider, provider_event_id)
 * - Resolves client_id from tags.client_id → email → domain unique
 * - Snapshot strategy_version at ingest time
 * - Transitions sprint_accounts.status for REPLIED/BOUNCE/COMPLAINED/UNSUBSCRIBED
 */

import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminSupabase } from "@/lib/supabase";
import {
  emitOutreachEvent,
  emitIngestEvent,
  getActiveStrategyVersion,
  type OutreachKind,
} from "@/lib/outreach/events";
import { resolveClientId } from "@/lib/outreach/bootstrap/resolver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mapResendTypeToKind(type: string): OutreachKind | null {
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

function verifySignature(rawBody: string, headers: Headers): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET || "";
  if (!secret) {
    // SECURITY: if no secret, refuse
    return false;
  }
  const id = headers.get("svix-id") || "";
  const ts = headers.get("svix-timestamp") || "";
  const sigHeader = headers.get("svix-signature") || "";
  if (!id || !ts || !sigHeader) return false;

  const signedPayload = `${id}.${ts}.${rawBody}`;
  // svix secret format: whsec_<base64>
  const secretKey = secret.startsWith("whsec_")
    ? Buffer.from(secret.slice(6), "base64")
    : Buffer.from(secret, "utf-8");

  const expected = crypto.createHmac("sha256", secretKey).update(signedPayload).digest("base64");

  // Signature header can contain multiple signatures space-separated, each prefixed v1,
  const sigs = sigHeader.split(" ").map((s) => s.replace(/^v1,/, ""));
  return sigs.some((s) => {
    try {
      return crypto.timingSafeEqual(Buffer.from(s, "base64"), Buffer.from(expected, "base64"));
    } catch {
      return false;
    }
  });
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const receivedAt = new Date().toISOString();

  // DEBUG 2026-04-17 : log chaque réception webhook pour diagnostiquer pourquoi
  // seulement 1/819 DELIVERED. Si ce log n'apparaît jamais → Resend n'envoie
  // RIEN (webhook URL pas configuré dashboard OU tracking désactivé).
  console.log(`[webhook-resend] ${receivedAt} HIT size=${rawBody.length}B type=${(() => {
    try { return JSON.parse(rawBody).type || "?"; } catch { return "unparseable"; }
  })()}`);

  if (!verifySignature(rawBody, req.headers)) {
    console.warn(`[webhook-resend] ${receivedAt} REJECTED invalid_signature — secret set=${!!process.env.RESEND_WEBHOOK_SECRET}`);
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const providerEventId = event.id || event.data?.email_id || event.data?.id || null;
  const eventType: string = event.type || "unknown";
  const kind = mapResendTypeToKind(eventType);

  if (!kind) {
    // Event reçu mais non mappé — trace en ingest_events, ne crée pas d'outreach_event
    await emitIngestEvent({
      event_type: "PROVIDER_CONFIRMED",
      reason: `unmapped_type_${eventType}`,
      payload: { event },
    });
    return NextResponse.json({ ok: true, note: "unmapped_type" });
  }

  const data = event.data ?? {};
  const toEmail: string | null = Array.isArray(data.to) ? data.to[0] : data.to ?? null;
  const tags = data.tags ?? {};

  const resolved = await resolveClientId({
    tagClientId: tags.client_id ?? null,
    toEmail,
    toDomain: toEmail?.split("@")[1] ?? null,
  });

  // strategy_version : prefer tag (snapshotted at send time), else ACTIVE, else sentinel
  let strategyVersion: string = tags.strategy_version ?? "";
  let assignmentMode: "native" | "retroactive" | "absent" = "native";
  if (!strategyVersion) {
    const active = await getActiveStrategyVersion();
    strategyVersion = active.version;
    assignmentMode = active.mode;
  }

  const emitted = await emitOutreachEvent({
    at: data.created_at ?? new Date().toISOString(),
    client_id: resolved.ok ? resolved.client_id : null,
    orphan: !resolved.ok,
    strategy_version: strategyVersion,
    strategy_assignment_mode: assignmentMode,
    attempt_id: tags.attempt_id ?? null,
    kind,
    provider: "resend",
    provider_event_id: providerEventId,
    provider_event_type: eventType,
    payload: event,
    derived: {
      to: toEmail,
      subject: data.subject,
      from: data.from,
      orphan_reason: resolved.ok ? null : resolved.reason,
    },
    actor: "webhook-resend",
    ingest_mode: "live",
  });

  // State transition on sprint_accounts for actionable kinds.
  // GUARD : ne jamais écraser une décision opérateur terminale (REJECTED, UNSUB).
  if (resolved.ok && ["REPLIED", "BOUNCE", "COMPLAINED", "UNSUBSCRIBED"].includes(kind)) {
    const supabase = createAdminSupabase();
    if (supabase) {
      const statusMap: Record<string, string> = {
        REPLIED: "REPLIED",
        BOUNCE: "BLOCKED",
        COMPLAINED: "BLOCKED",
        UNSUBSCRIBED: "UNSUB",
      };
      const newStatus = statusMap[kind];
      if (newStatus) {
        const { data: current } = await (supabase as any)
          .from("sprint_accounts")
          .select("status")
          .eq("id", resolved.client_id)
          .maybeSingle();
        const terminalOperatorStates = ["REJECTED", "UNSUB"];
        if (!current || !terminalOperatorStates.includes(current.status)) {
          await (supabase as any)
            .from("sprint_accounts")
            .update({
              status: newStatus,
              last_action_at: new Date().toISOString(),
            })
            .eq("id", resolved.client_id);
        }
      }
    }
  }

  return NextResponse.json({ ok: true, emitted });
}
