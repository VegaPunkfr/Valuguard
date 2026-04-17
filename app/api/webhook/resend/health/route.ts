/**
 * GET /api/webhook/resend/health
 *
 * Diagnostique la santé du webhook Resend.
 * Créé 2026-04-17 suite à découverte 1/819 events delivered.
 *
 * Indique :
 * - Si RESEND_WEBHOOK_SECRET est configuré
 * - Dernier event reçu (et quand)
 * - Nombre d'events capturés par kind ces dernières 24h
 *
 * Si jamais 0 event reçu → le webhook URL n'est pas configuré dans Resend
 * dashboard, OU le tracking opens/clicks n'est pas activé sur les sends.
 */

import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const secretConfigured = !!process.env.RESEND_WEBHOOK_SECRET;
  const resendKeyConfigured = !!process.env.RESEND_API_KEY;

  const db = createAdminSupabase();
  if (!db) {
    return NextResponse.json({
      secret_configured: secretConfigured,
      resend_key_configured: resendKeyConfigured,
      supabase_available: false,
      message: "Supabase non accessible — impossible d'inspecter l'historique events",
    });
  }

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  // Events reçus sur webhook (provenance provider=resend et actor=webhook-resend)
  const { data: recent, error: err1 } = await (db as any)
    .from("outreach_events")
    .select("kind, at, actor, provider_event_type")
    .eq("actor", "webhook-resend")
    .gte("at", since)
    .order("at", { ascending: false })
    .limit(100);

  // Events totaux (incl. SEND_SUCCESS émis par le code côté send)
  const { data: allRecent } = await (db as any)
    .from("outreach_events")
    .select("kind, actor, at")
    .gte("at", since)
    .order("at", { ascending: false })
    .limit(500);

  const byKindWebhook: Record<string, number> = {};
  for (const e of recent || []) byKindWebhook[e.kind] = (byKindWebhook[e.kind] || 0) + 1;

  const byKindAll: Record<string, number> = {};
  const byActor: Record<string, number> = {};
  for (const e of allRecent || []) {
    byKindAll[e.kind] = (byKindAll[e.kind] || 0) + 1;
    byActor[e.actor || "?"] = (byActor[e.actor || "?"] || 0) + 1;
  }

  const webhookHealthy = (recent?.length || 0) > 0;
  const diagnosis: string[] = [];

  if (!secretConfigured) {
    diagnosis.push("❌ RESEND_WEBHOOK_SECRET absent — le webhook rejette toutes les requêtes (401)");
  }
  if (!resendKeyConfigured) {
    diagnosis.push("❌ RESEND_API_KEY absent — aucun envoi possible");
  }
  if (secretConfigured && resendKeyConfigured && !webhookHealthy) {
    diagnosis.push("⚠️  Aucun event reçu via webhook dans les 24h. Causes probables :");
    diagnosis.push("    1. L'URL webhook n'est pas configurée dans Resend dashboard");
    diagnosis.push("    2. Le tracking opens/clicks est désactivé sur les sends");
    diagnosis.push("    3. Aucun email envoyé dans les 24h");
    diagnosis.push(`→ Configurer : https://resend.com/webhooks → Add endpoint → ${process.env.NEXT_PUBLIC_SITE_URL || "https://ghost-tax.com"}/api/webhook/resend`);
    diagnosis.push("→ Events à activer : email.sent, email.delivered, email.opened, email.clicked, email.bounced, email.complained, email.failed");
  }
  if (webhookHealthy) {
    diagnosis.push(`✅ Webhook opérationnel. ${recent?.length || 0} events reçus dernières 24h.`);
  }

  return NextResponse.json({
    secret_configured: secretConfigured,
    resend_key_configured: resendKeyConfigured,
    supabase_available: true,
    webhook_healthy: webhookHealthy,
    events_via_webhook_24h: recent?.length || 0,
    events_total_24h: allRecent?.length || 0,
    breakdown_by_kind_webhook: byKindWebhook,
    breakdown_by_kind_all: byKindAll,
    breakdown_by_actor: byActor,
    last_webhook_event: recent?.[0] || null,
    diagnosis,
    resend_dashboard: "https://resend.com/webhooks",
    expected_webhook_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://ghost-tax.com"}/api/webhook/resend`,
  });
}
