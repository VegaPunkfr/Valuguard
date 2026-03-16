"use client";

import { useI18n } from "@/lib/i18n";
import { c, f, sp, ts } from "@/lib/tokens";

/**
 * GHOST TAX — CASE STUDIES
 *
 * 3 anonymized case studies: Challenge → Detection → Outcome structure.
 * Dark theme, depth-2 cards, monospace data, signal colors.
 * i18n via caseStudies.* keys (EN/FR/DE).
 */

interface CaseStudy {
  id: string;
  industry: string;
  region: string;
  headcount: number;
  currency: string;
  keyMetricValue: string;
  keyMetricLabel: string;
  headline: string;
  challenge: string;
  detection: string;
  outcome: string;
  highlightStats: { label: string; value: string; color: string }[];
  quote: string;
  quoteRole: string;
}

function MetricBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ flex: 1, textAlign: "center", padding: "14px 8px" }}>
      <p style={{
        fontSize: 9, fontFamily: f.mono, fontWeight: 700, color: c.text3,
        letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 6,
      }}>
        {label}
      </p>
      <p style={{
        fontSize: 22, fontWeight: 800, fontFamily: f.mono, color, lineHeight: 1,
      }}>
        {value}
      </p>
    </div>
  );
}

function PhaseBlock({
  phase,
  label,
  color,
  text,
}: {
  phase: string;
  label: string;
  color: string;
  text: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{
          fontSize: 8, fontFamily: f.mono, fontWeight: 800, color,
          letterSpacing: ".14em", textTransform: "uppercase",
          padding: "2px 7px", borderRadius: 3,
          background: color === c.red ? c.redBg : color === c.green ? c.greenBg : c.accentBg,
          border: `1px solid ${color === c.red ? c.redBd : color === c.green ? c.greenBd : c.accentBd}`,
        }}>
          {phase}
        </span>
        <span style={{
          fontSize: 9, fontFamily: f.mono, fontWeight: 700, color: c.text3,
          letterSpacing: ".1em", textTransform: "uppercase",
        }}>
          {label}
        </span>
      </div>
      <p style={{ fontSize: 13, color: c.text2, lineHeight: 1.65, paddingLeft: 2 }}>
        {text}
      </p>
    </div>
  );
}

