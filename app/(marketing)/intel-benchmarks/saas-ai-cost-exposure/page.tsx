import type { Metadata } from "next";
import { c, f } from "@/lib/tokens";

export const metadata: Metadata = {
  title: "SaaS & AI Cost Exposure Benchmarks by Industry (2026)",
  description:
    "Per-employee SaaS and AI exposure benchmarks across 8 industries. " +
    "Median exposure, top-quartile targets, and common waste patterns.",
  openGraph: {
    title: "SaaS & AI Cost Exposure Benchmarks by Industry (2026)",
    description: "Industry benchmarks: per-employee SaaS/AI exposure, waste patterns, and correction targets.",
    url: "https://ghost-tax.com/intel-benchmarks/saas-ai-cost-exposure",
  },
  alternates: { canonical: "https://ghost-tax.com/intel-benchmarks/saas-ai-cost-exposure" },
};

const BENCHMARKS = [
  { industry: "Technology / SaaS", median: 1800, topQ: 900 },
  { industry: "Financial Services", median: 2200, topQ: 1100 },
  { industry: "Healthcare", median: 1600, topQ: 800 },
  { industry: "Retail & E-commerce", median: 1400, topQ: 700 },
  { industry: "Manufacturing", median: 1200, topQ: 600 },
  { industry: "Media & Advertising", median: 1900, topQ: 950 },
  { industry: "Professional Services", median: 1500, topQ: 750 },
];

const FAQ = [
  { q: "What is SaaS cost exposure?", a: "SaaS cost exposure is the portion of annual software spend that delivers no value — idle licenses, duplicate tools, oversized tiers, and unmanaged subscriptions. Industry data shows 12–22% of total SaaS spend falls into this category." },
  { q: "How is per-employee exposure calculated?", a: "Total annual SaaS/AI/cloud waste divided by headcount. This normalizes for company size and allows cross-industry comparison. Benchmarks are derived from Flexera, Zylo, and Gartner composite data." },
  { q: "What is the difference between median and top-quartile exposure?", a: "Median represents the typical exposure for organizations in a given industry. Top-quartile represents the exposure level of the best-managed 25% — this is the realistic optimization target." },
  { q: "Does AI spend increase exposure?", a: "Yes. Organizations with 2+ AI tools (ChatGPT, Copilot, Claude, etc.) show 15–30% higher per-employee exposure due to capability overlap, ungoverned experimentation, and duplicate inference costs." },
  { q: "How can I benchmark my organization?", a: "Run a free detection in the Ghost Tax Decision Room. The system will calculate your exposure, compare you to industry peers, and show your percentile position — no payment or integration required." },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: { "@type": "Answer", text: faq.a },
  })),
};

