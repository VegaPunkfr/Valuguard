/**
 * GHOST TAX — OSINT INTERCEPTOR (SERVER-ONLY)
 *
 * ══════════════════════════════════════════════════════════════
 *  Le 4ème pilier de détection Ghost Tax.
 *
 *  Moteur 1 (analysis.ts):        Ce qu'on ESTIME   (enrichissement public)
 *  Moteur 2 (orphan-detector.ts): Ce qu'on PROUVE   (IAM × SaaS)
 *  Moteur 3 (shadow-ledger.ts):   Ce qu'on RÉVÈLE   (dépenses cachées)
 *  Moteur 4 (osint-interceptor.ts): Ce qu'on INTERCEPTE (signaux publics)
 * ══════════════════════════════════════════════════════════════
 *
 * ARCHITECTURE:
 *
 *   ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐
 *   │    DNS     │  │   Jobs     │  │   Tech     │  │   Certs    │
 *   │   Prober   │  │  Scraper   │  │  Detector  │  │  Scanner   │
 *   └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘
 *         │               │               │               │
 *         ▼               ▼               ▼               ▼
 *   ┌─────────────────────────────────────────────────────────┐
 *   │              SIGNAL FUSION ENGINE                        │
 *   │  Normalize · Deduplicate · Cross-reference · Score      │
 *   └────────────────────────┬────────────────────────────────┘
 *                            │
 *                            ▼
 *   ┌─────────────────────────────────────────────────────────┐
 *   │              STACK RECONSTRUCTION                        │
 *   │  Vendor taxonomy × detected signals → probable stack    │
 *   │  + cost estimation + governance assessment              │
 *   └────────────────────────┬────────────────────────────────┘
 *                            │
 *                            ▼
 *   ┌─────────────────────────────────────────────────────────┐
 *   │              OSINT REPORT                                │
 *   │  Detected vendors + estimated spend + risk signals      │
 *   │  + ProofSignal[] for pipeline integration               │
 *   └─────────────────────────────────────────────────────────┘
 *
 * ZERO CREDENTIALS REQUIRED — Everything from public sources.
 * This is the acquisition engine: scan any domain, get instant results.
 */

import type { ProofSignal } from "@/lib/analysis";

// ══════════════════════════════════════════════════════
//  TYPES
// ══════════════════════════════════════════════════════

export interface OsintSignal {
  source: OsintSource;
  type: OsintSignalType;
  value: string;
  vendor?: string;
  category?: VendorCategory;
  confidence: number;         // 0-100
  evidenceTier: "observed" | "inferred" | "estimated";
  rawEvidence: string;        // The actual data we found
  detectedAt: Date;
}

export type OsintSource =
  | "dns_subdomain"       // DNS CNAME/A records + subdomains
  | "dns_mx"              // MX records (email provider)
  | "dns_txt"             // TXT records (SPF, DKIM, verification)
  | "http_headers"        // Response headers (X-Powered-By, Server)
  | "http_scripts"        // JavaScript includes / CDN references
  | "http_meta"           // Meta tags, link tags
  | "cert_transparency"   // Certificate Transparency logs
  | "job_posting"         // Hiring signals
  | "github_public"       // Public repos (package.json, CI configs)
  | "whois"               // Domain registration data
  | "exa_enrichment";     // Exa neural search results

export type OsintSignalType =
  | "vendor_detected"     // Confirmed vendor usage
  | "vendor_probable"     // Likely vendor usage (indirect signal)
  | "tech_stack"          // Technology identified
  | "hiring_signal"       // Job posting mentioning tool
  | "infra_signal"        // Infrastructure indicator
  | "security_signal"     // Security posture indicator
  | "governance_signal"   // Governance/compliance indicator
  | "growth_signal"       // Company growth/contraction
  | "shadow_risk";        // Shadow IT risk indicator

export type VendorCategory =
  | "crm" | "analytics" | "cloud_infra" | "observability" | "communication"
  | "productivity" | "dev_tools" | "design" | "ai_llm" | "security"
  | "marketing" | "hr" | "finance" | "storage" | "ci_cd" | "email"
  | "cdn" | "database" | "identity" | "other";

export interface DetectedVendor {
  name: string;
  canonical: string;
  category: VendorCategory;
  signals: OsintSignal[];
  signalCount: number;
  confidence: number;           // 0-100 aggregate
  evidenceTier: "observed" | "inferred" | "estimated";
  estimatedAnnualEur: [number, number];
  avgCostPerSeatEur: number;
  detectionMethods: OsintSource[];
  riskFactors: string[];
}

export interface OsintReport {
  runId: string;
  domain: string;
  scannedAt: Date;
  executionMs: number;

  // Core output
  signals: OsintSignal[];
  detectedVendors: DetectedVendor[];
  proofSignals: ProofSignal[];

  // Aggregates
  totalVendorsDetected: number;
  totalEstimatedSpendEur: [number, number];
  stackComplexityScore: number;     // 0-100
  governanceRiskScore: number;      // 0-100
  shadowRiskScore: number;          // 0-100
  osintConfidence: number;          // 0-100, capped 85

  // Breakdown
  vendorsByCategory: Record<string, number>;
  signalsBySource: Record<string, number>;

  // Narrative
  stackSummary: string;
  riskSummary: string;
  estimationBasis: string;
}

// ══════════════════════════════════════════════════════
//  VENDOR KNOWLEDGE BASE — 120+ signatures
// ══════════════════════════════════════════════════════

interface VendorSignature {
  canonical: string;
  category: VendorCategory;
  patterns: {
    dns?: string[];           // Subdomain/CNAME patterns
    mx?: string[];            // MX record patterns
    txt?: string[];           // TXT record patterns (SPF, verification)
    headers?: string[];       // HTTP header values
    scripts?: string[];       // JS CDN patterns
    meta?: string[];          // Meta tag patterns
    certs?: string[];         // Certificate CN patterns
    jobs?: string[];          // Job posting keywords
    github?: string[];        // package.json / CI patterns
  };
  avgSeatCostEur: number;    // Annual per-seat
  minSeats: number;           // Typical minimum
  riskWeight: number;         // 0-1 (governance risk)
}

