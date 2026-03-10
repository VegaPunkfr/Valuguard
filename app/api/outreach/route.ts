/**
 * GHOST TAX — OUTREACH BATCH SENDER
 *
 * POST /api/outreach
 *
 * Accepts a list of leads and sends personalized Touch 1 emails.
 * Each lead gets an exposure estimate based on industry benchmarks,
 * then enters the drip sequence.
 *
 * Auth: requires OUTREACH_API_KEY header (internal use only).
 * Rate limit: 50 emails/hour per instance.
 *
 * Request body:
 *   { leads: OutreachLead[] }
 *
 * Response:
 *   { sent: number, failed: number, skipped: number, results: OutreachSendResult[] }
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
  validateAndEnrichLead,
} from "@/lib/outreach";

export const maxDuration = 300; // 5 min for batch sends

// ── Auth Check ───────────────────────────────────────────

function isAuthorized(request: NextRequest): boolean {
  const apiKey = process.env.OUTREACH_API_KEY;
  if (!apiKey) {
    console.warn("[Ghost Tax Outreach] OUTREACH_API_KEY not set. Auth disabled in dev.");
    return process.env.NODE_ENV === "development";
  }
  const provided = request.headers.get("x-api-key") || request.headers.get("authorization")?.replace("Bearer ", "");
  return provided === apiKey;
}

// ── POST Handler ─────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { leads: OutreachLead[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.leads || !Array.isArray(body.leads) || body.leads.length === 0) {
    return NextResponse.json({ error: "leads array is required and must not be empty" }, { status: 400 });
  }

  // Validate lead structure
  for (const lead of body.leads) {
    if (!lead.email || !lead.company || !lead.domain || !lead.headcount || !lead.industry) {
      return NextResponse.json({
        error: `Invalid lead: email, company, domain, headcount, and industry are required. Got: ${JSON.stringify(lead)}`,
      }, { status: 400 });
    }
  }

  const supabase = createAdminSupabase();
  const results: OutreachSendResult[] = [];
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const lead of body.leads) {
    // ── Validate email & enrich lead ─────────────────
    const validation = validateAndEnrichLead(lead);
    if (!validation.valid) {
      results.push({ email: lead.email, success: false, error: validation.reason || "Invalid email", touch: 1 });
      skipped++;
      continue;
    }

    // Auto-enrich locale and geo
    if (!lead.locale || lead.locale === "en") {
      lead.locale = validation.enrichedLocale;
    }
    lead.geoMarket = validation.geoMarket;
    lead.emailQuality = validation.emailQuality;

    // ── Rate limit check ─────────────────────────────
    const rateCheck = checkRateLimit(lead.domain);
    if (!rateCheck.allowed) {
      console.warn(`[Ghost Tax Outreach] Rate limit: ${rateCheck.reason}`);
      results.push({ email: lead.email, success: false, error: rateCheck.reason || "Rate limit exceeded", touch: 1 });
      skipped++;
      continue;
    }

    // ── Check if lead already exists (dedup) ─────────
    if (supabase) {
      const { data: existing } = await (supabase as any)
        .from("outreach_leads")
        .select("id, status, unsubscribed")
        .eq("email", lead.email)
        .single();

      if (existing) {
        if (existing.unsubscribed) {
          results.push({ email: lead.email, success: false, error: "Unsubscribed", touch: 1 });
          skipped++;
          continue;
        }
        if (existing.status === "active" || existing.status === "converted") {
          results.push({ email: lead.email, success: false, error: "Already in pipeline", touch: 1 });
          skipped++;
          continue;
        }
      }
    }

    // ── Calculate exposure (v2: geo-aware) ────────────
    const exposure = estimateExposure(lead.headcount, lead.industry, lead.geoMarket);
    const locale = lead.locale || validation.enrichedLocale || "en";

    // ── Build and send Touch 1 ───────────────────────
    const { subject, html } = buildTouchEmail(1, lead, exposure, locale);

    const sendResult = await sendOutreachEmail({
      to: lead.email,
      subject,
      html,
      tags: [
        { name: "campaign", value: "outreach-drip" },
        { name: "touch", value: "1" },
        { name: "domain", value: lead.domain },
      ],
    });

    if (sendResult.success) {
      recordSend(lead.domain);
      sent++;

      // ── Persist lead + send record ─────────────────
      if (supabase) {
        const now = new Date().toISOString();
        const nextSendAt = getNextSendDate(2).toISOString();

        const { error: leadError } = await (supabase as any)
          .from("outreach_leads")
          .upsert({
            email: lead.email,
            name: lead.name || null,
            company: lead.company,
            domain: lead.domain,
            headcount: lead.headcount,
            industry: lead.industry,
            locale,
            source: lead.source || "manual",
            status: "active",
            drip_step: 1,
            last_sent_at: now,
            next_send_at: nextSendAt,
            unsubscribed: false,
            converted: false,
            // v2 enrichment fields
            geo_market: lead.geoMarket || null,
            email_quality: lead.emailQuality || null,
          }, { onConflict: "email" });

        if (leadError) {
          console.error("[Ghost Tax Outreach] Failed to persist lead:", leadError.message);
        }

        // Log send
        const { data: leadRow } = await (supabase as any)
          .from("outreach_leads")
          .select("id")
          .eq("email", lead.email)
          .single();

        if (leadRow) {
          await (supabase as any)
            .from("outreach_sends")
            .insert({
              lead_id: leadRow.id,
              touch_number: 1,
              sent_at: now,
              resend_id: sendResult.id || null,
            });
        }
      }

      results.push({ email: lead.email, success: true, touch: 1 });
    } else {
      failed++;
      results.push({ email: lead.email, success: false, error: sendResult.error, touch: 1 });
    }
  }

  console.log(`[Ghost Tax Outreach] Batch complete: ${sent} sent, ${failed} failed, ${skipped} skipped`);

  return NextResponse.json({
    sent,
    failed,
    skipped,
    total: body.leads.length,
    results,
  });
}
