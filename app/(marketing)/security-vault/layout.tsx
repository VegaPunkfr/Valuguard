import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security & Data Handling — Ghost Tax",
  description:
    "Ghost Tax's security posture: zero-knowledge protocol, data handling matrix, " +
    "sub-processor list, US data residency, and compliance roadmap.",
  openGraph: {
    title: "Security & Data Handling — Ghost Tax",
    description: "Data handling matrix, sub-processors, zero-knowledge protocol, SOC2 readiness.",
    url: "https://ghost-tax.com/security-vault",
  },
  alternates: { canonical: "https://ghost-tax.com/security-vault" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
