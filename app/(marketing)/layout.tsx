"use client";

import dynamic from "next/dynamic";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/ui/footer";

const TerrainBackground = dynamic(
  () => import("@/components/ui/terrain-background"),
  { ssr: false }
);

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ background: "#060912", color: "#E2E8F0", minHeight: "100vh", position: "relative" }}>
      <TerrainBackground opacity={0.18} />
      <a href="#main-content" className="gt-skip-link">Skip to main content</a>
      <div style={{ position: "relative", zIndex: 1 }}>
        <Navbar />
        <main id="main-content">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}
