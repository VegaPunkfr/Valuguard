/**
 * GHOST TAX — REPORT STATUS POLLING
 *
 * GET /api/report/status?session_id=cs_xxx
 *
 * Polled by the success page to check if delivery is complete.
 * Returns { status, runId } so client can redirect to /report/[runId].
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }

  const supabase = createAdminSupabase();
  if (!supabase) {
    return NextResponse.json({ status: "processing" });
  }

  const { data, error } = await (supabase as any)
    .from("audit_requests")
    .select("status, run_id")
    .eq("stripe_payment_intent_id", sessionId)
    .single();

  if (error || !data) {
    // Not found yet — delivery might still be in progress
    return NextResponse.json({ status: "processing" });
  }

  return NextResponse.json({
    status: data.status,
    runId: data.run_id,
  });
}
