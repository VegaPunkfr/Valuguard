/**
 * GHOST TAX — EXA RESEARCH CLIENT v2 (SERVER-ONLY)
 *
 * 2026 rewrite: 200+ vendors, geo-aware queries, intent signal detection,
 * structured error handling with retry, expanded enrichment output.
 *
 * What it collects:
 *   - company profile signals (size, industry, tech stack)
 *   - job listings (hiring patterns reveal tool adoption)
 *   - infrastructure mentions (cloud/SaaS/AI vendor references)
 *   - recent news (funding, layoffs, growth signals)
 *   - intent signals (hiring surges, M&A, funding rounds, renewal windows)
 *   - geo-market classification (US, DACH, FR, EU-other)
 *
 * What it does NOT do:
 *   - Generate fake financial numbers
 *   - Access private systems
 *   - Store raw results (that's the vector layer's job)
 *
 * Exports: enrichCompany(), CompanySignal, EnrichmentResult, KNOWN_VENDORS
 * Required env: EXA_API_KEY
 */

import Exa from "exa-js";

// ── Singleton ─────────────────────────────────────────

let _exa: Exa | null = null;

function getExa(): Exa | null {
  if (_exa) return _exa;

  const key = process.env.EXA_API_KEY;
  if (!key) {
    console.warn("[Ghost Tax] EXA_API_KEY not set. Research enrichment disabled.");
    return null;
  }

  _exa = new Exa(key);
  return _exa;
}

// ── Types ─────────────────────────────────────────────

export type SignalCategory =
  | "profile"
  | "hiring"
  | "tech_stack"
  | "news"
  | "financial"
  | "intent"
  | "m_and_a"
  | "funding"
  | "renewal";

export interface CompanySignal {
  source: string;
  title: string;
  snippet: string;
  url: string;
  publishedDate: string | null;
  category: SignalCategory;
}

export type GeoMarket = "US" | "DACH" | "FR" | "EU" | "UK" | "APAC" | "unknown";

export interface IntentSignal {
  type: "hiring_surge" | "funding_round" | "m_and_a" | "renewal_window" | "cost_cutting" | "expansion" | "layoffs" | "ai_adoption";
  evidence: string;
  confidence: number; // 0-100, capped at 85
  detectedAt: string;
}

export interface EnrichmentResult {
  domain: string;
  signals: CompanySignal[];
  techMentions: string[];
  hiringSignals: string[];
  summary: string;
  collectedAt: string;
  // v2 additions
  intentSignals: IntentSignal[];
  geoMarket: GeoMarket;
  vendorsByCategory: Record<string, string[]>;
  queryErrors: string[];
}

// ── Vendor Taxonomy (200+ vendors, 20 categories) ────

export type VendorCategory =
  | "crm"
  | "collaboration"
  | "cloud_infra"
  | "devtools"
  | "observability"
  | "data_platform"
  | "ai_ml"
  | "security"
  | "identity"
  | "hr_people"
  | "finance_ops"
  | "marketing"
  | "support"
  | "design"
  | "productivity"
  | "erp"
  | "networking"
  | "communication"
  | "project_management"
  | "compliance";

