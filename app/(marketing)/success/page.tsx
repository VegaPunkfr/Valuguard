"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { c, f, panel, inset, sectionLabel } from "@/lib/tokens";
import Footer from "@/components/ui/footer";

function SuccessContent() {
  const { t } = useI18n();
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [copied, setCopied] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  return (
    <div style={{ minHeight: "100vh", background: c.bg, color: c.text1 }}>
      <div className="gt-container-sm" style={{ margin: "0 auto", padding: "100px 24px" }}>
        <div className="gt-panel" style={{ padding: "48px 40px", textAlign: "center" }}>
          {/* Check icon */}
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

          <p className="gt-section-label" style={{ color: c.green }}>
            {t("success.badge")}
          </p>

          <h1
            style={{
              fontSize: "clamp(24px, 4vw, 32px)",
              fontWeight: 800,
              marginBottom: 14,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
            }}
          >
            {t("success.title")}
          </h1>

          <p
            style={{
              fontSize: 17,
              color: c.text2,
              lineHeight: 1.65,
              maxWidth: 480,
              margin: "0 auto 28px",
            }}
          >
            {t("success.desc")}
          </p>

          {sessionId && (
            <div className="gt-badge gt-badge--green" style={{ display: "inline-block", marginBottom: 28 }}>
              <span style={{ fontSize: 10, fontFamily: f.mono, color: c.text3 }}>REF: </span>
              <span style={{ fontSize: 10, fontFamily: f.mono, color: c.green, fontWeight: 700 }}>
                {sessionId.slice(0, 16).toUpperCase()}
              </span>
            </div>
          )}

          {/* Next steps */}
          <div style={{ ...inset, padding: "20px 24px", textAlign: "left", margin: "0 auto 32px", maxWidth: 420 }}>
            <p
              style={{
                ...sectionLabel,
                fontSize: 10,
                color: c.accent,
                marginBottom: 14,
              }}
            >
              {t("success.next")}
            </p>
            {[
              { time: t("success.step1.time"), action: t("success.step1.action") },
              { time: t("success.step2.time"), action: t("success.step2.action") },
              { time: t("success.step3.time"), action: t("success.step3.action") },
              { time: t("success.step4.time"), action: t("success.step4.action") },
            ].map((step) => (
              <div key={step.time} style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: f.mono,
                    fontWeight: 700,
                    color: c.green,
                    minWidth: 60,
                    flexShrink: 0,
                  }}
                >
                  {step.time}
                </span>
                <span style={{ fontSize: 14, color: c.text2, lineHeight: 1.45 }}>{step.action}</span>
              </div>
            ))}
          </div>

          {/* Trust badges */}
          <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap", marginBottom: 36 }}>
            {[
              { icon: "\uD83D\uDD10", text: "AES-256" },
              { icon: "\uD83C\uDDEA\uD83C\uDDFA", text: t("success.trust.eu") },
              { icon: "\u23F1", text: t("success.trust.purge") },
            ].map((b) => (
              <div
                key={b.text}
                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: c.text3 }}
              >
                <span style={{ fontSize: 14 }}>{b.icon}</span>
                <span style={{ fontWeight: 500 }}>{b.text}</span>
              </div>
            ))}
          </div>

          {/* LinkedIn Share Button */}
          <button
            onClick={() => {
              const shareText = encodeURIComponent(
                "We just launched a 48h IT cost audit with Ghost Tax. Curious to see what our invisible tech spend looks like. Results incoming...\n\n#ITCost #SaaS #FinOps"
              );
              window.open(
                `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://ghost-tax.com")}`,
                "_blank"
              );
            }}
            className="gt-btn"
            style={{
              background: c.linkedin,
              color: "#fff",
              padding: "14px 28px",
              marginBottom: 28,
            }}
          >
            Share on LinkedIn
          </button>

          {/* Referral Section */}
          <div style={{ ...inset, padding: "20px 24px", textAlign: "center", margin: "0 auto 28px", maxWidth: 420 }}>
            <p style={{ fontSize: 14, color: c.text2, marginBottom: 14, lineHeight: 1.5 }}>
              Know someone who should audit their IT spend?
            </p>
            <button
              onClick={() => {
                navigator.clipboard.writeText("https://ghost-tax.com/intel?ref=client");
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className={copied ? "gt-btn gt-btn-green" : "gt-btn gt-btn-accent-ghost"}
              style={{ fontFamily: f.mono }}
            >
              {copied ? "Link copied!" : "Copy referral link"}
            </button>
          </div>

          {/* Role Qualification */}
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <p style={{ fontSize: 13, color: c.text2, marginBottom: 14 }}>
              Help us personalize your report — what&apos;s your role?
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
              {["CFO", "CIO/CTO", "VP Ops", "Other"].map((role) => (
                <button
                  key={role}
                  onClick={() => {
                    setSelectedRole(role);
                    localStorage.setItem("vg_buyer_role", role);
                  }}
                  className="gt-btn"
                  style={{
                    padding: "7px 18px",
                    borderRadius: 20,
                    background: "rgba(0,0,0,0.22)",
                    border: selectedRole === role ? `1.5px solid ${c.accent}` : `1px solid ${c.border}`,
                    color: selectedRole === role ? c.text1 : c.text3,
                    fontSize: 12,
                  }}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <a href="/" className="gt-btn gt-btn-ghost">
            {t("success.back")}
          </a>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
