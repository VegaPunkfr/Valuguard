"use client";

import { c, f } from "@/lib/tokens";

type TrendDir = "up" | "down" | "flat";

const COLOR: Record<string, string> = {
  blue: c.accent,
  red: c.red,
  green: c.green,
  amber: c.amber,
};

const TREND_SYMBOL: Record<TrendDir, string> = {
  up: "\u2191",
  down: "\u2193",
  flat: "\u2192",
};

export default function MetricCard({
  label,
  value,
  color = "blue",
  trend,
  icon,
  className,
}: {
  label: string;
  value: string;
  color?: "blue" | "red" | "green" | "amber";
  trend?: TrendDir;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`gt-card gt-card-hover ${className || ""}`}
      style={{
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        borderColor: `color-mix(in srgb, ${COLOR[color]} 14%, transparent)`,
        transition:
          "transform var(--gt-normal) var(--gt-ease), border-color var(--gt-normal) var(--gt-ease), box-shadow var(--gt-normal) var(--gt-ease)",
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontFamily: f.mono,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: c.text3,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {icon}
        {label}
      </span>

      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span
          style={{
            fontFamily: f.mono,
            fontVariantNumeric: "tabular-nums",
            fontSize: "1.5rem",
            fontWeight: 700,
            color: COLOR[color],
            lineHeight: 1.2,
          }}
        >
          {value}
        </span>

        {trend && (
          <span
            style={{
              fontFamily: f.mono,
              fontSize: 12,
              fontWeight: 700,
              color:
                trend === "up"
                  ? c.green
                  : trend === "down"
                    ? c.red
                    : c.text3,
            }}
          >
            {TREND_SYMBOL[trend]}
          </span>
        )}
      </div>
    </div>
  );
}
