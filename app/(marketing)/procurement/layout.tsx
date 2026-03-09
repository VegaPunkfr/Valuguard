import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Procurement & Decision Scope — Ghost Tax",
  description:
    "Vendor review material for procurement, finance, and security reviewers. " +
    "Product summary, commercial stages, typical buyers, deliverables, and security handoff.",
  openGraph: {
    title: "Procurement & Decision Scope — Ghost Tax",
    description: "Everything procurement leads and finance controllers need to evaluate Ghost Tax.",
    url: "https://ghost-tax.com/procurement",
  },
  alternates: { canonical: "https://ghost-tax.com/procurement" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
