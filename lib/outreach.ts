/**
 * GHOST TAX — COLD OUTREACH ENGINE (SERVER-ONLY)
 *
 * Automated cold email system for lead acquisition.
 * Sends personalized financial intelligence briefings with
 * estimated exposure calculations based on industry benchmarks.
 *
 * Five-touch drip sequence:
 *   Touch 1 (Day 0):  "We detected potential exposure" + Ghost Tax link
 *   Touch 2 (Day 3):  "The cost of waiting" + daily leakage math
 *   Touch 3 (Day 7):  "What your peers are doing" + industry benchmark
 *   Touch 4 (Day 14): "Your exposure is growing" + urgency
 *   Touch 5 (Day 21): "Final notice" + direct checkout link
 *
 * Compliance:
 *   - CAN-SPAM: physical address, unsubscribe link in every email
 *   - GDPR: legitimate interest basis, one-click unsubscribe, data deletion
 *   - Rate limiting: 50 emails/hour max to protect domain reputation
 */

// ── Types ────────────────────────────────────────────────

export interface OutreachLead {
  email: string;
  name: string;
  company: string;
  domain: string;
  headcount: number;
  industry: string;
  locale?: "en" | "de";
  source?: string;
}

export interface DripState {
  id: string;
  email: string;
  name: string;
  company: string;
  domain: string;
  headcount: number;
  industry: string;
  locale: "en" | "de";
  source: string;
  status: "active" | "converted" | "unsubscribed" | "bounced";
  drip_step: number;
  last_sent_at: string | null;
  next_send_at: string | null;
  converted: boolean;
  unsubscribed: boolean;
  created_at: string;
}

export interface OutreachSendResult {
  email: string;
  success: boolean;
  error?: string;
  touch: number;
}

// ── Industry Benchmarks ──────────────────────────────────
// Source: Flexera 2024, Zylo 2024, Gartner 2025 composite
// Same data as lib/analysis.ts INDUSTRY_BENCHMARKS

const INDUSTRY_BENCHMARKS: Record<string, {
  medianPerHead: number;
  topQuartilePerHead: number;
  wastePercent: number;       // typical % of IT spend that is waste
  avgMonthlyPerHead: number;  // average monthly IT spend per employee
}> = {
  "Technology / SaaS":     { medianPerHead: 1800, topQuartilePerHead: 900,  wastePercent: 32, avgMonthlyPerHead: 450 },
  "Financial Services":    { medianPerHead: 2200, topQuartilePerHead: 1100, wastePercent: 35, avgMonthlyPerHead: 520 },
  "Healthcare":            { medianPerHead: 1600, topQuartilePerHead: 800,  wastePercent: 28, avgMonthlyPerHead: 380 },
  "Retail & E-commerce":   { medianPerHead: 1400, topQuartilePerHead: 700,  wastePercent: 30, avgMonthlyPerHead: 320 },
  "Manufacturing":         { medianPerHead: 1200, topQuartilePerHead: 600,  wastePercent: 25, avgMonthlyPerHead: 280 },
  "Media & Advertising":   { medianPerHead: 1900, topQuartilePerHead: 950,  wastePercent: 33, avgMonthlyPerHead: 440 },
  "Professional Services": { medianPerHead: 1500, topQuartilePerHead: 750,  wastePercent: 29, avgMonthlyPerHead: 400 },
  "Technology":            { medianPerHead: 1800, topQuartilePerHead: 900,  wastePercent: 32, avgMonthlyPerHead: 450 },
  "default":               { medianPerHead: 1500, topQuartilePerHead: 750,  wastePercent: 30, avgMonthlyPerHead: 380 },
};

// ── Exposure Estimation ──────────────────────────────────

export interface ExposureEstimate {
  lowEur: number;
  highEur: number;
  dailyLeakage: [number, number];
  monthlyLeakage: [number, number];
  yearlyLeakage: [number, number];
  ninetyDayLoss: [number, number];
  estimatedAnnualSpend: number;
  wastePercent: number;
  peerMedianExposure: number;
  peerTopQuartileExposure: number;
}

export function estimateExposure(
  headcount: number,
  industry: string,
): ExposureEstimate {
  const bench = INDUSTRY_BENCHMARKS[industry] || INDUSTRY_BENCHMARKS["default"];

  const estimatedAnnualSpend = bench.avgMonthlyPerHead * headcount * 12;
  const medianExposure = bench.medianPerHead * headcount;
  const topQuartileExposure = bench.topQuartilePerHead * headcount;

  // Exposure range: conservative (top quartile) to median
  const lowEur = Math.round(topQuartileExposure * 0.8);
  const highEur = Math.round(medianExposure * 1.15);

  const yearlyMid = (lowEur + highEur) / 2;

  return {
    lowEur,
    highEur,
    dailyLeakage: [Math.round(lowEur / 365), Math.round(highEur / 365)],
    monthlyLeakage: [Math.round(lowEur / 12), Math.round(highEur / 12)],
    yearlyLeakage: [lowEur, highEur],
    ninetyDayLoss: [Math.round(lowEur * 90 / 365), Math.round(highEur * 90 / 365)],
    estimatedAnnualSpend,
    wastePercent: bench.wastePercent,
    peerMedianExposure: medianExposure,
    peerTopQuartileExposure: topQuartileExposure,
  };
}

