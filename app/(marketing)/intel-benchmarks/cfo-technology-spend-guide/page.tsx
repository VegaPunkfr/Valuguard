import type { Metadata } from "next";
import { c, f } from "@/lib/tokens";

export const metadata: Metadata = {
  title: "CFO Guide to Technology Spend Exposure (2026)",
  description:
    "What CFOs need to know about SaaS, AI, and cloud cost exposure. " +
    "Exposure categories, detection approaches, and corrective frameworks.",
  openGraph: {
    title: "CFO Guide to Technology Spend Exposure",
    description: "A CFO-oriented guide to detecting and correcting hidden technology spend.",
    url: "https://ghost-tax.com/intel-benchmarks/cfo-technology-spend-guide",
  },
  alternates: { canonical: "https://ghost-tax.com/intel-benchmarks/cfo-technology-spend-guide" },
};

const FAQ = [
  { q: "How much technology spend is typically wasted?", a: "Industry data consistently shows 12–22% of annual SaaS, AI, and cloud spend is wasted through idle licenses, redundant tools, oversized plans, and ungoverned adoption. For a company spending 500k EUR/yr on IT, this represents 60k–110k EUR in addressable waste." },
  { q: "Why doesn't our ERP catch this?", a: "ERP systems track committed costs, not consumption efficiency. They report what was purchased, not what is actually used. SaaS sprawl, shadow AI, and cloud commitment waste exist in the gap between committed spend and realized value — a gap ERPs are not designed to measure." },
  { q: "What is the fastest way to detect exposure?", a: "External signal analysis can identify exposure patterns in minutes using public data: technology stack footprint, hiring signals, and industry benchmarks. This provides a directional estimate without requiring internal system access. Declared spend data improves accuracy significantly." },
  { q: "What does a corrective protocol deliver?", a: "A structured corrective protocol delivers: (1) prioritized list of corrective actions, (2) ownership mapping for each action, (3) estimated savings per action with payback timeline, (4) vendor-specific remediation guidance, and (5) executive-ready decision pack for internal distribution." },
  { q: "How long does correction take?", a: "Quick wins (license downgrades, obvious redundancy removal) can be executed in 30 days. Structured optimization typically shows results in 60–90 days. Full corrective protocols with governance hardening take 3–6 months but deliver sustained, compounding savings." },
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

export default function CfoGuidePage() {
  return (
    <div style={{ minHeight: "100vh", background: c.bg, fontFamily: f.sans, color: c.text1, padding: "0 14px 64px" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="gt-container-md" style={{ margin: "0 auto" }}>
        <div style={{ paddingTop: 16 }}>
          <a href="/" className="gt-btn gt-btn-ghost" style={{ fontSize: 11, padding: "6px 12px" }}>Back</a>
        </div>

        <header style={{ padding: "36px 0 32px" }}>
          <p className="gt-section-label" style={{ marginBottom: 10 }}>CFO INTELLIGENCE</p>
          <h1 style={{ fontSize: "clamp(22px, 3.5vw, 34px)", fontWeight: 800, lineHeight: 1.15, letterSpacing: "-.02em", marginBottom: 12 }}>
            CFO Guide to Technology Spend Exposure
          </h1>
          <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.6, maxWidth: 620 }}>
            What finance leaders need to know about hidden SaaS, AI, and cloud costs — and how to build a detection-to-correction pipeline without a six-month implementation.
          </p>
        </header>

        {/* The problem */}
        <section className="gt-panel" style={{ marginBottom: 32, padding: 22 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: c.text1, marginBottom: 12 }}>The Visibility Gap</h2>
          <p style={{ fontSize: 12, color: c.text2, lineHeight: 1.6, marginBottom: 12 }}>
            Most CFOs have accurate visibility into headcount, real estate, and capital expenditure. Technology spend — particularly SaaS, AI tools, and cloud services — remains structurally opaque for three reasons:
          </p>
          {[
            { title: "Decentralized purchasing", desc: "Engineering, marketing, and product teams purchase tools independently. Many subscriptions sit below approval thresholds and never enter centralized reporting." },
            { title: "Consumption-based pricing", desc: "Cloud and AI costs are usage-based, making them unpredictable and invisible until invoice time. Committed capacity often goes underutilized." },
            { title: "Category sprawl", desc: "The average mid-market company uses 100–300 SaaS tools. No single system tracks them all. Shadow IT accounts for 25–40% of the total in high-growth organizations." },
          ].map((item, i) => (
            <div key={i} className="gt-card" style={{ padding: "10px 14px", borderRadius: 6, marginBottom: 6 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: c.text1, marginBottom: 3 }}>{item.title}</p>
              <p style={{ fontSize: 11, color: c.text2, lineHeight: 1.5 }}>{item.desc}</p>
            </div>
          ))}
        </section>

        {/* Exposure categories */}
        <section className="gt-panel" style={{ marginBottom: 32, padding: 22 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: c.text1, marginBottom: 14 }}>Five Exposure Categories</h2>
          {[
            { cat: "1. Redundant Tools", pct: "25–35%", desc: "Multiple tools serving the same function across teams. Most common in monitoring, AI, project management, and communication." },
            { cat: "2. Idle Licenses", pct: "20–30%", desc: "Paid seats with zero or minimal usage. Often persists because no one owns deprovisioning." },
            { cat: "3. Oversized Plans", pct: "15–20%", desc: "Enterprise tiers purchased for teams that need only standard features. Vendor upselling is the primary driver." },
            { cat: "4. Shadow Subscriptions", pct: "15–25%", desc: "Tools purchased outside procurement — personal credit cards, team-level accounts, free-tier upgrades." },
            { cat: "5. Cloud Commitment Waste", pct: "10–20%", desc: "Reserved instances, committed-use discounts, and savings plans that are underutilized or misallocated." },
          ].map((item, i) => (
            <div key={i} className="gt-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 14px", borderRadius: 6, marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: c.text1, marginBottom: 3 }}>{item.cat}</p>
                <p style={{ fontSize: 11, color: c.text2, lineHeight: 1.5 }}>{item.desc}</p>
              </div>
              <span style={{ fontFamily: f.mono, fontSize: 11, fontWeight: 700, color: c.amber, flexShrink: 0, marginLeft: 12 }}>{item.pct} of waste</span>
            </div>
          ))}
        </section>

        {/* Detection approaches */}
        <section className="gt-panel" style={{ marginBottom: 32, padding: 22 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: c.text1, marginBottom: 12 }}>Detection Without a Six-Month Implementation</h2>
          <p style={{ fontSize: 12, color: c.text2, lineHeight: 1.6, marginBottom: 14 }}>
            Traditional SaaS management platforms require SSO integration, agent deployment, and months of onboarding. External signal analysis provides a faster first pass:
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { approach: "External Signal Analysis", time: "Minutes", access: "Public data only", output: "Directional exposure estimate, signal classification, peer benchmark" },
              { approach: "Corrective Protocol", time: "48 hours", access: "Domain + optional context", output: "Prioritized actions, ownership mapping, payback projections" },
              { approach: "Spend Data Review", time: "1–2 weeks", access: "Billing CSVs, license exports", output: "Precise waste identification, vendor-specific recommendations" },
              { approach: "Full Platform Deploy", time: "2–6 months", access: "SSO, API integrations", output: "Continuous monitoring, automated optimization, governance workflows" },
            ].map((a) => (
              <div key={a.approach} className="gt-card" style={{ padding: "12px 14px", borderRadius: 8 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: c.text1, marginBottom: 4 }}>{a.approach}</p>
                <p style={{ fontSize: 10, fontFamily: f.mono, color: c.accentHi, marginBottom: 4 }}>Time: {a.time} | Access: {a.access}</p>
                <p style={{ fontSize: 11, color: c.text2, lineHeight: 1.4 }}>{a.output}</p>
              </div>
            ))}
          </div>
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
            <a href="/intel-benchmarks/saas-ai-cost-exposure" style={{ fontSize: 12, color: c.accentHi, textDecoration: "none" }}>SaaS & AI Cost Exposure by Industry &rarr;</a>
            <a href="/intel-benchmarks/shadow-ai-governance" style={{ fontSize: 12, color: c.accentHi, textDecoration: "none" }}>Shadow AI Governance: Detection & Cost Impact &rarr;</a>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12, paddingTop: 10, borderTop: `1px solid ${c.border}` }}>
            <a href="/methodology" style={{ fontSize: 11, color: c.text3, textDecoration: "none" }}>Detection Methodology &rarr;</a>
            <a href="/security-vault" style={{ fontSize: 11, color: c.text3, textDecoration: "none" }}>Security & Data Handling &rarr;</a>
            <a href="/procurement" style={{ fontSize: 11, color: c.text3, textDecoration: "none" }}>Procurement Guide &rarr;</a>
          </div>
        </section>

        {/* CTA */}
        <section style={{ textAlign: "center", padding: "24px 0" }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: c.text1, marginBottom: 8 }}>Start with a free exposure detection</p>
          <p style={{ fontSize: 12, color: c.text2, marginBottom: 16 }}>Get a structured exposure estimate in seconds. No integration required.</p>
          <a href="/intel" className="gt-btn gt-btn-primary" style={{ padding: "12px 28px", fontSize: 12, letterSpacing: ".05em" }}>
            RUN DETECTION
          </a>
        </section>
      </div>
    </div>
  );
}
