import type { Metadata } from "next";
import Link from "next/link";

const BASE = "https://ghost-tax.com";

export const metadata: Metadata = {
  title: "Intelligence Benchmarks — SaaS, AI & Cloud Spend Research",
  description:
    "Research-grade benchmarks on SaaS, AI, and cloud cost exposure. Industry data, detection patterns, and governance frameworks for CFOs, CIOs, and procurement teams.",
  alternates: { canonical: `${BASE}/intel-benchmarks` },
  openGraph: {
    title: "Intelligence Benchmarks — Ghost Tax",
    description:
      "Industry benchmarks and detection patterns for technology spend exposure.",
    url: `${BASE}/intel-benchmarks`,
  },
};

const SURFACES = [
  {
    href: "/intel-benchmarks/saas-ai-cost-exposure",
    title: "SaaS & AI Cost Exposure by Industry",
    description:
      "Per-employee exposure benchmarks across 8 industries. Median exposure, top-quartile targets, and common waste patterns.",
    audience: "CFO, Finance, IT Leadership",
  },
  {
    href: "/intel-benchmarks/shadow-ai-governance",
    title: "Shadow AI Governance: Detection & Cost Impact",
    description:
      "How ungoverned AI tool adoption creates hidden financial exposure. Detection patterns, governance frameworks, and cost impact data.",
    audience: "CIO, IT Governance, Security",
  },
  {
    href: "/intel-benchmarks/cfo-technology-spend-guide",
    title: "CFO Guide to Technology Spend Exposure",
    description:
      "What CFOs need to know about SaaS, AI, and cloud cost exposure. Five exposure categories, detection approaches, and corrective frameworks.",
    audience: "CFO, Finance Director, Controller",
  },
] as const;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Ghost Tax Intelligence Benchmarks",
  description:
    "Research-grade benchmarks on SaaS, AI, and cloud cost exposure for enterprise decision-makers.",
  url: `${BASE}/intel-benchmarks`,
  mainEntity: SURFACES.map((s) => ({
    "@type": "Article",
    name: s.title,
    description: s.description,
    url: `${BASE}${s.href}`,
  })),
};

export default function IntelBenchmarksIndex() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#060912",
        color: "#e4e9f4",
        fontFamily: "var(--font-sans)",
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "48px 20px" }}>
        <Link
          href="/"
          style={{
            fontSize: 11,
            color: "#55637d",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            marginBottom: 24,
          }}
        >
          &larr; ghost-tax.com
        </Link>

        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            lineHeight: 1.2,
            marginBottom: 12,
            letterSpacing: "-0.02em",
          }}
        >
          Intelligence Benchmarks
        </h1>

        <p
          style={{
            fontSize: 15,
            color: "#8d9bb5",
            lineHeight: 1.6,
            marginBottom: 8,
            maxWidth: 600,
          }}
        >
          Research-grade data on SaaS, AI, and cloud spend exposure. Each
          surface provides bounded benchmarks grounded in industry data — not
          marketing estimates.
        </p>

        <p
          style={{
            fontSize: 13,
            color: "#55637d",
            lineHeight: 1.5,
            marginBottom: 40,
            maxWidth: 600,
          }}
        >
          These benchmarks inform the detection model used in the{" "}
          <Link
            href="/intel"
            style={{ color: "#60a5fa", textDecoration: "underline" }}
          >
            Decision Room
          </Link>
          . Methodology is documented{" "}
          <Link
            href="/methodology"
            style={{ color: "#60a5fa", textDecoration: "underline" }}
          >
            transparently
          </Link>
          .
        </p>

        {/* Surface cards */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginBottom: 48,
          }}
        >
          {SURFACES.map((surface) => (
            <Link
              key={surface.href}
              href={surface.href}
              style={{
                display: "block",
                padding: "20px 22px",
                borderRadius: 10,
                background: "#0e1221",
                border: "1px solid rgba(36,48,78,0.28)",
                textDecoration: "none",
                color: "inherit",
                transition: "border-color 0.2s, transform 0.15s",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 8,
                }}
              >
                <h2
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#e4e9f4",
                    lineHeight: 1.3,
                  }}
                >
                  {surface.title}
                </h2>
                <span
                  style={{
                    fontSize: 14,
                    color: "#55637d",
                    flexShrink: 0,
                    marginLeft: 12,
                  }}
                >
                  &rarr;
                </span>
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "#8d9bb5",
                  lineHeight: 1.5,
                  marginBottom: 8,
                }}
              >
                {surface.description}
              </p>
              <span
                style={{
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  color: "#3a4560",
                  letterSpacing: "0.04em",
                }}
              >
                {surface.audience}
              </span>
            </Link>
          ))}
        </div>

        {/* Trust surface cross-links */}
        <div
          style={{
            padding: "16px 20px",
            borderRadius: 8,
            background: "rgba(0,0,0,0.2)",
            border: "1px solid rgba(36,48,78,0.20)",
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              color: "#3a4560",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Related trust surfaces
          </p>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Link
              href="/methodology"
              style={{
                fontSize: 12,
                color: "#60a5fa",
                textDecoration: "none",
              }}
            >
              Detection Methodology &rarr;
            </Link>
            <Link
              href="/security-vault"
              style={{
                fontSize: 12,
                color: "#60a5fa",
                textDecoration: "none",
              }}
            >
              Security & Data Handling &rarr;
            </Link>
            <Link
              href="/procurement"
              style={{
                fontSize: 12,
                color: "#60a5fa",
                textDecoration: "none",
              }}
            >
              Procurement Guide &rarr;
            </Link>
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center", marginTop: 48 }}>
          <p
            style={{
              fontSize: 13,
              color: "#55637d",
              marginBottom: 12,
            }}
          >
            Ready to see your own exposure?
          </p>
          <Link
            href="/intel"
            style={{
              display: "inline-block",
              padding: "12px 32px",
              borderRadius: 6,
              background: "#3b82f6",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            Run Free Detection
          </Link>
        </div>
      </div>
    </div>
  );
}
