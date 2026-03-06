"use client";

import { useState, useEffect, useRef } from "react";

const MO = "ui-monospace,'Cascadia Code','Fira Code',monospace";

export type LogEntry = {
  text: string;
  type: "info" | "success" | "warn";
};

type Props = {
  logs: LogEntry[];
  running: boolean;
};

const typeColor: Record<LogEntry["type"], string> = {
  info: "#8d9bb5",
  success: "#34d399",
  warn: "#f59e0b",
};

export default function IngestionConsole({ logs, running }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  return (
    <div
      style={{
        background: "#030508",
        border: "1px solid rgba(36,48,78,0.28)",
        borderRadius: 10,
        padding: "16px 18px",
        fontFamily: MO,
        fontSize: 12,
        lineHeight: 1.75,
        minHeight: 180,
        maxHeight: 240,
        overflowY: "auto",
        position: "relative",
      }}
    >
      {/* Prompt prefix */}
      <div style={{ color: "#55637d", marginBottom: 8, fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase" }}>
        oracle-engine v3.1 :: ingestion pipeline
      </div>

      {logs.map((log, i) => (
        <div
          key={i}
          style={{
            color: typeColor[log.type],
            opacity: 0,
            animation: "vg-fade-in 0.3s ease forwards",
            animationDelay: `${i * 0.05}s`,
          }}
        >
          <span style={{ color: "#55637d", marginRight: 8 }}>{">"}</span>
          {log.text}
        </div>
      ))}

      {running && (
        <div style={{ color: "#3b82f6", animation: "vg-pulse-subtle 1.5s ease-in-out infinite" }}>
          <span style={{ color: "#55637d", marginRight: 8 }}>{">"}</span>
          _
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}
