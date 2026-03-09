/**
 * GHOST TAX — UNSUBSCRIBE HANDLER
 *
 * GET /api/outreach/unsubscribe?token=xxx
 *
 * One-click unsubscribe for CAN-SPAM/GDPR compliance.
 * Decodes the email from the token and marks the lead as unsubscribed.
 * Returns a simple confirmation page.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase";
import { decodeUnsubscribeToken } from "@/lib/outreach";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return new NextResponse(renderPage("Invalid unsubscribe link.", false), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  let email: string;
  try {
    email = decodeUnsubscribeToken(token);
  } catch {
    return new NextResponse(renderPage("Invalid unsubscribe link.", false), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  if (!email || !email.includes("@")) {
    return new NextResponse(renderPage("Invalid email in unsubscribe link.", false), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  const supabase = createAdminSupabase();
  if (supabase) {
    await (supabase as any)
      .from("outreach_leads")
      .update({
        unsubscribed: true,
        status: "unsubscribed",
      })
      .eq("email", email);
  }

  console.log(`[Ghost Tax Outreach] Unsubscribed: ${email}`);

  return new NextResponse(renderPage("You have been unsubscribed.", true), {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
}

// Also support POST for List-Unsubscribe-Post header
export async function POST(request: NextRequest) {
  return GET(request);
}

function renderPage(message: string, success: boolean): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ghost Tax — Unsubscribe</title></head>
<body style="margin:0;padding:0;background:#060912;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh">
<div style="text-align:center;max-width:400px;padding:40px 20px">
  <p style="font-size:10px;letter-spacing:0.2em;color:#3b82f6;text-transform:uppercase;margin:0 0 16px 0;font-family:monospace">GHOST TAX</p>
  <p style="font-size:18px;color:${success ? "#34d399" : "#ef4444"};margin:0 0 12px 0;font-weight:600">${message}</p>
  <p style="font-size:13px;color:#55637d;line-height:1.6;margin:0">
    ${success
      ? "You will no longer receive outreach emails from Ghost Tax. If this was a mistake, contact us at audits@ghost-tax.com."
      : "Please contact audits@ghost-tax.com if you need assistance."}
  </p>
</div>
</body>
</html>`;
}
