import type { Metadata } from "next";

const SITE_URL = "https://ghost-tax.com";

export const metadata: Metadata = {
  title:
    "Ghost Tax Calculator — How Much Is Your Company Losing to IT Waste? | Ghost Tax",
  description:
    "Free SaaS cost calculator: estimate how much your company loses annually to invisible IT waste. " +
    "Calculate shadow IT cost, cloud spending waste, and unused SaaS licenses in 10 seconds. " +
    "Based on Gartner, Flexera, and 200+ enterprise audits.",
  keywords: [
    "SaaS waste calculator",
    "IT cost audit",
    "cloud spending optimization",
    "shadow IT cost",
    "technology spend waste",
    "SaaS cost calculator",
    "IT waste calculator",
    "cloud spending waste",
    "ghost tax",
    "SaaS license waste",
    "IT budget optimization",
    "FinOps calculator",
    "software spend audit",
    "unused SaaS licenses",
    "cloud cost reduction",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: `${SITE_URL}/ghost-tax`,
    siteName: "Ghost Tax",
    title: "Ghost Tax Calculator — How Much Is Your Company Losing to IT Waste?",
    description:
      "The average mid-market company loses 18-32% of its IT budget to invisible waste. Calculate your Ghost Tax in 10 seconds — free, no signup required.",
    images: [
      {
        url: `${SITE_URL}/ghost-tax/opengraph-image`,
        width: 1200,
        height: 630,
        alt: "Ghost Tax Ghost Tax Calculator — Calculate Your IT Waste",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@ghosttaxhq",
    creator: "@ghosttaxhq",
    title: "Ghost Tax Calculator — How Much Is Your Company Losing to IT Waste?",
    description:
      "The average mid-market company loses 18-32% of its IT budget to invisible waste. Calculate your Ghost Tax in 10 seconds.",
    images: [`${SITE_URL}/ghost-tax/opengraph-image`],
  },
  alternates: {
    canonical: `${SITE_URL}/ghost-tax`,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function GhostTaxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
