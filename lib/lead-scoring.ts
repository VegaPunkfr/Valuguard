/**
 * GHOST TAX — LEAD SCORING ENGINE v2 (SERVER-ONLY)
 *
 * 2026 upgrade: geo-awareness, intent signals, email quality,
 * timing fit, expanded industries, enrichment-based scoring.
 *
 * Score 0-100 based on 8 dimensions:
 *   companyFit (0-25), spendPotential (0-20), engagement (0-20),
 *   industryFit (0-10), urgency (0-10), geoFit (0-5),
 *   emailQuality (0-5), intentSignals (0-5)
 *
 * Score >= 80: HOT (high-value, likely to self-convert)
 * Score 60-79: WARM (strong engagement signals)
 * Score 40-59: COOL (moderate interest)
 * Score < 40:  COLD (low engagement)
 *
 * Pure PLG: no human contact, no calls, no demos. Product sells itself.
 */

// ── Types ──────────────────────────────────────────────────

export interface LeadData {
  email: string;
  domain?: string;
  companyName?: string;
  headcount?: number;
  monthlySpendEur?: number;
  industry?: string;
  saasToolCount?: number;
  // Engagement signals
  scanCompleted?: boolean;
  checkoutStarted?: boolean;
  checkoutCompleted?: boolean;
  contactFormSubmitted?: boolean;
  pagesViewed?: number;
  timeOnSiteSeconds?: number;
  referralSource?: string;
  // v2 — geo & timing
  country?: string;
  region?: string;            // e.g. "eu", "us", "apac"
  fiscalYearEndMonth?: number; // 1-12
  // v2 — intent signals (can be set manually or via enrichment)
  recentFundingRound?: boolean;
  hiringVelocity?: "high" | "moderate" | "low" | null;
  maActivity?: boolean;       // M&A activity detected
  contractRenewalWindow?: boolean; // within 60-90 days of major renewal
  recentLayoffs?: boolean;
  compliancePressure?: boolean; // GDPR/DORA/SOC2 news
}

export interface EnrichmentData {
  fundingRounds?: { date: string; amount?: number; series?: string }[];
  recentHires?: number;       // job postings in last 90 days
  acquisitions?: { date: string; target?: string }[];
  renewalDates?: string[];    // ISO dates of known contract renewals
  newsSignals?: string[];     // headlines mentioning the company
  layoffs?: boolean;
  complianceNews?: boolean;
  techStack?: string[];       // detected technologies
  estimatedRevenue?: number;  // USD annual
  employeeGrowthPct?: number; // YoY
}

export interface LeadScore {
  total: number;              // 0-100
  grade: "HOT" | "WARM" | "COOL" | "COLD";
  breakdown: {
    companyFit: number;       // 0-25
    spendPotential: number;   // 0-20
    engagement: number;       // 0-20
    industryFit: number;      // 0-10
    urgency: number;          // 0-10
    geoFit: number;           // 0-5
    emailQuality: number;     // 0-5
    intentSignals: number;    // 0-5
  };
  signals: string[];
  recommendedAction: string;
}

// ── Industry Scores ────────────────────────────────────────

const INDUSTRY_SCORES: Record<string, number> = {
  // Tech & SaaS (highest fit)
  saas_tech: 10,
  technology: 9,
  cloud_infrastructure: 10,
  cybersecurity: 9,
  ai_ml: 9,
  data_analytics: 8,
  devtools: 8,
  fintech: 9,
  insurtech: 8,
  proptech: 7,
  edtech: 6,
  martech: 8,
  hrtech: 7,

  // US market verticals
  healthcare_tech: 9,
  healthtech: 9,
  defense_tech: 8,
  defensetech: 8,
  legal_tech: 8,
  legaltech: 8,
  govtech: 7,
  cleantech: 7,
  agritech: 6,
  biotech: 7,

  // Financial services
  financial_services: 9,
  finance: 8,
  banking: 9,
  insurance: 8,
  asset_management: 8,
  private_equity: 9,
  venture_capital: 8,

  // Traditional industries (still high SaaS spend)
  healthcare: 7,
  pharma: 8,
  pharmaceutical: 8,
  manufacturing: 7,
  automotive: 7,
  aerospace: 7,
  energy: 7,
  oil_gas: 7,
  utilities: 6,
  mining: 5,

  // Services
  professional_services: 8,
  consulting: 8,
  legal: 7,
  accounting: 7,
  staffing: 6,
  real_estate: 6,

  // Retail & consumer
  retail: 6,
  ecommerce: 7,
  consumer_goods: 6,
  food_beverage: 5,
  hospitality: 5,
  travel: 5,
  media: 6,
  entertainment: 5,
  gaming: 6,

  // Other
  education: 5,
  higher_education: 5,
  government: 4,
  nonprofit: 3,
  telecom: 7,
  logistics: 6,
  supply_chain: 7,
  construction: 5,
  agriculture: 4,
};

