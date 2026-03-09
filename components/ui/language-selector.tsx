"use client";

import { useI18n, LOCALES } from "@/lib/i18n";
import { c, f } from "@/lib/tokens";

export default function LanguageSelector() {
  const { locale, setLocale } = useI18n();

  return (
    <div style={{ display: "flex", gap: 0, borderRadius: 8, border: "1px solid " + c.borderS, overflow: "hidden" }}>
      {LOCALES.map((l, i) => {
        const active = locale === l.code;
        const isLast = i === LOCALES.length - 1;
        return (
          <button
            key={l.code}
            onClick={() => setLocale(l.code)}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              fontFamily: f.mono,
              fontWeight: active ? 700 : 500,
              letterSpacing: ".04em",
              background: active ? c.accentBg : "transparent",
              color: active ? c.accent : c.text3,
              border: "none",
              borderRight: isLast ? "none" : "1px solid " + c.borderS,
              cursor: "pointer",
              transition: "all 120ms",
              minHeight: 36,
            }}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
}
