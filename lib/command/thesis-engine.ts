/**
 * GHOST TAX — THESIS ENGINE (L1-L4)
 *
 * Builds a structured commercial thesis from raw signals.
 * Sarah MUST run this BEFORE drafting any outreach message.
 *
 * Framework:
 *   L1: Signal Capture — raw observed facts (source + date + confidence)
 *   L2: Fact vs Inference — strict separation observed/inferred/estimated
 *   L3: Account Reading — what's changing, the timing window
 *   L4: Commercial Thesis — 1 thesis (the "why now")
 *
 * Doctrine: Evidence before conclusions. Ranges, not point estimates.
 * Confidence caps at 85. Never overclaim.
 */

import type { Account, Signal } from '@/types/command';

// ── Types ────────────────────────────────────────────────────

export type EvidenceClass = 'observed' | 'inferred' | 'estimated';

export interface CapturedSignal {
  signal: Signal;
  evidenceClass: EvidenceClass;
  confidence: number; // 0-85
  ageInDays: number;
  isStale: boolean; // >90 days
}

export interface FactInferenceLayer {
  observed: string[];   // Hard facts with sources
  inferred: string[];   // Logical deductions from observed
  estimated: string[];  // Rough calculations, ranges
  separationQuality: number; // 0-100 — how cleanly separated
}

export interface AccountReading {
  whatIsChanging: string;
  timingWindow: string;       // e.g. "60-90 day window post-hiring"
  windowUrgency: 'closing' | 'open' | 'expanding';
  competitorRisk: string;     // what happens if they don't act
  internalDynamics: string;   // who's pushing for change internally
}

export interface CommercialThesis {
  thesis: string;             // 1 sentence — the "why now"
  whyNow: string;             // 2-3 sentences expanding the timing
  cfoPain: string;            // the specific CFO tension
  financialReading: string;   // the money angle (ranges)
  proofHook: string;          // what evidence makes this credible
  strengthScore: number;      // 0-85
}

export interface ThesisResult {
  l1: CapturedSignal[];
  l2: FactInferenceLayer;
  l3: AccountReading;
  l4: CommercialThesis;
  overallStrength: number;    // 0-85 (min of all layers)
  isReady: boolean;           // strength >= 50
  weaknesses: string[];
}

// ── L1: Signal Capture ───────────────────────────────────────

function captureSignals(account: Account): CapturedSignal[] {
  const now = Date.now();

  return account.signals.map(signal => {
    const signalDate = signal.date ? new Date(signal.date).getTime() : now;
    const ageInDays = Math.round((now - signalDate) / (1000 * 60 * 60 * 24));
    const isStale = ageInDays > 90;

    // Classify evidence
    let evidenceClass: EvidenceClass = 'estimated';
    if (signal.source === 'ghost-tax' || signal.source === 'stripe') {
      evidenceClass = 'observed'; // We directly observed it
    } else if (signal.source === 'exa' || signal.source === 'linkedin') {
      evidenceClass = signal.strength >= 4 ? 'observed' : 'inferred';
    } else if (signal.source === 'manual') {
      evidenceClass = 'observed';
    }

    // Confidence degrades with age
    const baseCf = Math.min(85, signal.strength * 17);
    const agePenalty = isStale ? 25 : ageInDays > 60 ? 15 : ageInDays > 30 ? 5 : 0;
    const confidence = Math.max(10, baseCf - agePenalty);

    return { signal, evidenceClass, confidence, ageInDays, isStale };
  });
}

// ── L2: Fact vs Inference Separation ─────────────────────────

function separateFactsAndInferences(
  captured: CapturedSignal[],
  account: Account,
): FactInferenceLayer {
  const observed: string[] = [];
  const inferred: string[] = [];
  const estimated: string[] = [];

  for (const c of captured) {
    const s = c.signal;
    const dated = s.date ? ` (${s.date})` : '';

    if (c.evidenceClass === 'observed') {
      observed.push(`${s.detail}${dated} [source: ${s.source}, strength: ${s.strength}/5]`);
    } else if (c.evidenceClass === 'inferred') {
      inferred.push(`${s.detail}${dated} — inferred from ${s.source} signals`);
    } else {
      estimated.push(`${s.detail}${dated} — estimated, needs validation`);
    }
  }

  // Add account-level inferences
  if (account.scan?.strengthensHypothesis) {
    observed.push(`Scan detected ${account.scan.vendorCount} vendors, ${account.scan.exposureLow}-${account.scan.exposureHigh} ${account.scan.currency} exposure`);
  }

  if (account.financeLead.name !== 'Unknown') {
    observed.push(`Contact identified: ${account.financeLead.name}, ${account.financeLead.title}`);
  } else {
    inferred.push('Finance lead not yet identified — need Exa people search');
  }

  // Revenue is always estimated
  if (account.revenueEstimate > 0) {
    estimated.push(`Estimated deal value: ${account.revenueEstimate} EUR (based on headcount + industry)`);
  }

  // Quality = ratio of observed to total
  const total = observed.length + inferred.length + estimated.length;
  const separationQuality = total > 0
    ? Math.min(85, Math.round((observed.length / total) * 100))
    : 0;

  return { observed, inferred, estimated, separationQuality };
}