// ── Free Email Domains ─────────────────────────────────────

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com",
  "yahoo.com", "yahoo.fr", "yahoo.de", "yahoo.co.uk",
  "hotmail.com", "hotmail.fr", "hotmail.de",
  "outlook.com", "outlook.fr", "outlook.de",
  "live.com", "live.fr",
  "aol.com",
  "protonmail.com", "proton.me",
  "icloud.com", "me.com", "mac.com",
  "mail.com",
  "gmx.com", "gmx.de", "gmx.fr",
  "web.de",
  "t-online.de",
  "orange.fr", "wanadoo.fr",
  "free.fr", "laposte.net",
  "yandex.com", "yandex.ru",
  "zoho.com",
  "tutanota.com", "tuta.io",
  "fastmail.com",
  "hey.com",
]);

// Disposable / throwaway domains — score 0
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "tempmail.com",
  "throwaway.email", "yopmail.com", "sharklasers.com",
  "10minutemail.com", "trashmail.com", "temp-mail.org",
  "dispostable.com", "maildrop.cc",
]);

// ── Geo Data ───────────────────────────────────────────────

const COUNTRY_TO_REGION: Record<string, string> = {
  // North America
  US: "us", CA: "us",
  // EU core
  FR: "eu", DE: "eu", NL: "eu", BE: "eu", LU: "eu",
  IT: "eu", ES: "eu", PT: "eu", AT: "eu", IE: "eu",
  FI: "eu", SE: "eu", DK: "eu", PL: "eu", CZ: "eu",
  RO: "eu", BG: "eu", HR: "eu", SK: "eu", SI: "eu",
  HU: "eu", EE: "eu", LV: "eu", LT: "eu", GR: "eu",
  CY: "eu", MT: "eu",
  // DACH / EFTA
  CH: "eu", LI: "eu", NO: "eu", IS: "eu",
  // UK
  GB: "uk",
  // APAC
  JP: "apac", KR: "apac", AU: "apac", NZ: "apac",
  SG: "apac", HK: "apac", TW: "apac", IN: "apac",
  // MENA
  AE: "mena", SA: "mena", IL: "mena",
  // LATAM
  BR: "latam", MX: "latam", AR: "latam", CO: "latam", CL: "latam",
};

// ── Scoring Functions ──────────────────────────────────────

function scoreCompanyFit(lead: LeadData, signals: string[]): number {
  let score = 0;
  const headcount = lead.headcount || 0;

  // Headcount scoring (0-20)
  if (headcount >= 1000) {
    score += 20;
    signals.push("Enterprise (1000+ employees)");
  } else if (headcount >= 500) {
    score += 18;
    signals.push("Large mid-market (500-1000 employees)");
  } else if (headcount >= 200) {
    score += 15;
    signals.push("Mid-market (200-500 employees)");
  } else if (headcount >= 100) {
    score += 12;
    signals.push("Growth-stage (100-200 employees)");
  } else if (headcount >= 50) {
    score += 8;
  } else if (headcount >= 20) {
    score += 4;
  } else if (headcount > 0) {
    score += 2;
  }

  // Headcount validation: if headcount is suspiciously round or missing, penalize slightly
  if (headcount > 0 && headcount % 1000 === 0 && headcount >= 5000) {
    // Likely an estimate — still valid but note it
    signals.push("Headcount appears estimated");
  }

  // Tool count bonus (0-5)
  const toolCount = lead.saasToolCount || 0;
  if (toolCount >= 100) {
    score += 5;
    signals.push("Extreme tool sprawl (100+ SaaS tools)");
  } else if (toolCount >= 60) {
    score += 4;
    signals.push("High tool sprawl (60+ SaaS tools)");
  } else if (toolCount >= 30) {
    score += 3;
  } else if (toolCount >= 15) {
    score += 1;
  }

  return Math.min(25, score);
}

