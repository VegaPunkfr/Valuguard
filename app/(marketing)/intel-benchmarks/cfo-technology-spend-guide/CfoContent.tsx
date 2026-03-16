"use client";

import { useI18n } from "@/lib/i18n";
import { c, f } from "@/lib/tokens";

const GAP_KEYS = [1, 2, 3];
const CAT_KEYS = [1, 2, 3, 4, 5];
const DET_KEYS = [1, 2, 3, 4];
const FAQ_KEYS = [1, 2, 3, 4, 5];

export default function CfoContent() {
  const { t } = useI18n();

  return (
    <div style={{ minHeight: "100vh", background: c.bg, fontFamily: f.sans, color: c.text1, padding: "0 14px 64px" }}>
      <div className="gt-container-md" style={{ margin: "0 auto" }}>
        <div style={{ paddingTop: 16 }}>
          <a href="/" className="gt-btn gt-btn-ghost" style={{ fontSize: 11, padding: "6px 12px" }}>{t("ib.back")}</a>
        </div>

        <header style={{ padding: "36px 0 32px" }}>
          <p className="gt-section-label" style={{ marginBottom: 10 }}>{t("ib.cfo.label")}</p>
          <h1 style={{ fontSize: "clamp(22px, 3.5vw, 34px)", fontWeight: 800, lineHeight: 1.15, letterSpacing: "-.02em", marginBottom: 12 }}>
            {t("ib.cfo.title")}
          </h1>
          <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.6, maxWidth: 620 }}>
            {t("ib.cfo.subtitle")}
          </p>
        </header>

        {/* The problem */}
        <section className="gt-panel" style={{ marginBottom: 32, padding: 22 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: c.text1, marginBottom: 12 }}>{t("ib.cfo.gapTitle")}</h2>
          <p style={{ fontSize: 12, color: c.text2, lineHeight: 1.6, marginBottom: 12 }}>
            {t("ib.cfo.gapIntro")}
          </p>
          {GAP_KEYS.map((i) => (
            <div key={i} className="gt-card" style={{ padding: "10px 14px", borderRadius: 6, marginBottom: 6 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: c.text1, marginBottom: 3 }}>{t(`ib.cfo.gap${i}.title`)}</p>
              <p style={{ fontSize: 11, color: c.text2, lineHeight: 1.5 }}>{t(`ib.cfo.gap${i}.desc`)}</p>
            </div>
          ))}
        </section>

        {/* Exposure categories */}
        <section className="gt-panel" style={{ marginBottom: 32, padding: 22 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: c.text1, marginBottom: 14 }}>{t("ib.cfo.catTitle")}</h2>
          {CAT_KEYS.map((i) => (
            <div key={i} className="gt-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 14px", borderRadius: 6, marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: c.text1, marginBottom: 3 }}>{t(`ib.cfo.cat${i}.name`)}</p>
                <p style={{ fontSize: 11, color: c.text2, lineHeight: 1.5 }}>{t(`ib.cfo.cat${i}.desc`)}</p>
              </div>
              <span style={{ fontFamily: f.mono, fontSize: 11, fontWeight: 700, color: c.amber, flexShrink: 0, marginLeft: 12 }}>{t(`ib.cfo.cat${i}.pct`)} {t("ib.cfo.catWasteSuffix")}</span>
            </div>
          ))}
        </section>

        {/* Detection approaches */}
        <section className="gt-panel" style={{ marginBottom: 32, padding: 22 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: c.text1, marginBottom: 12 }}>{t("ib.cfo.detTitle")}</h2>
          <p style={{ fontSize: 12, color: c.text2, lineHeight: 1.6, marginBottom: 14 }}>
            {t("ib.cfo.detIntro")}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {DET_KEYS.map((i) => (
              <div key={i} className="gt-card" style={{ padding: "12px 14px", borderRadius: 8 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: c.text1, marginBottom: 4 }}>{t(`ib.cfo.det${i}.approach`)}</p>
                <p style={{ fontSize: 10, fontFamily: f.mono, color: c.accentHi, marginBottom: 4 }}>{t("ib.cfo.detTimeLabel")} {t(`ib.cfo.det${i}.time`)} | {t("ib.cfo.detAccessLabel")} {t(`ib.cfo.det${i}.access`)}</p>
                <p style={{ fontSize: 11, color: c.text2, lineHeight: 1.4 }}>{t(`ib.cfo.det${i}.output`)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="gt-panel" style={{ marginBottom: 32, padding: 22 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: c.text1, marginBottom: 14 }}>{t("ib.cfo.faqTitle")}</h2>
          {FAQ_KEYS.map((i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: c.text1, marginBottom: 4 }}>{t(`ib.cfo.faq${i}.q`)}</h3>
              <p style={{ fontSize: 12, color: c.text2, lineHeight: 1.6 }}>{t(`ib.cfo.faq${i}.a`)}</p>
            </div>
          ))}
        </section>

        {/* Related intelligence */}
        <section className="gt-card" style={{ marginBottom: 32, padding: "16px 20px", borderRadius: 8 }}>
          <p className="gt-label" style={{ marginBottom: 10 }}>{t("ib.cfo.relatedLabel")}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <a href="/intel-benchmarks/saas-ai-cost-exposure" style={{ fontSize: 12, color: c.accentHi, textDecoration: "none" }}>{t("ib.surface1.title")} &rarr;</a>
            <a href="/intel-benchmarks/shadow-ai-governance" style={{ fontSize: 12, color: c.accentHi, textDecoration: "none" }}>{t("ib.surface2.title")} &rarr;</a>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12, paddingTop: 10, borderTop: `1px solid ${c.border}` }}>
            <a href="/methodology" style={{ fontSize: 11, color: c.text3, textDecoration: "none" }}>{t("ib.relatedMethodology")} &rarr;</a>
            <a href="/security-vault" style={{ fontSize: 11, color: c.text3, textDecoration: "none" }}>{t("ib.relatedSecurity")} &rarr;</a>
            <a href="/procurement" style={{ fontSize: 11, color: c.text3, textDecoration: "none" }}>{t("ib.relatedProcurement")} &rarr;</a>
          </div>
        </section>

        {/* CTA */}
        <section style={{ textAlign: "center", padding: "24px 0" }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: c.text1, marginBottom: 8 }}>{t("ib.cfo.ctaTitle")}</p>
          <p style={{ fontSize: 12, color: c.text2, marginBottom: 16 }}>{t("ib.cfo.ctaDesc")}</p>
          <a href="/intel" className="gt-btn gt-btn-primary" style={{ padding: "12px 28px", fontSize: 12, letterSpacing: ".05em" }}>
            {t("ib.cfo.ctaButton")}
          </a>
        </section>
      </div>
    </div>
  );
}
