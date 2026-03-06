"use client";

import { motion } from "framer-motion";

const A = "#3b82f6";
const AH = "#60a5fa";
const T1 = "#e0e6f2";
const T2 = "#8d9bb5";
const T3 = "#55637d";
const BD = "rgba(36,48,78,0.32)";
const MO = "ui-monospace,'Cascadia Code','Fira Code',monospace";

const gl = {
  background: "rgba(11,14,24,0.72)",
  backdropFilter: "blur(18px) saturate(1.15)",
  WebkitBackdropFilter: "blur(18px) saturate(1.15)",
  border: "1px solid " + BD,
  borderRadius: 12,
  boxShadow: "0 4px 32px rgba(0,0,0,0.28)",
};

const reveal = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Minimal CFG diagram — 6 nodes linked linearly
const NODES = [
  { id: "users", x: 40, y: 50 },
  { id: "licenses", x: 180, y: 50 },
  { id: "vendors", x: 320, y: 50 },
  { id: "invoices", x: 460, y: 50 },
  { id: "budgets", x: 600, y: 50 },
  { id: "impact", x: 740, y: 50 },
];

const EDGES = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
];

type Props = {
  t: (key: string) => string;
};

export default function CausalGraphSection({ t }: Props) {
  const nodeLabels = [
    t("cfg.node.users"),
    t("cfg.node.licenses"),
    t("cfg.node.vendors"),
    t("cfg.node.invoices"),
    t("cfg.node.budgets"),
    t("cfg.node.impact"),
  ];

  return (
    <motion.section
      variants={reveal}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginBottom: 48 }}
    >
      <div style={Object.assign({}, gl, { padding: 28 })}>
        <span
          style={{
            display: "block",
            fontSize: 15,
            fontWeight: 800,
            fontFamily: MO,
            letterSpacing: ".25em",
            textTransform: "uppercase",
            color: A,
            marginBottom: 14,
          }}
        >
          {t("cfg.label")}
        </span>
        <h2 style={{ fontSize: "clamp(26px, 3.5vw, 36px)", fontWeight: 700, color: T1, marginBottom: 12, lineHeight: 1.15 }}>
          {t("cfg.title")}
        </h2>
        <p style={{ fontSize: 18, color: T2, marginBottom: 28, maxWidth: 640, lineHeight: 1.65 }}>
          {t("cfg.sub")}
        </p>

        {/* Causal graph diagram */}
        <div
          style={{
            background: "rgba(0,0,0,0.25)",
            borderRadius: 10,
            border: "1px solid rgba(36,48,78,0.18)",
            padding: "24px 16px",
            overflowX: "auto",
          }}
        >
          <svg
            viewBox="0 0 800 100"
            width="100%"
            height="100"
            style={{ display: "block", maxWidth: 800, margin: "0 auto" }}
          >
            {/* Edges */}
            {EDGES.map(([from, to]) => {
              const a = NODES[from];
              const b = NODES[to];
              return (
                <g key={`${from}-${to}`}>
                  <line
                    x1={a.x + 30}
                    y1={a.y}
                    x2={b.x - 30}
                    y2={b.y}
                    stroke={A}
                    strokeWidth="1"
                    strokeOpacity="0.3"
                  />
                  {/* Arrow */}
                  <polygon
                    points={`${b.x - 30},${b.y} ${b.x - 38},${b.y - 4} ${b.x - 38},${b.y + 4}`}
                    fill={A}
                    fillOpacity="0.4"
                  />
                </g>
              );
            })}

            {/* Nodes */}
            {NODES.map((node, i) => {
              const isLast = i === NODES.length - 1;
              return (
                <g key={node.id}>
                  <rect
                    x={node.x - 30}
                    y={node.y - 16}
                    width="60"
                    height="32"
                    rx="4"
                    fill={isLast ? "rgba(239,68,68,0.08)" : "rgba(59,130,246,0.06)"}
                    stroke={isLast ? "rgba(239,68,68,0.25)" : "rgba(59,130,246,0.18)"}
                    strokeWidth="1"
                  />
                  <text
                    x={node.x}
                    y={node.y + 4}
                    textAnchor="middle"
                    fill={isLast ? "#ef4444" : AH}
                    style={{ fontSize: 9, fontFamily: MO, fontWeight: 600 }}
                  >
                    {nodeLabels[i]}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <p style={{ fontSize: 13, color: T3, textAlign: "center", marginTop: 14, fontFamily: MO }}>
          {t("cfg.caption")}
        </p>
      </div>
    </motion.section>
  );
}
