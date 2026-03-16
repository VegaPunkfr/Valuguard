"use client";

import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { c, f } from "@/lib/tokens";
import Section from "@/components/ui/section";

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
                  <div key={b.title} style={{ padding: "18px 20px", borderRadius: 10, background: "#F8FAFC", border: "1px solid " + c.border }}>
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
          <div className="gt-about-facts-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            {[
              { value: "2025", label: t("about.fact1.label") },
              { value: "48h", label: t("about.fact2.label") },
              { value: "21", label: t("about.fact3.label") },
              { value: "200+", label: t("about.fact4.label") },
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

        {/* Technical Approach — CTO-facing */}
        <Section style={{ paddingTop: 40, paddingBottom: 0 }}>
          <div className="gt-panel" style={{ padding: "40px 36px" }}>
            <p className="gt-section-label">{t("about.tech.label")}</p>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16, letterSpacing: "-0.02em" }}>
              {t("about.tech.title")}
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                {
                  label: t("about.tech.i1.label"),
                  desc: t("about.tech.i1.desc"),
                },
                {
                  label: t("about.tech.i2.label"),
                  desc: t("about.tech.i2.desc"),
                },
                {
                  label: t("about.tech.i3.label"),
                  desc: t("about.tech.i3.desc"),
                },
                {
                  label: t("about.tech.i4.label"),
                  desc: t("about.tech.i4.desc"),
                },
              ].map(function (item) {
                return (
                  <div key={item.label} style={{ padding: "16px 18px", borderRadius: 10, background: "#F8FAFC", border: "1px solid " + c.border }}>
                    <p style={{ fontFamily: f.mono, fontSize: 11, fontWeight: 700, color: c.accent, letterSpacing: ".06em", marginBottom: 6 }}>
                      {item.label}
                    </p>
                    <p style={{ fontSize: 13, color: c.text2, lineHeight: 1.6 }}>{item.desc}</p>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 14, display: "flex", gap: 14, flexWrap: "wrap" }}>
              <a href="/platform" style={{ fontSize: 12, fontFamily: f.mono, color: c.text3, textDecoration: "none" }}>
                Full platform architecture &rarr;
              </a>
              <a href="/methodology" style={{ fontSize: 12, fontFamily: f.mono, color: c.text3, textDecoration: "none" }}>
                Detection methodology &rarr;
              </a>
              <a href="/security-vault" style={{ fontSize: 12, fontFamily: f.mono, color: c.text3, textDecoration: "none" }}>
                Security &amp; data handling &rarr;
              </a>
            </div>
          </div>
        </Section>

        {/* Leadership */}
        <Section style={{ paddingTop: 40, paddingBottom: 0 }}>
          <div className="gt-panel" style={{ padding: "40px 36px" }}>
            <p className="gt-section-label">
              {t("about.team.label")}
            </p>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
              {/* Avatar */}
              <div style={{ width: 72, height: 72, borderRadius: 18, background: "linear-gradient(135deg, " + c.accentBg + ", " + c.elevated + ")", border: "2px solid " + c.accentBd, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: c.accent, flexShrink: 0, letterSpacing: "-0.02em" }}>
                H
              </div>
              <div style={{ flex: 1, minWidth: 240 }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: c.text1, marginBottom: 2 }}>
                  {t("about.team.founder.name")}
                </p>
                <p style={{ fontSize: 13, fontFamily: f.mono, color: c.accent, letterSpacing: ".06em", marginBottom: 8 }}>
                  {t("about.team.founder.role")}
                </p>
                <p style={{ fontSize: 14, color: c.text3, lineHeight: 1.6, marginBottom: 12 }}>
                  {t("about.founder.background")}
                </p>
                <p style={{ fontSize: 15, color: c.text2, lineHeight: 1.7, marginBottom: 16 }}>
                  {t("about.team.founder.bio")}
                </p>
                <a
                  href="https://linkedin.com/in/edith-music"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontFamily: f.mono, color: c.linkedin, textDecoration: "none", padding: "6px 14px", borderRadius: 8, background: "hsla(210, 89%, 40%, 0.08)", border: "1px solid hsla(210, 89%, 40%, 0.20)", transition: "opacity 200ms" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  {t("about.founder.linkedin")}
                </a>
              </div>
            </div>
          </div>
        </Section>

        {/* Company */}
        <Section style={{ paddingTop: 40, paddingBottom: 0 }}>
          <div className="gt-panel" style={{ padding: "40px 36px" }}>
            <p className="gt-section-label">
              {t("about.company.label")}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: c.text1 }}>
                {t("about.company.name")}
              </p>
              <p style={{ fontSize: 15, color: c.text2 }}>
                {t("about.company.registration")}
              </p>
              <p style={{ fontSize: 13, fontFamily: f.mono, color: c.text3, letterSpacing: ".04em" }}>
                {t("about.company.rcs")}
              </p>
              <a href={"mailto:" + t("about.company.email")} style={{ fontSize: 14, fontFamily: f.mono, color: c.accent, textDecoration: "none" }}>
                {t("about.company.email")}
              </a>
            </div>
          </div>
        </Section>

        {/* Trust & Compliance */}
        <Section style={{ paddingTop: 40, paddingBottom: 0 }}>
          <div className="gt-panel" style={{ padding: "40px 36px" }}>
            <p className="gt-section-label">
              {t("about.trust.label")}
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <span className="gt-badge" style={{ padding: "6px 14px", fontSize: 13, borderRadius: 8, background: c.amberBg, border: "1px solid " + c.amberBd, color: c.amber }}>
                {t("about.trust.soc2")}
              </span>
              <span className="gt-badge" style={{ padding: "6px 14px", fontSize: 13, borderRadius: 8, background: c.greenBg, border: "1px solid " + c.greenBd, color: c.green }}>
                {t("about.trust.gdpr")}
              </span>
              <span className="gt-badge" style={{ padding: "6px 14px", fontSize: 13, borderRadius: 8, background: c.greenBg, border: "1px solid " + c.greenBd, color: c.green }}>
                {t("about.trust.data")}
              </span>
            </div>
            <p style={{ marginTop: 14, fontSize: 12, color: c.text3, lineHeight: 1.6, fontFamily: f.mono, borderTop: "1px solid " + c.border, paddingTop: 12 }}>
              {t("about.trust.soc2eta")}
            </p>
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

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Ghost Tax SAS",
          url: "https://ghost-tax.com",
          logo: "https://ghost-tax.com/favicon.svg",
          description: "Decision Intelligence platform that detects hidden financial exposure in SaaS, AI, and Cloud spending.",
          foundingDate: "2025",
          founder: {
            "@type": "Person",
            name: "HELENE",
            jobTitle: "Founder & CEO",
          },
          contactPoint: {
            "@type": "ContactPoint",
            email: "audits@ghost-tax.com",
            contactType: "sales",
          },
          address: {
            "@type": "PostalAddress",
            addressCountry: "FR",
          },
        }) }}
      />

      <style>{`
        @media (max-width: 768px) {
          .gt-about-facts-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 480px) {
          .gt-about-facts-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
