import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sample Decision Pack — See What You Get",
  description:
    "Preview a complete Ghost Tax Decision Pack. 21-phase intelligence analysis with exposure detection, causal diagnosis, and corrective protocol.",
  alternates: { canonical: "https://ghost-tax.com/sample-report" },
  openGraph: {
    title: "Sample Decision Pack | Ghost Tax",
    description:
      "Preview a complete 21-phase intelligence analysis. Exposure detection, causal diagnosis, corrective protocol.",
    url: "https://ghost-tax.com/sample-report",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
