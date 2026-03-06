"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Shield, Lock, Server, Globe, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import ControlPlaneSection from "@/components/ControlPlaneSection";
import CausalGraphSection from "@/components/CausalGraphSection";

/*  VALUGUARD — LANDING PAGE (i18n: EN/FR/DE)
    Navbar is in layout.tsx (global sticky).
    12-section CFO-grade structure. */

const V = "#060912";
const A = "#3b82f6";
const AH = "#60a5fa";
const T1 = "#e0e6f2";
const T2 = "#8d9bb5";
const T3 = "#55637d";
const RD = "#ef4444";
const OR = "#f59e0b";
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

// ── Framer Motion scroll reveal ────────────────────
const reveal = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function Section(props: { delay?: number; style?: React.CSSProperties; children: React.ReactNode }) {
  return (
    <motion.section
      variants={reveal}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: (props.delay || 0) / 1000 }}
      style={Object.assign({ marginBottom: 48 }, props.style || {})}
    >
      {props.children}
    </motion.section>
  );
}

function Label(props: { children: React.ReactNode }) {
  return (
    <span style={{ display: "block", fontSize: 10, fontWeight: 600, fontFamily: MO, letterSpacing: ".14em", textTransform: "uppercase", color: A, marginBottom: 10 }}>
      {props.children}
    </span>
  );
}

