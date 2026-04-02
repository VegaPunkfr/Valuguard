"use client";

import dynamic from "next/dynamic";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/ui/footer";

const TerrainBackground = dynamic(
  () => import("@/components/ui/terrain-background"),
  { ssr: false }
);

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#060912", color: "#e4e9f4", minHeight: "100vh", position: "relative" }}>
      <TerrainBackground opacity={0.12} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <Navbar />
        <main>{children}</main>
        <Footer />
      </div>
    </div>
  );
}
