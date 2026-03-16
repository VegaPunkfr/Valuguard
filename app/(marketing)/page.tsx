"use client";

import { useState, useCallback, useEffect, useRef, lazy, Suspense } from "react";
import { CheckCircle, ArrowRight, Shield, Zap, BarChart3, FileText, Play, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { c, f, sp, ts } from "@/lib/tokens";
import Section from "@/components/ui/section";

const LeakCounter = lazy(() => import("@/components/ui/leak-counter").then(m => ({ default: m.LeakCounter })));

/* ─── Helper: format bento numbers ──────────────────── */
function formatBentoNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return Math.round(n).toLocaleString("fr-FR");
  return String(Math.round(n));
}

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
      // ease-out cubic
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

  // Video modal state
  const [videoOpen, setVideoOpen] = useState(false);

  // Bento visibility for count-up trigger
  const [bentoVisible, setBentoVisible] = useState(false);
  const bentoRef = useRef<HTMLDivElement | null>(null);

  // IntersectionObserver for bento count-up
  useEffect(() => {
    const node = bentoRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setBentoVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Escape key closes video modal
  useEffect(() => {
    if (!videoOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVideoOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [videoOpen]);

  // Count-up values
  const valLow = useCountUp(210340, 1800, bentoVisible);
  const valHigh = useCountUp(278900, 2100, bentoVisible);
  const valOrphan = useCountUp(47, 1200, bentoVisible);
  const valOverlaps = useCountUp(12, 800, bentoVisible);
  const valSavings = useCountUp(142000, 1600, bentoVisible);
  const valConfidence = useCountUp(62, 1500, bentoVisible);

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
        body: JSON.stringify({ locale }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else { setCheckoutLoading(false); setCheckoutError(true); }
    } catch {
      setCheckoutLoading(false);
      setCheckoutError(true);
    }
  }, [checkoutLoading, locale]);

  return (
    <div style={{ minHeight: "100vh", background: c.bg, color: c.text1 }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px" }}>

        {/* ═══════════ HERO — Algorithmic Layout ═══════════ */}
        <section style={{ position: "relative", paddingTop: sp[7], paddingBottom: sp[7], overflow: "hidden" }}>

          {/* Layer 0: Radial noise */}
          <div style={{
            position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
            background: [
              "radial-gradient(ellipse 80% 50% at 70% -20%, rgba(15,23,42,0.03) 0%, transparent 60%)",
              "radial-gradient(ellipse 40% 60% at 10% 80%, rgba(5,150,105,0.02) 0%, transparent 50%)",
            ].join(", "),
          }} />

          {/* Layer 1: Grain texture overlay */}
          <div style={{
            position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", opacity: 0.05,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
          }} />

          {/* Layer 2: Asymmetric grid */}
          <div style={{
            position: "relative", zIndex: 2,
            display: "grid",
            gridTemplateColumns: "1fr 0.85fr",
            gap: sp[6],
            alignItems: "start",
          }}
          className="gt-hero-grid"
          >

            {/* ── LEFT: Proposition ────────────────── */}
            <div style={{ paddingTop: sp[5] }}>
              <div className="gt-badge gt-badge--blue" style={{ marginBottom: sp[4] }}>
                {t("landing.hero.badge") || "Decision Intelligence Platform"}
              </div>

              <h1 style={{
                fontSize: `clamp(${ts.lg}, 5.5vw, ${ts.xl})`,
                fontWeight: 800,
                lineHeight: 1.04,
                letterSpacing: "-0.04em",
                marginBottom: sp[4],
              }}>
                <span style={{
                  background: "linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #059669 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}>{t("landing.hero.t1")}</span>
                <br />
                <span style={{
                  background: "linear-gradient(to right, #059669, #0284C7)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}>{t("landing.hero.t2")}</span>
              </h1>

              <p style={{
                fontSize: ts.base,
                color: c.text2,
                maxWidth: 480,
                lineHeight: 1.65,
                marginBottom: sp[4],
              }}>
                {t("landing.hero.sub")}
              </p>

              {/* Institutional trust bar */}
              <div className="gt-hero-trust-bar" style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "6px 16px",
                marginBottom: sp[5],
                maxWidth: 520,
              }}>
                {[
                  t("hero.trust.audits"),
                  t("hero.trust.delivery"),
                  t("hero.trust.soc2"),
                  t("hero.trust.gdpr"),
                  t("hero.trust.zeroAccess"),
                ].map((label) => (
                  <span key={label} style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: "10.5px",
                    fontFamily: f.mono,
                    color: c.text3,
                    letterSpacing: "0.04em",
                    lineHeight: 1,
                    padding: "3px 0",
                  }}>
                    <CheckCircle size={11} color={c.green} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                    {label}
                  </span>
                ))}
              </div>

              {/* Domain input */}
              <div style={{ display: "flex", gap: sp[2], maxWidth: 480, marginBottom: sp[3] }}>
                <input
                  type="text"
                  value={heroInput}
                  onChange={(e) => setHeroInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && navigateToIntel()}
                  placeholder="acme.com"
                  className="gt-input gt-input-mono"
                  style={{
                    flex: 1, padding: `${sp[3]} ${sp[4]}`,
                    fontSize: ts.base,
                    border: "1px solid #CBD5E1",
                    background: "#FFFFFF",
                  }}
                />
                <button
                  type="button"
                  onClick={navigateToIntel}
                  className="gt-btn gt-btn-primary"
                  style={{ padding: `${sp[3]} ${sp[5]}`, fontSize: "0.875rem", fontWeight: 700, whiteSpace: "nowrap" }}
                >
                  {t("landing.hero.cta")}
                </button>
              </div>

              <p style={{
                fontSize: ts.xs, color: c.text4, fontFamily: f.mono,
                letterSpacing: "0.06em",
              }}>
                {t("landing.hero.nologin")}
              </p>

              {/* Trust row — conversion stats */}
              <div className="gt-trust-bar" style={{
                display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
                gap: sp[3], marginTop: sp[4], maxWidth: 480,
              }}>
                {[
                  { val: t("landing.stats.analyses"), label: t("landing.stats.analysesDesc"), color: c.accent },
                  { val: t("landing.stats.delivery"), label: t("landing.stats.deliveryDesc"), color: c.green },
                  { val: t("landing.stats.exposure"), label: t("landing.stats.exposureDesc"), color: c.red },
                  { val: t("landing.stats.action"), label: t("landing.stats.actionDesc"), color: c.amber },
                ].map((s) => (
                  <div key={s.label} style={{
                    padding: "12px 0",
                    borderTop: `2px solid ${s.color}20`,
                  }}>
                    <p style={{
                      fontFamily: f.mono, fontSize: ts.md, fontWeight: 800,
                      color: s.color, letterSpacing: "-0.02em", lineHeight: 1,
                      fontVariantNumeric: "tabular-nums",
                    }}>{s.val}</p>
                    <p style={{ fontSize: ts.xs, color: c.text4, marginTop: sp[1], lineHeight: 1.3 }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── RIGHT: Live Dashboard Bento ──────── */}
            <div
              ref={bentoRef}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gridTemplateRows: "auto auto auto",
                gap: sp[2],
                paddingTop: sp[4],
              }}
              className="gt-bento"
            >
              {/* Bento: Total Exposure (span 2) */}
              <div style={{
                gridColumn: "1 / -1",
                background: "#FFFFFF",
                backdropFilter: "none",
                border: "1px solid #E2E8F0",
                borderRadius: 14, padding: sp[4],
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: sp[3] }}>
                  <p style={{ fontSize: ts.xs, fontFamily: f.mono, color: c.text4, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    {t("landing.bento.totalExposure")}
                  </p>
                  <span style={{
                    fontSize: "9px", fontFamily: f.mono, padding: "2px 8px",
                    borderRadius: 999, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.20)",
                    color: "#60a5fa", fontWeight: 700, letterSpacing: "0.06em",
                  }}>DEMO</span>
                </div>
                <p style={{
                  fontFamily: f.mono, fontSize: ts.lg, fontWeight: 800,
                  color: c.red, letterSpacing: "-0.02em",
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {formatBentoNum(valLow)} — {formatBentoNum(valHigh)} <span style={{ fontSize: ts.base, color: c.text3 }}>{t("landing.bento.perYear")}</span>
                </p>
                <p style={{ fontSize: 11, color: c.text3, marginTop: 6, fontFamily: f.mono, fontStyle: "italic" }}>
                  *Exemple illustratif — votre analyse utilise votre domaine réel
                </p>
                <div style={{
                  marginTop: sp[3], height: 4, borderRadius: 2,
                  background: "#F1F5F9", overflow: "hidden",
                }}>
                  <div style={{
                    width: "73%", height: "100%", borderRadius: 2,
                    background: "linear-gradient(to right, hsl(0,82%,66%), hsl(35,86%,56%))",
                  }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: sp[1] }}>
                  <span style={{ fontSize: "9px", fontFamily: f.mono, color: c.text4, fontVariantNumeric: "tabular-nums" }}>0</span>
                  <span style={{ fontSize: "9px", fontFamily: f.mono, color: c.text4, fontVariantNumeric: "tabular-nums" }}>{t("landing.bento.itSpendPct")}</span>
                </div>
              </div>

              {/* Bento: Orphan Licenses */}
              <div style={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: 14, padding: sp[4],
              }}>
                <p style={{ fontSize: "9px", fontFamily: f.mono, color: c.text4, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: sp[2] }}>
                  {t("landing.bento.orphanLicenses")}
                </p>
                <p style={{
                  fontFamily: f.mono, fontSize: ts.md, fontWeight: 800,
                  color: c.amber, fontVariantNumeric: "tabular-nums",
                }}>{formatBentoNum(valOrphan)}</p>
                <p style={{ fontSize: ts.xs, color: c.text3, marginTop: sp[1], fontFamily: f.mono, fontVariantNumeric: "tabular-nums" }}>
                  ~38 400 {t("landing.bento.perYear")}
                </p>
              </div>

              {/* Bento: Overlaps */}
              <div style={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: 14, padding: sp[4],
              }}>
                <p style={{ fontSize: "9px", fontFamily: f.mono, color: c.text4, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: sp[2] }}>
                  {t("landing.bento.overlaps")}
                </p>
                <p style={{
                  fontFamily: f.mono, fontSize: ts.md, fontWeight: 800,
                  color: c.red, fontVariantNumeric: "tabular-nums",
                }}>{formatBentoNum(valOverlaps)}</p>
                <p style={{ fontSize: ts.xs, color: c.text3, marginTop: sp[1], fontFamily: f.mono, fontVariantNumeric: "tabular-nums" }}>
                  {t("landing.bento.categories")}
                </p>
              </div>

              {/* Bento: Projected Savings */}
              <div style={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: 14, padding: sp[4],
              }}>
                <p style={{ fontSize: "9px", fontFamily: f.mono, color: c.text4, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: sp[2] }}>
                  {t("landing.bento.projectedSavings")}
                </p>
                <p style={{
                  fontFamily: f.mono, fontSize: ts.md, fontWeight: 800,
                  color: c.green, fontVariantNumeric: "tabular-nums",
                }}>+{valSavings >= 1000 ? Math.round(valSavings / 1000) + "k" : formatBentoNum(valSavings)}</p>
                <p style={{ fontSize: ts.xs, color: c.text3, marginTop: sp[1], fontFamily: f.mono, fontVariantNumeric: "tabular-nums" }}>
                  {t("landing.bento.recoverable")}
                </p>
              </div>

              {/* Bento: Confidence */}
              <div style={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: 14, padding: sp[4],
              }}>
                <p style={{ fontSize: "9px", fontFamily: f.mono, color: c.text4, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: sp[2] }}>
                  {t("landing.bento.confidenceScore")}
                </p>
                <p style={{
                  fontFamily: f.mono, fontSize: ts.md, fontWeight: 800,
                  color: c.accent, fontVariantNumeric: "tabular-nums",
                }}>{formatBentoNum(valConfidence)}<span style={{ fontSize: ts.sm, color: c.text3, fontWeight: 400 }}>/100</span></p>
                <p style={{ fontSize: ts.xs, color: c.text4, marginTop: sp[1], fontFamily: f.mono }}>
                  {t("landing.bento.gradeModerate")}
                </p>
              </div>

              {/* Bento: Signal bar (span 2) */}
              <div style={{
                gridColumn: "1 / -1",
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: 14, padding: `${sp[3]} ${sp[4]}`,
              }}>
                <p style={{ fontSize: "9px", fontFamily: f.mono, color: c.text4, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: sp[2] }}>
                  {t("landing.bento.signalsDetected")}
                </p>
                <div style={{ display: "flex", gap: sp[2], flexWrap: "wrap" }}>
                  {[
                    { label: t("landing.bento.tag1"), severity: c.red },
                    { label: t("landing.bento.tag2"), severity: c.amber },
                    { label: t("landing.bento.tag3"), severity: c.red },
                    { label: t("landing.bento.tag4"), severity: c.amber },
                    { label: t("landing.bento.tag5"), severity: c.green },
                  ].map((sig) => (
                    <span key={sig.label} style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      fontSize: "10px", fontFamily: f.mono, color: c.text2,
                      padding: "3px 10px", borderRadius: 6,
                      background: "#F8FAFC",
                      border: "1px solid #E2E8F0",
                    }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: sig.severity, flexShrink: 0,
                      }} />
                      {sig.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* SAMPLE DATA badge */}
              <div style={{
                gridColumn: "1 / -1",
                fontSize: 9, fontFamily: f.mono, color: c.text4,
                letterSpacing: ".1em", textTransform: "uppercase",
                textAlign: "center", marginTop: 8, padding: "2px 0",
              }}>
                SAMPLE DATA
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ VIDEO / DEMO PLACEHOLDER ═══════════ */}
        <Section style={{ paddingTop: 48, paddingBottom: 48 }}>
          {/* Video trigger thumbnail */}
          <div
            onClick={() => setVideoOpen(true)}
            className="gt-video-placeholder"
            style={{
              display: "block",
              maxWidth: 800,
              margin: "0 auto",
              position: "relative",
              aspectRatio: "16 / 9",
              borderRadius: 16,
              overflow: "hidden",
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              cursor: "pointer",
            }}
          >
            {/* Subtle bg tint */}
            <div style={{
              position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
            }} />

            {/* Grid texture overlay */}
            <div style={{
              position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", opacity: 0.15,
              backgroundImage: "linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }} />

            {/* Content */}
            <div style={{
              position: "relative", zIndex: 2,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              height: "100%", gap: 16,
            }}>
              {/* Play button */}
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(15,23,42,0.06)",
                border: "1px solid #E2E8F0",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                transition: "all 0.2s ease",
              }}>
                <Play size={28} color={c.accent} fill={c.accent} style={{ marginLeft: 3 }} />
              </div>

              <p style={{
                fontSize: ts.base, fontWeight: 700, color: c.text1,
                textAlign: "center", maxWidth: 480, lineHeight: 1.4,
              }}>
                {t("landing.video.title")}
              </p>

              <p style={{
                fontSize: ts.xs, fontFamily: f.mono, color: c.text4,
                letterSpacing: "0.08em", textTransform: "uppercase",
              }}>
                {t("landing.video.subtitle")}
              </p>
            </div>
          </div>

          {/* Video modal overlay */}
          {videoOpen && (
            <div
              onClick={() => setVideoOpen(false)}
              style={{
                position: "fixed", inset: 0, zIndex: 1000,
                background: "rgba(0,0,0,0.50)",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "24px",
              }}
            >
              {/* Inner container — stop propagation so click inside doesn't close */}
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: "relative",
                  width: "100%",
                  maxWidth: 900,
                  borderRadius: 12,
                  overflow: "hidden",
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
                  backdropFilter: "none",
                }}
              >
                {/* Close button */}
                <button
                  onClick={() => setVideoOpen(false)}
                  style={{
                    position: "absolute", top: 12, right: 12, zIndex: 10,
                    width: 36, height: 36, borderRadius: "50%",
                    background: "rgba(0,0,0,0.05)",
                    border: "1px solid #E2E8F0",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", color: c.text1,
                    transition: "background 0.15s ease",
                  }}
                  aria-label="Fermer la vidéo"
                >
                  <X size={18} />
                </button>

                {/* 16:9 iframe wrapper */}
                <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
                  {/* TODO: Replace with real product demo URL before launch */}
                  <iframe
                    src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
                    title="Ghost Tax — Demo"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{
                      position: "absolute", top: 0, left: 0,
                      width: "100%", height: "100%",
                      border: "none",
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </Section>

        {/* ═══════════ VALUE STRIP (4 items, breathing room) ═══════════ */}
        <Section style={{ paddingTop: 80, paddingBottom: 48 }}>
          <div className="gt-strip-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            {[
              { icon: <BarChart3 size={20} />, label: t("landing.strip.detect"), desc: t("landing.strip.detect.d") },
              { icon: <Zap size={20} />, label: t("landing.strip.explain"), desc: t("landing.strip.explain.d") },
              { icon: <FileText size={20} />, label: t("landing.strip.simulate"), desc: t("landing.strip.simulate.d") },
              { icon: <Shield size={20} />, label: t("landing.strip.arm"), desc: t("landing.strip.arm.d") },
            ].map((item) => (
              <div key={item.label} className="gt-card gt-card-interactive" style={{ padding: "28px 20px", textAlign: "center" }}>
                <div style={{ color: c.accent, marginBottom: 14, display: "flex", justifyContent: "center" }}>{item.icon}</div>
                <p style={{ fontSize: 13, fontFamily: f.mono, fontWeight: 700, color: c.text1, letterSpacing: ".06em", marginBottom: 10, textTransform: "uppercase" }}>
                  {item.label}
                </p>
                <p style={{ fontSize: 15, color: c.text2, lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ═══════════ PROBLEM ═══════════ */}
        <Section style={{ paddingTop: 80, paddingBottom: 48 }}>
          <div className="gt-panel" style={{ padding: "56px 48px", maxWidth: 960, margin: "0 auto" }}>
            <p className="gt-section-label" style={{ color: c.red }}>{t("problem.label")}</p>
            <h2 style={{ marginBottom: 32 }}>
              {t("problem.title1")}
              <br />
              <span style={{ color: c.red }}>{t("problem.title2")}</span>
            </h2>

            <div className="gt-problem-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {[
                { amt: t("problem.amt1"), desc: t("problem.desc1"), color: c.red },
                { amt: t("problem.amt2"), desc: t("problem.desc2"), color: c.amber },
                { amt: t("problem.amt3"), desc: t("problem.desc3"), color: c.red },
              ].map((item) => (
                <div key={item.amt} className="gt-metric" style={{ padding: "28px 22px", textAlign: "left" }}>
                  <p style={{ fontFamily: f.mono, fontSize: 28, fontWeight: 800, color: item.color, letterSpacing: "-0.02em", marginBottom: 10 }}>
                    {item.amt}
                  </p>
                  <p style={{ fontSize: 15, color: c.text2, lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              ))}
            </div>

            <p style={{ fontSize: 12, color: c.text3, fontFamily: f.mono, marginTop: 20, textAlign: "center", lineHeight: 1.5 }}>
              {t("problem.source")}
            </p>
          </div>
        </Section>

        {/* ═══════════ SOCIAL PROOF (moved up, before pricing) ═══════════ */}
        <Section style={{ paddingTop: 80, paddingBottom: 48 }}>
          <div style={{ textAlign: "center", marginBottom: 32, maxWidth: 960, margin: "0 auto 32px" }}>
            <p className="gt-section-label">{t("landing.social.label")}</p>
            <h2 style={{ marginBottom: 12 }}>{t("landing.social.title")}</h2>
            <p style={{ fontSize: 15, fontFamily: f.mono, color: c.green, fontWeight: 600, marginTop: 8 }}>
              {t("landing.social.count")}
            </p>
          </div>

          <div className="gt-social-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, maxWidth: 960, margin: "0 auto" }}>
            {[
              { q: t("landing.social.q1"), a: t("landing.social.a1"), ctx: t("landing.social.ctx1") },
              { q: t("landing.social.q2"), a: t("landing.social.a2"), ctx: t("landing.social.ctx2") },
              { q: t("landing.social.q3"), a: t("landing.social.a3"), ctx: t("landing.social.ctx3") },
            ].map((item) => (
              <div key={item.a} className="gt-panel" style={{ padding: "32px 28px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <p style={{ fontSize: 15, color: c.text1, lineHeight: 1.65, fontStyle: "italic", marginBottom: 20 }}>
                  &ldquo;{item.q}&rdquo;
                </p>
                <div>
                  <p style={{ fontSize: 12, fontFamily: f.mono, color: c.text2, letterSpacing: ".04em", marginBottom: 4 }}>{item.a}</p>
                  <p style={{ fontSize: 11, fontFamily: f.mono, color: c.text4 }}>{item.ctx}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ═══════════ WHAT YOU RECEIVE ═══════════ */}
        <Section style={{ paddingTop: 80, paddingBottom: 48 }}>
          <div className="gt-panel" style={{ padding: "56px 48px", maxWidth: 960, margin: "0 auto" }}>
            <p className="gt-section-label">{t("landing.output.label")}</p>
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
                <div key={item.num} className="gt-card gt-card-interactive" style={{ padding: "22px", position: "relative" }}>
                  <span style={{ fontFamily: f.mono, fontSize: 28, fontWeight: 800, color: "rgba(15,23,42,0.05)", position: "absolute", top: 10, right: 14 }}>
                    {item.num}
                  </span>
                  <p style={{ fontSize: 16, fontWeight: 700, color: c.text1, marginBottom: 6 }}>{item.title}</p>
                  <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              ))}
            </div>

            <div style={{ textAlign: "center", marginTop: 32 }}>
              <a href="/intel" className="gt-btn gt-btn-primary" style={{ padding: "14px 32px" }}>
                {t("landing.output.cta")} <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </Section>

        {/* ═══════════ HOW IT WORKS ═══════════ */}
        <Section style={{ paddingTop: 80, paddingBottom: 48 }}>
          <div className="gt-panel" style={{ padding: "56px 48px", maxWidth: 960, margin: "0 auto" }}>
            <p className="gt-section-label">{t("landing.how.label")}</p>
            <h2 style={{ marginBottom: 32 }}>{t("landing.how.title")}</h2>

            <div className="gt-how-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {[
                { num: "01", title: t("landing.how.s1"), desc: t("landing.how.s1d") },
                { num: "02", title: t("landing.how.s2"), desc: t("landing.how.s2d") },
                { num: "03", title: t("landing.how.s3"), desc: t("landing.how.s3d") },
              ].map((item) => (
                <div key={item.num} className="gt-card" style={{ padding: "28px 22px", position: "relative" }}>
                  <span style={{ fontFamily: f.mono, fontSize: 36, fontWeight: 800, color: "rgba(15,23,42,0.05)", position: "absolute", top: 10, right: 14 }}>
                    {item.num}
                  </span>
                  <p style={{ fontSize: 16, fontWeight: 700, color: c.text1, marginBottom: 8 }}>{item.title}</p>
                  <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Step 4: Decision surface — highlighted */}
            <div className="gt-card" style={{ padding: "28px 22px", position: "relative", marginTop: 14, borderColor: c.accentBd }}>
              <span style={{ fontFamily: f.mono, fontSize: 36, fontWeight: 800, color: "rgba(15,23,42,0.05)", position: "absolute", top: 10, right: 14 }}>
                04
              </span>
              <p style={{ fontSize: 16, fontWeight: 700, color: c.text1, marginBottom: 8 }}>{t("landing.how.s4")}</p>
              <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.6 }}>{t("landing.how.s4d")}</p>
            </div>

            {/* Confidence note */}
            <div style={{ marginTop: 24, padding: "18px 22px", borderRadius: 10, background: c.amberBg, border: "1px solid " + c.amberBd }}>
              <p style={{ fontSize: 13, color: c.amber, fontWeight: 600, marginBottom: 6 }}>{t("landing.how.conf.title")}</p>
              <p style={{ fontSize: 13, color: c.text3, lineHeight: 1.6 }}>{t("landing.how.conf.desc")}</p>
            </div>
          </div>
        </Section>

        {/* ═══════════ DECISION TIERS ═══════════ */}
        <Section style={{ paddingTop: 80, paddingBottom: 48 }}>
          <div className="gt-panel" style={{ padding: "56px 48px", maxWidth: 960, margin: "0 auto" }}>
            <p className="gt-section-label">{t("landing.tiers.label")}</p>
            <h2 style={{ marginBottom: 32 }}>{t("landing.tiers.title")}</h2>

            <div className="gt-tiers-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              {[
                {
                  badge: t("landing.tiers.l1.badge"), badgeColor: c.accentHi,
                  name: t("landing.tiers.l1.name"), desc: t("landing.tiers.l1.desc"),
                  cta: t("landing.tiers.l1.cta"), href: "/intel", ctaColor: c.accentHi,
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
                <div key={tier.name} className="gt-card gt-card-interactive" style={{ padding: "28px 22px", borderColor: tier.borderColor }}>
                  <p style={{ fontSize: 10, fontFamily: f.mono, fontWeight: 700, color: tier.badgeColor, letterSpacing: ".08em", marginBottom: 12, textTransform: "uppercase" }}>
                    {tier.badge}
                  </p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: c.text1, marginBottom: 10 }}>{tier.name}</p>
                  <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.6, marginBottom: 16 }}>{tier.desc}</p>
                  <a href={tier.href} style={{ fontSize: 13, fontFamily: f.mono, color: tier.ctaColor, textDecoration: "none", fontWeight: 600 }}>
                    {tier.cta} &rarr;
                  </a>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ═══════════ PRICING — Focused Rail A ═══════════ */}
        <Section style={{ paddingTop: 80, paddingBottom: 48 }}>
          <div id="pricing" style={{ textAlign: "center", marginBottom: 32 }}>
            <p className="gt-section-label">{t("price.label")}</p>
            <h2 style={{ marginBottom: 10 }}>{t("price.title")}</h2>
            <p style={{ fontSize: 17, color: c.text2, maxWidth: 520, margin: "0 auto", lineHeight: 1.6 }}>
              {t("price.sub")}
            </p>
          </div>

          {/* Single Rail A card — focused */}
          <div style={{ maxWidth: 480, margin: "0 auto" }}>
            <div
              className="gt-panel"
              style={{
                padding: "40px 36px",
                borderColor: c.greenBd,
                position: "relative",
                textAlign: "center",
              }}
            >
              <div className="gt-badge gt-badge--green"
                style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap" }}>
                {t("price.diag.badge")}
              </div>

              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, marginTop: 8 }}>{t("price.diag.name")}</h3>

              <div style={{ marginBottom: 16 }}>
                <span style={{
                  fontFamily: f.mono, fontSize: 48, fontWeight: 800, color: c.green,
                  letterSpacing: "-0.03em", lineHeight: 1,
                  textShadow: "none",
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

              <div style={{ padding: "10px 14px", borderRadius: 8, background: c.greenBg, border: "1px solid " + c.greenBd, marginBottom: 18 }}>
                <p style={{ fontSize: 12, fontFamily: f.mono, color: c.green, letterSpacing: ".04em" }}>{t("price.diag.roi")}</p>
              </div>

              <button
                type="button" onClick={handleRailACheckout} disabled={checkoutLoading}
                className="gt-btn gt-btn-green"
                style={{
                  width: "100%", padding: "16px 28px", fontSize: 15, fontWeight: 700,
                  opacity: checkoutLoading ? 0.7 : 1,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
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
              <div key={item.label} className="gt-card" style={{ padding: "22px 18px", textAlign: "center" }}>
                <p style={{ fontSize: 12, fontFamily: f.mono, fontWeight: 700, color: c.accent, letterSpacing: ".06em", marginBottom: 8 }}>{item.label}</p>
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

        {/* ═══════════ LEAK COUNTER (Growth Hack #9) ═══════════ */}
        <Section style={{ paddingTop: 48, paddingBottom: 48 }}>
          <Suspense fallback={<div style={{ height: 120, background: "#F8FAFC", borderRadius: 12, border: "1px solid #E2E8F0" }} />}>
            <LeakCounter locale={locale} />
          </Suspense>
        </Section>

        {/* ═══════════ FINAL CTA — Full-width dark, impossible to ignore ═══════════ */}
        <Section style={{ paddingTop: 48, paddingBottom: sp[7] }}>
          <div style={{
            padding: "72px 48px",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
            borderRadius: 18,
            background: "linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)",
            border: "1px solid #E2E8F0",
          }}>
            {/* Removed ambient glow for light theme */}

            <p style={{ fontSize: 12, fontFamily: f.mono, fontWeight: 700, letterSpacing: ".14em", color: c.red, marginBottom: 18, textTransform: "uppercase", position: "relative" }}>
              {t("landing.cta.urgency")}
            </p>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 42px)", fontWeight: 800, marginBottom: 16, position: "relative" }}>
              {t("landing.cta.title")}
            </h2>
            <p style={{ fontSize: 17, color: c.text2, maxWidth: 520, margin: "0 auto 36px", lineHeight: 1.6, position: "relative" }}>
              {t("landing.cta.sub")}
            </p>

            <div style={{ display: "flex", justifyContent: "center", position: "relative" }}>
              <a href="/intel" className="gt-btn gt-btn-primary" style={{
                padding: "18px 40px", fontSize: 15, fontWeight: 700,
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}>
                {t("landing.cta.primary")} <ArrowRight size={18} />
              </a>
            </div>

            {/* Trust badges */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 32, marginTop: 28, flexWrap: "wrap", position: "relative" }}>
              {[
                t("landing.cta.badge.stripe"),
                t("landing.cta.badge.soc2"),
                t("landing.cta.badge.gdpr"),
                t("landing.cta.badge.aes"),
              ].map((name) => (
                <span key={name} style={{
                  fontSize: 10, fontFamily: f.mono, color: c.text4,
                  letterSpacing: ".08em", textTransform: "uppercase",
                  padding: "4px 10px", borderRadius: 4,
                  border: "1px solid #E2E8F0",
                }}>
                  {name}
                </span>
              ))}
            </div>
          </div>
        </Section>

      </div>

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Ghost Tax SAS",
            url: "https://ghost-tax.com",
            logo: "https://ghost-tax.com/favicon.svg",
            description: "Decision Intelligence platform that detects hidden financial exposure in SaaS, AI, and Cloud spending.",
            foundingDate: "2025",
            contactPoint: {
              "@type": "ContactPoint",
              email: "audits@ghost-tax.com",
              contactType: "sales",
            },
            sameAs: [],
          },
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Ghost Tax",
            url: "https://ghost-tax.com",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            description: "Detect hidden financial exposure in your SaaS, AI, and Cloud spending. Get a full Decision Pack with exposure analysis, negotiation playbooks, and corrective protocols.",
            offers: {
              "@type": "Offer",
              price: "490",
              priceCurrency: "EUR",
              availability: "https://schema.org/InStock",
            },
          },
        ]) }}
      />

      {/* Responsive */}
      <style>{`
        @media (max-width: 768px) {
          .gt-hero-grid { grid-template-columns: 1fr !important; }
          .gt-bento { grid-template-columns: 1fr 1fr !important; }
          .gt-strip-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .gt-output-grid { grid-template-columns: 1fr !important; }
          .gt-how-grid { grid-template-columns: 1fr !important; }
          .gt-tiers-grid { grid-template-columns: 1fr !important; }
          .gt-pricing-grid { grid-template-columns: 1fr !important; }
          .gt-security-grid { grid-template-columns: 1fr 1fr !important; }
          .gt-problem-grid { grid-template-columns: 1fr !important; }
          .gt-social-grid { grid-template-columns: 1fr !important; }
          .gt-trust-bar { grid-template-columns: repeat(2, 1fr) !important; gap: 16px !important; }
          .gt-video-placeholder { max-width: 100% !important; }
        }
        @media (max-width: 480px) {
          .gt-strip-grid { grid-template-columns: 1fr !important; }
          .gt-how-grid { grid-template-columns: 1fr !important; }
          .gt-security-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
