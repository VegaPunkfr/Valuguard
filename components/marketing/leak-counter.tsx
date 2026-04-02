"use client";

import { useState, useEffect } from "react";

export default function LeakCounter() {
  const [amount, setAmount] = useState(294847);
  useEffect(() => {
    const t = setInterval(() => {
      setAmount((p) => p + Math.floor(Math.random() * 800 + 200));
    }, 1800);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span
        style={{
          display: "inline-block",
          width: "7px",
          height: "7px",
          borderRadius: "50%",
          background: "#D62828",
          animation: "gt-pulse 1.5s ease-in-out infinite",
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: "var(--gt-font-mono)",
          fontSize: "13px",
          fontWeight: 700,
          color: "#D62828",
          letterSpacing: "0.02em",
        }}
      >
        €{amount.toLocaleString("de-DE")}
      </span>
    </div>
  );
}
