"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { c, f } from "@/lib/tokens";

/*  GHOST TAX COCKPIT — i18n 2026
    Ghost Tax Estimator + Peer-Gap + Board Report + Trust Signals */

// ================= ENTROPY ENGINE =================
const IF: Record<string, number> = { saas_tech: 1.15, finance: 0.9, healthcare: 1.05, retail: 1.1, services: 1.0, mfg: 0.95, other: 1.0 };

function calc(inp: any) {
  const tot = inp.saas + inp.cloud + inp.ai;
  const sc = inp.sigs.filter(Boolean).length;
  const leak = tot * 0.18 * (1 + sc * 0.08) * (IF[inp.ind] || 1);
  const ann = leak * 12;
  const pct = tot > 0 ? leak / tot : 0;
  const grav = Math.min(100, Math.round(pct * 250 + sc * 6 + (inp.tools > 50 ? 10 : inp.tools > 20 ? 5 : 0)));
  const kappa = inp.emp <= 50 ? 0 : Math.min(0.4, 0.12 * Math.log(inp.emp / 50));
  const bd = [0, 1, 2, 3, 4].map(idx => {
    const sh = [0.28, 0.22, 0.18, 0.17, 0.15][idx];
    const si = [[0, 1], [2, 5], [3], [4], [6, 7]][idx];
    const icon = ["\u{1F47B}", "\u{1F4D0}", "\u{1F504}", "\u{1F916}", "\u{1F3F4}"][idx];
    const b = si.some(i => inp.sigs[i]) ? 1.3 : 0.7;
    return { idx, icon, si, sh, amt: Math.round(ann * sh * b), label: "" };
  }).sort((a, b) => b.amt - a.amt);
  const aiR = tot > 0 ? inp.ai / tot : 0;
  const rE = 0.03 + 0.02 * aiR + kappa * 0.015;
  const rG = rE * 0.35;
  const burn = [{ m: 0, u: tot, g: tot, l: "Now" },
    ...[6, 12, 24].map(t => ({ m: t, u: Math.round(tot * Math.exp(rE * t)), g: Math.round(tot * Math.exp(rG * t)), l: `${t}mo` }))];
  const last = burn[3];
  return {
    lo: Math.round(ann * 0.75), hi: Math.round(ann * 1.15), mid: Math.round(ann * 0.95),
    grav, kappa: Math.round(kappa * 1000) / 1000, bd, burn,
    redund: Math.round(tot * (inp.tools > 50 ? 0.25 : inp.tools > 20 ? 0.18 : 0.1) * 12),
    roi: ann > 0 ? Math.round(((ann * 0.6 - 990) / 990) * 10) / 10 : 0,
    sav24: last ? (last.u - last.g) * 24 : 0, tot, sc, ann,
  };
}

// ================= PEER-GAP ENGINE =================
const PB: Record<string, Record<string, number[]>> = {
  saas_tech: { a: [180, 280, 380, 520, 720], b: [0.3, 0.5, 0.8, 1.2, 1.8], c: [88, 78, 65, 52, 38], d: [3, 8, 15, 25, 38], e: [5, 15, 35, 60, 120] },
  finance: { a: [150, 220, 310, 430, 580], b: [0.2, 0.3, 0.5, 0.8, 1.2], c: [92, 84, 75, 62, 48], d: [1, 4, 8, 15, 25], e: [3, 10, 22, 45, 80] },
  healthcare: { a: [120, 190, 280, 400, 550], b: [0.2, 0.4, 0.6, 0.9, 1.4], c: [90, 80, 68, 55, 40], d: [2, 6, 12, 22, 35], e: [5, 12, 28, 50, 95] },
  retail: { a: [100, 170, 260, 380, 520], b: [0.2, 0.3, 0.5, 0.8, 1.3], c: [88, 76, 62, 48, 35], d: [3, 8, 16, 28, 42], e: [4, 12, 30, 55, 100] },
  services: { a: [130, 200, 300, 420, 580], b: [0.2, 0.4, 0.6, 1.0, 1.5], c: [90, 82, 70, 58, 42], d: [2, 6, 12, 20, 32], e: [4, 10, 25, 48, 85] },
  mfg: { a: [80, 140, 220, 340, 480], b: [0.1, 0.2, 0.4, 0.6, 1.0], c: [92, 85, 76, 64, 50], d: [1, 4, 9, 16, 28], e: [2, 8, 18, 35, 65] },
  other: { a: [120, 200, 300, 430, 600], b: [0.2, 0.4, 0.6, 0.9, 1.4], c: [90, 80, 68, 55, 40], d: [2, 7, 14, 24, 38], e: [4, 12, 28, 52, 90] },
};

function pInt(v: number, p: number[], lib: boolean) {
  const ms = [10, 25, 50, 75, 90];
  if (v <= p[0]) return lib ? 5 : 95;
  if (v >= p[4]) return lib ? 95 : 5;
  for (let i = 0; i < 4; i++) {
    if (v >= p[i] && v <= p[i + 1]) {
      const r = (v - p[i]) / (p[i + 1] - p[i]);
      const raw = ms[i] + r * (ms[i + 1] - ms[i]);
      return lib ? raw : 100 - raw;
    }
  }
  return 50;
}

