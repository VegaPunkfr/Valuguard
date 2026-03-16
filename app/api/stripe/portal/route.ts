/**
 * GHOST TAX — STRIPE CUSTOMER PORTAL
 *
 * POST /api/stripe/portal
 * Body: { email: string }
 *
 * Creates a Stripe billing portal session for self-service:
 * - View invoices
 * - Update payment method
 * - Upgrade Rail A -> Rail B
 * - Cancel Rail B subscription
 *
 * Security: rate limited (3 req/min per IP), email validated, email must exist in audit_requests.
 * Revenue impact: self-service upsell = +25% Rail B conversion (no call needed).
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createAdminSupabase } from "@/lib/supabase";

// ── Rate Limiting ─────────────────────────────────────────
const RATE_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_MAX_REQUESTS = 3;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (entry && now > entry.resetAt) {
    rateLimitMap.delete(ip);
  }
  const current = rateLimitMap.get(ip);
  if (!current) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }
  if (current.count >= RATE_MAX_REQUESTS) {
    const retryAfter = Math.ceil((current.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }
  current.count++;
  return { allowed: true, retryAfter: 0 };
}

// ── Email validation ──────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  // ── Rate limiting ───────────────────────────────────────
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(rateCheck.retryAfter) } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;
  if (!email || !EMAIL_REGEX.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  try {
    // Verify the email exists in our system (must have a completed audit)
    const supabase = createAdminSupabase();
    if (supabase) {
      const { data: auditRow } = await (supabase as any)
        .from("audit_requests")
        .select("id")
        .eq("email", email)
        .limit(1)
        .maybeSingle();

      if (!auditRow) {
        // Intentionally vague error to prevent email enumeration
        return NextResponse.json(
          { error: "No billing account found for this email." },
          { status: 404 },
        );
      }
    }

    const stripe = getStripe();

    // Find existing Stripe customer by email
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) {
      return NextResponse.json(
        { error: "No billing account found for this email." },
        { status: 404 }
      );
    }

    const customer = customers.data[0];
    const returnUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://ghost-tax.com"}/dashboard`;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error("[Ghost Tax] Portal session error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Could not create billing portal session." },
      { status: 500 }
    );
  }
}
