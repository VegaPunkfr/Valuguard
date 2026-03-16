import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Integrations & API — Ghost Tax",
  description:
    "Ghost Tax connects to your existing stack: 10 intelligence plugins and 11 data connectors for Stripe, QuickBooks, AWS, Azure, Salesforce, Okta, and more. Enterprise API available.",
  alternates: { canonical: "https://ghost-tax.com/integrations" },
  openGraph: {
    title: "Integrations & API — Ghost Tax",
    description:
      "10 intelligence plugins, 11 data connectors. Ghost Tax plugs into your existing SaaS, Cloud, and Finance stack.",
    url: "https://ghost-tax.com/integrations",
  },
};

export default function IntegrationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
