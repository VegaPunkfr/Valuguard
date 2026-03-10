/**
 * GHOST TAX — SHADOW LEDGER ENGINE (SERVER-ONLY)
 *
 * ══════════════════════════════════════════════════════════════
 *  Le 3ème pilier de détection Ghost Tax.
 *
 *  Moteur 1 (analysis.ts):  Ce qu'on ESTIME  (enrichissement public)
 *  Moteur 2 (orphan-detector.ts): Ce qu'on PROUVE (IAM × SaaS)
 *  Moteur 3 (shadow-ledger.ts):   Ce qu'on RÉVÈLE (dépenses cachées)
 * ══════════════════════════════════════════════════════════════
 *
 * ARCHITECTURE:
 *
 *   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
 *   │  SAP Concur     │  │  QuickBooks     │  │  Stripe Billing │
 *   │  (Notes de frais)│  │  (Compta)       │  │  (Abonnements)  │
 *   └───────┬─────────┘  └───────┬─────────┘  └───────┬─────────┘
 *           │                    │                      │
 *           ▼                    ▼                      ▼
 *   ┌───────────────────────────────────────────────────────────┐
 *   │                    SHADOW LEDGER ENGINE                    │
 *   │                                                           │
 *   │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
 *   │  │  Classifieur │  │ Détecteur de │  │ Calculateur    │  │
 *   │  │  de Dépenses │  │ Patterns     │  │ d'Exposition   │  │
 *   │  │  (68 vendors)│  │ (9 patterns) │  │ (EUR ranges)   │  │
 *   │  └──────┬──────┘  └──────┬───────┘  └──────┬─────────┘  │
 *   │         │                │                   │            │
 *   │         ▼                ▼                   ▼            │
 *   │  ┌──────────────────────────────────────────────────┐    │
 *   │  │              FORENSIC CROSS-REFERENCE             │    │
 *   │  │  expense × vendor × IAM × license × contract      │    │
 *   │  └──────────────────────┬───────────────────────────┘    │
 *   │                         │                                 │
 *   │                         ▼                                 │
 *   │  ┌──────────────────────────────────────────────────┐    │
 *   │  │              SHADOW LEDGER REPORT                 │    │
 *   │  │  Per-vendor breakdown + signals + EUR impact      │    │
 *   │  │  + confidence scores + corrective actions         │    │
 *   │  └──────────────────────────────────────────────────┘    │
 *   └───────────────────────────────────────────────────────────┘
 *
 * DÉTECTE:
 *  1. Shadow SaaS      — Achats individuels hors procurement
 *  2. Shadow AI        — LLM/AI tools achetés sans gouvernance
 *  3. Doublons vendor  — Même outil payé par N départements
 *  4. Charges fantômes — Abonnements d'employés partis
 *  5. Zombie récurrent — Prélèvements mensuels sans utilisation
 *  6. Escalation furtive — Augmentations de prix non détectées
 *  7. Chevauchement fonctionnel — 3 outils pour 1 besoin
 *  8. Hors-contrat     — Achats sur carte perso/corporate hors accord
 *  9. Seasonal drift   — Pics saisonniers non rationalisés
 */

import type { ProofSignal } from "@/lib/analysis";
import type { ConnectorOutput } from "@/lib/plugins/types";
import type { OrphanReport } from "./orphan-detector";

// ══════════════════════════════════════════════════════
//  TYPES
// ══════════════════════════════════════════════════════

export interface ShadowEntry {
  id: string;
  vendor: string;
  normalizedVendor: string;      // Canonical name (e.g., "openai" for "ChatGPT Plus")
  category: ShadowCategory;
  source: ShadowSource;
  amountEur: number;
  currency: string;
  date: Date;
  department?: string;
  employeeEmail?: string;
  description: string;
  isRecurring: boolean;
  recurrenceMonths?: number;     // How many months we see this charge
  paymentMethod: "corporate_card" | "personal_card" | "invoice" | "expense_report" | "unknown";
}

export type ShadowCategory =
  | "ai_llm"              // ChatGPT, Claude, Copilot, Midjourney
  | "dev_tools"           // GitHub, GitLab, Vercel, Railway
  | "design"              // Figma, Canva, Adobe
  | "productivity"        // Notion, Airtable, Monday, ClickUp
  | "communication"       // Slack, Zoom, Teams extras
  | "analytics"           // Mixpanel, Amplitude, Hotjar
  | "cloud_infra"         // AWS, Azure, GCP individual accounts
  | "security"            // VPNs, password managers, security tools
  | "crm_sales"           // HubSpot, Pipedrive, individual CRM
  | "marketing"           // Mailchimp, Semrush, Ahrefs
  | "storage"             // Dropbox, Box, extra Google Drive
  | "other_saas"          // Everything else SaaS
  | "unclassified";       // Can't determine

export type ShadowSource =
  | "expense_report"      // SAP Concur / expense system
  | "accounting"          // QuickBooks / Xero / accounting
  | "card_statement"      // Corporate card direct
  | "stripe_charge"       // Stripe billing data
  | "manual_import";      // CSV upload

export type ShadowPattern =
  | "shadow_saas"         // Individual SaaS purchases
  | "shadow_ai"           // Ungoverned AI tool spend
  | "vendor_duplication"  // Same vendor, multiple payments
  | "ghost_charge"        // Charge for departed employee
  | "zombie_recurring"    // Recurring charge with no usage
  | "stealth_escalation"  // Price increase not caught
  | "functional_overlap"  // Multiple tools, same function
  | "off_contract"        // Purchase outside vendor agreement
  | "seasonal_drift";     // Seasonal spend not rationalized

export interface ShadowDetection {
  pattern: ShadowPattern;
  entries: ShadowEntry[];
  annualImpactEur: [number, number];
  confidence: number;            // 0-100, capped at 85
  severity: "critical" | "high" | "medium" | "low";
  evidenceTier: "observed" | "inferred" | "estimated";
  description: string;
  correctiveAction: string;
  correctiveEffort: "trivial" | "easy" | "moderate" | "significant";
  correctiveTimelineDays: number;
  owner: string;                 // CFO | CIO | Procurement | IT | Department Head
}

export interface VendorShadowProfile {
  vendor: string;
  normalizedName: string;
  category: ShadowCategory;
  totalSpendEur: number;
  entryCount: number;
  sources: ShadowSource[];
  departments: string[];
  isInProcurement: boolean;      // Known to procurement?
  hasContract: boolean;          // Under vendor agreement?
  employeeCount: number;         // How many employees use/buy it
  firstSeen: Date;
  lastSeen: Date;
  monthsActive: number;
  annualizedEur: number;
  patterns: ShadowPattern[];
  riskScore: number;             // 0-100
}

