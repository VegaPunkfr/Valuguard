"use client";
import { useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { c, f } from "@/lib/tokens";

/*  GHOST TAX — PEER-GAP ANALYSIS (2026)
    Self-contained. Renders immediately with demo data.
    SVG radar + percentile bars + RECLAIM CTA.
    Locale-aware: USD ($) for EN, EUR (€) for FR/DE. */

// -- US Industry benchmarks [P10, P25, P50, P75, P90] --
const BENCH: Record<string, Record<string, number[]>> = {
  saas_tech:     { spe: [180,280,380,520,720], tools: [0.3,0.5,0.8,1.2,1.8], util: [88,78,65,52,38], shadow: [3,8,15,25,38], ai: [5,15,35,60,120] },
  finance:       { spe: [150,220,310,430,580], tools: [0.2,0.3,0.5,0.8,1.2], util: [92,84,75,62,48], shadow: [1,4,8,15,25], ai: [3,10,22,45,80] },
  healthcare:    { spe: [120,190,280,400,550], tools: [0.2,0.4,0.6,0.9,1.4], util: [90,80,68,55,40], shadow: [2,6,12,22,35], ai: [5,12,28,50,95] },
  retail:        { spe: [100,170,260,380,520], tools: [0.2,0.3,0.5,0.8,1.3], util: [88,76,62,48,35], shadow: [3,8,16,28,42], ai: [4,12,30,55,100] },
  services:      { spe: [130,200,300,420,580], tools: [0.2,0.4,0.6,1.0,1.5], util: [90,82,70,58,42], shadow: [2,6,12,20,32], ai: [4,10,25,48,85] },
  manufacturing: { spe: [80,140,220,340,480],  tools: [0.1,0.2,0.4,0.6,1.0], util: [92,85,76,64,50], shadow: [1,4,9,16,28], ai: [2,8,18,35,65] },
  other:         { spe: [120,200,300,430,600], tools: [0.2,0.4,0.6,0.9,1.4], util: [90,80,68,55,40], shadow: [2,7,14,24,38], ai: [4,12,28,52,90] },
};

const METRIC_DEFS = [
  { id: "spe",    nameKey: "peergap.m.spe",    unitKey: "peergap.unit.mo", lowerBetter: true },
  { id: "tools",  nameKey: "peergap.m.tools",  unit: "",    lowerBetter: true },
  { id: "util",   nameKey: "peergap.m.util",   unit: "%",   lowerBetter: false },
  { id: "shadow", nameKey: "peergap.m.shadow", unit: "%",   lowerBetter: true },
  { id: "ai",     nameKey: "peergap.m.ai",     unit: "%",   lowerBetter: true },
];

const IND_NAME_KEYS: Record<string, string> = {
  saas_tech: "peergap.ind.saas",
  finance: "peergap.ind.finance",
  healthcare: "peergap.ind.healthcare",
  retail: "peergap.ind.retail",
  services: "peergap.ind.services",
  manufacturing: "peergap.ind.manufacturing",
  other: "peergap.ind.other",
};

const IND_OPTION_KEYS: [string, string][] = [
  ["saas_tech", "est.industry.saas"],
  ["finance", "est.industry.finance"],
  ["healthcare", "est.industry.healthcare"],
  ["retail", "est.industry.retail"],
  ["services", "est.industry.services"],
  ["manufacturing", "est.industry.mfg"],
  ["other", "est.industry.other"],
];

// -- Percentile interpolation --
function interpolate(value: number, pcts: number[], lowerBetter: boolean) {
  const marks = [10, 25, 50, 75, 90];
  if (value <= pcts[0]) return lowerBetter ? 5 : 95;
  if (value >= pcts[4]) return lowerBetter ? 95 : 5;
  for (let i = 0; i < 4; i++) {
    if (value >= pcts[i] && value <= pcts[i + 1]) {
      const ratio = (value - pcts[i]) / (pcts[i + 1] - pcts[i]);
      const raw = marks[i] + ratio * (marks[i + 1] - marks[i]);
      return lowerBetter ? raw : 100 - raw;
    }
  }
  return 50;
}

type Verdict = "excellent" | "good" | "warning" | "critical";

function getVerdict(pct: number): Verdict {
  if (pct <= 25) return "excellent";
  if (pct <= 50) return "good";
  if (pct <= 75) return "warning";
  return "critical";
}

const VERDICT_COLOR: Record<Verdict, string> = { excellent: c.green, good: c.green, warning: c.amber, critical: c.red };
const VERDICT_BG: Record<Verdict, string> = { excellent: c.greenBg, good: c.greenBg, warning: c.amberBg, critical: c.redBg };

interface MetricResult {
  id: string;
  nameKey: string;
  unit: string;
  unitKey?: string;
  lowerBetter: boolean;
  value: number;
  percentile: number;
  median: number;
  verdict: Verdict;
}

// -- Engine --
function analyze(input: any) {
  const bm = BENCH[input.industry] || BENCH.other;
  const speVal = input.headcount > 0 ? input.monthlySpend / input.headcount : 0;
  const toolsVal = input.headcount > 0 ? input.saasTools / input.headcount : 0;

  const rawValues: Record<string, number> = {
    spe: speVal,
    tools: toolsVal,
    util: input.utilization,
    shadow: input.shadowRate,
    ai: input.aiGrowth,
  };

  const results: MetricResult[] = METRIC_DEFS.map((def) => {
    const val = rawValues[def.id];
    const pcts = bm[def.id];
    const pct = Math.round(interpolate(val, pcts, def.lowerBetter));
    const verd = getVerdict(pct);
    return {
      id: def.id,
      nameKey: def.nameKey,
      unit: ("unit" in def) ? (def as any).unit : "",
      unitKey: ("unitKey" in def && def.unitKey) ? def.unitKey as string : undefined,
      lowerBetter: def.lowerBetter,
      value: Math.round(val * 100) / 100,
      percentile: pct,
      median: pcts[2],
      verdict: verd,
    };
  });

  const overallPct = Math.round(results.reduce((s, m) => s + m.percentile, 0) / results.length);
  const ghostTax = Math.round(input.annualLeak * 0.60);

  return {
    overall: overallPct,
    metrics: results,
    peerNameKey: IND_NAME_KEYS[input.industry] || "peergap.ind.other",
    ghostTax: ghostTax,
  };
}

// -- SVG Radar --
function RadarChart({ metrics, t }: { metrics: MetricResult[]; t: (k: string) => string }) {
  const CX = 115, CY = 115, R = 88;
  const N = metrics.length;
  const STEP = 360 / N;

  function toXY(angleDeg: number, radius: number): [number, number] {
    const rad = (angleDeg - 90) * (Math.PI / 180);
    return [CX + radius * Math.cos(rad), CY + radius * Math.sin(rad)];
  }

  function makePolygon(radiusFn: (m: MetricResult, i: number) => number) {
    return metrics.map((m, i) => {
      const pt = toXY(i * STEP, radiusFn(m, i));
      return pt[0] + "," + pt[1];
    }).join(" ");
  }

  const rings = [0.25, 0.50, 0.75, 1.0].map((scale) => (
    <polygon key={scale} points={makePolygon(() => R * scale)} fill="none" stroke={c.border} strokeWidth="0.5" />
  ));

  const axes = metrics.map((_, i) => {
    const end = toXY(i * STEP, R);
    return <line key={"ax" + i} x1={CX} y1={CY} x2={end[0]} y2={end[1]} stroke={c.border} strokeWidth="0.5" />;
  });

  const medianPts = makePolygon(() => R * 0.5);
  const userPts = makePolygon((m) => R * Math.max(0.06, 1 - m.percentile / 100));

  const dots = metrics.map((m, i) => {
    const normalized = 1 - m.percentile / 100;
    const pt = toXY(i * STEP, R * Math.max(0.06, normalized));
    return <circle key={"dot" + i} cx={pt[0]} cy={pt[1]} r="4" fill={VERDICT_COLOR[m.verdict]} stroke={c.bg} strokeWidth="1.5" />;
  });

  const labels = metrics.map((m, i) => {
    const pt = toXY(i * STEP, R + 16);
    const shortName = t(m.nameKey).split(" ").slice(0, 2).join(" ");
    return <text key={"lbl" + i} x={pt[0]} y={pt[1]} textAnchor="middle" dominantBaseline="middle" fill={c.text3} fontSize="7" fontFamily={f.mono}>{shortName}</text>;
  });

  return (
    <svg viewBox="0 0 230 230" style={{ width: "100%", maxWidth: 240, display: "block", margin: "0 auto" }}>
      {rings}
      {axes}
      <polygon points={medianPts} fill="none" stroke={c.text4} strokeWidth="1" strokeDasharray="4,4" />
      <polygon points={userPts} fill={c.accentBg} stroke={c.accent} strokeWidth="1.5" strokeLinejoin="round" />
      {dots}
      {labels}
    </svg>
  );
}

// -- Percentile bar --
function MetricBar({ metric: m, t, formatCurrency: fc }: { metric: MetricResult; t: (k: string) => string; formatCurrency: (n: number, short?: boolean) => string }) {
  const col = VERDICT_COLOR[m.verdict];
  const bg = VERDICT_BG[m.verdict];
  const barW = Math.max(3, Math.min(97, m.percentile));

  const unitStr = m.unitKey ? t(m.unitKey) : m.unit;

  const displayVal = m.id === "spe"
    ? fc(m.value) + unitStr
    : (m.id === "tools" ? m.value.toFixed(1) : Math.round(m.value)) + unitStr;

  const medianVal = m.id === "spe"
    ? fc(m.median) + unitStr
    : m.median + unitStr;

  return (
    <div style={{ padding: "9px 11px", borderRadius: 7, background: bg, border: "1px solid " + col + "14" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: c.text1 }}>{t(m.nameKey)}</span>
        <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
          <span style={{ fontSize: 8, color: c.text3 }}>
            {t("peergap.median")}: <span className="gt-mono" style={{ color: c.text2 }}>{medianVal}</span>
          </span>
          <span className="gt-mono" style={{ fontSize: 12, fontWeight: 700, color: col }}>
            {displayVal}
          </span>
        </div>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: "#F1F5F9", position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", left: 0, top: 0, height: "100%",
          width: barW + "%", borderRadius: 2,
          background: `linear-gradient(90deg,${c.green},${col})`,
          transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)",
        }} />
        <div style={{ position: "absolute", left: "50%", top: -2, width: 1, height: 8, background: c.text4 }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
        <span className="gt-mono" style={{ fontSize: 7, color: c.text3 }}>{t("peergap.top10")}</span>
        <span className="gt-mono" style={{ fontSize: 7, color: col, fontWeight: 600 }}>P{m.percentile}</span>
        <span className="gt-mono" style={{ fontSize: 7, color: c.text3 }}>{t("peergap.btm10")}</span>
      </div>
    </div>
  );
}