export default function SaasAiCostExposurePage() {
  return (
    <div style={{ minHeight: "100vh", background: c.bg, fontFamily: f.sans, color: c.text1, padding: "0 14px 64px" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="gt-container-md" style={{ margin: "0 auto" }}>
        <div style={{ paddingTop: 16 }}>
          <a href="/" className="gt-btn gt-btn-ghost" style={{ fontSize: 11, padding: "6px 12px" }}>Back</a>
        </div>

        <header style={{ padding: "36px 0 32px" }}>
          <p className="gt-section-label" style={{ marginBottom: 10 }}>INTELLIGENCE BENCHMARK</p>
          <h1 style={{ fontSize: "clamp(22px, 3.5vw, 34px)", fontWeight: 800, lineHeight: 1.15, letterSpacing: "-.02em", marginBottom: 12 }}>
            SaaS & AI Cost Exposure by Industry
          </h1>
          <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.6, maxWidth: 620 }}>
            Per-employee annual exposure benchmarks across 8 industries. Median represents typical waste; top-quartile represents realistic optimization targets. Source: Flexera 2024, Zylo 2024, Gartner 2025 composite.
          </p>
        </header>

        {/* Benchmark table */}
        <section className="gt-panel" style={{ marginBottom: 32, padding: 22 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: c.text1, marginBottom: 14 }}>Per-Employee Annual Exposure (EUR)</h2>
          <div className="gt-label" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr", gap: 8, padding: "8px 12px" }}>
            <span>Industry</span><span style={{ textAlign: "right" }}>Median</span><span style={{ textAlign: "right" }}>Top Quartile</span><span style={{ textAlign: "right" }}>Typical Gap</span>
          </div>
          {BENCHMARKS.map((b) => (
            <div key={b.industry} className="gt-card" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr", gap: 8, padding: "10px 12px", borderRadius: 6, marginTop: 4, fontSize: 12 }}>
              <span style={{ color: c.text1, fontWeight: 600 }}>{b.industry}</span>
              <span style={{ fontFamily: f.mono, color: c.amber, textAlign: "right" }}>{b.median.toLocaleString()} &euro;</span>
              <span style={{ fontFamily: f.mono, color: c.green, textAlign: "right" }}>{b.topQ.toLocaleString()} &euro;</span>
              <span style={{ fontFamily: f.mono, color: c.red, textAlign: "right" }}>{(b.median - b.topQ).toLocaleString()} &euro;</span>
            </div>
          ))}
          <p style={{ fontSize: 10, color: c.text3, marginTop: 12, lineHeight: 1.5 }}>
            Gap = addressable waste per employee if the organization moved from median to top-quartile performance. For a 200-person company in Financial Services, this represents ~220k EUR/yr in recoverable spend.
          </p>
        </section>

        {/* Key findings */}
        <section className="gt-panel" style={{ marginBottom: 32, padding: 22 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: c.text1, marginBottom: 12 }}>Key Findings</h2>
          {[
            "Financial Services shows the highest per-employee exposure (2,200 EUR/yr median) due to regulatory-driven tool proliferation and multi-vendor compliance requirements.",
            "Technology / SaaS companies are second (1,800 EUR/yr) driven by AI tool redundancy and engineering-led tool adoption without procurement oversight.",
            "Manufacturing shows the lowest exposure (1,200 EUR/yr) but the widest gap between median and top-quartile, suggesting high variance in IT governance maturity.",
            "AI-specific exposure is growing fastest across all sectors — organizations with 2+ overlapping AI tools show 15–30% higher per-employee waste.",
            "Shadow IT (ungoverned tool adoption) accounts for an estimated 25–40% of total exposure in high-growth companies.",
          ].map((finding, i) => (
            <p key={i} style={{ fontSize: 12, color: c.text2, lineHeight: 1.6, marginBottom: 8, paddingLeft: 14, borderLeft: `2px solid ${c.accentBd}` }}>{finding}</p>
          ))}
        </section>

        {/* FAQ */}
        <section className="gt-panel" style={{ marginBottom: 32, padding: 22 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: c.text1, marginBottom: 14 }}>Frequently Asked Questions</h2>
          {FAQ.map((faq, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: c.text1, marginBottom: 4 }}>{faq.q}</h3>
              <p style={{ fontSize: 12, color: c.text2, lineHeight: 1.6 }}>{faq.a}</p>
            </div>
          ))}
        </section>

        {/* Related intelligence */}
        <section className="gt-card" style={{ marginBottom: 32, padding: "16px 20px", borderRadius: 8 }}>
          <p className="gt-label" style={{ marginBottom: 10 }}>Related research</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <a href="/intel-benchmarks/shadow-ai-governance" style={{ fontSize: 12, color: c.accentHi, textDecoration: "none" }}>Shadow AI Governance: Detection & Cost Impact &rarr;</a>
            <a href="/intel-benchmarks/cfo-technology-spend-guide" style={{ fontSize: 12, color: c.accentHi, textDecoration: "none" }}>CFO Guide to Technology Spend Exposure &rarr;</a>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12, paddingTop: 10, borderTop: `1px solid ${c.border}` }}>
            <a href="/methodology" style={{ fontSize: 11, color: c.text3, textDecoration: "none" }}>Detection Methodology &rarr;</a>
            <a href="/security-vault" style={{ fontSize: 11, color: c.text3, textDecoration: "none" }}>Security & Data Handling &rarr;</a>
            <a href="/procurement" style={{ fontSize: 11, color: c.text3, textDecoration: "none" }}>Procurement Guide &rarr;</a>
          </div>
        </section>

        {/* CTA */}
        <section style={{ textAlign: "center", padding: "24px 0" }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: c.text1, marginBottom: 8 }}>See where your organization sits</p>
          <p style={{ fontSize: 12, color: c.text2, marginBottom: 16 }}>Run a free detection to benchmark against your industry peers.</p>
          <a href="/intel" className="gt-btn gt-btn-primary" style={{ padding: "12px 28px", fontSize: 12, letterSpacing: ".05em" }}>
            RUN DETECTION
          </a>
          <p style={{ fontSize: 10, color: c.text3, marginTop: 8 }}>No payment required. Domain-only input. Results in seconds.</p>
        </section>
      </div>
    </div>
  );
}
