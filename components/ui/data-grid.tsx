"use client";

import { c, f } from "@/lib/tokens";

export type DataGridItem = {
  label: string;
  value: string;
  color?: string;
};

export default function DataGrid({
  items,
  columns = 3,
  className,
  style,
}: {
  items: DataGridItem[];
  columns?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 12,
        ...style,
      }}
    >
      {items.map((item) => (
        <div key={item.label} className="gt-metric">
          <p style={{
            fontSize: 9, fontFamily: f.mono, color: c.text3,
            letterSpacing: ".1em", marginBottom: 8, textTransform: "uppercase",
          }}>
            {item.label}
          </p>
          <p
            style={{
              fontSize: 22, fontFamily: f.mono, fontWeight: 800,
              color: item.color || c.text1, margin: 0,
            }}
            dangerouslySetInnerHTML={{ __html: item.value }}
          />
        </div>
      ))}
    </div>
  );
}
