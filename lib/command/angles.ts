/**
 * GHOST TAX — ANGLE ENGINE
 *
 * Signal → CFO Interpretation → Angle → Message
 *
 * This is the brain behind outreach quality.
 * An angle is not a template. It's a specific reading of
 * why THIS company, THIS person, THIS moment matters.
 */

import type { Account, Signal } from '@/types/command';

// ── Angle Patterns ───────────────────────────────────────
// Internal patterns — never surface as visible templates

export type AngleType =
  | 'new_cfo_audit'
  | 'finance_hiring_gap'
  | 'post_restructuring_zombies'
  | 'post_merger_duplication'
  | 'scale_cost_drift'
  | 'scan_confirmed_exposure'
  | 'regulatory_cost_pressure'
  | 'expansion_stack_split'
  | 'ironic_self_audit';

interface AnglePattern {
  type: AngleType;
  label: string;
  cfoTension: string;
  financialReading: string;
  bestOpener: string;
  avoid: string;
  minSignalStrength: number;
}

const PATTERNS: AnglePattern[] = [
  {
    type: 'finance_hiring_gap',
    label: 'Finance team scaling gap',
    cfoTension: 'CFO alone, building finance function. Lacks bandwidth to audit costs while scaling.',
    financialReading: 'Fast-growing companies without finance depth carry 12-20% invisible SaaS waste. Nobody is watching the spend grow.',
    bestOpener: 'Reference the specific job posting. Offer scan as day-1 baseline for incoming hire.',
    avoid: 'Don\'t imply the CFO is incompetent. Frame as bandwidth, not ability.',
    minSignalStrength: 4,
  },
  {
    type: 'new_cfo_audit',
    label: 'New CFO 90-day audit',
    cfoTension: 'New CFO inheriting a stack built for speed, not cost discipline. Needs quick wins for board credibility.',
    financialReading: 'First 90 days = every CFO audits costs. An external scan accelerates this by months.',
    bestOpener: 'Congratulate on role. Reference their background. Offer scan as diagnostic shortcut.',
    avoid: 'Don\'t lecture on what a new CFO should do. They know. Offer a tool, not advice.',
    minSignalStrength: 4,
  },
  {
    type: 'post_restructuring_zombies',
    label: 'Post-restructuring zombie licenses',
    cfoTension: 'Headcount reduced but SaaS contracts are annual. Departed employees\' tools still billing.',
    financialReading: 'When 30%+ of headcount leaves, 15-25% of remaining software budget is zombie spend. Contracts don\'t auto-adjust.',
    bestOpener: 'State the factual gap: headcount down X%, but contracts unchanged. Offer to quantify the delta.',
    avoid: 'Don\'t be insensitive about layoffs. Focus on cost control, not the human cost.',
    minSignalStrength: 4,
  },
  {
    type: 'post_merger_duplication',
    label: 'Post-merger stack overlap',
    cfoTension: 'Two companies merged = two complete tech stacks. Board expects synergies.',
    financialReading: 'Post-merger, 20-30% of SaaS spend is duplicated. Every month of parallelism = wasted cash.',
    bestOpener: 'Reference the specific merger. Frame scan as synergy quantification for board reporting.',
    avoid: 'Don\'t oversimplify integration complexity. Acknowledge it\'s hard, offer clarity.',
    minSignalStrength: 3,
  },
  {
    type: 'scale_cost_drift',
    label: 'Scaling cost drift',
    cfoTension: 'Revenue growing fast but software costs growing faster. Per-employee spend climbing invisibly.',
    financialReading: 'At 30%+ growth, tools get signed in sprints and never revisited. The stack compounds.',
    bestOpener: 'Reference the growth rate. Ask who is watching the cost-per-employee trend.',
    avoid: 'Don\'t make it sound like they\'re wasteful. Frame as natural consequence of speed.',
    minSignalStrength: 3,
  },
  {
    type: 'regulatory_cost_pressure',
    label: 'Regulatory cost scrutiny',
    cfoTension: 'Regulator requires demonstrable cost control. Every waste euro damages credibility.',
    financialReading: 'Under regulatory pressure, CFOs need proof of cost discipline. An external scan provides audit-grade evidence.',
    bestOpener: 'Reference the specific regulatory situation. Frame scan as compliance evidence.',
    avoid: 'Don\'t threaten with regulatory consequences. Offer a tool for demonstrating control.',
    minSignalStrength: 4,
  },
  {
    type: 'expansion_stack_split',
    label: 'Multi-market expansion split',
    cfoTension: 'Expanding to new markets means new compliance, new cloud regions, new ops tools. Stack doubles before anyone notices.',
    financialReading: 'Each new market typically adds 20-30% to SaaS stack. EU+US doubly so due to compliance divergence.',
    bestOpener: 'Reference the specific expansion. Point to the EU/US stack split as natural cost multiplier.',
    avoid: 'Don\'t imply expansion is bad. Frame waste detection as enabling faster, cleaner scaling.',
    minSignalStrength: 3,
  },
  {
    type: 'ironic_self_audit',
    label: 'Ironic self-audit (spend management companies)',
    cfoTension: 'Company sells cost control but its own stack may be unaudited during growth.',
    financialReading: 'The cobbler\'s children go barefoot. Spend management companies growing fast often have their own blind spots.',
    bestOpener: 'Ask the honest question directly. It\'s disarming because it\'s fair.',
    avoid: 'Don\'t be condescending. It must feel like a genuine, respectful challenge.',
    minSignalStrength: 3,
  },
  {
    type: 'scan_confirmed_exposure',
    label: 'Scan-confirmed exposure',
    cfoTension: 'A scan has revealed quantifiable exposure. The hypothesis is no longer theoretical.',
    financialReading: 'Scan data shows X vendors, Y-Z€ estimated exposure. The conversation now has proof.',
    bestOpener: 'Lead with the specific scan findings. Numbers first, then interpretation.',
    avoid: 'Don\'t oversell the scan accuracy. Frame as estimate requiring validation.',
    minSignalStrength: 3,
  },
];

