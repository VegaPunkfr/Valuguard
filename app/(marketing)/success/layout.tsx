import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payment Confirmed — Your Decision Pack is Processing",
  description: "Your detection request is confirmed. Automated enrichment and analysis in progress. Delivery within 48 hours.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
