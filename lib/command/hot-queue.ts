/**
 * GHOST TAX — HOT QUEUE ENGINE + OUTREACH LEDGER
 *
 * Dynamic queue of ≤30 ultra-hot accounts.
 * Auto-replenishes from warm backlog when accounts exit.
 * Includes safety layer: locks, cooldowns, fingerprints, anti-duplicate.
 *
 * Queue quality > queue size.
 * Prefers 18 excellent accounts over 30 diluted ones.
 */

import type {
  Account, HeatScore, QueueTier,
  LedgerEntry, ContactLock, LedgerStatus,
  MessageType, OutreachChannel, MessageVariant,
  COOLDOWN_HOURS,
} from '@/types/command';
import { calcProbability, calcExpectedValue } from './store';

// ── Constants ───────────────────────────────────────────────

const MAX_QUEUE_SIZE = 30;
const HOT_THRESHOLD = 60;     // Minimum heat score for hot queue
const WARM_THRESHOLD = 35;    // Minimum for warm backlog
const COOLDOWN_MS = {
  after_send: 72 * 60 * 60 * 1000,         // 72h
  after_no_response: 168 * 60 * 60 * 1000,  // 7 days
  after_bounce: 720 * 60 * 60 * 1000,       // 30 days
};

const LEDGER_KEY = 'gt-outreach-ledger-v1';
const LOCKS_KEY = 'gt-outreach-locks-v1';

// ── Heat Score Calculation ──────────────────────────────────

