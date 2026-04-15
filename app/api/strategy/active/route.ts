import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/strategy/active
 * Returns the single ACTIVE Ghost Tax strategy, if any.
 * - 200 : strategy payload
 * - 404 : no ACTIVE strategy in DB (honest fallback)
 * - 503 : Supabase unavailable
 * - 500 : query failure
 */
export async function GET() {
  let supabase;
  try {
    supabase = createAdminSupabase();
  } catch (err) {
    return NextResponse.json(
      {
        error: "supabase_unavailable",
        message: "Supabase admin client could not be initialized.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 503 },
    );
  }

  const { data, error } = await supabase
    .from("strategies")
    .select(
      "id, version, status, body, activated_at, activated_by, expires_at, signed_off_by, signed_off_at, created_at",
    )
    .eq("status", "ACTIVE")
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        error: "query_failed",
        message: "Failed to read active strategy.",
        detail: error.message,
      },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      {
        error: "no_active_strategy",
        message:
          "No ACTIVE strategy found. Run supabase/scripts/activate-strategy.sql to activate the seeded DRAFT.",
      },
      { status: 404 },
    );
  }

  return NextResponse.json(
    { strategy: data },
    {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=30",
      },
    },
  );
}
