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
          background: "linear-gradient(135deg, #060912 0%, #0c1220 50%, #111827 100%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "50px 70px",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444" }} />
            <span style={{ fontSize: "13px", letterSpacing: "0.2em", color: "#ef4444", textTransform: "uppercase" as const, fontWeight: 600 }}>
              Exposure Detected — acme-corp.com
            </span>
          </div>
          <span style={{ fontSize: "13px", color: "#475569" }}>Ghost Tax Intelligence Report</span>
        </div>

        {/* Main exposure card */}
        <div style={{
          display: "flex",
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: "16px",
          padding: "32px 40px",
          gap: "48px",
          marginBottom: "24px",
        }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "13px", color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Annual Hidden Exposure</span>
            <span style={{ fontSize: "52px", fontWeight: 800, color: "#ef4444", lineHeight: 1.1, marginTop: "4px" }}>€127,000 — €189,000</span>
            <span style={{ fontSize: "16px", color: "#f87171", marginTop: "8px" }}>That's €348 — €518 leaking every day</span>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
          {[
            { label: "SaaS Tools Detected", value: "147", color: "#3b82f6" },
            { label: "Ghost Licenses", value: "38", color: "#ef4444" },
            { label: "Redundant Tools", value: "12", color: "#3b82f6" },
            { label: "Confidence Score", value: "87/100", color: "#10b981" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "12px",
                padding: "20px 16px",
              }}
            >
              <span style={{ fontSize: "32px", fontWeight: 700, color: stat.color }}>{stat.value}</span>
              <span style={{ fontSize: "11px", color: "#64748b", marginTop: "6px", textAlign: "center" }}>{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Top findings */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          background: "rgba(255,255,255,0.03)",
          borderRadius: "12px",
          padding: "20px 24px",
        }}>
          <span style={{ fontSize: "11px", color: "#64748b", letterSpacing: "0.15em", textTransform: "uppercase" as const }}>Top Findings</span>
          {[
            "47 Salesforce licenses assigned to departed employees — €56,400/yr waste",
            "Slack + Teams + Google Chat running simultaneously — €23,000/yr redundancy",
            "Datadog contract auto-renewed at +22% above market rate",
          ].map((finding) => (
            <div key={finding} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <span style={{ color: "#ef4444", fontSize: "14px", marginTop: "2px" }}>→</span>
              <span style={{ fontSize: "14px", color: "#cbd5e1", lineHeight: 1.5 }}>{finding}</span>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: "16px" }}>
          <span style={{ fontSize: "14px", color: "#3b82f6", fontWeight: 600 }}>Full Decision Pack: €490 • Delivered in 48h</span>
          <span style={{ fontSize: "13px", color: "#475569" }}>ghost-tax.com</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
