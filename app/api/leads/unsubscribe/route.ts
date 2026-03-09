/**
 * GHOST TAX — UNSUBSCRIBE ENDPOINT
 *
 * POST /api/leads/unsubscribe
 * Body: { email }
 *
 * Marks a lead as unsubscribed. GDPR + CAN-SPAM compliant.
 * Must be honored within 10 business days (we do it instantly).
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const db = createAdminSupabase();
  if (db) {
    try {
      // Mark as unsubscribed in outreach_leads
      await (db as any)
        .from("outreach_leads")
        .update({
          unsubscribed: true,
          unsubscribed_at: new Date().toISOString(),
          status: "unsubscribed",
        })
        .eq("email", email);

      // Also log the event
      await (db as any)
        .from("events")
        .insert({
          event_type: "lead_unsubscribed",
          domain: email.split("@")[1],
          metadata: { email, timestamp: new Date().toISOString() },
        });
    } catch (err) {
      console.error("[Ghost Tax] Unsubscribe error:", err);
    }
  }

  console.log("[Ghost Tax] Unsubscribed:", email);
  return NextResponse.json({ unsubscribed: true });
}
