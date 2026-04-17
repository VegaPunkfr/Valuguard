/**
 * Gate status projection (public namespace — not behind /api/admin/* middleware)
 * GET /api/outreach/gate-status
 *
 * Mirrors the logic from /api/admin/outreach/gate-status but lives outside the
 * admin blanket 401 so the cockpit V5 mandate bar badge can reach it with just
 * the COMMAND_SECRET header (x-command-key).
 *
 * Response:
 *   200 { gate_status: 'PASS'|'PARTIAL'|'FAIL', metrics, reasons, at }
 *   404 if no gate evaluation yet
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

  const supabase = createAdminSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  }

  const { data, error } = await (supabase as any)
    .from("outreach_ingest_events")
    .select("at, payload, reason")
    .eq("event_type", "BOOTSTRAP_BATCH_FINISHED")
    .order("at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "query_failed", detail: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "no_gate_evaluation_yet" }, { status: 404 });
  }

  const payload = data.payload ?? {};
  return NextResponse.json(
    {
      gate_status: payload.gate_status ?? null,
      metrics: payload.metrics ?? null,
      reasons: payload.reasons ?? [],
      at: data.at,
    },
    {
      status: 200,
      headers: { "Cache-Control": "private, max-age=30" },
    },
  );
}
