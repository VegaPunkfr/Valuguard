"use client";

import { ArrowRight } from "lucide-react";

export default function ButtonPair({
  primaryLabel,
  primaryHref = "/intel",
  secondaryLabel,
  secondaryHref = "/contact",
  showArrow = true,
}: {
  primaryLabel: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  showArrow?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
      <a href={primaryHref} className="gt-btn gt-btn-primary" style={{ padding: "16px 32px", fontSize: 15 }}>
        {primaryLabel} {showArrow && <ArrowRight size={16} />}
      </a>
      {secondaryLabel && (
        <a href={secondaryHref} className="gt-btn gt-btn-ghost" style={{ padding: "16px 28px", fontSize: 15 }}>
          {secondaryLabel}
        </a>
      )}
    </div>
  );
}
