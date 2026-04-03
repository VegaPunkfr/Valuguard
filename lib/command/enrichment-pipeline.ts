/**
 * GHOST TAX — ENRICHMENT PIPELINE (v2 — FLYWHEEL EDITION)
 *
 * The complete enrichment flow with REAL scan data + AI messages:
 *
 *   Step 1: Signals captured (existing)
 *   Step 2: SCAN domain via /api/intel → real exposure data (FIL 1: NEW)
 *   Step 3: Select angle (existing)
 *   Step 4: Build thesis with SCAN DATA (FIL 1: WIRED)
 *   Step 5: Select proofs from SCAN SIGNALS (FIL 1: WIRED)
 *   Step 6: Quality gate — graduated (FIL 6: MODIFIED)
 *   Step 7: AI-generated message with 6 intelligence layers (FIL 2: NEW)
 *   Step 8: Store scan in market memory (FIL 4: NEW)
 *
 * This is the ONLY authorized entry point to produce outreach.
 */

import type { Account, MessageVariant, OutreachChannel } from '@/types/command';
import type { SelectedAngle } from './angles';
import { selectAngle } from './angles';
import { buildAccountThesis, type ThesisResult } from './thesis-engine';
import { selectProofs, type ProofSelection } from './proof-engine';
import { evaluateQualityGate, type QualityGateResult } from './quality-gate';
import { processMessages } from './messages';
import { generatePersonalizedMessage, generateFullSequence, type ProspectData, type ScanData, type GeneratedMessage } from './ai-writer';
// Channel recommendation handled by channels.ts (called separately)

// ── Types ────────────────────────────────────────────────────

export type EnrichmentStatus =
  | 'pending'
  | 'scanning'
  | 'signals_collected'
  | 'thesis_built'
  | 'proofs_selected'
  | 'quality_checked'
  | 'messages_generated'
  | 'ready_for_review'
  | 'auto_send'
  | 'needs_enrichment'
  | 'snoozed'
  | 'blocked';

export interface EnrichmentResult {
  status: EnrichmentStatus;
  account: Account;
  angle: SelectedAngle;
  thesis: ThesisResult;
  proofs: ProofSelection;
  qualityGate: QualityGateResult;
  messages: MessageVariant[];
  aiMessages?: GeneratedMessage[];    // NEW: AI-generated personalized messages
  scanData?: ScanData;                // NEW: Real scan results
  enrichedAt: string;
  summary: string;
  nextSteps: string[];
}

// ── FIL 1: Scan a domain via /api/intel ─────────────────────

