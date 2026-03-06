/**
 * VALUGUARD — TAILWIND CONFIGURATION
 *
 * Liquid Glass design tokens injected via CSS custom properties.
 * Convention: `vg-` prefix for all custom tokens (Visual Governance).
 * Colors use `rgb(var(--vg-xxx) / <alpha>)` for native Tailwind opacity.
 */

import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],

  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./content/**/*.{md,mdx}",
  ],

  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
      },
    },

    extend: {
      /* Semantic colors — mapped to CSS vars for auto dark/light switching */
      colors: {
        vg: {
          "bg-primary": "rgb(var(--vg-bg-primary) / <alpha-value>)",
          "bg-secondary": "rgb(var(--vg-bg-secondary) / <alpha-value>)",
          "bg-elevated": "rgb(var(--vg-bg-elevated) / <alpha-value>)",
          "bg-overlay": "rgb(var(--vg-bg-overlay) / <alpha-value>)",
          "text-primary": "rgb(var(--vg-text-primary) / <alpha-value>)",
          "text-secondary": "rgb(var(--vg-text-secondary) / <alpha-value>)",
          "text-tertiary": "rgb(var(--vg-text-tertiary) / <alpha-value>)",
          "text-disabled": "rgb(var(--vg-text-disabled) / <alpha-value>)",
          "border-subtle": "rgb(var(--vg-border-subtle) / <alpha-value>)",
          "border-default": "rgb(var(--vg-border-default) / <alpha-value>)",
          "border-strong": "rgb(var(--vg-border-strong) / <alpha-value>)",
          accent: "rgb(var(--vg-accent) / <alpha-value>)",
          "accent-hover": "rgb(var(--vg-accent-hover) / <alpha-value>)",
          "accent-pressed": "rgb(var(--vg-accent-pressed) / <alpha-value>)",
          "accent-subtle": "rgb(var(--vg-accent-subtle-bg) / <alpha-value>)",
          "severity-critical": "rgb(var(--vg-severity-critical) / <alpha-value>)",
          "severity-high": "rgb(var(--vg-severity-high) / <alpha-value>)",
          "severity-medium": "rgb(var(--vg-severity-medium) / <alpha-value>)",
          "severity-low": "rgb(var(--vg-severity-low) / <alpha-value>)",
          success: "rgb(var(--vg-success) / <alpha-value>)",
          info: "rgb(var(--vg-info) / <alpha-value>)",
          "cyan-300": "rgb(var(--vg-cyan-300) / <alpha-value>)",
          "cyan-400": "rgb(var(--vg-cyan-400) / <alpha-value>)",
          "cyan-500": "rgb(var(--vg-cyan-500) / <alpha-value>)",
          "cyan-600": "rgb(var(--vg-cyan-600) / <alpha-value>)",
          "cyan-900": "rgb(var(--vg-cyan-900) / <alpha-value>)",
        },
      },

      /* Typography */
      fontFamily: {
        sans: ["var(--vg-font-sans)"],
        mono: ["var(--vg-font-mono)"],
      },

      fontSize: {
        "vg-xs": ["var(--vg-text-xs)", { lineHeight: "var(--vg-leading-normal)" }],
        "vg-sm": ["var(--vg-text-sm)", { lineHeight: "var(--vg-leading-normal)" }],
        "vg-base": ["var(--vg-text-base)", { lineHeight: "var(--vg-leading-normal)" }],
        "vg-lg": ["var(--vg-text-lg)", { lineHeight: "var(--vg-leading-snug)" }],
        "vg-xl": ["var(--vg-text-xl)", { lineHeight: "var(--vg-leading-snug)" }],
        "vg-2xl": ["var(--vg-text-2xl)", { lineHeight: "var(--vg-leading-tight)" }],
        "vg-3xl": ["var(--vg-text-3xl)", { lineHeight: "var(--vg-leading-tight)" }],
        "vg-4xl": ["var(--vg-text-4xl)", { lineHeight: "var(--vg-leading-tight)", letterSpacing: "var(--vg-tracking-tighter)" }],
        "vg-5xl": ["var(--vg-text-5xl)", { lineHeight: "1", letterSpacing: "var(--vg-tracking-tighter)" }],
      },

      letterSpacing: {
        "vg-tighter": "var(--vg-tracking-tighter)",
        "vg-tight": "var(--vg-tracking-tight)",
        "vg-normal": "var(--vg-tracking-normal)",
        "vg-wide": "var(--vg-tracking-wide)",
        "vg-wider": "var(--vg-tracking-wider)",
      },

      /* Spacing (4px scale) */
      spacing: {
        "vg-0": "var(--vg-space-0)",
        "vg-0.5": "var(--vg-space-0-5)",
        "vg-1": "var(--vg-space-1)",
        "vg-1.5": "var(--vg-space-1-5)",
        "vg-2": "var(--vg-space-2)",
        "vg-3": "var(--vg-space-3)",
        "vg-4": "var(--vg-space-4)",
        "vg-5": "var(--vg-space-5)",
        "vg-6": "var(--vg-space-6)",
        "vg-8": "var(--vg-space-8)",
        "vg-10": "var(--vg-space-10)",
        "vg-12": "var(--vg-space-12)",
        "vg-16": "var(--vg-space-16)",
        "vg-20": "var(--vg-space-20)",
        "vg-24": "var(--vg-space-24)",
        "vg-32": "var(--vg-space-32)",
      },

      /* Border radius */
      borderRadius: {
        "vg-none": "var(--vg-radius-none)",
        "vg-sm": "var(--vg-radius-sm)",
        "vg-md": "var(--vg-radius-md)",
        "vg-lg": "var(--vg-radius-lg)",
        "vg-xl": "var(--vg-radius-xl)",
        "vg-full": "var(--vg-radius-full)",
      },

      /* Box shadows */
      boxShadow: {
        "vg-xs": "var(--vg-shadow-xs)",
        "vg-sm": "var(--vg-shadow-sm)",
        "vg-md": "var(--vg-shadow-md)",
        "vg-lg": "var(--vg-shadow-lg)",
        "vg-xl": "var(--vg-shadow-xl)",
        "vg-glass": "var(--vg-shadow-glass)",
      },

      /* Transitions */
      transitionDuration: {
        "vg-fast": "var(--vg-duration-fast)",
        "vg-normal": "var(--vg-duration-normal)",
        "vg-slow": "var(--vg-duration-slow)",
        "vg-entrance": "var(--vg-duration-entrance)",
      },

      transitionTimingFunction: {
        "vg-out": "var(--vg-ease-out)",
        "vg-in-out": "var(--vg-ease-in-out)",
        "vg-spring": "var(--vg-ease-spring)",
      },

      /* Z-index scale */
      zIndex: {
        "vg-base": "var(--vg-z-base)",
        "vg-elevated": "var(--vg-z-elevated)",
        "vg-dropdown": "var(--vg-z-dropdown)",
        "vg-sticky": "var(--vg-z-sticky)",
        "vg-overlay": "var(--vg-z-overlay)",
        "vg-modal": "var(--vg-z-modal)",
        "vg-toast": "var(--vg-z-toast)",
        "vg-tooltip": "var(--vg-z-tooltip)",
      },

      /* Keyframe animations */
      keyframes: {
        "vg-fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "vg-slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "vg-slide-down": {
          from: { opacity: "0", transform: "translateY(-8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "vg-scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "vg-gauge-fill": {
          from: { strokeDashoffset: "283" },
          to: { strokeDashoffset: "var(--gauge-offset)" },
        },
        "vg-number-tick": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "vg-bar-grow": {
          from: { transform: "scaleX(0)" },
          to: { transform: "scaleX(1)" },
        },
        "vg-pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },

      animation: {
        "vg-fade-in": "vg-fade-in var(--vg-duration-entrance) var(--vg-ease-out)",
        "vg-slide-up": "vg-slide-up var(--vg-duration-entrance) var(--vg-ease-out)",
        "vg-slide-down": "vg-slide-down var(--vg-duration-normal) var(--vg-ease-out)",
        "vg-scale-in": "vg-scale-in var(--vg-duration-entrance) var(--vg-ease-out)",
        "vg-gauge-fill": "vg-gauge-fill 1.2s var(--vg-ease-out) forwards",
        "vg-number-tick": "vg-number-tick 0.4s var(--vg-ease-spring)",
        "vg-bar-grow": "vg-bar-grow 0.8s var(--vg-ease-out) forwards",
        "vg-pulse-subtle": "vg-pulse-subtle 2s var(--vg-ease-in-out) infinite",
      },

      /* Backdrop blur */
      backdropBlur: {
        "vg-glass": "var(--vg-glass-blur)",
      },

      /* Container max widths */
      maxWidth: {
        "vg-sm": "var(--vg-container-sm)",
        "vg-md": "var(--vg-container-md)",
        "vg-lg": "var(--vg-container-lg)",
        "vg-xl": "var(--vg-container-xl)",
        "vg-2xl": "var(--vg-container-2xl)",
      },
    },
  },

  plugins: [
    function ({ addComponents }: { addComponents: (components: Record<string, Record<string, string>>) => void }) {
      addComponents({
        ".glass-panel": {
          "@apply vg-glass-panel": {},
        },
        ".glass-kpi": {
          "@apply vg-glass-kpi": {},
        },
        ".glass-navbar": {
          "@apply vg-glass-navbar": {},
        },
      });
    },
  ],
};

export default config;
