import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Unsubscribe",
  description: "One-click unsubscribe from Ghost Tax communications. GDPR compliant.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
