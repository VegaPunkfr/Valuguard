/**
 * GHOST TAX — DESIGN TOKENS (2026)
 *
 * Single source of truth. Matches globals.css --gt-* variables.
 * Import { c, f, ... } from "@/lib/tokens" in every component.
 */

/* ── Colors ─────────────────────────────────────── */
export const c = {
  bg:       "#050810",
  surface:  "#0a0e1a",
  card:     "#0d1120",
  elevated: "#111628",
  raised:   "#161c30",

  border:   "rgba(255,255,255,0.06)",
  borderS:  "rgba(255,255,255,0.10)",
  borderSS: "rgba(255,255,255,0.14)",

  text1: "#f0f2f8",
  text2: "#9ba3b8",
  text3: "#5c6478",
  text4: "#3d4455",

  accent:   "#4f8ff7",
  accentHi: "#6ba3ff",
  accentBg: "rgba(79,143,247,0.08)",
  accentBd: "rgba(79,143,247,0.20)",

  green:    "#2dd4a0",
  greenBg:  "rgba(45,212,160,0.06)",
  greenBd:  "rgba(45,212,160,0.18)",
  red:      "#f06060",
  redBg:    "rgba(240,96,96,0.06)",
  redBd:    "rgba(240,96,96,0.18)",
  amber:    "#f0a030",
  amberBg:  "rgba(240,160,48,0.06)",
  amberBd:  "rgba(240,160,48,0.18)",
  cyan:     "#38d5f0",
  linkedin: "#0A66C2",
} as const;

/* ── Fonts ──────────────────────────────────────── */
export const f = {
  mono: "var(--gt-font-mono, ui-monospace, 'Cascadia Code', monospace)",
  sans: "var(--gt-font-sans, system-ui, -apple-system, sans-serif)",
} as const;

/* ── Panel style (modern glass — lighter blur) ─── */
export const panel: React.CSSProperties = {
  background: "rgba(13,17,32,0.80)",
  backdropFilter: "blur(16px) saturate(1.2)",
  WebkitBackdropFilter: "blur(16px) saturate(1.2)",
  border: "1px solid " + c.borderS,
  borderRadius: 18,
  boxShadow: "0 4px 24px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)",
};

/* ── Card style ─────────────────────────────────── */
export const card: React.CSSProperties = {
  background: c.card,
  border: "1px solid " + c.border,
  borderRadius: 18,
  boxShadow: "0 2px 8px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.4)",
};

/* ── Inset box ──────────────────────────────────── */
export const inset: React.CSSProperties = {
  background: "rgba(0,0,0,0.20)",
  border: "1px solid " + c.border,
  borderRadius: 10,
};

/* ── Framer Motion ──────────────────────────────── */
export const reveal = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
} as const;

export const revealTransition = (delay = 0) => ({
  duration: 0.5,
  ease: [0.16, 1, 0.3, 1] as const,
  delay: delay / 1000,
});

/* ── Backward-compat aliases ────────────────────── */
export const colors = c;
export const fonts = f;
export const glass = panel;

/* ── Reusable partial styles ────────────────────── */
export const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontFamily: f.mono,
  fontWeight: 700,
  color: c.accent,
  letterSpacing: ".14em",
  textTransform: "uppercase",
  marginBottom: 14,
};

export const dataBox: React.CSSProperties = {
  ...inset,
  padding: "16px",
  textAlign: "center",
};

export const inputBase: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: 10,
  border: "1px solid " + c.borderS,
  background: "rgba(0,0,0,0.30)",
  color: c.text1,
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 200ms, box-shadow 200ms",
};

export const labelBase: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontFamily: f.mono,
  color: c.text3,
  letterSpacing: ".08em",
  marginBottom: 6,
  fontWeight: 600,
  textTransform: "uppercase",
};
