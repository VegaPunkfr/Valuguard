"use client";

import { useState, useCallback } from "react";
import { CheckCircle, ArrowRight, Zap, Shield, TrendingUp } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { c, f, inset } from "@/lib/tokens";
import { type PricingLocale } from "@/lib/pricing";
import Section from "@/components/ui/section";
import Footer from "@/components/ui/footer";
import FaqItem from "@/components/ui/faq-item";

type BillingCycle = "monthly" | "annual";

export default function PricingPage() {
  const { t, locale } = useI18n();
  const pLocale = (locale === "fr" ? "fr" : locale === "de" ? "de" : "en") as PricingLocale;
  const isUSD = pLocale === "en";
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState(false);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Prices by locale
  const detect = {
    starter: isUSD ? 990 : 890,
    growth: isUSD ? 1990 : 1690,
    scale: isUSD ? 3490 : 2990,
  };
  const stabilize = isUSD ? 5990 : 4990;
  const monitorMonthly = isUSD ? 2490 : 1990;
  const monitorAnnual = isUSD ? 24900 : 19900;
  const monitorAnnualMonthly = Math.round((isUSD ? 24900 : 19900) / 12);
  const missionFrom = isUSD ? 25000 : 20000;

  const fmtPrice = (n: number) => {
    if (isUSD) return `$${n.toLocaleString("en-US")}`;
    return `${n.toLocaleString("de-DE")} €`;
  };

  const handleCheckout = useCallback(async (rail: "A" | "B_STABILIZE", tierHeadcount?: number) => {
    const key = `${rail}_${tierHeadcount || ""}`;
    if (checkoutLoading) return;
    setCheckoutLoading(key);
    setCheckoutError(false);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rail,
          locale: pLocale,
          headcount: tierHeadcount,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setCheckoutLoading(null);
        setCheckoutError(true);
      }
    } catch {
      setCheckoutLoading(null);
      setCheckoutError(true);
    }
  }, [checkoutLoading, pLocale]);

  const tiers = [
    {
      id: "detect",
      icon: <Zap size={20} color={c.green} />,
      name: t("pricing.tier1.name"),
      badge: t("pricing.tier1.badge"),
      desc: t("pricing.tier1.desc"),
      features: [
        t("pricing.tier1.f1"),
        t("pricing.tier1.f2"),
        t("pricing.tier1.f3"),
        t("pricing.tier1.f4"),
        t("pricing.tier1.f5"),
        t("pricing.tier1.f6"),
      ],
      roi: t("pricing.tier1.roi"),
      highlight: true,
      badgeColor: c.green,
      borderColor: c.greenBd,
      // Tiered sub-pricing
      subTiers: [
        { label: t("pricing.tier1.size1"), price: detect.starter, headcount: 100 },
        { label: t("pricing.tier1.size2"), price: detect.growth, headcount: 500 },
        { label: t("pricing.tier1.size3"), price: detect.scale, headcount: 1500 },
      ],
    },
    {
      id: "stabilize",
      icon: <Shield size={20} color={c.accentHi} />,
      name: t("pricing.tier2.name"),
      badge: t("pricing.tier2.badge"),
      price: stabilize,
      desc: t("pricing.tier2.desc"),
      features: [
        t("pricing.tier2.f1"),
        t("pricing.tier2.f2"),
        t("pricing.tier2.f3"),
        t("pricing.tier2.f4"),
        t("pricing.tier2.f5"),
      ],
      roi: t("pricing.tier2.roi"),
      highlight: false,
      badgeColor: c.accentHi,
      borderColor: c.accentBd,
      includesDetection: true,
    },
    {
      id: "monitor",
      icon: <TrendingUp size={20} color={c.accentHi} />,
      name: t("pricing.tier3.name"),
      badge: t("pricing.tier3.badge"),
      desc: t("pricing.tier3.desc"),
      features: [
        t("pricing.tier3.f1"),
        t("pricing.tier3.f2"),
        t("pricing.tier3.f3"),
        t("pricing.tier3.f4"),
        t("pricing.tier3.f5"),
      ],
      roi: t("pricing.tier3.roi"),
      highlight: false,
      badgeColor: c.accentHi,
      borderColor: c.accentBd,
    },
  ];

  const faqs = [
    { q: t("pricing.faq.q1"), a: t("pricing.faq.a1") },
    { q: t("pricing.faq.q2"), a: t("pricing.faq.a2") },
    { q: t("pricing.faq.q3"), a: t("pricing.faq.a3") },
    { q: t("pricing.faq.q4"), a: t("pricing.faq.a4") },
    { q: t("pricing.faq.q5"), a: t("pricing.faq.a5") },
    { q: t("pricing.faq.q6"), a: t("pricing.faq.a6") },
  ];

  return (
    <div style={{ minHeight: "100vh", background: c.bg, color: c.text1 }}>
      <div className="gt-container">

        {/* Header */}
        <Section style={{ textAlign: "center", paddingTop: 80, paddingBottom: 20 }}>
          <p className="gt-section-label">{t("pricing.label")}</p>
          <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.035em", marginBottom: 16 }}>
            {t("pricing.title")}
          </h1>
          <p style={{ fontSize: 18, color: c.text2, maxWidth: 600, margin: "0 auto", lineHeight: 1.6 }}>
            {t("pricing.sub")}
          </p>

          {/* Currency indicator */}
          <div style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 8, background: "rgba(18,24,40,0.5)", border: `1px solid ${c.border}` }}>
            <span style={{ fontSize: 11, fontFamily: f.mono, color: c.text3 }}>
              {t("pricing.currencyNote").replace("{currency}", isUSD ? "USD" : "EUR")}
            </span>
            <span style={{ fontSize: 11, fontFamily: f.mono, color: c.green, fontWeight: 700 }}>
              {isUSD ? "🇺🇸" : "🇩🇪🇦🇹🇨🇭"}
            </span>
          </div>
        </Section>

        {/* Pricing cards — 3-column grid */}
        <Section style={{ paddingTop: 40, paddingBottom: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>

            {/* ═══ TIER 1: DETECT (tiered pricing) ═══ */}
            <div className="gt-card" style={{
              padding: "28px 22px", borderColor: c.greenBd, position: "relative", display: "flex", flexDirection: "column",
              boxShadow: `0 0 40px rgba(52,211,153,0.06)`,
            }}>
              <div style={{
                position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)",
                fontSize: 9, fontFamily: f.mono, fontWeight: 700, padding: "4px 12px", borderRadius: 6,
                background: c.green, color: c.bg, letterSpacing: ".06em", textTransform: "uppercase", whiteSpace: "nowrap",
              }}>
                {tiers[0].badge}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, marginBottom: 8 }}>
                {tiers[0].icon}
                <h3 style={{ fontSize: 17, fontWeight: 700, color: c.text1 }}>{tiers[0].name}</h3>
              </div>

              {/* Tiered price selector */}
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 9, fontFamily: f.mono, color: c.text3, letterSpacing: ".1em", marginBottom: 8, textTransform: "uppercase" }}>
                  {t("pricing.selectSize")}
                </p>
                {tiers[0].subTiers!.map((sub, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 12px", marginBottom: 4, borderRadius: 8,
                    background: i === 0 ? "rgba(52,211,153,0.06)" : "rgba(18,24,40,0.5)",
                    border: `1px solid ${i === 0 ? c.greenBd : c.border}`,
                  }}>
                    <span style={{ fontSize: 12, color: c.text2 }}>{sub.label}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16, fontFamily: f.mono, fontWeight: 800, color: i === 0 ? c.green : c.text1 }}>
                        {fmtPrice(sub.price)}
                      </span>
                      <button
                        onClick={() => handleCheckout("A", sub.headcount)}
                        disabled={!!checkoutLoading}
                        style={{
                          fontSize: 9, fontFamily: f.mono, fontWeight: 700, padding: "5px 10px", borderRadius: 5,
                          background: c.green, color: c.bg, border: "none", cursor: checkoutLoading ? "wait" : "pointer",
                          letterSpacing: ".04em", textTransform: "uppercase", opacity: checkoutLoading ? 0.6 : 1,
                        }}
                      >
                        {checkoutLoading?.startsWith("A_") ? "..." : t("pricing.buy")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: 13, color: c.text2, lineHeight: 1.6, marginBottom: 14 }}>{tiers[0].desc}</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 14, flex: 1 }}>
                {tiers[0].features.map((feat) => (
                  <div key={feat} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: c.text2, lineHeight: 1.4 }}>
                    <CheckCircle size={14} color={c.green} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 2 }} />
                    {feat}
                  </div>
                ))}
              </div>

              <div style={{ ...inset, padding: "8px 10px", background: c.greenBg, borderColor: c.greenBd }}>
                <p style={{ fontSize: 11, fontFamily: f.mono, color: c.green, letterSpacing: ".04em", textAlign: "center" }}>
                  {tiers[0].roi}
                </p>
              </div>
            </div>

            {/* ═══ TIER 2: STABILIZE ═══ */}
            <div className="gt-card" style={{
              padding: "28px 22px", borderColor: c.accentBd, position: "relative", display: "flex", flexDirection: "column",
            }}>
              <div style={{
                position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)",
                fontSize: 9, fontFamily: f.mono, fontWeight: 700, padding: "4px 12px", borderRadius: 6,
                background: c.accent, color: "#fff", letterSpacing: ".06em", textTransform: "uppercase", whiteSpace: "nowrap",
              }}>
                {tiers[1].badge}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, marginBottom: 8 }}>
                {tiers[1].icon}
                <h3 style={{ fontSize: 17, fontWeight: 700, color: c.text1 }}>{tiers[1].name}</h3>
              </div>

              <div style={{ marginBottom: 10 }}>
                <span className="gt-metric" style={{ fontSize: 28, color: c.accentHi, letterSpacing: "-0.02em" }}>
                  {fmtPrice(stabilize)}
                </span>
                <span style={{ fontSize: 13, color: c.text3, marginLeft: 4 }}>
                  {t("pricing.tier2.priceLabel")}
                </span>
              </div>

              {/* Includes Detection badge */}
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px",
                borderRadius: 5, background: "rgba(52,211,153,0.08)", border: `1px solid ${c.greenBd}`,
                marginBottom: 14, alignSelf: "flex-start",
              }}>
                <CheckCircle size={11} color={c.green} />
                <span style={{ fontSize: 10, fontFamily: f.mono, color: c.green, fontWeight: 600 }}>
                  {t("pricing.includesDetection")}
                </span>
              </div>

              <p style={{ fontSize: 13, color: c.text2, lineHeight: 1.6, marginBottom: 18 }}>{tiers[1].desc}</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 18, flex: 1 }}>
                {tiers[1].features.map((feat) => (
                  <div key={feat} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: c.text2, lineHeight: 1.4 }}>
                    <CheckCircle size={14} color={c.green} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 2 }} />
                    {feat}
                  </div>
                ))}
              </div>

              <div style={{ ...inset, padding: "8px 10px", marginBottom: 14, background: c.greenBg, borderColor: c.greenBd }}>
                <p style={{ fontSize: 11, fontFamily: f.mono, color: c.green, letterSpacing: ".04em", textAlign: "center" }}>{tiers[1].roi}</p>
              </div>

              <button
                onClick={() => handleCheckout("B_STABILIZE")}
                disabled={!!checkoutLoading}
                className="gt-btn gt-btn-accent-ghost"
                style={{
                  width: "100%", textTransform: "uppercase", letterSpacing: ".04em",
                  cursor: checkoutLoading ? "wait" : "pointer",
                  opacity: checkoutLoading ? 0.7 : 1,
                }}
              >
                {checkoutLoading === "B_STABILIZE_" ? t("pricing.loading") : t("pricing.tier2.cta")}
              </button>
            </div>

            {/* ═══ TIER 3: MONITOR ═══ */}
            <div className="gt-card" style={{
              padding: "28px 22px", borderColor: c.accentBd, position: "relative", display: "flex", flexDirection: "column",
            }}>
              <div style={{
                position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)",
                fontSize: 9, fontFamily: f.mono, fontWeight: 700, padding: "4px 12px", borderRadius: 6,
                background: c.accent, color: "#fff", letterSpacing: ".06em", textTransform: "uppercase", whiteSpace: "nowrap",
              }}>
                {tiers[2].badge}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, marginBottom: 8 }}>
                {tiers[2].icon}
                <h3 style={{ fontSize: 17, fontWeight: 700, color: c.text1 }}>{tiers[2].name}</h3>
              </div>

              {/* Billing toggle */}
              <div style={{ display: "flex", gap: 2, padding: 2, borderRadius: 7, background: "rgba(18,24,40,0.5)", border: `1px solid ${c.border}`, marginBottom: 12, alignSelf: "stretch" }}>
                <button
                  onClick={() => setBillingCycle("monthly")}
                  style={{
                    flex: 1, padding: "6px 0", borderRadius: 5, border: "none", fontSize: 10, fontFamily: f.mono, fontWeight: 700,
                    background: billingCycle === "monthly" ? c.accent : "transparent",
                    color: billingCycle === "monthly" ? "#fff" : c.text3,
                    cursor: "pointer", letterSpacing: ".04em",
                  }}
                >
                  {t("pricing.monthly")}
                </button>
                <button
                  onClick={() => setBillingCycle("annual")}
                  style={{
                    flex: 1, padding: "6px 0", borderRadius: 5, border: "none", fontSize: 10, fontFamily: f.mono, fontWeight: 700,
                    background: billingCycle === "annual" ? c.green : "transparent",
                    color: billingCycle === "annual" ? c.bg : c.text3,
                    cursor: "pointer", letterSpacing: ".04em",
                  }}
                >
                  {t("pricing.annual")}{" "}
                  <span style={{ fontSize: 8, opacity: 0.8 }}>-17%</span>
                </button>
              </div>

              <div style={{ marginBottom: 10 }}>
                {billingCycle === "monthly" ? (
                  <>
                    <span className="gt-metric" style={{ fontSize: 28, color: c.accentHi, letterSpacing: "-0.02em" }}>
                      {fmtPrice(monitorMonthly)}
                    </span>
                    <span style={{ fontSize: 13, color: c.text3, marginLeft: 4 }}>/mo</span>
                  </>
                ) : (
                  <>
                    <span className="gt-metric" style={{ fontSize: 28, color: c.green, letterSpacing: "-0.02em" }}>
                      {fmtPrice(monitorAnnualMonthly)}
                    </span>
                    <span style={{ fontSize: 13, color: c.text3, marginLeft: 4 }}>/mo</span>
                    <div style={{ fontSize: 11, color: c.green, fontFamily: f.mono, marginTop: 2 }}>
                      {fmtPrice(monitorAnnual)}/yr — {t("pricing.save17")}
                    </div>
                  </>
                )}
              </div>

              <p style={{ fontSize: 13, color: c.text2, lineHeight: 1.6, marginBottom: 18 }}>{tiers[2].desc}</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 18, flex: 1 }}>
                {tiers[2].features.map((feat) => (
                  <div key={feat} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: c.text2, lineHeight: 1.4 }}>
                    <CheckCircle size={14} color={c.green} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 2 }} />
                    {feat}
                  </div>
                ))}
              </div>

              <div style={{ ...inset, padding: "8px 10px", marginBottom: 14, background: c.greenBg, borderColor: c.greenBd }}>
                <p style={{ fontSize: 11, fontFamily: f.mono, color: c.green, letterSpacing: ".04em", textAlign: "center" }}>{tiers[2].roi}</p>
              </div>

              <a href={`/contact?plan=monitoring&billing=${billingCycle}`} className="gt-btn gt-btn-accent-ghost" style={{
                width: "100%", textAlign: "center", textTransform: "uppercase", letterSpacing: ".04em", textDecoration: "none",
              }}>
                {t("pricing.tier3.cta")}
              </a>
            </div>
          </div>

          {checkoutError && (
            <p style={{ fontSize: 13, color: c.red, textAlign: "center", marginTop: 12 }}>
              {t("pricing.error")}
            </p>
          )}
        </Section>

        {/* Enterprise CTA */}
        <Section style={{ paddingTop: 32, paddingBottom: 0 }}>
          <div className="gt-panel" style={{ padding: "24px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div>
              <p style={{ fontSize: 9, fontFamily: f.mono, color: c.text3, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 4 }}>
                {t("pricing.tier4.badge")}
              </p>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{t("pricing.tier4.name")}</h3>
              <p style={{ fontSize: 13, color: c.text2 }}>
                {t("pricing.tier4.desc")}{" "}
                <span style={{ fontFamily: f.mono, color: c.text3 }}>
                  {t("pricing.from")} {fmtPrice(missionFrom)}
                </span>
              </p>
            </div>
            <a href="mailto:audits@ghost-tax.com" className="gt-btn gt-btn-ghost" style={{ textDecoration: "none", whiteSpace: "nowrap" }}>
              {t("pricing.tier4.cta")}
            </a>
          </div>
        </Section>

        {/* Value proposition note */}
        <Section style={{ paddingTop: 32, paddingBottom: 0 }}>
          <div style={{ ...inset, padding: "16px 20px", textAlign: "center", maxWidth: 640, margin: "0 auto", borderRadius: 10 }}>
            <p style={{ fontSize: 13, color: c.text2, lineHeight: 1.6 }}>
              {t("pricing.valueNote")}
            </p>
          </div>
        </Section>

        {/* Comparison table */}
        <Section style={{ paddingTop: 60, paddingBottom: 0 }}>
          <div className="gt-panel" style={{ padding: "32px 28px", overflowX: "auto" }}>
            <p className="gt-section-label">{t("pricing.compare.label")}</p>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid " + c.border }}>
                  <th style={{ textAlign: "left", padding: "12px 8px", color: c.text3, fontFamily: f.mono, fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 600 }}>{t("pricing.compare.feature")}</th>
                  <th style={{ textAlign: "center", padding: "12px 8px", color: c.green, fontFamily: f.mono, fontSize: 10, letterSpacing: ".08em", fontWeight: 600 }}>{t("pricing.compare.detection")}</th>
                  <th style={{ textAlign: "center", padding: "12px 8px", color: c.accentHi, fontFamily: f.mono, fontSize: 10, letterSpacing: ".08em", fontWeight: 600 }}>{t("pricing.compare.stabilization")}</th>
                  <th style={{ textAlign: "center", padding: "12px 8px", color: c.accentHi, fontFamily: f.mono, fontSize: 10, letterSpacing: ".08em", fontWeight: 600 }}>{t("pricing.compare.monitoring")}</th>
                  <th style={{ textAlign: "center", padding: "12px 8px", color: c.text3, fontFamily: f.mono, fontSize: 10, letterSpacing: ".08em", fontWeight: 600 }}>{t("pricing.compare.mission")}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: t("pricing.compare.r1"), vals: ["\u2713", "\u2713", "\u2713", "\u2713"] },
                  { feature: t("pricing.compare.r2"), vals: ["\u2713", "\u2713", "\u2713", "\u2713"] },
                  { feature: t("pricing.compare.r3"), vals: ["\u2014", "\u2713", "\u2713", "\u2713"] },
                  { feature: t("pricing.compare.r4"), vals: ["\u2014", "\u2713", "\u2014", "\u2713"] },
                  { feature: t("pricing.compare.r5"), vals: ["\u2014", "\u2014", "\u2713", "\u2713"] },
                  { feature: t("pricing.compare.r6"), vals: ["\u2014", "\u2014", "\u2014", "\u2713"] },
                  { feature: t("pricing.compare.r7"), vals: ["48h", "5 days", t("pricing.compare.monthly"), t("pricing.compare.custom")] },
                ].map((row) => (
                  <tr key={row.feature} style={{ borderBottom: "1px solid " + c.border }}>
                    <td style={{ padding: "12px 8px", color: c.text2 }}>{row.feature}</td>
                    {row.vals.map((v, i) => (
                      <td key={i} style={{ textAlign: "center", padding: "12px 8px", color: v === "\u2713" ? c.green : v === "\u2014" ? c.text3 : c.text2, fontFamily: f.mono, fontSize: 12 }}>
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* FAQ */}
        <Section style={{ paddingTop: 80, paddingBottom: 0 }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <p className="gt-section-label" style={{ textAlign: "center" }}>{t("pricing.faq.label")}</p>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 700, marginBottom: 28, textAlign: "center", letterSpacing: "-0.02em" }}>
              {t("pricing.faq.title")}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {faqs.map((faq, idx) => (
                <FaqItem
                  key={idx}
                  q={faq.q}
                  a={faq.a}
                  isOpen={openFaq === idx}
                  onClick={() => { setOpenFaq(openFaq === idx ? null : idx); }}
                />
              ))}
            </div>
          </div>
        </Section>

        {/* CTA */}
        <Section style={{ paddingTop: 80, paddingBottom: 0 }}>
          <div className="gt-panel" style={{ padding: "48px 40px", textAlign: "center" }}>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 32px)", fontWeight: 800, marginBottom: 12, letterSpacing: "-0.02em" }}>
              {t("pricing.cta.title")}
            </h2>
            <p style={{ fontSize: 16, color: c.text2, maxWidth: 480, margin: "0 auto 28px", lineHeight: 1.6 }}>
              {t("pricing.cta.sub")}
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
              <a href="/intel" className="gt-btn gt-btn-primary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
                {t("pricing.cta.primary")} <ArrowRight size={16} />
              </a>
              <a href="/contact" className="gt-btn gt-btn-ghost" style={{ textDecoration: "none" }}>
                {t("pricing.cta.secondary")}
              </a>
            </div>
          </div>
        </Section>

      </div>

      <Footer />

      {/* Mobile grid override */}
      <style>{`
        @media (max-width: 900px) {
          .gt-container > section > div[style*="grid-template-columns: repeat(3"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
