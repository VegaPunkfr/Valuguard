"use client";
// @ts-nocheck

import { useState, useCallback, useRef, useEffect, useMemo } from "react";

/*  VALUGUARD COCKPIT — FR 2026
    Estimateur Ghost Tax + Peer-Gap + Rapport Board + Signaux de confiance */

// ═════════════════ TOKENS ═════════════════
const C = {
  void: "#060912", base: "#0b0e18", surf: "rgba(11,14,24,0.72)",
  bdr: "rgba(36,48,78,0.32)", accent: "#3b82f6", ahi: "#60a5fa",
  t1: "#e0e6f2", t2: "#8d9bb5", t3: "#55637d",
  red: "#ef4444", ora: "#f59e0b", grn: "#22c55e", teal: "#34d399",
};
const MO = "ui-monospace,'Cascadia Code','Fira Code',monospace";
const SA = "system-ui,-apple-system,'Segoe UI',sans-serif";
const gl = {
  background: C.surf,
  backdropFilter: "blur(18px) saturate(1.15)",
  WebkitBackdropFilter: "blur(18px) saturate(1.15)",
  border: `1px solid ${C.bdr}`,
  borderRadius: 12,
  boxShadow: "0 4px 32px rgba(0,0,0,0.28)",
};
const iS = {
  width: "100%", padding: "9px 12px", borderRadius: 7,
  border: "1px solid #1e2640", background: "#080b14",
  color: C.t1, fontSize: 13, fontFamily: MO, outline: "none",
};

