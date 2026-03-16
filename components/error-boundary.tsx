"use client";
import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary]", error, info);
  }
  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{
          minHeight: "60vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "#060912", color: "#e4e9f4", fontFamily: "var(--font-mono)",
          gap: 16, padding: 32,
        }}>
          <div style={{
            padding: "24px 32px", borderRadius: 12,
            background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.20)",
            maxWidth: 480, textAlign: "center",
          }}>
            <p style={{ fontSize: 11, color: "#ef4444", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 12 }}>ANALYSIS ERROR</p>
            <p style={{ fontSize: 14, color: "#8d9bb5", lineHeight: 1.6, marginBottom: 16 }}>
              An unexpected error occurred. Your scan data is safe.
            </p>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
              style={{
                padding: "10px 24px", borderRadius: 8, border: "1px solid rgba(59,130,246,0.3)",
                background: "rgba(59,130,246,0.08)", color: "#60a5fa",
                fontSize: 12, fontWeight: 700, letterSpacing: ".06em", cursor: "pointer",
              }}
            >RETRY</button>
          </div>
          <p style={{ fontSize: 9, color: "#3a4560", letterSpacing: ".08em" }}>
            {process.env.NODE_ENV === "development" ? this.state.error?.message : "Contact support if this persists."}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