function CaseCard({ cs, t }: { cs: CaseStudy; t: (k: string) => string }) {
  return (
    <div
      className="gt-panel"
      style={{
        padding: 0,
        marginBottom: 28,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${c.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <span style={{
            fontSize: 9, fontFamily: f.mono, fontWeight: 700, color: c.text3,
            letterSpacing: ".14em", textTransform: "uppercase",
            padding: "3px 8px", borderRadius: 4,
            background: c.elevated, border: `1px solid ${c.border}`,
          }}>
            {cs.industry}
          </span>
          <span style={{
            fontSize: 9, fontFamily: f.mono, color: c.text4,
            letterSpacing: ".1em", textTransform: "uppercase",
          }}>
            {cs.headcount} {t("caseStudies.employees")} &middot; {cs.region}
          </span>
        </div>
        <h3 style={{
          fontSize: 18, fontWeight: 700, color: c.text1, lineHeight: 1.25,
          letterSpacing: "-.01em",
        }}>
          {cs.headline}
        </h3>
      </div>

      {/* Key metric highlight */}
      <div style={{
        padding: "16px 24px",
        borderBottom: `1px solid ${c.border}`,
        background: "#F8FAFC",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
      }}>
        <span style={{
          fontSize: 9, fontFamily: f.mono, fontWeight: 700, color: c.text3,
          letterSpacing: ".12em", textTransform: "uppercase",
        }}>
          {cs.keyMetricLabel}
        </span>
        <span style={{
          fontSize: 28, fontWeight: 800, fontFamily: f.mono, color: c.green,
          lineHeight: 1,
        }}>
          {cs.keyMetricValue}
        </span>
      </div>

      {/* Stats row */}
      <div style={{
        display: "flex", borderBottom: `1px solid ${c.border}`,
        background: "#F1F5F9",
      }}>
        {cs.highlightStats.map((stat, i) => (
          <div key={i} style={{ display: "flex", flex: 1 }}>
            {i > 0 && <div style={{ width: 1, background: c.border }} />}
            <MetricBox label={stat.label} value={stat.value} color={stat.color} />
          </div>
        ))}
      </div>

      {/* Challenge → Detection → Outcome */}
      <div style={{ padding: "20px 24px 8px" }}>
        <PhaseBlock
          phase="01"
          label={t("caseStudies.phase.challenge")}
          color={c.red}
          text={cs.challenge}
        />
        <PhaseBlock
          phase="02"
          label={t("caseStudies.phase.detection")}
          color={c.accent}
          text={cs.detection}
        />
        <PhaseBlock
          phase="03"
          label={t("caseStudies.phase.outcome")}
          color={c.green}
          text={cs.outcome}
        />
      </div>

      {/* Quote */}
      <div style={{ padding: "0 24px 20px" }}>
        <div style={{
          padding: "12px 16px", borderRadius: 8,
          background: c.accentBg, border: `1px solid ${c.accentBd}`,
        }}>
          <p style={{ fontSize: 13, color: c.text2, lineHeight: 1.55, fontStyle: "italic" }}>
            &ldquo;{cs.quote}&rdquo;
          </p>
          <p style={{
            fontSize: 10, fontFamily: f.mono, color: c.text3, marginTop: 6,
            letterSpacing: ".08em", textTransform: "uppercase",
          }}>
            &mdash; {cs.quoteRole}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CaseStudies() {
  const { t } = useI18n();

  const cases: CaseStudy[] = [
    {
      id: "fintech",
      industry: t("caseStudies.case1.industry"),
      region: t("caseStudies.case1.region"),
      headcount: 400,
      currency: "EUR",
      keyMetricValue: "340k EUR/yr",
      keyMetricLabel: t("caseStudies.case1.keyMetricLabel"),
      headline: t("caseStudies.case1.headline"),
      challenge: t("caseStudies.case1.challenge"),
      detection: t("caseStudies.case1.detection"),
      outcome: t("caseStudies.case1.outcome"),
      highlightStats: [
        { label: t("caseStudies.stat.exposure"), value: "340k", color: c.red },
        { label: t("caseStudies.stat.toolsConsolidated"), value: "23 → 11", color: c.accent },
        { label: t("caseStudies.stat.roi"), value: "7x", color: c.green },
      ],
      quote: t("caseStudies.case1.quote"),
      quoteRole: t("caseStudies.case1.quoteRole"),
    },
    {
      id: "manufacturing",
      industry: t("caseStudies.case2.industry"),
      region: t("caseStudies.case2.region"),
      headcount: 1200,
      currency: "EUR",
      keyMetricValue: "270k EUR/yr",
      keyMetricLabel: t("caseStudies.case2.keyMetricLabel"),
      headline: t("caseStudies.case2.headline"),
      challenge: t("caseStudies.case2.challenge"),
      detection: t("caseStudies.case2.detection"),
      outcome: t("caseStudies.case2.outcome"),
      highlightStats: [
        { label: t("caseStudies.stat.aiExposure"), value: "180k", color: c.red },
        { label: t("caseStudies.stat.negotiationSaved"), value: "90k", color: c.amber },
        { label: t("caseStudies.stat.departments"), value: "6", color: c.accent },
      ],
      quote: t("caseStudies.case2.quote"),
      quoteRole: t("caseStudies.case2.quoteRole"),
    },
    {
      id: "services",
      industry: t("caseStudies.case3.industry"),
      region: t("caseStudies.case3.region"),
      headcount: 250,
      currency: "EUR",
      keyMetricValue: "95k EUR/yr",
      keyMetricLabel: t("caseStudies.case3.keyMetricLabel"),
      headline: t("caseStudies.case3.headline"),
      challenge: t("caseStudies.case3.challenge"),
      detection: t("caseStudies.case3.detection"),
      outcome: t("caseStudies.case3.outcome"),
      highlightStats: [
        { label: t("caseStudies.stat.zombieLicenses"), value: "95k", color: c.red },
        { label: t("caseStudies.stat.delivery"), value: "48h", color: c.accent },
        { label: t("caseStudies.stat.boardAction"), value: t("caseStudies.stat.sameDay"), color: c.green },
      ],
      quote: t("caseStudies.case3.quote"),
      quoteRole: t("caseStudies.case3.quoteRole"),
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Ghost Tax Analysis Case Studies",
    "description": "Real-world SaaS, Cloud and AI spend analysis results — anonymized CFO case studies",
    "url": "https://ghost-tax.com/case-studies",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Fintech Scale-up — 340k EUR Ghost Spend identified",
        "description": "400-employee fintech detected 340k EUR/yr in SaaS waste. Tools consolidated from 23 to 11. ROI: 7x."
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Manufacturing Enterprise — 270k EUR Cloud & AI Exposure optimized",
        "description": "1,200-employee manufacturer uncovered 270k EUR in uncontrolled AI and Cloud spend across 6 departments."
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": "Professional Services Firm — 95k EUR Zombie License spend recovered",
        "description": "250-employee services firm identified 95k EUR in unused licenses. Board action taken within 48 hours of delivery."
      }
    ]
  };

  return (
    <div style={{ minHeight: "100vh", fontFamily: f.sans, color: c.text1, padding: "0 14px 64px" }}
         className="gt-container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div style={{ maxWidth: 780, margin: "0 auto" }}>

        {/* Back */}
        <div style={{ paddingTop: 16 }}>
          <a href="/" className="gt-btn gt-btn-ghost" style={{ fontSize: 11, padding: "6px 12px" }}>
            {t("back")}
          </a>
        </div>

        {/* Header */}
        <header style={{ padding: "36px 0 32px" }}>
          <p className="gt-section-label" style={{ marginBottom: 12 }}>
            {t("caseStudies.badge")}
          </p>
          <h1 style={{
            fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 800,
            lineHeight: 1.1, letterSpacing: "-.02em", marginBottom: 12,
          }}>
            {t("caseStudies.title")}
          </h1>
          <p style={{ fontSize: 15, color: c.text2, maxWidth: 600, lineHeight: 1.6 }}>
            {t("caseStudies.subtitle")}
          </p>
        </header>

        {/* Aggregate stats */}
        <div className="gt-panel" style={{
          padding: "16px 24px", marginBottom: 28,
          borderLeft: `3px solid ${c.green}`,
        }}>
          <p style={{
            fontSize: 10, fontFamily: f.mono, color: c.green,
            letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8, fontWeight: 700,
          }}>
            {t("caseStudies.aggregate.label")}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
            <div>
              <p style={{ fontSize: 20, fontWeight: 800, color: c.text1, fontFamily: f.mono }}>705k</p>
              <p style={{ fontSize: 11, color: c.text3 }}>{t("caseStudies.aggregate.totalExposure")}</p>
            </div>
            <div>
              <p style={{ fontSize: 20, fontWeight: 800, color: c.green, fontFamily: f.mono }}>3</p>
              <p style={{ fontSize: 11, color: c.text3 }}>{t("caseStudies.aggregate.industries")}</p>
            </div>
            <div>
              <p style={{ fontSize: 20, fontWeight: 800, color: c.accent, fontFamily: f.mono }}>1,850</p>
              <p style={{ fontSize: 11, color: c.text3 }}>{t("caseStudies.aggregate.employees")}</p>
            </div>
            <div>
              <p style={{ fontSize: 20, fontWeight: 800, color: c.amber, fontFamily: f.mono }}>48h</p>
              <p style={{ fontSize: 11, color: c.text3 }}>{t("caseStudies.aggregate.fastestDelivery")}</p>
            </div>
          </div>
        </div>

        {/* Cases */}
        {cases.map((cs) => (
          <CaseCard key={cs.id} cs={cs} t={t} />
        ))}

        {/* Confidentiality notice */}
        <div className="gt-panel" style={{
          padding: "12px 18px", marginBottom: 20,
          borderLeft: `2px solid ${c.text4}`,
          background: c.elevated,
        }}>
          <p style={{
            fontSize: 11, color: c.text3, fontFamily: f.mono, lineHeight: 1.5,
          }}>
            {t("caseStudies.confidentiality")}
          </p>
        </div>

        {/* Disclaimer */}
        <div className="gt-card" style={{
          padding: "10px 16px", marginBottom: 20,
          background: c.amberBg, borderColor: c.amberBd,
        }}>
          <p style={{ fontSize: 11, color: c.amber, fontFamily: f.mono, textAlign: "center" }}>
            {t("caseStudies.disclaimer")}
          </p>
        </div>

        {/* CTA */}
        <div className="gt-panel" style={{ padding: 28, textAlign: "center" }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: c.text1, marginBottom: 10 }}>
            {t("caseStudies.cta.title")}
          </p>
          <p style={{ fontSize: 13, color: c.text2, marginBottom: 18, lineHeight: 1.5, maxWidth: 420, margin: "0 auto 18px" }}>
            {t("caseStudies.cta.sub")}
          </p>
          <a href="/intel" className="gt-btn gt-btn-primary" style={{ fontSize: 13 }}>
            {t("caseStudies.cta.btn")}
          </a>
        </div>

      </div>
    </div>
  );
}
