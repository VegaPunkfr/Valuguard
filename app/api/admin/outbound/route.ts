/**
 * GHOST TAX — ADMIN OUTBOUND API
 *
 * GET /api/admin/outbound?key=ADMIN_SECRET&status=PENDING_REVIEW
 *   → Returns list of osint_prospects matching status filter
 *
 * POST /api/admin/outbound
 *   → Updates prospect status (approve/reject) + optional email edits
 *
 * Protected by ADMIN_SECRET_KEY (or falls back to CRON_SECRET).
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase";

function getAdminSecret(): string | null {
  return process.env.ADMIN_SECRET_KEY || process.env.CRON_SECRET || null;
}

function validateKey(provided: string | null): boolean {
  const secret = getAdminSecret();
  if (!secret) return false;
  return provided === secret;
}

// ── GET: List prospects ──────────────────────────────

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!validateKey(key)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = req.nextUrl.searchParams.get("status") || "PENDING_REVIEW";
  const limit = Math.min(50, parseInt(req.nextUrl.searchParams.get("limit") || "50", 10));

  const supabase = createAdminSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const { data, error } = await (supabase
    .from("osint_prospects") as ReturnType<typeof supabase.from>)
    .select("*")
    .eq("status", status)
    .order("status_changed_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[Admin Outbound] DB error:", error.message);
    return NextResponse.json({ error: "Failed to fetch prospects" }, { status: 500 });
  }

  return NextResponse.json({ prospects: data || [], count: data?.length || 0 });
}

// ── POST: Update prospect status ─────────────────────

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!validateKey(body.key as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const domain = body.domain as string;
  const newStatus = body.status as string;
  if (!domain || !newStatus) {
    return NextResponse.json({ error: "domain and status required" }, { status: 400 });
  }

  const validStatuses = ["DISCOVERED", "PENDING_REVIEW", "READY_FOR_OUTREACH", "OUTREACH_SENT", "NURTURING", "CONVERTED", "DEAD"];
  if (!validStatuses.includes(newStatus)) {
    return NextResponse.json({ error: `Invalid status. Valid: ${validStatuses.join(", ")}` }, { status: 400 });
  }

  const supabase = createAdminSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  // Build update payload
  const update: Record<string, unknown> = {
    status: newStatus,
    status_changed_at: new Date().toISOString(),
  };

  // If email was edited, update enrichment_data
  const editedSubject = body.editedSubject as string | undefined;
  const editedBody = body.editedBody as string | undefined;

  if (editedSubject || editedBody) {
    // Fetch current enrichment_data to merge
    const { data: current } = await (supabase
      .from("osint_prospects") as ReturnType<typeof supabase.from>)
      .select("enrichment_data")
      .eq("domain", domain)
      .single();

    if (current) {
      const enrichment = (current as Record<string, unknown>).enrichment_data as Record<string, unknown> || {};
      const existingDraft = enrichment.emailDraft as Record<string, unknown> || {};

      enrichment.emailDraft = {
        ...existingDraft,
        ...(editedSubject ? { subject: editedSubject } : {}),
        ...(editedBody ? { body: editedBody } : {}),
        editedAt: new Date().toISOString(),
        editedByAdmin: true,
      };

      update.enrichment_data = enrichment;
    }
  }

  const { error } = await (supabase
    .from("osint_prospects") as ReturnType<typeof supabase.from>)
    .update(update)
    .eq("domain", domain);

  if (error) {
    console.error("[Admin Outbound] Update error:", error.message);
    return NextResponse.json({ error: "Failed to update prospect" }, { status: 500 });
  }

  return NextResponse.json({ success: true, domain, status: newStatus });
}
