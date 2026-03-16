/**
 * GHOST TAX — DRIP ENQUEUE API (SERVER-ONLY)
 *
 * POST /api/drip/enqueue
 *
 * Enrolls a free-scan lead into the 5-touch drip sequence.
 * Inserts a row into `drip_queue` with pre-computed send timestamps.
 *
 * Called by:
 *   - app/api/leads/capture/route.ts (fire-and-forget after lead capture)
 *   - app/api/intel/route.ts (optional: after scan completion)
 *
 * Idempotent: UPSERT on (email, domain) — re-scan resets the schedule.
 *
 * Table: drip_queue (migration 012_drip_queue.sql)
 * Processed by: master cron Stage 3 (runDripSequence on outreach_leads)
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase";
import { scheduleDrip, type DripLead } from "@/lib/drip";

// ── Validation helpers ─────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DOMAIN_RE = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;

function sanitizeDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .slice(0, 253);
}

// ── POST handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const {
      email,
      domain,
      exposureLow,
      exposureHigh,
      industry,
      headcount,
      locale,
    } = body;

    // ── Input validation ────────────────────────────────────────────────

    if (!email || typeof email !== "string" || !EMAIL_RE.test(email.trim().toLowerCase())) {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Derive domain from email if not provided
    const rawDomain =
      typeof domain === "string" && domain.trim().length > 0
        ? domain
        : cleanEmail.split("@")[1] || "";

    const cleanDomain = sanitizeDomain(rawDomain);
    if (!cleanDomain || !DOMAIN_RE.test(cleanDomain)) {
      return NextResponse.json(
        { error: "A valid domain is required." },
        { status: 400 }
      );
    }

    // Sanitize optional fields
    const cleanExposureLow =
      typeof exposureLow === "number" && exposureLow > 0
        ? Math.round(exposureLow)
        : null;
    const cleanExposureHigh =
      typeof exposureHigh === "number" && exposureHigh > 0
        ? Math.round(exposureHigh)
        : null;
    const cleanIndustry =
      typeof industry === "string" ? industry.trim().slice(0, 100) : null;
    const cleanHeadcount =
      typeof headcount === "number"
        ? headcount
        : typeof headcount === "string"
        ? parseInt(headcount, 10) || null
        : null;
    const cleanLocale =
      locale === "fr" || locale === "de" ? locale : "en";

    // ── Build drip schedule ─────────────────────────────────────────────

    const scannedAt = new Date();

    const dripLead: DripLead = {
      email: cleanEmail,
      domain: cleanDomain,
      exposureLow: cleanExposureLow ?? undefined,
      exposureHigh: cleanExposureHigh ?? undefined,
      industry: cleanIndustry ?? undefined,
      headcount: cleanHeadcount ?? undefined,
      locale: cleanLocale,
      scannedAt,
    };

    const schedule = scheduleDrip(dripLead);

    // ── Persist to drip_queue ───────────────────────────────────────────

    const db = createAdminSupabase();
    if (db) {
      const { error: upsertError } = await (db as any)
        .from("drip_queue")
        .upsert(
          {
            email: cleanEmail,
            domain: cleanDomain,
            locale: cleanLocale,
            exposure_low: cleanExposureLow,
            exposure_high: cleanExposureHigh,

            // Pre-computed send timestamps
            touch1_at: schedule[0].sendAt.toISOString(),
            touch2_at: schedule[1].sendAt.toISOString(),
            touch3_at: schedule[2].sendAt.toISOString(),
            touch4_at: schedule[3].sendAt.toISOString(),
            touch5_at: schedule[4].sendAt.toISOString(),

            // Reset sent flags on re-enroll (re-scan)
            touch1_sent: false,
            touch2_sent: false,
            touch3_sent: false,
            touch4_sent: false,
            touch5_sent: false,

            unsubscribed: false,
            created_at: scannedAt.toISOString(),
          },
          { onConflict: "email,domain" }
        );

      if (upsertError) {
        // Log but don't fail — outreach_leads is the primary drip driver
        console.error("[Drip Enqueue] drip_queue upsert error:", upsertError.message);
      }
    } else {
      console.log("[Drip Enqueue] No DB configured — dry run for:", cleanEmail);
    }

    console.log(
      `[Drip Enqueue] Enrolled ${cleanEmail} (${cleanDomain}) — 5 touches scheduled`,
      schedule.map(t => ({ touch: t.touch, sendAt: t.sendAt.toISOString() }))
    );

    return NextResponse.json({
      success: true,
      touchesScheduled: 5,
      schedule: schedule.map(t => ({
        touch: t.touch,
        sendAt: t.sendAt.toISOString(),
        subject: t.subject,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Drip Enqueue] Unhandled error:", message);
    return NextResponse.json(
      { error: "Failed to enqueue drip sequence." },
      { status: 500 }
    );
  }
}
