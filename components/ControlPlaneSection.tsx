"use client";

import { motion } from "framer-motion";

const A = "#3b82f6";
const AH = "#60a5fa";
const T1 = "#e0e6f2";
const T2 = "#8d9bb5";
const T3 = "#55637d";
const TL = "#34d399";
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

// Step icons (inline SVGs — lock, graph, signal, shield)
function IconIngestion() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function IconGraph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="12" cy="18" r="2.5" />
      <path d="M8.5 7.5L10.5 16" />
      <path d="M15.5 7.5L13.5 16" />
    </svg>
  );
}
function IconSignal() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 12h4l3-9 4 18 3-9h4" />
    </svg>
  );
}
function IconProtocol() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

const ICONS = [<IconIngestion key="i" />, <IconGraph key="g" />, <IconSignal key="s" />, <IconProtocol key="p" />];

type Props = {
  t: (key: string) => string;
};

export default function ControlPlaneSection({ t }: Props) {
  const steps = [
    { num: "01", icon: ICONS[0], title: t("cp.step1"), desc: t("cp.step1.desc") },
    { num: "02", icon: ICONS[1], title: t("cp.step2"), desc: t("cp.step2.desc") },
    { num: "03", icon: ICONS[2], title: t("cp.step3"), desc: t("cp.step3.desc") },
    { num: "04", icon: ICONS[3], title: t("cp.step4"), desc: t("cp.step4.desc") },
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
            fontSize: 9,
            fontWeight: 600,
            fontFamily: MO,
            letterSpacing: ".14em",
            textTransform: "uppercase",
            color: A,
            marginBottom: 10,
          }}
        >
          {t("cp.label")}
        </span>
        <h2 style={{ fontSize: "clamp(26px, 3.5vw, 36px)", fontWeight: 700, color: T1, marginBottom: 12, lineHeight: 1.15 }}>
          {t("cp.title")}
        </h2>
        <p style={{ fontSize: 14, color: T2, marginBottom: 24, maxWidth: 620, lineHeight: 1.6 }}>
          {t("cp.sub")}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              variants={reveal}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              style={{
                padding: 18,
                borderRadius: 10,
                background: "rgba(0,0,0,0.15)",
                border: "1px solid rgba(36,48,78,0.18)",
                position: "relative",
              }}
            >
              <div
                style={{
                  fontFamily: MO,
                  fontSize: 32,
                  fontWeight: 800,
                  color: "rgba(59,130,246,0.08)",
                  position: "absolute",
                  top: 10,
                  right: 14,
                }}
              >
                {step.num}
              </div>
              <div style={{ color: A, marginBottom: 10 }}>{step.icon}</div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: T1, marginBottom: 4 }}>
                {step.title}
              </h3>
              <p style={{ fontSize: 11, color: T2, lineHeight: 1.5 }}>{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
