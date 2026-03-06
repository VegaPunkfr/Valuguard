/**
 * VALUGUARD — TRANSACTIONAL EMAIL ROUTE (STUB)
 *
 * Sends transactional emails via Resend.
 * Used for: audit confirmations, vault creation, recovery alerts.
 *
 * Required env: RESEND_API_KEY
 */

import { NextRequest, NextResponse } from "next/server";

interface EmailPayload {
    to: string;
    subject: string;
    template: "audit_confirmation" | "vault_created" | "recovery_alert";
    data?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
        console.warn("[Valuguard] RESEND_API_KEY not set. Email not sent.");
        return NextResponse.json(
            { error: "Email service not configured" },
            { status: 500 }
        );
    }

    let payload: EmailPayload;
    try {
        payload = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!payload.to || !payload.subject || !payload.template) {
        return NextResponse.json(
            { error: "Missing required fields: to, subject, template" },
            { status: 400 }
        );
    }

    // ── TODO: Integrate Resend SDK ──
    // import { Resend } from 'resend';
    // const resend = new Resend(resendKey);
    // const { data, error } = await resend.emails.send({
    //   from: 'Valuguard <audits@valuguard.com>',
    //   to: payload.to,
    //   subject: payload.subject,
    //   html: renderTemplate(payload.template, payload.data),
    // });

    console.log("[Valuguard] Email stub:", {
        to: payload.to,
        subject: payload.subject,
        template: payload.template,
    });

    return NextResponse.json({
        success: true,
        message: "Email queued (stub mode)",
    });
}
