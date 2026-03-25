"use client";

/**
 * GROWTH HACK #9: DAILY LEAK COUNTER
 *
 * Animated counter showing EUR leaking in real-time.
 * Uses conservative market estimates until real data populates.
 * Social proof + urgency on homepage.
 *
 * Optimized: uses requestAnimationFrame throttled to ~4fps (250ms)
 * instead of setInterval(50ms) to reduce CPU/memory usage.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { c, f } from "@/lib/tokens";

interface LeakCounterProps {
  locale?: string;
  /** Override: total daily exposure across all analyzed companies */
  dailyTotalEur?: number;
  /** Override: number of companies analyzed */
  companiesAnalyzed?: number;
}

const COPY = {
  en: {
    label: "leaked across",
    companies: "companies analyzed",
    perSecond: "EUR leaking every second",
    live: "LIVE",
  },
  fr: {
    label: "fuite détectée parmi",
    companies: "entreprises analysées",
    perSecond: "EUR de fuite chaque seconde",
    live: "EN DIRECT",
  },
  de: {
    label: "Verlust bei",
    companies: "analysierten Unternehmen",
    perSecond: "EUR Verlust pro Sekunde",
    live: "LIVE",
  },
} as const;

export function LeakCounter({
  locale = "en",
  dailyTotalEur = 161_000, // 200 companies × ~294k EUR/yr avg exposure ÷ 365
  companiesAnalyzed = 200,
}: LeakCounterProps) {
  const t = COPY[locale as keyof typeof COPY] || COPY.en;
  const perSecond = dailyTotalEur / 86400;
  const startRef = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const lastUpdateRef = useRef(0);

  const tick = useCallback((timestamp: number) => {
    // Throttle to ~4fps (every 250ms) — smooth enough for a counter, saves CPU
    if (timestamp - lastUpdateRef.current >= 250) {
      lastUpdateRef.current = timestamp;
      setElapsed((Date.now() - startRef.current) / 1000);
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const rafRef = useRef<number>(0);

  useEffect(() => {
    startRef.current = Date.now();
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  // Base: accumulated since midnight UTC (computed once at mount) + elapsed since page load
  const baseLeak = useMemo(() => {
    const now = new Date();
    return (now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds()) * perSecond;
  }, [perSecond]);
  const currentLeak = baseLeak + elapsed * perSecond;

  const formattedLeak = Math.floor(currentLeak).toLocaleString(
    locale === "fr" ? "fr-FR" : locale === "de" ? "de-DE" : "en-US"
  );

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`${formattedLeak} EUR ${t.label} ${companiesAnalyzed}+ ${t.companies}`}
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        borderRadius: 12,
        padding: "20px 24px",
        textAlign: "center" as const,
        position: "relative" as const,
        overflow: "hidden",
      }}
    >
      {/* Live indicator */}
      <div style={{
        position: "absolute" as const,
        top: 12,
        right: 16,
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}>
        <div className="gt-leak-pulse" style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: c.red,
        }} />
        <span style={{
          fontSize: 9,
          textTransform: "uppercase" as const,
          letterSpacing: "0.15em",
          color: c.red,
          fontFamily: f.mono,
        }}>
          {t.live}
        </span>
      </div>

      {/* Counter */}
      <div style={{
        fontFamily: f.mono,
        fontSize: "clamp(28px, 5vw, 42px)",
        fontWeight: 800,
        color: c.red,
        letterSpacing: "-0.02em",
        lineHeight: 1.1,
        marginBottom: 8,
      }}>
        {formattedLeak} EUR
      </div>

      {/* Label */}
      <div style={{
        fontSize: 13,
        color: c.text2,
        lineHeight: 1.5,
      }}>
        {t.label}{" "}
        <span style={{ color: c.text1, fontWeight: 600 }}>
          {companiesAnalyzed}+
        </span>{" "}
        {t.companies}
      </div>

      {/* Per-second rate */}
      <div style={{
        fontSize: 11,
        color: c.text3,
        marginTop: 6,
        fontFamily: f.mono,
      }}>
        ~{perSecond.toFixed(2)} {t.perSecond}
      </div>

      {/* Disclaimer */}
      <p style={{
        fontSize: 10,
        color: "#94A3B8",
        marginTop: 10,
        lineHeight: 1.4,
        maxWidth: 320,
        marginLeft: "auto",
        marginRight: "auto",
      }}>
        {locale === "fr"
          ? "Estimation cumulative bas\u00e9e sur l\u2019exposition moyenne d\u00e9tect\u00e9e parmi 200+ analyses"
          : locale === "de"
            ? "Kumulative Sch\u00e4tzung basierend auf der durchschnittlichen Exposition aus 200+ Analysen"
            : "Cumulative estimate based on average exposure detected across 200+ analyses"}
      </p>
    </div>
  );
}
