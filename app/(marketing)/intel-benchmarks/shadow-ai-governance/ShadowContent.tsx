"use client";

import { useI18n } from "@/lib/i18n";
import { c, f } from "@/lib/tokens";

const PATTERN_KEYS = [1, 2, 3, 4];
const GOV_KEYS = [1, 2, 3, 4];
const FAQ_KEYS = [1, 2, 3, 4];

export default function ShadowContent() {
  const { t } = useI18n();

  return (
    <div style={{ minHeight: "100vh", background: c.bg, fontFamily: f.sans, color: c.text1, padding: "0 14px 64px" }}>
      <div className="gt-container-md" style={{ margin: "0 auto" }}>
        <div style={{ paddingTop: 16 }}>
          <a href="/" className="gt-btn gt-btn-ghost" style={{ fontSize: 11, padding: "6px 12px" }}>{t("ib.back")}</a>
        </div>

        <header style={{ padding: "36px 0 32px" }}>
          <p className="gt-section-label" style={{ marginBottom: 10 }}>{t("ib.shadow.label")}</p>
          <h1 style={{ fontSize: "clamp(22px, 3.5vw, 34px)", fontWeight: 800, lineHeight: 1.15, letterSpacing: "-.02em", marginBottom: 12 }}>
            {t("ib.shadow.title")}
          </h1>
          <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.6, maxWidth: 620 }}>
            {t("ib.shadow.subtitle")}
          </p>
        </header>

        {/* Detection patterns */}
        <section className="gt-panel" style={{ marginBottom: 32, padding: 22 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: c.text1, marginBottom: 14 }}>{t("ib.shadow.patternsTitle")}</h2>
          {PATTERN_KEYS.map((i) => (
            <div key={i} className="gt-card" style={{ padding: "14px 16px", borderRadius: 8, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: c.text1 }}>{t(`ib.shadow.pat${i}.name`)}</h3>
                <span className="gt-badge gt-badge--amber" style={{ flexShrink: 0 }}>{t(`ib.shadow.pat${i}.impact`)}</span>
              </div>
              <p style={{ fontSize: 11, color: c.text2, lineHeight: 1.5, marginBottom: 6 }}>{t(`ib.shadow.pat${i}.desc`)}</p>
              <p style={{ fontSize: 10, color: c.text3, lineHeight: 1.4 }}>
                <strong style={{ color: c.accentHi }}>{t("ib.shadow.detectionLabel")}</strong> {t(`ib.shadow.pat${i}.detect`)}
                {" "}<strong style={{ color: c.text3 }}>|</strong>{" "}
                <strong style={{ color: c.text3 }}>{t("ib.shadow.frequencyLabel")}</strong> {t(`ib.shadow.pat${i}.freq`)}
              </p>
            </div>
          ))}
        </section>

        {/* Governance framework */}
        <section className="gt-panel" style={{ marginBottom: 32, padding: 22 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: c.text1, marginBottom: 12 }}>{t("ib.shadow.govTitle")}</h2>
          {GOV_KEYS.map((i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: `1px solid ${c.border}` }}>
              <span style={{ fontFamily: f.mono, fontSize: 18, fontWeight: 800, color: c.accentBd, flexShrink: 0 }}>{i}</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: c.text1, marginBottom: 3 }}>{t(`ib.shadow.gov${i}.title`)}</p>
                <p style={{ fontSize: 11, color: c.text2, lineHeight: 1.5 }}>{t(`ib.shadow.gov${i}.desc`)}</p>
              </div>
            </div>
          ))}
        </section>

        {/* FAQ */}
        <section className="gt-panel" style={{ marginBottom: 32, padding: 22 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: c.text1, marginBottom: 14 }}>{t("ib.shadow.faqTitle")}</h2>
          {FAQ_KEYS.map((i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: c.text1, marginBottom: 4 }}>{t(`ib.shadow.faq${i}.q`)}</h3>
              <p style={{ fontSize: 12, color: c.text2, lineHeight: 1.6 }}>{t(`ib.shadow.faq${i}.a`)}</p>
            </div>
          ))}
        </section>

        {/* Related intelligence */}
        <section className="gt-card" style={{ marginBottom: 32, padding: "16px 20px", borderRadius: 8 }}>
          <p className="gt-label" style={{ marginBottom: 10 }}>{t("ib.shadow.relatedLabel")}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <a href="/intel-benchmarks/saas-ai-cost-exposure" style={{ fontSize: 12, color: c.accentHi, textDecoration: "none" }}>{t("ib.surface1.title")} &rarr;</a>
            <a href="/intel-benchmarks/cfo-technology-spend-guide" style={{ fontSize: 12, color: c.accentHi, textDecoration: "none" }}>{t("ib.surface3.title")} &rarr;</a>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12, paddingTop: 10, borderTop: `1px solid ${c.border}` }}>
            <a href="/methodology" style={{ fontSize: 11, color: c.text3, textDecoration: "none" }}>{t("ib.relatedMethodology")} &rarr;</a>
            <a href="/security-vault" style={{ fontSize: 11, color: c.text3, textDecoration: "none" }}>{t("ib.relatedSecurity")} &rarr;</a>
            <a href="/procurement" style={{ fontSize: 11, color: c.text3, textDecoration: "none" }}>{t("ib.relatedProcurement")} &rarr;</a>
          </div>
        </section>

        {/* CTA */}
        <section style={{ textAlign: "center", padding: "24px 0" }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: c.text1, marginBottom: 8 }}>{t("ib.shadow.ctaTitle")}</p>
          <p style={{ fontSize: 12, color: c.text2, marginBottom: 16 }}>{t("ib.shadow.ctaDesc")}</p>
          <a href="/intel" className="gt-btn gt-btn-primary" style={{ padding: "12px 28px", fontSize: 12, letterSpacing: ".05em" }}>
            {t("ib.shadow.ctaButton")}
          </a>
        </section>
      </div>
    </div>
  );
}
