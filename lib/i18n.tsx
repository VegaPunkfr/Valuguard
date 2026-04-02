"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export type Locale = "en" | "fr" | "de" | "nl";

const STORAGE_KEY = "vg-locale";
const DEFAULT_LOCALE: Locale = "en";

// ── Locale loaders (dynamic import — only active locale loaded) ──
const loaders: Record<Locale, () => Promise<Record<string, string>>> = {
  en: () => import("@/messages/en.json").then(m => m.default),
  fr: () => import("@/messages/fr.json").then(m => m.default),
  de: () => import("@/messages/de.json").then(m => m.default),
  nl: () => import("@/messages/nl.json").then(m => m.default),
};

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

// ── Currency formatting ─────────────────────────────
function buildCurrencyFormatter(locale: Locale) {
  return function formatCurrency(amount: number, compact?: boolean): string {
    if (locale === "en") {
      if (compact && amount >= 1e6) return `$${(amount / 1e6).toFixed(1)}M`;
      if (compact && amount >= 1e4) return `$${Math.round(amount / 1e3)}k`;
      return "$" + Math.round(amount).toLocaleString("en-US");
    }
    if (compact && amount >= 1e6) return `${(amount / 1e6).toFixed(1)}M €`;
    if (compact && amount >= 1e4) return `${Math.round(amount / 1e3)}k €`;
    const localeMap: Record<string, string> = { fr: "fr-FR", de: "de-DE", nl: "nl-NL" };
    return Math.round(amount).toLocaleString(localeMap[locale] || "de-DE") + " €";
  };
}

// ── Pricing amounts (locale-aware) ──────────────────
export const PRICES = {
  audit: 990,
  essentials: 990,
  guardian: 990,
};

// ── Provider ─────────────────────────────────────────
export function I18nProvider({
  children,
  initialLocale,
  initialMessages,
}: {
  children: ReactNode;
  initialLocale?: Locale;
  initialMessages?: Record<string, string>;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale || DEFAULT_LOCALE);
  const [messages, setMessages] = useState<Record<string, string>>(initialMessages || {});
  const [fallback, setFallback] = useState<Record<string, string>>(
    initialLocale === "en" ? (initialMessages || {}) : {}
  );

  // Load messages on mount and locale change
  useEffect(() => {
    let cancelled = false;

    // Detect stored locale preference (client-side only)
    const stored = typeof window !== "undefined"
      ? localStorage.getItem(STORAGE_KEY) as Locale | null
      : null;
    const targetLocale = stored && loaders[stored] ? stored : locale;

    if (targetLocale !== locale) {
      setLocaleState(targetLocale);
    }

    // Load the target locale
    loaders[targetLocale]().then(msgs => {
      if (!cancelled) {
        setMessages(msgs);
        if (typeof document !== "undefined") document.documentElement.lang = targetLocale;
      }
    });

    // Load English fallback if not already English
    if (targetLocale !== "en" && Object.keys(fallback).length === 0) {
      loaders.en().then(msgs => {
        if (!cancelled) setFallback(msgs);
      });
    }

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, l);
      document.cookie = `vg-locale=${l};path=/;max-age=31536000;SameSite=Lax`;
      document.documentElement.lang = l;
    }
    // Load new locale messages
    loaders[l]().then(msgs => setMessages(msgs));
    if (l !== "en") {
      loaders.en().then(msgs => setFallback(msgs));
    }
  }, []);

  const t = useCallback((key: string, fb?: string): string => {
    return messages[key] ?? fallback[key] ?? fb ?? key;
  }, [messages, fallback]);

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