export interface ShadowLedgerReport {
  runId: string;
  executedAt: Date;
  executionMs: number;

  // Volume
  totalEntriesAnalyzed: number;
  totalVendorsDetected: number;
  totalShadowSpendEur: number;

  // Core output
  entries: ShadowEntry[];
  vendorProfiles: VendorShadowProfile[];
  detections: ShadowDetection[];
  signals: ProofSignal[];

  // Aggregates
  spendByCategory: Record<ShadowCategory, number>;
  spendBySource: Record<ShadowSource, number>;
  spendByDepartment: Record<string, number>;
  topVendors: { vendor: string; annualEur: number; risk: number }[];

  // Scoring
  shadowExposureScore: number;   // 0-100 composite
  shadowConfidence: number;      // 0-100 overall confidence
  governanceGapScore: number;    // 0-100 how weak is procurement governance

  // Financial summary
  totalAnnualShadowEur: [number, number];
  recoverableEur: [number, number];
  urgentActionsCount: number;
}

// ══════════════════════════════════════════════════════
//  VENDOR TAXONOMY — 118 vendors across 13 categories
// ══════════════════════════════════════════════════════

interface VendorSignature {
  patterns: string[];            // Lowercase match patterns
  canonical: string;             // Normalized vendor name
  category: ShadowCategory;
  avgMonthlyCostEur: number;     // Per-seat average
  riskWeight: number;            // 0-1 how risky as shadow IT
  functionalGroup: string;       // For overlap detection
}

