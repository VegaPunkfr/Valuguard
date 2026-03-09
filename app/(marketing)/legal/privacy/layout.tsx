import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Ghost Tax",
  description: "How Ghost Tax collects, uses, stores, and protects your personal information. GDPR compliant.",
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
