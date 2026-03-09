"use client";

import { c } from "@/lib/tokens";

export default function SectionHeader({
  label,
  labelColor,
  title,
  subtitle,
  maxWidth = 600,
  center = false,
}: {
  label?: string;
  labelColor?: string;
  title: string | React.ReactNode;
  subtitle?: string;
  maxWidth?: number;
  center?: boolean;
}) {
  return (
    <div style={center ? { textAlign: "center" } : undefined}>
      {label && (
        <p className="gt-section-label" style={labelColor ? { color: labelColor } : undefined}>
          {label}
        </p>
      )}
      <h2 style={{ marginBottom: subtitle ? 10 : 28 }}>{title}</h2>
      {subtitle && (
        <p style={{
          fontSize: 17, color: c.text2, maxWidth,
          margin: center ? "0 auto" : undefined,
          lineHeight: 1.6, marginBottom: 28,
        }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