export const KNOWN_VENDORS: Record<VendorCategory, string[]> = {
  crm: [
    "Salesforce", "HubSpot", "Pipedrive", "Zoho CRM", "Microsoft Dynamics 365",
    "Freshsales", "Close", "Copper CRM", "Monday CRM", "SugarCRM",
    "Insightly", "Nimble", "Vtiger", "Creatio", "Capsule CRM",
  ],
  collaboration: [
    "Slack", "Microsoft Teams", "Notion", "Confluence", "Miro",
    "Loom", "Coda", "Airtable", "Basecamp", "Clickup",
    "Monday.com", "Asana", "Trello", "Wrike", "Smartsheet",
    "Quip", "Fibery", "Hive", "Teamwork", "Nifty",
  ],
  cloud_infra: [
    "AWS", "Amazon Web Services", "Azure", "Microsoft Azure",
    "Google Cloud", "GCP", "Google Cloud Platform",
    "DigitalOcean", "Linode", "Vultr", "Hetzner", "OVHcloud",
    "Oracle Cloud", "IBM Cloud", "Alibaba Cloud",
    "Vercel", "Netlify", "Railway", "Render", "Fly.io",
    "Cloudflare", "Fastly", "Akamai",
    "VMware", "Proxmox", "Nutanix",
    "Heroku", "Platform.sh",
  ],
  devtools: [
    "GitHub", "GitLab", "Bitbucket", "Jira", "Linear",
    "CircleCI", "Jenkins", "Travis CI", "GitHub Actions", "GitLab CI",
    "Terraform", "Pulumi", "Ansible", "Chef", "Puppet",
    "Docker", "Kubernetes", "Rancher", "ArgoCD", "Helm",
    "Postman", "Insomnia", "Swagger",
    "SonarQube", "Snyk", "Dependabot", "Renovate",
    "Sentry", "Rollbar", "Bugsnag",
    "LaunchDarkly", "Split.io", "Unleash",
    "HashiCorp Vault", "Vault",
    "Backstage", "Port", "Cortex",
  ],
  observability: [
    "Datadog", "New Relic", "Dynatrace", "Splunk", "Grafana",
    "Prometheus", "Elastic", "Elasticsearch", "Kibana",
    "PagerDuty", "OpsGenie", "VictorOps",
    "Honeycomb", "Lightstep", "Chronosphere",
    "AppDynamics", "Instana", "Catchpoint",
    "Sumo Logic", "LogDNA", "Mezmo",
    "Monte Carlo", "Observe Inc",
  ],
  data_platform: [
    "Snowflake", "Databricks", "BigQuery", "Redshift",
    "MongoDB", "PostgreSQL", "MySQL", "CockroachDB", "PlanetScale",
    "Fivetran", "Airbyte", "Stitch", "Matillion",
    "dbt", "dbt Labs", "Looker", "Metabase", "Tableau", "Power BI",
    "Segment", "Rudderstack", "mParticle",
    "Confluent", "Kafka", "Apache Kafka",
    "Pinecone", "Weaviate", "Qdrant", "Milvus", "ChromaDB",
    "Supabase", "Firebase", "Neon", "Turso",
    "ClickHouse", "TimescaleDB", "InfluxDB",
    "Palantir", "Domo", "ThoughtSpot",
    "Amplitude", "Mixpanel", "Heap",
  ],
  ai_ml: [
    "OpenAI", "ChatGPT", "GPT-4", "GPT-4o",
    "Anthropic", "Claude", "Claude 3",
    "Google Gemini", "Gemini", "Google AI",
    "Mistral", "Mistral AI", "Mixtral",
    "Cohere", "Cohere Command",
    "Meta Llama", "Llama 3",
    "Perplexity", "Perplexity AI",
    "Hugging Face", "HuggingFace",
    "GitHub Copilot", "Copilot", "Cursor", "Windsurf",
    "Jasper AI", "Writer", "Copy.ai",
    "Midjourney", "DALL-E", "Stable Diffusion", "Adobe Firefly",
    "Scale AI", "Labelbox", "Snorkel",
    "Weights & Biases", "W&B", "MLflow", "Neptune.ai",
    "Vertex AI", "SageMaker", "Azure ML",
    "LangChain", "LlamaIndex", "Haystack",
    "Pinecone", "Weaviate",
    "Replicate", "Together AI", "Fireworks AI", "Groq",
    "DeepL", "DeepL Pro",
    "ElevenLabs", "Synthesia", "RunwayML",
    "Glean", "Moveworks", "Aisera",
  ],
  security: [
    "CrowdStrike", "SentinelOne", "Palo Alto Networks",
    "Fortinet", "Zscaler", "Wiz",
    "Snyk", "Veracode", "Checkmarx", "SonarQube",
    "Qualys", "Tenable", "Rapid7",
    "Darktrace", "Vectra AI", "ExtraHop",
    "Proofpoint", "Mimecast", "Barracuda",
    "KnowBe4", "Cofense",
    "1Password", "LastPass", "Dashlane", "Bitwarden", "Keeper",
    "Varonis", "Sailpoint", "CyberArk",
    "Cloudflare Zero Trust", "Netskope", "Lookout",
    "Sophos", "Bitdefender", "ESET",
    "Lacework", "Orca Security", "Prisma Cloud",
  ],
  identity: [
    "Okta", "Auth0", "OneLogin", "Ping Identity",
    "Azure AD", "Entra ID", "Microsoft Entra",
    "Google Workspace Identity", "JumpCloud",
    "ForgeRock", "Keycloak",
    "Duo Security", "Cisco Duo",
    "BeyondTrust", "Thales",
    "Clerk", "WorkOS", "Stytch", "Descope",
  ],
  hr_people: [
    "Workday", "BambooHR", "Rippling", "Deel", "Remote.com",
    "Gusto", "ADP", "Paychex", "Paylocity",
    "Personio", "Factorial", "Kenjo", "HeavenHR",
    "Lever", "Greenhouse", "Ashby", "Recruitee",
    "Lattice", "15Five", "Culture Amp", "Leapsome",
    "SAP SuccessFactors", "Oracle HCM",
    "Oyster HR", "Papaya Global", "Velocity Global",
    "Lano", "Omnipresent",
  ],
  finance_ops: [
    "Stripe", "Braintree", "Adyen", "Mollie", "GoCardless",
    "QuickBooks", "Xero", "FreshBooks", "Wave", "Sage",
    "NetSuite", "Oracle NetSuite",
    "DATEV", "Lexware", "sevDesk",
    "Pennylane", "Qonto", "Spendesk",
    "Brex", "Ramp", "Divvy", "Airbase",
    "Coupa", "SAP Ariba", "Jaggaer",
    "Chargebee", "Recurly", "Zuora", "Maxio",
    "Tipalti", "Payoneer", "Bill.com",
    "Anaplan", "Pigment", "Planful",
    "Expensify", "SAP Concur", "Navan",
  ],
  marketing: [
    "Marketo", "Pardot", "Mailchimp", "SendGrid", "Brevo",
    "ActiveCampaign", "Klaviyo", "Customer.io", "Iterable",
    "Google Analytics", "GA4", "Adobe Analytics",
    "Semrush", "Ahrefs", "Moz", "Screaming Frog",
    "Webflow", "WordPress", "Contentful", "Sanity", "Strapi",
    "Hootsuite", "Buffer", "Sprout Social",
    "HubSpot Marketing", "Drift", "Qualified",
    "6sense", "Bombora", "G2", "TrustRadius",
    "Typeform", "SurveyMonkey",
    "Unbounce", "Instapage", "Leadpages",
  ],
  support: [
    "Zendesk", "Intercom", "Freshdesk", "Freshservice",
    "ServiceNow", "BMC Remedy", "Jira Service Management",
    "HelpScout", "Front", "Gladly",
    "Salesforce Service Cloud",
    "Gorgias", "Kustomer", "Dixa",
    "Statuspage", "BetterUptime", "Incident.io",
  ],
  design: [
    "Figma", "Sketch", "Adobe XD", "InVision",
    "Adobe Creative Cloud", "Canva", "Framer",
    "Zeplin", "Abstract", "Storybook",
    "Mural", "FigJam", "Whimsical",
    "Spline", "Rive", "LottieFiles",
    "Maze", "UserTesting", "Hotjar", "FullStory",
    "Pendo", "WalkMe", "Whatfix",
  ],
  productivity: [
    "Google Workspace", "Microsoft 365", "Zoho Workplace",
    "Dropbox", "Box", "Google Drive", "OneDrive", "SharePoint",
    "Calendly", "Cal.com", "Doodle",
    "Grammarly", "Otter.ai", "Fireflies.ai", "Grain",
    "1Password Teams", "LastPass Business",
    "Zapier", "Make", "Tray.io", "Workato", "n8n",
    "DocuSign", "PandaDoc", "HelloSign",
    "Loom", "Tango", "Scribe",
  ],
  erp: [
    "SAP", "SAP S/4HANA", "SAP Business One",
    "Oracle ERP", "Oracle Fusion",
    "Microsoft Dynamics 365 ERP", "Dynamics NAV", "Business Central",
    "Odoo", "ERPNext",
    "Infor", "Epicor", "Sage X3",
    "IFS", "Unit4",
    "Cegid", "Proginov",
    "Haufe X360", "weclapp",
  ],
  networking: [
    "Cisco", "Meraki", "Cisco Meraki",
    "Aruba", "HPE Aruba",
    "Juniper", "Fortinet FortiGate",
    "Ubiquiti", "UniFi",
    "Cloudflare", "Zscaler ZIA", "Zscaler ZPA",
    "Tailscale", "WireGuard", "OpenVPN",
    "Cato Networks", "Aryaka",
  ],
  communication: [
    "Zoom", "Google Meet", "Microsoft Teams",
    "Twilio", "Vonage", "Bandwidth",
    "RingCentral", "8x8", "Dialpad", "Aircall",
    "Genesys", "Five9", "Talkdesk", "NICE inContact",
    "Sendbird", "Stream", "PubNub",
    "Mailgun", "Postmark", "SparkPost",
    "Resend",
  ],
  project_management: [
    "Jira", "Linear", "Shortcut", "Height",
    "Asana", "Monday.com", "ClickUp", "Wrike",
    "Notion", "Coda",
    "Basecamp", "Teamwork", "Hive",
    "Productboard", "Aha!", "LaunchNotes",
    "Tempo", "Harvest", "Toggl",
  ],
  compliance: [
    "Vanta", "Drata", "Secureframe", "Launchdarkly",
    "OneTrust", "TrustArc", "Cookiebot", "Usercentrics",
    "BigID", "Spirion",
    "LogicGate", "Hyperproof", "AuditBoard",
    "Thoropass", "Sprinto", "Tugboat Logic",
    "Palqee", "Didomi",
  ],
};

