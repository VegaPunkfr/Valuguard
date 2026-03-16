/**
 * GHOST TAX — SHADOW-BILL RECONSTRUCTOR (SERVER-ONLY)
 *
 * ══════════════════════════════════════════════════════════════
 *  Le 5ème pilier de détection Ghost Tax : LA FACTURE FANTÔME
 *
 *  Moteur 1 (analysis.ts):         Ce qu'on ESTIME
 *  Moteur 2 (orphan-detector.ts):  Ce qu'on PROUVE
 *  Moteur 3 (shadow-ledger.ts):    Ce qu'on RÉVÈLE
 *  Moteur 4 (osint-interceptor.ts): Ce qu'on INTERCEPTE
 *  Moteur 5 (shadow-bill.ts):      Ce qu'on RECONSTRUIT
 * ══════════════════════════════════════════════════════════════
 *
 * Pipeline:
 *   1. CT-Log Deep Parser — Extract all subdomains from crt.sh
 *   2. SaaS Fingerprinting — Match against 100+ vendor patterns
 *   3. Overlap Detection — Find redundant tools (30% waste flag)
 *   4. Shadow Bill Calculation — Enterprise pricing × company size
 *   5. Cache layer — Supabase persistence for Trojan Vault pages
 *
 * Zero credentials. Zero access. Just public Certificate Transparency logs.
 */

import {
  type DetectedVendor,
  type VendorCategory,
} from "@/lib/engines/osint-interceptor";

// ══════════════════════════════════════════════════════
//  TYPES
// ══════════════════════════════════════════════════════

export interface ShadowBillVendor {
  id: string;
  name: string;
  category: VendorCategory;
  source: "ct_log" | "dns" | "inferred";
  subdomain: string;               // The subdomain that triggered detection
  estimatedAnnualEur: [number, number];
  avgSeatCostEur: number;
  confidence: number;
}

export interface OverlapFlag {
  category: VendorCategory;
  vendors: string[];                // Vendor names in overlap
  wastePercent: number;             // 20-40%
  estimatedWasteEur: [number, number];
  explanation: string;
}

export interface ShadowBill {
  domain: string;
  scannedAt: Date;
  executionMs: number;

  // CT-Log extraction
  totalSubdomains: number;
  uniqueSubdomains: string[];
  saasSubdomains: string[];         // Only SaaS-matching ones

  // Vendor detection
  detectedVendors: ShadowBillVendor[];
  vendorsByCategory: Record<string, ShadowBillVendor[]>;

  // Overlap & waste
  overlaps: OverlapFlag[];
  totalOverlapWasteEur: [number, number];

  // The Shadow Bill
  totalEstimatedSpendEur: [number, number];
  totalProbableWasteEur: [number, number];
  wastePercent: number;

  // Scores
  stackComplexity: number;          // 0-100
  governanceRisk: number;           // 0-100
  confidence: number;               // 0-85 (capped)

  // Preview data (for Trojan Vault — first 3 visible, rest locked)
  previewVendors: ShadowBillVendor[];
  lockedVendorCount: number;
}

// ══════════════════════════════════════════════════════
//  SAAS VENDOR FINGERPRINT DATABASE (100+ patterns)
//  Maps subdomain keywords → vendor identity + pricing
// ══════════════════════════════════════════════════════

interface SaasFingerprint {
  id: string;
  name: string;
  category: VendorCategory;
  patterns: string[];               // Subdomain patterns to match
  avgSeatCostEur: number;           // Annual per-seat enterprise pricing
  minSeats: number;
}

