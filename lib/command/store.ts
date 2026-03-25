/**
 * GHOST TAX — FOUNDER MISSION CONTROL
 * Data store v3 — Simple, reliable, no dynamic require
 */

import type { Account, AccountStatus, AccountFilters, SortField, SortDir, Conviction, Attackability, TimelineEventType } from '@/types/command';
import { CONVICTION_META, STATUS_META } from '@/types/command';
import { SEED_ACCOUNTS } from './seed';

const STORAGE_KEY = 'gt-command-v3';

// ── Persistence ──────────────────────────────────────────

export function loadAccounts(): Account[] {
  if (typeof window === 'undefined') return SEED_ACCOUNTS;

  // Clean old versions
  try { localStorage.removeItem('gt-command-accounts'); } catch {}
  try { localStorage.removeItem('gt-command-v2'); } catch {}

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Account[];
      if (parsed.length > 0 && Array.isArray(parsed[0].timeline) && typeof parsed[0].revenueEstimate === 'number') {
        return parsed;
      }
    }
  } catch { /* corrupted — reset */ }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_ACCOUNTS));
  return SEED_ACCOUNTS;
}

/**
 * Sync with Sarah's Supabase data via /api/command/sync.
 * Merges remote accounts into local store without overwriting local edits.
 * Returns the merged account list (also persisted to localStorage).
 */
export async function syncWithSarah(): Promise<{ accounts: Account[]; added: number; updated: number }> {
  const local = loadAccounts();
  let added = 0;
  let updated = 0;

  try {
    const key = typeof window !== 'undefined'
      ? document.cookie.match(/gt-command-key=([^;]+)/)?.[1] || ''
      : '';
    const res = await fetch(`/api/command/sync${key ? `?key=${key}` : ''}`, { cache: 'no-store' });
    if (!res.ok) return { accounts: local, added: 0, updated: 0 };

    const { accounts: remote } = await res.json() as { accounts: Account[] };
    if (!remote || remote.length === 0) return { accounts: local, added: 0, updated: 0 };

    const localByDomain = new Map(local.map(a => [a.domain, a]));
    const merged = [...local];

    for (const remoteAccount of remote) {
      const existing = localByDomain.get(remoteAccount.domain);
      if (!existing) {
        // New account from Sarah — add it
        merged.push(remoteAccount);
        added++;
      } else {
        // Existing account — merge signals (don't overwrite local edits)
        const existingSignalKeys = new Set(existing.signals.map(s => `${s.type}:${s.detail}`));
        const newSignals = remoteAccount.signals.filter(s => !existingSignalKeys.has(`${s.type}:${s.detail}`));
        if (newSignals.length > 0) {
          const idx = merged.findIndex(a => a.id === existing.id);
          if (idx >= 0) {
            merged[idx] = {
              ...existing,
              signals: [...existing.signals, ...newSignals],
              updatedAt: new Date().toISOString(),
              // Update financeLead email if Sarah found one and we don't have it
              ...(remoteAccount.financeLead?.email && !existing.financeLead?.email
                ? { financeLead: { ...existing.financeLead, email: remoteAccount.financeLead.email } }
                : {}),
            };
            updated++;
          }
        }
      }
    }

    saveAccounts(merged);
    return { accounts: merged, added, updated };
  } catch {
    return { accounts: local, added: 0, updated: 0 };
  }
}