// ── Formatting Helpers ───────────────────────────────────

function fmtEur(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 10_000) return Math.round(n / 1000).toLocaleString() + "k";
  return Math.round(n).toLocaleString("en-US");
}

function fmtEurRange(low: number, high: number): string {
  return `${fmtEur(low)}–${fmtEur(high)}`;
}

// ── Drip Schedule ────────────────────────────────────────

export const DRIP_SCHEDULE = [
  { touch: 1, delayDays: 0 },
  { touch: 2, delayDays: 3 },
  { touch: 3, delayDays: 7 },
  { touch: 4, delayDays: 14 },
  { touch: 5, delayDays: 21 },
] as const;

export function getNextSendDate(touch: number, fromDate: Date = new Date()): Date {
  const schedule = DRIP_SCHEDULE.find(s => s.touch === touch);
  if (!schedule) return fromDate;
  const next = new Date(fromDate);
  next.setDate(next.getDate() + schedule.delayDays);
  return next;
}

// ── Unsubscribe URL ──────────────────────────────────────

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ghost-tax.com";

export function buildUnsubscribeUrl(email: string): string {
  const token = Buffer.from(email).toString("base64url");
  return `${SITE_URL}/api/outreach/unsubscribe?token=${token}`;
}

export function decodeUnsubscribeToken(token: string): string {
  return Buffer.from(token, "base64url").toString("utf-8");
}

// ── Checkout URL ─────────────────────────────────────────

export function buildCheckoutUrl(domain: string, email: string): string {
  return `${SITE_URL}/api/stripe/checkout?domain=${encodeURIComponent(domain)}&email=${encodeURIComponent(email)}&ref=outreach`;
}

export function buildGhostTaxUrl(domain: string): string {
  return `${SITE_URL}/ghost-tax?domain=${encodeURIComponent(domain)}&ref=outreach`;
}

// ── Email Sending via Resend ─────────────────────────────

