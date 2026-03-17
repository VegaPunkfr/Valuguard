/**
 * GHOST TAX — PROOF ENGINE (L5-L7)
 *
 * Selects, validates, and ranks the best 2-4 proofs for an account.
 * Proofs are the backbone of credible outreach — no proof = no send.
 *
 * L5: Select candidate proofs from thesis + signals
 * L6: Validate proof quality (confidence, freshness, specificity)
 * L7: Rank and attach to thesis
 *
 * Doctrine: 2-4 proofs max. Specific > generic. Observed > inferred.
 * Confidence caps at 85. Never overclaim.
 */

import type { Account, Signal } from '@/types/command';
import type {
  ThesisResult, CapturedSignal, EvidenceClass,
} from './thesis-engine';

// ── Types ────────────────────────────────────────────────────

export interface Proof {
  id: string;
  statement: string;          // Human-readable proof statement
  evidenceClass: EvidenceClass;
  confidence: number;         // 0-85
  source: string;
  date?: string;
  specificity: 'high' | 'medium' | 'low';
  category: ProofCategory;
  linkedSignal?: Signal;      // Original signal this proof derives from
}

export type ProofCategory =
  | 'scan_data'       // From Ghost Tax scan results
  | 'market_signal'   // From Exa/external intelligence
  | 'behavioral'      // From Ghost Tax platform behavior
  | 'financial'       // Financial data points
  | 'structural'      // Company structure/org changes
  | 'temporal';       // Timing-based evidence

export interface ProofValidation {
  proof: Proof;
  isValid: boolean;
  score: number;       // 0-100
  issues: string[];
}

export interface ProofSelection {
  selected: Proof[];           // 2-4 best proofs
  rejected: Proof[];           // Didn't make the cut
  validations: ProofValidation[];
  overallProofLevel: number;   // 0-85
  hasSufficientProof: boolean; // >= 2 valid proofs with score >= 50
  summary: string;
}

// ── L5: Proof Candidate Extraction ───────────────────────────

