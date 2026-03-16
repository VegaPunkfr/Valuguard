"use client";

import { useState, useMemo, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import type { Database } from "@/types/database";

type AuditRequest = Database["public"]["Tables"]["audit_requests"]["Row"];
type VaultSession = Database["public"]["Tables"]["vault_sessions"]["Row"];

interface DashboardProps {
  userEmail: string;
  companyName: string;
  auditRequests: AuditRequest[];
  vaultSessions: VaultSession[];
}

// ══════════════════════════════════════════════════════
//  DESIGN SYSTEM — HSL only, Golden Ratio spacing
// ══════════════════════════════════════════════════════

const C = {
  bg:       "#FFFFFF",
  surface:  "#F8FAFC",
  card:     "#FFFFFF",
  elevated: "#F1F5F9",
  raised:   "#E2E8F0",
  border:   "#E2E8F0",
  borderS:  "#CBD5E1",
  borderSS: "#94A3B8",
  text1:    "#0F172A",
  text2:    "#475569",
  text3:    "#64748B",
  text4:    "#94A3B8",
  accent:   "#0F172A",
  accentHi: "#1E293B",
  accentBg: "rgba(15,23,42,0.06)",
  accentBd: "rgba(15,23,42,0.15)",
  green:    "#059669",
  greenBg:  "rgba(5,150,105,0.06)",
  greenBd:  "rgba(5,150,105,0.18)",
  red:      "#DC2626",
  redBg:    "rgba(220,38,38,0.06)",
  redBd:    "rgba(220,38,38,0.18)",
  amber:    "#D97706",
  amberBg:  "rgba(217,119,6,0.06)",
  amberBd:  "rgba(217,119,6,0.18)",
  cyan:     "#0891B2",
};

const F = {
  mono: "var(--gt-font-mono, ui-monospace, 'Cascadia Code', monospace)",
  sans: "var(--gt-font-sans, system-ui, -apple-system, sans-serif)",
};

// Golden Ratio spacing: 4 → 8 → 16 → 24 → 40 → 64 → 104
const SP = { 1: 4, 2: 8, 3: 16, 4: 24, 5: 40, 6: 64, 7: 104 };

// ── Card layers ──────────────────────────────────
const glass = (_opacity = 0.72, _blur = 20): React.CSSProperties => ({
  background: "#FFFFFF",
  border: `1px solid ${C.border}`,
  borderRadius: 16,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
});

const glassCard: React.CSSProperties = {
  ...glass(0.55, 14),
  borderRadius: 14,
  transition: "border-color 220ms, box-shadow 220ms, transform 220ms",
};

// ── Formatters ──────────────────────────────────────

function fmtEur(n: number, short = false, locale = "en"): string {
  if (short && n >= 1e6) return (n / 1e6).toFixed(1) + "M\u2009EUR";
  if (short && n >= 1e3) return Math.round(n / 1e3) + "k\u2009EUR";
  const numLocale = locale === "fr" ? "fr-FR" : locale === "de" ? "de-DE" : "en-US";
  return Math.round(n).toLocaleString(numLocale) + "\u2009EUR";
}

function relativeTime(dateStr: string, locale = "en"): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return locale === "fr" ? "maintenant" : locale === "de" ? "jetzt" : "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return locale === "fr" ? `${days}j` : locale === "de" ? `${days}T` : `${days}d`;
  const numLocale = locale === "fr" ? "fr-FR" : locale === "de" ? "de-DE" : "en-US";
  return new Date(dateStr).toLocaleDateString(numLocale, { day: "numeric", month: "short" });
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

// ── Status system ───────────────────────────────────

const STATUS_MAP: Record<string, { color: string; bg: string; bd: string; key: string }> = {
  pending:            { color: C.text3,  bg: "hsla(222,12%,41%,0.10)", bd: "hsla(222,12%,41%,0.20)", key: "dashboard.status.pending" },
  paid:               { color: C.accent, bg: C.accentBg,              bd: C.accentBd,               key: "dashboard.status.paid" },
  processing:         { color: C.amber,  bg: C.amberBg,               bd: C.amberBd,                key: "dashboard.status.processing" },
  delivered:          { color: C.green,  bg: C.greenBg,               bd: C.greenBd,                key: "dashboard.status.delivered" },
  failed:             { color: C.red,    bg: C.redBg,                 bd: C.redBd,                  key: "dashboard.status.failed" },
  followup_scheduled: { color: C.cyan,   bg: "hsla(190,86%,58%,0.06)",bd: "hsla(190,86%,58%,0.18)", key: "dashboard.status.followup" },
  lost:               { color: C.text4,  bg: "hsla(222,14%,29%,0.10)",bd: "hsla(222,14%,29%,0.20)", key: "dashboard.status.lost" },
};

// ── Animated counter hook ───────────────────────────

function useAnimatedValue(target: number, duration = 1200): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

// ── SVG Micro-chart ─────────────────────────────────

function Sparkline({ data, color, width = 120, height = 32 }: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data) || 1;
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");

  const gradientId = `sp-${color.replace(/[^a-z0-9]/g, "")}`;

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#${gradientId})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Ring gauge ──────────────────────────────────────

function RingGauge({ value, max = 100, size = 80, strokeWidth = 6, color, label }: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  label: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const dashOffset = circumference * (1 - progress);

  return (
    <div style={{ textAlign: "center" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={C.border} strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div style={{ marginTop: -size / 2 - 10, position: "relative", zIndex: 1 }}>
        <p style={{
          fontFamily: F.mono, fontSize: 18, fontWeight: 800, color,
          fontVariantNumeric: "tabular-nums",
        }}>
          {value}
        </p>
        <p style={{ fontSize: 8, color: C.text3, textTransform: "uppercase", letterSpacing: ".1em", marginTop: 2 }}>
          {label}
        </p>
      </div>
      <div style={{ height: size / 2 - 14 }} />
    </div>
  );
}

// ── Horizontal bar ──────────────────────────────────

function HBar({ value, max, color, label, amount }: {
  value: number;
  max: number;
  color: string;
  label: string;
  amount: string;
}) {
  const w = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: C.text2 }}>{label}</span>
        <span style={{ fontSize: 11, fontFamily: F.mono, color, fontVariantNumeric: "tabular-nums" }}>{amount}</span>
      </div>
      <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          width: `${w}%`, height: "100%", background: color, borderRadius: 2,
          transition: "width 800ms cubic-bezier(0.16,1,0.3,1)",
        }} />
      </div>
    </div>
  );
}

