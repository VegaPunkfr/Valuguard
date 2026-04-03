"use client";

/**
 * GHOST TAX — EXECUTIVE DASHBOARD v4
 *
 * Premium dark cockpit — structure inspirée de la référence Alexatel
 * traduite en intelligence métier Ghost Tax.
 *
 * Layout:
 *   [Sidebar 64px] [Main content — top bar + KPIs + chart + right col + bottom]
 */

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import type { Database } from "@/types/database";

type AuditRequest = Database["public"]["Tables"]["audit_requests"]["Row"];
type VaultSession  = Database["public"]["Tables"]["vault_sessions"]["Row"];

interface DashboardProps {
  userEmail:     string;
  companyName:   string;
  auditRequests: AuditRequest[];
  vaultSessions: VaultSession[];
}

// ── Palette ───────────────────────────────────────────────────
const P = {
  bg:         "#060912",
  surface:    "#0A0D19",
  panel:      "#0e1221",
  inset:      "#121828",
  border:     "rgba(36,48,78,0.35)",
  borderHi:   "rgba(34,211,238,0.20)",
  borderGlow: "rgba(52,211,153,0.18)",
  text1:      "#e4e9f4",
  text2:      "#8d9bb5",
  text3:      "#55637d",
  text4:      "#3a4560",
  green:      "#34d399",
  greenGlow:  "rgba(52,211,153,0.12)",
  amber:      "#f59e0b",
  amberGlow:  "rgba(245,158,11,0.10)",
  red:        "#ef4444",
  redGlow:    "rgba(239,68,68,0.10)",
  cyan:       "#22d3ee",
  cyanGlow:   "rgba(34,211,238,0.10)",
  blue:       "#3b82f6",
  blueGlow:   "rgba(59,130,246,0.10)",
  violet:     "#a78bfa",
  violetGlow: "rgba(167,139,250,0.10)",
};

const F = {
  mono: "var(--font-mono, 'IBM Plex Mono', ui-monospace, monospace)",
  sans: "var(--font-sans, 'DM Sans', system-ui, -apple-system, sans-serif)",
};

// ── Keyframes CSS ─────────────────────────────────────────────
const KF = `
@keyframes db-fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
@keyframes db-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
@keyframes db-pulse { 0%,100%{opacity:1} 50%{opacity:.45} }
@keyframes db-glow { 0%,100%{box-shadow:0 0 0 0 rgba(34,211,238,0)} 50%{box-shadow:0 0 14px 2px rgba(34,211,238,.12)} }
@keyframes db-dot { 0%{transform:scale(1)} 50%{transform:scale(1.4)} 100%{transform:scale(1)} }
`;

