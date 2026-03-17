/**
 * GHOST TAX — QUALITY GATE (L8)
 *
 * The final checkpoint before ANY outreach is allowed.
 * Scores 10 criteria. Threshold: >= 70/100 to proceed.
 *
 * Sarah + Claude must BOTH score >= 70 (double validation).
 * If either fails, outreach is BLOCKED until issues are resolved.
 *
 * Non-negotiable rules:
 * - Never send to contact@ / info@ / no-reply@ (generic addresses)
 * - Never send without a full contact name
 * - Never send without at least 1 strong signal (>= 4/5)
 * - Never send to dropped/blocked accounts
 *
 * Confidence caps at 85. Score caps at 100.
 */

import type { Account, MessageVariant, EmailStatus } from '@/types/command';
import type { ThesisResult } from './thesis-engine';
import type { ProofSelection } from './proof-engine';
import type { SelectedAngle } from './angles';

// ── Types ────────────────────────────────────────────────────

export interface QualityCriterion {
  name: string;
  weight: number;       // Points possible (total = 100)
  score: number;        // Points earned
  passed: boolean;
  detail: string;
  isHardBlock: boolean; // If true, failing this = instant block
}

export type GateVerdict = 'pass' | 'review' | 'block';

export interface QualityGateResult {
  verdict: GateVerdict;
  totalScore: number;           // 0-100
  criteria: QualityCriterion[];
  hardBlocks: string[];         // Instant blockers
  warnings: string[];           // Non-blocking issues
  readyToSend: boolean;
  summary: string;
}

// ── Generic Email Detection ──────────────────────────────────

const GENERIC_PREFIXES = [
  'contact', 'info', 'hello', 'support', 'sales', 'admin',
  'office', 'team', 'help', 'noreply', 'no-reply', 'no_reply',
  'general', 'enquiries', 'billing', 'accounts', 'service',
  'reception', 'mail', 'webmaster', 'postmaster',
];

function isGenericEmail(email?: string): boolean {
  if (!email) return true;
  const prefix = email.split('@')[0].toLowerCase();
  return GENERIC_PREFIXES.some(g => prefix === g || prefix.startsWith(g + '.'));
}

// ── Email Quality Check ──────────────────────────────────────

const ACCEPTABLE_EMAIL_STATUS: EmailStatus[] = ['verified', 'likely_valid'];

function isEmailAcceptable(status?: EmailStatus): boolean {
  return !!status && ACCEPTABLE_EMAIL_STATUS.includes(status);
}

// ── Quality Gate Evaluation ──────────────────────────────────