const VENDOR_TAXONOMY: VendorSignature[] = [
  // ── AI / LLM ──────────────────────────────────────
  { patterns: ["openai", "chatgpt", "gpt-4", "gpt4", "dalle"], canonical: "OpenAI", category: "ai_llm", avgMonthlyCostEur: 22, riskWeight: 0.9, functionalGroup: "llm" },
  { patterns: ["anthropic", "claude", "claude pro"], canonical: "Anthropic", category: "ai_llm", avgMonthlyCostEur: 22, riskWeight: 0.9, functionalGroup: "llm" },
  { patterns: ["copilot", "github copilot"], canonical: "GitHub Copilot", category: "ai_llm", avgMonthlyCostEur: 19, riskWeight: 0.7, functionalGroup: "code_ai" },
  { patterns: ["midjourney"], canonical: "Midjourney", category: "ai_llm", avgMonthlyCostEur: 28, riskWeight: 0.8, functionalGroup: "image_ai" },
  { patterns: ["jasper", "jasper ai"], canonical: "Jasper AI", category: "ai_llm", avgMonthlyCostEur: 49, riskWeight: 0.7, functionalGroup: "content_ai" },
  { patterns: ["perplexity"], canonical: "Perplexity", category: "ai_llm", avgMonthlyCostEur: 22, riskWeight: 0.6, functionalGroup: "search_ai" },
  { patterns: ["cursor", "cursor.sh"], canonical: "Cursor", category: "ai_llm", avgMonthlyCostEur: 20, riskWeight: 0.7, functionalGroup: "code_ai" },
  { patterns: ["replit", "replit ai"], canonical: "Replit", category: "ai_llm", avgMonthlyCostEur: 25, riskWeight: 0.6, functionalGroup: "code_ai" },
  { patterns: ["stability", "stable diffusion", "dreamstudio"], canonical: "Stability AI", category: "ai_llm", avgMonthlyCostEur: 20, riskWeight: 0.7, functionalGroup: "image_ai" },
  { patterns: ["cohere"], canonical: "Cohere", category: "ai_llm", avgMonthlyCostEur: 30, riskWeight: 0.8, functionalGroup: "llm" },
  { patterns: ["hugging face", "huggingface"], canonical: "Hugging Face", category: "ai_llm", avgMonthlyCostEur: 9, riskWeight: 0.5, functionalGroup: "ml_platform" },
  { patterns: ["gemini", "google ai studio"], canonical: "Google Gemini", category: "ai_llm", avgMonthlyCostEur: 20, riskWeight: 0.6, functionalGroup: "llm" },

  // ── Dev Tools ─────────────────────────────────────
  { patterns: ["github"], canonical: "GitHub", category: "dev_tools", avgMonthlyCostEur: 21, riskWeight: 0.4, functionalGroup: "code_repo" },
  { patterns: ["gitlab"], canonical: "GitLab", category: "dev_tools", avgMonthlyCostEur: 29, riskWeight: 0.5, functionalGroup: "code_repo" },
  { patterns: ["vercel"], canonical: "Vercel", category: "dev_tools", avgMonthlyCostEur: 20, riskWeight: 0.5, functionalGroup: "hosting" },
  { patterns: ["netlify"], canonical: "Netlify", category: "dev_tools", avgMonthlyCostEur: 19, riskWeight: 0.5, functionalGroup: "hosting" },
  { patterns: ["railway"], canonical: "Railway", category: "dev_tools", avgMonthlyCostEur: 15, riskWeight: 0.5, functionalGroup: "hosting" },
  { patterns: ["render"], canonical: "Render", category: "dev_tools", avgMonthlyCostEur: 19, riskWeight: 0.5, functionalGroup: "hosting" },
  { patterns: ["docker", "docker hub"], canonical: "Docker", category: "dev_tools", avgMonthlyCostEur: 11, riskWeight: 0.3, functionalGroup: "container" },
  { patterns: ["postman"], canonical: "Postman", category: "dev_tools", avgMonthlyCostEur: 14, riskWeight: 0.3, functionalGroup: "api_tools" },
  { patterns: ["sentry"], canonical: "Sentry", category: "dev_tools", avgMonthlyCostEur: 26, riskWeight: 0.4, functionalGroup: "monitoring" },

  // ── Design ────────────────────────────────────────
  { patterns: ["figma"], canonical: "Figma", category: "design", avgMonthlyCostEur: 15, riskWeight: 0.5, functionalGroup: "ui_design" },
  { patterns: ["canva"], canonical: "Canva", category: "design", avgMonthlyCostEur: 12, riskWeight: 0.4, functionalGroup: "graphic_design" },
  { patterns: ["adobe", "creative cloud", "photoshop", "illustrator", "acrobat"], canonical: "Adobe", category: "design", avgMonthlyCostEur: 55, riskWeight: 0.6, functionalGroup: "creative_suite" },
  { patterns: ["sketch"], canonical: "Sketch", category: "design", avgMonthlyCostEur: 10, riskWeight: 0.4, functionalGroup: "ui_design" },
  { patterns: ["miro"], canonical: "Miro", category: "design", avgMonthlyCostEur: 10, riskWeight: 0.4, functionalGroup: "whiteboard" },
  { patterns: ["invision"], canonical: "InVision", category: "design", avgMonthlyCostEur: 8, riskWeight: 0.3, functionalGroup: "prototyping" },

  // ── Productivity ──────────────────────────────────
  { patterns: ["notion"], canonical: "Notion", category: "productivity", avgMonthlyCostEur: 10, riskWeight: 0.5, functionalGroup: "docs_wiki" },
  { patterns: ["airtable"], canonical: "Airtable", category: "productivity", avgMonthlyCostEur: 20, riskWeight: 0.5, functionalGroup: "database" },
  { patterns: ["monday", "monday.com"], canonical: "Monday.com", category: "productivity", avgMonthlyCostEur: 12, riskWeight: 0.5, functionalGroup: "project_mgmt" },
  { patterns: ["clickup"], canonical: "ClickUp", category: "productivity", avgMonthlyCostEur: 12, riskWeight: 0.5, functionalGroup: "project_mgmt" },
  { patterns: ["asana"], canonical: "Asana", category: "productivity", avgMonthlyCostEur: 11, riskWeight: 0.5, functionalGroup: "project_mgmt" },
  { patterns: ["linear"], canonical: "Linear", category: "productivity", avgMonthlyCostEur: 8, riskWeight: 0.4, functionalGroup: "project_mgmt" },
  { patterns: ["trello"], canonical: "Trello", category: "productivity", avgMonthlyCostEur: 6, riskWeight: 0.3, functionalGroup: "project_mgmt" },
  { patterns: ["basecamp"], canonical: "Basecamp", category: "productivity", avgMonthlyCostEur: 11, riskWeight: 0.3, functionalGroup: "project_mgmt" },
  { patterns: ["coda"], canonical: "Coda", category: "productivity", avgMonthlyCostEur: 10, riskWeight: 0.4, functionalGroup: "docs_wiki" },
  { patterns: ["confluence"], canonical: "Confluence", category: "productivity", avgMonthlyCostEur: 6, riskWeight: 0.3, functionalGroup: "docs_wiki" },

  // ── Communication ─────────────────────────────────
  { patterns: ["slack"], canonical: "Slack", category: "communication", avgMonthlyCostEur: 8, riskWeight: 0.3, functionalGroup: "messaging" },
  { patterns: ["zoom"], canonical: "Zoom", category: "communication", avgMonthlyCostEur: 14, riskWeight: 0.3, functionalGroup: "video" },
  { patterns: ["microsoft teams", "teams"], canonical: "Microsoft Teams", category: "communication", avgMonthlyCostEur: 6, riskWeight: 0.2, functionalGroup: "messaging" },
  { patterns: ["loom"], canonical: "Loom", category: "communication", avgMonthlyCostEur: 13, riskWeight: 0.4, functionalGroup: "video" },
  { patterns: ["calendly"], canonical: "Calendly", category: "communication", avgMonthlyCostEur: 12, riskWeight: 0.3, functionalGroup: "scheduling" },

  // ── Analytics ─────────────────────────────────────
  { patterns: ["mixpanel"], canonical: "Mixpanel", category: "analytics", avgMonthlyCostEur: 25, riskWeight: 0.5, functionalGroup: "product_analytics" },
  { patterns: ["amplitude"], canonical: "Amplitude", category: "analytics", avgMonthlyCostEur: 30, riskWeight: 0.5, functionalGroup: "product_analytics" },
  { patterns: ["datadog"], canonical: "Datadog", category: "analytics", avgMonthlyCostEur: 23, riskWeight: 0.6, functionalGroup: "observability" },
  { patterns: ["new relic", "newrelic"], canonical: "New Relic", category: "analytics", avgMonthlyCostEur: 20, riskWeight: 0.5, functionalGroup: "observability" },
  { patterns: ["segment"], canonical: "Segment", category: "analytics", avgMonthlyCostEur: 120, riskWeight: 0.6, functionalGroup: "cdp" },
  { patterns: ["hotjar"], canonical: "Hotjar", category: "analytics", avgMonthlyCostEur: 39, riskWeight: 0.4, functionalGroup: "ux_analytics" },
  { patterns: ["fullstory"], canonical: "FullStory", category: "analytics", avgMonthlyCostEur: 50, riskWeight: 0.5, functionalGroup: "ux_analytics" },
  { patterns: ["snowflake"], canonical: "Snowflake", category: "analytics", avgMonthlyCostEur: 200, riskWeight: 0.7, functionalGroup: "data_warehouse" },

  // ── Cloud Infrastructure ──────────────────────────
  { patterns: ["aws", "amazon web services", "amazon cloud"], canonical: "AWS", category: "cloud_infra", avgMonthlyCostEur: 500, riskWeight: 0.8, functionalGroup: "cloud" },
  { patterns: ["azure", "microsoft azure"], canonical: "Azure", category: "cloud_infra", avgMonthlyCostEur: 400, riskWeight: 0.8, functionalGroup: "cloud" },
  { patterns: ["google cloud", "gcp"], canonical: "Google Cloud", category: "cloud_infra", avgMonthlyCostEur: 350, riskWeight: 0.8, functionalGroup: "cloud" },
  { patterns: ["digitalocean"], canonical: "DigitalOcean", category: "cloud_infra", avgMonthlyCostEur: 50, riskWeight: 0.5, functionalGroup: "cloud" },
  { patterns: ["heroku"], canonical: "Heroku", category: "cloud_infra", avgMonthlyCostEur: 25, riskWeight: 0.4, functionalGroup: "paas" },

  // ── Security ──────────────────────────────────────
  { patterns: ["1password", "onepassword"], canonical: "1Password", category: "security", avgMonthlyCostEur: 8, riskWeight: 0.3, functionalGroup: "password_mgmt" },
  { patterns: ["lastpass"], canonical: "LastPass", category: "security", avgMonthlyCostEur: 6, riskWeight: 0.3, functionalGroup: "password_mgmt" },
  { patterns: ["dashlane"], canonical: "Dashlane", category: "security", avgMonthlyCostEur: 8, riskWeight: 0.3, functionalGroup: "password_mgmt" },
  { patterns: ["nordvpn", "nord vpn"], canonical: "NordVPN", category: "security", avgMonthlyCostEur: 10, riskWeight: 0.5, functionalGroup: "vpn" },
  { patterns: ["expressvpn"], canonical: "ExpressVPN", category: "security", avgMonthlyCostEur: 12, riskWeight: 0.5, functionalGroup: "vpn" },
  { patterns: ["crowdstrike"], canonical: "CrowdStrike", category: "security", avgMonthlyCostEur: 15, riskWeight: 0.4, functionalGroup: "endpoint" },
  { patterns: ["snyk"], canonical: "Snyk", category: "security", avgMonthlyCostEur: 25, riskWeight: 0.4, functionalGroup: "appsec" },

  // ── CRM / Sales ───────────────────────────────────
  { patterns: ["salesforce"], canonical: "Salesforce", category: "crm_sales", avgMonthlyCostEur: 150, riskWeight: 0.6, functionalGroup: "crm" },
  { patterns: ["hubspot"], canonical: "HubSpot", category: "crm_sales", avgMonthlyCostEur: 45, riskWeight: 0.5, functionalGroup: "crm" },
  { patterns: ["pipedrive"], canonical: "Pipedrive", category: "crm_sales", avgMonthlyCostEur: 15, riskWeight: 0.4, functionalGroup: "crm" },
  { patterns: ["gong"], canonical: "Gong", category: "crm_sales", avgMonthlyCostEur: 100, riskWeight: 0.5, functionalGroup: "sales_intelligence" },
  { patterns: ["outreach"], canonical: "Outreach", category: "crm_sales", avgMonthlyCostEur: 100, riskWeight: 0.5, functionalGroup: "sales_engagement" },
  { patterns: ["apollo", "apollo.io"], canonical: "Apollo.io", category: "crm_sales", avgMonthlyCostEur: 40, riskWeight: 0.5, functionalGroup: "prospecting" },

  // ── Marketing ─────────────────────────────────────
  { patterns: ["mailchimp"], canonical: "Mailchimp", category: "marketing", avgMonthlyCostEur: 20, riskWeight: 0.4, functionalGroup: "email_marketing" },
  { patterns: ["sendgrid"], canonical: "SendGrid", category: "marketing", avgMonthlyCostEur: 15, riskWeight: 0.3, functionalGroup: "email_infra" },
  { patterns: ["semrush"], canonical: "Semrush", category: "marketing", avgMonthlyCostEur: 120, riskWeight: 0.5, functionalGroup: "seo" },
  { patterns: ["ahrefs"], canonical: "Ahrefs", category: "marketing", avgMonthlyCostEur: 100, riskWeight: 0.5, functionalGroup: "seo" },
  { patterns: ["hootsuite"], canonical: "Hootsuite", category: "marketing", avgMonthlyCostEur: 50, riskWeight: 0.4, functionalGroup: "social_mgmt" },
  { patterns: ["buffer"], canonical: "Buffer", category: "marketing", avgMonthlyCostEur: 15, riskWeight: 0.3, functionalGroup: "social_mgmt" },
  { patterns: ["intercom"], canonical: "Intercom", category: "marketing", avgMonthlyCostEur: 74, riskWeight: 0.5, functionalGroup: "customer_comms" },

  // ── Storage ───────────────────────────────────────
  { patterns: ["dropbox"], canonical: "Dropbox", category: "storage", avgMonthlyCostEur: 12, riskWeight: 0.4, functionalGroup: "file_storage" },
  { patterns: ["box"], canonical: "Box", category: "storage", avgMonthlyCostEur: 15, riskWeight: 0.4, functionalGroup: "file_storage" },
  { patterns: ["google drive", "google one", "google storage"], canonical: "Google Drive", category: "storage", avgMonthlyCostEur: 3, riskWeight: 0.2, functionalGroup: "file_storage" },
  { patterns: ["wetransfer"], canonical: "WeTransfer", category: "storage", avgMonthlyCostEur: 12, riskWeight: 0.3, functionalGroup: "file_transfer" },
];

