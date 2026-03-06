"use client";
/**
 * VALUGUARD — RECLAIM CTA (WIRED TO API)
 *
 * Drop-in component that replaces any static RECLAIM button.
 * Handles the full lifecycle:
 *   idle → collecting email → submitting → success / error
 *
 * Wired to: POST /api/vault/persist
 * Handles: 200, 400 (field errors), 429 (rate limit), 500 (server)
 *
 * Usage in any parent component:
 *   <ReclaimCta diagnosticData={results} />
 *
 * 100% USD. Zero French. Production-ready.
 */
"use client";

import { useState, useCallback } from "react";

// ── Tokens ─────────────────────────────────────────
const V = "#060912";
const A = "#3b82f6";
const AH = "#60a5fa";
const T1 = "#e0e6f2";
const T2 = "#8d9bb5";
const T3 = "#55637d";
const RD = "#ef4444";
const OR = "#f59e0b";
const TL = "#34d399";
const BD = "rgba(36,48,78,0.32)";
const MO = "ui-monospace,'Cascadia Code','Fira Code',monospace";
const SA = "system-ui,-apple-system,sans-serif";

const gl = {
  background: "rgba(11,14,24,0.72)",
  backdropFilter: "blur(18px) saturate(1.15)",
  WebkitBackdropFilter: "blur(18px) saturate(1.15)",
  border: "1px solid " + BD,
  borderRadius: 12,
  boxShadow: "0 4px 32px rgba(0,0,0,0.28)",
};

