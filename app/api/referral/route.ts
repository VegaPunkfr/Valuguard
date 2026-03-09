/**
 * GHOST TAX — REFERRAL API
 *
 * GET  /api/referral?code=XXX  → Returns referral info (is code valid, how many referred)
 * POST /api/referral           → Tracks a new referral { referrerCode, email }
 *
 * Server-only. No auth required (referral codes are the access mechanism).
 */

import { NextRequest, NextResponse } from "next/server";
import { getReferralInfo, trackReferral } from "@/lib/referral";

// ── GET — Referral Code Lookup ─────────────────────────

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code || code.length < 4 || code.length > 16) {
    return NextResponse.json(
      { error: "Missing or invalid referral code." },
      { status: 400 }
    );
  }

  try {
    const info = await getReferralInfo(code);

    if (!info.valid) {
      return NextResponse.json(
        { error: "Referral code not found." },
        { status: 404 }
      );
    }

    // Mask email for privacy: show only first 2 chars + domain
    const maskedEmail = info.referrerEmail
      ? maskEmail(info.referrerEmail)
      : undefined;

    return NextResponse.json({
      valid: true,
      referrer: maskedEmail,
      totalReferred: info.totalReferred,
    });
  } catch (err: unknown) {
    console.error("[Ghost Tax] GET /api/referral error:", err);
    return NextResponse.json(
      { error: "Failed to look up referral code." },
      { status: 500 }
    );
  }
}

// ── POST — Track Referral ──────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { referrerCode, email } = body;

    if (!referrerCode || typeof referrerCode !== "string") {
      return NextResponse.json(
        { error: "referrerCode is required." },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "A valid email is required." },
        { status: 400 }
      );
    }

    const result = await trackReferral(referrerCode, email);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: 409 } // Conflict for duplicate/self-referral, or 400 for invalid code
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[Ghost Tax] POST /api/referral error:", err);
    return NextResponse.json(
      { error: "Failed to process referral." },
      { status: 500 }
    );
  }
}

// ── Helpers ────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}
