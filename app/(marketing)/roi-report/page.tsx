"use client";
import { useState, useMemo, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { c, f } from "@/lib/tokens";

/*  GHOST TAX — BOARD REPORT GENERATOR (US 2026)
    Creates a downloadable executive summary for the C-suite.
    Pre-filled with Ghost Tax diagnostic data.
    Formats: preview on-screen + download as .txt
    100% USD. Zero EUR. Zero French. */

function fmt(n: number, short?: boolean) {
  if (short && n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  if (short && n >= 1e4) return "$" + Math.round(n / 1e3) + "k";
  return "$" + Math.round(n).toLocaleString("en-US");
}

// -- Report generator --
function buildReport(cfg: any) {
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const lines: string[] = [];

  lines.push("══════════════════════════════════════════════════════════");
  lines.push("   GHOST TAX — EXECUTIVE GHOST TAX SUMMARY");
  lines.push("   Confidential — Prepared " + date);
  lines.push("══════════════════════════════════════════════════════════");
  lines.push("");
  lines.push("COMPANY PROFILE");
  lines.push("  Company:         " + cfg.company);
  lines.push("  Industry:        " + cfg.industry);
  lines.push("  Headcount:       " + cfg.headcount + " employees");
  lines.push("  SaaS Tools:      " + cfg.tools + " active subscriptions");
  lines.push("  Monthly IT:      " + fmt(cfg.monthlyIT) + " (SaaS " + fmt(cfg.saas) + " + Cloud " + fmt(cfg.cloud) + " + AI " + fmt(cfg.ai) + ")");
  lines.push("");
  lines.push("──────────────────────────────────────────────────────────");
  lines.push("GHOST TAX ASSESSMENT");
  lines.push("  Annual Ghost Tax:   " + fmt(cfg.ghostTaxLow) + " – " + fmt(cfg.ghostTaxHigh) + " (midpoint: " + fmt(cfg.ghostTaxMid) + ")");
  lines.push("  Entropy Score:      " + cfg.entropyScore + "/100 (" + (cfg.entropyScore >= 61 ? "CRITICAL" : cfg.entropyScore >= 31 ? "ELEVATED" : "HEALTHY") + ")");
  lines.push("  Entropy Coeff:      kappa = " + cfg.kappa.toFixed(3) + " (organizational coordination drag)");
  lines.push("  Peer Position:      P" + cfg.peerPct + " — less efficient than " + cfg.peerPct + "% of " + cfg.peerLabel);
  lines.push("  Audit ROI:          " + cfg.roi + "x ($990 investment -> " + fmt(cfg.recoverable, true) + " recoverable)");
  lines.push("");
  lines.push("──────────────────────────────────────────────────────────");
  lines.push("TOP RECOVERY ACTIONS (ranked by savings/effort)");
  lines.push("");

  cfg.actions.forEach((a: any, i: number) => {
    lines.push("  " + (i + 1) + ". " + a.label);
    lines.push("     Savings: " + fmt(a.savings, true) + "/yr | Effort: " + a.effort + " | Timeline: ~" + a.days + " days");
    lines.push("");
  });

  lines.push("  Total Recoverable (conservative 60%): " + fmt(cfg.recoverable) + "/yr");
  lines.push("  Shadow AI Redundancy:                  " + fmt(cfg.shadowRedundancy, true) + "/yr");
  lines.push("");
  lines.push("──────────────────────────────────────────────────────────");
  lines.push("24-MONTH COST TRAJECTORY");
  lines.push("");
  lines.push("  Timeline        Without Action    With Governance    Delta");
  lines.push("  Now              " + pad(fmt(cfg.burnNow), 18) + pad(fmt(cfg.burnNow), 19) + "—");
  lines.push("  6 months         " + pad(fmt(cfg.burn6u), 18) + pad(fmt(cfg.burn6g), 19) + fmt(cfg.burn6u - cfg.burn6g, true));
  lines.push("  12 months        " + pad(fmt(cfg.burn12u), 18) + pad(fmt(cfg.burn12g), 19) + fmt(cfg.burn12u - cfg.burn12g, true));
  lines.push("  24 months        " + pad(fmt(cfg.burn24u), 18) + pad(fmt(cfg.burn24g), 19) + fmt(cfg.burn24u - cfg.burn24g, true));
  lines.push("");
  lines.push("  Cumulative 24-month savings: " + fmt(cfg.savings24));
  lines.push("  That's " + Math.round(cfg.savings24 / 990) + "x the cost of an initial audit.");
  lines.push("");
  lines.push("──────────────────────────────────────────────────────────");
  lines.push("RECOMMENDED NEXT STEP");
  lines.push("");
  lines.push("  1. Schedule a Ghost Tax Priority Audit ($990)");
  lines.push("  2. Receive full anomaly report within 48 hours");
  lines.push("  3. Implement top 3 quick wins (est. " + fmt(cfg.actions.slice(0, 3).reduce((s: number, a: any) => s + a.savings, 0), true) + "/yr recovered)");
  lines.push("  4. Typical first-quarter ROI: 15-40x");
  lines.push("");
  lines.push("  Contact: audits@ghost-tax.com | ghost-tax.com");
  lines.push("  SOC2 Type II Readiness | Zero-Knowledge Audit | US Data Residency");
  lines.push("══════════════════════════════════════════════════════════");

  return lines.join("\n");
}

function pad(str: string, width: number) {
  while (str.length < width) str = str + " ";
  return str;
}

// -- Download handler --
function downloadTxt(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ====================================================
// MAIN
// ====================================================
export default function BoardReport() {
  const { t } = useI18n();
  const [cfg, setCfg] = useState({
    company: "Acme Corp",
    industry: "SaaS / Tech",
    headcount: 150,
    tools: 62,
    saas: 38000,
    cloud: 15000,
    ai: 11000,
    monthlyIT: 64000,
    ghostTaxLow: 134000,
    ghostTaxMid: 178000,
    ghostTaxHigh: 205000,
    entropyScore: 72,
    kappa: 0.132,
    peerPct: 78,
    peerLabel: "SaaS scale-ups",
    roi: 18.2,
    recoverable: 106800,
    shadowRedundancy: 38400,
    burnNow: 64000,
    burn6u: 78400, burn6g: 68200,
    burn12u: 96000, burn12g: 72600,
    burn24u: 144000, burn24g: 82100,
    savings24: 412000,
    actions: [
      { label: "Deactivate 23 unused Figma licenses", savings: 27600, effort: "Easy", days: 3 },
      { label: "Consolidate 3 AI writing tools to 1", savings: 19200, effort: "Moderate", days: 10 },
      { label: "Downgrade Salesforce Enterprise to Pro", savings: 14400, effort: "Easy", days: 5 },
      { label: "Renegotiate AWS commitment at renewal", savings: 12000, effort: "Moderate", days: 14 },
      { label: "Eliminate duplicate analytics stack", savings: 9600, effort: "Moderate", days: 7 },
    ],
  });

  const reportText = useMemo(() => buildReport(cfg), [cfg]);

  const handleDownload = useCallback(() => {
    const filename = "ghost-tax-report-" + cfg.company.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + new Date().toISOString().slice(0, 10) + ".txt";
    downloadTxt(reportText, filename);
  }, [reportText, cfg.company]);

  function updField(key: string, val: string | number) {
    setCfg((prev) => ({ ...prev, [key]: val }));
  }

  return (
    <div style={{ minHeight: "100vh", fontFamily: f.sans, color: c.text1, padding: "24px 14px 48px" }}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>

        {/* -- RETOUR -- */}
        <div style={{ marginBottom: 14 }}>
          <a href="/" className="gt-btn gt-btn-ghost" style={{ fontSize: 11, padding: "6px 12px" }}>{t("back")}</a>
        </div>

        {/* -- HEADER -- */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="gt-mono" style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: c.accent }}>GHOST TAX</span>
            <span className="gt-badge gt-badge--muted">{t("roi.badge")}</span>
          </div>
          <button onClick={handleDownload} className="gt-btn gt-btn-green" style={{ fontSize: 10 }}>
            {"\u2193"} {t("roi.download")}
          </button>
        </div>

        {/* -- EDIT FIELDS -- */}
        <div className="gt-panel" style={{ padding: 16, marginBottom: 14 }}>
          <p className="gt-section-label" style={{ marginBottom: 10 }}>
            {t("roi.customize")}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { key: "company", label: t("roi.field.company"), type: "text" },
              { key: "industry", label: t("roi.field.industry"), type: "text" },
              { key: "headcount", label: t("roi.field.headcount"), type: "number" },
            ].map((field) => (
              <div key={field.key}>
                <label className="gt-label" style={{ marginBottom: 3 }}>{field.label}</label>
                <input
                  type={field.type}
                  value={(cfg as any)[field.key]}
                  onChange={(e) => { updField(field.key, field.type === "number" ? Number(e.target.value) : e.target.value); }}
                  className="gt-input gt-input-mono"
                />
              </div>
            ))}
          </div>
        </div>

        {/* -- REPORT PREVIEW -- */}
        <div className="gt-panel" style={{ padding: 18, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p className="gt-label">{t("roi.preview")}</p>
            <span className="gt-mono gt-muted" style={{ fontSize: 8 }}>
              {reportText.split("\n").length} {t("roi.lines")}
            </span>
          </div>
          <pre style={{
            fontFamily: f.mono,
            fontSize: 9.5,
            lineHeight: 1.65,
            color: c.text2,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            background: "rgba(0,0,0,0.22)",
            padding: 16,
            borderRadius: 9,
            border: "1px solid " + c.border,
            maxHeight: 480,
            overflow: "auto",
          }}>
            {reportText}
          </pre>
        </div>

        {/* -- ACTION BAR -- */}
        <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
          <button onClick={handleDownload} className="gt-btn gt-btn-primary">
            {t("roi.download")} {"\u2193"}
          </button>
          <button
            onClick={() => { if (navigator.clipboard) { navigator.clipboard.writeText(reportText); } }}
            className="gt-btn gt-btn-ghost">
            {t("roi.copy")}
          </button>
        </div>

        {/* -- FORMAT NOTE -- */}
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <p style={{ fontSize: 9, color: c.text3, lineHeight: 1.5 }}>
            {t("roi.format")}
          </p>
        </div>

        {/* -- TRUST FOOTER -- */}
        <div className="gt-card" style={{ marginTop: 18, padding: "11px 14px", display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
          {[
            { icon: "\u{1F6E1}", title: t("trustfooter.soc2") },
            { icon: "\u{1F510}", title: t("trustfooter.zk") },
            { icon: "\u{1F1FA}\u{1F1F8}", title: t("trustfooter.us") },
            { icon: "\u23F1", title: t("trustfooter.purge") },
          ].map((b) => (
            <div key={b.title} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, color: c.text2 }}>
              <span style={{ fontSize: 13 }}>{b.icon}</span>
              <span style={{ fontWeight: 600 }}>{b.title}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
