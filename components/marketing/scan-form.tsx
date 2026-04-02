"use client";

import { useState } from "react";

interface ScanFormProps {
  variant?: "hero" | "cta";
  detectLabel?: string;
  freeLabel?: string;
  placeholder?: string;
}

export default function ScanForm({
  variant = "hero",
  detectLabel = "DETECT",
  freeLabel = "→ Launch a free scan",
  placeholder = "your-company.com",
}: ScanFormProps) {
  const [domain, setDomain] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleDetection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.trim(), rail: "A" }),
      });
      if (res.ok) {
        const { url } = await res.json();
        if (url) window.location.href = url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFreeScan = () => {
    const q = domain.trim() ? `?domain=${encodeURIComponent(domain)}` : "";
    window.location.href = `/intel${q}`;
  };

  if (variant === "cta") {
    return (
      <form
        onSubmit={handleDetection}
        style={{
          display: "flex",
          gap: "0",
          maxWidth: "520px",
          margin: "0 auto",
          border: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1,
            padding: "16px 20px",
            background: "transparent",
            border: "none",
            color: "#E2E8F0",
            fontFamily: "var(--gt-font-mono)",
            fontSize: "15px",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={isLoading}
          style={{
            padding: "16px 32px",
            background: "#00CFC4",
            color: "#060912",
            border: "none",
            fontFamily: "var(--gt-font-mono)",
            fontSize: "13px",
            fontWeight: 800,
            letterSpacing: "0.1em",
            cursor: isLoading ? "wait" : "pointer",
          }}
        >
          {isLoading ? "..." : detectLabel}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleDetection} style={{ maxWidth: "480px" }}>
      <div style={{ display: "flex", gap: "0", marginBottom: "14px" }}>
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1,
            padding: "17px 20px",
            background: "rgba(10,13,25,0.85)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRight: "none",
            color: "#E2E8F0",
            fontFamily: "var(--gt-font-mono)",
            fontSize: "16px",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={isLoading}
          style={{
            padding: "17px 32px",
            background: "#E2E8F0",
            color: "#060912",
            border: "none",
            fontFamily: "var(--gt-font-mono)",
            fontSize: "13px",
            fontWeight: 800,
            letterSpacing: "0.12em",
            cursor: isLoading ? "wait" : "pointer",
          }}
        >
          {isLoading ? "..." : detectLabel}
        </button>
      </div>
      <button
        type="button"
        onClick={handleFreeScan}
        style={{
          background: "none",
          border: "none",
          color: "#00CFC4",
          fontFamily: "var(--gt-font-mono)",
          fontSize: "13px",
          fontWeight: 600,
          letterSpacing: "0.04em",
          cursor: "pointer",
          padding: 0,
        }}
      >
        {freeLabel}
      </button>
    </form>
  );
}
