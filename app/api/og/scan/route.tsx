import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  const dot = (color: string) => ({
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    background: color,
    flexShrink: 0,
  });

  const row = (done: boolean, active?: boolean) => ({
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "14px",
    opacity: !done && !active ? 0.35 : 1,
  });

  const label = (active?: boolean) => ({
    fontSize: "17px",
    color: "#e2e8f0",
    fontWeight: active ? 700 : 400,
  });

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
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10b981" }} />
          <span style={{ fontSize: "14px", letterSpacing: "0.18em", color: "#10b981", textTransform: "uppercase" as const, fontWeight: 600 }}>
            Live Scan — acme-corp.com
          </span>
        </div>

        <div style={{
          display: "flex",
          alignItems: "center",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "12px",
          padding: "18px 24px",
          marginBottom: "24px",
        }}>
          <span style={{ fontSize: "18px", color: "#e2e8f0", fontWeight: 600 }}>acme-corp.com</span>
          <div style={{ marginLeft: "auto", background: "#3b82f6", borderRadius: "8px", padding: "10px 24px" }}>
            <span style={{ fontSize: "14px", color: "#fff", fontWeight: 700 }}>Scanning...</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
          <div style={row(true)}>
            <div style={dot("#10b981")} />
            <span style={label()}>Enrichment and Context</span>
          </div>
          <div style={row(true)}>
            <div style={dot("#10b981")} />
            <span style={label()}>Exposure Detection</span>
          </div>
          <div style={row(true)}>
            <div style={dot("#10b981")} />
            <span style={label()}>Loss Velocity Analysis</span>
          </div>
          <div style={row(true)}>
            <div style={dot("#10b981")} />
            <span style={label()}>Causal Graph Mapping</span>
          </div>
          <div style={row(true)}>
            <div style={dot("#10b981")} />
            <span style={label()}>Proof Engine — 12 signals found</span>
          </div>
          <div style={row(true)}>
            <div style={dot("#10b981")} />
            <span style={label()}>Peer Comparison</span>
          </div>
          <div style={row(true, true)}>
            <div style={dot("#3b82f6")} />
            <span style={label(true)}>Negotiation Intelligence</span>
            <span style={{ fontSize: "13px", color: "#3b82f6" }}>analyzing...</span>
          </div>
          <div style={row(false)}>
            <div style={dot("#1e293b")} />
            <span style={{ fontSize: "17px", color: "#475569" }}>Decision Pack Generation</span>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px" }}>
          <span style={{ fontSize: "14px", color: "#475569" }}>21 intelligence phases — no credentials needed</span>
          <span style={{ fontSize: "14px", color: "#475569" }}>ghost-tax.com</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
