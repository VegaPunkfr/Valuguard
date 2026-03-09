import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Methodology — How Ghost Tax Detects Financial Exposure",
  description:
    "How Ghost Tax's detection engine works: what it observes, infers, and estimates. " +
    "Confidence model, evidence tiers, boundaries, and limitations — explained transparently.",
  openGraph: {
    title: "Methodology — How Ghost Tax Detects Financial Exposure",
    description: "Transparent methodology: observed vs. inferred vs. estimated signals, confidence model, boundaries.",
    url: "https://ghost-tax.com/methodology",
  },
  alternates: { canonical: "https://ghost-tax.com/methodology" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
