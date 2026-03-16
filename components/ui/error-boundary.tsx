"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { c, f, sp } from "@/lib/tokens";

/* ─── i18n-aware fallback strings ─────────────────── */
function getLocale(): string {
  if (typeof window === "undefined") return "en";
  try {
    return localStorage.getItem("vg-locale") || "en";
  } catch {
    return "en";
  }
}

const messages: Record<string, Record<string, string>> = {
  en: {
    "error.title": "Something went wrong",
    "error.description": "Try refreshing the page or contact support.",
    "error.reload": "Reload",
  },
  fr: {
    "error.title": "Une erreur est survenue",
    "error.description":
      "Essayez de rafraîchir la page ou contactez le support.",
    "error.reload": "Recharger",
  },
  de: {
    "error.title": "Etwas ist schiefgelaufen",
    "error.description":
      "Versuchen Sie, die Seite zu aktualisieren oder kontaktieren Sie den Support.",
    "error.reload": "Neu laden",
  },
};

/* ─── Types ───────────────────────────────────────── */
interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/* ─── Error Boundary ──────────────────────────────── */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const locale = getLocale();
    const t = (key: string) =>
      messages[locale]?.[key] ?? messages.en[key] ?? key;

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#060912",
          padding: sp["6"],
          textAlign: "center",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: c.redBg,
            border: `1px solid ${c.redBd}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: sp["4"],
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke={c.red}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: "1.5rem",
            fontFamily: f.sans,
            fontWeight: 700,
            color: c.text1,
            margin: 0,
            marginBottom: sp["2"],
            letterSpacing: "-0.02em",
          }}
        >
          {t("error.title")}
        </h1>

        {/* Description */}
        <p
          style={{
            fontSize: "0.938rem",
            fontFamily: f.sans,
            color: c.text2,
            margin: 0,
            marginBottom: sp["5"],
            maxWidth: 380,
            lineHeight: 1.6,
          }}
        >
          {t("error.description")}
        </p>

        {/* Reload button */}
        <button
          onClick={this.handleReload}
          style={{
            padding: "10px 28px",
            borderRadius: 10,
            border: `1px solid ${c.accentBd}`,
            background: c.accentBg,
            color: c.accent,
            fontSize: "0.875rem",
            fontFamily: f.mono,
            fontWeight: 600,
            letterSpacing: "0.04em",
            cursor: "pointer",
            transition: "background 200ms, border-color 200ms",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "hsla(216, 91%, 65%, 0.16)";
            e.currentTarget.style.borderColor = c.accent;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = c.accentBg;
            e.currentTarget.style.borderColor = "hsla(216, 91%, 65%, 0.20)";
          }}
        >
          {t("error.reload")}
        </button>
      </div>
    );
  }
}
