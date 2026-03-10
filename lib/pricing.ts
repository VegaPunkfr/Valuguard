/**
 * GHOST TAX — CENTRAL PRICING CONFIG
 *
 * Single source of truth for all pricing, product names, and Stripe metadata.
 * No public-facing component should hardcode prices directly.
 *
 * MARKETS: US (USD) + Germany/DACH (EUR)
 *
 * RAIL A: Financial Exposure Detection — 490 EUR / $490 USD flat (impulse buy, no call)
 * RAIL B_STABILIZE: Stabilization Protocol 30/60/90 — one-time (self-serve checkout, includes Detection)
 * RAIL B_MONITOR: Continuous Drift Monitoring — monthly or annual subscription
 * RAIL C: Stabilization Mission — custom/enterprise (high-touch)
 */

// ── Headcount tier boundaries (kept for metadata, not pricing) ──
export type HeadcountTier = "starter" | "growth" | "scale";

export function getHeadcountTier(headcount: number | undefined): HeadcountTier {
  if (!headcount || headcount <= 200) return "starter";
  if (headcount <= 1000) return "growth";
  return "scale";
}

// ── Locale-aware currency ──
export type PricingLocale = "en" | "fr" | "de";

export function getCurrency(locale: PricingLocale): "usd" | "eur" {
  // US market = USD, everything else = EUR
  return locale === "en" ? "usd" : "eur";
}

export function getCurrencySymbol(locale: PricingLocale): string {
  return locale === "en" ? "$" : "€";
}

// ── Rail A: Flat pricing (launch strategy — impulse buy) ──
export const RAIL_A_PRICE = {
  eur: 490,
  usd: 490,
} as const;

export function getRailAPrice(_headcount: number | undefined, locale: PricingLocale): number {
  const currency = getCurrency(locale);
  return currency === "usd" ? RAIL_A_PRICE.usd : RAIL_A_PRICE.eur;
}

// ── All Rails ──
export const RAILS = {
  A: {
    id: "rail_a",
    name: "Détection d'exposition financière",
    name_en: "Financial Exposure Detection",
    name_de: "Finanzielle Expositions-Erkennung",
    price_eur: 490,
    price_usd: 490,
    currency: "eur" as const,
    type: "one_time" as const,
    stripe_mode: "payment" as const,
    description: "Expose hidden SaaS, AI and Cloud financial leaks in 48 hours.",
    description_fr: "Exposez les fuites financières SaaS, IA et Cloud invisibles en 48 heures.",
    description_de: "Versteckte SaaS-, KI- und Cloud-Finanzlecks in 48 Stunden aufdecken.",
    metadata: {
      rail: "A",
      product: "detection",
    },
  },
  B_STABILIZE: {
    id: "rail_b_stabilize",
    name: "Protocole de stabilisation 30/60/90",
    name_en: "Stabilization Protocol 30/60/90",
    name_de: "Stabilisierungsprotokoll 30/60/90",
    price_usd: 5990,
    price_eur: 4990,
    currency: "eur" as const,
    type: "one_time" as const,
    stripe_mode: "payment" as const,
    includes_detection: true,
    description: "Detection + 30/60/90-day corrective roadmap + vendor negotiation playbooks. Includes full Detection report.",
    description_fr: "Détection + feuille de route corrective 30/60/90 jours + protocoles de négociation fournisseurs. Rapport de détection inclus.",
    description_de: "Erkennung + 30/60/90-Tage-Korrektur-Roadmap + Verhandlungsleitfäden. Vollständiger Erkennungsbericht inklusive.",
    metadata: {
      rail: "B",
      product: "stabilization",
    },
  },
  // Keep B_SETUP as alias for backward compat
  B_SETUP: {
    id: "rail_b_setup",
    name: "Protocole de stabilisation 30/60/90",
    name_en: "Stabilization Protocol 30/60/90",
    name_de: "Stabilisierungsprotokoll 30/60/90",
    price_eur: 4990,
    price_usd: 5990,
    currency: "eur" as const,
    type: "one_time" as const,
    stripe_mode: "payment" as const,
    description: "Detection + structured corrective plan: 30/60/90-day roadmap + negotiation playbooks.",
    description_fr: "Détection + plan correctif structuré: feuille de route 30/60/90 jours + protocoles de négociation.",
    description_de: "Erkennung + strukturierter Korrekturplan: 30/60/90-Tage-Roadmap + Verhandlungsleitfaden.",
    cta_target: "/contact",
    metadata: {
      rail: "B",
      product: "stabilization_setup",
    },
  },
  B_MONITOR: {
    id: "rail_b_monitor",
    name: "Monitoring continu de dérive",
    name_en: "Continuous Drift Monitoring",
    name_de: "Kontinuierliches Drift-Monitoring",
    price_eur: 1990,
    price_usd: 2490,
    price_eur_annual: 19900,
    price_usd_annual: 24900,
    currency: "eur" as const,
    type: "recurring" as const,
    stripe_mode: "subscription" as const,
    interval: "month" as const,
    annual_savings_pct: 17,
    description: "Monthly drift monitoring, vendor pressure alerts, executive reporting. Includes monthly detection refresh.",
    description_fr: "Monitoring mensuel des dérives, alertes pression fournisseurs, rapport exécutif. Détection mensuelle incluse.",
    description_de: "Monatliches Drift-Monitoring, Lieferanten-Druck-Alerts, Executive Reporting. Monatliche Erkennung inklusive.",
    cta_target: "/contact",
    metadata: {
      rail: "B",
      product: "monitoring",
    },
  },
  C: {
    id: "rail_c",
    name: "Mission de stabilisation",
    name_en: "Stabilization Mission",
    name_de: "Stabilisierungsmission",
    price_eur: 20000,
    price_usd: 25000,
    currency: "eur" as const,
    type: "custom" as const,
    description: "Full institutional engagement. Embedded team. Board-level governance.",
    description_fr: "Engagement institutionnel complet. Équipe intégrée. Gouvernance niveau conseil.",
    description_de: "Vollständiges institutionelles Engagement. Eingebettetes Team. Governance auf Vorstandsebene.",
    cta_target: "mailto:audits@ghost-tax.com",
    metadata: {
      rail: "C",
      product: "mission",
    },
  },
} as const;

