/**
 * GHOST TAX — FOLLOW-UP CRON (Daily 10 AM)
 *
 * Sends follow-up emails to Rail A customers 14 days after delivery.
 * Upsells Rail B Monitor + Rail B Setup.
 *
 * Protected by CRON_SECRET to prevent unauthorized triggers.
 * Vercel Cron calls this automatically via vercel.json.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase";
import { generateViralEmailBlock } from "@/lib/viral-loop";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sets this automatically for cron jobs)
  if (!process.env.CRON_SECRET) {
    return new Response("CRON_SECRET not configured", { status: 503 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminSupabase();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  // Find delivered reports where followup_at has passed and status is still "delivered"
  const { data: dueFollowups, error } = await (db as any)
    .from("audit_requests")
    .select("id, email, domain, company_name, run_id, report_data, locale")
    .eq("status", "delivered")
    .lte("followup_at", new Date().toISOString())
    .limit(20);

  if (error) {
    console.error("[Ghost Tax Cron] Followup query error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!dueFollowups?.length) {
    return NextResponse.json({ processed: 0, message: "No follow-ups due" });
  }

  const resendKey = process.env.RESEND_API_KEY;
  let sent = 0;
  let failed = 0;

  for (const row of dueFollowups) {
    try {
      const report = row.report_data;
      const locale = (row.locale || "en") as "en" | "fr" | "de";
      const exposureLow = report?.executiveSnapshot?.exposureRangeEur?.[0] || 50000;
      const exposureHigh = report?.executiveSnapshot?.exposureRangeEur?.[1] || 200000;
      const dailyLow = Math.round(exposureLow / 365);
      const dailyHigh = Math.round(exposureHigh / 365);

      // Check renewals for subject line and email template selection
      const renewalTargets = extractRenewalTargets(report);
      const hasUrgentRenewals = renewalTargets.length > 0;

      const subjects: Record<"en" | "fr" | "de", string> = hasUrgentRenewals
        ? {
            en: `${row.company_name || row.domain}: ${renewalTargets.length} contract renewals in 60-90 days — act now`,
            fr: `${row.company_name || row.domain}: ${renewalTargets.length} renouvellements dans 60-90 jours — agissez maintenant`,
            de: `${row.company_name || row.domain}: ${renewalTargets.length} Vertragsverlängerungen in 60-90 Tagen — jetzt handeln`,
          }
        : {
            en: `${row.company_name || row.domain}: 14 days later, your exposure has grown`,
            fr: `${row.company_name || row.domain}: 14 jours plus tard, votre exposition a augmenté`,
            de: `${row.company_name || row.domain}: 14 Tage später — Ihre Exposition wächst`,
          };
      const subject = subjects[locale];

      const html = hasUrgentRenewals
        ? buildRenewalSniperEmail(row, report, locale, {
            exposureLow, exposureHigh, dailyLow, dailyHigh,
          }, renewalTargets)
        : buildFollowupEmail(row, report, locale, {
            exposureLow, exposureHigh, dailyLow, dailyHigh,
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
            to: [row.email],
            subject,
            html,
          }),
        });

        if (res.ok) {
          sent++;
        } else {
          failed++;
          console.error("[Ghost Tax Cron] Email failed for", row.email, await res.text());
        }
      } else {
        console.log("[Ghost Tax Cron] Would send followup to:", row.email);
        sent++;
      }

      // Mark as followup_scheduled regardless
      await (db as any)
        .from("audit_requests")
        .update({ status: "followup_scheduled" })
        .eq("id", row.id);

    } catch (err) {
      failed++;
      console.error("[Ghost Tax Cron] Followup error:", err);
    }
  }

  console.log(`[Ghost Tax Cron] Followup complete: ${sent} sent, ${failed} failed`);
  return NextResponse.json({ processed: dueFollowups.length, sent, failed });
}

function fmtEur(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 10_000) return Math.round(n / 1000) + "k";
  return Math.round(n).toLocaleString("fr-FR");
}

function buildFollowupEmail(
  row: any,
  _report: any,
  locale: string,
  nums: { exposureLow: number; exposureHigh: number; dailyLow: number; dailyHigh: number },
): string {
  const loc = (locale || "en") as "en" | "fr" | "de";
  const daysSince = 14;
  const accumulatedLow = nums.dailyLow * daysSince;
  const accumulatedHigh = nums.dailyHigh * daysSince;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ghost-tax.com";

  const copy = {
    title: {
      en: `${row.company_name || row.domain} — 14 days since your report`,
      fr: `${row.company_name || row.domain} — 14 jours depuis votre rapport`,
      de: `${row.company_name || row.domain} — 14 Tage seit Ihrem Bericht`,
    },
    lossLabel: {
      en: "ESTIMATED LOSS SINCE YOUR REPORT",
      fr: "PERTE ESTIMEE DEPUIS VOTRE RAPPORT",
      de: "GESCHAETZTER VERLUST SEIT IHREM BERICHT",
    },
    dailyCalc: {
      en: `${fmtEur(nums.dailyLow)}-${fmtEur(nums.dailyHigh)} EUR/day \u00d7 ${daysSince} days of inaction`,
      fr: `${fmtEur(nums.dailyLow)}-${fmtEur(nums.dailyHigh)} EUR/jour \u00d7 ${daysSince} jours d'inaction`,
      de: `${fmtEur(nums.dailyLow)}-${fmtEur(nums.dailyHigh)} EUR/Tag \u00d7 ${daysSince} Tage Untätigkeit`,
    },
    body: {
      en: `Two weeks ago, we identified ${fmtEur(nums.exposureLow)}-${fmtEur(nums.exposureHigh)} EUR/year in financial exposure at ${row.company_name || row.domain}. Since then, an estimated ${fmtEur(accumulatedLow)}-${fmtEur(accumulatedHigh)} EUR has been silently lost.`,
      fr: `Il y a deux semaines, nous avons identifié ${fmtEur(nums.exposureLow)}-${fmtEur(nums.exposureHigh)} EUR/an d'exposition financière chez ${row.company_name || row.domain}. Depuis, une perte estimée de ${fmtEur(accumulatedLow)}-${fmtEur(accumulatedHigh)} EUR s'est accumulée silencieusement.`,
      de: `Vor zwei Wochen haben wir ${fmtEur(nums.exposureLow)}-${fmtEur(nums.exposureHigh)} EUR/Jahr an finanzieller Exposition bei ${row.company_name || row.domain} identifiziert. Seitdem sind geschätzt ${fmtEur(accumulatedLow)}-${fmtEur(accumulatedHigh)} EUR still verloren gegangen.`,
    },
    stopBleeding: {
      en: "STOP THE BLEEDING",
      fr: "ARRETEZ L'HEMORRAGIE",
      de: "STOPPEN SIE DEN VERLUST",
    },
    monitorCta: {
      en: "Activate continuous drift monitoring — 2,000 EUR/month",
      fr: "Activez le monitoring continu de dérive — 2 000 EUR/mois",
      de: "Aktivieren Sie kontinuierliches Drift-Monitoring — 2.000 EUR/Monat",
    },
    monitorBtn: {
      en: "Activate Monitoring",
      fr: "Activer le Monitoring",
      de: "Monitoring aktivieren",
    },
    instant: {
      en: "Instant activation. No call required.",
      fr: "Activation instantanée. Aucun appel requis.",
      de: "Sofortige Aktivierung. Kein Anruf erforderlich.",
    },
    setupCta: {
      en: "Or get a one-time 30/60/90-day corrective plan — 2,500 EUR",
      fr: "Ou obtenez un plan correctif 30/60/90 jours — 2 500 EUR",
      de: "Oder erhalten Sie einen einmaligen 30/60/90-Tage-Korrekturplan — 2.500 EUR",
    },
    setupLink: {
      en: "View Stabilization Plans \u2192",
      fr: "Voir les Plans de Stabilisation \u2192",
      de: "Stabilisierungspl\u00e4ne ansehen \u2192",
    },
  };

  // Generate viral block for post-purchase sharing
  const viralBlock = generateViralEmailBlock({
    runId: row.run_id,
    domain: row.domain,
    companyName: row.company_name || row.domain,
    locale: loc,
  });

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:600px;margin:0 auto;padding:32px 16px">

  <p style="font-size:10px;letter-spacing:0.2em;color:#3b82f6;text-transform:uppercase;margin:0 0 16px 0">GHOST TAX FOLLOW-UP</p>


  <h1 style="font-size:22px;color:#0F172A;margin:0 0 16px 0;line-height:1.3">
    ${copy.title[loc]}
  </h1>

  <!-- Accumulated loss shock -->
  <div style="background:#F1F5F9;border:2px solid rgba(220,38,38,0.15);border-radius:12px;padding:24px;text-align:center;margin-bottom:20px">
    <p style="font-size:10px;color:#DC2626;letter-spacing:0.12em;margin:0 0 8px 0">
      ${copy.lossLabel[loc]}
    </p>
    <p style="font-size:32px;font-family:monospace;font-weight:900;color:#DC2626;margin:0">
      ${fmtEur(accumulatedLow)}-${fmtEur(accumulatedHigh)} EUR
    </p>
    <p style="font-size:12px;color:#475569;margin:8px 0 0 0">
      ${copy.dailyCalc[loc]}
    </p>
  </div>

  <p style="font-size:14px;color:#475569;line-height:1.7;margin:0 0 24px 0">
    ${copy.body[loc]}
  </p>

  <!-- CTA: Rail B Monitor -->
  <div style="background:#F8FAFC;border:2px solid rgba(59,130,246,0.2);border-radius:12px;padding:24px;text-align:center;margin-bottom:16px">
    <p style="font-size:10px;color:#3b82f6;letter-spacing:0.12em;margin:0 0 10px 0">
      ${copy.stopBleeding[loc]}
    </p>
    <p style="font-size:16px;color:#0F172A;font-weight:700;margin:0 0 16px 0">
      ${copy.monitorCta[loc]}
    </p>
    <a href="${siteUrl}/pricing?ref=followup&domain=${encodeURIComponent(row.domain)}&rail=B_MONITOR" style="display:inline-block;background:#3b82f6;color:#fff;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none">
      ${copy.monitorBtn[loc]}
    </a>
    <p style="font-size:10px;color:#64748B;margin:8px 0 0 0">${copy.instant[loc]}</p>
  </div>

  <!-- CTA: Rail B Setup -->
  <div style="background:#F1F5F9;border:1px solid rgba(59,130,246,0.2);border-radius:8px;padding:16px;text-align:center;margin-bottom:24px">
    <p style="font-size:12px;color:#475569;margin:0 0 10px 0">
      ${copy.setupCta[loc]}
    </p>
    <a href="${siteUrl}/pricing?ref=followup&domain=${encodeURIComponent(row.domain)}&rail=B_SETUP" style="color:#3b82f6;font-size:13px;font-weight:600;text-decoration:none">
      ${copy.setupLink[loc]}
    </a>
  </div>

  <!-- Viral CTAs -->
  ${viralBlock}

  <p style="font-size:11px;color:#64748B;text-align:center;margin:24px 0 0 0">
    audits@ghost-tax.com
  </p>

</div>
</body>
</html>`;
}

// ── Renewal Sniper Integration ────────────────────────────

interface RenewalTarget {
  vendor: string;
  window: string;
  annualValue: number;
  savingsLow: number;
  savingsHigh: number;
  leverage: string;
  tactic: string;
}

function extractRenewalTargets(report: any): RenewalTarget[] {
  if (!report) return [];
  const targets: RenewalTarget[] = [];

  // Check plugin outputs for renewal-sniper data
  const plugins = report?.pluginOutputs || report?.plugins || {};
  const renewalData =
    plugins?.["renewal-sniper"]?.data?.targets ||
    plugins?.["renewal-sniper"]?.targets ||
    [];

  for (const t of renewalData) {
    // Only target urgent renewals (0-90 days)
    if (t.renewalWindow === "60-90d" || t.renewalWindow === "30-60d" || t.renewalWindow === "0-30d") {
      targets.push({
        vendor: t.vendor || "Unknown",
        window: t.renewalWindow,
        annualValue: t.estimatedAnnualValue || 0,
        savingsLow: t.savingsOpportunity?.[0] || 0,
        savingsHigh: t.savingsOpportunity?.[1] || 0,
        leverage: t.negotiationLeverage || "moderate",
        tactic: t.recommendedTactic || "",
      });
    }
  }

  // Also check negotiation phase for renewal signals
  const negotiation = report?.negotiation || {};
  if (negotiation.renewalTargets) {
    for (const t of negotiation.renewalTargets) {
      if (!targets.some((x) => x.vendor === t.vendor)) {
        targets.push({
          vendor: t.vendor,
          window: t.window || "60-90d",
          annualValue: t.annualValue || 0,
          savingsLow: t.savingsRange?.[0] || 0,
          savingsHigh: t.savingsRange?.[1] || 0,
          leverage: t.leverage || "moderate",
          tactic: t.tactic || "",
        });
      }
    }
  }

  return targets;
}

function buildRenewalSniperEmail(
  row: any,
  _report: any,
  locale: string,
  nums: { exposureLow: number; exposureHigh: number; dailyLow: number; dailyHigh: number },
  renewals: RenewalTarget[],
): string {
  const loc = (locale || "en") as "en" | "fr" | "de";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ghost-tax.com";
  const totalSavingsLow = renewals.reduce((s, r) => s + r.savingsLow, 0);
  const totalSavingsHigh = renewals.reduce((s, r) => s + r.savingsHigh, 0);

  const copy = {
    badge: {
      en: "RENEWAL ALERT",
      fr: "ALERTE RENOUVELLEMENT",
      de: "VERLÄNGERUNGSALARM",
    },
    title: {
      en: `${row.company_name || row.domain} — ${renewals.length} contracts renewing soon`,
      fr: `${row.company_name || row.domain} — ${renewals.length} contrats bientôt renouvelés`,
      de: `${row.company_name || row.domain} — ${renewals.length} Verträge stehen zur Verlängerung`,
    },
    windowLabel: {
      en: "RENEWAL WINDOW",
      fr: "FENETRE DE RENOUVELLEMENT",
      de: "VERLÄNGERUNGSFENSTER",
    },
    savingsLabel: {
      en: "NEGOTIATION SAVINGS POTENTIAL",
      fr: "POTENTIEL D'ECONOMIE EN NEGOCIATION",
      de: "VERHANDLUNGSPOTENZIAL",
    },
    body: {
      en: `We detected ${renewals.length} vendor contracts at ${row.company_name || row.domain} renewing in the next 90 days. This is your window of maximum negotiation leverage — waiting past the renewal date locks you into current terms for another year.`,
      fr: `Nous avons détecté ${renewals.length} contrats fournisseurs chez ${row.company_name || row.domain} se renouvelant dans les 90 prochains jours. C'est votre fenêtre de levier maximal de négociation — attendre au-delà de la date de renouvellement vous verrouille aux conditions actuelles pour une année supplémentaire.`,
      de: `Wir haben ${renewals.length} Lieferantenverträge bei ${row.company_name || row.domain} erkannt, die in den nächsten 90 Tagen verlängert werden. Dies ist Ihr Fenster für maximale Verhandlungsstärke — nach dem Verlängerungsdatum sind Sie für ein weiteres Jahr an die aktuellen Konditionen gebunden.`,
    },
    tacticsLabel: {
      en: "RECOMMENDED TACTICS",
      fr: "TACTIQUES RECOMMANDEES",
      de: "EMPFOHLENE TAKTIKEN",
    },
    cta: {
      en: "Get your full Stabilization Protocol with vendor-specific negotiation playbooks.",
      fr: "Obtenez votre Protocole de Stabilisation complet avec des playbooks de négociation par fournisseur.",
      de: "Erhalten Sie Ihr vollständiges Stabilisierungsprotokoll mit anbieterspezifischen Verhandlungsleitfäden.",
    },
    ctaBtn: {
      en: "Get Negotiation Playbooks",
      fr: "Obtenir les Playbooks",
      de: "Verhandlungsleitfäden erhalten",
    },
    deadline: {
      en: "Act before your renewal dates lock in current rates.",
      fr: "Agissez avant que vos dates de renouvellement ne verrouillent les tarifs actuels.",
      de: "Handeln Sie, bevor Ihre Verlängerungstermine die aktuellen Tarife festschreiben.",
    },
  };

  const leverageColor: Record<string, string> = {
    strong: "#059669",
    moderate: "#3b82f6",
    weak: "#DC2626",
  };

  const renewalRows = renewals.map((r) => `
    <tr>
      <td style="padding:8px 12px;font-size:13px;color:#0F172A;font-family:monospace;border-bottom:1px solid #E2E8F0">${r.vendor}</td>
      <td style="padding:8px 12px;font-size:13px;color:#3b82f6;font-family:monospace;text-align:center;border-bottom:1px solid #E2E8F0">${r.window}</td>
      <td style="padding:8px 12px;font-size:13px;color:#0F172A;font-family:monospace;text-align:right;border-bottom:1px solid #E2E8F0">${fmtEur(r.annualValue)} EUR</td>
      <td style="padding:8px 12px;font-size:13px;color:${leverageColor[r.leverage] || "#475569"};font-family:monospace;text-align:center;border-bottom:1px solid #E2E8F0">${r.leverage.toUpperCase()}</td>
    </tr>
  `).join("");

  const viralBlock = generateViralEmailBlock({
    runId: row.run_id,
    domain: row.domain,
    companyName: row.company_name || row.domain,
    locale: loc,
  });

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:600px;margin:0 auto;padding:32px 16px">

  <p style="font-size:10px;letter-spacing:0.2em;color:#3b82f6;text-transform:uppercase;margin:0 0 16px 0">${copy.badge[loc]}</p>

  <h1 style="font-size:22px;color:#0F172A;margin:0 0 16px 0;line-height:1.3">
    ${copy.title[loc]}
  </h1>

  <!-- Total savings potential -->
  <div style="background:#F1F5F9;border:2px solid rgba(5,150,105,0.15);border-radius:12px;padding:24px;text-align:center;margin-bottom:20px">
    <p style="font-size:10px;color:#059669;letter-spacing:0.12em;margin:0 0 8px 0">
      ${copy.savingsLabel[loc]}
    </p>
    <p style="font-size:32px;font-family:monospace;font-weight:900;color:#059669;margin:0">
      ${fmtEur(totalSavingsLow)}\u2013${fmtEur(totalSavingsHigh)} EUR
    </p>
  </div>

  <p style="font-size:14px;color:#475569;line-height:1.7;margin:0 0 24px 0">
    ${copy.body[loc]}
  </p>

  <!-- Renewal targets table -->
  <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;overflow:hidden;margin-bottom:24px">
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#F1F5F9">
          <th style="padding:8px 12px;font-size:10px;color:#64748B;text-transform:uppercase;letter-spacing:0.1em;text-align:left;font-family:monospace">Vendor</th>
          <th style="padding:8px 12px;font-size:10px;color:#64748B;text-transform:uppercase;letter-spacing:0.1em;text-align:center;font-family:monospace">${copy.windowLabel[loc]}</th>
          <th style="padding:8px 12px;font-size:10px;color:#64748B;text-transform:uppercase;letter-spacing:0.1em;text-align:right;font-family:monospace">Value</th>
          <th style="padding:8px 12px;font-size:10px;color:#64748B;text-transform:uppercase;letter-spacing:0.1em;text-align:center;font-family:monospace">Leverage</th>
        </tr>
      </thead>
      <tbody>
        ${renewalRows}
      </tbody>
    </table>
  </div>

  <!-- CTA: Rail B Stabilize (negotiation playbooks) -->
  <div style="background:#F8FAFC;border:2px solid rgba(5,150,105,0.2);border-radius:12px;padding:24px;text-align:center;margin-bottom:16px">
    <p style="font-size:10px;color:#059669;letter-spacing:0.12em;margin:0 0 10px 0">
      ${copy.tacticsLabel[loc]}
    </p>
    <p style="font-size:14px;color:#0F172A;font-weight:500;margin:0 0 16px 0;line-height:1.5">
      ${copy.cta[loc]}
    </p>
    <a href="${siteUrl}/pricing?ref=renewal-sniper&domain=${encodeURIComponent(row.domain)}&rail=B_STABILIZE" style="display:inline-block;background:#059669;color:#FFFFFF;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none">
      ${copy.ctaBtn[loc]}
    </a>
    <p style="font-size:11px;color:#3b82f6;margin:12px 0 0 0;font-weight:600">${copy.deadline[loc]}</p>
  </div>

  <!-- Viral CTAs -->
  ${viralBlock}

  <p style="font-size:11px;color:#64748B;text-align:center;margin:24px 0 0 0">
    audits@ghost-tax.com
  </p>

</div>
</body>
</html>`;
}
