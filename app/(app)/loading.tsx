"use client";

import { useI18n } from "@/lib/i18n";

export default function AppLoading() {
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
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 32,
            height: 32,
            border: "2px solid rgba(59,130,246,0.2)",
            borderTopColor: "#3b82f6",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 16px",
          }}
        />
        <p
          style={{
            fontSize: 10,
            letterSpacing: "0.15em",
            color: "#55637d",
            textTransform: "uppercase",
            fontFamily: "monospace",
          }}
        >
          {t("loading.text")}
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
