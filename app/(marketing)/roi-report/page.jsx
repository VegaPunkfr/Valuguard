"use client";
import { useState, useMemo, useCallback } from "react";

/*  VALUGUARD — BOARD REPORT GENERATOR (US 2026)
    Creates a downloadable executive summary for the C-suite.
    Pre-filled with Ghost Tax diagnostic data.
    Formats: preview on-screen + download as .txt
    100% USD. Zero EUR. Zero French. */

// ── Tokens ─────────────────────────────────────────
const V = "#060912";
const A = "#3b82f6";
const AH = "#60a5fa";
const T1 = "#e0e6f2";
const T2 = "#8d9bb5";
const T3 = "#55637d";
const RD = "#ef4444";
const TL = "#34d399";
const BD = "rgba(36,48,78,0.32)";
const MO = "ui-monospace,'Cascadia Code','Fira Code',monospace";
const SA = "system-ui,-apple-system,sans-serif";

const gl = {
  background: "rgba(11,14,24,0.72)",
  backdropFilter: "blur(18px) saturate(1.15)",
  WebkitBackdropFilter: "blur(18px) saturate(1.15)",
  border: "1px solid " + BD,
  borderRadius: 12,
  boxShadow: "0 4px 32px rgba(0,0,0,0.28)",
};

