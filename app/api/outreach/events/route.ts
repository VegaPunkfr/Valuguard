/**
 * LOT 1 / OBS-1 — Projection API
 * GET /api/outreach/events
 * Query params :
 *   client_id   : filter by sprint_accounts.id
 *   since       : ISO date | 'Nh' | 'Nd'
 *   kind        : comma-separated list of OUTREACH_KINDS
 *   ingest_mode : comma-separated (live|bootstrap|internal_backfill)
 *   limit       : default 50, max 500
 *   offset      : default 0
 */

import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase";
import { OUTREACH_KINDS } from "@/lib/outreach/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseSince(value: string | null): string | null {
  if (!value) return null;
  const rel = /^(\d+)([hdm])$/.exec(value);
  if (rel) {
    const n = parseInt(rel[1], 10);
    const unit = rel[2];
    const ms = unit === "h" ? 3_600_000 : unit === "d" ? 86_400_000 : 60_000;
    return new Date(Date.now() - n * ms).toISOString();
  }
  // assume ISO
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export async function GET(req: Request) {
  const key =
    req.headers.get("x-command-key") ||
    req.headers.get("authorization")?.replace("Bearer ", "") ||
    "";
  if (!process.env.COMMAND_SECRET || key !== process.env.COMMAND_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const clientId = url.searchParams.get("client_id");
  const since = parseSince(url.searchParams.get("since"));
  const kindRaw = url.searchParams.get("kind");
  const ingestRaw = url.searchParams.get("ingest_mode");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 500);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);

  const kinds = kindRaw
    ? kindRaw
        .split(",")
        .map((s) => s.trim())
        .filter((k) => (OUTREACH_KINDS as readonly string[]).includes(k))
    : null;
  const ingestModes = ingestRaw
    ? ingestRaw
        .split(",")
        .map((s) => s.trim())
        .filter((m) => ["live", "bootstrap", "internal_backfill"].includes(m))
    : null;

  let supabase;
  try {
    supabase = createAdminSupabase();
  } catch (err) {
    return NextResponse.json(
      { error: "supabase_unavailable", detail: err instanceof Error ? err.message : "unknown" },
      { status: 503 },
    );
  }
  if (!supabase) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  }

  let query = (supabase as any)
    .from("outreach_events")
    .select(
      "id, at, client_id, kind, provider, provider_event_type, strategy_version, strategy_assignment_mode, ingest_mode, reconciliation, orphan, attempt_id, derived",
    )
    .order("at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (clientId) query = query.eq("client_id", clientId);
  if (since) query = query.gte("at", since);
  if (kinds && kinds.length > 0) query = query.in("kind", kinds);
  if (ingestModes && ingestModes.length > 0) query = query.in("ingest_mode", ingestModes);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "query_failed", detail: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { events: data ?? [], limit, offset, count: (data ?? []).length },
    {
      status: 200,
      headers: { "Cache-Control": "private, max-age=10" },
    },
  );
}