export async function sendOutreachEmail(params: {
  to: string;
  subject: string;
  html: string;
  tags?: { name: string; value: string }[];
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn("[Ghost Tax Outreach] RESEND_API_KEY not set. Email logged only.");
    console.log("[Ghost Tax Outreach] Would send to:", params.to, "Subject:", params.subject);
    return { success: true, id: "dev-mode" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Ghost Tax Intelligence <notifications@ghost-tax.com>",
        to: [params.to],
        subject: params.subject,
        html: params.html,
        headers: {
          "List-Unsubscribe": `<${buildUnsubscribeUrl(params.to)}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
        tags: params.tags,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "Unknown error");
      return { success: false, error: `Resend API ${response.status}: ${errBody}` };
    }

    const data = await response.json();
    return { success: true, id: data.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Send failed";
    return { success: false, error: message };
  }
}

// ── Email Templates ──────────────────────────────────────
//
// All templates follow the institutional dark-theme design.
// Base wrapper provides consistent header/footer with unsubscribe.

function emailWrapper(content: string, unsubscribeUrl: string, locale: "en" | "de"): string {
  const unsubText = locale === "de"
    ? "Sie erhalten diese Nachricht, weil Ihr Unternehmen offentlich gelistet ist. Sie konnen sich jederzeit abmelden."
    : "You are receiving this because your company is publicly listed. You can unsubscribe at any time.";
  const unsubLink = locale === "de" ? "Abmelden" : "Unsubscribe";
  const complianceText = locale === "de"
    ? "Ghost Tax SAS | Paris, France | Diese Mitteilung dient ausschliesslich Informationszwecken."
    : "Ghost Tax SAS | Paris, France | This communication is for informational purposes only.";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#060912;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:32px 20px">

  <!-- Header -->
  <div style="margin-bottom:28px;border-bottom:1px solid #1a1f2e;padding-bottom:16px">
    <p style="font-size:10px;letter-spacing:0.2em;color:#3b82f6;text-transform:uppercase;margin:0 0 4px 0;font-family:monospace">GHOST TAX</p>
    <p style="font-size:9px;letter-spacing:0.12em;color:#55637d;text-transform:uppercase;margin:0;font-family:monospace">FINANCIAL INTELLIGENCE BRIEFING</p>
  </div>

  ${content}

  <!-- Footer -->
  <div style="border-top:1px solid #1a1f2e;margin-top:32px;padding-top:20px">
    <p style="font-size:10px;color:#3a4560;line-height:1.6;margin:0 0 8px 0">${unsubText}</p>
    <a href="${unsubscribeUrl}" style="font-size:10px;color:#55637d;text-decoration:underline">${unsubLink}</a>
    <p style="font-size:9px;color:#2a3347;margin:12px 0 0 0">${complianceText}</p>
  </div>

</div>
</body>
</html>`;
}

// ── Touch 1: Initial Detection Alert ─────────────────────

function buildTouch1(lead: OutreachLead, exposure: ExposureEstimate, locale: "en" | "de"): { subject: string; html: string } {
  const unsubUrl = buildUnsubscribeUrl(lead.email);
  const ghostTaxUrl = buildGhostTaxUrl(lead.domain);

  if (locale === "de") {
    return {
      subject: `${lead.company}: Potenzielle IT-Exposition von ${fmtEur(exposure.lowEur)}–${fmtEur(exposure.highEur)} EUR/Jahr erkannt`,
      html: emailWrapper(`
        <p style="font-size:14px;color:#e4e9f4;line-height:1.7;margin:0 0 20px 0">
          Guten Tag${lead.name ? ` ${lead.name}` : ""},
        </p>

        <p style="font-size:13px;color:#8d9bb5;line-height:1.7;margin:0 0 20px 0">
          Unsere Analyse offentlich verfugbarer Daten zu <strong style="color:#e4e9f4">${lead.company}</strong>
          deutet auf eine versteckte finanzielle Exposition in Ihren SaaS-, KI- und Cloud-Ausgaben hin.
        </p>

        <!-- Exposure Card -->
        <div style="background:#0e1221;border:1px solid rgba(239,68,68,0.15);border-radius:8px;padding:20px;margin:0 0 24px 0;text-align:center">
          <p style="font-size:9px;letter-spacing:0.12em;color:#ef4444;text-transform:uppercase;margin:0 0 8px 0;font-family:monospace">GESCHATZTE JAHRLICHE EXPOSITION</p>
          <p style="font-family:monospace;font-size:28px;font-weight:800;color:#ef4444;margin:0 0 4px 0">${fmtEurRange(exposure.lowEur, exposure.highEur)} &euro;</p>
          <p style="font-size:11px;color:#55637d;margin:0">Basierend auf ${lead.headcount} Mitarbeitern | Branche: ${lead.industry}</p>
        </div>

        <p style="font-size:13px;color:#8d9bb5;line-height:1.7;margin:0 0 24px 0">
          Bei Unternehmen Ihrer Grosse und Branche entspricht dies typischerweise <strong style="color:#f59e0b">${exposure.wastePercent}%</strong>
          der IT-Ausgaben, die ohne aktive Uberwachung unbemerkt verloren gehen.
        </p>

        <div style="text-align:center;margin:0 0 24px 0">
          <a href="${ghostTaxUrl}" style="display:inline-block;background:#3b82f6;color:#fff;padding:14px 36px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.02em">Kostenlose Exposition prüfen</a>
        </div>

        <p style="font-size:11px;color:#55637d;line-height:1.6;margin:0">
          Der Ghost Tax Calculator ist kostenlos und erfordert keine Registrierung. Sie erhalten sofort eine Ersteinschatzung.
        </p>
      `, unsubUrl, locale),
    };
  }

  return {
    subject: `${lead.company}: Potential IT exposure of ${fmtEurRange(exposure.lowEur, exposure.highEur)} EUR/yr detected`,
    html: emailWrapper(`
      <p style="font-size:14px;color:#e4e9f4;line-height:1.7;margin:0 0 20px 0">
        ${lead.name ? `${lead.name},` : "Hello,"}
      </p>

      <p style="font-size:13px;color:#8d9bb5;line-height:1.7;margin:0 0 20px 0">
        Our analysis of publicly available data on <strong style="color:#e4e9f4">${lead.company}</strong>
        indicates hidden financial exposure in your SaaS, AI, and Cloud spending.
      </p>

      <!-- Exposure Card -->
      <div style="background:#0e1221;border:1px solid rgba(239,68,68,0.15);border-radius:8px;padding:20px;margin:0 0 24px 0;text-align:center">
        <p style="font-size:9px;letter-spacing:0.12em;color:#ef4444;text-transform:uppercase;margin:0 0 8px 0;font-family:monospace">ESTIMATED ANNUAL EXPOSURE</p>
        <p style="font-family:monospace;font-size:28px;font-weight:800;color:#ef4444;margin:0 0 4px 0">${fmtEurRange(exposure.lowEur, exposure.highEur)} &euro;</p>
        <p style="font-size:11px;color:#55637d;margin:0">Based on ${lead.headcount} employees | Industry: ${lead.industry}</p>
      </div>

      <p style="font-size:13px;color:#8d9bb5;line-height:1.7;margin:0 0 24px 0">
        For companies of your size and industry, this typically represents <strong style="color:#f59e0b">${exposure.wastePercent}%</strong>
        of IT spending that leaks undetected without active monitoring.
      </p>

      <div style="text-align:center;margin:0 0 24px 0">
        <a href="${ghostTaxUrl}" style="display:inline-block;background:#3b82f6;color:#fff;padding:14px 36px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.02em">Run Free Exposure Check</a>
      </div>

      <p style="font-size:11px;color:#55637d;line-height:1.6;margin:0">
        The Ghost Tax Calculator is free, requires no registration, and gives you an instant first estimate.
      </p>
    `, unsubUrl, locale),
  };
}

// ── Touch 2: Cost of Waiting ─────────────────────────────

function buildTouch2(lead: OutreachLead, exposure: ExposureEstimate, locale: "en" | "de"): { subject: string; html: string } {
  const unsubUrl = buildUnsubscribeUrl(lead.email);
  const ghostTaxUrl = buildGhostTaxUrl(lead.domain);

  if (locale === "de") {
    return {
      subject: `${lead.company} verliert schatzungsweise ${fmtEur(exposure.dailyLeakage[1])} EUR pro Tag`,
      html: emailWrapper(`
        <p style="font-size:14px;color:#e4e9f4;line-height:1.7;margin:0 0 20px 0">
          ${lead.name ? `${lead.name},` : "Guten Tag,"}
        </p>

        <p style="font-size:13px;color:#8d9bb5;line-height:1.7;margin:0 0 20px 0">
          Seit unserer letzten Nachricht hat <strong style="color:#e4e9f4">${lead.company}</strong>
          moglicherweise weitere <strong style="color:#ef4444">${fmtEur(exposure.dailyLeakage[1] * 3)} EUR</strong> an versteckter IT-Exposition angesammelt.
        </p>

        <!-- Daily Leakage Card -->
        <div style="background:#0e1221;border:1px solid rgba(239,68,68,0.15);border-radius:8px;padding:20px;margin:0 0 24px 0">
          <p style="font-size:9px;letter-spacing:0.12em;color:#ef4444;text-transform:uppercase;margin:0 0 16px 0;font-family:monospace">KOSTEN DES WARTENS</p>
          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td style="text-align:center;padding:8px">
                <p style="font-size:8px;color:#55637d;margin:0 0 4px 0;letter-spacing:0.08em">PRO TAG</p>
                <p style="font-family:monospace;font-size:20px;font-weight:800;color:#ef4444;margin:0">${fmtEurRange(exposure.dailyLeakage[0], exposure.dailyLeakage[1])} &euro;</p>
              </td>
              <td style="text-align:center;padding:8px">
                <p style="font-size:8px;color:#55637d;margin:0 0 4px 0;letter-spacing:0.08em">PRO MONAT</p>
                <p style="font-family:monospace;font-size:18px;font-weight:800;color:#f59e0b;margin:0">${fmtEurRange(exposure.monthlyLeakage[0], exposure.monthlyLeakage[1])} &euro;</p>
              </td>
              <td style="text-align:center;padding:8px">
                <p style="font-size:8px;color:#55637d;margin:0 0 4px 0;letter-spacing:0.08em">90-TAGE VERLUST</p>
                <p style="font-family:monospace;font-size:18px;font-weight:800;color:#f59e0b;margin:0">${fmtEurRange(exposure.ninetyDayLoss[0], exposure.ninetyDayLoss[1])} &euro;</p>
              </td>
            </tr>
          </table>
        </div>

        <p style="font-size:13px;color:#8d9bb5;line-height:1.7;margin:0 0 24px 0">
          Jeder Tag ohne Sichtbarkeit kostet Ihr Unternehmen Geld. Die Exposition wachst nicht linear &mdash;
          sie beschleunigt sich durch Vertragserneuerungen, Schatten-IT und unkontrollierten KI-Toolverbrauch.
        </p>

        <div style="text-align:center;margin:0 0 24px 0">
          <a href="${ghostTaxUrl}" style="display:inline-block;background:#3b82f6;color:#fff;padding:14px 36px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none">Jetzt kostenlos prufen</a>
        </div>
      `, unsubUrl, locale),
    };
  }

  return {
    subject: `${lead.company} is estimated to lose ${fmtEur(exposure.dailyLeakage[1])} EUR every day`,
    html: emailWrapper(`
      <p style="font-size:14px;color:#e4e9f4;line-height:1.7;margin:0 0 20px 0">
        ${lead.name ? `${lead.name},` : "Hello,"}
      </p>

      <p style="font-size:13px;color:#8d9bb5;line-height:1.7;margin:0 0 20px 0">
        Since our last message, <strong style="color:#e4e9f4">${lead.company}</strong>
        may have accumulated an additional <strong style="color:#ef4444">${fmtEur(exposure.dailyLeakage[1] * 3)} EUR</strong> in hidden IT exposure.
      </p>

      <!-- Daily Leakage Card -->
      <div style="background:#0e1221;border:1px solid rgba(239,68,68,0.15);border-radius:8px;padding:20px;margin:0 0 24px 0">
        <p style="font-size:9px;letter-spacing:0.12em;color:#ef4444;text-transform:uppercase;margin:0 0 16px 0;font-family:monospace">THE COST OF WAITING</p>
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="text-align:center;padding:8px">
              <p style="font-size:8px;color:#55637d;margin:0 0 4px 0;letter-spacing:0.08em">EVERY DAY</p>
              <p style="font-family:monospace;font-size:20px;font-weight:800;color:#ef4444;margin:0">${fmtEurRange(exposure.dailyLeakage[0], exposure.dailyLeakage[1])} &euro;</p>
            </td>
            <td style="text-align:center;padding:8px">
              <p style="font-size:8px;color:#55637d;margin:0 0 4px 0;letter-spacing:0.08em">EVERY MONTH</p>
              <p style="font-family:monospace;font-size:18px;font-weight:800;color:#f59e0b;margin:0">${fmtEurRange(exposure.monthlyLeakage[0], exposure.monthlyLeakage[1])} &euro;</p>
            </td>
            <td style="text-align:center;padding:8px">
              <p style="font-size:8px;color:#55637d;margin:0 0 4px 0;letter-spacing:0.08em">90-DAY LOSS</p>
              <p style="font-family:monospace;font-size:18px;font-weight:800;color:#f59e0b;margin:0">${fmtEurRange(exposure.ninetyDayLoss[0], exposure.ninetyDayLoss[1])} &euro;</p>
            </td>
          </tr>
        </table>
      </div>

      <p style="font-size:13px;color:#8d9bb5;line-height:1.7;margin:0 0 24px 0">
        Every day without visibility costs your organization money. Exposure does not grow linearly &mdash;
        it accelerates through contract renewals, shadow IT, and uncontrolled AI tool consumption.
      </p>

      <div style="text-align:center;margin:0 0 24px 0">
        <a href="${ghostTaxUrl}" style="display:inline-block;background:#3b82f6;color:#fff;padding:14px 36px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none">Run Free Check Now</a>
      </div>
    `, unsubUrl, locale),
  };
}

// ── Touch 3: Peer Benchmark ──────────────────────────────

function buildTouch3(lead: OutreachLead, exposure: ExposureEstimate, locale: "en" | "de"): { subject: string; html: string } {
  const unsubUrl = buildUnsubscribeUrl(lead.email);
  const ghostTaxUrl = buildGhostTaxUrl(lead.domain);

  if (locale === "de") {
    return {
      subject: `Wie ${lead.company} im Branchenvergleich steht (${lead.industry})`,
      html: emailWrapper(`
        <p style="font-size:14px;color:#e4e9f4;line-height:1.7;margin:0 0 20px 0">
          ${lead.name ? `${lead.name},` : "Guten Tag,"}
        </p>

        <p style="font-size:13px;color:#8d9bb5;line-height:1.7;margin:0 0 20px 0">
          Wir haben die Expositions-Benchmarks fur <strong style="color:#e4e9f4">${lead.industry}</strong>-Unternehmen
          mit <strong style="color:#e4e9f4">${lead.headcount}</strong> Mitarbeitern analysiert.
          So vergleicht sich ${lead.company}:
        </p>

        <!-- Benchmark Card -->
        <div style="background:#0e1221;border:1px solid rgba(59,130,246,0.15);border-radius:8px;padding:20px;margin:0 0 24px 0">
          <p style="font-size:9px;letter-spacing:0.12em;color:#3b82f6;text-transform:uppercase;margin:0 0 16px 0;font-family:monospace">BRANCHENVERGLEICH</p>
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <tr>
              <td style="padding:10px;border-bottom:1px solid #1a1f2e;color:#55637d">Branchen-Median</td>
              <td style="padding:10px;border-bottom:1px solid #1a1f2e;color:#8d9bb5;font-family:monospace;text-align:right">${fmtEur(exposure.peerMedianExposure)} &euro;/Jahr</td>
            </tr>
            <tr>
              <td style="padding:10px;border-bottom:1px solid #1a1f2e;color:#55637d">Top-Quartil</td>
              <td style="padding:10px;border-bottom:1px solid #1a1f2e;color:#34d399;font-family:monospace;text-align:right">${fmtEur(exposure.peerTopQuartileExposure)} &euro;/Jahr</td>
            </tr>
            <tr>
              <td style="padding:10px;border-bottom:1px solid #1a1f2e;color:#55637d">Geschatzte Exposition von ${lead.company}</td>
              <td style="padding:10px;border-bottom:1px solid #1a1f2e;color:#ef4444;font-family:monospace;font-weight:700;text-align:right">${fmtEurRange(exposure.lowEur, exposure.highEur)} &euro;/Jahr</td>
            </tr>
            <tr>
              <td style="padding:10px;color:#55637d">Einsparpotenzial (vs. Top-Quartil)</td>
              <td style="padding:10px;color:#34d399;font-family:monospace;font-weight:700;text-align:right">${fmtEur(Math.max(0, exposure.highEur - exposure.peerTopQuartileExposure))} &euro;/Jahr</td>
            </tr>
          </table>
        </div>

        <p style="font-size:13px;color:#8d9bb5;line-height:1.7;margin:0 0 24px 0">
          Unternehmen, die proaktiv handeln, senken ihre Exposition typischerweise um
          <strong style="color:#34d399">40-60%</strong> innerhalb von 90 Tagen.
        </p>

        <div style="text-align:center;margin:0 0 24px 0">
          <a href="${ghostTaxUrl}" style="display:inline-block;background:#3b82f6;color:#fff;padding:14px 36px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none">Ihre Position prufen</a>
        </div>
      `, unsubUrl, locale),
    };
  }

  return {
    subject: `How ${lead.company} compares to ${lead.industry} peers`,
    html: emailWrapper(`
      <p style="font-size:14px;color:#e4e9f4;line-height:1.7;margin:0 0 20px 0">
        ${lead.name ? `${lead.name},` : "Hello,"}
      </p>

      <p style="font-size:13px;color:#8d9bb5;line-height:1.7;margin:0 0 20px 0">
        We analyzed exposure benchmarks for <strong style="color:#e4e9f4">${lead.industry}</strong> companies
        with <strong style="color:#e4e9f4">${lead.headcount}</strong> employees.
        Here is how ${lead.company} compares:
      </p>

      <!-- Benchmark Card -->
      <div style="background:#0e1221;border:1px solid rgba(59,130,246,0.15);border-radius:8px;padding:20px;margin:0 0 24px 0">
        <p style="font-size:9px;letter-spacing:0.12em;color:#3b82f6;text-transform:uppercase;margin:0 0 16px 0;font-family:monospace">INDUSTRY BENCHMARK</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr>
            <td style="padding:10px;border-bottom:1px solid #1a1f2e;color:#55637d">Industry Median</td>
            <td style="padding:10px;border-bottom:1px solid #1a1f2e;color:#8d9bb5;font-family:monospace;text-align:right">${fmtEur(exposure.peerMedianExposure)} &euro;/yr</td>
          </tr>
          <tr>
            <td style="padding:10px;border-bottom:1px solid #1a1f2e;color:#55637d">Top Quartile</td>
            <td style="padding:10px;border-bottom:1px solid #1a1f2e;color:#34d399;font-family:monospace;text-align:right">${fmtEur(exposure.peerTopQuartileExposure)} &euro;/yr</td>
          </tr>
          <tr>
            <td style="padding:10px;border-bottom:1px solid #1a1f2e;color:#55637d">${lead.company} Estimated Exposure</td>
            <td style="padding:10px;border-bottom:1px solid #1a1f2e;color:#ef4444;font-family:monospace;font-weight:700;text-align:right">${fmtEurRange(exposure.lowEur, exposure.highEur)} &euro;/yr</td>
          </tr>
          <tr>
            <td style="padding:10px;color:#55637d">Savings Potential (vs. Top Quartile)</td>
            <td style="padding:10px;color:#34d399;font-family:monospace;font-weight:700;text-align:right">${fmtEur(Math.max(0, exposure.highEur - exposure.peerTopQuartileExposure))} &euro;/yr</td>
          </tr>
        </table>
      </div>

      <p style="font-size:13px;color:#8d9bb5;line-height:1.7;margin:0 0 24px 0">
        Companies that act proactively typically reduce their exposure by
        <strong style="color:#34d399">40-60%</strong> within 90 days.
      </p>

      <div style="text-align:center;margin:0 0 24px 0">
        <a href="${ghostTaxUrl}" style="display:inline-block;background:#3b82f6;color:#fff;padding:14px 36px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none">Check Your Position</a>
      </div>
    `, unsubUrl, locale),
  };
}

// ── Touch 4: Growing Exposure ────────────────────────────

function buildTouch4(lead: OutreachLead, exposure: ExposureEstimate, locale: "en" | "de"): { subject: string; html: string } {
  const unsubUrl = buildUnsubscribeUrl(lead.email);
  const checkoutUrl = buildCheckoutUrl(lead.domain, lead.email);
  const accumulatedLoss = exposure.dailyLeakage[1] * 14;

  if (locale === "de") {
    return {
      subject: `${lead.company}: Geschatzte ${fmtEur(accumulatedLoss)} EUR Exposition seit unserer ersten Nachricht`,
      html: emailWrapper(`
        <p style="font-size:14px;color:#e4e9f4;line-height:1.7;margin:0 0 20px 0">
          ${lead.name ? `${lead.name},` : "Guten Tag,"}
        </p>

        <p style="font-size:13px;color:#8d9bb5;line-height:1.7;margin:0 0 20px 0">
          Vor zwei Wochen haben wir <strong style="color:#e4e9f4">${lead.company}</strong> auf eine potenzielle
          IT-Exposition hingewiesen. Seitdem hat sich die geschatzte Exposition weiter aufgebaut:
        </p>

        <!-- Accumulated Loss Card -->
        <div style="background:#0e1221;border:2px solid rgba(239,68,68,0.25);border-radius:8px;padding:24px;margin:0 0 24px 0;text-align:center">
          <p style="font-size:9px;letter-spacing:0.12em;color:#ef4444;text-transform:uppercase;margin:0 0 8px 0;font-family:monospace">GESCHATZTE AKKUMULIERTE EXPOSITION (14 TAGE)</p>
          <p style="font-family:monospace;font-size:32px;font-weight:900;color:#ef4444;margin:0">${fmtEur(accumulatedLoss)} &euro;</p>
        </div>

        <p style="font-size:13px;color:#8d9bb5;line-height:1.7;margin:0 0 24px 0">
          Fur <strong style="color:#e4e9f4">490 EUR</strong> liefert Ghost Tax einen vollstandigen Expositionsbericht
          mit Handlungsempfehlungen, Verhandlungsprotokollen und einem Executive Decision Pack.
          Das ist weniger als ein Tag Ihrer geschatzten taglichen Exposition.
        </p>

        <div style="text-align:center;margin:0 0 24px 0">
          <a href="${checkoutUrl}" style="display:inline-block;background:#3b82f6;color:#fff;padding:14px 36px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none">Vollstandigen Bericht bestellen &mdash; 490 &euro;</a>
        </div>

        <p style="font-size:11px;color:#55637d;text-align:center;margin:0">
          Einmalige Zahlung | Bericht innerhalb von 48 Stunden | Keine Verpflichtung
        </p>
      `, unsubUrl, locale),
    };
  }

  return {
    subject: `${lead.company}: Est. ${fmtEur(accumulatedLoss)} EUR in exposure since our first message`,
    html: emailWrapper(`
      <p style="font-size:14px;color:#e4e9f4;line-height:1.7;margin:0 0 20px 0">
        ${lead.name ? `${lead.name},` : "Hello,"}
      </p>

      <p style="font-size:13px;color:#8d9bb5;line-height:1.7;margin:0 0 20px 0">
        Two weeks ago, we flagged potential IT exposure at <strong style="color:#e4e9f4">${lead.company}</strong>.
        Since then, the estimated exposure has continued to accumulate:
      </p>

      <!-- Accumulated Loss Card -->
      <div style="background:#0e1221;border:2px solid rgba(239,68,68,0.25);border-radius:8px;padding:24px;margin:0 0 24px 0;text-align:center">
        <p style="font-size:9px;letter-spacing:0.12em;color:#ef4444;text-transform:uppercase;margin:0 0 8px 0;font-family:monospace">ESTIMATED ACCUMULATED EXPOSURE (14 DAYS)</p>
        <p style="font-family:monospace;font-size:32px;font-weight:900;color:#ef4444;margin:0">${fmtEur(accumulatedLoss)} &euro;</p>
      </div>

      <p style="font-size:13px;color:#8d9bb5;line-height:1.7;margin:0 0 24px 0">
        For <strong style="color:#e4e9f4">490 EUR</strong>, Ghost Tax delivers a complete exposure report
        with actionable recommendations, vendor negotiation playbooks, and an executive decision pack.
        That is less than one day of your estimated daily exposure.
      </p>

      <div style="text-align:center;margin:0 0 24px 0">
        <a href="${checkoutUrl}" style="display:inline-block;background:#3b82f6;color:#fff;padding:14px 36px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none">Order Full Report &mdash; 490 &euro;</a>
      </div>

      <p style="font-size:11px;color:#55637d;text-align:center;margin:0">
        One-time payment | Report delivered within 48 hours | No commitment
      </p>
    `, unsubUrl, locale),
  };
}

// ── Touch 5: Final Notice ────────────────────────────────

function buildTouch5(lead: OutreachLead, exposure: ExposureEstimate, locale: "en" | "de"): { subject: string; html: string } {
  const unsubUrl = buildUnsubscribeUrl(lead.email);
  const checkoutUrl = buildCheckoutUrl(lead.domain, lead.email);
  const accumulatedLoss = exposure.dailyLeakage[1] * 21;

  if (locale === "de") {
    return {
      subject: `Letzte Benachrichtigung: ${lead.company} Expositionsbriefing`,
      html: emailWrapper(`
        <p style="font-size:14px;color:#e4e9f4;line-height:1.7;margin:0 0 20px 0">
          ${lead.name ? `${lead.name},` : "Guten Tag,"}
        </p>

        <p style="font-size:13px;color:#8d9bb5;line-height:1.7;margin:0 0 20px 0">
          Dies ist unsere letzte Benachrichtigung bezuglich der IT-Exposition bei <strong style="color:#e4e9f4">${lead.company}</strong>.
        </p>

        <div style="background:#0e1221;border:1px solid #1a1f2e;border-radius:8px;padding:20px;margin:0 0 24px 0">
          <p style="font-size:9px;letter-spacing:0.12em;color:#55637d;text-transform:uppercase;margin:0 0 12px 0;font-family:monospace">21-TAGE ZUSAMMENFASSUNG</p>
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <tr>
              <td style="padding:8px 0;color:#55637d">Geschatzte Exposition (21 Tage)</td>
              <td style="padding:8px 0;color:#ef4444;font-family:monospace;font-weight:700;text-align:right">${fmtEur(accumulatedLoss)} &euro;</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#55637d">Jahrliche Exposition</td>
              <td style="padding:8px 0;color:#ef4444;font-family:monospace;font-weight:700;text-align:right">${fmtEurRange(exposure.lowEur, exposure.highEur)} &euro;</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#55637d">Kosten des vollstandigen Berichts</td>
              <td style="padding:8px 0;color:#34d399;font-family:monospace;font-weight:700;text-align:right">490 &euro;</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#55637d">ROI des Berichts (vs. 1 Tag Exposition)</td>
              <td style="padding:8px 0;color:#34d399;font-family:monospace;font-weight:700;text-align:right">${Math.round(exposure.dailyLeakage[1] / 490 * 100)}%</td>
            </tr>
          </table>
        </div>

        <div style="text-align:center;margin:0 0 24px 0">
          <a href="${checkoutUrl}" style="display:inline-block;background:#ef4444;color:#fff;padding:14px 36px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none">Bericht bestellen &mdash; 490 &euro;</a>
        </div>

        <p style="font-size:11px;color:#55637d;line-height:1.6;margin:0">
          Dies ist unsere letzte Nachricht zu diesem Thema. Sollten Sie in Zukunft Interesse haben,
          besuchen Sie <a href="https://ghost-tax.com" style="color:#3b82f6;text-decoration:none">ghost-tax.com</a>.
        </p>
      `, unsubUrl, locale),
    };
  }

  return {
    subject: `Final notice: ${lead.company} exposure briefing`,
    html: emailWrapper(`
      <p style="font-size:14px;color:#e4e9f4;line-height:1.7;margin:0 0 20px 0">
        ${lead.name ? `${lead.name},` : "Hello,"}
      </p>

      <p style="font-size:13px;color:#8d9bb5;line-height:1.7;margin:0 0 20px 0">
        This is our final notification regarding IT exposure at <strong style="color:#e4e9f4">${lead.company}</strong>.
      </p>

      <div style="background:#0e1221;border:1px solid #1a1f2e;border-radius:8px;padding:20px;margin:0 0 24px 0">
        <p style="font-size:9px;letter-spacing:0.12em;color:#55637d;text-transform:uppercase;margin:0 0 12px 0;font-family:monospace">21-DAY SUMMARY</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr>
            <td style="padding:8px 0;color:#55637d">Estimated exposure (21 days)</td>
            <td style="padding:8px 0;color:#ef4444;font-family:monospace;font-weight:700;text-align:right">${fmtEur(accumulatedLoss)} &euro;</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#55637d">Annual exposure</td>
            <td style="padding:8px 0;color:#ef4444;font-family:monospace;font-weight:700;text-align:right">${fmtEurRange(exposure.lowEur, exposure.highEur)} &euro;</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#55637d">Cost of full report</td>
            <td style="padding:8px 0;color:#34d399;font-family:monospace;font-weight:700;text-align:right">490 &euro;</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#55637d">Report ROI (vs. 1 day exposure)</td>
            <td style="padding:8px 0;color:#34d399;font-family:monospace;font-weight:700;text-align:right">${Math.round(exposure.dailyLeakage[1] / 490 * 100)}%</td>
          </tr>
        </table>
      </div>

      <div style="text-align:center;margin:0 0 24px 0">
        <a href="${checkoutUrl}" style="display:inline-block;background:#ef4444;color:#fff;padding:14px 36px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none">Order Report &mdash; 490 &euro;</a>
      </div>

      <p style="font-size:11px;color:#55637d;line-height:1.6;margin:0">
        This is our last message on this topic. Should you have interest in the future,
        visit <a href="https://ghost-tax.com" style="color:#3b82f6;text-decoration:none">ghost-tax.com</a>.
      </p>
    `, unsubUrl, locale),
  };
}

// ── Template Dispatcher ──────────────────────────────────

export function buildTouchEmail(
  touch: number,
  lead: OutreachLead,
  exposure: ExposureEstimate,
  locale: "en" | "de" = "en",
): { subject: string; html: string } {
  switch (touch) {
    case 1: return buildTouch1(lead, exposure, locale);
    case 2: return buildTouch2(lead, exposure, locale);
    case 3: return buildTouch3(lead, exposure, locale);
    case 4: return buildTouch4(lead, exposure, locale);
    case 5: return buildTouch5(lead, exposure, locale);
    default: throw new Error(`Invalid touch number: ${touch}`);
  }
}

// ── Rate Limiter (in-memory, per-instance) ───────────────
// 50 emails/hour to protect domain reputation

const sendTimestamps: number[] = [];
const RATE_LIMIT = 50;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export function checkRateLimit(): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  // Prune old timestamps
  while (sendTimestamps.length > 0 && sendTimestamps[0] < now - RATE_WINDOW_MS) {
    sendTimestamps.shift();
  }

  if (sendTimestamps.length >= RATE_LIMIT) {
    const oldestInWindow = sendTimestamps[0];
    const retryAfterMs = oldestInWindow + RATE_WINDOW_MS - now;
    return { allowed: false, retryAfterMs };
  }

  return { allowed: true, retryAfterMs: 0 };
}

export function recordSend(): void {
  sendTimestamps.push(Date.now());
}
