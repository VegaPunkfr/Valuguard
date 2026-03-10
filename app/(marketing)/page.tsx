"use client";

import { useState, useCallback } from "react";
import { CheckCircle, ArrowRight, Shield, Zap, BarChart3, FileText, Target } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { c, f, sp, ts } from "@/lib/tokens";
import Section from "@/components/ui/section";
import Footer from "@/components/ui/footer";
import { LeakCounter } from "@/components/ui/leak-counter";

/* ─── Main ───────────────────────────────────────────── */
export default function LandingPage() {
  const { t, locale } = useI18n();
  const [heroInput, setHeroInput] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState(false);

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

  const PRICING = [
    {
      name: t("price.diag.name"), price: t("price.diag.price"),
      period: t("price.period.onetime"), desc: t("price.diag.desc"),
      features: [t("price.diag.f1"), t("price.diag.f2"), t("price.diag.f3"), t("price.diag.f4"), t("price.diag.f5")],
      cta: checkoutLoading ? t("landing.pricing.cta.loading") : t("landing.pricing.cta"),
      onClick: handleRailACheckout, highlight: true,
      badge: t("price.diag.badge"), roi: t("price.diag.roi"),
    },
    {
      name: t("price.protocol.name"), price: t("price.protocol.price"), period: "",
      desc: t("price.protocol.desc"),
      features: [t("price.protocol.f1"), t("price.protocol.f2"), t("price.protocol.f3"), t("price.protocol.f4"), t("price.protocol.f5")],
      cta: t("price.protocol.cta"), href: "/contact?plan=stabilization",
      highlight: false, badge: t("price.protocol.badge"), roi: t("price.protocol.roi"),
    },
    {
      name: t("price.controlplane.name"), price: t("price.controlplane.price"), period: "",
      desc: t("price.controlplane.desc"),
      features: [t("price.controlplane.f1"), t("price.controlplane.f2"), t("price.controlplane.f3"), t("price.controlplane.f4"), t("price.controlplane.f5")],
      cta: t("price.controlplane.cta"), href: "/contact?plan=institutional",
      highlight: false, badge: t("price.controlplane.badge"), roi: t("price.controlplane.roi"),
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: c.bg, color: c.text1 }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px" }}>

        {/* ═══════════ HERO — Algorithmic Layout ═══════════ */}
        <section style={{ position: "relative", paddingTop: sp[7], paddingBottom: sp[6], overflow: "hidden" }}>

          {/* Layer 0: Radial noise — breaks flat color */}
          <div style={{
            position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
            background: [
              "radial-gradient(ellipse 80% 50% at 70% -20%, hsla(216,91%,65%,0.07) 0%, transparent 60%)",
              "radial-gradient(ellipse 40% 60% at 10% 80%, hsla(162,68%,51%,0.04) 0%, transparent 50%)",
              "radial-gradient(circle at 50% 50%, hsla(0,0%,100%,0.01) 0%, transparent 80%)",
            ].join(", "),
          }} />

          {/* Layer 1: Grain texture overlay */}
          <div style={{
            position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", opacity: 0.3,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
          }} />

          {/* Layer 2: Asymmetric grid — tension visuelle */}
          <div style={{
            position: "relative", zIndex: 2,
            display: "grid",
            gridTemplateColumns: "1fr 0.85fr",
            gap: sp[5],
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
                {t("landing.hero.t1")}
                <br />
                <span style={{
                  background: "linear-gradient(to right, hsl(160,80%,60%), hsl(190,80%,60%))",
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
                marginBottom: sp[5],
              }}>
                {t("landing.hero.sub")}
              </p>

              {/* Domain input — horizontal */}
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
                    border: "1px solid hsla(0,0%,100%,0.08)",
                    background: "hsla(0,0%,0%,0.30)",
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

              {/* Trust row */}
              <div className="gt-trust-bar" style={{
                display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
                gap: sp[3], marginTop: sp[6], maxWidth: 420,
              }}>
                {[
                  { val: t("landing.trust.stat1"), label: t("landing.trust.stat1d") },
                  { val: t("landing.trust.stat2"), label: t("landing.trust.stat2d") },
                  { val: t("landing.trust.stat3"), label: t("landing.trust.stat3d") },
                  { val: t("landing.trust.stat4"), label: t("landing.trust.stat4d") },
                ].map((s) => (
                  <div key={s.label}>
                    <p style={{
                      fontFamily: f.mono, fontSize: ts.md, fontWeight: 800,
                      color: c.accent, letterSpacing: "-0.02em", lineHeight: 1,
                      fontVariantNumeric: "tabular-nums",
                    }}>{s.val}</p>
                    <p style={{ fontSize: ts.xs, color: c.text4, marginTop: sp[1], lineHeight: 1.3 }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── RIGHT: Live Dashboard Bento ──────── */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gridTemplateRows: "auto auto auto",
              gap: sp[2],
              paddingTop: sp[4],
            }}
            className="gt-bento"
            >
              {/* Bento: Exposure Totale (span 2) */}
              <div style={{
                gridColumn: "1 / -1",
                background: "hsla(0,0%,0%,0.25)",
                backdropFilter: "blur(16px) saturate(1.2)",
                border: "1px solid hsla(0,0%,100%,0.05)",
                borderRadius: 14, padding: sp[4],
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: sp[3] }}>
                  <p style={{ fontSize: ts.xs, fontFamily: f.mono, color: c.text4, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    EXPOSITION TOTALE DETECTEE
                  </p>
                  <span style={{
                    fontSize: "9px", fontFamily: f.mono, padding: "2px 8px",
                    borderRadius: 999, background: c.redBg, border: `1px solid ${c.redBd}`,
                    color: c.red, fontWeight: 700, letterSpacing: "0.06em",
                  }}>LIVE</span>
                </div>
                <p style={{
                  fontFamily: f.mono, fontSize: ts.lg, fontWeight: 800,
                  color: c.red, letterSpacing: "-0.02em",
                  fontVariantNumeric: "tabular-nums",
                }}>
                  210 340 — 278 900 <span style={{ fontSize: ts.base, color: c.text3 }}>EUR/an</span>
                </p>
                <div style={{
                  marginTop: sp[3], height: 4, borderRadius: 2,
                  background: "hsla(0,0%,100%,0.04)", overflow: "hidden",
                }}>
                  <div style={{
                    width: "73%", height: "100%", borderRadius: 2,
                    background: "linear-gradient(to right, hsl(0,82%,66%), hsl(35,86%,56%))",
                  }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: sp[1] }}>
                  <span style={{ fontSize: "9px", fontFamily: f.mono, color: c.text4, fontVariantNumeric: "tabular-nums" }}>0</span>
                  <span style={{ fontSize: "9px", fontFamily: f.mono, color: c.text4, fontVariantNumeric: "tabular-nums" }}>73% du spend IT</span>
                </div>
              </div>

              {/* Bento: Licences orphelines */}
              <div style={{
                background: "hsla(0,0%,0%,0.25)",
                border: "1px solid hsla(0,0%,100%,0.05)",
                borderRadius: 14, padding: sp[4],
              }}>
                <p style={{ fontSize: "9px", fontFamily: f.mono, color: c.text4, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: sp[2] }}>
                  LICENCES ORPHELINES
                </p>
                <p style={{
                  fontFamily: f.mono, fontSize: ts.md, fontWeight: 800,
                  color: c.amber, fontVariantNumeric: "tabular-nums",
                }}>47</p>
                <p style={{ fontSize: ts.xs, color: c.text3, marginTop: sp[1], fontFamily: f.mono, fontVariantNumeric: "tabular-nums" }}>
                  ~38 400 EUR/an
                </p>
              </div>

              {/* Bento: Chevauchements */}
              <div style={{
                background: "hsla(0,0%,0%,0.25)",
                border: "1px solid hsla(0,0%,100%,0.05)",
                borderRadius: 14, padding: sp[4],
              }}>
                <p style={{ fontSize: "9px", fontFamily: f.mono, color: c.text4, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: sp[2] }}>
                  CHEVAUCHEMENTS
                </p>
                <p style={{
                  fontFamily: f.mono, fontSize: ts.md, fontWeight: 800,
                  color: c.red, fontVariantNumeric: "tabular-nums",
                }}>12</p>
                <p style={{ fontSize: ts.xs, color: c.text3, marginTop: sp[1], fontFamily: f.mono, fontVariantNumeric: "tabular-nums" }}>
                  6 catégories
                </p>
              </div>

              {/* Bento: Economies projetees */}
              <div style={{
                background: "hsla(0,0%,0%,0.25)",
                border: "1px solid hsla(0,0%,100%,0.05)",
                borderRadius: 14, padding: sp[4],
              }}>
                <p style={{ fontSize: "9px", fontFamily: f.mono, color: c.text4, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: sp[2] }}>
                  ECONOMIES PROJETEES
                </p>
                <p style={{
                  fontFamily: f.mono, fontSize: ts.md, fontWeight: 800,
                  color: c.green, fontVariantNumeric: "tabular-nums",
                }}>+142k</p>
                <p style={{ fontSize: ts.xs, color: c.text3, marginTop: sp[1], fontFamily: f.mono, fontVariantNumeric: "tabular-nums" }}>
                  EUR/an récupérables
                </p>
              </div>

              {/* Bento: Confidence */}
              <div style={{
                background: "hsla(0,0%,0%,0.25)",
                border: "1px solid hsla(0,0%,100%,0.05)",
                borderRadius: 14, padding: sp[4],
              }}>
                <p style={{ fontSize: "9px", fontFamily: f.mono, color: c.text4, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: sp[2] }}>
                  SCORE CONFIANCE
                </p>
                <p style={{
                  fontFamily: f.mono, fontSize: ts.md, fontWeight: 800,
                  color: c.accent, fontVariantNumeric: "tabular-nums",
                }}>62<span style={{ fontSize: ts.sm, color: c.text3, fontWeight: 400 }}>/100</span></p>
                <p style={{ fontSize: ts.xs, color: c.text4, marginTop: sp[1], fontFamily: f.mono }}>
                  grade: moderate
                </p>
              </div>

              {/* Bento: Signal bar (span 2) */}
              <div style={{
                gridColumn: "1 / -1",
                background: "hsla(0,0%,0%,0.25)",
                border: "1px solid hsla(0,0%,100%,0.05)",
                borderRadius: 14, padding: `${sp[3]} ${sp[4]}`,
              }}>
                <p style={{ fontSize: "9px", fontFamily: f.mono, color: c.text4, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: sp[2] }}>
                  SIGNAUX DETECTES
                </p>
                <div style={{ display: "flex", gap: sp[2], flexWrap: "wrap" }}>
                  {[
                    { label: "Shadow AI", severity: c.red },
                    { label: "Zombie SaaS", severity: c.amber },
                    { label: "Auto-renew trap", severity: c.red },
                    { label: "Duplicate CRM", severity: c.amber },
                    { label: "Over-provisioned", severity: c.green },
                  ].map((sig) => (
                    <span key={sig.label} style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      fontSize: "10px", fontFamily: f.mono, color: c.text2,
                      padding: "3px 10px", borderRadius: 6,
                      background: "hsla(0,0%,100%,0.03)",
                      border: "1px solid hsla(0,0%,100%,0.05)",
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
            </div>
          </div>
        </section>

        {/* ═══════════ VALUE STRIP ═══════════ */}
        <Section style={{ paddingTop: 80 }}>
          <div className="gt-strip-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
            {[
              { icon: <Target size={18} />, label: t("landing.strip.detect"), desc: t("landing.strip.detect.d") },
              { icon: <BarChart3 size={18} />, label: t("landing.strip.explain"), desc: t("landing.strip.explain.d") },
              { icon: <Zap size={18} />, label: t("landing.strip.simulate"), desc: t("landing.strip.simulate.d") },
              { icon: <FileText size={18} />, label: t("landing.strip.arm"), desc: t("landing.strip.arm.d") },
              { icon: <Shield size={18} />, label: t("landing.strip.connect"), desc: t("landing.strip.connect.d") },
            ].map((item) => (
              <div key={item.label} className="gt-card gt-card-interactive" style={{ padding: "24px 18px", textAlign: "center" }}>
                <div style={{ color: c.accent, marginBottom: 10, display: "flex", justifyContent: "center" }}>{item.icon}</div>
                <p style={{ fontSize: 12, fontFamily: f.mono, fontWeight: 700, color: c.text1, letterSpacing: ".06em", marginBottom: 8, textTransform: "uppercase" }}>
                  {item.label}
                </p>
                <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.55 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ═══════════ PROBLEM ═══════════ */}
        <Section style={{ paddingTop: 100 }}>
          <div className="gt-panel" style={{ padding: "48px 40px" }}>
            <p className="gt-section-label" style={{ color: c.red }}>{t("problem.label")}</p>
            <h2 style={{ marginBottom: 28 }}>
              {t("problem.title1")}
              <br />
              <span style={{ color: c.red }}>{t("problem.title2")}</span>
            </h2>

            <div className="gt-problem-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {[
                { amt: t("problem.amt1"), desc: t("problem.desc1"), color: c.red },
                { amt: t("problem.amt2"), desc: t("problem.desc2"), color: c.amber },
                { amt: t("problem.amt3"), desc: t("problem.desc3"), color: c.red },
              ].map((item) => (
                <div key={item.amt} className="gt-metric" style={{ padding: "24px 20px", textAlign: "left" }}>
                  <p style={{ fontFamily: f.mono, fontSize: 26, fontWeight: 800, color: item.color, letterSpacing: "-0.02em", marginBottom: 8 }}>
                    {item.amt}
                  </p>
                  <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.55 }}>{item.desc}</p>
                </div>
              ))}
            </div>

            <p style={{ fontSize: 12, color: c.text3, fontFamily: f.mono, marginTop: 16, textAlign: "center", lineHeight: 1.5 }}>
              {t("problem.source")}
            </p>
          </div>
        </Section>

        {/* ═══════════ WHAT YOU RECEIVE ═══════════ */}
        <Section style={{ paddingTop: 100 }}>
          <div className="gt-panel" style={{ padding: "48px 40px" }}>
            <p className="gt-section-label">{t("landing.output.label")}</p>
            <h2 style={{ marginBottom: 10 }}>{t("landing.output.title")}</h2>
            <p style={{ fontSize: 17, color: c.text2, marginBottom: 32, maxWidth: 600, lineHeight: 1.6 }}>
              {t("landing.output.sub")}
            </p>

            <div className="gt-output-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { num: "01", title: t("landing.output.01"), desc: t("landing.output.01d") },
                { num: "02", title: t("landing.output.02"), desc: t("landing.output.02d") },
                { num: "03", title: t("landing.output.03"), desc: t("landing.output.03d") },
                { num: "04", title: t("landing.output.04"), desc: t("landing.output.04d") },
                { num: "05", title: t("landing.output.05"), desc: t("landing.output.05d") },
                { num: "06", title: t("landing.output.06"), desc: t("landing.output.06d") },
              ].map((item) => (
                <div key={item.num} className="gt-card gt-card-interactive" style={{ padding: "20px", position: "relative" }}>
                  <span style={{ fontFamily: f.mono, fontSize: 28, fontWeight: 800, color: "rgba(79,143,247,0.06)", position: "absolute", top: 10, right: 14 }}>
                    {item.num}
                  </span>
                  <p style={{ fontSize: 16, fontWeight: 700, color: c.text1, marginBottom: 4 }}>{item.title}</p>
                  <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.55 }}>{item.desc}</p>
                </div>
              ))}
            </div>

            <div style={{ textAlign: "center", marginTop: 28 }}>
              <a href="/intel" className="gt-btn gt-btn-primary" style={{ padding: "14px 32px" }}>
                {t("landing.output.cta")} <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </Section>

        {/* ═══════════ HOW IT WORKS ═══════════ */}
        <Section style={{ paddingTop: 100 }}>
          <div className="gt-panel" style={{ padding: "48px 40px" }}>
            <p className="gt-section-label">{t("landing.how.label")}</p>
            <h2 style={{ marginBottom: 28 }}>{t("landing.how.title")}</h2>

            <div className="gt-how-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {[
                { num: "01", title: t("landing.how.s1"), desc: t("landing.how.s1d") },
                { num: "02", title: t("landing.how.s2"), desc: t("landing.how.s2d") },
                { num: "03", title: t("landing.how.s3"), desc: t("landing.how.s3d") },
                { num: "04", title: t("landing.how.s4"), desc: t("landing.how.s4d") },
              ].map((item) => (
                <div key={item.num} className="gt-card" style={{ padding: "24px 18px", position: "relative" }}>
                  <span style={{ fontFamily: f.mono, fontSize: 36, fontWeight: 800, color: "rgba(79,143,247,0.06)", position: "absolute", top: 10, right: 14 }}>
                    {item.num}
                  </span>
                  <p style={{ fontSize: 16, fontWeight: 700, color: c.text1, marginBottom: 6 }}>{item.title}</p>
                  <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.55 }}>{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Confidence note */}
            <div style={{ marginTop: 20, padding: "16px 20px", borderRadius: 10, background: c.amberBg, border: "1px solid " + c.amberBd }}>
              <p style={{ fontSize: 13, color: c.amber, fontWeight: 600, marginBottom: 4 }}>{t("landing.how.conf.title")}</p>
              <p style={{ fontSize: 13, color: c.text3, lineHeight: 1.55 }}>{t("landing.how.conf.desc")}</p>
            </div>
          </div>
        </Section>

        {/* ═══════════ DECISION TIERS ═══════════ */}
        <Section style={{ paddingTop: 100 }}>
          <div className="gt-panel" style={{ padding: "48px 40px" }}>
            <p className="gt-section-label">{t("landing.tiers.label")}</p>
            <h2 style={{ marginBottom: 28 }}>{t("landing.tiers.title")}</h2>

            <div className="gt-tiers-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
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
                <div key={tier.name} className="gt-card gt-card-interactive" style={{ padding: "24px 20px", borderColor: tier.borderColor }}>
                  <p style={{ fontSize: 10, fontFamily: f.mono, fontWeight: 700, color: tier.badgeColor, letterSpacing: ".08em", marginBottom: 10, textTransform: "uppercase" }}>
                    {tier.badge}
                  </p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: c.text1, marginBottom: 8 }}>{tier.name}</p>
                  <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.55, marginBottom: 14 }}>{tier.desc}</p>
                  <a href={tier.href} style={{ fontSize: 13, fontFamily: f.mono, color: tier.ctaColor, textDecoration: "none", fontWeight: 600 }}>
                    {tier.cta} &rarr;
                  </a>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ═══════════ PRICING ═══════════ */}
        <Section style={{ paddingTop: 100 }}>
          <div id="pricing" style={{ textAlign: "center", marginBottom: 28 }}>
            <p className="gt-section-label">{t("price.label")}</p>
            <h2 style={{ marginBottom: 8 }}>{t("price.title")}</h2>
            <p style={{ fontSize: 17, color: c.text2, maxWidth: 560, margin: "0 auto", lineHeight: 1.6 }}>
              {t("price.sub")}
            </p>
          </div>

          <div className="gt-pricing-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {PRICING.map((tier, idx) => {
              const isPremium = idx === 2;
              return (
                <div
                  key={tier.name}
                  className="gt-panel"
                  style={{
                    padding: "28px 24px",
                    borderColor: tier.highlight ? c.greenBd : isPremium ? c.accentBd : c.borderS,
                    position: "relative",
                    display: "flex", flexDirection: "column",
                  }}
                >
                  <div className={`gt-badge ${tier.highlight ? "gt-badge--green" : isPremium ? "gt-badge--blue" : "gt-badge--muted"}`}
                    style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap" }}>
                    {tier.badge}
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, marginTop: 6 }}>{tier.name}</h3>
                  <div style={{ marginBottom: 10 }}>
                    <span style={{ fontFamily: f.mono, fontSize: isPremium ? 18 : 28, fontWeight: 800, color: tier.highlight ? c.green : c.accentHi, letterSpacing: isPremium ? ".02em" : "-0.02em" }}>
                      {tier.price}
                    </span>
                    {tier.period && <span style={{ fontSize: 13, color: c.text3, marginLeft: 4 }}>{tier.period}</span>}
                  </div>
                  <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.6, marginBottom: 18 }}>{tier.desc}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 18, flex: 1 }}>
                    {tier.features.map((feat) => (
                      <div key={feat} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 14, color: c.text2, lineHeight: 1.4 }}>
                        <CheckCircle size={15} color={c.green} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 2 }} />
                        {feat}
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: "8px 12px", borderRadius: 8, background: c.greenBg, border: "1px solid " + c.greenBd, marginBottom: 14 }}>
                    <p style={{ fontSize: 12, fontFamily: f.mono, color: c.green, letterSpacing: ".04em", textAlign: "center" }}>{tier.roi}</p>
                  </div>
                  {tier.onClick ? (
                    <button
                      type="button" onClick={tier.onClick} disabled={checkoutLoading}
                      className={`gt-btn ${tier.highlight ? "gt-btn-green" : "gt-btn-accent-ghost"}`}
                      style={{ width: "100%", opacity: checkoutLoading ? 0.7 : 1 }}
                    >
                      {tier.cta}
                    </button>
                  ) : (
                    <a href={tier.href} className="gt-btn gt-btn-accent-ghost" style={{ width: "100%", textAlign: "center" }}>
                      {tier.cta}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
          {checkoutError && <p style={{ fontSize: 13, color: c.red, textAlign: "center", marginTop: 12 }}>{t("landing.pricing.cta.error")}</p>}
          <p style={{ fontSize: 13, color: c.text3, textAlign: "center", marginTop: 14 }}>{t("price.note")}</p>
        </Section>

        {/* ═══════════ SECURITY STRIP ═══════════ */}
        <Section style={{ paddingTop: 80 }}>
          <div className="gt-security-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {[
              { label: t("landing.security.aes"), desc: t("landing.security.aes.d") },
              { label: t("landing.security.zk"), desc: t("landing.security.zk.d") },
              { label: t("landing.security.us"), desc: t("landing.security.us.d") },
              { label: t("landing.security.purge"), desc: t("landing.security.purge.d") },
            ].map((item) => (
              <div key={item.label} className="gt-card" style={{ padding: "20px 16px", textAlign: "center" }}>
                <p style={{ fontSize: 12, fontFamily: f.mono, fontWeight: 700, color: c.accent, letterSpacing: ".06em", marginBottom: 6 }}>{item.label}</p>
                <p style={{ fontSize: 13, color: c.text3, lineHeight: 1.45 }}>{item.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 14 }}>
            <a href="/security-vault" style={{ fontSize: 13, fontFamily: f.mono, color: c.text3, textDecoration: "none", fontWeight: 500 }}>
              {t("landing.security.link")} &rarr;
            </a>
          </div>
        </Section>

        {/* ═══════════ SOCIAL PROOF ═══════════ */}
        <Section style={{ paddingTop: 80 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <p className="gt-section-label">{t("landing.social.label")}</p>
            <h2>{t("landing.social.title")}</h2>
          </div>

          <div className="gt-social-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {[
              { q: t("landing.social.q1"), a: t("landing.social.a1") },
              { q: t("landing.social.q2"), a: t("landing.social.a2") },
              { q: t("landing.social.q3"), a: t("landing.social.a3") },
            ].map((item) => (
              <div key={item.a} className="gt-panel" style={{ padding: "28px 24px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <p style={{ fontSize: 15, color: c.text1, lineHeight: 1.65, fontStyle: "italic", marginBottom: 18 }}>
                  &ldquo;{item.q}&rdquo;
                </p>
                <p style={{ fontSize: 12, fontFamily: f.mono, color: c.text3, letterSpacing: ".04em" }}>{item.a}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <p style={{ fontSize: 13, fontFamily: f.mono, color: c.green, fontWeight: 600 }}>{t("landing.trust.proof")}</p>
          </div>
        </Section>

        {/* ═══════════ LEAK COUNTER (Growth Hack #9) ═══════════ */}
        <Section style={{ paddingTop: 60 }}>
          <LeakCounter locale={locale} />
        </Section>

        {/* ═══════════ FINAL CTA ═══════════ */}
        <Section style={{ paddingTop: 80 }}>
          <div className="gt-panel" style={{ padding: "56px 48px", textAlign: "center", position: "relative", overflow: "hidden" }}>
            {/* Ambient glow */}
            <div style={{
              position: "absolute", top: -80, left: "50%", transform: "translateX(-50%)",
              width: 400, height: 200,
              background: "radial-gradient(ellipse at center, rgba(240,96,96,0.06) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />
            <p style={{ fontSize: 12, fontFamily: f.mono, fontWeight: 700, letterSpacing: ".14em", color: c.red, marginBottom: 14, textTransform: "uppercase" }}>
              {t("landing.cta.urgency")}
            </p>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 40px)", fontWeight: 800, marginBottom: 12 }}>
              {t("landing.cta.title")}
            </h2>
            <p style={{ fontSize: 17, color: c.text2, maxWidth: 520, margin: "0 auto 32px", lineHeight: 1.6 }}>
              {t("landing.cta.sub")}
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
              <a href="/intel" className="gt-btn gt-btn-primary" style={{ padding: "16px 32px", fontSize: 15 }}>
                {t("landing.cta.primary")} <ArrowRight size={16} />
              </a>
              <a href="#pricing" className="gt-btn gt-btn-ghost" style={{ padding: "16px 28px", fontSize: 15 }}>
                {t("landing.cta.secondary")}
              </a>
            </div>
          </div>
        </Section>

      </div>

      <Footer />

      {/* Responsive */}
      <style>{`
        @media (max-width: 768px) {
          .gt-hero-grid { grid-template-columns: 1fr !important; }
          .gt-bento { grid-template-columns: 1fr 1fr !important; }
          .gt-strip-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .gt-output-grid { grid-template-columns: 1fr !important; }
          .gt-how-grid { grid-template-columns: 1fr 1fr !important; }
          .gt-tiers-grid { grid-template-columns: 1fr !important; }
          .gt-pricing-grid { grid-template-columns: 1fr !important; }
          .gt-security-grid { grid-template-columns: 1fr 1fr !important; }
          .gt-preview-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .gt-problem-grid { grid-template-columns: 1fr !important; }
          .gt-social-grid { grid-template-columns: 1fr !important; }
          .gt-trust-bar { grid-template-columns: repeat(2, 1fr) !important; gap: 16px !important; }
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
