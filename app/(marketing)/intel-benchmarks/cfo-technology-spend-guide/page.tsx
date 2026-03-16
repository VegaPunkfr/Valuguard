import type { Metadata } from "next";
import CfoContent from "./CfoContent";

export const metadata: Metadata = {
  title: "CFO Guide to IT Spend Exposure — SaaS Cost & FinOps Playbook (2026)",
  description:
    "The definitive CFO guide to detecting hidden SaaS, AI, and cloud cost exposure. " +
    "FinOps frameworks, IT spend categories, detection approaches, and corrective protocols. " +
    "12–22% of annual IT spend is typically recoverable.",
  openGraph: {
    title: "CFO IT Spend Guide — SaaS Cost Exposure & FinOps Playbook (2026)",
    description:
      "CFO-grade FinOps playbook: detect hidden SaaS cost, AI spend waste, and cloud over-provisioning. " +
      "12–22% of IT spend is addressable. Corrective protocols with 30/60/90-day timelines.",
    url: "https://ghost-tax.com/intel-benchmarks/cfo-technology-spend-guide",
    type: "article",
  },
  alternates: { canonical: "https://ghost-tax.com/intel-benchmarks/cfo-technology-spend-guide" },
};

const FAQ_LD = [
  { q: "How much technology spend is typically wasted?", a: "Industry data consistently shows 12–22% of annual SaaS, AI, and cloud spend is wasted through idle licenses, redundant tools, oversized plans, and ungoverned adoption. For a company spending 500k EUR/yr on IT, this represents 60k–110k EUR in addressable waste." },
  { q: "Why doesn't our ERP catch this?", a: "ERP systems track committed costs, not consumption efficiency. They report what was purchased, not what is actually used. SaaS sprawl, shadow AI, and cloud commitment waste exist in the gap between committed spend and realized value — a gap ERPs are not designed to measure." },
  { q: "What is the fastest way to detect exposure?", a: "External signal analysis can identify exposure patterns in minutes using public data: technology stack footprint, hiring signals, and industry benchmarks. This provides a directional estimate without requiring internal system access. Declared spend data improves accuracy significantly." },
  { q: "What does a corrective protocol deliver?", a: "A structured corrective protocol delivers: (1) prioritized list of corrective actions, (2) ownership mapping for each action, (3) estimated savings per action with payback timeline, (4) vendor-specific remediation guidance, and (5) executive-ready decision pack for internal distribution." },
  { q: "How long does correction take?", a: "Quick wins (license downgrades, obvious redundancy removal) can be executed in 30 days. Structured optimization typically shows results in 60–90 days. Full corrective protocols with governance hardening take 3–6 months but deliver sustained, compounding savings." },
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

export default function CfoGuidePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <CfoContent />
    </>
  );
}