const SAAS_FINGERPRINTS: SaasFingerprint[] = [
  // ── Project Management & Productivity ──────────
  { id: "jira", name: "Atlassian Jira", category: "productivity", patterns: ["jira", "atlassian", "confluence", "bitbucket"], avgSeatCostEur: 100, minSeats: 10 },
  { id: "asana", name: "Asana", category: "productivity", patterns: ["asana"], avgSeatCostEur: 130, minSeats: 5 },
  { id: "monday", name: "Monday.com", category: "productivity", patterns: ["monday"], avgSeatCostEur: 120, minSeats: 5 },
  { id: "clickup", name: "ClickUp", category: "productivity", patterns: ["clickup"], avgSeatCostEur: 84, minSeats: 5 },
  { id: "notion", name: "Notion", category: "productivity", patterns: ["notion"], avgSeatCostEur: 96, minSeats: 5 },
  { id: "basecamp", name: "Basecamp", category: "productivity", patterns: ["basecamp"], avgSeatCostEur: 132, minSeats: 10 },
  { id: "trello", name: "Trello", category: "productivity", patterns: ["trello"], avgSeatCostEur: 60, minSeats: 5 },
  { id: "linear", name: "Linear", category: "productivity", patterns: ["linear"], avgSeatCostEur: 96, minSeats: 5 },
  { id: "airtable", name: "Airtable", category: "productivity", patterns: ["airtable"], avgSeatCostEur: 240, minSeats: 5 },
  { id: "smartsheet", name: "Smartsheet", category: "productivity", patterns: ["smartsheet"], avgSeatCostEur: 300, minSeats: 10 },

  // ── CRM & Sales ────────────────────────────────
  { id: "salesforce", name: "Salesforce", category: "crm", patterns: ["salesforce", "sfdc", "force"], avgSeatCostEur: 1500, minSeats: 10 },
  { id: "hubspot", name: "HubSpot", category: "crm", patterns: ["hubspot", "hs-analytics", "hsforms"], avgSeatCostEur: 600, minSeats: 5 },
  { id: "pipedrive", name: "Pipedrive", category: "crm", patterns: ["pipedrive"], avgSeatCostEur: 400, minSeats: 5 },
  { id: "zoho", name: "Zoho", category: "crm", patterns: ["zoho"], avgSeatCostEur: 200, minSeats: 5 },
  { id: "freshsales", name: "Freshsales", category: "crm", patterns: ["freshsales", "freshworks"], avgSeatCostEur: 180, minSeats: 5 },
  { id: "dynamics", name: "Microsoft Dynamics", category: "crm", patterns: ["dynamics", "crm.dynamics"], avgSeatCostEur: 800, minSeats: 10 },

  // ── Identity & SSO ─────────────────────────────
  { id: "okta", name: "Okta", category: "identity", patterns: ["okta", "oktapreview"], avgSeatCostEur: 72, minSeats: 50 },
  { id: "auth0", name: "Auth0", category: "identity", patterns: ["auth0"], avgSeatCostEur: 276, minSeats: 10 },
  { id: "onelogin", name: "OneLogin", category: "identity", patterns: ["onelogin"], avgSeatCostEur: 48, minSeats: 50 },
  { id: "jumpcloud", name: "JumpCloud", category: "identity", patterns: ["jumpcloud"], avgSeatCostEur: 132, minSeats: 20 },

  // ── Communication ──────────────────────────────
  { id: "slack", name: "Slack", category: "communication", patterns: ["slack"], avgSeatCostEur: 100, minSeats: 10 },
  { id: "zoom", name: "Zoom", category: "communication", patterns: ["zoom"], avgSeatCostEur: 160, minSeats: 10 },
  { id: "teams", name: "Microsoft Teams", category: "communication", patterns: ["teams.microsoft", "teams"], avgSeatCostEur: 0, minSeats: 10 },
  { id: "webex", name: "Cisco Webex", category: "communication", patterns: ["webex"], avgSeatCostEur: 156, minSeats: 10 },
  { id: "ringcentral", name: "RingCentral", category: "communication", patterns: ["ringcentral"], avgSeatCostEur: 300, minSeats: 10 },

  // ── Observability & Monitoring ─────────────────
  { id: "datadog", name: "Datadog", category: "observability", patterns: ["datadog", "datadoghq"], avgSeatCostEur: 2400, minSeats: 5 },
  { id: "newrelic", name: "New Relic", category: "observability", patterns: ["newrelic"], avgSeatCostEur: 1800, minSeats: 3 },
  { id: "dynatrace", name: "Dynatrace", category: "observability", patterns: ["dynatrace"], avgSeatCostEur: 2100, minSeats: 5 },
  { id: "splunk", name: "Splunk", category: "observability", patterns: ["splunk"], avgSeatCostEur: 3000, minSeats: 5 },
  { id: "pagerduty", name: "PagerDuty", category: "observability", patterns: ["pagerduty"], avgSeatCostEur: 250, minSeats: 5 },
  { id: "grafana", name: "Grafana Cloud", category: "observability", patterns: ["grafana"], avgSeatCostEur: 600, minSeats: 3 },
  { id: "sentry", name: "Sentry", category: "observability", patterns: ["sentry"], avgSeatCostEur: 312, minSeats: 5 },

  // ── Cloud Infrastructure ───────────────────────
  { id: "aws", name: "AWS", category: "cloud_infra", patterns: ["amazonaws", "aws", "s3", "cloudfront", "elasticbeanstalk"], avgSeatCostEur: 0, minSeats: 1 },
  { id: "azure", name: "Microsoft Azure", category: "cloud_infra", patterns: ["azure", "azurewebsites", "blob.core"], avgSeatCostEur: 0, minSeats: 1 },
  { id: "gcp", name: "Google Cloud", category: "cloud_infra", patterns: ["googleapis", "appspot", "run.app", "cloudfunctions"], avgSeatCostEur: 0, minSeats: 1 },
  { id: "cloudflare", name: "Cloudflare", category: "cdn", patterns: ["cloudflare", "cf-"], avgSeatCostEur: 240, minSeats: 1 },
  { id: "fastly", name: "Fastly", category: "cdn", patterns: ["fastly"], avgSeatCostEur: 600, minSeats: 1 },

  // ── Customer Support ───────────────────────────
  { id: "zendesk", name: "Zendesk", category: "marketing", patterns: ["zendesk", "zdassets"], avgSeatCostEur: 600, minSeats: 5 },
  { id: "intercom", name: "Intercom", category: "marketing", patterns: ["intercom"], avgSeatCostEur: 900, minSeats: 3 },
  { id: "freshdesk", name: "Freshdesk", category: "marketing", patterns: ["freshdesk"], avgSeatCostEur: 180, minSeats: 5 },
  { id: "servicenow", name: "ServiceNow", category: "marketing", patterns: ["servicenow", "service-now"], avgSeatCostEur: 1200, minSeats: 10 },
  { id: "drift", name: "Drift", category: "marketing", patterns: ["drift", "driftt"], avgSeatCostEur: 500, minSeats: 1 },

  // ── Analytics ──────────────────────────────────
  { id: "mixpanel", name: "Mixpanel", category: "analytics", patterns: ["mixpanel"], avgSeatCostEur: 300, minSeats: 3 },
  { id: "amplitude", name: "Amplitude", category: "analytics", patterns: ["amplitude"], avgSeatCostEur: 500, minSeats: 3 },
  { id: "segment", name: "Segment", category: "analytics", patterns: ["segment"], avgSeatCostEur: 1200, minSeats: 1 },
  { id: "hotjar", name: "Hotjar", category: "analytics", patterns: ["hotjar"], avgSeatCostEur: 400, minSeats: 1 },
  { id: "posthog", name: "PostHog", category: "analytics", patterns: ["posthog"], avgSeatCostEur: 0, minSeats: 1 },
  { id: "heap", name: "Heap", category: "analytics", patterns: ["heap"], avgSeatCostEur: 600, minSeats: 3 },
  { id: "fullstory", name: "FullStory", category: "analytics", patterns: ["fullstory"], avgSeatCostEur: 1200, minSeats: 3 },
  { id: "looker", name: "Looker", category: "analytics", patterns: ["looker"], avgSeatCostEur: 3600, minSeats: 5 },
  { id: "tableau", name: "Tableau", category: "analytics", patterns: ["tableau"], avgSeatCostEur: 840, minSeats: 5 },

  // ── Dev Tools ──────────────────────────────────
  { id: "github", name: "GitHub", category: "dev_tools", patterns: ["github"], avgSeatCostEur: 200, minSeats: 5 },
  { id: "gitlab", name: "GitLab", category: "dev_tools", patterns: ["gitlab"], avgSeatCostEur: 228, minSeats: 5 },
  { id: "circleci", name: "CircleCI", category: "dev_tools", patterns: ["circleci"], avgSeatCostEur: 360, minSeats: 5 },
  { id: "jenkins", name: "Jenkins", category: "dev_tools", patterns: ["jenkins"], avgSeatCostEur: 0, minSeats: 5 },
  { id: "sonarqube", name: "SonarQube", category: "dev_tools", patterns: ["sonarqube", "sonar"], avgSeatCostEur: 1500, minSeats: 5 },
  { id: "snyk", name: "Snyk", category: "security", patterns: ["snyk"], avgSeatCostEur: 500, minSeats: 5 },

  // ── Security ───────────────────────────────────
  { id: "crowdstrike", name: "CrowdStrike", category: "security", patterns: ["crowdstrike", "falcon"], avgSeatCostEur: 180, minSeats: 50 },
  { id: "sentinelone", name: "SentinelOne", category: "security", patterns: ["sentinelone"], avgSeatCostEur: 200, minSeats: 50 },
  { id: "1password", name: "1Password", category: "security", patterns: ["1password", "onepassword"], avgSeatCostEur: 96, minSeats: 10 },
  { id: "lastpass", name: "LastPass", category: "security", patterns: ["lastpass"], avgSeatCostEur: 72, minSeats: 10 },
  { id: "vanta", name: "Vanta", category: "security", patterns: ["vanta"], avgSeatCostEur: 1000, minSeats: 1 },
  { id: "drata", name: "Drata", category: "security", patterns: ["drata"], avgSeatCostEur: 1200, minSeats: 1 },

  // ── AI / LLM ───────────────────────────────────
  { id: "openai", name: "OpenAI", category: "ai_llm", patterns: ["openai"], avgSeatCostEur: 240, minSeats: 5 },
  { id: "anthropic", name: "Anthropic (Claude)", category: "ai_llm", patterns: ["anthropic", "claude"], avgSeatCostEur: 240, minSeats: 3 },
  { id: "copilot", name: "GitHub Copilot", category: "ai_llm", patterns: ["copilot"], avgSeatCostEur: 228, minSeats: 5 },

  // ── HR ─────────────────────────────────────────
  { id: "workday", name: "Workday", category: "hr", patterns: ["workday", "myworkday"], avgSeatCostEur: 100, minSeats: 100 },
  { id: "bamboohr", name: "BambooHR", category: "hr", patterns: ["bamboohr", "bamboo"], avgSeatCostEur: 84, minSeats: 20 },
  { id: "personio", name: "Personio", category: "hr", patterns: ["personio"], avgSeatCostEur: 100, minSeats: 20 },
  { id: "deel", name: "Deel", category: "hr", patterns: ["deel"], avgSeatCostEur: 600, minSeats: 5 },
  { id: "rippling", name: "Rippling", category: "hr", patterns: ["rippling"], avgSeatCostEur: 96, minSeats: 20 },

  // ── Email / Marketing ──────────────────────────
  { id: "mailchimp", name: "Mailchimp", category: "marketing", patterns: ["mailchimp", "chimpstatic"], avgSeatCostEur: 180, minSeats: 1 },
  { id: "sendgrid", name: "SendGrid", category: "marketing", patterns: ["sendgrid"], avgSeatCostEur: 200, minSeats: 1 },
  { id: "marketo", name: "Marketo", category: "marketing", patterns: ["marketo", "mkt"], avgSeatCostEur: 2000, minSeats: 3 },
  { id: "pardot", name: "Pardot", category: "marketing", patterns: ["pardot"], avgSeatCostEur: 1500, minSeats: 3 },

  // ── Design ─────────────────────────────────────
  { id: "figma", name: "Figma", category: "design", patterns: ["figma"], avgSeatCostEur: 144, minSeats: 3 },
  { id: "miro", name: "Miro", category: "design", patterns: ["miro"], avgSeatCostEur: 100, minSeats: 5 },
  { id: "canva", name: "Canva", category: "design", patterns: ["canva"], avgSeatCostEur: 120, minSeats: 3 },

  // ── Finance ────────────────────────────────────
  { id: "stripe", name: "Stripe", category: "finance", patterns: ["stripe"], avgSeatCostEur: 0, minSeats: 1 },
  { id: "brex", name: "Brex", category: "finance", patterns: ["brex"], avgSeatCostEur: 144, minSeats: 5 },
  { id: "netsuite", name: "NetSuite", category: "finance", patterns: ["netsuite"], avgSeatCostEur: 12000, minSeats: 5 },
  { id: "chargebee", name: "Chargebee", category: "finance", patterns: ["chargebee"], avgSeatCostEur: 3000, minSeats: 1 },
  { id: "quickbooks", name: "QuickBooks", category: "finance", patterns: ["quickbooks", "intuit"], avgSeatCostEur: 360, minSeats: 3 },

  // ── Database ───────────────────────────────────
  { id: "snowflake", name: "Snowflake", category: "database", patterns: ["snowflake", "snowflakecomputing"], avgSeatCostEur: 3600, minSeats: 5 },
  { id: "mongodb", name: "MongoDB Atlas", category: "database", patterns: ["mongodb", "mongo"], avgSeatCostEur: 700, minSeats: 1 },
  { id: "supabase", name: "Supabase", category: "database", patterns: ["supabase"], avgSeatCostEur: 300, minSeats: 1 },
  { id: "redis", name: "Redis Cloud", category: "database", patterns: ["redis", "upstash"], avgSeatCostEur: 360, minSeats: 1 },
  { id: "databricks", name: "Databricks", category: "database", patterns: ["databricks"], avgSeatCostEur: 5000, minSeats: 5 },

  // ── Storage / Productivity ─────────────────────
  { id: "dropbox", name: "Dropbox Business", category: "storage", patterns: ["dropbox"], avgSeatCostEur: 144, minSeats: 5 },
  { id: "box", name: "Box", category: "storage", patterns: ["box.com", "box.net"], avgSeatCostEur: 180, minSeats: 5 },
  { id: "google_workspace", name: "Google Workspace", category: "email", patterns: ["google", "gmail", "workspace"], avgSeatCostEur: 144, minSeats: 10 },
  { id: "microsoft_365", name: "Microsoft 365", category: "email", patterns: ["outlook", "office365", "microsoft365", "sharepoint"], avgSeatCostEur: 264, minSeats: 10 },

  // ── ERP ────────────────────────────────────────
  { id: "sap", name: "SAP", category: "other", patterns: ["sap", "s4hana"], avgSeatCostEur: 4000, minSeats: 50 },
  { id: "oracle", name: "Oracle", category: "other", patterns: ["oracle", "oraclecloud"], avgSeatCostEur: 3500, minSeats: 20 },
];

