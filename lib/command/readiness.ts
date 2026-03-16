/**
 * GHOST TAX — OUTREACH READINESS GATE
 *
 * Determines whether an account is ready for outreach.
 * Not all accounts should be contacted. This gate enforces discipline.
 *
 * Statuses:
 * - ready_to_send: all checks pass, messages critiqued, human can send
 * - ready_to_draft: angle is good but no messages generated yet
 * - draft_needs_review: messages exist but need human review
 * - not_ready: signal/angle/proof insufficient
 * - hold: timing wrong or cooling off
 * - do_not_send: hard block (killed, bounced, duplicate)
 */

import type {
  Account, OutreachReadiness, ReadinessStatus,
  MessageVariant, ChannelRecommendation, LedgerEntry,
} from '@/types/command';
import type { SelectedAngle } from './angles';

export function assessReadiness(
  account: Account,
  angle: SelectedAngle,
  channelRec: ChannelRecommendation,
  messages: MessageVariant[],
  ledger: LedgerEntry[],
): OutreachReadiness {
  const reasons: string[] = [];
  const blockers: string[] = [];

  // ── Hard blocks ───────────────────────────────────────
  if (account.status === 'dropped') {
    blockers.push('Account dropped.');
    return { status: 'do_not_send', reasons, blockers, confidence: 0 };
  }

  if (account.attackability === 'blocked') {
    blockers.push('Account blocked — resolve before outreach.');
    return { status: 'do_not_send', reasons, blockers, confidence: 0 };
  }

  // Check for active lock / cooldown
  const hasActiveLock = ledger.some(e => e.locked && !e.superseded);
  if (hasActiveLock) {
    blockers.push('Contact is locked — active outreach in progress.');
    return { status: 'do_not_send', reasons, blockers, confidence: 0 };
  }

  const hasCooldown = ledger.some(e => e.cooldownUntil && new Date(e.cooldownUntil) > new Date());
  if (hasCooldown) {
    const entry = ledger.find(e => e.cooldownUntil && new Date(e.cooldownUntil) > new Date())!;
    blockers.push(`In cooldown until ${new Date(entry.cooldownUntil!).toLocaleDateString()}.`);
    return { status: 'hold', reasons, blockers, confidence: 20 };
  }

  const isWaiting = ledger.some(e => e.status === 'waiting_response' && !e.superseded);
  if (isWaiting) {
    blockers.push('Waiting for response — do not send another message.');
    return { status: 'hold', reasons, blockers, confidence: 30 };
  }

  // ── Signal checks ─────────────────────────────────────
  const avgStrength = account.signals.length > 0
    ? account.signals.reduce((s, sig) => s + sig.strength, 0) / account.signals.length
    : 0;

  if (account.signals.length === 0) {
    blockers.push('No signals detected.');
    return { status: 'not_ready', reasons, blockers, confidence: 0 };
  }

  if (avgStrength < 3) {
    blockers.push(`Signal strength too low (avg ${avgStrength.toFixed(1)}/5).`);
  }

  // Check signal freshness (>90 days = stale)
  const signalDates = account.signals.filter(s => s.date).map(s => new Date(s.date!).getTime());
  if (signalDates.length > 0) {
    const newest = Math.max(...signalDates);
    const daysSince = (Date.now() - newest) / (1000 * 60 * 60 * 24);
    if (daysSince > 90) {
      blockers.push(`Newest signal is ${Math.round(daysSince)} days old — may be stale.`);
    } else if (daysSince < 30) {
      reasons.push('Signal is fresh (<30 days).');
    }
  }

  // ── Angle checks ──────────────────────────────────────
  if (!angle.readyForOutreach) {
    blockers.push(`Angle not ready: ${angle.readyReason}`);
  } else {
    reasons.push(`Strong angle: ${angle.primary.label} (${angle.confidence}% confidence).`);
  }

  if (angle.confidence < 40) {
    blockers.push('Angle confidence below 40%.');
  }

  // ── Channel checks ────────────────────────────────────
  if (channelRec.primary === 'hold') {
    blockers.push('Channel engine recommends HOLD.');
  } else {
    reasons.push(`Channel: ${channelRec.primary} (${channelRec.confidence}% confidence).`);
  }

  // ── Contact checks ────────────────────────────────────
  const lead = account.financeLead;
  if (!lead.name || lead.name.split(' ').length < 2) {
    blockers.push('Contact name incomplete — need full name.');
  } else {
    reasons.push(`Contact identified: ${lead.name}, ${lead.title}.`);
  }

  // ── Solofounder fit ───────────────────────────────────
  if (account.solofit === 'hard') {
    blockers.push('Account too large/complex for solofounder — high risk of wasted effort.');
  }

  // ── Conviction check ──────────────────────────────────
  if (account.conviction === 'low') {
    blockers.push('Conviction low — not enough evidence to justify outreach.');
  }

  // ── Determine status ──────────────────────────────────
  let status: ReadinessStatus;
  let confidence: number;

  if (blockers.length > 0) {
    // Any blocker = not ready
    status = blockers.some(b =>
      b.includes('dropped') || b.includes('locked') || b.includes('blocked')
    ) ? 'do_not_send' : 'not_ready';
    confidence = Math.max(0, 30 - blockers.length * 10);
  } else if (messages.length === 0) {
    status = 'ready_to_draft';
    confidence = 60;
    reasons.push('No messages generated yet — ready to draft.');
  } else {
    // Check message quality
    const hasStrong = messages.some(m => m.critique?.overallGrade === 'strong');
    const allReviewed = messages.every(m => m.status === 'ready' || m.status === 'approved');
    const anyRewrite = messages.some(m => m.critique?.overallGrade === 'rewrite');

    if (anyRewrite && !messages.some(m => m.status === 'rewritten')) {
      status = 'draft_needs_review';
      confidence = 40;
      reasons.push('Some messages need rewriting.');
    } else if (allReviewed || hasStrong) {
      status = 'ready_to_send';
      confidence = Math.min(85, angle.confidence);
      reasons.push('Messages pass quality check.');
    } else {
      status = 'draft_needs_review';
      confidence = 50;
      reasons.push('Messages exist but need human review.');
    }
  }

  return { status, reasons, blockers, confidence };
}
