/**
 * VALUGUARD — AUDIT REPORT CHECKOUT (POST /api/audit/checkout)
 *
 * Crée une session Stripe Checkout directement depuis le rapport d'audit.
 * Le bouton "Initialiser le Protocole" dans AuditReportClient appelle cette route.
 *
 * Body: { domain: string }
 * Response: { url: string } (Stripe Checkout URL)
 *
 * Metadata injectée dans la session Stripe :
 *   - auditId (domain)
 *   - source: "audit_report"
 *   - rail: "A"
 *   - tvar: totalValueAtRisk
 *
 * Le webhook Stripe lit ces metadata pour :
 *   1. Déclencher la delivery pipeline (Rail A standard)
 *   2. Mettre à jour osint_prospects.status → PAID
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { RAILS, RAIL_A_PRICE } from "@/lib/pricing";
import { loadAuditResult } from "@/lib/db/osint-storage";
import { calculateShadowCost } from "@/lib/engines/shadow-cost";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// ── Rate limiter (3 req/min per IP — plus strict que checkout standard) ──
const RATE_WINDOW_MS = 60_000;
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

export async function POST(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  if (!checkRate(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const rawDomain = typeof body.domain === "string" ? body.domain.trim() : "";
    const domain = rawDomain
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "")
      .toLowerCase();

    if (!domain || !domain.includes(".") || domain.length < 3 || domain.length > 253) {
      return NextResponse.json(
        { error: "Invalid domain." },
        { status: 400 },
      );
    }

    // ── Load audit to verify it exists + extract TVAR + email ──
    const stored = await loadAuditResult(domain);
    if (!stored || !stored.infrastructure) {
      return NextResponse.json(
        { error: "Audit not found for this domain." },
        { status: 404 },
      );
    }

    // Decision-maker email for Stripe pre-fill
    const customerEmail = stored.decisionMaker?.email ?? undefined;

    // Compute TVAR for metadata (lightweight, pure compute)
    let tvarValue = 0;
    try {
      const shadowBill = await calculateShadowCost(stored.infrastructure);
      tvarValue = shadowBill.tvar.totalValueAtRisk;
    } catch {
      // Non-fatal: TVAR in metadata is optional
    }

    // ── Create Stripe Checkout Session ──
    const stripe = getStripe();
    const amount = RAIL_A_PRICE.eur;
    const railConfig = RAILS.A;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: amount * 100,
            product_data: {
              name: railConfig.name,
              description: railConfig.description_fr,
              metadata: { ...railConfig.metadata },
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}&source=audit`,
      cancel_url: `${SITE_URL}/audit/${encodeURIComponent(domain)}`,
      ...(customerEmail && { customer_email: customerEmail }),
      metadata: {
        rail: "A",
        product: "detection",
        source: "audit_report",
        auditId: domain,
        domain,
        locale: "fr",
        currency: "eur",
        amount: String(amount),
        tvar: String(Math.round(tvarValue)),
      },
      locale: "fr",
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Audit Checkout] Stripe error:", message);
    return NextResponse.json(
      { error: "Unable to create checkout session. Please try again." },
      { status: 500 },
    );
  }
}
