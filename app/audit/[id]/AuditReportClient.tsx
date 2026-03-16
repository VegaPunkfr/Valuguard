"use client";

/**
 * GHOST TAX — FORENSIC AUDIT REPORT (CLIENT COMPONENT)
 *
 * Night-Ops dark theme, animated counters, CSS-only charts,
 * mobile-first, closing Checkout Card.
 *
 * Accepts full AuditReportPayload from server page.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import type {
  AuditReportPayload,
  CostCategory,
  WasteDriver,
  TVARBreakdown,
} from "@/types/audit";

// ══════════════════════════════════════════════════════
//  PALETTE — Night-Ops
// ══════════════════════════════════════════════════════

const P = {
  bg: "#0a0a0a",
  surface: "#111111",
  panel: "#161616",
  raised: "#1c1c1c",
  border: "rgba(255,255,255,0.06)",
  borderStrong: "rgba(255,255,255,0.12)",
  text1: "#f0f0f0",
  text2: "#999999",
  text3: "#666666",
  text4: "#444444",
  red: "#ff3b3b",
  redGlow: "rgba(255,59,59,0.15)",
  redMuted: "#cc2d2d",
  blue: "#3b82f6",
  blueGlow: "rgba(59,130,246,0.15)",
  blueHi: "#60a5fa",
  green: "#34d399",
  greenGlow: "rgba(52,211,153,0.12)",
  amber: "#f59e0b",
  amberGlow: "rgba(245,158,11,0.12)",
  cyan: "#22d3ee",
} as const;

// ══════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════

function fmtEur(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M €`;
  if (Math.abs(n) >= 1_000) return `${Math.round(n / 1_000)}k €`;
  return `${Math.round(n)} €`;
}

function fmtEurFull(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

function severityColor(s: string): string {
  if (s === "critical") return P.red;
  if (s === "high") return P.amber;
  return P.text3;
}

function urgencyLabel(score: number): { text: string; color: string } {
  if (score >= 70) return { text: "CRITIQUE", color: P.red };
  if (score >= 40) return { text: "ÉLEVÉ", color: P.amber };
  return { text: "MODÉRÉ", color: P.green };
}

// ══════════════════════════════════════════════════════
//  ANIMATED COUNTER HOOK
// ══════════════════════════════════════════════════════

function useAnimatedCounter(
  target: number,
  duration: number = 2000,
  startOnMount: boolean = false,
): [number, () => void] {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  const start = useCallback(() => {
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(Math.round(target * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
  }, [target, duration]);

  useEffect(() => {
    if (startOnMount) start();
    return () => cancelAnimationFrame(rafRef.current);
  }, [start, startOnMount]);

  return [value, start];
}

// ══════════════════════════════════════════════════════
//  INTERSECTION OBSERVER HOOK
// ══════════════════════════════════════════════════════

function useInView(threshold = 0.2): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return [ref, inView];
}

// ══════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════

export default function AuditReportClient({
  payload,
}: {
  payload: AuditReportPayload;
}) {
  const { shadowBill, financialImpact, peerGap, urgencyScore } = payload;

  // ── Open tracking: fire once on mount ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (!ref) return;

    fetch("/api/audit/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref }),
    }).catch(() => {
      // Non-fatal: tracking failure must not affect report display
    });
  }, []);
  const tvar = shadowBill.tvar;

  return (
    <div
      className="min-h-screen text-[#f0f0f0]"
      style={{ background: P.bg, fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* ── Confidential Banner ── */}
      <div
        className="text-center py-2 text-[10px] tracking-[0.2em] uppercase"
        style={{ background: P.surface, color: P.text3, borderBottom: `1px solid ${P.border}` }}
      >
        Confidentiel — Audit externe Ghost Tax — {payload.domain}
      </div>

      {/* ── Hero: TVAR Counter ── */}
      <HeroSection payload={payload} />

      {/* ── Executive Summary ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div
          className="rounded-xl p-6"
          style={{
            background: P.surface,
            border: `1px solid ${P.border}`,
          }}
        >
          <SectionLabel>Résumé exécutif</SectionLabel>
          <p className="text-sm sm:text-base leading-relaxed" style={{ color: P.text2 }}>
            {payload.executiveSummary}
          </p>
        </div>
      </section>

      {/* ── TVAR Breakdown ── */}
      <TVARBreakdownSection breakdown={tvar.breakdown} total={tvar.totalValueAtRisk} />

      {/* ── Redundancies ── */}
      {tvar.detectedRedundancies.length > 0 && (
        <RedundancyFlags redundancies={tvar.detectedRedundancies} />
      )}

      {/* ── Category Table ── */}
      <CategoryBreakdown categories={shadowBill.categories} />

      {/* ── Top Waste Drivers ── */}
      {shadowBill.topWasteDrivers.length > 0 && (
        <WasteDriversSection drivers={shadowBill.topWasteDrivers} />
      )}

      {/* ── Financial Impact KPIs ── */}
      <FinancialImpactSection impact={financialImpact} urgency={urgencyScore} />

      {/* ── Peer Gap (if available) ── */}
      {peerGap && <PeerGapSection gap={peerGap} />}

      {/* ── 12-Month Inaction Projection ── */}
      <InactionProjection impact={financialImpact} />

      {/* ── Checkout Card ── */}
      <CheckoutCard payload={payload} />

      {/* ── Footer ── */}
      <footer
        className="text-center py-8 text-[10px] tracking-[0.15em] uppercase"
        style={{ color: P.text4 }}
      >
        Ghost Tax — Decision Intelligence for IT Financial Exposure
        <br />
        Rapport généré le{" "}
        {new Date(payload.generatedAt).toLocaleDateString("fr-FR", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
        {" — "}Version {payload.version}
      </footer>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  HERO SECTION
// ══════════════════════════════════════════════════════

function HeroSection({ payload }: { payload: AuditReportPayload }) {
  const tvar = payload.shadowBill.tvar.totalValueAtRisk;
  const [counter] = useAnimatedCounter(tvar, 2400, true);
  const urgency = urgencyLabel(payload.urgencyScore);

  return (
    <section className="relative overflow-hidden">
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 40% at 50% 20%, ${P.redGlow}, transparent)`,
        }}
      />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-16 pb-12 text-center">
        {/* Domain */}
        <p
          className="text-xs sm:text-sm tracking-[0.15em] uppercase mb-2"
          style={{ color: P.text3 }}
        >
          Audit Forensique
        </p>
        <h1 className="text-lg sm:text-xl font-semibold mb-8" style={{ color: P.text2 }}>
          <span className="font-mono" style={{ color: P.text1 }}>
            {payload.domain}
          </span>
        </h1>

        {/* TVAR Counter */}
        <p
          className="text-[10px] tracking-[0.25em] uppercase mb-3"
          style={{ color: P.red }}
        >
          Valeur Totale à Risque / mois
        </p>
        <div
          className="text-5xl sm:text-7xl md:text-8xl font-black tabular-nums tracking-tight"
          style={{
            color: P.red,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            textShadow: `0 0 60px ${P.redGlow}, 0 0 120px rgba(255,59,59,0.08)`,
          }}
        >
          {fmtEurFull(counter)}
        </div>
        <p className="text-xs mt-3" style={{ color: P.text3 }}>
          EUR / mois — exposition non corrigée
        </p>

        {/* Urgency badge */}
        <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full"
          style={{
            background: urgency.color === P.red ? P.redGlow : urgency.color === P.amber ? P.amberGlow : P.greenGlow,
            border: `1px solid ${urgency.color}30`,
          }}
        >
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: urgency.color }}
          />
          <span
            className="text-xs font-semibold tracking-[0.1em]"
            style={{ color: urgency.color }}
          >
            URGENCE : {urgency.text} — {payload.urgencyScore}/100
          </span>
        </div>

        {/* Quick KPIs row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-10">
          <QuickKPI
            label="Gaspillage annuel"
            value={fmtEur(payload.shadowBill.totalWasteEur)}
            color={P.red}
          />
          <QuickKPI
            label="Hémorragie / jour"
            value={`${Math.round(payload.financialImpact.dailyBleedEur)} €`}
            color={P.amber}
          />
          <QuickKPI
            label="Impact EBITDA"
            value={`${payload.financialImpact.ebitdaImpactPoints.toFixed(1)} pts`}
            color={P.amber}
          />
          <QuickKPI
            label="Récupérable 90j"
            value={fmtEur(payload.financialImpact.recoveryPotential90DaysEur)}
            color={P.green}
          />
        </div>
      </div>
    </section>
  );
}

function QuickKPI({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="rounded-lg px-4 py-3 text-center"
      style={{ background: P.surface, border: `1px solid ${P.border}` }}
    >
      <p className="text-[10px] uppercase tracking-[0.1em] mb-1" style={{ color: P.text3 }}>
        {label}
      </p>
      <p className="text-lg sm:text-xl font-bold font-mono" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  TVAR BREAKDOWN — Animated Bars
// ══════════════════════════════════════════════════════

function TVARBreakdownSection({
  breakdown,
  total,
}: {
  breakdown: TVARBreakdown;
  total: number;
}) {
  const [ref, inView] = useInView(0.3);

  const segments = [
    {
      key: "techWaste",
      label: "Gaspillage Technologique",
      desc: "Redondances + sous-utilisation SaaS",
      value: breakdown.techWaste,
      color: P.red,
      glow: P.redGlow,
    },
    {
      key: "performanceLoss",
      label: "Perte de Performance",
      desc: "Retard technologique vs. pairs",
      value: breakdown.performanceLoss,
      color: P.amber,
      glow: P.amberGlow,
    },
    {
      key: "securityRiskExposure",
      label: "Exposition Sécurité",
      desc: "Risque financier lié aux vulnérabilités",
      value: breakdown.securityRiskExposure,
      color: P.cyan,
      glow: "rgba(34,211,238,0.12)",
    },
  ];

  const maxVal = Math.max(...segments.map((s) => s.value), 1);

  return (
    <section ref={ref} className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <SectionLabel>Décomposition TVAR</SectionLabel>
      <p className="text-xs mb-6" style={{ color: P.text3 }}>
        Total Value At Risk = {fmtEurFull(total)} / mois
      </p>

      <div className="space-y-5">
        {segments.map((seg) => {
          const pct = total > 0 ? (seg.value / total) * 100 : 0;
          const barWidth = inView ? (seg.value / maxVal) * 100 : 0;

          return (
            <div key={seg.key}>
              <div className="flex items-baseline justify-between mb-2">
                <div>
                  <span className="text-sm font-semibold" style={{ color: seg.color }}>
                    {seg.label}
                  </span>
                  <span className="text-xs ml-2" style={{ color: P.text3 }}>
                    {seg.desc}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-mono font-bold" style={{ color: seg.color }}>
                    {fmtEurFull(seg.value)}
                  </span>
                  <span className="text-xs ml-1" style={{ color: P.text3 }}>
                    ({pct.toFixed(0)}%)
                  </span>
                </div>
              </div>

              {/* Bar */}
              <div
                className="h-3 rounded-full overflow-hidden"
                style={{ background: P.panel }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${barWidth}%`,
                    background: `linear-gradient(90deg, ${seg.color}, ${seg.color}aa)`,
                    boxShadow: `0 0 12px ${seg.glow}`,
                    transition: "width 1.5s cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Donut-like split visualization */}
      <div className="mt-8 flex items-center justify-center gap-6">
        {segments.map((seg) => {
          const pct = total > 0 ? (seg.value / total) * 100 : 0;
          return (
            <div key={seg.key} className="text-center">
              <div
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-2"
                style={{
                  background: `conic-gradient(${seg.color} ${pct * 3.6}deg, ${P.panel} 0deg)`,
                }}
              >
                <div
                  className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center"
                  style={{ background: P.bg }}
                >
                  <span
                    className="text-xs sm:text-sm font-bold font-mono"
                    style={{ color: seg.color }}
                  >
                    {pct.toFixed(0)}%
                  </span>
                </div>
              </div>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: P.text3 }}>
                {seg.label.split(" ")[0]}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════
//  REDUNDANCY RED FLAGS
// ══════════════════════════════════════════════════════

function RedundancyFlags({ redundancies }: { redundancies: string[] }) {
  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <SectionLabel color={P.red}>Redondances détectées</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        {redundancies.map((r, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg px-4 py-3"
            style={{
              background: P.redGlow,
              border: `1px solid ${P.red}20`,
            }}
          >
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: `${P.red}30`, color: P.red }}
            >
              !
            </span>
            <span className="text-sm font-mono" style={{ color: P.text1 }}>
              {r}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════
//  CATEGORY BREAKDOWN TABLE
// ══════════════════════════════════════════════════════

function CategoryBreakdown({ categories }: { categories: CostCategory[] }) {
  const [ref, inView] = useInView(0.2);
  const maxSpend = Math.max(...categories.map((c) => c.annualSpendEur), 1);

  return (
    <section ref={ref} className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <SectionLabel>Ventilation par catégorie</SectionLabel>

      {/* Desktop table */}
      <div className="hidden sm:block mt-4">
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: `1px solid ${P.border}` }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: P.surface }}>
                <th className="text-left px-4 py-3 font-medium" style={{ color: P.text3 }}>
                  Catégorie
                </th>
                <th className="text-center px-4 py-3 font-medium" style={{ color: P.text3 }}>
                  Outils
                </th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: P.text3 }}>
                  Dépense / an
                </th>
                <th className="px-4 py-3 font-medium w-1/3" style={{ color: P.text3 }}>
                  Waste
                </th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: P.text3 }}>
                  Gaspillage
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, i) => (
                <tr
                  key={cat.category}
                  style={{
                    background: i % 2 === 0 ? "transparent" : P.surface,
                    borderTop: `1px solid ${P.border}`,
                  }}
                >
                  <td className="px-4 py-3">
                    <span className="font-semibold" style={{ color: P.text1 }}>
                      {cat.category}
                    </span>
                    <br />
                    <span className="text-xs" style={{ color: P.text3 }}>
                      {cat.vendors.join(", ")}
                    </span>
                  </td>
                  <td className="text-center px-4 py-3 font-mono" style={{ color: P.text2 }}>
                    {cat.vendorCount}
                  </td>
                  <td className="text-right px-4 py-3 font-mono" style={{ color: P.text2 }}>
                    {fmtEur(cat.annualSpendEur)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 rounded-full flex-1"
                        style={{ background: P.panel }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: inView ? `${cat.wastePercent}%` : "0%",
                            background:
                              cat.wastePercent > 35
                                ? P.red
                                : cat.wastePercent > 20
                                  ? P.amber
                                  : P.text3,
                            transition: "width 1.2s ease-out",
                            transitionDelay: `${i * 100}ms`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-mono w-8 text-right" style={{ color: P.text3 }}>
                        {cat.wastePercent}%
                      </span>
                    </div>
                  </td>
                  <td
                    className="text-right px-4 py-3 font-mono font-bold"
                    style={{
                      color:
                        cat.wastePercent > 35
                          ? P.red
                          : cat.wastePercent > 20
                            ? P.amber
                            : P.text2,
                    }}
                  >
                    {fmtEur(cat.wasteEur)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden mt-4 space-y-3">
        {categories.map((cat, i) => (
          <div
            key={cat.category}
            className="rounded-lg p-4"
            style={{ background: P.surface, border: `1px solid ${P.border}` }}
          >
            <div className="flex items-baseline justify-between mb-2">
              <span className="font-semibold text-sm" style={{ color: P.text1 }}>
                {cat.category}
              </span>
              <span
                className="text-sm font-mono font-bold"
                style={{
                  color: cat.wastePercent > 35 ? P.red : cat.wastePercent > 20 ? P.amber : P.text2,
                }}
              >
                {fmtEur(cat.wasteEur)}
              </span>
            </div>
            <p className="text-xs mb-2" style={{ color: P.text3 }}>
              {cat.vendors.join(", ")} — {fmtEur(cat.annualSpendEur)}/an
            </p>
            <div className="h-2 rounded-full" style={{ background: P.panel }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: inView ? `${cat.wastePercent}%` : "0%",
                  background: cat.wastePercent > 35 ? P.red : cat.wastePercent > 20 ? P.amber : P.text3,
                  transition: "width 1.2s ease-out",
                  transitionDelay: `${i * 80}ms`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════
//  WASTE DRIVERS
// ══════════════════════════════════════════════════════

function WasteDriversSection({ drivers }: { drivers: WasteDriver[] }) {
  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <SectionLabel>Principaux postes de gaspillage</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
        {drivers.map((d, i) => (
          <div
            key={i}
            className="rounded-xl p-5 relative overflow-hidden"
            style={{
              background: P.surface,
              border: `1px solid ${severityColor(d.severity)}20`,
            }}
          >
            {/* Rank */}
            <div
              className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: `${severityColor(d.severity)}15`, color: severityColor(d.severity) }}
            >
              #{i + 1}
            </div>

            <p
              className="text-[10px] uppercase tracking-[0.15em] mb-2"
              style={{ color: severityColor(d.severity) }}
            >
              {d.severity}
            </p>
            <p className="text-sm font-semibold mb-1 pr-8" style={{ color: P.text1 }}>
              {d.label}
            </p>
            <p className="text-xs mb-3" style={{ color: P.text3 }}>
              {d.explanation}
            </p>
            <p className="text-xl font-mono font-bold" style={{ color: severityColor(d.severity) }}>
              {fmtEur(d.annualWasteEur)}
              <span className="text-xs font-normal ml-1" style={{ color: P.text3 }}>
                /an
              </span>
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════
//  FINANCIAL IMPACT
// ══════════════════════════════════════════════════════

function FinancialImpactSection({
  impact,
  urgency,
}: {
  impact: AuditReportPayload["financialImpact"];
  urgency: number;
}) {
  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <SectionLabel>Renseignement financier</SectionLabel>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        <KPICard
          label="Revenu à risque"
          value={fmtEur(impact.revenueAtRiskEur)}
          sub={`${fmtEur(impact.revenueAtRiskLowEur)} — ${fmtEur(impact.revenueAtRiskHighEur)}`}
          color={P.red}
        />
        <KPICard
          label="Coût inaction 12 mois"
          value={fmtEur(impact.inactionCost12MonthsEur)}
          sub="Projection cumulative"
          color={P.red}
        />
        <KPICard
          label="Waste / employé"
          value={`${Math.round(impact.wastePerEmployeeEur)} €`}
          sub="EUR par tête / an"
          color={P.amber}
        />
        <KPICard
          label="Confiance"
          value={`${impact.confidence}/85`}
          sub={impact.confidence >= 60 ? "Forte" : impact.confidence >= 35 ? "Modérée" : "Directionnelle"}
          color={P.blue}
        />
      </div>
    </section>
  );
}

function KPICard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: P.surface, border: `1px solid ${P.border}` }}
    >
      <p className="text-[10px] uppercase tracking-[0.12em] mb-2" style={{ color: P.text3 }}>
        {label}
      </p>
      <p className="text-xl sm:text-2xl font-bold font-mono" style={{ color }}>
        {value}
      </p>
      <p className="text-[10px] mt-1" style={{ color: P.text4 }}>
        {sub}
      </p>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  PEER GAP
// ══════════════════════════════════════════════════════

function PeerGapSection({ gap }: { gap: NonNullable<AuditReportPayload["peerGap"]> }) {
  const verdictColor =
    gap.gapVerdict === "critical"
      ? P.red
      : gap.gapVerdict === "lagging"
        ? P.amber
        : gap.gapVerdict === "aligned"
          ? P.green
          : P.blue;

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <SectionLabel>Positionnement concurrentiel</SectionLabel>

      <div className="mt-4 flex flex-col sm:flex-row gap-4">
        {/* Score card */}
        <div
          className="rounded-xl p-6 flex-shrink-0 sm:w-48 text-center"
          style={{ background: P.surface, border: `1px solid ${P.border}` }}
        >
          <p className="text-[10px] uppercase tracking-wider mb-3" style={{ color: P.text3 }}>
            Gap Score
          </p>
          <div
            className="text-4xl font-black font-mono"
            style={{ color: verdictColor }}
          >
            {gap.gapScore}
          </div>
          <p className="text-xs mt-2 font-semibold uppercase tracking-wider" style={{ color: verdictColor }}>
            {gap.gapVerdict}
          </p>
          <p className="text-xs mt-2" style={{ color: P.text3 }}>
            Risque : {fmtEur(gap.competitiveRiskEur)}/an
          </p>
        </div>

        {/* Gap categories */}
        <div className="flex-1 space-y-2">
          {gap.gapCategories.map((cat, i) => {
            const riskCol =
              cat.riskLevel === "critical"
                ? P.red
                : cat.riskLevel === "high"
                  ? P.amber
                  : cat.riskLevel === "medium"
                    ? P.text2
                    : P.green;
            return (
              <div
                key={i}
                className="rounded-lg px-4 py-3 flex items-center gap-3"
                style={{ background: P.surface, border: `1px solid ${P.border}` }}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: riskCol }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold" style={{ color: P.text1 }}>
                    {cat.category}
                  </span>
                  <span className="text-xs ml-2" style={{ color: P.text3 }}>
                    — {cat.explanation}
                  </span>
                </div>
                <span
                  className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-semibold flex-shrink-0"
                  style={{ color: riskCol, background: `${riskCol}15` }}
                >
                  {cat.targetStatus}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════
//  12-MONTH INACTION PROJECTION (bar chart)
// ══════════════════════════════════════════════════════

function InactionProjection({ impact }: { impact: AuditReportPayload["financialImpact"] }) {
  const [ref, inView] = useInView(0.3);
  const daily = impact.dailyBleedEur;
  const months = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    // compound: month-over-month 1.5% increase (inaction compounds)
    const cumulative = daily * 30 * m * (1 + 0.015 * m);
    return { month: m, cumulative: Math.round(cumulative) };
  });
  const maxCumul = months[months.length - 1].cumulative;

  return (
    <section ref={ref} className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <SectionLabel color={P.red}>Projection 12 mois — Coût de l&apos;inaction</SectionLabel>
      <p className="text-xs mt-1 mb-6" style={{ color: P.text3 }}>
        À {Math.round(daily)} €/jour, l&apos;inaction coûtera{" "}
        <span className="font-mono font-bold" style={{ color: P.red }}>
          {fmtEurFull(impact.inactionCost12MonthsEur)}
        </span>{" "}
        sur 12 mois (projection compound).
      </p>

      <div className="flex items-end gap-1 sm:gap-2 h-48 sm:h-56">
        {months.map((m) => {
          const heightPct = inView ? (m.cumulative / maxCumul) * 100 : 0;
          const isHot = m.month >= 7;
          return (
            <div key={m.month} className="flex-1 flex flex-col items-center justify-end h-full">
              <span
                className="text-[9px] font-mono mb-1 hidden sm:block"
                style={{ color: P.text3 }}
              >
                {fmtEur(m.cumulative)}
              </span>
              <div
                className="w-full rounded-t"
                style={{
                  height: `${heightPct}%`,
                  background: isHot
                    ? `linear-gradient(180deg, ${P.red}, ${P.redMuted})`
                    : `linear-gradient(180deg, ${P.amber}, ${P.amber}99)`,
                  boxShadow: isHot ? `0 0 8px ${P.redGlow}` : "none",
                  transition: "height 1.5s cubic-bezier(0.22, 1, 0.36, 1)",
                  transitionDelay: `${m.month * 80}ms`,
                }}
              />
              <span className="text-[10px] mt-1 font-mono" style={{ color: P.text4 }}>
                M{m.month}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════
//  CHECKOUT CARD — Closing Tunnel
// ══════════════════════════════════════════════════════

function CheckoutCard({ payload }: { payload: AuditReportPayload }) {
  const tvar = payload.shadowBill.tvar.totalValueAtRisk;
  const annual = tvar * 12;
  const recovery90 = payload.financialImpact.recoveryPotential90DaysEur;
  const price = 490;
  const roi = annual > 0 ? Math.round(annual / price) : 0;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/audit/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: payload.domain }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || "Erreur lors de la création du paiement.");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Connexion impossible. Réessayez.");
      setLoading(false);
    }
  };

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${P.surface}, ${P.panel})`,
          border: `1px solid ${P.blue}30`,
        }}
      >
        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 50% 50% at 50% 0%, ${P.blueGlow}, transparent)`,
          }}
        />

        <div className="relative px-6 sm:px-10 py-10 sm:py-12">
          {/* Badge */}
          <div className="text-center mb-8">
            <span
              className="inline-block text-[10px] uppercase tracking-[0.2em] px-4 py-1.5 rounded-full font-semibold"
              style={{ background: P.blueGlow, color: P.blue, border: `1px solid ${P.blue}30` }}
            >
              Protocole Correctif Disponible
            </span>
          </div>

          {/* Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: P.text3 }}>
                Exposition annuelle
              </p>
              <p className="text-3xl sm:text-4xl font-black font-mono" style={{ color: P.red }}>
                {fmtEur(annual)}
              </p>
              <p className="text-xs mt-1" style={{ color: P.text4 }}>
                TVAR × 12 mois
              </p>
            </div>

            <div className="text-center flex items-center justify-center">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: P.panel, border: `1px solid ${P.border}` }}
              >
                <svg className="w-5 h-5" style={{ color: P.blue }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>

            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: P.text3 }}>
                Récupérable à 90 jours
              </p>
              <p className="text-3xl sm:text-4xl font-black font-mono" style={{ color: P.green }}>
                {fmtEur(recovery90)}
              </p>
              <p className="text-xs mt-1" style={{ color: P.text4 }}>
                Potentiel de récupération
              </p>
            </div>
          </div>

          {/* Price + CTA */}
          <div
            className="rounded-xl p-6 sm:p-8 text-center"
            style={{ background: P.bg, border: `1px solid ${P.borderStrong}` }}
          >
            <p className="text-xs uppercase tracking-wider mb-4" style={{ color: P.text3 }}>
              Plan de Stabilisation Financière
            </p>

            <div className="flex items-baseline justify-center gap-1 mb-2">
              <span className="text-4xl sm:text-5xl font-black font-mono" style={{ color: P.text1 }}>
                490
              </span>
              <span className="text-xl font-bold" style={{ color: P.text3 }}>
                €
              </span>
            </div>
            <p className="text-xs mb-1" style={{ color: P.text3 }}>
              Paiement unique — Rapport complet + Protocole correctif
            </p>
            <p className="text-xs mb-6" style={{ color: P.green }}>
              ROI : {roi}× — L&apos;audit se rembourse en{" "}
              {payload.financialImpact.dailyBleedEur > 0
                ? `${Math.ceil(price / payload.financialImpact.dailyBleedEur)} jour(s)`
                : "quelques jours"}
            </p>

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full sm:w-auto px-10 py-4 rounded-lg text-sm font-bold uppercase tracking-wider transition-all duration-300 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-wait"
              style={{
                background: loading
                  ? P.panel
                  : `linear-gradient(135deg, ${P.blue}, ${P.blueHi})`,
                color: "#ffffff",
                boxShadow: loading
                  ? "none"
                  : `0 0 30px ${P.blueGlow}, 0 4px 20px rgba(0,0,0,0.4)`,
              }}
            >
              {loading ? "Redirection vers Stripe..." : "Initialiser le Protocole"}
            </button>

            {error && (
              <p className="text-xs mt-3" style={{ color: P.red }}>
                {error}
              </p>
            )}

            <p className="text-[10px] mt-4" style={{ color: P.text4 }}>
              Paiement sécurisé Stripe — Livraison sous 48h — Garantie transparence
            </p>
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-8">
            {[
              "Chiffrement AES-256",
              "Rapport confidentiel",
              "Données jamais revendues",
              "Expiration 14 jours",
            ].map((s) => (
              <span key={s} className="text-[10px] uppercase tracking-wider flex items-center gap-1.5" style={{ color: P.text3 }}>
                <span className="w-1 h-1 rounded-full" style={{ background: P.green }} />
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════
//  SHARED UI ATOMS
// ══════════════════════════════════════════════════════

function SectionLabel({
  children,
  color = P.text3,
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <p
      className="text-[10px] uppercase tracking-[0.2em] font-semibold"
      style={{ color }}
    >
      {children}
    </p>
  );
}
