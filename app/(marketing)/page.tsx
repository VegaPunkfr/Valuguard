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

      {/* ═══════════ HERO — Logo left, content right ═══════════ */}
      <section style={{ padding: "80px 0 60px" }}>
        <div className="gt-hero-layout" style={{ maxWidth: 1140, margin: "0 auto", padding: "0 28px", display: "grid", gridTemplateColumns: "380px 1fr", gap: 56, alignItems: "center" }}>

          {/* LEFT — Large prominent logo */}
          <div className="gt-hero-logo">
            <img src="/logo.svg" alt="Ghost Tax — Decision Intelligence" width={380} height={88} style={{ width: "100%", height: "auto", display: "block" }} />
          </div>

          {/* RIGHT — Content */}
          <div>
            {/* Badge */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontFamily: f.mono, fontSize: 11, fontWeight: 600,
              letterSpacing: "0.08em", textTransform: "uppercase" as const,
              color: c.green, background: c.greenBg,
              border: `1px solid ${c.greenBd}`,
              padding: "5px 14px", borderRadius: 100,
              marginBottom: 20,
            }}>
              {t("landing.hero.badge") || "Decision Intelligence Platform"}
            </div>

            {/* H1 */}
            <h1 style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 800, lineHeight: 1.1,
              letterSpacing: "-0.035em",
              marginBottom: 18,
            }}>
              {t("landing.hero.t1")}{" "}
              <span style={{ color: c.accent }}>Ghost Tax.</span>
            </h1>

            {/* Subtitle */}
            <p style={{
              fontSize: 17, color: c.text2, maxWidth: 520,
              marginBottom: 28, lineHeight: 1.7,
            }}>
              {t("landing.hero.sub")}
            </p>

            {/* Input + CTA */}
            <div className="gt-hero-input-row" style={{
              display: "flex", gap: 8, maxWidth: 460,
            }}>
              <input
                type="text"
                value={heroInput}
                onChange={(e) => setHeroInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && navigateToIntel()}
                placeholder="yourcompany.com"
                spellCheck={false}
                style={{
                  flex: 1, padding: "14px 18px", fontFamily: f.mono, fontSize: 14,
                  background: "#FFFFFF", border: `1.5px solid ${c.borderS}`,
                  borderRadius: 10, color: c.text1, outline: "none",
                  transition: "border-color 200ms, box-shadow 200ms",
                }}
              />
              <button
                type="button"
                onClick={navigateToIntel}
                style={{
                  padding: "14px 30px", fontSize: 14, fontWeight: 700,
                  background: c.accent, color: "white", border: "none",
                  borderRadius: 10, cursor: "pointer", whiteSpace: "nowrap" as const,
                  transition: "all 200ms",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = c.accentHi;
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(59,130,246,0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = c.accent;
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {t("landing.hero.cta")}
              </button>
            </div>

            <p style={{ fontSize: 12, color: c.text4, marginTop: 10 }}>
              {t("landing.hero.nologin")}
            </p>
          </div>
        </div>
      </section>

      {/* Mobile responsive — stack hero on small screens */}
      <style>{`.gt-hero-layout { grid-template-columns: 380px 1fr !important; } @media (max-width: 768px) { .gt-hero-layout { grid-template-columns: 1fr !important; text-align: center; } .gt-hero-logo { display: flex; justify-content: center; } }`}</style>

      {/* ═══════════ T7 — LOGO BAR ═══════════ */}
      <section style={{
        padding: "50px 0",
        borderTop: `1px solid ${c.border}`,
        borderBottom: `1px solid ${c.border}`,
        textAlign: "center",
      }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 28px" }}>
          <p style={{
            fontFamily: f.mono, fontSize: 10, color: c.text4,
            letterSpacing: "0.12em", textTransform: "uppercase" as const,
            marginBottom: 24,
          }}>
            {t("landing.logos.label")}
          </p>
          <div className="gt-logos-row" style={{
            display: "flex", justifyContent: "center", alignItems: "center",
            gap: 48, flexWrap: "wrap" as const, opacity: 0.4,
          }}>
            {["Mirakl", "ContentSquare", "PayFit", "Alan", "Spendesk", "Swile", "BackMarket"].map((name) => (
              <span key={name} style={{
                fontSize: 16, fontWeight: 700, color: c.text3,
                letterSpacing: "0.02em",
              }}>
                {name}
              </span>
            ))}
          </div>
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
              { value: "100%", label: t("landing.stats.exposureDesc"), color: c.red },
              { value: `${valRecoverable}k`, label: "EUR avg. recoverable", color: c.amber },
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

        {/* ═══════════ T9 — BEFORE/AFTER COMPARISON ═══════════ */}
        <Section style={{ paddingTop: 80, paddingBottom: 48 }}>
          <p style={{
            fontFamily: f.mono, fontSize: 11, fontWeight: 600,
            letterSpacing: "0.12em", textTransform: "uppercase" as const,
            color: c.accent, marginBottom: 14,
          }}>
            {t("landing.compare.label")}
          </p>
          <h2 style={{
            fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 800,
            letterSpacing: "-0.03em", lineHeight: 1.12, marginBottom: 48,
            maxWidth: 520,
          }}>
            {t("landing.compare.title")}
          </h2>

          <div className="gt-comp-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* Before card */}
            <div style={{
              background: "#FFFFFF", borderRadius: 18, padding: 36,
              border: `1px solid ${c.border}`, borderTop: `3px solid ${c.red}`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}>
              <span style={{
                fontFamily: f.mono, fontSize: 10, fontWeight: 700,
                letterSpacing: "0.1em", textTransform: "uppercase" as const,
                padding: "3px 10px", borderRadius: 100,
                display: "inline-block", marginBottom: 20,
                background: c.redBg, color: c.red,
              }}>
                {t("landing.compare.before.tag")}
              </span>
              <p style={{ fontFamily: f.mono, fontSize: 36, fontWeight: 700, color: c.red, marginBottom: 6 }}>
                {t("landing.compare.before.amount")}
              </p>
              <p style={{ fontSize: 13, color: c.text3, marginBottom: 24 }}>
                {t("landing.compare.before.unit")}
              </p>
              <ul style={{ listStyle: "none", fontSize: 14, color: c.text2, lineHeight: 2.2, padding: 0 }}>
                {[
                  { n: "47", text: t("landing.compare.before.l1") },
                  { n: "12", text: t("landing.compare.before.l2") },
                  { n: "3", text: t("landing.compare.before.l3") },
                  { n: "0", text: t("landing.compare.before.l4") },
                  { n: "0%", text: t("landing.compare.before.l5") },
                ].map((item) => (
                  <li key={item.text}>{item.text.replace("{n}", item.n)}</li>
                ))}
              </ul>
            </div>

            {/* After card */}
            <div style={{
              background: "#FFFFFF", borderRadius: 18, padding: 36,
              border: `1px solid ${c.border}`, borderTop: `3px solid ${c.green}`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}>
              <span style={{
                fontFamily: f.mono, fontSize: 10, fontWeight: 700,
                letterSpacing: "0.1em", textTransform: "uppercase" as const,
                padding: "3px 10px", borderRadius: 100,
                display: "inline-block", marginBottom: 20,
                background: c.greenBg, color: c.green,
              }}>
                {t("landing.compare.after.tag")}
              </span>
              <p style={{ fontFamily: f.mono, fontSize: 36, fontWeight: 700, color: c.green, marginBottom: 6 }}>
                {t("landing.compare.after.amount")}
              </p>
              <p style={{ fontSize: 13, color: c.text3, marginBottom: 24 }}>
                {t("landing.compare.after.unit")}
              </p>
              <ul style={{ listStyle: "none", fontSize: 14, color: c.text2, lineHeight: 2.2, padding: 0 }}>
                {[
                  { n: "47", text: t("landing.compare.after.l1") },
                  { n: "8", text: t("landing.compare.after.l2") },
                  { n: "3", text: t("landing.compare.after.l3") },
                  { n: "10", text: t("landing.compare.after.l4") },
                  { n: "1", text: t("landing.compare.after.l5") },
                ].map((item) => (
                  <li key={item.text}>{item.text.replace("{n}", item.n)}</li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        {/* ═══════════ T10 — TESTIMONIALS ═══════════ */}
        <section style={{
          padding: "80px 0",
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
              fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 800,
              letterSpacing: "-0.03em", lineHeight: 1.12, marginBottom: 48,
              maxWidth: 520,
            }}>
              {t("landing.social.title")}
            </h2>

            <div className="gt-test-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              {[
                {
                  quote: t("landing.social.q1"),
                  name: t("landing.social.a1"),
                  role: t("landing.social.ctx1"),
                  initials: "MK",
                  stars: 4,
                },
                {
                  quote: t("landing.social.q2"),
                  name: t("landing.social.a2"),
                  role: t("landing.social.ctx2"),
                  initials: "SL",
                  stars: 4,
                },
                {
                  quote: t("landing.social.q3"),
                  name: t("landing.social.a3"),
                  role: t("landing.social.ctx3"),
                  initials: "JR",
                  stars: 5,
                },
              ].map((item) => (
                <div key={item.initials} style={{
                  background: c.bg, border: `1px solid ${c.border}`,
                  borderRadius: 16, padding: 28,
                }}>
                  {/* Stars */}
                  <p style={{ fontSize: 14, letterSpacing: 2, marginBottom: 16 }}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <span key={i} style={{ color: i < item.stars ? c.amber : c.border }}>&#9733;</span>
                    ))}
                  </p>
                  <p style={{ fontSize: 15, color: c.text2, lineHeight: 1.7, marginBottom: 20 }}>
                    &ldquo;{item.quote}&rdquo;
                  </p>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    borderTop: `1px solid ${c.border}`, paddingTop: 16,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: c.surface, display: "flex",
                      alignItems: "center", justifyContent: "center",
                      fontFamily: f.mono, fontSize: 12, fontWeight: 700, color: c.text3,
                    }}>
                      {item.initials}
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: c.text1 }}>{item.name}</p>
                      <p style={{ fontSize: 11, color: c.text4 }}>{item.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════ T11 — HOW IT WORKS (3 steps) ═══════════ */}
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
              {t("landing.how.label")}
            </p>
            <h2 style={{ marginBottom: 32 }}>{t("landing.how.title")}</h2>

            <div className="gt-how-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {[
                { num: "01", title: t("landing.how.s1"), desc: t("landing.how.s1d") },
                { num: "02", title: t("landing.how.s2"), desc: t("landing.how.s2d") },
                { num: "03", title: t("landing.how.s3"), desc: t("landing.how.s3d") },
              ].map((item) => (
                <div key={item.num} style={{
                  background: c.bg, border: `1px solid ${c.border}`,
                  borderRadius: 14, padding: "28px 22px", position: "relative",
                }}>
                  <span style={{
                    fontFamily: f.mono, fontSize: 36, fontWeight: 800,
                    color: "rgba(26,26,26,0.05)", position: "absolute", top: 10, right: 14,
                  }}>
                    {item.num}
                  </span>
                  <p style={{ fontSize: 16, fontWeight: 700, color: c.text1, marginBottom: 8 }}>{item.title}</p>
                  <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Confidence note (merged from step 4) */}
            <div style={{
              marginTop: 24, padding: "18px 22px", borderRadius: 10,
              background: c.amberBg, border: `1px solid ${c.amberBd}`,
            }}>
              <p style={{ fontSize: 13, color: c.amber, fontWeight: 600, marginBottom: 6 }}>{t("landing.how.conf.title")}</p>
              <p style={{ fontSize: 13, color: c.text3, lineHeight: 1.6 }}>
                {t("landing.how.s4d")} {t("landing.how.conf.desc")}
              </p>
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
