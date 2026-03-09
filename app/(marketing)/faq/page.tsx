"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { c, f, sectionLabel } from "@/lib/tokens";
import Section from "@/components/ui/section";
import Footer from "@/components/ui/footer";
import FaqItem from "@/components/ui/faq-item";

export default function FaqPage() {
  const { t } = useI18n();
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const categories = [
    {
      title: t("faq.cat1.title"),
      items: [
        { q: t("faq.cat1.q1"), a: t("faq.cat1.a1") },
        { q: t("faq.cat1.q2"), a: t("faq.cat1.a2") },
        { q: t("faq.cat1.q3"), a: t("faq.cat1.a3") },
      ],
    },
    {
      title: t("faq.cat2.title"),
      items: [
        { q: t("faq.cat2.q1"), a: t("faq.cat2.a1") },
        { q: t("faq.cat2.q2"), a: t("faq.cat2.a2") },
        { q: t("faq.cat2.q3"), a: t("faq.cat2.a3") },
      ],
    },
    {
      title: t("faq.cat3.title"),
      items: [
        { q: t("faq.cat3.q1"), a: t("faq.cat3.a1") },
        { q: t("faq.cat3.q2"), a: t("faq.cat3.a2") },
        { q: t("faq.cat3.q3"), a: t("faq.cat3.a3") },
      ],
    },
    {
      title: t("faq.cat4.title"),
      items: [
        { q: t("faq.cat4.q1"), a: t("faq.cat4.a1") },
        { q: t("faq.cat4.q2"), a: t("faq.cat4.a2") },
      ],
    },
  ];

  let globalIdx = 0;

  return (
    <div style={{ minHeight: "100vh", background: c.bg, color: c.text1 }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px" }}>

        <Section style={{ textAlign: "center", paddingTop: 80, paddingBottom: 20 }}>
          <p className="gt-section-label">{t("faq.label")}</p>
          <h1 style={{ fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.035em", marginBottom: 16 }}>
            {t("faq.title")}
          </h1>
          <p style={{ fontSize: 18, color: c.text2, maxWidth: 520, margin: "0 auto", lineHeight: 1.6 }}>
            {t("faq.sub")}
          </p>
        </Section>

        {categories.map(function (cat) {
          return (
            <Section key={cat.title} style={{ paddingTop: 40, paddingBottom: 0 }}>
              <p className="gt-section-label" style={{ letterSpacing: ".12em" }}>{cat.title}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {cat.items.map(function (item) {
                  const idx = globalIdx++;
                  return (
                    <FaqItem key={idx} q={item.q} a={item.a} isOpen={openIdx === idx} onClick={function () { setOpenIdx(openIdx === idx ? null : idx); }} />
                  );
                })}
              </div>
            </Section>
          );
        })}

        {/* CTA */}
        <Section style={{ paddingTop: 60, paddingBottom: 0 }}>
          <div className="gt-panel" style={{ padding: "40px 36px", textAlign: "center" }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, letterSpacing: "-0.02em" }}>
              {t("faq.cta.title")}
            </h2>
            <p style={{ fontSize: 16, color: c.text2, maxWidth: 440, margin: "0 auto 24px", lineHeight: 1.6 }}>
              {t("faq.cta.sub")}
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
              <a href="/intel" className="gt-btn gt-btn-primary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
                {t("faq.cta.primary")} <ArrowRight size={16} />
              </a>
              <a href="/contact" className="gt-btn gt-btn-ghost" style={{ textDecoration: "none" }}>
                {t("faq.cta.secondary")}
              </a>
            </div>
          </div>
        </Section>

      </div>

      <Footer />
    </div>
  );
}
