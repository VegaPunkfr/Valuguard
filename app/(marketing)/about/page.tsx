"use client";

import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { c, f } from "@/lib/tokens";
import Section from "@/components/ui/section";
import Footer from "@/components/ui/footer";

export default function AboutPage() {
  const { t } = useI18n();

  return (
    <div style={{ minHeight: "100vh", background: c.bg, color: c.text1 }}>
      <div className="gt-container" style={{ maxWidth: 860, padding: "0 24px" }}>

        {/* Hero */}
        <Section style={{ textAlign: "center", paddingTop: 80, paddingBottom: 20 }}>
          <p className="gt-section-label">
            {t("about.label")}
          </p>
          <h1 style={{ fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.035em", marginBottom: 20 }}>
            {t("about.title")}
          </h1>
          <p style={{ fontSize: 18, color: c.text2, maxWidth: 600, margin: "0 auto", lineHeight: 1.7 }}>
            {t("about.sub")}
          </p>
        </Section>

        {/* Mission */}
        <Section style={{ paddingTop: 60, paddingBottom: 0 }}>
          <div className="gt-panel" style={{ padding: "40px 36px" }}>
            <p className="gt-section-label">
              {t("about.mission.label")}
            </p>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, letterSpacing: "-0.02em" }}>
              {t("about.mission.title")}
            </h2>
            <p style={{ fontSize: 16, color: c.text2, lineHeight: 1.8, marginBottom: 20 }}>
              {t("about.mission.p1")}
            </p>
            <p style={{ fontSize: 16, color: c.text2, lineHeight: 1.8 }}>
              {t("about.mission.p2")}
            </p>
          </div>
        </Section>

        {/* What we believe */}
        <Section style={{ paddingTop: 40, paddingBottom: 0 }}>
          <div className="gt-panel" style={{ padding: "40px 36px" }}>
            <p className="gt-section-label">
              {t("about.beliefs.label")}
            </p>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, letterSpacing: "-0.02em" }}>
              {t("about.beliefs.title")}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { title: t("about.belief1.title"), desc: t("about.belief1.desc") },
                { title: t("about.belief2.title"), desc: t("about.belief2.desc") },
                { title: t("about.belief3.title"), desc: t("about.belief3.desc") },
                { title: t("about.belief4.title"), desc: t("about.belief4.desc") },
              ].map(function (b) {
                return (
                  <div key={b.title} style={{ padding: "18px 20px", borderRadius: 10, background: "rgba(0,0,0,0.20)", border: "1px solid " + c.border }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: c.text1, marginBottom: 4 }}>{b.title}</p>
                    <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.6 }}>{b.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </Section>

        {/* Facts */}
        <Section style={{ paddingTop: 40, paddingBottom: 0 }}>
          <div className="gt-about-facts-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {[
              { value: "2026", label: t("about.fact1.label") },
              { value: "48h", label: t("about.fact2.label") },
              { value: "21", label: t("about.fact3.label") },
            ].map(function (fact) {
              return (
                <div key={fact.label} className="gt-panel" style={{ padding: "28px 20px", textAlign: "center" }}>
                  <p className="gt-metric" style={{ fontSize: 32, color: c.green, marginBottom: 6 }}>{fact.value}</p>
                  <p style={{ fontSize: 13, color: c.text3 }}>{fact.label}</p>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Contact */}
        <Section style={{ paddingTop: 60, paddingBottom: 0 }}>
          <div className="gt-panel" style={{ padding: "40px 36px", textAlign: "center" }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, letterSpacing: "-0.02em" }}>
              {t("about.contact.title")}
            </h2>
            <p style={{ fontSize: 16, color: c.text2, maxWidth: 480, margin: "0 auto 24px", lineHeight: 1.6 }}>
              {t("about.contact.sub")}
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
              <a href="/contact" className="gt-btn gt-btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                {t("about.contact.cta")} <ArrowRight size={16} />
              </a>
              <a href="mailto:audits@ghost-tax.com" className="gt-btn gt-btn-ghost" style={{ fontFamily: f.mono }}>
                audits@ghost-tax.com
              </a>
            </div>
          </div>
        </Section>

      </div>

      <Footer />

      <style>{`
        @media (max-width: 768px) {
          .gt-about-facts-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
