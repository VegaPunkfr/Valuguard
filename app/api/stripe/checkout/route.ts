/**
 * GHOST TAX — STRIPE CHECKOUT SESSION (RAIL A ONLY)
 *
 * Creates a Stripe Checkout Session for Rail A (one-time payment, 490 EUR).
 * mode=payment (NOT subscription).
 *
 * POST /api/stripe/checkout
 * Body: { locale?, email?, domain?, companyName?, headcount?, monthlySpendEur?, industry? }
 * domain is required for delivery pipeline to trigger after payment.
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { RAILS, getStripePriceId } from "@/lib/pricing";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// ── Rate limiter (5 req/min per IP) ───────────────────
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 5;
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

export async function POST(request: NextRequest) {
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
    const locale = body.locale || "en";
    const email = body.email || undefined;
    const domain = typeof body.domain === "string" ? body.domain.trim() : undefined;
    const companyName = typeof body.companyName === "string" ? body.companyName.trim() : undefined;
    const headcount = typeof body.headcount === "number" ? body.headcount : undefined;
    const monthlySpendEur = typeof body.monthlySpendEur === "number" ? body.monthlySpendEur : undefined;
    const industry = typeof body.industry === "string" ? body.industry.trim() : undefined;

    const stripe = getStripe();

    // Build line item — use Stripe Price ID if set, otherwise use price_data
    const priceId = getStripePriceId();
    const lineItem: Record<string, unknown> = priceId
      ? { price: priceId, quantity: 1 }
      : {
          price_data: {
            currency: RAILS.A.currency,
            unit_amount: RAILS.A.price_eur * 100, // cents
            product_data: {
              name: locale === "fr" ? RAILS.A.name : locale === "de" ? RAILS.A.name_de : RAILS.A.name_en,
              description: locale === "fr" ? RAILS.A.description_fr : locale === "de" ? RAILS.A.description_de : RAILS.A.description,
              metadata: RAILS.A.metadata,
            },
          },
          quantity: 1,
        };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [lineItem as never],
      success_url: `${SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/cancel`,
      customer_email: email,
      metadata: {
        rail: "A",
        product: "detection",
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
    console.error("[Ghost Tax] Stripe checkout error:", message);

    if (message.includes("STRIPE_SECRET_KEY")) {
      return NextResponse.json(
        { error: "Payment system not configured. Please contact support." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Unable to create checkout session. Please try again." },
      { status: 500 }
    );
  }
}