function fmt(n, s) {
  if (s && n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  if (s && n >= 1e4) return "$" + Math.round(n / 1e3) + "k";
  return "$" + Math.round(n).toLocaleString("en-US");
}

// ── Types ──────────────────────────────────────────

/**
 * @typedef {"idle"|"input"|"submitting"|"success"|"error"} CtaPhase
 */

/**
 * Diagnostic data passed from the estimator/peer-gap parent.
 * All fields optional — the CTA sends whatever is available.
 */

// ── Spinner ────────────────────────────────────────
function Spinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 0.8s linear infinite" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" stroke="rgba(6,9,18,0.3)" strokeWidth="3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke={V} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ══════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════
export default function ReclaimCta({ diagnosticData }) {
  var d = diagnosticData || {};

  var [phase, setPhase] = useState("idle");         // idle | input | submitting | success | error
  var [email, setEmail] = useState("");
  var [name, setName] = useState("");
  var [company, setCompany] = useState("");
  var [errorMsg, setErrorMsg] = useState("");
  var [errorField, setErrorField] = useState("");
  var [vaultId, setVaultId] = useState("");
  var [retryAfter, setRetryAfter] = useState(0);

  var recoverable = d.recoverable_annual || d.recoverable || Math.round((d.mid || d.ghost_tax_annual || 100000) * 0.6);

  var validEmail = email.indexOf("@") > 0 && email.indexOf(".") > email.indexOf("@");
  var validCompany = company.trim().length >= 2;
  var canSubmit = validEmail && validCompany && phase !== "submitting";

  var handleSubmit = useCallback(function() {
    if (!canSubmit) return;

    setPhase("submitting");
    setErrorMsg("");
    setErrorField("");

    var payload = {
      email: email.trim().toLowerCase(),
      company_name: company.trim(),
      contact_name: name.trim() || null,
      ghost_tax_annual: d.ghost_tax_annual || d.mid || null,
      ghost_tax_low: d.ghost_tax_low || d.lo || null,
      ghost_tax_high: d.ghost_tax_high || d.hi || null,
      entropy_score: d.entropy_score || d.grav || null,
      entropy_kappa: d.entropy_kappa || d.kappa || null,
      peer_percentile: d.peer_percentile || d.peerPct || null,
      audit_roi: d.audit_roi || d.roi || null,
      recoverable_annual: recoverable,
      headcount: d.headcount || d.emp || null,
      industry: d.industry || d.ind || null,
      saas_tool_count: d.saas_tool_count || d.tools || null,
      monthly_spend_saas: d.monthly_spend_saas || d.saas || null,
      monthly_spend_cloud: d.monthly_spend_cloud || d.cloud || null,
      monthly_spend_ai: d.monthly_spend_ai || d.ai || null,
      monthly_spend_total: d.monthly_spend_total || d.tot || null,
      session_data: d.session_data || d,
      source: d.source || "cockpit-cta",
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      locale: "en-us",
    };

    fetch("/api/vault/persist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function(res) {
        return res.json().then(function(body) {
          return { status: res.status, body: body };
        });
      })
      .then(function(result) {
        if (result.status === 200) {
          setVaultId(result.body.id || "");
          setPhase("success");
        } else if (result.status === 429) {
          setRetryAfter(result.body.retryAfter || 60);
          setErrorMsg("Too many attempts. Please wait " + (result.body.retryAfter || 60) + " seconds.");
          setPhase("error");
        } else if (result.status === 400) {
          setErrorMsg(result.body.error || "Please check your input.");
          setErrorField(result.body.field || "");
          setPhase("input");
        } else {
          setErrorMsg(result.body.error || "Something went wrong. Please try again.");
          setPhase("error");
        }
      })
      .catch(function() {
        setErrorMsg("Network error. Check your connection and try again.");
        setPhase("error");
      });
  }, [canSubmit, email, company, name, d, recoverable]);

  // ── IDLE STATE: Just the teaser button ──────────
  if (phase === "idle") {
    return (
      <div style={Object.assign({}, gl, { padding: 24, textAlign: "center" })}>
        <p style={{ fontSize: 9, fontFamily: MO, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: RD, marginBottom: 5 }}>
          RECOVERABLE GHOST TAX
        </p>
        <p style={{ fontFamily: MO, fontSize: 34, fontWeight: 800, color: TL, lineHeight: 1, letterSpacing: "-.02em", marginBottom: 4 }}>
          {fmt(recoverable)}
          <span style={{ fontSize: 14, color: T3, fontWeight: 400 }}>/yr</span>
        </p>
        <p style={{ fontSize: 10, color: T3, marginBottom: 18 }}>
          Conservative 60% recovery of your estimated Ghost Tax.
        </p>
        <button
          onClick={function() { setPhase("input"); }}
          style={{ padding: "14px 32px", borderRadius: 8, border: "none", background: TL, color: V, fontSize: 13, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.15s" }}
        >
          RECLAIM {fmt(recoverable, true)} NOW
        </button>
        <p style={{ fontSize: 8, color: T3, marginTop: 10 }}>
          Zero-Knowledge protocol. Data stays in-browser until you opt in.
        </p>
      </div>
    );
  }

  // ── SUCCESS STATE: Vault secured ────────────────
  if (phase === "success") {
    return (
      <div style={Object.assign({}, gl, { padding: 28, textAlign: "center", borderColor: "rgba(52,211,153,0.25)" })}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🔐</div>
        <p style={{ fontSize: 9, fontFamily: MO, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase", color: TL, marginBottom: 8 }}>
          VAULT SECURED
        </p>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: T1, lineHeight: 1.2, marginBottom: 8 }}>
          Your {fmt(recoverable, true)} Recovery Protocol is active.
        </h2>
        <p style={{ fontSize: 13, color: T2, lineHeight: 1.6, maxWidth: 440, margin: "0 auto 16px" }}>
          Our team will reach out within 4 hours to finalize the audit scope.
          Check your email at <strong style={{ color: T1 }}>{email}</strong> for
          the Executive Summary PDF link.
        </p>

        {/* Vault ID badge */}
        {vaultId && (
          <div style={{ display: "inline-block", padding: "6px 14px", borderRadius: 6, background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.18)", marginBottom: 16 }}>
            <span style={{ fontSize: 9, fontFamily: MO, color: T3 }}>VAULT ID: </span>
            <span style={{ fontSize: 9, fontFamily: MO, color: TL, fontWeight: 700 }}>{vaultId.slice(0, 8).toUpperCase()}</span>
          </div>
        )}

        {/* Trust guarantees */}
        <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap", marginTop: 8 }}>
          {[
            { icon: "🔐", text: "AES-256 encrypted" },
            { icon: "🇺🇸", text: "US data residency" },
            { icon: "⏱", text: "30-day auto-delete" },
            { icon: "🛡", text: "Zero-Knowledge audit" },
          ].map(function(t) {
            return (
              <div key={t.text} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, color: T2 }}>
                <span style={{ fontSize: 12 }}>{t.icon}</span>
                <span style={{ fontWeight: 500 }}>{t.text}</span>
              </div>
            );
          })}
        </div>

        {/* What happens next */}
        <div style={{ marginTop: 20, padding: "14px 16px", borderRadius: 8, background: "rgba(0,0,0,0.15)", border: "1px solid rgba(36,48,78,0.15)", textAlign: "left", maxWidth: 400, margin: "20px auto 0" }}>
          <p style={{ fontSize: 9, fontFamily: MO, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: A, marginBottom: 8 }}>WHAT HAPPENS NEXT</p>
          {[
            { time: "Now", action: "Your diagnostic is securely stored in your Vault" },
            { time: "4 hours", action: "A recovery specialist reviews your profile" },
            { time: "24 hours", action: "You receive a tailored audit scope + proposal" },
            { time: "48 hours", action: "Full Ghost Tax report delivered after data upload" },
          ].map(function(step) {
            return (
              <div key={step.time} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 9, fontFamily: MO, fontWeight: 700, color: TL, minWidth: 52, flexShrink: 0 }}>{step.time}</span>
                <span style={{ fontSize: 11, color: T2, lineHeight: 1.4 }}>{step.action}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── ERROR STATE: Retryable ──────────────────────
  if (phase === "error") {
    return (
      <div style={Object.assign({}, gl, { padding: 24, textAlign: "center", borderColor: "rgba(239,68,68,0.20)" })}>
        <p style={{ fontSize: 16, fontWeight: 700, color: RD, marginBottom: 8 }}>
          {retryAfter > 0 ? "⏱ Rate Limited" : "⚠ Submission Failed"}
        </p>
        <p style={{ fontSize: 13, color: T2, marginBottom: 16, lineHeight: 1.5 }}>
          {errorMsg}
        </p>
        <button
          onClick={function() { setPhase("input"); setErrorMsg(""); setRetryAfter(0); }}
          style={{ padding: "11px 24px", borderRadius: 8, border: "none", background: A, color: "#fff", fontSize: 12, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", cursor: "pointer" }}
        >
          TRY AGAIN
        </button>
      </div>
    );
  }

  // ── INPUT + SUBMITTING STATE: Form + loading ────
  var isSubmitting = phase === "submitting";

  return (
    <div style={Object.assign({}, gl, { padding: 24 })}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <p style={{ fontSize: 9, fontFamily: MO, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: RD, marginBottom: 4 }}>
          SECURE YOUR RECOVERY
        </p>
        <p style={{ fontSize: 16, fontWeight: 700, color: T1, marginBottom: 4 }}>
          Claim your {fmt(recoverable, true)}/yr Ghost Tax recovery
        </p>
        <p style={{ fontSize: 12, color: T2, lineHeight: 1.5 }}>
          Your diagnostic data will be encrypted and stored in your personal Vault.
        </p>
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", marginBottom: 12, fontSize: 11, color: RD }}>
          {errorMsg}{errorField ? " (field: " + errorField + ")" : ""}
        </div>
      )}

      {/* Form fields */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
        {[
          { key: "name", label: "Your Name", value: name, set: setName, ph: "Jane Smith", type: "text", required: false },
          { key: "email", label: "Work Email", value: email, set: setEmail, ph: "jane@company.com", type: "email", required: true },
          { key: "company", label: "Company", value: company, set: setCompany, ph: "Acme Corp", type: "text", required: true },
        ].map(function(f) {
          var hasError = errorField === (f.key === "name" ? "contact_name" : f.key === "company" ? "company_name" : f.key);
          return (
            <div key={f.key}>
              <label style={{ display: "block", fontSize: 9, letterSpacing: ".08em", textTransform: "uppercase", color: T3, fontWeight: 500, marginBottom: 4 }}>
                {f.label}{f.required ? " *" : ""}
              </label>
              <input
                type={f.type}
                value={f.value}
                onChange={function(e) { f.set(e.target.value); if (errorField) setErrorField(""); }}
                disabled={isSubmitting}
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: 7,
                  border: "1px solid " + (hasError ? RD + "50" : "#1e2640"),
                  background: isSubmitting ? "#0a0d16" : "#080b14",
                  color: isSubmitting ? T3 : T1,
                  fontSize: 13, fontFamily: MO, outline: "none",
                  boxSizing: "border-box",
                  opacity: isSubmitting ? 0.6 : 1,
                  transition: "all 0.15s",
                }}
                onFocus={function(e) { if (!isSubmitting) e.target.style.borderColor = A; }}
                onBlur={function(e) { e.target.style.borderColor = hasError ? RD + "50" : "#1e2640"; }}
              />
            </div>
          );
        })}
      </div>

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        style={{
          width: "100%", padding: "14px", borderRadius: 8, border: "none",
          background: isSubmitting ? "#0f3a2a" : canSubmit ? TL : "#131828",
          color: isSubmitting ? TL : canSubmit ? V : T3,
          fontSize: 13, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase",
          cursor: canSubmit ? "pointer" : "not-allowed",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          transition: "all 0.15s",
        }}
      >
        {isSubmitting ? (
          <>
            <Spinner />
            <span>Securing your vault...</span>
          </>
        ) : canSubmit ? (
          "🔐 RECLAIM " + fmt(recoverable, true) + " — SECURE MY VAULT"
        ) : (
          "Enter email and company to continue"
        )}
      </button>

      {/* Privacy note */}
      <p style={{ fontSize: 8, color: T3, textAlign: "center", marginTop: 10, lineHeight: 1.4 }}>
        By submitting, you consent to Valuguard securely storing your diagnostic data.
        AES-256 encrypted. US-hosted (Virginia). Auto-deleted in 30 days.
        Zero-Knowledge protocol — we never access your source systems.
      </p>
    </div>
  );
}