// ── L3: Account Reading ──────────────────────────────────────

function readAccount(
  captured: CapturedSignal[],
  account: Account,
): AccountReading {
  // Determine what's changing
  const strongSignals = captured.filter(c => c.signal.strength >= 4);
  const freshSignals = captured.filter(c => !c.isStale);

  let whatIsChanging = 'General operational phase — no specific change detected.';
  let timingWindow = 'Indefinite — no urgency signal';
  let windowUrgency: AccountReading['windowUrgency'] = 'open';
  let competitorRisk = 'Low — no immediate threat of alternative action';
  let internalDynamics = 'Unknown — need deeper intelligence';

  // Read from signal types
  const signalTypes = new Set(captured.map(c => c.signal.type));

  if (signalTypes.has('executive')) {
    whatIsChanging = `New finance leadership at ${account.company}. Incoming leader will audit costs in first 90 days.`;
    timingWindow = '30-90 day window from appointment';
    windowUrgency = 'closing';
    competitorRisk = 'High — consulting firms and internal audit teams also target new CFO appointments';
    internalDynamics = 'New leader seeking quick wins to establish credibility';
  } else if (signalTypes.has('M&A')) {
    whatIsChanging = `Post-merger integration at ${account.company}. Two tech stacks running in parallel.`;
    timingWindow = '3-6 month integration window';
    windowUrgency = 'open';
    competitorRisk = 'Medium — Big 4 may already be advising on integration';
    internalDynamics = 'Board expects synergy numbers. Finance team under pressure to deliver.';
  } else if (signalTypes.has('restructuring')) {
    whatIsChanging = `Post-restructuring at ${account.company}. Headcount reduced but contracts unchanged.`;
    timingWindow = '60-120 day window before contracts auto-renew';
    windowUrgency = 'closing';
    competitorRisk = 'Low — few vendors target post-restructuring SaaS waste';
    internalDynamics = 'Finance team lean, bandwidth limited. External help is welcome, not threatening.';
  } else if (signalTypes.has('hiring')) {
    whatIsChanging = `${account.company} is building finance capacity. Current team stretched.`;
    timingWindow = '60-90 days — before new hire onboards and takes control';
    windowUrgency = 'closing';
    competitorRisk = 'Low — timing window is narrow and specific';
    internalDynamics = 'CFO recognizes gap (hence the hire). Open to tools that bridge the gap.';
  } else if (signalTypes.has('funding')) {
    whatIsChanging = `Post-funding scale phase at ${account.company}. Tools signed faster than reviewed.`;
    timingWindow = '6-12 months post-funding';
    windowUrgency = 'expanding';
    competitorRisk = 'Medium — VC portfolio services may recommend alternatives';
    internalDynamics = 'Board wants growth, CFO must balance spend discipline with velocity.';
  } else if (signalTypes.has('growth') || signalTypes.has('expansion')) {
    whatIsChanging = `${account.company} scaling rapidly. Software costs compounding.`;
    timingWindow = 'Ongoing — escalates quarterly';
    windowUrgency = 'expanding';
    competitorRisk = 'Low — cost drift is invisible until someone looks';
    internalDynamics = 'Growth-first culture. Cost control is secondary until board asks.';
  } else if (signalTypes.has('regulatory')) {
    whatIsChanging = `${account.company} under regulatory scrutiny. Cost discipline = credibility.`;
    timingWindow = 'Immediate — regulatory deadlines are fixed';
    windowUrgency = 'closing';
    competitorRisk = 'High — compliance consultants already in play';
    internalDynamics = 'Legal and finance aligned on need for evidence. External validation valuable.';
  } else if (freshSignals.length > 0) {
    const s = freshSignals[0].signal;
    whatIsChanging = `Recent activity at ${account.company}: ${s.detail.slice(0, 80)}`;
    timingWindow = 'Moderate — signal is fresh but window unclear';
    windowUrgency = 'open';
  }

  return { whatIsChanging, timingWindow, windowUrgency, competitorRisk, internalDynamics };
}

// ── L4: Commercial Thesis ────────────────────────────────────