function calcPeer(inp: any, ent: any, PM_L: any[], PL_L: Record<string, string>) {
  const bm = PB[inp.ind] || PB.other;
  const tot = inp.saas + inp.cloud + inp.ai;
  const vals: Record<string, number> = {
    a: inp.emp > 0 ? tot / inp.emp : 0,
    b: inp.emp > 0 ? inp.tools / inp.emp : 0,
    c: Math.max(30, Math.min(95, 100 - ent.grav * 0.6)),
    d: ent.sc > 3 ? 22 : ent.sc > 1 ? 12 : 5,
    e: inp.ai > 0 ? Math.min(200, (inp.ai / Math.max(inp.saas, 1)) * 100) : 10,
  };
  const mets = PM_L.map(m => {
    const v = vals[m.k];
    const pct = Math.round(pInt(v, bm[m.k], m.lib));
    return { ...m, v: Math.round(v * 100) / 100, pct, med: bm[m.k][2], vd: pct <= 25 ? "ex" : pct <= 50 ? "gd" : pct <= 75 ? "wn" : "cr" };
  });
  const ov = Math.round(mets.reduce((s: number, m: any) => s + m.pct, 0) / mets.length);
  return { ov, mets, peer: PL_L[inp.ind] || PL_L.other, ghost: Math.round(ent.mid * 0.6) };
}

// ================= SUB-COMPONENTS =================
function Anim({ value, suffix, formatCurrency: fc }: { value: number; suffix?: string; formatCurrency: (n: number) => string }) {
  const [d, setD] = useState(0);
  const ref = useRef<number | null>(null);
  useEffect(() => {
    const s = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - s) / 850, 1);
      setD(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [value]);
  return <span>{fc(d)}{suffix || ""}</span>;
}

function Gauge({ score }: { score: number }) {
  const R = 40, ci = 2 * Math.PI * R, off = ci - (score / 100) * ci;
  const col = score >= 61 ? c.red : score >= 31 ? c.amber : c.green;
  const lab = score >= 61 ? "CRITICAL" : score >= 31 ? "ELEVATED" : "HEALTHY";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width="110" height="110" viewBox="0 0 104 104">
        <circle cx="52" cy="52" r={R} fill="none" stroke={c.raised} strokeWidth="6" />
        <circle cx="52" cy="52" r={R} fill="none" stroke={col} strokeWidth="6" strokeLinecap="round" strokeDasharray={ci} strokeDashoffset={off} transform="rotate(-90 52 52)" style={{ transition: "stroke-dashoffset 1s cubic-bezier(.16,1,.3,1)" }} />
        <text x="52" y="48" textAnchor="middle" fill={col} style={{ fontSize: 22, fontFamily: f.mono, fontWeight: 800 }}>{score}</text>
        <text x="52" y="63" textAnchor="middle" fill={c.text3} style={{ fontSize: 6.5, letterSpacing: ".12em", fontWeight: 600 }}>{lab}</text>
      </svg>
      <span className="gt-label">Entropy Score</span>
    </div>
  );
}

