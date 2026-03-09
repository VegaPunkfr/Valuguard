"use client";

import { c } from "@/lib/tokens";
import Footer from "@/components/ui/footer";

export default function PageWrapper({
  maxWidth = 1120,
  padding = "0 24px",
  children,
  showFooter = true,
}: {
  maxWidth?: number;
  padding?: string;
  children: React.ReactNode;
  showFooter?: boolean;
}) {
  return (
    <div style={{ minHeight: "100vh", background: c.bg, color: c.text1 }}>
      <div style={{ maxWidth, margin: "0 auto", padding }}>
        {children}
      </div>
      {showFooter && <Footer />}
    </div>
  );
}