export function evaluateQualityGate(
  account: Account,
  thesis: ThesisResult,
  proofs: ProofSelection,
  angle: SelectedAngle,
  messages: MessageVariant[],
): QualityGateResult {
  const criteria: QualityCriterion[] = [];
  const hardBlocks: string[] = [];
  const warnings: string[] = [];

  // ── Criterion 1: Email Status (15 pts, HARD BLOCK) ─────────
  {
    const email = account.financeLead.email;
    const status = account.financeLead.emailStatus;
    const hasEmail = !!email && email.length > 3;
    const isAcceptable = isEmailAcceptable(status);
    const isGeneric = isGenericEmail(email);

    let score = 0;
    let detail: string;
    let isHardBlock = false;

    if (!hasEmail) {
      detail = 'No email found. Cannot send.';
      isHardBlock = true;
      hardBlocks.push('No email address');
    } else if (isGeneric) {
      detail = `Generic email detected (${email}). Must resolve to personal address.`;
      isHardBlock = true;
      hardBlocks.push(`Generic email: ${email}`);
    } else if (!isAcceptable) {
      detail = `Email status "${status || 'unknown'}" — not reliable enough to send.`;
      score = 5;
      warnings.push(`Email status: ${status || 'unknown'}`);
    } else {
      detail = `Email verified: ${email} (${status})`;
      score = 15;
    }

    criteria.push({ name: 'Email Status', weight: 15, score, passed: score >= 10, detail, isHardBlock });
  }

  // ── Criterion 2: Contact Name (10 pts, HARD BLOCK) ─────────
  {
    const name = account.financeLead.name;
    const hasFullName = name && name !== 'Unknown' && name.split(' ').length >= 2;

    const score = hasFullName ? 10 : 0;
    const detail = hasFullName
      ? `Contact identified: ${name}, ${account.financeLead.title}`
      : 'Contact name missing or incomplete. Cannot personalize.';
    const isHardBlock = !hasFullName;

    if (isHardBlock) hardBlocks.push('Contact name unknown or incomplete');

    criteria.push({ name: 'Contact Identified', weight: 10, score, passed: !!hasFullName, detail, isHardBlock });
  }

  // ── Criterion 3: Signal Strength (15 pts) ──────────────────
  {
    const hasStrongSignal = account.signals.some(s => s.strength >= 4);
    const avgStrength = account.signals.length > 0
      ? account.signals.reduce((s, sig) => s + sig.strength, 0) / account.signals.length
      : 0;

    let score = 0;
    if (hasStrongSignal && avgStrength >= 3.5) score = 15;
    else if (hasStrongSignal) score = 12;
    else if (avgStrength >= 3) score = 8;
    else if (account.signals.length > 0) score = 4;

    const detail = account.signals.length === 0
      ? 'No signals detected.'
      : `${account.signals.length} signal(s), avg strength ${avgStrength.toFixed(1)}/5. ${hasStrongSignal ? 'Has strong signal (>=4).' : 'No strong signal.'}`;

    if (!hasStrongSignal) warnings.push('No signal with strength >= 4/5');

    criteria.push({ name: 'Signal Strength', weight: 15, score, passed: score >= 10, detail, isHardBlock: false });
  }

  // ── Criterion 4: Thesis Coherence (10 pts) ─────────────────
  {
    const thesisStrength = thesis.l4.strengthScore;
    const isReady = thesis.isReady;

    let score = 0;
    if (thesisStrength >= 60) score = 10;
    else if (thesisStrength >= 50) score = 8;
    else if (thesisStrength >= 35) score = 5;
    else score = 2;

    const detail = `Thesis strength: ${thesisStrength}/85. ${isReady ? 'Thesis is ready.' : 'Thesis needs strengthening.'}`;
    if (!isReady) warnings.push(`Thesis strength only ${thesisStrength}/85`);

    criteria.push({ name: 'Thesis Coherence', weight: 10, score, passed: score >= 7, detail, isHardBlock: false });
  }

  // ── Criterion 5: Proof Level (10 pts) ──────────────────────
  {
    const proofLevel = proofs.overallProofLevel;
    const hasSufficient = proofs.hasSufficientProof;

    let score = 0;
    if (proofLevel >= 60 && hasSufficient) score = 10;
    else if (proofLevel >= 50 && hasSufficient) score = 8;
    else if (proofLevel >= 40) score = 5;
    else if (proofs.selected.length > 0) score = 3;

    const detail = `${proofs.selected.length} proof(s) selected, level ${proofLevel}/85. ${hasSufficient ? 'Sufficient.' : 'Insufficient — need more evidence.'}`;
    if (!hasSufficient) warnings.push('Insufficient proof level');

    criteria.push({ name: 'Proof Level', weight: 10, score, passed: score >= 7, detail, isHardBlock: false });
  }

  // ── Criterion 6: Thesis References Signal (10 pts) ─────────
  {
    const thesisText = thesis.l4.thesis.toLowerCase();
    const mainSignalWords = account.mainSignal.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    const referencesSignal = mainSignalWords.some(w => thesisText.includes(w))
      || account.signals.some(s => thesisText.includes(s.type));

    const score = referencesSignal ? 10 : 3;
    const detail = referencesSignal
      ? 'Thesis references specific signal — coherent.'
      : 'Thesis disconnected from main signal. May feel generic.';

    if (!referencesSignal) warnings.push('Thesis does not reference main signal');

    criteria.push({ name: 'Signal-Thesis Link', weight: 10, score, passed: referencesSignal, detail, isHardBlock: false });
  }

  // ── Criterion 7: Account Not Blocked (5 pts, HARD BLOCK) ──
  {
    const isBlocked = account.attackability === 'blocked' || account.status === 'dropped';

    if (isBlocked) hardBlocks.push(`Account ${account.status === 'dropped' ? 'dropped' : 'blocked'}`);

    criteria.push({
      name: 'Account Status',
      weight: 5,
      score: isBlocked ? 0 : 5,
      passed: !isBlocked,
      detail: isBlocked ? 'Account is blocked or dropped.' : 'Account is active and attackable.',
      isHardBlock: isBlocked,
    });
  }

  // ── Criterion 8: Solofit (5 pts) ──────────────────────────
  {
    const fit = account.solofit;
    const scores = { ideal: 5, good: 4, stretch: 2, hard: 0 };
    const score = scores[fit];

    if (fit === 'hard') warnings.push('Account too large/complex for solofounder');

    criteria.push({
      name: 'Solofounder Fit',
      weight: 5,
      score,
      passed: score >= 3,
      detail: `Solofit: ${fit}. ${fit === 'hard' ? 'High risk of wasted effort.' : fit === 'stretch' ? 'Manageable but challenging.' : 'Good fit.'}`,
      isHardBlock: false,
    });
  }

  // ── Criterion 9: Angle Confidence (10 pts) ─────────────────
  {
    const confidence = angle.confidence;
    const isReady = angle.readyForOutreach;

    let score = 0;
    if (confidence >= 60 && isReady) score = 10;
    else if (confidence >= 50 && isReady) score = 8;
    else if (confidence >= 40) score = 5;
    else score = 2;

    const detail = `Angle: "${angle.primary.label}" (${confidence}% confidence). ${isReady ? 'Ready.' : angle.readyReason}`;
    if (!isReady) warnings.push(`Angle not ready: ${angle.readyReason}`);

    criteria.push({ name: 'Angle Confidence', weight: 10, score, passed: score >= 7, detail, isHardBlock: false });
  }

  // ── Criterion 10: Conviction Level (10 pts) ────────────────
  {
    const conv = account.conviction;
    const scores = { very_high: 10, high: 8, moderate: 5, low: 2 };
    const score = scores[conv];

    if (conv === 'low') warnings.push('Conviction too low — not enough evidence');

    criteria.push({
      name: 'Overall Conviction',
      weight: 10,
      score,
      passed: score >= 7,
      detail: `Conviction: ${conv}. ${conv === 'low' ? 'Insufficient evidence to justify outreach.' : 'Evidence supports thesis.'}`,
      isHardBlock: false,
    });
  }

  // ── Calculate Total ────────────────────────────────────────

  const totalScore = criteria.reduce((s, c) => s + c.score, 0);

  // Verdict
  let verdict: GateVerdict;
  if (hardBlocks.length > 0) {
    verdict = 'block';
  } else if (totalScore >= 70) {
    verdict = 'pass';
  } else if (totalScore >= 55) {
    verdict = 'review';
  } else {
    verdict = 'block';
  }

  const readyToSend = verdict === 'pass';

  // Summary
  let summary: string;
  if (verdict === 'pass') {
    summary = `Quality gate PASSED (${totalScore}/100). ${criteria.filter(c => c.passed).length}/10 criteria met. Ready for Hélène approval.`;
  } else if (verdict === 'review') {
    summary = `Quality gate REVIEW (${totalScore}/100). Close to threshold. ${warnings.length} warning(s): ${warnings.slice(0, 2).join('; ')}.`;
  } else {
    const blockReasons = hardBlocks.length > 0
      ? `Hard blocks: ${hardBlocks.join(', ')}.`
      : `Score too low (${totalScore}/100).`;
    summary = `Quality gate BLOCKED. ${blockReasons} Fix issues before outreach.`;
  }

  return {
    verdict,
    totalScore,
    criteria,
    hardBlocks,
    warnings,
    readyToSend,
    summary,
  };
}

// ── Convenience: Quick check (no thesis/proof required) ──────

export function quickQualityCheck(account: Account): {
  canProceed: boolean;
  blockers: string[];
} {
  const blockers: string[] = [];

  if (account.status === 'dropped') blockers.push('Account dropped');
  if (account.attackability === 'blocked') blockers.push('Account blocked');
  if (!account.financeLead.email) blockers.push('No email');
  if (isGenericEmail(account.financeLead.email)) blockers.push('Generic email');
  if (account.financeLead.name === 'Unknown') blockers.push('Contact unknown');
  if (account.signals.length === 0) blockers.push('No signals');
  if (!account.signals.some(s => s.strength >= 4)) blockers.push('No strong signal');
  if (account.solofit === 'hard') blockers.push('Solofit too hard');
  if (account.conviction === 'low') blockers.push('Conviction too low');

  return { canProceed: blockers.length === 0, blockers };
}
