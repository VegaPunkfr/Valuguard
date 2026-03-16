import type { Metadata } from "next";
import ShadowContent from "./ShadowContent";

export const metadata: Metadata = {
  title: "Shadow AI Governance: CFO Cost Impact & Detection Patterns (2026)",
  description:
    "How shadow AI tools create hidden financial exposure. CFO-grade detection patterns, FinOps governance frameworks, " +
    "and IT spend cost impact data. Unmanaged AI subscriptions add 2k–18k EUR/month per 200 employees.",
  openGraph: {
    title: "Shadow AI Governance — CFO Cost Impact & FinOps Detection (2026)",
    description:
      "Shadow AI detection patterns, IT spend cost impact (2k–18k EUR/month), and CFO governance frameworks for SaaS, AI & cloud sprawl.",
    url: "https://ghost-tax.com/intel-benchmarks/shadow-ai-governance",
    type: "article",
  },
  alternates: { canonical: "https://ghost-tax.com/intel-benchmarks/shadow-ai-governance" },
};

const FAQ_LD = [
  { q: "What is shadow AI?", a: "Shadow AI refers to AI tools and services adopted by employees or teams without formal IT procurement approval. This includes personal ChatGPT subscriptions, unapproved API integrations, and team-level AI tool purchases that bypass governance workflows." },
  { q: "How much does shadow AI cost a typical organization?", a: "For a 200-person technology company, shadow AI typically adds 2,000–18,000 EUR/month in unmanaged spend. The cost is compounded by redundancy — multiple teams often pay for overlapping AI capabilities independently." },
  { q: "How do you detect shadow AI without agent installation?", a: "Ghost Tax detects shadow AI through public signal analysis: job postings mentioning AI tools, tech stack disclosures, hiring velocity patterns, and industry-calibrated heuristics. No internal system access is required at the detection stage." },
  { q: "What governance framework reduces shadow AI exposure?", a: "Effective shadow AI governance requires three components: (1) a lightweight procurement gate for AI tool purchases above a threshold, (2) an approved AI tool registry with clear category coverage, and (3) periodic utilization review to identify and consolidate redundant subscriptions." },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_LD.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: { "@type": "Answer", text: faq.a },
  })),
};

export default function ShadowAiGovernancePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ShadowContent />
    </>
  );
}
