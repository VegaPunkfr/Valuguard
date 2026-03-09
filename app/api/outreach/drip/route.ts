/**
 * GHOST TAX — DRIP SEQUENCE HANDLER
 *
 * POST /api/outreach/drip
 *
 * Processes the next drip touch for leads that are due.
 * Called by the cron handler or manually via API.
 *
 * For each eligible lead:
 *   1. Check if converted (bought Rail A) — skip if yes
 *   2. Check if unsubscribed — skip if yes
 *   3. Determine which touch is next (2-5)
 *   4. Build personalized email with exposure estimate
 *   5. Send via Resend
 *   6. Update drip state
 *
 * Auth: requires OUTREACH_API_KEY or CRON_SECRET header.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase";
import {
  type OutreachLead,
  type OutreachSendResult,
  estimateExposure,
  buildTouchEmail,
  sendOutreachEmail,
  checkRateLimit,
  recordSend,
  getNextSendDate,
  DRIP_SCHEDULE,
} from "@/lib/outreach";

export const maxDuration = 300;

// ── Auth ─────────────────────────────────────────────────

function isAuthorized(request: NextRequest): boolean {
  const apiKey = process.env.OUTREACH_API_KEY;
  const cronSecret = process.env.CRON_SECRET;

  const provided =
    request.headers.get("x-api-key") ||
    request.headers.get("authorization")?.replace("Bearer ", "");

  if (apiKey && provided === apiKey) return true;
  if (cronSecret && provided === cronSecret) return true;

  // Dev mode fallback
  if (!apiKey && !cronSecret && process.env.NODE_ENV === "development") return true;

  return false;
}

// ── POST Handler ─────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  // ── Fetch leads due for next touch ─────────────────
  const now = new Date().toISOString();

  const { data: dueLeads, error: queryError } = await (supabase as any)
    .from("outreach_leads")
    .select("*")
    .eq("status", "active")
    .eq("unsubscribed", false)
    .eq("converted", false)
    .lt("next_send_at", now)
    .lt("drip_step", 5) // max 5 touches
    .order("next_send_at", { ascending: true })
    .limit(50); // process up to 50 per batch (rate limit aligned)

  if (queryError) {
    console.error("[Ghost Tax Drip] Query failed:", queryError.message);
    return NextResponse.json({ error: "Database query failed" }, { status: 500 });
  }

  if (!dueLeads || dueLeads.length === 0) {
    return NextResponse.json({ message: "No leads due for drip", processed: 0 });
  }

  console.log(`[Ghost Tax Drip] Processing ${dueLeads.length} leads`);

  const results: OutreachSendResult[] = [];
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const lead of dueLeads) {
    // ── Rate limit check ─────────────────────────────
    const rateCheck = checkRateLimit();
    if (!rateCheck.allowed) {
      console.warn("[Ghost Tax Drip] Rate limit reached, stopping batch");
      break;
    }

    const nextTouch = lead.drip_step + 1;

    // ── Check if lead has converted (purchased Rail A) ─
    const { data: converted } = await (supabase as any)
      .from("audit_requests")
      .select("id")
      .eq("email", lead.email)
      .in("status", ["processing", "delivered", "followup_scheduled"])
      .limit(1);

    if (converted && converted.length > 0) {
      // Mark as converted, stop drip
      await (supabase as any)
        .from("outreach_leads")
        .update({ status: "converted", converted: true })
        .eq("id", lead.id);

      results.push({ email: lead.email, success: false, error: "Converted", touch: nextTouch });
      skipped++;
      continue;
    }

    // ── Calculate exposure ───────────────────────────
    const exposure = estimateExposure(lead.headcount, lead.industry);
    const locale = lead.locale || "en";

    // ── Build lead object for template ───────────────
    const leadObj: OutreachLead = {
      email: lead.email,
      name: lead.name,
      company: lead.company,
      domain: lead.domain,
      headcount: lead.headcount,
      industry: lead.industry,
      locale,
    };

    // ── Build and send email ─────────────────────────
    const { subject, html } = buildTouchEmail(nextTouch, leadObj, exposure, locale);

    const sendResult = await sendOutreachEmail({
      to: lead.email,
      subject,
      html,
      tags: [
        { name: "campaign", value: "outreach-drip" },
        { name: "touch", value: String(nextTouch) },
        { name: "domain", value: lead.domain },
      ],
    });

    if (sendResult.success) {
      recordSend();
      sent++;

      // ── Update drip state ──────────────────────────
      const sentAt = new Date().toISOString();
      const isLastTouch = nextTouch >= 5;
      const nextSendAt = isLastTouch ? null : getNextSendDate(nextTouch + 1).toISOString();

      await (supabase as any)
        .from("outreach_leads")
        .update({
          drip_step: nextTouch,
          last_sent_at: sentAt,
          next_send_at: nextSendAt,
          status: isLastTouch ? "completed" : "active",
        })
        .eq("id", lead.id);

      // ── Log send ───────────────────────────────────
      await (supabase as any)
        .from("outreach_sends")
        .insert({
          lead_id: lead.id,
          touch_number: nextTouch,
          sent_at: sentAt,
          resend_id: sendResult.id || null,
        });

      results.push({ email: lead.email, success: true, touch: nextTouch });
    } else {
      failed++;

      // If bounce, mark as bounced
      if (sendResult.error?.includes("bounce") || sendResult.error?.includes("invalid")) {
        await (supabase as any)
          .from("outreach_leads")
          .update({ status: "bounced" })
          .eq("id", lead.id);
      }

      results.push({ email: lead.email, success: false, error: sendResult.error, touch: nextTouch });
    }
  }

  console.log(`[Ghost Tax Drip] Batch complete: ${sent} sent, ${failed} failed, ${skipped} skipped`);

  return NextResponse.json({
    processed: dueLeads.length,
    sent,
    failed,
    skipped,
    results,
  });
}
