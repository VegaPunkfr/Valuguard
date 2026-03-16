import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ — Ghost Tax",
  description:
    "Frequently asked questions about Ghost Tax: methodology, pricing, security, data handling, and how to get started.",
  alternates: { canonical: "https://ghost-tax.com/faq" },
  openGraph: {
    title: "FAQ — Ghost Tax",
    description:
      "Frequently asked questions about Ghost Tax: methodology, pricing, security, data handling, and how to get started.",
    url: "https://ghost-tax.com/faq",
  },
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
