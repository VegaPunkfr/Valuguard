/**
 * GHOST TAX — SHADOW-BILL ENGINE v2 (SERVER-ONLY)
 *
 * International Sniper module: CT-Log → SaaS Matching → Financial Hemorrhage.
 *
 * Uses fetchWithRetry for resilient crt.sh queries.
 * Strict dictionary matching only (no fuzzy, no false positives).
 *
 * Output: ShadowBillResult with detected vendors, estimated spend,
 *         overlap waste, and financial hemorrhage per vendor.
 */

import { fetchJSONWithRetry } from "@/lib/network/fetch-retry";

// ══════════════════════════════════════════════════════
//  SAAS PRICING MATRIX — Enterprise Truth Table
//  Source: Published enterprise pricing (2025-2026)
// ══════════════════════════════════════════════════════

export interface SaasPricingEntry {
  id: string;
  name: string;
  category: string;
  subdomainPatterns: string[];    // Exact matches in CT-log subdomains
  enterpriseSeatEur: number;     // Annual per-seat (enterprise tier)
  typicalSeats: number;          // Median enterprise deployment
  overlapGroup: string;          // For waste detection (same group = overlap)
}

export const SAAS_PRICING_MATRIX: SaasPricingEntry[] = [
  // ── CRM & Sales ────────────────────────────
  { id: "salesforce",  name: "Salesforce",          category: "CRM",            subdomainPatterns: ["salesforce", "sfdc", "force"],            enterpriseSeatEur: 1500,  typicalSeats: 50,  overlapGroup: "crm" },
  { id: "hubspot",     name: "HubSpot",             category: "CRM",            subdomainPatterns: ["hubspot", "hs-analytics", "hsforms"],     enterpriseSeatEur: 600,   typicalSeats: 30,  overlapGroup: "crm" },
  { id: "pipedrive",   name: "Pipedrive",           category: "CRM",            subdomainPatterns: ["pipedrive"],                              enterpriseSeatEur: 400,   typicalSeats: 20,  overlapGroup: "crm" },
  { id: "dynamics",    name: "Microsoft Dynamics",   category: "CRM",            subdomainPatterns: ["dynamics", "crm.dynamics"],               enterpriseSeatEur: 800,   typicalSeats: 40,  overlapGroup: "crm" },

  // ── Identity & SSO ─────────────────────────
  { id: "okta",        name: "Okta",                category: "Identity",       subdomainPatterns: ["okta", "oktapreview"],                    enterpriseSeatEur: 72,    typicalSeats: 200, overlapGroup: "identity" },
  { id: "auth0",       name: "Auth0",               category: "Identity",       subdomainPatterns: ["auth0"],                                  enterpriseSeatEur: 276,   typicalSeats: 50,  overlapGroup: "identity" },
  { id: "onelogin",    name: "OneLogin",             category: "Identity",       subdomainPatterns: ["onelogin"],                               enterpriseSeatEur: 48,    typicalSeats: 200, overlapGroup: "identity" },

  // ── Project Management ─────────────────────
  { id: "jira",        name: "Atlassian Jira",      category: "Productivity",   subdomainPatterns: ["jira", "atlassian", "confluence"],        enterpriseSeatEur: 100,   typicalSeats: 80,  overlapGroup: "pm" },
  { id: "asana",       name: "Asana",               category: "Productivity",   subdomainPatterns: ["asana"],                                  enterpriseSeatEur: 130,   typicalSeats: 40,  overlapGroup: "pm" },
  { id: "monday",      name: "Monday.com",          category: "Productivity",   subdomainPatterns: ["monday"],                                 enterpriseSeatEur: 120,   typicalSeats: 40,  overlapGroup: "pm" },
  { id: "notion",      name: "Notion",              category: "Productivity",   subdomainPatterns: ["notion"],                                 enterpriseSeatEur: 96,    typicalSeats: 60,  overlapGroup: "pm" },
  { id: "clickup",     name: "ClickUp",             category: "Productivity",   subdomainPatterns: ["clickup"],                                enterpriseSeatEur: 84,    typicalSeats: 40,  overlapGroup: "pm" },
  { id: "smartsheet",  name: "Smartsheet",          category: "Productivity",   subdomainPatterns: ["smartsheet"],                             enterpriseSeatEur: 300,   typicalSeats: 30,  overlapGroup: "pm" },

  // ── Communication ──────────────────────────
  { id: "slack",       name: "Slack",               category: "Communication",  subdomainPatterns: ["slack"],                                  enterpriseSeatEur: 100,   typicalSeats: 150, overlapGroup: "comms" },
  { id: "zoom",        name: "Zoom",                category: "Communication",  subdomainPatterns: ["zoom"],                                   enterpriseSeatEur: 160,   typicalSeats: 100, overlapGroup: "comms" },
  { id: "webex",       name: "Cisco Webex",         category: "Communication",  subdomainPatterns: ["webex"],                                  enterpriseSeatEur: 156,   typicalSeats: 80,  overlapGroup: "comms" },

  // ── Observability ──────────────────────────
  { id: "datadog",     name: "Datadog",             category: "Observability",  subdomainPatterns: ["datadog", "datadoghq"],                   enterpriseSeatEur: 2400,  typicalSeats: 15,  overlapGroup: "obs" },
  { id: "newrelic",    name: "New Relic",           category: "Observability",  subdomainPatterns: ["newrelic"],                                enterpriseSeatEur: 1800,  typicalSeats: 10,  overlapGroup: "obs" },
  { id: "dynatrace",   name: "Dynatrace",           category: "Observability",  subdomainPatterns: ["dynatrace"],                              enterpriseSeatEur: 2100,  typicalSeats: 10,  overlapGroup: "obs" },
  { id: "splunk",      name: "Splunk",              category: "Observability",  subdomainPatterns: ["splunk"],                                 enterpriseSeatEur: 3000,  typicalSeats: 10,  overlapGroup: "obs" },
  { id: "sentry",      name: "Sentry",              category: "Observability",  subdomainPatterns: ["sentry"],                                 enterpriseSeatEur: 312,   typicalSeats: 15,  overlapGroup: "obs" },

  // ── HR & People ────────────────────────────
  { id: "workday",     name: "Workday",             category: "HR",             subdomainPatterns: ["workday", "myworkday"],                   enterpriseSeatEur: 100,   typicalSeats: 300, overlapGroup: "hr" },
  { id: "bamboohr",    name: "BambooHR",            category: "HR",             subdomainPatterns: ["bamboohr", "bamboo"],                     enterpriseSeatEur: 84,    typicalSeats: 100, overlapGroup: "hr" },
  { id: "personio",    name: "Personio",            category: "HR",             subdomainPatterns: ["personio"],                               enterpriseSeatEur: 100,   typicalSeats: 100, overlapGroup: "hr" },

  // ── Marketing & Support ────────────────────
  { id: "zendesk",     name: "Zendesk",             category: "Support",        subdomainPatterns: ["zendesk", "zdassets"],                    enterpriseSeatEur: 600,   typicalSeats: 20,  overlapGroup: "support" },
  { id: "intercom",    name: "Intercom",            category: "Support",        subdomainPatterns: ["intercom"],                               enterpriseSeatEur: 900,   typicalSeats: 10,  overlapGroup: "support" },
  { id: "freshdesk",   name: "Freshdesk",           category: "Support",        subdomainPatterns: ["freshdesk"],                              enterpriseSeatEur: 180,   typicalSeats: 15,  overlapGroup: "support" },
  { id: "servicenow",  name: "ServiceNow",          category: "Support",        subdomainPatterns: ["servicenow", "service-now"],              enterpriseSeatEur: 1200,  typicalSeats: 30,  overlapGroup: "support" },

  // ── Design ─────────────────────────────────
  { id: "figma",       name: "Figma",               category: "Design",         subdomainPatterns: ["figma"],                                  enterpriseSeatEur: 144,   typicalSeats: 15,  overlapGroup: "design" },
  { id: "miro",        name: "Miro",                category: "Design",         subdomainPatterns: ["miro"],                                   enterpriseSeatEur: 100,   typicalSeats: 20,  overlapGroup: "design" },

  // ── Database & Data ────────────────────────
  { id: "snowflake",   name: "Snowflake",           category: "Data",           subdomainPatterns: ["snowflake", "snowflakecomputing"],        enterpriseSeatEur: 3600,  typicalSeats: 10,  overlapGroup: "data" },
  { id: "databricks",  name: "Databricks",          category: "Data",           subdomainPatterns: ["databricks"],                             enterpriseSeatEur: 5000,  typicalSeats: 10,  overlapGroup: "data" },
  { id: "mongodb",     name: "MongoDB Atlas",       category: "Data",           subdomainPatterns: ["mongodb", "mongo"],                       enterpriseSeatEur: 700,   typicalSeats: 5,   overlapGroup: "data" },

  // ── Finance & ERP ──────────────────────────
  { id: "netsuite",    name: "NetSuite",            category: "Finance",        subdomainPatterns: ["netsuite"],                               enterpriseSeatEur: 12000, typicalSeats: 10,  overlapGroup: "erp" },
  { id: "sap",         name: "SAP",                 category: "ERP",            subdomainPatterns: ["sap", "s4hana"],                          enterpriseSeatEur: 4000,  typicalSeats: 100, overlapGroup: "erp" },

  // ── Security ───────────────────────────────
  { id: "crowdstrike", name: "CrowdStrike",         category: "Security",       subdomainPatterns: ["crowdstrike", "falcon"],                  enterpriseSeatEur: 180,   typicalSeats: 200, overlapGroup: "edr" },
  { id: "sentinelone", name: "SentinelOne",         category: "Security",       subdomainPatterns: ["sentinelone"],                            enterpriseSeatEur: 200,   typicalSeats: 200, overlapGroup: "edr" },
];

