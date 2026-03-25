/**
 * GHOST TAX — STRIPE SERVER-SIDE CLIENT
 *
 * Singleton Stripe instance for server-side usage (API routes, webhooks).
 * Test mode by default — only uses STRIPE_SECRET_KEY from env.
 */

import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;

  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("[Ghost Tax] STRIPE_SECRET_KEY is not set.");
  }

  _stripe = new Stripe(key, {
    apiVersion: "2026-02-25.clover",
    typescript: true,
    appInfo: {
      name: "Ghost Tax",
      version: "1.0.0",
    },
  });

  return _stripe;
}
