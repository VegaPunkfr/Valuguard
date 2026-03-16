"use client";

import { c } from "@/lib/tokens";

type Intensity = "light" | "medium" | "heavy";

const BG: Record<Intensity, string> = {
  light: "#FFFFFF",
  medium: "#F8FAFC",
  heavy: "#F1F5F9",
};

export default function GlassPanel({
  padding = "40px 36px",
  borderColor,
  glow,
  intensity = "medium",
  style,
  className,
  children,
}: {
  padding?: string | number;
  borderColor?: string;
  glow?: "blue" | "red" | "green" | "amber";
  intensity?: Intensity;
  style?: React.CSSProperties;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`gt-panel ${className || ""}`}
      style={{
        background: BG[intensity],
        border: `1px solid ${borderColor || c.borderS}`,
        borderRadius: 18,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