// ══════════════════════════════════════════════════════
//  OVERLAP DETECTION RULES
//  Category → if multiple vendors detected → waste flag
// ══════════════════════════════════════════════════════

const OVERLAP_RULES: Array<{
  category: VendorCategory;
  label: string;
  wastePercent: number;
  explanation: string;
}> = [
  { category: "productivity", label: "Gestion de projet", wastePercent: 30, explanation: "Outils de gestion de projet redondants — licences dupliquées, adoption fragmentée, données silotées." },
  { category: "crm", label: "CRM & Ventes", wastePercent: 25, explanation: "CRM multiples = données client fragmentées, pipeline inexact, coût d'intégration excessif." },
  { category: "communication", label: "Communication", wastePercent: 20, explanation: "Plateformes de communication multiples — licences payées en double, conversations fragmentées." },
  { category: "observability", label: "Observabilité", wastePercent: 35, explanation: "Monitoring redondant — ingestion de données dupliquée (coût #1), alertes conflictuelles." },
  { category: "analytics", label: "Analytics", wastePercent: 30, explanation: "Outils analytics multiples — tracking dupliqué, données incohérentes, coûts d'ingestion cumulés." },
  { category: "security", label: "Sécurité", wastePercent: 20, explanation: "Solutions de sécurité qui se chevauchent — couverture redondante, complexité de gestion accrue." },
  { category: "marketing", label: "Marketing & Support", wastePercent: 25, explanation: "Stack marketing fragmenté — campagnes silotées, données prospect dispersées." },
  { category: "design", label: "Design", wastePercent: 25, explanation: "Outils design multiples — licences sous-utilisées, workflows incompatibles." },
  { category: "storage", label: "Stockage", wastePercent: 30, explanation: "Solutions de stockage multiples — données dispersées, coûts cumulés, risque compliance." },
  { category: "hr", label: "RH / People", wastePercent: 25, explanation: "Outils RH multiples — données collaborateurs fragmentées, processus incohérents." },
  { category: "identity", label: "Identity / SSO", wastePercent: 20, explanation: "Providers d'identité multiples — shadow auth, risque de sécurité accru." },
  { category: "database", label: "Database", wastePercent: 25, explanation: "Bases de données multiples — complexité opérationnelle, coûts d'hébergement cumulés." },
  { category: "ai_llm", label: "AI / LLM", wastePercent: 35, explanation: "Providers AI multiples — coûts API incontrôlés, shadow AI, risque compliance GDPR/AI Act." },
];