function scoreSpendPotential(lead: LeadData, signals: string[]): number {
  const monthlySpend = lead.monthlySpendEur || 0;

  if (monthlySpend >= 300000) {
    signals.push("Very high spend (300k+ EUR/month)");
    return 20;
  } else if (monthlySpend >= 200000) {
    signals.push("High spend (200k+ EUR/month)");
    return 18;
  } else if (monthlySpend >= 100000) {
    signals.push("Strong spend (100-200k EUR/month)");
    return 15;
  } else if (monthlySpend >= 50000) {
    signals.push("Moderate spend (50-100k EUR/month)");
    return 12;
  } else if (monthlySpend >= 20000) {
    return 8;
  } else if (monthlySpend >= 5000) {
    return 4;
  } else if (monthlySpend > 0) {
    return 2;
  }
  return 0;
}

function scoreEngagement(lead: LeadData, signals: string[]): number {
  let score = 0;

  // Primary engagement actions (pick highest)
  if (lead.checkoutCompleted) {
    score += 20;
    signals.push("Payment completed");
  } else if (lead.checkoutStarted) {
    score += 16;
    signals.push("Checkout started (abandoned)");
  } else if (lead.scanCompleted) {
    score += 12;
    signals.push("Free scan completed");
  } else if (lead.contactFormSubmitted) {
    score += 10;
    signals.push("Contact form submitted");
  }

  // Page engagement bonus
  const pages = lead.pagesViewed || 0;
  if (pages >= 8) {
    score += 3;
    signals.push("Deep page engagement (8+ pages)");
  } else if (pages >= 5) {
    score += 2;
    signals.push("Good page engagement (5+ pages)");
  } else if (pages >= 3) {
    score += 1;
  }

  // Time on site bonus
  const time = lead.timeOnSiteSeconds || 0;
  if (time >= 600) {
    score += 2;
    signals.push("10+ minutes on site");
  } else if (time >= 300) {
    score += 1;
    signals.push("5+ minutes on site");
  }

  // Referral source bonus
  if (lead.referralSource) {
    const ref = lead.referralSource.toLowerCase();
    if (ref.includes("linkedin")) {
      score += 1;
      signals.push("LinkedIn referral");
    } else if (ref.includes("google") || ref.includes("bing")) {
      score += 1;
    }
  }

  return Math.min(20, score);
}

function scoreIndustryFit(lead: LeadData): number {
  const raw = (lead.industry || "").toLowerCase().replace(/[\s\-&/]+/g, "_");
  return INDUSTRY_SCORES[raw] || 4; // Default 4 for unknown industries
}

function scoreUrgency(lead: LeadData, signals: string[]): number {
  const monthlySpend = lead.monthlySpendEur || 0;
  const toolCount = lead.saasToolCount || 0;
  let score = 0;

  // Spend + tool sprawl combo
  if (monthlySpend >= 100000 && toolCount >= 50) {
    score = 10;
    signals.push("High urgency: significant spend + tool sprawl");
  } else if (monthlySpend >= 50000 && toolCount >= 30) {
    score = 6;
  } else if (monthlySpend >= 20000) {
    score = 3;
  }

  // Checkout abandonment = high urgency
  if (lead.checkoutStarted && !lead.checkoutCompleted) {
    score = Math.max(score, 8);
    signals.push("ABANDONED CHECKOUT — recover immediately");
  }

  // Contract renewal window
  if (lead.contractRenewalWindow) {
    score = Math.max(score, 7);
    signals.push("Within contract renewal window (60-90 days)");
  }

  return Math.min(10, score);
}

function scoreGeoFit(lead: LeadData, signals: string[]): number {
  const country = (lead.country || "").toUpperCase();
  const region = lead.region?.toLowerCase() || COUNTRY_TO_REGION[country] || "";

  // US large enterprise = highest geo fit (largest SaaS market)
  if (region === "us") {
    const headcount = lead.headcount || 0;
    if (headcount >= 500) {
      signals.push("US enterprise — prime market");
      return 5;
    }
    signals.push("US market");
    return 4;
  }

  // EU = our core market, strong fit
  if (region === "eu") {
    const headcount = lead.headcount || 0;
    if (headcount >= 200) {
      signals.push("EU mid-market+ — core target");
      return 5;
    }
    signals.push("EU market");
    return 4;
  }

  // UK = strong market
  if (region === "uk") {
    signals.push("UK market");
    return 4;
  }

  // APAC = growing market
  if (region === "apac") {
    signals.push("APAC market");
    return 3;
  }

  // MENA = emerging
  if (region === "mena") {
    return 2;
  }

  // LATAM
  if (region === "latam") {
    return 2;
  }

  // Unknown geo — neutral score
  return 2;
}

