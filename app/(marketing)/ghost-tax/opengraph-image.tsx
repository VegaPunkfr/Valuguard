import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt =
  "Ghost Tax — Detect Your Hidden SaaS Exposure | Decision Intelligence";
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

        {/* Red glow top */}
        <div
          style={{
            position: "absolute",
            top: "-200px",
            left: "50%",
            width: "800px",
            height: "600px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(239,68,68,0.10) 0%, transparent 65%)",
            transform: "translateX(-50%)",
            display: "flex",
          }}
        />

        {/* Blue glow bottom-right */}
        <div
          style={{
            position: "absolute",
            bottom: "-200px",
            right: "-100px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 65%)",
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
            Decision Intelligence
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
              fontSize: 50,
              fontWeight: 800,
              color: "#e4e9f4",
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              display: "flex",
            }}
          >
            Detect your hidden
          </div>
          <div
            style={{
              fontSize: 50,
              fontWeight: 800,
              color: "#ef4444",
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              display: "flex",
            }}
          >
            SaaS exposure
          </div>
        </div>

        {/* Subtext */}
        <div
          style={{
            display: "flex",
            fontSize: 19,
            color: "#8d9bb5",
            marginTop: 24,
            maxWidth: 640,
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          Free calculator — estimate your annual IT waste in 10 seconds
        </div>

        {/* Exposure range display */}
        <div
          style={{
            display: "flex",
            gap: 40,
            marginTop: 40,
            padding: "20px 44px",
            borderRadius: 12,
            border: "1px solid rgba(36,48,78,0.35)",
            background: "rgba(10,13,25,0.85)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "#55637d",
                letterSpacing: "0.15em",
                fontWeight: 600,
                display: "flex",
                fontFamily: "monospace",
              }}
            >
              EXPOSURE RANGE
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: "#ef4444",
                display: "flex",
                fontFamily: "monospace",
              }}
            >
              127k — 340k
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#55637d",
                display: "flex",
                fontFamily: "monospace",
              }}
            >
              EUR / year
            </div>
          </div>

          {/* Divider */}
          <div
            style={{
              width: 1,
              background: "rgba(36,48,78,0.35)",
              display: "flex",
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "#55637d",
                letterSpacing: "0.15em",
                fontWeight: 600,
                display: "flex",
                fontFamily: "monospace",
              }}
            >
              AVERAGE WASTE
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: "#f59e0b",
                display: "flex",
                fontFamily: "monospace",
              }}
            >
              18 — 32%
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#55637d",
                display: "flex",
                fontFamily: "monospace",
              }}
            >
              of IT spend
            </div>
          </div>

          {/* Divider */}
          <div
            style={{
              width: 1,
              background: "rgba(36,48,78,0.35)",
              display: "flex",
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "#55637d",
                letterSpacing: "0.15em",
                fontWeight: 600,
                display: "flex",
                fontFamily: "monospace",
              }}
            >
              AUDITS ANALYZED
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: "#3b82f6",
                display: "flex",
                fontFamily: "monospace",
              }}
            >
              200+
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#55637d",
                display: "flex",
                fontFamily: "monospace",
              }}
            >
              companies
            </div>
          </div>
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
            ghost-tax.com/ghost-tax
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