// ══════════════════════════════════════════════════════
//  STEP 1: CT-LOG DEEP PARSER
// ══════════════════════════════════════════════════════

interface CTLogEntry {
  issuer_ca_id: number;
  issuer_name: string;
  common_name: string;
  name_value: string;
  id: number;
  entry_timestamp: string;
  not_before: string;
  not_after: string;
  serial_number: string;
}

/**
 * Query crt.sh Certificate Transparency logs for a domain.
 * Extracts all unique subdomains, strips wildcards.
 * 10s timeout with empty-array fallback.
 */
export async function parseCTLogs(domain: string): Promise<string[]> {
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();

  try {
    const resp = await fetch(
      `https://crt.sh/?q=%25.${encodeURIComponent(cleanDomain)}&output=json`,
      { signal: AbortSignal.timeout(10000) },
    );

    if (!resp.ok) return [];

    const entries: CTLogEntry[] = await resp.json();
    const subdomains = new Set<string>();

    for (const entry of entries) {
      // name_value can contain multiple domains separated by \n
      const names = entry.name_value.split("\n");
      for (const raw of names) {
        const name = raw.trim().toLowerCase();
        if (!name) continue;

        // Strip wildcard prefix
        const clean = name.replace(/^\*\./, "");

        // Must be a subdomain of the target domain
        if (clean === cleanDomain) continue;
        if (!clean.endsWith(`.${cleanDomain}`)) continue;

        // Must not be a bare wildcard
        if (clean.startsWith("*.")) continue;

        subdomains.add(clean);
      }
    }

    return Array.from(subdomains).sort();
  } catch {
    // crt.sh timeout or error — non-fatal
    return [];
  }
}

