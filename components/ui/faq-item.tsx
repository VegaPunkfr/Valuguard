"use client";

import { c } from "@/lib/tokens";

export default function FaqItem({
  q,
  a,
  isOpen,
  onClick,
}: {
  q: string;
  a: string;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <div className="gt-panel" style={{ padding: 0, overflow: "hidden" }}>
      <button
        type="button"
        onClick={onClick}
        aria-expanded={isOpen}
        style={{
          width: "100%", padding: "18px 20px", display: "flex",
          justifyContent: "space-between", alignItems: "center",
          background: "none", border: "none", cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: c.text1, flex: 1 }}>{q}</span>
        <span
          aria-hidden="true"
          style={{
            fontSize: 18, color: c.text3,
            transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
            transition: "transform 200ms", flexShrink: 0, marginLeft: 12,
          }}
        >
          +
        </span>
      </button>
      {isOpen && (
        <div style={{ padding: "0 20px 18px", borderTop: "1px solid " + c.border }}>
          <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.7, paddingTop: 14 }}>{a}</p>
        </div>
      )}
    </div>
  );
}
