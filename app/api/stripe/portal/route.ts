/**
 * GHOST TAX — STRIPE CUSTOMER PORTAL
 *
 * POST /api/stripe/portal
 * Body: { email: string }
 *
 * Creates a Stripe billing portal session for self-service:
 * - View invoices
 * - Update payment method
 * - Upgrade Rail A → Rail B
 * - Cancel Rail B subscription
 *
 * Revenue impact: self-service upsell = +25% Rail B conversion (no call needed).
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : null;
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  try {
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