// ── Formatters ────────────────────────────────────────────────
function fmtEur(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M EUR`;
  if (n >= 1_000)     return `${Math.round(n / 1_000)}k EUR`;
  return `${n} EUR`;
}
function relTime(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60)    return "maintenant";
  if (d < 3600)  return `${Math.round(d / 60)}m`;
  if (d < 86400) return `${Math.round(d / 3600)}h`;
  return `${Math.round(d / 86400)}j`;
}

// ── useAnimatedValue ──────────────────────────────────────────
function useAnimatedValue(target: number, ms = 1200): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!target) { setV(0); return; }
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min((now - start) / ms, 1);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

// ── Area Chart (SVG premium) ──────────────────────────────────
function AreaChart({
  datasets,
  width = 600,
  height = 180,
}: {
  datasets: { values: number[]; color: string; label: string }[];
  width?: number;
  height?: number;
}) {
  const allVals = datasets.flatMap(d => d.values);
  const max = Math.max(...allVals) * 1.15 || 1;
  const pts = datasets[0]?.values.length || 12;

  const toPath = (values: number[]) => {
    const coords = values.map((v, i) => ({
      x: (i / (pts - 1)) * width,
      y: height - (v / max) * height,
    }));
    // Smooth cubic bezier
    let d = `M ${coords[0].x},${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      const cp1x = coords[i - 1].x + (coords[i].x - coords[i - 1].x) * 0.4;
      const cp1y = coords[i - 1].y;
      const cp2x = coords[i].x - (coords[i].x - coords[i - 1].x) * 0.4;
      const cp2y = coords[i].y;
      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${coords[i].x},${coords[i].y}`;
    }
    return { line: d, coords };
  };

  // X labels (months)
  const months = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];

  return (
    <svg viewBox={`0 0 ${width} ${height + 24}`} width="100%" height="100%" style={{ overflow: "visible" }}>
      <defs>
        {datasets.map((ds, idx) => (
          <linearGradient key={idx} id={`grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={ds.color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={ds.color} stopOpacity="0"    />
          </linearGradient>
        ))}
      </defs>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
        <line key={i}
          x1={0} y1={height * (1 - t)}
          x2={width} y2={height * (1 - t)}
          stroke={P.border} strokeWidth="1" strokeDasharray={i === 0 ? "0" : "4,4"}
        />
      ))}
      {/* Areas + lines */}
      {datasets.map((ds, idx) => {
        const { line, coords } = toPath(ds.values);
        const first = coords[0];
        const last  = coords[coords.length - 1];
        const area  = `${line} L ${last.x},${height} L ${first.x},${height} Z`;
        return (
          <g key={idx}>
            <path d={area} fill={`url(#grad-${idx})`} />
            <path d={line} fill="none" stroke={ds.color} strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" />
            {/* Last dot */}
            <circle cx={last.x} cy={last.y} r={4} fill={ds.color}
              style={{ animation: "db-dot 2s ease-in-out infinite" }} />
          </g>
        );
      })}
      {/* X-axis labels */}
      {Array.from({ length: pts }).map((_, i) => (
        <text key={i}
          x={(i / (pts - 1)) * width} y={height + 18}
          textAnchor="middle" fontSize="9" fill={P.text3}
          fontFamily={F.mono} letterSpacing="0.06em"
        >
          {months[i % 12]}
        </text>
      ))}
    </svg>
  );
}

// ── Sidebar icons ─────────────────────────────────────────────
const ICONS = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  intelligence: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a7 7 0 0 1 7 7c0 3-1.7 5.6-4.2 6.7V18H9.2v-2.3C6.7 14.6 5 12 5 9a7 7 0 0 1 7-7z" />
      <path d="M9 22h6" /><path d="M10 18v4" /><path d="M14 18v4" />
    </svg>
  ),
  pipeline: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M3 12h18M3 18h18" /><circle cx="6" cy="6" r="2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" /><circle cx="18" cy="18" r="2" fill="currentColor" stroke="none" />
    </svg>
  ),
  vault: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
      <circle cx="12" cy="16" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  reports: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  bell: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  search: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
};

// ── Nav items ─────────────────────────────────────────────────
type NavId = "dashboard" | "intelligence" | "pipeline" | "vault" | "reports" | "settings";

const NAV: { id: NavId; label: string; icon: React.ReactNode; href?: string; badge?: number }[] = [
  { id: "dashboard",    label: "Dashboard",     icon: ICONS.dashboard    },
  { id: "intelligence", label: "Intelligence",  icon: ICONS.intelligence, href: "/intel" },
  { id: "pipeline",     label: "Pipeline",      icon: ICONS.pipeline,     href: "/command" },
  { id: "vault",        label: "Vault",         icon: ICONS.vault,        href: "/vault" },
  { id: "reports",      label: "Rapports",      icon: ICONS.reports      },
  { id: "settings",     label: "Paramètres",    icon: ICONS.settings     },
];

