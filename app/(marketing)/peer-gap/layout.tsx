import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Peer Gap Analysis — Benchmark Your IT Spending",
  description:
    "Compare your SaaS, Cloud, and AI spending efficiency against industry peers. Radar chart scoring, percentile ranking, and governance gap analysis.",
  alternates: { canonical: "https://ghost-tax.com/peer-gap" },
  openGraph: {
    title: "Peer Gap Analysis | Ghost Tax",
    description:
      "Benchmark your IT spending against industry peers. Percentile ranking and governance gap analysis.",
    url: "https://ghost-tax.com/peer-gap",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