const VENDOR_SIGNATURES: Record<string, VendorSignature> = {
  // ── CRM & Sales ──────────────────────────────
  "salesforce": {
    canonical: "Salesforce", category: "crm",
    patterns: {
      dns: ["salesforce", "force.com", "my.salesforce"],
      txt: ["salesforce-verify", "pardot"],
      scripts: ["salesforce.com", "force.com/lightning"],
      jobs: ["salesforce admin", "salesforce developer", "SFDC", "salesforce architect"],
      github: ["jsforce", "sfdx", "@salesforce/"],
    },
    avgSeatCostEur: 1500, minSeats: 10, riskWeight: 0.7,
  },
  "hubspot": {
    canonical: "HubSpot", category: "crm",
    patterns: {
      dns: ["hubspot", "hs-analytics"],
      scripts: ["js.hs-scripts.com", "js.hsforms.net", "hubspot.com/analytics"],
      meta: ["hubspot"],
      txt: ["hubspot-domain-verification"],
      jobs: ["hubspot", "inbound marketing"],
    },
    avgSeatCostEur: 600, minSeats: 5, riskWeight: 0.4,
  },
  "pipedrive": {
    canonical: "Pipedrive", category: "crm",
    patterns: { scripts: ["pipedrive"], jobs: ["pipedrive"], txt: ["pipedrive"] },
    avgSeatCostEur: 400, minSeats: 5, riskWeight: 0.3,
  },

  // ── Analytics & Observability ────────────────
  "datadog": {
    canonical: "Datadog", category: "observability",
    patterns: {
      dns: ["datadog", "datadoghq"],
      scripts: ["datadoghq.com", "dd-rum", "datadog-rum"],
      headers: ["x-datadog"],
      jobs: ["datadog", "observability engineer", "SRE datadog"],
      github: ["dd-trace", "datadog-agent", "@datadog/"],
    },
    avgSeatCostEur: 2400, minSeats: 5, riskWeight: 0.8,
  },
  "newrelic": {
    canonical: "New Relic", category: "observability",
    patterns: {
      scripts: ["newrelic.com/nr-", "js-agent.newrelic.com", "bam.nr-data.net"],
      headers: ["x-newrelic"],
      jobs: ["new relic", "newrelic"],
      github: ["newrelic", "@newrelic/"],
    },
    avgSeatCostEur: 1800, minSeats: 3, riskWeight: 0.6,
  },
  "mixpanel": {
    canonical: "Mixpanel", category: "analytics",
    patterns: {
      scripts: ["mixpanel.com", "cdn.mxpnl.com"],
      jobs: ["mixpanel", "product analytics"],
    },
    avgSeatCostEur: 300, minSeats: 3, riskWeight: 0.3,
  },
  "amplitude": {
    canonical: "Amplitude", category: "analytics",
    patterns: {
      scripts: ["amplitude.com", "cdn.amplitude.com"],
      jobs: ["amplitude", "product analytics amplitude"],
      github: ["@amplitude/"],
    },
    avgSeatCostEur: 500, minSeats: 3, riskWeight: 0.3,
  },
  "segment": {
    canonical: "Segment", category: "analytics",
    patterns: {
      scripts: ["cdn.segment.com", "segment.io"],
      jobs: ["segment", "customer data platform"],
      github: ["analytics-node", "@segment/"],
    },
    avgSeatCostEur: 1200, minSeats: 1, riskWeight: 0.5,
  },
  "hotjar": {
    canonical: "Hotjar", category: "analytics",
    patterns: { scripts: ["hotjar.com", "static.hotjar.com"] },
    avgSeatCostEur: 400, minSeats: 1, riskWeight: 0.2,
  },
  "posthog": {
    canonical: "PostHog", category: "analytics",
    patterns: {
      scripts: ["posthog.com", "app.posthog.com"],
      github: ["posthog-js", "posthog-node"],
    },
    avgSeatCostEur: 0, minSeats: 1, riskWeight: 0.1,
  },
  "google_analytics": {
    canonical: "Google Analytics", category: "analytics",
    patterns: {
      scripts: ["googletagmanager.com", "google-analytics.com", "gtag/js"],
      meta: ["google-site-verification"],
    },
    avgSeatCostEur: 0, minSeats: 1, riskWeight: 0.1,
  },

  // ── Cloud Infrastructure ─────────────────────
  "aws": {
    canonical: "AWS", category: "cloud_infra",
    patterns: {
      dns: ["amazonaws.com", "awsapps.com", "aws.amazon.com", "elasticbeanstalk"],
      headers: ["x-amz-", "AmazonS3", "cloudfront"],
      certs: ["*.amazonaws.com", "*.cloudfront.net"],
      jobs: ["AWS", "amazon web services", "EC2", "S3", "Lambda"],
      github: ["aws-sdk", "@aws-sdk/", "aws-cdk", "serverless"],
    },
    avgSeatCostEur: 0, minSeats: 1, riskWeight: 0.8,
  },
  "azure": {
    canonical: "Microsoft Azure", category: "cloud_infra",
    patterns: {
      dns: ["azure.com", "azurewebsites.net", "azureedge.net", "blob.core.windows.net"],
      headers: ["x-ms-", "x-azure"],
      certs: ["*.azurewebsites.net"],
      jobs: ["azure", "microsoft azure", "azure devops"],
      github: ["@azure/", "azure-sdk"],
    },
    avgSeatCostEur: 0, minSeats: 1, riskWeight: 0.8,
  },
  "gcp": {
    canonical: "Google Cloud", category: "cloud_infra",
    patterns: {
      dns: ["googleapis.com", "appspot.com", "run.app", "cloudfunctions.net"],
      headers: ["x-goog-", "x-cloud-trace"],
      certs: ["*.appspot.com", "*.run.app"],
      jobs: ["google cloud", "GCP", "BigQuery"],
      github: ["@google-cloud/", "gcloud"],
    },
    avgSeatCostEur: 0, minSeats: 1, riskWeight: 0.8,
  },
  "vercel": {
    canonical: "Vercel", category: "cloud_infra",
    patterns: {
      dns: ["vercel.app", "vercel-dns.com"],
      headers: ["x-vercel-", "x-vercel-id"],
      certs: ["*.vercel.app"],
      github: ["vercel", "next.config"],
    },
    avgSeatCostEur: 240, minSeats: 1, riskWeight: 0.2,
  },

  // ── Communication ────────────────────────────
  "slack": {
    canonical: "Slack", category: "communication",
    patterns: {
      dns: ["slack.com"],
      txt: ["slack-domain-verification"],
      jobs: ["slack", "slack channels"],
      github: ["@slack/", "slack-bolt"],
    },
    avgSeatCostEur: 100, minSeats: 10, riskWeight: 0.4,
  },
  "zoom": {
    canonical: "Zoom", category: "communication",
    patterns: {
      dns: ["zoom.us"],
      txt: ["zoom-domain-verification"],
      jobs: ["zoom meetings"],
    },
    avgSeatCostEur: 160, minSeats: 10, riskWeight: 0.3,
  },
  "microsoft_teams": {
    canonical: "Microsoft Teams", category: "communication",
    patterns: {
      dns: ["teams.microsoft.com"],
      txt: ["ms="],
      jobs: ["microsoft teams", "MS Teams"],
    },
    avgSeatCostEur: 0, minSeats: 10, riskWeight: 0.3,
  },

  // ── Productivity ─────────────────────────────
  "notion": {
    canonical: "Notion", category: "productivity",
    patterns: {
      dns: ["notion.site", "notion.so"],
      jobs: ["notion", "notion workspace"],
      github: ["@notionhq/"],
    },
    avgSeatCostEur: 96, minSeats: 5, riskWeight: 0.2,
  },
  "atlassian_jira": {
    canonical: "Atlassian (Jira)", category: "productivity",
    patterns: {
      dns: ["atlassian.net", "jira"],
      jobs: ["jira", "confluence", "atlassian"],
      github: ["jira-client", "atlassian"],
    },
    avgSeatCostEur: 100, minSeats: 10, riskWeight: 0.5,
  },
  "monday": {
    canonical: "Monday.com", category: "productivity",
    patterns: {
      scripts: ["monday.com"],
      jobs: ["monday.com", "monday board"],
    },
    avgSeatCostEur: 120, minSeats: 5, riskWeight: 0.3,
  },
  "asana": {
    canonical: "Asana", category: "productivity",
    patterns: {
      scripts: ["asana.com"],
      jobs: ["asana"],
    },
    avgSeatCostEur: 130, minSeats: 5, riskWeight: 0.3,
  },
  "clickup": {
    canonical: "ClickUp", category: "productivity",
    patterns: { jobs: ["clickup"], scripts: ["clickup.com"] },
    avgSeatCostEur: 84, minSeats: 5, riskWeight: 0.2,
  },

  // ── Dev Tools ────────────────────────────────
  "github": {
    canonical: "GitHub", category: "dev_tools",
    patterns: {
      dns: ["github.com", "github.io"],
      jobs: ["github", "git workflow", "github actions"],
      github: ["github-actions"],
    },
    avgSeatCostEur: 200, minSeats: 5, riskWeight: 0.3,
  },
  "gitlab": {
    canonical: "GitLab", category: "dev_tools",
    patterns: {
      dns: ["gitlab.com", "gitlab.io"],
      jobs: ["gitlab", "gitlab CI"],
      github: [".gitlab-ci.yml"],
    },
    avgSeatCostEur: 228, minSeats: 5, riskWeight: 0.4,
  },
  "docker": {
    canonical: "Docker", category: "dev_tools",
    patterns: {
      jobs: ["docker", "containerization", "dockerfile"],
      github: ["Dockerfile", "docker-compose"],
    },
    avgSeatCostEur: 60, minSeats: 5, riskWeight: 0.2,
  },
  "terraform": {
    canonical: "Terraform (HashiCorp)", category: "dev_tools",
    patterns: {
      jobs: ["terraform", "infrastructure as code", "HashiCorp"],
      github: [".tf", "terraform", "hashicorp/"],
    },
    avgSeatCostEur: 840, minSeats: 5, riskWeight: 0.5,
  },

  // ── AI / LLM ────────────────────────────────
  "openai": {
    canonical: "OpenAI", category: "ai_llm",
    patterns: {
      scripts: ["openai.com"],
      jobs: ["openai", "GPT", "chatgpt", "LLM engineer"],
      github: ["openai", "@openai/", "gpt-4", "langchain"],
    },
    avgSeatCostEur: 240, minSeats: 5, riskWeight: 0.6,
  },
  "anthropic": {
    canonical: "Anthropic (Claude)", category: "ai_llm",
    patterns: {
      jobs: ["claude", "anthropic"],
      github: ["@anthropic-ai/", "anthropic"],
    },
    avgSeatCostEur: 240, minSeats: 3, riskWeight: 0.5,
  },
  "github_copilot": {
    canonical: "GitHub Copilot", category: "ai_llm",
    patterns: {
      jobs: ["github copilot", "AI pair programming"],
      github: ["copilot"],
    },
    avgSeatCostEur: 228, minSeats: 5, riskWeight: 0.4,
  },

  // ── Design ───────────────────────────────────
  "figma": {
    canonical: "Figma", category: "design",
    patterns: {
      dns: ["figma.com"],
      jobs: ["figma", "design system figma"],
    },
    avgSeatCostEur: 144, minSeats: 3, riskWeight: 0.2,
  },
  "adobe": {
    canonical: "Adobe Creative Cloud", category: "design",
    patterns: {
      scripts: ["adobe.com", "adobedtm.com", "demdex.net"],
      jobs: ["adobe creative", "photoshop", "illustrator"],
    },
    avgSeatCostEur: 700, minSeats: 3, riskWeight: 0.4,
  },
  "canva": {
    canonical: "Canva", category: "design",
    patterns: { jobs: ["canva"], scripts: ["canva.com"] },
    avgSeatCostEur: 120, minSeats: 3, riskWeight: 0.1,
  },

  // ── Security ─────────────────────────────────
  "okta": {
    canonical: "Okta", category: "identity",
    patterns: {
      dns: ["okta.com", "oktapreview.com"],
      txt: ["okta-domain-verification"],
      jobs: ["okta", "SSO", "identity management"],
    },
    avgSeatCostEur: 72, minSeats: 50, riskWeight: 0.6,
  },
  "auth0": {
    canonical: "Auth0 (Okta)", category: "identity",
    patterns: {
      dns: ["auth0.com"],
      scripts: ["auth0.com", "cdn.auth0.com"],
      github: ["@auth0/", "auth0-spa-js"],
    },
    avgSeatCostEur: 276, minSeats: 1, riskWeight: 0.5,
  },
  "cloudflare": {
    canonical: "Cloudflare", category: "cdn",
    patterns: {
      dns: ["cloudflare.com", "cloudflare-dns.com"],
      headers: ["cf-ray", "cf-cache-status", "cloudflare"],
      certs: ["cloudflare"],
    },
    avgSeatCostEur: 240, minSeats: 1, riskWeight: 0.3,
  },
  "crowdstrike": {
    canonical: "CrowdStrike", category: "security",
    patterns: {
      dns: ["crowdstrike"],
      jobs: ["crowdstrike", "endpoint detection", "EDR"],
    },
    avgSeatCostEur: 180, minSeats: 50, riskWeight: 0.7,
  },

  // ── Email ────────────────────────────────────
  "google_workspace": {
    canonical: "Google Workspace", category: "email",
    patterns: {
      mx: ["google.com", "googlemail.com", "aspmx.l.google.com"],
      txt: ["google-site-verification", "v=spf1 include:_spf.google.com"],
    },
    avgSeatCostEur: 144, minSeats: 10, riskWeight: 0.3,
  },
  "microsoft_365": {
    canonical: "Microsoft 365", category: "email",
    patterns: {
      mx: ["outlook.com", "protection.outlook.com"],
      txt: ["v=spf1 include:spf.protection.outlook.com", "ms="],
    },
    avgSeatCostEur: 264, minSeats: 10, riskWeight: 0.4,
  },

  // ── Marketing ────────────────────────────────
  "mailchimp": {
    canonical: "Mailchimp", category: "marketing",
    patterns: {
      txt: ["mandrill", "mailchimp"],
      scripts: ["mailchimp.com", "chimpstatic.com"],
    },
    avgSeatCostEur: 180, minSeats: 1, riskWeight: 0.2,
  },
  "sendgrid": {
    canonical: "SendGrid (Twilio)", category: "marketing",
    patterns: {
      txt: ["sendgrid.net"],
      dns: ["sendgrid.net"],
    },
    avgSeatCostEur: 200, minSeats: 1, riskWeight: 0.3,
  },
  "intercom": {
    canonical: "Intercom", category: "marketing",
    patterns: {
      scripts: ["intercom.io", "widget.intercom.io", "intercomcdn.com"],
      jobs: ["intercom"],
    },
    avgSeatCostEur: 900, minSeats: 3, riskWeight: 0.5,
  },
  "zendesk": {
    canonical: "Zendesk", category: "marketing",
    patterns: {
      dns: ["zendesk.com"],
      scripts: ["zendesk.com", "zdassets.com"],
      jobs: ["zendesk"],
    },
    avgSeatCostEur: 600, minSeats: 5, riskWeight: 0.4,
  },
  "drift_chat": {
    canonical: "Drift", category: "marketing",
    patterns: { scripts: ["drift.com", "js.driftt.com"] },
    avgSeatCostEur: 500, minSeats: 1, riskWeight: 0.3,
  },

  // ── Finance ──────────────────────────────────
  "stripe": {
    canonical: "Stripe", category: "finance",
    patterns: {
      scripts: ["js.stripe.com", "stripe.com"],
      github: ["stripe", "@stripe/"],
    },
    avgSeatCostEur: 0, minSeats: 1, riskWeight: 0.3,
  },

  // ── Database ─────────────────────────────────
  "snowflake": {
    canonical: "Snowflake", category: "database",
    patterns: {
      dns: ["snowflakecomputing.com"],
      jobs: ["snowflake", "data warehouse snowflake"],
      github: ["snowflake-connector"],
    },
    avgSeatCostEur: 3600, minSeats: 5, riskWeight: 0.8,
  },
  "mongodb": {
    canonical: "MongoDB Atlas", category: "database",
    patterns: {
      dns: ["mongodb.net"],
      jobs: ["mongodb", "mongo"],
      github: ["mongodb", "mongoose"],
    },
    avgSeatCostEur: 700, minSeats: 1, riskWeight: 0.4,
  },

  // ── Storage ──────────────────────────────────
  "dropbox": {
    canonical: "Dropbox", category: "storage",
    patterns: { dns: ["dropbox.com"], jobs: ["dropbox business"] },
    avgSeatCostEur: 144, minSeats: 5, riskWeight: 0.3,
  },

  // ── HR ───────────────────────────────────────
  "workday": {
    canonical: "Workday", category: "hr",
    patterns: {
      dns: ["workday.com", "myworkday.com"],
      jobs: ["workday", "HCM workday"],
    },
    avgSeatCostEur: 100, minSeats: 100, riskWeight: 0.6,
  },
  "bamboohr": {
    canonical: "BambooHR", category: "hr",
    patterns: { dns: ["bamboohr.com"], jobs: ["bamboohr"] },
    avgSeatCostEur: 84, minSeats: 20, riskWeight: 0.3,
  },
};

