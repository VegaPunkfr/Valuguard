"use client";

import { useI18n, LOCALES } from "@/lib/i18n";

const BD = "rgba(36,48,78,0.32)";
const T2 = "#8d9bb5";
const T3 = "#55637d";
const A = "#3b82f6";
const MO = "ui-monospace,'Cascadia Code','Fira Code',monospace";

export default function LanguageSelector() {
  const { locale, setLocale } = useI18n();

  return (
    <div style={{ display: "flex", gap: 0, borderRadius: 6, border: "1px solid " + BD, overflow: "hidden" }}>
      {LOCALES.map((l) => {
        const active = locale === l.code;
        return (
          <button
            key={l.code}
            onClick={() => setLocale(l.code)}
            style={{
              padding: "4px 8px",
              fontSize: 9,
              fontFamily: MO,
              fontWeight: active ? 700 : 500,
              letterSpacing: ".04em",
              background: active ? "rgba(59,130,246,0.12)" : "transparent",
              color: active ? A : T3,
              border: "none",
              borderRight: "1px solid " + BD,
              cursor: "pointer",
              transition: "all 0.12s",
            }}
            onMouseEnter={(e) => { if (!active) (e.target as HTMLElement).style.color = T2; }}
            onMouseLeave={(e) => { if (!active) (e.target as HTMLElement).style.color = T3; }}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
}