export function saveAccounts(accounts: Account[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

export function resetToSeed(): Account[] {
  saveAccounts(SEED_ACCOUNTS);
  return [...SEED_ACCOUNTS];
}

// ── Mutations ────────────────────────────────────────────

export function updateAccount(accounts: Account[], id: string, patch: Partial<Account>): Account[] {
  return accounts.map(a => {
    if (a.id !== id) return a;
    const updated = { ...a, ...patch, updatedAt: new Date().toISOString() };
    if (patch.status && patch.status !== a.status) {
      updated.timeline = [...updated.timeline, { type: 'status_changed' as TimelineEventType, detail: `${a.status} → ${patch.status}`, date: new Date().toISOString() }];
    }
    return updated;
  });
}

export function addNote(accounts: Account[], id: string, action: string): Account[] {
  return accounts.map(a => a.id === id ? {
    ...a,
    executionLog: [...a.executionLog, { action, date: new Date().toISOString() }],
    timeline: [...a.timeline, { type: 'note_added' as TimelineEventType, detail: action, date: new Date().toISOString() }],
    updatedAt: new Date().toISOString(),
  } : a);
}

export function markOutreachSent(accounts: Account[], accountId: string, channel: string): Account[] {
  return accounts.map(a => a.id === accountId ? {
    ...a,
    outreach: a.outreach.map(o => o.channel === channel ? { ...o, status: 'sent' as const, sentAt: new Date().toISOString() } : o),
    status: 'contacted' as AccountStatus,
    executionLog: [...a.executionLog, { action: `${channel} sent`, date: new Date().toISOString() }],
    timeline: [...a.timeline, { type: 'message_sent' as TimelineEventType, detail: `${channel} message sent`, date: new Date().toISOString() }],
    updatedAt: new Date().toISOString(),
  } : a);
}

// ── Probability ──────────────────────────────────────────

const ATK_P: Record<Attackability, number> = { now: 28, soon: 16, later: 7, blocked: 2 };
const CON_P: Record<Conviction, number> = { very_high: 22, high: 16, moderate: 8, low: 3 };
const SF_P: Record<string, number> = { ideal: 10, good: 7, stretch: 3, hard: 1 };
const DP_P: Record<string, number> = { high: 5, medium: 3, low: 1 };

export function calcProbability(a: Account): number {
  if (a.status === 'dropped') return 0;
  let p = ATK_P[a.attackability] + CON_P[a.conviction] + (SF_P[a.solofit] || 5) + (DP_P[a.dealPotential] || 2);
  const avg = a.signals.length > 0 ? a.signals.reduce((s, sig) => s + sig.strength, 0) / a.signals.length : 0;
  if (avg >= 4) p += 4;
  if (a.scan?.strengthensHypothesis) p += 6;
  if (a.outreach.some(o => o.status === 'sent')) p += 3;
  return Math.min(70, Math.max(1, p));
}

export function calcExpectedValue(a: Account): number {
  return Math.round(calcProbability(a) / 100 * a.revenueEstimate);
}

// ── Filtering & Sorting ──────────────────────────────────

const ATK_O: Record<Attackability, number> = { now: 4, soon: 3, later: 2, blocked: 1 };

export function filterAccounts(accounts: Account[], f: AccountFilters): Account[] {
  return accounts.filter(a => {
    if (f.status?.length && !f.status.includes(a.status)) return false;
    if (f.country?.length && !f.country.includes(a.country)) return false;
    if (f.tier?.length && !f.tier.includes(a.tier)) return false;
    if (f.attackability?.length && !f.attackability.includes(a.attackability)) return false;
    if (f.conviction?.length && !f.conviction.includes(a.conviction)) return false;
    if (f.search) {
      const q = f.search.toLowerCase();
      return a.company.toLowerCase().includes(q) || a.domain.toLowerCase().includes(q) || a.financeLead.name.toLowerCase().includes(q);
    }
    return true;
  });
}

export function sortAccounts(accounts: Account[], field: SortField, dir: SortDir): Account[] {
  return [...accounts].sort((a, b) => {
    let cmp = 0;
    switch (field) {
      case 'score': cmp = a.score - b.score; break;
      case 'company': cmp = a.company.localeCompare(b.company); break;
      case 'country': cmp = a.country.localeCompare(b.country); break;
      case 'status': cmp = STATUS_META[a.status].order - STATUS_META[b.status].order; break;
      case 'attackability': cmp = ATK_O[a.attackability] - ATK_O[b.attackability]; break;
      case 'conviction': cmp = CONVICTION_META[a.conviction].score - CONVICTION_META[b.conviction].score; break;
      case 'updatedAt': cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(); break;
    }
    return dir === 'desc' ? -cmp : cmp;
  });
}

// ── Aggregates ───────────────────────────────────────────

export function getAttackNow(a: Account[]) { return a.filter(x => x.attackability === 'now' && x.status !== 'dropped' && x.status !== 'contacted').sort((x, y) => y.score - x.score); }
export function getScanNeeded(a: Account[]) { return a.filter(x => !x.scan && x.status !== 'dropped').sort((x, y) => y.score - x.score); }
export function getKillCandidates(a: Account[]) { return a.filter(x => x.status !== 'dropped' && (x.conviction === 'low' || x.attackability === 'blocked' || x.weaknesses.length > x.strengths.length)); }
export function getOutreachReady(a: Account[]) { return a.filter(x => x.outreach.length > 0 && x.outreach.some(o => o.status === 'draft') && x.status !== 'dropped' && (x.attackability === 'now' || x.status === 'outreach_ready' || x.status === 'qualified')).sort((x, y) => y.score - x.score); }
export function getTopByExpectedValue(a: Account[]) { return a.filter(x => x.status !== 'dropped').sort((x, y) => calcExpectedValue(y) - calcExpectedValue(x)); }