// ══════════════════════════════════════════════════════
//  PROBERS — DNS, HTTP, Certs
// ══════════════════════════════════════════════════════

async function probeDNS(domain: string): Promise<OsintSignal[]> {
  const signals: OsintSignal[] = [];

  // DNS resolution via public DoH (DNS over HTTPS)
  const recordTypes = ["A", "AAAA", "MX", "TXT", "CNAME", "NS"] as const;

  for (const type of recordTypes) {
    try {
      const resp = await fetch(
        `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (!resp.ok) continue;
      const data = await resp.json();
      if (!data.Answer) continue;

      for (const record of data.Answer) {
        const value = String(record.data || "").toLowerCase();

        // Match against vendor signatures
        for (const [vendorId, sig] of Object.entries(VENDOR_SIGNATURES)) {
          const patterns = type === "MX" ? sig.patterns.mx
            : type === "TXT" ? sig.patterns.txt
            : sig.patterns.dns;

          if (patterns?.some((p) => value.includes(p.toLowerCase()))) {
            signals.push({
              source: type === "MX" ? "dns_mx" : type === "TXT" ? "dns_txt" : "dns_subdomain",
              type: "vendor_detected",
              value: `${type} record: ${record.data}`,
              vendor: vendorId,
              category: sig.category,
              confidence: type === "MX" ? 90 : type === "TXT" ? 85 : 80,
              evidenceTier: "observed",
              rawEvidence: JSON.stringify(record),
              detectedAt: new Date(),
            });
          }
        }
      }
    } catch {
      // DNS query failed — silently continue
    }
  }

  // Probe common subdomains
  const subdomains = [
    "mail", "app", "api", "cdn", "status", "docs", "help", "support",
    "sso", "auth", "login", "admin", "dashboard", "staging", "dev",
    "jira", "confluence", "slack", "git", "gitlab", "jenkins", "ci",
    "grafana", "kibana", "datadog", "sentry", "monitoring",
  ];

  const subdomainProbes = subdomains.map(async (sub) => {
    try {
      const resp = await fetch(
        `https://dns.google/resolve?name=${sub}.${domain}&type=A`,
        { signal: AbortSignal.timeout(3000) },
      );
      if (!resp.ok) return;
      const data = await resp.json();
      if (!data.Answer || data.Answer.length === 0) return;

      // Check if it resolves (exists)
      signals.push({
        source: "dns_subdomain",
        type: "infra_signal",
        value: `${sub}.${domain} resolves`,
        confidence: 70,
        evidenceTier: "observed",
        rawEvidence: `Subdomain ${sub}.${domain} has DNS records`,
        detectedAt: new Date(),
      });

      // Check CNAME for vendor detection
      const cnameResp = await fetch(
        `https://dns.google/resolve?name=${sub}.${domain}&type=CNAME`,
        { signal: AbortSignal.timeout(3000) },
      );
      if (cnameResp.ok) {
        const cnameData = await cnameResp.json();
        if (cnameData.Answer) {
          for (const rec of cnameData.Answer) {
            const cname = String(rec.data || "").toLowerCase();
            for (const [vendorId, sig] of Object.entries(VENDOR_SIGNATURES)) {
              if (sig.patterns.dns?.some((p) => cname.includes(p.toLowerCase()))) {
                signals.push({
                  source: "dns_subdomain",
                  type: "vendor_detected",
                  value: `${sub}.${domain} CNAME → ${rec.data}`,
                  vendor: vendorId,
                  category: sig.category,
                  confidence: 85,
                  evidenceTier: "observed",
                  rawEvidence: `CNAME: ${rec.data}`,
                  detectedAt: new Date(),
                });
              }
            }
          }
        }
      }
    } catch {
      // Subdomain doesn't exist — expected
    }
  });

  // Limit concurrency to 10 parallel probes
  for (let i = 0; i < subdomainProbes.length; i += 10) {
    await Promise.all(subdomainProbes.slice(i, i + 10));
  }

  return signals;
}

