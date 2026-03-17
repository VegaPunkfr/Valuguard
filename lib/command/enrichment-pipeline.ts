/**
 * GHOST TAX — ENRICHMENT PIPELINE
 *
 * The complete Sarah enrichment flow, chaining all engines:
 *
 *   Step 1: Signals captured (Exa) ← already exists
 *   Step 2: Thesis Engine (L1-L4)
 *   Step 3: Proof Engine (L5-L7)
 *   Step 4: Quality Gate (L8)
 *   Step 5: Message Generation (if gate passes)
 *
 * This is the ONLY authorized entry point for Sarah to produce outreach.
 * No shortcuts. No skipping steps.
 *
 * Result includes enrichment_status tracking for cockpit display.
 */

import type { Account, MessageVariant, OutreachChannel } from '@/types/command';
import type { SelectedAngle } from './angles';
import { selectAngle } from './angles';
import { buildAccountThesis, type ThesisResult } from './thesis-engine';
import { selectProofs, type ProofSelection } from './proof-engine';
import { evaluateQualityGate, type QualityGateResult } from './quality-gate';
import { processMessages } from './messages';

// ── Types ────────────────────────────────────────────────────

export type EnrichmentStatus =
  | 'pending'
  | 'signals_collected'
  | 'thesis_built'
  | 'proofs_selected'
  | 'quality_checked'
  | 'messages_generated'
  | 'ready_for_review'
  | 'blocked';

export interface EnrichmentResult {
  status: EnrichmentStatus;
  account: Account;
  angle: SelectedAngle;
  thesis: ThesisResult;
  proofs: ProofSelection;
  qualityGate: QualityGateResult;
  messages: MessageVariant[];
  enrichedAt: string;
  summary: string;
  nextSteps: string[];
}

// ── Pipeline Execution ───────────────────────────────────────

export function runEnrichmentPipeline(
  account: Account,
  preferredChannel?: OutreachChannel,
): EnrichmentResult {
  const now = new Date().toISOString();
  const nextSteps: string[] = [];

  // Step 1: Verify signals exist
  if (account.signals.length === 0) {
    const angle = selectAngle(account);
    const thesis = buildAccountThesis(account);
    const proofs = selectProofs(account, thesis);
    const qualityGate = evaluateQualityGate(account, thesis, proofs, angle, []);

    return {
      status: 'pending',
      account,
      angle,
      thesis,
      proofs,
      qualityGate,
      messages: [],
      enrichedAt: now,
      summary: 'No signals captured yet. Run Exa enrichment first.',
      nextSteps: ['Run Exa scan for company signals', 'Identify finance lead via people search', 'Resolve email via email-resolver'],
    };
  }

  // Step 2: Select angle
  const angle = selectAngle(account);

  // Step 3: Build thesis (L1-L4)
  const thesis = buildAccountThesis(account);

  if (!thesis.isReady) {
    nextSteps.push(...thesis.weaknesses.map(w => `Fix: ${w}`));
  }

  // Step 4: Select proofs (L5-L7)
  const proofs = selectProofs(account, thesis);

  if (!proofs.hasSufficientProof) {
    nextSteps.push('Strengthen proofs — run Exa scan or collect more signals');
  }

  // Step 5: Quality gate (L8)
  const qualityGate = evaluateQualityGate(account, thesis, proofs, angle, []);

  // Step 6: Generate messages (only if gate passes or is in review)
  let messages: MessageVariant[] = [];
  let status: EnrichmentStatus;

  if (qualityGate.verdict === 'block') {
    status = 'blocked';
    nextSteps.push(...qualityGate.hardBlocks.map(b => `BLOCKER: ${b}`));
    nextSteps.push(...qualityGate.warnings.map(w => `Warning: ${w}`));
  } else {
    // Generate messages
    const channel = preferredChannel || 'email';
    messages = processMessages(account, angle, channel);

    if (qualityGate.verdict === 'pass') {
      status = 'ready_for_review';
    } else {
      status = 'messages_generated';
      nextSteps.push('Quality gate in REVIEW — strengthen weak criteria before sending');
      nextSteps.push(...qualityGate.warnings.map(w => `Warning: ${w}`));
    }
  }

  // Summary
  const passedCriteria = qualityGate.criteria.filter(c => c.passed).length;
  const strongMessages = messages.filter(m => m.critique?.overallGrade === 'strong').length;
  const summary = [
    `Angle: ${angle.primary.label} (${angle.confidence}%)`,
    `Thesis: ${thesis.l4.strengthScore}/85`,
    `Proofs: ${proofs.selected.length} selected (${proofs.overallProofLevel}/85)`,
    `Quality gate: ${qualityGate.totalScore}/100 — ${qualityGate.verdict.toUpperCase()}`,
    messages.length > 0 ? `Messages: ${messages.length} generated (${strongMessages} strong)` : 'No messages generated',
    `Criteria: ${passedCriteria}/10 passed`,
  ].join(' | ');

  return {
    status,
    account,
    angle,
    thesis,
    proofs,
    qualityGate,
    messages,
    enrichedAt: now,
    summary,
    nextSteps,
  };
}

// ── Re-run after fixing issues ───────────────────────────────

export function revalidatePipeline(
  previous: EnrichmentResult,
  updatedAccount: Account,
): EnrichmentResult {
  return runEnrichmentPipeline(
    updatedAccount,
    previous.messages[0]?.channel,
  );
}
