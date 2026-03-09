"use client";

import { CheckCircle } from "lucide-react";
import { c } from "@/lib/tokens";

export default function FeatureList({
  items,
  iconColor,
  iconSize = 15,
  fontSize = 14,
}: {
  items: string[];
  iconColor?: string;
  iconSize?: number;
  fontSize?: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {items.map((feat) => (
        <div key={feat} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize, color: c.text2, lineHeight: 1.4 }}>
          <CheckCircle size={iconSize} color={iconColor || c.green} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 2 }} />
          {feat}
        </div>
      ))}
    </div>
  );
}