// Flat list for quick matching
const ALL_VENDORS: string[] = Object.values(KNOWN_VENDORS).flat();
// Deduplicated, lowercased set for fast lookup
const VENDOR_LOWER_MAP = new Map<string, string>();
for (const v of ALL_VENDORS) {
  const lower = v.toLowerCase();
  if (!VENDOR_LOWER_MAP.has(lower)) {
    VENDOR_LOWER_MAP.set(lower, v);
  }
}

// ── Geo detection ─────────────────────────────────────

const EU_TLDS = new Set([
  "de", "fr", "at", "ch", "nl", "be", "lu", "it", "es", "pt",
  "pl", "cz", "se", "dk", "no", "fi", "ie", "ro", "hu", "bg",
  "hr", "sk", "si", "lt", "lv", "ee", "gr", "cy", "mt", "eu",
]);

const DACH_TLDS = new Set(["de", "at", "ch"]);
const FR_TLDS = new Set(["fr"]);
const UK_TLDS = new Set(["uk", "co.uk"]);

function detectGeoMarket(domain: string): GeoMarket {
  const parts = domain.split(".");
  const tld = parts[parts.length - 1].toLowerCase();
  const sld = parts.length > 2 ? `${parts[parts.length - 2]}.${tld}` : "";

  if (UK_TLDS.has(tld) || UK_TLDS.has(sld)) return "UK";
  if (DACH_TLDS.has(tld)) return "DACH";
  if (FR_TLDS.has(tld)) return "FR";
  if (EU_TLDS.has(tld)) return "EU";
  if (tld === "com" || tld === "us" || tld === "io" || tld === "co" || tld === "ai") return "US";
  if (tld === "jp" || tld === "cn" || tld === "kr" || tld === "in" || tld === "au" || tld === "sg") return "APAC";

  return "unknown";
}

