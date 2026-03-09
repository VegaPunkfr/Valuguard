import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Decision Room — Free SaaS & AI Exposure Detection",
  description:
    "Enter a company domain and get a structured exposure analysis in seconds. " +
    "Signal detection, loss velocity, peer benchmarks, causal graph, and corrective scenarios — no payment required.",
  openGraph: {
    title: "Decision Room — Free SaaS & AI Exposure Detection",
    description: "Automated financial exposure detection for SaaS, AI, and cloud spend. Free, instant, no integration.",
    url: "https://ghost-tax.com/intel",
  },
  alternates: { canonical: "https://ghost-tax.com/intel" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
