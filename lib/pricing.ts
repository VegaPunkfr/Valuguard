/**
 * GHOST TAX — CENTRAL PRICING CONFIG
 *
 * Single source of truth for all pricing, product names, and Stripe metadata.
 * No public-facing component should hardcode prices directly.
 *
 * RAIL A: Detection d'exposition financiere — 490 EUR one-time (public checkout)
 * RAIL B: Plan de stabilisation 30/60/90 — scoped pricing (contact/intake flow)
 * RAIL C: Mission de stabilisation — custom/institutional (high-touch inquiry)
 */

export const RAILS = {
  A: {
    id: "rail_a",
    name: "Detection d'exposition financiere",
    name_en: "Financial Exposure Detection",
    name_de: "Finanzielle Expositions-Erkennung",
    price_eur: 490,
    currency: "eur",
    type: "one_time" as const,
    stripe_mode: "payment" as const,
    description: "Expose hidden SaaS, AI and Cloud financial leaks in 48 hours.",
    description_fr: "Exposez les fuites financieres SaaS, IA et Cloud invisibles en 48 heures.",
    description_de: "Versteckte SaaS-, KI- und Cloud-Finanzlecks in 48 Stunden aufdecken.",
    metadata: {
      rail: "A",
      product: "detection",
    },
  },
  B_SETUP: {
    id: "rail_b_setup",
    name: "Plan de stabilisation 30/60/90",
    name_en: "Stabilization Protocol 30/60/90",
    name_de: "Stabilisierungsprotokoll 30/60/90",
    price_eur: 2500,
    currency: "eur",
    type: "one_time" as const,
    stripe_mode: "payment" as const,
    description: "Structured corrective plan: 30/60/90-day roadmap + negotiation playbooks.",
    description_fr: "Plan correctif structure: feuille de route 30/60/90 jours + protocoles de negociation.",
    description_de: "Strukturierter Korrekturplan: 30/60/90-Tage-Roadmap + Verhandlungsleitfaden.",
    cta_target: "/contact",
    metadata: {
      rail: "B",
      product: "stabilization_setup",
    },
  },
  B_MONITOR: {
    id: "rail_b_monitor",
    name: "Monitoring continu de derive",
    name_en: "Continuous Drift Monitoring",
    name_de: "Kontinuierliches Drift-Monitoring",
    price_eur: 2000,
    currency: "eur",
    type: "recurring" as const,
    stripe_mode: "subscription" as const,
    interval: "month" as const,
    description: "Monthly drift monitoring, alerts, vendor pressure tracking + executive report.",
    description_fr: "Monitoring mensuel des derives, alertes, suivi pression fournisseurs + rapport executif.",
    description_de: "Monatliches Drift-Monitoring, Alerts, Lieferanten-Druckverfolgung + Executive Report.",
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
    price_eur: null,
    currency: "eur",
    type: "custom" as const,
    description: "Private / institutional / custom engagement.",
    description_fr: "Engagement prive / institutionnel / sur mesure.",
    description_de: "Privates / institutionelles Engagement nach Mass.",
    cta_target: "mailto:audits@ghost-tax.com",
    metadata: {
      rail: "C",
      product: "mission",
    },
  },
} as const;

/**
 * Stripe price IDs — set via env or Stripe dashboard.
 * Read at runtime in server context only (API routes).
 * Do NOT reference this in client components.
 */
export function getStripePriceId(rail: "A" | "B_SETUP" | "B_MONITOR" = "A"): string {
  switch (rail) {
    case "A":
      return process.env.STRIPE_PRICE_ID || "";
    case "B_SETUP":
      return process.env.STRIPE_PRICE_ID_B_SETUP || "";
    case "B_MONITOR":
      return process.env.STRIPE_PRICE_ID_B_MONITOR || "";
  }
}

/** Format Rail A price for display */
export function formatRailAPrice(locale: "en" | "fr" | "de"): string {
  const amount = RAILS.A.price_eur;
  switch (locale) {
    case "fr":
      return `${amount} \u20ac`;
    case "de":
      return `${amount} \u20ac`;
    default:
      return `\u20ac${amount}`;
  }
}
