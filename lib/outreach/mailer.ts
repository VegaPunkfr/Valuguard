/**
 * GHOST TAX — SNIPER MAILER (SERVER-ONLY)
 *
 * Sprint 4 : Moteur d'envoi chirurgical.
 *
 * Envoie l'email sniper via Resend (raw fetch, pas de SDK).
 * fireSniperCampaign() est le point d'entrée principal :
 *   1. Génère le magic link (tracking)
 *   2. Construit le template plain-text
 *   3. Envoie via Resend
 *   4. Met à jour le statut OUTREACH_SENT dans osint_prospects
 *
 * Graceful degradation : si l'envoi échoue, l'audit est toujours
 * disponible — l'email est non-fatal.
 *
 * Usage:
 *   import { fireSniperCampaign } from "@/lib/outreach/mailer";
 *   await fireSniperCampaign(auditPayload);
 */

import type { AuditReportPayload } from "@/types/audit";
import { generateMagicLink, markSniperSent } from "./tracking";
import { buildSniperEmail, extractSniperData } from "./templates";

// ══════════════════════════════════════════════════════
//  TYPES
// ══════════════════════════════════════════════════════

export interface SniperResult {
  success: boolean;
  domain: string;
  recipientEmail?: string;
  trackingId?: string;
  magicLink?: string;
  error?: string;
  skippedReason?: string;
}

// ══════════════════════════════════════════════════════
//  MAIN: fireSniperCampaign()
// ══════════════════════════════════════════════════════

/**
 * Point d'entrée Sprint 4 : envoie l'email sniper au décideur.
 *
 * Pré-conditions :
 *   - payload.decisionMaker doit avoir un email
 *   - RESEND_API_KEY doit être configuré
 *
 * Si l'une des conditions manque, retourne un skip (pas d'erreur throw).
 */
export async function fireSniperCampaign(
  payload: AuditReportPayload,
): Promise<SniperResult> {
  const domain = payload.domain;

  // ── Guard: décideur avec email requis ──
  const dm = payload.decisionMaker;
  if (!dm || !dm.email) {
    return {
      success: false,
      domain,
      skippedReason: "No decision-maker email available",
    };
  }

  // ── Guard: Resend API key ──
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return {
      success: false,
      domain,
      skippedReason: "RESEND_API_KEY not configured",
    };
  }

  try {
    // ── 1. Generate magic link ──
    const { url: magicLink, trackingId } = await generateMagicLink(domain);

    // ── 2. Build email ──
    const sniperData = extractSniperData(payload, magicLink);
    const { subject, body } = buildSniperEmail(sniperData);

    // ── 3. Send via Resend ──
    const sendResult = await sendViaResend(
      resendKey,
      dm.email,
      subject,
      body,
      domain,
      trackingId,
    );

    if (!sendResult.success) {
      console.error(
        `[Sniper] Email send failed for ${domain}:`,
        sendResult.error,
      );
      return {
        success: false,
        domain,
        recipientEmail: dm.email,
        trackingId,
        magicLink,
        error: sendResult.error,
      };
    }

    // ── 4. Update DB status ──
    await markSniperSent(domain);

    console.log(
      `[Sniper] ✓ Email sent to ${dm.email} for ${domain} (tracking: ${trackingId})`,
    );

    return {
      success: true,
      domain,
      recipientEmail: dm.email,
      trackingId,
      magicLink,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Sniper] Exception for ${domain}:`, msg);
    return { success: false, domain, error: msg };
  }
}

// ══════════════════════════════════════════════════════
//  RESEND TRANSPORT (raw fetch)
// ══════════════════════════════════════════════════════

async function sendViaResend(
  apiKey: string,
  to: string,
  subject: string,
  textBody: string,
  domain: string,
  trackingId: string,
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Ghost Tax <audits@ghost-tax.com>",
        to: [to],
        subject,
        text: textBody,
        tags: [
          { name: "campaign", value: "sniper-audit" },
          { name: "domain", value: domain },
          { name: "tracking_id", value: trackingId },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "No body");
      return {
        success: false,
        error: `Resend ${response.status}: ${errBody}`,
      };
    }

    const result = (await response.json()) as { id?: string };
    return { success: true, id: result.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
