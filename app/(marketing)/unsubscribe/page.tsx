"use client";

import { useState, useEffect } from "react";
import { c } from "@/lib/tokens";
import { useI18n } from "@/lib/i18n";

export default function UnsubscribePage() {
  const { t } = useI18n();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "idle">("idle");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const e = params.get("email");
    if (e) {
      setEmail(e);
      handleUnsubscribe(e);
    }
  }, []);

  async function handleUnsubscribe(emailToUnsub?: string) {
    const target = emailToUnsub || email;
    if (!target) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/leads/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target }),
      });
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: c.bg, color: c.text1, display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 480, padding: "48px 24px", textAlign: "center" }}>
          {status === "success" ? (
            <>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: c.greenBg, border: `1px solid ${c.greenBd}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 20px", fontSize: 24, color: c.green,
              }}>
                &#x2713;
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>{t("unsubscribe.success")}</h1>
              <p style={{ fontSize: 15, color: c.text2, lineHeight: 1.6, marginBottom: 24 }}>
                {email
                  ? t("unsubscribe.successMsg").replace("{email}", email)
                  : t("unsubscribe.successGeneric")}
              </p>
              <p style={{ fontSize: 12, color: c.text3 }}>
                <a href="mailto:audits@ghost-tax.com" style={{ color: c.accent, textDecoration: "none" }}>
                  audits@ghost-tax.com
                </a>
              </p>
            </>
          ) : status === "loading" ? (
            <p style={{ fontSize: 16, color: c.text2 }}>{t("unsubscribe.processing")}</p>
          ) : status === "error" ? (
            <>
              <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>{t("unsubscribe.error")}</h1>
              <p style={{ fontSize: 15, color: c.text2, marginBottom: 20 }}>
                {t("unsubscribe.errorMsg")}
              </p>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>{t("unsubscribe.title")}</h1>
              <p style={{ fontSize: 15, color: c.text2, lineHeight: 1.6, marginBottom: 20 }}>
                {t("unsubscribe.desc")}
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com" className="gt-input" style={{ width: 260 }}
                />
                <button onClick={() => handleUnsubscribe()} className="gt-btn gt-btn-ghost">
                  {t("unsubscribe.btn")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
