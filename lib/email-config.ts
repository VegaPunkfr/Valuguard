/**
 * Email config centralisée — créée 17 avril 2026
 *
 * Problème résolu : reply_to pointait vers audits@ghost-tax.com alors que la
 * boîte n'est pas vérifiée accessible par Edith. Tous les replies potentiels
 * des CFOs allaient dans le vide côté destinataire (bounce SMTP).
 *
 * Fallback : hashirama973@gmail.com (Gmail perso Edith) tant que le Google
 * Workspace ghost-tax.com n'a pas été récupéré / audits@ confirmée accessible.
 *
 * Override via env var REPLY_TO_EMAIL.
 */

/**
 * Depuis le 17 avril 2026 : contact@ghost-tax.com est la boîte OAuth
 * officielle (Google Workspace, connectée à Apollo pour warmup + tracking).
 * Les replies des prospects arrivent dans cette boîte ET sont trackés par Apollo.
 *
 * reply_to → contact@ghost-tax.com (boîte réellement checkée)
 * from     → contact@ghost-tax.com par défaut (ou reports@ pour transactionnel)
 *
 * Override via env vars FROM_EMAIL / REPLY_TO_EMAIL si besoin.
 */
export const EMAIL_FROM_DEFAULT =
  process.env.FROM_EMAIL || "Ghost Tax <contact@ghost-tax.com>";

export const EMAIL_REPLY_TO =
  process.env.REPLY_TO_EMAIL || "contact@ghost-tax.com";

export const TRACK_OPENS = process.env.TRACK_OPENS !== "false";
export const TRACK_CLICKS = process.env.TRACK_CLICKS !== "false";

/** Nombre max de touches de drip actif. Touch 4 & 5 retirés le 17 avril 2026
 *  (cost-of-delay math + final notice = anti-patterns CFO DACH). */
export const MAX_DRIP_TOUCHES = 3;

/**
 * Construit le payload Resend standardisé avec tracking activé + reply_to fallback.
 * À utiliser partout où on envoie via fetch('https://api.resend.com/emails').
 */
export function buildResendPayload(params: {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
}) {
  return {
    from: params.from || EMAIL_FROM_DEFAULT,
    to: Array.isArray(params.to) ? params.to : [params.to],
    reply_to: params.replyTo || EMAIL_REPLY_TO,
    subject: params.subject,
    ...(params.html ? { html: params.html } : {}),
    ...(params.text ? { text: params.text } : {}),
    ...(params.tags ? { tags: params.tags } : {}),
    // Tracking forcé — essentiel pour récupérer opens/clicks via webhook
    // (sur les 819 sends historiques, 0 opens/clicks trackés car tracking off)
    ...(TRACK_OPENS ? { track_opens: true } : {}),
    ...(TRACK_CLICKS ? { track_clicks: true } : {}),
  };
}
