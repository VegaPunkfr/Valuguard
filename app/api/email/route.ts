/**
 * GHOST TAX — TRANSACTIONAL EMAIL ROUTE
 *
 * Generic email endpoint for non-delivery transactional emails:
 * audit confirmations, vault creation notices, recovery alerts.
 *
 * NOTE: Report delivery emails are sent directly from lib/delivery.ts
 * via the Resend API. This route is for other transactional emails.
 *
 * Required env: RESEND_API_KEY
 */

import { NextRequest, NextResponse } from "next/server";

interface EmailPayload {
  to: string;
  subject: string;
  template: "audit_confirmation" | "vault_created" | "recovery_alert";
  data?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn("[Ghost Tax] RESEND_API_KEY not set. Email not sent.");
    return NextResponse.json(
      { error: "Email service not configured" },
      { status: 503 },
    );
  }

  let payload: EmailPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!payload.to || !payload.subject || !payload.template) {
    return NextResponse.json(
      { error: "Missing required fields: to, subject, template" },
      { status: 400 },
    );
  }

  // Template rendering — extend as templates are built
  const htmlBody = renderTemplate(payload.template, payload.subject, payload.data);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Ghost Tax <notifications@ghost-tax.com>",
        to: [payload.to],
        subject: payload.subject,
        html: htmlBody,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "Unknown error");
      console.error("[Ghost Tax] Resend error:", response.status, errText);
      return NextResponse.json(
        { error: "Email delivery failed" },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Ghost Tax] Email send error:", err);
    return NextResponse.json(
      { error: "Email delivery failed" },
      { status: 500 },
    );
  }
}

function renderTemplate(
  _template: string,
  subject: string,
  data?: Record<string, unknown>,
): string {
  // Minimal transactional template. Extend per template type as needed.
  const body = data?.body || subject;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:32px;background:#060912;font-family:-apple-system,sans-serif">
<div style="max-width:560px;margin:0 auto">
  <p style="font-size:10px;letter-spacing:0.15em;color:#3b82f6;text-transform:uppercase;margin:0 0 16px">GHOST TAX</p>
  <p style="font-size:14px;color:#e4e9f4;line-height:1.6">${String(body)}</p>
  <hr style="border:none;border-top:1px solid #1a1f2e;margin:24px 0">
  <p style="font-size:11px;color:#55637d">audits@ghost-tax.com</p>
</div>
</body></html>`;
}
