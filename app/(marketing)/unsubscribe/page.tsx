"use client";

import { useState, useEffect } from "react";
import { c, f } from "@/lib/tokens";
import Footer from "@/components/ui/footer";

/**
 * GHOST TAX — UNSUBSCRIBE PAGE
 *
 * GDPR + CAN-SPAM compliant unsubscribe.
 * URL: /unsubscribe?email=xxx&token=xxx
 * One-click unsubscribe — no login required.
 */

export default function UnsubscribePage() {
  const [status, setStatus] = useState<"loading" | "success" | "error" | "idle">("idle");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const e = params.get("email");
    if (e) {
      setEmail(e);
      // Auto-unsubscribe on page load (one-click)
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
    <div
      style={{
        minHeight: "100vh",
        background: c.bg,
        color: c.text1,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ maxWidth: 480, padding: "48px 24px", textAlign: "center" }}>
          {status === "success" ? (
            <>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background: c.greenBg,
                  border: `1px solid ${c.greenBd}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                  fontSize: 24,
                  color: c.green,
                }}
              >
                &#x2713;
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Unsubscribed</h1>
              <p style={{ fontSize: 15, color: c.text2, lineHeight: 1.6, marginBottom: 24 }}>
                {email
                  ? `${email} has been removed from all Ghost Tax communications.`
                  : "You have been unsubscribed from all Ghost Tax communications."}
              </p>
              <p style={{ fontSize: 12, color: c.text3 }}>
                Changed your mind? Contact{" "}
                <a
                  href="mailto:audits@ghost-tax.com"
                  style={{ color: c.accent, textDecoration: "none" }}
                >
                  audits@ghost-tax.com
                </a>
              </p>
            </>
          ) : status === "loading" ? (
            <p style={{ fontSize: 16, color: c.text2 }}>Processing your unsubscribe request...</p>
          ) : status === "error" ? (
            <>
              <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Something went wrong</h1>
              <p style={{ fontSize: 15, color: c.text2, marginBottom: 20 }}>
                Please email{" "}
                <a
                  href="mailto:audits@ghost-tax.com"
                  style={{ color: c.accent, textDecoration: "none" }}
                >
                  audits@ghost-tax.com
                </a>{" "}
                with subject &quot;Unsubscribe&quot; and we&apos;ll remove you within 24 hours.
              </p>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Unsubscribe</h1>
              <p style={{ fontSize: 15, color: c.text2, lineHeight: 1.6, marginBottom: 20 }}>
                Enter your email to unsubscribe from Ghost Tax communications.
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="gt-input"
                  style={{ width: 260 }}
                />
                <button onClick={() => handleUnsubscribe()} className="gt-btn gt-btn-ghost">
                  Unsubscribe
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
