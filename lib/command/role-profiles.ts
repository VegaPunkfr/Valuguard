/**
 * GHOST TAX — ROLE INTELLIGENCE PROFILES
 *
 * Each executive role has different pain points, triggers,
 * and data points that convince them. The same company scan
 * produces DIFFERENT messages for different roles.
 */

export interface RoleProfile {
  role: string;
  painPoints: string[];
  primaryTrigger: string;
  proofPreference: string;        // Which scan data convinces this role
  narrativeAngle: string;         // How to frame the conversation
  priceFraming: string;           // How to present 490/590€
  ctaStyle: string;               // What action to suggest
  avoidTopics: string[];          // What NOT to mention to this role
}

export const ROLE_PROFILES: Record<string, RoleProfile> = {
  CFO: {
    role: "CFO / Chief Financial Officer",
    painPoints: [
      "No visibility on actual IT spend vs budget",
      "Board asks about IT efficiency — no data-backed answer",
      "Renewals auto-renew at inflated rates",
      "Can't separate necessary spend from waste",
    ],
    primaryTrigger: "FINANCIAL VISIBILITY — the CFO needs to KNOW the numbers, not guess",
    proofPreference: "EUR figures first. Daily loss > annual (more visceral). Board-ready format matters. Percentile vs peers creates competitive pressure.",
    narrativeAngle: "You're responsible for a budget you can't fully see. We make the invisible visible — in 48 hours, in EUR, in a format your board can read.",
    priceFraming: "€590 is less than ONE DAY of your current exposure. ROI is measurable from day one.",
    ctaStyle: "Link to free scan OR direct to report purchase. Never 'book a call.'",
    avoidTopics: [
      "Technical details about how detection works",
      "Tool names or vendor comparisons",
      "Anything that sounds like a sales pitch",
    ],
  },

  CIO: {
    role: "CIO / Chief Information Officer / VP IT",
    painPoints: [
      "Shadow IT bypasses governance",
      "Can't benchmark costs vs industry",
      "Tech debt from rapid scaling",
      "AI tool proliferation without oversight",
    ],
    primaryTrigger: "TECHNICAL CONTROL — the CIO needs to GOVERN the stack, not discover it by accident",
    proofPreference: "Number of tools detected (especially shadow IT). Vendor redundancy. DNS subdomain count vs what IT tracks. Specific tool names (Cursor + Copilot + ChatGPT).",
    narrativeAngle: "Your real tech footprint is 3x what your team thinks. We map it in 48 hours without touching your systems.",
    priceFraming: "€490 for a complete shadow IT and cost map that would take your team weeks to build manually.",
    ctaStyle: "Free scan link (CIOs want to SEE before they buy).",
    avoidTopics: [
      "Board-level framing",
      "Financial jargon",
      "Questioning their competence",
    ],
  },

  PROCUREMENT: {
    role: "Head of Procurement / Procurement Director / VP Procurement",
    painPoints: [
      "Vendors know more about usage than procurement does",
      "No industry benchmarks for negotiation leverage",
      "Auto-renewals lock in last year's inflated prices",
      "Contract terms favor vendors (escalation clauses, penalties)",
    ],
    primaryTrigger: "NEGOTIATION LEVERAGE — procurement needs DATA to negotiate, not gut feeling",
    proofPreference: "Vendor-specific findings. Renewal timing. Price benchmarks vs peers. Contract risk signals (auto-renewal traps).",
    narrativeAngle: "Your next vendor negotiation is coming up. Walk in with data they don't expect you to have.",
    priceFraming: "€490 report includes vendor-specific negotiation playbooks. Typical savings: 3-5x the report cost on the next renewal.",
    ctaStyle: "Direct to report purchase (procurement buys tools, they're comfortable with transactions).",
    avoidTopics: [
      "C-suite framing",
      "Strategic vision language",
      "Anything that sounds like consulting",
    ],
  },

  IT_DIRECTOR: {
    role: "IT Director / Director of IT / IT Manager",
    painPoints: [
      "Budget cuts coming but can't identify safe cuts",
      "License utilization scattered across admin consoles",
      "New AI tools appear monthly without cost tracking",
      "Team manages fire drills, not optimization",
    ],
    primaryTrigger: "ACTIONABLE CUTS — the IT Director needs to know WHERE to cut without breaking things",
    proofPreference: "License waste (inactive seats). Tool overlap (same function, multiple tools). AI tool inventory. Quick wins with low disruption.",
    narrativeAngle: "Your budget is under pressure. We tell you exactly what to cut first — with the lowest risk of breaking anything.",
    priceFraming: "€490 for a priority action list. Start cutting waste in 48 hours instead of spending 3 months figuring out where.",
    ctaStyle: "Free scan first (IT Directors are cautious, want to validate before spending).",
    avoidTopics: [
      "Board-ready anything",
      "Financial abstractions",
      "Questioning their team's capabilities",
    ],
  },
};

export function getRoleProfile(title: string): RoleProfile {
  const t = title.toLowerCase();
  if (/\bcfo\b|chief financial|vp finance|finance director|head of finance/i.test(t)) {
    return ROLE_PROFILES.CFO;
  }
  if (/\bcio\b|chief information|chief technology|cto|vp (it|tech)|head of (it|tech)/i.test(t)) {
    return ROLE_PROFILES.CIO;
  }
  if (/procurement|purchasing|sourcing|vendor manage/i.test(t)) {
    return ROLE_PROFILES.PROCUREMENT;
  }
  if (/\bit director\b|\bit manager\b|director.*(it|tech)|infrastructure/i.test(t)) {
    return ROLE_PROFILES.IT_DIRECTOR;
  }
  // Default to CFO (highest decision authority)
  return ROLE_PROFILES.CFO;
}

export function getRoleForPrompt(profile: RoleProfile): string {
  return [
    `ROLE: ${profile.role}`,
    `PAIN POINTS: ${profile.painPoints.join("; ")}`,
    `PRIMARY TRIGGER: ${profile.primaryTrigger}`,
    `PROOF PREFERENCE: ${profile.proofPreference}`,
    `NARRATIVE: ${profile.narrativeAngle}`,
    `PRICE FRAMING: ${profile.priceFraming}`,
    `CTA STYLE: ${profile.ctaStyle}`,
    `NEVER MENTION: ${profile.avoidTopics.join("; ")}`,
  ].join("\n");
}
