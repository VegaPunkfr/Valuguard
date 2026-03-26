/**
 * GHOST TAX — STRIPE CHECKOUT SESSION
 *
 * Creates Stripe Checkout Sessions for:
 * - Rail A: Tiered detection (headcount-based pricing, USD or EUR)
 * - Rail B Stabilize: One-time stabilization protocol (includes detection)
 * - Rail B Monitor: Recurring subscription for continuous drift monitoring
 *
 * POST /api/stripe/checkout
 * Body: {
 *   rail?: "A" | "B_STABILIZE" | "B_MONITOR",
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
  getStripePriceId,
  type PricingLocale,
} from "@/lib/pricing";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").trim();

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
    const rail = body.rail === "B_STABILIZE" ? "B_STABILIZE" : body.rail === "B_MONITOR" ? "B_MONITOR" : "A";
    const locale: PricingLocale = body.locale === "fr" ? "fr" : body.locale === "de" ? "de" : "en";
    const rawEmail = typeof body.email === "string" ? body.email.trim() : undefined;
    const email = rawEmail && rawEmail.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(rawEmail) ? rawEmail : undefined;
    const domain = typeof body.domain === "string" ? body.domain.trim() : undefined;
    const companyName = typeof body.companyName === "string" ? body.companyName.trim() : undefined;
    const headcount = typeof body.headcount === "number" ? body.headcount : undefined;
    const monthlySpendEur = typeof body.monthlySpendEur === "number" ? body.monthlySpendEur : undefined;
    const industry = typeof body.industry === "string" ? body.industry.trim() : undefined;

    const stripe = getStripe();
    const currency = getCurrency(locale);

    let lineItem: Record<string, unknown>;
    let sessionMetadata: Record<string, string>;
    let checkoutMode: "payment" | "subscription" = "payment";
    let successUrl = `${SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`;

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
            images: [`${SITE_URL}/api/og`],
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
    } else if (rail === "B_MONITOR") {
      // ── Rail B Monitor: Recurring subscription ──
      checkoutMode = "subscription";
      successUrl = `${SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}&rail=B_MONITOR`;
      const monitor = RAILS.B_MONITOR;
      const amount = currency === "usd" ? monitor.price_usd : monitor.price_eur;

      const productName = locale === "fr" ? monitor.name
        : locale === "de" ? monitor.name_de
        : monitor.name_en;
      const productDesc = locale === "fr" ? monitor.description_fr
        : locale === "de" ? monitor.description_de
        : monitor.description;

      // Use pre-created Stripe Price ID if available, otherwise build price_data
      const stripePriceId = getStripePriceId("B_MONITOR");
      if (stripePriceId) {
        lineItem = {
          price: stripePriceId,
          quantity: 1,
        };
      } else {
        lineItem = {
          price_data: {
            currency,
            unit_amount: amount * 100,
            recurring: { interval: "month" as const },
            product_data: {
              name: productName,
              description: productDesc,
              metadata: monitor.metadata,
            },
          },
          quantity: 1,
        };
      }

      sessionMetadata = {
        rail: "B_MONITOR",
        product: "monitoring",
        locale,
        currency,
        amount: String(amount),
        ...(email && { email }),
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
            images: [`${SITE_URL}/api/og`],
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
      mode: checkoutMode,
      payment_method_types: ["card"],
      line_items: [lineItem as never],
      success_url: successUrl,
      cancel_url: `${SITE_URL}/cancel`,
      customer_email: email,
      allow_promotion_codes: true,
      metadata: sessionMetadata,
      ...(checkoutMode === "subscription" && {
        subscription_data: { metadata: sessionMetadata },
      }),
      locale: locale === "fr" ? "fr" : locale === "de" ? "de" : "en",
      custom_text: {
        submit: {
          message: locale === "fr"
            ? "Livraison sous 48h · Garantie zéro-exposition = remboursement intégral"
            : locale === "de"
              ? "Lieferung in 48h · Zero-Exposure-Garantie = volle Rückerstattung"
              : "Delivery within 48h · Zero-exposure guarantee = full refund",
        },
        after_submit: {
          message: locale === "fr"
            ? "Vous recevrez votre Decision Pack par email sous 48h."
            : locale === "de"
              ? "Sie erhalten Ihr Decision Pack innerhalb von 48h per E-Mail."
              : "You will receive your Decision Pack by email within 48h.",
        },
      },
      payment_intent_data: checkoutMode === "payment" ? {
        description: `Ghost Tax — ${rail === "A" ? "Financial Exposure Detection" : "Stabilization Protocol 30/60/90"}`,
        statement_descriptor_suffix: "GHOST TAX",
      } : undefined,
      phone_number_collection: { enabled: true },
      tax_id_collection: { enabled: true, required: "if_supported" },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Ghost Tax] Stripe checkout error:", message);

    return NextResponse.json(
      { error: "Unable to create checkout session. Please try again." },
      { status: 500 }
    );
  }
}
