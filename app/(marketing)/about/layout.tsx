import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — Ghost Tax",
  description:
    "Ghost Tax detects hidden financial exposure in SaaS, AI, and Cloud spending. We deliver corrective protocols, not dashboards.",
  alternates: { canonical: "https://ghost-tax.com/about" },
  openGraph: {
    title: "About — Ghost Tax",
    description:
      "Ghost Tax detects hidden financial exposure in SaaS, AI, and Cloud spending. Corrective protocols, not dashboards.",
    url: "https://ghost-tax.com/about",
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
