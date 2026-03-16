import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Ghost Tax",
  description:
    "How Ghost Tax collects, uses, stores, and protects your personal information. GDPR compliant.",
  alternates: { canonical: "https://ghost-tax.com/legal/privacy" },
  openGraph: {
    title: "Privacy Policy — Ghost Tax",
    description:
      "How Ghost Tax collects, uses, stores, and protects your personal information. GDPR compliant.",
    url: "https://ghost-tax.com/legal/privacy",
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
