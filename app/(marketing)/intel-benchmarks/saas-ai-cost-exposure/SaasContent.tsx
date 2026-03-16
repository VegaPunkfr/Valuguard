"use client";

import { useI18n } from "@/lib/i18n";
import { c, f } from "@/lib/tokens";

const BENCHMARKS = [
  { key: "ind1", median: 1800, topQ: 900 },
  { key: "ind2", median: 2200, topQ: 1100 },
  { key: "ind3", median: 1600, topQ: 800 },
  { key: "ind4", median: 1400, topQ: 700 },
  { key: "ind5", median: 1200, topQ: 600 },
  { key: "ind6", median: 1900, topQ: 950 },
  { key: "ind7", median: 1500, topQ: 750 },
];

const FINDING_KEYS = ["ib.saas.finding1", "ib.saas.finding2", "ib.saas.finding3", "ib.saas.finding4", "ib.saas.finding5"];

const FAQ_KEYS = [1, 2, 3, 4, 5];

export default function SaasContent() {
  const { t } = useI18n();

  return (
    <div style={{ minHeight: "100vh", background: c.bg, fontFamily: f.sans, color: c.text1, padding: "0 14px 64px" }}>
      <div className="gt-container-md" style={{ margin: "0 auto" }}>
        <div style={{ paddingTop: 16 }}>
          <a href="/" className="gt-btn gt-btn-ghost" style={{ fontSize: 11, padding: "6px 12px" }}>{t("ib.back")}</a>
        </div>

        <header style={{ padding: "36px 0 32px" }}>
          <p className="gt-section-label" style={{ marginBottom: 10 }}>{t("ib.saas.label")}</p>
          <h1 style={{ fontSize: "clamp(22px, 3.5vw, 34px)", fontWeight: 800, lineHeight: 1.15, letterSpacing: "-.02em", marginBottom: 12 }}>
            {t("ib.saas.title")}
          </h1>
          <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.6, maxWidth: 620 }}>
            {t("ib.saas.subtitle")}
          </p>
        </header>

        {/* Benchmark table */}
        <section className="gt-panel" style={{ marginBottom: 32, padding: 22 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: c.text1, marginBottom: 14 }}>{t("ib.saas.tableTitle")}</h2>
          <div className="gt-label" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr", gap: 8, padding: "8px 12px" }}>
            <span>{t("ib.saas.colIndustry")}</span>
            <span style={{ textAlign: "right" }}>{t("ib.saas.colMedian")}</span>
            <span style={{ textAlign: "right" }}>{t("ib.saas.colTopQ")}</span>
            <span style={{ textAlign: "right" }}>{t("ib.saas.colGap")}</span>
          </div>
          {BENCHMARKS.map((b) => (
            <div key={b.key} className="gt-card" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr", gap: 8, padding: "10px 12px", borderRadius: 6, marginTop: 4, fontSize: 12 }}>
              <span style={{ color: c.text1, fontWeight: 600 }}>{t(`ib.saas.${b.key}`)}</span>
              <span style={{ fontFamily: f.mono, color: c.amber, textAlign: "right" }}>{b.median.toLocaleString()} &euro;</span>
              <span style={{ fontFamily: f.mono, color: c.green, textAlign: "right" }}>{b.topQ.toLocaleString()} &euro;</span>
              <span style={{ fontFamily: f.mono, color: c.red, textAlign: "right" }}>{(b.median - b.topQ).toLocaleString()} &euro;</span>
            </div>
          ))}
          <p style={{ fontSize: 10, color: c.text3, marginTop: 12, lineHeight: 1.5 }}>
            {t("ib.saas.tableNote")}
          </p>
        </section>

        {/* Key findings */}
        <section className="gt-panel" style={{ marginBottom: 32, padding: 22 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: c.text1, marginBottom: 12 }}>{t("ib.saas.findingsTitle")}</h2>
          {FINDING_KEYS.map((key) => (
            <p key={key} style={{ fontSize: 12, color: c.text2, lineHeight: 1.6, marginBottom: 8, paddingLeft: 14, borderLeft: `2px solid ${c.accentBd}` }}>{t(key)}</p>
          ))}
        </section>

        {/* FAQ */}
        <section className="gt-panel" style={{ marginBottom: 32, padding: 22 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: c.text1, marginBottom: 14 }}>{t("ib.saas.faqTitle")}</h2>
          {FAQ_KEYS.map((i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: c.text1, marginBottom: 4 }}>{t(`ib.saas.faq${i}.q`)}</h3>
              <p style={{ fontSize: 12, color: c.text2, lineHeight: 1.6 }}>{t(`ib.saas.faq${i}.a`)}</p>
            </div>
          ))}
        </section>

        {/* Related intelligence */}
        <section className="gt-card" style={{ marginBottom: 32, padding: "16px 20px", borderRadius: 8 }}>
          <p className="gt-label" style={{ marginBottom: 10 }}>{t("ib.saas.relatedLabel")}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <a href="/intel-benchmarks/shadow-ai-governance" style={{ fontSize: 12, color: c.accentHi, textDecoration: "none" }}>{t("ib.surface2.title")} &rarr;</a>
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
          <p style={{ fontSize: 14, fontWeight: 700, color: c.text1, marginBottom: 8 }}>{t("ib.saas.ctaTitle")}</p>
          <p style={{ fontSize: 12, color: c.text2, marginBottom: 16 }}>{t("ib.saas.ctaDesc")}</p>
          <a href="/intel" className="gt-btn gt-btn-primary" style={{ padding: "12px 28px", fontSize: 12, letterSpacing: ".05em" }}>
            {t("ib.saas.ctaButton")}
          </a>
          <p style={{ fontSize: 10, color: c.text3, marginTop: 8 }}>{t("ib.saas.ctaNote")}</p>
        </section>
      </div>
    </div>
  );
}
