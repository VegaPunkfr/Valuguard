import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Questions About Your Report",
  description:
    "Technical support, report clarifications, or custom engagement inquiries. Self-serve platform — no demos, no calls.",
  openGraph: {
    title: "Questions About Your Report | Ghost Tax",
    description:
      "Technical support, report clarifications, or custom engagement inquiries.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
