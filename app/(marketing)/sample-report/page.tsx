"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { c, f } from "@/lib/tokens";

/*  GHOST TAX — SAMPLE REPORT (US 2026)
    Interactive demo of what the client gets after an audit.
    Pre-filled with realistic data for "Nexus Digital" (fake company).
    100% USD. Self-contained. i18n via useI18n(). */

function fmt(n: number, s?: boolean) {
  if (s && n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  if (s && n >= 1e4) return "$" + Math.round(n / 1e3) + "k";
  return "$" + Math.round(n).toLocaleString("en-US");
}

const COMPANY = {
  name: "Nexus Digital",
  industry: "SaaS / Tech",
  headcount: 185,
  tools: 74,
  monthlyIT: 82000,
  period: "Jan 1 – Mar 31, 2026",
};

const SCORE = {
  health: 31,
  ghostTax: 224000,
  ghostTaxMo: 18667,
  leakPct: 22.8,
  kappa: 0.158,
  peerPct: 82,
};

const ANOMALY_DEFS = [
  { id: 1, titleKey: "sample.a1.title", sev: "critical" as const, vendor: "Slack", typeKey: "sample.type.inactive", impactMo: 3100, impactYr: 37200 },
  { id: 2, titleKey: "sample.a2.title", sev: "critical" as const, vendor: "OpenAI", typeKey: "sample.type.aidrift", impactMo: 4200, impactYr: 50400 },
  { id: 3, titleKey: "sample.a3.title", sev: "critical" as const, vendor: "ChatGPT + Jasper + Copy.ai", typeKey: "sample.type.redundant", impactMo: 1800, impactYr: 21600 },
  { id: 4, titleKey: "sample.a4.title", sev: "high" as const, vendor: "Salesforce", typeKey: "sample.type.oversized", impactMo: 1500, impactYr: 18000 },
  { id: 5, titleKey: "sample.a5.title", sev: "high" as const, vendor: "AWS", typeKey: "sample.type.commitment", impactMo: 2800, impactYr: 33600 },
  { id: 6, titleKey: "sample.a6.title", sev: "high" as const, vendor: "Figma", typeKey: "sample.type.oversized", impactMo: 960, impactYr: 11520 },
  { id: 7, titleKey: "sample.a7.title", sev: "medium" as const, vendor: "Notion", typeKey: "sample.type.shadow", impactMo: 680, impactYr: 8160 },
  { id: 8, titleKey: "sample.a8.title", sev: "medium" as const, vendor: "Datadog", typeKey: "sample.type.unused", impactMo: 1200, impactYr: 14400 },
  { id: 9, titleKey: "sample.a9.title", sev: "medium" as const, vendor: "HubSpot", typeKey: "sample.type.contract", impactMo: 540, impactYr: 6480 },
  { id: 10, titleKey: "sample.a10.title", sev: "low" as const, vendor: "Vercel", typeKey: "sample.type.orphan", impactMo: 320, impactYr: 3840 },
];

const REC_DEFS = [
  { rank: 1, titleKey: "sample.r1.title", savings: 37200, effortKey: "sample.effort.easy", days: 2, related: [1] },
  { rank: 2, titleKey: "sample.r2.title", savings: 25200, effortKey: "sample.effort.easy", days: 3, related: [2] },
  { rank: 3, titleKey: "sample.r3.title", savings: 21600, effortKey: "sample.effort.moderate", days: 14, related: [3] },
  { rank: 4, titleKey: "sample.r4.title", savings: 16800, effortKey: "sample.effort.moderate", days: 30, related: [5] },
  { rank: 5, titleKey: "sample.r5.title", savings: 18000, effortKey: "sample.effort.easy", days: 5, related: [4] },
];

const CAT_DEFS = [
  { nameKey: "sample.cat.saas", spend: 42000, leak: 9200, pct: 21.9 },
  { nameKey: "sample.cat.cloud", spend: 24000, leak: 4600, pct: 19.2 },
  { nameKey: "sample.cat.ai", spend: 16000, leak: 4867, pct: 30.4 },
];

const sevCol: Record<string, string> = { critical: c.red, high: c.amber, medium: "#d4a72c", low: c.green };
const sevBg: Record<string, string> = { critical: c.redBg, high: c.amberBg, medium: "rgba(212,167,44,0.06)", low: c.greenBg };

function Gauge({ score, label, t }: { score: number; label: string; t: (k: string) => string }) {
  const R = 44, ci = 2 * Math.PI * R, off = ci - (score / 100) * ci;
  const col = score >= 61 ? c.red : score >= 31 ? c.amber : c.green;
  const lab = score >= 61 ? t("sample.sev.critical") : score >= 31 ? t("sample.sev.elevated") : t("sample.sev.healthy");
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width="130" height="130" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={R} fill="none" stroke={c.raised} strokeWidth="7" />
        <circle cx="60" cy="60" r={R} fill="none" stroke={col} strokeWidth="7" strokeLinecap="round" strokeDasharray={ci} strokeDashoffset={off} transform="rotate(-90 60 60)" style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)" }} />
        <text x="60" y="54" textAnchor="middle" fill={col} style={{ fontSize: 28, fontFamily: f.mono, fontWeight: 800 }}>{score}</text>
        <text x="60" y="72" textAnchor="middle" fill={c.text3} style={{ fontSize: 8, letterSpacing: ".12em", fontWeight: 600 }}>{lab}</text>
      </svg>
      <span className="gt-label">{label}</span>
    </div>
  );
}

