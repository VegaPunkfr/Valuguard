import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payment Cancelled",
  description: "Your payment was cancelled. No amount was charged. Return to pricing to try again.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
