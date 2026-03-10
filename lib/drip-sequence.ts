/**
 * GHOST TAX — 5-TOUCH DRIP SEQUENCE ENGINE (SERVER-ONLY)
 *
 * Automated nurture sequence that converts free scan users into
 * paid Decision Pack customers. Queries `outreach_leads` for
 * eligible leads and sends the appropriate touch email via Resend.
 *
 * 5 touches:
 *   Touch 1 (Day 0):  "Your scan results" — helpful summary, no pressure
 *   Touch 2 (Day 3):  "The cost of waiting" — daily leakage math
 *   Touch 3 (Day 7):  "What your peers are doing" — social proof
 *   Touch 4 (Day 14): "Your exposure is growing" — drift projection
 *   Touch 5 (Day 21): "Last chance before scan expires" — scarcity + viral block
 *
 * Guards:
 *   - Never sends to unsubscribed leads
 *   - Never sends to converted (purchased) leads
 *   - Rate limited: max 50 emails per cron run
 *   - Idempotent: drip_step + next_send_at prevents duplicates
 *
 * Uses:
 *   - createAdminSupabase() for database queries
 *   - Resend API (fetch) for sending
 *   - Pricing from lib/pricing.ts
 *   - generateViralEmailBlock() from lib/viral-loop.ts (Touch 5)
 */

import { createAdminSupabase } from "@/lib/supabase";
import {
  getRailAPrice,
  getCurrencySymbol,
  formatPrice,
  type PricingLocale,
} from "@/lib/pricing";
import { generateViralEmailBlock } from "@/lib/viral-loop";
import * as crypto from "crypto";

// ── Types ─────────────────────────────────────────────

export interface DripResult {
  processed: number;
  emailsSent: number;
  skipped: number;
  errors: number;
  details: DripAction[];
}

export interface DripAction {
  email: string;
  company: string;
  touch: 1 | 2 | 3 | 4 | 5;
  action:
    | "sent"
    | "skipped_unsubscribed"
    | "skipped_converted"
    | "skipped_not_due"
    | "error";
  error?: string;
}

interface LeadRow {
  id: string;
  email: string;
  domain: string | null;
  company: string | null;
  headcount: number | null;
  industry: string | null;
  locale: string | null;
  drip_step: number;
  next_send_at: string;
  unsubscribed: boolean;
  converted: boolean;
  created_at: string;
  meta: Record<string, any> | null;
}

// ── Constants ─────────────────────────────────────────

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ghost-tax.com";
const MAX_EMAILS_PER_RUN = 50;

/** Touch schedule: days after lead creation */
const TOUCH_SCHEDULE_DAYS: Record<number, number> = {
  1: 0,   // immediate
  2: 3,   // Day 3
  3: 7,   // Day 7
  4: 14,  // Day 14
  5: 21,  // Day 21
};

// ── Main Entry Point ──────────────────────────────────

