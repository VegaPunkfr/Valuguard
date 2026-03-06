"use client";

import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import IngestionConnector from "./IngestionConnector";
import IngestionConsole, { type LogEntry } from "./IngestionConsole";

const V = "#060912";
const A = "#3b82f6";
const AH = "#60a5fa";
const T1 = "#e0e6f2";
const T2 = "#8d9bb5";
const T3 = "#55637d";
const BD = "rgba(36,48,78,0.32)";
const TL = "#34d399";
const MO = "ui-monospace,'Cascadia Code','Fira Code',monospace";
const SA = "system-ui,-apple-system,sans-serif";

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

type ConnectorStatus = "idle" | "connecting" | "connected";

// SSO SVG icon
function SsoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2a5 5 0 0 1 5 5v2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2V7a5 5 0 0 1 5-5z" />
      <circle cx="12" cy="15" r="1.5" />
      <path d="M12 16.5V18" />
    </svg>
  );
}

// ERP SVG icon
function ErpIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="20" height="18" rx="2" />
      <path d="M2 9h20" />
      <path d="M9 21V9" />
      <path d="M13 13h4" />
      <path d="M13 17h4" />
    </svg>
  );
}

export default function IngestionGateway() {
  const { t } = useI18n();
  const [ssoStatus, setSsoStatus] = useState<ConnectorStatus>("idle");
  const [erpStatus, setErpStatus] = useState<ConnectorStatus>("idle");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [pipelineReady, setPipelineReady] = useState(false);
  const timeoutIds = useRef<ReturnType<typeof setTimeout>[]>([]);

  const pushLog = useCallback((entry: LogEntry) => {
    setLogs((prev) => [...prev, entry]);
  }, []);

  const runSequence = useCallback(
    (entries: { text: string; type: LogEntry["type"]; delay: number }[], onDone: () => void) => {
      setRunning(true);
      entries.forEach((entry, i) => {
        const id = setTimeout(() => {
          pushLog({ text: entry.text, type: entry.type });
          if (i === entries.length - 1) {
            setRunning(false);
            onDone();
          }
        }, entry.delay);
        timeoutIds.current.push(id);
      });
    },
    [pushLog],
  );

  const handleSso = useCallback(() => {
    if (ssoStatus !== "idle") return;
    setSsoStatus("connecting");
    setLogs([]);
    setPipelineReady(false);

    const seq = [
      { text: t("ing.log.init"), type: "info" as const, delay: 400 },
      { text: t("ing.log.channel"), type: "info" as const, delay: 1200 },
      { text: t("ing.log.sso.auth"), type: "info" as const, delay: 2200 },
      { text: t("ing.log.sso.licenses"), type: "info" as const, delay: 3400 },
      { text: t("ing.log.sso.ai"), type: "info" as const, delay: 4200 },
      { text: t("ing.log.normalize"), type: "info" as const, delay: 5200 },
      { text: t("ing.log.sso.done"), type: "success" as const, delay: 6200 },
    ];

    runSequence(seq, () => setSsoStatus("connected"));
  }, [ssoStatus, t, runSequence]);

  const handleErp = useCallback(() => {
    if (erpStatus !== "idle") return;
    setErpStatus("connecting");

    // If SSO wasn't run, clear logs
    if (ssoStatus === "idle") {
      setLogs([]);
      setPipelineReady(false);
    }

    const baseDelay = ssoStatus === "connected" ? 400 : 400;
    const seq = [
      { text: t("ing.log.erp.connect"), type: "info" as const, delay: baseDelay },
      { text: t("ing.log.erp.extract"), type: "info" as const, delay: baseDelay + 1000 },
      { text: t("ing.log.erp.invoices"), type: "info" as const, delay: baseDelay + 2000 },
      { text: t("ing.log.erp.normalize"), type: "info" as const, delay: baseDelay + 3000 },
      { text: t("ing.log.signals"), type: "warn" as const, delay: baseDelay + 4000 },
      { text: t("ing.log.tension"), type: "warn" as const, delay: baseDelay + 5000 },
      { text: t("ing.log.ready"), type: "success" as const, delay: baseDelay + 6200 },
    ];

    runSequence(seq, () => {
      setErpStatus("connected");
      setPipelineReady(true);
    });
  }, [erpStatus, ssoStatus, t, runSequence]);

  const bothConnected = ssoStatus === "connected" && erpStatus === "connected";

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "60px 20px 80px" }}>
      {/* ── Header ── */}
      <motion.div
        variants={reveal}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        style={{ textAlign: "center", marginBottom: 48 }}
      >
        <span
          style={{
            display: "inline-block",
            fontSize: 9,
            fontWeight: 600,
            fontFamily: MO,
            letterSpacing: ".14em",
            textTransform: "uppercase",
            color: A,
            marginBottom: 14,
            padding: "4px 12px",
            borderRadius: 4,
            background: "rgba(59,130,246,0.06)",
            border: "1px solid rgba(59,130,246,0.12)",
          }}
        >
          {t("ing.badge")}
        </span>

        <h1
          style={{
            fontSize: 32,
            fontWeight: 800,
            color: T1,
            fontFamily: SA,
            letterSpacing: "-.02em",
            lineHeight: 1.15,
            marginBottom: 12,
          }}
        >
          {t("ing.title")}
        </h1>
        <p style={{ fontSize: 14, color: T2, maxWidth: 520, margin: "0 auto", lineHeight: 1.6 }}>
          {t("ing.subtitle")}
        </p>
      </motion.div>

      {/* ── Methodology steps ── */}
      <motion.div
        variants={reveal}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
          marginBottom: 40,
        }}
      >
        {[
          { step: "01", label: t("ing.step1"), desc: t("ing.step1.desc") },
          { step: "02", label: t("ing.step2"), desc: t("ing.step2.desc") },
          { step: "03", label: t("ing.step3"), desc: t("ing.step3.desc") },
        ].map((s) => (
          <div
            key={s.step}
            style={{
              ...gl,
              padding: "18px 16px",
              textAlign: "center",
            }}
          >
            <span style={{ fontFamily: MO, fontSize: 20, fontWeight: 800, color: A, display: "block", marginBottom: 6 }}>
              {s.step}
            </span>
            <p style={{ fontSize: 12, fontWeight: 700, color: T1, marginBottom: 4 }}>{s.label}</p>
            <p style={{ fontSize: 10, color: T3, lineHeight: 1.4 }}>{s.desc}</p>
          </div>
        ))}
      </motion.div>

      {/* ── Connectors ── */}
      <motion.div
        variants={reveal}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          marginBottom: 32,
        }}
      >
        <IngestionConnector
          icon={<SsoIcon />}
          label={t("ing.sso.label")}
          objectives={[t("ing.sso.obj1"), t("ing.sso.obj2"), t("ing.sso.obj3")]}
          security={t("ing.sso.security")}
          status={ssoStatus}
          onConnect={handleSso}
          connectLabel={t("ing.connect")}
          connectedLabel={t("ing.connected")}
        />
        <IngestionConnector
          icon={<ErpIcon />}
          label={t("ing.erp.label")}
          objectives={[t("ing.erp.obj1"), t("ing.erp.obj2"), t("ing.erp.obj3")]}
          security={t("ing.erp.security")}
          status={erpStatus}
          onConnect={handleErp}
          connectLabel={t("ing.connect")}
          connectedLabel={t("ing.connected")}
        />
      </motion.div>

      {/* ── Console ── */}
      {(logs.length > 0 || running) && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ marginBottom: 32 }}
        >
          <p
            style={{
              fontSize: 9,
              fontFamily: MO,
              fontWeight: 600,
              letterSpacing: ".12em",
              textTransform: "uppercase",
              color: T3,
              marginBottom: 10,
            }}
          >
            {t("ing.console.label")}
          </p>
          <IngestionConsole logs={logs} running={running} />
        </motion.div>
      )}

      {/* ── Post-connection state ── */}
      {pipelineReady && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div
            style={{
              ...gl,
              padding: 28,
              textAlign: "center",
              borderColor: "rgba(52,211,153,0.15)",
            }}
          >
            {/* Status metrics */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 16,
                marginBottom: 24,
              }}
            >
              {[
                { value: t("ing.result.v1"), label: t("ing.result.l1"), color: TL },
                { value: t("ing.result.v2"), label: t("ing.result.l2"), color: AH },
                { value: t("ing.result.v3"), label: t("ing.result.l3"), color: "#ef4444" },
              ].map((m, i) => (
                <div key={i}>
                  <p style={{ fontFamily: MO, fontSize: 18, fontWeight: 800, color: m.color, marginBottom: 4 }}>
                    {m.value}
                  </p>
                  <p style={{ fontSize: 10, color: T3, fontFamily: MO, letterSpacing: ".04em" }}>
                    {m.label}
                  </p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <a
              href="/estimator"
              style={{
                display: "inline-block",
                padding: "14px 36px",
                borderRadius: 8,
                background: TL,
                color: V,
                fontSize: 13,
                fontWeight: 800,
                fontFamily: MO,
                letterSpacing: ".06em",
                textTransform: "uppercase",
                textDecoration: "none",
                transition: "opacity 0.15s",
              }}
            >
              {t("ing.cta")}
            </a>
            <p style={{ fontSize: 10, color: T3, marginTop: 10 }}>{t("ing.cta.sub")}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
