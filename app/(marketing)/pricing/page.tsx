"use client";

import { useState, useCallback } from "react";
import { CheckCircle, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { c, f, panel, inset, sectionLabel } from "@/lib/tokens";
import Section from "@/components/ui/section";
import Footer from "@/components/ui/footer";
import FaqItem from "@/components/ui/faq-item";

export default function PricingPage() {
  const { t, locale } = useI18n();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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

  const tiers = [
    {
      name: t("pricing.tier1.name"),
      badge: t("pricing.tier1.badge"),
      price: "490",
      priceLabel: t("pricing.tier1.priceLabel"),
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
      cta: checkoutLoading ? t("pricing.loading") : t("pricing.tier1.cta"),
      onClick: handleRailACheckout,
      highlight: true,
      badgeColor: c.green,
      borderColor: c.greenBd,
    },
    {
      name: t("pricing.tier2.name"),
      badge: t("pricing.tier2.badge"),
      price: "2,500",
      priceLabel: t("pricing.tier2.priceLabel"),
      desc: t("pricing.tier2.desc"),
      features: [
        t("pricing.tier2.f1"),
        t("pricing.tier2.f2"),
        t("pricing.tier2.f3"),
        t("pricing.tier2.f4"),
        t("pricing.tier2.f5"),
      ],
      roi: t("pricing.tier2.roi"),
      cta: t("pricing.tier2.cta"),
      href: "/contact?plan=stabilization",
      highlight: false,
      badgeColor: c.accentHi,
      borderColor: c.accentBd,
    },
    {
      name: t("pricing.tier3.name"),
      badge: t("pricing.tier3.badge"),
      price: "2,000",
      priceLabel: t("pricing.tier3.priceLabel"),
      desc: t("pricing.tier3.desc"),
      features: [
        t("pricing.tier3.f1"),
        t("pricing.tier3.f2"),
        t("pricing.tier3.f3"),
        t("pricing.tier3.f4"),
        t("pricing.tier3.f5"),
      ],
      roi: t("pricing.tier3.roi"),
      cta: t("pricing.tier3.cta"),
      href: "/contact?plan=monitoring",
      highlight: false,
      badgeColor: c.accentHi,
      borderColor: c.accentBd,
    },
    {
      name: t("pricing.tier4.name"),
      badge: t("pricing.tier4.badge"),
      price: t("pricing.tier4.price"),
      priceLabel: "",
      desc: t("pricing.tier4.desc"),
      features: [
        t("pricing.tier4.f1"),
        t("pricing.tier4.f2"),
        t("pricing.tier4.f3"),
        t("pricing.tier4.f4"),
      ],
      roi: t("pricing.tier4.roi"),
      cta: t("pricing.tier4.cta"),
      href: "mailto:audits@ghost-tax.com",
      highlight: false,
      badgeColor: c.text3,
      borderColor: c.border,
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
        </Section>

        {/* Pricing cards */}
        <Section style={{ paddingTop: 40, paddingBottom: 0 }}>
          <div className="vg-pricing-page-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {tiers.map(function (tier, idx) {
              return (
                <div
                  key={tier.name}
                  className="gt-card"
                  style={{
                    padding: "28px 22px",
                    borderColor: tier.borderColor,
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div style={{
                    position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)",
                    fontSize: 9, fontFamily: f.mono, fontWeight: 700, padding: "4px 12px",
                    borderRadius: 6,
                    background: tier.highlight ? c.green : idx === 3 ? c.raised : c.accent,
                    color: tier.highlight ? c.bg : idx === 3 ? c.text2 : "#fff",
                    letterSpacing: ".06em", textTransform: "uppercase", whiteSpace: "nowrap",
                  }}>
                    {tier.badge}
                  </div>

                  <h3 style={{ fontSize: 17, fontWeight: 700, color: c.text1, marginBottom: 8, marginTop: 6 }}>{tier.name}</h3>

                  <div style={{ marginBottom: 10 }}>
                    <span className="gt-metric" style={{
                      fontSize: idx === 3 ? 16 : 28,
                      color: tier.highlight ? c.green : c.accentHi,
                      letterSpacing: idx === 3 ? ".02em" : "-0.02em",
                    }}>
                      {idx !== 3 ? "\u20AC" : ""}{tier.price}
                    </span>
                    {tier.priceLabel && <span style={{ fontSize: 13, color: c.text3, marginLeft: 4 }}>{tier.priceLabel}</span>}
                  </div>

                  <p style={{ fontSize: 13, color: c.text2, lineHeight: 1.6, marginBottom: 18 }}>{tier.desc}</p>

                  <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 18, flex: 1 }}>
                    {tier.features.map(function (feat) {
                      return (
                        <div key={feat} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: c.text2, lineHeight: 1.4 }}>
                          <CheckCircle size={14} color={c.green} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 2 }} />
                          {feat}
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ ...inset, padding: "8px 10px", marginBottom: 14, background: c.greenBg, borderColor: c.greenBd }}>
                    <p style={{ fontSize: 11, fontFamily: f.mono, color: c.green, letterSpacing: ".04em", textAlign: "center" }}>{tier.roi}</p>
                  </div>

                  {tier.onClick ? (
                    <button
                      type="button"
                      className="gt-btn gt-btn-green"
                      onClick={tier.onClick}
                      disabled={checkoutLoading}
                      style={{
                        width: "100%", textTransform: "uppercase", letterSpacing: ".04em",
                        cursor: checkoutLoading ? "wait" : "pointer",
                        opacity: checkoutLoading ? 0.7 : 1,
                      }}
                    >
                      {tier.cta}
                    </button>
                  ) : (
                    <a href={tier.href} className="gt-btn gt-btn-accent-ghost" style={{ width: "100%", textAlign: "center", textTransform: "uppercase", letterSpacing: ".04em", textDecoration: "none" }}>
                      {tier.cta}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
          {checkoutError && (
            <p style={{ fontSize: 13, color: c.red, textAlign: "center", marginTop: 12 }}>
              {t("pricing.error")}
            </p>
          )}
        </Section>

        {/* Comparison table */}
        <Section style={{ paddingTop: 80, paddingBottom: 0 }}>
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
                ].map(function (row) {
                  return (
                    <tr key={row.feature} style={{ borderBottom: "1px solid " + c.border }}>
                      <td style={{ padding: "12px 8px", color: c.text2 }}>{row.feature}</td>
                      {row.vals.map(function (v, i) {
                        return (
                          <td key={i} style={{ textAlign: "center", padding: "12px 8px", color: v === "\u2713" ? c.green : v === "\u2014" ? c.text3 : c.text2, fontFamily: f.mono, fontSize: 12 }}>
                            {v}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
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
              {faqs.map(function (faq, idx) {
                return (
                  <FaqItem
                    key={idx}
                    q={faq.q}
                    a={faq.a}
                    isOpen={openFaq === idx}
                    onClick={function () { setOpenFaq(openFaq === idx ? null : idx); }}
                  />
                );
              })}
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
    </div>
  );
}
