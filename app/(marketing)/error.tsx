"use client";

import { useEffect } from "react";

export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[MarketingError]", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#060912",
        color: "#e4e9f4",
        fontFamily:
          'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
      }}
    >
      <div style={{ textAlign: "center", padding: "2rem", maxWidth: 420 }}>
        <p
          style={{
            fontSize: 10,
            letterSpacing: "0.18em",
            color: "#ef4444",
            textTransform: "uppercase",
            marginBottom: "0.75rem",
          }}
        >
          ERROR
        </p>
        <div
          style={{
            fontSize: "1.5rem",
            fontWeight: 800,
            color: "#e4e9f4",
            marginBottom: "0.75rem",
            letterSpacing: "-0.02em",
          }}
        >
          Something went wrong
        </div>
        <p
          style={{
            color: "#8d9bb5",
            fontSize: "0.875rem",
            marginBottom: "1.5rem",
            lineHeight: 1.6,
          }}
        >
          An unexpected error occurred. Please try again.
        </p>
        {error.digest && (
          <p
            style={{
              fontSize: 10,
              color: "#3a4560",
              marginBottom: "1.25rem",
            }}
          >
            ref: {error.digest}
          </p>
        )}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={reset}
            style={{
              backgroundColor: "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "0.625rem 1.5rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Try again
          </button>
          <a
            href="/"
            style={{
              display: "inline-block",
              backgroundColor: "rgba(36,48,78,0.18)",
              border: "1px solid rgba(36,48,78,0.40)",
              color: "#8d9bb5",
              borderRadius: "8px",
              padding: "0.625rem 1.5rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              textDecoration: "none",
              fontFamily: "inherit",
            }}
          >
            Home
          </a>
        </div>
      </div>
    </div>
  );
}