function fmt(n, short) {
  if (short && n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  if (short && n >= 1e4) return "$" + Math.round(n / 1e3) + "k";
  return "$" + Math.round(n).toLocaleString("en-US");
}

// ── Report generator ───────────────────────────────
function buildReport(cfg) {
  var date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  var lines = [];

  lines.push("══════════════════════════════════════════════════════════");
  lines.push("   VALUGUARD — EXECUTIVE GHOST TAX SUMMARY");
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

  cfg.actions.forEach(function(a, i) {
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
  lines.push("  1. Schedule a Valuguard Priority Audit ($990)");
  lines.push("  2. Receive full anomaly report within 48 hours");
  lines.push("  3. Implement top 3 quick wins (est. " + fmt(cfg.actions.slice(0, 3).reduce(function(s, a) { return s + a.savings; }, 0), true) + "/yr recovered)");
  lines.push("  4. Typical first-quarter ROI: 15-40x");
  lines.push("");
  lines.push("  Contact: audits@valuguard.com | valuguard.com");
  lines.push("  SOC2 Type II Readiness | Zero-Knowledge Audit | US Data Residency");
  lines.push("══════════════════════════════════════════════════════════");

  return lines.join("\n");
}

function pad(str, width) {
  while (str.length < width) str = str + " ";
  return str;
}

// ── Download handler ───────────────────────────────
function downloadTxt(content, filename) {
  var blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════
export default function BoardReport() {
  // Editable fields (pre-filled with demo diagnostic)
  var [cfg, setCfg] = useState({
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

  var reportText = useMemo(function() { return buildReport(cfg); }, [cfg]);

  var handleDownload = useCallback(function() {
    var filename = "valuguard-ghost-tax-" + cfg.company.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + new Date().toISOString().slice(0, 10) + ".txt";
    downloadTxt(reportText, filename);
  }, [reportText, cfg.company]);

  function updField(key, val) {
    setCfg(function(prev) {
      var next = Object.assign({}, prev);
      next[key] = val;
      return next;
    });
  }

  return (
    <div style={{ minHeight: "100vh", background: V, fontFamily: SA, color: T1, padding: "24px 14px 48px" }}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>

        {/* ── RETOUR ─────────────────────────────── */}
        <div style={{ marginBottom: 14 }}><a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "#8d9bb5", textDecoration: "none", padding: "6px 12px", borderRadius: 6, border: "1px solid rgba(36,48,78,0.32)", background: "rgba(11,14,24,0.5)" }}>{"\u2190"} Back</a></div>

        {/* ── HEADER ──────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, fontFamily: MO, fontWeight: 700, letterSpacing: ".06em", color: A }}>VALUGUARD</span>
            <span style={{ fontSize: 8, color: T3, fontFamily: MO, padding: "2px 6px", borderRadius: 3, border: "1px solid " + BD }}>BOARD REPORT</span>
          </div>
          <button
            onClick={handleDownload}
            style={{ padding: "7px 16px", borderRadius: 7, border: "none", background: TL, color: V, fontSize: 10, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", cursor: "pointer" }}
          >
            ↓ DOWNLOAD .TXT
          </button>
        </div>

        {/* ── EDIT FIELDS (quick customization) ──── */}
        <div style={Object.assign({}, gl, { padding: 16, marginBottom: 14 })}>
          <p style={{ fontSize: 9, fontFamily: MO, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: A, marginBottom: 10 }}>
            CUSTOMIZE BEFORE DOWNLOAD
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { key: "company", label: "Company Name", type: "text" },
              { key: "industry", label: "Industry", type: "text" },
              { key: "headcount", label: "Headcount", type: "number" },
            ].map(function(f) {
              return (
                <div key={f.key}>
                  <label style={{ display: "block", fontSize: 8, color: T3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 3 }}>{f.label}</label>
                  <input
                    type={f.type}
                    value={cfg[f.key]}
                    onChange={function(e) { updField(f.key, f.type === "number" ? Number(e.target.value) : e.target.value); }}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #1e2640", background: "#080b14", color: T1, fontSize: 12, fontFamily: MO, outline: "none", boxSizing: "border-box" }}
                    onFocus={function(e) { e.target.style.borderColor = A; }}
                    onBlur={function(e) { e.target.style.borderColor = "#1e2640"; }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* ── REPORT PREVIEW ──────────────────────── */}
        <div style={Object.assign({}, gl, { padding: 18, marginBottom: 14 })}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ fontSize: 9, fontFamily: MO, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: T3 }}>
              LIVE PREVIEW
            </p>
            <span style={{ fontSize: 8, fontFamily: MO, color: T3 }}>
              {reportText.split("\n").length} lines
            </span>
          </div>
          <pre style={{
            fontFamily: MO,
            fontSize: 9.5,
            lineHeight: 1.65,
            color: T2,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            background: "rgba(0,0,0,0.22)",
            padding: 16,
            borderRadius: 9,
            border: "1px solid rgba(36,48,78,0.18)",
            maxHeight: 480,
            overflow: "auto",
          }}>
            {reportText}
          </pre>
        </div>

        {/* ── ACTION BAR ──────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
          <button
            onClick={handleDownload}
            style={{ padding: "12px 28px", borderRadius: 8, border: "none", background: A, color: "#fff", fontSize: 12, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", cursor: "pointer" }}
          >
            DOWNLOAD EXECUTIVE SUMMARY ↓
          </button>
          <button
            onClick={function() {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(reportText);
              }
            }}
            style={{ padding: "12px 20px", borderRadius: 8, border: "1px solid " + BD, background: "transparent", color: T2, fontSize: 12, cursor: "pointer" }}
          >
            COPY TO CLIPBOARD
          </button>
        </div>

        {/* ── FORMAT NOTE ──────────────────────────── */}
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <p style={{ fontSize: 9, color: T3, lineHeight: 1.5 }}>
            Plain-text format ensures compatibility with any email client, Slack, or presentation deck.
            Paste directly into your board materials. No formatting issues.
          </p>
        </div>

        {/* ── TRUST FOOTER ─────────────────────────── */}
        <div style={{ marginTop: 18, padding: "11px 14px", borderRadius: 10, border: "1px solid " + BD, background: "rgba(11,14,24,0.35)", display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
          {[
            { icon: "🛡", title: "SOC2 Type II Ready" },
            { icon: "🔐", title: "Zero-Knowledge Audit" },
            { icon: "🇺🇸", title: "US Data Residency" },
            { icon: "⏱", title: "30-Day Auto-Delete" },
          ].map(function(b) {
            return (
              <div key={b.title} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, color: T2 }}>
                <span style={{ fontSize: 13 }}>{b.icon}</span>
                <span style={{ fontWeight: 600 }}>{b.title}</span>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
