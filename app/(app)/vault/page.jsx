"use client";
// @ts-nocheck

import { useState, useMemo, useCallback } from "react";

/*  VALUGUARD — THE VAULT (US 2026)
    Secure client hub. Landing zone after Ghost Tax diagnostic.
    Shows: results summary, recovery roadmap, account creation.
    100% USD. Zero EUR. Zero French. */

// ── Tokens ─────────────────────────────────────────
const V = "#060912";
const A = "#3b82f6";
const AH = "#60a5fa";
const T1 = "#e0e6f2";
const T2 = "#8d9bb5";
const T3 = "#55637d";
const RD = "#ef4444";
const OR = "#f59e0b";
const GR = "#22c55e";
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

function fmt(n, short = false) {
  if (short && n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  if (short && n >= 1e4) return "$" + Math.round(n / 1e3) + "k";
  return "$" + Math.round(n).toLocaleString("en-US");
}

// ── Simulated diagnostic data (in production: from stealth cache or Supabase)
function generateDemoData() {
  return {
    company: "Acme Corp",
    headcount: 150,
    industry: "SaaS / Tech",
    monthlyIT: 64000,
    ghostTax: 178000,
    ghostTaxLow: 134000,
    ghostTaxHigh: 205000,
    entropyScore: 72,
    entropyKappa: 0.132,
    peerPercentile: 78,
    peerLabel: "SaaS scale-ups",
    auditROI: 18.2,
    recoverable: 106800,
    topActions: [
      { rank: 1, label: "Deactivate 23 unused Figma licenses", savings: 27600, effort: "Easy", days: 3 },
      { rank: 2, label: "Consolidate 3 AI writing tools to 1", savings: 19200, effort: "Moderate", days: 10 },
      { rank: 3, label: "Downgrade Salesforce Enterprise → Pro", savings: 14400, effort: "Easy", days: 5 },
      { rank: 4, label: "Renegotiate AWS commitment at renewal", savings: 12000, effort: "Moderate", days: 14 },
      { rank: 5, label: "Eliminate duplicate analytics stack", savings: 9600, effort: "Moderate", days: 7 },
    ],
    burnRate: {
      now: 64000,
      mo6ungov: 78400,
      mo6gov: 68200,
      mo12ungov: 96000,
      mo12gov: 72600,
      mo24ungov: 144000,
      mo24gov: 82100,
      savings24: 412000,
    },
  };
}

// ── Severity color helper ──────────────────────────
function scoreColor(score) {
  if (score >= 61) return RD;
  if (score >= 31) return OR;
  return GR;
}

function pctColor(pct) {
  if (pct > 75) return RD;
  if (pct > 50) return OR;
  if (pct > 25) return GR;
  return TL;
}

// ══════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════
export default function VaultShell() {
  var data = useMemo(generateDemoData, []);
  var [activeSection, setActiveSection] = useState("overview");
  var [formState, setFormState] = useState({ name: "", email: "", company: "" });
  var [submitted, setSubmitted] = useState(false);

  var handleInput = useCallback(function(key, val) {
    setFormState(function(prev) {
      var next = Object.assign({}, prev);
      next[key] = val;
      return next;
    });
  }, []);

  var handleSubmit = useCallback(function() {
    if (formState.email.indexOf("@") > 0 && formState.company.length > 1) {
      setSubmitted(true);
    }
  }, [formState]);

  var sCol = scoreColor(data.entropyScore);
  var pCol = pctColor(data.peerPercentile);

  var navItems = [
    { id: "overview", label: "Overview" },
    { id: "actions", label: "Recovery Plan" },
    { id: "trajectory", label: "Trajectory" },
    { id: "secure", label: "Secure My Vault" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: V, fontFamily: SA, color: T1, padding: "20px 14px 48px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>

        {/* ── HEADER ──────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, fontFamily: MO, fontWeight: 700, letterSpacing: ".06em", color: A }}>VALUGUARD</span>
            <span style={{ fontSize: 8, color: T3, fontFamily: MO, padding: "2px 6px", borderRadius: 3, border: "1px solid " + BD }}>VAULT</span>
          </div>
          <span style={{ fontSize: 8, color: TL, fontFamily: MO, padding: "3px 8px", borderRadius: 4, background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.18)" }}>
            🔐 Stealth Mode — all data local
          </span>
        </div>

        {/* ── NAV TABS ────────────────────────────── */}
        <div style={Object.assign({}, gl, { padding: "4px", marginBottom: 16, display: "flex", gap: 2 })}>
          {navItems.map(function(item) {
            var active = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={function() { setActiveSection(item.id); }}
                style={{
                  flex: 1, padding: "8px 12px", borderRadius: 8, border: "none",
                  fontSize: 11, fontWeight: 600, fontFamily: MO, letterSpacing: ".03em",
                  background: active ? A : "transparent",
                  color: active ? "#fff" : T2,
                  cursor: "pointer", transition: "all 0.12s",
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* ═══════ OVERVIEW ═══════ */}
        {activeSection === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* KPI Strip */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {[
                { label: "Ghost Tax", value: fmt(data.ghostTax, true) + "/yr", color: sCol, sub: fmt(data.ghostTaxLow) + " – " + fmt(data.ghostTaxHigh) },
                { label: "Entropy Score", value: data.entropyScore + "/100", color: sCol, sub: data.entropyScore >= 61 ? "Critical" : data.entropyScore >= 31 ? "Elevated" : "Healthy" },
                { label: "Peer Percentile", value: "P" + data.peerPercentile, color: pCol, sub: "vs " + data.peerLabel },
                { label: "Audit ROI", value: "×" + data.auditROI, color: TL, sub: "$990 → " + fmt(data.recoverable, true) },
              ].map(function(kpi) {
                return (
                  <div key={kpi.label} style={Object.assign({}, gl, { padding: 14, textAlign: "center" })}>
                    <p style={{ fontSize: 8, color: T3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 5 }}>{kpi.label}</p>
                    <p style={{ fontFamily: MO, fontSize: 22, fontWeight: 800, color: kpi.color, lineHeight: 1 }}>{kpi.value}</p>
                    <p style={{ fontSize: 8, color: T3, marginTop: 4 }}>{kpi.sub}</p>
                  </div>
                );
              })}
            </div>

            {/* Summary card */}
            <div style={Object.assign({}, gl, { padding: 18 })}>
              <p style={{ fontSize: 9, fontFamily: MO, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: A, marginBottom: 8 }}>
                DIAGNOSTIC SUMMARY
              </p>
              <p style={{ fontSize: 13, color: T2, lineHeight: 1.6 }}>
                Your organization spends <strong style={{ color: T1 }}>{fmt(data.monthlyIT)}/month</strong> across
                SaaS, Cloud, and AI. Our analysis identified an estimated{" "}
                <strong style={{ color: sCol }}>{fmt(data.ghostTax, true)}/year</strong> in recoverable Ghost Tax.
                At <strong style={{ color: pCol }}>P{data.peerPercentile}</strong>, you are less efficient
                than {data.peerPercentile}% of comparable {data.peerLabel}.{" "}
                The top 5 recovery actions below can reclaim{" "}
                <strong style={{ color: TL }}>{fmt(data.recoverable, true)}</strong> within 90 days.
              </p>
            </div>

            {/* Quick peek at top 3 actions */}
            <div style={Object.assign({}, gl, { padding: 16 })}>
              <p style={{ fontSize: 9, fontFamily: MO, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: T3, marginBottom: 10 }}>
                TOP 3 RECOVERY ACTIONS
              </p>
              {data.topActions.slice(0, 3).map(function(action) {
                return (
                  <div key={action.rank} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid rgba(36,48,78,0.15)" }}>
                    <span style={{ fontFamily: MO, fontSize: 12, fontWeight: 800, color: A, width: 22 }}>#{action.rank}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, color: T1, fontWeight: 500 }}>{action.label}</p>
                      <p style={{ fontSize: 9, color: T3 }}>{action.effort} · ~{action.days} days</p>
                    </div>
                    <span style={{ fontFamily: MO, fontSize: 13, fontWeight: 700, color: TL }}>{fmt(action.savings, true)}/yr</span>
                  </div>
                );
              })}
              <button onClick={function() { setActiveSection("actions"); }}
                style={{ marginTop: 10, padding: "8px 16px", borderRadius: 7, border: "1px solid " + A + "25", background: "rgba(59,130,246,0.05)", color: AH, fontSize: 10, fontWeight: 600, cursor: "pointer", width: "100%" }}>
                VIEW FULL RECOVERY PLAN →
              </button>
            </div>
          </div>
        )}

        {/* ═══════ ACTIONS (RECOVERY PLAN) ═══════ */}
        {activeSection === "actions" && (
          <div style={Object.assign({}, gl, { padding: 18 })}>
            <p style={{ fontSize: 9, fontFamily: MO, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: A, marginBottom: 6 }}>
              PROFIT RECOVERY PROTOCOL
            </p>
            <p style={{ fontSize: 18, fontWeight: 700, color: T1, marginBottom: 4 }}>
              5 actions. {fmt(data.recoverable, true)} recoverable.
            </p>
            <p style={{ fontSize: 12, color: T2, marginBottom: 16, lineHeight: 1.5 }}>
              Ranked by savings-to-effort ratio. Start from #1 for maximum ROI.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {data.topActions.map(function(action) {
                var effortCol = action.effort === "Easy" ? TL : OR;
                return (
                  <div key={action.rank} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 9, background: "rgba(0,0,0,0.15)", border: "1px solid rgba(36,48,78,0.18)" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.20)", fontFamily: MO, fontSize: 14, fontWeight: 800, color: A, flexShrink: 0 }}>
                      {action.rank}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: T1, marginBottom: 2 }}>{action.label}</p>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 9, fontFamily: MO, padding: "2px 6px", borderRadius: 3, background: effortCol + "12", border: "1px solid " + effortCol + "25", color: effortCol }}>{action.effort}</span>
                        <span style={{ fontSize: 9, color: T3 }}>~{action.days} days</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p style={{ fontFamily: MO, fontSize: 16, fontWeight: 800, color: TL }}>{fmt(action.savings, true)}</p>
                      <p style={{ fontSize: 8, color: T3 }}>per year</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 8, background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.12)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: T2 }}>Total recoverable (60% conservative)</span>
              <span style={{ fontFamily: MO, fontSize: 18, fontWeight: 800, color: TL }}>{fmt(data.recoverable)}/yr</span>
            </div>
          </div>
        )}

        {/* ═══════ TRAJECTORY ═══════ */}
        {activeSection === "trajectory" && (
          <div style={Object.assign({}, gl, { padding: 18 })}>
            <p style={{ fontSize: 9, fontFamily: MO, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: A, marginBottom: 6 }}>
              24-MONTH COST TRAJECTORY
            </p>
            <p style={{ fontSize: 13, color: T2, lineHeight: 1.5, marginBottom: 18 }}>
              Without governance, your IT spend grows exponentially due to unchecked SaaS sprawl and AI adoption.
              With Valuguard governance, growth is reduced by 65%.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
              {[
                { label: "Now", ungov: data.burnRate.now, gov: data.burnRate.now },
                { label: "6 months", ungov: data.burnRate.mo6ungov, gov: data.burnRate.mo6gov },
                { label: "12 months", ungov: data.burnRate.mo12ungov, gov: data.burnRate.mo12gov },
                { label: "24 months", ungov: data.burnRate.mo24ungov, gov: data.burnRate.mo24gov },
              ].map(function(point) {
                var diff = point.ungov - point.gov;
                return (
                  <div key={point.label} style={{ padding: 12, borderRadius: 9, background: "rgba(0,0,0,0.15)", border: "1px solid rgba(36,48,78,0.15)", textAlign: "center" }}>
                    <p style={{ fontSize: 8, color: T3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>{point.label}</p>
                    <p style={{ fontFamily: MO, fontSize: 11, color: RD + "cc", marginBottom: 2 }}>{fmt(point.ungov)}<span style={{ fontSize: 8 }}>/mo</span></p>
                    <p style={{ fontFamily: MO, fontSize: 11, color: TL, marginBottom: 4 }}>{fmt(point.gov)}<span style={{ fontSize: 8 }}>/mo</span></p>
                    {diff > 0 && (
                      <p style={{ fontSize: 9, fontFamily: MO, fontWeight: 700, color: TL }}>↓ {fmt(diff, true)}</p>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ padding: "12px 16px", borderRadius: 9, background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.14)", textAlign: "center" }}>
              <p style={{ fontSize: 10, color: T2, marginBottom: 4 }}>Cumulative 24-month governance savings</p>
              <p style={{ fontFamily: MO, fontSize: 28, fontWeight: 800, color: TL }}>{fmt(data.burnRate.savings24)}</p>
              <p style={{ fontSize: 9, color: T3, marginTop: 4 }}>
                That's {Math.round(data.burnRate.savings24 / 990)}x the cost of an initial audit.
              </p>
            </div>
          </div>
        )}

        {/* ═══════ SECURE MY VAULT ═══════ */}
        {activeSection === "secure" && (
          <div style={Object.assign({}, gl, { padding: 22 })}>
            {submitted ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <p style={{ fontSize: 28 }}>🔐</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: TL, marginTop: 10, marginBottom: 6 }}>
                  Vault Created Successfully
                </p>
                <p style={{ fontSize: 13, color: T2, lineHeight: 1.6, maxWidth: 400, margin: "0 auto" }}>
                  Your diagnostic data has been securely transferred from your browser to your encrypted Vault.
                  A recovery specialist will contact you within 24 hours at <strong style={{ color: T1 }}>{formState.email}</strong>.
                </p>
                <div style={{ marginTop: 20, padding: "10px 14px", borderRadius: 8, background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.12)", display: "inline-block" }}>
                  <p style={{ fontSize: 9, fontFamily: MO, color: T3, letterSpacing: ".06em" }}>
                    VAULT ID: VG-{Date.now().toString(36).toUpperCase()}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 9, fontFamily: MO, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: A, marginBottom: 8 }}>
                  CREATE YOUR SECURE VAULT
                </p>
                <p style={{ fontSize: 16, fontWeight: 700, color: T1, marginBottom: 4 }}>
                  Persist your diagnostic. Unlock your recovery plan.
                </p>
                <p style={{ fontSize: 12, color: T2, lineHeight: 1.5, marginBottom: 18 }}>
                  Your Ghost Tax data currently lives only in your browser (Stealth Mode).
                  Create a Vault to save it securely, receive your full report, and schedule a recovery session.
                </p>

                {/* Privacy assurance */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
                  {[
                    { icon: "🔐", text: "AES-256 encrypted at rest" },
                    { icon: "🇺🇸", text: "Stored in US (Virginia)" },
                    { icon: "⏱", text: "Auto-deleted after 30 days" },
                    { icon: "🚫", text: "Never sold or shared" },
                  ].map(function(item) {
                    return (
                      <div key={item.text} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 6, background: "rgba(52,211,153,0.03)", border: "1px solid rgba(52,211,153,0.10)", fontSize: 10, color: T2 }}>
                        <span style={{ fontSize: 14 }}>{item.icon}</span>
                        {item.text}
                      </div>
                    );
                  })}
                </div>

                {/* Form */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    { key: "name", label: "Your Name", placeholder: "Jane Smith" },
                    { key: "email", label: "Work Email", placeholder: "jane@company.com" },
                    { key: "company", label: "Company", placeholder: "Acme Corp" },
                  ].map(function(field) {
                    return (
                      <div key={field.key}>
                        <label style={{ display: "block", fontSize: 9, letterSpacing: ".08em", textTransform: "uppercase", color: T3, fontWeight: 500, marginBottom: 4 }}>{field.label}</label>
                        <input
                          type={field.key === "email" ? "email" : "text"}
                          value={formState[field.key]}
                          onChange={function(e) { handleInput(field.key, e.target.value); }}
                          placeholder={field.placeholder}
                          style={{ width: "100%", padding: "10px 12px", borderRadius: 7, border: "1px solid #1e2640", background: "#080b14", color: T1, fontSize: 13, fontFamily: MO, outline: "none", boxSizing: "border-box" }}
                          onFocus={function(e) { e.target.style.borderColor = A; }}
                          onBlur={function(e) { e.target.style.borderColor = "#1e2640"; }}
                        />
                      </div>
                    );
                  })}

                  <button
                    onClick={handleSubmit}
                    disabled={formState.email.indexOf("@") < 1 || formState.company.length < 2}
                    style={{
                      width: "100%", padding: "14px", borderRadius: 8, border: "none",
                      background: (formState.email.indexOf("@") > 0 && formState.company.length > 1) ? TL : "#131828",
                      color: (formState.email.indexOf("@") > 0 && formState.company.length > 1) ? V : T3,
                      fontSize: 13, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase",
                      cursor: (formState.email.indexOf("@") > 0 && formState.company.length > 1) ? "pointer" : "not-allowed",
                      transition: "all 0.15s",
                    }}
                  >
                    🔐 SECURE MY VAULT — RECLAIM {fmt(data.recoverable, true)}
                  </button>

                  <p style={{ fontSize: 8, color: T3, textAlign: "center" }}>
                    By creating a Vault, you consent to Valuguard securely storing your diagnostic data.
                    All data encrypted, US-hosted, auto-deleted in 30 days. See our Security Vault page for full details.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

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