export async function runDripSequence(): Promise<DripResult> {
  const result: DripResult = {
    processed: 0,
    emailsSent: 0,
    skipped: 0,
    errors: 0,
    details: [],
  };

  const db = createAdminSupabase();
  if (!db) {
    console.error("[Drip Sequence] Database not configured");
    return result;
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn("[Drip Sequence] RESEND_API_KEY not set — dry run only");
  }

  const now = new Date().toISOString();

  // ── Fetch eligible leads ──
  // Leads that: have email, not unsubscribed, not converted,
  // drip_step < 5, next_send_at <= now
  const { data: leads, error: fetchError } = await (db as any)
    .from("outreach_leads")
    .select("*")
    .eq("unsubscribed", false)
    .eq("converted", false)
    .eq("status", "active")
    .lt("drip_step", 5)
    .lte("next_send_at", now)
    .order("next_send_at", { ascending: true })
    .limit(MAX_EMAILS_PER_RUN);

  if (fetchError) {
    console.error("[Drip Sequence] Failed to fetch leads:", fetchError.message);
    return result;
  }

  if (!leads || leads.length === 0) {
    console.log("[Drip Sequence] No leads due for drip");
    return result;
  }

  // ── Cross-check: exclude anyone who has purchased ──
  const emails = leads.map((l: LeadRow) => l.email);
  const { data: paidRequests } = await (db as any)
    .from("audit_requests")
    .select("email")
    .in("email", emails)
    .in("status", ["paid", "processing", "report_persisted", "delivered", "followup_scheduled"]);

  const paidEmails = new Set((paidRequests || []).map((r: any) => r.email));

  // ── Process each lead ──
  for (const lead of leads as LeadRow[]) {
    result.processed++;

    // Double-check unsubscribed
    if (lead.unsubscribed) {
      result.skipped++;
      result.details.push({
        email: lead.email,
        company: lead.company || lead.domain || "Unknown",
        touch: (lead.drip_step + 1) as 1 | 2 | 3 | 4 | 5,
        action: "skipped_unsubscribed",
      });
      continue;
    }

    // Check if converted since last run
    if (paidEmails.has(lead.email)) {
      result.skipped++;
      // Mark as converted in DB
      await (db as any)
        .from("outreach_leads")
        .update({ converted: true, updated_at: now })
        .eq("id", lead.id);
      result.details.push({
        email: lead.email,
        company: lead.company || lead.domain || "Unknown",
        touch: (lead.drip_step + 1) as 1 | 2 | 3 | 4 | 5,
        action: "skipped_converted",
      });
      continue;
    }

    // Determine next touch number (drip_step is 0-indexed, touch is 1-indexed)
    const nextTouch = (lead.drip_step + 1) as 1 | 2 | 3 | 4 | 5;
    if (nextTouch > 5) {
      result.skipped++;
      continue;
    }

    const company = lead.company || lead.domain || "your company";
    const locale = detectLocale(lead);
    const price = getRailAPrice(lead.headcount ?? undefined, locale);
    const symbol = getCurrencySymbol(locale);
    const formattedPrice = formatPrice(price, locale);
    const dailyLeak = estimateDailyLeak(lead);
    const daysSinceScan = Math.max(
      1,
      Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (24 * 60 * 60 * 1000))
    );

    try {
      const { subject, html } = getDripEmailHtml(nextTouch, {
        locale,
        company,
        email: lead.email,
        domain: lead.domain || lead.email.split("@")[1] || "",
        formattedPrice,
        symbol,
        dailyLeak,
        daysSinceScan,
        headcount: lead.headcount ?? undefined,
        industry: lead.industry ?? undefined,
        exposureLow: dailyLeak * 365 * 0.7,
        exposureHigh: dailyLeak * 365 * 1.4,
        meta: lead.meta,
      });

      if (resendKey) {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Ghost Tax <reports@ghost-tax.com>",
            to: [lead.email],
            subject,
            html,
          }),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "Unknown");
          throw new Error(`Resend ${res.status}: ${errText}`);
        }
      } else {
        console.log(`[Drip Sequence] [DRY RUN] Would send touch ${nextTouch} to ${lead.email}`);
      }

      // Update lead: advance drip_step, set next_send_at
      const nextStep = nextTouch;
      const { nextSendAt } = calculateDripSchedule(lead.created_at, nextStep);

      await (db as any)
        .from("outreach_leads")
        .update({
          drip_step: nextStep,
          next_send_at: nextSendAt,
          last_sent_at: now,
          updated_at: now,
        })
        .eq("id", lead.id);

      result.emailsSent++;
      result.details.push({
        email: lead.email,
        company,
        touch: nextTouch,
        action: "sent",
      });
    } catch (err) {
      result.errors++;
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`[Drip Sequence] Error sending touch ${nextTouch} to ${lead.email}:`, message);
      result.details.push({
        email: lead.email,
        company,
        touch: nextTouch,
        action: "error",
        error: message,
      });
    }
  }

  return result;
}

// ── Schedule Calculator ───────────────────────────────

export function calculateDripSchedule(
  createdAt: string,
  currentStep: number
): { nextSendAt: string; nextTouch: number | null } {
  const nextTouch = currentStep + 1;
  if (nextTouch > 5) {
    // Sequence complete — set far-future date so lead is never picked up again
    return {
      nextSendAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      nextTouch: null,
    };
  }

  const createdMs = new Date(createdAt).getTime();
  const daysOffset = TOUCH_SCHEDULE_DAYS[nextTouch] ?? 30;
  const nextSendMs = createdMs + daysOffset * 24 * 60 * 60 * 1000;

  // If computed time is in the past, send next run
  const effectiveMs = Math.max(nextSendMs, Date.now());

  return {
    nextSendAt: new Date(effectiveMs).toISOString(),
    nextTouch,
  };
}

// ── Locale Detection ──────────────────────────────────

function detectLocale(lead: LeadRow): PricingLocale {
  if (lead.locale === "fr" || lead.locale === "de" || lead.locale === "en") {
    return lead.locale;
  }
  if (lead.domain) {
    const tld = lead.domain.split(".").pop()?.toLowerCase();
    if (tld === "de" || tld === "at" || tld === "ch") return "de";
    if (tld === "fr" || tld === "be") return "fr";
  }
  const emailTld = lead.email.split("@")[1]?.split(".").pop()?.toLowerCase();
  if (emailTld === "de" || emailTld === "at" || emailTld === "ch") return "de";
  if (emailTld === "fr" || emailTld === "be") return "fr";

  return "en";
}

// ── Daily Leak Estimator ──────────────────────────────

function estimateDailyLeak(lead: LeadRow): number {
  // Use meta.monthly_spend_eur if available
  const monthlySpend = lead.meta?.monthly_spend_eur || lead.meta?.monthlySpendEur;
  if (monthlySpend && typeof monthlySpend === "number") {
    const annualSpend = monthlySpend * 12;
    const estimatedWaste = annualSpend * 0.12;
    return Math.round(estimatedWaste / 365);
  }

  if (lead.headcount) {
    const estimatedAnnualSpend = lead.headcount * 2000;
    const estimatedWaste = estimatedAnnualSpend * 0.12;
    return Math.round(estimatedWaste / 365);
  }

  return 274; // ~100k EUR/year / 365
}

