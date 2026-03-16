import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Questions About Your Report",
  description:
    "Technical support, report clarifications, or custom engagement inquiries. Self-serve platform — no demos, no calls.",
  alternates: { canonical: "https://ghost-tax.com/contact" },
  openGraph: {
    title: "Questions About Your Report | Ghost Tax",
    description:
      "Technical support, report clarifications, or custom engagement inquiries.",
    url: "https://ghost-tax.com/contact",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