// ── Intent signal detection ───────────────────────────

const INTENT_PATTERNS: {
  type: IntentSignal["type"];
  patterns: RegExp[];
  confidence: number;
}[] = [
  {
    type: "hiring_surge",
    patterns: [
      /hiring\s+(spree|surge|wave|binge)/i,
      /open(ed|ing)?\s+\d+\s+(new\s+)?position/i,
      /growing\s+(the\s+)?team/i,
      /headcount\s+(growth|expansion|increase)/i,
      /mass\s+hiring/i,
      /recruiting\s+(heavily|aggressively)/i,
    ],
    confidence: 65,
  },
  {
    type: "funding_round",
    patterns: [
      /raised?\s+\$?\d+[MBmb]/i,
      /series\s+[A-F]/i,
      /funding\s+round/i,
      /seed\s+funding/i,
      /venture\s+(capital|funding)/i,
      /IPO\s+(filing|plan|preparation)/i,
      /pre-?IPO/i,
      /investment\s+from/i,
    ],
    confidence: 75,
  },
  {
    type: "m_and_a",
    patterns: [
      /acqui(red?|sition)/i,
      /merg(ed?|er|ing)/i,
      /buyout/i,
      /take\s*over/i,
      /acqui-?hire/i,
      /strategic\s+(acquisition|partnership|investment)/i,
    ],
    confidence: 70,
  },
  {
    type: "renewal_window",
    patterns: [
      /contract\s+renewal/i,
      /vendor\s+review/i,
      /RFP\s+(process|launch)/i,
      /procurement\s+cycle/i,
      /re-?evaluat(e|ing|ion)/i,
      /switching\s+(from|provider)/i,
    ],
    confidence: 55,
  },
  {
    type: "cost_cutting",
    patterns: [
      /cost\s+(cut|reduction|optimization|saving)/i,
      /budget\s+(cut|reduction|freeze)/i,
      /restructur(e|ing)/i,
      /efficiency\s+(drive|program|initiative)/i,
      /operational\s+efficiency/i,
      /reducing\s+(spend|expenses|overhead)/i,
    ],
    confidence: 70,
  },
  {
    type: "expansion",
    patterns: [
      /expand(ed|ing)?\s+(to|into|operations)/i,
      /new\s+(office|market|region|country)/i,
      /international\s+expansion/i,
      /global\s+(expansion|growth)/i,
      /open(ed|ing)\s+(a\s+)?new\s+office/i,
    ],
    confidence: 60,
  },
  {
    type: "layoffs",
    patterns: [
      /lay\s*off/i,
      /laid\s+off/i,
      /workforce\s+reduction/i,
      /downsiz(e|ing)/i,
      /job\s+cut/i,
      /let\s+go\s+of\s+\d+/i,
      /reduction\s+in\s+force/i,
      /RIF\b/,
    ],
    confidence: 75,
  },
  {
    type: "ai_adoption",
    patterns: [
      /adopting\s+(AI|artificial\s+intelligence|machine\s+learning)/i,
      /AI\s+(strategy|initiative|transformation|roadmap)/i,
      /implement(ed|ing)\s+(AI|ML|LLM|GPT|Copilot)/i,
      /generative\s+AI/i,
      /AI-?(first|native|powered|driven)/i,
      /chief\s+AI\s+officer/i,
      /AI\s+budget/i,
    ],
    confidence: 60,
  },
];

