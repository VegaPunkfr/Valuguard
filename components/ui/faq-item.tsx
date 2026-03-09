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
    <div className="gt-panel" style={{ padding: 0, cursor: "pointer", overflow: "hidden" }} onClick={onClick}>
      <div style={{ padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: c.text1, flex: 1 }}>{q}</p>
        <span style={{
          fontSize: 18, color: c.text3,
          transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
          transition: "transform 200ms", flexShrink: 0, marginLeft: 12,
        }}>
          +
        </span>
      </div>
      {isOpen && (
        <div style={{ padding: "0 20px 18px", borderTop: "1px solid " + c.border }}>
          <p style={{ fontSize: 14, color: c.text2, lineHeight: 1.7, paddingTop: 14 }}>{a}</p>
        </div>
      )}
    </div>
  );
}
