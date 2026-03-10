/**
 * GHOST TAX — DESIGN TOKENS (2026)
 *
 * Single source of truth. Matches globals.css --gt-* variables.
 * Import { c, f, sp, ts, ... } from "@/lib/tokens" in every component.
 *
 * MATHEMATICAL FOUNDATION:
 * ─ Typography: Perfect Fifth scale (ratio 1.5) from 16px base
 * ─ Spacing: Golden Ratio progression (φ = 1.618)
 * ─ Colors: HSL color space (no raw hex in components)
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

/* ── Colors — HSL color space ──────────────────── */
export const c = {
  bg:       "hsl(228, 38%, 3%)",
  surface:  "hsl(226, 33%, 7%)",
  card:     "hsl(226, 30%, 9%)",
  elevated: "hsl(225, 28%, 11%)",
  raised:   "hsl(224, 25%, 14%)",

  border:   "hsla(0, 0%, 100%, 0.06)",
  borderS:  "hsla(0, 0%, 100%, 0.10)",
  borderSS: "hsla(0, 0%, 100%, 0.14)",

  text1: "hsl(228, 40%, 96%)",
  text2: "hsl(224, 16%, 66%)",
  text3: "hsl(222, 12%, 41%)",
  text4: "hsl(222, 14%, 29%)",

  accent:   "hsl(216, 91%, 65%)",
  accentHi: "hsl(216, 100%, 71%)",
  accentBg: "hsla(216, 91%, 65%, 0.08)",
  accentBd: "hsla(216, 91%, 65%, 0.20)",

  green:    "hsl(162, 68%, 51%)",
  greenBg:  "hsla(162, 68%, 51%, 0.06)",
  greenBd:  "hsla(162, 68%, 51%, 0.18)",
  red:      "hsl(0, 82%, 66%)",
  redBg:    "hsla(0, 82%, 66%, 0.06)",
  redBd:    "hsla(0, 82%, 66%, 0.18)",
  amber:    "hsl(35, 86%, 56%)",
  amberBg:  "hsla(35, 86%, 56%, 0.06)",
  amberBd:  "hsla(35, 86%, 56%, 0.18)",
  cyan:     "hsl(190, 86%, 58%)",
  linkedin: "hsl(210, 89%, 40%)",
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
