"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";
import de from "@/messages/de.json";
import nl from "@/messages/nl.json";

export type Locale = "en" | "fr" | "de" | "nl";

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
const dict: Record<Locale, Record<string, string>> = { en, fr, de, nl };

// ── Currency formatting ─────────────────────────────
function buildCurrencyFormatter(locale: Locale) {
  return function formatCurrency(amount: number, compact?: boolean): string {
    if (locale === "en") {
      if (compact && amount >= 1e6) return `$${(amount / 1e6).toFixed(1)}M`;
      if (compact && amount >= 1e4) return `$${Math.round(amount / 1e3)}k`;
      return "$" + Math.round(amount).toLocaleString("en-US");
    }
    // FR, DE and NL use Euro
    if (compact && amount >= 1e6) return `${(amount / 1e6).toFixed(1)}M €`;
    if (compact && amount >= 1e4) return `${Math.round(amount / 1e3)}k €`;
    const localeMap: Record<string, string> = { fr: "fr-FR", de: "de-DE", nl: "nl-NL" };
    return Math.round(amount).toLocaleString(localeMap[locale] || "de-DE") + " €";
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
    // Only use stored preference — never auto-detect from browser language.
    // The site defaults to English. Users switch manually via language selector.
    // This prevents French/German browsers from auto-switching and breaking
    // the brand experience (Ghost Tax must stay Ghost Tax, not "Taxe Fantôme").
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && dict[stored]) {
      setLocaleState(stored);
      document.documentElement.lang = stored;
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
  { code: "nl", label: "NL" },
];
