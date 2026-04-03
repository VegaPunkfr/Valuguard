"use client";

import { useState } from "react";
import LinkedInHelper from "./linkedin-helper";

interface ApprovalCardProps {
  prospectName: string;
  prospectTitle: string;
  company: string;
  domain: string;
  country: string;
  headcount?: number;
  industry?: string;
  channel: "email" | "linkedin";
  confidenceScore: number;
  exposureRange?: string;
  linkedinUrl?: string;
  contactEmail?: string;
  message: {
    subject?: string;
    body: string;
    language: string;
  };
  onApprove: () => void;
  onSkip: () => void;
  totalCards: number;
  currentIndex: number;
}

const FLAG: Record<string, string> = {
  DE: "🇩🇪", AT: "🇦🇹", CH: "🇨🇭", NL: "🇳🇱",
  UK: "🇬🇧", GB: "🇬🇧", US: "🇺🇸", FR: "🇫🇷",
};

export default function ApprovalCard({
  prospectName, prospectTitle, company, domain, country,
  headcount, industry, channel, confidenceScore, exposureRange,
  linkedinUrl, contactEmail, message, onApprove, onSkip,
  totalCards, currentIndex,
}: ApprovalCardProps) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const flag = FLAG[country?.toUpperCase()] || "🌍";
  const scoreColor = confidenceScore >= 80 ? "#00CFC4" : confidenceScore >= 50 ? "#B28C28" : "#94A3B8";
  const scoreLabel = confidenceScore >= 80 ? "🟢" : confidenceScore >= 50 ? "🟡" : "🟠";

  const handleApproveEmail = async () => {
    setSending(true);
    try {
      const key = document.cookie.match(/gt-command-key=([^;]+)/)?.[1] || "";
      await fetch("/api/command/send-approved", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-command-key": key || process.env.NEXT_PUBLIC_COMMAND_KEY || "",
        },
        body: JSON.stringify({
          to: contactEmail,
          subject: message.subject || `${domain} — Ghost Tax Analysis`,
          textBody: message.body,
          domain,
          prospectId: domain,
        }),
      });
      setSent(true);
      setTimeout(() => onApprove(), 1500);
    } catch {
      setSending(false);
    }
  };

  return (
    <div
      style={{
        background: "#0A0D19",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 12,
        padding: 0,
        maxWidth: 600,
        margin: "0 auto",
        overflow: "hidden",
        animation: "gt-slideInRight 0.3s ease-out",
      }}
    >
      {/* Header */}
      <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontFamily: "var(--vg-font-mono)", color: "#64748B" }}>
            {currentIndex + 1} / {totalCards}
          </span>
          <span style={{
            fontSize: 11, fontFamily: "var(--vg-font-mono)", fontWeight: 700,
            color: scoreColor, padding: "3px 10px",
            border: `1px solid ${scoreColor}30`, borderRadius: 4,
          }}>
            {scoreLabel} {confidenceScore}/100
          </span>
        </div>

        <div style={{ fontSize: 18, fontWeight: 700, color: "#E2E8F0", marginBottom: 4 }}>
          {prospectName}
        </div>
        <div style={{ fontSize: 13, color: "#94A3B8", marginBottom: 8 }}>
          {prospectTitle} · {company}
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#64748B", fontFamily: "var(--vg-font-mono)" }}>
          <span>{flag} {country}</span>
          {headcount && <span>{headcount} emp.</span>}
          {industry && <span>{industry}</span>}
          <span>{channel === "email" ? "📧 Email" : "💬 LinkedIn"}</span>
        </div>
        {exposureRange && (
          <div style={{
            marginTop: 10, padding: "6px 12px", background: "rgba(0,207,196,0.08)",
            border: "1px solid rgba(0,207,196,0.15)", borderRadius: 6,
            fontSize: 12, fontFamily: "var(--vg-font-mono)", color: "#00CFC4",
          }}>
            Exposition détectée : {exposureRange}
          </div>
        )}
      </div>

      {/* Message */}
      <div style={{ padding: "20px 24px", maxHeight: 300, overflowY: "auto" }}>
        {message.subject && (
          <div style={{
            fontSize: 12, fontFamily: "var(--vg-font-mono)", color: "#B28C28",
            marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.04)",
          }}>
            Objet : {message.subject}
          </div>
        )}
        <div style={{
          fontSize: 13, lineHeight: 1.7, color: "#CBD5E1",
          fontFamily: "var(--vg-font-mono)", whiteSpace: "pre-wrap",
        }}>
          {message.body}
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {sent ? (
          <div style={{
            textAlign: "center", padding: 16, color: "#00CFC4",
            fontFamily: "var(--vg-font-mono)", fontSize: 13, fontWeight: 700,
          }}>
            ✅ {channel === "email" ? `Email envoyé à ${contactEmail}` : "Copié ! Collez sur LinkedIn."}
          </div>
        ) : channel === "linkedin" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <LinkedInHelper
              message={message.body}
              linkedinUrl={linkedinUrl}
              prospectName={prospectName}
              onSent={onApprove}
            />
            <button
              onClick={onSkip}
              style={{
                padding: "12px 20px", background: "transparent",
                border: "1px solid rgba(255,255,255,0.1)", color: "#64748B",
                fontFamily: "var(--vg-font-mono)", fontSize: 11, cursor: "pointer",
                minHeight: 44,
              }}
            >
              ✗ PASSER
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleApproveEmail}
              disabled={sending}
              style={{
                flex: 1, padding: "14px 20px", background: "#00CFC4",
                color: "#060912", border: "none",
                fontFamily: "var(--vg-font-mono)", fontSize: 13, fontWeight: 800,
                letterSpacing: "0.06em", cursor: sending ? "wait" : "pointer",
                minHeight: 48, textTransform: "uppercase",
              }}
            >
              {sending ? "Envoi..." : "✓ APPROUVER → envoi auto"}
            </button>
            <button
              onClick={onSkip}
              style={{
                padding: "14px 20px", background: "transparent",
                border: "1px solid rgba(255,255,255,0.1)", color: "#64748B",
                fontFamily: "var(--vg-font-mono)", fontSize: 11, cursor: "pointer",
                minHeight: 48,
              }}
            >
              ✗
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