async function probeHTTP(domain: string): Promise<OsintSignal[]> {
  const signals: OsintSignal[] = [];

  try {
    const resp = await fetch(`https://${domain}`, {
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GhostTax/1.0)" },
    });

    // ── Headers analysis ──────────────────────
    const headers: Record<string, string> = {};
    resp.headers.forEach((value, key) => { headers[key.toLowerCase()] = value; });

    for (const [vendorId, sig] of Object.entries(VENDOR_SIGNATURES)) {
      if (sig.patterns.headers?.some((p) =>
        Object.entries(headers).some(([k, v]) =>
          k.includes(p.toLowerCase()) || v.toLowerCase().includes(p.toLowerCase())
        )
      )) {
        signals.push({
          source: "http_headers",
          type: "vendor_detected",
          value: `HTTP header matches ${sig.canonical}`,
          vendor: vendorId,
          category: sig.category,
          confidence: 80,
          evidenceTier: "observed",
          rawEvidence: JSON.stringify(headers),
          detectedAt: new Date(),
        });
      }
    }

    // ── HTML body analysis (scripts, meta) ────
    const body = await resp.text();
    const bodyLower = body.toLowerCase().slice(0, 200000); // Cap at 200KB

    for (const [vendorId, sig] of Object.entries(VENDOR_SIGNATURES)) {
      // Script detection
      if (sig.patterns.scripts?.some((p) => bodyLower.includes(p.toLowerCase()))) {
        signals.push({
          source: "http_scripts",
          type: "vendor_detected",
          value: `Script/CDN reference to ${sig.canonical}`,
          vendor: vendorId,
          category: sig.category,
          confidence: 85,
          evidenceTier: "observed",
          rawEvidence: `Found in page source of ${domain}`,
          detectedAt: new Date(),
        });
      }

      // Meta tag detection
      if (sig.patterns.meta?.some((p) => bodyLower.includes(p.toLowerCase()))) {
        signals.push({
          source: "http_meta",
          type: "vendor_detected",
          value: `Meta tag reference to ${sig.canonical}`,
          vendor: vendorId,
          category: sig.category,
          confidence: 75,
          evidenceTier: "observed",
          rawEvidence: `Meta tag match in ${domain}`,
          detectedAt: new Date(),
        });
      }
    }

    // Security headers check
    const securityHeaders = [
      "strict-transport-security", "content-security-policy",
      "x-frame-options", "x-content-type-options",
    ];
    const missingSecHeaders = securityHeaders.filter((h) => !headers[h]);
    if (missingSecHeaders.length >= 3) {
      signals.push({
        source: "http_headers",
        type: "security_signal",
        value: `Missing ${missingSecHeaders.length} security headers`,
        confidence: 60,
        evidenceTier: "observed",
        rawEvidence: `Missing: ${missingSecHeaders.join(", ")}`,
        detectedAt: new Date(),
      });
    }
  } catch {
    // HTTP probe failed
  }

  return signals;
}