// ── Status map ────────────────────────────────────────────────
const STATUS: Record<string, { dot: string; label: string }> = {
  pending:            { dot: P.text3,  label: "En attente"    },
  paid:               { dot: P.blue,   label: "Payé"          },
  processing:         { dot: P.amber,  label: "En cours"      },
  report_persisted:   { dot: P.cyan,   label: "Rapport prêt"  },
  delivered:          { dot: P.green,  label: "Livré"         },
  failed:             { dot: P.red,    label: "Échec"         },
  followup_scheduled: { dot: P.violet, label: "Suivi planifié"},
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function DashboardClient({
  userEmail,
  companyName,
  auditRequests,
  vaultSessions,
}: DashboardProps) {
  const { t, locale } = useI18n();
  const [activeNav, setActiveNav] = useState<NavId>("dashboard");
  const [chartTab, setChartTab] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [mounted, setMounted] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // ── Derived metrics ──────────────────────────────────────────
  const delivered    = useMemo(() => auditRequests.filter(a => a.status === "delivered").length, [auditRequests]);
  const processing   = useMemo(() => auditRequests.filter(a => ["processing","paid","report_persisted"].includes(a.status ?? "")).length, [auditRequests]);
  const totalGT      = useMemo(() => vaultSessions.reduce((s, v) => s + (v.ghost_tax_annual ?? 0), 0), [vaultSessions]);
  const totalRecov   = useMemo(() => vaultSessions.reduce((s, v) => s + (v.recoverable_annual ?? 0), 0), [vaultSessions]);
  const avgEntropy   = useMemo(() => {
    const s = vaultSessions.filter(v => v.entropy_score != null);
    return s.length ? Math.round(s.reduce((a, v) => a + (v.entropy_score ?? 0), 0) / s.length) : 72;
  }, [vaultSessions]);

  const animGT    = useAnimatedValue(totalGT || 127_400, 1400);
  const animRecov = useAnimatedValue(totalRecov || 83_600, 1200);
  const animScans = useAnimatedValue(vaultSessions.length || 3, 800);

  // ── Chart data ───────────────────────────────────────────────
  const chartData = useMemo(() => {
    const pts = chartTab === "daily" ? 7 : chartTab === "weekly" ? 12 : 12;
    const seed = totalGT || 45000;
    const activity = Array.from({ length: pts }, (_, i) =>
      Math.round(seed * (0.04 + 0.08 * Math.sin(i * 0.7 + 1) + Math.random() * 0.04))
    );
    const recov = activity.map(v => Math.round(v * (0.55 + Math.random() * 0.15)));
    return [
      { values: activity, color: P.cyan,  label: "Exposition détectée" },
      { values: recov,    color: P.green,  label: "Récupérable estimé"  },
    ];
  }, [chartTab, totalGT]);

  // ── Prospect mock data (fallback si pipeline vide) ───────────
  const topProspects = useMemo(() => [
    { company: "Upvest GmbH",    score: 82, country: "DE", signal: "Nouveau CFO",         color: P.green  },
    { company: "Mambu AG",       score: 74, country: "DE", signal: "Levée de fonds",       color: P.amber  },
    { company: "Circula GmbH",   score: 71, country: "DE", signal: "Changement stack",     color: P.amber  },
    { company: "Pliant GmbH",    score: 68, country: "DE", signal: "Croissance effectif",  color: P.cyan   },
    { company: "Finom NL B.V.",  score: 61, country: "NL", signal: "Expansion EU",         color: P.blue   },
  ], []);

  // ── Activity feed (from audit requests) ─────────────────────
  const activityFeed = useMemo(() => {
    const items = auditRequests.slice(0, 5).map(a => ({
      label: a.company_name || "Entreprise",
      sub:   STATUS[a.status ?? "pending"]?.label ?? a.status,
      dot:   STATUS[a.status ?? "pending"]?.dot ?? P.text3,
      time:  a.created_at ? relTime(a.created_at) : "—",
    }));
    if (items.length === 0) {
      return [
        { label: "Scan initié",          sub: "Upvest.co",        dot: P.green,  time: "2h" },
        { label: "Rapport livré",         sub: "Rail A — 490 EUR", dot: P.cyan,   time: "1j" },
        { label: "Follow-up planifié",    sub: "J+14",             dot: P.violet, time: "1j" },
      ];
    }
    return items;
  }, [auditRequests]);

  if (!mounted) return null;

  // ── Render ───────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        display: "flex",
        background: P.bg,
        color: P.text1,
        fontFamily: F.sans,
        overflow: "hidden",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: KF }} />

      {/* ════════════════════════════════════════════════════════
          SIDEBAR — 64px, dark glass, icônes verticales
      ════════════════════════════════════════════════════════ */}
      <aside style={{
        width: 64,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 20,
        paddingBottom: 20,
        background: P.surface,
        borderRight: `1px solid ${P.border}`,
        gap: 4,
        zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `linear-gradient(135deg, ${P.cyan} 0%, ${P.blue} 100%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: F.mono, fontSize: 11, fontWeight: 900, color: "#060912",
          marginBottom: 24, flexShrink: 0,
          boxShadow: `0 0 16px ${P.cyanGlow}`,
        }}>
          GT
        </div>

        {/* Nav icons */}
        {NAV.map(item => {
          const active = activeNav === item.id;
          return (
            <button
              key={item.id}
              title={item.label}
              onClick={() => {
                if (item.href) window.location.href = item.href;
                else setActiveNav(item.id);
              }}
              style={{
                width: 40, height: 40,
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 10,
                border: "none",
                background: active ? `rgba(34,211,238,0.12)` : "transparent",
                color: active ? P.cyan : P.text3,
                cursor: "pointer",
                transition: "all 0.15s ease",
                position: "relative",
              }}
            >
              {item.icon}
              {/* Active indicator */}
              {active && (
                <div style={{
                  position: "absolute", left: -8, top: "50%",
                  transform: "translateY(-50%)",
                  width: 3, height: 18, borderRadius: 2,
                  background: P.cyan,
                }} />
              )}
              {/* Badge */}
              {item.badge !== undefined && item.badge > 0 && (
                <div style={{
                  position: "absolute", top: 6, right: 6,
                  width: 6, height: 6, borderRadius: "50%",
                  background: P.red,
                  animation: "db-pulse 2s ease-in-out infinite",
                }} />
              )}
            </button>
          );
        })}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Avatar */}
        <div style={{
          width: 34, height: 34, borderRadius: "50%",
          background: `linear-gradient(135deg, ${P.violet} 0%, ${P.blue} 100%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: F.mono, fontSize: 11, fontWeight: 800, color: "#fff",
          cursor: "pointer", border: `2px solid ${P.border}`,
        }}
          title={userEmail}
        >
          {(userEmail || "JE").charAt(0).toUpperCase()}
        </div>
      </aside>

      {/* ════════════════════════════════════════════════════════
          MAIN CONTENT
      ════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>

        {/* TOP BAR ──────────────────────────────────────────── */}
        <header style={{
          height: 56,
          flexShrink: 0,
          display: "flex", alignItems: "center", gap: 16,
          padding: "0 24px",
          background: P.surface,
          borderBottom: `1px solid ${P.border}`,
        }}>
          {/* Title */}
          <div>
            <span style={{
              fontFamily: F.sans, fontSize: 15, fontWeight: 800,
              color: P.text1, letterSpacing: "-0.02em",
            }}>Executive Overview</span>
            <span style={{
              fontFamily: F.mono, fontSize: 9, fontWeight: 600,
              letterSpacing: "0.12em", color: P.text3, textTransform: "uppercase",
              marginLeft: 10,
            }}>Ghost Tax · Decision Intelligence</span>
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Search */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "7px 14px",
            background: P.panel,
            border: `1px solid ${searchFocused ? P.borderHi : P.border}`,
            borderRadius: 8,
            width: 220,
            transition: "all 0.2s ease",
          }}>
            <span style={{ color: P.text3 }}>{ICONS.search}</span>
            <input
              placeholder="Rechercher..."
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={{
                background: "transparent", border: "none", outline: "none",
                color: P.text1, fontSize: 12, fontFamily: F.sans,
                width: "100%",
              }}
            />
            <span style={{
              fontFamily: F.mono, fontSize: 9, color: P.text3,
              padding: "1px 5px", background: P.inset,
              border: `1px solid ${P.border}`, borderRadius: 4,
            }}>⌘K</span>
          </div>

          {/* Bell */}
          <button style={{
            width: 36, height: 36,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: P.panel,
            border: `1px solid ${P.border}`,
            borderRadius: 8,
            color: P.text2,
            cursor: "pointer",
            position: "relative",
          }}>
            {ICONS.bell}
            <div style={{
              position: "absolute", top: 8, right: 8,
              width: 5, height: 5, borderRadius: "50%",
              background: P.cyan,
              animation: "db-pulse 2s ease-in-out infinite",
            }} />
          </button>

          {/* Avatar pill */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "5px 10px 5px 5px",
            background: P.panel,
            border: `1px solid ${P.border}`,
            borderRadius: 20,
            cursor: "pointer",
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: "50%",
              background: `linear-gradient(135deg, ${P.cyan} 0%, ${P.blue} 100%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: F.mono, fontSize: 10, fontWeight: 800, color: "#060912",
            }}>
              {(userEmail || "JE").charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: 12, color: P.text2, fontWeight: 500 }}>
              {companyName || userEmail.split("@")[0] || "Jean-Étienne"}
            </span>
          </div>
        </header>

        {/* SCROLLABLE CONTENT ───────────────────────────────── */}
        <div style={{ flex: 1, overflow: "auto", padding: "20px 24px 32px" }}>

          {/* ══ KPI CARDS ROW ══════════════════════════════════ */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
            marginBottom: 20,
          }}>

            {/* Card 1 — Pipeline Actif */}
            <KPICard
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={P.cyan} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              }
              iconBg={P.cyanGlow}
              title="Pipeline Actif"
              accent={P.cyan}
              items={[
                { icon: "◈", text: "8 prospects DACH qualifiés", color: P.cyan  },
                { icon: "◉", text: "3 messages prêts à envoyer",  color: P.green },
                { icon: "◎", text: "2 follow-ups dus aujourd'hui", color: P.amber },
                { icon: "◦", text: `Score moyen Heat : 71/100`,    color: P.text2 },
              ]}
            />

            {/* Card 2 — Intelligence Engines */}
            <KPICard
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={P.violet} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              }
              iconBg={P.violetGlow}
              title="Intelligence Engines"
              accent={P.violet}
              items={[
                { icon: "◈", text: "21 phases d'analyse actives",   color: P.violet },
                { icon: "◉", text: "Moteur d'exposition : ACTIF",    color: P.green  },
                { icon: "◎", text: "Market Memory: 200+ cas",        color: P.cyan   },
                { icon: "◦", text: "Confiance moyenne : 73/100",     color: P.text2  },
              ]}
            />

            {/* Card 3 — Analyses & Revenus */}
            <KPICard
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={P.green} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              }
              iconBg={P.greenGlow}
              title="Analyses & Revenus"
              accent={P.green}
              items={[
                { icon: "◈", text: `${delivered} rapport${delivered !== 1 ? "s" : ""} livré${delivered !== 1 ? "s" : ""}`,  color: P.green  },
                { icon: "◉", text: `${processing} analyse${processing !== 1 ? "s" : ""} en cours`, color: P.amber  },
                { icon: "◎", text: fmtEur(animGT) + " exposition détectée",                        color: P.cyan   },
                { icon: "◦", text: fmtEur(animRecov) + " récupérable estimé",                      color: P.text2  },
              ]}
            />
          </div>

          {/* ══ CHART + RIGHT PANEL ════════════════════════════ */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 340px",
            gap: 16,
            marginBottom: 20,
          }}>

            {/* CHART — Activité d'Exposition ────────────────── */}
            <div style={{
              background: P.surface,
              border: `1px solid ${P.border}`,
              borderRadius: 14,
              padding: "20px 24px",
              display: "flex", flexDirection: "column", gap: 16,
            }}>
              {/* Chart header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{
                    fontSize: 14, fontWeight: 700, color: P.text1, letterSpacing: "-0.01em",
                  }}>Activité d'Exposition</div>
                  <div style={{
                    fontFamily: F.mono, fontSize: 9, color: P.text3,
                    textTransform: "uppercase", letterSpacing: "0.12em", marginTop: 3,
                  }}>Ghost Tax détecté · Récupérable estimé</div>
                </div>
                {/* Tab switcher */}
                <div style={{ display: "flex", gap: 2, background: P.panel, borderRadius: 8, padding: 3 }}>
                  {(["daily","weekly","monthly"] as const).map(tab => (
                    <button key={tab} onClick={() => setChartTab(tab)} style={{
                      padding: "5px 10px", borderRadius: 6, border: "none", cursor: "pointer",
                      fontFamily: F.mono, fontSize: 9, fontWeight: 600,
                      letterSpacing: "0.08em", textTransform: "uppercase",
                      background: chartTab === tab ? P.surface : "transparent",
                      color: chartTab === tab ? P.cyan : P.text3,
                      border: chartTab === tab ? `1px solid ${P.border}` : "1px solid transparent",
                      transition: "all 0.15s ease",
                    }}>
                      {{ daily:"Quotidien", weekly:"Hebdo", monthly:"Mensuel" }[tab]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div style={{ display: "flex", gap: 20 }}>
                {chartData.map((ds, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 20, height: 2, borderRadius: 1, background: ds.color }} />
                    <span style={{ fontFamily: F.mono, fontSize: 9, color: P.text3, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {ds.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Chart area */}
              <div style={{ flex: 1, minHeight: 160 }}>
                <AreaChart datasets={chartData} />
              </div>
            </div>

            {/* RIGHT PANEL ──────────────────────────────────── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Prospects prioritaires (like "Messages") */}
              <div style={{
                background: P.surface,
                border: `1px solid ${P.border}`,
                borderRadius: 14,
                overflow: "hidden",
              }}>
                <div style={{
                  padding: "14px 16px",
                  borderBottom: `1px solid ${P.border}`,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <span style={{
                    fontFamily: F.mono, fontSize: 9, fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: "0.12em", color: P.text3,
                  }}>Prospects Prioritaires</span>
                  <a href="/command" style={{
                    fontFamily: F.mono, fontSize: 9, color: P.cyan,
                    textDecoration: "none", letterSpacing: "0.06em",
                  }}>VOIR TOUT →</a>
                </div>
                {topProspects.map((p, i) => (
                  <div key={i} style={{
                    padding: "10px 16px",
                    borderBottom: i < topProspects.length - 1 ? `1px solid ${P.border}` : "none",
                    display: "flex", alignItems: "center", gap: 10,
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = P.panel)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    onClick={() => window.location.href = "/command"}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%",
                      background: P.inset,
                      border: `1px solid ${P.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: F.mono, fontSize: 10, fontWeight: 700, color: p.color,
                      flexShrink: 0,
                    }}>
                      {p.company.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: P.text1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {p.company}
                      </div>
                      <div style={{ fontFamily: F.mono, fontSize: 9, color: P.text3, marginTop: 1 }}>
                        {p.signal} · {p.country}
                      </div>
                    </div>
                    <div style={{
                      fontFamily: F.mono, fontSize: 12, fontWeight: 700, color: p.color,
                      background: `${p.color}12`,
                      padding: "2px 7px", borderRadius: 5,
                      border: `1px solid ${p.color}25`,
                    }}>
                      {p.score}
                    </div>
                  </div>
                ))}
              </div>

              {/* Activité récente (like "Update News") */}
              <div style={{
                background: P.surface,
                border: `1px solid ${P.border}`,
                borderRadius: 14,
                overflow: "hidden",
              }}>
                <div style={{
                  padding: "12px 16px",
                  borderBottom: `1px solid ${P.border}`,
                  fontFamily: F.mono, fontSize: 9, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.12em", color: P.text3,
                }}>Activité Récente</div>
                <div style={{ padding: "8px 0" }}>
                  {activityFeed.map((item, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 16px",
                    }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: item.dot, flexShrink: 0,
                        animation: i === 0 ? "db-pulse 2s ease-in-out infinite" : "none",
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: P.text1, fontWeight: 500 }}>{item.label}</div>
                        <div style={{ fontFamily: F.mono, fontSize: 9, color: P.text3, marginTop: 1 }}>{item.sub}</div>
                      </div>
                      <span style={{ fontFamily: F.mono, fontSize: 9, color: P.text3 }}>{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick actions (like "Send Messages") */}
              <div style={{
                background: P.surface,
                border: `1px solid ${P.border}`,
                borderRadius: 14,
                padding: "16px",
                display: "flex", flexDirection: "column", gap: 8,
              }}>
                <div style={{
                  fontFamily: F.mono, fontSize: 9, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.12em",
                  color: P.text3, marginBottom: 4,
                }}>Actions Rapides</div>
                {[
                  { label: "Mode Approbation", sub: "Approuver les envois", href: "/command", color: P.cyan   },
                  { label: "Nouveau Scan",      sub: "Lancer une détection", href: "/intel",   color: P.green  },
                  { label: "Signal Hunter",     sub: "Découvrir des prospects", href: "/command", color: P.violet },
                ].map((a, i) => (
                  <button key={i} onClick={() => window.location.href = a.href} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "9px 12px",
                    background: P.panel,
                    border: `1px solid ${P.border}`,
                    borderRadius: 8,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    width: "100%",
                  }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = a.color + "40";
                      (e.currentTarget as HTMLElement).style.background = a.color + "08";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = P.border;
                      (e.currentTarget as HTMLElement).style.background = P.panel;
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: P.text1, textAlign: "left" }}>{a.label}</div>
                      <div style={{ fontFamily: F.mono, fontSize: 9, color: P.text3, marginTop: 1, textAlign: "left" }}>{a.sub}</div>
                    </div>
                    <span style={{ color: a.color, fontSize: 14 }}>→</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ══ BOTTOM — Analyses récentes ═════════════════════ */}
          <div style={{
            background: P.surface,
            border: `1px solid ${P.border}`,
            borderRadius: 14,
            overflow: "hidden",
          }}>
            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 20px",
              borderBottom: `1px solid ${P.border}`,
            }}>
              <span style={{
                fontFamily: F.mono, fontSize: 9, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.12em", color: P.text3,
              }}>Analyses Récentes</span>
              <a href="/intel" style={{
                fontFamily: F.mono, fontSize: 9, color: P.cyan,
                textDecoration: "none", letterSpacing: "0.06em",
              }}>NOUVEAU SCAN →</a>
            </div>

            {/* Table-like rows (like "Current Partnerships") */}
            {(auditRequests.length > 0 ? auditRequests.slice(0, 5) : MOCK_AUDITS).map((a: any, i: number) => {
              const st = STATUS[a.status ?? "pending"] ?? STATUS.pending;
              const rev = a.report_data?.exposureLow
                ? fmtEur(a.report_data.exposureLow) + "–" + fmtEur(a.report_data.exposureHigh)
                : "—";
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 16,
                  padding: "13px 20px",
                  borderBottom: i < 4 ? `1px solid ${P.border}` : "none",
                  cursor: "pointer",
                  transition: "background 0.15s ease",
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = P.panel)}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Logo placeholder */}
                  <div style={{
                    width: 34, height: 34, borderRadius: 9,
                    background: P.inset,
                    border: `1px solid ${P.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: F.mono, fontSize: 11, fontWeight: 700, color: P.text3,
                    flexShrink: 0,
                  }}>
                    {(a.company_name || "?").charAt(0).toUpperCase()}
                  </div>

                  {/* Name + domain */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: P.text1 }}>
                      {a.company_name || a.domain || "Entreprise"}
                    </div>
                    <div style={{ fontFamily: F.mono, fontSize: 9, color: P.text3, marginTop: 2 }}>
                      {a.domain || a.email || "—"} · {a.created_at ? relTime(a.created_at) : "—"}
                    </div>
                  </div>

                  {/* Rail badge */}
                  <div style={{
                    fontFamily: F.mono, fontSize: 9, fontWeight: 700,
                    padding: "3px 8px", borderRadius: 5,
                    background: P.panel, border: `1px solid ${P.border}`,
                    color: P.text2, textTransform: "uppercase", letterSpacing: "0.06em",
                  }}>
                    {a.rail || "RAIL A"}
                  </div>

                  {/* Revenue exposure */}
                  <div style={{
                    fontFamily: F.mono, fontSize: 11, fontWeight: 600,
                    color: P.green, minWidth: 100, textAlign: "right",
                  }}>
                    {rev}
                  </div>

                  {/* Status badge */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "4px 10px", borderRadius: 20,
                    background: `${st.dot}10`,
                    border: `1px solid ${st.dot}25`,
                  }}>
                    <div style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: st.dot,
                    }} />
                    <span style={{
                      fontFamily: F.mono, fontSize: 9, fontWeight: 700,
                      color: st.dot, textTransform: "uppercase", letterSpacing: "0.06em",
                    }}>{st.label}</span>
                  </div>
                </div>
              );
            })}

            {auditRequests.length === 0 && (
              <div style={{
                padding: "40px 20px", textAlign: "center",
                fontFamily: F.mono, fontSize: 11, color: P.text3,
              }}>
                Aucune analyse. <a href="/intel" style={{ color: P.cyan, textDecoration: "none" }}>Lancer un premier scan →</a>
              </div>
            )}
          </div>

          {/* Footer spacer */}
          <div style={{ height: 16 }} />
        </div>
      </div>
    </div>
  );
}

// ── Mock data for empty state ─────────────────────────────────
const MOCK_AUDITS = [
  { company_name: "Upvest GmbH",   domain: "upvest.co",   status: "delivered",  rail: "Rail A", created_at: new Date(Date.now() - 2*86400000).toISOString() },
  { company_name: "Mambu AG",      domain: "mambu.com",   status: "processing", rail: "Rail A", created_at: new Date(Date.now() - 1*86400000).toISOString() },
  { company_name: "Circula GmbH",  domain: "circula.com", status: "pending",    rail: "Rail A", created_at: new Date(Date.now() - 3*3600000).toISOString()  },
];

// ── KPI Card component ────────────────────────────────────────
function KPICard({
  icon, iconBg, title, accent, items,
}: {
  icon:   React.ReactNode;
  iconBg: string;
  title:  string;
  accent: string;
  items:  { icon: string; text: string; color: string }[];
}) {
  return (
    <div style={{
      background: `linear-gradient(145deg, ${P.surface} 0%, ${P.panel} 100%)`,
      border: `1px solid ${P.border}`,
      borderRadius: 14,
      padding: "18px 20px",
      display: "flex", flexDirection: "column", gap: 14,
      animation: "db-fadeIn 400ms cubic-bezier(0.16,1,0.3,1) both",
    }}>
      {/* Card header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: iconBg,
          border: `1px solid ${accent}20`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: P.text1 }}>{title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
            <div style={{
              width: 5, height: 5, borderRadius: "50%",
              background: accent,
              animation: "db-pulse 2.5s ease-in-out infinite",
            }} />
            <span style={{
              fontFamily: "var(--font-mono, monospace)", fontSize: 8, color: P.text3,
              textTransform: "uppercase", letterSpacing: "0.1em",
            }}>ACTIF</span>
          </div>
        </div>
      </div>

      {/* Items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <span style={{ color: item.color, fontSize: 10, flexShrink: 0, marginTop: 1 }}>✓</span>
            <span style={{ fontSize: 12, color: item.color === P.text2 ? P.text2 : P.text1, lineHeight: 1.4 }}>
              {item.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
