"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";
import de from "@/messages/de.json";

export type Locale = "en" | "fr" | "de";

const STORAGE_KEY = "vg-locale";
const DEFAULT_LOCALE: Locale = "en";

// ── Context ──────────────────────────────────────────
type I18nCtx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, fallback?: string) => string;
  formatCurrency: (amount: number, compact?: boolean) => string;
};

const I18nContext = createContext<I18nCtx>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (k) => k,
  formatCurrency: (n) => `$${n}`,
});

// ── Dictionaries ────────────────────────────────────
const dict: Record<Locale, Record<string, string>> = { en, fr, de };

// ── Currency formatting ─────────────────────────────
function buildCurrencyFormatter(locale: Locale) {
  return function formatCurrency(amount: number, compact?: boolean): string {
    if (locale === "en") {
      if (compact && amount >= 1e6) return `$${(amount / 1e6).toFixed(1)}M`;
      if (compact && amount >= 1e4) return `$${Math.round(amount / 1e3)}k`;
      return "$" + Math.round(amount).toLocaleString("en-US");
    }
    // FR and DE use Euro
    if (compact && amount >= 1e6) return `${(amount / 1e6).toFixed(1)}M €`;
    if (compact && amount >= 1e4) return `${Math.round(amount / 1e3)}k €`;
    return Math.round(amount).toLocaleString(locale === "fr" ? "fr-FR" : "de-DE") + " €";
  };
}

// ── Pricing amounts (locale-aware) ──────────────────
// Canonical prices live in lib/pricing.ts — these are kept for backward compat.
export const PRICES = {
  audit: 990,
  essentials: 990,
  guardian: 990,
};

// ── Provider ─────────────────────────────────────────
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && dict[stored]) {
      setLocaleState(stored);
      document.documentElement.lang = stored;
      return;
    }
    // Auto-detect from browser language (fr-FR → fr, de-AT → de, etc.)
    const browserLang = navigator.language?.slice(0, 2)?.toLowerCase();
    if (browserLang && dict[browserLang as Locale]) {
      const detected = browserLang as Locale;
      setLocaleState(detected);
      localStorage.setItem(STORAGE_KEY, detected);
      document.documentElement.lang = detected;
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
    document.documentElement.lang = l;
  }, []);

  const t = useCallback((key: string, fallback?: string): string => {
    return dict[locale]?.[key] ?? dict.en[key] ?? fallback ?? key;
  }, [locale]);

  const formatCurrency = useCallback(
    buildCurrencyFormatter(locale),
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, formatCurrency }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export const LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
  { code: "de", label: "DE" },
];