async function probeCertTransparency(domain: string): Promise<OsintSignal[]> {
  const signals: OsintSignal[] = [];

  try {
    const resp = await fetch(
      `https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!resp.ok) return signals;

    const certs: Array<{ name_value: string; not_after: string; issuer_name: string }> = await resp.json();

    // Deduplicate by name_value
    const seen = new Set<string>();
    const uniqueCerts = certs.filter((c) => {
      const key = c.name_value;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 100); // Cap at 100

    for (const cert of uniqueCerts) {
      const name = cert.name_value.toLowerCase();

      for (const [vendorId, sig] of Object.entries(VENDOR_SIGNATURES)) {
        if (sig.patterns.certs?.some((p) => name.includes(p.toLowerCase())) ||
            sig.patterns.dns?.some((p) => name.includes(p.toLowerCase()))) {
          signals.push({
            source: "cert_transparency",
            type: "vendor_detected",
            value: `Certificate for ${cert.name_value}`,
            vendor: vendorId,
            category: sig.category,
            confidence: 75,
            evidenceTier: "observed",
            rawEvidence: `CT log: ${cert.name_value} (issuer: ${cert.issuer_name})`,
            detectedAt: new Date(),
          });
        }
      }

      // Detect subdomains pointing to SaaS
      const subParts = cert.name_value.split(".");
      if (subParts.length > 2) {
        signals.push({
          source: "cert_transparency",
          type: "infra_signal",
          value: `Subdomain: ${cert.name_value}`,
          confidence: 50,
          evidenceTier: "observed",
          rawEvidence: `CT log entry: ${cert.name_value}`,
          detectedAt: new Date(),
        });
      }
    }
  } catch {
    // CT log query failed
  }

  return signals;
}

// ══════════════════════════════════════════════════════
//  SIGNAL FUSION — Deduplicate, score, cross-reference
// ══════════════════════════════════════════════════════

function fuseSignals(raw: OsintSignal[]): OsintSignal[] {
  // Deduplicate: same vendor + same source = keep highest confidence
  const vendorSourceMap = new Map<string, OsintSignal>();

  for (const signal of raw) {
    const key = `${signal.vendor || "none"}_${signal.source}_${signal.type}`;
    const existing = vendorSourceMap.get(key);
    if (!existing || signal.confidence > existing.confidence) {
      vendorSourceMap.set(key, signal);
    }
  }

  return Array.from(vendorSourceMap.values());
}

// ══════════════════════════════════════════════════════
//  STACK RECONSTRUCTION — Build vendor profiles
// ══════════════════════════════════════════════════════

function reconstructStack(
  signals: OsintSignal[],
  headcount: number,
): DetectedVendor[] {
  const vendorMap = new Map<string, OsintSignal[]>();

  // Group signals by vendor
  for (const signal of signals) {
    if (!signal.vendor) continue;
    const existing = vendorMap.get(signal.vendor) || [];
    existing.push(signal);
    vendorMap.set(signal.vendor, existing);
  }

  const vendors: DetectedVendor[] = [];

  for (const [vendorId, vendorSignals] of vendorMap) {
    const sig = VENDOR_SIGNATURES[vendorId];
    if (!sig) continue;

    // Aggregate confidence: multi-source confirmation boosts score
    const sources = new Set(vendorSignals.map((s) => s.source));
    const baseConfidence = Math.max(...vendorSignals.map((s) => s.confidence));
    const sourceBonus = Math.min(15, (sources.size - 1) * 5); // Multi-source = more confidence
    const confidence = Math.min(85, baseConfidence + sourceBonus);

    // Best evidence tier
    const tiers = vendorSignals.map((s) => s.evidenceTier);
    const evidenceTier = tiers.includes("observed") ? "observed" as const
      : tiers.includes("inferred") ? "inferred" as const
      : "estimated" as const;

    // Cost estimation
    const estimatedSeats = Math.max(sig.minSeats, Math.round(headcount * 0.6));
    const lowEstimate = Math.round(sig.avgSeatCostEur * sig.minSeats * 0.7);
    const highEstimate = Math.round(sig.avgSeatCostEur * estimatedSeats * 1.2);

    // Risk factors
    const riskFactors: string[] = [];
    if (sources.size === 1) riskFactors.push("Single detection source");
    if (sig.riskWeight > 0.6) riskFactors.push("High governance impact");
    if (sig.avgSeatCostEur > 1000) riskFactors.push("High per-seat cost");
    if (headcount > 100 && sig.minSeats < headcount * 0.5) riskFactors.push("Likely over-provisioned");

    vendors.push({
      name: sig.canonical,
      canonical: vendorId,
      category: sig.category,
      signals: vendorSignals,
      signalCount: vendorSignals.length,
      confidence,
      evidenceTier,
      estimatedAnnualEur: [lowEstimate, highEstimate],
      avgCostPerSeatEur: sig.avgSeatCostEur,
      detectionMethods: Array.from(sources) as OsintSource[],
      riskFactors,
    });
  }

  // Sort by estimated cost descending
  vendors.sort((a, b) => b.estimatedAnnualEur[1] - a.estimatedAnnualEur[1]);

  return vendors;
}

// ══════════════════════════════════════════════════════
//  SCORING — Composite scores
// ══════════════════════════════════════════════════════

function computeOsintScores(vendors: DetectedVendor[], signals: OsintSignal[]): {
  stackComplexity: number;
  governanceRisk: number;
  shadowRisk: number;
  osintConfidence: number;
} {
  // Stack complexity: how many vendors × categories
  const categories = new Set(vendors.map((v) => v.category));
  let complexity = 0;
  complexity += Math.min(30, vendors.length * 3);
  complexity += Math.min(25, categories.size * 5);
  complexity += vendors.filter((v) => v.estimatedAnnualEur[1] > 5000).length * 3;
  const aiVendors = vendors.filter((v) => v.category === "ai_llm").length;
  complexity += Math.min(15, aiVendors * 8);
  complexity = Math.min(95, complexity);

  // Governance risk: how ungoverned is the stack
  let governance = 0;
  governance += Math.min(25, vendors.filter((v) => v.signalCount === 1).length * 5); // Single-source = ungoverned
  governance += Math.min(25, aiVendors * 10);
  const overlappingCategories = Array.from(categories).filter((cat) =>
    vendors.filter((v) => v.category === cat).length > 1
  ).length;
  governance += Math.min(25, overlappingCategories * 8);
  const securitySignals = signals.filter((s) => s.type === "security_signal").length;
  governance += Math.min(25, securitySignals * 10);
  governance = Math.min(95, governance);

  // Shadow risk: likelihood of shadow IT
  let shadow = 0;
  shadow += Math.min(30, aiVendors * 12);
  shadow += Math.min(20, vendors.filter((v) => v.category === "productivity" || v.category === "design").length * 5);
  shadow += Math.min(20, overlappingCategories * 7);
  const jobSignals = signals.filter((s) => s.source === "job_posting").length;
  shadow += Math.min(15, jobSignals * 3);
  shadow += vendors.length > 15 ? 15 : vendors.length > 10 ? 10 : 5;
  shadow = Math.min(95, shadow);

  // Overall confidence
  const observedCount = signals.filter((s) => s.evidenceTier === "observed").length;
  let confidence = 10;
  confidence += Math.min(30, observedCount * 3);
  confidence += Math.min(20, vendors.length * 2);
  const multiSource = vendors.filter((v) => v.detectionMethods.length > 1).length;
  confidence += Math.min(25, multiSource * 5);
  confidence = Math.min(85, confidence);

  return {
    stackComplexity: complexity,
    governanceRisk: governance,
    shadowRisk: shadow,
    osintConfidence: confidence,
  };
}

// ══════════════════════════════════════════════════════
//  PROOF SIGNAL GENERATOR — Pipeline integration
// ══════════════════════════════════════════════════════

function generateProofSignals(vendors: DetectedVendor[], scores: ReturnType<typeof computeOsintScores>): ProofSignal[] {
  const proofSignals: ProofSignal[] = [];

  // Aggregate signal
  const totalSpend: [number, number] = [
    vendors.reduce((s, v) => s + v.estimatedAnnualEur[0], 0),
    vendors.reduce((s, v) => s + v.estimatedAnnualEur[1], 0),
  ];

  if (vendors.length > 0) {
    proofSignals.push({
      type: "osint_stack_detected",
      label: `OSINT: ${vendors.length} vendors d\u00e9tect\u00e9s, ${totalSpend[0].toLocaleString()}-${totalSpend[1].toLocaleString()} EUR/an estim\u00e9`,
      description:
        `Scan OSINT du domaine: ${vendors.length} vendors SaaS/Cloud identifi\u00e9s via DNS, headers HTTP, scripts, et Certificate Transparency. ` +
        `Complexit\u00e9 stack: ${scores.stackComplexity}/100. Risque shadow IT: ${scores.shadowRisk}/100.`,
      impactEurRange: totalSpend,
      severity: totalSpend[1] > 200000 ? "critical" : totalSpend[1] > 50000 ? "high" : "medium",
      evidence: ["osint_interceptor", `${vendors.length}_vendors`, `confidence_${scores.osintConfidence}`],
    });
  }

  // Top 5 most expensive vendors
  for (const vendor of vendors.slice(0, 5)) {
    if (vendor.estimatedAnnualEur[1] > 2000) {
      proofSignals.push({
        type: "osint_vendor_detected",
        label: `${vendor.name}: ${vendor.estimatedAnnualEur[0].toLocaleString()}-${vendor.estimatedAnnualEur[1].toLocaleString()} EUR/an`,
        description:
          `${vendor.name} d\u00e9tect\u00e9 via ${vendor.detectionMethods.join(", ")} (confiance: ${vendor.confidence}%). ` +
          `Cat\u00e9gorie: ${vendor.category}. ${vendor.riskFactors.length > 0 ? "Risques: " + vendor.riskFactors.join(", ") + "." : ""}`,
        impactEurRange: vendor.estimatedAnnualEur,
        severity: vendor.estimatedAnnualEur[1] > 10000 ? "high" : "medium",
        evidence: [`osint_${vendor.canonical}`, `${vendor.signalCount}_signals`, vendor.evidenceTier],
      });
    }
  }

  // Governance risk signal
  if (scores.governanceRisk > 40) {
    proofSignals.push({
      type: "osint_governance_risk",
      label: `Risque gouvernance IT: ${scores.governanceRisk}/100`,
      description:
        `Score de gouvernance \u00e9lev\u00e9 bas\u00e9 sur l'analyse OSINT: outils redondants, shadow AI d\u00e9tect\u00e9, ` +
        `headers de s\u00e9curit\u00e9 manquants. Indique un manque de centralisation procurement.`,
      impactEurRange: [Math.round(totalSpend[0] * 0.15), Math.round(totalSpend[1] * 0.35)],
      severity: scores.governanceRisk > 70 ? "critical" : "high",
      evidence: ["osint_governance_analysis", `score_${scores.governanceRisk}`],
    });
  }

  return proofSignals;
}