// ══════════════════════════════════════════════════════
//  STEP 2: SAAS FINGERPRINTING
// ══════════════════════════════════════════════════════

/**
 * Match subdomains against 100+ SaaS vendor patterns.
 * Returns detected vendors with cost estimates.
 */
function fingerprintSubdomains(
  subdomains: string[],
  companySize: number,
): ShadowBillVendor[] {
  const detected = new Map<string, ShadowBillVendor>();

  for (const subdomain of subdomains) {
    // Extract the leftmost label (e.g., "jira.acme.com" → "jira")
    const labels = subdomain.split(".");
    const leftLabel = labels[0];

    for (const fp of SAAS_FINGERPRINTS) {
      if (detected.has(fp.id)) continue; // Already detected

      const matched = fp.patterns.some((pattern) => {
        // Match against full subdomain or leftmost label
        return leftLabel.includes(pattern) || subdomain.includes(pattern);
      });

      if (matched) {
        const estimatedSeats = Math.max(fp.minSeats, Math.round(companySize * 0.6));
        const lowEstimate = Math.round(fp.avgSeatCostEur * fp.minSeats * 0.7);
        const highEstimate = Math.round(fp.avgSeatCostEur * estimatedSeats * 1.2);

        detected.set(fp.id, {
          id: fp.id,
          name: fp.name,
          category: fp.category,
          source: "ct_log",
          subdomain,
          estimatedAnnualEur: [lowEstimate, highEstimate],
          avgSeatCostEur: fp.avgSeatCostEur,
          confidence: 70, // CT-log = observed evidence, moderate confidence
        });
      }
    }
  }

  // Sort by estimated cost descending
  return Array.from(detected.values()).sort(
    (a, b) => b.estimatedAnnualEur[1] - a.estimatedAnnualEur[1],
  );
}

