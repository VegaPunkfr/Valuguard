import type { Metadata } from "next";
import IntelBenchmarksContent from "./IntelBenchmarksContent";

const BASE = "https://ghost-tax.com";

export const metadata: Metadata = {
  title: "SaaS & AI Cost Benchmarks — How Much Are Companies Overspending?",
  description:
    "53% of SaaS licenses go unused. Mid-market companies overspend 23-41% on software annually. Research-grade benchmarks on SaaS, AI, and cloud cost exposure — by industry, company size, and geography. Data for CFOs, CIOs, and procurement teams.",
  alternates: { canonical: `${BASE}/intel-benchmarks` },
  openGraph: {
    title: "How Much Is Your Company Overspending on SaaS & AI? — Ghost Tax Benchmarks",
    description:
      "53% of SaaS licenses go unused (Zylo 2025). Average mid-market company wastes €28k–€180k/yr on ghost spend. Industry benchmarks and detection data from Ghost Tax's 200+ vendor intelligence network.",
    url: `${BASE}/intel-benchmarks`,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Ghost Tax Intelligence Benchmarks",
  description:
    "Research-grade benchmarks on SaaS, AI, and cloud cost exposure for enterprise decision-makers.",
  url: `${BASE}/intel-benchmarks`,
  mainEntity: [
    {
      "@type": "Article",
      name: "SaaS & AI Cost Exposure by Industry",
      description: "Per-employee exposure benchmarks across 8 industries.",
      url: `${BASE}/intel-benchmarks/saas-ai-cost-exposure`,
    },
    {
      "@type": "Article",
      name: "Shadow AI Governance: Detection & Cost Impact",
      description: "How ungoverned AI tool adoption creates hidden financial exposure.",
      url: `${BASE}/intel-benchmarks/shadow-ai-governance`,
    },
    {
      "@type": "Article",
      name: "CFO Guide to Technology Spend Exposure",
      description: "What CFOs need to know about SaaS, AI, and cloud cost exposure.",
      url: `${BASE}/intel-benchmarks/cfo-technology-spend-guide`,
    },
  ],
};

export default function IntelBenchmarksIndex() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <IntelBenchmarksContent />
    </>
  );
}
