"use client";

import { useI18n } from "@/lib/i18n";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
      <div style={{ textAlign: "center", maxWidth: 420, padding: 32 }}>
        <p
          style={{
            fontSize: 10,
            letterSpacing: "0.2em",
            color: "#ef4444",
            textTransform: "uppercase",
            fontFamily: "monospace",
            marginBottom: 16,
          }}
        >
          {t("error.label")}
        </p>
        <h1
          style={{
            fontSize: 22,
            color: "#e4e9f4",
            fontWeight: 800,
            margin: "0 0 12px 0",
          }}
        >
          {t("error.title")}
        </h1>
        <p style={{ fontSize: 14, color: "#8d9bb5", lineHeight: 1.7, margin: "0 0 24px 0" }}>
          {error.message}
        </p>
        {error.digest && (
          <p
            style={{
              fontSize: 11,
              color: "#3a4560",
              fontFamily: "monospace",
              marginBottom: 20,
            }}
          >
            {t("error.ref")} {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          style={{
            background: "#3b82f6",
            color: "#fff",
            padding: "10px 24px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
          }}
        >
          {t("error.retry")}
        </button>
      </div>
    </div>
  );
}
