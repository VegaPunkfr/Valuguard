/**
 * GHOST TAX — POST /api/vault/persist
 *
 * Receives the Ghost Tax diagnostic snapshot when a prospect
 * clicks "RECLAIM $XXk NOW" and submits their email.
 *
 * FLOW:
 *   Browser (stealth cache) → this route → vault_sessions table
 *
 * SECURITY:
 *   - Rate limited: 5 requests per IP per 10 minutes (in-memory)
 *   - Input validated: email format, company name length, numeric ranges
 *   - Admin client used for INSERT (RLS allows public insert, but admin
 *     gives us the audit trail event insert without auth context)
 *   - No auth required (this is a public lead capture endpoint)
 *   - Request body size implicitly limited by Vercel (4.5 MB default)
 *
 * RESPONSES:
 *   200 — Success, returns { id, status: "captured" }
 *   400 — Validation error, returns { error, field? }
 *   429 — Rate limited, returns { error, retryAfter }
 *   500 — Server error, returns { error } (no internals leaked)
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase";

// ═══════════════════════════════════════════════════════════════
// RATE LIMITER (in-memory, per-IP, no external dependency)
// ═══════════════════════════════════════════════════════════════
//
// V1: Simple sliding window in a Map. Survives hot reloads on Vercel
// but resets on cold start (acceptable for V1 — real abuse protection
// comes from Vercel's built-in WAF + Cloudflare in front).
//
// V2: Replace with Upstash Redis for distributed rate limiting.

const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_MAX_REQUESTS = 5;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  // Clean expired entry
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

  current.count += 1;
  return { allowed: true, retryAfter: 0 };
}

// Periodic cleanup to prevent memory leak (runs every 60s equiv via lazy check)
function cleanupRateLimitMap(): void {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// INPUT VALIDATION
// ═══════════════════════════════════════════════════════════════

interface ValidationResult {
  valid: boolean;
  error?: string;
  field?: string;
}

function validatePayload(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  const data = body as Record<string, unknown>;

  // Email: required, must contain @ and .
  const email = data.email;
  if (typeof email !== "string" || !email.includes("@") || !email.includes(".")) {
    return { valid: false, error: "Valid work email is required", field: "email" };
  }
  if (email.length > 254) {
    return { valid: false, error: "Email exceeds maximum length", field: "email" };
  }

  // Company name: required, 2-200 chars
  const company = data.company_name;
  if (typeof company !== "string" || company.trim().length < 2) {
    return { valid: false, error: "Company name is required (min 2 characters)", field: "company_name" };
  }
  if (company.length > 200) {
    return { valid: false, error: "Company name exceeds maximum length", field: "company_name" };
  }

  // Numeric fields: if present, must be finite numbers within sane ranges
  const numericChecks: [string, number, number][] = [
    ["ghost_tax_annual", -1, 100_000_000],
    ["ghost_tax_low", -1, 100_000_000],
    ["ghost_tax_high", -1, 100_000_000],
    ["entropy_score", -1, 101],
    ["entropy_kappa", -0.01, 1],
    ["peer_percentile", -1, 101],
    ["audit_roi", -100, 10_000],
    ["recoverable_annual", -1, 100_000_000],
    ["headcount", 0, 100_000],
    ["saas_tool_count", 0, 10_000],
    ["monthly_spend_saas", -1, 50_000_000],
    ["monthly_spend_cloud", -1, 50_000_000],
    ["monthly_spend_ai", -1, 50_000_000],
    ["monthly_spend_total", -1, 100_000_000],
  ];

  for (const [field, min, max] of numericChecks) {
    const val = data[field];
    if (val !== null && val !== undefined) {
      if (typeof val !== "number" || !isFinite(val)) {
        return { valid: false, error: `${field} must be a finite number`, field };
      }
      if (val < min || val > max) {
        return { valid: false, error: `${field} out of acceptable range`, field };
      }
    }
  }

  // session_data: must be an object if present
  if (data.session_data !== undefined && data.session_data !== null) {
    if (typeof data.session_data !== "object") {
      return { valid: false, error: "session_data must be a JSON object", field: "session_data" };
    }
  }

  return { valid: true };
}

// ═══════════════════════════════════════════════════════════════
// SANITIZERS
// ═══════════════════════════════════════════════════════════════

function sanitizeString(val: unknown, maxLen: number): string | null {
  if (typeof val !== "string") return null;
  return val.trim().slice(0, maxLen) || null;
}

function sanitizeNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number" && isFinite(val)) return val;
  return null;
}

// ═══════════════════════════════════════════════════════════════
// ROUTE HANDLER
// ═══════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  // ── Rate limiting ──────────────────────────────────────────
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";

  // Lazy cleanup on every request (cheap, < 1ms)
  if (rateLimitMap.size > 1000) {
    cleanupRateLimitMap();
  }

  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later.", retryAfter: rateCheck.retryAfter },
      {
        status: 429,
        headers: { "Retry-After": String(rateCheck.retryAfter) },
      }
    );
  }

  // ── Parse body ─────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  // ── Validate ───────────────────────────────────────────────
  const validation = validatePayload(body);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error, field: validation.field },
      { status: 400 }
    );
  }

  const data = body as Record<string, unknown>;

  // ── Sanitize & build row ───────────────────────────────────
  const row = {
    email: (data.email as string).trim().toLowerCase(),
    company_name: (data.company_name as string).trim(),
    contact_name: sanitizeString(data.contact_name, 200),
    ghost_tax_annual: sanitizeNumber(data.ghost_tax_annual),
    ghost_tax_low: sanitizeNumber(data.ghost_tax_low),
    ghost_tax_high: sanitizeNumber(data.ghost_tax_high),
    entropy_score: sanitizeNumber(data.entropy_score),
    entropy_kappa: sanitizeNumber(data.entropy_kappa),
    peer_percentile: sanitizeNumber(data.peer_percentile),
    audit_roi: sanitizeNumber(data.audit_roi),
    recoverable_annual: sanitizeNumber(data.recoverable_annual),
    headcount: sanitizeNumber(data.headcount),
    industry: sanitizeString(data.industry, 100),
    saas_tool_count: sanitizeNumber(data.saas_tool_count),
    monthly_spend_saas: sanitizeNumber(data.monthly_spend_saas),
    monthly_spend_cloud: sanitizeNumber(data.monthly_spend_cloud),
    monthly_spend_ai: sanitizeNumber(data.monthly_spend_ai),
    monthly_spend_total: sanitizeNumber(data.monthly_spend_total),
    currency: "USD",
    country: "US",
    session_data: (data.session_data as Record<string, unknown>) || {},
    source: sanitizeString(data.source, 100) || "cockpit-cta",
    utm_source: sanitizeString(data.utm_source, 200),
    utm_medium: sanitizeString(data.utm_medium, 200),
    utm_campaign: sanitizeString(data.utm_campaign, 200),
    locale: sanitizeString(data.locale, 10) || "en-us",
    status: "pending",
  };

  // ── Insert into vault_sessions ─────────────────────────────
  try {
    const supabase = createAdminSupabase();

    if (!supabase) {
      console.warn("[vault/persist] Supabase not configured. Data not saved.");
      return NextResponse.json(
        { id: "demo-" + Date.now().toString(36), status: "captured", message: "Demo mode — Supabase not configured." },
        { status: 200 }
      );
    }

    const { data: inserted, error: insertError } = await (supabase as any)
      .from("vault_sessions")
      .insert(row)
      .select("id")
      .single();

    if (insertError) {
      console.error("[vault/persist] Insert failed:", insertError.message);
      return NextResponse.json(
        { error: "Failed to save diagnostic data. Please try again." },
        { status: 500 }
      );
    }

    // ── Log audit trail event ────────────────────────────────
    await (supabase as any).from("events").insert({
      event_name: "vault_session_created",
      properties: {
        vault_session_id: inserted?.id,
        email: row.email,
        ghost_tax_annual: row.ghost_tax_annual,
        entropy_score: row.entropy_score,
        peer_percentile: row.peer_percentile,
        source: row.source,
        ip_hash: simpleHash(ip),
      },
    });

    // ── Auto-enroll in drip sequence ──────────────────────────
    // Insert into outreach_leads so the cron-triggered drip sequence picks them up
    const now = new Date();
    const nextSend = now.toISOString(); // Touch 1 sends immediately via drip cron
    await (supabase as any).from("outreach_leads").upsert(
      {
        email: row.email,
        company: row.company_name,
        domain: row.email.split("@")[1] || null,
        headcount: row.headcount,
        industry: row.industry,
        locale: row.locale || "en",
        source: row.source || "vault-persist",
        status: "active",
        drip_step: 0, // Start at 0 so Touch 1 email fires on next cron run
        next_send_at: nextSend,
        unsubscribed: false,
        converted: false,
      },
      { onConflict: "email" },
    ).then(() => {
      console.log("[vault/persist] Lead auto-enrolled in drip:", row.email);
    }).catch((err: any) => {
      console.warn("[vault/persist] Drip enrollment failed (non-fatal):", err?.message);
    });

    // ── Success ──────────────────────────────────────────────
    return NextResponse.json(
      {
        id: inserted?.id,
        status: "captured",
        message: "Diagnostic data secured. Your scan results are ready — check your email for the full analysis.",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[vault/persist] Unexpected error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Simple non-reversible hash for IP addresses in audit logs.
 * We log a hash (not raw IP) to comply with data minimization
 * while still being able to correlate abuse patterns.
 */
function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return "h_" + Math.abs(hash).toString(36);
}

// ── Reject non-POST methods ──────────────────────────────────

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405 }
  );
}
