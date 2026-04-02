"use client";

import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { c } from "@/lib/tokens";
import Section from "@/components/ui/section";

export default function FaqPage() {
  const { t } = useI18n();

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
    {
      title: t("faq.cat5.title"),
      items: [
        { q: t("faq.cfo1.q"), a: t("faq.cfo1.a") },
        { q: t("faq.cfo2.q"), a: t("faq.cfo2.a") },
        { q: t("faq.cfo3.q"), a: t("faq.cfo3.a") },
        { q: t("faq.cfo4.q"), a: t("faq.cfo4.a") },
        { q: t("faq.cfo5.q"), a: t("faq.cfo5.a") },
      ],
    },
  ];

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

        {categories.map(function (cat, catIdx) {
          return (
            <Section key={cat.title} style={{ paddingTop: 40, paddingBottom: 0 }}>
              <p className="gt-section-label" style={{ letterSpacing: ".12em" }}>{cat.title}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {cat.items.map(function (item, itemIdx) {
                  return (
                    <details key={`${catIdx}-${itemIdx}`} className="gt-panel" style={{ padding: 0, overflow: "hidden" }}>
                      <summary style={{ padding: "18px 20px", fontSize: 15, fontWeight: 600, color: c.text1, cursor: "pointer", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        {item.q}
                        <span style={{ fontSize: 18, color: c.text3, flexShrink: 0, marginLeft: 12 }}>+</span>
                      </summary>
                      <div style={{ padding: "0 20px 18px", borderTop: `1px solid ${c.border}` }}>
                        <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.7, paddingTop: 14 }}>{item.a}</p>
                      </div>
                    </details>
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

      {/* JSON-LD Structured Data — WebPage + BreadcrumbList + FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "@id": "https://ghost-tax.com/faq/#webpage",
          url: "https://ghost-tax.com/faq",
          name: "FAQ — Ghost Tax",
          description: "Frequently asked questions about Ghost Tax SaaS spend detection, pricing, and methodology.",
          isPartOf: { "@id": "https://ghost-tax.com/#website" },
          about: { "@id": "https://ghost-tax.com/#organization" },
          inLanguage: "en-US",
        }) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://ghost-tax.com" },
            { "@type": "ListItem", position: 2, name: "FAQ", item: "https://ghost-tax.com/faq" },
          ],
        }) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            { "@type": "Question", name: "What is Ghost Tax?", acceptedAnswer: { "@type": "Answer", text: "Ghost Tax is a Decision Intelligence platform that detects hidden financial exposure in SaaS, AI, and Cloud spending, delivering actionable corrective protocols." } },
            { "@type": "Question", name: "What is SaaS ghost spend?", acceptedAnswer: { "@type": "Answer", text: "SaaS ghost spend refers to recurring software license payments that generate zero value: inactive users still billed, duplicate tools, auto-renewed contracts no one monitors, and shadow IT approved outside procurement. Industry data shows 23-41% of SaaS spend is ghost spend. Ghost Tax quantifies it in EUR and delivers a corrective protocol." } },
            { "@type": "Question", name: "How does Ghost Tax detect unauthorized SaaS spending?", acceptedAnswer: { "@type": "Answer", text: "Ghost Tax uses a 21-phase OSINT intelligence pipeline. It cross-references your company domain against 200+ vendor databases, detects shadow IT signals, identifies duplicate tool categories, and surfaces contract renewal windows — all without requiring access to your internal systems. No API credentials, no agents." } },
            { "@type": "Question", name: "How does the detection work?", acceptedAnswer: { "@type": "Answer", text: "Enter your company domain and Ghost Tax runs a 21-phase intelligence pipeline combining OSINT enrichment, market memory, peer benchmarking, drift monitoring, and negotiation playbooks to produce a full Decision Pack." } },
            { "@type": "Question", name: "What is the ROI of a Ghost Tax analysis?", acceptedAnswer: { "@type": "Answer", text: "Typical ROI is 18-57x the analysis cost in the first year. A €490 detection identifies an average of €28,000-€180,000 in annual recoverable exposure for mid-market companies (50-500 employees). The Decision Pack includes a quantified corrective path, so the EUR impact is measurable from day one." } },
            { "@type": "Question", name: "How long does a Ghost Tax analysis take?", acceptedAnswer: { "@type": "Answer", text: "Free scan: 2-3 minutes. Paid Detection (€490): 48 hours for the complete Decision Pack. Stabilization Protocol: 5 business days. Continuous Monitoring: monthly automated reports." } },
            { "@type": "Question", name: "What is included in the Decision Pack?", acceptedAnswer: { "@type": "Answer", text: "The Decision Pack includes: executive exposure summary with EUR-quantified findings, causal diagram of financial leakage, peer benchmarking against 200+ similar companies, negotiation playbooks for top vendors, corrective protocol with prioritized actions, CFO memo, CIO brief, procurement action plan, and board one-pager. All designed for immediate internal circulation." } },
            { "@type": "Question", name: "Does Ghost Tax require access to our systems?", acceptedAnswer: { "@type": "Answer", text: "No. Ghost Tax requires only a company domain to run a detection. No API access, no system agents, no SSO credentials, no internal data export. The analysis uses publicly available signals, vendor intelligence, and OSINT enrichment. For higher-tier Stabilization engagements, optional internal data upload is supported but never mandatory." } },
            { "@type": "Question", name: "How much does it cost?", acceptedAnswer: { "@type": "Answer", text: "Detection starts at 490 EUR one-time. Stabilization plans and continuous monitoring are available at higher tiers. No subscription required for the base detection." } },
            { "@type": "Question", name: "What do I receive?", acceptedAnswer: { "@type": "Answer", text: "A complete Decision Pack including exposure analysis, causal diagnosis, negotiation playbooks, CFO memo, CIO brief, procurement brief, and board one-pager — delivered within 48 hours." } },
            { "@type": "Question", name: "Is my data secure?", acceptedAnswer: { "@type": "Answer", text: "Yes. AES-256 encryption at rest, zero-access architecture, GDPR compliant, SOC 2 aligned. Data is purged after delivery unless you opt into monitoring." } },
          ],
        }) }}
      />

    </div>
  );
}
