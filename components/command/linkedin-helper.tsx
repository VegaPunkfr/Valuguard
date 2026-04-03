"use client";

import { useState } from "react";

interface LinkedInHelperProps {
  message: string;
  linkedinUrl?: string;
  prospectName: string;
  onSent?: () => void;
}

export default function LinkedInHelper({ message, linkedinUrl, prospectName, onSent }: LinkedInHelperProps) {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);

      if (linkedinUrl) {
        window.open(linkedinUrl, "_blank", "noopener,noreferrer");
      }

      setTimeout(() => {
        setCopied(false);
        onSent?.();
      }, 2000);
    } catch {
      // Fallback for clipboard API
      const textarea = document.createElement("textarea");
      textarea.value = message;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      if (linkedinUrl) window.open(linkedinUrl, "_blank");
      setTimeout(() => { setCopied(false); onSent?.(); }, 2000);
    }
  };

  return (
    <button
      onClick={handleClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        width: "100%",
        padding: "16px 24px",
        minHeight: 48,
        background: copied ? "rgba(0,207,196,0.15)" : "#00CFC4",
        color: copied ? "#00CFC4" : "#060912",
        border: copied ? "1px solid #00CFC4" : "none",
        fontFamily: "var(--vg-font-mono, 'JetBrains Mono', monospace)",
        fontSize: 13,
        fontWeight: 800,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
    >
      {copied ? (
        <>✅ Copié ! Collez sur LinkedIn.</>
      ) : (
        <>📋 Copier + Ouvrir LinkedIn — {prospectName}</>
      )}
    </button>
  );
}