// ═════════════════ FORMATTERS ═════════════════
const D = (n, s) => {
  if (s && n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (s && n >= 1e4) return `$${Math.round(n / 1e3)}k`;
  return "$" + Math.round(n).toLocaleString("en-US");
};

// ═════════════════ ENTROPY ENGINE ═════════════════
const IF = { saas_tech: 1.15, finance: 0.9, healthcare: 1.05, retail: 1.1, services: 1.0, mfg: 0.95, other: 1.0 };
const IL = [["saas_tech", "SaaS / Tech"], ["finance", "Finance / Insurance"], ["healthcare", "Healthcare"], ["retail", "Retail / DTC"], ["services", "Professional Services"], ["mfg", "Manufacturing"], ["other", "Other"]];
const SG = [
  "No complete SaaS inventory exists",
  "Former employees still have active licenses",
  "Enterprise plans with basic-level usage",
  "Multiple teams using overlapping tools",
  "AI/API costs surged 50%+ in 6 months",
  "Annual commitments sitting underutilized",
  "Tools purchased without IT approval",
  "No cost-per-user-per-tool tracking",
];
const SV = [
  { label: "Inactive Licenses & Shadow IT", icon: "👻", si: [0, 1], sh: 0.28 },
  { label: "Oversized Plans & Commitments", icon: "📐", si: [2, 5], sh: 0.22 },
  { label: "Redundant Tooling", icon: "🔄", si: [3], sh: 0.18 },
  { label: "AI Cost Drift", icon: "🤖", si: [4], sh: 0.17 },
  { label: "Governance Gap", icon: "🏴", si: [6, 7], sh: 0.15 },
];

function calc(inp) {
  const tot = inp.saas + inp.cloud + inp.ai;
  const sc = inp.sigs.filter(Boolean).length;
  const leak = tot * 0.18 * (1 + sc * 0.08) * (IF[inp.ind] || 1);
  const ann = leak * 12;
  const pct = tot > 0 ? leak / tot : 0;
  const grav = Math.min(100, Math.round(pct * 250 + sc * 6 + (inp.tools > 50 ? 10 : inp.tools > 20 ? 5 : 0)));
  const kappa = inp.emp <= 50 ? 0 : Math.min(0.4, 0.12 * Math.log(inp.emp / 50));
  const bd = SV.map(t => {
    const b = t.si.some(i => inp.sigs[i]) ? 1.3 : 0.7;
    return { ...t, amt: Math.round(ann * t.sh * b) };
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

// ═════════════════ PEER-GAP ENGINE ═════════════════
const PB = {
  saas_tech: { a: [180, 280, 380, 520, 720], b: [0.3, 0.5, 0.8, 1.2, 1.8], c: [88, 78, 65, 52, 38], d: [3, 8, 15, 25, 38], e: [5, 15, 35, 60, 120] },
  finance: { a: [150, 220, 310, 430, 580], b: [0.2, 0.3, 0.5, 0.8, 1.2], c: [92, 84, 75, 62, 48], d: [1, 4, 8, 15, 25], e: [3, 10, 22, 45, 80] },
  healthcare: { a: [120, 190, 280, 400, 550], b: [0.2, 0.4, 0.6, 0.9, 1.4], c: [90, 80, 68, 55, 40], d: [2, 6, 12, 22, 35], e: [5, 12, 28, 50, 95] },
  retail: { a: [100, 170, 260, 380, 520], b: [0.2, 0.3, 0.5, 0.8, 1.3], c: [88, 76, 62, 48, 35], d: [3, 8, 16, 28, 42], e: [4, 12, 30, 55, 100] },
  services: { a: [130, 200, 300, 420, 580], b: [0.2, 0.4, 0.6, 1.0, 1.5], c: [90, 82, 70, 58, 42], d: [2, 6, 12, 20, 32], e: [4, 10, 25, 48, 85] },
  mfg: { a: [80, 140, 220, 340, 480], b: [0.1, 0.2, 0.4, 0.6, 1.0], c: [92, 85, 76, 64, 50], d: [1, 4, 9, 16, 28], e: [2, 8, 18, 35, 65] },
  other: { a: [120, 200, 300, 430, 600], b: [0.2, 0.4, 0.6, 0.9, 1.4], c: [90, 80, 68, 55, 40], d: [2, 7, 14, 24, 38], e: [4, 12, 28, 52, 90] },
};
const PM = [
  { k: "a", l: "Spend / Employee", u: "/mo", lib: true },
  { k: "b", l: "SaaS / Employee", u: "", lib: true },
  { k: "c", l: "License Utilization", u: "%", lib: false },
  { k: "d", l: "Shadow IT Rate", u: "%", lib: true },
  { k: "e", l: "AI Growth (6mo)", u: "%", lib: true },
];
const PL = { saas_tech: "SaaS scale-ups", finance: "finance companies", healthcare: "healthcare orgs", retail: "retail companies", services: "services firms", mfg: "manufacturers", other: "peers" };

function pInt(v, p, lib) {
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

function calcPeer(inp, ent) {
  const bm = PB[inp.ind] || PB.other;
  const tot = inp.saas + inp.cloud + inp.ai;
  const vals = {
    a: inp.emp > 0 ? tot / inp.emp : 0,
    b: inp.emp > 0 ? inp.tools / inp.emp : 0,
    c: Math.max(30, Math.min(95, 100 - ent.grav * 0.6)),
    d: ent.sc > 3 ? 22 : ent.sc > 1 ? 12 : 5,
    e: inp.ai > 0 ? Math.min(200, (inp.ai / Math.max(inp.saas, 1)) * 100) : 10,
  };
  const mets = PM.map(m => {
    const v = vals[m.k];
    const pct = Math.round(pInt(v, bm[m.k], m.lib));
    return { ...m, v: Math.round(v * 100) / 100, pct, med: bm[m.k][2], vd: pct <= 25 ? "ex" : pct <= 50 ? "gd" : pct <= 75 ? "wn" : "cr" };
  });
  const ov = Math.round(mets.reduce((s, m) => s + m.pct, 0) / mets.length);
  return { ov, mets, peer: PL[inp.ind] || "peers", ghost: Math.round(ent.mid * 0.6) };
}

// ═════════════════ SUB-COMPONENTS ═════════════════
function Anim({ value, suffix }) {
  const [d, setD] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const s = performance.now();
    const tick = (now) => {
      const p = Math.min((now - s) / 850, 1);
      setD(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [value]);
  return <span>${d.toLocaleString("en-US")}{suffix || ""}</span>;
}

function Gauge({ score }) {
  const R = 40, ci = 2 * Math.PI * R, off = ci - (score / 100) * ci;
  const col = score >= 61 ? C.red : score >= 31 ? C.ora : C.grn;
  const lab = score >= 61 ? "CRITICAL" : score >= 31 ? "ELEVATED" : "HEALTHY";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width="110" height="110" viewBox="0 0 104 104">
        <circle cx="52" cy="52" r={R} fill="none" stroke="#161c2c" strokeWidth="6" />
        <circle cx="52" cy="52" r={R} fill="none" stroke={col} strokeWidth="6" strokeLinecap="round" strokeDasharray={ci} strokeDashoffset={off} transform="rotate(-90 52 52)" style={{ transition: "stroke-dashoffset 1s cubic-bezier(.16,1,.3,1)" }} />
        <text x="52" y="48" textAnchor="middle" fill={col} style={{ fontSize: 22, fontFamily: MO, fontWeight: 800 }}>{score}</text>
        <text x="52" y="63" textAnchor="middle" fill={C.t3} style={{ fontSize: 6.5, letterSpacing: ".12em", fontWeight: 600 }}>{lab}</text>
      </svg>
      <span style={{ fontSize: 7.5, letterSpacing: ".1em", textTransform: "uppercase", color: C.t3 }}>Entropy Score</span>
    </div>
  );
}

function Radar({ mets }) {
  const cx = 110, cy = 110, R = 84, n = mets.length, a = 360 / n;
  const xy = (ang, r) => { const rd = ((ang - 90) * Math.PI) / 180; return [cx + r * Math.cos(rd), cy + r * Math.sin(rd)]; };
  const pts = (fn) => mets.map((m, i) => xy(i * a, fn(m))).map(([x, y]) => `${x},${y}`).join(" ");
  const vc = { ex: C.teal, gd: C.grn, wn: C.ora, cr: C.red };
  return (
    <svg viewBox="0 0 220 220" style={{ width: "100%", maxWidth: 230 }}>
      {[.25, .5, .75, 1].map(r => <polygon key={r} points={pts(() => R * r)} fill="none" stroke="rgba(36,48,78,0.28)" strokeWidth=".5" />)}
      {mets.map((_, i) => { const [x, y] = xy(i * a, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(36,48,78,0.18)" strokeWidth=".5" />; })}
      <polygon points={pts(() => R * .5)} fill="none" stroke="rgba(141,155,181,0.2)" strokeWidth="1" strokeDasharray="4,4" />
      <polygon points={pts(m => R * Math.max(.06, 1 - m.pct / 100))} fill="rgba(59,130,246,.1)" stroke={C.accent} strokeWidth="1.5" strokeLinejoin="round" />
      {mets.map((m, i) => { const [x, y] = xy(i * a, R * Math.max(.06, 1 - m.pct / 100)); return <circle key={i} cx={x} cy={y} r="3.5" fill={vc[m.vd]} stroke={C.void} strokeWidth="1.5" />; })}
      {mets.map((m, i) => { const [x, y] = xy(i * a, R + 15); return <text key={`t${i}`} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill={C.t3} fontSize="6.5" fontFamily={MO}>{m.l.split(" ").slice(0, 2).join(" ")}</text>; })}
    </svg>
  );
}

// ═════════════════ BOARD REPORT GENERATOR ═════════════════
function generateBoardReport(inp, ent, peer) {
  const indLabel = IL.find(([k]) => k === inp.ind)?.[1] || "Technology";
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const tot = inp.saas + inp.cloud + inp.ai;

  const lines = [
    "═══════════════════════════════════════════════════════",
    "   VALUGUARD — EXECUTIVE GHOST TAX SUMMARY",
    "   Confidential — Prepared " + date,
    "═══════════════════════════════════════════════════════",
    "",
    "COMPANY PROFILE",
    `  Industry:        ${indLabel}`,
    `  Headcount:       ${inp.emp} employees`,
    `  SaaS Tools:      ${inp.tools} active subscriptions`,
    `  Monthly IT:      ${D(tot)} (SaaS ${D(inp.saas)} + Cloud ${D(inp.cloud)} + AI ${D(inp.ai)})`,
    "",
    "─────────────────────────────────────────────────────",
    "GHOST TAX ASSESSMENT",
    `  Annual Leak:     ${D(ent.lo)} – ${D(ent.hi)} (midpoint: ${D(ent.mid)})`,
    `  Entropy Score:   ${ent.grav}/100 (${ent.grav >= 61 ? "CRITICAL" : ent.grav >= 31 ? "ELEVATED" : "HEALTHY"})`,
    `  Entropy κ:       ${ent.kappa.toFixed(3)} (organizational coordination drag)`,
    `  Audit ROI:       ${ent.roi}x ($990 investment → ${D(ent.mid * 0.6, true)} recoverable)`,
    "",
    "TOP RECOVERY OPPORTUNITIES",
  ];

  ent.bd.forEach((b, i) => {
    lines.push(`  ${i + 1}. ${b.label}: ${D(b.amt, true)}/yr`);
  });

  lines.push("");
  lines.push(`  Shadow AI Redundancy: ${D(ent.redund, true)}/yr`);

  if (peer) {
    lines.push("");
    lines.push("─────────────────────────────────────────────────────");
    lines.push("PEER BENCHMARKING");
    lines.push(`  Overall Percentile: P${peer.ov} (less efficient than ${peer.ov}% of ${peer.peer})`);
    lines.push("");
    peer.mets.forEach(m => {
      const dv = m.k === "a" ? D(m.v) + m.u : (m.k === "b" ? m.v.toFixed(1) : Math.round(m.v)) + m.u;
      const md = m.k === "a" ? D(m.med) + m.u : m.med + m.u;
      lines.push(`  ${m.l.padEnd(22)} You: ${dv.padEnd(12)} Median: ${md.padEnd(12)} P${m.pct}`);
    });
  }

  lines.push("");
  lines.push("─────────────────────────────────────────────────────");
  lines.push("24-MONTH PROJECTION");
  lines.push(`  Without governance:  ${D(ent.burn[3]?.u || 0)}/mo by month 24`);
  lines.push(`  With governance:     ${D(ent.burn[3]?.g || 0)}/mo by month 24`);
  lines.push(`  Cumulative savings:  ${D(ent.sav24, true)} over 24 months`);
  lines.push("");
  lines.push("─────────────────────────────────────────────────────");
  lines.push("RECOMMENDED NEXT STEP");
  lines.push(`  Recoverable Ghost Tax: ${D(peer?.ghost || Math.round(ent.mid * 0.6))}/yr`);
  lines.push("  → Schedule a Valuguard Priority Audit ($990)");
  lines.push("  → Typical ROI: 15-40x within first 90 days");
  lines.push("");
  lines.push("  valuguard.com | SOC2 Type II Readiness | Zero-Knowledge Audit");
  lines.push("═══════════════════════════════════════════════════════");

  return lines.join("\n");
}

function downloadReport(text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `valuguard-ghost-tax-summary-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ═════════════════ TRUST FOOTER ═════════════════
function TrustFooter() {
  return (
    <div style={{ marginTop: 20, padding: "14px 16px", borderRadius: 10, border: `1px solid ${C.bdr}`, background: "rgba(11,14,24,0.4)", display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
      {[
        { icon: "🛡", label: "SOC2 Type II Ready", sub: "Architecture certified" },
        { icon: "🔐", label: "Zero-Knowledge Audit", sub: "We never see raw data" },
        { icon: "🇺🇸", label: "US Data Residency", sub: "Virginia (us-east-1)" },
        { icon: "⏱", label: "30-Day Auto-Delete", sub: "Files purged by default" },
      ].map((t) => (
        <div key={t.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{t.icon}</span>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.t1, letterSpacing: ".02em" }}>{t.label}</div>
            <div style={{ fontSize: 8, color: C.t3 }}>{t.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════
export default function Cockpit() {
  const [tab, setTab] = useState("entropy");
  const [step, setStep] = useState(0);
  const [inp, setInp] = useState({
    emp: 140, ind: "saas_tech", tools: 48,
    saas: 38000, cloud: 15000, ai: 11000,
    sigs: new Array(8).fill(false),
  });
  const [res, setRes] = useState(null);
  const [ph, setPh] = useState(0);
  const [email, setEmail] = useState("");
  const [cap, setCap] = useState(false);
  const rRef = useRef(null);

  const upd = useCallback((k, v) => setInp(p => ({ ...p, [k]: v })), []);
  const tog = useCallback(i => setInp(p => { const s = [...p.sigs]; s[i] = !s[i]; return { ...p, sigs: s }; }), []);

  const run = useCallback(() => {
    const r = calc(inp);
    setRes(r); setStep(3); setPh(0);
    setTimeout(() => setPh(1), 180);
    setTimeout(() => setPh(2), 600);
    setTimeout(() => setPh(3), 1050);
    setTimeout(() => rRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }, [inp]);

  // Live reclaim amount preview (updates as user fills form)
  const liveReclaim = useMemo(() => {
    const tot = inp.saas + inp.cloud + inp.ai;
    const sc = inp.sigs.filter(Boolean).length;
    const leak = tot * 0.18 * (1 + sc * 0.08) * (IF[inp.ind] || 1) * 12;
    return Math.round(leak * 0.6);
  }, [inp]);

  const peer = useMemo(() => res ? calcPeer(inp, res) : null, [inp, res]);
  const sc = inp.sigs.filter(Boolean).length;
  const tot = inp.saas + inp.cloud + inp.ai;
  const rv = (min, del = 0) => ({
    opacity: ph >= min ? 1 : 0,
    transform: ph >= min ? "translateY(0)" : "translateY(12px)",
    transition: `all .5s cubic-bezier(.16,1,.3,1) ${del}ms`,
  });
  const vc = { ex: C.teal, gd: C.grn, wn: C.ora, cr: C.red };
  const vb = { ex: "rgba(52,211,153,.06)", gd: "rgba(34,197,94,.06)", wn: "rgba(245,158,11,.06)", cr: "rgba(239,68,68,.06)" };

  return (
    <div style={{ minHeight: "100vh", background: C.void, fontFamily: SA, color: C.t1, padding: "20px 14px 40px" }}>
      <div style={{ maxWidth: 660, margin: "0 auto" }}>

        {/* ── RETOUR ────────────────────────────── */}
        <div style={{ marginBottom: 14 }}><a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: C.t2, textDecoration: "none", padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.bdr}`, background: "rgba(11,14,24,0.5)" }}>{"\u2190"} Retour</a></div>

        {/* ── HEADER BAR ────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, fontFamily: MO, fontWeight: 700, letterSpacing: ".06em", color: C.accent }}>VALUGUARD</span>
            <span style={{ fontSize: 8, color: C.t3, fontFamily: MO, padding: "2px 5px", borderRadius: 3, border: `1px solid ${C.bdr}` }}>FR 2026</span>
          </div>
          <div style={{ display: "flex", gap: 2, padding: 3, borderRadius: 8, background: "rgba(11,14,24,.5)", border: `1px solid ${C.bdr}` }}>
            {[["entropy", "Ghost Tax"], ["peergap", "Peer Gap"], ["report", "Board Report"]].map(([k, l]) => {
              const disabled = (k !== "entropy") && !res;
              return (
                <button key={k} onClick={() => !disabled && setTab(k)}
                  style={{ padding: "5px 12px", borderRadius: 6, border: "none", fontSize: 10, fontWeight: 600, fontFamily: MO, background: tab === k ? C.accent : "transparent", color: tab === k ? "#fff" : disabled ? "#1e2640" : C.t2, cursor: disabled ? "not-allowed" : "pointer", transition: "all .12s", letterSpacing: ".03em" }}>
                  {l}
                </button>
              );
            })}
          </div>
          <span style={{ fontSize: 8, color: C.t3, fontFamily: MO, padding: "3px 7px", borderRadius: 4, border: `1px solid ${C.bdr}` }}>⌘K</span>
        </div>

        {/* ═══════ ENTROPY TAB ═══════ */}
        {tab === "entropy" && (
          <>
            {step < 3 && (
              <div style={{ textAlign: "center", marginBottom: 22 }}>
                <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: C.accent, fontFamily: MO, marginBottom: 8 }}>PROFIT RECOVERY PROTOCOL</p>
                <h1 style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.15, letterSpacing: "-.02em", marginBottom: 6 }}>
                  Expose your <span style={{ color: C.red }}>AI Ghost Tax.</span>{" "}
                  <span style={{ color: C.teal }}>Reclaim your margin.</span>
                </h1>
                <p style={{ fontSize: 12, color: C.t2, maxWidth: 420, margin: "0 auto", lineHeight: 1.5 }}>
                  3 steps. 60 seconds. Every dollar found is a dollar returned.
                </p>
              </div>
            )}

            {step < 3 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 16 }}>
                {["Profile", "Spending", "Signals"].map((l, i) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 21, height: 21, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, fontFamily: MO, background: step === i ? C.accent : step > i ? "#18654d" : "#131828", color: step >= i ? "#fff" : "#333d55", transition: "all .2s" }}>
                      {step > i ? "✓" : i + 1}
                    </div>
                    <span style={{ fontSize: 10, color: step === i ? C.t1 : "#333d55", fontWeight: step === i ? 600 : 400 }}>{l}</span>
                    {i < 2 && <div style={{ width: 16, height: 1, background: step > i ? "#18654d" : "#161c2c", marginLeft: 2 }} />}
                  </div>
                ))}
              </div>
            )}

            {/* Step 0 */}
            {step === 0 && (
              <div style={{ ...gl, padding: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 9, letterSpacing: ".08em", textTransform: "uppercase", color: C.t3, fontWeight: 500, marginBottom: 5 }}>Headcount</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <input type="range" min={10} max={500} step={10} value={inp.emp} onChange={e => upd("emp", +e.target.value)} style={{ flex: 1, accentColor: C.accent }} />
                      <span style={{ fontFamily: MO, fontSize: 16, fontWeight: 700, color: C.ahi, minWidth: 44, textAlign: "right" }}>{inp.emp}</span>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 9, letterSpacing: ".08em", textTransform: "uppercase", color: C.t3, fontWeight: 500, marginBottom: 5 }}>Industry</label>
                    <select value={inp.ind} onChange={e => upd("ind", e.target.value)} style={{ ...iS, fontFamily: SA, fontSize: 12, cursor: "pointer" }}>
                      {IL.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 9, letterSpacing: ".08em", textTransform: "uppercase", color: C.t3, fontWeight: 500, marginBottom: 5 }}>Estimated SaaS tools</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <input type="range" min={5} max={200} step={5} value={inp.tools} onChange={e => upd("tools", +e.target.value)} style={{ flex: 1, accentColor: C.accent }} />
                      <span style={{ fontFamily: MO, fontSize: 16, fontWeight: 700, color: C.ahi, minWidth: 44, textAlign: "right" }}>{inp.tools}</span>
                    </div>
                  </div>
                  <button onClick={() => setStep(1)} style={{ width: "100%", padding: "13px", borderRadius: 8, border: "none", background: C.accent, color: "#fff", fontSize: 12, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", cursor: "pointer" }}>
                    CONTINUE — ESTIMATE GHOST TAX →
                  </button>
                </div>
              </div>
            )}

            {/* Step 1 */}
            {step === 1 && (
              <div style={{ ...gl, padding: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {[["saas", "Monthly SaaS outflow ($)"], ["cloud", "Monthly Cloud / Infra ($)"], ["ai", "Monthly AI / API ($)"]].map(([k, l]) => (
                    <div key={k}>
                      <label style={{ display: "block", fontSize: 9, letterSpacing: ".08em", textTransform: "uppercase", color: C.t3, fontWeight: 500, marginBottom: 5 }}>{l}</label>
                      <input type="number" value={inp[k] || ""} onChange={e => upd(k, +e.target.value || 0)} style={iS} onFocus={e => e.target.style.borderColor = C.accent} onBlur={e => e.target.style.borderColor = "#1e2640"} />
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", borderRadius: 7, background: "rgba(59,130,246,.04)", border: "1px solid rgba(59,130,246,.12)" }}>
                    <span style={{ fontSize: 9, letterSpacing: ".06em", textTransform: "uppercase", color: C.t3 }}>Total monthly IT spend</span>
                    <span style={{ fontFamily: MO, fontSize: 17, fontWeight: 700, color: C.ahi }}>{D(tot)}</span>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => setStep(0)} style={{ padding: "9px 14px", borderRadius: 7, border: `1px solid ${C.bdr}`, background: "transparent", color: C.t2, fontSize: 11, cursor: "pointer" }}>← Back</button>
                    <button onClick={() => setStep(2)} style={{ flex: 1, padding: "13px", borderRadius: 8, border: "none", background: C.accent, color: "#fff", fontSize: 12, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", cursor: "pointer" }}>CONTINUE →</button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div style={{ ...gl, padding: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <p style={{ fontSize: 12, color: C.t2, lineHeight: 1.5, marginBottom: 2 }}>Select observed symptoms. Each signal sharpens the recovery estimate.</p>
                  {SG.map((l, i) => (
                    <button key={i} onClick={() => tog(i)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 7, width: "100%", textAlign: "left", fontSize: 12, lineHeight: 1.3, cursor: "pointer", transition: "all .12s", border: inp.sigs[i] ? "1px solid rgba(59,130,246,.35)" : "1px solid #161c2c", background: inp.sigs[i] ? "rgba(59,130,246,.06)" : "#080b14", color: inp.sigs[i] ? C.t1 : C.t2 }}>
                      <span style={{ width: 17, height: 17, borderRadius: 4, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", border: inp.sigs[i] ? `2px solid ${C.accent}` : "2px solid #252e45", background: inp.sigs[i] ? C.accent : "transparent", transition: "all .12s" }}>
                        {inp.sigs[i] ? "✓" : ""}
                      </span>
                      {l}
                    </button>
                  ))}
                  <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                    <button onClick={() => setStep(1)} style={{ padding: "9px 14px", borderRadius: 7, border: `1px solid ${C.bdr}`, background: "transparent", color: C.t2, fontSize: 11, cursor: "pointer" }}>← Back</button>
                    <button onClick={run} disabled={sc === 0} style={{ flex: 1, padding: "13px", borderRadius: 8, border: "none", background: sc > 0 ? C.teal : "#131828", color: sc > 0 ? C.void : "#333d55", fontSize: 12, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", cursor: sc > 0 ? "pointer" : "not-allowed" }}>
                      {sc > 0 ? `RECLAIM ${D(liveReclaim, true)} — EXPOSE ENTROPY` : "SELECT AT LEAST 1 SIGNAL"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Results */}
            {step === 3 && res && (
              <div ref={rRef} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ textAlign: "center", ...rv(1) }}>
                  <p style={{ fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 600, color: res.grav >= 61 ? C.red : res.grav >= 31 ? C.ora : C.grn, marginBottom: 5 }}>GHOST TAX DETECTED — PROFIT RECOVERY AVAILABLE</p>
                  <p style={{ fontFamily: MO, fontSize: 30, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1, color: res.grav >= 61 ? C.red : res.grav >= 31 ? C.ora : C.teal }}>
                    {ph >= 1 ? <Anim value={res.mid} suffix="/yr" /> : "—"}
                  </p>
                  <p style={{ fontSize: 11, color: C.t3, marginTop: 3 }}>Range: {D(res.lo)} – {D(res.hi)}</p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, ...rv(1, 160) }}>
                  <div style={{ padding: 10, borderRadius: 9, background: "rgba(11,14,24,.5)", border: `1px solid ${C.bdr}`, textAlign: "center" }}><Gauge score={res.grav} /></div>
                  <div style={{ padding: 10, borderRadius: 9, background: "rgba(11,14,24,.5)", border: `1px solid ${C.bdr}`, textAlign: "center" }}>
                    <p style={{ fontSize: 7.5, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>Entropy Coefficient</p>
                    <p style={{ fontFamily: MO, fontSize: 20, fontWeight: 700, color: res.kappa > .2 ? C.ora : C.ahi }}>κ = {res.kappa.toFixed(3)}</p>
                    <p style={{ fontSize: 8, color: C.t3, marginTop: 2 }}>{res.kappa > .2 ? "High — costly coordination" : res.kappa > .1 ? "Moderate — needs attention" : "Low — good governance"}</p>
                  </div>
                  <div style={{ padding: 10, borderRadius: 9, background: "rgba(11,14,24,.5)", border: `1px solid ${C.bdr}`, textAlign: "center" }}>
                    <p style={{ fontSize: 7.5, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>Audit ROI</p>
                    <p style={{ fontFamily: MO, fontSize: 20, fontWeight: 700, color: C.teal }}>×{res.roi}</p>
                    <p style={{ fontSize: 8, color: C.t3, marginTop: 2 }}>$990 → {D(res.mid * .6, true)} recovered</p>
                  </div>
                </div>

                <div style={{ ...gl, padding: 14, ...rv(2) }}>
                  <h3 style={{ fontSize: 8, letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 600, color: C.t3, marginBottom: 10 }}>PROFIT RECOVERY PROTOCOL — SAVINGS BREAKDOWN</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                    {res.bd.map((it, i) => {
                      const mx = res.bd[0]?.amt || 1;
                      return (
                        <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <span style={{ fontSize: 15, width: 22, textAlign: "center" }}>{it.icon}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
                              <span style={{ fontSize: 10.5, color: C.t2 }}>{it.label}</span>
                              <span style={{ fontFamily: MO, fontSize: 11, fontWeight: 600, color: C.t1 }}>{D(it.amt, true)}/yr</span>
                            </div>
                            <div style={{ height: 4, borderRadius: 2, background: "#121728", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${(it.amt / mx) * 100}%`, borderRadius: 2, background: `linear-gradient(90deg,${C.accent},${C.ahi})`, transition: `width .7s cubic-bezier(.16,1,.3,1) ${i * 90}ms` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 10, padding: "7px 10px", borderRadius: 5, background: "rgba(59,130,246,.04)", border: "1px solid rgba(59,130,246,.1)", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 8.5, letterSpacing: ".06em", textTransform: "uppercase", color: C.t3 }}>Shadow AI redundancy</span>
                    <span style={{ fontFamily: MO, fontSize: 11, fontWeight: 700, color: C.ora }}>{D(res.redund, true)}/yr</span>
                  </div>
                </div>

                <div style={{ ...gl, padding: 14, ...rv(3) }}>
                  <h3 style={{ fontSize: 8, letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 600, color: C.t3, marginBottom: 10 }}>24-MONTH TRAJECTORY</h3>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 90 }}>
                    {res.burn.map((p, i) => {
                      const mx = Math.max(...res.burn.map(x => x.u));
                      return (
                        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, height: "100%", justifyContent: "flex-end" }}>
                          <div style={{ display: "flex", gap: 2, alignItems: "flex-end", flex: 1 }}>
                            <div style={{ width: 13, height: `${mx > 0 ? (p.u / mx) * 100 : 0}%`, minHeight: 3, borderRadius: "2px 2px 0 0", background: i === 0 ? "#1a2038" : `linear-gradient(to top,#a62828,${C.ora})`, transition: `height .7s cubic-bezier(.16,1,.3,1) ${i * 120}ms` }} />
                            <div style={{ width: 13, height: `${mx > 0 ? (p.g / mx) * 100 : 0}%`, minHeight: 3, borderRadius: "2px 2px 0 0", background: i === 0 ? "#1a2038" : `linear-gradient(to top,#147252,${C.teal})`, transition: `height .7s cubic-bezier(.16,1,.3,1) ${i * 120 + 70}ms` }} />
                          </div>
                          <span style={{ fontSize: 8.5, fontFamily: MO, color: C.t3 }}>{p.l}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 7, fontSize: 7.5, color: C.t3, textTransform: "uppercase", letterSpacing: ".05em" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: C.ora }} />Ungoverned</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: C.teal }} />Governed</span>
                  </div>
                  {res.sav24 > 0 && (
                    <div style={{ marginTop: 10, padding: "7px 10px", borderRadius: 5, background: "rgba(52,211,153,.04)", border: "1px solid rgba(52,211,153,.1)", textAlign: "center" }}>
                      <span style={{ fontSize: 10, color: C.t2 }}>24-month governance savings: </span>
                      <span style={{ fontFamily: MO, fontSize: 14, fontWeight: 700, color: C.teal }}>{D(res.sav24, true)}</span>
                    </div>
                  )}
                </div>

                {/* CTA */}
                <div style={{ ...gl, padding: 20, textAlign: "center", ...rv(3, 160) }}>
                  {cap ? (
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 700, color: C.teal, marginBottom: 5 }}>✓ Priority audit registered</p>
                      <p style={{ fontSize: 11, color: C.t2 }}>Check your inbox. An expert reaches out within 24h.</p>
                    </div>
                  ) : (
                    <>
                      <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: res.grav >= 61 ? C.red : C.ora, marginBottom: 4 }}>
                        {res.grav >= 61 ? "⚠ URGENT — MARGIN EROSION DETECTED" : "SIGNIFICANT RECOVERY IDENTIFIED"}
                      </p>
                      <p style={{ fontSize: 12, color: C.t2, marginBottom: 14, lineHeight: 1.5 }}>
                        Get your detailed pre-diagnostic with top 3 prioritized recovery actions.
                      </p>
                      <div style={{ display: "flex", gap: 6, maxWidth: 400, margin: "0 auto" }}>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" style={{ ...iS, flex: 1, fontSize: 12 }} onFocus={e => e.target.style.borderColor = C.accent} onBlur={e => e.target.style.borderColor = "#1e2640"} />
                        <button onClick={() => { if (email.includes("@") && email.includes(".")) setCap(true); }}
                          style={{ padding: "10px 18px", borderRadius: 7, border: "none", background: email.includes("@") ? C.teal : "#131828", color: email.includes("@") ? C.void : C.t3, fontSize: 10, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", cursor: email.includes("@") ? "pointer" : "not-allowed", whiteSpace: "nowrap", transition: "all .12s" }}>
                          RECLAIM {D(res.mid * .6, true)} NOW
                        </button>
                      </div>
                      <p style={{ fontSize: 7.5, color: C.t3, marginTop: 7 }}>Stealth Mode active — data stays in-browser. Zero transmitted without consent.</p>
                    </>
                  )}
                </div>

                {/* Action row */}
                <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => setTab("peergap")} style={{ padding: "8px 16px", borderRadius: 7, border: `1px solid ${C.accent}25`, background: "rgba(59,130,246,.05)", color: C.ahi, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
                    VIEW PEER-GAP ANALYSIS →
                  </button>
                  <button onClick={() => setTab("report")} style={{ padding: "8px 16px", borderRadius: 7, border: `1px solid ${C.teal}25`, background: "rgba(52,211,153,.05)", color: C.teal, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
                    DOWNLOAD BOARD REPORT ↓
                  </button>
                  <button onClick={() => { setStep(0); setRes(null); setPh(0); setCap(false); setEmail(""); }} style={{ padding: "8px 14px", borderRadius: 7, border: `1px solid ${C.bdr}`, background: "transparent", color: C.t3, fontSize: 10, cursor: "pointer" }}>↻ Reset</button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══════ PEER-GAP TAB ═══════ */}
        {tab === "peergap" && peer && res && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ ...gl, padding: 16, textAlign: "center" }}>
              <p style={{ fontSize: 8.5, fontWeight: 600, fontFamily: MO, letterSpacing: ".14em", textTransform: "uppercase", color: peer.ov > 75 ? C.red : peer.ov > 50 ? C.ora : peer.ov > 25 ? C.grn : C.teal, marginBottom: 4 }}>
                PEER-GAP ANALYSIS — {inp.ind.replace(/_/g, " ").toUpperCase()}
              </p>
              <p style={{ fontSize: 13, color: C.t2, lineHeight: 1.5, maxWidth: 460, margin: "0 auto 10px" }}>
                Your organization is <strong style={{ color: peer.ov > 75 ? C.red : peer.ov > 50 ? C.ora : C.grn, fontWeight: 700 }}>less efficient than {peer.ov}%</strong> of comparable {peer.peer}.
              </p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 7, background: "rgba(0,0,0,.18)", border: `1px solid ${(peer.ov > 50 ? C.red : C.accent) + "22"}` }}>
                <span style={{ fontSize: 8, color: C.t3, textTransform: "uppercase", letterSpacing: ".08em" }}>Overall</span>
                <span style={{ fontFamily: MO, fontSize: 22, fontWeight: 800, color: peer.ov > 75 ? C.red : peer.ov > 50 ? C.ora : peer.ov > 25 ? C.grn : C.teal }}>P{peer.ov}</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "230px 1fr", gap: 10 }}>
              <div style={{ ...gl, padding: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <p style={{ fontSize: 8, fontFamily: MO, color: C.t3, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 4 }}>EFFICIENCY RADAR</p>
                <Radar mets={peer.mets} />
              </div>
              <div style={{ ...gl, padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                <p style={{ fontSize: 8, fontFamily: MO, color: C.t3, letterSpacing: ".1em", textTransform: "uppercase" }}>METRIC BREAKDOWN</p>
                {peer.mets.map(m => {
                  const col = vc[m.vd]; const bg = vb[m.vd];
                  const dv = m.k === "a" ? D(m.v) + m.u : (m.k === "b" ? m.v.toFixed(1) : Math.round(m.v)) + m.u;
                  const md = m.k === "a" ? D(m.med) + m.u : m.med + m.u;
                  return (
                    <div key={m.k} style={{ padding: "8px 10px", borderRadius: 6, background: bg, border: `1px solid ${col}12` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
                        <span style={{ fontSize: 10.5, fontWeight: 600, color: C.t1 }}>{m.l}</span>
                        <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                          <span style={{ fontSize: 7.5, color: C.t3 }}>Med: <span style={{ fontFamily: MO, color: C.t2 }}>{md}</span></span>
                          <span style={{ fontFamily: MO, fontSize: 11, fontWeight: 700, color: col }}>{dv}</span>
                        </div>
                      </div>
                      <div style={{ height: 3, borderRadius: 2, background: "rgba(0,0,0,.2)", position: "relative", overflow: "hidden" }}>
                        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.max(3, Math.min(97, m.pct))}%`, borderRadius: 2, background: `linear-gradient(90deg,${C.teal},${col})`, transition: "width .8s cubic-bezier(.16,1,.3,1)" }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                        <span style={{ fontSize: 6.5, fontFamily: MO, color: C.t3 }}>TOP 10%</span>
                        <span style={{ fontSize: 6.5, fontFamily: MO, color: col, fontWeight: 600 }}>P{m.pct}</span>
                        <span style={{ fontSize: 6.5, fontFamily: MO, color: C.t3 }}>BTM 10%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ ...gl, padding: 20, textAlign: "center" }}>
              <p style={{ fontSize: 8, fontFamily: MO, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: C.red, marginBottom: 4 }}>RECOVERABLE GHOST TAX</p>
              <p style={{ fontFamily: MO, fontSize: 32, fontWeight: 800, color: C.teal, lineHeight: 1, letterSpacing: "-.02em", marginBottom: 3 }}>{D(peer.ghost)}<span style={{ fontSize: 13, color: C.t3, fontWeight: 400 }}>/yr</span></p>
              <p style={{ fontSize: 9, color: C.t3, marginBottom: 14 }}>Conservative 60% recovery of estimated Ghost Tax.</p>
              <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
                <button onClick={() => setTab("entropy")} style={{ padding: "9px 16px", borderRadius: 7, border: `1px solid ${C.bdr}`, background: "transparent", color: C.t2, fontSize: 10, cursor: "pointer" }}>← Diagnostic</button>
                <button onClick={() => setTab("report")} style={{ padding: "9px 16px", borderRadius: 7, border: `1px solid ${C.teal}25`, background: "rgba(52,211,153,.06)", color: C.teal, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>DOWNLOAD BOARD REPORT ↓</button>
                <button style={{ padding: "9px 20px", borderRadius: 7, border: "none", background: C.teal, color: C.void, fontSize: 10, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", cursor: "pointer" }}>
                  RECLAIM {D(peer.ghost, true)} NOW
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ BOARD REPORT TAB ═══════ */}
        {tab === "report" && res && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ ...gl, padding: 20, textAlign: "center" }}>
              <p style={{ fontSize: 9, fontFamily: MO, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase", color: C.accent, marginBottom: 8 }}>EXECUTIVE SUMMARY</p>
              <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 6 }}>Board-Ready Ghost Tax Report</h2>
              <p style={{ fontSize: 12, color: C.t2, maxWidth: 420, margin: "0 auto", lineHeight: 1.5 }}>
                One-page summary formatted for your CEO, CFO, or board.
                Includes entropy score, peer benchmarking, and recovery roadmap.
              </p>
            </div>

            <div style={{ ...gl, padding: 16 }}>
              <pre style={{ fontFamily: MO, fontSize: 9.5, lineHeight: 1.6, color: C.t2, whiteSpace: "pre-wrap", wordBreak: "break-word", background: "rgba(0,0,0,.2)", padding: 14, borderRadius: 8, border: `1px solid ${C.bdr}`, maxHeight: 400, overflow: "auto" }}>
                {generateBoardReport(inp, res, peer)}
              </pre>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
              <button onClick={() => setTab("entropy")} style={{ padding: "9px 16px", borderRadius: 7, border: `1px solid ${C.bdr}`, background: "transparent", color: C.t2, fontSize: 10, cursor: "pointer" }}>← Diagnostic</button>
              <button onClick={() => downloadReport(generateBoardReport(inp, res, peer))} style={{ padding: "10px 22px", borderRadius: 7, border: "none", background: C.accent, color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", cursor: "pointer" }}>
                DOWNLOAD EXECUTIVE SUMMARY ↓
              </button>
            </div>
          </div>
        )}

        {/* ═══════ TRUST FOOTER (all tabs) ═══════ */}
        <TrustFooter />

      </div>
    </div>
  );
}


