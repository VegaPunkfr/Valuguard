/**
 * GHOST TAX — TAILWIND CONFIGURATION (2026)
 *
 * Aligned with globals.css --gt-* tokens.
 * Minimal custom config — leverage CSS variables for theming.
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
      colors: {
        gt: {
          bg:       "var(--gt-bg)",
          surface:  "var(--gt-surface)",
          card:     "var(--gt-card)",
          elevated: "var(--gt-elevated)",
          raised:   "var(--gt-raised)",
          accent:   "var(--gt-accent)",
          "accent-hi": "var(--gt-accent-hi)",
          green:    "var(--gt-green)",
          red:      "var(--gt-red)",
          amber:    "var(--gt-amber)",
          cyan:     "var(--gt-cyan)",
          "text-1": "var(--gt-text-1)",
          "text-2": "var(--gt-text-2)",
          "text-3": "var(--gt-text-3)",
          "text-4": "var(--gt-text-4)",
        },
      },

      fontFamily: {
        sans: ["var(--gt-font-sans)"],
        mono: ["var(--gt-font-mono)"],
      },

      borderRadius: {
        "gt-xs":   "var(--gt-r-xs)",
        "gt-sm":   "var(--gt-r-sm)",
        "gt-md":   "var(--gt-r-md)",
        "gt-lg":   "var(--gt-r-lg)",
        "gt-xl":   "var(--gt-r-xl)",
        "gt-2xl":  "var(--gt-r-2xl)",
        "gt-full": "var(--gt-r-full)",
      },

      boxShadow: {
        "gt-sm": "var(--gt-shadow-sm)",
        "gt-md": "var(--gt-shadow-md)",
        "gt-lg": "var(--gt-shadow-lg)",
        "gt-xl": "var(--gt-shadow-xl)",
      },

      transitionDuration: {
        "gt-fast":   "var(--gt-fast)",
        "gt-normal": "var(--gt-normal)",
        "gt-slow":   "var(--gt-slow)",
      },

      transitionTimingFunction: {
        "gt-ease":   "var(--gt-ease)",
        "gt-spring": "var(--gt-spring)",
      },

      zIndex: {
        "gt-base":     "var(--gt-z-base)",
        "gt-elevated": "var(--gt-z-elevated)",
        "gt-sticky":   "var(--gt-z-sticky)",
        "gt-overlay":  "var(--gt-z-overlay)",
        "gt-modal":    "var(--gt-z-modal)",
        "gt-toast":    "var(--gt-z-toast)",
      },

      keyframes: {
        "gt-fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "gt-scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        "gt-bar-grow": {
          from: { transform: "scaleX(0)" },
          to:   { transform: "scaleX(1)" },
        },
      },

      animation: {
        "gt-fade-up":  "gt-fade-up 0.5s var(--gt-ease) both",
        "gt-scale-in": "gt-scale-in 0.3s var(--gt-spring) both",
        "gt-bar-grow": "gt-bar-grow 0.7s var(--gt-ease) both",
      },

      maxWidth: {
        "gt-sm": "640px",
        "gt-md": "860px",
        "gt-lg": "1120px",
        "gt-xl": "1280px",
      },
    },
  },

  plugins: [],
};

export default config;
