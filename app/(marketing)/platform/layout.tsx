import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Platform — Ghost Tax",
  description:
    "A 21-phase intelligence pipeline that detects hidden SaaS, AI, and Cloud spend, explains causes, and delivers corrective protocols with confidence scoring.",
  alternates: { canonical: "https://ghost-tax.com/platform" },
  openGraph: {
    title: "Platform — Ghost Tax",
    description:
      "21-phase intelligence pipeline: detect hidden IT spend, explain causes, deliver corrective protocols with confidence scoring.",
    url: "https://ghost-tax.com/platform",
  },
};

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return children;
}
