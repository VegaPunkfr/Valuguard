import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ghost Tax Estimator — Calculate Your IT Exposure",
  description:
    "Interactive tool to estimate SaaS, AI, and Cloud financial exposure. See your peer percentile, recovery potential, and governance trajectory in seconds.",
  alternates: { canonical: "https://ghost-tax.com/estimator" },
  openGraph: {
    title: "Ghost Tax Estimator — Calculate Your IT Exposure",
    description:
      "Estimate your SaaS/AI/Cloud financial exposure. Peer percentile and recovery potential in seconds.",
    url: "https://ghost-tax.com/estimator",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
