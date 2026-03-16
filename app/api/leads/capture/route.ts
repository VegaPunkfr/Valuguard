/**
 * GHOST TAX — LEAD CAPTURE API
 *
 * POST /api/leads/capture
 * Captures leads from Ghost Tax calculator and other micro-tools.
 * Saves to Supabase `outreach_leads` table for drip sequence enrollment.
 *
 * Rate limited: 10 requests per IP per minute.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase";
import { validateEmail } from "@/lib/email-validation";

// ── In-memory rate limiter ──────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT) return true;
  return false;
}

// Evict stale entries during rate checks (serverless-safe, no setInterval)
let evictCounter = 0;
function evictStale() {
  evictCounter++;
  if (evictCounter % 20 !== 0) return;
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}

// ── Email validation ────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  if (email.length > 254) return false;
  return EMAIL_RE.test(email.trim().toLowerCase());
}

// ── POST handler ────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    evictStale();
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Try again in a minute." },
        { status: 429 }
      );
    }

    // Parse body
    const body = await request.json().catch(() => ({}));
    const { email, domain, company, headcount, industry, source, meta } = body;

    // Validate required field (basic format check first, fast path)
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 }
      );
    }

    // Deep validation: disposable/free detection, MX check, quality scoring
    const validation = await validateEmail(email);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "A valid business email address is required." },
        { status: 400 }
      );
    }
    // Reject disposable addresses outright; accept free providers (quality < 50) but still capture
    if (validation.isDisposable) {
      return NextResponse.json(
        { error: "Disposable email addresses are not accepted." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const leadSource = typeof source === "string" ? source.slice(0, 100) : "unknown";

    // Sanitize optional string fields (length cap to prevent DB bloat)
    const cleanDomain = typeof domain === "string" ? domain.trim().slice(0, 253) : null;
    const cleanCompany = typeof company === "string" ? company.trim().slice(0, 200) : null;
    const cleanIndustry = typeof industry === "string" ? industry.trim().slice(0, 100) : null;
    const cleanHeadcount = typeof headcount === "number" ? headcount : (typeof headcount === "string" ? parseInt(headcount, 10) || null : null);
    // Cap meta to prevent oversized payloads (max 2KB serialized)
    const cleanMeta = meta ? (() => { try { const s = JSON.stringify(meta); return s.length <= 2048 ? meta : null; } catch { return null; } })() : null;

    // Save to Supabase
    const supabase = createAdminSupabase();

    if (supabase) {
      const now = new Date();
      const { error } = await (supabase as any).from("outreach_leads").upsert(
        {
          email: cleanEmail,
          domain: cleanDomain || cleanEmail.split("@")[1] || null,
          company: cleanCompany,
          headcount: cleanHeadcount,
          industry: cleanIndustry,
          source: leadSource,
          meta: cleanMeta,
          ip_hash: simpleHash(ip),
          email_quality: validation.qualityScore,
          email_quality_tier: validation.quality,
          locale: validation.suggestedLocale || "en",
          status: "active",
          drip_step: 0,
          next_send_at: now.toISOString(), // Eligible for Touch 1 immediately
          unsubscribed: false,
          converted: false,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        },
        { onConflict: "email" }
      );

      if (error) {
        console.error("[Ghost Tax] Lead capture DB error:", error.message);
        // Don't expose DB errors to client — still return success
        // The lead data is logged for manual recovery if needed
        console.error("[Ghost Tax] Lead data (for recovery):", {
          email: cleanEmail,
          source: leadSource,
          company,
        });
      }
    } else {
      // No Supabase configured — log for dev
      console.log("[Ghost Tax] Lead captured (no DB):", {
        email: cleanEmail,
        source: leadSource,
        company: cleanCompany,
        industry: cleanIndustry,
      });
    }

    // ── Fire-and-forget: enroll in 5-touch drip sequence ──
    // Non-blocking — drip failure must never block lead capture response.
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ghost-tax.com";
    fetch(`${siteUrl}/api/drip/enqueue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: cleanEmail,
        domain: cleanDomain,
        industry: cleanIndustry,
        headcount: cleanHeadcount,
        locale: validation.suggestedLocale || "en",
        // exposureLow / exposureHigh populated by intel scan if available via meta
        exposureLow: cleanMeta?.exposureLow ?? cleanMeta?.exposure_low ?? undefined,
        exposureHigh: cleanMeta?.exposureHigh ?? cleanMeta?.exposure_high ?? undefined,
      }),
    }).catch((e) => {
      console.error("[Ghost Tax] Drip enqueue fire-and-forget failed:", e?.message);
    });

    // ── BRIDGE: Fire event to Founder Mission Control ──
    const commandSecret = process.env.COMMAND_SECRET;
    if (commandSecret && cleanDomain) {
      fetch(`${siteUrl}/api/command/ingest?key=${commandSecret}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "lead_captured",
          domain: cleanDomain,
          email: cleanEmail,
          companyName: cleanCompany || undefined,
          headcount: cleanHeadcount || undefined,
          industry: cleanIndustry || undefined,
        }),
      }).catch(() => { /* bridge failure is non-fatal */ });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[Ghost Tax] Lead capture error:", err);
    return NextResponse.json(
      { error: "Failed to process request." },
      { status: 500 }
    );
  }
}

// ── Simple hash for IP privacy ──────────────────────────

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString(36);
}