// ── Status badge ────────────────────────────────────

function StatusBadge({ status, t }: { status: string; t: (key: string, fallback?: string) => string }) {
  const s = STATUS_MAP[status] || STATUS_MAP.pending;
  return (
    <span style={{
      display: "inline-block",
      fontSize: 9,
      fontFamily: F.mono,
      fontWeight: 600,
      padding: "2px 8px",
      borderRadius: 6,
      background: s.bg,
      border: `1px solid ${s.bd}`,
      color: s.color,
      textTransform: "uppercase",
      letterSpacing: ".06em",
    }}>
      {t(s.key)}
    </span>
  );
}

// ══════════════════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════════════════

type NavPage = "command" | "reports" | "leads" | "engines" | "intel";

const NAV_ITEMS: { id: NavPage; key: string; shortcut: string; href?: string }[] = [
  { id: "command",  key: "dashboard.nav.command",  shortcut: "1" },
  { id: "reports",  key: "dashboard.nav.reports",  shortcut: "2" },
  { id: "leads",    key: "dashboard.nav.leads",    shortcut: "3" },
  { id: "engines",  key: "dashboard.nav.engines",  shortcut: "4" },
  { id: "intel",    key: "dashboard.nav.scanner",  shortcut: "5", href: "/intel" },
];

// ══════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════

