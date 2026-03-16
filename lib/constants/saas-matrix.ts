/**
 * GHOST TAX — SAAS PRICING MATRIX (DICTIONNAIRE DE VÉRITÉ)
 *
 * Source unique de vérité pour la détection de SaaS par sous-domaine
 * et l'estimation de la facture fantôme.
 *
 * 30 SaaS Enterprise majeurs — pricing base 2026.
 * Chaque entrée est vérifiable via crt.sh Certificate Transparency.
 *
 * Usage:
 *   import { SAAS_MATRIX, lookupBySubdomain } from "@/lib/constants/saas-matrix";
 */

// ══════════════════════════════════════════════════════
//  TYPE
// ══════════════════════════════════════════════════════

export interface SaasMatrixEntry {
  /** Clé interne unique */
  key: string;
  /** Nom commercial affiché */
  displayName: string;
  /** Catégorie fonctionnelle */
  category: SaasCategory;
  /** Patterns de sous-domaine à matcher dans les CT logs (lowercase) */
  subdomainKeys: string[];
  /** Coût annuel par utilisateur (EUR, tier Enterprise, base 2026) */
  estimatedAnnualCostPerUser: number;
  /** Déploiement minimum typique (seats) */
  minDeployment: number;
  /** Groupe de chevauchement (même fonction = overlap = waste) */
  overlapGroup: string;
}

export type SaasCategory =
  | "CRM"
  | "ERP"
  | "HR"
  | "Identity"
  | "Communication"
  | "Productivity"
  | "Observability"
  | "Support"
  | "Data"
  | "Security"
  | "Design"
  | "Finance"
  | "DevTools"
  | "Marketing"
  | "AI";

// ══════════════════════════════════════════════════════
//  MATRICE — 30 SaaS Enterprise (pricing 2026)
// ══════════════════════════════════════════════════════