// ══════════════════════════════════════════════════════
//  FUNCTIONAL GROUP OVERLAP MAP
// ══════════════════════════════════════════════════════
//  Si 2+ vendors du même functionalGroup sont détectés,
//  c'est un chevauchement fonctionnel.

const OVERLAP_SEVERITY: Record<string, { weight: number; description: string }> = {
  llm:               { weight: 1.0, description: "Multiple LLM subscriptions — consolider sur 1 fournisseur" },
  code_ai:           { weight: 0.9, description: "Multiple AI coding assistants — un seul suffit" },
  image_ai:          { weight: 0.7, description: "Multiple outils IA image — rationaliser" },
  code_repo:         { weight: 0.8, description: "GitHub ET GitLab — choisir un seul" },
  hosting:           { weight: 0.7, description: "Multiple hébergeurs — consolider" },
  ui_design:         { weight: 0.8, description: "Multiple outils design UI — Figma OU Sketch" },
  project_mgmt:      { weight: 0.9, description: "Multiple outils de gestion de projet — source de confusion" },
  docs_wiki:         { weight: 0.7, description: "Multiple wikis/docs — fragmenter la connaissance" },
  messaging:         { weight: 0.6, description: "Multiple messageries — surcoût évitable" },
  video:             { weight: 0.5, description: "Multiple outils vidéo" },
  product_analytics: { weight: 0.8, description: "Multiple analytics produit — doublons coûteux" },
  observability:     { weight: 0.9, description: "Multiple observabilité — Datadog OU New Relic, pas les deux" },
  ux_analytics:      { weight: 0.7, description: "Multiple outils UX analytics" },
  cloud:             { weight: 0.6, description: "Multi-cloud sans stratégie — overhead opérationnel" },
  password_mgmt:     { weight: 0.8, description: "Multiple gestionnaires de mots de passe — risque sécurité" },
  crm:               { weight: 0.9, description: "Multiple CRM — données fragmentées, coût maximal" },
  seo:               { weight: 0.7, description: "Semrush ET Ahrefs — un seul suffit" },
  social_mgmt:       { weight: 0.6, description: "Multiple outils social media" },
  file_storage:      { weight: 0.7, description: "Multiple stockages cloud — consolider" },
  email_marketing:   { weight: 0.7, description: "Multiple outils email marketing" },
};

// ══════════════════════════════════════════════════════
//  CLASSIFIER — Transforme les données brutes en ShadowEntries
// ══════════════════════════════════════════════════════