// ══════════════════════════════════════════════════════
//  STEP 3: OVERLAP DETECTION & WASTE CALCULATION
// ══════════════════════════════════════════════════════

function detectOverlaps(vendors: ShadowBillVendor[]): OverlapFlag[] {
  const overlaps: OverlapFlag[] = [];

  // Group vendors by category
  const byCategory = new Map<VendorCategory, ShadowBillVendor[]>();
  for (const v of vendors) {
    const existing = byCategory.get(v.category) || [];
    existing.push(v);
    byCategory.set(v.category, existing);
  }

  // Check overlap rules
  for (const rule of OVERLAP_RULES) {
    const categoryVendors = byCategory.get(rule.category);
    if (!categoryVendors || categoryVendors.length < 2) continue;

    const totalLow = categoryVendors.reduce((s, v) => s + v.estimatedAnnualEur[0], 0);
    const totalHigh = categoryVendors.reduce((s, v) => s + v.estimatedAnnualEur[1], 0);

    overlaps.push({
      category: rule.category,
      vendors: categoryVendors.map((v) => v.name),
      wastePercent: rule.wastePercent,
      estimatedWasteEur: [
        Math.round(totalLow * (rule.wastePercent / 100)),
        Math.round(totalHigh * (rule.wastePercent / 100)),
      ],
      explanation: rule.explanation,
    });
  }

  return overlaps;
}

