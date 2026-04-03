/**
 * GHOST TAX — TIMING INTELLIGENCE
 *
 * Detects WHY NOW is the right moment to contact this prospect.
 * Not just "they're a good fit" but "they need this THIS WEEK."
 */

import type { ProspectData } from "./ai-writer";

export interface TimingSignal {
  signal: string;
  urgency: "critical" | "high" | "medium" | "low";
  narrative: string;          // How to frame "why now" in the message
  windowDays: number;         // How long this timing window stays open
}

export function detectTimingSignal(prospect: ProspectData): TimingSignal {
  const signals = prospect.signals || [];
  const now = new Date();

  // ── CRITICAL TIMING: New CFO (< 6 months) ──
  if (signals.some(s => /new.*(cfo|cio|cto)|executive.*change|c-suite.*hire/i.test(s))) {
    return {
      signal: "new_executive",
      urgency: "critical",
      narrative: `New ${prospect.title || "executive"} in role — wants to make an impact in the first 90 days. A €${["DE", "AT", "CH"].includes(prospect.country) ? "590" : "490"} report that reveals hidden costs is the perfect quick win for board credibility.`,
      windowDays: 90,
    };
  }

  // ── CRITICAL: Active cost-cutting ──
  if (signals.some(s => /cost.cut|layoff|restructur|efficiency|headcount.reduc/i.test(s))) {
    return {
      signal: "cost_cutting",
      urgency: "critical",
      narrative: "The company is actively looking for savings. Every EUR of IT waste found is a EUR that doesn't come from headcount reduction. This report answers 'where do we cut?' in 48 hours.",
      windowDays: 60,
    };
  }

  // ── HIGH: Recent funding ──
  if (signals.some(s => /fund|raised|series|invest|capital/i.test(s))) {
    const monthsSinceFunding = prospect.fundingDate
      ? Math.round((now.getTime() - new Date(prospect.fundingDate).getTime()) / (1000 * 60 * 60 * 24 * 30))
      : null;

    return {
      signal: "post_funding",
      urgency: "high",
      narrative: monthsSinceFunding && monthsSinceFunding < 6
        ? `${monthsSinceFunding} months post-funding: the hiring spree is adding tools faster than anyone tracks. The waste accumulates silently during exactly this growth phase.`
        : "Post-funding growth phase: budget available but burn rate pressure means every wasted EUR shortens the runway.",
      windowDays: 180,
    };
  }

  // ── HIGH: Vendor renewal signals ──
  if (signals.some(s => /renewal|contract|vendor.negoti|procurement/i.test(s))) {
    return {
      signal: "vendor_renewal",
      urgency: "high",
      narrative: "Vendor renewal window is open. Without benchmarks, the company renews at last year's (inflated) price. This report includes negotiation playbooks per vendor — leverage they don't have yet.",
      windowDays: 90,
    };
  }

  // ── HIGH: Hiring IT/Finance ──
  if (signals.some(s => /hiring.*(it|finance|finops|procurement)|job.*(it|finance)/i.test(s))) {
    return {
      signal: "hiring_signal",
      urgency: "high",
      narrative: "Hiring for IT/Finance roles signals that management knows there's a visibility gap. The report gives the incoming hire a head start — or shows the CFO they can get answers without the hire.",
      windowDays: 120,
    };
  }

  // ── MEDIUM: Compliance pressure ──
  if (signals.some(s => /compliance|dora|nis2|gdpr|audit|regulation/i.test(s))) {
    return {
      signal: "compliance_pressure",
      urgency: "medium",
      narrative: "Regulatory pressure (DORA, NIS2) forces IT spend visibility. The report maps the full IT footprint — a prerequisite for compliance that would otherwise take months internally.",
      windowDays: 180,
    };
  }

  // ── MEDIUM: M&A activity ──
  if (signals.some(s => /merger|acquisition|m&a|acquired|acquiring/i.test(s))) {
    return {
      signal: "m_and_a",
      urgency: "medium",
      narrative: "Post-M&A: two companies' tech stacks running in parallel. Duplication is guaranteed. The report quantifies exactly how much overlap exists — data the integration team needs immediately.",
      windowDays: 180,
    };
  }

  // ── MEDIUM: Fiscal year timing ──
  const month = now.getMonth(); // 0-11
  if (month >= 9 || month <= 1) { // Oct-Feb = budget season
    return {
      signal: "budget_season",
      urgency: "medium",
      narrative: "Budget planning season. The CFO is building next year's IT budget based on this year's numbers — but those numbers include 18-32% waste that nobody has quantified.",
      windowDays: 90,
    };
  }

  // ── LOW: General growth ──
  if (signals.some(s => /growth|scaling|expanding|hiring/i.test(s))) {
    return {
      signal: "general_growth",
      urgency: "low",
      narrative: "Growing company = growing IT spend. The question isn't whether there's waste — it's how much. Typically 18-32% for companies at this stage.",
      windowDays: 365,
    };
  }

  // ── Default: No specific timing ──
  return {
    signal: "no_specific_timing",
    urgency: "low",
    narrative: "No specific urgency signal detected. Lead with the scan findings — the data itself creates the urgency when the CFO sees the daily loss figure.",
    windowDays: 365,
  };
}

export function getTimingForPrompt(timing: TimingSignal): string {
  return [
    `TIMING SIGNAL: ${timing.signal.replace(/_/g, " ").toUpperCase()} (${timing.urgency} urgency)`,
    `WHY NOW: ${timing.narrative}`,
    `WINDOW: ${timing.windowDays} days before this signal loses relevance`,
  ].join("\n");
}
