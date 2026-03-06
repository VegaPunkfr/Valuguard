"use client";

import { motion } from "framer-motion";

const MO = "ui-monospace,'Cascadia Code','Fira Code',monospace";
const A = "#3b82f6";
const AH = "#60a5fa";
const T1 = "#e0e6f2";
const T2 = "#8d9bb5";
const T3 = "#55637d";
const BD = "rgba(36,48,78,0.32)";
const TL = "#34d399";

type Status = "idle" | "connecting" | "connected";

type Props = {
  icon: React.ReactNode;
  label: string;
  objectives: string[];
  security: string;
  status: Status;
  onConnect: () => void;
  connectLabel: string;
  connectedLabel: string;
};

const gl = {
  background: "rgba(11,14,24,0.72)",
  backdropFilter: "blur(18px) saturate(1.15)",
  WebkitBackdropFilter: "blur(18px) saturate(1.15)",
  border: "1px solid " + BD,
  borderRadius: 12,
  boxShadow: "0 4px 32px rgba(0,0,0,0.28)",
};

export default function IngestionConnector({
  icon,
  label,
  objectives,
  security,
  status,
  onConnect,
  connectLabel,
  connectedLabel,
}: Props) {
  const isActive = status !== "idle";

  return (
    <motion.div
      whileHover={status === "idle" ? { scale: 1.01, borderColor: "rgba(59,130,246,0.25)" } : {}}
      style={{
        ...gl,
        padding: 24,
        cursor: status === "idle" ? "pointer" : "default",
        transition: "border-color 0.2s, box-shadow 0.2s",
        borderColor: isActive ? "rgba(52,211,153,0.2)" : BD,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Status indicator */}
      <div
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: status === "connected" ? TL : status === "connecting" ? "#f59e0b" : "#55637d",
          boxShadow: status === "connected" ? "0 0 8px rgba(52,211,153,0.4)" : "none",
          animation: status === "connecting" ? "vg-pulse-subtle 1s ease-in-out infinite" : "none",
        }}
      />

      {/* Icon + Label */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: "rgba(59,130,246,0.06)",
            border: "1px solid rgba(59,130,246,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: A,
            fontSize: 18,
          }}
        >
          {icon}
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: T1, fontFamily: MO, letterSpacing: ".02em" }}>
            {label}
          </p>
        </div>
      </div>

      {/* Objectives */}
      <div style={{ marginBottom: 16 }}>
        {objectives.map((obj, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
            <span style={{ fontFamily: MO, fontSize: 9, color: A, marginTop: 2, flexShrink: 0 }}>
              {status === "connected" ? "\u2713" : "\u2022"}
            </span>
            <span style={{ fontSize: 12, color: T2, lineHeight: 1.4 }}>{obj}</span>
          </div>
        ))}
      </div>

      {/* Security notice */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 10px",
          borderRadius: 6,
          background: "rgba(52,211,153,0.04)",
          border: "1px solid rgba(52,211,153,0.08)",
          marginBottom: 16,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TL} strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span style={{ fontSize: 10, color: TL, fontFamily: MO, letterSpacing: ".04em" }}>
          {security}
        </span>
      </div>

      {/* Connect button */}
      <button
        onClick={status === "idle" ? onConnect : undefined}
        disabled={status !== "idle"}
        style={{
          width: "100%",
          padding: "10px 0",
          borderRadius: 8,
          border: status === "connected" ? "1px solid rgba(52,211,153,0.2)" : "1px solid rgba(59,130,246,0.2)",
          background: status === "connected" ? "rgba(52,211,153,0.06)" : status === "connecting" ? "rgba(59,130,246,0.04)" : "rgba(59,130,246,0.08)",
          color: status === "connected" ? TL : status === "connecting" ? T3 : AH,
          fontFamily: MO,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: ".08em",
          textTransform: "uppercase" as const,
          cursor: status === "idle" ? "pointer" : "default",
          transition: "all 0.2s",
        }}
      >
        {status === "connected" ? connectedLabel : status === "connecting" ? "..." : connectLabel}
      </button>
    </motion.div>
  );
}