// ══════════════════════════════════════════════════════
//  MAIN: calculateShadowBill()
// ══════════════════════════════════════════════════════

/**
 * Full Shadow-Bill Reconstruction pipeline.
 *
 * 1. Query crt.sh for all subdomains
 * 2. Fingerprint against 100+ SaaS vendors
 * 3. Detect overlaps & waste
 * 4. Generate the Shadow Bill
 *
 * Returns structured data for the Trojan Vault page.
 */
export async function calculateShadowBill(
  domain: string,
  companySize: number = 100,
): Promise<ShadowBill> {
  const start = Date.now();
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();

  // ── Step 1: CT-Log deep extraction ────────────
  const allSubdomains = await parseCTLogs(cleanDomain);

  // ── Step 2: SaaS fingerprinting ───────────────
  const detectedVendors = fingerprintSubdomains(allSubdomains, companySize);

  // SaaS-matching subdomains (those that triggered a detection)
  const saasSubdomains = detectedVendors.map((v) => v.subdomain);

  // ── Step 3: Overlap & waste detection ─────────
  const overlaps = detectOverlaps(detectedVendors);

  // ── Step 4: Aggregate the Shadow Bill ─────────
  const totalSpendLow = detectedVendors.reduce((s, v) => s + v.estimatedAnnualEur[0], 0);
  const totalSpendHigh = detectedVendors.reduce((s, v) => s + v.estimatedAnnualEur[1], 0);

  const totalOverlapWasteLow = overlaps.reduce((s, o) => s + o.estimatedWasteEur[0], 0);
  const totalOverlapWasteHigh = overlaps.reduce((s, o) => s + o.estimatedWasteEur[1], 0);

  // Base waste: overlaps + estimated 15% general under-utilization
  const generalWasteLow = Math.round(totalSpendLow * 0.15);
  const generalWasteHigh = Math.round(totalSpendHigh * 0.15);
  const totalWasteLow = totalOverlapWasteLow + generalWasteLow;
  const totalWasteHigh = totalOverlapWasteHigh + generalWasteHigh;

  const wastePercent = totalSpendHigh > 0
    ? Math.round(((totalWasteLow + totalWasteHigh) / 2) / ((totalSpendLow + totalSpendHigh) / 2) * 100)
    : 0;

  // Group by category
  const vendorsByCategory: Record<string, ShadowBillVendor[]> = {};
  for (const v of detectedVendors) {
    if (!vendorsByCategory[v.category]) vendorsByCategory[v.category] = [];
    vendorsByCategory[v.category].push(v);
  }

  // Scores
  const categories = new Set(detectedVendors.map((v) => v.category));
  const stackComplexity = Math.min(95, detectedVendors.length * 3 + categories.size * 5);
  const governanceRisk = Math.min(95,
    overlaps.length * 12 +
    detectedVendors.filter((v) => v.category === "ai_llm").length * 15 +
    (detectedVendors.length > 15 ? 20 : detectedVendors.length > 10 ? 10 : 0),
  );
  const confidence = Math.min(85,
    10 + Math.min(30, allSubdomains.length) + Math.min(25, detectedVendors.length * 3),
  );

  return {
    domain: cleanDomain,
    scannedAt: new Date(),
    executionMs: Date.now() - start,

    totalSubdomains: allSubdomains.length,
    uniqueSubdomains: allSubdomains.slice(0, 50), // Cap for payload size
    saasSubdomains,

    detectedVendors,
    vendorsByCategory,

    overlaps,
    totalOverlapWasteEur: [totalOverlapWasteLow, totalOverlapWasteHigh],

    totalEstimatedSpendEur: [totalSpendLow, totalSpendHigh],
    totalProbableWasteEur: [totalWasteLow, totalWasteHigh],
    wastePercent,

    stackComplexity,
    governanceRisk,
    confidence,

    // Trojan Vault: first 3 visible, rest locked
    previewVendors: detectedVendors.slice(0, 3),
    lockedVendorCount: Math.max(0, detectedVendors.length - 3),
  };
}