// ── Angle Selection ──────────────────────────────────────

export interface SelectedAngle {
  primary: AnglePattern;
  secondary?: AnglePattern;
  confidence: number; // 0-100
  reasoning: string;
  whyNotOthers: string;
  readyForOutreach: boolean;
  readyReason: string;
}

const SIGNAL_TO_ANGLE: Record<string, AngleType[]> = {
  hiring: ['finance_hiring_gap', 'scale_cost_drift'],
  executive: ['new_cfo_audit'],
  restructuring: ['post_restructuring_zombies', 'regulatory_cost_pressure'],
  'M&A': ['post_merger_duplication'],
  funding: ['scale_cost_drift'],
  growth: ['scale_cost_drift'],
  expansion: ['expansion_stack_split'],
  regulatory: ['regulatory_cost_pressure', 'post_restructuring_zombies'],
  transformation: ['ironic_self_audit', 'scale_cost_drift'],
  divestment: ['post_restructuring_zombies'],
  complexity: ['scale_cost_drift'],
  geography: ['expansion_stack_split'],
};

export function selectAngle(account: Account): SelectedAngle {
  const candidates = new Map<AngleType, number>();

  // Score each angle based on signal matches
  for (const signal of account.signals) {
    const angleTypes = SIGNAL_TO_ANGLE[signal.type] || [];
    for (const at of angleTypes) {
      const pattern = PATTERNS.find(p => p.type === at);
      if (pattern && signal.strength >= pattern.minSignalStrength) {
        candidates.set(at, (candidates.get(at) || 0) + signal.strength);
      }
    }
  }

  // Industry-specific boosts
  if (account.industry.toLowerCase().includes('expense') || account.industry.toLowerCase().includes('spend')) {
    candidates.set('ironic_self_audit', (candidates.get('ironic_self_audit') || 0) + 3);
  }
  if (account.industry.toLowerCase().includes('pricing')) {
    candidates.set('ironic_self_audit', (candidates.get('ironic_self_audit') || 0) + 2);
  }

  // Scan result boost
  if (account.scan?.strengthensHypothesis) {
    candidates.set('scan_confirmed_exposure', (candidates.get('scan_confirmed_exposure') || 0) + 5);
  }

  // Sort by score
  const sorted = [...candidates.entries()].sort((a, b) => b[1] - a[1]);
  const primaryType = sorted[0]?.[0] || 'scale_cost_drift';
  const secondaryType = sorted[1]?.[0];

  const primary = PATTERNS.find(p => p.type === primaryType) || PATTERNS[4]; // fallback: scale_cost_drift
  const secondary = secondaryType ? PATTERNS.find(p => p.type === secondaryType) : undefined;

  // Confidence
  const primaryScore = sorted[0]?.[1] || 0;
  const confidence = Math.min(85, Math.round(primaryScore * 12 + (account.scan?.strengthensHypothesis ? 15 : 0)));

  // Readiness
  const hasStrongSignal = account.signals.some(s => s.strength >= 4);
  const hasAngle = confidence >= 40;
  const notBlocked = account.attackability !== 'blocked';
  const readyForOutreach = hasStrongSignal && hasAngle && notBlocked;

  const readyReason = !hasStrongSignal
    ? 'Strongest signal is below threshold (< 4/5). Need stronger evidence.'
    : !hasAngle
    ? 'Angle confidence too low (< 40%). Signal doesn\'t clearly translate to a CFO pain point.'
    : !notBlocked
    ? 'Account is blocked. Resolve blocker before outreach.'
    : 'Signal, angle, and timing align. Safe to send.';

  // Reasoning
  const rejected = PATTERNS.filter(p => p.type !== primaryType && p.type !== secondaryType).slice(0, 2);
  const whyNotOthers = rejected.map(r => `${r.label}: ${account.signals.every(s => !SIGNAL_TO_ANGLE[s.type]?.includes(r.type)) ? 'No matching signal' : 'Weaker signal match'}`).join('. ');

  return {
    primary,
    secondary,
    confidence,
    reasoning: `Primary signal "${account.signals[0]?.type || 'unknown'}" (strength ${account.signals[0]?.strength || 0}/5) maps to "${primary.label}". ${account.scan?.strengthensHypothesis ? 'Scan data confirms hypothesis.' : 'No scan confirmation yet.'} CFO tension: ${primary.cfoTension.slice(0, 80)}...`,
    whyNotOthers,
    readyForOutreach,
    readyReason,
  };
}