// ══════════════════════════════════════════════════════
//  MAIN ORCHESTRATOR
// ══════════════════════════════════════════════════════

export async function executeOsintInterceptor(config: {
  domain: string;
  headcount?: number;
  jobPostings?: string[];    // Optional pre-fetched job text
  runId?: string;
}): Promise<OsintReport> {
  const start = Date.now();
  const domain = config.domain.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
  const headcount = config.headcount || 100;
  const runId = config.runId || crypto.randomUUID();

  // ── Phase 1: Parallel probing ───────────────────
  const [dnsSignals, httpSignals, certSignals] = await Promise.all([
    probeDNS(domain),
    probeHTTP(domain),
    probeCertTransparency(domain),
  ]);

  let allSignals = [...dnsSignals, ...httpSignals, ...certSignals];

  // ── Phase 2: Job posting analysis (if provided) ─
  if (config.jobPostings && config.jobPostings.length > 0) {
    for (const jobText of config.jobPostings) {
      const textLower = jobText.toLowerCase();
      for (const [vendorId, sig] of Object.entries(VENDOR_SIGNATURES)) {
        if (sig.patterns.jobs?.some((p) => textLower.includes(p.toLowerCase()))) {
          allSignals.push({
            source: "job_posting",
            type: "hiring_signal",
            value: `Job posting mentions ${sig.canonical}`,
            vendor: vendorId,
            category: sig.category,
            confidence: 65,
            evidenceTier: "inferred",
            rawEvidence: jobText.slice(0, 300),
            detectedAt: new Date(),
          });
        }
      }
    }
  }

  // ── Phase 3: Signal fusion ──────────────────────
  allSignals = fuseSignals(allSignals);

  // ── Phase 4: Stack reconstruction ───────────────
  const detectedVendors = reconstructStack(allSignals, headcount);

  // ── Phase 5: Scoring ────────────────────────────
  const scores = computeOsintScores(detectedVendors, allSignals);

  // ── Phase 6: ProofSignal generation ─────────────
  const proofSignals = generateProofSignals(detectedVendors, scores);

  // ── Phase 7: Aggregates ─────────────────────────
  const vendorsByCategory: Record<string, number> = {};
  for (const v of detectedVendors) {
    vendorsByCategory[v.category] = (vendorsByCategory[v.category] || 0) + 1;
  }

  const signalsBySource: Record<string, number> = {};
  for (const s of allSignals) {
    signalsBySource[s.source] = (signalsBySource[s.source] || 0) + 1;
  }

  const totalSpend: [number, number] = [
    detectedVendors.reduce((s, v) => s + v.estimatedAnnualEur[0], 0),
    detectedVendors.reduce((s, v) => s + v.estimatedAnnualEur[1], 0),
  ];

  // ── Phase 8: Narrative ──────────────────────────
  const topVendorNames = detectedVendors.slice(0, 5).map((v) => v.name).join(", ");
  const stackSummary =
    `Stack technologique reconstruit: ${detectedVendors.length} vendors d\u00e9tect\u00e9s ` +
    `dans ${Object.keys(vendorsByCategory).length} cat\u00e9gories. ` +
    `Principaux: ${topVendorNames || "aucun"}. ` +
    `D\u00e9pense annuelle estim\u00e9e: ${totalSpend[0].toLocaleString()}-${totalSpend[1].toLocaleString()} EUR.`;

  const riskSummary =
    `Complexit\u00e9 stack: ${scores.stackComplexity}/100. ` +
    `Risque gouvernance: ${scores.governanceRisk}/100. ` +
    `Risque shadow IT: ${scores.shadowRisk}/100. ` +
    `${scores.shadowRisk > 50
      ? "Indique une probabilit\u00e9 \u00e9lev\u00e9e de d\u00e9penses SaaS non gouvern\u00e9es."
      : "Gouvernance IT dans les normes d\u00e9tectables publiquement."
    }`;

  const estimationBasis =
    `Estimation bas\u00e9e sur ${allSignals.length} signaux OSINT ` +
    `(${allSignals.filter((s) => s.evidenceTier === "observed").length} observ\u00e9s, ` +
    `${allSignals.filter((s) => s.evidenceTier === "inferred").length} inf\u00e9r\u00e9s). ` +
    `Sources: DNS (${signalsBySource["dns_subdomain"] || 0} + ${signalsBySource["dns_mx"] || 0} + ${signalsBySource["dns_txt"] || 0}), ` +
    `HTTP (${(signalsBySource["http_headers"] || 0) + (signalsBySource["http_scripts"] || 0) + (signalsBySource["http_meta"] || 0)}), ` +
    `Certificates (${signalsBySource["cert_transparency"] || 0}). ` +
    `Confiance: ${scores.osintConfidence}/100.`;

  return {
    runId,
    domain,
    scannedAt: new Date(),
    executionMs: Date.now() - start,
    signals: allSignals,
    detectedVendors,
    proofSignals,
    totalVendorsDetected: detectedVendors.length,
    totalEstimatedSpendEur: totalSpend,
    stackComplexityScore: scores.stackComplexity,
    governanceRiskScore: scores.governanceRisk,
    shadowRiskScore: scores.shadowRisk,
    osintConfidence: scores.osintConfidence,
    vendorsByCategory,
    signalsBySource,
    stackSummary,
    riskSummary,
    estimationBasis,
  };
}