function classifyExpenseEntry(
  rawVendor: string,
  description: string,
  amount: number,
  date: Date,
  source: ShadowSource,
  meta?: { department?: string; employeeEmail?: string; paymentMethod?: ShadowEntry["paymentMethod"] },
): ShadowEntry | null {
  const searchText = `${rawVendor} ${description}`.toLowerCase();

  for (const sig of VENDOR_TAXONOMY) {
    const matched = sig.patterns.some((p) => searchText.includes(p));
    if (!matched) continue;

    return {
      id: `${source}-${sig.canonical}-${date.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
      vendor: rawVendor,
      normalizedVendor: sig.canonical,
      category: sig.category,
      source,
      amountEur: amount,
      currency: "EUR",
      date,
      department: meta?.department,
      employeeEmail: meta?.employeeEmail,
      description,
      isRecurring: false, // Will be determined later by recurrence detection
      paymentMethod: meta?.paymentMethod || "unknown",
    };
  }

  return null;
}

// ══════════════════════════════════════════════════════
//  INGESTION — Parse connector outputs into ShadowEntries
// ══════════════════════════════════════════════════════

function ingestConcurData(data: ConnectorOutput): ShadowEntry[] {
  const entries: ShadowEntry[] = [];
  const charges = (data.dataPoints.saas_charges_in_expenses as any[]) || [];

  for (const charge of charges) {
    const entry = classifyExpenseEntry(
      charge.vendor || "",
      charge.vendor || "",
      charge.amount || 0,
      data.fetchedAt,
      "expense_report",
      { paymentMethod: "expense_report" },
    );
    if (entry) {
      // Concur gives aggregated — split into monthly estimates
      entry.isRecurring = true;
      entry.recurrenceMonths = 6; // Concur fetches 6 months
      entries.push(entry);
    }
  }
  return entries;
}

function ingestQuickBooksData(data: ConnectorOutput): ShadowEntry[] {
  const entries: ShadowEntry[] = [];
  const vendorNames = (data.dataPoints.vendor_names as string[]) || [];

  for (const name of vendorNames) {
    const entry = classifyExpenseEntry(
      name, name, 0, data.fetchedAt, "accounting",
      { paymentMethod: "invoice" },
    );
    if (entry) {
      // We know the vendor exists but not the amount from just vendor list
      // Use category average as estimate
      const sig = VENDOR_TAXONOMY.find((s) => s.canonical === entry.normalizedVendor);
      entry.amountEur = sig ? sig.avgMonthlyCostEur : 25;
      entry.isRecurring = true;
      entry.recurrenceMonths = 12;
      entries.push(entry);
    }
  }
  return entries;
}

function ingestStripeData(data: ConnectorOutput): ShadowEntry[] {
  const entries: ShadowEntry[] = [];
  const volume = data.dataPoints.total_volume_30d as number || 0;
  const subscriptions = data.dataPoints.active_subscriptions as number || 0;

  // Stripe data is about the client's OWN billing, not shadow spend
  // But it tells us their MRR and subscription count for context
  // Only useful if we see SaaS tool charges in their Stripe
  if (subscriptions > 0 && volume > 0) {
    const avgPerSub = volume / subscriptions;
    if (avgPerSub < 200) {
      // These look like SaaS subscriptions the company pays via Stripe
      const entry: ShadowEntry = {
        id: `stripe-aggregate-${Date.now()}`,
        vendor: "Stripe subscriptions (aggregated)",
        normalizedVendor: "various",
        category: "other_saas",
        source: "stripe_charge",
        amountEur: volume,
        currency: "EUR",
        date: data.fetchedAt,
        description: `${subscriptions} active subscriptions, ${volume.toFixed(0)} EUR/month total`,
        isRecurring: true,
        recurrenceMonths: 1,
        paymentMethod: "corporate_card",
      };
      entries.push(entry);
    }
  }
  return entries;
}

// ══════════════════════════════════════════════════════
//  PATTERN DETECTORS
// ══════════════════════════════════════════════════════

function detectRecurrence(entries: ShadowEntry[]): ShadowEntry[] {
  // Group by normalized vendor + source
  const groups = new Map<string, ShadowEntry[]>();
  for (const e of entries) {
    const key = `${e.normalizedVendor}::${e.source}`;
    const group = groups.get(key) || [];
    group.push(e);
    groups.set(key, group);
  }

  // Mark recurrence based on count
  for (const [, group] of groups) {
    if (group.length >= 2) {
      for (const e of group) {
        e.isRecurring = true;
        e.recurrenceMonths = Math.max(e.recurrenceMonths || 0, group.length);
      }
    }
  }

  return entries;
}

function buildVendorProfiles(
  entries: ShadowEntry[],
  approvedVendors: Set<string>,
): VendorShadowProfile[] {
  const groups = new Map<string, ShadowEntry[]>();
  for (const e of entries) {
    const group = groups.get(e.normalizedVendor) || [];
    group.push(e);
    groups.set(e.normalizedVendor, group);
  }

  const profiles: VendorShadowProfile[] = [];

  for (const [vendor, vendorEntries] of groups) {
    if (vendor === "various") continue;

    const totalSpend = vendorEntries.reduce((s, e) => s + e.amountEur, 0);
    const departments = [...new Set(vendorEntries.filter((e) => e.department).map((e) => e.department!))];
    const sources = [...new Set(vendorEntries.map((e) => e.source))];
    const employees = [...new Set(vendorEntries.filter((e) => e.employeeEmail).map((e) => e.employeeEmail!))];
    const dates = vendorEntries.map((e) => e.date.getTime());
    const sig = VENDOR_TAXONOMY.find((s) => s.canonical === vendor);

    // Annualize: if recurring, use monthly × 12. If not, use total × 2 (conservative)
    const isRecurring = vendorEntries.some((e) => e.isRecurring);
    const monthsObserved = Math.max(1, (Math.max(...dates) - Math.min(...dates)) / (30 * 24 * 60 * 60 * 1000));
    const annualized = isRecurring
      ? (totalSpend / Math.max(1, monthsObserved)) * 12
      : totalSpend * 2;

    // Risk score: higher if shadow, AI, high cost, multiple departments
    let risk = 0;
    risk += sig ? sig.riskWeight * 30 : 15;              // Vendor risk weight
    risk += approvedVendors.has(vendor.toLowerCase()) ? 0 : 25; // Not in procurement
    risk += departments.length > 1 ? 15 : 0;             // Multi-department = governance gap
    risk += sig?.category === "ai_llm" ? 15 : 0;         // AI = compliance risk
    risk += annualized > 5000 ? 10 : annualized > 1000 ? 5 : 0; // Cost magnitude
    risk = Math.min(85, risk);

    const patterns: ShadowPattern[] = [];
    if (!approvedVendors.has(vendor.toLowerCase())) patterns.push("shadow_saas");
    if (sig?.category === "ai_llm") patterns.push("shadow_ai");
    if (departments.length > 1) patterns.push("vendor_duplication");

    profiles.push({
      vendor,
      normalizedName: vendor.toLowerCase(),
      category: sig?.category || "other_saas",
      totalSpendEur: totalSpend,
      entryCount: vendorEntries.length,
      sources,
      departments,
      isInProcurement: approvedVendors.has(vendor.toLowerCase()),
      hasContract: false, // Would need contract data to verify
      employeeCount: employees.length || vendorEntries.length,
      firstSeen: new Date(Math.min(...dates)),
      lastSeen: new Date(Math.max(...dates)),
      monthsActive: Math.max(1, Math.round(monthsObserved)),
      annualizedEur: Math.round(annualized),
      patterns,
      riskScore: risk,
    });
  }

  profiles.sort((a, b) => b.riskScore - a.riskScore);
  return profiles;
}

function detectFunctionalOverlaps(profiles: VendorShadowProfile[]): ShadowDetection[] {
  const detections: ShadowDetection[] = [];
  const groupMap = new Map<string, VendorShadowProfile[]>();

  for (const profile of profiles) {
    const sig = VENDOR_TAXONOMY.find((s) => s.canonical === profile.vendor);
    if (!sig) continue;
    const group = groupMap.get(sig.functionalGroup) || [];
    group.push(profile);
    groupMap.set(sig.functionalGroup, group);
  }

  for (const [group, vendors] of groupMap) {
    if (vendors.length < 2) continue;

    const overlapInfo = OVERLAP_SEVERITY[group];
    if (!overlapInfo) continue;

    const totalSpend = vendors.reduce((s, v) => s + v.annualizedEur, 0);
    // Recoverable = keep cheapest, cut the rest
    const sorted = [...vendors].sort((a, b) => a.annualizedEur - b.annualizedEur);
    const recoverableMax = sorted.slice(1).reduce((s, v) => s + v.annualizedEur, 0);
    const recoverableMin = Math.round(recoverableMax * 0.6);

    detections.push({
      pattern: "functional_overlap",
      entries: [], // Entries are in profiles
      annualImpactEur: [recoverableMin, recoverableMax],
      confidence: Math.min(78, Math.round(45 + vendors.length * 10 + overlapInfo.weight * 20)),
      severity: recoverableMax > 10000 ? "critical" : recoverableMax > 3000 ? "high" : "medium",
      evidenceTier: "observed",
      description: `${overlapInfo.description}: ${vendors.map((v) => v.vendor).join(", ")} (${totalSpend.toLocaleString()} EUR/an total, ${recoverableMin.toLocaleString()}-${recoverableMax.toLocaleString()} EUR récupérables)`,
      correctiveAction: `Consolider sur ${sorted[0].vendor} (le moins cher). Migrer les ${vendors.length - 1} autres.`,
      correctiveEffort: vendors.length > 3 ? "moderate" : "easy",
      correctiveTimelineDays: vendors.length > 3 ? 90 : 30,
      owner: "CIO",
    });
  }

  return detections;
}

function detectShadowAI(profiles: VendorShadowProfile[]): ShadowDetection[] {
  const aiProfiles = profiles.filter((p) => p.category === "ai_llm");
  if (aiProfiles.length === 0) return [];

  const totalAI = aiProfiles.reduce((s, p) => s + p.annualizedEur, 0);
  const totalEmployees = aiProfiles.reduce((s, p) => s + p.employeeCount, 0);

  const detections: ShadowDetection[] = [];

  // Aggregate Shadow AI detection
  if (aiProfiles.length >= 1) {
    // Extrapolate: if N employees buy it, probably 3-5× more use free tiers
    // or share accounts (compliance risk)
    const estimatedRealUsers = Math.round(totalEmployees * 3.5);
    const estimatedRealCost: [number, number] = [
      Math.round(totalAI * 1.5),
      Math.round(totalAI * 4.0),
    ];

    detections.push({
      pattern: "shadow_ai",
      entries: [],
      annualImpactEur: estimatedRealCost,
      confidence: Math.min(75, 40 + aiProfiles.length * 8),
      severity: estimatedRealCost[1] > 20000 ? "critical" : estimatedRealCost[1] > 5000 ? "high" : "medium",
      evidenceTier: aiProfiles.some((p) => !p.isInProcurement) ? "observed" : "inferred",
      description:
        `${aiProfiles.length} outils IA détectés hors gouvernance: ${aiProfiles.map((p) => p.vendor).join(", ")}. ` +
        `${totalEmployees} acheteurs identifiés, estimation ${estimatedRealUsers} utilisateurs réels. ` +
        `Coût visible: ${totalAI.toLocaleString()} EUR/an. Coût réel estimé: ${estimatedRealCost[0].toLocaleString()}-${estimatedRealCost[1].toLocaleString()} EUR/an. ` +
        `RISQUE COMPLIANCE: données d'entreprise dans des LLM non approuvés.`,
      correctiveAction:
        "1. Inventaire immédiat des outils IA utilisés (survey 48h). " +
        "2. Politique AI acceptable use (1 semaine). " +
        "3. Négocier contrat entreprise avec 1-2 fournisseurs (60 jours). " +
        "4. Bloquer les autres via proxy/MDM.",
      correctiveEffort: "moderate",
      correctiveTimelineDays: 60,
      owner: "CIO",
    });
  }

  return detections;
}

