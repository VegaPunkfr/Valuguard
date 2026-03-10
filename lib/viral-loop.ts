/**
 * GHOST TAX — VIRAL LOOP ENGINE (SERVER-ONLY)
 *
 * Makes every delivered report a lead-generation machine.
 * When a CFO receives a report, the report itself should
 * generate 2-3 new scans via internal forwarding, colleague
 * invites, competitor curiosity, and board sharing.
 *
 * Mechanisms:
 *   1. Forward tracking (unique pixel/link per report)
 *   2. Colleague Scan CTA (pre-filled scan page)
 *   3. Board Share link (board-ready summary URL)
 *   4. Competitor Scan CTA (competitive intelligence angle)
 *   5. Referral boost: K-factor tracking (target K > 0.3)
 *   6. Auto-suggest related company scans post-delivery
 *
 * Viral loop:
 *   Customer scans competitor -> competitor gets curious ->
 *   competitor scans themselves -> new customer
 *
 * Exports: generateViralCTAs, buildShareableReportUrl,
 *   buildCompetitorScanUrl, trackViralEvent, getViralMetrics,
 *   generateViralEmailBlock
 *
 * Required env: NEXT_PUBLIC_SITE_URL (fallback: ghost-tax.com)
 */

import { createAdminSupabase } from "@/lib/supabase";
import * as crypto from "crypto";

// ── Constants ────────────────────────────────────────────

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://ghost-tax.com";

const REFERRAL_FREE_SCAN_THRESHOLD = 3; // 3 colleague scans = 1 free scan

// ── Types ────────────────────────────────────────────────

export interface ViralCTA {
  type: "colleague_scan" | "board_share" | "competitor_scan" | "referral";
  url: string;
  label: Record<"en" | "fr" | "de", string>;
  trackingId: string;
}

export interface ViralMetrics {
  reportId: string;
  forwards: number;
  newScansGenerated: number;
  kFactor: number;
}

export interface ViralEvent {
  type:
    | "forward_detected"
    | "cta_clicked"
    | "colleague_scan_initiated"
    | "competitor_scan_initiated"
    | "board_share_opened"
    | "referral_converted"
    | "email_opened";
  sourceRunId: string;
  targetEmail?: string;
  targetDomain?: string;
  metadata?: Record<string, string | number | boolean>;
}

// ── Helpers ──────────────────────────────────────────────

function generateTrackingId(runId: string, type: string): string {
  const hash = crypto
    .createHash("sha256")
    .update(`${runId}:${type}:${Date.now()}`)
    .digest("hex")
    .slice(0, 12);
  return `vl_${hash}`;
}

function generateRefCode(runId: string): string {
  return crypto
    .createHash("sha256")
    .update(`ref:${runId}`)
    .digest("hex")
    .slice(0, 8);
}

function sanitizeDomain(domain: string): string {
  return domain
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .trim();
}

// ── Core Functions ───────────────────────────────────────

/**
 * Generate all viral CTAs for a given report.
 * Returns 4 CTAs: colleague scan, competitor scan, board share, referral.
 */
export function generateViralCTAs(report: {
  runId: string;
  domain: string;
  email: string;
  locale: string;
  companyName: string;
}): ViralCTA[] {
  const refCode = generateRefCode(report.runId);
  const domain = sanitizeDomain(report.domain);

  const colleagueTrackingId = generateTrackingId(report.runId, "colleague");
  const competitorTrackingId = generateTrackingId(report.runId, "competitor");
  const boardTrackingId = generateTrackingId(report.runId, "board");
  const referralTrackingId = generateTrackingId(report.runId, "referral");

  return [
    {
      type: "colleague_scan",
      url: `${SITE_URL}/intel?ref=${refCode}&source=${encodeURIComponent(domain)}&utm_source=report&utm_medium=viral&utm_campaign=colleague_scan&tid=${colleagueTrackingId}`,
      label: {
        en: "Scan a colleague's company",
        fr: "Scanner l'entreprise d'un coll\u00e8gue",
        de: "Unternehmen eines Kollegen scannen",
      },
      trackingId: colleagueTrackingId,
    },
    {
      type: "competitor_scan",
      url: `${SITE_URL}/api/scan/competitor?source=${encodeURIComponent(domain)}&ref=${refCode}&tid=${competitorTrackingId}`,
      label: {
        en: "Scan your competitor",
        fr: "Scanner votre concurrent",
        de: "Konkurrenten scannen",
      },
      trackingId: competitorTrackingId,
    },
    {
      type: "board_share",
      url: buildShareableReportUrl(report.runId, "board"),
      label: {
        en: "Share with your board",
        fr: "Partager avec votre conseil",
        de: "Mit dem Vorstand teilen",
      },
      trackingId: boardTrackingId,
    },
    {
      type: "referral",
      url: `${SITE_URL}/intel?ref=${refCode}&utm_source=report&utm_medium=viral&utm_campaign=referral&tid=${referralTrackingId}`,
      label: {
        en: "Your next scan is free when 3 colleagues scan",
        fr: "Votre prochain scan est gratuit quand 3 coll\u00e8gues scannent",
        de: "Ihr n\u00e4chster Scan ist kostenlos, wenn 3 Kollegen scannen",
      },
      trackingId: referralTrackingId,
    },
  ];
}