export default function DashboardClient({
  userEmail,
  companyName,
  auditRequests,
  vaultSessions,
}: DashboardProps) {
  const { t, locale } = useI18n();
  const [page, setPage] = useState<NavPage>("command");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      const item = NAV_ITEMS.find((n) => n.shortcut === e.key);
      if (item) {
        if (item.href) { window.location.href = item.href; }
        else { setPage(item.id); }
      }
      if (e.key === "[") setSidebarCollapsed((v) => !v);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Derived metrics ──────────────────────────────

  const delivered = useMemo(() => auditRequests.filter((a) => a.status === "delivered"), [auditRequests]);
  const processing = useMemo(() => auditRequests.filter((a) => a.status === "processing"), [auditRequests]);
  const totalGhostTax = useMemo(() => vaultSessions.reduce((s, v) => s + (v.ghost_tax_annual ?? 0), 0), [vaultSessions]);
  const totalRecoverable = useMemo(() => vaultSessions.reduce((s, v) => s + (v.recoverable_annual ?? 0), 0), [vaultSessions]);
  const avgEntropy = useMemo(() => {
    const scored = vaultSessions.filter((v) => v.entropy_score != null);
    return scored.length > 0 ? Math.round(scored.reduce((s, v) => s + (v.entropy_score ?? 0), 0) / scored.length) : null;
  }, [vaultSessions]);
  const totalSpend = useMemo(() => vaultSessions.reduce((s, v) => s + (v.monthly_spend_total ?? 0), 0) * 12, [vaultSessions]);
  const wasteRate = totalSpend > 0 ? totalGhostTax / totalSpend : 0;

  // Simulated trend data (would come from real data in prod)
  const exposureTrend = useMemo(() => {
    const base = totalGhostTax || 45000;
    return Array.from({ length: 12 }, (_, i) => Math.round(base * (0.6 + Math.random() * 0.5 + i * 0.03)));
  }, [totalGhostTax]);

  const recoverableTrend = useMemo(() => {
    const base = totalRecoverable || 28000;
    return Array.from({ length: 12 }, (_, i) => Math.round(base * (0.4 + Math.random() * 0.4 + i * 0.04)));
  }, [totalRecoverable]);

  // Animated values
  const animGhostTax = useAnimatedValue(totalGhostTax, 1400);
  const animRecoverable = useAnimatedValue(totalRecoverable, 1400);
  const animEntropy = useAnimatedValue(avgEntropy ?? 0, 1000);

  const isEmpty = auditRequests.length === 0 && vaultSessions.length === 0;

  // ── Industry distribution (mock from data) ───────
  const industryMap = useMemo(() => {
    const map: Record<string, number> = {};
    vaultSessions.forEach((v) => {
      const ind = v.industry || t("dashboard.industry.unspecified");
      map[ind] = (map[ind] || 0) + (v.ghost_tax_annual ?? 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [vaultSessions]);

  // ── Engine status (simulated) ────────────────────
  const engines = [
    {
      id: "analysis",
      name: t("dashboard.engines.engine1.name"),
      desc: t("dashboard.engines.engine1.desc"),
      status: "active",
      file: "lib/analysis.ts",
      phases: 21,
      color: C.accent,
    },
    {
      id: "orphan",
      name: t("dashboard.engines.engine2.name"),
      desc: t("dashboard.engines.engine2.desc"),
      status: "active",
      file: "lib/engines/orphan-detector.ts",
      phases: 4,
      color: C.amber,
    },
    {
      id: "shadow",
      name: t("dashboard.engines.engine3.name"),
      desc: t("dashboard.engines.engine3.desc"),
      status: "active",
      file: "lib/engines/shadow-ledger.ts",
      phases: 6,
      color: C.red,
    },
    {
      id: "decision",
      name: t("dashboard.engines.engine4.name"),
      desc: t("dashboard.engines.engine4.desc"),
      status: "active",
      file: "lib/agents/orchestrator.ts",
      phases: 3,
      color: C.green,
    },
  ];

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      background: C.bg,
      fontFamily: F.sans,
      color: C.text1,
      overflow: "hidden",
    }}>

      {/* ═══════════════════════════════════════════════
          SIDEBAR — Collapsible, keyboard-driven
      ═══════════════════════════════════════════════ */}
      <aside style={{
        width: sidebarCollapsed ? 56 : 220,
        borderRight: `1px solid ${C.border}`,
        padding: `${SP[3]}px ${sidebarCollapsed ? 8 : SP[3]}px`,
        display: "flex",
        flexDirection: "column",
        gap: SP[1],
        flexShrink: 0,
        background: "#F8FAFC",
        transition: "width 250ms cubic-bezier(0.16,1,0.3,1)",
        overflow: "hidden",
        position: "relative",
      }}>

        {/* Logo */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: `${SP[2]}px ${SP[1]}px`, marginBottom: SP[3],
          cursor: "pointer",
        }} onClick={() => setSidebarCollapsed((v) => !v)}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: `linear-gradient(135deg, ${C.accent}, ${C.cyan})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 900, color: C.bg,
            flexShrink: 0,
          }}>
            GT
          </div>
          {!sidebarCollapsed && (
            <div>
              <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".04em", color: C.text1, lineHeight: 1 }}>
                GHOST TAX
              </p>
              <p style={{ fontSize: 8, color: C.text3, letterSpacing: ".08em", marginTop: 2 }}>
                {t("dashboard.label.decisionIntelligence")}
              </p>
            </div>
          )}
        </div>

        {/* Nav items */}
        {NAV_ITEMS.map((item) => {
          const active = page === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.href) window.location.href = item.href;
                else setPage(item.id);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: `${SP[2]}px ${SP[2]}px`,
                borderRadius: 10,
                border: "none",
                width: "100%",
                background: active
                  ? `linear-gradient(135deg, ${C.accentBg}, hsla(216,91%,65%,0.04))`
                  : "transparent",
                borderLeft: active ? `2px solid ${C.accent}` : "2px solid transparent",
                color: active ? C.text1 : C.text2,
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 150ms",
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
            >
              <span style={{
                fontFamily: F.mono, fontSize: 9, color: active ? C.accent : C.text4,
                minWidth: 16, textAlign: "center",
              }}>
                {item.shortcut}
              </span>
              {!sidebarCollapsed && t(item.key)}
            </button>
          );
        })}

        <div style={{ flex: 1 }} />

        {/* Keyboard hint */}
        {!sidebarCollapsed && (
          <div style={{
            padding: `${SP[2]}px`,
            borderRadius: 10,
            background: "#F1F5F9",
            border: `1px solid ${C.border}`,
          }}>
            <p style={{ fontSize: 8, fontFamily: F.mono, color: C.text4, letterSpacing: ".06em", marginBottom: 4 }}>
              {t("dashboard.shortcuts")}
            </p>
            <p style={{ fontSize: 9, color: C.text3 }}>
              <kbd style={{ fontFamily: F.mono, color: C.text2, background: C.elevated, padding: "1px 4px", borderRadius: 3, fontSize: 9 }}>1-5</kbd> {t("dashboard.shortcuts.nav")}
            </p>
            <p style={{ fontSize: 9, color: C.text3, marginTop: 2 }}>
              <kbd style={{ fontFamily: F.mono, color: C.text2, background: C.elevated, padding: "1px 4px", borderRadius: 3, fontSize: 9 }}>[</kbd> {t("dashboard.shortcuts.sidebar")}
            </p>
          </div>
        )}

        {/* User card */}
        <div style={{
          padding: `${SP[2]}px`,
          borderRadius: 10,
          background: "#F1F5F9",
          border: `1px solid ${C.border}`,
          marginTop: SP[2],
        }}>
          <p style={{ fontSize: 9, fontFamily: F.mono, color: C.accent, letterSpacing: ".06em", fontWeight: 700 }}>
            {sidebarCollapsed ? (companyName?.charAt(0) || "?") : (companyName?.toUpperCase() || t("dashboard.org.default"))}
          </p>
          {!sidebarCollapsed && (
            <p style={{ fontSize: 9, color: C.text3, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis" }}>
              {userEmail || t("dashboard.org.notConnected")}
            </p>
          )}
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════
          MAIN CONTENT
      ═══════════════════════════════════════════════ */}
      <main style={{
        flex: 1,
        padding: `${SP[4]}px ${SP[5]}px`,
        overflow: "auto",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "none" : "translateY(8px)",
        transition: "opacity 400ms, transform 400ms cubic-bezier(0.16,1,0.3,1)",
      }}>

        {/* ── TOPBAR ──────────────────────────────── */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          marginBottom: SP[4],
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
              <h1 style={{
                fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em",
                background: `linear-gradient(135deg, ${C.text1} 0%, ${C.text2} 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                {page === "command" ? t("dashboard.title.command")
                  : page === "reports" ? t("dashboard.title.reports")
                  : page === "leads" ? t("dashboard.title.leads")
                  : page === "engines" ? t("dashboard.title.engines")
                  : t("dashboard.title.scanner")}
              </h1>
              {/* Live indicator */}
              <div style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "3px 10px", borderRadius: 20,
                background: C.greenBg, border: `1px solid ${C.greenBd}`,
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: C.green,
                  animation: "pulse 2s ease-in-out infinite",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                }} />
                <span style={{ fontSize: 9, fontFamily: F.mono, color: C.green, fontWeight: 600 }}>
                  {t("dashboard.live")}
                </span>
              </div>
            </div>
            <p style={{ fontSize: 11, color: C.text3 }}>
              {auditRequests.length > 0
                ? `${t("dashboard.lastActivity")} ${relativeTime(auditRequests[0].updated_at, locale)}`
                : t("dashboard.noActivity")}
              {processing.length > 0 && (
                <span style={{ color: C.amber, marginLeft: 8 }}>
                  {processing.length} {processing.length > 1 ? t("dashboard.analysesInProgressPlural") : t("dashboard.analysesInProgress")}
                </span>
              )}
            </p>
          </div>
          <div style={{ display: "flex", gap: SP[2], alignItems: "center" }}>
            <a href="/intel" style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "10px 20px", borderRadius: 10,
              background: `linear-gradient(135deg, ${C.accent}, hsl(216,91%,55%))`,
              color: "#fff", fontSize: 11, fontWeight: 700,
              letterSpacing: ".04em", textDecoration: "none",
              boxShadow: `0 4px 16px hsla(216,91%,65%,0.25)`,
              transition: "transform 150ms, box-shadow 150ms",
            }}>
              {t("dashboard.newScan")}
            </a>
          </div>
        </div>

        {/* ═══════════════════════════════════════════
            COMMAND CENTER
        ═══════════════════════════════════════════ */}
        {page === "command" && (
          <div style={{
            display: "flex", flexDirection: "column", gap: SP[3],
            animation: "fadeSlideUp 500ms cubic-bezier(0.16,1,0.3,1)",
          }}>

            {isEmpty ? <EmptyStateWow t={t} /> : (
              <>
                {/* ── TOP METRICS ROW — The Shock ────────── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: SP[3] }}>

                  {/* Exposition Totale */}
                  <div style={{
                    ...glass(0.6),
                    padding: SP[4],
                    position: "relative",
                    overflow: "hidden",
                  }}>
                    <div style={{
                      position: "absolute", top: 0, right: 0, bottom: 0, width: "50%",
                      opacity: 0.15, pointerEvents: "none",
                    }}>
                      <Sparkline data={exposureTrend} color={C.red} width={160} height={80} />
                    </div>
                    <p style={{
                      fontSize: 9, fontFamily: F.mono, color: C.red,
                      textTransform: "uppercase", letterSpacing: ".12em", marginBottom: SP[2],
                      fontWeight: 700,
                    }}>
                      {t("dashboard.ghostTaxExposure")}
                    </p>
                    <p style={{
                      fontFamily: F.mono, fontSize: 32, fontWeight: 900, color: C.red,
                      fontVariantNumeric: "tabular-nums", lineHeight: 1,
                      textShadow: `0 0 40px hsla(0,82%,66%,0.3)`,
                    }}>
                      {animGhostTax > 0 ? fmtEur(animGhostTax, true, locale) : "--"}
                    </p>
                    <p style={{ fontSize: 10, color: C.text3, marginTop: SP[1] }}>{t("dashboard.perYearExposure")}</p>
                    {wasteRate > 0 && (
                      <div style={{
                        marginTop: SP[2], padding: "4px 8px",
                        background: C.redBg, border: `1px solid ${C.redBd}`,
                        borderRadius: 6, display: "inline-block",
                      }}>
                        <span style={{ fontSize: 10, fontFamily: F.mono, color: C.red, fontWeight: 700 }}>
                          {pct(wasteRate)} {t("dashboard.ofTotalSpend")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* R\u00e9cup\u00e9rable */}
                  <div style={{ ...glass(0.6), padding: SP[4], position: "relative", overflow: "hidden" }}>
                    <div style={{
                      position: "absolute", top: 0, right: 0, bottom: 0, width: "50%",
                      opacity: 0.15, pointerEvents: "none",
                    }}>
                      <Sparkline data={recoverableTrend} color={C.green} width={160} height={80} />
                    </div>
                    <p style={{
                      fontSize: 9, fontFamily: F.mono, color: C.green,
                      textTransform: "uppercase", letterSpacing: ".12em", marginBottom: SP[2],
                      fontWeight: 700,
                    }}>
                      {t("dashboard.recoverable")}
                    </p>
                    <p style={{
                      fontFamily: F.mono, fontSize: 32, fontWeight: 900, color: C.green,
                      fontVariantNumeric: "tabular-nums", lineHeight: 1,
                      textShadow: `0 0 40px hsla(162,68%,51%,0.3)`,
                    }}>
                      {animRecoverable > 0 ? fmtEur(animRecoverable, true, locale) : "--"}
                    </p>
                    <p style={{ fontSize: 10, color: C.text3, marginTop: SP[1] }}>{t("dashboard.perYearSavings")}</p>
                  </div>

                  {/* Entropy Score */}
                  <div style={{ ...glass(0.6), padding: SP[4], display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <p style={{
                      fontSize: 9, fontFamily: F.mono,
                      color: (avgEntropy ?? 0) >= 61 ? C.red : (avgEntropy ?? 0) >= 31 ? C.amber : C.green,
                      textTransform: "uppercase", letterSpacing: ".12em", marginBottom: SP[2],
                      fontWeight: 700, alignSelf: "flex-start",
                    }}>
                      {t("dashboard.entropyScore")}
                    </p>
                    <RingGauge
                      value={animEntropy}
                      max={100}
                      size={90}
                      strokeWidth={7}
                      color={(avgEntropy ?? 0) >= 61 ? C.red : (avgEntropy ?? 0) >= 31 ? C.amber : C.green}
                      label="/100"
                    />
                  </div>

                  {/* Volume */}
                  <div style={{ ...glass(0.6), padding: SP[4] }}>
                    <p style={{
                      fontSize: 9, fontFamily: F.mono, color: C.accent,
                      textTransform: "uppercase", letterSpacing: ".12em", marginBottom: SP[2],
                      fontWeight: 700,
                    }}>
                      {t("dashboard.activity")}
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SP[2] }}>
                      {[
                        { v: auditRequests.length, l: t("dashboard.activity.reports"), c: C.text1 },
                        { v: delivered.length, l: t("dashboard.activity.delivered"), c: C.green },
                        { v: vaultSessions.length, l: t("dashboard.activity.leads"), c: C.accent },
                        { v: processing.length, l: t("dashboard.activity.inProgress"), c: C.amber },
                      ].map((m) => (
                        <div key={m.l} style={{ textAlign: "center" }}>
                          <p style={{
                            fontFamily: F.mono, fontSize: 22, fontWeight: 800, color: m.c,
                            fontVariantNumeric: "tabular-nums", lineHeight: 1,
                          }}>
                            {m.v}
                          </p>
                          <p style={{ fontSize: 8, color: C.text3, marginTop: 3, textTransform: "uppercase", letterSpacing: ".08em" }}>
                            {m.l}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── SECOND ROW — 3 columns ─────────────── */}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr", gap: SP[3] }}>

                  {/* Recent activity feed */}
                  <div style={{ ...glass(0.55), padding: SP[4] }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: SP[3] }}>
                      <p style={{
                        fontSize: 10, fontFamily: F.mono, fontWeight: 700,
                        letterSpacing: ".12em", textTransform: "uppercase", color: C.text3,
                      }}>
                        {t("dashboard.activityFeed")}
                      </p>
                      <button onClick={() => setPage("reports")} style={{
                        fontSize: 9, color: C.accent, background: "none", border: "none",
                        cursor: "pointer", fontWeight: 600, fontFamily: F.mono,
                      }}>
                        {t("dashboard.viewAll")}
                      </button>
                    </div>
                    {auditRequests.slice(0, 6).map((ar, idx) => (
                      <div key={ar.id} style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: `${SP[2]}px 0`,
                        borderBottom: idx < 5 ? `1px solid ${C.border}` : "none",
                        animation: `fadeSlideUp ${300 + idx * 80}ms cubic-bezier(0.16,1,0.3,1)`,
                      }}>
                        {/* Timeline dot */}
                        <div style={{
                          width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                          background: STATUS_MAP[ar.status]?.color || C.text4,
                          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            fontSize: 12, fontWeight: 600, color: C.text1,
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          }}>
                            {ar.company_name}
                          </p>
                          <p style={{ fontSize: 9, color: C.text3 }}>
                            {ar.domain ?? ar.email}
                          </p>
                        </div>
                        <StatusBadge status={ar.status} t={t} />
                        <span style={{ fontFamily: F.mono, fontSize: 9, color: C.text4, flexShrink: 0 }}>
                          {relativeTime(ar.created_at, locale)}
                        </span>
                      </div>
                    ))}
                    {auditRequests.length === 0 && (
                      <p style={{ fontSize: 11, color: C.text4, textAlign: "center", padding: SP[5] }}>
                        {t("dashboard.noReports")}
                      </p>
                    )}
                  </div>

                  {/* Industry breakdown */}
                  <div style={{ ...glass(0.55), padding: SP[4] }}>
                    <p style={{
                      fontSize: 10, fontFamily: F.mono, fontWeight: 700,
                      letterSpacing: ".12em", textTransform: "uppercase", color: C.text3,
                      marginBottom: SP[3],
                    }}>
                      {t("dashboard.exposureByIndustry")}
                    </p>
                    {industryMap.length > 0 ? (
                      industryMap.map(([industry, amount]) => (
                        <HBar
                          key={industry}
                          value={amount}
                          max={industryMap[0]?.[1] || 1}
                          color={C.red}
                          label={industry}
                          amount={fmtEur(amount, true, locale)}
                        />
                      ))
                    ) : (
                      <p style={{ fontSize: 11, color: C.text4, textAlign: "center", padding: SP[4] }}>
                        {t("dashboard.insufficientData")}
                      </p>
                    )}

                    {/* Spend total */}
                    {totalSpend > 0 && (
                      <div style={{
                        marginTop: SP[3], padding: SP[3],
                        background: "#F1F5F9", borderRadius: 10,
                        border: `1px solid ${C.border}`,
                      }}>
                        <p style={{ fontSize: 8, fontFamily: F.mono, color: C.text4, letterSpacing: ".1em", textTransform: "uppercase" }}>
                          {t("dashboard.totalSpendAnalyzed")}
                        </p>
                        <p style={{
                          fontFamily: F.mono, fontSize: 20, fontWeight: 800,
                          color: C.text1, fontVariantNumeric: "tabular-nums", marginTop: 4,
                        }}>
                          {fmtEur(totalSpend, true, locale)}<span style={{ fontSize: 10, color: C.text3 }}>/an</span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Engine status panel */}
                  <div style={{ ...glass(0.55), padding: SP[4] }}>
                    <p style={{
                      fontSize: 10, fontFamily: F.mono, fontWeight: 700,
                      letterSpacing: ".12em", textTransform: "uppercase", color: C.text3,
                      marginBottom: SP[3],
                    }}>
                      {t("dashboard.engines")}
                    </p>
                    {engines.map((eng) => (
                      <div key={eng.id} style={{
                        padding: `${SP[2]}px 0`,
                        borderBottom: `1px solid ${C.border}`,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                          <div style={{
                            width: 6, height: 6, borderRadius: "50%",
                            background: eng.color,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                          }} />
                          <span style={{ fontSize: 10, fontWeight: 600, color: C.text1 }}>{eng.name}</span>
                        </div>
                        <p style={{ fontSize: 9, color: C.text3, paddingLeft: 12 }}>
                          {eng.phases} {t("dashboard.engines.phases")}
                        </p>
                      </div>
                    ))}
                    <button onClick={() => setPage("engines")} style={{
                      width: "100%", marginTop: SP[3], padding: "8px 0",
                      background: "none", border: `1px solid ${C.borderS}`,
                      borderRadius: 8, color: C.accent, fontSize: 10,
                      fontFamily: F.mono, fontWeight: 600, cursor: "pointer",
                      letterSpacing: ".06em",
                      transition: "border-color 150ms",
                    }}>
                      {t("dashboard.engines.details")}
                    </button>
                  </div>
                </div>

                {/* ── THIRD ROW — Pipeline preview ───────── */}
                <div style={{ ...glass(0.55), padding: SP[4] }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: SP[3] }}>
                    <p style={{
                      fontSize: 10, fontFamily: F.mono, fontWeight: 700,
                      letterSpacing: ".12em", textTransform: "uppercase", color: C.text3,
                    }}>
                      {t("dashboard.commercialPipeline")}
                    </p>
                    <button onClick={() => setPage("leads")} style={{
                      fontSize: 9, color: C.accent, background: "none", border: "none",
                      cursor: "pointer", fontWeight: 600, fontFamily: F.mono,
                    }}>
                      {t("dashboard.viewAll")}
                    </button>
                  </div>

                  {/* Pipeline stages */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: SP[2], marginBottom: SP[3] }}>
                    {[
                      { label: t("dashboard.pipeline.scanned"), count: vaultSessions.length, color: C.text2 },
                      { label: t("dashboard.pipeline.qualified"), count: vaultSessions.filter((v) => (v.ghost_tax_annual ?? 0) > 10000).length, color: C.amber },
                      { label: t("dashboard.pipeline.paid"), count: auditRequests.filter((a) => a.status === "paid" || a.status === "delivered").length, color: C.accent },
                      { label: t("dashboard.pipeline.delivered"), count: delivered.length, color: C.green },
                    ].map((stage) => (
                      <div key={stage.label} style={{
                        textAlign: "center", padding: `${SP[3]}px ${SP[2]}px`,
                        background: "#F1F5F9", borderRadius: 10,
                        border: `1px solid ${C.border}`,
                      }}>
                        <p style={{
                          fontFamily: F.mono, fontSize: 28, fontWeight: 900,
                          color: stage.color, fontVariantNumeric: "tabular-nums", lineHeight: 1,
                        }}>
                          {stage.count}
                        </p>
                        <p style={{ fontSize: 9, color: C.text3, marginTop: 4, textTransform: "uppercase", letterSpacing: ".08em" }}>
                          {stage.label}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Top leads */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: SP[2] }}>
                    {vaultSessions.slice(0, 3).map((vs) => (
                      <div key={vs.id} style={{
                        ...glassCard, padding: SP[3],
                      }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: C.text1, marginBottom: 4 }}>
                          {vs.company_name}
                        </p>
                        <p style={{ fontSize: 9, color: C.text3, marginBottom: SP[2] }}>
                          {vs.industry || "N/A"} {vs.headcount ? `\u00b7 ${vs.headcount} emp.` : ""}
                        </p>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <span style={{
                            fontFamily: F.mono, fontSize: 14, fontWeight: 800, color: C.red,
                            fontVariantNumeric: "tabular-nums",
                          }}>
                            {vs.ghost_tax_annual ? fmtEur(vs.ghost_tax_annual, true, locale) : "--"}
                          </span>
                          {vs.entropy_score != null && (
                            <span style={{
                              fontFamily: F.mono, fontSize: 10, fontWeight: 600,
                              color: vs.entropy_score >= 61 ? C.red : vs.entropy_score >= 31 ? C.amber : C.green,
                            }}>
                              {vs.entropy_score}/100
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════
            REPORTS PAGE
        ═══════════════════════════════════════════ */}
        {page === "reports" && (
          <div style={{ animation: "fadeSlideUp 400ms cubic-bezier(0.16,1,0.3,1)" }}>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: SP[2],
              marginBottom: SP[4],
            }}>
              {[
                { label: t("dashboard.reports.total"), value: auditRequests.length, color: C.text1 },
                { label: t("dashboard.reports.delivered"), value: delivered.length, color: C.green },
                { label: t("dashboard.reports.inProgress"), value: processing.length, color: C.amber },
                { label: t("dashboard.reports.failed"), value: auditRequests.filter((a) => a.status === "failed").length, color: C.red },
              ].map((kpi) => (
                <div key={kpi.label} style={{ ...glass(0.5), padding: `${SP[3]}px ${SP[4]}px`, textAlign: "center" }}>
                  <p style={{ fontFamily: F.mono, fontSize: 28, fontWeight: 900, color: kpi.color, fontVariantNumeric: "tabular-nums" }}>
                    {kpi.value}
                  </p>
                  <p style={{ fontSize: 9, color: C.text3, textTransform: "uppercase", letterSpacing: ".1em", marginTop: 4 }}>
                    {kpi.label}
                  </p>
                </div>
              ))}
            </div>

            <div style={{ ...glass(0.55), padding: SP[4] }}>
              {auditRequests.length === 0 ? <EmptyStateWow t={t} /> : (
                <div style={{ display: "flex", flexDirection: "column", gap: SP[1] }}>
                  {/* Header row */}
                  <div style={{
                    display: "grid", gridTemplateColumns: "140px 1fr 100px 120px 80px",
                    gap: SP[2], padding: `${SP[1]}px ${SP[3]}px`,
                  }}>
                    {[t("dashboard.reports.header.company"), t("dashboard.reports.header.domain"), t("dashboard.reports.header.status"), t("dashboard.reports.header.spend"), ""].map((h) => (
                      <span key={h} style={{
                        fontSize: 8, fontFamily: F.mono, color: C.text4,
                        textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 700,
                      }}>
                        {h}
                      </span>
                    ))}
                  </div>
                  {auditRequests.map((ar, idx) => (
                    <div key={ar.id} style={{
                      display: "grid", gridTemplateColumns: "140px 1fr 100px 120px 80px",
                      gap: SP[2], padding: `${SP[2]}px ${SP[3]}px`,
                      borderRadius: 10,
                      background: idx % 2 === 0 ? "transparent" : "#F8FAFC",
                      transition: "background 150ms",
                      alignItems: "center",
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.text1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ar.company_name}
                      </span>
                      <span style={{ fontSize: 10, color: C.text3, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {ar.domain ?? ar.email}
                      </span>
                      <StatusBadge status={ar.status} t={t} />
                      <span style={{ fontFamily: F.mono, fontSize: 12, fontWeight: 600, color: C.text2, fontVariantNumeric: "tabular-nums" }}>
                        {ar.estimated_monthly_spend ? fmtEur(ar.estimated_monthly_spend, false, locale) + "/mo" : "--"}
                      </span>
                      <span style={{ fontFamily: F.mono, fontSize: 9, color: C.text4 }}>
                        {relativeTime(ar.created_at, locale)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            LEADS / PIPELINE PAGE
        ═══════════════════════════════════════════ */}
        {page === "leads" && (
          <div style={{ animation: "fadeSlideUp 400ms cubic-bezier(0.16,1,0.3,1)" }}>
            {/* Funnel visualization */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: SP[1],
              marginBottom: SP[4],
            }}>
              {[
                { label: t("dashboard.leads.visitors"), value: vaultSessions.length * 8, color: C.text2, width: "100%" },
                { label: t("dashboard.leads.scans"), value: vaultSessions.length, color: C.accent, width: "75%" },
                { label: t("dashboard.leads.qualified"), value: vaultSessions.filter((v) => (v.ghost_tax_annual ?? 0) > 10000).length, color: C.amber, width: "50%" },
                { label: t("dashboard.leads.paid"), value: auditRequests.filter((a) => ["paid", "delivered", "processing"].includes(a.status)).length, color: C.green, width: "30%" },
                { label: t("dashboard.leads.delivered"), value: delivered.length, color: C.green, width: "18%" },
              ].map((stage) => (
                <div key={stage.label} style={{ textAlign: "center" }}>
                  <div style={{
                    height: 4, borderRadius: 2, margin: "0 auto 10px",
                    width: stage.width,
                    background: `linear-gradient(90deg, ${stage.color}, ${stage.color}88)`,
                  }} />
                  <p style={{
                    fontFamily: F.mono, fontSize: 24, fontWeight: 900,
                    color: stage.color, fontVariantNumeric: "tabular-nums", lineHeight: 1,
                  }}>
                    {stage.value}
                  </p>
                  <p style={{ fontSize: 9, color: C.text3, marginTop: 4, textTransform: "uppercase", letterSpacing: ".08em" }}>
                    {stage.label}
                  </p>
                </div>
              ))}
            </div>

            <div style={{ ...glass(0.55), padding: SP[4] }}>
              {vaultSessions.length === 0 ? <EmptyStateWow t={t} /> : (
                <div style={{ display: "flex", flexDirection: "column", gap: SP[1] }}>
                  {/* Header */}
                  <div style={{
                    display: "grid", gridTemplateColumns: "1.2fr 1fr 80px 80px 100px 90px",
                    gap: SP[2], padding: `${SP[1]}px ${SP[3]}px`,
                  }}>
                    {[t("dashboard.leads.header.company"), t("dashboard.leads.header.email"), t("dashboard.leads.header.size"), t("dashboard.leads.header.industry"), t("dashboard.leads.header.ghostTax"), t("dashboard.leads.header.entropy")].map((h) => (
                      <span key={h} style={{
                        fontSize: 8, fontFamily: F.mono, color: C.text4,
                        textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 700,
                      }}>
                        {h}
                      </span>
                    ))}
                  </div>
                  {vaultSessions.map((vs, idx) => (
                    <div key={vs.id} style={{
                      display: "grid", gridTemplateColumns: "1.2fr 1fr 80px 80px 100px 90px",
                      gap: SP[2], padding: `${SP[2]}px ${SP[3]}px`,
                      borderRadius: 10,
                      background: idx % 2 === 0 ? "transparent" : "#F8FAFC",
                      alignItems: "center",
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.text1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {vs.company_name}
                      </span>
                      <span style={{ fontSize: 10, color: C.text3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {vs.email}
                      </span>
                      <span style={{ fontSize: 10, color: C.text2 }}>
                        {vs.headcount || "--"}
                      </span>
                      <span style={{ fontSize: 10, color: C.text2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {vs.industry || "--"}
                      </span>
                      <span style={{
                        fontFamily: F.mono, fontSize: 13, fontWeight: 800,
                        color: (vs.ghost_tax_annual ?? 0) > 30000 ? C.red : (vs.ghost_tax_annual ?? 0) > 10000 ? C.amber : C.text2,
                        fontVariantNumeric: "tabular-nums",
                      }}>
                        {vs.ghost_tax_annual ? fmtEur(vs.ghost_tax_annual, true, locale) : "--"}
                      </span>
                      <span style={{
                        fontFamily: F.mono, fontSize: 12, fontWeight: 700,
                        color: (vs.entropy_score ?? 0) >= 61 ? C.red : (vs.entropy_score ?? 0) >= 31 ? C.amber : C.green,
                      }}>
                        {vs.entropy_score != null ? `${vs.entropy_score}/100` : "--"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            ENGINES PAGE
        ═══════════════════════════════════════════ */}
        {page === "engines" && (
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: SP[3],
            animation: "fadeSlideUp 400ms cubic-bezier(0.16,1,0.3,1)",
          }}>
            {engines.map((eng) => (
              <div key={eng.id} style={{
                ...glass(0.6), padding: SP[5],
                position: "relative", overflow: "hidden",
                borderLeft: `3px solid ${eng.color}`,
              }}>
                {/* Ambient glow */}
                <div style={{
                  position: "absolute", top: -40, right: -40,
                  width: 160, height: 160, borderRadius: "50%",
                  background: `radial-gradient(circle, ${eng.color}10, transparent 70%)`,
                  pointerEvents: "none",
                }} />

                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: SP[3] }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: eng.color,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    animation: "pulse 3s ease-in-out infinite",
                  }} />
                  <h3 style={{
                    fontSize: 16, fontWeight: 800, color: C.text1,
                    letterSpacing: "-0.01em",
                  }}>
                    {eng.name}
                  </h3>
                  <span style={{
                    fontSize: 8, fontFamily: F.mono, color: C.green,
                    padding: "2px 8px", borderRadius: 6,
                    background: C.greenBg, border: `1px solid ${C.greenBd}`,
                    fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em",
                  }}>
                    {t("dashboard.engines.active")}
                  </span>
                </div>

                <p style={{ fontSize: 12, color: C.text2, lineHeight: 1.5, marginBottom: SP[3] }}>
                  {eng.desc}
                </p>

                <div style={{
                  padding: SP[3], background: "#F1F5F9", borderRadius: 10,
                  border: `1px solid ${C.border}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: SP[1] }}>
                    <span style={{ fontSize: 9, fontFamily: F.mono, color: C.text4 }}>{t("dashboard.engines.phases").toUpperCase()}</span>
                    <span style={{ fontSize: 11, fontFamily: F.mono, color: eng.color, fontWeight: 700 }}>
                      {eng.phases}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: SP[1] }}>
                    <span style={{ fontSize: 9, fontFamily: F.mono, color: C.text4 }}>{t("dashboard.engines.file")}</span>
                    <span style={{ fontSize: 9, fontFamily: F.mono, color: C.text3 }}>{eng.file}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 9, fontFamily: F.mono, color: C.text4 }}>{t("dashboard.engines.statusLabel")}</span>
                    <span style={{ fontSize: 9, fontFamily: F.mono, color: C.green }}>{t("dashboard.engines.operational")}</span>
                  </div>
                </div>

                {/* Phase visualization */}
                <div style={{ display: "flex", gap: 3, marginTop: SP[3] }}>
                  {Array.from({ length: eng.phases }, (_, i) => (
                    <div key={i} style={{
                      flex: 1, height: 4, borderRadius: 2,
                      background: eng.color,
                      opacity: 0.3 + (i / eng.phases) * 0.7,
                      animation: `fadeSlideUp ${400 + i * 100}ms cubic-bezier(0.16,1,0.3,1)`,
                    }} />
                  ))}
                </div>
              </div>
            ))}

            {/* Architecture overview */}
            <div style={{ ...glass(0.5), padding: SP[5], gridColumn: "1 / -1" }}>
              <p style={{
                fontSize: 10, fontFamily: F.mono, fontWeight: 700,
                letterSpacing: ".12em", textTransform: "uppercase", color: C.text3,
                marginBottom: SP[4],
              }}>
                {t("dashboard.engines.architecture")}
              </p>
              <div style={{
                fontFamily: F.mono, fontSize: 12, color: C.text2, lineHeight: 2,
                background: "#F1F5F9", padding: SP[4], borderRadius: 12,
                border: `1px solid ${C.border}`, overflowX: "auto",
              }}>
                <pre style={{ margin: 0, whiteSpace: "pre" }}>
{`  \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510     \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510     \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
  \u2502`}<span style={{color:C.accent}}> Intelligence  </span>{`\u2502 \u2500\u2500\u2500 \u2502`}<span style={{color:C.amber}}> Orphan Detect </span>{`\u2502 \u2500\u2500\u2500 \u2502`}<span style={{color:C.red}}> Shadow Ledger </span>{`\u2502
  \u2502`}<span style={{color:C.accent}}> 21 phases     </span>{`\u2502     \u2502`}<span style={{color:C.amber}}> IAM \u00d7 SaaS   </span>{`\u2502     \u2502`}<span style={{color:C.red}}> 78 vendors    </span>{`\u2502
  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518     \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518     \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
           \u2502                  \u2502                  \u2502
           \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518                  \u2502
                    \u2502                           \u2502
           \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
           \u2502`}<span style={{color:C.green}}> Decision Room                      </span>{`\u2502
           \u2502`}<span style={{color:C.green}}> Extracteur \u2192 Analyste \u2192 N\u00e9gociateur </span>{`\u2502
           \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518`}
                </pre>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── CSS Animations ────────────────────────── */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 768px) {
          main { padding: 16px !important; }
          aside { display: none !important; }
        }
      `}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  EMPTY STATE — Premium
// ══════════════════════════════════════════════════════

function EmptyStateWow({ t }: { t: (key: string, fallback?: string) => string }) {
  return (
    <div style={{
      ...glass(0.6),
      padding: `${SP[6]}px ${SP[5]}px`,
      textAlign: "center",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background gradient */}
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse at 50% 0%, hsla(216,91%,65%,0.06) 0%, transparent 60%)`,
        pointerEvents: "none",
      }} />

      {/* Animated rings */}
      <div style={{
        width: 80, height: 80, margin: "0 auto 24px",
        position: "relative",
      }}>
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          border: `2px solid ${C.accentBd}`,
          animation: "pulse 3s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", inset: 10, borderRadius: "50%",
          border: `2px solid ${C.accent}`,
          animation: "pulse 3s ease-in-out infinite 0.5s",
        }} />
        <div style={{
          position: "absolute", inset: 20, borderRadius: "50%",
          background: C.accentBg,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontFamily: F.mono, fontSize: 18, fontWeight: 900, color: C.accent }}>GT</span>
        </div>
      </div>

      <h2 style={{
        fontSize: 20, fontWeight: 800, color: C.text1,
        letterSpacing: "-0.02em", marginBottom: 8,
      }}>
        {t("dashboard.empty.title")}
      </h2>
      <p style={{
        fontSize: 13, color: C.text2, lineHeight: 1.6,
        maxWidth: 440, margin: "0 auto 28px",
      }}>
        {t("dashboard.empty.desc")}
      </p>
      <a href="/intel" style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "14px 32px", borderRadius: 12,
        background: `linear-gradient(135deg, ${C.accent}, hsl(216,91%,55%))`,
        color: "#fff", fontSize: 12, fontWeight: 700,
        letterSpacing: ".06em", textDecoration: "none",
        boxShadow: `0 4px 20px hsla(216,91%,65%,0.3)`,
        transition: "transform 150ms, box-shadow 150ms",
      }}>
        {t("dashboard.empty.cta")}
      </a>
      <p style={{ fontSize: 10, fontFamily: F.mono, color: C.text4, marginTop: 16 }}>
        {t("dashboard.empty.stats")}
      </p>
    </div>
  );
}