function buildThesis(
  captured: CapturedSignal[],
  l2: FactInferenceLayer,
  l3: AccountReading,
  account: Account,
): CommercialThesis {
  const strongSignals = captured.filter(c => c.confidence >= 50 && !c.isStale);
  const bestSignal = strongSignals.sort((a, b) => b.confidence - a.confidence)[0];

  // Build the core thesis sentence
  let thesis: string;
  let cfoPain: string;
  let financialReading: string;
  let proofHook: string;

  if (account.scan?.strengthensHypothesis) {
    // Scan-backed thesis (strongest)
    const { vendorCount, exposureLow, exposureHigh, currency } = account.scan;
    thesis = `${account.company} has ${vendorCount} detected vendors with ${Math.round(exposureLow / 1000)}k-${Math.round(exposureHigh / 1000)}k ${currency} in estimated hidden exposure, in a timing window where action is possible.`;
    cfoPain = `Quantifiable waste that ${account.financeLead.name !== 'Unknown' ? account.financeLead.name : 'the finance lead'} can act on immediately.`;
    financialReading = `${vendorCount} vendors, ${Math.round(exposureLow / 1000)}k-${Math.round(exposureHigh / 1000)}k ${currency}/year in estimated waste. Daily cost of inaction: ${Math.round(exposureLow / 365)}-${Math.round(exposureHigh / 365)} ${currency}/day.`;
    proofHook = `External scan of ${account.domain} confirms the pattern.`;
  } else if (bestSignal) {
    // Signal-backed thesis
    const s = bestSignal.signal;
    thesis = `${account.company} is in a ${s.type} phase that typically creates 12-20% hidden SaaS waste, and the timing window for action is ${l3.windowUrgency === 'closing' ? 'closing' : 'open'}.`;
    cfoPain = `${l3.whatIsChanging.split('.')[0]}. ${account.financeLead.title || 'Finance'} team ${l3.windowUrgency === 'closing' ? 'must act before window closes' : 'has bandwidth to investigate'}.`;
    financialReading = `Based on ${account.employeeRange} employees in ${account.industry}: estimated 12-20% of annual SaaS spend at risk. For a company this size, that's typically 80k-250k EUR/year.`;
    proofHook = `${s.detail.split('.')[0]} — ${bestSignal.evidenceClass === 'observed' ? 'directly observed' : 'inferred from market signals'}.`;
  } else {
    // Weak thesis (needs more intelligence)
    thesis = `${account.company} shows general signals of hidden cost exposure, but the specific trigger is unclear.`;
    cfoPain = 'General cost drift — not specific enough for high-conviction outreach.';
    financialReading = 'Insufficient data for reliable financial estimate. Need scan or stronger signals.';
    proofHook = 'No strong proof yet. Run Exa scan to validate.';
  }

  const whyNow = `${l3.whatIsChanging} ${l3.timingWindow}. ${l3.competitorRisk.startsWith('High') ? 'Competitors may already be positioning.' : 'Few competitors target this specific moment.'}`;

  // Strength score
  const signalScore = strongSignals.length > 0 ? Math.min(25, strongSignals.length * 8) : 0;
  const separationScore = Math.round(l2.separationQuality * 0.2);
  const windowScore = l3.windowUrgency === 'closing' ? 20 : l3.windowUrgency === 'open' ? 10 : 15;
  const scanBonus = account.scan?.strengthensHypothesis ? 20 : 0;
  const strengthScore = Math.min(85, signalScore + separationScore + windowScore + scanBonus);

  return { thesis, whyNow, cfoPain, financialReading, proofHook, strengthScore };
}

// ── Main Entry Point ─────────────────────────────────────────

export function buildAccountThesis(account: Account): ThesisResult {
  // L1: Capture
  const l1 = captureSignals(account);

  // L2: Separate
  const l2 = separateFactsAndInferences(l1, account);

  // L3: Read
  const l3 = readAccount(l1, account);

  // L4: Thesis
  const l4 = buildThesis(l1, l2, l3, account);

  // Overall strength = minimum of all layers
  const l1Strength = l1.length > 0
    ? Math.min(85, Math.round(l1.reduce((s, c) => s + c.confidence, 0) / l1.length))
    : 0;
  const overallStrength = Math.min(85, Math.min(l1Strength, l2.separationQuality, l4.strengthScore));

  // Weaknesses
  const weaknesses: string[] = [];
  if (l1.length === 0) weaknesses.push('No signals captured — need Exa enrichment');
  if (l1.every(c => c.isStale)) weaknesses.push('All signals are stale (>90 days)');
  if (l2.observed.length === 0) weaknesses.push('No observed facts — thesis is entirely inferred');
  if (l2.separationQuality < 40) weaknesses.push('Poor fact/inference separation — strengthen evidence base');
  if (account.financeLead.name === 'Unknown') weaknesses.push('Contact not identified — cannot personalize');
  if (!account.scan?.strengthensHypothesis) weaknesses.push('No scan confirmation — hypothesis is theoretical');
  if (l3.windowUrgency !== 'closing') weaknesses.push('Timing window not urgent — lower priority');
  if (l4.strengthScore < 50) weaknesses.push('Thesis too weak for outreach — need more intelligence');

  return {
    l1, l2, l3, l4,
    overallStrength,
    isReady: overallStrength >= 50,
    weaknesses,
  };
}
