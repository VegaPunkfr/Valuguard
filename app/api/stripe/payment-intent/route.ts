/**
 * GHOST TAX — STRIPE PAYMENT INTENT
 *
 * Creates a PaymentIntent for the custom checkout page.
 * Supports promo code validation (HUNT100 = 40% off).
 *
 * POST /api/stripe/payment-intent
 * Body: { rail, locale, email, domain, companyName, headcount, promoCode? }
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import {
  getRailAPrice,
  getCurrency,
  getHeadcountTier,
  RAILS,
  type PricingLocale,
} from "@/lib/pricing";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// Rate limiter (5 req/min per IP)
const RATE_WINDOW_MS = 60_000;
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
    const locale: PricingLocale =
      body.locale === "fr" ? "fr" : body.locale === "de" ? "de" : "en";
    const rawEmail =
      typeof body.email === "string" ? body.email.trim() : undefined;
    const email =
      rawEmail &&
      rawEmail.length <= 254 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(rawEmail)
        ? rawEmail
        : undefined;
    const domain =
      typeof body.domain === "string" ? body.domain.trim() : undefined;
    const companyName =
      typeof body.companyName === "string" ? body.companyName.trim() : undefined;
    const headcount =
      typeof body.headcount === "number" ? body.headcount : undefined;
    const promoCode =
      typeof body.promoCode === "string"
        ? body.promoCode.trim().toUpperCase()
        : undefined;

    const stripe = getStripe();
    const currency = getCurrency(locale);

    // Calculate base amount
    let baseAmount: number;
    let productName: string;

    if (rail === "A") {
      baseAmount = getRailAPrice(headcount, locale);
      productName =
        locale === "fr"
          ? RAILS.A.name
          : locale === "de"
            ? RAILS.A.name_de
            : RAILS.A.name_en;
    } else {
      baseAmount =
        currency === "usd"
          ? RAILS.B_STABILIZE.price_usd
          : RAILS.B_STABILIZE.price_eur;
      productName =
        locale === "fr"
          ? RAILS.B_STABILIZE.name
          : locale === "de"
            ? RAILS.B_STABILIZE.name_de
            : RAILS.B_STABILIZE.name_en;
    }

    // Validate promo code
    let discount = 0;
    let appliedPromo: string | null = null;

    if (promoCode) {
      try {
        // Use older API version for promo code lookup (coupon field moved in clover)
        const Stripe = (await import("stripe")).default;
        const stripeCompat = new Stripe(process.env.STRIPE_SECRET_KEY!, {
          apiVersion: "2024-12-18.acacia" as never,
        });

        const promos = await stripeCompat.promotionCodes.list({
          code: promoCode,
          active: true,
          limit: 1,
        });

        if (promos.data.length > 0) {
          const promo = promos.data[0] as unknown as Record<string, unknown>;
          const couponRef = promo.coupon as { id: string; percent_off?: number; amount_off?: number; redeem_by?: number; max_redemptions?: number; times_redeemed?: number } | string;
          const couponId = typeof couponRef === "string" ? couponRef : couponRef.id;
          const coupon = await stripeCompat.coupons.retrieve(couponId) as unknown as Record<string, unknown>;

          // Check expiry
          if (coupon.redeem_by && (coupon.redeem_by as number) < Math.floor(Date.now() / 1000)) {
            return NextResponse.json(
              { error: "Promo code has expired.", code: "PROMO_EXPIRED" },
              { status: 400 }
            );
          }

          // Check max redemptions
          if (
            coupon.max_redemptions &&
            (coupon.times_redeemed as number) >= (coupon.max_redemptions as number)
          ) {
            return NextResponse.json(
              { error: "Promo code is no longer available.", code: "PROMO_MAXED" },
              { status: 400 }
            );
          }

          if (coupon.percent_off) {
            discount = Math.round(baseAmount * ((coupon.percent_off as number) / 100));
            appliedPromo = promoCode;
          } else if (coupon.amount_off) {
            discount = (coupon.amount_off as number) / 100;
            appliedPromo = promoCode;
          }
        } else {
          return NextResponse.json(
            { error: "Invalid promo code.", code: "PROMO_INVALID" },
            { status: 400 }
          );
        }
      } catch {
        // Promo validation failed — continue without discount
      }
    }

    const finalAmount = baseAmount - discount;
    const tier = getHeadcountTier(headcount);

    const metadata: Record<string, string> = {
      rail,
      product: rail === "A" ? "detection" : "stabilization",
      tier,
      locale,
      currency,
      amount_base: String(baseAmount),
      amount_final: String(finalAmount),
      ...(discount > 0 && { discount: String(discount), promo: appliedPromo! }),
      ...(domain && { domain }),
      ...(companyName && { companyName }),
      ...(headcount && { headcount: String(headcount) }),
      ...(email && { email }),
    };

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: finalAmount * 100,
      currency,
      metadata,
      receipt_email: email,
      description: `${productName} — Ghost Tax`,
      statement_descriptor_suffix: "GHOST TAX",
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      amount: finalAmount,
      baseAmount,
      discount,
      appliedPromo,
      currency,
      productName,
      rail,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Ghost Tax] Payment intent error:", message);
    return NextResponse.json(
      { error: "Unable to initialize payment. Please try again." },
      { status: 500 }
    );
  }
}