// Keep ANOMALIES/RECS as module-level references for genSummaryText
let _ANOMALIES: Array<{ title: string; impactYr: number; sev: string }> = [];
let _RECS: Array<{ rank: number; title: string; savings: number; effort: string; days: number }> = [];

function genSummaryText() {
  const lines: string[] = [];
  lines.push("GHOST TAX — SAMPLE AUDIT REPORT");
  lines.push("Company: " + COMPANY.name + " | Period: " + COMPANY.period);
  lines.push("Headcount: " + COMPANY.headcount + " | SaaS Tools: " + COMPANY.tools + " | Monthly IT: " + fmt(COMPANY.monthlyIT));
  lines.push("");
  lines.push("GHOST TAX: " + fmt(SCORE.ghostTax) + "/yr (" + SCORE.leakPct + "% of spend)");
  lines.push("Health Score: " + SCORE.health + "/100 | Entropy: " + SCORE.kappa + " | Peer: P" + SCORE.peerPct);
  lines.push("");
  lines.push("TOP ANOMALIES:");
  _ANOMALIES.slice(0, 5).forEach((a, i) => { lines.push("  " + (i + 1) + ". " + a.title + " — " + fmt(a.impactYr) + "/yr (" + a.sev + ")"); });
  lines.push("");
  lines.push("TOP RECOVERY ACTIONS:");
  _RECS.forEach((r) => { lines.push("  #" + r.rank + " " + r.title + " — " + fmt(r.savings, true) + "/yr | " + r.effort + " | ~" + r.days + " days"); });
  lines.push("");
  lines.push("DISCLAIMER: This is a SAMPLE report with fictional data.");
  lines.push("Your actual audit will analyze YOUR billing data.");
  lines.push("ghost-tax.com | SOC2 Type II Ready | Zero-Knowledge Audit");
  return lines.join("\n");
}

