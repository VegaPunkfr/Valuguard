/**
 * VALUGUARD — AUDIT OPEN TRACKING (POST /api/audit/track)
 *
 * Sprint 4 : Appelé par AuditReportClient au useEffect.
 * Marque le lead comme OPENED dans osint_prospects.
 *
 * Body: { ref: string } (tracking_id from URL ?ref=xxx)
 * Response: { success: boolean }
 */

import { NextRequest, NextResponse } from "next/server";
import { markAuditOpened } from "@/lib/outreach/tracking";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as { ref?: string };
    const ref = body?.ref;

    if (!ref || typeof ref !== "string" || ref.length < 10 || ref.length > 50) {
      return NextResponse.json(
        { success: false, error: "Invalid tracking ref" },
        { status: 400 },
      );
    }

    const result = await markAuditOpened(ref);

    return NextResponse.json({
      success: result.success,
      firstOpen: result.firstOpen,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 },
    );
  }
}
