/**
 * GHOST TAX -- CHECKOUT RECOVERY ENGINE (SERVER-ONLY)
 *
 * Automated recovery of abandoned Stripe checkout sessions.
 * When someone starts checkout but doesn't complete payment,
 * we send a 3-step recovery sequence:
 *
 *   Step 1 (1h):  "Your analysis is ready -- complete payment"
 *   Step 2 (24h): "While you wait, $X/day is leaking from [Company]"
 *   Step 3 (72h): "Last chance -- your scan data expires soon"
 *
 * LOGIC:
 *   1. Query Stripe for recent checkout sessions (open/expired)
 *   2. Cross-reference with audit_requests status "pending"
 *   3. Determine recovery step based on elapsed time
 *   4. Send locale-aware emails (EN/FR/DE) with correct currency
 *   5. Track attempts in session_data to prevent duplicates
 *   6. Skip anyone who has since paid
 *
 * Uses:
 *   - createAdminSupabase() for database queries
 *   - Resend API (fetch) for sending
 *   - Stripe API for session listing
 *   - Pricing from lib/pricing.ts
 */

import { createAdminSupabase } from "@/lib/supabase";
import { getStripe } from "@/lib/stripe";
import {
  getRailAPrice,
  getCurrencySymbol,
  type PricingLocale,
} from "@/lib/pricing";

// ── Types ─────────────────────────────────────────────

export interface RecoveryResult {
  processed: number;
  recovered: number;
  emailsSent: number;
  skipped: number;
  errors: number;
  details: RecoveryAction[];
}

export interface RecoveryAction {
  email: string;
  company: string;
  step: 1 | 2 | 3;
  action:
    | "sent"
    | "skipped_already_sent"
    | "skipped_converted"
    | "skipped_unsubscribed"
    | "error";
  error?: string;
}

// ── Constants ─────────────────────────────────────────

const STEP_THRESHOLDS_MS = {
  1: 1 * 60 * 60 * 1000,       // 1 hour
  2: 24 * 60 * 60 * 1000,      // 24 hours
  3: 72 * 60 * 60 * 1000,      // 72 hours
} as const;

/** Max age of sessions to consider (7 days) */
const MAX_SESSION_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ghost-tax.com";

// ── Main Entry Point ──────────────────────────────────

