/**
 * GHOST TAX — STRIPE CHECKOUT SESSION (RAIL B MONITOR)
 *
 * Creates a Stripe Checkout Session for Rail B Monitor (subscription, 2000 EUR/month).
 * mode=subscription (recurring billing).
 *
 * POST /api/stripe/checkout-monitor
 * Body: { locale?, email?, domain?, companyName?, headcount?, monthlySpendEur?, industry? }
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { RAILS, getStripePriceId } from "@/lib/pricing";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const locale = body.locale || "en";
    const email = body.email || undefined;
    const domain = typeof body.domain === "string" ? body.domain.trim() : undefined;
    const companyName = typeof body.companyName === "string" ? body.companyName.trim() : undefined;
    const headcount = typeof body.headcount === "number" ? body.headcount : undefined;
    const monthlySpendEur = typeof body.monthlySpendEur === "number" ? body.monthlySpendEur : undefined;
    const industry = typeof body.industry === "string" ? body.industry.trim() : undefined;

    const stripe = getStripe();
    const rail = RAILS.B_MONITOR;

    // Build line item — use Stripe Price ID if set, otherwise use price_data
    const priceId = getStripePriceId("B_MONITOR");
    const lineItem: Record<string, unknown> = priceId
      ? { price: priceId, quantity: 1 }
      : {
          price_data: {
            currency: rail.currency,
            unit_amount: rail.price_eur * 100,
            recurring: { interval: rail.interval },
            product_data: {
              name: locale === "fr" ? rail.name : locale === "de" ? rail.name_de : rail.name_en,
              description: locale === "fr" ? rail.description_fr : locale === "de" ? rail.description_de : rail.description,
              metadata: rail.metadata,
            },
          },
          quantity: 1,
        };

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [lineItem as never],
      success_url: `${SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}&rail=B_MONITOR`,
      cancel_url: `${SITE_URL}/cancel`,
      customer_email: email,
      metadata: {
        rail: "B_MONITOR",
        product: "monitoring",
        locale,
        ...(domain && { domain }),
        ...(companyName && { companyName }),
        ...(headcount && { headcount: String(headcount) }),
        ...(monthlySpendEur && { monthlySpendEur: String(monthlySpendEur) }),
        ...(industry && { industry }),
      },
      locale: locale === "fr" ? "fr" : locale === "de" ? "de" : "en",
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Checkout session creation failed";
    console.error("[Ghost Tax] Stripe checkout-monitor error:", message);

    return NextResponse.json(
      { error: "Unable to create subscription checkout. Please try again." },
      { status: 500 }
    );
  }
}