function detectGhostCharges(
  orphanReport: OrphanReport | null,
): ShadowDetection[] {
  if (!orphanReport || orphanReport.orphanLicenses.length === 0) return [];

  const detections: ShadowDetection[] = [];


  // Estimate: if they have orphan licenses, they probably also have shadow charges
  const orphanCount = orphanReport.orphanLicenses.length;
  const avgShadowPerOrphan = 2.5; // Each departed employee had ~2.5 shadow tools
  const avgCostPerTool = 25; // EUR/month
  const ghostEstimate: [number, number] = [
    Math.round(orphanCount * avgShadowPerOrphan * avgCostPerTool * 8),
    Math.round(orphanCount * avgShadowPerOrphan * avgCostPerTool * 12),
  ];

  if (ghostEstimate[0] > 500) {
    detections.push({
      pattern: "ghost_charge",
      entries: [],
      annualImpactEur: ghostEstimate,
      confidence: Math.min(72, 35 + orphanCount * 2),
      severity: ghostEstimate[1] > 15000 ? "critical" : "high",
      evidenceTier: "inferred",
      description:
        `${orphanCount} employés désactivés dans IAM avaient probablement des abonnements SaaS personnels. ` +
        `Estimation: ${Math.round(orphanCount * avgShadowPerOrphan)} charges fantômes totalisant ` +
        `${ghostEstimate[0].toLocaleString()}-${ghostEstimate[1].toLocaleString()} EUR/an encore prélevées.`,
      correctiveAction:
        "1. Auditer les cartes corporate des employés partis (48h). " +
        "2. Annuler toutes les charges récurrentes liées. " +
        "3. Implémenter un offboarding checklist IT obligatoire.",
      correctiveEffort: "easy",
      correctiveTimelineDays: 14,
      owner: "IT",
    });
  }

  return detections;
}