function uid(): string {
  return `prf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function extractProofCandidates(
  account: Account,
  thesis: ThesisResult,
): Proof[] {
  const proofs: Proof[] = [];

  // 1. Scan-based proofs (strongest)
  if (account.scan?.status === 'complete') {
    const s = account.scan;
    proofs.push({
      id: uid(),
      statement: `External scan of ${account.domain} detected ${s.vendorCount} vendors with ${Math.round(s.exposureLow / 1000)}k-${Math.round(s.exposureHigh / 1000)}k ${s.currency} in estimated exposure.`,
      evidenceClass: 'observed',
      confidence: Math.min(85, s.strengthensHypothesis ? 75 : 55),
      source: 'ghost-tax-scan',
      date: s.scannedAt?.split('T')[0],
      specificity: 'high',
      category: 'scan_data',
    });

    if (s.vendorCount > 10) {
      proofs.push({
        id: uid(),
        statement: `${s.vendorCount} distinct vendors detected — stack complexity is above average for ${account.employeeRange}-person companies.`,
        evidenceClass: 'inferred',
        confidence: 60,
        source: 'ghost-tax-scan',
        date: s.scannedAt?.split('T')[0],
        specificity: 'medium',
        category: 'structural',
      });
    }
  }

  // 2. Signal-based proofs
  for (const captured of thesis.l1) {
    const s = captured.signal;
    if (captured.isStale) continue; // Skip stale signals

    let statement: string;
    let category: ProofCategory;
    let specificity: Proof['specificity'];

    switch (s.type) {
      case 'hiring':
        statement = `${account.company} is actively hiring for ${s.detail.includes('VP') || s.detail.includes('Director') ? 'senior finance' : 'finance'} roles — current team is stretched.`;
        category = 'structural';
        specificity = s.strength >= 4 ? 'high' : 'medium';
        break;
      case 'executive':
        statement = `New ${s.detail.includes('CFO') ? 'CFO' : 'finance leadership'} appointment at ${account.company}. 90-day audit window is open.`;
        category = 'structural';
        specificity = 'high';
        break;
      case 'restructuring':
        statement = `${account.company} underwent restructuring. Headcount changed but annual SaaS contracts remain unchanged.`;
        category = 'structural';
        specificity = 'medium';
        break;
      case 'M&A':
        statement = `Post-merger at ${account.company}: two tech stacks in parallel. Board expects consolidation synergies.`;
        category = 'structural';
        specificity = 'high';
        break;
      case 'funding':
        statement = `Recent funding at ${account.company}. Scaling phase typically compounds SaaS spend 30-50% faster than revenue.`;
        category = 'financial';
        specificity = 'medium';
        break;
      case 'growth':
        statement = `${account.company} in high-growth phase. Software costs typically outpace headcount growth by 1.5-2x.`;
        category = 'financial';
        specificity = 'low';
        break;
      case 'payment':
        statement = `${account.company} already paid for Ghost Tax analysis — strong buying signal.`;
        category = 'behavioral';
        specificity = 'high';
        break;
      case 'intent':
        statement = `Detected intent signal from ${account.company}: ${s.detail.split(' — ')[0]}.`;
        category = 'behavioral';
        specificity = s.strength >= 4 ? 'medium' : 'low';
        break;
      default:
        statement = `Signal detected: ${s.detail.slice(0, 80)}.`;
        category = 'market_signal';
        specificity = 'low';
    }

    proofs.push({
      id: uid(),
      statement,
      evidenceClass: captured.evidenceClass,
      confidence: captured.confidence,
      source: s.source,
      date: s.date,
      specificity,
      category,
      linkedSignal: s,
    });
  }

  // 3. Behavioral proofs (from Ghost Tax platform)
  const platformSignals = thesis.l1.filter(c =>
    c.signal.source === 'ghost-tax' || c.signal.source === 'stripe'
  );
  if (platformSignals.length >= 2) {
    proofs.push({
      id: uid(),
      statement: `${account.company} showed ${platformSignals.length} distinct engagement signals on Ghost Tax — multi-touch interest pattern.`,
      evidenceClass: 'observed',
      confidence: Math.min(85, 40 + platformSignals.length * 10),
      source: 'ghost-tax',
      specificity: 'medium',
      category: 'behavioral',
    });
  }

  // 4. Timing proof
  if (thesis.l3.windowUrgency === 'closing') {
    proofs.push({
      id: uid(),
      statement: `Timing window is closing: ${thesis.l3.timingWindow}. Delay reduces leverage.`,
      evidenceClass: 'inferred',
      confidence: 55,
      source: 'thesis-engine',
      specificity: 'medium',
      category: 'temporal',
    });
  }

  return proofs;
}

// ── L6: Proof Validation ─────────────────────────────────────

function validateProof(proof: Proof): ProofValidation {
  const issues: string[] = [];
  let score = 0;

  // Confidence contributes 40% of score
  score += Math.round(proof.confidence * 0.4);

  // Specificity contributes 25%
  const specScore = { high: 25, medium: 15, low: 5 };
  score += specScore[proof.specificity];

  // Evidence class contributes 20%
  const evidenceScore = { observed: 20, inferred: 12, estimated: 5 };
  score += evidenceScore[proof.evidenceClass];

  // Recency contributes 15%
  if (proof.date) {
    const days = Math.round((Date.now() - new Date(proof.date).getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 14) score += 15;
    else if (days <= 30) score += 12;
    else if (days <= 60) score += 8;
    else if (days <= 90) score += 4;
    else {
      issues.push('Proof is stale (>90 days)');
      score += 1;
    }
  } else {
    score += 5; // Unknown date — neutral
  }

  // Validation checks
  if (proof.confidence < 30) issues.push('Confidence too low — proof is unreliable');
  if (proof.specificity === 'low') issues.push('Proof is too generic — needs specific data points');
  if (proof.evidenceClass === 'estimated') issues.push('Proof is estimated — upgrade with observed data');
  if (proof.statement.length < 20) issues.push('Proof statement too vague');

  const isValid = score >= 40 && issues.length <= 1;

  return { proof, isValid, score: Math.min(100, score), issues };
}

// ── L7: Proof Selection & Ranking ────────────────────────────

export function selectProofs(
  account: Account,
  thesis: ThesisResult,
): ProofSelection {
  // Extract candidates
  const candidates = extractProofCandidates(account, thesis);

  // Validate all
  const validations = candidates.map(validateProof);

  // Sort by score descending
  const sorted = [...validations].sort((a, b) => b.score - a.score);

  // Select top 2-4 valid proofs, diversifying categories
  const selected: Proof[] = [];
  const usedCategories = new Set<ProofCategory>();
  const rejected: Proof[] = [];

  for (const v of sorted) {
    if (selected.length >= 4) {
      rejected.push(v.proof);
      continue;
    }

    if (!v.isValid) {
      rejected.push(v.proof);
      continue;
    }

    // Prefer diversity — max 2 from same category
    const catCount = selected.filter(p => p.category === v.proof.category).length;
    if (catCount >= 2) {
      rejected.push(v.proof);
      continue;
    }

    selected.push(v.proof);
    usedCategories.add(v.proof.category);
  }

  // Overall proof level
  const avgScore = selected.length > 0
    ? Math.round(selected.reduce((s, p) => {
        const v = validations.find(val => val.proof.id === p.id);
        return s + (v?.score || 0);
      }, 0) / selected.length)
    : 0;
  const overallProofLevel = Math.min(85, avgScore);
  const hasSufficientProof = selected.length >= 2 && overallProofLevel >= 50;

  // Summary
  let summary: string;
  if (selected.length === 0) {
    summary = 'No valid proofs found. Enrich account with Exa scan before outreach.';
  } else if (!hasSufficientProof) {
    summary = `${selected.length} proof(s) found but insufficient quality (${overallProofLevel}/85). Need stronger evidence.`;
  } else {
    const categories = [...usedCategories].join(', ');
    summary = `${selected.length} proofs selected (${categories}). Proof level: ${overallProofLevel}/85. Ready for thesis integration.`;
  }

  return {
    selected,
    rejected,
    validations,
    overallProofLevel,
    hasSufficientProof,
    summary,
  };
}

// ── Convenience: Get proof statements for message generation ─

export function getProofStatements(selection: ProofSelection): string[] {
  return selection.selected.map(p => p.statement);
}

export function getBestProof(selection: ProofSelection): Proof | null {
  return selection.selected[0] || null;
}