// ====================================================
// MAIN COMPONENT
// ====================================================
export default function PeerGapAnalysis() {
  const { t, formatCurrency } = useI18n();
  const [input, setInput] = useState({
    industry: "saas_tech",
    headcount: 150,
    monthlySpend: 58000,
    saasTools: 62,
    utilization: 54,
    shadowRate: 19,
    aiGrowth: 78,
    annualLeak: 172000,
  });

  const [email, setEmail] = useState("");
  const [captured, setCaptured] = useState(false);

  function upd(key: string, val: string | number) {
    setInput((prev) => ({ ...prev, [key]: val }));
  }

  const result = useMemo(() => analyze(input), [input]);

  const overallCol = result.overall > 75 ? c.red : result.overall > 50 ? c.amber : result.overall > 25 ? c.green : c.green;

  const sliders = [
    { key: "headcount",    label: t("peergap.headcount"),     min: 10,   max: 500,    step: 10,  format: (v: number) => String(v) },
    { key: "monthlySpend", label: t("peergap.monthlyspend"),  min: 5000, max: 200000, step: 1000, format: (v: number) => formatCurrency(v, true) },
    { key: "saasTools",    label: t("peergap.saastools"),     min: 5,    max: 200,    step: 5,   format: (v: number) => String(v) },
    { key: "utilization",  label: t("peergap.licenseutil"),   min: 20,   max: 95,     step: 5,   format: (v: number) => v + "%" },
    { key: "shadowRate",   label: t("peergap.shadowit"),      min: 0,    max: 50,     step: 2,   format: (v: number) => v + "%" },
    { key: "aiGrowth",     label: t("peergap.aigrowth"),      min: 0,    max: 200,    step: 5,   format: (v: number) => v + "%" },
  ];

  const indOptions = IND_OPTION_KEYS.map((opt) => [opt[0], t(opt[1])]);

  return (
    <div style={{ minHeight: "100vh", fontFamily: f.sans, color: c.text1, padding: "24px 14px 48px" }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>

        {/* -- RETOUR -- */}
        <div style={{ marginBottom: 14 }}>
          <a href="/" className="gt-btn gt-btn-ghost" style={{ fontSize: 11, padding: "6px 12px" }}>{t("back")}</a>
        </div>

        {/* -- HEADER -- */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="gt-mono" style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: c.accent }}>GHOST TAX</span>
            <span className="gt-badge gt-badge--muted">{t("peergap.badge")}</span>
          </div>
          <span className="gt-badge gt-badge--muted">
            {t("peergap.stealth")}
          </span>
        </div>

        {/* -- CONTROLS -- */}
        <div className="gt-panel" style={{ padding: "12px 16px", marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ minWidth: 120 }}>
              <label className="gt-label" style={{ marginBottom: 3 }}>{t("peergap.industry")}</label>
              <select
                value={input.industry}
                onChange={(e) => { upd("industry", e.target.value); }}
                className="gt-input gt-input-mono"
                style={{ fontSize: 11, cursor: "pointer" }}
              >
                {indOptions.map((opt) => <option key={opt[0]} value={opt[0]}>{opt[1]}</option>)}
              </select>
            </div>
            {sliders.map((s) => (
              <div key={s.key} style={{ flex: 1, minWidth: 90 }}>
                <label className="gt-label" style={{ marginBottom: 3 }}>{s.label}</label>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="range" min={s.min} max={s.max} step={s.step}
                    value={(input as any)[s.key]}
                    onChange={(e) => { upd(s.key, Number(e.target.value)); }}
                    style={{ flex: 1, accentColor: c.accent }}
                  />
                  <span className="gt-mono" style={{ fontSize: 11, fontWeight: 700, color: c.accentHi, minWidth: 38, textAlign: "right" }}>
                    {s.format((input as any)[s.key])}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* -- HEADLINE -- */}
        <div className="gt-panel" style={{ padding: 18, marginBottom: 14, textAlign: "center" }}>
          <p className="gt-section-label" style={{ color: overallCol, marginBottom: 5 }}>
            {t("peergap.headline")} — {(input.industry || "").replace(/_/g, " ").toUpperCase()}
          </p>
          <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.5, maxWidth: 480, margin: "0 auto 12px" }}>
            {t("peergap.efficiency")}{" "}
            <strong style={{ color: overallCol, fontWeight: 700 }}>
              {t("peergap.lessthan")} {result.overall}%
            </strong>{" "}
            {t("peergap.ofcomp")} {t(result.peerNameKey)}.
          </p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "7px 16px", borderRadius: 8, background: "#F8FAFC", border: "1px solid " + overallCol + "25" }}>
            <span className="gt-label">{t("peergap.overall")}</span>
            <span className="gt-mono" style={{ fontSize: 26, fontWeight: 800, color: overallCol }}>P{result.overall}</span>
          </div>
        </div>

        {/* -- RADAR + METRIC BARS -- */}
        <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 12, marginBottom: 14 }}>
          {/* Radar */}
          <div className="gt-panel" style={{ padding: 14, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <p className="gt-label" style={{ marginBottom: 6 }}>{t("peergap.radar")}</p>
            <RadarChart metrics={result.metrics} t={t} />
            <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 8, color: c.text3 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: c.accentBg, border: "1px solid " + c.accent }} />
                {t("peergap.you")}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 0, borderTop: "1px dashed " + c.text4 }} />
                {t("peergap.median")}
              </span>
            </div>
          </div>

          {/* Bars */}
          <div className="gt-panel" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 7 }}>
            <p className="gt-label">{t("peergap.metricbd")}</p>
            {result.metrics.map((m) => (
              <MetricBar key={m.id} metric={m} t={t} formatCurrency={formatCurrency} />
            ))}
          </div>
        </div>

        {/* -- GHOST TAX RECOVERY CTA -- */}
        <div className="gt-panel" style={{
          padding: 24, textAlign: "center",
          borderColor: result.overall > 50 ? c.redBd : c.accentBd,
        }}>
          {captured ? (
            <div>
              <p style={{ fontSize: 17, fontWeight: 700, color: c.green, marginBottom: 6 }}>
                {"\u2713"} {t("peergap.registered")}
              </p>
              <p style={{ fontSize: 12, color: c.text2 }}>
                {t("peergap.registered.sub")}
              </p>
            </div>
          ) : (
            <div>
              <p className="gt-section-label" style={{ color: c.red, marginBottom: 5 }}>
                {t("peergap.reclaim")}
              </p>
              <p className="gt-mono" style={{ fontSize: 36, fontWeight: 800, color: c.green, lineHeight: 1, letterSpacing: "-.02em", marginBottom: 4 }}>
                {formatCurrency(result.ghostTax)}
                <span style={{ fontSize: 14, color: c.text3, fontWeight: 400 }}>{t("peergap.peryr")}</span>
              </p>
              <p style={{ fontSize: 10, color: c.text3, marginBottom: 18 }}>
                {t("peergap.reclaim.sub")}
              </p>
              <div style={{ display: "flex", gap: 8, maxWidth: 420, margin: "0 auto" }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); }}
                  placeholder="cfo@company.com"
                  className="gt-input gt-input-mono"
                  style={{ flex: 1, fontSize: 13 }}
                />
                <button
                  onClick={() => {
                    if (email.indexOf("@") > 0 && email.indexOf(".") > 0) {
                      setCaptured(true);
                    }
                  }}
                  className={email.indexOf("@") > 0 ? "gt-btn gt-btn-green" : "gt-btn"}
                  style={{
                    whiteSpace: "nowrap",
                    cursor: email.indexOf("@") > 0 ? "pointer" : "not-allowed",
                  }}
                >
                  {t("peergap.reclaim.now")} {formatCurrency(result.ghostTax, true)} {t("peergap.reclaim.suffix")}
                </button>
              </div>
              <p style={{ fontSize: 8, color: c.text3, marginTop: 10 }}>
                {t("peergap.reclaim.privacy")}
              </p>
            </div>
          )}
        </div>

        {/* -- TRUST FOOTER -- */}
        <div className="gt-card" style={{ marginTop: 16, padding: "12px 14px", display: "flex", justifyContent: "center", gap: 18, flexWrap: "wrap" }}>
          {[
            { icon: "\u{1F6E1}", titleKey: "trustfooter.soc2" },
            { icon: "\u{1F510}", titleKey: "trustfooter.zk" },
            { icon: "\u{1F1FA}\u{1F1F8}", titleKey: "trustfooter.us" },
            { icon: "\u23F1", titleKey: "trustfooter.purge" },
          ].map((b) => (
            <div key={b.titleKey} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9, color: c.text2 }}>
              <span style={{ fontSize: 14 }}>{b.icon}</span>
              <span style={{ fontWeight: 600 }}>{t(b.titleKey)}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
