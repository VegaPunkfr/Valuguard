import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          background: "#060912",
          border: "1.5px solid #3b82f6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: 15,
            fontWeight: 900,
            color: "#3b82f6",
            letterSpacing: "-0.02em",
          }}
        >
          VG
        </span>
      </div>
    ),
    { ...size }
  );
}
