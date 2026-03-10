"use client";

import { useI18n } from "@/lib/i18n";

export default function AppNotFound() {
  const { t } = useI18n();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#060912",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 400, padding: 32 }}>
        <p
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: "#171e30",
            fontFamily: "monospace",
            margin: "0 0 8px 0",
          }}
        >
          404
        </p>
        <p
          style={{
            fontSize: 10,
            letterSpacing: "0.15em",
            color: "#3b82f6",
            textTransform: "uppercase",
            fontFamily: "monospace",
            marginBottom: 12,
          }}
        >
          GHOST TAX
        </p>
        <p style={{ fontSize: 15, color: "#8d9bb5", marginBottom: 24, lineHeight: 1.7 }}>
          {t("notfound.title")}
        </p>
        <a
          href="/dashboard"
          style={{
            background: "#3b82f6",
            color: "#fff",
            padding: "10px 24px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          {t("notfound.back")}
        </a>
      </div>
    </div>
  );
}
