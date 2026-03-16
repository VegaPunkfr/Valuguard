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

      // Audit report checkout: update osint_prospects to PAID
      if (meta.source === "audit_report" && meta.auditId && db) {
        try {
          await (db as any)
            .from("osint_prospects")
            .update({
              status: "PAID",
              status_changed_at: new Date().toISOString(),
            })
            .eq("domain", meta.auditId);
          console.log("[Ghost Tax] Audit prospect marked PAID:", meta.auditId);
        } catch (err) {
          console.error("[Ghost Tax] Failed to mark prospect PAID:", err);
        }
      }

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

      // ── BRIDGE: Fire event to Founder Mission Control ──
      // Non-blocking, fire-and-forget. Failure is non-fatal.
      if (meta.domain) {
        const commandSecret = process.env.COMMAND_SECRET;
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ghost-tax.com";
        if (commandSecret) {
          fetch(`${siteUrl}/api/command/ingest?key=${commandSecret}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "payment_completed",
              domain: meta.domain,
              email: session.customer_email || undefined,
              companyName: meta.companyName || undefined,
              contactName: meta.contactName || undefined,
              headcount: meta.headcount ? parseInt(meta.headcount, 10) : undefined,
              industry: meta.industry || undefined,
            }),
          }).catch(() => { /* bridge failure is non-fatal */ });
        }
      }

      // Rail B Monitor: send onboarding email + activate monitoring
      if (meta.rail === "B_MONITOR" && session.customer_email) {
        console.log("[Ghost Tax] Rail B Monitor checkout completed:", {
          email: session.customer_email,
          domain: meta.domain,
        });

        // Send onboarding email via Resend
        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey && meta.domain) {
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ghost-tax.com";
          fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "Ghost Tax <reports@ghost-tax.com>",
              to: [session.customer_email],
              subject: `${meta.domain} — Monitoring continu activé`,
              html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#FFFFFF;font-family:-apple-system,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:32px 20px">
  <p style="font-size:10px;letter-spacing:0.2em;color:#3b82f6;text-transform:uppercase;font-family:monospace">GHOST TAX — MONITORING ACTIV\u00c9</p>
  <h1 style="font-size:22px;color:#0F172A;margin:16px 0">Bienvenue dans le monitoring continu</h1>
  <p style="font-size:14px;color:#475569;line-height:1.7">
    Le monitoring de <strong style="color:#0F172A">${meta.domain}</strong> est maintenant actif.
    Vous recevrez des alertes automatiques en cas de d\u00e9rive d\u00e9tect\u00e9e sur votre stack technologique.
  </p>
  <div style="background:#F1F5F9;border-radius:8px;padding:20px;margin:20px 0">
    <p style="font-size:10px;color:#059669;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 12px 0;font-family:monospace">CE QUI EST INCLUS</p>
    <p style="font-size:13px;color:#475569;line-height:1.8;margin:0">
      \u2022 Scan OSINT hebdomadaire de votre domaine<br>
      \u2022 D\u00e9tection de nouveaux fournisseurs / fournisseurs supprim\u00e9s<br>
      \u2022 Alertes de d\u00e9rive de co\u00fbts et de complexit\u00e9<br>
      \u2022 Rapport mensuel de monitoring d\u00e9taill\u00e9<br>
      \u2022 Acc\u00e8s au dashboard en temps r\u00e9el
    </p>
  </div>
  <div style="text-align:center;margin:24px 0">
    <a href="${siteUrl}/dashboard" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none">Acc\u00e9der au Dashboard</a>
  </div>
  <p style="font-size:11px;color:#64748B;text-align:center">audits@ghost-tax.com</p>
</div></body></html>`,
            }),
          }).catch(err => console.error("[Ghost Tax] Rail B onboarding email failed:", err));
        }
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

    case "invoice.payment_failed": {
      const invoice = event.data.object as any;
      const subId = invoice.subscription;
      console.log("[Ghost Tax] Invoice payment failed:", {
        invoiceId: invoice.id,
        subscriptionId: subId,
        email: invoice.customer_email,
        attemptCount: invoice.attempt_count,
      });

      // After 3 failed attempts, pause monitoring
      if (db && subId && invoice.attempt_count >= 3) {
        await (db as any)
          .from("audit_requests")
          .update({ status: "monitoring_paused" })
          .eq("stripe_payment_intent_id", subId);

        // Notify customer
        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey && invoice.customer_email) {
          fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "Ghost Tax <reports@ghost-tax.com>",
              to: [invoice.customer_email],
              subject: "Ghost Tax — Monitoring en pause (paiement échoué)",
              html: `<div style="background:#FFFFFF;padding:32px;font-family:sans-serif;color:#475569">
                <p style="font-size:10px;letter-spacing:0.2em;color:#DC2626;font-family:monospace">GHOST TAX — ACTION REQUISE</p>
                <h1 style="font-size:20px;color:#0F172A;margin:12px 0">Votre monitoring est en pause</h1>
                <p style="font-size:14px;line-height:1.7">Nous n'avons pas pu traiter votre paiement apr\u00e8s 3 tentatives. Votre monitoring continu est temporairement suspendu.</p>
                <p style="font-size:14px;line-height:1.7">Mettez \u00e0 jour vos informations de paiement pour r\u00e9activer le monitoring :</p>
                <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://ghost-tax.com"}/api/stripe/portal" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;margin:16px 0">Mettre \u00e0 jour le paiement</a>
              </div>`,
            }),
          }).catch(() => {});
        }
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
