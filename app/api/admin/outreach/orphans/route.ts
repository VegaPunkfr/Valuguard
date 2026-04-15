/**
 * LOT 1 / OBS-1 — Orphan events admin projection
 * GET /api/admin/outreach/orphans
 *
 * Lists bootstrap events with orphan=true, with reason, for manual resolution.
 */

import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const key =
    req.headers.get("x-command-key") ||
    req.headers.get("authorization")?.replace("Bearer ", "") ||
    "";
  if (!process.env.COMMAND_SECRET || key !== process.env.COMMAND_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10), 500);

  const supabase = createAdminSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  }

  const { data, error } = await (supabase as any)
    .from("outreach_events")
    .select("id, at, kind, provider, provider_event_id, derived, ingest_mode")
    .eq("orphan", true)
    .order("at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: "query_failed", detail: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { orphans: data ?? [], count: (data ?? []).length },
    { status: 200, headers: { "Cache-Control": "private, max-age=30" } },
  );
}