export default function SampleReport() {
  const { t, formatCurrency: fc } = useI18n();
  const [tab, setTab] = useState("overview");

  const ANOMALIES = ANOMALY_DEFS.map((a) => ({ ...a, title: t(a.titleKey), type: t(a.typeKey) }));
  const RECS = REC_DEFS.map((r) => ({ ...r, title: t(r.titleKey), effort: t(r.effortKey) }));
  const CATEGORIES = CAT_DEFS.map((cat) => ({ ...cat, name: t(cat.nameKey) }));

  // Update module refs for genSummaryText
  _ANOMALIES = ANOMALIES;
  _RECS = RECS;

  const totalRecoverable = RECS.reduce((s, r) => s + r.savings, 0);

  const tabs: [string, string][] = [
    ["overview", t("sample.tab.overview")],
    ["anomalies", t("sample.tab.anomalies") + " (" + ANOMALIES.length + ")"],
    ["actions", t("sample.tab.actions")],
    ["export", t("sample.tab.export")],
  ];

  return (
    <div style={{ minHeight: "100vh", fontFamily: f.sans, color: c.text1, padding: "20px 14px 48px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>

        {/* RETOUR */}
        <div style={{ marginBottom: 14 }}>
          <a href="/" className="gt-btn gt-btn-ghost" style={{ fontSize: 11, padding: "6px 12px" }}>{t("back")}</a>
        </div>

        {/* WATERMARK */}
        <div className="gt-card" style={{ textAlign: "center", padding: 10, marginBottom: 16, background: c.amberBg, borderColor: c.amberBd }}>
          <p className="gt-label" style={{ color: c.amber }}>{t("sample.watermark")}</p>
        </div>

        {/* HEADER */}
        <div className="gt-panel" style={{ padding: 20, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <p className="gt-section-label" style={{ marginBottom: 8 }}>{t("sample.header")}</p>
              <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>{COMPANY.name}</h1>
              <p style={{ fontSize: 14, color: c.text2 }}>{COMPANY.industry} · {COMPANY.headcount} employees · {COMPANY.tools} SaaS tools</p>
              <p style={{ fontSize: 12, color: c.text3, marginTop: 4 }}>Audit period: {COMPANY.period}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <Gauge score={SCORE.health} label={t("sample.healthscore")} t={t} />
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="gt-panel" style={{ padding: 5, marginBottom: 14, display: "flex", gap: 3 }}>
          {tabs.map((tb) => {
            const active = tab === tb[0];
            return (
              <button key={tb[0]} onClick={() => setTab(tb[0])}
                className={`gt-tab ${active ? "gt-tab--active" : ""}`}
                style={{ flex: 1 }}>
                {tb[1]}
              </button>
            );
          })}
        </div>

        {/* OVERVIEW TAB */}
        {tab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* KPI Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
              {[
                { l: t("sample.kpi.ghosttax"), v: fc(SCORE.ghostTax, true), col: c.red, s: SCORE.leakPct + "% " + t("sample.kpi.ofspend") },
                { l: t("sample.kpi.monthly"), v: fc(SCORE.ghostTaxMo), col: c.amber, s: fc(COMPANY.monthlyIT) + "/mo " + t("sample.kpi.total") },
                { l: t("sample.kpi.entropy"), v: SCORE.kappa.toFixed(3), col: SCORE.kappa > 0.15 ? c.amber : c.accentHi, s: t("sample.kpi.drag") },
                { l: t("sample.kpi.peer"), v: "P" + SCORE.peerPct, col: c.red, s: t("sample.kpi.vspeer") },
              ].map((k) => (
                <div key={k.l} className="gt-panel" style={{ padding: 18, textAlign: "center" }}>
                  <p className="gt-label" style={{ marginBottom: 8 }}>{k.l}</p>
                  <p className="gt-mono" style={{ fontSize: 36, fontWeight: 800, color: k.col, lineHeight: 1 }}>{k.v}</p>
                  <p style={{ fontSize: 12, color: c.text3, marginTop: 6, fontWeight: 500 }}>{k.s}</p>
                </div>
              ))}
            </div>

            {/* Category Breakdown */}
            <div className="gt-panel" style={{ padding: 20 }}>
              <p className="gt-section-label" style={{ marginBottom: 16 }}>{t("sample.breakdown")}</p>
              {CATEGORIES.map((cat) => {
                const w = cat.leak > 0 ? (cat.leak / cat.spend) * 100 : 0;
                return (
                  <div key={cat.name} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                      <span style={{ fontSize: 16, fontWeight: 600, color: c.text1 }}>{cat.name}</span>
                      <div style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
                        <span style={{ fontSize: 13, color: c.text3 }}>{t("sample.spend")}: <span className="gt-mono" style={{ color: c.text2 }}>{fc(cat.spend)}/mo</span></span>
                        <span className="gt-mono" style={{ fontSize: 15, fontWeight: 700, color: c.red }}>{t("sample.leak")}: {fc(cat.leak)}/mo ({cat.pct}%)</span>
                      </div>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: c.elevated, overflow: "hidden", position: "relative" }}>
                      <div style={{ height: "100%", width: "100%", borderRadius: 3, background: c.accentBg }} />
                      <div style={{ position: "absolute", right: 0, top: 0, height: "100%", width: w + "%", borderRadius: "0 3px 3px 0", background: `linear-gradient(90deg,${c.amber},${c.red})` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Executive Summary */}
            <div className="gt-panel" style={{ padding: 16 }}>
              <p className="gt-section-label" style={{ marginBottom: 10 }}>{t("sample.executive")}</p>
              <p style={{ fontSize: 15, color: c.text2, lineHeight: 1.7 }}>
                {t("sample.exec.p1")} <strong style={{ color: c.text1 }}>{fc(COMPANY.monthlyIT)}/{t("sample.mo")}</strong> {t("sample.exec.p2")} {COMPANY.tools} {t("sample.exec.p3")}
                {t("sample.exec.p4")} <strong style={{ color: c.red }}>{fc(SCORE.ghostTax)}/{t("sample.yr")}</strong> {t("sample.exec.p5")} ({SCORE.leakPct}% {t("sample.kpi.ofspend")}).
                {t("sample.exec.p6")} {"\u03BA"}={SCORE.kappa} {t("sample.exec.p7")} P{SCORE.peerPct}.
                {t("sample.exec.p8")} <strong style={{ color: c.green }}>{fc(totalRecoverable, true)}/{t("sample.yr")}</strong> {t("sample.exec.p9")}
              </p>
            </div>
          </div>
        )}

        {/* ANOMALIES TAB */}
        {tab === "anomalies" && (
          <div className="gt-panel" style={{ padding: 16 }}>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>{ANOMALIES.length} {t("sample.anomalies.detected")} {COMPANY.tools} {t("sample.anomalies.tools")}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ANOMALIES.map((a) => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 8, background: sevBg[a.sev], border: "1px solid " + sevCol[a.sev] + "14" }}>
                  <span className="gt-badge" style={{ background: sevCol[a.sev] + "18", borderColor: sevCol[a.sev] + "30", color: sevCol[a.sev], flexShrink: 0 }}>{a.sev.toUpperCase()}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: c.text1, marginBottom: 3 }}>{a.title}</p>
                    <p style={{ fontSize: 12, color: c.text3 }}>{a.vendor} · {a.type}</p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p className="gt-mono" style={{ fontSize: 18, fontWeight: 800, color: sevCol[a.sev] }}>{fc(a.impactMo)}<span style={{ fontSize: 11 }}>/{t("sample.mo")}</span></p>
                    <p style={{ fontSize: 10, color: c.text3 }}>{fc(a.impactYr)}/{t("sample.yr")}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ACTIONS TAB */}
        {tab === "actions" && (
          <div className="gt-panel" style={{ padding: 16 }}>
            <p className="gt-section-label" style={{ marginBottom: 8 }}>{t("sample.recovery.label")}</p>
            <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>{RECS.length} {t("sample.recovery.actions")}. {fc(totalRecoverable, true)} {t("sample.recovery.recoverable")}.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {RECS.map((r) => {
                const efCol = r.effortKey === "sample.effort.easy" ? c.green : c.amber;
                return (
                  <div key={r.rank} className="gt-inset" style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: c.accentBg, border: "1px solid " + c.accentBd, fontFamily: f.mono, fontSize: 16, fontWeight: 800, color: c.accent, flexShrink: 0 }}>{r.rank}</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 15, fontWeight: 600, color: c.text1, marginBottom: 4 }}>{r.title}</p>
                      <div style={{ display: "flex", gap: 8 }}>
                        <span className="gt-badge" style={{ background: efCol + "12", borderColor: efCol + "22", color: efCol }}>{r.effort}</span>
                        <span style={{ fontSize: 11, color: c.text3 }}>~{r.days} {t("sample.days")}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p className="gt-mono" style={{ fontSize: 20, fontWeight: 800, color: c.green }}>{fc(r.savings, true)}</p>
                      <p style={{ fontSize: 10, color: c.text3 }}>{t("sample.recovery.peryear")}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="gt-card" style={{ marginTop: 14, padding: "10px 14px", background: c.greenBg, borderColor: c.greenBd, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: c.text2 }}>{t("sample.recovery.total")}</span>
              <span className="gt-mono" style={{ fontSize: 22, fontWeight: 800, color: c.green }}>{fc(totalRecoverable)}/{t("sample.yr")}</span>
            </div>
          </div>
        )}

        {/* EXPORT TAB */}
        {tab === "export" && (
          <div className="gt-panel" style={{ padding: 18 }}>
            <p className="gt-section-label" style={{ marginBottom: 8 }}>{t("sample.export.label")}</p>
            <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>{t("sample.export.title")}</p>
            <pre style={{ fontFamily: f.mono, fontSize: 9, lineHeight: 1.6, color: c.text2, whiteSpace: "pre-wrap", wordBreak: "break-word", background: "rgba(0,0,0,0.2)", padding: 14, borderRadius: 8, border: "1px solid " + c.border, maxHeight: 300, overflow: "auto", marginBottom: 14 }}>
              {genSummaryText()}
            </pre>
            <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
              <button onClick={() => { const b = new Blob([genSummaryText()], { type: "text/plain" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = "ghost-tax-sample-report.txt"; a.click(); URL.revokeObjectURL(u); }}
                className="gt-btn gt-btn-primary">
                {t("sample.export.download")}
              </button>
              <button onClick={() => { if (navigator.clipboard) navigator.clipboard.writeText(genSummaryText()); }}
                className="gt-btn gt-btn-ghost">
                {t("sample.export.copy")}
              </button>
            </div>
          </div>
        )}

        {/* BOTTOM CTA */}
        <div className="gt-panel" style={{ padding: 22, marginTop: 14, textAlign: "center" }}>
          <p style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{t("sample.cta.title1")} <span style={{ color: c.green }}>{t("sample.cta.title2")}</span></p>
          <p style={{ fontSize: 14, color: c.text2, marginBottom: 16, lineHeight: 1.5, maxWidth: 400, margin: "0 auto 16px" }}>
            {t("sample.cta.sub")}
          </p>
          <a href="/estimator" className="gt-btn gt-btn-green">
            {t("sample.cta")}
          </a>
        </div>

        {/* TRUST FOOTER */}
        <div className="gt-card" style={{ marginTop: 16, padding: "11px 14px", display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
          {[{ i: "\u{1F6E1}", k: "trustfooter.soc2" }, { i: "\u{1F510}", k: "trustfooter.zk" }, { i: "\u{1F1FA}\u{1F1F8}", k: "trustfooter.us" }, { i: "\u23F1", k: "trustfooter.purge" }].map((b) => (
            <div key={b.k} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, color: c.text2 }}>
              <span style={{ fontSize: 13 }}>{b.i}</span>
              <span style={{ fontWeight: 600 }}>{t(b.k)}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
