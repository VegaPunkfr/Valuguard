/**
 * GHOST TAX — EXA RESEARCH CLIENT (SERVER-ONLY)
 *
 * Enrichment layer: collects contextual signals about a company
 * from the public web via Exa's neural search API.
 *
 * What it collects:
 *   - company profile signals (size, industry, tech stack)
 *   - job listings (hiring patterns reveal tool adoption)
 *   - infrastructure mentions (cloud/SaaS/AI vendor references)
 *   - recent news (funding, layoffs, growth signals)
 *
 * What it does NOT do:
 *   - Generate fake financial numbers
 *   - Access private systems
 *   - Store raw results (that's the vector layer's job)
 *
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

export interface CompanySignal {
  source: string;
  title: string;
  snippet: string;
  url: string;
  publishedDate: string | null;
  category: "profile" | "hiring" | "tech_stack" | "news" | "financial";
}

export interface EnrichmentResult {
  domain: string;
  signals: CompanySignal[];
  techMentions: string[];
  hiringSignals: string[];
  summary: string;
  collectedAt: string;
}

// ── Signal categories for search queries ──────────────

const SEARCH_QUERIES = [
  {
    template: (domain: string) => `${domain} company SaaS tools technology stack`,
    category: "tech_stack" as const,
  },
  {
    template: (domain: string) => `${domain} hiring engineering cloud infrastructure`,
    category: "hiring" as const,
  },
  {
    template: (domain: string) => `${domain} company size employees revenue`,
    category: "profile" as const,
  },
  {
    template: (domain: string) => `${domain} cloud spending AWS Azure Google Cloud`,
    category: "financial" as const,
  },
];

// Known vendors we look for in text
const KNOWN_VENDORS = [
  "Salesforce", "HubSpot", "Slack", "Notion", "Figma", "Jira", "Confluence",
  "AWS", "Azure", "Google Cloud", "GCP", "Datadog", "Snowflake", "MongoDB",
  "OpenAI", "Anthropic", "GitHub Copilot", "ChatGPT", "Vercel", "Netlify",
  "Stripe", "Twilio", "SendGrid", "Zendesk", "Intercom", "Amplitude",
  "Mixpanel", "Segment", "dbt", "Terraform", "Docker", "Kubernetes",
];

// ── Main enrichment function ──────────────────────────

export async function enrichCompany(domain: string): Promise<EnrichmentResult> {
  const exa = getExa();

  if (!exa) {
    return createEmptyResult(domain, "EXA_API_KEY not configured");
  }

  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const signals: CompanySignal[] = [];
  const techMentions = new Set<string>();
  const hiringSignals: string[] = [];

  // Run all searches in parallel
  const searchPromises = SEARCH_QUERIES.map(async ({ template, category }) => {
    try {
      const result = await exa.searchAndContents(template(cleanDomain), {
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

        // Extract tech mentions
        for (const vendor of KNOWN_VENDORS) {
          if (snippet.toLowerCase().includes(vendor.toLowerCase())) {
            techMentions.add(vendor);
          }
        }

        // Extract hiring signals
        if (category === "hiring" && snippet.length > 0) {
          hiringSignals.push(snippet.slice(0, 200));
        }
      }
    } catch (err) {
      console.warn(`[Ghost Tax] Exa search failed for category ${category}:`, err);
    }
  });

  await Promise.all(searchPromises);

  const techArray = Array.from(techMentions);
  const summary = buildSummary(cleanDomain, signals.length, techArray, hiringSignals);

  return {
    domain: cleanDomain,
    signals,
    techMentions: techArray,
    hiringSignals: hiringSignals.slice(0, 5),
    summary,
    collectedAt: new Date().toISOString(),
  };
}

// ── Helpers ───────────────────────────────────────────

function buildSummary(
  domain: string,
  signalCount: number,
  techMentions: string[],
  hiringSignals: string[],
): string {
  const parts: string[] = [];

  parts.push(`Research enrichment for ${domain}: ${signalCount} signals collected.`);

  if (techMentions.length > 0) {
    parts.push(`Detected technology footprint: ${techMentions.join(", ")}.`);
  }

  if (hiringSignals.length > 0) {
    parts.push(`${hiringSignals.length} hiring signals found — indicates active tool adoption.`);
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
  };
}