function detectIntentSignals(signals: CompanySignal[]): IntentSignal[] {
  const found: IntentSignal[] = [];
  const seenTypes = new Set<string>();

  for (const signal of signals) {
    const text = `${signal.title} ${signal.snippet}`;
    for (const { type, patterns, confidence } of INTENT_PATTERNS) {
      // Limit to 2 signals per type
      const typeKey = type;
      if (seenTypes.has(`${typeKey}-2`)) continue;

      for (const pattern of patterns) {
        if (pattern.test(text)) {
          const count = seenTypes.has(typeKey) ? 2 : 1;
          seenTypes.add(typeKey);
          if (count === 2) seenTypes.add(`${typeKey}-2`);

          found.push({
            type,
            evidence: text.slice(0, 200),
            confidence: Math.min(confidence, 85), // never exceed 85
            detectedAt: new Date().toISOString(),
          });
          break; // one match per pattern group per signal
        }
      }
    }
  }

  return found;
}

// ── Geo-aware search queries ──────────────────────────

interface SearchQuery {
  template: (domain: string) => string;
  category: SignalCategory;
  geoRelevance?: GeoMarket[]; // if set, only run for those markets; if unset, always run
}

function buildSearchQueries(geo: GeoMarket): SearchQuery[] {
  const base: SearchQuery[] = [
    // -- Core queries (always run) --
    {
      template: (d) => `${d} company technology stack SaaS tools software`,
      category: "tech_stack",
    },
    {
      template: (d) => `${d} hiring engineering cloud infrastructure jobs`,
      category: "hiring",
    },
    {
      template: (d) => `${d} company size employees revenue funding`,
      category: "profile",
    },
    {
      template: (d) => `${d} cloud spending AWS Azure Google Cloud costs`,
      category: "financial",
    },
    // -- Intent queries --
    {
      template: (d) => `${d} funding round acquisition merger 2025 2026`,
      category: "funding",
    },
    {
      template: (d) => `${d} layoffs restructuring cost cutting efficiency`,
      category: "news",
    },
    {
      template: (d) => `${d} AI adoption generative AI LLM implementation`,
      category: "tech_stack",
    },
    {
      template: (d) => `${d} contract renewal vendor switch procurement RFP`,
      category: "renewal",
    },
    {
      template: (d) => `${d} AI tools spending governance policy shadow AI enterprise cost`,
      category: "financial",
    },
  ];

  // -- Geo-specific queries --
  if (geo === "DACH") {
    base.push(
      {
        template: (d) => `${d} SAP DATEV Personio TeamViewer software Deutschland`,
        category: "tech_stack",
      },
      {
        template: (d) => `${d} Mitarbeiter Unternehmen IT Kosten Digitalisierung`,
        category: "profile",
      },
    );
  }

  if (geo === "FR") {
    base.push(
      {
        template: (d) => `${d} logiciel entreprise SaaS Pennylane Qonto Spendesk`,
        category: "tech_stack",
      },
      {
        template: (d) => `${d} effectif entreprise DSI transformation digitale`,
        category: "profile",
      },
    );
  }

  if (geo === "US" || geo === "unknown") {
    base.push(
      {
        template: (d) => `${d} CrowdStrike Okta PagerDuty Splunk Snowflake Datadog`,
        category: "tech_stack",
      },
      {
        template: (d) => `${d} SOC 2 compliance security audit vendor management`,
        category: "tech_stack",
      },
    );
  }

  if (geo === "EU" || geo === "UK") {
    base.push(
      {
        template: (d) => `${d} GDPR compliance data protection European SaaS tools`,
        category: "tech_stack",
      },
    );
  }

  return base;
}