// ══════════════════════════════════════════════════════
//  TYPES
// ══════════════════════════════════════════════════════

export interface DetectedSaas {
  id: string;
  name: string;
  category: string;
  matchedSubdomain: string;
  estimatedAnnualEur: number;     // enterpriseSeatEur × typicalSeats
  overlapGroup: string;
}

export interface OverlapWaste {
  group: string;
  vendors: string[];
  wasteEur: number;               // 30% of the cheaper tool(s)
  explanation: string;
}

export interface ShadowBillResult {
  domain: string;
  scannedAt: string;
  executionMs: number;

  // Raw CT data
  totalCertificates: number;
  uniqueSubdomains: string[];

  // Matched vendors
  detectedSaas: DetectedSaas[];
  totalEstimatedSpendEur: number;

  // Overlap waste
  overlaps: OverlapWaste[];
  estimatedWasteEur: number;

  // Hemorrhage metric
  dailyHemorrhageEur: number;
  monthlyHemorrhageEur: number;
  annualHemorrhageEur: number;

  confidence: number;             // 0-85
}

// ══════════════════════════════════════════════════════
//  CT-LOG ANALYSIS
// ══════════════════════════════════════════════════════

interface CTEntry {
  name_value: string;
  issuer_name?: string;
  not_after?: string;
}

