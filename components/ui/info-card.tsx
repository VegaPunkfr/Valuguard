"use client";

import { c, f } from "@/lib/tokens";

export default function InfoCard({
  label,
  desc,
  labelColor,
}: {
  label: string;
  desc: string;
  labelColor?: string;
}) {
  return (
    <div className="gt-card" style={{ padding: "20px 16px", textAlign: "center" }}>
      <p style={{
        fontSize: 12, fontFamily: f.mono, fontWeight: 700,
        color: labelColor || c.accent, letterSpacing: ".06em", marginBottom: 6,
      }}>
        {label}
      </p>
      <p style={{ fontSize: 13, color: c.text3, lineHeight: 1.45 }}>{desc}</p>
    </div>
  );
}
