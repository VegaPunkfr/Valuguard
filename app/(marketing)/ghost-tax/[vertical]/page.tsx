import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { c, f } from "@/lib/tokens";
import { getVertical, getAllVerticalSlugs, type VerticalData } from "@/lib/verticals";

const SITE_URL = "https://ghost-tax.com";

/* ── Static generation ─────────────────────────────────── */

export function generateStaticParams() {
  return getAllVerticalSlugs().map((slug) => ({ vertical: slug }));
}

/* ── Metadata ──────────────────────────────────────────── */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ vertical: string }>;
}): Promise<Metadata> {
  const { vertical: slug } = await params;
  const v = getVertical(slug);
  if (!v) return {};

  return {
    title: v.title,
    description: v.description,
    keywords: v.keywords,
    openGraph: {
      type: "website",
      locale: "en_US",
      url: `${SITE_URL}/ghost-tax/${v.slug}`,
      siteName: "Ghost Tax",
      title: v.ogTitle,
      description: v.description,
      images: [
        {
          url: `${SITE_URL}/ghost-tax/opengraph-image`,
          width: 1200,
          height: 630,
          alt: v.ogTitle,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: "@ghosttaxhq",
      title: v.ogTitle,
      description: v.description,
      images: [`${SITE_URL}/ghost-tax/opengraph-image`],
    },
    alternates: {
      canonical: `${SITE_URL}/ghost-tax/${v.slug}`,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large" as const,
        "max-snippet": -1,
      },
    },
  };
}

/* ── JSON-LD ───────────────────────────────────────────── */

function buildJsonLd(v: VerticalData) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: v.faq.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

/* ── Page ──────────────────────────────────────────────── */

export default async function VerticalPage({
  params,
}: {
  params: Promise<{ vertical: string }>;
}) {
  const { vertical: slug } = await params;
  const v = getVertical(slug);
  if (!v) notFound();

  const jsonLd = buildJsonLd(v);
  const ctaHref = v.ctaIndustry
    ? `/intel?industry=${v.ctaIndustry}`
    : v.ctaCountry
      ? `/intel?market=${v.ctaCountry}`
      : "/intel";

  return (
    <div style={{ minHeight: "100vh", background: c.bg, fontFamily: f.sans, color: c.text1 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="gt-container-md" style={{ margin: "0 auto", padding: "0 16px 80px" }}>

        {/* ── Back nav ─────────────────────────────────── */}
        <div style={{ paddingTop: 16 }}>
          <a
            href="/ghost-tax"
            className="gt-btn gt-btn-ghost"
            style={{ fontSize: 11, padding: "6px 12px" }}
          >
            Ghost Tax Calculator
          </a>
        </div>

        {/* ── Hero ─────────────────────────────────────── */}
        <header style={{ padding: "48px 0 40px" }}>
          <p
            className="gt-section-label"
            style={{ color: c.red, marginBottom: 12 }}
          >
            {v.hero.label}
          </p>
          <h1
            style={{
              fontSize: "clamp(24px, 4vw, 38px)",
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              marginBottom: 16,
              maxWidth: 720,
            }}
          >
            {v.hero.headline}
          </h1>
          <div
            className="gt-card"
            style={{
              display: "inline-block",
              padding: "10px 18px",
              marginBottom: 16,
            }}
          >
            <span
              className="gt-mono"
              style={{ fontSize: 15, color: c.red, fontWeight: 700 }}
            >
              {v.hero.stat}
            </span>
          </div>
          <p
            style={{
              fontSize: 15,
              color: c.text2,
              lineHeight: 1.7,
              maxWidth: 660,
              marginBottom: 6,
            }}
          >
            {v.hero.subtext}
          </p>
          <p style={{ fontSize: 11, color: c.text3, fontStyle: "italic" }}>
            Source: {v.hero.statSource}
          </p>
        </header>

        {/* ── Pain Points ──────────────────────────────── */}
        <section style={{ marginBottom: 48 }}>
          <p className="gt-section-label" style={{ marginBottom: 20 }}>
            {v.type === "industry" ? "INDUSTRY-SPECIFIC PAIN POINTS" : "MARKET-SPECIFIC PAIN POINTS"}
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 360px), 1fr))",
              gap: 16,
            }}
          >
            {v.painPoints.map((pp, i) => (
              <div
                key={i}
                className="gt-panel"
                style={{ padding: "24px", display: "flex", flexDirection: "column" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: c.text1, margin: 0, flex: 1 }}>
                    {pp.title}
                  </h3>
                  <span
                    className="gt-badge gt-badge--red gt-mono"
                    style={{ fontSize: 11, whiteSpace: "nowrap", marginLeft: 12 }}
                  >
                    {pp.costRange}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: c.text2, lineHeight: 1.65, margin: 0 }}>
                  {pp.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How Ghost Tax Helps ──────────────────────── */}
        <section className="gt-panel" style={{ padding: "32px 28px", marginBottom: 48 }}>
          <p className="gt-section-label" style={{ marginBottom: 20, color: c.accent }}>
            HOW GHOST TAX HELPS
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))",
              gap: 24,
            }}
          >
            {[
              {
                step: "01",
                title: "Scan",
                description: "Enter your domain. Our 21-phase Decision Intelligence engine maps your full vendor landscape, licensing patterns, and technology architecture — externally, with no integration required.",
              },
              {
                step: "02",
                title: "Detect",
                description: "Ghost Tax identifies overlap, unused licenses, over-provisioned infrastructure, shadow AI, and unfavorable contract terms — with vendor-level proof and EUR impact ranges.",
              },
              {
                step: "03",
                title: "Act",
                description: "Receive a CFO-ready Decision Pack: executive memo, board one-pager, negotiation playbooks, and a prioritized 30/60/90-day correction roadmap specific to your organization.",
              },
            ].map((s) => (
              <div key={s.step}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span
                    className="gt-mono"
                    style={{
                      fontSize: 11,
                      color: c.accent,
                      fontWeight: 700,
                      background: c.accentBg,
                      border: `1px solid ${c.accentBd}`,
                      borderRadius: 6,
                      padding: "3px 8px",
                    }}
                  >
                    {s.step}
                  </span>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: c.text1, margin: 0 }}>
                    {s.title}
                  </h3>
                </div>
                <p style={{ fontSize: 13, color: c.text2, lineHeight: 1.65, margin: 0 }}>
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Stats / Benchmarks ───────────────────────── */}
        <section style={{ marginBottom: 48 }}>
          <p className="gt-section-label" style={{ marginBottom: 20 }}>
            {v.type === "industry" ? "INDUSTRY BENCHMARKS" : "MARKET BENCHMARKS"}
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 200px), 1fr))",
              gap: 12,
            }}
          >
            {v.stats.map((stat, i) => (
              <div
                key={i}
                className="gt-card"
                style={{ padding: "20px 16px", textAlign: "center" }}
              >
                <p className="gt-label" style={{ margin: "0 0 8px", fontSize: 10 }}>
                  {stat.label}
                </p>
                <p
                  className="gt-metric gt-mono"
                  style={{ fontSize: 22, color: c.amber, margin: "0 0 6px", lineHeight: 1 }}
                >
                  {stat.value}
                </p>
                <p style={{ fontSize: 10, color: c.text3, margin: 0, lineHeight: 1.4 }}>
                  {stat.note}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Testimonial ──────────────────────────────── */}
        <section
          className="gt-panel"
          style={{
            padding: "28px 24px",
            marginBottom: 48,
            borderLeft: `3px solid ${c.green}`,
          }}
        >
          <p className="gt-section-label" style={{ color: c.green, marginBottom: 14 }}>
            DETECTION RESULT
          </p>
          <blockquote
            style={{
              fontSize: 15,
              color: c.text1,
              lineHeight: 1.7,
              fontStyle: "italic",
              margin: "0 0 14px",
              borderLeft: "none",
              padding: 0,
            }}
          >
            &ldquo;{v.testimonial.quote}&rdquo;
          </blockquote>
          <p style={{ fontSize: 13, color: c.text2, margin: "0 0 4px", fontWeight: 600 }}>
            {v.testimonial.attribution}
          </p>
          <p style={{ fontSize: 12, color: c.text3, margin: 0 }}>
            {v.testimonial.context}
          </p>
        </section>

        {/* ── FAQ ──────────────────────────────────────── */}
        <section className="gt-panel" style={{ padding: "28px 24px", marginBottom: 48 }}>
          <p className="gt-section-label" style={{ marginBottom: 18 }}>
            FREQUENTLY ASKED QUESTIONS
          </p>
          {v.faq.map((faq, i) => (
            <div
              key={i}
              style={{
                marginBottom: i < v.faq.length - 1 ? 18 : 0,
                paddingBottom: i < v.faq.length - 1 ? 18 : 0,
                borderBottom:
                  i < v.faq.length - 1 ? `1px solid ${c.border}` : "none",
              }}
            >
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: c.text1,
                  marginBottom: 6,
                }}
              >
                {faq.question}
              </h3>
              <p
                style={{
                  fontSize: 13,
                  color: c.text2,
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                {faq.answer}
              </p>
            </div>
          ))}
        </section>

        {/* ── CTA ──────────────────────────────────────── */}
        <section
          className="gt-panel"
          style={{
            border: `2px solid ${c.accentBd}`,
            padding: "40px 32px",
            textAlign: "center",
            marginBottom: 48,
          }}
        >
          <p className="gt-section-label" style={{ marginBottom: 10 }}>
            STOP GUESSING. GET PROOF.
          </p>
          <p
            style={{
              fontSize: 20,
              fontWeight: 700,
              marginBottom: 8,
              color: c.text1,
            }}
          >
            Detect your exact exposure in 48 hours
          </p>
          <p
            style={{
              fontSize: 14,
              color: c.text2,
              lineHeight: 1.6,
              marginBottom: 24,
              maxWidth: 520,
              margin: "0 auto 24px",
            }}
          >
            Our 21-phase Decision Intelligence engine analyzes your actual vendor landscape,
            licensing patterns, and technology architecture — with vendor-level proof and a
            CFO-ready Decision Pack.
          </p>
          <a
            href={ctaHref}
            className="gt-btn gt-btn-primary"
            style={{
              display: "inline-block",
              padding: "14px 32px",
              fontSize: 14,
              letterSpacing: ".04em",
              marginBottom: 14,
            }}
          >
            RUN FULL DETECTION — FROM 490 EUR
          </a>
          <p style={{ fontSize: 11, color: c.text3, margin: 0, lineHeight: 1.6 }}>
            21-phase analysis &bull; Vendor-level proof &bull; Negotiation playbooks &bull; CFO-ready memos
            <br />
            No integration required &bull; Results in 48 hours &bull; In 200+ analyses, zero had zero exposure
          </p>
        </section>

        {/* ── Related links ────────────────────────────── */}
        <section
          className="gt-card"
          style={{ padding: "16px 20px", borderRadius: 8, marginBottom: 32 }}
        >
          <p className="gt-label" style={{ marginBottom: 10 }}>
            Related resources
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <a
              href="/ghost-tax"
              style={{ fontSize: 12, color: c.accentHi, textDecoration: "none" }}
            >
              Ghost Tax Calculator — Free instant estimate &rarr;
            </a>
            <a
              href="/intel-benchmarks/saas-ai-cost-exposure"
              style={{ fontSize: 12, color: c.accentHi, textDecoration: "none" }}
            >
              SaaS & AI Cost Exposure Benchmarks by Industry &rarr;
            </a>
            <a
              href="/intel-benchmarks/cfo-technology-spend-guide"
              style={{ fontSize: 12, color: c.accentHi, textDecoration: "none" }}
            >
              CFO Guide to Technology Spend Exposure &rarr;
            </a>
          </div>
          <div
            style={{
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              marginTop: 12,
              paddingTop: 10,
              borderTop: `1px solid ${c.border}`,
            }}
          >
            <a
              href="/methodology"
              style={{ fontSize: 11, color: c.text3, textDecoration: "none" }}
            >
              Detection Methodology &rarr;
            </a>
            <a
              href="/security-vault"
              style={{ fontSize: 11, color: c.text3, textDecoration: "none" }}
            >
              Security & Data Handling &rarr;
            </a>
            <a
              href="/pricing"
              style={{ fontSize: 11, color: c.text3, textDecoration: "none" }}
            >
              Pricing &rarr;
            </a>
          </div>
        </section>

        {/* ── Trust footer ─────────────────────────────── */}
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <p style={{ fontSize: 11, color: c.text3, lineHeight: 1.7 }}>
            Data sourced from Gartner, Flexera, Zylo, and 200+ Ghost Tax analyses.
            <br />
            Benchmarks updated March 2026. All figures are ranges, not point estimates.
          </p>
        </div>
      </div>
    </div>
  );
}