export const SAAS_MATRIX: SaasMatrixEntry[] = [
  // ── CRM ──────────────────────────────────────────
  {
    key: "salesforce",
    displayName: "Salesforce",
    category: "CRM",
    subdomainKeys: ["salesforce", "sfdc", "force"],
    estimatedAnnualCostPerUser: 1_500,
    minDeployment: 25,
    overlapGroup: "crm",
  },
  {
    key: "hubspot",
    displayName: "HubSpot",
    category: "CRM",
    subdomainKeys: ["hubspot", "hs-analytics", "hsforms"],
    estimatedAnnualCostPerUser: 600,
    minDeployment: 10,
    overlapGroup: "crm",
  },
  {
    key: "dynamics365",
    displayName: "Microsoft Dynamics 365",
    category: "CRM",
    subdomainKeys: ["dynamics", "crm.dynamics"],
    estimatedAnnualCostPerUser: 800,
    minDeployment: 20,
    overlapGroup: "crm",
  },

  // ── ERP ──────────────────────────────────────────
  {
    key: "sap",
    displayName: "SAP S/4HANA",
    category: "ERP",
    subdomainKeys: ["sap", "s4hana"],
    estimatedAnnualCostPerUser: 4_000,
    minDeployment: 50,
    overlapGroup: "erp",
  },
  {
    key: "oracle",
    displayName: "Oracle Cloud",
    category: "ERP",
    subdomainKeys: ["oracle", "oraclecloud"],
    estimatedAnnualCostPerUser: 3_500,
    minDeployment: 30,
    overlapGroup: "erp",
  },
  {
    key: "netsuite",
    displayName: "NetSuite",
    category: "Finance",
    subdomainKeys: ["netsuite"],
    estimatedAnnualCostPerUser: 12_000,
    minDeployment: 5,
    overlapGroup: "erp",
  },

  // ── HR ───────────────────────────────────────────
  {
    key: "workday",
    displayName: "Workday",
    category: "HR",
    subdomainKeys: ["workday", "myworkday"],
    estimatedAnnualCostPerUser: 100,
    minDeployment: 200,
    overlapGroup: "hr",
  },
  {
    key: "personio",
    displayName: "Personio",
    category: "HR",
    subdomainKeys: ["personio"],
    estimatedAnnualCostPerUser: 100,
    minDeployment: 50,
    overlapGroup: "hr",
  },
  {
    key: "bamboohr",
    displayName: "BambooHR",
    category: "HR",
    subdomainKeys: ["bamboohr", "bamboo"],
    estimatedAnnualCostPerUser: 84,
    minDeployment: 30,
    overlapGroup: "hr",
  },

  // ── Identity & SSO ──────────────────────────────
  {
    key: "okta",
    displayName: "Okta",
    category: "Identity",
    subdomainKeys: ["okta", "oktapreview"],
    estimatedAnnualCostPerUser: 72,
    minDeployment: 100,
    overlapGroup: "identity",
  },
  {
    key: "auth0",
    displayName: "Auth0",
    category: "Identity",
    subdomainKeys: ["auth0"],
    estimatedAnnualCostPerUser: 276,
    minDeployment: 25,
    overlapGroup: "identity",
  },

  // ── Productivity & PM ───────────────────────────
  {
    key: "jira",
    displayName: "Atlassian Jira",
    category: "Productivity",
    subdomainKeys: ["jira", "atlassian", "confluence", "bitbucket"],
    estimatedAnnualCostPerUser: 100,
    minDeployment: 30,
    overlapGroup: "pm",
  },
  {
    key: "asana",
    displayName: "Asana",
    category: "Productivity",
    subdomainKeys: ["asana"],
    estimatedAnnualCostPerUser: 130,
    minDeployment: 15,
    overlapGroup: "pm",
  },
  {
    key: "monday",
    displayName: "Monday.com",
    category: "Productivity",
    subdomainKeys: ["monday"],
    estimatedAnnualCostPerUser: 120,
    minDeployment: 15,
    overlapGroup: "pm",
  },
  {
    key: "notion",
    displayName: "Notion",
    category: "Productivity",
    subdomainKeys: ["notion"],
    estimatedAnnualCostPerUser: 96,
    minDeployment: 20,
    overlapGroup: "pm",
  },
  {
    key: "servicenow",
    displayName: "ServiceNow",
    category: "Productivity",
    subdomainKeys: ["servicenow", "service-now"],
    estimatedAnnualCostPerUser: 1_200,
    minDeployment: 15,
    overlapGroup: "itsm",
  },

  // ── Communication ───────────────────────────────
  {
    key: "slack",
    displayName: "Slack",
    category: "Communication",
    subdomainKeys: ["slack"],
    estimatedAnnualCostPerUser: 100,
    minDeployment: 50,
    overlapGroup: "comms",
  },
  {
    key: "zoom",
    displayName: "Zoom",
    category: "Communication",
    subdomainKeys: ["zoom"],
    estimatedAnnualCostPerUser: 160,
    minDeployment: 50,
    overlapGroup: "comms",
  },

  // ── Observability ───────────────────────────────
  {
    key: "datadog",
    displayName: "Datadog",
    category: "Observability",
    subdomainKeys: ["datadog", "datadoghq"],
    estimatedAnnualCostPerUser: 2_400,
    minDeployment: 5,
    overlapGroup: "observability",
  },
  {
    key: "newrelic",
    displayName: "New Relic",
    category: "Observability",
    subdomainKeys: ["newrelic"],
    estimatedAnnualCostPerUser: 1_800,
    minDeployment: 5,
    overlapGroup: "observability",
  },
  {
    key: "splunk",
    displayName: "Splunk",
    category: "Observability",
    subdomainKeys: ["splunk"],
    estimatedAnnualCostPerUser: 3_000,
    minDeployment: 5,
    overlapGroup: "observability",
  },
  {
    key: "dynatrace",
    displayName: "Dynatrace",
    category: "Observability",
    subdomainKeys: ["dynatrace"],
    estimatedAnnualCostPerUser: 2_100,
    minDeployment: 5,
    overlapGroup: "observability",
  },

  // ── Support ─────────────────────────────────────
  {
    key: "zendesk",
    displayName: "Zendesk",
    category: "Support",
    subdomainKeys: ["zendesk", "zdassets"],
    estimatedAnnualCostPerUser: 600,
    minDeployment: 10,
    overlapGroup: "support",
  },
  {
    key: "intercom",
    displayName: "Intercom",
    category: "Support",
    subdomainKeys: ["intercom"],
    estimatedAnnualCostPerUser: 900,
    minDeployment: 5,
    overlapGroup: "support",
  },

  // ── Data & Analytics ────────────────────────────
  {
    key: "snowflake",
    displayName: "Snowflake",
    category: "Data",
    subdomainKeys: ["snowflake", "snowflakecomputing"],
    estimatedAnnualCostPerUser: 3_600,
    minDeployment: 5,
    overlapGroup: "data-warehouse",
  },
  {
    key: "databricks",
    displayName: "Databricks",
    category: "Data",
    subdomainKeys: ["databricks"],
    estimatedAnnualCostPerUser: 5_000,
    minDeployment: 5,
    overlapGroup: "data-warehouse",
  },

  // ── Security ────────────────────────────────────
  {
    key: "crowdstrike",
    displayName: "CrowdStrike Falcon",
    category: "Security",
    subdomainKeys: ["crowdstrike", "falcon"],
    estimatedAnnualCostPerUser: 180,
    minDeployment: 100,
    overlapGroup: "edr",
  },
  {
    key: "sentinelone",
    displayName: "SentinelOne",
    category: "Security",
    subdomainKeys: ["sentinelone"],
    estimatedAnnualCostPerUser: 200,
    minDeployment: 100,
    overlapGroup: "edr",
  },

  // ── Design ──────────────────────────────────────
  {
    key: "figma",
    displayName: "Figma",
    category: "Design",
    subdomainKeys: ["figma"],
    estimatedAnnualCostPerUser: 144,
    minDeployment: 5,
    overlapGroup: "design",
  },

  // ── AI ──────────────────────────────────────────
  {
    key: "openai",
    displayName: "OpenAI",
    category: "AI",
    subdomainKeys: ["openai"],
    estimatedAnnualCostPerUser: 240,
    minDeployment: 10,
    overlapGroup: "ai",
  },
];

