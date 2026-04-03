/**
 * GHOST TAX — COMPANY INTELLIGENCE
 *
 * Detects the STAGE of a company's lifecycle and what it implies
 * for their IT spend waste patterns. Not just "headcount 220" —
 * but "post-Series B scale-up where nobody consolidates."
 */

import type { ProspectData } from "./ai-writer";

export interface CompanyStage {
  stage: "seed" | "series_a" | "series_b" | "series_c_plus" | "growth" | "mature" | "restructuring";
  implication: string;          // What this stage means for IT waste
  boardPressure: string;        // What the board is likely asking
  wastePattern: string;         // Typical waste pattern at this stage
  budgetDynamic: string;        // How the IT budget behaves
}

export function detectCompanyStage(prospect: ProspectData): CompanyStage {
  const signals = prospect.signals || [];
  const headcount = prospect.headcount || 0;
  const funding = prospect.fundingRound?.toLowerCase() || "";

  // ── Restructuring (cost-cutting signals) ──
  if (signals.some(s => /cost.cut|layoff|restructur|downsize/i.test(s))) {
    return {
      stage: "restructuring",
      implication: "The company is actively cutting costs. Every EUR of waste found is a EUR saved from layoffs.",
      boardPressure: "The board demands 15-25% cost reduction across all departments.",
      wastePattern: "Legacy tools from the growth phase that nobody dared to cut. Zombie licenses from departed employees. Contracts auto-renewed during the chaos.",
      budgetDynamic: "Budget shrinking 10-20% but commitments locked. The gap between contracted and needed is at its widest.",
    };
  }

  // ── Series B/C (recent funding) ──
  if (funding.includes("series b") || funding.includes("series c") ||
      signals.some(s => /funding|raised|series/i.test(s))) {
    const round = funding.includes("c") ? "series_c_plus" : "series_b";
    return {
      stage: round,
      implication: `Post-${funding || "funding"}: rapid hiring means each new team lead picks their own tools. Nobody consolidates the tools from the previous phase.`,
      boardPressure: "Board wants path to profitability. Revenue growth is expected but so is unit economics improvement. IT spend growing 40%/year raises questions.",
      wastePattern: "Tool proliferation: 3 project management tools, 2 CRMs, multiple AI coding assistants. Each department operates its own stack. Shadow IT peaks at this stage.",
      budgetDynamic: "Budget grows 30-50%/year with hiring, but waste grows 60%+ because nobody tracks the cumulative cost of individual tool decisions.",
    };
  }

  // ── Series A ──
  if (funding.includes("series a") || (headcount >= 30 && headcount <= 100)) {
    return {
      stage: "series_a",
      implication: "Early scaling. The founding team's tools are being replaced by 'proper' enterprise tools, but the old ones are still running (and billing).",
      boardPressure: "Board focused on growth metrics. IT cost isn't a board topic yet — which is exactly why waste accumulates unnoticed.",
      wastePattern: "Dual tooling: free-tier tools from the seed phase running alongside paid enterprise versions. Nobody cancelled the old ones.",
      budgetDynamic: "IT spend growing organically without central governance. No procurement process yet.",
    };
  }

  // ── Seed/Early ──
  if (funding.includes("seed") || funding.includes("pre-seed") || headcount < 30) {
    return {
      stage: "seed",
      implication: "Small team, every EUR matters. Waste is low in absolute terms but high as percentage of revenue.",
      boardPressure: "Investors want runway extension. Every unnecessary subscription is runway burned.",
      wastePattern: "Free trials that converted to paid without anyone noticing. Founder's personal subscriptions billed to the company.",
      budgetDynamic: "No IT budget per se. Tools are added ad-hoc, rarely reviewed.",
    };
  }

  // ── Growth (200-1000, no recent funding) ──
  if (headcount >= 200 && headcount <= 1000) {
    return {
      stage: "growth",
      implication: "Established company with departmental silos. Each department has its own tool stack. Cross-department visibility is zero.",
      boardPressure: "Board expects operational efficiency. IT is seen as a cost center. CFO is measured on margin improvement.",
      wastePattern: "Departmental silos: marketing has its stack, sales has its stack, engineering has its stack. Nobody sees the overlap. Auto-renewals run on autopilot.",
      budgetDynamic: "IT budget formalized but based on historical + 10%. Nobody questions the baseline — the waste is baked in.",
    };
  }

  // ── Mature (1000+) ──
  if (headcount > 1000) {
    return {
      stage: "mature",
      implication: "Large enterprise with complex IT governance. Waste is structural — embedded in multi-year contracts and organizational inertia.",
      boardPressure: "Board wants digital transformation ROI. CIO is under pressure to modernize AND cut costs simultaneously.",
      wastePattern: "Legacy contracts from 3-5 years ago that nobody renegotiated. M&A leftovers: acquired companies' tool stacks still running in parallel. Compliance-driven over-provisioning.",
      budgetDynamic: "IT budget in the millions. 1% waste = tens of thousands. But the budget is so large that waste hides in the noise.",
    };
  }

  // Default
  return {
    stage: "growth",
    implication: "Mid-market company where IT spend grows faster than IT governance.",
    boardPressure: "Management wants cost transparency without a 6-month consulting project.",
    wastePattern: "A mix of shadow IT, auto-renewed contracts, and tools adopted during rapid growth phases.",
    budgetDynamic: "IT budget growing but nobody has mapped what's actually used vs what's just billing.",
  };
}

export function getStageForPrompt(stage: CompanyStage): string {
  return [
    `STAGE: ${stage.stage.replace(/_/g, " ").toUpperCase()}`,
    `IMPLICATION: ${stage.implication}`,
    `BOARD PRESSURE: ${stage.boardPressure}`,
    `TYPICAL WASTE: ${stage.wastePattern}`,
    `BUDGET DYNAMIC: ${stage.budgetDynamic}`,
  ].join("\n");
}
