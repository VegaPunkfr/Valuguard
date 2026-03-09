import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt =
  "Free SaaS Exposure Scan — Ghost Tax Decision Intelligence";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#060912",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Grid overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundImage:
              "linear-gradient(rgba(36,48,78,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(36,48,78,0.12) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            display: "flex",
          }}
        />

        {/* Blue glow center */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            left: "50%",
            width: "700px",
            height: "700px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 60%)",
            transform: "translateX(-50%)",
            display: "flex",
          }}
        />

        {/* Cyan glow bottom-left */}
        <div
          style={{
            position: "absolute",
            bottom: "-250px",
            left: "-100px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(34,211,238,0.06) 0%, transparent 60%)",
            display: "flex",
          }}
        />

        {/* Top label */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: "#3b82f6",
              display: "flex",
            }}
          />
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.2em",
              color: "#8d9bb5",
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            GHOST TAX
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#55637d",
              letterSpacing: "0.05em",
              display: "flex",
            }}
          >
            Decision Room
          </div>
        </div>

        {/* Main heading */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: 6,
          }}
        >
          <div
            style={{
              fontSize: 54,
              fontWeight: 800,
              color: "#e4e9f4",
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              display: "flex",
            }}
          >
            Free SaaS
          </div>
          <div
            style={{
              fontSize: 54,
              fontWeight: 800,
              color: "#3b82f6",
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              display: "flex",
            }}
          >
            Exposure Scan
          </div>
        </div>

        {/* Subtext */}
        <div
          style={{
            display: "flex",
            fontSize: 19,
            color: "#8d9bb5",
            marginTop: 24,
            maxWidth: 700,
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          Enter a domain. Get a structured financial exposure analysis in
          seconds.
        </div>

        {/* Phase indicators */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 44,
            alignItems: "center",
          }}
        >
          {/* Phase blocks */}
          {[
            { label: "EXPOSURE", color: "#ef4444" },
            { label: "PROOF", color: "#f59e0b" },
            { label: "BENCHMARK", color: "#22d3ee" },
            { label: "SCENARIOS", color: "#34d399" },
            { label: "DECISION PACK", color: "#3b82f6" },
          ].map((phase) => (
            <div
              key={phase.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 140,
                  height: 4,
                  borderRadius: 2,
                  background: phase.color,
                  opacity: 0.7,
                  display: "flex",
                }}
              />
              <div
                style={{
                  fontSize: 9,
                  color: "#55637d",
                  letterSpacing: "0.15em",
                  fontWeight: 600,
                  display: "flex",
                  fontFamily: "monospace",
                }}
              >
                {phase.label}
              </div>
            </div>
          ))}
        </div>

        {/* Features row */}
        <div
          style={{
            display: "flex",
            gap: 32,
            marginTop: 36,
          }}
        >
          {[
            "21-Phase Analysis",
            "Market Memory",
            "Peer Benchmarks",
            "No Integration",
          ].map((feat) => (
            <div
              key={feat}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "#3b82f6",
                  opacity: 0.5,
                  display: "flex",
                }}
              />
              <div
                style={{
                  fontSize: 13,
                  color: "#55637d",
                  display: "flex",
                  fontFamily: "monospace",
                }}
              >
                {feat}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom branding */}
        <div
          style={{
            position: "absolute",
            bottom: 28,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: "#3a4560",
              letterSpacing: "0.05em",
              display: "flex",
              fontFamily: "monospace",
            }}
          >
            ghost-tax.com/intel
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
