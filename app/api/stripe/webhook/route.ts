/**
 * Ghost Tax — STRIPE WEBHOOK HANDLER
 *
 * Receives Stripe webhook events for payment processing.
 * Validates the webhook signature and routes to event handlers.
 *
 * Handles:
 *   - checkout.session.completed (Rail A delivery + Rail B Monitor activation)
 *   - customer.subscription.created (Rail B Monitor tracking)
 *   - customer.subscription.deleted (monitoring cancellation)
 *   - payment_intent.payment_failed (logging)
 *
 * Required env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { executeDeliveryPipeline } from "@/lib/delivery";
import { createAdminSupabase } from "@/lib/supabase";
import { scheduleRetry, type WebhookRetryPayload } from "@/lib/webhook-retry";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  // Stripe REQUIRES non-200 for signature failures so it knows to retry.
  // These early returns are correct per Stripe webhook best practices:
  // - Missing secret / missing signature / invalid signature = reject with 400
  // - Stripe will NOT retry events that get 400 (invalid), only 5xx.
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[Ghost Tax] STRIPE_WEBHOOK_SECRET not set.");
    return NextResponse.json({ received: false }, { status: 400 });
  }

  if (!signature) {
    return NextResponse.json({ received: false }, { status: 400 });
  }

  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Signature verification failed";
    console.error("[Ghost Tax] Webhook signature error:", message);
    return NextResponse.json({ received: false }, { status: 400 });
  }

  const db = createAdminSupabase();

  // Route events
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const meta = session.metadata || {};
      console.log("[Ghost Tax] Payment successful:", {
        id: session.id,
        email: session.customer_email,
        amount: session.amount_total,
        rail: meta.rail,
        domain: meta.domain || "(missing)",
      });

      // Rail A: trigger full delivery pipeline (with retry on failure)
      if (meta.rail === "A" && session.customer_email && meta.domain) {
        const retryPayload: WebhookRetryPayload = {
          eventType: event.type,
          stripePaymentIntentId: session.id,
          email: session.customer_email,
          sessionId: session.id,
          metadata: { ...meta },
        };

        const deliveryPromise = executeDeliveryPipeline({
          stripeSessionId: session.id,
          email: session.customer_email,
          domain: meta.domain,
          companyName: meta.companyName || undefined,
          locale: (meta.locale as "en" | "fr" | "de") || "en",
          headcount: meta.headcount ? parseInt(meta.headcount, 10) : undefined,
          monthlySpendEur: meta.monthlySpendEur ? parseFloat(meta.monthlySpendEur) : undefined,
          industry: meta.industry || undefined,
        }).then((result) => {
          if (result.success) {
            console.log("[Ghost Tax] Delivery complete:", result.runId);
          } else {
            console.error("[Ghost Tax] Delivery failed:", result.error);
            // Enqueue for retry
            return scheduleRetry(
              `delivery_${session.id}`,
              retryPayload,
              1,
              result.error || "Pipeline returned failure",
            );
          }
        }).catch((err) => {
          const msg = err instanceof Error ? err.message : "Delivery pipeline error";
          console.error("[Ghost Tax] Delivery exception:", msg);
          // Enqueue for retry
          return scheduleRetry(`delivery_${session.id}`, retryPayload, 1, msg);
        });

        const ctx = (globalThis as any)[Symbol.for("next.request.context")]
          ?? (request as any).waitUntil
          ?? null;

        if (ctx?.waitUntil) {
          ctx.waitUntil(deliveryPromise);
        } else {
          await deliveryPromise;
        }
      }

      // Rail B Monitor: log subscription checkout
      if (meta.rail === "B_MONITOR" && session.customer_email) {
        console.log("[Ghost Tax] Rail B Monitor checkout completed:", {
          email: session.customer_email,
          domain: meta.domain,
        });
      }

      if (!meta.domain) {
        console.warn("[Ghost Tax] No domain in session metadata — delivery skipped. Session:", session.id);
      }
      break;
    }

    case "customer.subscription.created": {
      const subscription = event.data.object;
      const meta = subscription.metadata || {};
      console.log("[Ghost Tax] Subscription created:", {
        id: subscription.id,
        customer: subscription.customer,
        rail: meta.rail,
        domain: meta.domain || "(missing)",
        status: subscription.status,
      });

      if (meta.rail === "B_MONITOR" && meta.domain && db) {
        await (db as any)
          .from("audit_requests")
          .insert({
            email: meta.email || "",
            company_name: meta.companyName || meta.domain,
            domain: meta.domain,
            run_id: `vgm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
            status: "monitoring_active",
            stripe_payment_intent_id: subscription.id,
            locale: meta.locale || "en",
            headcount: meta.headcount ? parseInt(meta.headcount, 10) : null,
            estimated_monthly_spend: meta.monthlySpendEur ? parseFloat(meta.monthlySpendEur) : null,
          });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      console.log("[Ghost Tax] Subscription cancelled:", {
        id: subscription.id,
        customer: subscription.customer,
      });

      if (db) {
        await (db as any)
          .from("audit_requests")
          .update({ status: "monitoring_cancelled" })
          .eq("stripe_payment_intent_id", subscription.id);
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const intent = event.data.object;
      console.log("[Ghost Tax] Payment failed:", {
        id: intent.id,
        error: intent.last_payment_error?.message,
      });
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
