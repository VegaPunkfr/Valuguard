"use client";

import { useState, useEffect } from "react";

export default function StatsStrip() {
  const [counts, setCounts] = useState([0, 0, 0, 0]);
  const targets = [21, 48, 12, 490];

  useEffect(() => {
    const timers = targets.map((target, i) => {
      let current = 0;
      const steps = 50;
      const inc = target / steps;
      return setInterval(() => {
        current = Math.min(current + inc, target);
        setCounts((prev) => {
          const n = [...prev];
          n[i] = Math.round(current);
          return n;
        });
        if (current >= target) clearInterval(timers[i]);
      }, 40 + i * 10);
    });
    return () => timers.forEach(clearInterval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = [
    { val: `${counts[0]}`, label: "Detection phases" },
    { val: `${counts[1]}h`, label: "Guaranteed delivery" },
    { val: `${counts[2]}`, label: "Leak types detected" },
    { val: `€${counts[3]}`, label: "One-shot detection" },
  ];

  return (
    <section style={{ background: "#060912" }}>
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "20px 24px",
          display: "flex",
          justifyContent: "center",
          gap: "48px",
          flexWrap: "wrap",
        }}
      >
        {stats.map((s) => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: "var(--gt-font-mono)",
                fontSize: "28px",
                fontWeight: 800,
                color: "#E2E8F0",
                letterSpacing: "-0.02em",
              }}
            >
              {s.val}
            </div>
            <div
              style={{
                fontFamily: "var(--gt-font-mono)",
                fontSize: "10px",
                color: "#94A3B8",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginTop: "4px",
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