// ── Message Critique ─────────────────────────────────────

export interface MessageCritique {
  isGeneric: boolean;
  isTooLong: boolean;
  exploitsSignal: boolean;
  angleCoherent: boolean;
  cfoTone: boolean;
  hasReasonToReply: boolean;
  overallGrade: 'strong' | 'acceptable' | 'weak' | 'rewrite';
  issues: string[];
}

export function critiqueMessage(body: string, account: Account, angle: AnglePattern): MessageCritique {
  const issues: string[] = [];

  // Check signal exploitation
  const mainSignalWords = account.mainSignal.toLowerCase().split(/\s+/).filter(w => w.length > 4);
  const bodyLower = body.toLowerCase();
  const exploitsSignal = mainSignalWords.some(w => bodyLower.includes(w));
  if (!exploitsSignal) issues.push('Message doesn\'t reference the specific signal that triggered outreach.');

  // Check genericity
  const genericPhrases = ['we help companies', 'hope you are well', 'i wanted to reach out', 'touching base', 'just checking in', 'save money', 'reduce costs', 'best practices'];
  const isGeneric = genericPhrases.some(p => bodyLower.includes(p));
  if (isGeneric) issues.push('Contains generic phrases. Rewrite to be more specific.');

  // Check length
  const wordCount = body.split(/\s+/).length;
  const isTooLong = wordCount > 200;
  if (isTooLong) issues.push(`Too long (${wordCount} words). Target: under 150 for LinkedIn, under 200 for email.`);

  // Check angle coherence
  const angleLower = angle.label.toLowerCase();
  const angleCoherent = bodyLower.includes(account.financeLead.name.split(' ')[0].toLowerCase()) || mainSignalWords.some(w => bodyLower.includes(w));
  if (!angleCoherent) issues.push('Angle doesn\'t appear connected to the message content.');

  // Check CFO tone
  const salesy = ['amazing', 'incredible', 'game-changing', 'revolutionary', 'exclusive offer', 'limited time', 'act now', 'don\'t miss'];
  const cfoTone = !salesy.some(p => bodyLower.includes(p));
  if (!cfoTone) issues.push('Tone too salesy for CFO audience.');

  // Check reason to reply
  const hasQuestion = body.includes('?');
  const hasReasonToReply = hasQuestion;
  if (!hasReasonToReply) issues.push('No clear question or call-to-action. CFO has no reason to respond.');

  // Grade
  const score = [!isGeneric, !isTooLong, exploitsSignal, angleCoherent, cfoTone, hasReasonToReply].filter(Boolean).length;
  const overallGrade: MessageCritique['overallGrade'] = score >= 5 ? 'strong' : score >= 4 ? 'acceptable' : score >= 3 ? 'weak' : 'rewrite';

  return { isGeneric, isTooLong, exploitsSignal, angleCoherent, cfoTone, hasReasonToReply, overallGrade, issues };
}

// ── Export all patterns for display ──────────────────────

export function getAnglePatterns(): AnglePattern[] { return PATTERNS; }