/**
 * Stripe price IDs — set via env or Stripe dashboard.
 * For tiered Rail A, use price_data with dynamic amount (no fixed Price ID needed).
 * Read at runtime in server context only (API routes).
 */
export function getStripePriceId(rail: "A" | "B_SETUP" | "B_STABILIZE" | "B_MONITOR" | "B_MONITOR_ANNUAL" = "A"): string {
  switch (rail) {
    case "A":
      return process.env.STRIPE_PRICE_ID || "";
    case "B_SETUP":
    case "B_STABILIZE":
      return process.env.STRIPE_PRICE_ID_B_SETUP || "";
    case "B_MONITOR":
      return process.env.STRIPE_PRICE_ID_B_MONITOR || "";
    case "B_MONITOR_ANNUAL":
      return process.env.STRIPE_PRICE_ID_B_MONITOR_ANNUAL || "";
  }
}

/** Get the right price for a rail based on locale */
export function getRailPrice(
  rail: "A" | "B_STABILIZE" | "B_MONITOR" | "B_MONITOR_ANNUAL" | "C",
  locale: PricingLocale,
  headcount?: number
): { amount: number; currency: "usd" | "eur"; symbol: string; formatted: string } {
  const cur = getCurrency(locale);
  const sym = getCurrencySymbol(locale);
  let amount: number;

  switch (rail) {
    case "A":
      amount = getRailAPrice(headcount, locale);
      break;
    case "B_STABILIZE":
      amount = cur === "usd" ? RAILS.B_STABILIZE.price_usd : RAILS.B_STABILIZE.price_eur;
      break;
    case "B_MONITOR":
      amount = cur === "usd" ? RAILS.B_MONITOR.price_usd : RAILS.B_MONITOR.price_eur;
      break;
    case "B_MONITOR_ANNUAL":
      amount = cur === "usd" ? RAILS.B_MONITOR.price_usd_annual : RAILS.B_MONITOR.price_eur_annual;
      break;
    case "C":
      amount = cur === "usd" ? (RAILS.C.price_usd as number) : (RAILS.C.price_eur as number);
      break;
  }

  const formatted = cur === "usd"
    ? `$${amount.toLocaleString("en-US")}`
    : `${amount.toLocaleString("de-DE")} €`;

  return { amount, currency: cur, symbol: sym, formatted };
}

/** Format any price for display */
export function formatPrice(amount: number, locale: PricingLocale): string {
  const cur = getCurrency(locale);
  if (cur === "usd") return `$${amount.toLocaleString("en-US")}`;
  return `${amount.toLocaleString("de-DE")} €`;
}

/** Format Rail A price for display (backward compat — uses starter tier) */
export function formatRailAPrice(locale: "en" | "fr" | "de"): string {
  return formatPrice(getRailAPrice(undefined, locale), locale);
}

// ── Revenue model projections (for admin dashboard) ──
export const REVENUE_MODEL = {
  target_eur: 7_000_000,
  target_months: 24,
  blended_arpu: {
    rail_a_avg: 490, // Flat launch price (EUR)
    rail_b_stabilize: 4990,
    rail_b_monitor_monthly: 1990,
    rail_b_monitor_annual: 19900,
    rail_c_avg: 25000,
  },
  conversion_targets: {
    scan_to_detect: 0.04, // 4% free scan → Rail A
    detect_to_stabilize: 0.12, // 12% Rail A → Rail B Stabilize
    detect_to_monitor: 0.08, // 8% Rail A → Rail B Monitor
    stabilize_to_mission: 0.05, // 5% Rail B → Rail C
  },
  markets: {
    us: { weight: 0.60, currency: "usd" as const },
    de: { weight: 0.40, currency: "eur" as const },
  },
};
