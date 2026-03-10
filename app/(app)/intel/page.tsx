"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { trackEvent, trackCheckoutStarted, trackReturnVisit, setSignalContext, EVENTS } from "@/lib/events";
import { DecisionPackTeaser } from "@/components/ui/decision-pack-teaser";

/**
 * GHOST TAX — DECISION INSTRUMENT
 *
 * Not a dashboard. Not a report. A financial decision console.
 *
 * Doctrine reveal order (non-negotiable):
 *   Exposure → Corrective Window → Dominant Cause → Corrective Path
 *
 * Section order:
 *   00.  Executive Snapshot (earned summary — streams last, renders at top)
 *   01.  Impact Shock (annual/quarterly/monthly/daily)
 *   02.  Exposure + Velocity + Cost of Delay
 *   03.  Proof Engine + Signal Detail
 *   03c. Market Memory (industry baseline, vendor refs, exposure clusters)
 *   04.  Benchmark Position
 *   04b. Cost Drift Pressure (vendor/category drift, window compression)
 *   05.  Causal Lever Map (dominant cause, propagation, correction order)
 *   06.  Action Scenarios
 *   07.  Decision Simulator
 *   08.  Execution Friction
 *   08b. Negotiation Leverage (readiness, leverage points, playbooks)
 *   09.  Decision Circulation
 *   10.  Confidence & Defensibility
 *   11.  Corrective Protocol Preview + CTA
 */

// ── Design tokens ─────────────────────────────────────

const C = {
  bg:      "#060912",
  surface: "#0a0d19",
  panel:   "#0e1221",
  inset:   "#121828",
  raised:  "#171e30",
  border:  "rgba(36,48,78,0.28)",
  borderS: "rgba(36,48,78,0.40)",
  text1:   "#e4e9f4",
  text2:   "#8d9bb5",
  text3:   "#55637d",
  text4:   "#3a4560",
  green:   "#34d399",
  amber:   "#f59e0b",
  red:     "#ef4444",
  blue:    "#3b82f6",
  blueHi:  "#60a5fa",
  cyan:    "#22d3ee",
} as const;

const MO = "var(--font-mono)";
const SA = "var(--font-sans)";

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 10_000) return Math.round(n / 1000) + "k";
  return Math.round(n).toLocaleString("fr-FR");
}

function signalColor(v: number, threshHigh = 60, threshMed = 35): string {
  return v >= threshHigh ? C.green : v >= threshMed ? C.amber : C.red;
}

function confLabel(v: number): string {
  return v >= 60 ? "strong" : v >= 35 ? "moderate" : "directional";
}

// ── Phase data types ─────────────────────────────────

interface PhaseMessage { phase: string; status: string; data?: any; }

// ── Main Component ───────────────────────────────────