function scoreEmailQuality(lead: LeadData, signals: string[]): number {
  const email = (lead.email || "").toLowerCase().trim();
  if (!email || !email.includes("@")) return 0;

  const emailDomain = email.split("@")[1];
  if (!emailDomain) return 0;

  // Disposable = worst
  if (DISPOSABLE_EMAIL_DOMAINS.has(emailDomain)) {
    signals.push("Disposable email — likely not serious");
    return 0;
  }

  // Free email = low quality
  if (FREE_EMAIL_DOMAINS.has(emailDomain)) {
    signals.push("Free email provider — no corporate domain");
    return 1;
  }

  // Corporate domain — check if it matches the lead's domain
  const leadDomain = (lead.domain || "").toLowerCase().trim();
  if (leadDomain && emailDomain.includes(leadDomain.replace(/^www\./, ""))) {
    signals.push("Corporate email matches company domain");
    return 5;
  }

  // Corporate domain but doesn't match — still good
  if (emailDomain.length > 4 && !emailDomain.startsWith("mail.")) {
    signals.push("Corporate email domain");
    return 4;
  }

  return 3;
}

function scoreIntentSignals(lead: LeadData, signals: string[]): number {
  let score = 0;

  if (lead.recentFundingRound) {
    score += 2;
    signals.push("Recent funding round — budget available");
  }

  if (lead.hiringVelocity === "high") {
    score += 1;
    signals.push("High hiring velocity — tool spend growing");
  } else if (lead.hiringVelocity === "moderate") {
    score += 0.5;
  }

  if (lead.maActivity) {
    score += 2;
    signals.push("M&A activity — consolidation opportunity");
  }

  if (lead.contractRenewalWindow) {
    score += 1;
    signals.push("Contract renewal window — negotiation timing");
  }

  if (lead.recentLayoffs) {
    score += 1;
    signals.push("Recent layoffs — cost-cutting mode");
  }

  if (lead.compliancePressure) {
    score += 1;
    signals.push("Compliance pressure (GDPR/DORA/SOC2)");
  }

  return Math.min(5, Math.round(score));
}

function scoreTimingFit(signals: string[]): number {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  let score = 0;

  // Q4 budget season (Oct-Dec) = peak buying
  if (month >= 10 && month <= 12) {
    score += 3;
    signals.push("Q4 budget season — peak buying window");
  }
  // Q1 new budget allocation (Jan-Feb)
  else if (month >= 1 && month <= 2) {
    score += 2;
    signals.push("Q1 new fiscal year — fresh budgets");
  }
  // Mid-year review (Jun-Jul)
  else if (month >= 6 && month <= 7) {
    score += 1;
    signals.push("Mid-year budget review");
  }

  return Math.min(5, score);
}

// ── Enrichment Scoring ─────────────────────────────────────

/**
 * Derive intent signals from Exa enrichment data and merge into LeadData.
 * Returns an augmented LeadData with intent fields populated.
 */
