"use client";

import { c, f } from "@/lib/tokens";

export default function NumberedCard({
  num,
  title,
  desc,
  color,
}: {
  num: string;
  title: string;
  desc: string;
  color?: string;
}) {
  return (
    <div className="gt-card gt-card-interactive" style={{ padding: "24px 18px", position: "relative" }}>
      <span style={{
        fontFamily: f.mono, fontSize: 32, fontWeight: 800,
        color: "rgba(15,23,42,0.04)", position: "absolute", top: 10, right: 14,
      }}>
        {num}
      </span>
      <p style={{ fontSize: 16, fontWeight: 700, color: color || c.text1, marginBottom: 6 }}>{title}</p>
      <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.55 }}>{desc}</p>
    </div>
  );
}