export default function IntelPage() {
  const { t, locale } = useI18n();

  const [domain, setDomain] = useState("");
  const [email, setEmail] = useState("");
  const [headcount, setHeadcount] = useState("");
  const [monthlySpend, setMonthlySpend] = useState("");
  const [industry, setIndustry] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const d = params.get("domain");
    if (d) setDomain(d);
    trackReturnVisit();
  }, []);

  const [running, setRunning] = useState(false);
  const [phases, setPhases] = useState<Record<string, any>>({});
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"conservative" | "base" | "aggressive">("base");
  const [activeMemo, setActiveMemo] = useState<"cfo" | "cio" | "procurement" | "board" | "consensus">("cfo");
  const [memoInteracted, setMemoInteracted] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [activeLevers, setActiveLevers] = useState<Set<string>>(new Set());
  const [causalExpanded, setCausalExpanded] = useState(false);
  const [unlocked, _setUnlocked] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleStream = useCallback(async (response: Response) => {
    const reader = response.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line) as PhaseMessage;
          if (parsed.phase && parsed.data) {
            setPhases((prev) => ({ ...prev, [parsed.phase]: parsed.data }));
            setCurrentPhase(parsed.phase);
            if (parsed.phase === "complete") {
              trackEvent(EVENTS.INTEL_DETECTION_COMPLETED, { confidence: parsed.data?.overallConfidence });
              // Auto-capture lead for drip sequence if email provided
              if (email.trim() && email.includes("@")) {
                fetch("/api/leads/capture", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    email: email.trim(),
                    domain: domain.trim(),
                    company: parsed.data?.companyName || domain.trim(),
                    headcount: headcount ? parseInt(headcount, 10) : undefined,
                    industry: industry || undefined,
                    source: "intel-scan",
                  }),
                }).catch(() => { /* non-blocking */ });
              }
            }
          }
          if (parsed.phase === "error") {
            setError(parsed.data?.error || "Analysis failed.");
          }
        } catch { /* skip malformed lines */ }
      }
    }
  }, []);

  const runAnalysis = useCallback(async () => {
    if (!domain.trim() || running) return;
    setRunning(true);
    setPhases({});
    setCurrentPhase("enrichment");
    setError(null);
    setActiveLevers(new Set());
    setCausalExpanded(false);
    trackEvent(EVENTS.INTEL_DETECTION_STARTED, { domain: domain.trim() });
    setSignalContext(domain.trim(), email.trim() || undefined);
    try {
      const res = await fetch("/api/intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: domain.trim(),
          headcount: headcount ? parseInt(headcount, 10) : undefined,
          monthlySpendEur: monthlySpend ? parseInt(monthlySpend, 10) : undefined,
          industry: industry || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Server error (${res.status})`);
        setRunning(false);
        return;
      }
      await handleStream(res);
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setRunning(false);
    }
  }, [domain, headcount, monthlySpend, industry, running, handleStream]);

  useEffect(() => {
    if (currentPhase && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [currentPhase]);

  const handleCheckout = useCallback(async () => {
    setCheckoutLoading(true);
    trackCheckoutStarted({ domain });
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          domain,
          email: email.trim() || undefined,
          companyName: phases.context?.name || undefined,
          headcount: phases.context?.headcount || (headcount ? parseInt(headcount, 10) : undefined),
          monthlySpendEur: phases.context?.monthlySpendEur || (monthlySpend ? parseInt(monthlySpend, 10) : undefined),
          industry: phases.context?.industry || industry || undefined,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setError("Unable to initiate checkout. Please try again.");
    } catch {
      setError("Network error during checkout.");
    } finally {
      setCheckoutLoading(false);
    }
  }, [domain, locale, phases, headcount, monthlySpend, industry]);

  // ── Decision Simulator ─────────────────────────────

  const simulated = useMemo(() => {
    if (!phases.counterfactual) return null;
    const cf = phases.counterfactual;
    let adjLow = cf.baselineExposure[0];
    let adjHigh = cf.baselineExposure[1];
    let adjPressure = cf.baselinePressure;
    let adjRecovery = cf.baselineRecoveryDays;
    let minConfidence = 100;
    const rationales: string[] = [];
    for (const lever of cf.availableLevers) {
      if (!activeLevers.has(lever.id) || !lever.available) continue;
      adjLow = Math.max(0, adjLow - lever.exposureReductionEur[0]);
      adjHigh = Math.max(0, adjHigh - lever.exposureReductionEur[1]);
      adjPressure = Math.max(5, adjPressure - lever.pressureReduction);
      adjRecovery = Math.max(14, adjRecovery - lever.recoveryAccelerationDays);
      if (lever.confidence < minConfidence) minConfidence = lever.confidence;
      rationales.push(`${lever.label}: reduces exposure by removing ${lever.applicableSignalTypes.join(", ").replace(/_/g, " ")} patterns.`);
    }
    const deltaLow = cf.baselineExposure[0] - adjLow;
    const deltaHigh = cf.baselineExposure[1] - adjHigh;
    const deltaPressure = cf.baselinePressure - adjPressure;
    const deltaRecovery = cf.baselineRecoveryDays - adjRecovery;
    // Adjusted daily leakage
    const adjDailyLow = Math.round(adjLow / 365);
    const adjDailyHigh = Math.round(adjHigh / 365);
    const baseDailyLow = Math.round(cf.baselineExposure[0] / 365);
    const baseDailyHigh = Math.round(cf.baselineExposure[1] / 365);
    // Adjusted 90-day recovery (proportional reduction)
    const baseRecov90 = phases.exposure?.ninetyDayRecoverableEur;
    const reductionRatio = cf.baselineExposure[1] > 0 ? adjHigh / cf.baselineExposure[1] : 1;
    const adjRecov90: [number, number] = baseRecov90
      ? [Math.round(baseRecov90[0] * (1 + (1 - reductionRatio) * 0.3)), Math.round(baseRecov90[1] * (1 + (1 - reductionRatio) * 0.3))]
      : [0, 0];
    return {
      adjustedExposure: [adjLow, adjHigh] as [number, number],
      adjustedPressure: adjPressure,
      adjustedRecoveryDays: adjRecovery,
      simulationConfidence: activeLevers.size > 0 ? Math.min(minConfidence, 70) : 0,
      hasChanges: activeLevers.size > 0,
      deltaExposure: [deltaLow, deltaHigh] as [number, number],
      deltaPressure,
      deltaRecovery,
      rationales,
      adjustedDailyLeakage: [adjDailyLow, adjDailyHigh] as [number, number],
      baselineDailyLeakage: [baseDailyLow, baseDailyHigh] as [number, number],
      adjustedRecov90: adjRecov90,
    };
  }, [phases.counterfactual, activeLevers]);

  // Persist scan data to localStorage for cancel/landing page urgency
  useEffect(() => {
    if (phases.lossVelocity?.dailyLossEur) {
      const avg = Math.round((phases.lossVelocity.dailyLossEur[0] + phases.lossVelocity.dailyLossEur[1]) / 2);
      localStorage.setItem("vg_daily_loss", String(avg));
      localStorage.setItem("vg_scan_domain", domain);
      localStorage.setItem("vg_scan_ts", String(Date.now()));
    }
    if (phases.exposure) {
      localStorage.setItem("vg_exposure_low", String(phases.exposure.lowEur));
      localStorage.setItem("vg_exposure_high", String(phases.exposure.highEur));
    }
  }, [phases.lossVelocity, phases.exposure, domain]);

  const hasResults = Object.keys(phases).length > 0;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: SA, color: C.text1 }}>
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "32px 16px" }}>

        {/* ── Terminal Header ────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: running ? C.green : C.blue, boxShadow: running ? `0 0 8px ${C.green}60` : "none", transition: "all 0.3s" }} />
            <p style={{ fontSize: 10, fontFamily: MO, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: C.blue }}>
              DECISION INSTRUMENT
            </p>
          </div>
          <h1 style={{ fontSize: 21, fontWeight: 800, lineHeight: 1.2, marginBottom: 5, color: C.text1 }}>
            {t("intel.title") !== "intel.title" ? t("intel.title") : "Decision Acceleration System"}
          </h1>
          <p style={{ fontSize: 13, color: C.text3, lineHeight: 1.5, maxWidth: 560 }}>
            {t("intel.subtitle") !== "intel.subtitle"
              ? t("intel.subtitle")
              : "Enter a company domain. The system enriches, detects, classifies, and delivers a structured decision surface."}
          </p>
        </div>

        {/* ── Input Terminal ──────────────────────── */}
        <div className="vg-panel" style={{ padding: 22, marginBottom: 20 }}>
          {running && (
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, overflow: "hidden" }}>
              <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${C.blue}, transparent)`, animation: "vg-scan 2s linear infinite" }} />
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div>
              <FieldLabel>{t("intel.field.domain") !== "intel.field.domain" ? t("intel.field.domain") : "Company Domain *"}</FieldLabel>
              <input
                type="text" value={domain} onChange={(e) => setDomain(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runAnalysis()}
                placeholder="acme.com" disabled={running}
                className="vg-input"
              />
            </div>
            <div>
              <FieldLabel>{t("intel.field.email") !== "intel.field.email" ? t("intel.field.email") : "Work Email"}</FieldLabel>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="cfo@acme.com" disabled={running}
                className="vg-input"
              />
            </div>
            <div>
              <FieldLabel>{t("intel.field.headcount") !== "intel.field.headcount" ? t("intel.field.headcount") : "Headcount"}</FieldLabel>
              <input type="number" value={headcount} onChange={(e) => setHeadcount(e.target.value)} placeholder="120" disabled={running} className="vg-input" />
            </div>
            <div>
              <FieldLabel>{t("intel.field.spend") !== "intel.field.spend" ? t("intel.field.spend") : "Monthly IT Spend (EUR)"}</FieldLabel>
              <input type="number" value={monthlySpend} onChange={(e) => setMonthlySpend(e.target.value)} placeholder="40000" disabled={running} className="vg-input" />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <FieldLabel>{t("intel.field.industry") !== "intel.field.industry" ? t("intel.field.industry") : "Industry"}</FieldLabel>
              <select value={industry} onChange={(e) => setIndustry(e.target.value)} disabled={running}
                className="vg-input" style={{ color: industry ? C.text1 : C.text4 }}>
                <option value="">{t("intel.field.industry.select") !== "intel.field.industry.select" ? t("intel.field.industry.select") : "Select industry..."}</option>
                <option value="Technology / SaaS">{t("intel.field.industry.tech") !== "intel.field.industry.tech" ? t("intel.field.industry.tech") : "Technology / SaaS"}</option>
                <option value="Financial Services">{t("intel.field.industry.finance") !== "intel.field.industry.finance" ? t("intel.field.industry.finance") : "Financial Services"}</option>
                <option value="Healthcare">{t("intel.field.industry.health") !== "intel.field.industry.health" ? t("intel.field.industry.health") : "Healthcare"}</option>
                <option value="Retail & E-commerce">{t("intel.field.industry.retail") !== "intel.field.industry.retail" ? t("intel.field.industry.retail") : "Retail & E-commerce"}</option>
                <option value="Manufacturing">{t("intel.field.industry.manufacturing") !== "intel.field.industry.manufacturing" ? t("intel.field.industry.manufacturing") : "Manufacturing"}</option>
                <option value="Media & Advertising">{t("intel.field.industry.media") !== "intel.field.industry.media" ? t("intel.field.industry.media") : "Media & Advertising"}</option>
                <option value="Professional Services">{t("intel.field.industry.services") !== "intel.field.industry.services" ? t("intel.field.industry.services") : "Professional Services"}</option>
                <option value="Automotive">{t("intel.field.industry.automotive") !== "intel.field.industry.automotive" ? t("intel.field.industry.automotive") : "Automotive"}</option>
                <option value="Pharma & Life Sciences">{t("intel.field.industry.pharma") !== "intel.field.industry.pharma" ? t("intel.field.industry.pharma") : "Pharma & Life Sciences"}</option>
              </select>
            </div>
          </div>
          <button onClick={runAnalysis} disabled={!domain.trim() || running}
            className={`vg-btn-primary ${running ? "vg-btn-computing" : ""}`}>
            {running
              ? (t("intel.btn.running") !== "intel.btn.running" ? t("intel.btn.running") : "ANALYZING...")
              : (t("intel.btn.run") !== "intel.btn.run" ? t("intel.btn.run") : "RUN DETECTION")}
          </button>
        </div>

        {/* ── Error ──────────────────────────────── */}
        {error && (
          <div className="vg-panel vg-panel--signal-red vg-layer-in" style={{ padding: 16, marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: C.red, paddingLeft: 10 }}>{error}</p>
          </div>
        )}

        {/* ── Results ────────────────────────────── */}
        <div ref={resultsRef}>

          {/* Loading state */}
          {running && !hasResults && (
            <div className="vg-panel" style={{ padding: 24, textAlign: "center", marginBottom: 16, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, overflow: "hidden" }}>
                <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${C.blue}, transparent)`, animation: "vg-scan 1.8s linear infinite" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.blue, animation: "vg-exposure-pulse 1.5s ease-in-out infinite" }} />
                <p style={{ fontSize: 11, fontFamily: MO, color: C.blue, letterSpacing: ".1em" }}>ENRICHMENT IN PROGRESS</p>
              </div>
              <p style={{ fontSize: 12, color: C.text4 }}>Collecting public signals, querying vector memory, running heuristic engine.</p>
            </div>
          )}

          {/* ═══════════════════════════════════════
              SECTION 1: EXECUTIVE SNAPSHOT BAR
              ═══════════════════════════════════════ */}

          {phases.executiveSnapshot && (
            <Panel className="vg-panel--signal-red vg-layer-in" depth={0}>
              <LayerLabel num="00" label="EXECUTIVE SNAPSHOT" />
              <p style={{ fontSize: 14, fontWeight: 600, color: C.text1, lineHeight: 1.55, marginBottom: 16, fontFamily: SA }}>
                {phases.executiveSnapshot.diagnosisSummary}
              </p>
              <div className="vg-snapshot" style={{ marginBottom: 14 }}>
                <div className="vg-snapshot-cell">
                  <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 6 }}>EXPOSURE RANGE</p>
                  <p className="vg-countup" style={{ fontFamily: MO, fontSize: 18, fontWeight: 800, color: C.red, lineHeight: 1 }}>
                    {fmt(phases.executiveSnapshot.exposureRangeEur[0])}&ndash;{fmt(phases.executiveSnapshot.exposureRangeEur[1])}
                  </p>
                  <p style={{ fontSize: 8, color: C.text4, marginTop: 3, fontFamily: MO }}>&euro;/yr</p>
                </div>
                <div className="vg-snapshot-cell">
                  <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 6 }}>90-DAY RECOVERABLE</p>
                  <p className="vg-countup vg-delay-1" style={{ fontFamily: MO, fontSize: 18, fontWeight: 800, color: C.green, lineHeight: 1 }}>
                    {fmt(phases.executiveSnapshot.ninetyDayRecoverableEur[0])}&ndash;{fmt(phases.executiveSnapshot.ninetyDayRecoverableEur[1])}
                  </p>
                  <p style={{ fontSize: 8, color: C.text4, marginTop: 3, fontFamily: MO }}>&euro;</p>
                </div>
                <div className="vg-snapshot-cell">
                  <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 6 }}>TIME TO IMPACT</p>
                  <p className="vg-countup vg-delay-2" style={{ fontFamily: MO, fontSize: 18, fontWeight: 800, color: phases.executiveSnapshot.timeToImpactDays <= 30 ? C.red : phases.executiveSnapshot.timeToImpactDays <= 60 ? C.amber : C.blueHi, lineHeight: 1 }}>
                    {phases.executiveSnapshot.timeToImpactDays}d
                  </p>
                </div>
                <div className="vg-snapshot-cell">
                  <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 6 }}>CONFIDENCE</p>
                  <p className="vg-countup vg-delay-3" style={{ fontFamily: MO, fontSize: 14, fontWeight: 700, color: signalColor(phases.executiveSnapshot.pressureScore, 50, 30), lineHeight: 1 }}>
                    {phases.executiveSnapshot.confidenceRange}
                  </p>
                </div>
                <div className="vg-snapshot-cell">
                  <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 6 }}>RECOMMENDED PATH</p>
                  <p className="vg-countup vg-delay-4" style={{ fontFamily: SA, fontSize: 12, fontWeight: 700, color: C.blueHi, lineHeight: 1.3 }}>
                    {phases.executiveSnapshot.recommendedActionPath}
                  </p>
                </div>
                <div className="vg-snapshot-cell">
                  <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 6 }}>PRESSURE</p>
                  <p className="vg-countup vg-delay-5" style={{ fontFamily: MO, fontSize: 18, fontWeight: 800, color: signalColor(100 - phases.executiveSnapshot.pressureScore), lineHeight: 1 }}>
                    {phases.executiveSnapshot.pressureScore}/100
                  </p>
                </div>
              </div>
            </Panel>
          )}

          {/* ═══════════════════════════════════════
              SECTION 2: IMPACT SHOCK
              ═══════════════════════════════════════ */}

          {phases.exposure && phases.lossVelocity && (
            <Panel className="vg-panel--signal-red vg-layer-in" depth={1}
              onVisible={() => trackEvent(EVENTS.INTEL_IMPACT_SHOCK_VIEWED)}>
              <LayerLabel num="01" label="FINANCIAL IMPACT" />
              <p style={{ fontSize: 12, color: C.text3, lineHeight: 1.5, marginBottom: 14 }}>
                Exposure expressed across time horizons. The daily figure is what disappears every day nothing changes.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                {([
                  { label: "ANNUAL", low: phases.exposure.lowEur, high: phases.exposure.highEur, suffix: "/yr" },
                  { label: "QUARTERLY", low: Math.round(phases.exposure.lowEur / 4), high: Math.round(phases.exposure.highEur / 4), suffix: "/qtr" },
                  { label: "MONTHLY", low: phases.lossVelocity.monthlyLossEur[0], high: phases.lossVelocity.monthlyLossEur[1], suffix: "/mo" },
                  { label: "DAILY", low: phases.lossVelocity.dailyLossEur[0], high: phases.lossVelocity.dailyLossEur[1], suffix: "/day" },
                ] as const).map((tier, i) => (
                  <div key={tier.label} className={`vg-countup vg-delay-${i + 1}`}
                    style={{
                      padding: "16px 10px", borderRadius: "var(--r-lg)", textAlign: "center",
                      background: i === 3 ? "rgba(239,68,68,0.06)" : "rgba(239,68,68,0.02)",
                      border: `1px solid rgba(239,68,68,${i === 3 ? "0.18" : "0.08"})`,
                    }}>
                    <p style={{ fontSize: 7, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 6 }}>{tier.label}</p>
                    <p style={{ fontFamily: MO, fontSize: i === 3 ? 22 : i === 0 ? 18 : 16, fontWeight: i === 3 ? 900 : 800, color: i === 3 ? C.red : C.text1, lineHeight: 1, letterSpacing: "-.02em" }}>
                      {fmt(tier.low)}&ndash;{fmt(tier.high)}
                    </p>
                    <p style={{ fontSize: 8, color: i === 3 ? C.red : C.text4, marginTop: 4, fontFamily: MO }}>&euro;{tier.suffix}</p>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {/* ═══ SECTION 3: EXPOSURE + VELOCITY + COST OF DELAY ═══ */}

          {phases.diagnosis && phases.exposure && (
            <Panel className="vg-panel--signal-red vg-layer-in" depth={2}>
              <LayerLabel num="02" label="EXPOSURE ANALYSIS" />
              <p style={{ fontSize: 12, color: C.text2, lineHeight: 1.5, marginBottom: 14 }}>{phases.diagnosis.expanded}</p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div className="vg-exposure-hot" style={{ padding: 18, borderRadius: "var(--r-lg)", background: "rgba(239,68,68,0.03)", border: "1px solid rgba(239,68,68,0.12)", textAlign: "center" }}>
                  <p style={{ fontSize: 9, fontFamily: MO, color: C.text3, letterSpacing: ".08em", marginBottom: 6 }}>ANNUAL EXPOSURE</p>
                  <p className="vg-countup" style={{ fontFamily: MO, fontSize: 32, fontWeight: 900, color: C.red, lineHeight: 1, letterSpacing: "-.02em" }}>
                    {fmt(phases.exposure.lowEur)}&ndash;{fmt(phases.exposure.highEur)}
                  </p>
                  <p style={{ fontSize: 10, color: C.text4, marginTop: 4, fontFamily: MO }}>&euro;/yr</p>
                </div>
                <div style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: 8 }}>
                  <Metric label="CONFIDENCE" value={`${phases.exposure.confidence}/100`} color={signalColor(phases.exposure.confidence)} />
                  <Metric label="TIME TO IMPACT" value={`${phases.exposure.timeToImpactDays}d`} color={phases.exposure.timeToImpactDays <= 30 ? C.red : phases.exposure.timeToImpactDays <= 60 ? C.amber : C.blueHi} />
                </div>
              </div>

              {phases.exposure.ninetyDayRecoverableEur && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: "var(--r-md)", background: "rgba(52,211,153,0.03)", border: "1px solid rgba(52,211,153,0.10)", marginBottom: 12 }}>
                  <span style={{ fontSize: 11, color: C.text2 }}>90-day recoverable</span>
                  <span className="vg-countup vg-delay-2" style={{ fontFamily: MO, fontSize: 14, fontWeight: 700, color: C.green }}>
                    {fmt(phases.exposure.ninetyDayRecoverableEur[0])}&ndash;{fmt(phases.exposure.ninetyDayRecoverableEur[1])} &euro;
                  </span>
                </div>
              )}

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <ConfBadge quality={phases.exposure.benchmarkQuality} />
                <span style={{ fontSize: 11, color: C.text3 }}>{phases.exposure.basis}</span>
              </div>
            </Panel>
          )}

          {/* ═══ LOSS VELOCITY ═══ */}

          {phases.lossVelocity && (
            <Panel className="vg-panel--signal-red vg-layer-in vg-delay-1" depth={2}>
              <LayerLabel num="02b" label="LOSS VELOCITY" />
              {phases.lossVelocity.softened && (
                <p style={{ fontSize: 10, color: C.amber, marginBottom: 10, fontFamily: MO, letterSpacing: ".02em" }}>
                  Confidence below 50 — values are directional estimates.
                </p>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
                {(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const).map((period, i) => {
                  const key = { DAILY: "dailyLossEur", WEEKLY: "weeklyLossEur", MONTHLY: "monthlyLossEur", YEARLY: "yearlyLossEur" }[period] as string;
                  const range = phases.lossVelocity[key];
                  return (
                    <div key={period} className={`vg-metric vg-countup vg-delay-${i + 1}`} style={{ background: "rgba(239,68,68,0.02)", borderColor: "rgba(239,68,68,0.08)" }}>
                      <p style={{ fontSize: 7, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 4 }}>{period}</p>
                      <p style={{ fontFamily: MO, fontSize: 14, fontWeight: 700, color: phases.lossVelocity.softened ? C.amber : C.red, lineHeight: 1.2 }}>
                        {phases.lossVelocity.softened ? "~" : ""}{fmt(range[0])}&ndash;{fmt(range[1])}
                      </p>
                      <p style={{ fontSize: 7, color: C.text4, marginTop: 2, fontFamily: MO }}>&euro;</p>
                    </div>
                  );
                })}
              </div>
              <p style={{ fontSize: 9, fontFamily: MO, color: C.text4, marginTop: 8, textAlign: "center" }}>
                Confidence: {phases.lossVelocity.confidence}/100
              </p>
            </Panel>
          )}

          {/* ═══ COST OF DELAY ═══ */}

          {phases.costOfDelay && (
            <Panel className="vg-panel--signal-red vg-layer-in" depth={2}
              onVisible={() => trackEvent(EVENTS.INTEL_COST_OF_DELAY_VIEWED)}>
              <LayerLabel num="02c" label="COST OF DELAY" />
              <p style={{ fontSize: 12, color: C.text3, lineHeight: 1.5, marginBottom: 14 }}>
                If nothing changes, this is what disappears while the decision waits.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                <div style={{ padding: "14px 12px", borderRadius: "var(--r-lg)", background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)", textAlign: "center" }}>
                  <p style={{ fontSize: 7, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 6 }}>EVERY DAY</p>
                  <p style={{ fontFamily: MO, fontSize: 22, fontWeight: 900, color: C.red, lineHeight: 1 }}>
                    {fmt(phases.costOfDelay.dailyCostOfDelay[0])}&ndash;{fmt(phases.costOfDelay.dailyCostOfDelay[1])}
                  </p>
                  <p style={{ fontSize: 8, color: C.red, marginTop: 4, fontFamily: MO }}>&euro;/day lost</p>
                </div>
                <div style={{ padding: "14px 12px", borderRadius: "var(--r-lg)", background: "rgba(245,158,11,0.03)", border: "1px solid rgba(245,158,11,0.10)", textAlign: "center" }}>
                  <p style={{ fontSize: 7, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 6 }}>EVERY MONTH</p>
                  <p style={{ fontFamily: MO, fontSize: 18, fontWeight: 800, color: C.amber, lineHeight: 1 }}>
                    {fmt(phases.costOfDelay.monthlyCostOfDelay[0])}&ndash;{fmt(phases.costOfDelay.monthlyCostOfDelay[1])}
                  </p>
                  <p style={{ fontSize: 8, color: C.text4, marginTop: 4, fontFamily: MO }}>&euro;/mo lost</p>
                </div>
                <div style={{ padding: "14px 12px", borderRadius: "var(--r-lg)", background: "rgba(245,158,11,0.03)", border: "1px solid rgba(245,158,11,0.10)", textAlign: "center" }}>
                  <p style={{ fontSize: 7, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 6 }}>90-DAY PROJECTION</p>
                  <p style={{ fontFamily: MO, fontSize: 18, fontWeight: 800, color: C.amber, lineHeight: 1 }}>
                    {fmt(phases.costOfDelay.projectedDelayLoss90[0])}&ndash;{fmt(phases.costOfDelay.projectedDelayLoss90[1])}
                  </p>
                  <p style={{ fontSize: 8, color: C.text4, marginTop: 4, fontFamily: MO }}>&euro; projected loss</p>
                </div>
              </div>
              {phases.costOfDelay.readinessMultiplier > 1.1 && (
                <p style={{ fontSize: 10, fontFamily: MO, color: C.amber, letterSpacing: ".02em" }}>
                  Low correction readiness increases projected loss by {Math.round((phases.costOfDelay.readinessMultiplier - 1) * 100)}%.
                </p>
              )}
            </Panel>
          )}

          {/* ═══ SECTION 4: PROOF ENGINE ═══ */}

          {phases.proofEngine && (
            <Panel className="vg-layer-in" depth={3}
              onVisible={() => trackEvent(EVENTS.INTEL_PROOF_LAYER_VIEWED)}>
              <LayerLabel num="03" label="PROOF ENGINE" />
              <p style={{ fontSize: 12, color: C.text3, lineHeight: 1.5, marginBottom: 14 }}>
                {phases.proofEngine.summary}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                {[
                  { label: "Evidence Density", value: phases.proofEngine.signalDensity, desc: "Detected patterns vs known exposure categories" },
                  { label: "Pattern Coverage", value: phases.proofEngine.patternCoverage, desc: "Breadth across spend, governance, procurement, duplication" },
                  { label: "Benchmark Reliability", value: phases.proofEngine.benchmarkConfidence, desc: "Peer comparison strength" },
                  { label: "Detection Scope", value: phases.proofEngine.detectionScope, desc: "How much surface area was scannable" },
                  { label: "Model Support", value: phases.proofEngine.modelSupportLevel, desc: "Confidence model has enough signal for recommendations" },
                ].map((metric) => (
                  <div key={metric.label} style={{ display: "grid", gridTemplateColumns: "130px 1fr 36px", gap: 8, alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: 10, color: C.text2, fontWeight: 500, display: "block" }}>{metric.label}</span>
                      <span style={{ fontSize: 8, color: C.text4, fontFamily: MO }}>{metric.desc}</span>
                    </div>
                    <div className="vg-conf-track">
                      <div className="vg-conf-fill vg-bar-grow" style={{ width: `${Math.min(95, metric.value)}%`, background: signalColor(metric.value) }} />
                    </div>
                    <span style={{ fontSize: 11, fontFamily: MO, fontWeight: 700, color: signalColor(metric.value), textAlign: "right" }}>{metric.value}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="vg-badge" style={{
                  background: (phases.proofEngine.evidenceStrength === "strong" ? C.green : phases.proofEngine.evidenceStrength === "moderate" ? C.amber : C.red) + "10",
                  border: `1px solid ${(phases.proofEngine.evidenceStrength === "strong" ? C.green : phases.proofEngine.evidenceStrength === "moderate" ? C.amber : C.red)}20`,
                  color: phases.proofEngine.evidenceStrength === "strong" ? C.green : phases.proofEngine.evidenceStrength === "moderate" ? C.amber : C.red,
                }}>
                  {phases.proofEngine.evidenceStrength.toUpperCase()} EVIDENCE
                </span>
                <span style={{ fontSize: 10, color: C.text4 }}>Overall evidence classification for this analysis</span>
              </div>
            </Panel>
          )}

          {/* ═══ SIGNAL DETAIL (PROOF ARCHITECTURE) ═══ */}

          {phases.proof && (
            <Panel className="vg-layer-in vg-delay-2" depth={3}>
              <LayerLabel num="03b" label="SIGNAL DETAIL" />
              <p style={{ fontSize: 11, color: C.text4, marginBottom: 12 }}>{phases.proof.methodologySummary}</p>
              {phases.proof.observedSignals?.length > 0 && <SignalTier tier="OBSERVED" color={C.green} signals={phases.proof.observedSignals} />}
              {phases.proof.inferredSignals?.length > 0 && <SignalTier tier="INFERRED" color={C.blueHi} signals={phases.proof.inferredSignals} />}
              {phases.proof.estimatedSignals?.length > 0 && <SignalTier tier="ESTIMATED" color={C.amber} signals={phases.proof.estimatedSignals} />}

              {phases.proof.confidenceDrivers?.length > 0 && (
                <div className="vg-inset" style={{ marginTop: 12, padding: "10px 14px" }}>
                  <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".06em", marginBottom: 6 }}>CONFIDENCE DRIVERS</p>
                  {phases.proof.confidenceDrivers.map((d: string, i: number) => (
                    <p key={i} style={{ fontSize: 11, color: C.text2, lineHeight: 1.5, marginBottom: 2 }}>{d}</p>
                  ))}
                </div>
              )}
              {phases.proof.boundaries?.length > 0 && (
                <div style={{ marginTop: 8, padding: "10px 14px", borderRadius: "var(--r-md)", background: "rgba(239,68,68,0.02)", border: "1px solid rgba(239,68,68,0.06)" }}>
                  <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".06em", marginBottom: 6 }}>BOUNDARIES</p>
                  {phases.proof.boundaries.map((b: string, i: number) => (
                    <p key={i} style={{ fontSize: 10, color: C.text4, lineHeight: 1.5, marginBottom: 2 }}>{b}</p>
                  ))}
                </div>
              )}
            </Panel>
          )}

          {/* ═══ SECTION 03c: MARKET MEMORY ═══ */}

          {phases.marketMemory && phases.marketMemory.memoryDepth !== "none" && (
            <Panel className="vg-layer-in vg-delay-3" depth={3}
              onVisible={() => trackEvent(EVENTS.INTEL_MARKET_MEMORY_VIEWED)}>
              <LayerLabel num="03c" label="MARKET MEMORY" />
              <p style={{ fontSize: 12, color: C.text3, lineHeight: 1.5, marginBottom: 14 }}>
                {phases.marketMemory.supportSummary}
              </p>

              {/* Baseline */}
              {phases.marketMemory.baseline && (
                <div className="vg-inset" style={{ padding: "12px 14px", marginBottom: 12 }}>
                  <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 6 }}>INDUSTRY BASELINE</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    <div>
                      <p style={{ fontSize: 8, color: C.text4, fontFamily: MO, marginBottom: 2 }}>SPEND/EMPLOYEE</p>
                      <p style={{ fontFamily: MO, fontSize: 13, fontWeight: 700, color: C.text1 }}>
                        {fmt(phases.marketMemory.baseline.medianSpendPerEmployee[0])}&ndash;{fmt(phases.marketMemory.baseline.medianSpendPerEmployee[1])} &euro;
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: 8, color: C.text4, fontFamily: MO, marginBottom: 2 }}>EXPOSURE RATE</p>
                      <p style={{ fontFamily: MO, fontSize: 13, fontWeight: 700, color: C.amber }}>
                        {phases.marketMemory.baseline.medianExposurePercent[0]}&ndash;{phases.marketMemory.baseline.medianExposurePercent[1]}%
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: 8, color: C.text4, fontFamily: MO, marginBottom: 2 }}>CONFIDENCE</p>
                      <p style={{ fontFamily: MO, fontSize: 13, fontWeight: 700, color: signalColor(phases.marketMemory.baseline.confidence) }}>
                        {phases.marketMemory.baseline.confidence}/100
                      </p>
                    </div>
                  </div>
                  {phases.marketMemory.baseline.commonVendorPatterns?.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, marginBottom: 4 }}>COMMON PATTERNS</p>
                      {phases.marketMemory.baseline.commonVendorPatterns.map((p: string, i: number) => (
                        <p key={i} style={{ fontSize: 10, color: C.text3, lineHeight: 1.4, marginBottom: 2, paddingLeft: 8, borderLeft: `2px solid ${C.border}` }}>{p}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Vendor References */}
              {phases.marketMemory.vendorReferences?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".06em", marginBottom: 6 }}>VENDOR REFERENCES</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {phases.marketMemory.vendorReferences.slice(0, 5).map((vr: any, i: number) => (
                      <div key={i} className="vg-inset" style={{ display: "grid", gridTemplateColumns: "100px 1fr 60px", gap: 8, padding: "7px 10px", alignItems: "center" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: C.text1 }}>{vr.vendor}</span>
                        <span style={{ fontSize: 9, color: C.text4 }}>{vr.typicalPriceRange[0]}&ndash;{vr.typicalPriceRange[1]} &euro;/{vr.pricingModel.split(",")[0]}</span>
                        <span className="vg-badge" style={{
                          background: (vr.negotiationLeverage === "high" ? C.green : vr.negotiationLeverage === "moderate" ? C.amber : C.text4) + "10",
                          border: `1px solid ${(vr.negotiationLeverage === "high" ? C.green : vr.negotiationLeverage === "moderate" ? C.amber : C.text4)}20`,
                          color: vr.negotiationLeverage === "high" ? C.green : vr.negotiationLeverage === "moderate" ? C.amber : C.text4,
                          fontSize: 7, textAlign: "center",
                        }}>{vr.negotiationLeverage.toUpperCase()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Exposure Clusters */}
              {phases.marketMemory.exposureClusters?.length > 0 && (
                <div>
                  <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".06em", marginBottom: 6 }}>EXPOSURE PATTERN MATCHES</p>
                  {phases.marketMemory.exposureClusters.map((ec: any, i: number) => (
                    <div key={i} style={{ padding: "8px 12px", borderRadius: "var(--r-md)", background: "rgba(59,130,246,0.02)", border: "1px solid rgba(59,130,246,0.08)", marginBottom: 4 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: C.text1 }}>{ec.clusterLabel}</span>
                        <span style={{ fontSize: 9, fontFamily: MO, color: C.text4 }}>{Math.round(ec.similarity * 100)}% match | {ec.observedFrequency}</span>
                      </div>
                      <p style={{ fontSize: 10, color: C.text3, lineHeight: 1.4 }}>Typical correction: {ec.typicalCorrectionPath}</p>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                <span className="vg-badge" style={{
                  background: signalColor(phases.marketMemory.memoryConfidence) + "10",
                  border: `1px solid ${signalColor(phases.marketMemory.memoryConfidence)}20`,
                  color: signalColor(phases.marketMemory.memoryConfidence),
                }}>
                  {phases.marketMemory.memoryDepth.toUpperCase()} MEMORY
                </span>
                <span style={{ fontSize: 9, fontFamily: MO, color: C.text4 }}>conf {phases.marketMemory.memoryConfidence}/100</span>
              </div>
            </Panel>
          )}

          {/* ═══ SECTION 4: BENCHMARK POSITION ═══ */}

          {phases.peerComparison && (
            <Panel className="vg-layer-in vg-delay-3" depth={4}>
              <LayerLabel num="04" label="BENCHMARK POSITION" />
              {phases.peerComparison.insufficientBenchmark ? (
                <div className="vg-inset" style={{ padding: "14px 16px" }}>
                  <p style={{ fontSize: 12, color: C.amber, fontWeight: 600 }}>Benchmark data insufficient for percentile ranking.</p>
                  <p style={{ fontSize: 11, color: C.text4, marginTop: 4 }}>Provide headcount and spend to enable peer comparison.</p>
                </div>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                    <div className="vg-metric vg-countup">
                      <p style={{ fontSize: 7, color: C.text4, letterSpacing: ".08em", marginBottom: 4 }}>YOUR PERCENTILE</p>
                      <p style={{ fontFamily: MO, fontSize: 28, fontWeight: 800, color: signalColor(100 - (phases.peerComparison.efficiencyPercentile ?? 50)), lineHeight: 1 }}>
                        P{phases.peerComparison.efficiencyPercentile}
                      </p>
                      <p style={{ fontSize: 8, color: C.text4, marginTop: 3 }}>higher = worse</p>
                    </div>
                    <Metric label="CATEGORY MEDIAN" value={`${fmt(phases.peerComparison.categoryMedianExposureEur)} \u20ac`} color={C.text2} />
                    <Metric label="TOP QUARTILE" value={`${fmt(phases.peerComparison.categoryTopQuartileExposureEur)} \u20ac`} color={C.green} />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div className="vg-conf-track" style={{ height: 5 }}>
                      <div className="vg-conf-fill vg-bar-grow" style={{ width: `${Math.min(95, phases.peerComparison.efficiencyPercentile ?? 0)}%`, background: `linear-gradient(90deg, ${C.green}, ${C.amber}, ${C.red})` }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                      <span style={{ fontSize: 7, fontFamily: MO, color: C.green }}>TOP 10%</span>
                      <span style={{ fontSize: 7, fontFamily: MO, color: C.text4 }}>P50</span>
                      <span style={{ fontSize: 7, fontFamily: MO, color: C.red }}>BOTTOM 10%</span>
                    </div>
                  </div>
                  <p style={{ fontSize: 9, fontFamily: MO, color: C.text4 }}>
                    {phases.peerComparison.category} | conf {phases.peerComparison.benchmarkConfidence}/100
                  </p>
                </>
              )}
            </Panel>
          )}

          {/* ═══ SECTION 04b: DRIFT PRESSURE ═══ */}

          {phases.driftMonitor && phases.driftMonitor.overallDriftScore > 20 && (
            <Panel className="vg-panel--signal-amber vg-layer-in" depth={4}
              onVisible={() => trackEvent(EVENTS.INTEL_DRIFT_MONITOR_VIEWED)}>
              <LayerLabel num="04b" label="COST DRIFT PRESSURE" />
              <p style={{ fontSize: 12, color: C.text3, lineHeight: 1.5, marginBottom: 14 }}>
                {phases.driftMonitor.pressureSummary}
              </p>

              {/* Overall drift score */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                <div className="vg-metric vg-countup" style={{ borderColor: signalColor(100 - phases.driftMonitor.overallDriftScore) + "18" }}>
                  <p style={{ fontSize: 7, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 4 }}>DRIFT SCORE</p>
                  <p style={{ fontFamily: MO, fontSize: 24, fontWeight: 800, color: signalColor(100 - phases.driftMonitor.overallDriftScore), lineHeight: 1 }}>
                    {phases.driftMonitor.overallDriftScore}
                  </p>
                  <p style={{ fontSize: 7, color: C.text4, marginTop: 3 }}>/100</p>
                </div>
                <Metric label="DIRECTION" value={phases.driftMonitor.driftDirection.toUpperCase()} color={phases.driftMonitor.driftDirection === "worsening" ? C.red : phases.driftMonitor.driftDirection === "improving" ? C.green : C.amber} />
                <Metric label="CONFIDENCE" value={`${phases.driftMonitor.driftConfidence}/100`} color={signalColor(phases.driftMonitor.driftConfidence)} />
              </div>

              {/* Vendor drifts */}
              {phases.driftMonitor.vendorDrifts?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".06em", marginBottom: 6 }}>VENDOR PRICING DRIFT</p>
                  {phases.driftMonitor.vendorDrifts.slice(0, 4).map((vd: any, i: number) => {
                    const sc = vd.driftSeverity === "critical" ? C.red : vd.driftSeverity === "high" ? C.amber : C.text2;
                    return (
                      <div key={i} className="vg-inset" style={{ padding: "8px 12px", marginBottom: 3 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: C.text1 }}>{vd.vendor}</span>
                          <span className="vg-badge" style={{ background: sc + "10", border: `1px solid ${sc}20`, color: sc, fontSize: 7 }}>{vd.driftSeverity.toUpperCase()}</span>
                        </div>
                        <p style={{ fontSize: 10, color: C.text3, lineHeight: 1.4, marginBottom: 2 }}>{vd.deltaDescription}</p>
                        <p style={{ fontSize: 9, color: C.text4, fontStyle: "italic" }}>{vd.urgencyDriver}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Category drifts */}
              {phases.driftMonitor.categoryDrifts?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".06em", marginBottom: 6 }}>CATEGORY COST DRIFT</p>
                  {phases.driftMonitor.categoryDrifts.slice(0, 3).map((cd: any, i: number) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 50px 1fr", gap: 6, padding: "8px 12px", borderRadius: "var(--r-md)", background: "rgba(245,158,11,0.02)", border: "1px solid rgba(245,158,11,0.08)", marginBottom: 3, alignItems: "center" }}>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 600, color: C.text1 }}>{cd.category}</p>
                        <p style={{ fontSize: 9, color: C.text4 }}>{cd.dominantCause}</p>
                      </div>
                      <p style={{ fontFamily: MO, fontSize: 14, fontWeight: 700, color: C.red, textAlign: "center" }}>+{cd.driftPercent}%</p>
                      <p style={{ fontSize: 9, color: C.text3, textAlign: "right" }}>{cd.correctionAction}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Window compression */}
              {phases.driftMonitor.windowCompression?.compressionDays > 0 && (
                <div style={{ padding: "10px 14px", borderRadius: "var(--r-md)", background: "rgba(239,68,68,0.03)", border: "1px solid rgba(239,68,68,0.10)" }}>
                  <p style={{ fontSize: 8, fontFamily: MO, color: C.red, letterSpacing: ".08em", marginBottom: 4 }}>CORRECTIVE WINDOW COMPRESSION</p>
                  <p style={{ fontSize: 12, color: C.text1, fontWeight: 600 }}>
                    Window compressed by {phases.driftMonitor.windowCompression.compressionDays} days ({phases.driftMonitor.windowCompression.originalWindowDays}d &rarr; {phases.driftMonitor.windowCompression.compressedWindowDays}d)
                  </p>
                  {phases.driftMonitor.windowCompression.compressionDrivers?.map((d: string, i: number) => (
                    <p key={i} style={{ fontSize: 10, color: C.text3, lineHeight: 1.4, marginTop: 2 }}>{d}</p>
                  ))}
                </div>
              )}
            </Panel>
          )}

          {/* ═══ SECTION 5: CAUSAL LEVER MAP ═══ */}

          {phases.causalGraph && phases.causalGraph.propagationChain?.length > 0 && (
            <Panel className="vg-panel--signal vg-layer-in vg-delay-4" depth={5}>
              <LayerLabel num="05" label="CAUSAL LEVER MAP" />
              <p style={{ fontSize: 12, color: C.text3, lineHeight: 1.5, marginBottom: 12 }}>
                Why the exposure exists, how it propagates, and where to intervene.
              </p>

              {/* Dominant cause */}
              <div className="vg-inset" style={{ padding: "12px 14px", marginBottom: 14 }}>
                <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 4 }}>DOMINANT CAUSE</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.text1 }}>{phases.causalGraph.dominantCause}</p>
              </div>

              {/* Propagation chain */}
              <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap", marginBottom: 14, padding: "10px 0" }}>
                {phases.causalGraph.propagationChain.map((step: string, i: number) => {
                  const isLast = i === phases.causalGraph.propagationChain.length - 1;
                  const nc = i === 0 ? C.amber : isLast ? C.red : C.blueHi;
                  return (
                    <div key={i} className="vg-chain-step vg-scale-in" style={{ animationDelay: `${i * 80}ms` }}>
                      <div className="vg-chain-node" style={{ background: nc + "08", border: `1px solid ${nc}20`, color: nc }}>
                        {step}
                      </div>
                      {!isLast && <span className="vg-chain-arrow">&rarr;</span>}
                    </div>
                  );
                })}
              </div>

              {/* Secondary causes */}
              {phases.causalGraph.secondaryCauses?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".06em", marginBottom: 6 }}>SECONDARY CAUSES</p>
                  {phases.causalGraph.secondaryCauses.map((c: string, i: number) => (
                    <p key={i} style={{ fontSize: 11, color: C.text2, padding: "5px 10px", borderRadius: "var(--r-xs)", background: "rgba(0,0,0,0.12)", marginBottom: 3 }}>{c}</p>
                  ))}
                </div>
              )}

              {/* Leverage points */}
              {phases.causalGraph.leveragePoints?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".06em", marginBottom: 6 }}>LEVERAGE POINTS</p>
                  {phases.causalGraph.leveragePoints.map((lp: any, i: number) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 12px", borderRadius: "var(--r-md)", background: "rgba(52,211,153,0.02)", border: "1px solid rgba(52,211,153,0.08)", marginBottom: 4 }}>
                      <span style={{ fontFamily: MO, fontSize: 11, fontWeight: 800, color: C.green + "60", flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: C.text1, marginBottom: 2 }}>{lp.lever}</p>
                        <p style={{ fontSize: 10, color: C.text4, lineHeight: 1.4 }}>{lp.why}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Correction order — expandable */}
              {phases.causalGraph.correctionOrder?.length > 0 && (
                <div>
                  <button onClick={() => {
                    setCausalExpanded(!causalExpanded);
                    if (!causalExpanded) trackEvent(EVENTS.INTEL_CAUSAL_MAP_EXPANDED);
                  }}
                    style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.blueHi, fontSize: 10, fontFamily: MO, fontWeight: 600, letterSpacing: ".04em", cursor: "pointer", padding: "6px 0" }}>
                    {causalExpanded ? "\u25BC" : "\u25B6"} RECOMMENDED CORRECTION ORDER
                  </button>
                  {causalExpanded && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 6 }}>
                      {phases.causalGraph.correctionOrder.map((co: any) => (
                        <div key={co.step} className="vg-inset" style={{ display: "flex", gap: 10, padding: "8px 12px", alignItems: "flex-start" }}>
                          <span style={{ fontFamily: MO, fontSize: 10, fontWeight: 800, color: C.blue, flexShrink: 0, width: 18, textAlign: "center" }}>{co.step}</span>
                          <div>
                            <p style={{ fontSize: 12, fontWeight: 600, color: C.text1, marginBottom: 1 }}>{co.action}</p>
                            <p style={{ fontSize: 10, color: C.text4, lineHeight: 1.4 }}>{co.rationale}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Panel>
          )}

          {/* ═══ SECTION 6: ACTION SCENARIOS ═══ */}

          {phases.scenarios && (
            <Panel className="vg-panel--signal-green vg-layer-in" depth={6}>
              <LayerLabel num="06" label="ACTION SCENARIOS" />
              <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
                {(["conservative", "base", "aggressive"] as const).map((key) => (
                  <button key={key} onClick={() => { setActiveTab(key); trackEvent(EVENTS.INTEL_SCENARIO_SWITCHED, { scenario: key }); }}
                    className={`vg-tab ${activeTab === key ? "vg-tab--active" : ""}`}
                    style={{ flex: 1 }}>
                    {key === "conservative" ? "CONSERVATIVE" : key === "base" ? "BASE" : "AGGRESSIVE"}
                  </button>
                ))}
              </div>

              {(() => {
                const sc = phases.scenarios[activeTab];
                if (!sc) return null;
                return (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: C.text1 }}>{sc.label}</p>
                        <p style={{ fontSize: 10, color: C.text4, fontFamily: MO, marginTop: 2 }}>
                          payback {sc.paybackMonths}mo | disruption {sc.disruption}
                        </p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p className="vg-countup" style={{ fontFamily: MO, fontSize: 22, fontWeight: 800, color: C.green, lineHeight: 1 }}>
                          {fmt(sc.annualSavingsEur[0])}&ndash;{fmt(sc.annualSavingsEur[1])}
                        </p>
                        <p style={{ fontSize: 9, color: C.text4, fontFamily: MO }}>&euro;/yr savings</p>
                      </div>
                    </div>

                    {sc.owners?.length > 0 && (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
                        {sc.owners.map((o: string) => (
                          <span key={o} className="vg-badge" style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.12)", color: C.blueHi, fontSize: 9 }}>
                            {o}
                          </span>
                        ))}
                      </div>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {sc.actions?.map((action: any, i: number) => {
                        const efColor = action.effort === "easy" || action.effort === "trivial" ? C.green : action.effort === "moderate" ? C.amber : C.red;
                        return (
                          <div key={i} className="vg-inset" style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 12px" }}>
                            <div style={{ width: 24, height: 24, borderRadius: "var(--r-sm)", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.14)", fontFamily: MO, fontSize: 10, fontWeight: 800, color: C.blue, flexShrink: 0 }}>
                              {i + 1}
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: 12, fontWeight: 600, color: C.text1, marginBottom: 2 }}>{action.title}</p>
                              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <span className="vg-badge" style={{ background: efColor + "10", border: `1px solid ${efColor}25`, color: efColor }}>
                                  {action.effort.toUpperCase()}
                                </span>
                                <span style={{ fontSize: 9, fontFamily: MO, color: C.text4 }}>{action.owner}</span>
                                {action.savingsEurRange && (
                                  <span style={{ fontSize: 10, fontFamily: MO, color: C.green }}>
                                    {fmt(action.savingsEurRange[0])}&ndash;{fmt(action.savingsEurRange[1])} &euro;/yr
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </Panel>
          )}

          {/* ═══════════════════════════════════════
              SECTION 7: DECISION SIMULATOR
              ═══════════════════════════════════════ */}

          {phases.counterfactual && simulated && (
            <Panel className="vg-panel--signal-green vg-layer-in" depth={7}
              onVisible={() => trackEvent(EVENTS.INTEL_SIMULATOR_OPENED)}>
              <LayerLabel num="07" label="DECISION SIMULATOR" />
              <p style={{ fontSize: 12, color: C.text3, lineHeight: 1.5, marginBottom: 6 }}>
                Stress-test correction levers to see bounded financial outcomes. Each lever maps to detected patterns.
              </p>
              {phases.confidenceModel && phases.confidenceModel.simulationConfidence < 40 && (
                <p style={{ fontSize: 10, color: C.amber, fontFamily: MO, marginBottom: 12, letterSpacing: ".02em" }}>
                  Simulation confidence is {confLabel(phases.confidenceModel.simulationConfidence)}. Results are directional.
                </p>
              )}

              {/* Correction levers */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16 }}>
                {phases.counterfactual.availableLevers.map((lever: any) => {
                  const isActive = activeLevers.has(lever.id);
                  return (
                    <button key={lever.id}
                      onClick={() => {
                        setActiveLevers((prev) => {
                          const next = new Set(prev);
                          if (next.has(lever.id)) next.delete(lever.id); else next.add(lever.id);
                          return next;
                        });
                        trackEvent(EVENTS.INTEL_SIMULATOR_LEVER_TOGGLED, { lever: lever.id, active: !isActive });
                      }}
                      disabled={!lever.available}
                      className={`vg-lever ${isActive ? "vg-lever--active" : ""}`}
                      style={{ fontFamily: SA }}>
                      <span className={`vg-lever-check ${isActive ? "vg-lever-check--active" : ""}`}>
                        {isActive ? "\u2713" : ""}
                      </span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: isActive ? C.text1 : C.text2, marginBottom: 1 }}>{lever.label}</p>
                        <p style={{ fontSize: 10, color: C.text4, lineHeight: 1.3 }}>{lever.description}</p>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        {lever.available && lever.exposureReductionEur[0] > 0 && (
                          <p style={{ fontSize: 10, fontFamily: MO, color: C.green }}>
                            &minus;{fmt(lever.exposureReductionEur[0])}&ndash;{fmt(lever.exposureReductionEur[1])} &euro;
                          </p>
                        )}
                        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end", marginTop: 2 }}>
                          <span className="vg-badge" style={{
                            background: (lever.effortLevel === "low" ? C.green : lever.effortLevel === "moderate" ? C.amber : C.red) + "10",
                            border: `1px solid ${(lever.effortLevel === "low" ? C.green : lever.effortLevel === "moderate" ? C.amber : C.red)}20`,
                            color: lever.effortLevel === "low" ? C.green : lever.effortLevel === "moderate" ? C.amber : C.red,
                          }}>{lever.effortLevel.toUpperCase()}</span>
                          <span style={{ fontSize: 7, fontFamily: MO, color: C.text4, lineHeight: "16px" }}>conf {lever.confidence}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Before / After comparison */}
              {simulated.hasChanges ? (
                <>
                  <div className="vg-compare" style={{ marginBottom: 14 }}
                    onMouseEnter={() => trackEvent(EVENTS.INTEL_CURRENT_VS_SIMULATED_VIEWED)}>
                    <div className="vg-compare-side vg-compare-current">
                      <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 8 }}>CURRENT STATE</p>
                      <p style={{ fontFamily: MO, fontSize: 20, fontWeight: 800, color: C.red, lineHeight: 1, marginBottom: 6 }}>
                        {fmt(phases.counterfactual.baselineExposure[0])}&ndash;{fmt(phases.counterfactual.baselineExposure[1])}
                      </p>
                      <p style={{ fontSize: 8, fontFamily: MO, color: C.text4 }}>&euro;/yr exposure</p>
                      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                        <SimMetric label="DAILY LEAKAGE" value={`${fmt(simulated.baselineDailyLeakage[0])}–${fmt(simulated.baselineDailyLeakage[1])} €`} color={C.red} />
                        <SimMetric label="PRESSURE" value={`${phases.counterfactual.baselinePressure}/100`} color={signalColor(100 - phases.counterfactual.baselinePressure)} />
                        <SimMetric label="RECOVERY" value={`${phases.counterfactual.baselineRecoveryDays}d`} color={C.text2} />
                      </div>
                    </div>
                    <div className="vg-compare-divider" />
                    <div className="vg-compare-side vg-compare-simulated">
                      <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 8 }}>SIMULATED STATE</p>
                      <p style={{ fontFamily: MO, fontSize: 20, fontWeight: 800, color: C.green, lineHeight: 1, marginBottom: 6 }}>
                        {fmt(simulated.adjustedExposure[0])}&ndash;{fmt(simulated.adjustedExposure[1])}
                      </p>
                      <p style={{ fontSize: 8, fontFamily: MO, color: C.text4 }}>&euro;/yr exposure</p>
                      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                        <SimMetric label="DAILY LEAKAGE" value={`${fmt(simulated.adjustedDailyLeakage[0])}–${fmt(simulated.adjustedDailyLeakage[1])} €`} color={C.green} />
                        <SimMetric label="PRESSURE" value={`${simulated.adjustedPressure}/100`} color={signalColor(100 - simulated.adjustedPressure)} />
                        <SimMetric label="RECOVERY" value={`${simulated.adjustedRecoveryDays}d`} color={C.green} />
                      </div>
                    </div>
                  </div>

                  {/* Delta indicators */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                    {simulated.deltaExposure[0] > 0 && (
                      <span className="vg-delta vg-delta--positive">
                        &darr; {fmt(simulated.deltaExposure[0])}&ndash;{fmt(simulated.deltaExposure[1])} &euro;/yr
                      </span>
                    )}
                    {simulated.baselineDailyLeakage[0] - simulated.adjustedDailyLeakage[0] > 0 && (
                      <span className="vg-delta vg-delta--positive">
                        &darr; {fmt(simulated.baselineDailyLeakage[0] - simulated.adjustedDailyLeakage[0])}&ndash;{fmt(simulated.baselineDailyLeakage[1] - simulated.adjustedDailyLeakage[1])} &euro;/day
                      </span>
                    )}
                    {simulated.deltaPressure > 0 && (
                      <span className="vg-delta vg-delta--positive">
                        &darr; {simulated.deltaPressure} pressure
                      </span>
                    )}
                    {simulated.deltaRecovery > 0 && (
                      <span className="vg-delta vg-delta--positive">
                        &darr; {simulated.deltaRecovery}d faster recovery
                      </span>
                    )}
                  </div>

                  {/* Simulation rationale */}
                  {simulated.rationales.length > 0 && (
                    <div className="vg-inset" style={{ padding: "10px 14px", marginBottom: 10 }}>
                      <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".06em", marginBottom: 6 }}>WHY THESE CHANGES</p>
                      {simulated.rationales.map((r, i) => (
                        <p key={i} style={{ fontSize: 10, color: C.text2, lineHeight: 1.5, marginBottom: 2 }}>{r}</p>
                      ))}
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="vg-badge" style={{ background: signalColor(simulated.simulationConfidence) + "10", border: `1px solid ${signalColor(simulated.simulationConfidence)}25`, color: signalColor(simulated.simulationConfidence) }}>
                      SIM CONFIDENCE: {simulated.simulationConfidence}/100
                    </span>
                    <span style={{ fontSize: 9, color: C.text4 }}>Bounded by detected signals. Actual outcomes depend on execution.</span>
                  </div>
                </>
              ) : (
                <p style={{ fontSize: 11, color: C.text4, fontStyle: "italic" }}>Toggle levers above to see adjusted metrics and before/after comparison.</p>
              )}
            </Panel>
          )}

          {/* ═══════════════════════════════════════
              SECTION 8: EXECUTION FRICTION SURFACE
              ═══════════════════════════════════════ */}

          {phases.decisionFriction && (
            <Panel className="vg-panel--signal-amber vg-layer-in" depth={8}
              onVisible={() => trackEvent(EVENTS.INTEL_EXECUTION_FRICTION_VIEWED)}>
              <LayerLabel num="08" label="EXECUTION FRICTION SURFACE" />
              <p style={{ fontSize: 12, color: C.text3, lineHeight: 1.5, marginBottom: 14 }}>
                How painful is this to execute? Where is resistance? Who must coordinate?
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                <div className="vg-metric" style={{ borderColor: signalColor(100 - phases.decisionFriction.frictionScore) + "20" }}>
                  <p style={{ fontSize: 7, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 4 }}>FRICTION</p>
                  <p className="vg-countup" style={{ fontFamily: MO, fontSize: 28, fontWeight: 800, color: signalColor(100 - phases.decisionFriction.frictionScore), lineHeight: 1 }}>
                    {phases.decisionFriction.frictionScore}
                  </p>
                  <p style={{ fontSize: 7, color: C.text4, marginTop: 3 }}>/100 (higher = harder)</p>
                </div>
                <Metric label="OWNERSHIP AMBIGUITY" value={`${phases.decisionFriction.ownershipAmbiguityScore}/100`} color={signalColor(100 - phases.decisionFriction.ownershipAmbiguityScore)} />
                <Metric label="CROSS-FUNCTIONAL" value={`${phases.decisionFriction.crossFunctionalDependencies} functions`} color={C.blueHi} />
              </div>

              {/* Execution readiness (from correction momentum if available) */}
              {phases.correctionMomentum && (
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  <div style={{ flex: 1 }}><Metric label="EXECUTION READINESS" value={`${phases.correctionMomentum.executionReadinessScore}/100`} color={signalColor(phases.correctionMomentum.executionReadinessScore)} /></div>
                  <div style={{ flex: 1 }}><Metric label="ACTION COMPLEXITY" value={`${phases.correctionMomentum.actionComplexityScore}/100`} color={signalColor(100 - phases.correctionMomentum.actionComplexityScore)} /></div>
                </div>
              )}

              {/* Stakeholder impact map */}
              {phases.decisionFriction.stakeholderMap?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".06em", marginBottom: 6 }}>STAKEHOLDER IMPACT MAP</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 60px 60px 2fr", gap: 6, padding: "4px 10px", fontSize: 7, fontFamily: MO, color: C.text4, letterSpacing: ".04em", marginBottom: 4 }}>
                    <span>ROLE</span><span style={{ textAlign: "center" }}>IMPACT</span><span style={{ textAlign: "center" }}>RESIST</span><span>REASON</span>
                  </div>
                  {phases.decisionFriction.stakeholderMap.map((sh: any, i: number) => {
                    const ic = sh.impactLevel === "high" ? C.red : sh.impactLevel === "moderate" ? C.amber : C.green;
                    const rc = sh.likelyResistance === "high" ? C.red : sh.likelyResistance === "moderate" ? C.amber : C.green;
                    return (
                      <div key={i} className="vg-inset" style={{ display: "grid", gridTemplateColumns: "1.2fr 60px 60px 2fr", gap: 6, padding: "7px 10px", marginBottom: 3, alignItems: "center", fontSize: 11 }}>
                        <span style={{ color: C.text1, fontWeight: 600 }}>{sh.role}</span>
                        <span className="vg-badge" style={{ background: ic + "10", border: `1px solid ${ic}25`, color: ic, textAlign: "center", justifySelf: "center" }}>{sh.impactLevel.toUpperCase()}</span>
                        <span className="vg-badge" style={{ background: rc + "10", border: `1px solid ${rc}25`, color: rc, textAlign: "center", justifySelf: "center" }}>{sh.likelyResistance === "none" ? "NONE" : sh.likelyResistance.toUpperCase()}</span>
                        <span style={{ fontSize: 10, color: C.text4 }}>{sh.reason}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="vg-inset" style={{ padding: "8px 12px", marginBottom: 4 }}>
                <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, marginBottom: 3 }}>IMPLEMENTATION BURDEN</p>
                <p style={{ fontSize: 11, color: C.text2, lineHeight: 1.5 }}>{phases.decisionFriction.implementationBurden}</p>
              </div>
              <div className="vg-inset" style={{ padding: "8px 12px", marginBottom: 14 }}>
                <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, marginBottom: 3 }}>POLITICAL FRICTION</p>
                <p style={{ fontSize: 11, color: C.text2, lineHeight: 1.5 }}>{phases.decisionFriction.politicalFrictionSummary}</p>
              </div>

              {/* Correction momentum — merged here */}
              {phases.correctionMomentum && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                    {phases.decisionPressure !== undefined && (
                      <div className="vg-metric vg-countup" style={{ borderColor: signalColor(100 - phases.decisionPressure) + "18" }}>
                        <p style={{ fontSize: 7, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 4 }}>PRESSURE</p>
                        <p style={{ fontFamily: MO, fontSize: 22, fontWeight: 800, color: signalColor(100 - phases.decisionPressure), lineHeight: 1 }}>
                          {phases.decisionPressure}
                        </p>
                        <p style={{ fontSize: 7, color: C.text4, marginTop: 3 }}>/100</p>
                      </div>
                    )}
                    <Metric label="RECOVERY WINDOW" value={`${phases.correctionMomentum.medianRecoveryWindowDays}d`} color={C.blueHi} />
                    <Metric label="PAYBACK" value={`${phases.correctionMomentum.expectedPaybackMonths}mo`} color={C.green} />
                    <Metric label="READINESS" value={`${phases.correctionMomentum.executionReadinessScore}/100`} color={signalColor(phases.correctionMomentum.executionReadinessScore)} />
                  </div>
                  {phases.correctionMomentum.readinessDrivers?.length > 0 && (
                    <div className="vg-inset" style={{ padding: "10px 14px" }}>
                      <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".06em", marginBottom: 6 }}>READINESS DRIVERS</p>
                      {phases.correctionMomentum.readinessDrivers.map((d: string, i: number) => (
                        <p key={i} style={{ fontSize: 11, color: C.text2, lineHeight: 1.5, marginBottom: 2 }}>{d}</p>
                      ))}
                    </div>
                  )}
                </>
              )}
            </Panel>
          )}

          {/* ═══ SECTION 08b: NEGOTIATION LEVERAGE ═══ */}

          {phases.negotiation && phases.negotiation.readiness?.overallReadiness > 15 && (
            <Panel className="vg-panel--signal-green vg-layer-in" depth={8}
              onVisible={() => trackEvent(EVENTS.INTEL_NEGOTIATION_LEVERAGE_VIEWED)}>
              <LayerLabel num="08b" label="NEGOTIATION LEVERAGE" />
              <p style={{ fontSize: 12, color: C.text3, lineHeight: 1.5, marginBottom: 14 }}>
                {phases.negotiation.summary}
              </p>

              {/* Readiness */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                <div className="vg-metric vg-countup" style={{ borderColor: signalColor(phases.negotiation.readiness.overallReadiness) + "18" }}>
                  <p style={{ fontSize: 7, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 4 }}>READINESS</p>
                  <p style={{ fontFamily: MO, fontSize: 22, fontWeight: 800, color: signalColor(phases.negotiation.readiness.overallReadiness), lineHeight: 1 }}>
                    {phases.negotiation.readiness.overallReadiness}
                  </p>
                  <p style={{ fontSize: 7, color: C.text4, marginTop: 3 }}>/100</p>
                </div>
                <Metric label="GRADE" value={phases.negotiation.readiness.readinessGrade.toUpperCase().replace("-", " ")} color={phases.negotiation.readiness.readinessGrade === "ready" ? C.green : phases.negotiation.readiness.readinessGrade === "near-ready" ? C.amber : C.red} />
                <Metric label="CONFIDENCE" value={`${phases.negotiation.negotiationConfidence}/100`} color={signalColor(phases.negotiation.negotiationConfidence)} />
              </div>

              {/* Leverage Points — first one visible, rest behind paywall */}
              {phases.negotiation.leveragePoints?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".06em", marginBottom: 6 }}>LEVERAGE POINTS</p>
                  {/* First leverage point always visible */}
                  {phases.negotiation.leveragePoints.slice(0, 1).map((lp: any, i: number) => {
                    const sc = lp.strength === "strong" ? C.green : lp.strength === "moderate" ? C.amber : C.text4;
                    return (
                      <div key={i} className="vg-inset" style={{ padding: "8px 12px", marginBottom: 4 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: C.text1 }}>{lp.vendor}</span>
                          <div style={{ display: "flex", gap: 4 }}>
                            <span className="vg-badge" style={{ background: sc + "10", border: `1px solid ${sc}20`, color: sc, fontSize: 7 }}>{lp.strength.toUpperCase()}</span>
                            <span className="vg-badge" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)", color: C.blueHi, fontSize: 7 }}>{lp.leverageType.toUpperCase()}</span>
                          </div>
                        </div>
                        <p style={{ fontSize: 10, color: C.text2, lineHeight: 1.4, marginBottom: 2 }}>{lp.argument}</p>
                        <p style={{ fontSize: 9, color: C.text4 }}>{lp.expectedOutcome}</p>
                      </div>
                    );
                  })}
                  {/* Remaining leverage points — blurred */}
                  {!unlocked && phases.negotiation.leveragePoints.length > 1 && (
                    <PaywallBlur label={`Unlock ${phases.negotiation.leveragePoints.length - 1} more leverage points`} onAttempt={() => {
                      trackEvent(EVENTS.INTEL_RECOMMENDED_ACTION_CLICKED, { section: "negotiation_leverage" });
                      handleCheckout();
                    }}>
                      {phases.negotiation.leveragePoints.slice(1, 4).map((lp: any, i: number) => {
                        const sc = lp.strength === "strong" ? C.green : lp.strength === "moderate" ? C.amber : C.text4;
                        return (
                          <div key={i} className="vg-inset" style={{ padding: "8px 12px", marginBottom: 4 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: C.text1 }}>{lp.vendor}</span>
                              <div style={{ display: "flex", gap: 4 }}>
                                <span className="vg-badge" style={{ background: sc + "10", border: `1px solid ${sc}20`, color: sc, fontSize: 7 }}>{lp.strength.toUpperCase()}</span>
                              </div>
                            </div>
                            <p style={{ fontSize: 10, color: C.text2, lineHeight: 1.4 }}>{lp.argument}</p>
                          </div>
                        );
                      })}
                    </PaywallBlur>
                  )}
                  {unlocked && phases.negotiation.leveragePoints.slice(1, 4).map((lp: any, i: number) => {
                    const sc = lp.strength === "strong" ? C.green : lp.strength === "moderate" ? C.amber : C.text4;
                    return (
                      <div key={i} className="vg-inset" style={{ padding: "8px 12px", marginBottom: 4 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: C.text1 }}>{lp.vendor}</span>
                          <div style={{ display: "flex", gap: 4 }}>
                            <span className="vg-badge" style={{ background: sc + "10", border: `1px solid ${sc}20`, color: sc, fontSize: 7 }}>{lp.strength.toUpperCase()}</span>
                            <span className="vg-badge" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)", color: C.blueHi, fontSize: 7 }}>{lp.leverageType.toUpperCase()}</span>
                          </div>
                        </div>
                        <p style={{ fontSize: 10, color: C.text2, lineHeight: 1.4, marginBottom: 2 }}>{lp.argument}</p>
                        <p style={{ fontSize: 9, color: C.text4 }}>{lp.expectedOutcome}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Economic Arguments + Playbooks + Memo — behind paywall */}
              {!unlocked ? (
                <PaywallBlur label="Unlock negotiation playbooks & economic arguments" onAttempt={() => {
                  trackEvent(EVENTS.INTEL_RECOMMENDED_ACTION_CLICKED, { section: "negotiation_playbooks" });
                  handleCheckout();
                }}>
                  {/* Teaser content rendered but blurred */}
                  {phases.negotiation.topEconomicArguments?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".06em", marginBottom: 6 }}>ECONOMIC ARGUMENTS</p>
                      {phases.negotiation.topEconomicArguments.slice(0, 3).map((ea: any, i: number) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: "var(--r-md)", background: "rgba(52,211,153,0.02)", border: "1px solid rgba(52,211,153,0.08)", marginBottom: 3 }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 11, fontWeight: 600, color: C.text1, marginBottom: 2 }}>{ea.headline}</p>
                            <p style={{ fontSize: 9, color: C.text4 }}>{ea.timeframe} | {ea.internalAudience}</p>
                          </div>
                          <p style={{ fontFamily: MO, fontSize: 14, fontWeight: 700, color: C.green, flexShrink: 0, marginLeft: 12 }}>
                            {fmt(ea.eurImpact[0])}&ndash;{fmt(ea.eurImpact[1])} &euro;
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  {phases.negotiation.vendorPlaybooks?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".06em", marginBottom: 6 }}>VENDOR PLAYBOOKS</p>
                      {phases.negotiation.vendorPlaybooks.slice(0, 3).map((pb: any, i: number) => (
                        <div key={i} style={{ padding: "10px 14px", borderRadius: "var(--r-md)", background: "rgba(59,130,246,0.02)", border: "1px solid rgba(59,130,246,0.08)", marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: C.text1 }}>{pb.vendor}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </PaywallBlur>
              ) : (
                <>
                  {/* Unlocked: full economic arguments */}
                  {phases.negotiation.topEconomicArguments?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".06em", marginBottom: 6 }}>ECONOMIC ARGUMENTS</p>
                      {phases.negotiation.topEconomicArguments.map((ea: any, i: number) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: "var(--r-md)", background: "rgba(52,211,153,0.02)", border: "1px solid rgba(52,211,153,0.08)", marginBottom: 3 }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 11, fontWeight: 600, color: C.text1, marginBottom: 2 }}>{ea.headline}</p>
                            <p style={{ fontSize: 9, color: C.text4 }}>{ea.timeframe} | {ea.internalAudience}</p>
                          </div>
                          <p style={{ fontFamily: MO, fontSize: 14, fontWeight: 700, color: C.green, flexShrink: 0, marginLeft: 12 }}>
                            {fmt(ea.eurImpact[0])}&ndash;{fmt(ea.eurImpact[1])} &euro;
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Unlocked: full vendor playbooks */}
                  {phases.negotiation.vendorPlaybooks?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".06em", marginBottom: 6 }}>VENDOR PLAYBOOK PREVIEW</p>
                      {phases.negotiation.vendorPlaybooks.slice(0, 3).map((pb: any, i: number) => (
                        <div key={i} style={{ padding: "10px 14px", borderRadius: "var(--r-md)", background: "rgba(59,130,246,0.02)", border: "1px solid rgba(59,130,246,0.08)", marginBottom: 4 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: C.text1 }}>{pb.vendor}</span>
                            <div style={{ display: "flex", gap: 4 }}>
                              <span className="vg-badge" style={{ background: signalColor(pb.readinessScore) + "10", border: `1px solid ${signalColor(pb.readinessScore)}20`, color: signalColor(pb.readinessScore), fontSize: 7 }}>
                                {pb.suggestedApproach.toUpperCase()}
                              </span>
                              <span style={{ fontSize: 8, fontFamily: MO, color: C.text4 }}>readiness {pb.readinessScore}</span>
                            </div>
                          </div>
                          <p style={{ fontSize: 10, color: C.text3, lineHeight: 1.4, marginBottom: 6 }}>{pb.pressureFrame.pressureAngle}</p>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            {pb.playBookPreview?.slice(0, 3).map((step: string, j: number) => (
                              <p key={j} style={{ fontSize: 9, color: C.text4, paddingLeft: 8, borderLeft: `2px solid ${C.border}` }}>
                                <span style={{ fontFamily: MO, fontWeight: 700, color: C.blueHi, marginRight: 4 }}>{j + 1}.</span>{step}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Unlocked: internal memo frame */}
                  {phases.negotiation.internalMemoFrame && (
                    <div className="vg-inset" style={{ padding: "10px 14px" }}>
                      <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".06em", marginBottom: 4 }}>INTERNAL DECISION FRAME</p>
                      <p style={{ fontSize: 11, color: C.text2, lineHeight: 1.5 }}>{phases.negotiation.internalMemoFrame}</p>
                    </div>
                  )}
                </>
              )}
            </Panel>
          )}

          {/* ═══════════════════════════════════════
              SECTION 09: DECISION CIRCULATION
              ═══════════════════════════════════════ */}

          {phases.decisionPack && (
            <Panel className="vg-layer-in" depth={9}>
              <LayerLabel num="09" label="DECISION CIRCULATION" />
              <p style={{ fontSize: 12, color: C.text3, lineHeight: 1.5, marginBottom: 14 }}>
                Role-specific decision assets generated from the current analysis. Copy and circulate internally to move the decision across the buying group.
              </p>

              {/* Memo switcher */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 3, marginBottom: 16 }}>
                {([
                  { key: "cfo" as const, label: "CFO Memo", event: EVENTS.CIRCULATION_CFO_MEMO_VIEWED },
                  { key: "cio" as const, label: "CIO / Ops", event: EVENTS.CIRCULATION_CIO_MEMO_VIEWED },
                  { key: "procurement" as const, label: "Procurement", event: EVENTS.CIRCULATION_PROCUREMENT_VIEWED },
                  { key: "board" as const, label: "Board", event: EVENTS.CIRCULATION_BOARD_VIEWED },
                ]).map(({ key, label, event }) => (
                  <button key={key} onClick={() => {
                    setActiveMemo(key);
                    setMemoInteracted(true);
                    trackEvent(event, { memo: key });
                  }}
                    className={`vg-tab ${activeMemo === key ? "vg-tab--active" : ""}`}>
                    {label}
                  </button>
                ))}
              </div>

              {activeMemo !== "consensus" ? (
                unlocked ? (
                  <div style={{ padding: 16, borderRadius: "var(--r-md)", background: C.inset, border: `1px solid ${C.border}`, position: "relative" }}>
                    <MemoBlock text={
                      activeMemo === "cfo" ? phases.decisionPack.cfoMemo
                        : activeMemo === "cio" ? phases.decisionPack.cioOpsMemo
                        : activeMemo === "procurement" ? phases.decisionPack.procurementSummary
                        : phases.decisionPack.boardOnePager
                    } />
                    {/* Copy + Print actions — only when unlocked */}
                    <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 4 }}>
                      <button
                        onClick={() => {
                          const text = activeMemo === "cfo" ? phases.decisionPack.cfoMemo
                            : activeMemo === "cio" ? phases.decisionPack.cioOpsMemo
                            : activeMemo === "procurement" ? phases.decisionPack.procurementSummary
                            : phases.decisionPack.boardOnePager;
                          navigator.clipboard.writeText(text);
                          const copyEvent = {
                            cfo: EVENTS.CIRCULATION_CFO_MEMO_COPIED,
                            cio: EVENTS.CIRCULATION_CIO_MEMO_COPIED,
                            procurement: EVENTS.CIRCULATION_PROCUREMENT_COPIED,
                            board: EVENTS.CIRCULATION_BOARD_COPIED,
                          }[activeMemo as "cfo" | "cio" | "procurement" | "board"];
                          if (copyEvent) trackEvent(copyEvent, { memo: activeMemo });
                          setCopyFeedback(activeMemo);
                          setTimeout(() => setCopyFeedback(null), 2000);
                        }}
                        style={{ padding: "4px 10px", borderRadius: "var(--r-xs)", border: `1px solid ${C.border}`, background: "rgba(0,0,0,0.4)", color: copyFeedback === activeMemo ? C.green : C.text4, fontSize: 9, fontFamily: MO, cursor: "pointer", transition: "color 0.15s" }}>
                        {copyFeedback === activeMemo ? "COPIED" : "COPY"}
                      </button>
                      <button
                        onClick={() => {
                          trackEvent(EVENTS.CIRCULATION_PRINT_OPENED, { memo: activeMemo });
                          window.print();
                        }}
                        style={{ padding: "4px 10px", borderRadius: "var(--r-xs)", border: `1px solid ${C.border}`, background: "rgba(0,0,0,0.4)", color: C.text4, fontSize: 9, fontFamily: MO, cursor: "pointer", transition: "color 0.15s" }}>
                        PRINT
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Locked: show teaser then blur */
                  <PaywallBlur label={`Unlock ${activeMemo.toUpperCase()} memo`} onAttempt={() => {
                    trackEvent(EVENTS.INTEL_RECOMMENDED_ACTION_CLICKED, { section: `memo_${activeMemo}` });
                    handleCheckout();
                  }}>
                    <div style={{ padding: 16, borderRadius: "var(--r-md)", background: C.inset, border: `1px solid ${C.border}`, minHeight: 200 }}>
                      <MemoBlock text={
                        (activeMemo === "cfo" ? phases.decisionPack.cfoMemo
                          : activeMemo === "cio" ? phases.decisionPack.cioOpsMemo
                          : activeMemo === "procurement" ? phases.decisionPack.procurementSummary
                          : phases.decisionPack.boardOnePager
                        )?.split("\n").slice(0, 6).join("\n") + "\n\n..."
                      } />
                    </div>
                  </PaywallBlur>
                )
              ) : null}

            </Panel>
          )}

          {/* ═══════════════════════════════════════
              SECTION 10: CONFIDENCE & DEFENSIBILITY
              ═══════════════════════════════════════ */}

          {phases.confidenceModel && (
            <Panel className="vg-layer-in" depth={10}
              onVisible={() => trackEvent(EVENTS.INTEL_CONFIDENCE_LAYER_VIEWED)}>
              <LayerLabel num="10" label="CONFIDENCE & DEFENSIBILITY" />
              <p style={{ fontSize: 12, color: C.text2, lineHeight: 1.5, marginBottom: 14 }}>
                {phases.confidenceModel.summary}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                {[
                  { label: "Signal Detection", value: phases.confidenceModel.signalConfidence },
                  { label: "Exposure Estimation", value: phases.confidenceModel.exposureConfidence },
                  { label: "Peer Benchmarking", value: phases.confidenceModel.benchmarkConfidence },
                  { label: "Scenario Modeling", value: phases.confidenceModel.scenarioConfidence },
                  { label: "Causal Analysis", value: phases.confidenceModel.causalConfidence },
                  { label: "Simulation", value: phases.confidenceModel.simulationConfidence },
                ].map((layer) => {
                  const cl = confLabel(layer.value);
                  return (
                    <div key={layer.label} style={{ display: "grid", gridTemplateColumns: "120px 1fr 50px 30px", gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: C.text3, fontWeight: 500 }}>{layer.label}</span>
                      <div className="vg-conf-track">
                        <div className="vg-conf-fill vg-bar-grow" style={{ width: `${Math.min(95, layer.value)}%`, background: signalColor(layer.value) }} />
                      </div>
                      <span className="vg-badge" style={{ background: signalColor(layer.value) + "10", border: `1px solid ${signalColor(layer.value)}20`, color: signalColor(layer.value), fontSize: 7, textAlign: "center" }}>
                        {cl.toUpperCase()}
                      </span>
                      <span style={{ fontSize: 10, fontFamily: MO, fontWeight: 700, color: signalColor(layer.value), textAlign: "right" }}>{layer.value}</span>
                    </div>
                  );
                })}
              </div>

              {/* Consensus defensibility */}
              {phases.decisionPack?.consensusView && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                  <p style={{ fontSize: 9, fontFamily: MO, color: C.blue, letterSpacing: ".08em", marginBottom: 4 }}>DEFENSIBILITY ASSESSMENT</p>

                  <div style={{ padding: "10px 12px", borderRadius: "var(--r-md)", background: "rgba(52,211,153,0.03)", border: "1px solid rgba(52,211,153,0.10)" }}>
                    <p style={{ fontSize: 8, fontFamily: MO, color: C.green, letterSpacing: ".08em", marginBottom: 6 }}>STRONG EVIDENCE</p>
                    {phases.decisionPack.consensusView.strongEvidence.map((e: string, i: number) => (
                      <p key={i} style={{ fontSize: 11, color: C.text1, lineHeight: 1.5, marginBottom: 3, paddingLeft: 8, borderLeft: `2px solid ${C.green}30` }}>{e}</p>
                    ))}
                  </div>

                  {phases.decisionPack.consensusView.directionalEvidence.length > 0 && (
                    <div style={{ padding: "10px 12px", borderRadius: "var(--r-md)", background: "rgba(59,130,246,0.03)", border: "1px solid rgba(59,130,246,0.10)" }}>
                      <p style={{ fontSize: 8, fontFamily: MO, color: C.blueHi, letterSpacing: ".08em", marginBottom: 6 }}>DIRECTIONAL EVIDENCE</p>
                      {phases.decisionPack.consensusView.directionalEvidence.map((e: string, i: number) => (
                        <p key={i} style={{ fontSize: 11, color: C.text2, lineHeight: 1.5, marginBottom: 3, paddingLeft: 8, borderLeft: `2px solid ${C.blueHi}30` }}>{e}</p>
                      ))}
                    </div>
                  )}

                  <div style={{ padding: "10px 12px", borderRadius: "var(--r-md)", background: "rgba(245,158,11,0.03)", border: "1px solid rgba(245,158,11,0.10)" }}>
                    <p style={{ fontSize: 8, fontFamily: MO, color: C.amber, letterSpacing: ".08em", marginBottom: 6 }}>KEY UNCERTAINTIES</p>
                    {phases.decisionPack.consensusView.keyUncertainties.map((u: string, i: number) => (
                      <p key={i} style={{ fontSize: 11, color: C.text2, lineHeight: 1.5, marginBottom: 3, paddingLeft: 8, borderLeft: `2px solid ${C.amber}30` }}>{u}</p>
                    ))}
                  </div>

                  <div className="vg-inset" style={{ padding: "10px 12px" }}>
                    <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 4 }}>RECOMMENDED ACTION</p>
                    <p style={{ fontSize: 12, color: C.text1, lineHeight: 1.5, fontWeight: 500 }}>{phases.decisionPack.consensusView.recommendedAction}</p>
                  </div>

                  {phases.decisionPack.consensusView.requiresDeeperValidation.length > 0 && (
                    <div style={{ padding: "10px 12px", borderRadius: "var(--r-md)", background: "rgba(239,68,68,0.02)", border: "1px solid rgba(239,68,68,0.08)" }}>
                      <p style={{ fontSize: 8, fontFamily: MO, color: C.red, letterSpacing: ".08em", marginBottom: 6 }}>REQUIRES DEEPER VALIDATION</p>
                      {phases.decisionPack.consensusView.requiresDeeperValidation.map((v: string, i: number) => (
                        <p key={i} style={{ fontSize: 11, color: C.text3, lineHeight: 1.5, marginBottom: 3, paddingLeft: 8, borderLeft: `2px solid ${C.red}20` }}>{v}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Panel>
          )}

          {/* ═══ DECISION PATH + CORRECTIVE PROTOCOL PREVIEW + CTA ═══ */}

          {phases.complete && (
            <Panel className="vg-panel--signal-green vg-layer-in" depth={11}>
              <LayerLabel num="11" label="CORRECTIVE PROTOCOL PREVIEW" />

              {/* What the full protocol contains */}
              <p style={{ fontSize: 12, color: C.text3, lineHeight: 1.5, marginBottom: 16 }}>
                This detection identifies exposure and classifies signals. The full corrective protocol delivers the following:
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
                {[
                  { num: "01", title: "Complete Enrichment", desc: "Full vendor-level data collection across all IT spend, contracts, and usage patterns." },
                  { num: "02", title: "Structured Exposure Report", desc: "Line-by-line exposure map with root cause attribution and EUR impact per category." },
                  { num: "03", title: "Vendor Pressure Map", desc: "Vendor-specific drift analysis, pricing pressure assessment, and renewal timing intelligence." },
                  { num: "04", title: "Negotiation Playbooks", desc: "Contract-specific renegotiation scripts with leverage points, benchmark pricing, and economic arguments." },
                  { num: "05", title: "Implementation Roadmap", desc: "Phased corrective actions with owner assignments, effort ratings, and expected payback." },
                  { num: "06", title: "Executive Decision Pack", desc: "Board-ready materials: CFO memo, CIO brief, procurement summary, ROI projection, and internal circulation assets." },
                ].map((item) => (
                  <div key={item.num} className="vg-inset" style={{ display: "flex", gap: 12, padding: "10px 14px", alignItems: "flex-start" }}>
                    <span style={{ fontFamily: MO, fontSize: 10, fontWeight: 800, color: C.green + "50", flexShrink: 0, width: 20, textAlign: "center", marginTop: 1 }}>{item.num}</span>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: C.text1, marginBottom: 2 }}>{item.title}</p>
                      <p style={{ fontSize: 10, color: C.text4, lineHeight: 1.4 }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Delivery timeline */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
                <div className="vg-metric" style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 7, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 4 }}>DELIVERY</p>
                  <p style={{ fontFamily: MO, fontSize: 16, fontWeight: 700, color: C.blueHi }}>48h</p>
                </div>
                <div className="vg-metric" style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 7, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 4 }}>FORMAT</p>
                  <p style={{ fontFamily: MO, fontSize: 11, fontWeight: 600, color: C.text2 }}>Structured Report</p>
                </div>
                <div className="vg-metric" style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 7, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 4 }}>INCLUDES</p>
                  <p style={{ fontFamily: MO, fontSize: 11, fontWeight: 600, color: C.text2 }}>Email + Follow-up</p>
                </div>
              </div>

              {/* CTA */}
              <div style={{ textAlign: "center", padding: "14px 0" }}>
                <button onClick={() => {
                  if (memoInteracted) trackEvent(EVENTS.CHECKOUT_STARTED_AFTER_MEMO, { lastMemo: activeMemo });
                  handleCheckout();
                  trackEvent(EVENTS.INTEL_RECOMMENDED_ACTION_CLICKED);
                }} disabled={checkoutLoading}
                  style={{
                    padding: "14px 40px", borderRadius: "var(--r-md)", border: "none",
                    background: C.green, color: C.bg, fontSize: 12, fontWeight: 700,
                    letterSpacing: ".06em", textTransform: "uppercase",
                    cursor: checkoutLoading ? "wait" : "pointer",
                    opacity: checkoutLoading ? 0.7 : 1,
                    transition: "all 0.2s",
                    boxShadow: `0 0 20px ${C.green}20`,
                  }}>
                  {checkoutLoading
                    ? (t("intel.cta.redirecting") !== "intel.cta.redirecting" ? t("intel.cta.redirecting") : "REDIRECTING...")
                    : (t("intel.cta.unlock") !== "intel.cta.unlock" ? t("intel.cta.unlock") : "UNLOCK DECISION PACK")}
                </button>
                <p style={{ fontSize: 10, color: C.text4, marginTop: 10, fontFamily: MO }}>
                  {t("intel.cta.sub") !== "intel.cta.sub" ? t("intel.cta.sub") : "One-time payment. Full report + negotiation playbooks + board-ready memos."}
                </p>
              </div>
            </Panel>
          )}

          {/* ═══ DECISION PACK TEASER (Growth Hack #4) ═══ */}

          {phases.complete && !unlocked && (
            <DecisionPackTeaser
              domain={domain}
              email={email}
              exposureLow={phases.exposure?.annualRange?.[0]}
              exposureHigh={phases.exposure?.annualRange?.[1]}
              locale={locale}
            />
          )}

          {/* ═══ META FOOTER ═══ */}

          {phases.complete && (
            <div style={{ padding: "10px 14px", borderRadius: "var(--r-md)", background: "rgba(0,0,0,0.12)", border: `1px solid ${C.border}`, marginTop: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <span style={{ fontSize: 8, fontFamily: MO, color: C.text4 }}>ID: {phases.complete.analysisId}</span>
                <span style={{ fontSize: 8, fontFamily: MO, color: C.text4 }}>Sources: {phases.complete.dataSources?.join(", ")}</span>
                <span style={{ fontSize: 8, fontFamily: MO, color: C.text4 }}>Confidence: {phases.complete.overallConfidence}/100</span>
              </div>
              {phases.complete.limitations?.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  {phases.complete.limitations.map((l: string, i: number) => (
                    <p key={i} style={{ fontSize: 9, color: C.text4, lineHeight: 1.4 }}>{l}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Terminal Sub-Components ──────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: "block", fontSize: 9, fontFamily: "var(--font-mono)", color: "#3a4560", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>
      {children}
    </label>
  );
}

function Panel({ children, className = "", depth, onVisible }: { children: React.ReactNode; className?: string; depth: number; onVisible?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!onVisible || firedRef.current || !ref.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !firedRef.current) {
        firedRef.current = true;
        onVisible();
        observer.disconnect();
      }
    }, { threshold: 0.3 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [onVisible]);

  return (
    <div ref={ref} className={`vg-panel ${className}`}
      style={{ padding: 20, marginBottom: 12, animationDelay: `${Math.min(depth * 60, 400)}ms` }}>
      {children}
    </div>
  );
}

function LayerLabel({ num, label }: { num: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", fontWeight: 800, color: "rgba(59,130,246,0.25)", letterSpacing: ".04em" }}>{num}</span>
      <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "#3b82f6" }}>{label}</span>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="vg-metric">
      <p style={{ fontSize: 7, color: "#3a4560", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4, fontFamily: "var(--font-mono)" }}>{label}</p>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color, lineHeight: 1.2 }}>{value}</p>
    </div>
  );
}

function SimMetric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontSize: 7, color: "#3a4560", marginBottom: 2, fontFamily: "var(--font-mono)", letterSpacing: ".06em" }}>{label}</p>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color }}>{value}</p>
    </div>
  );
}

function ConfBadge({ quality }: { quality: "strong" | "moderate" | "weak" }) {
  const c = quality === "strong" ? "#34d399" : quality === "moderate" ? "#f59e0b" : "#ef4444";
  return (
    <span className="vg-badge" style={{ background: c + "10", border: `1px solid ${c}25`, color: c }}>
      {quality.toUpperCase()} BENCHMARK
    </span>
  );
}

function MemoBlock({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} style={{ height: 6 }} />;

        // ALL CAPS section header (4+ chars, not the title)
        if (/^[A-Z][A-Z \-—&\/0-9]+$/.test(line.trim()) && line.trim().length >= 4) {
          const isTitle = i <= 1;
          return (
            <p key={i} style={{
              fontSize: isTitle ? 13 : 9,
              fontWeight: isTitle ? 700 : 600,
              fontFamily: isTitle ? SA : MO,
              color: isTitle ? C.text1 : C.blue,
              letterSpacing: isTitle ? "-.01em" : ".08em",
              marginTop: isTitle ? 0 : 12,
              marginBottom: 4,
            }}>{line}</p>
          );
        }

        // Date line
        if (line.startsWith("Prepared:")) {
          return <p key={i} style={{ fontSize: 9, fontFamily: MO, color: C.text4, marginBottom: 8 }}>{line}</p>;
        }

        // List items
        if (/^\s*-\s/.test(line)) {
          return (
            <p key={i} style={{ fontSize: 11, color: C.text2, lineHeight: 1.5, paddingLeft: 10, borderLeft: `2px solid ${C.border}`, marginBottom: 2, marginLeft: 4 }}>
              {line.replace(/^\s*-\s*/, "")}
            </p>
          );
        }

        // Phase lines
        if (/^Phase \d/.test(line)) {
          return <p key={i} style={{ fontSize: 11, fontWeight: 600, color: C.text1, marginTop: 4, marginBottom: 2 }}>{line}</p>;
        }

        // Numbered steps
        if (/^\d+\.\s/.test(line)) {
          return (
            <p key={i} style={{ fontSize: 11, color: C.text2, lineHeight: 1.5, paddingLeft: 6, marginBottom: 2 }}>
              <span style={{ fontFamily: MO, fontWeight: 700, color: C.blueHi, marginRight: 4, fontSize: 10 }}>{line.match(/^\d+/)?.[0]}.</span>
              {line.replace(/^\d+\.\s*/, "")}
            </p>
          );
        }

        // Regular text
        return <p key={i} style={{ fontSize: 11, color: C.text2, lineHeight: 1.55, marginBottom: 2 }}>{line}</p>;
      })}
    </div>
  );
}

function PaywallBlur({ children, onAttempt, label }: { children: React.ReactNode; onAttempt: () => void; label?: string }) {
  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      {children}
      <div
        onClick={onAttempt}
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, transparent 0%, rgba(6,9,18,0.7) 20%, rgba(6,9,18,0.95) 50%, #060912 80%)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 2,
          borderRadius: "var(--r-md)",
        }}
      >
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
          padding: "20px 28px", borderRadius: 12,
          background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#3b82f6", letterSpacing: "0.02em" }}>
            {label || "Unlock Decision Pack"}
          </span>
          <span style={{ fontSize: 9, color: "#55637d" }}>
            Click to unlock full actionable intelligence
          </span>
        </div>
      </div>
    </div>
  );
}

function SignalTier({ tier, color, signals }: { tier: string; color: string; signals: any[] }) {
  const sevColors: Record<string, string> = { critical: "#ef4444", high: "#f59e0b", medium: "#d4a72c", low: "#34d399" };
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span className="vg-badge" style={{ background: color + "10", border: `1px solid ${color}25`, color }}>{tier}</span>
        <span style={{ fontSize: 10, color: "#55637d" }}>{signals.length} signal{signals.length > 1 ? "s" : ""}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {signals.map((s: any, i: number) => {
          const sc = sevColors[s.severity] || "#55637d";
          return (
            <div key={i} className="vg-inset" style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 12px" }}>
              <span className="vg-badge" style={{ background: sc + "10", border: `1px solid ${sc}25`, color: sc, flexShrink: 0, marginTop: 2 }}>
                {s.severity?.toUpperCase()}
              </span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#e4e9f4", marginBottom: 2 }}>{s.label}</p>
                <p style={{ fontSize: 11, color: "#8d9bb5", lineHeight: 1.4 }}>{s.description}</p>
                {s.impactEurRange && (
                  <p style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "#f59e0b", marginTop: 3 }}>
                    {fmt(s.impactEurRange[0])}&ndash;{fmt(s.impactEurRange[1])} &euro;/yr
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
