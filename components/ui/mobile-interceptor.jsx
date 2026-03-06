"use client";
import { useState, useCallback } from "react";

/*  VALUGUARD — MOBILE INTERCEPTOR
    Renders ONLY on screens < 768px.
    Parent must wrap: <div className="block md:hidden"><MobileInterceptor/></div>
    Desktop estimator wrapped: <div className="hidden md:block">...</div>
    Captures email → POST /api/vault/persist with source "mobile-handoff".
    100% USD. Zero French. */

var V = "#060912";
var A = "#3b82f6";
var AH = "#60a5fa";
var T1 = "#e0e6f2";
var T2 = "#8d9bb5";
var T3 = "#55637d";
var TL = "#34d399";
var RD = "#ef4444";
var BD = "rgba(36,48,78,0.32)";
var MO = "ui-monospace,'Cascadia Code','Fira Code',monospace";
var SA = "system-ui,-apple-system,sans-serif";

var gl = {
  background: "rgba(11,14,24,0.82)",
  backdropFilter: "blur(20px) saturate(1.15)",
  WebkitBackdropFilter: "blur(20px) saturate(1.15)",
  border: "1px solid " + BD,
  borderRadius: 14,
  boxShadow: "0 4px 40px rgba(0,0,0,0.35)",
};

export default function MobileInterceptor() {
  var s = useState("idle");
  var phase = s[0];
  var setPhase = s[1];
  var e = useState("");
  var email = e[0];
  var setEmail = e[1];
  var err = useState("");
  var errMsg = err[0];
  var setErr = err[1];

  var valid = email.indexOf("@") > 0 && email.indexOf(".") > email.indexOf("@");

  var handleSend = useCallback(function () {
    if (!valid) return;
    setPhase("sending");
    setErr("");

    fetch("/api/vault/persist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        company_name: "Mobile Handoff",
        contact_name: null,
        ghost_tax_annual: null,
        entropy_score: null,
        entropy_kappa: null,
        peer_percentile: null,
        audit_roi: null,
        recoverable_annual: null,
        headcount: null,
        industry: null,
        saas_tool_count: null,
        monthly_spend_saas: null,
        monthly_spend_cloud: null,
        monthly_spend_ai: null,
        monthly_spend_total: null,
        session_data: { type: "mobile_handoff" },
        source: "mobile-handoff",
        locale: "en-us",
      }),
    })
      .then(function (res) {
        return res.json().then(function (body) {
          return { status: res.status, body: body };
        });
      })
      .then(function (result) {
        if (result.status === 200) {
          setPhase("sent");
        } else if (result.status === 429) {
          setErr("Too many attempts. Please wait a moment.");
          setPhase("idle");
        } else {
          setErr(result.body.error || "Something went wrong.");
          setPhase("idle");
        }
      })
      .catch(function () {
        setErr("Network error. Check your connection.");
        setPhase("idle");
      });
  }, [valid, email]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: V,
        fontFamily: SA,
        color: T1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 20px",
      }}
    >
      <div style={Object.assign({}, gl, { padding: 28, maxWidth: 360, width: "100%", textAlign: "center" })}>
        {/* Icon */}
        <div style={{ fontSize: 36, marginBottom: 14 }}>🖥</div>

        {phase === "sent" ? (
          <>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🔐</div>
            <p style={{ fontSize: 9, fontFamily: MO, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase", color: TL, marginBottom: 8 }}>
              SECURE LINK SENT
            </p>
            <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Check your inbox.</p>
            <p style={{ fontSize: 12, color: T2, lineHeight: 1.5 }}>
              A secure link to the Valuguard Ghost Tax Audit is waiting at{" "}
              <strong style={{ color: T1 }}>{email}</strong>.
              Open it on your desktop for the full diagnostic experience.
            </p>
          </>
        ) : (
          <>
            {/* Badge */}
            <p style={{ fontSize: 9, fontFamily: MO, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: A, marginBottom: 12 }}>
              VALUGUARD
            </p>

            {/* Headline */}
            <h1 style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.2, letterSpacing: "-.01em", marginBottom: 10 }}>
              This diagnostic requires{" "}
              <span style={{ color: AH }}>desktop-class processing.</span>
            </h1>

            {/* Explanation */}
            <p style={{ fontSize: 12, color: T2, lineHeight: 1.55, marginBottom: 20 }}>
              The Ghost Tax engine renders high-density financial data, interactive charts,
              and peer benchmarking that demand a full-width display.
              Send yourself a secure access link to complete the audit at your workstation.
            </p>

            {/* Error banner */}
            {errMsg && (
              <div style={{ padding: "7px 10px", borderRadius: 6, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", marginBottom: 12, fontSize: 11, color: RD }}>
                {errMsg}
              </div>
            )}

            {/* Email input */}
            <input
              type="email"
              value={email}
              onChange={function (ev) { setEmail(ev.target.value); setErr(""); }}
              disabled={phase === "sending"}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 8,
                border: "1px solid #1e2640",
                background: "#080b14",
                color: T1,
                fontSize: 14,
                fontFamily: MO,
                outline: "none",
                boxSizing: "border-box",
                marginBottom: 10,
                textAlign: "center",
                opacity: phase === "sending" ? 0.5 : 1,
              }}
              onFocus={function (ev) { ev.target.style.borderColor = A; }}
              onBlur={function (ev) { ev.target.style.borderColor = "#1e2640"; }}
            />

            {/* CTA */}
            <button
              onClick={handleSend}
              disabled={!valid || phase === "sending"}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 8,
                border: "none",
                background: phase === "sending" ? "#0f3a2a" : valid ? TL : "#131828",
                color: phase === "sending" ? TL : valid ? V : T3,
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: ".05em",
                textTransform: "uppercase",
                cursor: valid && phase !== "sending" ? "pointer" : "not-allowed",
                transition: "all 0.15s",
              }}
            >
              {phase === "sending"
                ? "SENDING SECURE LINK..."
                : "SEND SECURE ACCESS TO MY WORKSTATION"}
            </button>

            {/* Trust micro-text */}
            <p style={{ fontSize: 8, color: T3, marginTop: 14, lineHeight: 1.5 }}>
              Zero-knowledge encryption. Strict CFO-level confidentiality.
              Your email is used solely to deliver the audit link.
              AES-256 encrypted. US-hosted. Auto-deleted in 30 days.
            </p>

            {/* Trust badges */}
            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
              {[
                { i: "🛡", t: "SOC2 Ready" },
                { i: "🔐", t: "Zero-Knowledge" },
                { i: "🇺🇸", t: "US Hosted" },
              ].map(function (b) {
                return (
                  <span key={b.t} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 8, color: T3 }}>
                    <span style={{ fontSize: 11 }}>{b.i}</span>
                    {b.t}
                  </span>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