function deriveIntentFromEnrichment(
  lead: LeadData,
  enrichment: EnrichmentData
): LeadData {
  const augmented = { ...lead };
  const now = Date.now();
  const ninetyDays = 90 * 24 * 60 * 60 * 1000;

  // Funding rounds in last 90 days
  if (enrichment.fundingRounds?.length) {
    const recent = enrichment.fundingRounds.some((r) => {
      const d = new Date(r.date).getTime();
      return now - d < ninetyDays;
    });
    if (recent) augmented.recentFundingRound = true;
  }

  // Hiring velocity from job postings
  if (enrichment.recentHires !== undefined) {
    if (enrichment.recentHires >= 50) {
      augmented.hiringVelocity = "high";
    } else if (enrichment.recentHires >= 15) {
      augmented.hiringVelocity = "moderate";
    } else {
      augmented.hiringVelocity = "low";
    }
  }

  // Employee growth as hiring proxy
  if (!augmented.hiringVelocity && enrichment.employeeGrowthPct !== undefined) {
    if (enrichment.employeeGrowthPct >= 30) {
      augmented.hiringVelocity = "high";
    } else if (enrichment.employeeGrowthPct >= 10) {
      augmented.hiringVelocity = "moderate";
    }
  }

  // M&A activity
  if (enrichment.acquisitions?.length) {
    const recentAcq = enrichment.acquisitions.some((a) => {
      const d = new Date(a.date).getTime();
      return now - d < ninetyDays * 2; // 180 days for M&A
    });
    if (recentAcq) augmented.maActivity = true;
  }

  // Contract renewals within 90 days
  if (enrichment.renewalDates?.length) {
    const upcoming = enrichment.renewalDates.some((d) => {
      const diff = new Date(d).getTime() - now;
      return diff > 0 && diff < ninetyDays;
    });
    if (upcoming) augmented.contractRenewalWindow = true;
  }

  // Layoffs
  if (enrichment.layoffs) {
    augmented.recentLayoffs = true;
  }

  // Compliance pressure
  if (enrichment.complianceNews) {
    augmented.compliancePressure = true;
  }

  // News signals — look for cost-cutting keywords
  if (enrichment.newsSignals?.length) {
    const costKeywords = ["cost reduction", "efficiency", "restructuring", "layoff", "optimize spend"];
    const hasCostSignal = enrichment.newsSignals.some((headline) => {
      const lower = headline.toLowerCase();
      return costKeywords.some((k) => lower.includes(k));
    });
    if (hasCostSignal && !augmented.recentLayoffs) {
      augmented.recentLayoffs = true; // cost-cutting proxy
    }
  }

  return augmented;
}

// ── Main Scoring Functions ─────────────────────────────────

export function scoreLeadFromData(lead: LeadData): LeadScore {
  const signals: string[] = [];

  const companyFit = scoreCompanyFit(lead, signals);
  const spendPotential = scoreSpendPotential(lead, signals);
  const engagement = scoreEngagement(lead, signals);
  const industryFit = scoreIndustryFit(lead);
  const urgency = scoreUrgency(lead, signals);
  const geoFit = scoreGeoFit(lead, signals);
  const emailQuality = scoreEmailQuality(lead, signals);
  const intentSignals = scoreIntentSignals(lead, signals);

  // Timing is a hidden bonus that feeds into urgency indirectly
  const timingBonus = scoreTimingFit(signals);

  // Total: sum of 8 dimensions + timing bonus (capped at 100)
  const rawTotal = companyFit + spendPotential + engagement + industryFit
    + urgency + geoFit + emailQuality + intentSignals + timingBonus;
  const total = Math.min(100, rawTotal);

  const grade: LeadScore["grade"] =
    total >= 80 ? "HOT" :
    total >= 60 ? "WARM" :
    total >= 40 ? "COOL" : "COLD";

  const recommendedAction =
    grade === "HOT"
      ? "High intent — ensure checkout flow is frictionless. Send automated report immediately."
    : grade === "WARM"
      ? "Strong engagement — trigger automated insight email (Touch 1). Prioritize in CRM."
    : grade === "COOL"
      ? "Moderate interest — add to automated insight sequence. Nurture with content."
    : "Low engagement. Add to newsletter. Monitor for re-engagement.";

  return {
    total,
    grade,
    breakdown: {
      companyFit,
      spendPotential,
      engagement,
      industryFit,
      urgency,
      geoFit,
      emailQuality,
      intentSignals,
    },
    signals,
    recommendedAction,
  };
}

/**
 * Score a lead from vault_session database row.
 * Backward-compatible: works with existing vault_session schema.
 */
export function scoreLeadFromVaultSession(session: Record<string, unknown>): LeadScore {
  return scoreLeadFromData({
    email: (session.email as string) || "",
    domain: session.domain as string,
    companyName: session.company_name as string,
    headcount: session.headcount as number,
    monthlySpendEur: session.estimated_monthly_spend as number,
    industry: session.industry as string,
    saasToolCount: session.saas_tool_count as number,
    country: session.country as string,
    region: session.region as string,
    scanCompleted: true,
    checkoutStarted: !!session.checkout_started_at,
    checkoutCompleted: !!session.stripe_payment_intent_id,
    contactFormSubmitted: !!session.contact_submitted_at,
  });
}

/**
 * Score a lead with enrichment data (e.g. from Exa).
 * Derives intent signals from enrichment, then scores.
 */
export function scoreLeadWithEnrichment(
  lead: LeadData,
  enrichment: EnrichmentData
): LeadScore {
  const augmentedLead = deriveIntentFromEnrichment(lead, enrichment);
  return scoreLeadFromData(augmentedLead);
}
