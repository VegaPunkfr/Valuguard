/**
 * GHOST TAX — DESIGN TOKENS (2026)
 *
 * Single source of truth. Matches globals.css --gt-* variables.
 * Import { c, f, sp, ts, ... } from "@/lib/tokens" in every component.
 *
 * THEME: Enterprise Light (B2B Audit)
 *
 * MATHEMATICAL FOUNDATION:
 * ─ Typography: Perfect Fifth scale (ratio 1.5) from 16px base
 * ─ Spacing: Golden Ratio progression (φ = 1.618)
 * ─ Colors: Enterprise light palette
 */

/* ── Typographic Scale — Perfect Fifth (1.5) ───── */
/*   base: 16px
 *   sm:   16 / 1.5  = 10.67px
 *   base: 16px
 *   md:   16 × 1.5  = 24px
 *   lg:   24 × 1.5  = 36px
 *   xl:   36 × 1.5  = 54px
 *   2xl:  54 × 1.5  = 81px                         */
export const ts = {
  xs:  "0.667rem",   // 10.67px
  sm:  "0.75rem",    // 12px (rounded from scale)
  base: "1rem",      // 16px
  md:  "1.5rem",     // 24px
  lg:  "2.25rem",    // 36px
  xl:  "3.375rem",   // 54px
  "2xl": "5.063rem", // 81px
} as const;

/* ── Spatial Scale — Golden Ratio (1.618) ──────── */
/*   4 → 8 → 16 → 24 → 40 → 64 → 104              */
export const sp = {
  "1": "4px",
  "2": "8px",
  "3": "16px",
  "4": "24px",
  "5": "40px",
  "6": "64px",
  "7": "104px",
} as const;

/* ── Colors — Enterprise Light ───────────────────── */
export const c = {
  bg:       "#FFFFFF",
  surface:  "#F8FAFC",
  card:     "#F8FAFC",
  elevated: "#F1F5F9",
  raised:   "#E2E8F0",

  border:   "#E2E8F0",
  borderS:  "#CBD5E1",
  borderSS: "#94A3B8",

  text1: "#0F172A",
  text2: "#475569",
  text3: "#64748B",
  text4: "#94A3B8",

  accent:   "#0F172A",
  accentHi: "#1E293B",
  accentBg: "rgba(15,23,42,0.04)",
  accentBd: "rgba(15,23,42,0.12)",

  green:    "#059669",
  greenBg:  "rgba(5,150,105,0.06)",
  greenBd:  "rgba(5,150,105,0.18)",
  red:      "#DC2626",
  redBg:    "rgba(220,38,38,0.06)",
  redBd:    "rgba(220,38,38,0.18)",
  amber:    "#3b82f6",
  amberBg:  "rgba(59,130,246,0.06)",
  amberBd:  "rgba(59,130,246,0.18)",
  cyan:     "#0891B2",
  linkedin: "#0A66C2",
} as const;

/* ── Fonts ──────────────────────────────────────── */
export const f = {
  mono: "var(--gt-font-mono, ui-monospace, 'Cascadia Code', monospace)",
  sans: "var(--gt-font-sans, system-ui, -apple-system, sans-serif)",
} as const;

/* ── Panel style (enterprise — flat, no glass) ──── */
export const panel: React.CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid " + c.border,
  borderRadius: 18,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

/* ── Card style ─────────────────────────────────── */
export const card: React.CSSProperties = {
  background: c.card,
  border: "1px solid " + c.border,
  borderRadius: 18,
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};

/* ── Inset box ──────────────────────────────────── */
export const inset: React.CSSProperties = {
  background: "#F1F5F9",
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

/* ── Colors — Warm Light (Zylo-inspired, marketing) ── */
export const cWarm = {
  bg:       "#FAF9F7",
  surface:  "#F3F1ED",
  card:     "#FFFFFF",
  elevated: "#F3F1ED",
  raised:   "#E8E5DF",

  border:   "#E8E5DF",
  borderS:  "#D4D0C8",
  borderSS: "#B8B4AC",

  text1: "#1A1A1A",
  text2: "#4A4A4A",
  text3: "#7A7A7A",
  text4: "#A8A8A8",

  accent:   "#3b82f6",
  accentHi: "#2563eb",
  accentBg: "rgba(59,130,246,0.06)",
  accentBd: "rgba(59,130,246,0.15)",

  green:    "#059669",
  greenBg:  "rgba(5,150,105,0.08)",
  greenBd:  "rgba(5,150,105,0.18)",
  red:      "#DC2626",
  redBg:    "rgba(220,38,38,0.06)",
  redBd:    "rgba(220,38,38,0.18)",
  amber:    "#3b82f6",
  amberBg:  "rgba(59,130,246,0.06)",
  amberBd:  "rgba(59,130,246,0.18)",
  cyan:     "#0891B2",
  linkedin: "#0A66C2",
} as const;

/* ── Fonts — Warm ──────────────────────────────── */
export const fWarm = {
  mono: "var(--gt-font-ibm-plex, 'IBM Plex Mono', ui-monospace, monospace)",
  sans: "var(--gt-font-dm-sans, 'DM Sans', system-ui, sans-serif)",
} as const;

/* ── Panel style — Warm ────────────────────────── */
export const panelWarm: React.CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid " + cWarm.border,
  borderRadius: 18,
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};

/* ── Card style — Warm ─────────────────────────── */
export const cardWarm: React.CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid " + cWarm.border,
  borderRadius: 14,
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  transition: "transform 200ms, box-shadow 200ms",
};

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
  background: "#FFFFFF",
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
