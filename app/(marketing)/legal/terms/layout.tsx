import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Ghost Tax",
  description:
    "Terms of Service for the Ghost Tax financial intelligence platform. Payments, intellectual property, liability, and governing law.",
  alternates: { canonical: "https://ghost-tax.com/legal/terms" },
  openGraph: {
    title: "Terms of Service — Ghost Tax",
    description:
      "Terms of Service for the Ghost Tax financial intelligence platform. Payments, intellectual property, liability, and governing law.",
    url: "https://ghost-tax.com/legal/terms",
  },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
