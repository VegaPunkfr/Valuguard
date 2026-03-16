import type { Metadata } from "next";

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

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