async function scanDomain(domain: string): Promise<ScanData | null> {
  try {
    const res = await fetch(`/api/intel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, corporate_id: '' }),
    });

    if (!res.ok) return null;

    // Parse NDJSON stream to extract final results
    const reader = res.body?.getReader();
    if (!reader) return null;

    const decoder = new TextDecoder();
    let buffer = '';
    let exposure: any = null;
    let lossVelocity: any = null;
    let proof: any = null;
    let confidence: any = null;
    let peerComparison: any = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.phase === 'exposure') exposure = parsed.data;
          if (parsed.phase === 'lossVelocity') lossVelocity = parsed.data;
          if (parsed.phase === 'proof') proof = parsed.data;
          if (parsed.phase === 'confidenceModel') confidence = parsed.data;
          if (parsed.phase === 'peerComparison') peerComparison = parsed.data;
        } catch { /* skip malformed lines */ }
      }
    }

    if (!exposure) return null;

    // Build ScanData from pipeline results
    const signals = (proof?.signals || []).slice(0, 5).map((s: any) => ({
      label: s.label || s.type || 'Unknown signal',
      impactLow: s.impactEurRange?.[0] || 0,
      impactHigh: s.impactEurRange?.[1] || 0,
      evidenceClass: s.evidence?.[0]?.includes('observed') ? 'observed' as const
        : s.evidence?.[0]?.includes('inferred') ? 'inferred' as const
        : 'estimated' as const,
    }));

    return {
      exposureLow: exposure.lowEur || 0,
      exposureHigh: exposure.highEur || 0,
      dailyLoss: lossVelocity?.dailyLossEur
        ? Math.round((lossVelocity.dailyLossEur[0] + lossVelocity.dailyLossEur[1]) / 2)
        : Math.round(((exposure.lowEur || 0) + (exposure.highEur || 0)) / 2 / 365),
      confidence: confidence?.overallConfidence || exposure.confidence || 50,
      signals,
      percentile: peerComparison?.efficiencyPercentile || undefined,
    };
  } catch {
    return null;
  }
}

// ── FIL 4: Store scan in market memory ──────────────────────

function storeInMarketMemory(account: Account, scanData: ScanData): void {
  try {
    const MEMORY_KEY = 'gt-market-memory';
    const stored = typeof window !== 'undefined' ? localStorage.getItem(MEMORY_KEY) : null;
    const memory: Array<{ industry: string; country: string; headcount: number; exposureLow: number; exposureHigh: number; date: string }> =
      stored ? JSON.parse(stored) : [];

    memory.push({
      industry: (account as any).industry || 'unknown',
      country: (account as any).country || 'unknown',
      headcount: (account as any).headcount || 0,
      exposureLow: scanData.exposureLow,
      exposureHigh: scanData.exposureHigh,
      date: new Date().toISOString(),
    });

    // Keep last 500 data points
    if (memory.length > 500) memory.splice(0, memory.length - 500);

    if (typeof window !== 'undefined') {
      localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
    }
  } catch { /* non-blocking */ }
}

// ── Convert Account to ProspectData for AI writer ───────────

function accountToProspect(account: Account): ProspectData {
  return {
    firstName: (account as any).contactName?.split(' ')[0] || (account as any).name?.split(' ')[0] || '',
    lastName: (account as any).contactName?.split(' ').slice(1).join(' ') || '',
    title: (account as any).contactTitle || '',
    company: (account as any).name || account.domain,
    domain: account.domain,
    country: (account as any).country || 'DE',
    headcount: (account as any).headcount,
    industry: (account as any).industry,
    linkedinUrl: (account as any).contactLinkedin || undefined,
    signals: account.signals?.map((s: any) => typeof s === 'string' ? s : s.type || s.label || '') || [],
    fundingRound: account.signals?.find((s: any) => /fund|series/i.test(s?.type || s || '')) ? 'Series B' : undefined,
  };
}

// ── Pipeline Execution (v2 — with scan + AI messages) ───────

export async function runEnrichmentPipelineV2(
  account: Account,
  preferredChannel?: OutreachChannel,
): Promise<EnrichmentResult> {
  const now = new Date().toISOString();
  const nextSteps: string[] = [];

  // Step 1: Verify signals exist
  if (!account.signals || account.signals.length === 0) {
    const angle = selectAngle(account);
    const thesis = buildAccountThesis(account);
    const proofs = selectProofs(account, thesis);
    const qualityGate = evaluateQualityGate(account, thesis, proofs, angle, []);

    return {
      status: 'pending',
      account, angle, thesis, proofs, qualityGate,
      messages: [],
      enrichedAt: now,
      summary: 'No signals. Run scan first.',
      nextSteps: ['Scan domain via /intel', 'Search Apollo for contacts'],
    };
  }

  // Step 2: SCAN DOMAIN (FIL 1 — real data)
  let scanData: ScanData | null = null;
  if (account.domain) {
    scanData = await scanDomain(account.domain);
    if (scanData) {
      // Inject scan data into account for thesis engine
      (account as any).scanExposureLow = scanData.exposureLow;
      (account as any).scanExposureHigh = scanData.exposureHigh;
      (account as any).scanDailyLoss = scanData.dailyLoss;
      (account as any).scanConfidence = scanData.confidence;
      (account as any).scanSignals = scanData.signals;

      // FIL 4: Store in market memory
      storeInMarketMemory(account, scanData);
    }
  }

  // Step 3: Select angle
  const angle = selectAngle(account);

  // Step 4: Build thesis (now enriched with scan data via account)
  const thesis = buildAccountThesis(account);

  // Step 5: Select proofs
  const proofs = selectProofs(account, thesis);

  // Step 6: Quality gate (graduated)
  const qualityGate = evaluateQualityGate(account, thesis, proofs, angle, []);

  // Step 7: Generate messages
  let messages: MessageVariant[] = [];
  let aiMessages: GeneratedMessage[] = [];
  let status: EnrichmentStatus;

  if (qualityGate.verdict === 'snooze') {
    status = 'snoozed';
    nextSteps.push('Snoozed for 30 days. Will retry automatically.');
  } else if (qualityGate.verdict === 'enrich') {
    status = 'needs_enrichment';
    nextSteps.push(...(qualityGate.hardBlocks || []).map(b => `Enrich: ${b}`));
    nextSteps.push('Search Apollo for verified email', 'Re-scan domain for more signals');
  } else {
    // Gate passed (auto_send or approve) — generate messages
    const channel: OutreachChannel = preferredChannel || 'email';

    // FIL 2: Use AI writer if scan data is available
    if (scanData) {
      try {
        const prospect = accountToProspect(account);
        aiMessages = await generateFullSequence(prospect, scanData, channel === 'linkedin' ? 'linkedin_dm' : 'email');
      } catch (err) {
        // Fallback to template-based if AI fails
        console.error('AI writer failed, falling back to templates:', err);
        messages = processMessages(account, angle, channel, thesis, proofs);
      }
    } else {
      // No scan data — use template-based messages
      messages = processMessages(account, angle, channel, thesis, proofs);
    }

    if (qualityGate.verdict === 'auto_send') {
      status = 'auto_send';
      nextSteps.push('🟢 High confidence — will be auto-sent at optimal window');
    } else {
      status = 'ready_for_review';
      nextSteps.push('🟡 Awaiting Edith approval in cockpit');
    }
  }

  // Summary
  const passedCriteria = qualityGate.criteria.filter(c => c.passed).length;
  const msgCount = aiMessages.length || messages.length;
  const summary = [
    `Angle: ${angle.primary.label} (${angle.confidence}%)`,
    scanData ? `Scan: ${scanData.exposureLow.toLocaleString()}-${scanData.exposureHigh.toLocaleString()} EUR (${scanData.confidence}% conf)` : 'No scan data',
    `Gate: ${qualityGate.totalScore}/100 → ${qualityGate.verdict.toUpperCase()}`,
    msgCount > 0 ? `Messages: ${msgCount} (${aiMessages.length > 0 ? 'AI-personalized' : 'template'})` : 'No messages',
    `Criteria: ${passedCriteria}/10`,
  ].join(' | ');

  return {
    status,
    account,
    angle,
    thesis,
    proofs,
    qualityGate,
    messages,
    aiMessages: aiMessages.length > 0 ? aiMessages : undefined,
    scanData: scanData || undefined,
    enrichedAt: now,
    summary,
    nextSteps,
  };
}

// ── Backward compat: synchronous version (no scan, no AI) ──

export function runEnrichmentPipeline(
  account: Account,
  preferredChannel?: OutreachChannel,
): EnrichmentResult {
  const now = new Date().toISOString();
  const nextSteps: string[] = [];
  const angle = selectAngle(account);
  const thesis = buildAccountThesis(account);
  const proofs = selectProofs(account, thesis);
  const qualityGate = evaluateQualityGate(account, thesis, proofs, angle, []);

  let messages: MessageVariant[] = [];
  let status: EnrichmentStatus;

  if (qualityGate.verdict === 'snooze' || qualityGate.verdict === 'block') {
    status = 'blocked';
    nextSteps.push(...(qualityGate.hardBlocks || []).map(b => `BLOCKER: ${b}`));
  } else if (qualityGate.verdict === 'enrich') {
    status = 'needs_enrichment';
    nextSteps.push('Enrich: missing data for quality gate');
  } else {
    const channel = preferredChannel || 'email';
    messages = processMessages(account, angle, channel, thesis, proofs);
    status = qualityGate.verdict === 'auto_send' ? 'auto_send' : 'ready_for_review';
  }

  const passedCriteria = qualityGate.criteria.filter(c => c.passed).length;
  const summary = [
    `Angle: ${angle.primary.label} (${angle.confidence}%)`,
    `Gate: ${qualityGate.totalScore}/100 → ${qualityGate.verdict.toUpperCase()}`,
    messages.length > 0 ? `Messages: ${messages.length} (template)` : 'No messages',
    `Criteria: ${passedCriteria}/10`,
  ].join(' | ');

  return { status, account, angle, thesis, proofs, qualityGate, messages, enrichedAt: now, summary, nextSteps };
}

// ── Re-run after fixing issues ──────────────────────────────

export function revalidatePipeline(
  previous: EnrichmentResult,
  updatedAccount: Account,
): EnrichmentResult {
  return runEnrichmentPipeline(updatedAccount, previous.messages[0]?.channel);
}

export async function revalidatePipelineV2(
  previous: EnrichmentResult,
  updatedAccount: Account,
): Promise<EnrichmentResult> {
  return runEnrichmentPipelineV2(updatedAccount, previous.messages[0]?.channel);
}