// ── Retry wrapper ─────────────────────────────────────

async function exaSearchWithRetry(
  exa: Exa,
  query: string,
  opts: { type: "auto"; numResults: number; text: { maxCharacters: number } },
  retries = 1,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await exa.searchAndContents(query, opts);
    } catch (err) {
      if (attempt < retries) {
        // Wait 1s before retry
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      throw err;
    }
  }
  // Unreachable, but TypeScript needs it
  throw new Error("Retry exhausted");
}

// ── Vendor extraction ─────────────────────────────────

function extractVendors(text: string): Set<string> {
  const found = new Set<string>();
  const lower = text.toLowerCase();

  for (const [vendorLower, vendorOriginal] of VENDOR_LOWER_MAP) {
    // Word-boundary-ish check: vendor must not be part of a larger word
    const idx = lower.indexOf(vendorLower);
    if (idx === -1) continue;

    // Basic boundary check
    const before = idx > 0 ? lower[idx - 1] : " ";
    const after = idx + vendorLower.length < lower.length ? lower[idx + vendorLower.length] : " ";
    const boundaryChars = /[\s,;.:()\-/"'!?\[\]{}|<>@#$%^&*+=~`\n\r\t]/;

    if (boundaryChars.test(before) && boundaryChars.test(after)) {
      found.add(vendorOriginal);
    }
  }

  return found;
}

function categorizeVendors(vendors: string[]): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const vendor of vendors) {
    for (const [category, list] of Object.entries(KNOWN_VENDORS)) {
      if (list.some((v) => v.toLowerCase() === vendor.toLowerCase())) {
        if (!result[category]) result[category] = [];
        if (!result[category].includes(vendor)) {
          result[category].push(vendor);
        }
        break;
      }
    }
  }

  return result;
}

