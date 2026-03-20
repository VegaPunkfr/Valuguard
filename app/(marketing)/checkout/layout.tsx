import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Secure Checkout — Ghost Tax",
  description: "Complete your purchase securely. 256-bit encryption. SOC 2 compliant.",
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