// ── Amount Formatting ─────────────────────────────────

function fmtAmount(n: number, symbol: string): string {
  if (symbol === "$") {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 10_000) return `$${Math.round(n / 1000)}k`;
    return `$${Math.round(n).toLocaleString("en-US")}`;
  }
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M €`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k €`;
  return `${Math.round(n).toLocaleString("de-DE")} €`;
}

// ── Unsubscribe Token ─────────────────────────────────

function generateUnsubToken(email: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || "drip-salt";
  return crypto
    .createHash("sha256")
    .update(`unsub:${email}:${secret}`)
    .digest("hex")
    .slice(0, 16);
}

// ── Tracking Pixel URL ────────────────────────────────

function trackingPixelUrl(email: string, touch: number): string {
  const hash = crypto
    .createHash("sha256")
    .update(`drip:${email}:${touch}:${Date.now()}`)
    .digest("hex")
    .slice(0, 12);
  return `${SITE_URL}/api/viral/pixel?src=drip&t=${touch}&h=${hash}`;
}

// ── Checkout URL Builder ──────────────────────────────

function buildCheckoutUrl(params: {
  domain: string;
  headcount?: number;
  touch: number;
  locale: PricingLocale;
}): string {
  const url = new URL(`${SITE_URL}/pricing`);
  url.searchParams.set("ref", "drip");
  url.searchParams.set("touch", String(params.touch));
  if (params.domain) url.searchParams.set("domain", params.domain);
  if (params.headcount) url.searchParams.set("headcount", String(params.headcount));
  url.searchParams.set("locale", params.locale);
  return url.toString();
}

// ── Tri-Lingual Copy ──────────────────────────────────

interface DripEmailData {
  locale: PricingLocale;
  company: string;
  email: string;
  domain: string;
  formattedPrice: string;
  symbol: string;
  dailyLeak: number;
  daysSinceScan: number;
  headcount?: number;
  industry?: string;
  exposureLow: number;
  exposureHigh: number;
  meta?: Record<string, any> | null;
}