export function calcHeatScore(account: Account): HeatScore {
  const breakdown = {
    signalFreshness: 0,   // 0-15
    signalStrength: 0,    // 0-15
    angleQuality: 0,      // 0-15 (computed externally, passed via account state)
    outreachReadiness: 0, // 0-10
    channelClarity: 0,    // 0-10
    responseProb: 0,      // 0-10
    solofitScore: 0,      // 0-10
    expectedValue: 0,     // 0-10
    proofLevel: 0,        // 0-5
  };

  // 1. Signal freshness (0-15)
  const signalDates = account.signals.filter(s => s.date).map(s => new Date(s.date!).getTime());
  if (signalDates.length > 0) {
    const newest = Math.max(...signalDates);
    const daysSince = (Date.now() - newest) / (1000 * 60 * 60 * 24);
    if (daysSince <= 7) breakdown.signalFreshness = 15;
    else if (daysSince <= 14) breakdown.signalFreshness = 13;
    else if (daysSince <= 30) breakdown.signalFreshness = 11;
    else if (daysSince <= 60) breakdown.signalFreshness = 7;
    else if (daysSince <= 90) breakdown.signalFreshness = 4;
    else breakdown.signalFreshness = 1;
  } else {
    // No dates on signals — use updatedAt as proxy
    const daysSinceUpdate = (Date.now() - new Date(account.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    breakdown.signalFreshness = daysSinceUpdate <= 14 ? 10 : daysSinceUpdate <= 30 ? 6 : 2;
  }

  // 2. Signal strength (0-15)
  if (account.signals.length > 0) {
    const avg = account.signals.reduce((s, sig) => s + sig.strength, 0) / account.signals.length;
    const max = Math.max(...account.signals.map(s => s.strength));
    breakdown.signalStrength = Math.min(15, Math.round(avg * 2 + max));
  }

  // 3. Angle quality (0-15) — based on conviction and hypothesis
  const convScores = { very_high: 15, high: 11, moderate: 6, low: 2 };
  breakdown.angleQuality = convScores[account.conviction] || 5;

  // 4. Outreach readiness (0-10)
  const hasContact = account.financeLead.name.split(' ').length >= 2;
  const hasDrafts = account.outreach.length > 0;
  const notContacted = account.status !== 'contacted';
  const notDropped = account.status !== 'dropped';
  breakdown.outreachReadiness =
    (hasContact ? 3 : 0) +
    (hasDrafts ? 2 : 0) +
    (notContacted ? 3 : 0) +
    (notDropped ? 2 : 0);

  // 5. Channel clarity (0-10)
  const hasLinkedIn = !!account.financeLead.linkedIn;
  const atkScores = { now: 10, soon: 6, later: 3, blocked: 0 };
  breakdown.channelClarity = Math.min(10,
    (hasLinkedIn ? 4 : 2) + Math.round(atkScores[account.attackability] * 0.6)
  );

  // 6. Response probability (0-10) — from existing calcProbability
  const prob = calcProbability(account);
  breakdown.responseProb = Math.min(10, Math.round(prob / 7));

  // 7. Solofounder fit (0-10)
  const sfScores = { ideal: 10, good: 7, stretch: 3, hard: 0 };
  breakdown.solofitScore = sfScores[account.solofit] || 5;

  // 8. Expected value (0-10)
  const ev = calcExpectedValue(account);
  if (ev >= 10000) breakdown.expectedValue = 10;
  else if (ev >= 5000) breakdown.expectedValue = 8;
  else if (ev >= 2000) breakdown.expectedValue = 6;
  else if (ev >= 1000) breakdown.expectedValue = 4;
  else breakdown.expectedValue = 2;

  // 9. Proof level (0-5)
  if (account.scan?.strengthensHypothesis) breakdown.proofLevel = 5;
  else if (account.scan?.status === 'complete') breakdown.proofLevel = 3;
  else breakdown.proofLevel = 1;

  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);

  return { total: Math.min(100, total), breakdown };
}

// ── Queue Tier Classification ───────────────────────────────

export function classifyTier(
  account: Account,
  heat: HeatScore,
  ledger: LedgerEntry[],
): QueueTier {
  if (account.status === 'dropped' || account.killReason) return 'killed';

  // Check if in cooldown or waiting
  const accountLedger = ledger.filter(e => e.accountId === account.id);
  const inCooldown = accountLedger.some(e => e.cooldownUntil && new Date(e.cooldownUntil) > new Date());
  const waitingResponse = accountLedger.some(e => e.status === 'waiting_response' && !e.superseded);

  if (inCooldown || waitingResponse) return 'hold';
  if (account.attackability === 'blocked') return 'hold';

  if (heat.total >= HOT_THRESHOLD) return 'hot';
  if (heat.total >= WARM_THRESHOLD) return 'warm';
  return 'cold';
}

// ── Build Hot Queue ─────────────────────────────────────────

export interface QueueEntry {
  accountId: string;
  rank: number;
  heat: HeatScore;
  tier: QueueTier;
}

export interface QueueState {
  hot: QueueEntry[];
  warm: QueueEntry[];
  cold: QueueEntry[];
  hold: QueueEntry[];
  killed: QueueEntry[];
  stats: {
    hotCount: number;
    slotsAvailable: number;
    warmCount: number;
    holdCount: number;
    inCooldown: number;
    waitingResponse: number;
  };
}

export function buildQueue(accounts: Account[], ledger: LedgerEntry[]): QueueState {
  const entries: QueueEntry[] = accounts.map(a => {
    const heat = calcHeatScore(a);
    const tier = classifyTier(a, heat, ledger);
    return { accountId: a.id, rank: 0, heat, tier };
  });

  // Sort by heat score descending
  const hot = entries
    .filter(e => e.tier === 'hot')
    .sort((a, b) => b.heat.total - a.heat.total)
    .slice(0, MAX_QUEUE_SIZE)
    .map((e, i) => ({ ...e, rank: i + 1 }));

  const warm = entries
    .filter(e => e.tier === 'warm')
    .sort((a, b) => b.heat.total - a.heat.total);

  const cold = entries.filter(e => e.tier === 'cold');
  const hold = entries.filter(e => e.tier === 'hold');
  const killed = entries.filter(e => e.tier === 'killed');

  // Count cooldowns and waiting
  const inCooldown = ledger.filter(e => e.cooldownUntil && new Date(e.cooldownUntil) > new Date()).length;
  const waitingResponse = ledger.filter(e => e.status === 'waiting_response' && !e.superseded).length;

  return {
    hot, warm, cold, hold, killed,
    stats: {
      hotCount: hot.length,
      slotsAvailable: MAX_QUEUE_SIZE - hot.length,
      warmCount: warm.length,
      holdCount: hold.length,
      inCooldown,
      waitingResponse,
    },
  };
}

// ── Ledger Persistence ──────────────────────────────────────

export function loadLedger(): LedgerEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(LEDGER_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

export function saveLedger(entries: LedgerEntry[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LEDGER_KEY, JSON.stringify(entries));
}

export function loadLocks(): ContactLock[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(LOCKS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

export function saveLocks(locks: ContactLock[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCKS_KEY, JSON.stringify(locks));
}

// ── Ledger Operations ───────────────────────────────────────

function ledgerUid(): string {
  return `led_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function messageFingerprint(body: string): string {
  // Simple hash — not cryptographic, just for dedup
  let hash = 0;
  for (let i = 0; i < body.length; i++) {
    const char = body.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `fp_${Math.abs(hash).toString(36)}`;
}

export function createLedgerEntry(
  accountId: string,
  contactName: string,
  channel: OutreachChannel,
  messageType: MessageType,
  body: string,
): LedgerEntry {
  return {
    id: ledgerUid(),
    accountId,
    contactName,
    channel,
    messageType,
    messageFingerprint: messageFingerprint(body),
    status: 'draft_created',
    draftCreatedAt: new Date().toISOString(),
    locked: false,
    superseded: false,
  };
}

// ── Safety Checks ───────────────────────────────────────────

export interface SafetyCheckResult {
  safe: boolean;
  reason?: string;
}

/**
 * Check if it's safe to send a message to this account/contact/channel.
 * Returns { safe: false, reason } if blocked.
 */
export function checkSendSafety(
  accountId: string,
  contactName: string,
  channel: OutreachChannel,
  messageBody: string,
  ledger: LedgerEntry[],
  locks: ContactLock[],
): SafetyCheckResult {
  const contactEntries = ledger.filter(e =>
    e.accountId === accountId &&
    e.contactName === contactName &&
    !e.superseded
  );

  // 1. Active lock on this contact
  const activeLock = locks.find(l =>
    l.accountId === accountId &&
    l.contactName === contactName &&
    (!l.expiresAt || new Date(l.expiresAt) > new Date())
  );
  if (activeLock) {
    return { safe: false, reason: `Contact locked: ${activeLock.reason}` };
  }

  // 2. Cooldown active
  const coolingDown = contactEntries.find(e =>
    e.cooldownUntil && new Date(e.cooldownUntil) > new Date()
  );
  if (coolingDown) {
    return { safe: false, reason: `In cooldown until ${new Date(coolingDown.cooldownUntil!).toLocaleDateString()}.` };
  }

  // 3. Waiting for response
  const waiting = contactEntries.find(e => e.status === 'waiting_response');
  if (waiting) {
    return { safe: false, reason: 'Already waiting for response on this channel.' };
  }

  // 4. Same channel already sent recently (72h)
  const recentSend = contactEntries.find(e =>
    e.channel === channel &&
    e.status === 'sent' &&
    e.sentAt &&
    (Date.now() - new Date(e.sentAt).getTime()) < COOLDOWN_MS.after_send
  );
  if (recentSend) {
    return { safe: false, reason: `Message already sent on ${channel} within 72h.` };
  }

  // 5. Duplicate message fingerprint
  const fp = messageFingerprint(messageBody);
  const duplicateFP = contactEntries.find(e =>
    e.messageFingerprint === fp && (e.status === 'sent' || e.status === 'approved')
  );
  if (duplicateFP) {
    return { safe: false, reason: 'Identical message already sent or approved.' };
  }

  // 6. Two channels fired simultaneously without intent
  const otherChannelActive = contactEntries.find(e =>
    e.channel !== channel &&
    (e.status === 'sent' || e.status === 'waiting_response') &&
    e.sentAt &&
    (Date.now() - new Date(e.sentAt).getTime()) < COOLDOWN_MS.after_send
  );
  if (otherChannelActive) {
    return { safe: false, reason: `Active outreach on ${otherChannelActive.channel} — avoid parallel channels.` };
  }

  // 7. Account-level: same account, different contact, recent send
  const accountOtherContact = ledger.filter(e =>
    e.accountId === accountId &&
    e.contactName !== contactName &&
    e.status === 'sent' &&
    e.sentAt &&
    (Date.now() - new Date(e.sentAt).getTime()) < COOLDOWN_MS.after_send &&
    !e.superseded
  );
  if (accountOtherContact.length > 0) {
    return { safe: false, reason: `Another contact at this account was contacted within 72h (${accountOtherContact[0].contactName}).` };
  }

  return { safe: true };
}

// ── Ledger Mutations ────────────────────────────────────────

export function markLedgerSent(
  ledger: LedgerEntry[],
  entryId: string,
): LedgerEntry[] {
  return ledger.map(e => {
    if (e.id !== entryId) return e;
    return {
      ...e,
      status: 'sent' as LedgerStatus,
      sentAt: new Date().toISOString(),
      locked: true,
      cooldownUntil: new Date(Date.now() + COOLDOWN_MS.after_send).toISOString(),
    };
  });
}

export function markLedgerWaiting(
  ledger: LedgerEntry[],
  entryId: string,
): LedgerEntry[] {
  return ledger.map(e => e.id === entryId ? { ...e, status: 'waiting_response' as LedgerStatus } : e);
}

export function markLedgerReplied(
  ledger: LedgerEntry[],
  entryId: string,
): LedgerEntry[] {
  return ledger.map(e => e.id === entryId ? { ...e, status: 'replied' as LedgerStatus, locked: false } : e);
}

export function markLedgerNoResponse(
  ledger: LedgerEntry[],
  entryId: string,
): LedgerEntry[] {
  return ledger.map(e => {
    if (e.id !== entryId) return e;
    return {
      ...e,
      status: 'no_response' as LedgerStatus,
      locked: false,
      cooldownUntil: new Date(Date.now() + COOLDOWN_MS.after_no_response).toISOString(),
    };
  });
}

export function supersedeLedgerEntry(
  ledger: LedgerEntry[],
  entryId: string,
): LedgerEntry[] {
  return ledger.map(e => e.id === entryId ? { ...e, superseded: true, locked: false } : e);
}

// ── Lock Operations ─────────────────────────────────────────

export function createLock(
  accountId: string,
  contactName: string,
  channel: OutreachChannel,
  reason: string,
  durationHours?: number,
): ContactLock {
  return {
    accountId,
    contactName,
    channel,
    lockedAt: new Date().toISOString(),
    reason,
    expiresAt: durationHours
      ? new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString()
      : undefined,
  };
}

export function releaseLock(
  locks: ContactLock[],
  accountId: string,
  contactName: string,
  channel: OutreachChannel,
): ContactLock[] {
  return locks.filter(l =>
    !(l.accountId === accountId && l.contactName === contactName && l.channel === channel)
  );
}

// ── Duplicate Risk Detection ────────────────────────────────

export function checkDuplicateRisk(
  accountId: string,
  accounts: Account[],
  ledger: LedgerEntry[],
): { isDuplicate: boolean; reason?: string } {
  const account = accounts.find(a => a.id === accountId);
  if (!account) return { isDuplicate: false };

  // Check if same domain exists in another account
  const sameDomain = accounts.filter(a =>
    a.id !== accountId && a.domain === account.domain
  );
  if (sameDomain.length > 0) {
    return { isDuplicate: true, reason: `Duplicate domain: ${sameDomain[0].company} (${sameDomain[0].id})` };
  }

  // Check if same contact name exists in another account's ledger
  const contactName = account.financeLead.name;
  const otherAccountSameContact = ledger.filter(e =>
    e.accountId !== accountId &&
    e.contactName === contactName &&
    !e.superseded
  );
  if (otherAccountSameContact.length > 0) {
    return { isDuplicate: true, reason: `Same contact "${contactName}" in another account.` };
  }

  return { isDuplicate: false };
}

// ── Queue Replenishment ─────────────────────────────────────

/**
 * Find the best candidate from warm backlog to promote to hot queue.
 * Respects safety checks and quality thresholds.
 */
// ── FIL 3: Response Feedback Loop ──────────────────────────

const RESPONSE_LOG_KEY = 'gt-response-log';

export interface ResponseLogEntry {
  domain: string;
  angle: string;
  channel: string;
  country: string;
  industry: string;
  headcount: number;
  sequenceStep: string;
  messageWordCount: number;
  sentAt: string;
  repliedAt: string | null;
  convertedAt: string | null;
  outcome: 'replied' | 'ignored' | 'converted' | 'unsubscribed';
}

export interface ResponseStats {
  replyRateByAngle: Record<string, number>;
  replyRateByChannel: Record<string, number>;
  replyRateByCountry: Record<string, number>;
  bestAngleChannelCombo: { angle: string; channel: string; rate: number };
  avgReplyTimeHours: number;
}

function loadResponseLog(): ResponseLogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(RESPONSE_LOG_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveResponseLog(entries: ResponseLogEntry[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(RESPONSE_LOG_KEY, JSON.stringify(entries));
}

export function logResponse(entry: ResponseLogEntry): void {
  const log = loadResponseLog();
  // Deduplicate: update existing entry for same domain+sequenceStep, or append
  const idx = log.findIndex(
    e => e.domain === entry.domain && e.sequenceStep === entry.sequenceStep
  );
  if (idx >= 0) {
    log[idx] = entry;
  } else {
    log.push(entry);
  }
  saveResponseLog(log);
}

export function getResponseStats(): ResponseStats {
  const log = loadResponseLog();

  const replyRateByAngle: Record<string, number> = {};
  const replyRateByChannel: Record<string, number> = {};
  const replyRateByCountry: Record<string, number> = {};

  // Group by angle
  const angleGroups: Record<string, ResponseLogEntry[]> = {};
  const channelGroups: Record<string, ResponseLogEntry[]> = {};
  const countryGroups: Record<string, ResponseLogEntry[]> = {};
  const comboGroups: Record<string, ResponseLogEntry[]> = {};

  for (const entry of log) {
    // Angle
    if (!angleGroups[entry.angle]) angleGroups[entry.angle] = [];
    angleGroups[entry.angle].push(entry);
    // Channel
    if (!channelGroups[entry.channel]) channelGroups[entry.channel] = [];
    channelGroups[entry.channel].push(entry);
    // Country
    if (!countryGroups[entry.country]) countryGroups[entry.country] = [];
    countryGroups[entry.country].push(entry);
    // Combo
    const comboKey = `${entry.angle}||${entry.channel}`;
    if (!comboGroups[comboKey]) comboGroups[comboKey] = [];
    comboGroups[comboKey].push(entry);
  }

  const calcRate = (entries: ResponseLogEntry[]) => {
    if (entries.length === 0) return 0;
    const replied = entries.filter(e => e.outcome === 'replied' || e.outcome === 'converted').length;
    return Math.round((replied / entries.length) * 100);
  };

  for (const [angle, entries] of Object.entries(angleGroups)) {
    replyRateByAngle[angle] = calcRate(entries);
  }
  for (const [channel, entries] of Object.entries(channelGroups)) {
    replyRateByChannel[channel] = calcRate(entries);
  }
  for (const [country, entries] of Object.entries(countryGroups)) {
    replyRateByCountry[country] = calcRate(entries);
  }

  // Best combo
  let bestCombo = { angle: '', channel: '', rate: 0 };
  for (const [key, entries] of Object.entries(comboGroups)) {
    const rate = calcRate(entries);
    if (rate > bestCombo.rate || (rate === bestCombo.rate && entries.length > (comboGroups[`${bestCombo.angle}||${bestCombo.channel}`]?.length || 0))) {
      const [angle, channel] = key.split('||');
      bestCombo = { angle, channel, rate };
    }
  }

  // Avg reply time
  const repliedEntries = log.filter(e => e.repliedAt && e.sentAt);
  let avgReplyTimeHours = 0;
  if (repliedEntries.length > 0) {
    const totalHours = repliedEntries.reduce((sum, e) => {
      const sent = new Date(e.sentAt).getTime();
      const replied = new Date(e.repliedAt!).getTime();
      return sum + (replied - sent) / (1000 * 60 * 60);
    }, 0);
    avgReplyTimeHours = Math.round((totalHours / repliedEntries.length) * 10) / 10;
  }

  return {
    replyRateByAngle,
    replyRateByChannel,
    replyRateByCountry,
    bestAngleChannelCombo: bestCombo,
    avgReplyTimeHours,
  };
}

/**
 * Recalculate heat score weights based on feedback data.
 * Only adjusts after 30+ logged sends to avoid premature optimization.
 * Returns adjusted weight multipliers for heat score breakdown categories.
 */
export function recalcHeatWeights(): Record<string, number> | null {
  const log = loadResponseLog();
  if (log.length < 30) return null; // Not enough data

  const stats = getResponseStats();

  // Base multipliers (1.0 = no change)
  const weights: Record<string, number> = {
    signalFreshness: 1.0,
    signalStrength: 1.0,
    angleQuality: 1.0,
    outreachReadiness: 1.0,
    channelClarity: 1.0,
    responseProb: 1.0,
    solofitScore: 1.0,
    expectedValue: 1.0,
    proofLevel: 1.0,
  };

  // Overall reply rate
  const totalSent = log.length;
  const totalReplied = log.filter(e => e.outcome === 'replied' || e.outcome === 'converted').length;
  const overallRate = totalReplied / totalSent;

  // Boost angle quality weight if certain angles clearly outperform
  const angleRates = Object.values(stats.replyRateByAngle);
  if (angleRates.length >= 2) {
    const maxAngleRate = Math.max(...angleRates);
    const minAngleRate = Math.min(...angleRates);
    if (maxAngleRate - minAngleRate > 15) {
      // High variance between angles — angle selection matters more
      weights.angleQuality = 1.3;
    }
  }

  // Boost channel clarity if one channel dominates
  const channelRates = Object.values(stats.replyRateByChannel);
  if (channelRates.length >= 2) {
    const maxChRate = Math.max(...channelRates);
    const minChRate = Math.min(...channelRates);
    if (maxChRate - minChRate > 20) {
      weights.channelClarity = 1.4;
    }
  }

  // Boost signal freshness if fresh signals correlate with replies
  const freshReplies = log.filter(e =>
    (e.outcome === 'replied' || e.outcome === 'converted')
  );
  if (freshReplies.length > 0 && overallRate > 0) {
    // If conversion rate is above 15%, proof and signals are working
    if (overallRate > 0.15) {
      weights.signalFreshness = 1.2;
      weights.proofLevel = 1.2;
    }
  }

  // If reply times are fast (<24h avg), boost responseProb weight
  if (stats.avgReplyTimeHours > 0 && stats.avgReplyTimeHours < 24) {
    weights.responseProb = 1.25;
  }

  // If conversions happen, boost expected value weight
  const conversions = log.filter(e => e.outcome === 'converted').length;
  if (conversions >= 3) {
    weights.expectedValue = 1.3;
  }

  return weights;
}

// ── Queue Replenishment ─────────────────────────────────────

/**
 * Find the best candidate from warm backlog to promote to hot queue.
 * Respects safety checks and quality thresholds.
 */
export function findReplenishmentCandidate(
  queue: QueueState,
  accounts: Account[],
  ledger: LedgerEntry[],
): string | null {
  if (queue.stats.slotsAvailable <= 0) return null;
  if (queue.warm.length === 0) return null;

  // Sort warm by heat descending
  const sorted = [...queue.warm].sort((a, b) => b.heat.total - a.heat.total);

  for (const entry of sorted) {
    // Must meet hot threshold
    if (entry.heat.total < HOT_THRESHOLD) break; // Sorted desc, so stop

    const account = accounts.find(a => a.id === entry.accountId);
    if (!account) continue;

    // Check duplicate
    const dup = checkDuplicateRisk(entry.accountId, accounts, ledger);
    if (dup.isDuplicate) continue;

    // Check not already in hot
    if (queue.hot.some(h => h.accountId === entry.accountId)) continue;

    return entry.accountId;
  }

  return null;
}
