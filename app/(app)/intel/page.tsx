"use client";

import { useState, useCallback, useRef, useEffect, useMemo, lazy, Suspense } from "react";
import { useI18n } from "@/lib/i18n";
import { trackEvent, trackCheckoutStarted, trackReturnVisit, setSignalContext, EVENTS } from "@/lib/events";

const DecisionPackTeaser = lazy(() => import("@/components/ui/decision-pack-teaser").then(m => ({ default: m.DecisionPackTeaser })));

/**
 * GHOST TAX — FREE EXPOSURE SCAN
 *
 * The conversion-critical page: free scan to paid Decision Pack.
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
  bg:      "#FFFFFF",
  surface: "#F8FAFC",
  panel:   "#FFFFFF",
  inset:   "#F1F5F9",
  raised:  "#E2E8F0",
  border:  "#E2E8F0",
  borderS: "#CBD5E1",
  text1:   "#0F172A",
  text2:   "#475569",
  text3:   "#64748B",
  text4:   "#94A3B8",
  green:   "#059669",
  amber:   "#3b82f6",
  red:     "#DC2626",
  blue:    "#0F172A",
  blueHi:  "#1E293B",
  cyan:    "#0891B2",
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

function confLabel(v: number, t: (k: string) => string): string {
  return v >= 60 ? t("intel.conf.strong") : v >= 35 ? t("intel.conf.moderate") : t("intel.conf.directional");
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
  const [phaseHistory, setPhaseHistory] = useState<string[]>([]);
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
            setPhaseHistory((prev) => prev.includes(parsed.phase) ? prev : [...prev, parsed.phase]);
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
    setPhaseHistory([]);
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
          corporate_id: "",
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

  // Scroll to results once when the first data arrives, not on every phase
  const hasScrolledToResults = useRef(false);
  useEffect(() => {
    if (currentPhase && resultsRef.current && !hasScrolledToResults.current) {
      hasScrolledToResults.current = true;
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    // Reset on new scan
    if (!currentPhase) hasScrolledToResults.current = false;
  }, [currentPhase]);

  const handleCheckout = useCallback(async () => {
    setCheckoutLoading(true);
    trackCheckoutStarted({ domain });
    try {
      const params = new URLSearchParams({
        rail: "A",
        locale,
        ...(domain && { domain }),
        ...(email.trim() && { email: email.trim() }),
        ...(phases.context?.name && { company: phases.context.name }),
      });
      window.location.href = `/checkout?${params.toString()}`;
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

        {/* ── Header ────────────────────── */}
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <p style={{ fontSize: 11, fontFamily: MO, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: C.blue, marginBottom: 10 }}>
            {t("intel.title")}
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.25, marginBottom: 10, color: C.text1, letterSpacing: "-0.02em" }}>
            {t("intel.subtitle.value")}
          </h1>
          <p style={{ fontSize: 13, color: C.text3, lineHeight: 1.55, maxWidth: 580, margin: "0 auto 14px" }}>
            {t("intel.subtitle")}
          </p>
          {/* Social proof bar */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 99, background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.12)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, display: "inline-block", flexShrink: 0, animation: "vg-exposure-pulse 2s ease-in-out infinite" }} />
            <span style={{ fontSize: 11, fontFamily: SA, color: C.green, fontWeight: 500 }}>
              {t("intel.trust.statsBar")}
            </span>
          </div>
        </div>

        {/* ── Scan Form ──────────────────────── */}
        <div className="gt-card" style={{ padding: "28px 24px", marginBottom: 20, borderRadius: 16, background: "#FFFFFF", border: `1px solid ${C.borderS}`, position: "relative" }}>
          {running && (
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, overflow: "hidden", borderRadius: "16px 16px 0 0" }}>
              <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${C.blue}, transparent)`, animation: "vg-scan 2s linear infinite" }} />
            </div>
          )}

          {/* Domain field — primary, always visible */}
          <div style={{ marginBottom: 14 }}>
            <FieldLabel>{t("intel.field.domain")}</FieldLabel>
            <input
              type="text" value={domain} onChange={(e) => setDomain(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runAnalysis()}
              placeholder={locale === "fr" ? "votre-entreprise.com" : locale === "de" ? "ihr-unternehmen.de" : "your-company.com"}
              disabled={running}
              className="gt-input"
              style={{ fontSize: 17, padding: "15px 16px", fontFamily: MO }}
              autoFocus
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {/* Honeypot — invisible to humans, bots auto-fill it */}
          <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: "-9999px", opacity: 0, height: 0, overflow: "hidden", tabIndex: -1 } as React.CSSProperties}>
            <label htmlFor="corporate_id">Corporate ID</label>
            <input type="text" id="corporate_id" name="corporate_id" autoComplete="off" tabIndex={-1} />
          </div>

          {/* Primary CTA */}
          <button onClick={runAnalysis} disabled={!domain.trim() || running}
            className="gt-btn-primary"
            style={{
              width: "100%", padding: "18px 28px", borderRadius: 12, border: "none",
              background: running ? "#94A3B8" : `linear-gradient(135deg, ${C.blue} 0%, #1E293B 100%)`,
              color: "#fff",
              fontSize: 15, fontWeight: 800, fontFamily: SA,
              letterSpacing: ".04em", textTransform: "uppercase",
              cursor: running ? "wait" : (!domain.trim() ? "not-allowed" : "pointer"),
              opacity: !domain.trim() && !running ? 0.45 : 1,
              transition: "all 150ms ease",
              boxShadow: running ? "none" : "0 1px 3px rgba(0,0,0,0.06)",
              animation: running ? "vg-pulse 1.5s ease-in-out infinite" : "none",
            }}>
            {running
              ? t("intel.btn.running")
              : t("intel.btn.run")}
          </button>
          {/* Value sub-label */}
          {!running && (
            <p style={{ textAlign: "center", fontSize: 11, color: C.text4, marginTop: 8, fontFamily: SA }}>
              {t("intel.btn.subLabel")}
            </p>
          )}

          {/* Trust signals */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginTop: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontFamily: SA, color: C.text3, display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ color: C.green }}>&#x2713;</span> {t("intel.trust.free")}
            </span>
            <span style={{ fontSize: 11, fontFamily: SA, color: C.text3, display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ color: C.green }}>&#x2713;</span> {t("intel.trust.noAccess")}
            </span>
            <span style={{ fontSize: 11, fontFamily: SA, color: C.text3, display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ color: C.green }}>&#x2713;</span> {t("intel.trust.time")}
            </span>
          </div>

          {/* Email capture — visible by default for lead generation */}
          <div style={{ marginTop: 18 }}>
            <div style={{ marginBottom: 12 }}>
              <FieldLabel>{t("intel.field.emailCta") || "Where should we send your detailed results?"}</FieldLabel>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="cfo@acme.com" disabled={running}
                className="gt-input"
                style={{ width: "100%" }}
              />
            </div>
          </div>

          {/* Collapsible optional fields */}
          <details style={{ marginTop: 10 }}>
            <summary style={{ fontSize: 12, fontFamily: SA, color: C.text2, cursor: "pointer", userSelect: "none", listStyle: "none", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, color: C.text4, transition: "transform 150ms" }}>&#9654;</span>
              {t("intel.form.improve")}
            </summary>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
              <div>
                <FieldLabel>{t("intel.field.headcount")}</FieldLabel>
                <input type="number" value={headcount} onChange={(e) => setHeadcount(e.target.value)} placeholder="120" disabled={running} className="gt-input" />
              </div>
              <div>
                <FieldLabel>{t("intel.field.spend")}</FieldLabel>
                <input type="number" value={monthlySpend} onChange={(e) => setMonthlySpend(e.target.value)} placeholder="40000" disabled={running} className="gt-input" />
              </div>
              <div>
                <FieldLabel>{t("intel.field.industry")}</FieldLabel>
                <select value={industry} onChange={(e) => setIndustry(e.target.value)} disabled={running}
                  className="gt-input" style={{ color: industry ? C.text1 : C.text4 }}>
                  <option value="">{t("intel.field.industry.select")}</option>
                  <option value="Technology / SaaS">{t("intel.field.industry.tech")}</option>
                  <option value="Financial Services">{t("intel.field.industry.finance")}</option>
                  <option value="Healthcare">{t("intel.field.industry.health")}</option>
                  <option value="Retail & E-commerce">{t("intel.field.industry.retail")}</option>
                  <option value="Manufacturing">{t("intel.field.industry.manufacturing")}</option>
                  <option value="Media & Advertising">{t("intel.field.industry.media")}</option>
                  <option value="Professional Services">{t("intel.field.industry.services")}</option>
                  <option value="Automotive">{t("intel.field.industry.automotive")}</option>
                  <option value="Pharma & Life Sciences">{t("intel.field.industry.pharma")}</option>
                  <option value="Other">{t("intel.field.industry.other")}</option>
                </select>
              </div>
            </div>
          </details>
        </div>

        {/* ── Error ──────────────────────────────── */}
        {error && (
          <div className="vg-panel vg-layer-in" style={{ padding: "16px 20px", marginBottom: 16, borderRadius: 12, border: `1px solid rgba(239,68,68,0.20)`, background: "rgba(239,68,68,0.04)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.20)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.red, marginBottom: 4 }}>{t("intel.error.title")}</p>
                <p style={{ fontSize: 12, color: C.text3, lineHeight: 1.5, marginBottom: 10 }}>{error}</p>
                <button
                  onClick={() => { setError(null); }}
                  style={{ fontSize: 11, fontFamily: MO, fontWeight: 600, color: C.blueHi, background: "none", border: `1px solid rgba(59,130,246,0.20)`, borderRadius: 6, padding: "5px 12px", cursor: "pointer" }}>
                  {t("intel.error.retry")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Results ────────────────────────────── */}
        <div ref={resultsRef}>

          {/* Loading state — phases progression */}
          {running && (
            <ScanProgressIndicator
              currentPhase={currentPhase}
              phaseHistory={phaseHistory}
              domain={domain}
              locale={locale}
              t={t}
            />
          )}

          {/* ═══════════════════════════════════════
              SECTION 1: EXECUTIVE SNAPSHOT BAR
              ═══════════════════════════════════════ */}

          {phases.executiveSnapshot && (
            <Panel className="vg-panel--signal-red vg-layer-in" depth={0}>
              <LayerLabel num="00" label={t("intel.section.executiveSnapshot")} />
              <p style={{ fontSize: 15, fontWeight: 600, color: C.text1, lineHeight: 1.55, marginBottom: 20, fontFamily: SA }}>
                {phases.executiveSnapshot.diagnosisSummary}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 14 }}>
                <div style={{ padding: "16px 14px", borderRadius: 12, background: "rgba(239,68,68,0.04)", border: `1px solid rgba(239,68,68,0.12)`, textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                  <p style={{ fontSize: 9, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 8 }}>{t("intel.metric.exposureRange")}</p>
                  <p className="vg-countup" style={{ fontFamily: MO, fontSize: 20, fontWeight: 800, color: C.red, lineHeight: 1 }}>
                    {fmt(phases.executiveSnapshot.exposureRangeEur[0])}&ndash;{fmt(phases.executiveSnapshot.exposureRangeEur[1])}
                  </p>
                  <p style={{ fontSize: 9, color: C.text4, marginTop: 4, fontFamily: MO }}>&euro;/yr</p>
                </div>
                <div style={{ padding: "16px 14px", borderRadius: 12, background: "rgba(52,211,153,0.04)", border: `1px solid rgba(52,211,153,0.12)`, textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                  <p style={{ fontSize: 9, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 8 }}>{t("intel.metric.ninetyDayRecoverable")}</p>
                  <p className="vg-countup vg-delay-1" style={{ fontFamily: MO, fontSize: 20, fontWeight: 800, color: C.green, lineHeight: 1 }}>
                    {fmt(phases.executiveSnapshot.ninetyDayRecoverableEur[0])}&ndash;{fmt(phases.executiveSnapshot.ninetyDayRecoverableEur[1])}
                  </p>
                  <p style={{ fontSize: 9, color: C.text4, marginTop: 4, fontFamily: MO }}>&euro;</p>
                </div>
                <div style={{ padding: "16px 14px", borderRadius: 12, background: "rgba(59,130,246,0.04)", border: `1px solid rgba(59,130,246,0.12)`, textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                  <p style={{ fontSize: 9, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 8 }}>{t("intel.metric.timeToImpact")}</p>
                  <p className="vg-countup vg-delay-2" style={{ fontFamily: MO, fontSize: 20, fontWeight: 800, color: phases.executiveSnapshot.timeToImpactDays <= 30 ? C.red : phases.executiveSnapshot.timeToImpactDays <= 60 ? C.amber : C.blueHi, lineHeight: 1 }}>
                    {phases.executiveSnapshot.timeToImpactDays}d
                  </p>
                </div>
                <div style={{ padding: "16px 14px", borderRadius: 12, background: "rgba(59,130,246,0.04)", border: `1px solid rgba(59,130,246,0.12)`, textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                  <p style={{ fontSize: 9, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 8 }}>{t("intel.metric.confidence")}</p>
                  <p className="vg-countup vg-delay-3" style={{ fontFamily: MO, fontSize: 14, fontWeight: 700, color: signalColor(phases.executiveSnapshot.pressureScore, 50, 30), lineHeight: 1 }}>
                    {phases.executiveSnapshot.confidenceRange}
                  </p>
                </div>
                <div style={{ padding: "16px 14px", borderRadius: 12, background: "rgba(59,130,246,0.04)", border: `1px solid rgba(59,130,246,0.12)`, textAlign: "center" }}>
                  <p style={{ fontSize: 9, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 8 }}>{t("intel.metric.recommendedPath")}</p>
                  <p className="vg-countup vg-delay-4" style={{ fontFamily: SA, fontSize: 12, fontWeight: 700, color: C.blueHi, lineHeight: 1.3 }}>
                    {phases.executiveSnapshot.recommendedActionPath}
                  </p>
                </div>
                <div style={{ padding: "16px 14px", borderRadius: 12, background: "rgba(59,130,246,0.04)", border: `1px solid rgba(59,130,246,0.12)`, textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                  <p style={{ fontSize: 9, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 8 }}>{t("intel.metric.pressure")}</p>
                  <p className="vg-countup vg-delay-5" style={{ fontFamily: MO, fontSize: 20, fontWeight: 800, color: signalColor(100 - phases.executiveSnapshot.pressureScore), lineHeight: 1 }}>
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
              <LayerLabel num="01" label={t("intel.section.financialImpact")} />
              <p style={{ fontSize: 12, color: C.text3, lineHeight: 1.5, marginBottom: 14 }}>
                {t("intel.desc.financialImpact")}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
                {([
                  { label: t("intel.metric.annual"), low: phases.exposure.lowEur, high: phases.exposure.highEur, suffix: "/yr" },
                  { label: t("intel.metric.quarterly"), low: Math.round(phases.exposure.lowEur / 4), high: Math.round(phases.exposure.highEur / 4), suffix: "/qtr" },
                  { label: t("intel.metric.monthly"), low: phases.lossVelocity.monthlyLossEur[0], high: phases.lossVelocity.monthlyLossEur[1], suffix: "/mo" },
                  { label: t("intel.metric.daily"), low: phases.lossVelocity.dailyLossEur[0], high: phases.lossVelocity.dailyLossEur[1], suffix: "/day" },
                ]).map((tier, i) => (
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
              <LayerLabel num="02" label={t("intel.section.exposureAnalysis")} />
              <p style={{ fontSize: 12, color: C.text2, lineHeight: 1.5, marginBottom: 14 }}>{phases.diagnosis.expanded}</p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div className="vg-exposure-hot" style={{ padding: 18, borderRadius: "var(--r-lg)", background: "rgba(239,68,68,0.03)", border: "1px solid rgba(239,68,68,0.12)", textAlign: "center" }}>
                  <p style={{ fontSize: 9, fontFamily: MO, color: C.text3, letterSpacing: ".08em", marginBottom: 6 }}>{t("intel.metric.annualExposure")}</p>
                  <p className="vg-countup" style={{ fontFamily: MO, fontSize: 32, fontWeight: 900, color: C.red, lineHeight: 1, letterSpacing: "-.02em" }}>
                    {fmt(phases.exposure.lowEur)}&ndash;{fmt(phases.exposure.highEur)}
                  </p>
                  <p style={{ fontSize: 10, color: C.text4, marginTop: 4, fontFamily: MO }}>&euro;/yr</p>
                </div>
                <div style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: 8 }}>
                  <Metric label={t("intel.metric.confidence")} value={`${phases.exposure.confidence}/100`} color={signalColor(phases.exposure.confidence)} />
                  <Metric label={t("intel.metric.timeToImpact")} value={`${phases.exposure.timeToImpactDays}d`} color={phases.exposure.timeToImpactDays <= 30 ? C.red : phases.exposure.timeToImpactDays <= 60 ? C.amber : C.blueHi} />
                </div>
              </div>

              {phases.exposure.ninetyDayRecoverableEur && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: "var(--r-md)", background: "rgba(52,211,153,0.03)", border: "1px solid rgba(52,211,153,0.10)", marginBottom: 12 }}>
                  <span style={{ fontSize: 11, color: C.text2 }}>{t("intel.desc.ninetyDayRecoverable")}</span>
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
              <LayerLabel num="02b" label={t("intel.section.lossVelocity")} />
              {phases.lossVelocity.softened && (
                <p style={{ fontSize: 10, color: C.amber, marginBottom: 10, fontFamily: MO, letterSpacing: ".02em" }}>
                  {t("intel.desc.lossVelocityWarning")}
                </p>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 6 }}>
                {([{ label: t("intel.metric.daily"), key: "dailyLossEur" }, { label: t("intel.metric.weekly"), key: "weeklyLossEur" }, { label: t("intel.metric.monthly"), key: "monthlyLossEur" }, { label: t("intel.metric.yearly"), key: "yearlyLossEur" }]).map((period, i) => {
                  const range = phases.lossVelocity[period.key];
                  return (
                    <div key={period.key} className={`vg-metric vg-countup vg-delay-${i + 1}`} style={{ background: "rgba(239,68,68,0.02)", borderColor: "rgba(239,68,68,0.08)" }}>
                      <p style={{ fontSize: 7, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 4 }}>{period.label}</p>
                      <p style={{ fontFamily: MO, fontSize: 14, fontWeight: 700, color: phases.lossVelocity.softened ? C.amber : C.red, lineHeight: 1.2 }}>
                        {phases.lossVelocity.softened ? "~" : ""}{fmt(range[0])}&ndash;{fmt(range[1])}
                      </p>
                      <p style={{ fontSize: 7, color: C.text4, marginTop: 2, fontFamily: MO }}>&euro;</p>
                    </div>
                  );
                })}
              </div>
              <p style={{ fontSize: 9, fontFamily: MO, color: C.text4, marginTop: 8, textAlign: "center" }}>
                {t("intel.desc.lossVelocityConfidence")} {phases.lossVelocity.confidence}/100
              </p>
            </Panel>
          )}

          {/* ═══ COST OF DELAY ═══ */}

          {phases.costOfDelay && (
            <Panel className="vg-panel--signal-red vg-layer-in" depth={2}
              onVisible={() => trackEvent(EVENTS.INTEL_COST_OF_DELAY_VIEWED)}>
              <LayerLabel num="02c" label={t("intel.section.costOfDelay")} />
              <p style={{ fontSize: 12, color: C.text3, lineHeight: 1.5, marginBottom: 14 }}>
                {t("intel.desc.costOfDelay")}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                <div style={{ padding: "14px 12px", borderRadius: "var(--r-lg)", background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)", textAlign: "center" }}>
                  <p style={{ fontSize: 7, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 6 }}>{t("intel.metric.everyDay")}</p>
                  <p style={{ fontFamily: MO, fontSize: 22, fontWeight: 900, color: C.red, lineHeight: 1 }}>
                    {fmt(phases.costOfDelay.dailyCostOfDelay[0])}&ndash;{fmt(phases.costOfDelay.dailyCostOfDelay[1])}
                  </p>
                  <p style={{ fontSize: 8, color: C.red, marginTop: 4, fontFamily: MO }}>{t("intel.costOfDelay.eurDayLost")}</p>
                </div>
                <div style={{ padding: "14px 12px", borderRadius: "var(--r-lg)", background: "rgba(59,130,246,0.03)", border: "1px solid rgba(59,130,246,0.10)", textAlign: "center" }}>
                  <p style={{ fontSize: 7, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 6 }}>{t("intel.metric.everyMonth")}</p>
                  <p style={{ fontFamily: MO, fontSize: 18, fontWeight: 800, color: C.amber, lineHeight: 1 }}>
                    {fmt(phases.costOfDelay.monthlyCostOfDelay[0])}&ndash;{fmt(phases.costOfDelay.monthlyCostOfDelay[1])}
                  </p>
                  <p style={{ fontSize: 8, color: C.text4, marginTop: 4, fontFamily: MO }}>{t("intel.costOfDelay.eurMoLost")}</p>
                </div>
                <div style={{ padding: "14px 12px", borderRadius: "var(--r-lg)", background: "rgba(59,130,246,0.03)", border: "1px solid rgba(59,130,246,0.10)", textAlign: "center" }}>
                  <p style={{ fontSize: 7, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 6 }}>{t("intel.metric.ninetyDayProjection")}</p>
                  <p style={{ fontFamily: MO, fontSize: 18, fontWeight: 800, color: C.amber, lineHeight: 1 }}>
                    {fmt(phases.costOfDelay.projectedDelayLoss90[0])}&ndash;{fmt(phases.costOfDelay.projectedDelayLoss90[1])}
                  </p>
                  <p style={{ fontSize: 8, color: C.text4, marginTop: 4, fontFamily: MO }}>{t("intel.costOfDelay.eurProjectedLoss")}</p>
                </div>
              </div>
              {phases.costOfDelay.readinessMultiplier > 1.1 && (
                <p style={{ fontSize: 10, fontFamily: MO, color: C.amber, letterSpacing: ".02em" }}>
                  {t("intel.desc.costOfDelayReadiness")} {Math.round((phases.costOfDelay.readinessMultiplier - 1) * 100)}%.
                </p>
              )}
            </Panel>
          )}

          {/* ═══ SECTION 4: PROOF ENGINE ═══ */}

          {phases.proofEngine && (
            <Panel className="vg-layer-in" depth={3}
              onVisible={() => trackEvent(EVENTS.INTEL_PROOF_LAYER_VIEWED)}>
              <LayerLabel num="03" label={t("intel.section.proofEngine")} />
              <p style={{ fontSize: 12, color: C.text3, lineHeight: 1.5, marginBottom: 14 }}>
                {phases.proofEngine.summary}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                {[
                  { label: t("intel.proof.evidenceDensity"), value: phases.proofEngine.signalDensity, desc: t("intel.proof.evidenceDensityDesc") },
                  { label: t("intel.proof.patternCoverage"), value: phases.proofEngine.patternCoverage, desc: t("intel.proof.patternCoverageDesc") },
                  { label: t("intel.proof.benchmarkReliability"), value: phases.proofEngine.benchmarkConfidence, desc: t("intel.proof.benchmarkReliabilityDesc") },
                  { label: t("intel.proof.detectionScope"), value: phases.proofEngine.detectionScope, desc: t("intel.proof.detectionScopeDesc") },
                  { label: t("intel.proof.modelSupport"), value: phases.proofEngine.modelSupportLevel, desc: t("intel.proof.modelSupportDesc") },
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
                  {phases.proofEngine.evidenceStrength.toUpperCase()} {t("intel.proof.evidence")}
                </span>
                <span style={{ fontSize: 10, color: C.text4 }}>{t("intel.proof.evidenceClassification")}</span>
              </div>
            </Panel>
          )}

          {/* ═══ SIGNAL DETAIL (PROOF ARCHITECTURE) ═══ */}

          {phases.proof && (
            <Panel className="vg-layer-in vg-delay-2" depth={3}>
              <LayerLabel num="03b" label={t("intel.section.signalDetail")} />
              <p style={{ fontSize: 11, color: C.text4, marginBottom: 12 }}>{phases.proof.methodologySummary}</p>
              {phases.proof.observedSignals?.length > 0 && <SignalTier tier="OBSERVED" color={C.green} signals={phases.proof.observedSignals} />}
              {phases.proof.inferredSignals?.length > 0 && <SignalTier tier="INFERRED" color={C.blueHi} signals={phases.proof.inferredSignals} />}
              {phases.proof.estimatedSignals?.length > 0 && <SignalTier tier="ESTIMATED" color={C.amber} signals={phases.proof.estimatedSignals} />}

              {phases.proof.confidenceDrivers?.length > 0 && (
                <div className="vg-inset" style={{ marginTop: 12, padding: "10px 14px" }}>
                  <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".06em", marginBottom: 6 }}>{t("intel.proof.confidenceDrivers")}</p>
                  {phases.proof.confidenceDrivers.map((d: string, i: number) => (
                    <p key={i} style={{ fontSize: 11, color: C.text2, lineHeight: 1.5, marginBottom: 2 }}>{d}</p>
                  ))}
                </div>
              )}
              {phases.proof.boundaries?.length > 0 && (
                <div style={{ marginTop: 8, padding: "10px 14px", borderRadius: "var(--r-md)", background: "rgba(239,68,68,0.02)", border: "1px solid rgba(239,68,68,0.06)" }}>
                  <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".06em", marginBottom: 6 }}>{t("intel.proof.boundaries")}</p>
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
              <LayerLabel num="03c" label={t("intel.section.marketMemory")} />
              <p style={{ fontSize: 12, color: C.text3, lineHeight: 1.5, marginBottom: 14 }}>
                {phases.marketMemory.supportSummary}
              </p>

              {/* Baseline */}
              {phases.marketMemory.baseline && (
                <div className="vg-inset" style={{ padding: "12px 14px", marginBottom: 12 }}>
                  <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 6 }}>{t("intel.market.industryBaseline")}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    <div>
                      <p style={{ fontSize: 8, color: C.text4, fontFamily: MO, marginBottom: 2 }}>{t("intel.market.spendPerEmployee")}</p>
                      <p style={{ fontFamily: MO, fontSize: 13, fontWeight: 700, color: C.text1 }}>
                        {fmt(phases.marketMemory.baseline.medianSpendPerEmployee[0])}&ndash;{fmt(phases.marketMemory.baseline.medianSpendPerEmployee[1])} &euro;
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: 8, color: C.text4, fontFamily: MO, marginBottom: 2 }}>{t("intel.market.exposureRate")}</p>
                      <p style={{ fontFamily: MO, fontSize: 13, fontWeight: 700, color: C.amber }}>
                        {phases.marketMemory.baseline.medianExposurePercent[0]}&ndash;{phases.marketMemory.baseline.medianExposurePercent[1]}%
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: 8, color: C.text4, fontFamily: MO, marginBottom: 2 }}>{t("intel.metric.confidence")}</p>
                      <p style={{ fontFamily: MO, fontSize: 13, fontWeight: 700, color: signalColor(phases.marketMemory.baseline.confidence) }}>
                        {phases.marketMemory.baseline.confidence}/100
                      </p>
                    </div>
                  </div>
                  {phases.marketMemory.baseline.commonVendorPatterns?.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, marginBottom: 4 }}>{t("intel.market.commonPatterns")}</p>
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
                  <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".06em", marginBottom: 6 }}>{t("intel.market.vendorReferences")}</p>
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
                  <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".06em", marginBottom: 6 }}>{t("intel.market.exposurePatternMatches")}</p>
                  {phases.marketMemory.exposureClusters.map((ec: any, i: number) => (
                    <div key={i} style={{ padding: "8px 12px", borderRadius: "var(--r-md)", background: "rgba(59,130,246,0.02)", border: "1px solid rgba(59,130,246,0.08)", marginBottom: 4 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: C.text1 }}>{ec.clusterLabel}</span>
                        <span style={{ fontSize: 9, fontFamily: MO, color: C.text4 }}>{Math.round(ec.similarity * 100)}% match | {ec.observedFrequency}</span>
                      </div>
                      <p style={{ fontSize: 10, color: C.text3, lineHeight: 1.4 }}>{t("intel.market.typicalCorrection")} {ec.typicalCorrectionPath}</p>
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
                  {phases.marketMemory.memoryDepth.toUpperCase()} {t("intel.market.memory")}
                </span>
                <span style={{ fontSize: 9, fontFamily: MO, color: C.text4 }}>conf {phases.marketMemory.memoryConfidence}/100</span>
              </div>
            </Panel>
          )}

          {/* ═══ SECTION 4: BENCHMARK POSITION ═══ */}

          {phases.peerComparison && (
            <Panel className="vg-layer-in vg-delay-3" depth={4}>
              <LayerLabel num="04" label={t("intel.section.benchmarkPosition")} />
              {phases.peerComparison.insufficientBenchmark ? (
                <div className="vg-inset" style={{ padding: "14px 16px" }}>
                  <p style={{ fontSize: 12, color: C.amber, fontWeight: 600 }}>{t("intel.desc.benchmarkInsufficient")}</p>
                  <p style={{ fontSize: 11, color: C.text4, marginTop: 4 }}>{t("intel.desc.benchmarkProvide")}</p>
                </div>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                    <div className="vg-metric vg-countup">
                      <p style={{ fontSize: 7, color: C.text4, letterSpacing: ".08em", marginBottom: 4 }}>{t("intel.metric.yourPercentile")}</p>
                      <p style={{ fontFamily: MO, fontSize: 28, fontWeight: 800, color: signalColor(100 - (phases.peerComparison.efficiencyPercentile ?? 50)), lineHeight: 1 }}>
                        P{phases.peerComparison.efficiencyPercentile}
                      </p>
                      <p style={{ fontSize: 8, color: C.text4, marginTop: 3 }}>{t("intel.desc.higherWorse")}</p>
                    </div>
                    <Metric label={t("intel.metric.categoryMedian")} value={`${fmt(phases.peerComparison.categoryMedianExposureEur)} \u20ac`} color={C.text2} />
                    <Metric label={t("intel.metric.topQuartile")} value={`${fmt(phases.peerComparison.categoryTopQuartileExposureEur)} \u20ac`} color={C.green} />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div className="vg-conf-track" style={{ height: 5 }}>
                      <div className="vg-conf-fill vg-bar-grow" style={{ width: `${Math.min(95, phases.peerComparison.efficiencyPercentile ?? 0)}%`, background: `linear-gradient(90deg, ${C.green}, ${C.amber}, ${C.red})` }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                      <span style={{ fontSize: 7, fontFamily: MO, color: C.green }}>{t("intel.benchmark.top10")}</span>
                      <span style={{ fontSize: 7, fontFamily: MO, color: C.text4 }}>{t("intel.benchmark.p50")}</span>
                      <span style={{ fontSize: 7, fontFamily: MO, color: C.red }}>{t("intel.benchmark.bottom10")}</span>
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
              <LayerLabel num="04b" label={t("intel.section.costDriftPressure")} />
              <p style={{ fontSize: 12, color: C.text3, lineHeight: 1.5, marginBottom: 14 }}>
                {phases.driftMonitor.pressureSummary}
              </p>

              {/* Overall drift score */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                <div className="vg-metric vg-countup" style={{ borderColor: signalColor(100 - phases.driftMonitor.overallDriftScore) + "18" }}>
                  <p style={{ fontSize: 7, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 4 }}>{t("intel.metric.driftScore")}</p>
                  <p style={{ fontFamily: MO, fontSize: 24, fontWeight: 800, color: signalColor(100 - phases.driftMonitor.overallDriftScore), lineHeight: 1 }}>
                    {phases.driftMonitor.overallDriftScore}
                  </p>
                  <p style={{ fontSize: 7, color: C.text4, marginTop: 3 }}>/100</p>
                </div>
                <Metric label={t("intel.metric.direction")} value={phases.driftMonitor.driftDirection.toUpperCase()} color={phases.driftMonitor.driftDirection === "worsening" ? C.red : phases.driftMonitor.driftDirection === "improving" ? C.green : C.amber} />
                <Metric label={t("intel.metric.confidence")} value={`${phases.driftMonitor.driftConfidence}/100`} color={signalColor(phases.driftMonitor.driftConfidence)} />
              </div>

              {/* Vendor drifts */}
              {phases.driftMonitor.vendorDrifts?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".06em", marginBottom: 6 }}>{t("intel.drift.vendorPricingDrift")}</p>
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
                  <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".06em", marginBottom: 6 }}>{t("intel.drift.categoryCostDrift")}</p>
                  {phases.driftMonitor.categoryDrifts.slice(0, 3).map((cd: any, i: number) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 50px 1fr", gap: 6, padding: "8px 12px", borderRadius: "var(--r-md)", background: "rgba(59,130,246,0.02)", border: "1px solid rgba(59,130,246,0.08)", marginBottom: 3, alignItems: "center" }}>
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
                  <p style={{ fontSize: 8, fontFamily: MO, color: C.red, letterSpacing: ".08em", marginBottom: 4 }}>{t("intel.drift.windowCompression")}</p>
                  <p style={{ fontSize: 12, color: C.text1, fontWeight: 600 }}>
                    {t("intel.drift.windowCompressedBy")} {phases.driftMonitor.windowCompression.compressionDays}d ({phases.driftMonitor.windowCompression.originalWindowDays}d &rarr; {phases.driftMonitor.windowCompression.compressedWindowDays}d)
                  </p>
                  {phases.driftMonitor.windowCompression.compressionDrivers?.map((d: string, i: number) => (
                    <p key={i} style={{ fontSize: 10, color: C.text3, lineHeight: 1.4, marginTop: 2 }}>{d}</p>
                  ))}
                </div>
              )}
            </Panel>
          )}

          {/* ── Mid-funnel CTA 1: After benchmark/drift ── */}
          {!unlocked && (phases.peerComparison || phases.driftMonitor) && (
            <div style={{ padding: "14px 18px", borderRadius: "var(--r-md)", background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.12)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <p style={{ fontSize: 12, color: C.text2, lineHeight: 1.5, flex: 1 }}>{t("intel.cta.mid1.title")}</p>
              <button onClick={() => { trackEvent(EVENTS.INTEL_RECOMMENDED_ACTION_CLICKED, { section: "mid_cta_1" }); handleCheckout(); }} style={{ padding: "8px 16px", borderRadius: "var(--r-sm)", background: "rgba(59,130,246,0.10)", border: "1px solid rgba(59,130,246,0.20)", color: C.blueHi, fontSize: 11, fontFamily: MO, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", transition: "background 0.15s" }}>{t("intel.cta.mid1.btn")} &rarr;</button>
            </div>
          )}

          {/* ═══ SECTION 5: CAUSAL LEVER MAP ═══ */}

          {phases.causalGraph && phases.causalGraph.propagationChain?.length > 0 && (
            <Panel className="vg-panel--signal vg-layer-in vg-delay-4" depth={5}>
              <LayerLabel num="05" label={t("intel.section.causalLeverMap")} />
              <p style={{ fontSize: 12, color: C.text3, lineHeight: 1.5, marginBottom: 12 }}>
                {t("intel.desc.causalLeverMap")}
              </p>

              {/* Dominant cause */}
              <div className="vg-inset" style={{ padding: "12px 14px", marginBottom: 14 }}>
                <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 4 }}>{t("intel.causal.dominantCause")}</p>
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
                  <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".06em", marginBottom: 6 }}>{t("intel.causal.secondaryCauses")}</p>
                  {phases.causalGraph.secondaryCauses.map((c: string, i: number) => (
                    <p key={i} style={{ fontSize: 11, color: C.text2, padding: "5px 10px", borderRadius: "var(--r-xs)", background: "#F1F5F9", marginBottom: 3 }}>{c}</p>
                  ))}
                </div>
              )}

              {/* Leverage points */}
              {phases.causalGraph.leveragePoints?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".06em", marginBottom: 6 }}>{t("intel.causal.leveragePoints")}</p>
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
                    {causalExpanded ? "\u25BC" : "\u25B6"} {t("intel.causal.correctionOrder")}
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
              <LayerLabel num="06" label={t("intel.section.actionScenarios")} />
              <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
                {(["conservative", "base", "aggressive"] as const).map((key) => (
                  <button key={key} onClick={() => { setActiveTab(key); trackEvent(EVENTS.INTEL_SCENARIO_SWITCHED, { scenario: key }); }}
                    className={`vg-tab ${activeTab === key ? "vg-tab--active" : ""}`}
                    style={{ flex: 1 }}>
                    {key === "conservative" ? t("intel.scenario.conservative") : key === "base" ? t("intel.scenario.base") : t("intel.scenario.aggressive")}
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
                          {t("intel.scenario.payback")} {sc.paybackMonths}mo | {t("intel.scenario.disruption")} {sc.disruption}
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
              <LayerLabel num="07" label={t("intel.section.decisionSimulator")} />
              <p style={{ fontSize: 12, color: C.text3, lineHeight: 1.5, marginBottom: 6 }}>
                {t("intel.desc.decisionSimulator")}
              </p>
              {phases.confidenceModel && phases.confidenceModel.simulationConfidence < 40 && (
                <p style={{ fontSize: 10, color: C.amber, fontFamily: MO, marginBottom: 12, letterSpacing: ".02em" }}>
                  {t("intel.desc.lossVelocityConfidence")} {confLabel(phases.confidenceModel.simulationConfidence, t)}. {t("intel.desc.simulatorDirectional")}
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
                      <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 8 }}>{t("intel.simulator.currentState")}</p>
                      <p style={{ fontFamily: MO, fontSize: 20, fontWeight: 800, color: C.red, lineHeight: 1, marginBottom: 6 }}>
                        {fmt(phases.counterfactual.baselineExposure[0])}&ndash;{fmt(phases.counterfactual.baselineExposure[1])}
                      </p>
                      <p style={{ fontSize: 8, fontFamily: MO, color: C.text4 }}>&euro;/yr exposure</p>
                      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                        <SimMetric label={t("intel.simulator.dailyLeakage")} value={`${fmt(simulated.baselineDailyLeakage[0])}–${fmt(simulated.baselineDailyLeakage[1])} €`} color={C.red} />
                        <SimMetric label={t("intel.metric.pressure")} value={`${phases.counterfactual.baselinePressure}/100`} color={signalColor(100 - phases.counterfactual.baselinePressure)} />
                        <SimMetric label={t("intel.simulator.recovery")} value={`${phases.counterfactual.baselineRecoveryDays}d`} color={C.text2} />
                      </div>
                    </div>
                    <div className="vg-compare-divider" />
                    <div className="vg-compare-side vg-compare-simulated">
                      <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 8 }}>{t("intel.simulator.simulatedState")}</p>
                      <p style={{ fontFamily: MO, fontSize: 20, fontWeight: 800, color: C.green, lineHeight: 1, marginBottom: 6 }}>
                        {fmt(simulated.adjustedExposure[0])}&ndash;{fmt(simulated.adjustedExposure[1])}
                      </p>
                      <p style={{ fontSize: 8, fontFamily: MO, color: C.text4 }}>&euro;/yr exposure</p>
                      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                        <SimMetric label={t("intel.simulator.dailyLeakage")} value={`${fmt(simulated.adjustedDailyLeakage[0])}–${fmt(simulated.adjustedDailyLeakage[1])} €`} color={C.green} />
                        <SimMetric label={t("intel.metric.pressure")} value={`${simulated.adjustedPressure}/100`} color={signalColor(100 - simulated.adjustedPressure)} />
                        <SimMetric label={t("intel.simulator.recovery")} value={`${simulated.adjustedRecoveryDays}d`} color={C.green} />
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
                        &darr; {simulated.deltaPressure} {t("intel.simulator.pressureDelta")}
                      </span>
                    )}
                    {simulated.deltaRecovery > 0 && (
                      <span className="vg-delta vg-delta--positive">
                        &darr; {simulated.deltaRecovery}d {t("intel.simulator.fasterRecovery")}
                      </span>
                    )}
                  </div>

                  {/* Simulation rationale */}
                  {simulated.rationales.length > 0 && (
                    <div className="vg-inset" style={{ padding: "10px 14px", marginBottom: 10 }}>
                      <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".06em", marginBottom: 6 }}>{t("intel.simulator.whyChanges")}</p>
                      {simulated.rationales.map((r, i) => (
                        <p key={i} style={{ fontSize: 10, color: C.text2, lineHeight: 1.5, marginBottom: 2 }}>{r}</p>
                      ))}
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="vg-badge" style={{ background: signalColor(simulated.simulationConfidence) + "10", border: `1px solid ${signalColor(simulated.simulationConfidence)}25`, color: signalColor(simulated.simulationConfidence) }}>
                      {t("intel.simulator.simConfidence")} {simulated.simulationConfidence}/100
                    </span>
                    <span style={{ fontSize: 9, color: C.text4 }}>{t("intel.desc.simulatorBounded")}</span>
                  </div>
                </>
              ) : (
                <p style={{ fontSize: 11, color: C.text4, fontStyle: "italic" }}>{t("intel.desc.simulatorToggle")}</p>
              )}
            </Panel>
          )}

          {/* ═══════════════════════════════════════
              SECTION 8: EXECUTION FRICTION SURFACE
              ═══════════════════════════════════════ */}

          {phases.decisionFriction && (
            <Panel className="vg-panel--signal-amber vg-layer-in" depth={8}
              onVisible={() => trackEvent(EVENTS.INTEL_EXECUTION_FRICTION_VIEWED)}>
              <LayerLabel num="08" label={t("intel.section.executionFriction")} />
              <p style={{ fontSize: 12, color: C.text3, lineHeight: 1.5, marginBottom: 14 }}>
                {t("intel.desc.executionFriction")}
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                <div className="vg-metric" style={{ borderColor: signalColor(100 - phases.decisionFriction.frictionScore) + "20" }}>
                  <p style={{ fontSize: 7, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 4 }}>{t("intel.metric.friction")}</p>
                  <p className="vg-countup" style={{ fontFamily: MO, fontSize: 28, fontWeight: 800, color: signalColor(100 - phases.decisionFriction.frictionScore), lineHeight: 1 }}>
                    {phases.decisionFriction.frictionScore}
                  </p>
                  <p style={{ fontSize: 7, color: C.text4, marginTop: 3 }}>{t("intel.friction.higherHarder")}</p>
                </div>
                <Metric label={t("intel.metric.ownershipAmbiguity")} value={`${phases.decisionFriction.ownershipAmbiguityScore}/100`} color={signalColor(100 - phases.decisionFriction.ownershipAmbiguityScore)} />
                <Metric label={t("intel.metric.crossFunctional")} value={`${phases.decisionFriction.crossFunctionalDependencies} ${t("intel.friction.functions")}`} color={C.blueHi} />
              </div>

              {/* Execution readiness (from correction momentum if available) */}
              {phases.correctionMomentum && (
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  <div style={{ flex: 1 }}><Metric label={t("intel.metric.executionReadiness")} value={`${phases.correctionMomentum.executionReadinessScore}/100`} color={signalColor(phases.correctionMomentum.executionReadinessScore)} /></div>
                  <div style={{ flex: 1 }}><Metric label={t("intel.metric.actionComplexity")} value={`${phases.correctionMomentum.actionComplexityScore}/100`} color={signalColor(100 - phases.correctionMomentum.actionComplexityScore)} /></div>
                </div>
              )}

              {/* Stakeholder impact map */}
              {phases.decisionFriction.stakeholderMap?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".06em", marginBottom: 6 }}>{t("intel.friction.stakeholderMap")}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 52px 52px 1.5fr", gap: 6, padding: "4px 10px", fontSize: 7, fontFamily: MO, color: C.text4, letterSpacing: ".04em", marginBottom: 4 }}>
                    <span>{t("intel.friction.role")}</span><span style={{ textAlign: "center" }}>{t("intel.friction.impact")}</span><span style={{ textAlign: "center" }}>{t("intel.friction.resist")}</span><span>{t("intel.friction.reason")}</span>
                  </div>
                  {phases.decisionFriction.stakeholderMap.map((sh: any, i: number) => {
                    const ic = sh.impactLevel === "high" ? C.red : sh.impactLevel === "moderate" ? C.amber : C.green;
                    const rc = sh.likelyResistance === "high" ? C.red : sh.likelyResistance === "moderate" ? C.amber : C.green;
                    return (
                      <div key={i} className="vg-inset" style={{ display: "grid", gridTemplateColumns: "1fr 52px 52px 1.5fr", gap: 6, padding: "7px 10px", marginBottom: 3, alignItems: "center", fontSize: 11 }}>
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
                <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, marginBottom: 3 }}>{t("intel.friction.implBurden")}</p>
                <p style={{ fontSize: 11, color: C.text2, lineHeight: 1.5 }}>{phases.decisionFriction.implementationBurden}</p>
              </div>
              <div className="vg-inset" style={{ padding: "8px 12px", marginBottom: 14 }}>
                <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, marginBottom: 3 }}>{t("intel.friction.politicalFriction")}</p>
                <p style={{ fontSize: 11, color: C.text2, lineHeight: 1.5 }}>{phases.decisionFriction.politicalFrictionSummary}</p>
              </div>

              {/* Correction momentum — merged here */}
              {phases.correctionMomentum && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                    {phases.decisionPressure !== undefined && (
                      <div className="vg-metric vg-countup" style={{ borderColor: signalColor(100 - phases.decisionPressure) + "18" }}>
                        <p style={{ fontSize: 7, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 4 }}>{t("intel.metric.pressure")}</p>
                        <p style={{ fontFamily: MO, fontSize: 22, fontWeight: 800, color: signalColor(100 - phases.decisionPressure), lineHeight: 1 }}>
                          {phases.decisionPressure}
                        </p>
                        <p style={{ fontSize: 7, color: C.text4, marginTop: 3 }}>/100</p>
                      </div>
                    )}
                    <Metric label={t("intel.metric.recoveryWindow")} value={`${phases.correctionMomentum.medianRecoveryWindowDays}d`} color={C.blueHi} />
                    <Metric label={t("intel.metric.payback")} value={`${phases.correctionMomentum.expectedPaybackMonths}mo`} color={C.green} />
                    <Metric label={t("intel.metric.readiness")} value={`${phases.correctionMomentum.executionReadinessScore}/100`} color={signalColor(phases.correctionMomentum.executionReadinessScore)} />
                  </div>
                  {phases.correctionMomentum.readinessDrivers?.length > 0 && (
                    <div className="vg-inset" style={{ padding: "10px 14px" }}>
                      <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".06em", marginBottom: 6 }}>{t("intel.friction.readinessDrivers")}</p>
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
              <LayerLabel num="08b" label={t("intel.section.negotiationLeverage")} />
              <p style={{ fontSize: 12, color: C.text3, lineHeight: 1.5, marginBottom: 14 }}>
                {phases.negotiation.summary}
              </p>

              {/* Readiness */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                <div className="vg-metric vg-countup" style={{ borderColor: signalColor(phases.negotiation.readiness.overallReadiness) + "18" }}>
                  <p style={{ fontSize: 7, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 4 }}>{t("intel.metric.readiness")}</p>
                  <p style={{ fontFamily: MO, fontSize: 22, fontWeight: 800, color: signalColor(phases.negotiation.readiness.overallReadiness), lineHeight: 1 }}>
                    {phases.negotiation.readiness.overallReadiness}
                  </p>
                  <p style={{ fontSize: 7, color: C.text4, marginTop: 3 }}>/100</p>
                </div>
                <Metric label={t("intel.metric.grade")} value={phases.negotiation.readiness.readinessGrade.toUpperCase().replace("-", " ")} color={phases.negotiation.readiness.readinessGrade === "ready" ? C.green : phases.negotiation.readiness.readinessGrade === "near-ready" ? C.amber : C.red} />
                <Metric label={t("intel.metric.confidence")} value={`${phases.negotiation.negotiationConfidence}/100`} color={signalColor(phases.negotiation.negotiationConfidence)} />
              </div>

              {/* Leverage Points — first one visible, rest behind paywall */}
              {phases.negotiation.leveragePoints?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".06em", marginBottom: 6 }}>{t("intel.negotiation.leveragePoints")}</p>
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
                    <PaywallBlur label={`${t("intel.paywall.unlockDecisionPack")} (${phases.negotiation.leveragePoints.length - 1}+)`} onAttempt={() => {
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
                <PaywallBlur label={t("intel.paywall.unlockDecisionPack")} onAttempt={() => {
                  trackEvent(EVENTS.INTEL_RECOMMENDED_ACTION_CLICKED, { section: "negotiation_playbooks" });
                  handleCheckout();
                }}>
                  {/* Teaser content rendered but blurred */}
                  {phases.negotiation.topEconomicArguments?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".06em", marginBottom: 6 }}>{t("intel.negotiation.economicArguments")}</p>
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
                      <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".06em", marginBottom: 6 }}>{t("intel.negotiation.vendorPlaybooks")}</p>
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
                      <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".06em", marginBottom: 6 }}>{t("intel.negotiation.economicArguments")}</p>
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
                      <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".06em", marginBottom: 6 }}>{t("intel.negotiation.vendorPlaybookPreview")}</p>
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
                      <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".06em", marginBottom: 4 }}>{t("intel.negotiation.internalDecisionFrame")}</p>
                      <p style={{ fontSize: 11, color: C.text2, lineHeight: 1.5 }}>{phases.negotiation.internalMemoFrame}</p>
                    </div>
                  )}
                </>
              )}
            </Panel>
          )}

          {/* ── Mid-funnel CTA 2: After negotiation leverage ── */}
          {!unlocked && phases.negotiation && (
            <div style={{ padding: "14px 18px", borderRadius: "var(--r-md)", background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.12)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <p style={{ fontSize: 12, color: C.text2, lineHeight: 1.5, flex: 1 }}>{t("intel.cta.mid2.title")}</p>
              <button onClick={() => { trackEvent(EVENTS.INTEL_RECOMMENDED_ACTION_CLICKED, { section: "mid_cta_2" }); handleCheckout(); }} style={{ padding: "8px 16px", borderRadius: "var(--r-sm)", background: "rgba(59,130,246,0.10)", border: "1px solid rgba(59,130,246,0.20)", color: C.blueHi, fontSize: 11, fontFamily: MO, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", transition: "background 0.15s" }}>{t("intel.cta.mid2.btn")} &rarr;</button>
            </div>
          )}

          {/* ═══════════════════════════════════════
              SECTION 09: DECISION CIRCULATION
              ═══════════════════════════════════════ */}

          {phases.decisionPack && (
            <Panel className="vg-layer-in" depth={9}>
              <LayerLabel num="09" label={t("intel.section.decisionCirculation")} />
              <p style={{ fontSize: 12, color: C.text3, lineHeight: 1.5, marginBottom: 14 }}>
                {t("intel.desc.decisionCirculation")}
              </p>

              {/* Memo switcher */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 3, marginBottom: 16 }}>
                {([
                  { key: "cfo" as const, label: t("intel.circulation.cfoMemo"), event: EVENTS.CIRCULATION_CFO_MEMO_VIEWED },
                  { key: "cio" as const, label: t("intel.circulation.cioOps"), event: EVENTS.CIRCULATION_CIO_MEMO_VIEWED },
                  { key: "procurement" as const, label: t("intel.circulation.procurement"), event: EVENTS.CIRCULATION_PROCUREMENT_VIEWED },
                  { key: "board" as const, label: t("intel.circulation.board"), event: EVENTS.CIRCULATION_BOARD_VIEWED },
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
                        style={{ padding: "4px 10px", borderRadius: "var(--r-xs)", border: `1px solid ${C.border}`, background: "#F1F5F9", color: copyFeedback === activeMemo ? C.green : C.text4, fontSize: 9, fontFamily: MO, cursor: "pointer", transition: "color 0.15s" }}>
                        {copyFeedback === activeMemo ? t("intel.circulation.copied") : t("intel.circulation.copy")}
                      </button>
                      <button
                        onClick={() => {
                          trackEvent(EVENTS.CIRCULATION_PRINT_OPENED, { memo: activeMemo });
                          window.print();
                        }}
                        style={{ padding: "4px 10px", borderRadius: "var(--r-xs)", border: `1px solid ${C.border}`, background: "#F1F5F9", color: C.text4, fontSize: 9, fontFamily: MO, cursor: "pointer", transition: "color 0.15s" }}>
                        {t("intel.circulation.print")}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Locked: show teaser then blur */
                  <PaywallBlur label={t("intel.paywall.unlockDecisionPack")} onAttempt={() => {
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

          {/* ── Mid-funnel CTA 3: After decision circulation ── */}
          {!unlocked && phases.decisionPack && (
            <div style={{ padding: "14px 18px", borderRadius: "var(--r-md)", background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.12)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <p style={{ fontSize: 12, color: C.text2, lineHeight: 1.5, flex: 1 }}>{t("intel.cta.mid3.title")}</p>
              <button onClick={() => { trackEvent(EVENTS.INTEL_RECOMMENDED_ACTION_CLICKED, { section: "mid_cta_3" }); handleCheckout(); }} style={{ padding: "8px 16px", borderRadius: "var(--r-sm)", background: "rgba(59,130,246,0.10)", border: "1px solid rgba(59,130,246,0.20)", color: C.blueHi, fontSize: 11, fontFamily: MO, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", transition: "background 0.15s" }}>{t("intel.cta.mid3.btn")} &rarr;</button>
            </div>
          )}

          {/* ═══════════════════════════════════════
              SECTION 10: CONFIDENCE & DEFENSIBILITY
              ═══════════════════════════════════════ */}

          {phases.confidenceModel && (
            <Panel className="vg-layer-in" depth={10}
              onVisible={() => trackEvent(EVENTS.INTEL_CONFIDENCE_LAYER_VIEWED)}>
              <LayerLabel num="10" label={t("intel.section.confidenceDefensibility")} />
              <p style={{ fontSize: 12, color: C.text2, lineHeight: 1.5, marginBottom: 14 }}>
                {phases.confidenceModel.summary}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                {[
                  { label: t("intel.confidence.signalDetection"), value: phases.confidenceModel.signalConfidence },
                  { label: t("intel.confidence.exposureEstimation"), value: phases.confidenceModel.exposureConfidence },
                  { label: t("intel.confidence.peerBenchmarking"), value: phases.confidenceModel.benchmarkConfidence },
                  { label: t("intel.confidence.scenarioModeling"), value: phases.confidenceModel.scenarioConfidence },
                  { label: t("intel.confidence.causalAnalysis"), value: phases.confidenceModel.causalConfidence },
                  { label: t("intel.confidence.simulation"), value: phases.confidenceModel.simulationConfidence },
                ].map((layer) => {
                  const cl = confLabel(layer.value, t);
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
                  <p style={{ fontSize: 9, fontFamily: MO, color: C.blue, letterSpacing: ".08em", marginBottom: 4 }}>{t("intel.confidence.defensibility")}</p>

                  <div style={{ padding: "10px 12px", borderRadius: "var(--r-md)", background: "rgba(52,211,153,0.03)", border: "1px solid rgba(52,211,153,0.10)" }}>
                    <p style={{ fontSize: 8, fontFamily: MO, color: C.green, letterSpacing: ".08em", marginBottom: 6 }}>{t("intel.confidence.strongEvidence")}</p>
                    {phases.decisionPack.consensusView.strongEvidence.map((e: string, i: number) => (
                      <p key={i} style={{ fontSize: 11, color: C.text1, lineHeight: 1.5, marginBottom: 3, paddingLeft: 8, borderLeft: `2px solid ${C.green}30` }}>{e}</p>
                    ))}
                  </div>

                  {phases.decisionPack.consensusView.directionalEvidence.length > 0 && (
                    <div style={{ padding: "10px 12px", borderRadius: "var(--r-md)", background: "rgba(59,130,246,0.03)", border: "1px solid rgba(59,130,246,0.10)" }}>
                      <p style={{ fontSize: 8, fontFamily: MO, color: C.blueHi, letterSpacing: ".08em", marginBottom: 6 }}>{t("intel.confidence.directionalEvidence")}</p>
                      {phases.decisionPack.consensusView.directionalEvidence.map((e: string, i: number) => (
                        <p key={i} style={{ fontSize: 11, color: C.text2, lineHeight: 1.5, marginBottom: 3, paddingLeft: 8, borderLeft: `2px solid ${C.blueHi}30` }}>{e}</p>
                      ))}
                    </div>
                  )}

                  <div style={{ padding: "10px 12px", borderRadius: "var(--r-md)", background: "rgba(59,130,246,0.03)", border: "1px solid rgba(59,130,246,0.10)" }}>
                    <p style={{ fontSize: 8, fontFamily: MO, color: C.amber, letterSpacing: ".08em", marginBottom: 6 }}>{t("intel.confidence.keyUncertainties")}</p>
                    {phases.decisionPack.consensusView.keyUncertainties.map((u: string, i: number) => (
                      <p key={i} style={{ fontSize: 11, color: C.text2, lineHeight: 1.5, marginBottom: 3, paddingLeft: 8, borderLeft: `2px solid ${C.amber}30` }}>{u}</p>
                    ))}
                  </div>

                  <div className="vg-inset" style={{ padding: "10px 12px" }}>
                    <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 4 }}>{t("intel.confidence.recommendedAction")}</p>
                    <p style={{ fontSize: 12, color: C.text1, lineHeight: 1.5, fontWeight: 500 }}>{phases.decisionPack.consensusView.recommendedAction}</p>
                  </div>

                  {phases.decisionPack.consensusView.requiresDeeperValidation.length > 0 && (
                    <div style={{ padding: "10px 12px", borderRadius: "var(--r-md)", background: "rgba(239,68,68,0.02)", border: "1px solid rgba(239,68,68,0.08)" }}>
                      <p style={{ fontSize: 8, fontFamily: MO, color: C.red, letterSpacing: ".08em", marginBottom: 6 }}>{t("intel.confidence.deeperValidation")}</p>
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
              <LayerLabel num="11" label={t("intel.section.correctiveProtocol")} />

              {/* What the full protocol contains */}
              <p style={{ fontSize: 12, color: C.text3, lineHeight: 1.5, marginBottom: 16 }}>
                {t("intel.desc.correctiveProtocol")}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
                {[
                  { num: "01", title: t("intel.protocol.completeEnrichment"), desc: t("intel.protocol.completeEnrichmentDesc") },
                  { num: "02", title: t("intel.protocol.structuredReport"), desc: t("intel.protocol.structuredReportDesc") },
                  { num: "03", title: t("intel.protocol.vendorPressureMap"), desc: t("intel.protocol.vendorPressureMapDesc") },
                  { num: "04", title: t("intel.protocol.negotiationPlaybooks"), desc: t("intel.protocol.negotiationPlaybooksDesc") },
                  { num: "05", title: t("intel.protocol.implementationRoadmap"), desc: t("intel.protocol.implementationRoadmapDesc") },
                  { num: "06", title: t("intel.protocol.executiveDecisionPack"), desc: t("intel.protocol.executiveDecisionPackDesc") },
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
                  <p style={{ fontSize: 7, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 4 }}>{t("intel.metric.delivery")}</p>
                  <p style={{ fontFamily: MO, fontSize: 16, fontWeight: 700, color: C.blueHi }}>48h</p>
                </div>
                <div className="vg-metric" style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 7, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 4 }}>{t("intel.metric.format")}</p>
                  <p style={{ fontFamily: MO, fontSize: 11, fontWeight: 600, color: C.text2 }}>{t("intel.protocol.deliveryFormat")}</p>
                </div>
                <div className="vg-metric" style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 7, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 4 }}>{t("intel.metric.includes")}</p>
                  <p style={{ fontFamily: MO, fontSize: 11, fontWeight: 600, color: C.text2 }}>{t("intel.protocol.deliveryIncludes")}</p>
                </div>
              </div>

              {/* CTA — final conversion block */}
              <div style={{ padding: "20px 0 8px" }}>
                {/* ROI promise bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 10, background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.15)", marginBottom: 16 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.20)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                      <polyline points="17 6 23 6 23 12"/>
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: C.green, marginBottom: 2 }}>{t("intel.cta.roiTitle")}</p>
                    <p style={{ fontSize: 11, color: C.text3, lineHeight: 1.4 }}>{t("intel.cta.roiDesc")}</p>
                  </div>
                </div>

                {/* Exposure reminder if available */}
                {phases.exposure && (
                  <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
                    <div style={{ textAlign: "center", padding: "10px 18px", borderRadius: 8, background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)" }}>
                      <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 4 }}>{t("intel.cta.yourExposure")}</p>
                      <p style={{ fontFamily: MO, fontSize: 18, fontWeight: 800, color: C.red, lineHeight: 1 }}>{fmt(phases.exposure.lowEur)}&ndash;{fmt(phases.exposure.highEur)} &euro;</p>
                      <p style={{ fontSize: 8, color: C.text4, marginTop: 2, fontFamily: MO }}>/yr</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", padding: "0 8px", color: C.text4, fontSize: 18, fontWeight: 300 }}>vs</div>
                    <div style={{ textAlign: "center", padding: "10px 18px", borderRadius: 8, background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.12)" }}>
                      <p style={{ fontSize: 8, fontFamily: MO, color: C.text4, letterSpacing: ".08em", marginBottom: 4 }}>{t("intel.cta.investmentCost")}</p>
                      <p style={{ fontFamily: MO, fontSize: 18, fontWeight: 800, color: C.green, lineHeight: 1 }}>490 &euro;</p>
                      <p style={{ fontSize: 8, color: C.text4, marginTop: 2, fontFamily: MO }}>{t("intel.cta.oneTime")}</p>
                    </div>
                  </div>
                )}

                <div style={{ textAlign: "center" }}>
                  <button onClick={() => {
                    if (memoInteracted) trackEvent(EVENTS.CHECKOUT_STARTED_AFTER_MEMO, { lastMemo: activeMemo });
                    handleCheckout();
                    trackEvent(EVENTS.INTEL_RECOMMENDED_ACTION_CLICKED);
                  }} disabled={checkoutLoading}
                    style={{
                      width: "100%", maxWidth: 480, padding: "18px 48px", borderRadius: 12, border: "none",
                      background: checkoutLoading ? C.text4 : `linear-gradient(135deg, ${C.green} 0%, #10b981 100%)`,
                      color: C.bg, fontSize: 15, fontWeight: 800,
                      fontFamily: SA,
                      letterSpacing: ".04em", textTransform: "uppercase",
                      cursor: checkoutLoading ? "wait" : "pointer",
                      opacity: checkoutLoading ? 0.7 : 1,
                      transition: "all 0.2s",
                      boxShadow: checkoutLoading ? "none" : "0 1px 3px rgba(0,0,0,0.06)",
                      display: "block", margin: "0 auto",
                    }}>
                    {checkoutLoading
                      ? t("intel.cta.redirecting")
                      : t("intel.cta.unlock")}
                  </button>
                  <p style={{ fontSize: 11, color: C.text3, marginTop: 10, fontFamily: SA }}>
                    {t("intel.cta.sub")}
                  </p>
                  <p style={{ fontSize: 11, color: C.green, marginTop: 5, fontFamily: SA, fontWeight: 600 }}>
                    {t("intel.cta.guarantee")}
                  </p>
                </div>
              </div>
            </Panel>
          )}

          {/* ═══ DECISION PACK TEASER (Growth Hack #4) ═══ */}

          {phases.complete && !unlocked && (
            <Suspense fallback={null}>
              <DecisionPackTeaser
                domain={domain}
                email={email}
                exposureLow={phases.exposure?.annualRange?.[0]}
                exposureHigh={phases.exposure?.annualRange?.[1]}
                locale={locale}
              />
            </Suspense>
          )}

          {/* ═══ META FOOTER ═══ */}

          {phases.complete && (
            <div style={{ padding: "10px 14px", borderRadius: "var(--r-md)", background: "#F1F5F9", border: `1px solid ${C.border}`, marginTop: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <span style={{ fontSize: 8, fontFamily: MO, color: C.text4 }}>ID: {phases.complete.analysisId}</span>
                <span style={{ fontSize: 8, fontFamily: MO, color: C.text4 }}>{t("intel.meta.sources")} {phases.complete.dataSources?.join(", ")}</span>
                <span style={{ fontSize: 8, fontFamily: MO, color: C.text4 }}>{t("intel.meta.confidence")} {phases.complete.overallConfidence}/100</span>
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
    <label style={{ display: "block", fontSize: 11, fontFamily: "var(--font-sans)", color: "#475569", letterSpacing: ".02em", marginBottom: 5, fontWeight: 500 }}>
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
      <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "#0F172A" }}>{label}</span>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="vg-metric">
      <p style={{ fontSize: 7, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4, fontFamily: "var(--font-mono)" }}>{label}</p>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color, lineHeight: 1.2 }}>{value}</p>
    </div>
  );
}

function SimMetric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontSize: 7, color: "#94A3B8", marginBottom: 2, fontFamily: "var(--font-mono)", letterSpacing: ".06em" }}>{label}</p>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color }}>{value}</p>
    </div>
  );
}

function ConfBadge({ quality }: { quality: "strong" | "moderate" | "weak" }) {
  const { t } = useI18n();
  const c = quality === "strong" ? "#059669" : quality === "moderate" ? "#3b82f6" : "#DC2626";
  return (
    <span className="vg-badge" style={{ background: c + "10", border: `1px solid ${c}25`, color: c }}>
      {quality.toUpperCase()} {t("intel.benchmark.strongBenchmark")}
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
  const { t } = useI18n();
  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      {children}
      <div
        onClick={onAttempt}
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.7) 20%, rgba(255,255,255,0.95) 50%, #FFFFFF 80%)",
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#0F172A", letterSpacing: "0.02em" }}>
            {label || t("intel.paywall.unlockDecisionPack")}
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#1E293B" }}>
            {t("intel.paywall.price")}
          </span>
          <span style={{ fontSize: 9, color: "#64748B" }}>
            {t("intel.paywall.clickToUnlock")}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Scan Progress Indicator ─────────────────────────────
// Maps stream phase names → human-readable messages (tri-lingual)

const PHASE_LABELS: Record<string, Record<string, string>> = {
  enrichment:        { en: "Analyzing DNS & public footprint...",  fr: "Analyse de l'empreinte DNS & publique...",       de: "DNS & öffentlicher Fingerabdruck..." },
  context:           { en: "Building company context...",          fr: "Construction du contexte entreprise...",         de: "Unternehmenskontext aufbauen..." },
  exposure:          { en: "Detecting financial exposure...",      fr: "Détection de l'exposition financière...",        de: "Finanzielle Exposition erkennen..." },
  lossVelocity:      { en: "Calculating loss velocity...",         fr: "Calcul de la vélocité des pertes...",            de: "Verlustgeschwindigkeit berechnen..." },
  costOfDelay:       { en: "Projecting cost of inaction...",       fr: "Projection du coût de l'inaction...",           de: "Kosten der Untätigkeit projizieren..." },
  diagnosis:         { en: "Running diagnostic engine...",         fr: "Moteur de diagnostic en cours...",              de: "Diagnose-Engine läuft..." },
  causalGraph:       { en: "Building causal graph...",             fr: "Construction du graphe causal...",              de: "Kausalgraph aufbauen..." },
  proofEngine:       { en: "Scoring evidence density...",          fr: "Évaluation de la densité des preuves...",       de: "Evidenzdichte bewerten..." },
  proof:             { en: "Classifying signals...",               fr: "Classification des signaux...",                 de: "Signale klassifizieren..." },
  marketMemory:      { en: "Querying market memory...",            fr: "Interrogation de la mémoire de marché...",      de: "Marktgedächtnis abfragen..." },
  peerComparison:    { en: "Running peer benchmark...",            fr: "Benchmark concurrentiel en cours...",           de: "Peer-Benchmark ausführen..." },
  driftMonitor:      { en: "Scanning vendor pricing drift...",     fr: "Scan de la dérive tarifaire fournisseurs...",   de: "Preisdrift der Anbieter scannen..." },
  correctionMomentum:{ en: "Scoring correction readiness...",      fr: "Évaluation de la maturité correctrice...",      de: "Korrekturbereitsschaft bewerten..." },
  scenarios:         { en: "Modeling action scenarios...",         fr: "Modélisation des scénarios d'action...",        de: "Handlungsszenarien modellieren..." },
  counterfactual:    { en: "Stress-testing decision levers...",    fr: "Test de résistance des leviers décisionnels...",de: "Entscheidungshebel testen..." },
  decisionFriction:  { en: "Mapping execution friction...",        fr: "Cartographie de la friction d'exécution...",   de: "Ausführungsreibung kartieren..." },
  decisionPressure:  { en: "Computing decision pressure...",       fr: "Calcul de la pression décisionnelle...",        de: "Entscheidungsdruck berechnen..." },
  negotiation:       { en: "Loading negotiation playbooks...",     fr: "Chargement des playbooks de négociation...",    de: "Verhandlungs-Playbooks laden..." },
  confidenceModel:   { en: "Calibrating confidence model...",      fr: "Calibration du modèle de confiance...",         de: "Konfidenzmodell kalibrieren..." },
  decisionPack:      { en: "Generating decision memos...",         fr: "Génération des mémos décisionnels...",          de: "Entscheidungsmemoranden generieren..." },
  executiveSnapshot: { en: "Composing executive snapshot...",      fr: "Composition de la synthèse exécutive...",       de: "Management-Zusammenfassung erstellen..." },
  complete:          { en: "Analysis complete.",                   fr: "Analyse terminée.",                             de: "Analyse abgeschlossen." },
};

const PHASE_ORDER = [
  "enrichment", "context", "exposure", "lossVelocity", "costOfDelay",
  "diagnosis", "causalGraph", "proofEngine", "proof", "marketMemory",
  "peerComparison", "driftMonitor", "correctionMomentum", "scenarios",
  "counterfactual", "decisionFriction", "decisionPressure", "negotiation",
  "confidenceModel", "decisionPack", "executiveSnapshot", "complete",
];

function ScanProgressIndicator({
  currentPhase, phaseHistory, domain, locale, t
}: { currentPhase: string | null; phaseHistory: string[]; domain: string; locale: string; t: (k: string) => string }) {
  const completedCount = phaseHistory.length;
  const totalPhases = PHASE_ORDER.length;
  const progressPct = Math.round((completedCount / totalPhases) * 100);
  const currentLabel = currentPhase
    ? (PHASE_LABELS[currentPhase]?.[locale] || PHASE_LABELS[currentPhase]?.["en"] || currentPhase)
    : t("intel.status.scanning.desc");

  // Show last 4 completed phases
  const recentPhases = phaseHistory.slice(-4);

  return (
    <div className="vg-panel vg-layer-in" style={{ padding: "20px 24px", marginBottom: 16, position: "relative", overflow: "hidden" }}>
      {/* Animated scan line */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, overflow: "hidden" }}>
        <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${C.blue}, ${C.cyan}, transparent)`, animation: "vg-scan 1.8s linear infinite" }} />
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.blue, animation: "vg-exposure-pulse 1.2s ease-in-out infinite", flexShrink: 0 }} />
          <p style={{ fontSize: 11, fontFamily: MO, fontWeight: 700, color: C.blue, letterSpacing: ".10em" }}>
            {t("intel.status.scanning")} — {domain}
          </p>
        </div>
        <span style={{ fontSize: 10, fontFamily: MO, color: C.text4 }}>{completedCount}/{totalPhases}</span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, borderRadius: 99, background: "rgba(59,130,246,0.10)", marginBottom: 14, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 99,
          background: `linear-gradient(90deg, ${C.blue}, ${C.cyan})`,
          width: `${Math.max(4, progressPct)}%`,
          transition: "width 0.6s ease",
        }} />
      </div>

      {/* Current phase label */}
      <p style={{ fontSize: 12, color: C.text2, lineHeight: 1.5, marginBottom: 12, fontFamily: SA }}>
        {currentLabel}
      </p>

      {/* Recent completed phases */}
      {recentPhases.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {recentPhases.map((ph, i) => {
            const isLast = i === recentPhases.length - 1;
            const label = PHASE_LABELS[ph]?.[locale] || PHASE_LABELS[ph]?.["en"] || ph;
            return (
              <div key={ph} style={{ display: "flex", alignItems: "center", gap: 8, opacity: isLast ? 0.7 : 0.35 }}>
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="5" stroke={C.green} strokeWidth="1.5" />
                  <path d="M3.5 6L5.5 8L8.5 4" stroke={C.green} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ fontSize: 10, fontFamily: MO, color: C.text4, letterSpacing: ".02em" }}>{label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SignalTier({ tier, color, signals }: { tier: string; color: string; signals: any[] }) {
  const { t } = useI18n();
  const sevColors: Record<string, string> = { critical: "#DC2626", high: "#3b82f6", medium: "#d4a72c", low: "#059669" };
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span className="vg-badge" style={{ background: color + "10", border: `1px solid ${color}25`, color }}>{tier}</span>
        <span style={{ fontSize: 10, color: "#64748B" }}>{signals.length} {signals.length > 1 ? t("intel.signal.signalsPlural") : t("intel.signal.signals")}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {signals.map((s: any, i: number) => {
          const sc = sevColors[s.severity] || "#64748B";
          return (
            <div key={i} className="vg-inset" style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 12px" }}>
              <span className="vg-badge" style={{ background: sc + "10", border: `1px solid ${sc}25`, color: sc, flexShrink: 0, marginTop: 2 }}>
                {s.severity?.toUpperCase()}
              </span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#0F172A", marginBottom: 2 }}>{s.label}</p>
                <p style={{ fontSize: 11, color: "#475569", lineHeight: 1.4 }}>{s.description}</p>
                {s.impactEurRange && (
                  <p style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "#3b82f6", marginTop: 3 }}>
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
