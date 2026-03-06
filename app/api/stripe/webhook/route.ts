/**
 * VALUGUARD — STRIPE WEBHOOK HANDLER (STUB)
 *
 * Receives Stripe webhook events for payment processing.
 * Validates the webhook signature and routes to event handlers.
 *
 * Required env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    // ── Validate env ──
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.warn("[Valuguard] STRIPE_WEBHOOK_SECRET not set. Webhook ignored.");
        return NextResponse.json(
            { error: "Webhook secret not configured" },
            { status: 500 }
        );
    }

    if (!signature) {
        return NextResponse.json(
            { error: "Missing stripe-signature header" },
            { status: 400 }
        );
    }

    // ── TODO: Verify signature with Stripe SDK ──
    // import Stripe from 'stripe';
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    // const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    // ── Stub: log incoming events ──
    console.log("[Valuguard] Stripe webhook received:", {
        signature: signature.slice(0, 20) + "...",
        bodyLength: body.length,
    });

    // ── Route events ──
    // switch (event.type) {
    //   case 'checkout.session.completed':
    //     // Handle successful payment
    //     break;
    //   case 'customer.subscription.updated':
    //     // Handle subscription changes
    //     break;
    //   case 'invoice.payment_failed':
    //     // Handle failed payments
    //     break;
    // }

    return NextResponse.json({ received: true });
}
