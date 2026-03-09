"use client";

import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { c, f, panel, inset, sectionLabel } from "@/lib/tokens";
import Section from "@/components/ui/section";
import Footer from "@/components/ui/footer";

export default function PlatformPage() {
  const { t } = useI18n();

  const modules = [
    { num: "01", title: t("platform.mod1.title"), desc: t("platform.mod1.desc"), color: c.red },
    { num: "02", title: t("platform.mod2.title"), desc: t("platform.mod2.desc"), color: c.amber },
    { num: "03", title: t("platform.mod3.title"), desc: t("platform.mod3.desc"), color: c.accent },
    { num: "04", title: t("platform.mod4.title"), desc: t("platform.mod4.desc"), color: c.green },
    { num: "05", title: t("platform.mod5.title"), desc: t("platform.mod5.desc"), color: c.accentHi },
    { num: "06", title: t("platform.mod6.title"), desc: t("platform.mod6.desc"), color: c.green },
  ];

  const workflow = [
    { step: "01", title: t("platform.flow1.title"), desc: t("platform.flow1.desc") },
    { step: "02", title: t("platform.flow2.title"), desc: t("platform.flow2.desc") },
    { step: "03", title: t("platform.flow3.title"), desc: t("platform.flow3.desc") },
    { step: "04", title: t("platform.flow4.title"), desc: t("platform.flow4.desc") },
  ];

  const differentiators = [
    { title: t("platform.diff1.title"), desc: t("platform.diff1.desc") },
    { title: t("platform.diff2.title"), desc: t("platform.diff2.desc") },
    { title: t("platform.diff3.title"), desc: t("platform.diff3.desc") },
    { title: t("platform.diff4.title"), desc: t("platform.diff4.desc") },
  ];

  return (
    <div style={{ minHeight: "100vh", background: c.bg, color: c.text1 }}>
      <div className="gt-container">

        {/* Hero */}
        <Section style={{ textAlign: "center", paddingTop: 80, paddingBottom: 20 }}>
          <p className="gt-section-label">{t("platform.label")}</p>
          <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.035em", marginBottom: 16, maxWidth: 700, margin: "0 auto 16px" }}>
            {t("platform.title")}
          </h1>
          <p style={{ fontSize: 18, color: c.text2, maxWidth: 600, margin: "0 auto 40px", lineHeight: 1.6 }}>
            {t("platform.sub")}
          </p>
        </Section>

        {/* How it works */}
        <Section style={{ paddingTop: 40, paddingBottom: 0 }}>
          <div className="gt-panel" style={{ padding: "40px 36px" }}>
            <p className="gt-section-label">{t("platform.workflow.label")}</p>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 700, marginBottom: 28, letterSpacing: "-0.02em" }}>
              {t("platform.workflow.title")}
            </h2>

            <div className="vg-flow-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
              {workflow.map(function (item) {
                return (
                  <div key={item.step} style={{ ...inset, padding: "24px 18px", position: "relative" }}>
                    <span style={{ fontFamily: f.mono, fontSize: 36, fontWeight: 800, color: c.accentBg, position: "absolute", top: 10, right: 14 }}>
                      {item.step}
                    </span>
                    <p style={{ fontSize: 16, fontWeight: 700, color: c.text1, marginBottom: 8 }}>{item.title}</p>
                    <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.6 }}>{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </Section>

        {/* Intelligence modules */}
        <Section style={{ paddingTop: 80, paddingBottom: 0 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <p className="gt-section-label">{t("platform.modules.label")}</p>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 700, marginBottom: 10, letterSpacing: "-0.02em" }}>
              {t("platform.modules.title")}
            </h2>
            <p style={{ fontSize: 17, color: c.text2, maxWidth: 560, margin: "0 auto", lineHeight: 1.6 }}>
              {t("platform.modules.sub")}
            </p>
          </div>

          <div className="vg-modules-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {modules.map(function (mod) {
              return (
                <div key={mod.num} className="gt-card" style={{ padding: "28px 24px", position: "relative" }}>
                  <div style={{ width: 2, height: 24, background: mod.color, borderRadius: 2, marginBottom: 14, opacity: 0.6 }} />
                  <p style={{ fontSize: 10, fontFamily: f.mono, fontWeight: 700, color: mod.color, letterSpacing: ".1em", marginBottom: 8, opacity: 0.7 }}>
                    MODULE {mod.num}
                  </p>
                  <p style={{ fontSize: 17, fontWeight: 700, color: c.text1, marginBottom: 8 }}>{mod.title}</p>
                  <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.6 }}>{mod.desc}</p>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Differentiators */}
        <Section style={{ paddingTop: 80, paddingBottom: 0 }}>
          <div className="gt-panel" style={{ padding: "40px 36px" }}>
            <p className="gt-section-label">{t("platform.diff.label")}</p>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 700, marginBottom: 28, letterSpacing: "-0.02em" }}>
              {t("platform.diff.title")}
            </h2>

            <div className="vg-diff-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {differentiators.map(function (d) {
                return (
                  <div key={d.title} style={{ ...inset, padding: "20px" }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: c.text1, marginBottom: 6 }}>{d.title}</p>
                    <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.6 }}>{d.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </Section>

        {/* Security & compliance */}
        <Section style={{ paddingTop: 80, paddingBottom: 0 }}>
          <div className="gt-panel" style={{ padding: "32px 28px" }}>
            <p className="gt-section-label">{t("platform.security.label")}</p>
            <h2 style={{ fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 700, marginBottom: 20, letterSpacing: "-0.02em" }}>
              {t("platform.security.title")}
            </h2>
            <div className="vg-security-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {[
                { label: t("platform.sec1.label"), desc: t("platform.sec1.desc") },
                { label: t("platform.sec2.label"), desc: t("platform.sec2.desc") },
                { label: t("platform.sec3.label"), desc: t("platform.sec3.desc") },
                { label: t("platform.sec4.label"), desc: t("platform.sec4.desc") },
              ].map(function (item) {
                return (
                  <div key={item.label} style={{ ...inset, padding: "16px", textAlign: "center" }}>
                    <p style={{ fontSize: 12, fontFamily: f.mono, fontWeight: 700, color: c.accent, letterSpacing: ".06em", marginBottom: 6 }}>{item.label}</p>
                    <p style={{ fontSize: 13, color: c.text3, lineHeight: 1.45 }}>{item.desc}</p>
                  </div>
                );
              })}
            </div>
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <a href="/security-vault" style={{ fontSize: 13, fontFamily: f.mono, color: c.text3, textDecoration: "none" }}>
                {t("platform.security.link")} &rarr;
              </a>
            </div>
          </div>
        </Section>

        {/* CTA */}
        <Section style={{ paddingTop: 80, paddingBottom: 0 }}>
          <div className="gt-panel" style={{ padding: "48px 40px", textAlign: "center" }}>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 32px)", fontWeight: 800, marginBottom: 12, letterSpacing: "-0.02em" }}>
              {t("platform.cta.title")}
            </h2>
            <p style={{ fontSize: 16, color: c.text2, maxWidth: 480, margin: "0 auto 28px", lineHeight: 1.6 }}>
              {t("platform.cta.sub")}
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
              <a href="/intel" className="gt-btn gt-btn-primary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
                {t("platform.cta.primary")} <ArrowRight size={16} />
              </a>
              <a href="/pricing" className="gt-btn gt-btn-ghost" style={{ textDecoration: "none" }}>
                {t("platform.cta.secondary")}
              </a>
            </div>
          </div>
        </Section>

      </div>

      <Footer />

      <style>{`
        @media (max-width: 768px) {
          .vg-flow-grid { grid-template-columns: 1fr 1fr !important; }
          .vg-modules-grid { grid-template-columns: 1fr !important; }
          .vg-diff-grid { grid-template-columns: 1fr !important; }
          .vg-security-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          .vg-flow-grid { grid-template-columns: 1fr !important; }
          .vg-security-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
