import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Platform — Ghost Tax",
  description: "A 21-phase intelligence pipeline that detects hidden SaaS, AI, and Cloud spend, explains causes, and delivers corrective protocols with confidence scoring.",
};

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return children;
}
