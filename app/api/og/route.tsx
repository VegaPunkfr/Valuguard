import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "#FFFFFF",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "60px 80px",
        }}
      >
        {/* Top badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#3b82f6",
            }}
          />
          <span
            style={{
              fontSize: "14px",
              letterSpacing: "0.2em",
              color: "#3b82f6",
              textTransform: "uppercase" as const,
              fontWeight: 600,
            }}
          >
            Decision Intelligence Platform
          </span>
        </div>

        {/* Main title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span
            style={{
              fontSize: "72px",
              fontWeight: 800,
              color: "#0F172A",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            Ghost Tax
          </span>
          <span
            style={{
              fontSize: "28px",
              fontWeight: 400,
              color: "#64748B",
              textAlign: "center",
              lineHeight: 1.4,
              maxWidth: "700px",
            }}
          >
            Find your hidden SaaS &amp; AI spend in 30 seconds
          </span>
        </div>

        {/* Stats bar */}
        <div
          style={{
            display: "flex",
            gap: "48px",
            marginTop: "48px",
            padding: "24px 48px",
            borderRadius: "12px",
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: "32px", fontWeight: 700, color: "#3b82f6" }}>€490</span>
            <span style={{ fontSize: "13px", color: "#94A3B8", marginTop: "4px" }}>One-time</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: "32px", fontWeight: 700, color: "#10b981" }}>48h</span>
            <span style={{ fontSize: "13px", color: "#94A3B8", marginTop: "4px" }}>Delivery</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: "32px", fontWeight: 700, color: "#3b82f6" }}>80x</span>
            <span style={{ fontSize: "13px", color: "#94A3B8", marginTop: "4px" }}>Avg ROI</span>
          </div>
        </div>

        {/* CTA */}
        <div
          style={{
            marginTop: "40px",
            padding: "14px 36px",
            borderRadius: "8px",
            background: "#3b82f6",
            color: "#FFFFFF",
            fontSize: "17px",
            fontWeight: 700,
          }}
        >
          Free Scan — No Credit Card Required
        </div>

        {/* URL */}
        <span
          style={{
            marginTop: "24px",
            fontSize: "16px",
            color: "#94A3B8",
          }}
        >
          ghost-tax.com
        </span>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
