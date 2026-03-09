/**
 * GHOST TAX — LEAD SCORING ENGINE (SERVER-ONLY)
 *
 * Automatic scoring for admin visibility.
 * Score 0-100 based on: company size, spend, exposure, engagement, industry.
 *
 * Score > 80: HOT (high-value, likely to self-convert)
 * Score 60-80: WARM (strong engagement signals)
 * Score 40-60: COOL (moderate interest)
 * Score < 40: COLD (low engagement)
 *
 * Pure PLG: no human contact, no calls, no demos. Product sells itself.
 */

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
}

export interface LeadScore {
  total: number;              // 0-100
  grade: "HOT" | "WARM" | "COOL" | "COLD";
  breakdown: {
    companyFit: number;       // 0-30
    spendPotential: number;   // 0-25
    engagement: number;       // 0-25
    industryFit: number;      // 0-10
    urgency: number;          // 0-10
  };
  signals: string[];
  recommendedAction: string;
}

// Industry multipliers (higher = better fit for Ghost Tax)
const INDUSTRY_SCORES: Record<string, number> = {
  saas_tech: 10,
  technology: 9,
  financial_services: 9,
  finance: 8,
  healthcare: 7,
  manufacturing: 7,
  retail: 6,
  professional_services: 8,
  education: 5,
  government: 4,
  nonprofit: 3,
};

export function scoreLeadFromData(lead: LeadData): LeadScore {
  const signals: string[] = [];
  let companyFit = 0;
  let spendPotential = 0;
  let engagement = 0;
  let industryFit = 0;
  let urgency = 0;

  // ── Company Fit (0-30) ─────────────────────────────
  const headcount = lead.headcount || 0;
  if (headcount >= 500) {
    companyFit += 30;
    signals.push("Enterprise (500+ employees)");
  } else if (headcount >= 200) {
    companyFit += 25;
    signals.push("Mid-market (200-500 employees)");
  } else if (headcount >= 100) {
    companyFit += 20;
    signals.push("Growth-stage (100-200 employees)");
  } else if (headcount >= 50) {
    companyFit += 12;
  } else if (headcount > 0) {
    companyFit += 5;
  }

  // Tool count bonus
  const toolCount = lead.saasToolCount || 0;
  if (toolCount >= 80) {
    companyFit += 5;
    signals.push("High tool sprawl (80+ SaaS tools)");
  } else if (toolCount >= 40) {
    companyFit += 3;
  }
  companyFit = Math.min(30, companyFit);

  // ── Spend Potential (0-25) ─────────────────────────
  const monthlySpend = lead.monthlySpendEur || 0;
  if (monthlySpend >= 200000) {
    spendPotential = 25;
    signals.push("High spend (200k+ EUR/month)");
  } else if (monthlySpend >= 100000) {
    spendPotential = 22;
    signals.push("Strong spend (100-200k EUR/month)");
  } else if (monthlySpend >= 50000) {
    spendPotential = 18;
  } else if (monthlySpend >= 20000) {
    spendPotential = 12;
  } else if (monthlySpend > 0) {
    spendPotential = 5;
  }

  // ── Engagement (0-25) ──────────────────────────────
  if (lead.checkoutCompleted) {
    engagement += 25;
    signals.push("Payment completed");
  } else if (lead.checkoutStarted) {
    engagement += 20;
    signals.push("Checkout started (abandoned)");
  } else if (lead.scanCompleted) {
    engagement += 15;
    signals.push("Free scan completed");
  } else if (lead.contactFormSubmitted) {
    engagement += 12;
    signals.push("Contact form submitted");
  }

  if ((lead.pagesViewed || 0) >= 5) {
    engagement += 3;
    signals.push("High page engagement (5+ pages)");
  }
  if ((lead.timeOnSiteSeconds || 0) >= 300) {
    engagement += 2;
    signals.push("5+ minutes on site");
  }
  engagement = Math.min(25, engagement);

  // ── Industry Fit (0-10) ────────────────────────────
  const industry = (lead.industry || "").toLowerCase().replace(/[\s-]+/g, "_");
  industryFit = INDUSTRY_SCORES[industry] || 4;

  // ── Urgency (0-10) ────────────────────────────────
  // High spend + high tool count = urgent (likely bleeding money)
  if (monthlySpend >= 100000 && toolCount >= 50) {
    urgency = 10;
    signals.push("High urgency: significant spend + tool sprawl");
  } else if (monthlySpend >= 50000 && toolCount >= 30) {
    urgency = 6;
  } else if (monthlySpend >= 20000) {
    urgency = 3;
  }

  // Checkout abandonment = high urgency
  if (lead.checkoutStarted && !lead.checkoutCompleted) {
    urgency = Math.max(urgency, 8);
    signals.push("ABANDONED CHECKOUT — recover immediately");
  }

  const total = Math.min(100, companyFit + spendPotential + engagement + industryFit + urgency);

  const grade: LeadScore["grade"] =
    total >= 80 ? "HOT" :
    total >= 60 ? "WARM" :
    total >= 40 ? "COOL" : "COLD";

  const recommendedAction =
    grade === "HOT" ? "High intent — ensure checkout flow is frictionless. Send automated report immediately." :
    grade === "WARM" ? "Strong engagement — trigger automated insight email (Touch 1)." :
    grade === "COOL" ? "Moderate interest — add to automated insight sequence." :
    "Low engagement. Add to newsletter.";

  return {
    total,
    grade,
    breakdown: { companyFit, spendPotential, engagement, industryFit, urgency },
    signals,
    recommendedAction,
  };
}

/**
 * Score a lead from vault_session database row
 */
export function scoreLeadFromVaultSession(session: Record<string, unknown>): LeadScore {
  return scoreLeadFromData({
    email: session.email as string || "",
    domain: session.domain as string,
    companyName: session.company_name as string,
    headcount: session.headcount as number,
    monthlySpendEur: session.estimated_monthly_spend as number,
    industry: session.industry as string,
    saasToolCount: session.saas_tool_count as number,
    scanCompleted: true,
    checkoutStarted: !!session.checkout_started_at,
    checkoutCompleted: !!session.stripe_payment_intent_id,
    contactFormSubmitted: !!session.contact_submitted_at,
  });
}