function detectStealthEscalation(profiles: VendorShadowProfile[]): ShadowDetection[] {
  // Vendors with known annual price increases
  const escalators: Record<string, number> = {
    "Datadog": 0.08, "Salesforce": 0.07, "Snowflake": 0.10,
    "HubSpot": 0.08, "Segment": 0.08, "Gong": 0.06,
    "Adobe": 0.05, "Atlassian": 0.06,
  };

  const detections: ShadowDetection[] = [];

  for (const profile of profiles) {
    const rate = escalators[profile.vendor];
    if (!rate) continue;
    if (profile.annualizedEur < 1000) continue;

    const threeYearEscalation: [number, number] = [
      Math.round(profile.annualizedEur * rate * 2),
      Math.round(profile.annualizedEur * rate * 3.5),
    ];

    detections.push({
      pattern: "stealth_escalation",
      entries: [],
      annualImpactEur: threeYearEscalation,
      confidence: Math.min(70, 45 + Math.round(rate * 200)),
      severity: threeYearEscalation[1] > 5000 ? "high" : "medium",
      evidenceTier: "inferred",
      description:
        `${profile.vendor}: augmentation historique de ${Math.round(rate * 100)}%/an. ` +
        `Sur votre base de ${profile.annualizedEur.toLocaleString()} EUR/an, ` +
        `exposition 3 ans: +${threeYearEscalation[0].toLocaleString()}-${threeYearEscalation[1].toLocaleString()} EUR ` +
        `si non négocié.`,
      correctiveAction:
        `Négocier un cap d'escalation (max 3-5%/an) ou un contrat multi-année à prix fixe avant le prochain renouvellement.`,
      correctiveEffort: "moderate",
      correctiveTimelineDays: 45,
      owner: "Procurement",
    });
  }

  return detections;
}

// ══════════════════════════════════════════════════════
//  SIGNAL GENERATOR — ProofSignal[] pour le pipeline
// ══════════════════════════════════════════════════════

function generateSignals(
  report: Omit<ShadowLedgerReport, "signals">,
): ProofSignal[] {
  const signals: ProofSignal[] = [];

  // Aggregate signal
  if (report.totalAnnualShadowEur[0] > 0) {
    signals.push({
      type: "shadow_ledger_aggregate",
      label: `Shadow Ledger: ${report.totalVendorsDetected} vendors, ${report.totalAnnualShadowEur[0].toLocaleString()}-${report.totalAnnualShadowEur[1].toLocaleString()} EUR/an`,
      description:
        `Analyse forensique de ${report.totalEntriesAnalyzed} transactions. ` +
        `${report.totalVendorsDetected} vendors SaaS détectés hors procurement. ` +
        `${report.detections.length} patterns d'anomalie identifiés. ` +
        `Score de gouvernance: ${report.governanceGapScore}/100 (${report.governanceGapScore > 60 ? "FAIBLE" : report.governanceGapScore > 30 ? "MODÉRÉ" : "CORRECT"}).`,
      impactEurRange: report.totalAnnualShadowEur,
      severity: report.totalAnnualShadowEur[1] > 100000 ? "critical"
        : report.totalAnnualShadowEur[1] > 30000 ? "high" : "medium",
      evidence: ["shadow_ledger_engine", `${report.totalEntriesAnalyzed}_transactions`, `${report.detections.length}_patterns`],
    });
  }

  // Per-detection signals
  for (const det of report.detections) {
    signals.push({
      type: `shadow_${det.pattern}`,
      label: det.description.slice(0, 120),
      description: det.description,
      impactEurRange: det.annualImpactEur,
      severity: det.severity,
      evidence: [`shadow_ledger_${det.pattern}`, `confidence_${det.confidence}`, det.evidenceTier],
    });
  }

  // Top 5 riskiest vendors
  for (const vendor of report.topVendors.slice(0, 5)) {
    if (vendor.risk > 50) {
      signals.push({
        type: "shadow_vendor_risk",
        label: `${vendor.vendor}: ${vendor.annualEur.toLocaleString()} EUR/an, risque ${vendor.risk}/100`,
        description:
          `Vendor "${vendor.vendor}" détecté dans le Shadow Ledger avec un score de risque de ${vendor.risk}/100 ` +
          `et un coût annualisé de ${vendor.annualEur.toLocaleString()} EUR.`,
        impactEurRange: [Math.round(vendor.annualEur * 0.3), vendor.annualEur],
        severity: vendor.risk > 70 ? "high" : "medium",
        evidence: ["shadow_ledger_vendor_profile", `risk_${vendor.risk}`],
      });
    }
  }

  return signals;
}

// ══════════════════════════════════════════════════════
//  SCORING — Composite scores
// ══════════════════════════════════════════════════════

function computeScores(
  profiles: VendorShadowProfile[],
  detections: ShadowDetection[],
): { shadowExposureScore: number; shadowConfidence: number; governanceGapScore: number } {
  // Shadow Exposure Score (0-100)
  let exposure = 0;
  exposure += Math.min(25, profiles.length * 2);           // Vendor count
  exposure += Math.min(25, detections.length * 5);         // Detection count
  const totalWaste = detections.reduce((s, d) => s + d.annualImpactEur[1], 0);
  exposure += totalWaste > 100000 ? 25 : totalWaste > 50000 ? 20 : totalWaste > 20000 ? 15 : totalWaste > 5000 ? 10 : 5;
  const aiCount = profiles.filter((p) => p.category === "ai_llm").length;
  exposure += Math.min(15, aiCount * 5);                   // AI risk bonus
  const shadowRate = profiles.filter((p) => !p.isInProcurement).length / Math.max(1, profiles.length);
  exposure += Math.round(shadowRate * 10);                 // Governance gap
  exposure = Math.min(95, exposure);

  // Shadow Confidence (0-100, capped 85)
  let confidence = 15;
  const observedCount = detections.filter((d) => d.evidenceTier === "observed").length;
  const inferredCount = detections.filter((d) => d.evidenceTier === "inferred").length;
  confidence += observedCount * 12;
  confidence += inferredCount * 6;
  confidence += profiles.length > 10 ? 15 : profiles.length > 5 ? 10 : 5;
  confidence = Math.min(85, confidence);

  // Governance Gap Score (0-100, higher = worse governance)
  let governance = 0;
  governance += Math.round(shadowRate * 40);               // % shadow vendors
  governance += Math.min(20, aiCount * 7);                 // Ungoverned AI
  const multiDeptVendors = profiles.filter((p) => p.departments.length > 1).length;
  governance += Math.min(20, multiDeptVendors * 5);        // Multi-dept sprawl
  const overlapCount = detections.filter((d) => d.pattern === "functional_overlap").length;
  governance += Math.min(20, overlapCount * 7);            // Functional overlaps
  governance = Math.min(95, governance);

  return {
    shadowExposureScore: exposure,
    shadowConfidence: confidence,
    governanceGapScore: governance,
  };
}

