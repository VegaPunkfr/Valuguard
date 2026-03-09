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

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sets this automatically for cron jobs)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
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
      const locale = row.locale || "en";
      const isEn = locale !== "fr";
      const exposureLow = report?.executiveSnapshot?.exposureRangeEur?.[0] || 50000;
      const exposureHigh = report?.executiveSnapshot?.exposureRangeEur?.[1] || 200000;
      const dailyLow = Math.round(exposureLow / 365);
      const dailyHigh = Math.round(exposureHigh / 365);

      const subject = isEn
        ? `${row.company_name || row.domain}: 14 days later, your exposure has grown`
        : `${row.company_name || row.domain}: 14 jours plus tard, votre exposition a augmenté`;

      const html = buildFollowupEmail(row, report, locale, {
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
  report: any,
  locale: string,
  nums: { exposureLow: number; exposureHigh: number; dailyLow: number; dailyHigh: number },
): string {
  const isEn = locale !== "fr";
  const daysSince = 14;
  const accumulatedLow = nums.dailyLow * daysSince;
  const accumulatedHigh = nums.dailyHigh * daysSince;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ghost-tax.com";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#060912;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:600px;margin:0 auto;padding:32px 16px">

  <p style="font-size:10px;letter-spacing:0.2em;color:#3b82f6;text-transform:uppercase;margin:0 0 16px 0">GHOST TAX FOLLOW-UP</p>

  <h1 style="font-size:22px;color:#e4e9f4;margin:0 0 16px 0;line-height:1.3">
    ${isEn
      ? `${row.company_name || row.domain} — 14 days since your report`
      : `${row.company_name || row.domain} — 14 jours depuis votre rapport`}
  </h1>

  <!-- Accumulated loss shock -->
  <div style="background:#0e1221;border:2px solid rgba(239,68,68,0.2);border-radius:12px;padding:24px;text-align:center;margin-bottom:20px">
    <p style="font-size:10px;color:#ef4444;letter-spacing:0.12em;margin:0 0 8px 0">
      ${isEn ? "ESTIMATED LOSS SINCE YOUR REPORT" : "PERTE ESTIMEE DEPUIS VOTRE RAPPORT"}
    </p>
    <p style="font-size:32px;font-family:monospace;font-weight:900;color:#ef4444;margin:0">
      ${fmtEur(accumulatedLow)}-${fmtEur(accumulatedHigh)} EUR
    </p>
    <p style="font-size:12px;color:#8d9bb5;margin:8px 0 0 0">
      ${isEn
        ? `${fmtEur(nums.dailyLow)}-${fmtEur(nums.dailyHigh)} EUR/day × ${daysSince} days of inaction`
        : `${fmtEur(nums.dailyLow)}-${fmtEur(nums.dailyHigh)} EUR/jour × ${daysSince} jours d'inaction`}
    </p>
  </div>

  <p style="font-size:14px;color:#8d9bb5;line-height:1.7;margin:0 0 24px 0">
    ${isEn
      ? `Two weeks ago, we identified ${fmtEur(nums.exposureLow)}-${fmtEur(nums.exposureHigh)} EUR/year in financial exposure at ${row.company_name || row.domain}. Since then, an estimated ${fmtEur(accumulatedLow)}-${fmtEur(accumulatedHigh)} EUR has been silently lost.`
      : `Il y a deux semaines, nous avons identifié ${fmtEur(nums.exposureLow)}-${fmtEur(nums.exposureHigh)} EUR/an d'exposition financière chez ${row.company_name || row.domain}. Depuis, une perte estimée de ${fmtEur(accumulatedLow)}-${fmtEur(accumulatedHigh)} EUR s'est accumulée silencieusement.`}
  </p>

  <!-- CTA: Rail B Monitor -->
  <div style="background:linear-gradient(135deg,#0e1221,#121828);border:2px solid rgba(59,130,246,0.3);border-radius:12px;padding:24px;text-align:center;margin-bottom:16px">
    <p style="font-size:10px;color:#3b82f6;letter-spacing:0.12em;margin:0 0 10px 0">
      ${isEn ? "STOP THE BLEEDING" : "ARRETEZ L'HEMORRAGIE"}
    </p>
    <p style="font-size:16px;color:#e4e9f4;font-weight:700;margin:0 0 16px 0">
      ${isEn
        ? "Activate continuous drift monitoring — 2,000 EUR/month"
        : "Activez le monitoring continu de dérive — 2 000 EUR/mois"}
    </p>
    <a href="${siteUrl}/pricing?ref=followup&domain=${encodeURIComponent(row.domain)}&rail=B_MONITOR" style="display:inline-block;background:#3b82f6;color:#fff;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none">
      ${isEn ? "Activate Monitoring" : "Activer le Monitoring"}
    </a>
    <p style="font-size:10px;color:#55637d;margin:8px 0 0 0">${isEn ? "Instant activation. No call required." : "Activation instantanée. Aucun appel requis."}</p>
  </div>

  <!-- CTA: Rail B Setup -->
  <div style="background:#0e1221;border:1px solid rgba(245,158,11,0.2);border-radius:8px;padding:16px;text-align:center;margin-bottom:24px">
    <p style="font-size:12px;color:#8d9bb5;margin:0 0 10px 0">
      ${isEn
        ? "Or get a one-time 30/60/90-day corrective plan — 2,500 EUR"
        : "Ou obtenez un plan correctif 30/60/90 jours — 2 500 EUR"}
    </p>
    <a href="${siteUrl}/pricing?ref=followup&domain=${encodeURIComponent(row.domain)}&rail=B_SETUP" style="color:#f59e0b;font-size:13px;font-weight:600;text-decoration:none">
      ${isEn ? "View Stabilization Plans →" : "Voir les Plans de Stabilisation →"}
    </a>
  </div>

  <p style="font-size:11px;color:#55637d;text-align:center;margin:0">
    audits@ghost-tax.com
  </p>

</div>
</body>
</html>`;
}
