import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt =
  "Ghost Tax Pricing — Financial Exposure Detection from $490";
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

        {/* Green glow top */}
        <div
          style={{
            position: "absolute",
            top: "-200px",
            left: "50%",
            width: "700px",
            height: "600px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(52,211,153,0.08) 0%, transparent 60%)",
            transform: "translateX(-50%)",
            display: "flex",
          }}
        />

        {/* Blue glow bottom */}
        <div
          style={{
            position: "absolute",
            bottom: "-200px",
            right: "-50px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 60%)",
            display: "flex",
          }}
        />

        {/* Top label */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 28,
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
            Pricing
          </div>
        </div>

        {/* Price display */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 4,
          }}
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 800,
              color: "#e4e9f4",
              letterSpacing: "-0.04em",
              lineHeight: 1,
              display: "flex",
              fontFamily: "monospace",
            }}
          >
            $490
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: "#55637d",
              display: "flex",
              fontFamily: "monospace",
            }}
          >
            FROM
          </div>
        </div>

        {/* One-time label */}
        <div
          style={{
            display: "flex",
            fontSize: 16,
            color: "#34d399",
            marginTop: 8,
            letterSpacing: "0.1em",
            fontWeight: 600,
            fontFamily: "monospace",
          }}
        >
          ONE-TIME PAYMENT
        </div>

        {/* Tagline */}
        <div
          style={{
            display: "flex",
            fontSize: 22,
            color: "#8d9bb5",
            marginTop: 28,
            maxWidth: 640,
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          Full financial exposure detection. Decision Pack delivered in 48h.
        </div>

        {/* Deliverables row */}
        <div
          style={{
            display: "flex",
            gap: 20,
            marginTop: 40,
          }}
        >
          {[
            { label: "CFO Memo", color: "#3b82f6" },
            { label: "CIO Memo", color: "#22d3ee" },
            { label: "Procurement Brief", color: "#3b82f6" },
            { label: "Board Slide", color: "#34d399" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                borderRadius: 8,
                border: "1px solid rgba(36,48,78,0.35)",
                background: "rgba(10,13,25,0.85)",
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: item.color,
                  display: "flex",
                }}
              />
              <div
                style={{
                  fontSize: 13,
                  color: "#8d9bb5",
                  display: "flex",
                  fontFamily: "monospace",
                  letterSpacing: "0.02em",
                }}
              >
                {item.label}
              </div>
            </div>
          ))}
        </div>

        {/* Comparison line */}
        <div
          style={{
            display: "flex",
            fontSize: 14,
            color: "#3a4560",
            marginTop: 28,
            fontFamily: "monospace",
          }}
        >
          vs. 15k-50k EUR at Big 4 consultancies
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
            ghost-tax.com/pricing
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