export async function runCheckoutRecovery(): Promise<RecoveryResult> {
  const result: RecoveryResult = {
    processed: 0,
    recovered: 0,
    emailsSent: 0,
    skipped: 0,
    errors: 0,
    details: [],
  };

  const db = createAdminSupabase();
  if (!db) {
    console.error("[Checkout Recovery] Database not configured");
    return result;
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn("[Checkout Recovery] RESEND_API_KEY not set -- dry run only");
  }

  // ── Step 1: Get recent abandoned Stripe sessions ──
  let abandonedSessions: AbandonedSession[];
  try {
    abandonedSessions = await fetchAbandonedSessions();
  } catch (err) {
    console.error("[Checkout Recovery] Failed to fetch Stripe sessions:", err);
    return result;
  }

  if (abandonedSessions.length === 0) {
    console.log("[Checkout Recovery] No abandoned sessions found");
    return result;
  }

  // ── Step 2: Cross-reference with audit_requests ──
  // Get all emails from abandoned sessions to check conversion status
  const emails = [...new Set(abandonedSessions.map((s) => s.email).filter(Boolean))] as string[];

  // Fetch paid/delivered audit_requests for these emails
  const { data: paidRequests } = await (db as any)
    .from("audit_requests")
    .select("email, status")
    .in("email", emails)
    .in("status", ["paid", "processing", "report_persisted", "delivered", "followup_scheduled"]);

  const paidEmails = new Set((paidRequests || []).map((r: any) => r.email));

  // Fetch unsubscribed emails from vault_sessions
  const { data: unsubscribed } = await (db as any)
    .from("vault_sessions")
    .select("email, session_data")
    .in("email", emails);

  const unsubscribedEmails = new Set(
    (unsubscribed || [])
      .filter((s: any) => s.session_data?.unsubscribed === true)
      .map((s: any) => s.email)
  );

  // Fetch existing recovery tracking data
  const { data: existingSessions } = await (db as any)
    .from("vault_sessions")
    .select("email, session_data")
    .in("email", emails);

  const recoveryTracking = new Map<string, RecoveryTracker>(
    (existingSessions || []).map((s: any) => [
      s.email,
      s.session_data?.checkout_recovery || {},
    ])
  );

  // ── Step 3: Process each abandoned session ──
  for (const session of abandonedSessions) {
    result.processed++;

    if (!session.email) {
      result.skipped++;
      continue;
    }

    const company = session.companyName || session.domain || "your company";
    const elapsed = Date.now() - session.createdAt;

    // Determine which step to send
    const step = getRecoveryStep(elapsed);
    if (!step) {
      result.skipped++;
      continue;
    }

    // Check if already converted
    if (paidEmails.has(session.email)) {
      result.skipped++;
      result.details.push({
        email: session.email,
        company,
        step,
        action: "skipped_converted",
      });
      continue;
    }

    // Check if unsubscribed
    if (unsubscribedEmails.has(session.email)) {
      result.skipped++;
      result.details.push({
        email: session.email,
        company,
        step,
        action: "skipped_unsubscribed",
      });
      continue;
    }

    // Check if this step was already sent
    const tracker = recoveryTracking.get(session.email) || {};
    if (tracker[`step_${step}_sent`]) {
      result.skipped++;
      result.details.push({
        email: session.email,
        company,
        step,
        action: "skipped_already_sent",
      });
      continue;
    }

    // ── Send the recovery email ──
    try {
      const locale = detectLocale(session);
      const price = getRailAPrice(session.headcount, locale);
      const symbol = getCurrencySymbol(locale);
      const dailyLeak = estimateDailyLeak(session);
      const daysSinceCheckout = Math.floor(elapsed / (24 * 60 * 60 * 1000));

      const { subject, html } = buildRecoveryEmail({
        step,
        locale,
        company,
        email: session.email,
        domain: session.domain,
        price,
        symbol,
        dailyLeak,
        daysSinceCheckout,
        checkoutSessionId: session.stripeSessionId,
        rail: session.rail,
        headcount: session.headcount,
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
            to: [session.email],
            subject,
            html,
          }),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "Unknown");
          throw new Error(`Resend ${res.status}: ${errText}`);
        }
      } else {
        console.log(`[Checkout Recovery] [DRY RUN] Would send step ${step} to ${session.email}`);
      }

      // Track the send in session_data
      await trackRecoverySend(db, session.email, step);

      result.emailsSent++;
      result.details.push({
        email: session.email,
        company,
        step,
        action: "sent",
      });

      // ── BRIDGE: checkout_abandoned → Founder Mission Control (step 1 only) ──
      if (step === 1) {
        const commandSecret = process.env.COMMAND_SECRET;
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ghost-tax.com";
        if (commandSecret && session.domain) {
          fetch(`${siteUrl}/api/command/ingest?key=${commandSecret}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "checkout_abandoned",
              domain: session.domain,
              email: session.email,
              companyName: session.companyName || undefined,
              headcount: session.headcount || undefined,
            }),
          }).catch(() => { /* bridge failure is non-fatal */ });
        }
      }
    } catch (err) {
      result.errors++;
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`[Checkout Recovery] Error sending step ${step} to ${session.email}:`, message);
      result.details.push({
        email: session.email,
        company,
        step,
        action: "error",
        error: message,
      });
    }
  }

  return result;
}

// ── Internal Types ────────────────────────────────────

interface AbandonedSession {
  stripeSessionId: string;
  email: string | null;
  domain: string | null;
  companyName: string | null;
  headcount: number | undefined;
  monthlySpendEur: number | undefined;
  locale: string | null;
  rail: string;
  createdAt: number; // ms timestamp
}

interface RecoveryTracker {
  [key: string]: boolean | string | undefined;
  step_1_sent?: boolean;
  step_1_at?: string;
  step_2_sent?: boolean;
  step_2_at?: string;
  step_3_sent?: boolean;
  step_3_at?: string;
}

interface RecoveryEmailParams {
  step: 1 | 2 | 3;
  locale: PricingLocale;
  company: string;
  email: string;
  domain: string | null;
  price: number;
  symbol: string;
  dailyLeak: number;
  daysSinceCheckout: number;
  checkoutSessionId: string;
  rail: string;
  headcount: number | undefined;
}

// ── Stripe Session Fetcher ────────────────────────────

async function fetchAbandonedSessions(): Promise<AbandonedSession[]> {
  const stripe = getStripe();
  const sessions: AbandonedSession[] = [];

  const cutoff = Math.floor((Date.now() - MAX_SESSION_AGE_MS) / 1000);

  // Fetch open sessions (checkout started, not completed)
  const openSessions = await stripe.checkout.sessions.list({
    limit: 100,
    status: "open",
    created: { gte: cutoff },
  });

  // Fetch expired sessions
  const expiredSessions = await stripe.checkout.sessions.list({
    limit: 100,
    status: "expired",
    created: { gte: cutoff },
  });

  const allSessions = [...openSessions.data, ...expiredSessions.data];

  for (const s of allSessions) {
    // Only process sessions with our metadata (domain/rail)
    if (!s.metadata?.rail) continue;

    sessions.push({
      stripeSessionId: s.id,
      email: s.customer_email || s.customer_details?.email || null,
      domain: s.metadata.domain || null,
      companyName: s.metadata.companyName || null,
      headcount: s.metadata.headcount ? parseInt(s.metadata.headcount) : undefined,
      monthlySpendEur: s.metadata.monthlySpendEur
        ? parseFloat(s.metadata.monthlySpendEur)
        : undefined,
      locale: s.metadata.locale || null,
      rail: s.metadata.rail,
      createdAt: s.created * 1000,
    });
  }

  return sessions;
}

// ── Recovery Step Logic ───────────────────────────────

function getRecoveryStep(elapsedMs: number): 1 | 2 | 3 | null {
  // Must be at least 1h old for step 1
  if (elapsedMs < STEP_THRESHOLDS_MS[1]) return null;

  // Determine highest eligible step
  if (elapsedMs >= STEP_THRESHOLDS_MS[3]) return 3;
  if (elapsedMs >= STEP_THRESHOLDS_MS[2]) return 2;
  return 1;
}

// ── Locale Detection ──────────────────────────────────

function detectLocale(session: AbandonedSession): PricingLocale {
  // 1. Explicit locale from session
  if (session.locale === "fr" || session.locale === "de" || session.locale === "en") {
    return session.locale;
  }

  // 2. Domain TLD fallback
  if (session.domain) {
    const tld = session.domain.split(".").pop()?.toLowerCase();
    if (tld === "de" || tld === "at" || tld === "ch") return "de";
    if (tld === "fr" || tld === "be") return "fr";
  }

  return "en";
}

// ── Daily Leak Estimator ──────────────────────────────

function estimateDailyLeak(session: AbandonedSession): number {
  // Use monthly spend to estimate daily leak (8-15% annual waste is typical)
  if (session.monthlySpendEur) {
    const annualSpend = session.monthlySpendEur * 12;
    const estimatedWaste = annualSpend * 0.12; // 12% midpoint
    return Math.round(estimatedWaste / 365);
  }

  // Fallback: estimate from headcount
  if (session.headcount) {
    // ~2,000 EUR/employee/year in SaaS is typical mid-market
    const estimatedAnnualSpend = session.headcount * 2000;
    const estimatedWaste = estimatedAnnualSpend * 0.12;
    return Math.round(estimatedWaste / 365);
  }

  // Default fallback
  return 274; // ~100k EUR/year / 365
}

// ── Recovery Tracking ─────────────────────────────────

async function trackRecoverySend(
  db: any,
  email: string,
  step: 1 | 2 | 3,
): Promise<void> {
  // Fetch current session_data
  const { data: existing } = await (db as any)
    .from("vault_sessions")
    .select("id, session_data")
    .eq("email", email)
    .limit(1)
    .single();

  const now = new Date().toISOString();
  const recovery = existing?.session_data?.checkout_recovery || {};
  recovery[`step_${step}_sent`] = true;
  recovery[`step_${step}_at`] = now;

  if (existing) {
    await (db as any)
      .from("vault_sessions")
      .update({
        session_data: {
          ...existing.session_data,
          checkout_recovery: recovery,
        },
      })
      .eq("id", existing.id);
  }
}

// ── Email Formatting ──────────────────────────────────

function fmtAmount(n: number, symbol: string): string {
  if (symbol === "$") {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 10_000) return `$${Math.round(n / 1000)}k`;
    return `$${Math.round(n).toLocaleString("en-US")}`;
  }
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M \u20AC`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k \u20AC`;
  return `${Math.round(n).toLocaleString("de-DE")} \u20AC`;
}

// ── Tri-Lingual Copy ──────────────────────────────────

const COPY = {
  en: {
    step1: {
      preheader: "CHECKOUT RECOVERY",
      subject: (company: string) =>
        `Your ${company} analysis is ready -- complete payment`,
      headline: (company: string) =>
        `Your analysis of ${company} is ready`,
      body: (price: string) =>
        `You started the checkout process but didn't complete it. Your scan data is still available and your analysis can be delivered immediately upon payment of ${price}.`,
      cta: "Complete Payment",
      note: "Instant delivery. No call required.",
    },
    step2: {
      preheader: "COST OF WAITING",
      subject: (company: string, dailyLeak: string) =>
        `While you wait, ${dailyLeak}/day is leaking from ${company}`,
      headline: (company: string) =>
        `Every day costs ${company} real money`,
      body: (dailyLeak: string, days: number, totalLost: string) =>
        `It has been ${days} day${days > 1 ? "s" : ""} since you started checkout. At an estimated ${dailyLeak}/day in hidden exposure, that's approximately ${totalLost} lost since then. Your scan data is still here.`,
      cta: "Stop the Bleeding",
      note: "The longer you wait, the more it costs.",
    },
    step3: {
      preheader: "FINAL NOTICE",
      subject: (company: string) =>
        `Last chance -- your ${company} scan data expires soon`,
      headline: () =>
        `Your scan data is expiring`,
      body: (company: string) =>
        `We ran a full enrichment scan on ${company} and the data is still waiting. However, scan data has a limited shelf life -- market conditions and vendor pricing shift constantly. After expiration, you would need a fresh scan. This is your last recovery notice.`,
      cta: "Complete Now Before Expiry",
      note: "After this, your scan data will be purged.",
    },
  },
  fr: {
    step1: {
      preheader: "RECUPERATION CHECKOUT",
      subject: (company: string) =>
        `Votre analyse de ${company} est pr\u00eate -- finalisez le paiement`,
      headline: (company: string) =>
        `Votre analyse de ${company} est pr\u00eate`,
      body: (price: string) =>
        `Vous avez commenc\u00e9 le processus de paiement sans le finaliser. Vos donn\u00e9es de scan sont toujours disponibles et votre analyse sera livr\u00e9e imm\u00e9diatement apr\u00e8s paiement de ${price}.`,
      cta: "Finaliser le Paiement",
      note: "Livraison instantan\u00e9e. Aucun appel requis.",
    },
    step2: {
      preheader: "COUT DE L'ATTENTE",
      subject: (company: string, dailyLeak: string) =>
        `Pendant que vous attendez, ${dailyLeak}/jour fuit de ${company}`,
      headline: (company: string) =>
        `Chaque jour co\u00fbte de l'argent r\u00e9el \u00e0 ${company}`,
      body: (dailyLeak: string, days: number, totalLost: string) =>
        `Cela fait ${days} jour${days > 1 ? "s" : ""} depuis votre d\u00e9but de checkout. \u00c0 un taux estim\u00e9 de ${dailyLeak}/jour d'exposition cach\u00e9e, cela repr\u00e9sente environ ${totalLost} perdus depuis. Vos donn\u00e9es de scan sont toujours l\u00e0.`,
      cta: "Arr\u00eater l'H\u00e9morragie",
      note: "Plus vous attendez, plus \u00e7a co\u00fbte.",
    },
    step3: {
      preheader: "DERNIER AVIS",
      subject: (company: string) =>
        `Derni\u00e8re chance -- vos donn\u00e9es de scan de ${company} expirent bient\u00f4t`,
      headline: () =>
        `Vos donn\u00e9es de scan expirent`,
      body: (company: string) =>
        `Nous avons effectu\u00e9 un scan d'enrichissement complet sur ${company} et les donn\u00e9es attendent toujours. Cependant, les donn\u00e9es de scan ont une dur\u00e9e de vie limit\u00e9e -- les conditions de march\u00e9 et les tarifs fournisseurs \u00e9voluent constamment. Apr\u00e8s expiration, un nouveau scan sera n\u00e9cessaire. Ceci est votre dernier avis de r\u00e9cup\u00e9ration.`,
      cta: "Finaliser Avant Expiration",
      note: "Apr\u00e8s cela, vos donn\u00e9es seront purg\u00e9es.",
    },
  },
  de: {
    step1: {
      preheader: "CHECKOUT-WIEDERHERSTELLUNG",
      subject: (company: string) =>
        `Ihre ${company}-Analyse ist bereit -- Zahlung abschlie\u00dfen`,
      headline: (company: string) =>
        `Ihre Analyse von ${company} ist bereit`,
      body: (price: string) =>
        `Sie haben den Bezahlvorgang begonnen, aber nicht abgeschlossen. Ihre Scan-Daten sind noch verf\u00fcgbar und Ihre Analyse wird sofort nach Zahlung von ${price} geliefert.`,
      cta: "Zahlung Abschlie\u00dfen",
      note: "Sofortige Lieferung. Kein Anruf erforderlich.",
    },
    step2: {
      preheader: "KOSTEN DES WARTENS",
      subject: (company: string, dailyLeak: string) =>
        `W\u00e4hrend Sie warten, verliert ${company} ${dailyLeak}/Tag`,
      headline: (company: string) =>
        `Jeder Tag kostet ${company} echtes Geld`,
      body: (dailyLeak: string, days: number, totalLost: string) =>
        `Es sind ${days} Tag${days > 1 ? "e" : ""} seit Ihrem Checkout-Start vergangen. Bei gesch\u00e4tzten ${dailyLeak}/Tag an versteckter Exposition sind das ca. ${totalLost} seitdem verloren. Ihre Scan-Daten sind noch da.`,
      cta: "Verluste Stoppen",
      note: "Je l\u00e4nger Sie warten, desto mehr kostet es.",
    },
    step3: {
      preheader: "LETZTE BENACHRICHTIGUNG",
      subject: (company: string) =>
        `Letzte Chance -- Ihre ${company}-Scan-Daten laufen bald ab`,
      headline: () =>
        `Ihre Scan-Daten laufen ab`,
      body: (company: string) =>
        `Wir haben einen vollst\u00e4ndigen Enrichment-Scan f\u00fcr ${company} durchgef\u00fchrt und die Daten warten noch. Scan-Daten haben jedoch eine begrenzte Haltbarkeit -- Marktbedingungen und Anbieterpreise \u00e4ndern sich st\u00e4ndig. Nach Ablauf w\u00e4re ein neuer Scan erforderlich. Dies ist Ihre letzte Wiederherstellungsbenachrichtigung.`,
      cta: "Jetzt Abschlie\u00dfen",
      note: "Danach werden Ihre Scan-Daten gel\u00f6scht.",
    },
  },
} as const;