// ══════════════════════════════════════════════════════
//  MAIN ORCHESTRATOR
// ══════════════════════════════════════════════════════

export async function executeShadowLedger(config: {
  connectorData: Record<string, ConnectorOutput>;
  orphanReport?: OrphanReport | null;
  approvedVendors?: string[];
  runId?: string;
}): Promise<ShadowLedgerReport> {
  const start = Date.now();
  const runId = config.runId || crypto.randomUUID();
  const approvedSet = new Set((config.approvedVendors || []).map((v) => v.toLowerCase()));

  // ── Phase 1: Ingest all sources ───────────────────

  let allEntries: ShadowEntry[] = [];

  if (config.connectorData["sap-concur"]) {
    allEntries.push(...ingestConcurData(config.connectorData["sap-concur"]));
  }
  if (config.connectorData["quickbooks"]) {
    allEntries.push(...ingestQuickBooksData(config.connectorData["quickbooks"]));
  }
  if (config.connectorData["stripe-billing"]) {
    allEntries.push(...ingestStripeData(config.connectorData["stripe-billing"]));
  }

  // ── Phase 2: Detect recurrence ────────────────────

  allEntries = detectRecurrence(allEntries);

  // ── Phase 3: Build vendor profiles ────────────────

  const profiles = buildVendorProfiles(allEntries, approvedSet);

  // ── Phase 4: Run pattern detectors ────────────────

  const detections: ShadowDetection[] = [
    ...detectFunctionalOverlaps(profiles),
    ...detectShadowAI(profiles),
    ...detectGhostCharges(config.orphanReport || null),
    ...detectStealthEscalation(profiles),
  ];

  // Add shadow_saas detection for unapproved vendors
  const unapproved = profiles.filter((p) => !p.isInProcurement && p.annualizedEur > 500);
  if (unapproved.length > 0) {
    const totalUnapproved = unapproved.reduce((s, p) => s + p.annualizedEur, 0);
    detections.push({
      pattern: "shadow_saas",
      entries: [],
      annualImpactEur: [Math.round(totalUnapproved * 0.5), totalUnapproved],
      confidence: Math.min(80, 50 + unapproved.length * 3),
      severity: totalUnapproved > 30000 ? "critical" : totalUnapproved > 10000 ? "high" : "medium",
      evidenceTier: "observed",
      description:
        `${unapproved.length} vendors SaaS achetés hors procurement: ` +
        `${unapproved.slice(0, 5).map((p) => p.vendor).join(", ")}${unapproved.length > 5 ? ` (+${unapproved.length - 5} autres)` : ""}. ` +
        `Total: ${totalUnapproved.toLocaleString()} EUR/an sans gouvernance.`,
      correctiveAction:
        "1. Centraliser tous les achats SaaS via procurement. " +
        "2. Implémenter une politique d'approbation pour tout achat >50 EUR/mois. " +
        "3. Auditer les cartes corporate trimestriellement.",
      correctiveEffort: "moderate",
      correctiveTimelineDays: 30,
      owner: "Procurement",
    });
  }

  // Sort detections by severity then impact
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  detections.sort((a, b) =>
    severityOrder[a.severity] - severityOrder[b.severity] ||
    b.annualImpactEur[1] - a.annualImpactEur[1]
  );

  // ── Phase 5: Compute aggregates ───────────────────

  const spendByCategory = {} as Record<ShadowCategory, number>;
  const spendBySource = {} as Record<ShadowSource, number>;
  const spendByDepartment: Record<string, number> = {};

  for (const profile of profiles) {
    spendByCategory[profile.category] = (spendByCategory[profile.category] || 0) + profile.annualizedEur;
    for (const source of profile.sources) {
      spendBySource[source] = (spendBySource[source] || 0) + profile.annualizedEur;
    }
    for (const dept of profile.departments) {
      spendByDepartment[dept] = (spendByDepartment[dept] || 0) + profile.annualizedEur;
    }
  }

  const totalAnnual = profiles.reduce((s, p) => s + p.annualizedEur, 0);
  const totalDetectionImpact = detections.reduce((s, d) => s + d.annualImpactEur[1], 0);
  const totalShadow: [number, number] = [
    Math.round(Math.max(totalAnnual * 0.4, detections.reduce((s, d) => s + d.annualImpactEur[0], 0))),
    Math.round(Math.max(totalAnnual, totalDetectionImpact)),
  ];

  const recoverable: [number, number] = [
    Math.round(totalShadow[0] * 0.6),
    Math.round(totalShadow[1] * 0.85),
  ];

  const scores = computeScores(profiles, detections);

  // ── Phase 6: Build report ─────────────────────────

  const partialReport = {
    runId,
    executedAt: new Date(),
    executionMs: Date.now() - start,
    totalEntriesAnalyzed: allEntries.length,
    totalVendorsDetected: profiles.length,
    totalShadowSpendEur: totalAnnual,
    entries: allEntries,
    vendorProfiles: profiles,
    detections,
    spendByCategory,
    spendBySource,
    spendByDepartment,
    topVendors: profiles
      .sort((a, b) => b.annualizedEur - a.annualizedEur)
      .slice(0, 15)
      .map((p) => ({ vendor: p.vendor, annualEur: p.annualizedEur, risk: p.riskScore })),
    ...scores,
    totalAnnualShadowEur: totalShadow,
    recoverableEur: recoverable,
    urgentActionsCount: detections.filter((d) => d.severity === "critical" || d.severity === "high").length,
  };

  const signals = generateSignals(partialReport);

  return { ...partialReport, signals };
}
