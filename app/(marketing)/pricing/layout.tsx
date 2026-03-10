import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Ghost Tax",
  description: "Transparent pricing for financial exposure detection, stabilization protocols, and continuous drift monitoring. Starting at $990 / €890.",
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
