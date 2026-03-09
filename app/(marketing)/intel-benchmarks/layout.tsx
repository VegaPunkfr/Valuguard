import type { Metadata } from "next";

const BASE = "https://ghost-tax.com";

export const metadata: Metadata = {
  title: "Intelligence Benchmarks — SaaS, AI & Cloud Spend Research",
  description:
    "Research-grade benchmarks on SaaS, AI, and cloud cost exposure. Industry data, detection patterns, and governance frameworks for CFOs, CIOs, and procurement teams.",
  alternates: { canonical: `${BASE}/intel-benchmarks` },
  openGraph: {
    title: "Intelligence Benchmarks — Ghost Tax",
    description:
      "Industry benchmarks and detection patterns for technology spend exposure. Data-driven, bounded, honest.",
    url: `${BASE}/intel-benchmarks`,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
