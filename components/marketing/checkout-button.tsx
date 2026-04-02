"use client";

import { useState } from "react";

interface CheckoutButtonProps {
  rail?: "A" | "B_STABILIZE" | "B_MONITOR";
  label?: string;
  style?: React.CSSProperties;
}

export default function CheckoutButton({
  rail = "A",
  label = "Unlock the protocol",
  style,
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rail }),
      });
      if (res.ok) {
        const { url } = await res.json();
        if (url) window.location.href = url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        padding: "14px 28px",
        background: "#E2E8F0",
        color: "#060912",
        border: "none",
        fontFamily: "var(--gt-font-mono)",
        fontSize: "13px",
        fontWeight: 700,
        letterSpacing: "0.08em",
        cursor: loading ? "wait" : "pointer",
        textTransform: "uppercase",
        width: "100%",
        ...style,
      }}
    >
      {loading ? "..." : label}
    </button>
  );
}
