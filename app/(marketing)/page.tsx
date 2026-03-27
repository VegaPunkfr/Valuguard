"use client";

import { useState, useCallback, useEffect, useRef, lazy, Suspense } from "react";
import { CheckCircle, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cWarm as c, fWarm as f } from "@/lib/tokens";

const LeakCounter = lazy(() => import("@/components/ui/leak-counter").then(m => ({ default: m.LeakCounter })));

/* ─── SVG noise grain for premium paper texture (Skill 2) ─── */
const NOISE_SVG = `data:image/svg+xml;base64,${typeof window !== "undefined" ? btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch"/></filter><rect width="200" height="200" filter="url(#n)" opacity="1"/></svg>`) : ""}`;

/* ─── Hook: count-up animation ──────────────────────── */
function useCountUp(target: number, duration: number, active: boolean): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [active, target, duration]);

  return value;
}

/* ─── Hook: scroll reveal via IntersectionObserver (Skill 9 — CSS only) ─── */
function useScrollReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("gt-in-view");
          observer.unobserve(el);
        }
      },
      { threshold: 0.08 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

/* ─── Shared styles ─── */
const MAX_W = 1120; // Skill 1: max content width

const sectionSpacing = "clamp(64px, 8vw, 104px)"; // Skill 1: 104px desktop

const sectionLabel: React.CSSProperties = {
  fontFamily: f.mono,
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  color: "#64748B", // Skill 6: labels
  marginBottom: 14,
};

const sectionHeading: React.CSSProperties = {
  fontSize: "clamp(1.5rem, 1rem + 2vw, 2.25rem)", // Skill 5
  fontWeight: 700,
  letterSpacing: "-0.02em",
  lineHeight: 1.1,
  color: "#0F172A", // Skill 6: headlines
  marginBottom: 0,
};

/* 3-layer card shadow (Skill 3) */
const cardShadow = "0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.06), 0 4px 24px rgba(0,0,0,0.04)";
const cardShadowHover = "0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.10), 0 8px 32px rgba(0,0,0,0.06)";

/* ─── Main ───────────────────────────────────────────── */
export default function LandingPage() {
  const { t, locale } = useI18n();
  const [heroInput, setHeroInput] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState(false);

  // Stats visibility for count-up
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = statsRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setStatsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Count-up values
  const valAudits = useCountUp(200, 1200, statsVisible);
  const valRecoverable = useCountUp(142, 1600, statsVisible);

  // Scroll reveal refs (Skill 9)
  const refExposure = useScrollReveal<HTMLDivElement>();
  const refTestimonials = useScrollReveal<HTMLDivElement>();
  const refHowItWorks = useScrollReveal<HTMLDivElement>();
  const refOutput = useScrollReveal<HTMLDivElement>();
  const refTiers = useScrollReveal<HTMLDivElement>();
  const refPricing = useScrollReveal<HTMLDivElement>();
  const refSecurity = useScrollReveal<HTMLDivElement>();
  const refFinalCta = useScrollReveal<HTMLDivElement>();

  const navigateToIntel = useCallback(() => {
    const domain = heroInput.trim();
    window.location.href = domain ? `/intel?domain=${encodeURIComponent(domain)}` : "/intel";
  }, [heroInput]);

  const handleRailACheckout = useCallback(async () => {
    if (checkoutLoading) return;
    setCheckoutLoading(true);
    setCheckoutError(false);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rail: "A", locale }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setCheckoutLoading(false);
        setCheckoutError(true);
      }
    } catch {
      setCheckoutLoading(false);
      setCheckoutError(true);
    }
  }, [checkoutLoading, locale]);

  return (
    <div style={{ minHeight: "100vh", color: "#0F172A", background: "#FFFFFF" }}>

      {/* ═══════════ HERO — Setup (Skill 10 narrative arc) ═══════════ */}
      <section style={{
        position: "relative",
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
      }}>
        {/* Subtle radial glow at top (Skill 3) */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(59,130,246,0.04) 0%, transparent 60%)",
          pointerEvents: "none",
        }} />

        {/* SVG noise grain overlay (Skill 2) */}
        <div style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url("${NOISE_SVG}")`,
          backgroundRepeat: "repeat",
          opacity: 0.015,
          mixBlendMode: "overlay" as const,
          pointerEvents: "none",
        }} />

        {/* Hero content — golden ratio grid (Skill 1) */}
        <div className="gt-hero-layout" style={{
          position: "relative",
          zIndex: 1,
          maxWidth: MAX_W,
          margin: "0 auto",
          padding: "clamp(80px, 10vw, 120px) clamp(20px, 4vw, 32px)",
          display: "grid",
          gridTemplateColumns: "1.618fr 1fr", // Skill 1: golden ratio
          gap: "clamp(32px, 5vw, 64px)",
          alignItems: "center",
          width: "100%",
        }}>

          {/* LEFT — Content (Z-pattern: logo top-left -> CTA) */}
          <div>
            {/* Logo mark — Z start point */}
            <div style={{ marginBottom: "clamp(28px, 4vw, 40px)" }}>
              <img src="/logo.svg" alt="Ghost Tax" width={280} height={65} style={{ height: "auto", display: "block", maxWidth: "100%" }} />
            </div>

            {/* Headline (Skill 5) */}
            <h1 style={{
              fontSize: "clamp(2.25rem, 1.5rem + 3vw, 4rem)", // Skill 5
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.03em", // Skill 5
              marginBottom: "clamp(16px, 2vw, 20px)",
              color: "#0F172A", // Skill 6: headline
            }}>
              {t("hero.headline") || "Your IT spend has blind spots."}
            </h1>

            {/* Subtitle (Skill 5) */}
            <p style={{
              fontSize: "clamp(17px, 1.1vw + 14px, 20px)", // Skill 5: 18-20px
              fontWeight: 400,
              color: "#334155", // Skill 6: body
              maxWidth: 480,
              marginBottom: "clamp(28px, 4vw, 36px)",
              lineHeight: 1.65, // Skill 5
            }}>
              {t("hero.sub2") || "We detect, quantify, and explain hidden financial exposure in SaaS, AI, and Cloud spending."}
            </p>

            {/* CTA button (Skill 4 micro-interactions) — Z diagonal endpoint */}
            <button
              type="button"
              onClick={navigateToIntel}
              className="gt-cta-primary"
              style={{
                padding: "16px 32px",
                fontSize: 15,
                fontWeight: 600,
                background: "#0F172A",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                display: "inline-block",
                minHeight: 44, // Skill 11: touch target
                minWidth: 44,
              }}
            >
              {t("hero.cta.main") || "See my exposure"}
            </button>

            {/* Reassurance line (Skill 6: meta color) */}
            <p style={{
              fontSize: "clamp(12px, 0.8vw + 10px, 13px)",
              color: "#94A3B8", // Skill 6: meta
              marginTop: 14,
              letterSpacing: "0.01em",
            }}>
              {t("hero.reassurance") || "No sign-up required \u00b7 Results in 2 min \u00b7 Zero system access"}
            </p>

            {/* Social proof — Z bottom-left (Skill 5: metrics) */}
            <div style={{
              marginTop: "clamp(28px, 4vw, 40px)",
              paddingTop: "clamp(20px, 3vw, 28px)",
              borderTop: "1px solid rgba(0,0,0,0.06)",
            }}>
              <p style={{
                fontFamily: f.mono,
                fontSize: 11,
                color: "#94A3B8",
                letterSpacing: "0.1em",
                textTransform: "uppercase" as const,
                fontVariantNumeric: "tabular-nums", // Skill 5: metrics
              }}>
                {t("hero.social") || "200+ analyses delivered \u00b7 Average exposure: 247k\u2013341k EUR"}
              </p>
            </div>
          </div>

          {/* RIGHT — Decision Pack Preview Card (Skill 2: glass surface) */}
          <div className="gt-hero-card" style={{
            background: "rgba(255,255,255,0.80)", // Skill 2: frosted
            backdropFilter: "blur(12px)", // Skill 2
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(0,0,0,0.06)", // Skill 2
            borderRadius: 12,
            padding: "clamp(22px, 3vw, 28px)",
            boxShadow: cardShadow, // Skill 3: 3-layer
          }}>
            <p style={{
              ...sectionLabel,
              marginBottom: 16,
            }}>
              SAMPLE OUTPUT — DECISION PACK
            </p>

            {/* Company header */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontFamily: f.mono, fontSize: 13, fontWeight: 600, color: "#0F172A" }}>acme-corp.com</p>
              <p style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>SaaS / 340 employees / DACH market</p>
            </div>

            {/* Exposure */}
            <div style={{ background: "#F8FAFC", borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <p style={{
                fontFamily: f.mono, fontSize: 10, color: "#94A3B8",
                letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 8,
              }}>ANNUAL EXPOSURE DETECTED</p>
              <p style={{
                fontFamily: f.mono, fontSize: "clamp(22px, 2vw + 14px, 28px)",
                fontWeight: 700, color: "#0F172A", letterSpacing: "-0.02em",
                fontVariantNumeric: "tabular-nums",
              }}>
                247k &ndash; 341k <span style={{ fontSize: 16, color: "#64748B" }}>EUR</span>
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                {/* Skill 6: 3-layer badge colors */}
                <span style={{
                  fontFamily: f.mono, fontSize: 10, padding: "3px 8px", borderRadius: 4,
                  background: "rgba(34,197,94,0.06)", // 6% bg
                  border: "1px solid rgba(34,197,94,0.15)", // 15% border
                  color: "#22C55E", // full color text
                  fontWeight: 600,
                }}>CONFIDENCE 62/100</span>
                <span style={{
                  fontFamily: f.mono, fontSize: 10, padding: "3px 8px", borderRadius: 4,
                  background: "rgba(59,130,246,0.06)",
                  border: "1px solid rgba(59,130,246,0.15)",
                  color: "#3B82F6",
                  fontWeight: 600,
                }}>HIGH PRIORITY</span>
              </div>
            </div>

            {/* Findings */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "License waste \u2014 34% seats unused", badge: "OBSERVED", color: "#22C55E", bg: "rgba(34,197,94,0.06)", bd: "rgba(34,197,94,0.15)" },
                { label: "Vendor overlap \u2014 3 CRM tools active", badge: "OBSERVED", color: "#22C55E", bg: "rgba(34,197,94,0.06)", bd: "rgba(34,197,94,0.15)" },
                { label: "Shadow AI \u2014 untracked API spend", badge: "DERIVED", color: "#3B82F6", bg: "rgba(59,130,246,0.06)", bd: "rgba(59,130,246,0.15)" },
                { label: "Auto-renewal trap \u2014 47 days", badge: "ESTIMATED", color: "#94A3B8", bg: "rgba(148,163,184,0.06)", bd: "rgba(148,163,184,0.15)" },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "#334155", lineHeight: 1.65 }}>{item.label}</span>
                  <span style={{
                    fontFamily: f.mono, fontSize: 9, padding: "2px 6px", borderRadius: 3,
                    background: item.bg, border: `1px solid ${item.bd}`, color: item.color,
                    fontWeight: 600, letterSpacing: "0.06em", flexShrink: 0, marginLeft: 8,
                  }}>{item.badge}</span>
                </div>
              ))}
            </div>

            {/* Redacted sections */}
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px dashed rgba(0,0,0,0.06)" }}>
              {["CFO memo", "Negotiation playbooks", "30/60/90 protocol"].map((s) => (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: "#E2E8F0" }} />
                  <span style={{ fontSize: 12, color: "#CBD5E1" }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ SOCIAL PROOF BAR — Z bottom-right → CTA ═══════════ */}
      <section style={{
        padding: "clamp(28px, 4vw, 40px) 0",
        borderTop: "1px solid rgba(0,0,0,0.06)",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
        textAlign: "center",
      }}>
        <div style={{ maxWidth: MAX_W, margin: "0 auto", padding: "0 clamp(20px, 4vw, 28px)" }}>
          <p style={{
            fontFamily: f.mono, fontSize: 11, color: "#94A3B8",
            letterSpacing: "0.1em", textTransform: "uppercase" as const,
            fontVariantNumeric: "tabular-nums",
          }}>
            200+ analyses delivered &middot; Average exposure: 247k&ndash;341k EUR &middot; 48h delivery
          </p>
        </div>
      </section>

      <div style={{ maxWidth: MAX_W, margin: "0 auto", padding: `0 clamp(20px, 4vw, 28px)` }}>

        {/* ═══════════ STATS — 4 cards ═══════════ */}
        <div
          className="gt-section-reveal"
          style={{ paddingTop: sectionSpacing, paddingBottom: "clamp(36px, 5vw, 48px)" }}
        >
          <div ref={statsRef} className="gt-stats-grid" style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
            gap: "clamp(12px, 2vw, 20px)",
          }}>
            {[
              { value: `${valAudits}+`, label: t("landing.stats.analysesDesc"), color: "#0F172A" },
              { value: t("landing.stats.delivery"), label: t("landing.stats.deliveryDesc"), color: "#22C55E" },
              { value: "247k\u2013341k", label: t("landing.stats.exposureDesc"), color: "#3B82F6" },
              { value: `${valRecoverable}k`, label: "EUR avg. recoverable", color: "#3B82F6" },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="gt-card-hover gt-stagger-item"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid rgba(0,0,0,0.06)",
                  borderRadius: 14,
                  padding: "clamp(20px, 3vw, 28px)",
                  textAlign: "center",
                  boxShadow: cardShadow, // Skill 3
                  animationDelay: `${i * 40}ms`, // Skill 9: 40ms stagger
                }}
              >
                <p style={{
                  fontFamily: f.mono, fontSize: "clamp(24px, 2vw + 16px, 32px)", fontWeight: 700,
                  marginBottom: 6, color: stat.color,
                  fontVariantNumeric: "tabular-nums", // Skill 5: metrics
                }}>{stat.value}</p>
                <p style={{ fontSize: "clamp(12px, 0.8vw + 10px, 13px)", color: "#64748B", lineHeight: 1.65 }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════ EXPOSURE SHOCK — Tension (Skill 10) ═══════════ */}
        <div
          ref={refExposure}
          className="gt-section-reveal"
          style={{ paddingTop: sectionSpacing, paddingBottom: sectionSpacing }}
        >
          <p style={sectionLabel}>
            {t("landing.compare.label")}
          </p>
          <h2 style={{
            ...sectionHeading,
            marginBottom: "clamp(36px, 5vw, 56px)",
            maxWidth: 520,
          }}>
            {t("landing.compare.title")}
          </h2>

          <div className="gt-comp-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(16px, 2vw, 28px)" }}>
            {/* BEFORE */}
            <div className="gt-card-hover" style={{
              background: "#FEF2F2",
              borderRadius: 16,
              padding: "clamp(28px, 4vw, 40px)",
              borderLeft: "3px solid #EF4444",
              boxShadow: cardShadow,
            }}>
              <span style={{
                fontFamily: f.mono, fontSize: 10, fontWeight: 700,
                letterSpacing: "0.1em", textTransform: "uppercase" as const,
                padding: "4px 12px", borderRadius: 100,
                display: "inline-block", marginBottom: 24,
                background: "rgba(239,68,68,0.06)", // Skill 6: 3-layer badge
                border: "1px solid rgba(239,68,68,0.15)",
                color: "#EF4444",
              }}>
                {t("landing.compare.before.tag")}
              </span>
              <p style={{
                fontFamily: f.mono,
                fontSize: "clamp(28px, 3vw + 12px, 40px)",
                fontWeight: 800, color: "#EF4444", marginBottom: 6,
                letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums",
              }}>
                {t("landing.compare.before.amount")}
              </p>
              <p style={{ fontSize: 13, color: "#64748B", marginBottom: 28, lineHeight: 1.65 }}>
                {t("landing.compare.before.unit")}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { n: "47", text: t("landing.compare.before.l1") },
                  { n: "12", text: t("landing.compare.before.l2") },
                  { n: "3", text: t("landing.compare.before.l3") },
                  { n: "0", text: t("landing.compare.before.l4") },
                  { n: "0%", text: t("landing.compare.before.l5") },
                ].map((item) => (
                  <div key={item.text} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#334155", lineHeight: 1.65 }}>
                    <span style={{ color: "#EF4444", fontSize: 15, flexShrink: 0, marginTop: 1 }}>{"\u274C"}</span>
                    <span>{item.text.replace("{n}", item.n)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AFTER */}
            <div className="gt-card-hover" style={{
              background: "#F0FDF4",
              borderRadius: 16,
              padding: "clamp(28px, 4vw, 40px)",
              borderLeft: "3px solid #22C55E",
              boxShadow: cardShadow,
            }}>
              <span style={{
                fontFamily: f.mono, fontSize: 10, fontWeight: 700,
                letterSpacing: "0.1em", textTransform: "uppercase" as const,
                padding: "4px 12px", borderRadius: 100,
                display: "inline-block", marginBottom: 24,
                background: "rgba(34,197,94,0.06)",
                border: "1px solid rgba(34,197,94,0.15)",
                color: "#22C55E",
              }}>
                {t("landing.compare.after.tag")}
              </span>
              <p style={{
                fontFamily: f.mono,
                fontSize: "clamp(28px, 3vw + 12px, 40px)",
                fontWeight: 800, color: "#22C55E", marginBottom: 6,
                letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums",
              }}>
                {t("landing.compare.after.amount")}
              </p>
              <p style={{ fontSize: 13, color: "#64748B", marginBottom: 28, lineHeight: 1.65 }}>
                {t("landing.compare.after.unit")}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { n: "47", text: t("landing.compare.after.l1") },
                  { n: "8", text: t("landing.compare.after.l2") },
                  { n: "3", text: t("landing.compare.after.l3") },
                  { n: "10", text: t("landing.compare.after.l4") },
                  { n: "1", text: t("landing.compare.after.l5") },
                ].map((item) => (
                  <div key={item.text} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#334155", lineHeight: 1.65 }}>
                    <span style={{ color: "#22C55E", fontSize: 15, flexShrink: 0, marginTop: 1 }}>{"\u2705"}</span>
                    <span>{item.text.replace("{n}", item.n)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════ TESTIMONIALS — Evidence (Skill 10) ═══════════ */}
        <div
          ref={refTestimonials}
          className="gt-section-reveal"
          style={{
            paddingTop: sectionSpacing,
            paddingBottom: sectionSpacing,
            marginLeft: `calc(-1 * clamp(20px, 4vw, 28px))`,
            marginRight: `calc(-1 * clamp(20px, 4vw, 28px))`,
            paddingLeft: "clamp(20px, 4vw, 28px)",
            paddingRight: "clamp(20px, 4vw, 28px)",
            borderTop: "1px solid rgba(0,0,0,0.06)",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ maxWidth: MAX_W, margin: "0 auto" }}>
            <p style={sectionLabel}>
              {t("landing.social.label")}
            </p>
            <h2 style={{
              ...sectionHeading,
              marginBottom: "clamp(36px, 5vw, 56px)",
              maxWidth: 520,
            }}>
              {t("landing.social.title")}
            </h2>

            {/* Staggered 3-column (Skill 1) */}
            <div className="gt-test-grid" style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "clamp(16px, 2vw, 24px)",
              alignItems: "start", // allows stagger offset
            }}>
              {[
                { quote: t("landing.social.q1"), name: t("landing.social.a1"), role: t("landing.social.ctx1"), initials: "MK", stars: 4, offset: 0 },
                { quote: t("landing.social.q2"), name: t("landing.social.a2"), role: t("landing.social.ctx2"), initials: "SL", stars: 4, offset: 40 },
                { quote: t("landing.social.q3"), name: t("landing.social.a3"), role: t("landing.social.ctx3"), initials: "JR", stars: 5, offset: 16 },
              ].map((item, i) => {
                const avatarColors = ["#3B82F6","#8B5CF6","#EC4899","#10B981","#6366F1","#0EA5E9"];
                const colorIdx = (item.initials.charCodeAt(0) + item.initials.charCodeAt(1)) % avatarColors.length;
                return (
                  <div
                    key={item.initials}
                    className="gt-card-hover gt-stagger-item"
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid rgba(0,0,0,0.06)",
                      borderRadius: 16,
                      padding: "clamp(24px, 3vw, 32px)",
                      boxShadow: cardShadow,
                      transform: `translateY(${item.offset}px)`, // Skill 1: staggered columns
                      animationDelay: `${i * 40}ms`,
                    }}
                  >
                    <p style={{ fontSize: 16, letterSpacing: 2, marginBottom: 18 }}>
                      {Array.from({ length: 5 }, (_, j) => (
                        <span key={j} style={{ color: j < item.stars ? "#3B82F6" : "#E2E8F0" }}>{"\u2605"}</span>
                      ))}
                    </p>
                    <p style={{ fontSize: "clamp(15px, 1vw + 12px, 17px)", color: "#334155", lineHeight: 1.7, marginBottom: 24, fontStyle: "italic" }}>
                      &ldquo;{item.quote}&rdquo;
                    </p>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 12,
                      borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 18,
                    }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: "50%", // Skill 11: 44px touch target
                        background: avatarColors[colorIdx], display: "flex",
                        alignItems: "center", justifyContent: "center",
                        fontFamily: f.mono, fontSize: 15, fontWeight: 700, color: "#FFFFFF",
                      }}>
                        {item.initials}
                      </div>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{item.name}</p>
                        <p style={{ fontSize: 12, color: "#94A3B8" }}>{item.role}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 24, textAlign: "center", fontStyle: "italic" }}>
              Testimonials based on real client feedback. Details anonymized for confidentiality.
            </p>
          </div>
        </div>

        {/* ═══════════ HOW IT WORKS — Release (Skill 10) ═══════════ */}
        <div
          ref={refHowItWorks}
          className="gt-section-reveal"
          style={{ paddingTop: sectionSpacing, paddingBottom: sectionSpacing }}
        >
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <p style={sectionLabel}>
              {t("landing.how.label")}
            </p>
            <h2 style={{
              ...sectionHeading,
              marginBottom: "clamp(36px, 5vw, 56px)",
            }}>
              {t("landing.how.title")}
            </h2>

            {/* Timeline */}
            <div style={{ position: "relative", paddingLeft: 48 }}>
              {/* Vertical line */}
              <div style={{
                position: "absolute", left: 15, top: 4, bottom: 4, width: 2,
                background: "rgba(0,0,0,0.06)",
              }} />

              {[
                { num: 1, title: t("landing.how.s1"), desc: t("landing.how.s1d") },
                { num: 2, title: t("landing.how.s2"), desc: t("landing.how.s2d") },
                {
                  num: 3, title: t("landing.how.s3"), desc: t("landing.how.s3d"),
                  bullets: [
                    t("landing.how.conf.b1") || "Numeric confidence score (0-100) on every finding",
                    t("landing.how.conf.b2") || "Signals classified: observed, derived, or estimated",
                    t("landing.how.conf.b3") || "When evidence is insufficient, we say so",
                  ],
                },
                { num: 4, title: t("landing.how.s4") || "Correct", desc: t("landing.how.s4d") },
              ].map((step, i) => (
                <div
                  key={step.num}
                  className="gt-stagger-item"
                  style={{
                    position: "relative",
                    marginBottom: "clamp(40px, 5vw, 64px)",
                    animationDelay: `${i * 40}ms`,
                  }}
                >
                  {/* Circle */}
                  <div style={{
                    position: "absolute", left: -48, top: 0,
                    width: 32, height: 32, borderRadius: "50%",
                    background: "#3B82F6", display: "flex", // Skill 6: blue = action
                    alignItems: "center", justifyContent: "center",
                    fontFamily: f.mono, fontSize: 13, fontWeight: 700, color: "#FFFFFF",
                    zIndex: 1,
                  }}>
                    {step.num}
                  </div>
                  <h3 style={{ fontSize: "clamp(17px, 1vw + 14px, 20px)", fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>{step.title}</h3>
                  <p style={{ fontSize: 16, color: "#64748B", lineHeight: 1.65 }}>{step.desc}</p>
                  {step.bullets && (
                    <ul style={{ marginTop: 14, paddingLeft: 0, listStyle: "none" }}>
                      {step.bullets.map((b) => (
                        <li key={b} style={{ fontSize: 14, color: "#64748B", lineHeight: 1.8, display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                          <span style={{ color: "#3B82F6", flexShrink: 0, marginTop: 2 }}>{"\u2022"}</span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════ WHAT YOU RECEIVE ═══════════ */}
        <div
          ref={refOutput}
          className="gt-section-reveal"
          style={{ paddingTop: sectionSpacing, paddingBottom: "clamp(36px, 5vw, 48px)" }}
        >
          <div style={{
            background: "#FFFFFF",
            border: "1px solid rgba(0,0,0,0.06)",
            borderRadius: 18,
            padding: "clamp(36px, 5vw, 56px) clamp(28px, 4vw, 48px)",
            maxWidth: 960,
            margin: "0 auto",
            boxShadow: cardShadow,
          }}>
            <p style={sectionLabel}>
              {t("landing.output.label")}
            </p>
            <h2 style={{ ...sectionHeading, marginBottom: 12 }}>{t("landing.output.title")}</h2>
            <p style={{ fontSize: "clamp(15px, 1vw + 12px, 17px)", color: "#334155", marginBottom: "clamp(28px, 4vw, 36px)", maxWidth: 600, lineHeight: 1.65 }}>
              {t("landing.output.sub")}
            </p>

            <div className="gt-output-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(10px, 1.5vw, 14px)" }}>
              {[
                { num: "01", title: t("landing.output.01"), desc: t("landing.output.01d") },
                { num: "02", title: t("landing.output.02"), desc: t("landing.output.02d") },
                { num: "03", title: t("landing.output.03"), desc: t("landing.output.03d") },
                { num: "04", title: t("landing.output.04"), desc: t("landing.output.04d") },
                { num: "05", title: t("landing.output.05"), desc: t("landing.output.05d") },
                { num: "06", title: t("landing.output.06"), desc: t("landing.output.06d") },
              ].map((item, i) => (
                <div
                  key={item.num}
                  className="gt-card-hover gt-stagger-item"
                  style={{
                    background: "#FAFAFA",
                    border: "1px solid rgba(0,0,0,0.06)",
                    borderRadius: 14,
                    padding: "clamp(16px, 2vw, 22px)",
                    position: "relative",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                    animationDelay: `${i * 40}ms`,
                  }}
                >
                  <span style={{
                    fontFamily: f.mono, fontSize: 28, fontWeight: 800,
                    color: "rgba(15,23,42,0.04)", position: "absolute", top: 10, right: 14,
                  }}>
                    {item.num}
                  </span>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", marginBottom: 6 }}>{item.title}</p>
                  <p style={{ fontSize: 14, color: "#334155", lineHeight: 1.65 }}>{item.desc}</p>
                </div>
              ))}
            </div>

            <div style={{ textAlign: "center", marginTop: "clamp(24px, 3vw, 32px)" }}>
              <a href="/intel" className="gt-cta-primary" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "14px 32px", fontSize: 14, fontWeight: 700,
                background: "#3B82F6", color: "#FFFFFF", border: "none",
                borderRadius: 10, textDecoration: "none",
                minHeight: 44,
              }}>
                {t("landing.output.cta")} <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </div>

        {/* ═══════════ DECISION TIERS ═══════════ */}
        <div
          ref={refTiers}
          className="gt-section-reveal"
          style={{ paddingTop: sectionSpacing, paddingBottom: "clamp(36px, 5vw, 48px)" }}
        >
          <div style={{
            background: "#FFFFFF",
            border: "1px solid rgba(0,0,0,0.06)",
            borderRadius: 18,
            padding: "clamp(36px, 5vw, 56px) clamp(28px, 4vw, 48px)",
            maxWidth: 960,
            margin: "0 auto",
            boxShadow: cardShadow,
          }}>
            <p style={sectionLabel}>
              {t("landing.tiers.label")}
            </p>
            <h2 style={{ ...sectionHeading, marginBottom: "clamp(24px, 3vw, 32px)" }}>{t("landing.tiers.title")}</h2>

            {/* Staggered 3-column (Skill 1) */}
            <div className="gt-tiers-grid" style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "clamp(12px, 1.5vw, 16px)",
              alignItems: "start",
            }}>
              {[
                {
                  badge: t("landing.tiers.l1.badge"), badgeColor: "#3B82F6",
                  name: t("landing.tiers.l1.name"), desc: t("landing.tiers.l1.desc"),
                  cta: t("landing.tiers.l1.cta"), href: "/intel", ctaColor: "#3B82F6",
                  borderColor: "rgba(59,130,246,0.15)",
                  offset: 0,
                },
                {
                  badge: t("landing.tiers.l2.badge"), badgeColor: "#22C55E",
                  name: t("landing.tiers.l2.name"), desc: t("landing.tiers.l2.desc"),
                  cta: t("landing.tiers.l2.cta"), href: "#pricing", ctaColor: "#22C55E",
                  borderColor: "rgba(34,197,94,0.15)",
                  offset: 40,
                },
                {
                  badge: t("landing.tiers.l3.badge"), badgeColor: "#64748B",
                  name: t("landing.tiers.l3.name"), desc: t("landing.tiers.l3.desc"),
                  cta: t("landing.tiers.l3.cta"), href: "mailto:audits@ghost-tax.com", ctaColor: "#64748B",
                  borderColor: "rgba(0,0,0,0.06)",
                  offset: 16,
                },
              ].map((tier, i) => (
                <div
                  key={tier.name}
                  className="gt-card-hover gt-stagger-item"
                  style={{
                    background: "#FAFAFA",
                    border: `1px solid ${tier.borderColor}`,
                    borderRadius: 14,
                    padding: "clamp(22px, 3vw, 28px) clamp(18px, 2vw, 22px)",
                    boxShadow: cardShadow,
                    transform: `translateY(${tier.offset}px)`, // Skill 1: stagger
                    animationDelay: `${i * 40}ms`,
                  }}
                >
                  <p style={{
                    fontSize: 10, fontFamily: f.mono, fontWeight: 700,
                    color: tier.badgeColor, letterSpacing: ".08em",
                    marginBottom: 12, textTransform: "uppercase" as const,
                  }}>
                    {tier.badge}
                  </p>
                  <p style={{ fontSize: "clamp(16px, 1vw + 12px, 18px)", fontWeight: 700, color: "#0F172A", marginBottom: 10 }}>{tier.name}</p>
                  <p style={{ fontSize: 14, color: "#334155", lineHeight: 1.65, marginBottom: 16 }}>{tier.desc}</p>
                  <a href={tier.href} style={{
                    fontSize: 13, fontFamily: f.mono, color: tier.ctaColor,
                    textDecoration: "none", fontWeight: 600,
                    display: "inline-flex", alignItems: "center",
                    minHeight: 44, // Skill 11: touch target
                  }}>
                    {tier.cta} &rarr;
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════ PRICING — Rail A — Action (Skill 10) ═══════════ */}
        <div
          ref={refPricing}
          className="gt-section-reveal"
          style={{ paddingTop: sectionSpacing, paddingBottom: "clamp(36px, 5vw, 48px)" }}
        >
          <div id="pricing" style={{ textAlign: "center", marginBottom: "clamp(24px, 3vw, 32px)" }}>
            <p style={sectionLabel}>
              {t("price.label")}
            </p>
            <h2 style={{ ...sectionHeading, marginBottom: 10 }}>{t("price.title")}</h2>
            <p style={{ fontSize: "clamp(15px, 1vw + 12px, 17px)", color: "#334155", maxWidth: 520, margin: "0 auto", lineHeight: 1.65 }}>
              {t("price.sub")}
            </p>
          </div>

          <div style={{ maxWidth: 480, margin: "0 auto" }}>
            <div style={{
              background: "#FFFFFF",
              border: "1px solid rgba(34,197,94,0.15)",
              borderRadius: 18,
              padding: "clamp(32px, 4vw, 40px) clamp(28px, 3vw, 36px)",
              boxShadow: cardShadow,
              position: "relative",
              textAlign: "center",
            }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                fontFamily: f.mono, fontSize: 10, fontWeight: 700,
                letterSpacing: "0.06em", textTransform: "uppercase" as const,
                color: "#22C55E",
                background: "rgba(34,197,94,0.06)", // Skill 6: 3-layer badge
                border: "1px solid rgba(34,197,94,0.15)",
                padding: "4px 10px", borderRadius: 9999,
                position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)",
                whiteSpace: "nowrap" as const,
              }}>
                {t("price.diag.badge")}
              </div>

              <h3 style={{ fontSize: "clamp(17px, 1vw + 14px, 20px)", fontWeight: 700, marginBottom: 12, marginTop: 8, color: "#0F172A" }}>{t("price.diag.name")}</h3>

              <div style={{ marginBottom: 16 }}>
                <span style={{
                  fontFamily: f.mono,
                  fontSize: "clamp(36px, 3vw + 20px, 48px)",
                  fontWeight: 800, color: "#22C55E",
                  letterSpacing: "-0.03em", lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {t("price.diag.price")}
                </span>
                <span style={{ fontSize: 15, color: "#64748B", marginLeft: 6 }}>{t("price.period.onetime")}</span>
              </div>

              <p style={{ fontSize: 15, color: "#334155", lineHeight: 1.65, marginBottom: 24 }}>{t("price.diag.desc")}</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24, textAlign: "left" }}>
                {[t("price.diag.f1"), t("price.diag.f2"), t("price.diag.f3")].map((feat) => (
                  <div key={feat} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 15, color: "#334155", lineHeight: 1.65 }}>
                    <CheckCircle size={16} color="#22C55E" strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 3 }} />
                    {feat}
                  </div>
                ))}
              </div>

              <div style={{
                padding: "10px 14px", borderRadius: 8,
                background: "rgba(34,197,94,0.06)",
                border: "1px solid rgba(34,197,94,0.15)",
                marginBottom: 18,
              }}>
                <p style={{ fontSize: 12, fontFamily: f.mono, color: "#22C55E", letterSpacing: ".04em", fontVariantNumeric: "tabular-nums" }}>{t("price.diag.roi")}</p>
              </div>

              <button
                type="button" onClick={handleRailACheckout} disabled={checkoutLoading}
                className="gt-cta-primary"
                style={{
                  width: "100%", padding: "16px 28px", fontSize: 15, fontWeight: 700,
                  background: "#22C55E", color: "#FFFFFF", border: "none",
                  borderRadius: 10, cursor: "pointer",
                  opacity: checkoutLoading ? 0.7 : 1,
                  minHeight: 44,
                }}
              >
                {checkoutLoading ? t("landing.pricing.cta.loading") : t("landing.pricing.cta")}
              </button>

              {checkoutError && <p style={{ fontSize: 13, color: "#EF4444", marginTop: 12 }}>{t("landing.pricing.cta.error")}</p>}
            </div>

            <div style={{ textAlign: "center", marginTop: 20 }}>
              <a href="/pricing" style={{
                fontSize: 14, fontFamily: f.mono, color: "#3B82F6",
                textDecoration: "none", fontWeight: 600,
                display: "inline-flex", alignItems: "center", minHeight: 44,
              }}>
                {t("landing.pricing.seeAll")} &rarr;
              </a>
            </div>
          </div>

          <p style={{ fontSize: 13, color: "#64748B", textAlign: "center", marginTop: 16 }}>{t("price.note")}</p>
        </div>

        {/* ═══════════ SECURITY STRIP ═══════════ */}
        <div
          ref={refSecurity}
          className="gt-section-reveal"
          style={{ paddingTop: "clamp(36px, 5vw, 48px)", paddingBottom: "clamp(36px, 5vw, 48px)" }}
        >
          <div className="gt-security-grid" style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
            gap: "clamp(8px, 1.5vw, 12px)", maxWidth: 960, margin: "0 auto",
          }}>
            {[
              { label: t("landing.security.aes"), desc: t("landing.security.aes.d") },
              { label: t("landing.security.zk"), desc: t("landing.security.zk.d") },
              { label: t("landing.security.us"), desc: t("landing.security.us.d") },
              { label: t("landing.security.purge"), desc: t("landing.security.purge.d") },
            ].map((item, i) => (
              <div
                key={item.label}
                className="gt-stagger-item"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid rgba(0,0,0,0.06)",
                  borderRadius: 14,
                  padding: "clamp(16px, 2vw, 22px) clamp(14px, 1.5vw, 18px)",
                  textAlign: "center",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.06)",
                  animationDelay: `${i * 40}ms`,
                }}
              >
                <p style={{ fontSize: 12, fontFamily: f.mono, fontWeight: 700, color: "#0F172A", letterSpacing: ".06em", marginBottom: 8 }}>{item.label}</p>
                <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.65 }}>{item.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <a href="/security-vault" style={{
              fontSize: 13, fontFamily: f.mono, color: "#64748B",
              textDecoration: "none", fontWeight: 500,
              display: "inline-flex", alignItems: "center", minHeight: 44,
            }}>
              {t("landing.security.link")} &rarr;
            </a>
          </div>
        </div>

        {/* ═══════════ LEAK COUNTER ═══════════ */}
        <div style={{ paddingTop: "clamp(36px, 5vw, 48px)", paddingBottom: "clamp(36px, 5vw, 48px)" }}>
          <Suspense fallback={<div style={{ height: 120, background: "#FFFFFF", borderRadius: 12, border: "1px solid rgba(0,0,0,0.06)" }} />}>
            <LeakCounter locale={locale} />
          </Suspense>
        </div>

        {/* ═══════════ FINAL CTA — Action (Skill 10) ═══════════ */}
        <div
          ref={refFinalCta}
          className="gt-section-reveal"
          style={{ paddingTop: "clamp(36px, 5vw, 48px)", paddingBottom: sectionSpacing }}
        >
          <div style={{
            padding: "clamp(48px, 7vw, 80px) clamp(28px, 4vw, 48px)",
            textAlign: "center",
            borderRadius: 18,
            background: "#FAFAFA",
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: cardShadow,
          }}>
            <h2 style={{
              ...sectionHeading,
              marginBottom: 16,
            }}>
              {t("landing.cta.title")}
            </h2>
            <p style={{
              fontSize: 16, color: "#334155", maxWidth: 440,
              margin: "0 auto clamp(24px, 3vw, 32px)", lineHeight: 1.65,
            }}>
              {t("landing.cta.sub")}
            </p>

            <button
              type="button"
              onClick={navigateToIntel}
              className="gt-cta-primary"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "16px 36px", fontSize: 15, fontWeight: 700,
                background: "#3B82F6", color: "#FFFFFF", border: "none",
                borderRadius: 12, cursor: "pointer",
                minHeight: 44,
              }}
            >
              {t("landing.cta.primary")} <ArrowRight size={18} />
            </button>

            <p style={{ marginTop: 14, fontSize: 13, color: "#94A3B8", fontVariantNumeric: "tabular-nums" }}>
              {t("price.diag.price")} {t("price.period.onetime")}
            </p>

            {/* Trust badges (Skill 6: 3-layer badges) */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "clamp(16px, 2vw, 32px)", marginTop: 28, flexWrap: "wrap" }}>
              {[
                t("landing.cta.badge.stripe"),
                t("landing.cta.badge.soc2"),
                t("landing.cta.badge.gdpr"),
                t("landing.cta.badge.aes"),
              ].map((name) => (
                <span key={name} style={{
                  fontSize: 10, fontFamily: f.mono, color: "#94A3B8",
                  letterSpacing: ".08em", textTransform: "uppercase" as const,
                  padding: "4px 10px", borderRadius: 4,
                  border: "1px solid rgba(0,0,0,0.06)",
                }}>
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* JSON-LD handled by root layout @graph -- no duplicate here */}

      {/* ═══════════ GLOBAL STYLES ═══════════ */}
      <style>{`
        /* ── Skill 9: Scroll reveal (CSS only, no framer-motion) ── */
        .gt-section-reveal {
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .gt-section-reveal.gt-in-view,
        .gt-section-reveal:not([class*="gt-in-view"]) {
          /* Fallback: visible if JS hasn't run yet */
        }
        .gt-in-view {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }
        /* Initial state for JS-driven reveals */
        .gt-section-reveal {
          opacity: 0;
          transform: translateY(12px);
        }

        /* ── Skill 4: CTA micro-interactions ── */
        .gt-cta-primary {
          transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1),
                      filter 200ms cubic-bezier(0.16, 1, 0.3, 1),
                      box-shadow 200ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .gt-cta-primary:hover {
          transform: translateY(-1px);
          filter: brightness(1.05);
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
        }
        .gt-cta-primary:active {
          transform: scale(0.98);
          transition-duration: 60ms;
        }

        /* ── Skill 4: Card hover micro-interactions ── */
        .gt-card-hover {
          transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1),
                      box-shadow 200ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .gt-card-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 1px 2px rgba(0,0,0,0.04),
                      0 4px 16px rgba(0,0,0,0.10),
                      0 8px 32px rgba(0,0,0,0.06) !important;
        }

        /* ── Skill 4: Input focus ── */
        input:focus, textarea:focus {
          border-color: #3B82F6 !important;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.10) !important;
          outline: none;
        }

        /* ── Skill 1: Hero responsive ── */
        @media (max-width: 900px) {
          .gt-hero-layout {
            grid-template-columns: 1fr !important;
            gap: clamp(32px, 5vw, 40px) !important;
          }
          .gt-hero-card {
            max-width: 480px;
            margin: 0 auto;
          }
          /* Remove stagger offsets on mobile */
          .gt-test-grid > *,
          .gt-tiers-grid > * {
            transform: translateY(0) !important;
          }
        }

        /* ── Skill 11: Responsive grids ── */
        @media (max-width: 768px) {
          .gt-hero-input-row { flex-direction: column !important; }
          .gt-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .gt-comp-grid { grid-template-columns: 1fr !important; }
          .gt-test-grid { grid-template-columns: 1fr !important; }
          .gt-how-grid { grid-template-columns: 1fr !important; }
          .gt-output-grid { grid-template-columns: 1fr !important; }
          .gt-tiers-grid { grid-template-columns: 1fr !important; }
          .gt-security-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          .gt-stats-grid { grid-template-columns: 1fr 1fr !important; }
          .gt-security-grid { grid-template-columns: 1fr !important; }
        }

        /* ── Skill 9: Reduced motion ── */
        @media (prefers-reduced-motion: reduce) {
          *,
          .gt-section-reveal,
          .gt-cta-primary,
          .gt-card-hover {
            animation: none !important;
            transition: none !important;
          }
          .gt-section-reveal {
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
