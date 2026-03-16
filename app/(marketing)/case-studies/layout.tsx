import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Case Studies | Ghost Tax — Real CFO Results",
  description:
    "See how CFOs and CTOs used Ghost Tax to recover €200k–€900k in hidden SaaS, Cloud and AI spending. " +
    "3 anonymized case studies with methodology: SaaS waste detection in France, Cloud over-provisioning in Germany, Shadow AI in Belgium.",
  openGraph: {
    title: "Ghost Tax Case Studies — CFO Results",
    description:
      "3 anonymized case studies: €347k SaaS waste detected in France, €891k Cloud over-provisioning in Germany, €218k Shadow AI in Belgium. " +
      "53–70% recovery rates in 45–90 days.",
    url: "https://ghost-tax.com/case-studies",
    type: "website",
  },
  alternates: { canonical: "https://ghost-tax.com/case-studies" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