/**
 * Build a shareable report URL for a given share type.
 * Board links include a one-time token for access control.
 */
export function buildShareableReportUrl(
  runId: string,
  shareType: "board" | "colleague" | "competitor"
): string {
  const token = crypto
    .createHash("sha256")
    .update(`share:${runId}:${shareType}:${process.env.SUPABASE_SERVICE_ROLE_KEY || "salt"}`)
    .digest("hex")
    .slice(0, 16);

  return `${SITE_URL}/report/${runId}/share?type=${shareType}&token=${token}`;
}

/**
 * Build a competitor scan URL.
 * Source domain is the customer, target domain is the competitor.
 */
export function buildCompetitorScanUrl(
  sourceDomain: string,
  targetDomain: string,
  refCode: string
): string {
  const source = sanitizeDomain(sourceDomain);
  const target = sanitizeDomain(targetDomain);

  return `${SITE_URL}/api/scan/competitor?source=${encodeURIComponent(source)}&target=${encodeURIComponent(target)}&ref=${refCode}`;
}

/**
 * Track a viral event in the database.
 * Used for K-factor calculation and funnel analysis.
 */
export async function trackViralEvent(event: ViralEvent): Promise<void> {
  const supabase = createAdminSupabase();
  if (!supabase) {
    console.warn("[Ghost Tax] Viral event tracking skipped — no Supabase client.");
    return;
  }

  try {
    await (supabase as any).from("events").insert({
      event_name: `viral.${event.type}`,
      properties: {
        source_run_id: event.sourceRunId,
        target_email: event.targetEmail || null,
        target_domain: event.targetDomain || null,
        ...event.metadata,
      },
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    // Non-fatal — viral tracking failure must never break delivery
    console.error("[Ghost Tax] Viral event tracking error:", err);
  }
}

/**
 * Get viral metrics for a specific report.
 * Calculates K-factor: invites_sent x conversion_rate.
 */
export async function getViralMetrics(runId: string): Promise<ViralMetrics> {
  const supabase = createAdminSupabase();

  const defaultMetrics: ViralMetrics = {
    reportId: runId,
    forwards: 0,
    newScansGenerated: 0,
    kFactor: 0,
  };

  if (!supabase) return defaultMetrics;

  try {
    // Count forward events
    const { count: forwardCount } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("event_name", "viral.forward_detected")
      .eq("properties->>source_run_id", runId);

    // Count CTA clicks that led to new scans
    const { count: ctaClickCount } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .in("event_name", [
        "viral.colleague_scan_initiated",
        "viral.competitor_scan_initiated",
      ])
      .eq("properties->>source_run_id", runId);

    // Count actual conversions (referral_converted)
    const { count: conversionCount } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("event_name", "viral.referral_converted")
      .eq("properties->>source_run_id", runId);

    const forwards = forwardCount ?? 0;
    const newScans = (ctaClickCount ?? 0) + (conversionCount ?? 0);

    // K-factor = invites_sent x conversion_rate
    // invites_sent = forwards + cta_clicks
    // conversion_rate = conversions / max(invites_sent, 1)
    const invitesSent = forwards + (ctaClickCount ?? 0);
    const conversionRate =
      invitesSent > 0 ? (conversionCount ?? 0) / invitesSent : 0;
    const kFactor = invitesSent * conversionRate;

    return {
      reportId: runId,
      forwards,
      newScansGenerated: newScans,
      kFactor: Math.round(kFactor * 100) / 100,
    };
  } catch (err) {
    console.error("[Ghost Tax] Viral metrics query error:", err);
    return defaultMetrics;
  }
}

// ── Email Block Generator ────────────────────────────────

/**
 * Generate the viral HTML block for delivery emails.
 * Dark theme matching brand (#060912 base, #3b82f6 accent).
 * Tri-lingual (EN/FR/DE).
 *
 * Includes:
 *   - "Know someone who should see this?" section
 *   - 3 buttons: Scan Colleague, Scan Competitor, Share with Board
 *   - Referral incentive: free scan after 3 colleague scans
 *   - Tracking pixel for forward detection
 */
export function generateViralEmailBlock(report: {
  runId: string;
  domain: string;
  companyName: string;
  locale: "en" | "fr" | "de";
}): string {
  const ctas = generateViralCTAs({
    runId: report.runId,
    domain: report.domain,
    email: "", // Not needed for email block
    locale: report.locale,
    companyName: report.companyName,
  });

  const colleagueCTA = ctas.find((c) => c.type === "colleague_scan")!;
  const competitorCTA = ctas.find((c) => c.type === "competitor_scan")!;
  const boardCTA = ctas.find((c) => c.type === "board_share")!;

  const locale = report.locale as "en" | "fr" | "de";

  // Tracking pixel URL for forward detection
  const pixelUrl = `${SITE_URL}/api/viral/pixel?rid=${report.runId}&t=${Date.now()}`;

  const copy = {
    headline: {
      en: "Know someone who should see this?",
      fr: "Quelqu'un devrait voir ceci ?",
      de: "Kennen Sie jemanden, der das sehen sollte?",
    },
    subheadline: {
      en: `Every CFO has blind spots. Help a peer discover theirs.`,
      fr: `Chaque CFO a des angles morts. Aidez un pair \u00e0 d\u00e9couvrir les siens.`,
      de: `Jeder CFO hat blinde Flecken. Helfen Sie einem Kollegen, seine zu entdecken.`,
    },
    referralIncentive: {
      en: `Your next scan is free when ${REFERRAL_FREE_SCAN_THRESHOLD} colleagues scan their company.`,
      fr: `Votre prochain scan est gratuit quand ${REFERRAL_FREE_SCAN_THRESHOLD} coll\u00e8gues scannent leur entreprise.`,
      de: `Ihr n\u00e4chster Scan ist kostenlos, wenn ${REFERRAL_FREE_SCAN_THRESHOLD} Kollegen ihr Unternehmen scannen.`,
    },
    colleagueButton: colleagueCTA.label[locale],
    competitorButton: competitorCTA.label[locale],
    boardButton: boardCTA.label[locale],
    refLabel: {
      en: "Your referral code",
      fr: "Votre code de parrainage",
      de: "Ihr Empfehlungscode",
    },
  };

  const refCode = generateRefCode(report.runId);

  return `
<!-- VIRAL LOOP BLOCK -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:48px;border-top:1px solid rgba(36,48,78,0.28)">
  <tr>
    <td style="padding:32px 0 0 0">
      <!-- Headline -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0d19;border-radius:12px;border:1px solid rgba(36,48,78,0.28)">
        <tr>
          <td style="padding:32px 28px">
            <p style="margin:0 0 8px 0;font-size:18px;font-weight:800;color:#e4e9f4;letter-spacing:-0.02em">
              ${copy.headline[locale]}
            </p>
            <p style="margin:0 0 24px 0;font-size:13px;color:#8d9bb5;line-height:1.6">
              ${copy.subheadline[locale]}
            </p>

            <!-- 3 CTA Buttons -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding:0 0 12px 0">
                  <a href="${colleagueCTA.url}" style="display:inline-block;background:#3b82f6;color:#ffffff;padding:12px 28px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;letter-spacing:0.01em;min-width:200px;text-align:center" target="_blank">
                    ${copy.colleagueButton}
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding:0 0 12px 0">
                  <a href="${competitorCTA.url}" style="display:inline-block;background:transparent;color:#3b82f6;padding:12px 28px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;letter-spacing:0.01em;border:1px solid #3b82f6;min-width:200px;text-align:center" target="_blank">
                    ${copy.competitorButton}
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding:0 0 0 0">
                  <a href="${boardCTA.url}" style="display:inline-block;background:transparent;color:#f59e0b;padding:12px 28px;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;letter-spacing:0.01em;border:1px solid rgba(245,158,11,0.4);min-width:200px;text-align:center" target="_blank">
                    ${copy.boardButton}
                  </a>
                </td>
              </tr>
            </table>

            <!-- Referral Incentive -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;background:#060912;border-radius:8px;border:1px solid rgba(36,48,78,0.20)">
              <tr>
                <td style="padding:16px 20px">
                  <p style="margin:0 0 8px 0;font-size:12px;color:#34d399;font-weight:700;letter-spacing:0.05em;text-transform:uppercase">
                    ${copy.referralIncentive[locale]}
                  </p>
                  <p style="margin:0;font-size:11px;color:#55637d">
                    ${copy.refLabel[locale]}: <span style="color:#8d9bb5;font-family:monospace;font-size:12px;background:#0e1221;padding:2px 8px;border-radius:4px">${refCode}</span>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<!-- Forward Detection Pixel (1x1 transparent) -->
<img src="${pixelUrl}" width="1" height="1" style="display:block;width:1px;height:1px;border:0" alt="" />
<!-- /VIRAL LOOP BLOCK -->
`.trim();
}