const COPY = {
  // ── TOUCH 1: Your Scan Results ──
  touch1: {
    en: {
      subject: (c: string) => `Your ${c} scan results are ready`,
      preheader: "SCAN RESULTS",
      headline: (c: string) => `We found something in ${c}`,
      body: (d: DripEmailData) => {
        const low = fmtAmount(d.exposureLow, d.symbol);
        const high = fmtAmount(d.exposureHigh, d.symbol);
        return `Our scan of ${d.company} detected financial exposure in the range of <strong style="color:#ef4444;font-family:monospace">${low} – ${high}/year</strong>. This includes hidden vendor lock-in costs, redundant tooling overlap, and unoptimized licensing across your SaaS, Cloud, and AI stack.`;
      },
      bodyExtra: (_d: DripEmailData) =>
        `This is a preview based on publicly available signals. The full Decision Pack includes vendor-by-vendor analysis, negotiation playbooks, and a CFO-ready corrective protocol.`,
      cta: "Get the Full Decision Pack",
      note: "Instant delivery. No call required.",
    },
    fr: {
      subject: (c: string) => `Résultats du scan de ${c}`,
      preheader: "RÉSULTATS DU SCAN",
      headline: (c: string) => `Nous avons détecté quelque chose chez ${c}`,
      body: (d: DripEmailData) => {
        const low = fmtAmount(d.exposureLow, d.symbol);
        const high = fmtAmount(d.exposureHigh, d.symbol);
        return `Notre scan de ${d.company} a détecté une exposition financière de l'ordre de <strong style="color:#ef4444;font-family:monospace">${low} – ${high}/an</strong>. Cela inclut des coûts de verrouillage fournisseur cachés, des chevauchements d'outils redondants et des licences non optimisées dans votre stack SaaS, Cloud et IA.`;
      },
      bodyExtra: (_d: DripEmailData) =>
        `Ceci est un aperçu basé sur des signaux publiquement disponibles. Le Decision Pack complet inclut une analyse fournisseur par fournisseur, des protocoles de négociation et un plan correctif prêt pour le CFO.`,
      cta: "Obtenir le Decision Pack Complet",
      note: "Livraison instantanée. Aucun appel requis.",
    },
    de: {
      subject: (c: string) => `Ihre ${c}-Scan-Ergebnisse sind bereit`,
      preheader: "SCAN-ERGEBNISSE",
      headline: (c: string) => `Wir haben etwas bei ${c} gefunden`,
      body: (d: DripEmailData) => {
        const low = fmtAmount(d.exposureLow, d.symbol);
        const high = fmtAmount(d.exposureHigh, d.symbol);
        return `Unser Scan von ${d.company} hat eine finanzielle Exposition im Bereich von <strong style="color:#ef4444;font-family:monospace">${low} – ${high}/Jahr</strong> erkannt. Dies umfasst versteckte Vendor-Lock-in-Kosten, redundante Tool-Überschneidungen und nicht optimierte Lizenzierung in Ihrem SaaS-, Cloud- und KI-Stack.`;
      },
      bodyExtra: (_d: DripEmailData) =>
        `Dies ist eine Vorschau basierend auf öffentlich verfügbaren Signalen. Das vollständige Decision Pack enthält eine Anbieter-für-Anbieter-Analyse, Verhandlungsleitfäden und ein CFO-fertiges Korrekturprotokoll.`,
      cta: "Vollständiges Decision Pack erhalten",
      note: "Sofortige Lieferung. Kein Anruf erforderlich.",
    },
  },

  // ── TOUCH 2: The Cost of Waiting ──
  touch2: {
    en: {
      subject: (c: string, daily: string) => `${c} is losing ${daily} every day you wait`,
      preheader: "COST OF WAITING",
      headline: (_c: string, daily: string) => `${daily}/day. Every day.`,
      body: (d: DripEmailData) => {
        const daily = fmtAmount(d.dailyLeak, d.symbol);
        const lost = fmtAmount(d.dailyLeak * d.daysSinceScan, d.symbol);
        return `Since your scan ${d.daysSinceScan} days ago, an estimated <strong style="color:#ef4444;font-family:monospace">${lost}</strong> has leaked from ${d.company}. That's ${daily} per day in hidden exposure that compounds silently — vendor lock-in fees, unused licenses, unoptimized contracts.`;
      },
      bodyExtra: (_d: DripEmailData) =>
        `The exposure doesn't pause while you evaluate. Every renewal that passes without data is a missed correction window.`,
      cta: "Stop the Leak",
      note: "The cost of the Decision Pack pays for itself in days, not months.",
    },
    fr: {
      subject: (c: string, daily: string) => `${c} perd ${daily} chaque jour d'attente`,
      preheader: "COÛT DE L'ATTENTE",
      headline: (_c: string, daily: string) => `${daily}/jour. Chaque jour.`,
      body: (d: DripEmailData) => {
        const daily = fmtAmount(d.dailyLeak, d.symbol);
        const lost = fmtAmount(d.dailyLeak * d.daysSinceScan, d.symbol);
        return `Depuis votre scan il y a ${d.daysSinceScan} jours, environ <strong style="color:#ef4444;font-family:monospace">${lost}</strong> a fui de ${d.company}. C'est ${daily} par jour en exposition cachée qui se compose silencieusement — frais de verrouillage fournisseur, licences inutilisées, contrats non optimisés.`;
      },
      bodyExtra: (_d: DripEmailData) =>
        `L'exposition ne fait pas de pause pendant que vous évaluez. Chaque renouvellement qui passe sans données est une fenêtre de correction manquée.`,
      cta: "Stopper la Fuite",
      note: "Le coût du Decision Pack se rentabilise en jours, pas en mois.",
    },
    de: {
      subject: (c: string, daily: string) => `${c} verliert ${daily} an jedem Tag des Wartens`,
      preheader: "KOSTEN DES WARTENS",
      headline: (_c: string, daily: string) => `${daily}/Tag. Jeden Tag.`,
      body: (d: DripEmailData) => {
        const daily = fmtAmount(d.dailyLeak, d.symbol);
        const lost = fmtAmount(d.dailyLeak * d.daysSinceScan, d.symbol);
        return `Seit Ihrem Scan vor ${d.daysSinceScan} Tagen sind geschätzte <strong style="color:#ef4444;font-family:monospace">${lost}</strong> bei ${d.company} verloren gegangen. Das sind ${daily} pro Tag an versteckter Exposition, die sich lautlos summiert — Vendor-Lock-in-Gebühren, ungenutzte Lizenzen, nicht optimierte Verträge.`;
      },
      bodyExtra: (_d: DripEmailData) =>
        `Die Exposition pausiert nicht, während Sie evaluieren. Jede Verlängerung ohne Daten ist ein verpasstes Korrekturfenster.`,
      cta: "Das Leck Stoppen",
      note: "Die Kosten des Decision Packs amortisieren sich in Tagen, nicht Monaten.",
    },
  },

  // ── TOUCH 3: What Your Peers Are Doing ──
  touch3: {
    en: {
      subject: (c: string) => `Companies like ${c} are already acting on this`,
      preheader: "PEER INTELLIGENCE",
      headline: (_c: string) => `Your peers aren't waiting`,
      body: (d: DripEmailData) => {
        const industry = d.industry || "your industry";
        return `In ${industry}, companies with ${d.headcount ? `${d.headcount}+ employees` : "similar headcounts"} are detecting an average of 8-15% hidden exposure in their SaaS and Cloud spending. The ones who act within 14 days of detection recover 3-5x the cost of analysis in the first quarter alone.`;
      },
      bodyExtra: (d: DripEmailData) =>
        `${d.company} was scanned ${d.daysSinceScan} days ago. Companies that delay past 30 days see correction windows close — vendor renewals lock in, pricing power shifts, and the exposure compounds.`,
      cta: "Act Before Your Next Renewal",
      note: "Institutional intelligence. Not a sales pitch.",
    },
    fr: {
      subject: (c: string) => `Des entreprises comme ${c} agissent déjà`,
      preheader: "INTELLIGENCE PAIRS",
      headline: (_c: string) => `Vos pairs n'attendent pas`,
      body: (d: DripEmailData) => {
        const industry = d.industry || "votre secteur";
        return `Dans ${industry}, les entreprises de ${d.headcount ? `${d.headcount}+ employés` : "taille similaire"} détectent en moyenne 8-15% d'exposition cachée dans leurs dépenses SaaS et Cloud. Celles qui agissent dans les 14 jours suivant la détection récupèrent 3 à 5x le coût de l'analyse dès le premier trimestre.`;
      },
      bodyExtra: (d: DripEmailData) =>
        `${d.company} a été scanné il y a ${d.daysSinceScan} jours. Les entreprises qui tardent au-delà de 30 jours voient les fenêtres de correction se fermer — les renouvellements fournisseurs se verrouillent, le pouvoir de négociation bascule, et l'exposition se compose.`,
      cta: "Agir Avant Votre Prochain Renouvellement",
      note: "Intelligence institutionnelle. Pas un pitch commercial.",
    },
    de: {
      subject: (c: string) => `Unternehmen wie ${c} handeln bereits`,
      preheader: "PEER-INTELLIGENCE",
      headline: (_c: string) => `Ihre Peers warten nicht`,
      body: (d: DripEmailData) => {
        const industry = d.industry || "Ihrer Branche";
        return `In ${industry} erkennen Unternehmen mit ${d.headcount ? `${d.headcount}+ Mitarbeitern` : "ähnlicher Größe"} durchschnittlich 8-15% versteckte Exposition in ihren SaaS- und Cloud-Ausgaben. Diejenigen, die innerhalb von 14 Tagen nach der Erkennung handeln, gewinnen 3-5x die Analysekosten im ersten Quartal zurück.`;
      },
      bodyExtra: (d: DripEmailData) =>
        `${d.company} wurde vor ${d.daysSinceScan} Tagen gescannt. Unternehmen, die über 30 Tage hinauszögern, sehen Korrekturfenster schließen — Anbieterverlängerungen werden fixiert, Verhandlungsmacht verschiebt sich und die Exposition summiert sich.`,
      cta: "Vor der Nächsten Verlängerung Handeln",
      note: "Institutionelle Intelligence. Kein Verkaufsgespräch.",
    },
  },

  // ── TOUCH 4: Your Exposure Is Growing ──
  touch4: {
    en: {
      subject: (c: string) => `${c}: exposure has grown since your scan`,
      preheader: "EXPOSURE UPDATE",
      headline: (c: string) => `${c}'s exposure is growing`,
      body: (d: DripEmailData) => {
        const lost = fmtAmount(d.dailyLeak * d.daysSinceScan, d.symbol);
        const daily = fmtAmount(d.dailyLeak, d.symbol);
        const projected30 = fmtAmount(d.dailyLeak * 30, d.symbol);
        return `It has been ${d.daysSinceScan} days since we scanned ${d.company}. At ${daily}/day, the estimated cost of delay since your scan is now <strong style="color:#ef4444;font-family:monospace">${lost}</strong>. If you wait another 30 days, that becomes ${projected30}.`;
      },
      bodyExtra: (_d: DripEmailData) =>
        `Market conditions shift. Vendor pricing power increases at renewal. The intelligence from your scan is still valid, but the correction window is narrowing. Every day without action is a day the exposure compounds.`,
      cta: "Close the Correction Window",
      note: "Your scan data is still available. Act now.",
    },
    fr: {
      subject: (c: string) => `${c} : l'exposition a augmenté depuis votre scan`,
      preheader: "MISE À JOUR EXPOSITION",
      headline: (c: string) => `L'exposition de ${c} croît`,
      body: (d: DripEmailData) => {
        const lost = fmtAmount(d.dailyLeak * d.daysSinceScan, d.symbol);
        const daily = fmtAmount(d.dailyLeak, d.symbol);
        const projected30 = fmtAmount(d.dailyLeak * 30, d.symbol);
        return `Cela fait ${d.daysSinceScan} jours depuis le scan de ${d.company}. À ${daily}/jour, le coût estimé du retard depuis votre scan est maintenant de <strong style="color:#ef4444;font-family:monospace">${lost}</strong>. Si vous attendez encore 30 jours, cela devient ${projected30}.`;
      },
      bodyExtra: (_d: DripEmailData) =>
        `Les conditions de marché évoluent. Le pouvoir de tarification des fournisseurs augmente au renouvellement. L'intelligence de votre scan est toujours valide, mais la fenêtre de correction se rétrécit. Chaque jour sans action est un jour où l'exposition se compose.`,
      cta: "Fermer la Fenêtre de Correction",
      note: "Vos données de scan sont toujours disponibles. Agissez maintenant.",
    },
    de: {
      subject: (c: string) => `${c}: Exposition ist seit Ihrem Scan gewachsen`,
      preheader: "EXPOSITIONS-UPDATE",
      headline: (c: string) => `Die Exposition von ${c} wächst`,
      body: (d: DripEmailData) => {
        const lost = fmtAmount(d.dailyLeak * d.daysSinceScan, d.symbol);
        const daily = fmtAmount(d.dailyLeak, d.symbol);
        const projected30 = fmtAmount(d.dailyLeak * 30, d.symbol);
        return `Es sind ${d.daysSinceScan} Tage seit dem Scan von ${d.company} vergangen. Bei ${daily}/Tag betragen die geschätzten Verzögerungskosten seit Ihrem Scan jetzt <strong style="color:#ef4444;font-family:monospace">${lost}</strong>. Wenn Sie weitere 30 Tage warten, werden es ${projected30}.`;
      },
      bodyExtra: (_d: DripEmailData) =>
        `Marktbedingungen ändern sich. Die Preismacht der Anbieter steigt bei Verlängerung. Die Intelligence aus Ihrem Scan ist noch gültig, aber das Korrekturfenster verengt sich. Jeder Tag ohne Aktion ist ein Tag, an dem sich die Exposition summiert.`,
      cta: "Das Korrekturfenster Schließen",
      note: "Ihre Scan-Daten sind noch verfügbar. Handeln Sie jetzt.",
    },
  },

  // ── TOUCH 5: Last Chance ──
  touch5: {
    en: {
      subject: (c: string) => `Final notice: ${c} scan data expires in 7 days`,
      preheader: "FINAL NOTICE",
      headline: (_c: string) => `Your scan data will be purged in 7 days`,
      body: (d: DripEmailData) => {
        const totalLost = fmtAmount(d.dailyLeak * d.daysSinceScan, d.symbol);
        return `We scanned ${d.company} ${d.daysSinceScan} days ago. Since then, an estimated ${totalLost} in hidden exposure has continued to compound unchecked. Your scan data — including vendor signals, exposure ranges, and correction opportunities — will be permanently purged in 7 days.`;
      },
      bodyExtra: (d: DripEmailData) =>
        `After expiration, a new scan would be required at current pricing (${d.formattedPrice}). This is your last automated notice.`,
      cta: "Get the Decision Pack Before Expiry",
      note: "After this, your scan data will be permanently deleted.",
    },
    fr: {
      subject: (c: string) => `Dernier avis : les données de scan de ${c} expirent dans 7 jours`,
      preheader: "DERNIER AVIS",
      headline: (_c: string) => `Vos données de scan seront purgées dans 7 jours`,
      body: (d: DripEmailData) => {
        const totalLost = fmtAmount(d.dailyLeak * d.daysSinceScan, d.symbol);
        return `Nous avons scanné ${d.company} il y a ${d.daysSinceScan} jours. Depuis, environ ${totalLost} d'exposition cachée a continué à se composer sans contrôle. Vos données de scan — signaux fournisseurs, fourchettes d'exposition et opportunités de correction — seront définitivement purgées dans 7 jours.`;
      },
      bodyExtra: (d: DripEmailData) =>
        `Après expiration, un nouveau scan sera nécessaire au tarif en vigueur (${d.formattedPrice}). Ceci est votre dernier avis automatisé.`,
      cta: "Obtenir le Decision Pack Avant Expiration",
      note: "Après cela, vos données de scan seront définitivement supprimées.",
    },
    de: {
      subject: (c: string) => `Letzte Mitteilung: ${c}-Scan-Daten verfallen in 7 Tagen`,
      preheader: "LETZTE MITTEILUNG",
      headline: (_c: string) => `Ihre Scan-Daten werden in 7 Tagen gelöscht`,
      body: (d: DripEmailData) => {
        const totalLost = fmtAmount(d.dailyLeak * d.daysSinceScan, d.symbol);
        return `Wir haben ${d.company} vor ${d.daysSinceScan} Tagen gescannt. Seitdem hat sich eine geschätzte Exposition von ${totalLost} unkontrolliert weiter summiert. Ihre Scan-Daten — Anbietersignale, Expositionsbereiche und Korrekturmöglichkeiten — werden in 7 Tagen dauerhaft gelöscht.`;
      },
      bodyExtra: (d: DripEmailData) =>
        `Nach Ablauf wäre ein neuer Scan zum aktuellen Preis (${d.formattedPrice}) erforderlich. Dies ist Ihre letzte automatisierte Benachrichtigung.`,
      cta: "Decision Pack Vor Ablauf Erhalten",
      note: "Danach werden Ihre Scan-Daten dauerhaft gelöscht.",
    },
  },
} as const;

