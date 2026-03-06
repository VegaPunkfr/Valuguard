"use client";
// @ts-nocheck

import { useState, useMemo } from "react";

/*  VALUGUARD — DASHBOARD (US 2026 FINAL)
    Post-login authenticated view.
    KPI strip + anomaly feed + recovery progress + trajectory.
    100% USD. Bloomberg density. Self-contained demo data. */

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

function fmt(n, s = false) {
  if (s && n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  if (s && n >= 1e4) return "$" + Math.round(n / 1e3) + "k";
  return "$" + Math.round(n).toLocaleString("en-US");
}

// ── Demo data ──────────────────────────────────────
var ANOMALIES = [
  { id: 1, title: "23 inactive Figma licenses", severity: "critical", vendor: "Figma", impact: 2300, type: "Inactive License" },
  { id: 2, title: "3 overlapping AI writing tools", severity: "critical", vendor: "ChatGPT + Jasper + Copy.ai", impact: 1600, type: "Redundant Tool" },
  { id: 3, title: "Salesforce Enterprise for 12 basic users", severity: "high", vendor: "Salesforce", impact: 1200, type: "Oversized Plan" },
  { id: 4, title: "AWS commitment at 48% utilization", severity: "high", vendor: "AWS", impact: 1000, type: "Commitment Waste" },
  { id: 5, title: "Datadog Pro tier unused APM module", severity: "medium", vendor: "Datadog", impact: 780, type: "Unused Feature" },
  { id: 6, title: "Notion purchased without IT approval", severity: "medium", vendor: "Notion", impact: 420, type: "Shadow IT" },
  { id: 7, title: "OpenAI API spend +120% MoM", severity: "critical", vendor: "OpenAI", impact: 3200, type: "AI Cost Drift" },
];

var RECS = [
  { id: 1, title: "Deactivate 23 Figma licenses", savings: 27600, effort: "Easy", status: "done" },
  { id: 2, title: "Consolidate AI writing stack", savings: 19200, effort: "Moderate", status: "in_progress" },
  { id: 3, title: "Downgrade Salesforce plan", savings: 14400, effort: "Easy", status: "pending" },
  { id: 4, title: "Set OpenAI budget caps", savings: 12000, effort: "Easy", status: "pending" },
  { id: 5, title: "Renegotiate AWS at renewal", savings: 12000, effort: "Moderate", status: "pending" },
];

var sevCol = { critical: RD, high: OR, medium: "#d4a72c", low: GR };
var sevBg = { critical: "rgba(239,68,68,0.07)", high: "rgba(245,158,11,0.07)", medium: "rgba(212,167,44,0.07)", low: "rgba(34,197,94,0.07)" };
var statusCol = { done: TL, in_progress: AH, pending: T3 };
var statusLabel = { done: "Done", in_progress: "In Progress", pending: "Pending" };

// ── Sidebar navigation ─────────────────────────────
var NAV = [
  { id: "overview", icon: "📊", label: "Overview" },
  { id: "anomalies", icon: "⚠️", label: "Anomalies" },
  { id: "recovery", icon: "💰", label: "Recovery Plan" },
  { id: "reports", icon: "📋", label: "Reports" },
  { id: "upload", icon: "⬆️", label: "Upload" },
  { id: "settings", icon: "⚙️", label: "Settings" },
];

// ══════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════
export default function Dashboard() {
  var [page, setPage] = useState("overview");
  var [anomalyFilter, setAnomalyFilter] = useState("all");

  var totalLeak = useMemo(function() {
    return ANOMALIES.reduce(function(s, a) { return s + a.impact; }, 0);
  }, []);

  var recoverDone = RECS.filter(function(r) { return r.status === "done"; }).reduce(function(s, r) { return s + r.savings; }, 0);
  var recoverTotal = RECS.reduce(function(s, r) { return s + r.savings; }, 0);
  var recoverPct = recoverTotal > 0 ? Math.round((recoverDone / recoverTotal) * 100) : 0;

  var filteredAnomalies = anomalyFilter === "all"
    ? ANOMALIES
    : ANOMALIES.filter(function(a) { return a.severity === anomalyFilter; });

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: V, fontFamily: SA, color: T1 }}>

      {/* ── SIDEBAR ───────────────────────────────── */}
      <aside style={{ width: 200, borderRight: "1px solid " + BD, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4, flexShrink: 0, background: "rgba(6,9,18,0.9)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, paddingLeft: 8 }}>
          <span style={{ fontSize: 11, fontFamily: MO, fontWeight: 700, letterSpacing: ".06em", color: A }}>VALUGUARD</span>
        </div>
        {NAV.map(function(item) {
          var active = page === item.id;
          return (
            <button
              key={item.id}
              onClick={function() { setPage(item.id); }}
              style={{
                display: "flex", alignItems: "center", gap: 9,
                padding: "8px 10px", borderRadius: 7, border: "none", width: "100%",
                background: active ? "rgba(59,130,246,0.10)" : "transparent",
                color: active ? T1 : T2, fontSize: 12, fontWeight: active ? 600 : 400,
                cursor: "pointer", textAlign: "left", transition: "all 0.1s",
              }}
            >
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        <div style={{ padding: "10px 10px", borderRadius: 7, background: "rgba(0,0,0,0.15)", border: "1px solid " + BD }}>
          <p style={{ fontSize: 9, fontFamily: MO, color: T3, letterSpacing: ".06em", marginBottom: 4 }}>ACME CORP</p>
          <p style={{ fontSize: 10, color: T2 }}>jane@acme.com</p>
        </div>
      </aside>

      {/* ── MAIN CONTENT ──────────────────────────── */}
      <main style={{ flex: 1, padding: "20px 24px", overflow: "auto" }}>

        {/* ── TOPBAR ──────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>
              {page === "overview" ? "Dashboard" : page === "anomalies" ? "Anomalies" : page === "recovery" ? "Recovery Plan" : page.charAt(0).toUpperCase() + page.slice(1)}
            </h1>
            <p style={{ fontSize: 11, color: T3 }}>Last updated: Today, 2:47 PM EST</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 8, fontFamily: MO, color: T3, padding: "3px 7px", borderRadius: 4, border: "1px solid " + BD }}>⌘K</span>
            <button style={{ padding: "7px 14px", borderRadius: 6, border: "none", background: A, color: "#fff", fontSize: 10, fontWeight: 700, letterSpacing: ".04em", cursor: "pointer" }}>
              NEW UPLOAD ⬆
            </button>
          </div>
        </div>

        {/* ═══════ OVERVIEW PAGE ═══════ */}
        {page === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* KPI Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
              {[
                { label: "Monthly Spend", value: fmt(64000), color: T1, delta: null },
                { label: "Ghost Tax (annual)", value: fmt(totalLeak * 12, true), color: RD, delta: null },
                { label: "Health Score", value: "34/100", color: RD, delta: null },
                { label: "Open Anomalies", value: ANOMALIES.length.toString(), color: OR, delta: null },
                { label: "Recovered YTD", value: fmt(recoverDone, true), color: TL, delta: "+" + recoverPct + "%" },
              ].map(function(kpi) {
                return (
                  <div key={kpi.label} style={Object.assign({}, gl, { padding: 14, textAlign: "center" })}>
                    <p style={{ fontSize: 8, color: T3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 5 }}>{kpi.label}</p>
                    <p style={{ fontFamily: MO, fontSize: 20, fontWeight: 800, color: kpi.color, lineHeight: 1 }}>{kpi.value}</p>
                    {kpi.delta && <p style={{ fontSize: 9, fontFamily: MO, color: TL, marginTop: 4 }}>{kpi.delta}</p>}
                  </div>
                );
              })}
            </div>

            {/* Two-column: Anomalies + Recovery */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {/* Top anomalies */}
              <div style={Object.assign({}, gl, { padding: 16 })}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <p style={{ fontSize: 9, fontFamily: MO, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: T3 }}>TOP ANOMALIES</p>
                  <button onClick={function() { setPage("anomalies"); }} style={{ fontSize: 9, color: AH, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>VIEW ALL →</button>
                </div>
                {ANOMALIES.slice(0, 4).map(function(a) {
                  return (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(36,48,78,0.12)" }}>
                      <span style={{ fontSize: 8, fontFamily: MO, fontWeight: 600, padding: "2px 6px", borderRadius: 3, background: sevBg[a.severity], border: "1px solid " + sevCol[a.severity] + "25", color: sevCol[a.severity], textTransform: "uppercase", letterSpacing: ".04em" }}>
                        {a.severity.slice(0, 4)}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 11, color: T1, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.title}</p>
                        <p style={{ fontSize: 9, color: T3 }}>{a.vendor}</p>
                      </div>
                      <span style={{ fontFamily: MO, fontSize: 12, fontWeight: 700, color: sevCol[a.severity], flexShrink: 0 }}>{fmt(a.impact)}/mo</span>
                    </div>
                  );
                })}
              </div>

              {/* Recovery progress */}
              <div style={Object.assign({}, gl, { padding: 16 })}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <p style={{ fontSize: 9, fontFamily: MO, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: T3 }}>RECOVERY PROGRESS</p>
                  <span style={{ fontFamily: MO, fontSize: 13, fontWeight: 700, color: TL }}>{recoverPct}%</span>
                </div>
                {/* Progress bar */}
                <div style={{ height: 6, borderRadius: 3, background: "#121728", marginBottom: 14 }}>
                  <div style={{ height: "100%", width: recoverPct + "%", borderRadius: 3, background: "linear-gradient(90deg," + A + "," + TL + ")", transition: "width 0.6s" }} />
                </div>
                {RECS.map(function(r) {
                  var col = statusCol[r.status];
                  return (
                    <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(36,48,78,0.12)" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: col, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 11, color: T1, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</p>
                        <p style={{ fontSize: 9, color: T3 }}>{statusLabel[r.status]} · {r.effort}</p>
                      </div>
                      <span style={{ fontFamily: MO, fontSize: 12, fontWeight: 700, color: TL, flexShrink: 0 }}>{fmt(r.savings, true)}/yr</span>
                    </div>
                  );
                })}
                <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 6, background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.12)", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 10, color: T2 }}>Total recoverable</span>
                  <span style={{ fontFamily: MO, fontSize: 14, fontWeight: 800, color: TL }}>{fmt(recoverTotal)}/yr</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ ANOMALIES PAGE ═══════ */}
        {page === "anomalies" && (
          <div style={Object.assign({}, gl, { padding: 18 })}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <p style={{ fontSize: 14, fontWeight: 600 }}>{filteredAnomalies.length} anomalies detected</p>
              <div style={{ display: "flex", gap: 4 }}>
                {["all", "critical", "high", "medium"].map(function(f) {
                  var active = anomalyFilter === f;
                  return (
                    <button key={f} onClick={function() { setAnomalyFilter(f); }}
                      style={{ padding: "4px 10px", borderRadius: 5, border: "none", fontSize: 9, fontFamily: MO, fontWeight: 600, textTransform: "uppercase", background: active ? A : "rgba(0,0,0,0.12)", color: active ? "#fff" : T3, cursor: "pointer", letterSpacing: ".04em" }}>
                      {f}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {filteredAnomalies.map(function(a) {
                return (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 8, background: sevBg[a.severity], border: "1px solid " + sevCol[a.severity] + "14" }}>
                    <span style={{ fontSize: 8, fontFamily: MO, fontWeight: 600, padding: "3px 7px", borderRadius: 4, background: sevCol[a.severity] + "18", border: "1px solid " + sevCol[a.severity] + "30", color: sevCol[a.severity], textTransform: "uppercase", letterSpacing: ".04em", flexShrink: 0 }}>
                      {a.severity}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: T1, marginBottom: 2 }}>{a.title}</p>
                      <p style={{ fontSize: 10, color: T3 }}>{a.vendor} · {a.type}</p>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p style={{ fontFamily: MO, fontSize: 14, fontWeight: 800, color: sevCol[a.severity] }}>{fmt(a.impact)}</p>
                      <p style={{ fontSize: 8, color: T3 }}>per month</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════ RECOVERY PAGE ═══════ */}
        {page === "recovery" && (
          <div style={Object.assign({}, gl, { padding: 18 })}>
            <p style={{ fontSize: 9, fontFamily: MO, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: A, marginBottom: 6 }}>PROFIT RECOVERY PROTOCOL</p>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>5 actions. {fmt(recoverTotal, true)} recoverable per year.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {RECS.map(function(r) {
                var col = statusCol[r.status];
                var efCol = r.effort === "Easy" ? TL : OR;
                return (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 8, background: "rgba(0,0,0,0.12)", border: "1px solid rgba(36,48,78,0.14)" }}>
                    <div style={{ width: 30, height: 30, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.18)", fontFamily: MO, fontSize: 13, fontWeight: 800, color: A, flexShrink: 0 }}>
                      {r.id}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: T1, marginBottom: 3 }}>{r.title}</p>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ fontSize: 8, fontFamily: MO, padding: "2px 6px", borderRadius: 3, background: efCol + "12", border: "1px solid " + efCol + "22", color: efCol }}>{r.effort}</span>
                        <span style={{ fontSize: 8, fontFamily: MO, padding: "2px 6px", borderRadius: 3, background: col + "15", border: "1px solid " + col + "25", color: col }}>{statusLabel[r.status]}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p style={{ fontFamily: MO, fontSize: 16, fontWeight: 800, color: TL }}>{fmt(r.savings, true)}</p>
                      <p style={{ fontSize: 8, color: T3 }}>per year</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 7, background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.12)", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, color: T2 }}>Recovered so far</span>
              <span style={{ fontFamily: MO, fontSize: 15, fontWeight: 800, color: TL }}>{fmt(recoverDone)} of {fmt(recoverTotal)}/yr ({recoverPct}%)</span>
            </div>
          </div>
        )}

        {/* Placeholder pages */}
        {(page === "reports" || page === "upload" || page === "settings") && (
          <div style={Object.assign({}, gl, { padding: 32, textAlign: "center" })}>
            <p style={{ fontSize: 28, marginBottom: 10 }}>{page === "reports" ? "📋" : page === "upload" ? "⬆️" : "⚙️"}</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: T1, marginBottom: 4 }}>{page.charAt(0).toUpperCase() + page.slice(1)}</p>
            <p style={{ fontSize: 12, color: T3 }}>This section is available in the full Valuguard application.</p>
          </div>
        )}

      </main>
    </div>
  );
}