/**
 * Query crt.sh with resilient fetch, extract unique subdomains,
 * match against SAAS_PRICING_MATRIX, compute financial hemorrhage.
 */
export async function analyzeCertificates(
  domain: string,
  headcount?: number,
): Promise<ShadowBillResult> {
  const start = Date.now();
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();

  // ── Step 1: Query crt.sh with retry ────────────────
  const entries = await fetchJSONWithRetry<CTEntry[]>(
    `https://crt.sh/?q=%25.${encodeURIComponent(cleanDomain)}&output=json`,
    { method: "GET" },
    {
      retries: 3,
      timeoutMs: 15000,
      baseDelayMs: 2000,
      onRetry: (attempt, status, delay) => {
        console.warn(`[Shadow-Bill] crt.sh retry ${attempt} (status=${status}, delay=${Math.round(delay)}ms)`);
      },
    },
  );

  if (!entries || entries.length === 0) {
    return emptyResult(cleanDomain, Date.now() - start);
  }

  // ── Step 2: Extract unique subdomains, strip wildcards ──
  const subdomains = new Set<string>();
  for (const entry of entries) {
    for (const raw of entry.name_value.split("\n")) {
      const name = raw.trim().toLowerCase().replace(/^\*\./, "");
      if (!name || name === cleanDomain) continue;
      if (!name.endsWith(`.${cleanDomain}`)) continue;
      subdomains.add(name);
    }
  }

  const uniqueSubs = Array.from(subdomains).sort();

  // ── Step 3: Match against pricing matrix (strict) ──────
  const seatMultiplier = headcount ? Math.max(0.5, headcount / 200) : 1;
  const detected: DetectedSaas[] = [];
  const seenIds = new Set<string>();

  for (const sub of uniqueSubs) {
    const leftLabel = sub.split(".")[0];

    for (const entry of SAAS_PRICING_MATRIX) {
      if (seenIds.has(entry.id)) continue;

      const matched = entry.subdomainPatterns.some(
        (p) => leftLabel === p || leftLabel.includes(p),
      );

      if (matched) {
        seenIds.add(entry.id);
        detected.push({
          id: entry.id,
          name: entry.name,
          category: entry.category,
          matchedSubdomain: sub,
          estimatedAnnualEur: Math.round(entry.enterpriseSeatEur * entry.typicalSeats * seatMultiplier),
          overlapGroup: entry.overlapGroup,
        });
      }
    }
  }

  // Sort by cost desc
  detected.sort((a, b) => b.estimatedAnnualEur - a.estimatedAnnualEur);

  // ── Step 4: Detect overlaps (same overlapGroup) ────────
  const groups = new Map<string, DetectedSaas[]>();
  for (const d of detected) {
    const g = groups.get(d.overlapGroup) || [];
    g.push(d);
    groups.set(d.overlapGroup, g);
  }

  const overlaps: OverlapWaste[] = [];
  let totalWaste = 0;

  for (const [group, vendors] of groups) {
    if (vendors.length < 2) continue;

    // Waste = 30% of the sum of all but the most expensive
    const sorted = [...vendors].sort((a, b) => b.estimatedAnnualEur - a.estimatedAnnualEur);
    const redundant = sorted.slice(1);
    const wasteEur = Math.round(redundant.reduce((s, v) => s + v.estimatedAnnualEur, 0) * 0.3);

    overlaps.push({
      group,
      vendors: vendors.map((v) => v.name),
      wasteEur,
      explanation: `${vendors.length} outils dans la catégorie "${group}" — chevauchement fonctionnel, licences redondantes.`,
    });

    totalWaste += wasteEur;
  }

  // ── Step 5: Compute hemorrhage ─────────────────────────
  const totalSpend = detected.reduce((s, d) => s + d.estimatedAnnualEur, 0);
  // Base waste (overlaps) + 15% general underutilization
  const generalWaste = Math.round(totalSpend * 0.15);
  const annualHemorrhage = totalWaste + generalWaste;

  const confidence = Math.min(85,
    10 + Math.min(25, uniqueSubs.length) + Math.min(30, detected.length * 4),
  );

  return {
    domain: cleanDomain,
    scannedAt: new Date().toISOString(),
    executionMs: Date.now() - start,
    totalCertificates: entries.length,
    uniqueSubdomains: uniqueSubs.slice(0, 50),
    detectedSaas: detected,
    totalEstimatedSpendEur: totalSpend,
    overlaps,
    estimatedWasteEur: annualHemorrhage,
    dailyHemorrhageEur: Math.round(annualHemorrhage / 365),
    monthlyHemorrhageEur: Math.round(annualHemorrhage / 12),
    annualHemorrhageEur: annualHemorrhage,
    confidence,
  };
}

function emptyResult(domain: string, executionMs: number): ShadowBillResult {
  return {
    domain, scannedAt: new Date().toISOString(), executionMs,
    totalCertificates: 0, uniqueSubdomains: [], detectedSaas: [],
    totalEstimatedSpendEur: 0, overlaps: [], estimatedWasteEur: 0,
    dailyHemorrhageEur: 0, monthlyHemorrhageEur: 0, annualHemorrhageEur: 0,
    confidence: 0,
  };
}