// ── Main enrichment function ──────────────────────────

export async function enrichCompany(domain: string): Promise<EnrichmentResult> {
  const exa = getExa();

  if (!exa) {
    return createEmptyResult(domain, "EXA_API_KEY not configured");
  }

  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const geoMarket = detectGeoMarket(cleanDomain);
  const queries = buildSearchQueries(geoMarket);

  const signals: CompanySignal[] = [];
  const allVendors = new Set<string>();
  const hiringSignals: string[] = [];
  const queryErrors: string[] = [];

  // Run all searches in parallel
  const searchPromises = queries.map(async ({ template, category }) => {
    const queryString = template(cleanDomain);
    try {
      const result = await exaSearchWithRetry(exa, queryString, {
        type: "auto",
        numResults: 3,
        text: { maxCharacters: 500 },
      });

      for (const item of result.results) {
        const snippet = item.text || "";

        signals.push({
          source: "exa",
          title: item.title || "",
          snippet: snippet.slice(0, 500),
          url: item.url,
          publishedDate: item.publishedDate || null,
          category,
        });

        // Extract vendor mentions
        const vendors = extractVendors(`${item.title || ""} ${snippet}`);
        for (const v of vendors) allVendors.add(v);

        // Extract hiring signals
        if (category === "hiring" && snippet.length > 0) {
          hiringSignals.push(snippet.slice(0, 200));
        }
      }
    } catch (err) {
      const errorMsg = `[${category}] ${queryString.slice(0, 80)}: ${err instanceof Error ? err.message : String(err)}`;
      queryErrors.push(errorMsg);
      console.warn(`[Ghost Tax] Exa query failed after retry — ${errorMsg}`);
    }
  });

  await Promise.all(searchPromises);

  const techArray = Array.from(allVendors);
  const vendorsByCategory = categorizeVendors(techArray);
  const intentSignals = detectIntentSignals(signals);
  const summary = buildSummary(cleanDomain, signals.length, techArray, hiringSignals, intentSignals, geoMarket, queryErrors.length);

  return {
    domain: cleanDomain,
    signals,
    techMentions: techArray,
    hiringSignals: hiringSignals.slice(0, 10),
    summary,
    collectedAt: new Date().toISOString(),
    // v2 fields
    intentSignals,
    geoMarket,
    vendorsByCategory,
    queryErrors,
  };
}

// ── Helpers ───────────────────────────────────────────

function buildSummary(
  domain: string,
  signalCount: number,
  techMentions: string[],
  hiringSignals: string[],
  intentSignals: IntentSignal[],
  geoMarket: GeoMarket,
  errorCount: number,
): string {
  const parts: string[] = [];

  parts.push(`Research enrichment for ${domain}: ${signalCount} signals collected (market: ${geoMarket}).`);

  if (techMentions.length > 0) {
    parts.push(`Detected ${techMentions.length} vendor(s) in technology footprint: ${techMentions.slice(0, 15).join(", ")}${techMentions.length > 15 ? ` (+${techMentions.length - 15} more)` : ""}.`);
  }

  if (hiringSignals.length > 0) {
    parts.push(`${hiringSignals.length} hiring signals found — indicates active tool adoption.`);
  }

  if (intentSignals.length > 0) {
    const types = [...new Set(intentSignals.map((s) => s.type))];
    parts.push(`Intent signals detected: ${types.join(", ")}.`);
  }

  if (errorCount > 0) {
    parts.push(`${errorCount} query(s) failed — partial enrichment.`);
  }

  if (signalCount === 0) {
    parts.push("Limited public information available. Manual intake recommended.");
  }

  return parts.join(" ");
}

function createEmptyResult(domain: string, reason: string): EnrichmentResult {
  return {
    domain,
    signals: [],
    techMentions: [],
    hiringSignals: [],
    summary: `Enrichment skipped: ${reason}`,
    collectedAt: new Date().toISOString(),
    intentSignals: [],
    geoMarket: "unknown",
    vendorsByCategory: {},
    queryErrors: [],
  };
}