// ── Estimator Widget (PDF Section 2 — Instant Leak & ROI) ──
function EstimatorWidget({ t, formatCurrency }: { t: (k: string) => string; formatCurrency: (n: number, compact?: boolean) => string }) {
  const [employees, setEmployees] = useState(120);
  const [budget, setBudget] = useState(480000);

  const result = useMemo(() => {
    const monthly = budget / 12;
    const kappa = employees <= 50 ? 0 : 0.04 * Math.log(employees / 50);
    const baseLeakPct = 0.15 + kappa * 0.6;
    const exposure = Math.round(monthly * baseLeakPct * 12);
    const tensionRaw = Math.min(99, Math.round(30 + kappa * 200 + (budget > 600000 ? 15 : 0)));
    const window = Math.max(20, Math.round(90 - tensionRaw * 0.5));
    const leverCount = tensionRaw >= 60 ? 5 : tensionRaw >= 40 ? 4 : 3;
    return { exposure, tension: tensionRaw, window, leverCount };
  }, [employees, budget]);

  const tensionColor = result.tension >= 60 ? "#ef4444" : result.tension >= 40 ? "#f59e0b" : result.tension >= 25 ? "#60a5fa" : "#34d399";
  const tensionLabel = result.tension >= 60 ? t("est.widget.tension.critical") : result.tension >= 40 ? t("est.widget.tension.elevated") : result.tension >= 25 ? t("est.widget.tension.moderate") : t("est.widget.tension.low");
  const leverKeys = ["est.widget.lever1", "est.widget.lever2", "est.widget.lever3", "est.widget.lever4", "est.widget.lever5"];

  return (
    <Section>
      <div style={Object.assign({}, gl, { padding: 28 })}>
        <Label>{t("est.widget.title")}</Label>
        <p style={{ fontSize: 12, color: T2, marginBottom: 20 }}>{t("est.widget.sub")}</p>

        {/* Sliders */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
          <div>
            <label style={{ display: "block", fontSize: 9, fontFamily: MO, color: T3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>{t("est.widget.employees")}</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="range" min={10} max={500} step={10} value={employees} onChange={(e) => setEmployees(Number(e.target.value))} style={{ flex: 1, accentColor: A }} />
              <span style={{ fontFamily: MO, fontSize: 16, fontWeight: 800, color: AH, minWidth: 40, textAlign: "right" }}>{employees}</span>
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 9, fontFamily: MO, color: T3, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>{t("est.widget.budget")}</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="range" min={50000} max={2000000} step={10000} value={budget} onChange={(e) => setBudget(Number(e.target.value))} style={{ flex: 1, accentColor: A }} />
              <span style={{ fontFamily: MO, fontSize: 16, fontWeight: 800, color: AH, minWidth: 70, textAlign: "right" }}>{formatCurrency(budget, true)}</span>
            </div>
          </div>
        </div>

        {/* Results */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
          <div style={{ padding: 18, borderRadius: 10, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(239,68,68,0.12)", textAlign: "center" }}>
            <p style={{ fontSize: 9, fontFamily: MO, color: T3, textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 8 }}>{t("est.widget.exposure")}</p>
            <p style={{ fontFamily: MO, fontSize: 42, fontWeight: 800, color: "#ef4444", lineHeight: 1, letterSpacing: "-.02em" }}>
              {formatCurrency(result.exposure)}
            </p>
          </div>
          <div style={{ padding: 18, borderRadius: 10, background: "rgba(0,0,0,0.15)", border: "1px solid rgba(36,48,78,0.18)", textAlign: "center" }}>
            <p style={{ fontSize: 9, fontFamily: MO, color: T3, textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 8 }}>{t("est.widget.tension")}</p>
            <p style={{ fontFamily: MO, fontSize: 32, fontWeight: 800, color: tensionColor, lineHeight: 1 }}>{result.tension}</p>
            <p style={{ fontSize: 8, fontFamily: MO, fontWeight: 600, letterSpacing: ".1em", color: tensionColor, marginTop: 4 }}>{tensionLabel}</p>
          </div>
          <div style={{ padding: 18, borderRadius: 10, background: "rgba(0,0,0,0.15)", border: "1px solid rgba(36,48,78,0.18)", textAlign: "center" }}>
            <p style={{ fontSize: 9, fontFamily: MO, color: T3, textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 8 }}>{t("est.widget.window")}</p>
            <p style={{ fontFamily: MO, fontSize: 32, fontWeight: 800, color: "#f59e0b", lineHeight: 1 }}>{result.window}</p>
            <p style={{ fontSize: 8, fontFamily: MO, color: T3, marginTop: 4 }}>{t("est.widget.window.val")}</p>
          </div>
        </div>

        {/* Corrective Levers */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 9, fontFamily: MO, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: T3, marginBottom: 8 }}>{t("est.widget.levers")}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {leverKeys.slice(0, result.leverCount).map((key, i) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6, background: "rgba(59,130,246,0.03)", border: "1px solid rgba(59,130,246,0.08)" }}>
                <span style={{ fontFamily: MO, fontSize: 10, fontWeight: 700, color: A, minWidth: 16 }}>0{i + 1}</span>
                <span style={{ fontSize: 11, color: T2 }}>{t(key)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center" }}>
          <a href="/estimator" style={{ display: "inline-block", padding: "14px 32px", borderRadius: 8, background: TL, color: V, fontSize: 13, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", textDecoration: "none", transition: "opacity 0.15s" }}>
            {t("est.widget.cta")} &rarr;
          </a>
          <p style={{ fontSize: 9, color: T3, marginTop: 8 }}>{t("est.widget.micro")}</p>
        </div>
      </div>
    </Section>
  );
}

const SEC_ICONS = [
  <Shield key="s" size={20} />,
  <Lock key="l" size={20} />,
  <Server key="sv" size={20} />,
  <Globe key="g" size={20} />,
  <Trash2 key="t" size={20} />,
];

// ══════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════
export default function LandingPage() {
  const { t, formatCurrency } = useI18n();

  const PRICING = [
    {
      name: t("price.diag.name"),
      price: t("price.diag.price"),
      period: t("price.period.onetime"),
      desc: t("price.diag.desc"),
      features: [t("price.diag.f1"), t("price.diag.f2"), t("price.diag.f3"), t("price.diag.f4"), t("price.diag.f5")],
      cta: t("price.diag.cta"),
      href: "/estimator",
      highlight: false,
      badge: t("price.diag.badge"),
      roi: t("price.diag.roi"),
      tier: "entry" as const,
    },
    {
      name: t("price.protocol.name"),
      price: t("price.protocol.price"),
      period: "",
      desc: t("price.protocol.desc"),
      features: [t("price.protocol.f1"), t("price.protocol.f2"), t("price.protocol.f3"), t("price.protocol.f4"), t("price.protocol.f5")],
      cta: t("price.protocol.cta"),
      href: "/sample-report",
      highlight: true,
      badge: t("price.protocol.badge"),
      roi: t("price.protocol.roi"),
      tier: "core" as const,
    },
    {
      name: t("price.controlplane.name"),
      price: t("price.controlplane.price"),
      period: "",
      desc: t("price.controlplane.desc"),
      features: [t("price.controlplane.f1"), t("price.controlplane.f2"), t("price.controlplane.f3"), t("price.controlplane.f4"), t("price.controlplane.f5")],
      cta: t("price.controlplane.cta"),
      href: "mailto:sales@valuguard.com",
      highlight: false,
      badge: t("price.controlplane.badge"),
      roi: t("price.controlplane.roi"),
      tier: "premium" as const,
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: V, fontFamily: SA, color: T1 }}>
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 16px" }}>

        {/* ═══════ 1. HERO ═══════ */}
        <Section style={{ textAlign: "center", paddingTop: 56, paddingBottom: 48 }}>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: A, fontFamily: MO, marginBottom: 16 }}>
            {t("hero.badge")}
          </p>
          <h1 style={{ fontSize: "clamp(38px, 6vw, 64px)", fontWeight: 800, lineHeight: 1.08, letterSpacing: "-.03em", marginBottom: 16, maxWidth: 700, margin: "0 auto 16px" }}>
            {t("hero.title1")}
            <br />
            <span style={{ color: AH }}>{t("hero.title2")}</span>
          </h1>
          <p style={{ fontSize: 16, color: T2, maxWidth: 560, margin: "0 auto 28px", lineHeight: 1.6 }}>
            {t("hero.sub")}
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <a href="/estimator" style={{ display: "inline-block", padding: "14px 28px", borderRadius: 8, background: TL, color: V, fontSize: 13, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", textDecoration: "none", transition: "opacity 0.15s" }}>
              {t("hero.cta1")} &rarr;
            </a>
            <a href="/sample-report" style={{ display: "inline-block", padding: "14px 24px", borderRadius: 8, border: "1px solid " + BD, color: T2, fontSize: 13, fontWeight: 500, textDecoration: "none", transition: "border-color 0.15s, color 0.15s" }}>
              {t("hero.cta2")}
            </a>
          </div>
        </Section>

        {/* ═══════ 2. THE PROBLEM ═══════ */}
        <Section>
          <div style={Object.assign({}, gl, { padding: 28 })}>
            <Label>{t("problem.label")}</Label>
            <h2 style={{ fontSize: "clamp(26px, 3.5vw, 36px)", fontWeight: 700, marginBottom: 12, lineHeight: 1.2 }}>
              {t("problem.title1")} <span style={{ color: RD }}>{t("problem.title2")}</span>
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 16 }}>
              {[
                { amt: t("problem.amt1"), label: t("problem.desc1"), color: RD },
                { amt: t("problem.amt2"), label: t("problem.desc2"), color: OR },
                { amt: t("problem.amt3"), label: t("problem.desc3"), color: RD },
              ].map(function (item) {
                return (
                  <div key={item.label} style={{ padding: 16, borderRadius: 9, background: "rgba(0,0,0,0.15)", border: "1px solid rgba(36,48,78,0.18)", textAlign: "center" }}>
                    <p style={{ fontFamily: MO, fontSize: 22, fontWeight: 800, color: item.color, marginBottom: 6 }}>{item.amt}</p>
                    <p style={{ fontSize: 11, color: T2, lineHeight: 1.4 }}>{item.label}</p>
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize: 12, color: T3, textAlign: "center", marginTop: 16, fontFamily: MO }}>
              {t("problem.source")}
            </p>
          </div>
        </Section>

        {/* ═══════ 3. AUDIT FRAMEWORK ═══════ */}
        <ControlPlaneSection t={t} />

        {/* ═══════ 4. CAUSAL FINANCIAL GRAPH ═══════ */}
        <CausalGraphSection t={t} />

        {/* ═══════ 5. PROCESS ═══════ */}
        <Section>
          <div style={Object.assign({}, gl, { padding: 28 })}>
            <Label>{t("proc.label")}</Label>
            <h2 style={{ fontSize: "clamp(26px, 3.5vw, 36px)", fontWeight: 700, marginBottom: 8, lineHeight: 1.15 }}>
              {t("proc.title")}
            </h2>
            <p style={{ fontSize: 14, color: T2, marginBottom: 24, maxWidth: 620, lineHeight: 1.6 }}>
              {t("proc.sub")}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
              {(["proc.s1", "proc.s2", "proc.s3", "proc.s4", "proc.s5"] as const).map(function (key, i) {
                return (
                  <motion.div
                    key={key}
                    variants={reveal}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    transition={{ duration: 0.45, delay: i * 0.07 }}
                    style={{
                      padding: 16,
                      borderRadius: 10,
                      background: "rgba(0,0,0,0.15)",
                      border: "1px solid rgba(36,48,78,0.18)",
                      position: "relative",
                    }}
                  >
                    <div style={{ fontFamily: MO, fontSize: 28, fontWeight: 800, color: "rgba(59,130,246,0.08)", position: "absolute", top: 8, right: 12 }}>
                      0{i + 1}
                    </div>
                    <h3 style={{ fontSize: 12, fontWeight: 700, color: T1, marginBottom: 4 }}>{t(key)}</h3>
                    <p style={{ fontSize: 10, color: T2, lineHeight: 1.5 }}>{t(key + ".desc")}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </Section>

        {/* ═══════ 6. FINANCIAL IMPACT ═══════ */}
        <Section>
          <div style={Object.assign({}, gl, { padding: 28 })}>
            <Label>{t("fi.label")}</Label>
            <h2 style={{ fontSize: "clamp(26px, 3.5vw, 36px)", fontWeight: 700, marginBottom: 8, lineHeight: 1.15 }}>
              {t("fi.title")}
            </h2>
            <p style={{ fontSize: 14, color: T2, marginBottom: 24, maxWidth: 620, lineHeight: 1.6 }}>
              {t("fi.sub")}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              {[
                { value: t("fi.m1.value"), label: t("fi.m1.label"), color: TL },
                { value: t("fi.m2.value"), label: t("fi.m2.label"), color: AH },
                { value: t("fi.m3.value"), label: t("fi.m3.label"), color: OR },
              ].map(function (m) {
                return (
                  <div key={m.label} style={{ padding: 20, borderRadius: 10, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(36,48,78,0.18)", textAlign: "center" }}>
                    <p style={{ fontFamily: MO, fontSize: 36, fontWeight: 800, color: m.color, lineHeight: 1, marginBottom: 8 }}>{m.value}</p>
                    <p style={{ fontSize: 12, color: T2, lineHeight: 1.4 }}>{m.label}</p>
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize: 10, color: T3, textAlign: "center", marginTop: 14, fontFamily: MO }}>
              {t("fi.source")}
            </p>
          </div>
        </Section>

        {/* ═══════ 7. INSTANT ESTIMATOR ═══════ */}
        <EstimatorWidget t={t} formatCurrency={formatCurrency} />

        {/* ═══════ 8. PRICING ═══════ */}
        <Section>
          <div id="pricing" style={{ textAlign: "center", marginBottom: 24 }}>
            <Label>{t("price.label")}</Label>
            <h2 style={{ fontSize: "clamp(26px, 3.5vw, 36px)", fontWeight: 700, marginBottom: 8 }}>{t("price.title")}</h2>
            <p style={{ fontSize: 13, color: T2, maxWidth: 560, margin: "0 auto", lineHeight: 1.6 }}>{t("price.sub")}</p>
          </div>

          {/* Process progression bar */}
          <div style={Object.assign({}, gl, { padding: "18px 24px", marginBottom: 28 })}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto 1fr", alignItems: "center", gap: 0 }}>
              {[
                { step: t("price.step.s1"), name: t("price.diag.name"), color: AH },
                { step: t("price.step.s2"), name: t("price.protocol.name"), color: TL },
                { step: t("price.step.s3"), name: t("price.controlplane.name"), color: A },
              ].map(function (s, i) {
                return (
                  <div key={s.step} style={{ display: "contents" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontFamily: MO, fontSize: 11, fontWeight: 800, color: s.color, width: 22, height: 22, borderRadius: "50%", border: "1.5px solid " + s.color + "40", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                          {i + 1}
                        </span>
                        <span style={{ fontSize: 9, fontFamily: MO, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: T3 }}>{s.step}</span>
                      </div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: s.color, lineHeight: 1.3 }}>{s.name}</p>
                    </div>
                    {i < 2 && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0 8px" }}>
                        <svg width="24" height="14" viewBox="0 0 24 14" fill="none">
                          <path d="M2 7h16M14 2l5 5-5 5" stroke={T3} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {PRICING.map(function (tier) {
              var isPremium = tier.tier === "premium";
              return (
                <motion.div
                  key={tier.name}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                  style={Object.assign({}, gl, {
                    padding: 24,
                    borderColor: tier.highlight ? TL + "40" : isPremium ? A + "25" : BD,
                    position: "relative" as const,
                    display: "flex",
                    flexDirection: "column" as const,
                  })}
                >
                  {/* Badge */}
                  <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", fontSize: 8, fontFamily: MO, fontWeight: 700, padding: "3px 10px", borderRadius: 4, background: tier.highlight ? TL : isPremium ? A : "rgba(36,48,78,0.5)", color: tier.highlight ? V : isPremium ? "#fff" : T2, letterSpacing: ".06em", textTransform: "uppercase", whiteSpace: "nowrap" as const }}>
                    {tier.badge}
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: T1, marginBottom: 8, marginTop: 4 }}>{tier.name}</h3>
                  <div style={{ marginBottom: 10 }}>
                    <span style={{ fontFamily: MO, fontSize: isPremium ? 18 : 28, fontWeight: 800, color: tier.highlight ? TL : AH, letterSpacing: isPremium ? ".02em" : "-.02em" }}>{tier.price}</span>
                    {tier.period && <span style={{ fontSize: 12, color: T3, marginLeft: 2 }}>{tier.period}</span>}
                  </div>
                  <p style={{ fontSize: 11, color: T2, lineHeight: 1.5, marginBottom: 16 }}>{tier.desc}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16, flex: 1 }}>
                    {tier.features.map(function (f) {
                      return (
                        <div key={f} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: T2 }}>
                          <CheckCircle size={13} color={TL} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                          {f}
                        </div>
                      );
                    })}
                  </div>

                  {/* ROI proof line */}
                  <div style={{ padding: "8px 10px", borderRadius: 6, background: "rgba(52,211,153,0.03)", border: "1px solid rgba(52,211,153,0.08)", marginBottom: 14 }}>
                    <p style={{ fontSize: 9, fontFamily: MO, color: TL, letterSpacing: ".04em", textAlign: "center" }}>{tier.roi}</p>
                  </div>

                  <a
                    href={tier.href}
                    style={{
                      display: "block", width: "100%", padding: "11px", borderRadius: 7, border: "none",
                      background: tier.highlight ? TL : isPremium ? "rgba(59,130,246,0.12)" : "rgba(59,130,246,0.08)",
                      color: tier.highlight ? V : AH,
                      fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase",
                      cursor: "pointer", textDecoration: "none", textAlign: "center",
                      transition: "opacity 0.15s",
                      boxSizing: "border-box",
                    }}
                  >
                    {tier.cta}
                  </a>
                </motion.div>
              );
            })}
          </div>
          <p style={{ fontSize: 10, color: T3, textAlign: "center", marginTop: 14 }}>
            {t("price.note")}
          </p>
        </Section>

        {/* ═══════ 9. SAMPLE REPORT ═══════ */}
        <Section>
          <div style={Object.assign({}, gl, { padding: 28 })}>
            <Label>{t("sr.label")}</Label>
            <h2 style={{ fontSize: "clamp(26px, 3.5vw, 36px)", fontWeight: 700, marginBottom: 8, lineHeight: 1.15 }}>
              {t("sr.title")}
            </h2>
            <p style={{ fontSize: 14, color: T2, marginBottom: 24, maxWidth: 620, lineHeight: 1.6 }}>
              {t("sr.sub")}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
              {["sr.i1", "sr.i2", "sr.i3"].map(function (key) {
                return (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 8, background: "rgba(0,0,0,0.15)", border: "1px solid rgba(36,48,78,0.18)" }}>
                    <CheckCircle size={16} color={TL} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: T2 }}>{t(key)}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ textAlign: "center" }}>
              <a href="/sample-report" style={{ display: "inline-block", padding: "12px 28px", borderRadius: 8, border: "1px solid " + BD, color: AH, fontSize: 13, fontWeight: 700, letterSpacing: ".04em", textDecoration: "none", transition: "border-color 0.15s" }}>
                {t("sr.cta")} &rarr;
              </a>
            </div>
          </div>
        </Section>

        {/* ═══════ 10. SECURITY & TRUST ═══════ */}
        <Section>
          <div style={Object.assign({}, gl, { padding: 28 })}>
            <Label>{t("sec.label")}</Label>
            <h2 style={{ fontSize: "clamp(26px, 3.5vw, 36px)", fontWeight: 700, marginBottom: 24, lineHeight: 1.15 }}>
              {t("sec.title")}
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {(["sec.i1", "sec.i2", "sec.i3", "sec.i4", "sec.i5"] as const).map(function (key, i) {
                return (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      padding: 16,
                      borderRadius: 10,
                      background: "rgba(0,0,0,0.12)",
                      border: "1px solid rgba(36,48,78,0.18)",
                      gridColumn: i === 4 ? "1 / -1" : undefined,
                    }}
                  >
                    <div style={{ color: A, flexShrink: 0, marginTop: 2 }}>{SEC_ICONS[i]}</div>
                    <div>
                      <h3 style={{ fontSize: 13, fontWeight: 700, color: T1, marginBottom: 2 }}>{t(key)}</h3>
                      <p style={{ fontSize: 11, color: T2, lineHeight: 1.5 }}>{t(key + ".desc")}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Section>

        {/* ═══════ 11. ECONOMIC ALIGNMENT ═══════ */}
        <Section>
          <div style={Object.assign({}, gl, { padding: 32, textAlign: "center" as const })}>
            <Label>{t("ea.label")}</Label>
            <h2 style={{ fontSize: "clamp(26px, 3.5vw, 36px)", fontWeight: 700, marginBottom: 20, lineHeight: 1.15 }}>
              {t("ea.title")}
            </h2>
            <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
              {["ea.l1", "ea.l2", "ea.l3"].map(function (key) {
                return (
                  <p key={key} style={{ fontSize: 14, color: T2, lineHeight: 1.6 }}>
                    {t(key)}
                  </p>
                );
              })}
            </div>
          </div>
        </Section>

        {/* ═══════ 12. FINAL CTA ═══════ */}
        <Section>
          <div style={Object.assign({}, gl, { padding: 32, textAlign: "center" as const })}>
            <p style={{ fontSize: 10, fontFamily: MO, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: RD, marginBottom: 8 }}>
              {t("cta.urgency")}
            </p>
            <h2 style={{ fontSize: "clamp(26px, 3.5vw, 36px)", fontWeight: 800, marginBottom: 8 }}>
              {t("cta.title1")} <span style={{ color: TL }}>{t("cta.title2")}</span>
            </h2>
            <p style={{ fontSize: 14, color: T2, maxWidth: 480, margin: "0 auto 20px", lineHeight: 1.5 }}>
              {t("cta.sub")}
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
              <a id="audit" href="/estimator" style={{ display: "inline-block", padding: "14px 28px", borderRadius: 8, background: TL, color: V, fontSize: 13, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", textDecoration: "none", transition: "opacity 0.15s" }}>
                {t("cta.primary")}
              </a>
              <a href="mailto:audits@valuguard.com" style={{ display: "inline-block", padding: "14px 22px", borderRadius: 8, border: "1px solid " + BD, color: T2, fontSize: 13, textDecoration: "none", transition: "border-color 0.15s, color 0.15s" }}>
                {t("cta.secondary")}
              </a>
            </div>
          </div>
        </Section>

        {/* ═══════ FOOTER ═══════ */}
        <footer style={{ borderTop: "1px solid " + BD, padding: "32px 0", marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 24 }}>
            <div>
              <span style={{ fontSize: 12, fontFamily: MO, fontWeight: 700, color: A, letterSpacing: ".06em" }}>VALUGUARD</span>
              <p style={{ fontSize: 11, color: T3, marginTop: 6, maxWidth: 240, lineHeight: 1.5 }}>
                {t("footer.desc")}
              </p>
            </div>
            <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
              <div>
                <p style={{ fontSize: 9, fontFamily: MO, color: T3, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>{t("footer.product")}</p>
                {[
                  { label: t("footer.link.audit"), href: "/estimator" },
                  { label: t("footer.link.methodology"), href: "/methodology" },
                  { label: t("footer.link.sample"), href: "/sample-report" },
                  { label: t("footer.link.pricing"), href: "#pricing" },
                ].map(function (link) {
                  return <a key={link.label} href={link.href} style={{ display: "block", fontSize: 11, color: T2, marginBottom: 5, textDecoration: "none", transition: "color 0.12s" }}>{link.label}</a>;
                })}
              </div>
              <div>
                <p style={{ fontSize: 9, fontFamily: MO, color: T3, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>{t("footer.trust")}</p>
                {[
                  { label: t("footer.link.vault"), href: "/security-vault" },
                  { label: t("footer.link.privacy"), href: "/security-vault" },
                  { label: t("footer.link.terms"), href: "/security-vault" },
                  { label: "DPO", href: "mailto:security@valuguard.com" },
                ].map(function (link) {
                  return <a key={link.label} href={link.href} style={{ display: "block", fontSize: 11, color: T2, marginBottom: 5, textDecoration: "none", transition: "color 0.12s" }}>{link.label}</a>;
                })}
              </div>
              <div>
                <p style={{ fontSize: 9, fontFamily: MO, color: T3, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>{t("footer.resources")}</p>
                {[
                  { label: t("footer.link.peergap"), href: "/peer-gap" },
                  { label: t("footer.link.roi"), href: "/roi-report" },
                  { label: t("footer.link.estimator"), href: "/estimator" },
                ].map(function (link) {
                  return <a key={link.label} href={link.href} style={{ display: "block", fontSize: 11, color: T2, marginBottom: 5, textDecoration: "none", transition: "color 0.12s" }}>{link.label}</a>;
                })}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, paddingTop: 16, borderTop: "1px solid " + BD, flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {[
                { label: t("footer.badge1") },
                { label: t("footer.badge2") },
                { label: t("footer.badge3") },
                { label: t("footer.badge4") },
              ].map(function (b) {
                return (
                  <span key={b.label} style={{ fontSize: 9, color: T3, fontFamily: MO, letterSpacing: ".04em" }}>
                    {b.label}
                  </span>
                );
              })}
            </div>
            <p style={{ fontSize: 9, color: T3 }}>
              {t("footer.copyright")}
            </p>
          </div>
        </footer>

      </div>
    </div>
  );
}
