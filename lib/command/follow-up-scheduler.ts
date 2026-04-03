/**
 * GHOST TAX — FOLLOW-UP SCHEDULER
 *
 * Manages the M3/M4/M5 follow-up sequence after initial outreach.
 * Stores scheduled follow-ups in localStorage with timing:
 *   M3: J+3 (3 days after initial send)
 *   M4: J+7 (7 days)
 *   M5: J+14 (14 days)
 *
 * Integrates with auto-sender.ts for actual delivery
 * and hot-queue.ts response log for feedback tracking.
 */

import type { GeneratedMessage } from './ai-writer';

// ── Types ──────────────────────────────────────────────────

export interface ScheduledFollowUp {
  prospectDomain: string;
  sequenceStep: 'M3' | 'M4' | 'M5';
  scheduledFor: string;   // ISO date
  message: GeneratedMessage;
  status: 'pending' | 'sent' | 'cancelled';
  createdAt: string;
}

// ── Constants ──────────────────────────────────────────────

const FOLLOWUP_KEY = 'gt-followups-v1';

const DELAY_DAYS: Record<'M3' | 'M4' | 'M5', number> = {
  M3: 3,
  M4: 7,
  M5: 14,
};

// ── Storage ────────────────────────────────────────────────

function loadFollowUps(): ScheduledFollowUp[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(FOLLOWUP_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveFollowUps(entries: ScheduledFollowUp[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FOLLOWUP_KEY, JSON.stringify(entries));
}

// ── Public API ─────────────────────────────────────────────

/**
 * Schedule M3/M4/M5 follow-ups for a domain.
 * Filters the aiMessages array to only schedule messages with
 * sequenceStep M3, M4, or M5. Timing is relative to now.
 *
 * If follow-ups already exist for this domain, they are replaced.
 */
export function scheduleFollowUps(
  domain: string,
  aiMessages: GeneratedMessage[],
): void {
  const existing = loadFollowUps();

  // Remove any existing pending follow-ups for this domain
  const cleaned = existing.filter(
    f => f.prospectDomain !== domain || f.status !== 'pending'
  );

  const now = Date.now();
  const nowISO = new Date().toISOString();

  const steps: Array<'M3' | 'M4' | 'M5'> = ['M3', 'M4', 'M5'];

  for (const step of steps) {
    const msg = aiMessages.find(m => m.sequenceStep === step);
    if (!msg) continue;

    const scheduledDate = new Date(now + DELAY_DAYS[step] * 24 * 60 * 60 * 1000);

    cleaned.push({
      prospectDomain: domain,
      sequenceStep: step,
      scheduledFor: scheduledDate.toISOString(),
      message: msg,
      status: 'pending',
      createdAt: nowISO,
    });
  }

  saveFollowUps(cleaned);
}

/**
 * Get all follow-ups that are due (scheduledFor <= now AND status === 'pending').
 */
export function getFollowUpsDue(): ScheduledFollowUp[] {
  const all = loadFollowUps();
  const now = new Date();

  return all.filter(
    f => f.status === 'pending' && new Date(f.scheduledFor) <= now
  );
}

/**
 * Get all follow-ups for a specific domain (all statuses).
 */
export function getFollowUpsForDomain(domain: string): ScheduledFollowUp[] {
  return loadFollowUps().filter(f => f.prospectDomain === domain);
}

/**
 * Get all pending follow-ups across all domains.
 */
export function getAllPendingFollowUps(): ScheduledFollowUp[] {
  return loadFollowUps().filter(f => f.status === 'pending');
}

/**
 * Mark a specific follow-up as sent.
 */
export function markFollowUpSent(domain: string, step: string): void {
  const all = loadFollowUps();
  const updated = all.map(f => {
    if (f.prospectDomain === domain && f.sequenceStep === step && f.status === 'pending') {
      return { ...f, status: 'sent' as const };
    }
    return f;
  });
  saveFollowUps(updated);
}

/**
 * Cancel all pending follow-ups for a domain.
 * Use when a prospect replies or unsubscribes — no more follow-ups needed.
 */
export function cancelFollowUps(domain: string): void {
  const all = loadFollowUps();
  const updated = all.map(f => {
    if (f.prospectDomain === domain && f.status === 'pending') {
      return { ...f, status: 'cancelled' as const };
    }
    return f;
  });
  saveFollowUps(updated);
}

/**
 * Purge old follow-ups (sent/cancelled older than 90 days) to keep localStorage clean.
 */
export function purgeOldFollowUps(): number {
  const all = loadFollowUps();
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;

  const kept = all.filter(f => {
    if (f.status === 'pending') return true; // Never purge pending
    return new Date(f.createdAt).getTime() > cutoff;
  });

  const purged = all.length - kept.length;
  if (purged > 0) saveFollowUps(kept);
  return purged;
}

/**
 * Summary stats for the follow-up queue.
 */
export function getFollowUpStats(): {
  totalPending: number;
  dueNow: number;
  totalSent: number;
  totalCancelled: number;
  byStep: Record<string, number>;
} {
  const all = loadFollowUps();
  const now = new Date();

  const pending = all.filter(f => f.status === 'pending');
  const dueNow = pending.filter(f => new Date(f.scheduledFor) <= now);

  const byStep: Record<string, number> = { M3: 0, M4: 0, M5: 0 };
  for (const f of pending) {
    byStep[f.sequenceStep] = (byStep[f.sequenceStep] || 0) + 1;
  }

  return {
    totalPending: pending.length,
    dueNow: dueNow.length,
    totalSent: all.filter(f => f.status === 'sent').length,
    totalCancelled: all.filter(f => f.status === 'cancelled').length,
    byStep,
  };
}
