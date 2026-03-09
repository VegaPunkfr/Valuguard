import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Ghost Tax",
  description: "Terms of Service for the Ghost Tax financial intelligence platform. Payments, intellectual property, liability, and governing law.",
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