// ── Email Builder ─────────────────────────────────────

function buildRecoveryEmail(params: RecoveryEmailParams): {
  subject: string;
  html: string;
} {
  const {
    step,
    locale,
    company,
    domain,
    price,
    symbol,
    dailyLeak,
    daysSinceCheckout,
    rail,
    headcount,
  } = params;

  const copy = COPY[locale][`step${step}`];
  const formattedPrice = fmtAmount(price, symbol);
  const formattedDailyLeak = fmtAmount(dailyLeak, symbol);
  const totalLost = fmtAmount(dailyLeak * Math.max(daysSinceCheckout, 1), symbol);

  // Build checkout resume URL with pre-filled data
  const checkoutUrl = new URL(`${SITE_URL}/pricing`);
  checkoutUrl.searchParams.set("ref", "recovery");
  checkoutUrl.searchParams.set("step", String(step));
  if (domain) checkoutUrl.searchParams.set("domain", domain);
  if (rail) checkoutUrl.searchParams.set("rail", rail);
  if (headcount) checkoutUrl.searchParams.set("headcount", String(headcount));

  // Subject line
  let subject: string;
  if (step === 2 && "subject" in copy && typeof copy.subject === "function") {
    subject = (copy.subject as (c: string, d: string) => string)(company, formattedDailyLeak);
  } else if ("subject" in copy && typeof copy.subject === "function") {
    subject = (copy.subject as (c: string) => string)(company);
  } else {
    subject = `${company} — Complete your analysis`;
  }

  // CTA color by step
  const ctaColor =
    step === 1 ? "#3b82f6" : step === 2 ? "#D97706" : "#DC2626";
  const borderAccent =
    step === 1
      ? "rgba(59,130,246,0.15)"
      : step === 2
        ? "rgba(217,119,6,0.15)"
        : "rgba(220,38,38,0.15)";

  // Build body text
  let bodyText: string;
  if (step === 1) {
    bodyText = (copy as typeof COPY["en"]["step1"]).body(formattedPrice);
  } else if (step === 2) {
    bodyText = (copy as typeof COPY["en"]["step2"]).body(
      formattedDailyLeak,
      Math.max(daysSinceCheckout, 1),
      totalLost,
    );
  } else {
    bodyText = (copy as typeof COPY["en"]["step3"]).body(company);
  }

  // Headline
  const headline =
    step === 3
      ? (copy as typeof COPY["en"]["step3"]).headline()
      : (copy as typeof COPY["en"]["step1"]).headline(company);

  // Cost-of-delay math for step 2: weekly + monthly + quarterly projections
  const weeklyLeak = fmtAmount(dailyLeak * 7, symbol);
  const monthlyLeak = fmtAmount(dailyLeak * 30, symbol);
  const quarterlyLeak = fmtAmount(dailyLeak * 90, symbol);

  // Social proof copy (tri-lingual)
  const socialProof = {
    en: {
      label: "TRUSTED BY DECISION-MAKERS ACROSS EUROPE",
      stat1: "200+ audits delivered",
      stat2: "Average exposure detected",
      stat2val: "127k\u2013340k EUR/yr",
      stat3: "Median time to first corrective action",
      stat3val: "< 14 days",
    },
    fr: {
      label: "RECONNU PAR LES D\u00c9CIDEURS \u00c0 TRAVERS L\u2019EUROPE",
      stat1: "200+ audits r\u00e9alis\u00e9s",
      stat2: "Exposition moyenne d\u00e9tect\u00e9e",
      stat2val: "127k\u2013340k EUR/an",
      stat3: "D\u00e9lai m\u00e9dian avant premi\u00e8re action corrective",
      stat3val: "< 14 jours",
    },
    de: {
      label: "VERTRAUT VON ENTSCHEIDUNGSTR\u00c4GERN IN GANZ EUROPA",
      stat1: "200+ Audits durchgef\u00fchrt",
      stat2: "Durchschnittlich erkannte Exposition",
      stat2val: "127k\u2013340k EUR/Jahr",
      stat3: "Medianzeit bis zur ersten Korrekturma\u00dfnahme",
      stat3val: "< 14 Tage",
    },
  }[locale];

  // Trust signals (tri-lingual)
  const trustSignals = {
    en: {
      soc2: "SOC 2 Type II in progress",
      gdpr: "GDPR compliant \u2014 EU data processing",
      purge: "Scan data auto-purged after 30 days",
      noCall: "No call required \u2014 instant delivery",
    },
    fr: {
      soc2: "SOC 2 Type II en cours",
      gdpr: "Conforme RGPD \u2014 traitement des donn\u00e9es en UE",
      purge: "Donn\u00e9es de scan purg\u00e9es automatiquement apr\u00e8s 30 jours",
      noCall: "Aucun appel requis \u2014 livraison instantan\u00e9e",
    },
    de: {
      soc2: "SOC 2 Type II in Vorbereitung",
      gdpr: "DSGVO-konform \u2014 EU-Datenverarbeitung",
      purge: "Scan-Daten werden nach 30 Tagen automatisch gel\u00f6scht",
      noCall: "Kein Anruf erforderlich \u2014 sofortige Lieferung",
    },
  }[locale];

  // Company signature (tri-lingual)
  const companyTagline = {
    en: "Decision Intelligence for IT Spend",
    fr: "Intelligence D\u00e9cisionnelle pour les D\u00e9penses IT",
    de: "Entscheidungsintelligenz f\u00fcr IT-Ausgaben",
  }[locale];

  // Cost-of-delay labels for step 2
  const delayLabels = {
    en: {
      header: "COST-OF-DELAY PROJECTION",
      subheader: "Every day your organization delays costs real money",
      perDay: "Per day",
      perWeek: "Per week",
      perMonth: "Per month",
      perQuarter: "Per quarter",
      footnote: "Based on industry benchmarks: 8\u201315% of annual IT spend is typically undetected exposure. Your actual figure may be higher.",
    },
    fr: {
      header: "PROJECTION DU CO\u00dbT DE L\u2019INACTION",
      subheader: "Chaque jour de d\u00e9lai co\u00fbte de l\u2019argent r\u00e9el \u00e0 votre organisation",
      perDay: "Par jour",
      perWeek: "Par semaine",
      perMonth: "Par mois",
      perQuarter: "Par trimestre",
      footnote: "Bas\u00e9 sur les benchmarks sectoriels : 8\u201315% des d\u00e9penses IT annuelles correspondent typiquement \u00e0 une exposition non d\u00e9tect\u00e9e. Votre chiffre r\u00e9el pourrait \u00eatre sup\u00e9rieur.",
    },
    de: {
      header: "KOSTEN-DER-VERZ\u00d6GERUNG-PROGNOSE",
      subheader: "Jeder Tag Verz\u00f6gerung kostet Ihre Organisation echtes Geld",
      perDay: "Pro Tag",
      perWeek: "Pro Woche",
      perMonth: "Pro Monat",
      perQuarter: "Pro Quartal",
      footnote: "Basierend auf Branchen-Benchmarks: 8\u201315% der j\u00e4hrlichen IT-Ausgaben sind typischerweise unentdeckte Exposition. Ihre tats\u00e4chliche Zahl k\u00f6nnte h\u00f6her sein.",
    },
  }[locale];

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">

<!-- Invisible preheader text for email clients -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">
  ${copy.preheader} — ${company}
</div>

<div style="max-width:600px;margin:0 auto;padding:40px 24px;background:#FFFFFF">

  <!-- Header bar -->
  <div style="border-bottom:1px solid #E2E8F0;padding-bottom:20px;margin-bottom:32px">
    <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td>
        <p style="font-size:13px;font-weight:700;color:#0F172A;letter-spacing:0.06em;margin:0;font-family:'SF Mono',SFMono-Regular,Consolas,'Liberation Mono',Menlo,monospace">GHOST TAX</p>
      </td>
      <td style="text-align:right">
        <p style="font-size:10px;letter-spacing:0.15em;color:${ctaColor};text-transform:uppercase;margin:0">${copy.preheader}</p>
      </td>
    </tr></table>
  </div>

  <!-- Headline -->
  <h1 style="font-size:24px;color:#0F172A;margin:0 0 20px 0;line-height:1.35;font-weight:800;letter-spacing:-0.02em">
    ${headline}
  </h1>

  <!-- Body -->
  <p style="font-size:15px;color:#475569;line-height:1.75;margin:0 0 28px 0">
    ${bodyText}
  </p>

  ${step === 2 ? `
  <!-- Cost-of-Delay Projection (Step 2 only) -->
  <div style="background:#F8FAFC;border:1px solid rgba(217,119,6,0.20);border-radius:12px;padding:28px;margin-bottom:28px">
    <p style="font-size:10px;color:#D97706;letter-spacing:0.15em;margin:0 0 6px 0;text-transform:uppercase;font-weight:600">
      ${delayLabels.header}
    </p>
    <p style="font-size:13px;color:#475569;margin:0 0 20px 0;line-height:1.5">
      ${delayLabels.subheader}
    </p>

    <!-- Projection grid -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse">
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #E2E8F0">
          <p style="font-size:11px;color:#64748B;margin:0;text-transform:uppercase;letter-spacing:0.08em">${delayLabels.perDay}</p>
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #E2E8F0;text-align:right">
          <p style="font-size:18px;font-family:'SF Mono',SFMono-Regular,Consolas,monospace;font-weight:700;color:#D97706;margin:0">${formattedDailyLeak}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #E2E8F0">
          <p style="font-size:11px;color:#64748B;margin:0;text-transform:uppercase;letter-spacing:0.08em">${delayLabels.perWeek}</p>
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #E2E8F0;text-align:right">
          <p style="font-size:18px;font-family:'SF Mono',SFMono-Regular,Consolas,monospace;font-weight:700;color:#D97706;margin:0">${weeklyLeak}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #E2E8F0">
          <p style="font-size:11px;color:#64748B;margin:0;text-transform:uppercase;letter-spacing:0.08em">${delayLabels.perMonth}</p>
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #E2E8F0;text-align:right">
          <p style="font-size:20px;font-family:'SF Mono',SFMono-Regular,Consolas,monospace;font-weight:800;color:#0F172A;margin:0">${monthlyLeak}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 16px">
          <p style="font-size:11px;color:#64748B;margin:0;text-transform:uppercase;letter-spacing:0.08em">${delayLabels.perQuarter}</p>
        </td>
        <td style="padding:12px 16px;text-align:right">
          <p style="font-size:22px;font-family:'SF Mono',SFMono-Regular,Consolas,monospace;font-weight:900;color:#DC2626;margin:0">${quarterlyLeak}</p>
        </td>
      </tr>
    </table>

    <p style="font-size:11px;color:#94A3B8;margin:16px 0 0 0;line-height:1.5;font-style:italic">
      ${delayLabels.footnote}
    </p>
  </div>

  <!-- Accumulated loss callout -->
  <div style="background:#F1F5F9;border:2px solid rgba(217,119,6,0.30);border-radius:12px;padding:24px;text-align:center;margin-bottom:28px">
    <p style="font-size:10px;color:#D97706;letter-spacing:0.12em;margin:0 0 8px 0;text-transform:uppercase;font-weight:600">
      ${locale === "fr" ? "PERTE ACCUMUL\u00c9E DEPUIS VOTRE CHECKOUT" : locale === "de" ? "AUFGELAUFENER VERLUST SEIT CHECKOUT" : "ACCUMULATED LOSS SINCE YOUR CHECKOUT"}
    </p>
    <p style="font-size:36px;font-family:'SF Mono',SFMono-Regular,Consolas,monospace;font-weight:900;color:#D97706;margin:0;letter-spacing:-0.02em">
      ${totalLost}
    </p>
    <p style="font-size:12px;color:#64748B;margin:8px 0 0 0">
      ${formattedDailyLeak}/${locale === "fr" ? "jour" : locale === "de" ? "Tag" : "day"} \u00d7 ${Math.max(daysSinceCheckout, 1)} ${locale === "fr" ? "jours" : locale === "de" ? "Tage" : "days"}
    </p>
  </div>` : ""}

  ${step === 3 ? `
  <!-- Social Proof (Step 3 only) -->
  <div style="background:#F8FAFC;border:1px solid rgba(59,130,246,0.15);border-radius:12px;padding:28px;margin-bottom:28px">
    <p style="font-size:10px;color:#3b82f6;letter-spacing:0.15em;margin:0 0 20px 0;text-transform:uppercase;font-weight:600">
      ${socialProof.label}
    </p>

    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse">
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #E2E8F0">
          <p style="font-size:13px;color:#475569;margin:0">${socialProof.stat1}</p>
        </td>
        <td style="padding:14px 0;border-bottom:1px solid #E2E8F0;text-align:right">
          <p style="font-size:20px;font-family:'SF Mono',SFMono-Regular,Consolas,monospace;font-weight:800;color:#059669;margin:0">200+</p>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #E2E8F0">
          <p style="font-size:13px;color:#475569;margin:0">${socialProof.stat2}</p>
        </td>
        <td style="padding:14px 0;border-bottom:1px solid #E2E8F0;text-align:right">
          <p style="font-size:16px;font-family:'SF Mono',SFMono-Regular,Consolas,monospace;font-weight:700;color:#0F172A;margin:0">${socialProof.stat2val}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 0">
          <p style="font-size:13px;color:#475569;margin:0">${socialProof.stat3}</p>
        </td>
        <td style="padding:14px 0;text-align:right">
          <p style="font-size:16px;font-family:'SF Mono',SFMono-Regular,Consolas,monospace;font-weight:700;color:#0F172A;margin:0">${socialProof.stat3val}</p>
        </td>
      </tr>
    </table>
  </div>

  <!-- Urgency Box -->
  <div style="background:#F1F5F9;border:2px solid ${borderAccent};border-radius:12px;padding:24px;text-align:center;margin-bottom:28px">
    <p style="font-size:10px;color:#DC2626;letter-spacing:0.12em;margin:0 0 8px 0;text-transform:uppercase;font-weight:600">
      ${locale === "fr" ? "EXPIRATION IMMINENTE" : locale === "de" ? "ABLAUF STEHT BEVOR" : "EXPIRING SOON"}
    </p>
    <p style="font-size:18px;font-family:'SF Mono',SFMono-Regular,Consolas,monospace;font-weight:700;color:#DC2626;margin:0">
      ${locale === "fr" ? "Donn\u00e9es de scan expireront sous 48h" : locale === "de" ? "Scan-Daten laufen in 48h ab" : "Scan data expires in 48 hours"}
    </p>
  </div>` : ""}

  <!-- CTA Button -->
  <div style="text-align:center;margin-bottom:28px">
    <a href="${checkoutUrl.toString()}" style="display:inline-block;background:${ctaColor};color:#fff;padding:18px 48px;border-radius:8px;font-size:16px;font-weight:700;text-decoration:none;letter-spacing:-0.01em;box-shadow:0 1px 3px rgba(0,0,0,0.06)">
      ${copy.cta} \u2192
    </a>
    <p style="font-size:11px;color:#64748B;margin:12px 0 0 0">${copy.note}</p>
  </div>

  <!-- Price reminder -->
  <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:18px;text-align:center;margin-bottom:32px">
    <p style="font-size:13px;color:#475569;margin:0">
      ${locale === "fr" ? "Rapport complet d\u2019exposition financi\u00e8re" : locale === "de" ? "Vollst\u00e4ndiger Finanz-Expositionsbericht" : "Full Financial Exposure Report"} &mdash;
      <span style="color:#0F172A;font-weight:700;font-family:'SF Mono',SFMono-Regular,Consolas,monospace">${formattedPrice}</span>
      <span style="color:#64748B"> ${locale === "fr" ? "(paiement unique)" : locale === "de" ? "(einmalige Zahlung)" : "(one-time payment)"}</span>
    </p>
  </div>

  <!-- Trust Signals -->
  <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:18px 20px;margin-bottom:32px">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td style="padding:4px 0"><p style="font-size:11px;color:#64748B;margin:0">\u2713&nbsp;&nbsp;${trustSignals.soc2}</p></td>
      </tr>
      <tr>
        <td style="padding:4px 0"><p style="font-size:11px;color:#64748B;margin:0">\u2713&nbsp;&nbsp;${trustSignals.gdpr}</p></td>
      </tr>
      <tr>
        <td style="padding:4px 0"><p style="font-size:11px;color:#64748B;margin:0">\u2713&nbsp;&nbsp;${trustSignals.purge}</p></td>
      </tr>
      <tr>
        <td style="padding:4px 0"><p style="font-size:11px;color:#64748B;margin:0">\u2713&nbsp;&nbsp;${trustSignals.noCall}</p></td>
      </tr>
    </table>
  </div>

  <!-- Footer -->
  <div style="text-align:center;padding-top:24px;border-top:1px solid #E2E8F0">
    <p style="font-size:12px;font-weight:700;color:#475569;margin:0 0 4px 0;letter-spacing:0.02em">Ghost Tax SAS</p>
    <p style="font-size:11px;color:#64748B;margin:0 0 12px 0">${companyTagline}</p>
    <p style="font-size:10px;color:#94A3B8;margin:0 0 4px 0">
      <a href="${SITE_URL}" style="color:#94A3B8;text-decoration:none">ghost-tax.com</a>
    </p>
    <p style="font-size:10px;color:#94A3B8;margin:0">
      <a href="${SITE_URL}/unsubscribe?email=${encodeURIComponent(params.email)}" style="color:#94A3B8;text-decoration:underline">
        ${locale === "fr" ? "Se d\u00e9sabonner" : locale === "de" ? "Abmelden" : "Unsubscribe"}
      </a>
    </p>
  </div>

</div>
</body>
</html>`;

  return { subject, html };
}