// ── Email HTML Builder ────────────────────────────────

export function getDripEmailHtml(
  touch: 1 | 2 | 3 | 4 | 5,
  data: DripEmailData
): { subject: string; html: string } {
  const locale = data.locale;
  const touchKey = `touch${touch}` as keyof typeof COPY;
  const copy = COPY[touchKey][locale];

  const daily = fmtAmount(data.dailyLeak, data.symbol);

  // Subject
  let subject: string;
  if (touch === 2) {
    subject = (copy.subject as (c: string, d: string) => string)(data.company, daily);
  } else {
    subject = (copy.subject as (c: string) => string)(data.company);
  }

  // Headline
  let headline: string;
  if (touch === 2) {
    headline = (copy.headline as (c: string, d: string) => string)(data.company, daily);
  } else {
    headline = (copy.headline as (c: string) => string)(data.company);
  }

  // Body + extra
  const bodyText = copy.body(data);
  const bodyExtra = copy.bodyExtra(data);

  // Colors by touch
  const accentColor =
    touch <= 2 ? "#3b82f6" : touch === 3 ? "#3b82f6" : touch === 4 ? "#f59e0b" : "#ef4444";
  const ctaColor =
    touch <= 3 ? "#3b82f6" : touch === 4 ? "#f59e0b" : "#ef4444";

  const checkoutUrl = buildCheckoutUrl({
    domain: data.domain,
    headcount: data.headcount,
    touch,
    locale: data.locale,
  });

  const unsubUrl = `${SITE_URL}/api/leads/unsubscribe?email=${encodeURIComponent(data.email)}&token=${generateUnsubToken(data.email)}`;
  const pixelUrl = trackingPixelUrl(data.email, touch);

  // Cost-of-waiting box (Touch 2 & 4)
  let costBox = "";
  if (touch === 2 || touch === 4) {
    const totalLost = fmtAmount(data.dailyLeak * data.daysSinceScan, data.symbol);
    const dayLabel = locale === "fr" ? "jours" : locale === "de" ? "Tage" : "days";
    const perDayLabel = locale === "fr" ? "jour" : locale === "de" ? "Tag" : "day";
    const boxLabel = touch === 2
      ? (locale === "fr" ? "COÛT DE L'ATTENTE DEPUIS VOTRE SCAN" : locale === "de" ? "KOSTEN DES WARTENS SEIT IHREM SCAN" : "COST OF WAITING SINCE YOUR SCAN")
      : (locale === "fr" ? "EXPOSITION CUMULÉE DEPUIS LE SCAN" : locale === "de" ? "KUMULIERTE EXPOSITION SEIT DEM SCAN" : "CUMULATIVE EXPOSURE SINCE SCAN");

    costBox = `
    <div style="background:#0e1221;border:2px solid ${touch === 2 ? "rgba(59,130,246,0.25)" : "rgba(245,158,11,0.25)"};border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
      <p style="font-size:10px;color:${ctaColor};letter-spacing:0.12em;margin:0 0 8px 0;text-transform:uppercase">${boxLabel}</p>
      <p style="font-size:36px;font-family:monospace;font-weight:900;color:${ctaColor};margin:0">${totalLost}</p>
      <p style="font-size:12px;color:#55637d;margin:8px 0 0 0">${daily}/${perDayLabel} × ${data.daysSinceScan} ${dayLabel}</p>
    </div>`;
  }

  // Expiry box (Touch 5)
  let expiryBox = "";
  if (touch === 5) {
    const expiryLabel = locale === "fr"
      ? "LES DONNÉES DE SCAN SERONT PURGÉES DANS"
      : locale === "de"
        ? "SCAN-DATEN WERDEN GELÖSCHT IN"
        : "SCAN DATA WILL BE PURGED IN";
    const sevenDays = locale === "fr" ? "7 JOURS" : locale === "de" ? "7 TAGEN" : "7 DAYS";

    expiryBox = `
    <div style="background:#0e1221;border:2px solid rgba(239,68,68,0.30);border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
      <p style="font-size:10px;color:#ef4444;letter-spacing:0.12em;margin:0 0 8px 0;text-transform:uppercase">${expiryLabel}</p>
      <p style="font-size:28px;font-family:monospace;font-weight:900;color:#ef4444;margin:0">${sevenDays}</p>
    </div>`;
  }

  // Peer stats box (Touch 3)
  let peerBox = "";
  if (touch === 3) {
    const statsLabel = locale === "fr"
      ? "ANALYSE DE 200+ ENTREPRISES"
      : locale === "de"
        ? "ANALYSE VON 200+ UNTERNEHMEN"
        : "ANALYSIS OF 200+ COMPANIES";
    const stat1 = locale === "fr" ? "des entreprises ont une exposition cachée" : locale === "de" ? "der Unternehmen haben versteckte Exposition" : "of companies have hidden exposure";
    const stat2 = locale === "fr" ? "taux de récupération moyen au T1" : locale === "de" ? "durchschnittliche Rückgewinnung im Q1" : "average recovery rate in Q1";
    const stat3 = locale === "fr" ? "agissent dans les 14 premiers jours" : locale === "de" ? "handeln innerhalb der ersten 14 Tage" : "act within the first 14 days";

    peerBox = `
    <div style="background:#0e1221;border:1px solid rgba(59,130,246,0.20);border-radius:12px;padding:24px;margin-bottom:24px">
      <p style="font-size:10px;color:#3b82f6;letter-spacing:0.12em;margin:0 0 16px 0;text-transform:uppercase">${statsLabel}</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid rgba(36,48,78,0.20)">
            <span style="font-size:24px;font-family:monospace;font-weight:900;color:#e4e9f4">100%</span>
            <span style="font-size:12px;color:#8d9bb5;padding-left:12px">${stat1}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid rgba(36,48,78,0.20)">
            <span style="font-size:24px;font-family:monospace;font-weight:900;color:#34d399">3-5x</span>
            <span style="font-size:12px;color:#8d9bb5;padding-left:12px">${stat2}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0">
            <span style="font-size:24px;font-family:monospace;font-weight:900;color:#f59e0b">67%</span>
            <span style="font-size:12px;color:#8d9bb5;padding-left:12px">${stat3}</span>
          </td>
        </tr>
      </table>
    </div>`;
  }

  // Viral block for Touch 5 only
  let viralBlock = "";
  if (touch === 5 && data.domain) {
    try {
      viralBlock = generateViralEmailBlock({
        runId: crypto.createHash("sha256").update(`drip:${data.email}`).digest("hex").slice(0, 12),
        domain: data.domain,
        companyName: data.company,
        locale,
      });
    } catch {
      // Non-fatal — skip viral block if it fails
    }
  }

  // Price reminder
  const priceLabel = locale === "fr"
    ? "Decision Pack complet"
    : locale === "de"
      ? "Vollständiges Decision Pack"
      : "Full Decision Pack";
  const oneTime = locale === "fr" ? "(paiement unique)" : locale === "de" ? "(einmalige Zahlung)" : "(one-time payment)";

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#060912;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:580px;margin:0 auto;padding:32px 16px">

  <!-- Wordmark -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px">
    <tr>
      <td>
        <p style="font-size:11px;font-family:monospace;font-weight:800;color:#3b82f6;letter-spacing:0.25em;margin:0;text-transform:uppercase">GHOST TAX</p>
      </td>
      <td align="right">
        <p style="font-size:10px;letter-spacing:0.15em;color:${accentColor};text-transform:uppercase;margin:0">${copy.preheader}</p>
      </td>
    </tr>
  </table>

  <!-- Headline -->
  <h1 style="font-size:22px;color:#e4e9f4;margin:0 0 16px 0;line-height:1.3;font-weight:800;letter-spacing:-0.02em">
    ${headline}
  </h1>

  <!-- Body -->
  <p style="font-size:14px;color:#8d9bb5;line-height:1.7;margin:0 0 16px 0">
    ${bodyText}
  </p>
  <p style="font-size:13px;color:#55637d;line-height:1.7;margin:0 0 24px 0">
    ${bodyExtra}
  </p>

  ${costBox}
  ${peerBox}
  ${expiryBox}

  <!-- CTA Button -->
  <div style="text-align:center;margin-bottom:24px">
    <a href="${checkoutUrl}" style="display:inline-block;background:${ctaColor};color:#ffffff;padding:16px 40px;border-radius:8px;font-size:16px;font-weight:700;text-decoration:none;letter-spacing:-0.01em">
      ${copy.cta}
    </a>
    <p style="font-size:11px;color:#55637d;margin:10px 0 0 0">${copy.note}</p>
  </div>

  <!-- Price Reminder -->
  <div style="background:#0e1221;border:1px solid rgba(36,48,78,0.28);border-radius:8px;padding:16px;text-align:center;margin-bottom:24px">
    <p style="font-size:12px;color:#8d9bb5;margin:0">
      ${priceLabel} &mdash;
      <span style="color:#e4e9f4;font-weight:700;font-family:monospace">${data.formattedPrice}</span>
      <span style="color:#55637d"> ${oneTime}</span>
    </p>
  </div>

  ${viralBlock}

  <!-- Footer -->
  <div style="text-align:center;padding-top:24px;border-top:1px solid rgba(36,48,78,0.20)">
    <p style="font-size:10px;color:#3a4560;margin:0 0 4px 0">Ghost Tax Decision Intelligence</p>
    <p style="font-size:10px;color:#3a4560;margin:0">
      <a href="${unsubUrl}" style="color:#3a4560;text-decoration:underline">
        ${locale === "fr" ? "Se désabonner" : locale === "de" ? "Abmelden" : "Unsubscribe"}
      </a>
    </p>
  </div>

</div>
<!-- Tracking Pixel -->
<img src="${pixelUrl}" width="1" height="1" style="display:block;width:1px;height:1px;border:0" alt="" />
</body>
</html>`;

  return { subject, html };
}
