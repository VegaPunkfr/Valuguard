/**
 * GHOST TAX — STRIPE CHECKOUT SESSION
 *
 * Creates Stripe Checkout Sessions for:
 * - Rail A: Tiered detection (headcount-based pricing, USD or EUR)
 * - Rail B Stabilize: One-time stabilization protocol (includes detection)
 *
 * POST /api/stripe/checkout
 * Body: {
 *   rail?: "A" | "B_STABILIZE",
 *   locale?, email?, domain?, companyName?, headcount?, monthlySpendEur?, industry?
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import {
  RAILS,
  getRailAPrice,
  getCurrency,
  getHeadcountTier,
  type PricingLocale,
} from "@/lib/pricing";

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
    const rail = body.rail === "B_STABILIZE" ? "B_STABILIZE" : "A";
    const locale: PricingLocale = body.locale === "fr" ? "fr" : body.locale === "de" ? "de" : "en";
    const email = body.email || undefined;
    const domain = typeof body.domain === "string" ? body.domain.trim() : undefined;
    const companyName = typeof body.companyName === "string" ? body.companyName.trim() : undefined;
    const headcount = typeof body.headcount === "number" ? body.headcount : undefined;
    const monthlySpendEur = typeof body.monthlySpendEur === "number" ? body.monthlySpendEur : undefined;
    const industry = typeof body.industry === "string" ? body.industry.trim() : undefined;

    const stripe = getStripe();
    const currency = getCurrency(locale);

    let lineItem: Record<string, unknown>;
    let sessionMetadata: Record<string, string>;

    if (rail === "A") {
      // ── Rail A: Tiered pricing by headcount ──
      const tier = getHeadcountTier(headcount);
      const amount = getRailAPrice(headcount, locale);
      const railConfig = RAILS.A;

      const productName = locale === "fr" ? railConfig.name
        : locale === "de" ? railConfig.name_de
        : railConfig.name_en;
      const productDesc = locale === "fr" ? railConfig.description_fr
        : locale === "de" ? railConfig.description_de
        : railConfig.description;

      lineItem = {
        price_data: {
          currency,
          unit_amount: amount * 100,
          product_data: {
            name: productName,
            description: productDesc,
            metadata: { ...railConfig.metadata, tier },
          },
        },
        quantity: 1,
      };

      sessionMetadata = {
        rail: "A",
        product: "detection",
        tier,
        locale,
        currency,
        amount: String(amount),
        ...(domain && { domain }),
        ...(companyName && { companyName }),
        ...(headcount && { headcount: String(headcount) }),
        ...(monthlySpendEur && { monthlySpendEur: String(monthlySpendEur) }),
        ...(industry && { industry }),
      };
    } else {
      // ── Rail B Stabilize: Fixed price, includes detection ──
      const stabilize = RAILS.B_STABILIZE;
      const amount = currency === "usd" ? stabilize.price_usd : stabilize.price_eur;

      const productName = locale === "fr" ? stabilize.name
        : locale === "de" ? stabilize.name_de
        : stabilize.name_en;
      const productDesc = locale === "fr" ? stabilize.description_fr
        : locale === "de" ? stabilize.description_de
        : stabilize.description;

      lineItem = {
        price_data: {
          currency,
          unit_amount: amount * 100,
          product_data: {
            name: productName,
            description: productDesc,
            metadata: stabilize.metadata,
          },
        },
        quantity: 1,
      };

      sessionMetadata = {
        rail: "B_STABILIZE",
        product: "stabilization",
        locale,
        currency,
        amount: String(amount),
        includes_detection: "true",
        ...(domain && { domain }),
        ...(companyName && { companyName }),
        ...(headcount && { headcount: String(headcount) }),
        ...(monthlySpendEur && { monthlySpendEur: String(monthlySpendEur) }),
        ...(industry && { industry }),
      };
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [lineItem as never],
      success_url: `${SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/cancel`,
      customer_email: email,
      metadata: sessionMetadata,
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
