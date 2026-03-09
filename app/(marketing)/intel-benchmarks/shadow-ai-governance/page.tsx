import type { Metadata } from "next";
import { c, f } from "@/lib/tokens";

export const metadata: Metadata = {
  title: "Shadow AI Governance: Detection Patterns and Cost Impact (2026)",
  description:
    "How shadow AI tools create financial exposure. Detection patterns, governance frameworks, " +
    "and cost impact data for CFOs, CIOs, and procurement teams.",
  openGraph: {
    title: "Shadow AI Governance: Detection and Cost Impact",
    description: "Shadow AI patterns, cost impact, and governance frameworks for enterprise teams.",
    url: "https://ghost-tax.com/intel-benchmarks/shadow-ai-governance",
  },
  alternates: { canonical: "https://ghost-tax.com/intel-benchmarks/shadow-ai-governance" },
};

const PATTERNS = [
  { pattern: "AI Tool Redundancy", description: "Multiple AI assistants (ChatGPT, Copilot, Claude, Gemini) active simultaneously across teams with overlapping capabilities.", impact: "400–4,500 EUR/mo", frequency: "Very common", detection: "Public tech stack analysis reveals 2+ AI tools with overlapping use cases." },
  { pattern: "Ungoverned Experimentation", description: "Individual teams adopting AI tools via personal credit cards or team-level subscriptions outside procurement.", impact: "150–1,800 EUR/mo", frequency: "Common in high-growth companies", detection: "Hiring signals + tool mentions in job postings indicate rapid, ungoverned adoption." },
  { pattern: "Inference Cost Sprawl", description: "API-based AI usage (OpenAI, Anthropic APIs) without consumption governance, leading to unpredictable and growing costs.", impact: "Highly variable", frequency: "Growing rapidly", detection: "Multiple API provider references in public documentation or engineering blogs." },
  { pattern: "Model-to-Task Mismatch", description: "Using expensive frontier models (GPT-4, Claude Opus) for tasks that smaller, cheaper models handle equally well.", impact: "30–70% cost reduction available", frequency: "Nearly universal", detection: "Inferred from AI tool footprint size and engineering team growth signals." },
];

const FAQ = [
  { q: "What is shadow AI?", a: "Shadow AI refers to AI tools and services adopted by employees or teams without formal IT procurement approval. This includes personal ChatGPT subscriptions, unapproved API integrations, and team-level AI tool purchases that bypass governance workflows." },
  { q: "How much does shadow AI cost a typical organization?", a: "For a 200-person technology company, shadow AI typically adds 2,000–18,000 EUR/month in unmanaged spend. The cost is compounded by redundancy — multiple teams often pay for overlapping AI capabilities independently." },
  { q: "How do you detect shadow AI without agent installation?", a: "Ghost Tax detects shadow AI through public signal analysis: job postings mentioning AI tools, tech stack disclosures, hiring velocity patterns, and industry-calibrated heuristics. No internal system access is required at the detection stage." },
  { q: "What governance framework reduces shadow AI exposure?", a: "Effective shadow AI governance requires three components: (1) a lightweight procurement gate for AI tool purchases above a threshold, (2) an approved AI tool registry with clear category coverage, and (3) periodic utilization review to identify and consolidate redundant subscriptions." },
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

export default function ShadowAiGovernancePage() {
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
            Shadow AI Governance
          </h1>
          <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.6, maxWidth: 620 }}>
            How ungoverned AI adoption creates financial exposure. Detection patterns, cost impact data, and practical governance frameworks.
          </p>
        </header>

        {/* Detection patterns */}
        <section className="gt-panel" style={{ marginBottom: 32, padding: 22 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: c.text1, marginBottom: 14 }}>Shadow AI Detection Patterns</h2>
          {PATTERNS.map((p, i) => (
            <div key={i} className="gt-card" style={{ padding: "14px 16px", borderRadius: 8, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: c.text1 }}>{p.pattern}</h3>
                <span className="gt-badge gt-badge--amber" style={{ flexShrink: 0 }}>{p.impact}</span>
              </div>
              <p style={{ fontSize: 11, color: c.text2, lineHeight: 1.5, marginBottom: 6 }}>{p.description}</p>
              <p style={{ fontSize: 10, color: c.text3, lineHeight: 1.4 }}>
                <strong style={{ color: c.accentHi }}>Detection:</strong> {p.detection}
                {" "}<strong style={{ color: c.text3 }}>|</strong>{" "}
                <strong style={{ color: c.text3 }}>Frequency:</strong> {p.frequency}
              </p>
            </div>
          ))}
        </section>

        {/* Governance framework */}
        <section className="gt-panel" style={{ marginBottom: 32, padding: 22 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: c.text1, marginBottom: 12 }}>Practical Governance Framework</h2>
          {[
            { step: "1", title: "Procurement Gate", desc: "Require approval for AI tool purchases above 50 EUR/mo per user. This catches 80% of shadow subscriptions without creating excessive friction." },
            { step: "2", title: "Approved Tool Registry", desc: "Maintain a curated list of sanctioned AI tools by category (code assistance, content, analytics, automation). Teams pick from the list instead of discovering independently." },
            { step: "3", title: "Quarterly Utilization Review", desc: "Review active AI subscriptions quarterly. Identify tools with <30% utilization or >50% capability overlap with another tool. Consolidate or cancel." },
            { step: "4", title: "Cost-Per-Outcome Tracking", desc: "Shift from cost-per-seat to cost-per-outcome. A 20 USD/seat AI tool that saves 4 hours/week is well-governed. A 20 USD/seat tool with 10% adoption is shadow waste." },
          ].map((s) => (
            <div key={s.step} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: `1px solid ${c.border}` }}>
              <span style={{ fontFamily: f.mono, fontSize: 18, fontWeight: 800, color: c.accentBd, flexShrink: 0 }}>{s.step}</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: c.text1, marginBottom: 3 }}>{s.title}</p>
                <p style={{ fontSize: 11, color: c.text2, lineHeight: 1.5 }}>{s.desc}</p>
              </div>
            </div>
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
            <a href="/intel-benchmarks/saas-ai-cost-exposure" style={{ fontSize: 12, color: c.accentHi, textDecoration: "none" }}>SaaS & AI Cost Exposure by Industry &rarr;</a>
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
          <p style={{ fontSize: 14, fontWeight: 700, color: c.text1, marginBottom: 8 }}>Detect your shadow AI exposure</p>
          <p style={{ fontSize: 12, color: c.text2, marginBottom: 16 }}>Enter your domain. The system detects AI tool redundancy and governance gaps automatically.</p>
          <a href="/intel" className="gt-btn gt-btn-primary" style={{ padding: "12px 28px", fontSize: 12, letterSpacing: ".05em" }}>
            RUN DETECTION
          </a>
        </section>
      </div>
    </div>
  );
}
