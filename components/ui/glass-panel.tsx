"use client";

import { panel } from "@/lib/tokens";

export default function GlassPanel({
  padding = "40px 36px",
  borderColor,
  style,
  className,
  children,
}: {
  padding?: string | number;
  borderColor?: string;
  style?: React.CSSProperties;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`gt-panel ${className || ""}`}
      style={{
        ...panel,
        padding,
        ...(borderColor ? { borderColor } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}