function Radar({ mets }: { mets: any[] }) {
  const cx = 110, cy = 110, R = 84, n = mets.length, a = 360 / n;
  const xy = (ang: number, r: number): [number, number] => { const rd = ((ang - 90) * Math.PI) / 180; return [cx + r * Math.cos(rd), cy + r * Math.sin(rd)]; };
  const pts = (fn: (m: any) => number) => mets.map((m, i) => xy(i * a, fn(m))).map(([x, y]) => `${x},${y}`).join(" ");
  const vc: Record<string, string> = { ex: c.green, gd: c.green, wn: c.amber, cr: c.red };
  return (
    <svg viewBox="0 0 220 220" style={{ width: "100%", maxWidth: 230 }}>
      {[.25, .5, .75, 1].map(r => <polygon key={r} points={pts(() => R * r)} fill="none" stroke={c.border} strokeWidth=".5" />)}
      {mets.map((_, i) => { const [x, y] = xy(i * a, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={c.border} strokeWidth=".5" />; })}
      <polygon points={pts(() => R * .5)} fill="none" stroke={c.text4} strokeWidth="1" strokeDasharray="4,4" />
      <polygon points={pts(m => R * Math.max(.06, 1 - m.pct / 100))} fill={c.accentBg} stroke={c.accent} strokeWidth="1.5" strokeLinejoin="round" />
      {mets.map((m, i) => { const [x, y] = xy(i * a, R * Math.max(.06, 1 - m.pct / 100)); return <circle key={i} cx={x} cy={y} r="3.5" fill={vc[m.vd]} stroke={c.bg} strokeWidth="1.5" />; })}
      {mets.map((m, i) => { const [x, y] = xy(i * a, R + 15); return <text key={`t${i}`} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill={c.text3} fontSize="6.5" fontFamily={f.mono}>{m.l.split(" ").slice(0, 2).join(" ")}</text>; })}
    </svg>
  );
}

// ================= BOARD REPORT GENERATOR =================
function generateBoardReport(inp: any, ent: any, peer: any, IL_L: [string, string][], formatCurrency: (n: number, short?: boolean) => string) {
  const indLabel = IL_L.find(([k]) => k === inp.ind)?.[1] || "Technology";
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const tot = inp.saas + inp.cloud + inp.ai;

  const lines: string[] = [
    "═══════════════════════════════════════════════════════",
    "   GHOST TAX — EXECUTIVE GHOST TAX SUMMARY",
    "   Confidential — Prepared " + date,
    "═══════════════════════════════════════════════════════",
    "",
    "COMPANY PROFILE",
    `  Industry:        ${indLabel}`,
    `  Headcount:       ${inp.emp} employees`,
    `  SaaS Tools:      ${inp.tools} active subscriptions`,
    `  Monthly IT:      ${formatCurrency(tot)} (SaaS ${formatCurrency(inp.saas)} + Cloud ${formatCurrency(inp.cloud)} + AI ${formatCurrency(inp.ai)})`,
    "",
    "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500",
    "GHOST TAX ASSESSMENT",
    `  Annual Leak:     ${formatCurrency(ent.lo)} \u2013 ${formatCurrency(ent.hi)} (midpoint: ${formatCurrency(ent.mid)})`,
    `  Entropy Score:   ${ent.grav}/100 (${ent.grav >= 61 ? "CRITICAL" : ent.grav >= 31 ? "ELEVATED" : "HEALTHY"})`,
    `  Entropy \u03BA:       ${ent.kappa.toFixed(3)} (organizational coordination drag)`,
    `  Audit ROI:       ${ent.roi}x ($990 investment \u2192 ${formatCurrency(ent.mid * 0.6, true)} recoverable)`,
    "",
    "TOP RECOVERY OPPORTUNITIES",
  ];

  ent.bd.forEach((b: any, i: number) => {
    lines.push(`  ${i + 1}. ${b.label}: ${formatCurrency(b.amt, true)}/yr`);
  });

  lines.push("");
  lines.push(`  Shadow AI Redundancy: ${formatCurrency(ent.redund, true)}/yr`);

  if (peer) {
    lines.push("");
    lines.push("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
    lines.push("PEER BENCHMARKING");
    lines.push(`  Overall Percentile: P${peer.ov} (less efficient than ${peer.ov}% of ${peer.peer})`);
    lines.push("");
    peer.mets.forEach((m: any) => {
      const dv = m.k === "a" ? formatCurrency(m.v) + m.u : (m.k === "b" ? m.v.toFixed(1) : Math.round(m.v)) + m.u;
      const md = m.k === "a" ? formatCurrency(m.med) + m.u : m.med + m.u;
      lines.push(`  ${m.l.padEnd(22)} You: ${dv.padEnd(12)} Median: ${md.padEnd(12)} P${m.pct}`);
    });
  }

  lines.push("");
  lines.push("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
  lines.push("24-MONTH PROJECTION");
  lines.push(`  Without governance:  ${formatCurrency(ent.burn[3]?.u || 0)}/mo by month 24`);
  lines.push(`  With governance:     ${formatCurrency(ent.burn[3]?.g || 0)}/mo by month 24`);
  lines.push(`  Cumulative savings:  ${formatCurrency(ent.sav24, true)} over 24 months`);
  lines.push("");
  lines.push("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
  lines.push("RECOMMENDED NEXT STEP");
  lines.push(`  Recoverable Ghost Tax: ${formatCurrency(peer?.ghost || Math.round(ent.mid * 0.6))}/yr`);
  lines.push("  \u2192 Schedule a Ghost Tax Priority Audit ($990)");
  lines.push("  \u2192 Typical ROI: 15-40x within first 90 days");
  lines.push("");
  lines.push("  ghost-tax.com | SOC2 Type II Readiness | Zero-Knowledge Audit");
  lines.push("═══════════════════════════════════════════════════════");

  return lines.join("\n");
}

function downloadReport(text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ghost-tax-summary-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ================= TRUST FOOTER =================
function TrustFooter({ t }: { t: (k: string) => string }) {
  return (
    <div className="gt-card" style={{ marginTop: 20, padding: "14px 16px", display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
      {[
        { icon: "\u{1F6E1}", label: t("est.trustfooter.soc2"), sub: t("est.trustfooter.soc2sub") },
        { icon: "\u{1F510}", label: t("est.trustfooter.zk"), sub: t("est.trustfooter.zksub") },
        { icon: "\u{1F1FA}\u{1F1F8}", label: t("est.trustfooter.us"), sub: t("est.trustfooter.ussub") },
        { icon: "\u{23F1}", label: t("est.trustfooter.purge"), sub: t("est.trustfooter.purgesub") },
      ].map((item) => (
        <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{item.icon}</span>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: c.text1, letterSpacing: ".02em" }}>{item.label}</div>
            <div style={{ fontSize: 8, color: c.text3 }}>{item.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ===================================================
// MAIN
// ===================================================
export default function Cockpit() {
  const { t, formatCurrency, locale } = useI18n();
  const [tab, setTab] = useState("entropy");
  const [step, setStep] = useState(0);
  const [inp, setInp] = useState({
    emp: 140, ind: "saas_tech", tools: 48,
    saas: 38000, cloud: 15000, ai: 11000,
    sigs: new Array(8).fill(false),
  });
  const [res, setRes] = useState<any>(null);
  const [ph, setPh] = useState(0);
  const [email, setEmail] = useState("");
  const [cap, setCap] = useState(false);
  const rRef = useRef<HTMLDivElement>(null);

  // i18n-driven data arrays
  const IL = useMemo((): [string, string][] => [
    ["saas_tech", t("est.industry.saas")],
    ["finance", t("est.industry.finance")],
    ["healthcare", t("est.industry.healthcare")],
    ["retail", t("est.industry.retail")],
    ["services", t("est.industry.services")],
    ["mfg", t("est.industry.mfg")],
    ["other", t("est.industry.other")],
  ], [t]);

  const SG = useMemo(() => [
    t("est.signal.1"), t("est.signal.2"), t("est.signal.3"), t("est.signal.4"),
    t("est.signal.5"), t("est.signal.6"), t("est.signal.7"), t("est.signal.8"),
  ], [t]);

  const SV_LABELS = useMemo(() => [
    t("est.sv.1"), t("est.sv.2"), t("est.sv.3"), t("est.sv.4"), t("est.sv.5"),
  ], [t]);

  const PM = useMemo(() => [
    { k: "a", l: t("est.peer.spend"), u: "/mo", lib: true },
    { k: "b", l: t("est.peer.saasemp"), u: "", lib: true },
    { k: "c", l: t("est.peer.licutil"), u: "%", lib: false },
    { k: "d", l: t("est.peer.shadowrate"), u: "%", lib: true },
    { k: "e", l: t("est.peer.aigrowth"), u: "%", lib: true },
  ], [t]);

  const PL = useMemo((): Record<string, string> => ({
    saas_tech: t("est.industry.saas"), finance: t("est.industry.finance"),
    healthcare: t("est.industry.healthcare"), retail: t("est.industry.retail"),
    services: t("est.industry.services"), mfg: t("est.industry.mfg"),
    other: t("est.industry.other"),
  }), [t]);

  const upd = useCallback((k: string, v: any) => setInp(p => ({ ...p, [k]: v })), []);
  const tog = useCallback((i: number) => setInp(p => { const s = [...p.sigs]; s[i] = !s[i]; return { ...p, sigs: s }; }), []);

  const run = useCallback(() => {
    const r = calc(inp);
    r.bd = r.bd.map(b => ({ ...b, label: SV_LABELS[b.idx] }));
    setRes(r); setStep(3); setPh(0);
    setTimeout(() => setPh(1), 180);
    setTimeout(() => setPh(2), 600);
    setTimeout(() => setPh(3), 1050);
    setTimeout(() => rRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }, [inp, SV_LABELS]);

  const liveReclaim = useMemo(() => {
    const tot = inp.saas + inp.cloud + inp.ai;
    const sc = inp.sigs.filter(Boolean).length;
    const leak = tot * 0.18 * (1 + sc * 0.08) * (IF[inp.ind] || 1) * 12;
    return Math.round(leak * 0.6);
  }, [inp]);

  const peer = useMemo(() => res ? calcPeer(inp, res, PM, PL) : null, [inp, res, PM, PL]);
  const sc = inp.sigs.filter(Boolean).length;
  const tot = inp.saas + inp.cloud + inp.ai;
  const rv = (min: number, del = 0) => ({
    opacity: ph >= min ? 1 : 0,
    transform: ph >= min ? "translateY(0)" : "translateY(12px)",
    transition: `all .5s cubic-bezier(.16,1,.3,1) ${del}ms`,
  });
  const vc: Record<string, string> = { ex: c.green, gd: c.green, wn: c.amber, cr: c.red };
  const vb: Record<string, string> = { ex: c.greenBg, gd: c.greenBg, wn: c.amberBg, cr: c.redBg };

  return (
    <div style={{ minHeight: "100vh", fontFamily: f.sans, color: c.text1, padding: "20px 14px 40px" }}>
      <div style={{ maxWidth: 660, margin: "0 auto" }}>

        {/* -- BACK -- */}
        <div style={{ marginBottom: 14 }}>
          <a href="/" className="gt-btn gt-btn-ghost" style={{ fontSize: 11, padding: "6px 12px" }}>{t("back")}</a>
        </div>

        {/* -- HEADER BAR -- */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="gt-mono" style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: c.accent }}>GHOST TAX</span>
            <span className="gt-badge gt-badge--muted">{t("est.version")}</span>
          </div>
          <div style={{ display: "flex", gap: 2, padding: 3, borderRadius: 8, background: "rgba(11,14,24,.5)", border: "1px solid " + c.border }}>
            {([["entropy", t("est.tab.ghosttax")], ["peergap", t("est.tab.peergap")], ["report", t("est.tab.report")]] as [string, string][]).map(([k, l]) => {
              const disabled = (k !== "entropy") && !res;
              return (
                <button key={k} onClick={() => !disabled && setTab(k)}
                  className={`gt-tab ${tab === k ? "gt-tab--active" : ""}`}
                  style={{ cursor: disabled ? "not-allowed" : "pointer", color: disabled ? c.text4 : undefined }}>
                  {l}
                </button>
              );
            })}
          </div>
          <span className="gt-badge gt-badge--muted">{"\u2318"}K</span>
        </div>

        {/* ======= ENTROPY TAB ======= */}
        {tab === "entropy" && (
          <>
            {step < 3 && (
              <div style={{ textAlign: "center", marginBottom: 22 }}>
                <p className="gt-section-label" style={{ marginBottom: 8 }}>{t("est.hero.badge")}</p>
                <h1 style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.15, letterSpacing: "-.02em", marginBottom: 6 }}>
                  {t("est.hero.title1")} <span style={{ color: c.red }}>{t("est.hero.ghosttax")}</span>{" "}
                  <span style={{ color: c.green }}>{t("est.hero.title2")}</span>
                </h1>
                <p style={{ fontSize: 12, color: c.text2, maxWidth: 420, margin: "0 auto", lineHeight: 1.5 }}>
                  {t("est.hero.sub")}
                </p>
              </div>
            )}

            {step < 3 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 16 }}>
                {[t("est.step.profile"), t("est.step.spending"), t("est.step.signals")].map((l, i) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 21, height: 21, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, fontFamily: f.mono, background: step === i ? c.accent : step > i ? c.green : c.elevated, color: step >= i ? "#fff" : c.text4, transition: "all .2s" }}>
                      {step > i ? "\u2713" : i + 1}
                    </div>
                    <span style={{ fontSize: 10, color: step === i ? c.text1 : c.text4, fontWeight: step === i ? 600 : 400 }}>{l}</span>
                    {i < 2 && <div style={{ width: 16, height: 1, background: step > i ? c.green : c.raised, marginLeft: 2 }} />}
                  </div>
                ))}
              </div>
            )}

            {/* Step 0 */}
            {step === 0 && (
              <div className="gt-panel" style={{ padding: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label className="gt-label" style={{ marginBottom: 5 }}>{t("est.label.headcount")}</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <input type="range" min={10} max={500} step={10} value={inp.emp} onChange={e => upd("emp", +e.target.value)} style={{ flex: 1, accentColor: c.accent }} />
                      <span className="gt-mono" style={{ fontSize: 16, fontWeight: 700, color: c.accentHi, minWidth: 44, textAlign: "right" }}>{inp.emp}</span>
                    </div>
                  </div>
                  <div>
                    <label className="gt-label" style={{ marginBottom: 5 }}>{t("est.label.industry")}</label>
                    <select value={inp.ind} onChange={e => upd("ind", e.target.value)} className="gt-input" style={{ fontFamily: f.sans, fontSize: 12, cursor: "pointer" }}>
                      {IL.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="gt-label" style={{ marginBottom: 5 }}>{t("est.label.tools")}</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <input type="range" min={5} max={200} step={5} value={inp.tools} onChange={e => upd("tools", +e.target.value)} style={{ flex: 1, accentColor: c.accent }} />
                      <span className="gt-mono" style={{ fontSize: 16, fontWeight: 700, color: c.accentHi, minWidth: 44, textAlign: "right" }}>{inp.tools}</span>
                    </div>
                  </div>
                  <button onClick={() => setStep(1)} className="gt-btn gt-btn-primary" style={{ width: "100%" }}>
                    {t("est.btn.continue")} {"\u2192"}
                  </button>
                </div>
              </div>
            )}

            {/* Step 1 */}
            {step === 1 && (
              <div className="gt-panel" style={{ padding: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {([["saas", t("est.label.saas")], ["cloud", t("est.label.cloud")], ["ai", t("est.label.ai")]] as [string, string][]).map(([k, l]) => (
                    <div key={k}>
                      <label className="gt-label" style={{ marginBottom: 5 }}>{l}</label>
                      <input type="number" value={(inp as any)[k] || ""} onChange={e => upd(k, +e.target.value || 0)} className="gt-input gt-input-mono" />
                    </div>
                  ))}
                  <div className="gt-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", background: c.accentBg, borderColor: c.accentBd }}>
                    <span className="gt-label">{t("est.label.totalit")}</span>
                    <span className="gt-mono" style={{ fontSize: 17, fontWeight: 700, color: c.accentHi }}>{formatCurrency(tot)}</span>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => setStep(0)} className="gt-btn gt-btn-ghost">{t("back")}</button>
                    <button onClick={() => setStep(2)} className="gt-btn gt-btn-primary" style={{ flex: 1 }}>{t("est.btn.next")} {"\u2192"}</button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="gt-panel" style={{ padding: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <p style={{ fontSize: 12, color: c.text2, lineHeight: 1.5, marginBottom: 2 }}>{t("est.signals.intro")}</p>
                  {SG.map((l, i) => (
                    <button key={i} onClick={() => tog(i)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 7, width: "100%", textAlign: "left", fontSize: 12, lineHeight: 1.3, cursor: "pointer", transition: "all .12s", border: inp.sigs[i] ? "1px solid " + c.accentBd : "1px solid " + c.border, background: inp.sigs[i] ? c.accentBg : c.bg, color: inp.sigs[i] ? c.text1 : c.text2 }}>
                      <span style={{ width: 17, height: 17, borderRadius: 4, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", border: inp.sigs[i] ? `2px solid ${c.accent}` : "2px solid " + c.text4, background: inp.sigs[i] ? c.accent : "transparent", transition: "all .12s" }}>
                        {inp.sigs[i] ? "\u2713" : ""}
                      </span>
                      {l}
                    </button>
                  ))}
                  <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                    <button onClick={() => setStep(1)} className="gt-btn gt-btn-ghost">{t("back")}</button>
                    <button onClick={run} disabled={sc === 0} className={sc > 0 ? "gt-btn gt-btn-green" : "gt-btn"} style={{ flex: 1, cursor: sc > 0 ? "pointer" : "not-allowed" }}>
                      {sc > 0 ? `${formatCurrency(liveReclaim, true)} \u2014 ${t("est.btn.expose")}` : t("est.btn.select1")}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Results */}
            {step === 3 && res && (
              <div ref={rRef} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ textAlign: "center", ...rv(1) }}>
                  <p className="gt-section-label" style={{ color: res.grav >= 61 ? c.red : res.grav >= 31 ? c.amber : c.green, marginBottom: 5 }}>{t("est.result.detected")}</p>
                  <p className="gt-mono" style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1, color: res.grav >= 61 ? c.red : res.grav >= 31 ? c.amber : c.green }}>
                    {ph >= 1 ? <Anim value={res.mid} suffix="/yr" formatCurrency={formatCurrency} /> : "\u2014"}
                  </p>
                  <p style={{ fontSize: 11, color: c.text3, marginTop: 3 }}>{t("est.result.range")}: {formatCurrency(res.lo)} – {formatCurrency(res.hi)}</p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, ...rv(1, 160) }}>
                  <div className="gt-card" style={{ padding: 10, textAlign: "center" }}><Gauge score={res.grav} /></div>
                  <div className="gt-card" style={{ padding: 10, textAlign: "center" }}>
                    <p className="gt-label" style={{ marginBottom: 4 }}>{t("est.result.coefficient")}</p>
                    <p className="gt-mono" style={{ fontSize: 20, fontWeight: 700, color: res.kappa > .2 ? c.amber : c.accentHi }}>{"\u03BA"} = {res.kappa.toFixed(3)}</p>
                    <p style={{ fontSize: 8, color: c.text3, marginTop: 2 }}>{res.kappa > .2 ? t("est.result.kappa.high") : res.kappa > .1 ? t("est.result.kappa.mod") : t("est.result.kappa.low")}</p>
                  </div>
                  <div className="gt-card" style={{ padding: 10, textAlign: "center" }}>
                    <p className="gt-label" style={{ marginBottom: 4 }}>{t("est.result.roi")}</p>
                    <p className="gt-mono" style={{ fontSize: 20, fontWeight: 700, color: c.green }}>{"\u00D7"}{res.roi}</p>
                    <p style={{ fontSize: 8, color: c.text3, marginTop: 2 }}>$990 {"\u2192"} {formatCurrency(res.mid * .6, true)} {t("est.result.recovered")}</p>
                  </div>
                </div>

                <div className="gt-panel" style={{ padding: 14, ...rv(2) }}>
                  <h3 className="gt-label" style={{ marginBottom: 10 }}>{t("est.result.breakdown")}</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                    {res.bd.map((it: any, i: number) => {
                      const mx = res.bd[0]?.amt || 1;
                      return (
                        <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <span style={{ fontSize: 15, width: 22, textAlign: "center" }}>{it.icon}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
                              <span style={{ fontSize: 10.5, color: c.text2 }}>{it.label}</span>
                              <span className="gt-mono" style={{ fontSize: 11, fontWeight: 600, color: c.text1 }}>{formatCurrency(it.amt, true)}/yr</span>
                            </div>
                            <div style={{ height: 4, borderRadius: 2, background: c.elevated, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${(it.amt / mx) * 100}%`, borderRadius: 2, background: `linear-gradient(90deg,${c.accent},${c.accentHi})`, transition: `width .7s cubic-bezier(.16,1,.3,1) ${i * 90}ms` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="gt-card" style={{ marginTop: 10, padding: "7px 10px", background: c.accentBg, borderColor: c.accentBd, display: "flex", justifyContent: "space-between" }}>
                    <span className="gt-label">{t("est.result.shadowai")}</span>
                    <span className="gt-mono" style={{ fontSize: 11, fontWeight: 700, color: c.amber }}>{formatCurrency(res.redund, true)}/yr</span>
                  </div>
                </div>

                <div className="gt-panel" style={{ padding: 14, ...rv(3) }}>
                  <h3 className="gt-label" style={{ marginBottom: 10 }}>{t("est.result.trajectory")}</h3>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 90 }}>
                    {res.burn.map((p: any, i: number) => {
                      const mx = Math.max(...res.burn.map((x: any) => x.u));
                      return (
                        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, height: "100%", justifyContent: "flex-end" }}>
                          <div style={{ display: "flex", gap: 2, alignItems: "flex-end", flex: 1 }}>
                            <div style={{ width: 13, height: `${mx > 0 ? (p.u / mx) * 100 : 0}%`, minHeight: 3, borderRadius: "2px 2px 0 0", background: i === 0 ? c.raised : `linear-gradient(to top,${c.red},${c.amber})`, transition: `height .7s cubic-bezier(.16,1,.3,1) ${i * 120}ms` }} />
                            <div style={{ width: 13, height: `${mx > 0 ? (p.g / mx) * 100 : 0}%`, minHeight: 3, borderRadius: "2px 2px 0 0", background: i === 0 ? c.raised : `linear-gradient(to top,${c.green},${c.green})`, transition: `height .7s cubic-bezier(.16,1,.3,1) ${i * 120 + 70}ms` }} />
                          </div>
                          <span className="gt-mono" style={{ fontSize: 8.5, color: c.text3 }}>{p.l}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 7, fontSize: 7.5, color: c.text3, textTransform: "uppercase", letterSpacing: ".05em" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: c.amber }} />{t("est.result.ungoverned")}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: c.green }} />{t("est.result.governed")}</span>
                  </div>
                  {res.sav24 > 0 && (
                    <div className="gt-card" style={{ marginTop: 10, padding: "7px 10px", background: c.greenBg, borderColor: c.greenBd, textAlign: "center" }}>
                      <span style={{ fontSize: 10, color: c.text2 }}>{t("est.result.savings24")}: </span>
                      <span className="gt-mono" style={{ fontSize: 14, fontWeight: 700, color: c.green }}>{formatCurrency(res.sav24, true)}</span>
                    </div>
                  )}
                </div>

                {/* CTA */}
                <div className="gt-panel" style={{ padding: 20, textAlign: "center", ...rv(3, 160) }}>
                  {cap ? (
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 700, color: c.green, marginBottom: 5 }}>{"\u2713"} {t("est.cta.registered")}</p>
                      <p style={{ fontSize: 11, color: c.text2 }}>{t("est.cta.checkinbox")}</p>
                    </div>
                  ) : (
                    <>
                      <p className="gt-section-label" style={{ color: res.grav >= 61 ? c.red : c.amber, marginBottom: 4 }}>
                        {res.grav >= 61 ? `\u26A0 ${t("est.cta.urgent")}` : t("est.cta.significant")}
                      </p>
                      <p style={{ fontSize: 12, color: c.text2, marginBottom: 14, lineHeight: 1.5 }}>
                        {t("est.cta.getdetailed")}
                      </p>
                      <div style={{ display: "flex", gap: 6, maxWidth: 400, margin: "0 auto" }}>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" className="gt-input gt-input-mono" style={{ flex: 1, fontSize: 12 }} />
                        <button onClick={() => { if (email.includes("@") && email.includes(".")) setCap(true); }}
                          className={email.includes("@") ? "gt-btn gt-btn-green" : "gt-btn"}
                          style={{ whiteSpace: "nowrap", cursor: email.includes("@") ? "pointer" : "not-allowed" }}>
                          RECLAIM {formatCurrency(res.mid * .6, true)} NOW
                        </button>
                      </div>
                      <p style={{ fontSize: 7.5, color: c.text3, marginTop: 7 }}>{t("est.cta.stealth")}</p>
                    </>
                  )}
                </div>

                {/* Action row */}
                <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => setTab("peergap")} className="gt-btn gt-btn-accent-ghost">
                    {t("est.btn.peergap")} {"\u2192"}
                  </button>
                  <button onClick={() => setTab("report")} className="gt-btn" style={{ background: c.greenBg, borderColor: c.greenBd, color: c.green }}>
                    {t("est.btn.boardreport")} {"\u2193"}
                  </button>
                  <button onClick={() => { setStep(0); setRes(null); setPh(0); setCap(false); setEmail(""); }} className="gt-btn gt-btn-ghost">
                    {"\u21BB"} {t("est.btn.reset")}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ======= PEER-GAP TAB ======= */}
        {tab === "peergap" && peer && res && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="gt-panel" style={{ padding: 16, textAlign: "center" }}>
              <p className="gt-section-label" style={{ color: peer.ov > 75 ? c.red : peer.ov > 50 ? c.amber : peer.ov > 25 ? c.green : c.green, marginBottom: 4 }}>
                {t("est.peer.headline")} — {inp.ind.replace(/_/g, " ").toUpperCase()}
              </p>
              <p style={{ fontSize: 13, color: c.text2, lineHeight: 1.5, maxWidth: 460, margin: "0 auto 10px" }}>
                {t("est.peer.efficiency")} <strong style={{ color: peer.ov > 75 ? c.red : peer.ov > 50 ? c.amber : c.green, fontWeight: 700 }}>{t("est.peer.lessthan")} {peer.ov}%</strong> {t("est.peer.ofcomp")} {peer.peer}.
              </p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 7, background: "rgba(0,0,0,.18)", border: "1px solid " + (peer.ov > 50 ? c.redBd : c.accentBd) }}>
                <span className="gt-label">{t("est.peer.overall")}</span>
                <span className="gt-mono" style={{ fontSize: 22, fontWeight: 800, color: peer.ov > 75 ? c.red : peer.ov > 50 ? c.amber : peer.ov > 25 ? c.green : c.green }}>P{peer.ov}</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "230px 1fr", gap: 10 }}>
              <div className="gt-panel" style={{ padding: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <p className="gt-label" style={{ marginBottom: 4 }}>{t("est.peer.radar")}</p>
                <Radar mets={peer.mets} />
              </div>
              <div className="gt-panel" style={{ padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                <p className="gt-label">{t("est.peer.metrics")}</p>
                {peer.mets.map((m: any) => {
                  const col = vc[m.vd]; const bg = vb[m.vd];
                  const dv = m.k === "a" ? formatCurrency(m.v) + m.u : (m.k === "b" ? m.v.toFixed(1) : Math.round(m.v)) + m.u;
                  const md = m.k === "a" ? formatCurrency(m.med) + m.u : m.med + m.u;
                  return (
                    <div key={m.k} style={{ padding: "8px 10px", borderRadius: 6, background: bg, border: "1px solid " + col + "12" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
                        <span style={{ fontSize: 10.5, fontWeight: 600, color: c.text1 }}>{m.l}</span>
                        <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                          <span style={{ fontSize: 7.5, color: c.text3 }}>Med: <span className="gt-mono" style={{ color: c.text2 }}>{md}</span></span>
                          <span className="gt-mono" style={{ fontSize: 11, fontWeight: 700, color: col }}>{dv}</span>
                        </div>
                      </div>
                      <div style={{ height: 3, borderRadius: 2, background: "rgba(0,0,0,.2)", position: "relative", overflow: "hidden" }}>
                        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.max(3, Math.min(97, m.pct))}%`, borderRadius: 2, background: `linear-gradient(90deg,${c.green},${col})`, transition: "width .8s cubic-bezier(.16,1,.3,1)" }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                        <span className="gt-mono" style={{ fontSize: 6.5, color: c.text3 }}>{t("est.peer.top10")}</span>
                        <span className="gt-mono" style={{ fontSize: 6.5, color: col, fontWeight: 600 }}>P{m.pct}</span>
                        <span className="gt-mono" style={{ fontSize: 6.5, color: c.text3 }}>{t("est.peer.btm10")}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="gt-panel" style={{ padding: 20, textAlign: "center" }}>
              <p className="gt-section-label" style={{ color: c.red, marginBottom: 4 }}>{t("est.peer.reclaim")}</p>
              <p className="gt-mono" style={{ fontSize: 32, fontWeight: 800, color: c.green, lineHeight: 1, letterSpacing: "-.02em", marginBottom: 3 }}>{formatCurrency(peer.ghost)}<span style={{ fontSize: 13, color: c.text3, fontWeight: 400 }}>/yr</span></p>
              <p style={{ fontSize: 9, color: c.text3, marginBottom: 14 }}>{t("est.peer.recovery60")}</p>
              <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
                <button onClick={() => setTab("entropy")} className="gt-btn gt-btn-ghost">{"\u2190"} {t("est.peer.diagnostic")}</button>
                <button onClick={() => setTab("report")} className="gt-btn" style={{ background: c.greenBg, borderColor: c.greenBd, color: c.green }}>{t("est.btn.boardreport")} {"\u2193"}</button>
                <button className="gt-btn gt-btn-green">
                  RECLAIM {formatCurrency(peer.ghost, true)} NOW
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======= BOARD REPORT TAB ======= */}
        {tab === "report" && res && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="gt-panel" style={{ padding: 20, textAlign: "center" }}>
              <p className="gt-section-label" style={{ marginBottom: 8 }}>{t("est.report.label")}</p>
              <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 6 }}>{t("est.report.title")}</h2>
              <p style={{ fontSize: 12, color: c.text2, maxWidth: 420, margin: "0 auto", lineHeight: 1.5 }}>
                {t("est.report.desc")}
              </p>
            </div>

            <div className="gt-panel" style={{ padding: 16 }}>
              <pre style={{ fontFamily: f.mono, fontSize: 9.5, lineHeight: 1.6, color: c.text2, whiteSpace: "pre-wrap", wordBreak: "break-word", background: "rgba(0,0,0,.2)", padding: 14, borderRadius: 8, border: "1px solid " + c.border, maxHeight: 400, overflow: "auto" }}>
                {generateBoardReport(inp, res, peer, IL, formatCurrency)}
              </pre>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
              <button onClick={() => setTab("entropy")} className="gt-btn gt-btn-ghost">{"\u2190"} {t("est.peer.diagnostic")}</button>
              <button onClick={() => downloadReport(generateBoardReport(inp, res, peer, IL, formatCurrency))} className="gt-btn gt-btn-primary">
                {t("est.report.download")} {"\u2193"}
              </button>
            </div>
          </div>
        )}

        {/* ======= TRUST FOOTER (all tabs) ======= */}
        <TrustFooter t={t} />

      </div>
    </div>
  );
}
