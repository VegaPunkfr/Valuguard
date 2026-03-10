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

// Periodic cleanup to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, 60_000);

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

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Try again in a minute." },
        { status: 429 }
      );
    }

    // Parse body
    const body = await request.json().catch(() => ({}));
    const { email, domain, company, headcount, industry, source, meta } = body;

    // Validate required field
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const leadSource = source || "unknown";

    // Save to Supabase
    const supabase = createAdminSupabase();

    if (supabase) {
      const now = new Date();
      const { error } = await (supabase as any).from("outreach_leads").upsert(
        {
          email: cleanEmail,
          domain: domain || cleanEmail.split("@")[1] || null,
          company: company || null,
          headcount: headcount ? parseInt(headcount, 10) || null : null,
          industry: industry || null,
          source: leadSource,
          locale: "fr",
          meta: meta || null,
          ip_hash: simpleHash(ip),
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
        company,
        industry,
      });
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
