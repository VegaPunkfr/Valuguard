"use client";

/**
 * GROWTH HACK #9: DAILY LEAK COUNTER
 *
 * Animated counter showing EUR leaking in real-time.
 * Uses conservative market estimates until real data populates.
 * Social proof + urgency on homepage.
 */

import { useState, useEffect, useRef } from "react";

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
  dailyTotalEur = 100_000, // Conservative: 200 companies × 500 EUR/day avg
  companiesAnalyzed = 200,
}: LeakCounterProps) {
  const t = COPY[locale as keyof typeof COPY] || COPY.en;
  const perSecond = dailyTotalEur / 86400;
  const startRef = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    startRef.current = Date.now();
    const interval = setInterval(() => {
      setElapsed((Date.now() - startRef.current) / 1000);
    }, 50); // 20fps for smooth counting
    return () => clearInterval(interval);
  }, []);

  // Base: accumulated since midnight UTC + elapsed since page load
  const now = new Date();
  const secondsSinceMidnight = now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();
  const baseLeak = secondsSinceMidnight * perSecond;
  const currentLeak = baseLeak + elapsed * perSecond;

  const formattedLeak = Math.floor(currentLeak).toLocaleString(
    locale === "fr" ? "fr-FR" : locale === "de" ? "de-DE" : "en-US"
  );

  return (
    <div style={{
      background: "rgba(10,13,25,0.8)",
      border: "1px solid rgba(36,48,78,0.28)",
      borderRadius: 12,
      padding: "20px 24px",
      textAlign: "center" as const,
      position: "relative" as const,
      overflow: "hidden",
    }}>
      {/* Live indicator */}
      <div style={{
        position: "absolute" as const,
        top: 12,
        right: 16,
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}>
        <div style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "#ef4444",
          animation: "pulse 2s infinite",
        }} />
        <span style={{
          fontSize: 9,
          textTransform: "uppercase" as const,
          letterSpacing: "0.15em",
          color: "#ef4444",
          fontFamily: "var(--font-mono)",
        }}>
          {t.live}
        </span>
      </div>

      {/* Counter */}
      <div style={{
        fontFamily: "var(--font-mono)",
        fontSize: "clamp(28px, 5vw, 42px)",
        fontWeight: 800,
        color: "#ef4444",
        letterSpacing: "-0.02em",
        lineHeight: 1.1,
        marginBottom: 8,
      }}>
        {formattedLeak} EUR
      </div>

      {/* Label */}
      <div style={{
        fontSize: 13,
        color: "#8d9bb5",
        lineHeight: 1.5,
      }}>
        {t.label}{" "}
        <span style={{ color: "#e4e9f4", fontWeight: 600 }}>
          {companiesAnalyzed}+
        </span>{" "}
        {t.companies}
      </div>

      {/* Per-second rate */}
      <div style={{
        fontSize: 11,
        color: "#55637d",
        marginTop: 6,
        fontFamily: "var(--font-mono)",
      }}>
        ~{perSecond.toFixed(2)} {t.perSecond}
      </div>

      {/* CSS animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
