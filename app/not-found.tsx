"use client";

import { useI18n } from "@/lib/i18n";

export default function GlobalNotFound() {
  const { t } = useI18n();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#060912",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 440, padding: 32 }}>
        {/* 404 marker */}
        <p
          style={{
            fontSize: 80,
            fontWeight: 800,
            color: "#171e30",
            fontFamily: "monospace",
            margin: "0 0 4px 0",
            lineHeight: 1,
            letterSpacing: "-0.04em",
          }}
        >
          404
        </p>

        {/* Brand label */}
        <p
          style={{
            fontSize: 10,
            letterSpacing: "0.18em",
            color: "#3b82f6",
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          GHOST TAX
        </p>

        {/* Message */}
        <p
          style={{
            fontSize: 15,
            color: "#8d9bb5",
            marginBottom: 28,
            lineHeight: 1.7,
          }}
        >
          {t("notfound.title")}
        </p>

        {/* CTAs */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a
            href="/intel"
            style={{
              background: "#3b82f6",
              color: "#fff",
              padding: "10px 24px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
              letterSpacing: "0.02em",
            }}
          >
            Run a Free Scan
          </a>
          <a
            href="/"
            style={{
              background: "rgba(36,48,78,0.18)",
              border: "1px solid rgba(36,48,78,0.40)",
              color: "#8d9bb5",
              padding: "10px 24px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Home
          </a>
        </div>
      </div>
    </div>
  );
}
