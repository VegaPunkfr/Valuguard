/**
 * GHOST TAX — CONTACT FORM API
 *
 * POST /api/contact
 * Receives contact form submissions for Rail B/C inquiries.
 * Sends notification email via Resend and stores lead.
 *
 * SECURITY:
 *   - Rate limited: 3 requests per IP per minute
 *   - Input validated: name, email required, length limits
 *   - HTML escaped in email template (XSS prevention)
 */

import { NextRequest, NextResponse } from "next/server";

const RESEND_KEY = process.env.RESEND_API_KEY;
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || "audits@ghost-tax.com";

// ── Rate limiter ──────────────────────────────────────
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 3;
const rateMap = new Map<string, { count: number; resetAt: number }>();

function checkRate(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (entry && now > entry.resetAt) rateMap.delete(ip);
  const current = rateMap.get(ip);
  if (!current) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (current.count >= RATE_MAX) return false;
  current.count++;
  return true;
}

// ── HTML escape to prevent XSS in email templates ─────
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  if (!checkRate(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { name, email, company, size, message } = body;

    // Validation
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Name is required (min 2 characters)." }, { status: 400 });
    }
    if (!email || typeof email !== "string" || !email.includes("@") || !email.includes(".")) {
      return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
    }
    if (name.length > 200 || email.length > 254) {
      return NextResponse.json({ error: "Input exceeds maximum length." }, { status: 400 });
    }
    if (typeof message === "string" && message.length > 5000) {
      return NextResponse.json({ error: "Message exceeds maximum length (5000 chars)." }, { status: 400 });
    }

    // Sanitize all values
    const safeName = escapeHtml(name.trim().slice(0, 200));
    const safeEmail = escapeHtml(email.trim().slice(0, 254));
    const safeCompany = escapeHtml(typeof company === "string" ? company.trim().slice(0, 200) : "N/A");
    const safeSize = escapeHtml(typeof size === "string" ? size.trim().slice(0, 50) : "N/A");
    const safeMessage = escapeHtml(typeof message === "string" ? message.trim().slice(0, 5000) : "No message provided.");

    // Send notification email via Resend
    if (RESEND_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Ghost Tax <noreply@ghost-tax.com>",
          to: [NOTIFY_EMAIL],
          subject: `[Lead] ${safeCompany} — Contact Form`,
          html: `
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> ${safeName}</p>
            <p><strong>Email:</strong> ${safeEmail}</p>
            <p><strong>Company:</strong> ${safeCompany}</p>
            <p><strong>Size:</strong> ${safeSize}</p>
            <p><strong>Message:</strong></p>
            <p>${safeMessage}</p>
            <hr>
            <p style="color:#888;font-size:12px;">Sent via Ghost Tax contact form</p>
          `,
        }),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[Ghost Tax] Contact form error:", err);
    return NextResponse.json({ error: "Failed to process contact form." }, { status: 500 });
  }
}
