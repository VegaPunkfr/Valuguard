import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Ghost Tax | Rail A 490 € · Rail B · Rail C",
  description:
    "CFO-grade financial exposure detection starting at 490 €. " +
    "Rail A: one-time detection (490 €) — Rail B: 30/60/90 stabilization plan — Rail C: institutional mission. " +
    "No subscription, no integration required. Board-ready Decision Pack in 48 hours.",
  alternates: { canonical: "https://ghost-tax.com/pricing" },
  openGraph: {
    title: "Ghost Tax Pricing — Rail A 490 € · Rail B · Rail C",
    description:
      "Rail A (490 €): one-time CFO-grade detection. Rail B: stabilization protocol. Rail C: enterprise mission. " +
      "Transparent, no-commitment pricing for SaaS, Cloud & AI spend exposure.",
    url: "https://ghost-tax.com/pricing",
    type: "website",
  },
};

const pricingJsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Ghost Tax — Financial Exposure Detection",
  description:
    "One-time analysis detecting hidden SaaS, AI & cloud spending exposure. " +
    "Board-ready decision pack delivered in 48 hours.",
  brand: {
    "@type": "Brand",
    name: "Ghost Tax",
  },
  offers: [
    {
      "@type": "Offer",
      name: "Rail A — Financial Exposure Detection",
      price: "490",
      priceCurrency: "USD",
      priceValidUntil: "2026-12-31",
      availability: "https://schema.org/InStock",
      url: "https://ghost-tax.com/pricing",
      description:
        "Deterministic detection of 12 types of SaaS, Cloud, and AI spend leaks. " +
        "Includes executive snapshot, causal graph, negotiation playbooks, and board-ready decision pack.",
    },
    {
      "@type": "Offer",
      name: "Rail A — Financial Exposure Detection (EUR)",
      price: "490",
      priceCurrency: "EUR",
      priceValidUntil: "2026-12-31",
      availability: "https://schema.org/InStock",
      url: "https://ghost-tax.com/pricing",
      description:
        "Deterministic detection of 12 types of SaaS, Cloud, and AI spend leaks. " +
        "Includes executive snapshot, causal graph, negotiation playbooks, and board-ready decision pack.",
    },
  ],
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd) }}
      />
      {children}
    </>
  );
}
