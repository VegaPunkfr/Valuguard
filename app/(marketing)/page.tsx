"use client";

import { useState, useCallback, useEffect, useRef, lazy, Suspense } from "react";
import { CheckCircle, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cWarm as c, fWarm as f, sp, ts } from "@/lib/tokens";
import Section from "@/components/ui/section";

const LeakCounter = lazy(() => import("@/components/ui/leak-counter").then(m => ({ default: m.LeakCounter })));

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

  const navigateToIntel = useCallback(() => {
    const domain = heroInput.trim();
    window.location.href = domain ? `/intel?domain=${encodeURIComponent(domain)}` : "/intel";
  }, [heroInput]);

  const handleRailACheckout = useCallback(async () => {
    if (checkoutLoading) return;
    setCheckoutLoading(true);
    setCheckoutError(false);
    try {
      const params = new URLSearchParams({ rail: "A", locale });
      window.location.href = `/checkout?${params.toString()}`;
    } catch {
      setCheckoutLoading(false);
      setCheckoutError(true);
    }
  }, [checkoutLoading, locale]);

  return (
    <div style={{ minHeight: "100vh", color: c.text1 }}>

      {/* ═══════════ HERO — Premium institutional ═══════════ */}
      <section style={{ padding: "100px 0 80px" }}>
        <div className="gt-hero-layout" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", display: "grid", gridTemplateColumns: "1fr 440px", gap: 64, alignItems: "center" }}>

          {/* LEFT — Content */}
          <div>
            {/* Logo mark */}
            <div style={{ marginBottom: 40 }}>
              <img src="/logo.svg" alt="Ghost Tax" width={280} height={65} style={{ height: "auto", display: "block" }} />
            </div>

            {/* Headline — 6-8 words, problem-oriented */}
            <h1 style={{
              fontSize: "clamp(2.8rem, 5vw, 4rem)",
              fontWeight: 800, lineHeight: 1.06,
              letterSpacing: "-0.04em",
              marginBottom: 20,
              color: c.text1,
            }}>
              {t("hero.headline") || "Your IT spend has blind spots."}
            </h1>

            {/* Subtitle — 1 sentence, max 120 chars */}
            <p style={{
              fontSize: 19, color: "#4A5568", maxWidth: 480,
              marginBottom: 36, lineHeight: 1.65,
            }}>
              {t("hero.sub2") || "We detect, quantify, and explain hidden financial exposure in SaaS, AI, and Cloud spending."}
            </p>

            {/* CTA — single dark button */}
            <button
              type="button"
              onClick={navigateToIntel}
              className="gt-hero-cta"
              style={{
                padding: "16px 32px", fontSize: 15, fontWeight: 600,
                background: "#0F172A", color: "white", border: "none",
                borderRadius: 8, cursor: "pointer",
                transition: "all 200ms ease",
                display: "inline-block",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.02)";
                e.currentTarget.style.boxShadow = "0 8px 30px rgba(15,23,42,0.18)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {t("hero.cta.main") || "See my exposure"}
            </button>

            {/* Reassurance line */}
            <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 14, letterSpacing: "0.01em" }}>
              {t("hero.reassurance") || "No sign-up required \u00b7 Results in 2 min \u00b7 Zero system access"}
            </p>

            {/* Social proof */}
            <div style={{ marginTop: 40, paddingTop: 28, borderTop: `1px solid ${c.border}` }}>
              <p style={{ fontFamily: f.mono, fontSize: 11, color: "#94A3B8", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 8 }}>
                {t("hero.social") || "200+ analyses delivered \u00b7 Average exposure: 247k\u2013341k EUR"}
              </p>
            </div>
          </div>

          {/* RIGHT — Decision Pack Preview Card */}
          <div className="gt-hero-card" style={{
            background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12,
            padding: 28, boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          }}>
            <p style={{ fontFamily: f.mono, fontSize: 10, color: "#94A3B8", letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: 16 }}>
              SAMPLE OUTPUT — DECISION PACK
            </p>

            {/* Company header */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontFamily: f.mono, fontSize: 13, fontWeight: 600, color: c.text1 }}>acme-corp.com</p>
              <p style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>SaaS / 340 employees / DACH market</p>
            </div>

            {/* Exposure */}
            <div style={{ background: "#F8FAFC", borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <p style={{ fontFamily: f.mono, fontSize: 10, color: "#94A3B8", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 8 }}>ANNUAL EXPOSURE DETECTED</p>
              <p style={{ fontFamily: f.mono, fontSize: 28, fontWeight: 700, color: c.text1, letterSpacing: "-0.02em" }}>
                247k &ndash; 341k <span style={{ fontSize: 16, color: "#64748B" }}>EUR</span>
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <span style={{ fontFamily: f.mono, fontSize: 10, padding: "3px 8px", borderRadius: 4, background: "rgba(5,150,105,0.08)", color: "#059669" }}>CONFIDENCE 62/100</span>
                <span style={{ fontFamily: f.mono, fontSize: 10, padding: "3px 8px", borderRadius: 4, background: "rgba(59,130,246,0.08)", color: "#3b82f6" }}>HIGH PRIORITY</span>
              </div>
            </div>

            {/* Findings */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "License waste \u2014 34% seats unused", badge: "OBSERVED", color: "#059669", bg: "rgba(5,150,105,0.08)" },
                { label: "Vendor overlap \u2014 3 CRM tools active", badge: "OBSERVED", color: "#059669", bg: "rgba(5,150,105,0.08)" },
                { label: "Shadow AI \u2014 untracked API spend", badge: "DERIVED", color: "#3b82f6", bg: "rgba(59,130,246,0.08)" },
                { label: "Auto-renewal trap \u2014 47 days", badge: "ESTIMATED", color: "#94A3B8", bg: "rgba(148,163,184,0.08)" },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "#334155" }}>{item.label}</span>
                  <span style={{ fontFamily: "var(--gt-font-mono, monospace)", fontSize: 9, padding: "2px 6px", borderRadius: 3, background: item.bg, color: item.color, fontWeight: 600, letterSpacing: "0.06em", flexShrink: 0, marginLeft: 8 }}>{item.badge}</span>
                </div>
              ))}
            </div>

            {/* Redacted sections */}
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px dashed #E2E8F0" }}>
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

      {/* Hero responsive */}
      <style>{`
        @media (max-width: 900px) {
          .gt-hero-layout { grid-template-columns: 1fr !important; gap: 40px !important; }
          .gt-hero-card { max-width: 480px; margin: 0 auto; }
        }
        @media (prefers-reduced-motion: reduce) {
          .gt-hero-cta { transition: none !important; }
        }
      `}</style>

      {/* ═══════════ SOCIAL PROOF BAR ═══════════ */}
      <section style={{
        padding: "40px 0",
        borderTop: `1px solid ${c.border}`,
        borderBottom: `1px solid ${c.border}`,
        textAlign: "center",
      }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 28px" }}>
          <p style={{
            fontFamily: f.mono, fontSize: 11, color: "#94A3B8",
            letterSpacing: "0.1em", textTransform: "uppercase" as const,
          }}>
            200+ analyses delivered &middot; Average exposure: 247k&ndash;341k EUR &middot; 48h delivery
          </p>
        </div>
      </section>

      <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 28px" }}>

        {/* ═══════════ VIDEO SECTION ═══════════ */}
        <Section style={{ paddingTop: 48, paddingBottom: 48 }}>
          <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
            <p style={{
              fontFamily: f.mono, fontSize: 11, fontWeight: 600,
              letterSpacing: "0.08em", textTransform: "uppercase" as const,
              color: c.text4, marginBottom: 16,
            }}>
              {t("landing.video.subtitle")}
            </p>
            <div style={{
              position: "relative", borderRadius: 16, overflow: "hidden",
              border: `1px solid ${c.border}`,
              boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
            }}>
              <video
                autoPlay
                loop
                muted
                playsInline
                preload="none"
                poster="/site-screenshot.png"
                style={{ width: "100%", display: "block", aspectRatio: "16/9" }}
              >
                <source src="/demo-video.mp4" type="video/mp4" />
              </video>
            </div>
            <p style={{
              fontSize: 14, color: c.text3, marginTop: 16, lineHeight: 1.5,
            }}>
              {t("landing.video.title")}
            </p>
          </div>
        </Section>

        {/* ═══════════ T8 — STATS (4 simple cards) ═══════════ */}
        <Section style={{ paddingTop: 64, paddingBottom: 48 }}>
          <div ref={statsRef} className="gt-stats-grid" style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20,
          }}>
            {[
              { value: `${valAudits}+`, label: t("landing.stats.analysesDesc"), color: c.text1 },
              { value: t("landing.stats.delivery"), label: t("landing.stats.deliveryDesc"), color: c.green },
              { value: "247k\u2013341k", label: t("landing.stats.exposureDesc"), color: c.accent },
              { value: `${valRecoverable}k`, label: "EUR avg. recoverable", color: c.accent },
            ].map((stat) => (
              <div key={stat.label} style={{
                background: "#FFFFFF", border: `1px solid ${c.border}`,
                borderRadius: 14, padding: 28, textAlign: "center",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                transition: "transform 200ms, box-shadow 200ms",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
              }}
              >
                <p style={{
                  fontFamily: f.mono, fontSize: 32, fontWeight: 700,
                  marginBottom: 6, color: stat.color,
                  fontVariantNumeric: "tabular-nums",
                }}>{stat.value}</p>
                <p style={{ fontSize: 13, color: c.text3 }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ═══════════ EXPOSURE SHOCK — Before/After ═══════════ */}
        <Section style={{ paddingTop: 120, paddingBottom: 80 }}>
          <p style={{
            fontFamily: f.mono, fontSize: 11, fontWeight: 600,
            letterSpacing: "0.12em", textTransform: "uppercase" as const,
            color: c.accent, marginBottom: 14,
          }}>
            {t("landing.compare.label")}
          </p>
          <h2 style={{
            fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", fontWeight: 800,
            letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 56,
            maxWidth: 520,
          }}>
            {t("landing.compare.title")}
          </h2>

          <div className="gt-comp-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
            {/* BEFORE */}
            <div style={{
              background: "#FEF2F2", borderRadius: 16, padding: 40,
              borderLeft: "3px solid #EF4444",
            }}>
              <span style={{
                fontFamily: f.mono, fontSize: 10, fontWeight: 700,
                letterSpacing: "0.1em", textTransform: "uppercase" as const,
                padding: "4px 12px", borderRadius: 100,
                display: "inline-block", marginBottom: 24,
                background: "rgba(239,68,68,0.1)", color: "#EF4444",
              }}>
                {t("landing.compare.before.tag")}
              </span>
              <p style={{ fontFamily: f.mono, fontSize: 40, fontWeight: 800, color: "#EF4444", marginBottom: 6, letterSpacing: "-0.02em" }}>
                {t("landing.compare.before.amount")}
              </p>
              <p style={{ fontSize: 13, color: "#64748B", marginBottom: 28 }}>
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
                  <div key={item.text} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#334155", lineHeight: 1.5 }}>
                    <span style={{ color: "#EF4444", fontSize: 15, flexShrink: 0, marginTop: 1 }}>{"\u274C"}</span>
                    <span>{item.text.replace("{n}", item.n)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AFTER */}
            <div style={{
              background: "#F0FDF4", borderRadius: 16, padding: 40,
              borderLeft: "3px solid #22C55E",
            }}>
              <span style={{
                fontFamily: f.mono, fontSize: 10, fontWeight: 700,
                letterSpacing: "0.1em", textTransform: "uppercase" as const,
                padding: "4px 12px", borderRadius: 100,
                display: "inline-block", marginBottom: 24,
                background: "rgba(34,197,94,0.1)", color: "#22C55E",
              }}>
                {t("landing.compare.after.tag")}
              </span>
              <p style={{ fontFamily: f.mono, fontSize: 40, fontWeight: 800, color: "#22C55E", marginBottom: 6, letterSpacing: "-0.02em" }}>
                {t("landing.compare.after.amount")}
              </p>
              <p style={{ fontSize: 13, color: "#64748B", marginBottom: 28 }}>
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
                  <div key={item.text} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#334155", lineHeight: 1.5 }}>
                    <span style={{ color: "#22C55E", fontSize: 15, flexShrink: 0, marginTop: 1 }}>{"\u2705"}</span>
                    <span>{item.text.replace("{n}", item.n)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ═══════════ TESTIMONIALS ═══════════ */}
        <section style={{
          padding: "120px 0 80px",
          marginLeft: -28, marginRight: -28, paddingLeft: 28, paddingRight: 28,
          background: "#FFFFFF",
          borderTop: `1px solid ${c.border}`,
          borderBottom: `1px solid ${c.border}`,
        }}>
          <div style={{ maxWidth: 1140, margin: "0 auto" }}>
            <p style={{
              fontFamily: f.mono, fontSize: 11, fontWeight: 600,
              letterSpacing: "0.12em", textTransform: "uppercase" as const,
              color: c.accent, marginBottom: 14,
            }}>
              {t("landing.social.label")}
            </p>
            <h2 style={{
              fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", fontWeight: 800,
              letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 56,
              maxWidth: 520,
            }}>
              {t("landing.social.title")}
            </h2>

            <div className="gt-test-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
              {[
                { quote: t("landing.social.q1"), name: t("landing.social.a1"), role: t("landing.social.ctx1"), initials: "MK", stars: 4 },
                { quote: t("landing.social.q2"), name: t("landing.social.a2"), role: t("landing.social.ctx2"), initials: "SL", stars: 4 },
                { quote: t("landing.social.q3"), name: t("landing.social.a3"), role: t("landing.social.ctx3"), initials: "JR", stars: 5 },
              ].map((item) => {
                const avatarColors = ["#3B82F6","#8B5CF6","#EC4899","#10B981","#6366F1","#0EA5E9"];
                const colorIdx = (item.initials.charCodeAt(0) + item.initials.charCodeAt(1)) % avatarColors.length;
                return (
                  <div key={item.initials} style={{
                    background: "#FFFFFF", border: `1px solid ${c.border}`,
                    borderRadius: 16, padding: 32,
                    boxShadow: "0 2px 16px rgba(0,0,0,0.04)",
                  }}>
                    <p style={{ fontSize: 16, letterSpacing: 2, marginBottom: 18 }}>
                      {Array.from({ length: 5 }, (_, i) => (
                        <span key={i} style={{ color: i < item.stars ? "#3b82f6" : "#E2E8F0" }}>{"\u2605"}</span>
                      ))}
                    </p>
                    <p style={{ fontSize: 17, color: "#334155", lineHeight: 1.7, marginBottom: 24, fontStyle: "italic" }}>
                      &ldquo;{item.quote}&rdquo;
                    </p>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 12,
                      borderTop: `1px solid ${c.border}`, paddingTop: 18,
                    }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: "50%",
                        background: avatarColors[colorIdx], display: "flex",
                        alignItems: "center", justifyContent: "center",
                        fontFamily: f.mono, fontSize: 16, fontWeight: 700, color: "#FFFFFF",
                      }}>
                        {item.initials}
                      </div>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: c.text1 }}>{item.name}</p>
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
        </section>

        {/* ═══════════ HOW IT WORKS — Vertical Timeline ═══════════ */}
        <Section style={{ paddingTop: 120, paddingBottom: 80 }}>
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <p style={{
              fontFamily: f.mono, fontSize: 11, fontWeight: 600,
              letterSpacing: "0.12em", textTransform: "uppercase" as const,
              color: c.accent, marginBottom: 14,
            }}>
              {t("landing.how.label")}
            </p>
            <h2 style={{
              fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", fontWeight: 800,
              letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 56,
            }}>
              {t("landing.how.title")}
            </h2>

            {/* Timeline */}
            <div style={{ position: "relative", paddingLeft: 48 }}>
              {/* Vertical line */}
              <div style={{
                position: "absolute", left: 15, top: 4, bottom: 4, width: 2,
                background: "#E2E8F0",
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
              ].map((step) => (
                <div key={step.num} style={{ position: "relative", marginBottom: 64 }}>
                  {/* Circle */}
                  <div style={{
                    position: "absolute", left: -48, top: 0,
                    width: 32, height: 32, borderRadius: "50%",
                    background: "#3B82F6", display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontFamily: f.mono, fontSize: 13, fontWeight: 700, color: "#FFFFFF",
                    zIndex: 1,
                  }}>
                    {step.num}
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: c.text1, marginBottom: 8 }}>{step.title}</h3>
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
        </Section>

        {/* ═══════════ WHAT YOU RECEIVE ═══════════ */}
        <Section style={{ paddingTop: 80, paddingBottom: 48 }}>
          <div style={{
            background: "#FFFFFF", border: `1px solid ${c.border}`,
            borderRadius: 18, padding: "56px 48px", maxWidth: 960, margin: "0 auto",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}>
            <p style={{
              fontFamily: f.mono, fontSize: 11, fontWeight: 600,
              letterSpacing: "0.12em", textTransform: "uppercase" as const,
              color: c.accent, marginBottom: 14,
            }}>
              {t("landing.output.label")}
            </p>
            <h2 style={{ marginBottom: 12 }}>{t("landing.output.title")}</h2>
            <p style={{ fontSize: 17, color: c.text2, marginBottom: 36, maxWidth: 600, lineHeight: 1.6 }}>
              {t("landing.output.sub")}
            </p>

            <div className="gt-output-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                { num: "01", title: t("landing.output.01"), desc: t("landing.output.01d") },
                { num: "02", title: t("landing.output.02"), desc: t("landing.output.02d") },
                { num: "03", title: t("landing.output.03"), desc: t("landing.output.03d") },
                { num: "04", title: t("landing.output.04"), desc: t("landing.output.04d") },
                { num: "05", title: t("landing.output.05"), desc: t("landing.output.05d") },
                { num: "06", title: t("landing.output.06"), desc: t("landing.output.06d") },
              ].map((item) => (
                <div key={item.num} style={{
                  background: c.bg, border: `1px solid ${c.border}`,
                  borderRadius: 14, padding: 22, position: "relative",
                  transition: "transform 200ms, box-shadow 200ms",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
                >
                  <span style={{
                    fontFamily: f.mono, fontSize: 28, fontWeight: 800,
                    color: "rgba(26,26,26,0.05)", position: "absolute", top: 10, right: 14,
                  }}>
                    {item.num}
                  </span>
                  <p style={{ fontSize: 16, fontWeight: 700, color: c.text1, marginBottom: 6 }}>{item.title}</p>
                  <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              ))}
            </div>

            <div style={{ textAlign: "center", marginTop: 32 }}>
              <a href="/intel" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "14px 32px", fontSize: 14, fontWeight: 700,
                background: c.accent, color: "white", border: "none",
                borderRadius: 10, textDecoration: "none",
                transition: "all 200ms",
              }}>
                {t("landing.output.cta")} <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </Section>

        {/* ═══════════ DECISION TIERS ═══════════ */}
        <Section style={{ paddingTop: 80, paddingBottom: 48 }}>
          <div style={{
            background: "#FFFFFF", border: `1px solid ${c.border}`,
            borderRadius: 18, padding: "56px 48px", maxWidth: 960, margin: "0 auto",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}>
            <p style={{
              fontFamily: f.mono, fontSize: 11, fontWeight: 600,
              letterSpacing: "0.12em", textTransform: "uppercase" as const,
              color: c.accent, marginBottom: 14,
            }}>
              {t("landing.tiers.label")}
            </p>
            <h2 style={{ marginBottom: 32 }}>{t("landing.tiers.title")}</h2>

            <div className="gt-tiers-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              {[
                {
                  badge: t("landing.tiers.l1.badge"), badgeColor: c.accent,
                  name: t("landing.tiers.l1.name"), desc: t("landing.tiers.l1.desc"),
                  cta: t("landing.tiers.l1.cta"), href: "/intel", ctaColor: c.accent,
                  borderColor: c.accentBd,
                },
                {
                  badge: t("landing.tiers.l2.badge"), badgeColor: c.green,
                  name: t("landing.tiers.l2.name"), desc: t("landing.tiers.l2.desc"),
                  cta: t("landing.tiers.l2.cta"), href: "#pricing", ctaColor: c.green,
                  borderColor: c.greenBd,
                },
                {
                  badge: t("landing.tiers.l3.badge"), badgeColor: c.text3,
                  name: t("landing.tiers.l3.name"), desc: t("landing.tiers.l3.desc"),
                  cta: t("landing.tiers.l3.cta"), href: "mailto:audits@ghost-tax.com", ctaColor: c.text3,
                  borderColor: c.borderS,
                },
              ].map((tier) => (
                <div key={tier.name} style={{
                  background: c.bg, border: `1px solid ${tier.borderColor}`,
                  borderRadius: 14, padding: "28px 22px",
                  transition: "transform 200ms, box-shadow 200ms",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
                >
                  <p style={{
                    fontSize: 10, fontFamily: f.mono, fontWeight: 700,
                    color: tier.badgeColor, letterSpacing: ".08em",
                    marginBottom: 12, textTransform: "uppercase" as const,
                  }}>
                    {tier.badge}
                  </p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: c.text1, marginBottom: 10 }}>{tier.name}</p>
                  <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.6, marginBottom: 16 }}>{tier.desc}</p>
                  <a href={tier.href} style={{
                    fontSize: 13, fontFamily: f.mono, color: tier.ctaColor,
                    textDecoration: "none", fontWeight: 600,
                  }}>
                    {tier.cta} &rarr;
                  </a>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ═══════════ PRICING — Rail A ═══════════ */}
        <Section style={{ paddingTop: 80, paddingBottom: 48 }}>
          <div id="pricing" style={{ textAlign: "center", marginBottom: 32 }}>
            <p style={{
              fontFamily: f.mono, fontSize: 11, fontWeight: 600,
              letterSpacing: "0.12em", textTransform: "uppercase" as const,
              color: c.accent, marginBottom: 14,
            }}>
              {t("price.label")}
            </p>
            <h2 style={{ marginBottom: 10 }}>{t("price.title")}</h2>
            <p style={{ fontSize: 17, color: c.text2, maxWidth: 520, margin: "0 auto", lineHeight: 1.6 }}>
              {t("price.sub")}
            </p>
          </div>

          <div style={{ maxWidth: 480, margin: "0 auto" }}>
            <div style={{
              background: "#FFFFFF", border: `1px solid ${c.greenBd}`,
              borderRadius: 18, padding: "40px 36px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              position: "relative", textAlign: "center",
            }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                fontFamily: f.mono, fontSize: 10, fontWeight: 700,
                letterSpacing: "0.06em", textTransform: "uppercase" as const,
                color: c.green, background: c.greenBg,
                border: `1px solid ${c.greenBd}`,
                padding: "4px 10px", borderRadius: 9999,
                position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)",
                whiteSpace: "nowrap" as const,
              }}>
                {t("price.diag.badge")}
              </div>

              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, marginTop: 8 }}>{t("price.diag.name")}</h3>

              <div style={{ marginBottom: 16 }}>
                <span style={{
                  fontFamily: f.mono, fontSize: 48, fontWeight: 800, color: c.green,
                  letterSpacing: "-0.03em", lineHeight: 1,
                }}>
                  {t("price.diag.price")}
                </span>
                <span style={{ fontSize: 15, color: c.text3, marginLeft: 6 }}>{t("price.period.onetime")}</span>
              </div>

              <p style={{ fontSize: 15, color: c.text2, lineHeight: 1.6, marginBottom: 24 }}>{t("price.diag.desc")}</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24, textAlign: "left" }}>
                {[t("price.diag.f1"), t("price.diag.f2"), t("price.diag.f3")].map((feat) => (
                  <div key={feat} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 15, color: c.text2, lineHeight: 1.5 }}>
                    <CheckCircle size={16} color={c.green} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 3 }} />
                    {feat}
                  </div>
                ))}
              </div>

              <div style={{
                padding: "10px 14px", borderRadius: 8,
                background: c.greenBg, border: `1px solid ${c.greenBd}`,
                marginBottom: 18,
              }}>
                <p style={{ fontSize: 12, fontFamily: f.mono, color: c.green, letterSpacing: ".04em" }}>{t("price.diag.roi")}</p>
              </div>

              <button
                type="button" onClick={handleRailACheckout} disabled={checkoutLoading}
                style={{
                  width: "100%", padding: "16px 28px", fontSize: 15, fontWeight: 700,
                  background: c.green, color: "#FFFFFF", border: "none",
                  borderRadius: 10, cursor: "pointer",
                  opacity: checkoutLoading ? 0.7 : 1,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  transition: "all 200ms",
                }}
              >
                {checkoutLoading ? t("landing.pricing.cta.loading") : t("landing.pricing.cta")}
              </button>

              {checkoutError && <p style={{ fontSize: 13, color: c.red, marginTop: 12 }}>{t("landing.pricing.cta.error")}</p>}
            </div>

            <div style={{ textAlign: "center", marginTop: 20 }}>
              <a href="/pricing" style={{ fontSize: 14, fontFamily: f.mono, color: c.accent, textDecoration: "none", fontWeight: 600 }}>
                {t("landing.pricing.seeAll")} &rarr;
              </a>
            </div>
          </div>

          <p style={{ fontSize: 13, color: c.text3, textAlign: "center", marginTop: 16 }}>{t("price.note")}</p>
        </Section>

        {/* ═══════════ SECURITY STRIP ═══════════ */}
        <Section style={{ paddingTop: 48, paddingBottom: 48 }}>
          <div className="gt-security-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, maxWidth: 960, margin: "0 auto" }}>
            {[
              { label: t("landing.security.aes"), desc: t("landing.security.aes.d") },
              { label: t("landing.security.zk"), desc: t("landing.security.zk.d") },
              { label: t("landing.security.us"), desc: t("landing.security.us.d") },
              { label: t("landing.security.purge"), desc: t("landing.security.purge.d") },
            ].map((item) => (
              <div key={item.label} style={{
                background: "#FFFFFF", border: `1px solid ${c.border}`,
                borderRadius: 14, padding: "22px 18px", textAlign: "center",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}>
                <p style={{ fontSize: 12, fontFamily: f.mono, fontWeight: 700, color: c.text1, letterSpacing: ".06em", marginBottom: 8 }}>{item.label}</p>
                <p style={{ fontSize: 13, color: c.text3, lineHeight: 1.5 }}>{item.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <a href="/security-vault" style={{ fontSize: 13, fontFamily: f.mono, color: c.text3, textDecoration: "none", fontWeight: 500 }}>
              {t("landing.security.link")} &rarr;
            </a>
          </div>
        </Section>

        {/* ═══════════ LEAK COUNTER ═══════════ */}
        <Section style={{ paddingTop: 48, paddingBottom: 48 }}>
          <Suspense fallback={<div style={{ height: 120, background: "#FFFFFF", borderRadius: 12, border: `1px solid ${c.border}` }} />}>
            <LeakCounter locale={locale} />
          </Suspense>
        </Section>

        {/* ═══════════ T12 — FINAL CTA (warm) ═══════════ */}
        <Section style={{ paddingTop: 48, paddingBottom: 104 }}>
          <div style={{
            padding: "80px 48px", textAlign: "center",
            borderRadius: 18, background: c.bg,
            border: `1px solid ${c.border}`,
          }}>
            <h2 style={{
              fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", fontWeight: 800,
              letterSpacing: "-0.03em", marginBottom: 16,
            }}>
              {t("landing.cta.title")}
            </h2>
            <p style={{
              fontSize: 16, color: c.text2, maxWidth: 440,
              margin: "0 auto 32px", lineHeight: 1.7,
            }}>
              {t("landing.cta.sub")}
            </p>

            <button
              type="button"
              onClick={navigateToIntel}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "16px 36px", fontSize: 15, fontWeight: 700,
                background: c.accent, color: "white", border: "none",
                borderRadius: 12, cursor: "pointer", transition: "all 200ms",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = c.accentHi;
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 28px rgba(59,130,246,0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = c.accent;
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {t("landing.cta.primary")} <ArrowRight size={18} />
            </button>

            <p style={{ marginTop: 14, fontSize: 13, color: c.text4 }}>
              {t("price.diag.price")} {t("price.period.onetime")}
            </p>

            {/* Trust badges */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 32, marginTop: 28, flexWrap: "wrap" }}>
              {[
                t("landing.cta.badge.stripe"),
                t("landing.cta.badge.soc2"),
                t("landing.cta.badge.gdpr"),
                t("landing.cta.badge.aes"),
              ].map((name) => (
                <span key={name} style={{
                  fontSize: 10, fontFamily: f.mono, color: c.text4,
                  letterSpacing: ".08em", textTransform: "uppercase" as const,
                  padding: "4px 10px", borderRadius: 4,
                  border: `1px solid ${c.border}`,
                }}>
                  {name}
                </span>
              ))}
            </div>
          </div>
        </Section>

      </div>

      {/* JSON-LD handled by root layout @graph — no duplicate here */}

      {/* T13 — Responsive */}
      <style>{`
        @media (max-width: 768px) {
          .gt-hero-input-row { flex-direction: column !important; }
          .gt-logos-row { gap: 24px !important; }
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
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
      `}</style>
    </div>
  );
}
