"use client";
import { useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";

/*  VALUGUARD — PEER-GAP ANALYSIS (US 2026 FINAL)
    Self-contained. Renders immediately with demo data.
    SVG radar + percentile bars + RECLAIM CTA.
    100% USD. Zero French. Zero Euro. */

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

const gls = {
  background: "rgba(11,14,24,0.72)",
  backdropFilter: "blur(18px) saturate(1.15)",
  WebkitBackdropFilter: "blur(18px) saturate(1.15)",
  border: "1px solid " + BD,
  borderRadius: 12,
  boxShadow: "0 4px 32px rgba(0,0,0,0.28)",
};

// ── USD Formatter ──────────────────────────────────
function fmt(n, compact) {
  if (compact && n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  if (compact && n >= 1e4) return "$" + Math.round(n / 1e3) + "k";
  return "$" + Math.round(n).toLocaleString("en-US");
}

// ── US Industry benchmarks [P10, P25, P50, P75, P90] ──
const BENCH = {
  saas_tech:     { spe: [180,280,380,520,720], tools: [0.3,0.5,0.8,1.2,1.8], util: [88,78,65,52,38], shadow: [3,8,15,25,38], ai: [5,15,35,60,120] },
  finance:       { spe: [150,220,310,430,580], tools: [0.2,0.3,0.5,0.8,1.2], util: [92,84,75,62,48], shadow: [1,4,8,15,25], ai: [3,10,22,45,80] },
  healthcare:    { spe: [120,190,280,400,550], tools: [0.2,0.4,0.6,0.9,1.4], util: [90,80,68,55,40], shadow: [2,6,12,22,35], ai: [5,12,28,50,95] },
  retail:        { spe: [100,170,260,380,520], tools: [0.2,0.3,0.5,0.8,1.3], util: [88,76,62,48,35], shadow: [3,8,16,28,42], ai: [4,12,30,55,100] },
  services:      { spe: [130,200,300,420,580], tools: [0.2,0.4,0.6,1.0,1.5], util: [90,82,70,58,42], shadow: [2,6,12,20,32], ai: [4,10,25,48,85] },
  manufacturing: { spe: [80,140,220,340,480],  tools: [0.1,0.2,0.4,0.6,1.0], util: [92,85,76,64,50], shadow: [1,4,9,16,28], ai: [2,8,18,35,65] },
  other:         { spe: [120,200,300,430,600], tools: [0.2,0.4,0.6,0.9,1.4], util: [90,80,68,55,40], shadow: [2,7,14,24,38], ai: [4,12,28,52,90] },
};

const METRIC_DEFS = [
  { id: "spe",    name: "Spend / Employee",    unit: "/mo", lowerBetter: true },
  { id: "tools",  name: "SaaS / Employee",     unit: "",    lowerBetter: true },
  { id: "util",   name: "License Utilization",  unit: "%",   lowerBetter: false },
  { id: "shadow", name: "Shadow IT Rate",       unit: "%",   lowerBetter: true },
  { id: "ai",     name: "AI Spend Growth 6mo",  unit: "%",   lowerBetter: true },
];

const IND_NAMES = {
  saas_tech: "SaaS / Tech scale-ups",
  finance: "finance companies",
  healthcare: "healthcare organizations",
  retail: "retail / DTC companies",
  services: "professional services firms",
  manufacturing: "manufacturers",
  other: "companies in your sector",
};

const IND_OPTIONS = [
  ["saas_tech", "SaaS / Tech"],
  ["finance", "Finance / Insurance"],
  ["healthcare", "Healthcare"],
  ["retail", "Retail / DTC"],
  ["services", "Professional Services"],
  ["manufacturing", "Manufacturing"],
  ["other", "Other"],
];

// ── Percentile interpolation ───────────────────────
function interpolate(value, pcts, lowerBetter) {
  var marks = [10, 25, 50, 75, 90];
  if (value <= pcts[0]) return lowerBetter ? 5 : 95;
  if (value >= pcts[4]) return lowerBetter ? 95 : 5;
  for (var i = 0; i < 4; i++) {
    if (value >= pcts[i] && value <= pcts[i + 1]) {
      var ratio = (value - pcts[i]) / (pcts[i + 1] - pcts[i]);
      var raw = marks[i] + ratio * (marks[i + 1] - marks[i]);
      return lowerBetter ? raw : 100 - raw;
    }
  }
  return 50;
}

function getVerdict(pct) {
  if (pct <= 25) return "excellent";
  if (pct <= 50) return "good";
  if (pct <= 75) return "warning";
  return "critical";
}

var VERDICT_COLOR = { excellent: TL, good: GR, warning: OR, critical: RD };
var VERDICT_BG    = { excellent: "rgba(52,211,153,0.07)", good: "rgba(34,197,94,0.07)", warning: "rgba(245,158,11,0.07)", critical: "rgba(239,68,68,0.07)" };

// ── Engine ─────────────────────────────────────────
function analyze(input) {
  var bm = BENCH[input.industry] || BENCH.other;
  var speVal = input.headcount > 0 ? input.monthlySpend / input.headcount : 0;
  var toolsVal = input.headcount > 0 ? input.saasTools / input.headcount : 0;

  var rawValues = {
    spe: speVal,
    tools: toolsVal,
    util: input.utilization,
    shadow: input.shadowRate,
    ai: input.aiGrowth,
  };

  var results = METRIC_DEFS.map(function(def) {
    var val = rawValues[def.id];
    var pcts = bm[def.id];
    var pct = Math.round(interpolate(val, pcts, def.lowerBetter));
    var verd = getVerdict(pct);
    return {
      id: def.id,
      name: def.name,
      unit: def.unit,
      lowerBetter: def.lowerBetter,
      value: Math.round(val * 100) / 100,
      percentile: pct,
      median: pcts[2],
      verdict: verd,
    };
  });

  var overallPct = Math.round(results.reduce(function(s, m) { return s + m.percentile; }, 0) / results.length);
  var ghostTax = Math.round(input.annualLeak * 0.60);

  return {
    overall: overallPct,
    metrics: results,
    peerName: IND_NAMES[input.industry] || "peers",
    ghostTax: ghostTax,
  };
}

// ── SVG Radar (fully self-contained) ───────────────
function RadarChart(props) {
  var metrics = props.metrics;
  var CX = 115;
  var CY = 115;
  var R = 88;
  var N = metrics.length;
  var STEP = 360 / N;

  function toXY(angleDeg, radius) {
    var rad = (angleDeg - 90) * (Math.PI / 180);
    return [CX + radius * Math.cos(rad), CY + radius * Math.sin(rad)];
  }

  function makePolygon(radiusFn) {
    return metrics.map(function(m, i) {
      var pt = toXY(i * STEP, radiusFn(m, i));
      return pt[0] + "," + pt[1];
    }).join(" ");
  }

  // Grid rings
  var rings = [0.25, 0.50, 0.75, 1.0].map(function(scale) {
    return (
      <polygon
        key={scale}
        points={makePolygon(function() { return R * scale; })}
        fill="none"
        stroke="rgba(36,48,78,0.28)"
        strokeWidth="0.5"
      />
    );
  });

  // Axis lines
  var axes = metrics.map(function(_, i) {
    var end = toXY(i * STEP, R);
    return (
      <line key={"ax" + i} x1={CX} y1={CY} x2={end[0]} y2={end[1]}
        stroke="rgba(36,48,78,0.18)" strokeWidth="0.5" />
    );
  });

  // Median polygon (dashed, P50)
  var medianPts = makePolygon(function() { return R * 0.5; });

  // User polygon
  var userPts = makePolygon(function(m) {
    var normalized = 1 - m.percentile / 100;
    return R * Math.max(0.06, normalized);
  });

  // Data dots
  var dots = metrics.map(function(m, i) {
    var normalized = 1 - m.percentile / 100;
    var pt = toXY(i * STEP, R * Math.max(0.06, normalized));
    return (
      <circle key={"dot" + i}
        cx={pt[0]} cy={pt[1]} r="4"
        fill={VERDICT_COLOR[m.verdict]}
        stroke={V} strokeWidth="1.5"
      />
    );
  });

  // Labels
  var labels = metrics.map(function(m, i) {
    var pt = toXY(i * STEP, R + 16);
    var shortName = m.name.split(" ").slice(0, 2).join(" ");
    return (
      <text key={"lbl" + i}
        x={pt[0]} y={pt[1]}
        textAnchor="middle" dominantBaseline="middle"
        fill={T3} fontSize="7" fontFamily={MO}
      >
        {shortName}
      </text>
    );
  });

  return (
    <svg viewBox="0 0 230 230" style={{ width: "100%", maxWidth: 240, display: "block", margin: "0 auto" }}>
      {rings}
      {axes}
      <polygon points={medianPts} fill="none" stroke="rgba(141,155,181,0.22)" strokeWidth="1" strokeDasharray="4,4" />
      <polygon points={userPts} fill="rgba(59,130,246,0.10)" stroke={A} strokeWidth="1.5" strokeLinejoin="round" />
      {dots}
      {labels}
    </svg>
  );
}

// ── Percentile bar ─────────────────────────────────
function MetricBar(props) {
  var m = props.metric;
  var col = VERDICT_COLOR[m.verdict];
  var bg = VERDICT_BG[m.verdict];
  var barW = Math.max(3, Math.min(97, m.percentile));

  var displayVal = m.id === "spe"
    ? fmt(m.value) + m.unit
    : (m.id === "tools" ? m.value.toFixed(1) : Math.round(m.value)) + m.unit;

  var medianVal = m.id === "spe"
    ? fmt(m.median) + m.unit
    : m.median + m.unit;

  return (
    <div style={{ padding: "9px 11px", borderRadius: 7, background: bg, border: "1px solid " + col + "14" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: T1 }}>{m.name}</span>
        <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
          <span style={{ fontSize: 8, color: T3 }}>
            Median: <span style={{ fontFamily: MO, color: T2 }}>{medianVal}</span>
          </span>
          <span style={{ fontFamily: MO, fontSize: 12, fontWeight: 700, color: col }}>
            {displayVal}
          </span>
        </div>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: "rgba(0,0,0,0.22)", position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", left: 0, top: 0, height: "100%",
          width: barW + "%", borderRadius: 2,
          background: "linear-gradient(90deg," + TL + "," + col + ")",
          transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)",
        }} />
        <div style={{ position: "absolute", left: "50%", top: -2, width: 1, height: 8, background: "rgba(141,155,181,0.35)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
        <span style={{ fontSize: 7, fontFamily: MO, color: T3 }}>TOP 10%</span>
        <span style={{ fontSize: 7, fontFamily: MO, color: col, fontWeight: 600 }}>P{m.percentile}</span>
        <span style={{ fontSize: 7, fontFamily: MO, color: T3 }}>BOTTOM 10%</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════
export default function PeerGapAnalysis() {
  var { t } = useI18n();
  var [input, setInput] = useState({
    industry: "saas_tech",
    headcount: 150,
    monthlySpend: 58000,
    saasTools: 62,
    utilization: 54,
    shadowRate: 19,
    aiGrowth: 78,
    annualLeak: 172000,
  });

  var [email, setEmail] = useState("");
  var [captured, setCaptured] = useState(false);

  function upd(key, val) {
    setInput(function(prev) {
      var next = Object.assign({}, prev);
      next[key] = val;
      return next;
    });
  }

  var result = useMemo(function() { return analyze(input); }, [input]);

  var overallCol = result.overall > 75 ? RD : result.overall > 50 ? OR : result.overall > 25 ? GR : TL;

  // Slider config
  var sliders = [
    { key: "headcount",    label: "Headcount",         min: 10,   max: 500,    step: 10,  format: function(v) { return v; } },
    { key: "monthlySpend", label: "Monthly IT Spend",  min: 5000, max: 200000, step: 1000, format: function(v) { return fmt(v, true); } },
    { key: "saasTools",    label: "SaaS Tools",        min: 5,    max: 200,    step: 5,   format: function(v) { return v; } },
    { key: "utilization",  label: "License Util %",    min: 20,   max: 95,     step: 5,   format: function(v) { return v + "%"; } },
    { key: "shadowRate",   label: "Shadow IT %",       min: 0,    max: 50,     step: 2,   format: function(v) { return v + "%"; } },
    { key: "aiGrowth",     label: "AI Growth 6mo %",   min: 0,    max: 200,    step: 5,   format: function(v) { return v + "%"; } },
  ];

  return (
    <div style={{ minHeight: "100vh", background: V, fontFamily: SA, color: T1, padding: "24px 14px 48px" }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>

        {/* ── RETOUR ─────────────────────────────── */}
        <div style={{ marginBottom: 14 }}><a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: T2, textDecoration: "none", padding: "6px 12px", borderRadius: 6, border: "1px solid " + BD, background: "rgba(11,14,24,0.5)" }}>{t("back")}</a></div>

        {/* ── HEADER ──────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, fontFamily: MO, fontWeight: 700, letterSpacing: ".06em", color: A }}>VALUGUARD</span>
            <span style={{ fontSize: 8, color: T3, fontFamily: MO, padding: "2px 5px", borderRadius: 3, border: "1px solid " + BD }}>PEER-GAP</span>
          </div>
          <span style={{ fontSize: 8, color: T3, fontFamily: MO, padding: "3px 7px", borderRadius: 4, border: "1px solid " + BD }}>
            {t("peergap.stealth")}
</span>
        </div>

        {/* ── CONTROLS ────────────────────────────── */}
        <div style={Object.assign({}, gls, { padding: "12px 16px", marginBottom: 14 })}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ minWidth: 120 }}>
              <label style={{ display: "block", fontSize: 8, color: T3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 3 }}>Industry</label>
              <select
                value={input.industry}
                onChange={function(e) { upd("industry", e.target.value); }}
                style={{ width: "100%", padding: "5px 8px", borderRadius: 5, border: "1px solid #1e2640", background: "#080b14", color: T1, fontSize: 11, outline: "none", cursor: "pointer" }}
              >
                {IND_OPTIONS.map(function(opt) {
                  return <option key={opt[0]} value={opt[0]}>{opt[1]}</option>;
                })}
              </select>
            </div>
            {sliders.map(function(s) {
              return (
                <div key={s.key} style={{ flex: 1, minWidth: 90 }}>
                  <label style={{ display: "block", fontSize: 8, color: T3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 3 }}>{s.label}</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="range" min={s.min} max={s.max} step={s.step}
                      value={input[s.key]}
                      onChange={function(e) { upd(s.key, Number(e.target.value)); }}
                      style={{ flex: 1, accentColor: A }}
                    />
                    <span style={{ fontFamily: MO, fontSize: 11, fontWeight: 700, color: AH, minWidth: 38, textAlign: "right" }}>
                      {s.format(input[s.key])}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── HEADLINE ────────────────────────────── */}
        <div style={Object.assign({}, gls, { padding: 18, marginBottom: 14, textAlign: "center" })}>
          <p style={{ fontSize: 9, fontWeight: 600, fontFamily: MO, letterSpacing: ".14em", textTransform: "uppercase", color: overallCol, marginBottom: 5 }}>
            PEER-GAP ANALYSIS — {(input.industry || "").replace(/_/g, " ").toUpperCase()}
          </p>
          <p style={{ fontSize: 14, color: T2, lineHeight: 1.5, maxWidth: 480, margin: "0 auto 12px" }}>
            Your organization is{" "}
            <strong style={{ color: overallCol, fontWeight: 700 }}>
              less efficient than {result.overall}%
            </strong>{" "}
            of comparable {result.peerName}.
          </p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "7px 16px", borderRadius: 8, background: "rgba(0,0,0,0.2)", border: "1px solid " + overallCol + "25" }}>
            <span style={{ fontSize: 9, color: T3, textTransform: "uppercase", letterSpacing: ".08em" }}>Overall Percentile</span>
            <span style={{ fontFamily: MO, fontSize: 26, fontWeight: 800, color: overallCol }}>P{result.overall}</span>
          </div>
        </div>

        {/* ── RADAR + METRIC BARS ─────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 12, marginBottom: 14 }}>
          {/* Radar */}
          <div style={Object.assign({}, gls, { padding: 14, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" })}>
            <p style={{ fontSize: 8, fontFamily: MO, color: T3, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 6 }}>
              EFFICIENCY RADAR
            </p>
            <RadarChart metrics={result.metrics} />
            <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 8, color: T3 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: "rgba(59,130,246,0.2)", border: "1px solid " + A }} />
                You
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 0, borderTop: "1px dashed rgba(141,155,181,0.4)" }} />
                P50 Median
              </span>
            </div>
          </div>

          {/* Bars */}
          <div style={Object.assign({}, gls, { padding: 12, display: "flex", flexDirection: "column", gap: 7 })}>
            <p style={{ fontSize: 8, fontFamily: MO, color: T3, letterSpacing: ".1em", textTransform: "uppercase" }}>
              METRIC BREAKDOWN
            </p>
            {result.metrics.map(function(m) {
              return <MetricBar key={m.id} metric={m} />;
            })}
          </div>
        </div>

        {/* ── GHOST TAX RECOVERY CTA ──────────────── */}
        <div style={Object.assign({}, gls, {
          padding: 24, textAlign: "center",
          borderColor: result.overall > 50 ? RD + "22" : A + "20",
        })}>
          {captured ? (
            <div>
              <p style={{ fontSize: 17, fontWeight: 700, color: TL, marginBottom: 6 }}>
                ✓ {t("peergap.registered")}
              </p>
              <p style={{ fontSize: 12, color: T2 }}>
                {t("peergap.registered.sub")}
              </p>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 9, fontFamily: MO, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: RD, marginBottom: 5 }}>
                {t("peergap.reclaim")}
              </p>
              <p style={{ fontFamily: MO, fontSize: 36, fontWeight: 800, color: TL, lineHeight: 1, letterSpacing: "-.02em", marginBottom: 4 }}>
                {fmt(result.ghostTax)}
                <span style={{ fontSize: 14, color: T3, fontWeight: 400 }}>/yr</span>
              </p>
              <p style={{ fontSize: 10, color: T3, marginBottom: 18 }}>
                {t("peergap.reclaim.sub")}
              </p>
              <div style={{ display: "flex", gap: 8, maxWidth: 420, margin: "0 auto" }}>
                <input
                  type="email"
                  value={email}
                  onChange={function(e) { setEmail(e.target.value); }}
                  placeholder="cfo@company.com"
                  style={{ flex: 1, padding: "11px 13px", borderRadius: 8, border: "1px solid #1e2640", background: "#080b14", color: T1, fontSize: 13, fontFamily: MO, outline: "none" }}
                  onFocus={function(e) { e.target.style.borderColor = A; }}
                  onBlur={function(e) { e.target.style.borderColor = "#1e2640"; }}
                />
                <button
                  onClick={function() {
                    if (email.indexOf("@") > 0 && email.indexOf(".") > 0) {
                      setCaptured(true);
                    }
                  }}
                  style={{
                    padding: "11px 22px", borderRadius: 8, border: "none",
                    background: email.indexOf("@") > 0 ? TL : "#131828",
                    color: email.indexOf("@") > 0 ? V : T3,
                    fontSize: 11, fontWeight: 800, letterSpacing: ".06em",
                    textTransform: "uppercase", whiteSpace: "nowrap",
                    cursor: email.indexOf("@") > 0 ? "pointer" : "not-allowed",
                    transition: "all 0.15s",
                  }}
                >
                  RECLAIM {fmt(result.ghostTax, true)} NOW
                </button>
              </div>
              <p style={{ fontSize: 8, color: T3, marginTop: 10 }}>
                {t("peergap.reclaim.privacy")}
              </p>
            </div>
          )}
        </div>

        {/* ── TRUST FOOTER ────────────────────────── */}
        <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 10, border: "1px solid " + BD, background: "rgba(11,14,24,0.35)", display: "flex", justifyContent: "center", gap: 18, flexWrap: "wrap" }}>
          {[
            { icon: "🛡", title: "SOC2 Type II Ready" },
            { icon: "🔐", title: "Zero-Knowledge Audit" },
            { icon: "🇺🇸", title: "US Data Residency" },
            { icon: "⏱", title: "30-Day Auto-Delete" },
          ].map(function(b) {
            return (
              <div key={b.title} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9, color: T2 }}>
                <span style={{ fontSize: 14 }}>{b.icon}</span>
                <span style={{ fontWeight: 600 }}>{b.title}</span>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