// ══════════════════════════════════════════════════════
//  LOOKUP INDEX — O(1) subdomain → entry resolution
// ══════════════════════════════════════════════════════

/** Precomputed map: subdomain keyword → SaasMatrixEntry */
const _index = new Map<string, SaasMatrixEntry>();
for (const entry of SAAS_MATRIX) {
  for (const sub of entry.subdomainKeys) {
    _index.set(sub.toLowerCase(), entry);
  }
}

/**
 * Lookup a subdomain keyword against the matrix.
 * Returns the matching entry or null.
 *
 * Example:
 *   lookupBySubdomain("jira") → { key: "jira", displayName: "Atlassian Jira", ... }
 *   lookupBySubdomain("random") → null
 */
export function lookupBySubdomain(subdomain: string): SaasMatrixEntry | null {
  return _index.get(subdomain.toLowerCase()) || null;
}

/**
 * Match a full subdomain FQDN (e.g. "jira.acme.com") against the matrix.
 * Extracts the leftmost label and checks against all patterns.
 */
export function matchSubdomainFQDN(fqdn: string): SaasMatrixEntry | null {
  const leftLabel = fqdn.split(".")[0].toLowerCase();

  // Direct match on left label
  const direct = _index.get(leftLabel);
  if (direct) return direct;

  // Partial match: check if left label contains any pattern
  for (const [pattern, entry] of _index) {
    if (leftLabel.includes(pattern)) return entry;
  }

  return null;
}

/** Total entries in the matrix */
export const MATRIX_SIZE = SAAS_MATRIX.length;

/** All unique overlap groups */
export const OVERLAP_GROUPS = [...new Set(SAAS_MATRIX.map((e) => e.overlapGroup))];
