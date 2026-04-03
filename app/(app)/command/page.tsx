'use client';

/**
 * GHOST TAX — COCKPIT v3 — Premium Sales Execution Cockpit
 *
 * Skills applied:
 *   7  — Color Intelligence (achromatic 80%, signal glows)
 *   8  — Data Presentation Sculptor (metric cards, financial ranges)
 *   9  — Motion Choreographer (CSS-only @keyframes, staggered rows)
 *   13 — Deal Closer (path-to-close, BANT+ score)
 *   17 — Outbound Orchestrator (sequence timeline, 48h rule)
 *
 * Every micro-interaction reduces time-to-send.
 */

import React from 'react';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { processEventIntoAccounts, type PlatformEvent } from '@/lib/command/bridge';
import { loadDomainIntel, saveDomainIntel, learnDomainPattern, resolveAllEmails } from '@/lib/command/email-resolver';
import {
  loadAccounts, saveAccounts,
  getViewAccounts, computeReadyToSend,
  unsnoozeExpired, markSent, markReplied,
  scheduleFollowUp, archiveAccount, reactivateAccount,
  snoozeAccount, updateAccount,
} from '@/lib/command/store';
import type { Account } from '@/types/command';
import ViewTabs, { type ViewTabId } from '@/components/command/view-tabs';
import QuickFilters, { applyCockpitFilters, DEFAULT_FILTERS, type CockpitFilters } from '@/components/command/quick-filters';
import ActionBar from '@/components/command/action-bar';
import ProspectRow from '@/components/command/prospect-row';
import DetailPanel from '@/components/command/detail-panel';
import { getTodayPlan, isInSendingWindow } from '@/lib/command/sending-windows';

// ── Font stacks ─────────────────────────────────────────────
const FONT_BODY = 'var(--gt-font-dm-sans, "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const FONT_MONO = 'var(--gt-font-ibm-plex, "IBM Plex Mono", "SF Mono", "Fira Code", monospace)';

// ── CSS Keyframes (Skill 9 — Motion Choreographer) ──────────
const KEYFRAMES_CSS = `
@keyframes gt-fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes gt-fadeTabContent {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes gt-slideInRow {
  from { opacity: 0; transform: translateX(-12px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes gt-slideOutLeft {
  from { opacity: 1; transform: translateX(0); }
  to   { opacity: 0; transform: translateX(-60px); }
}
@keyframes gt-slideInRight {
  0%   { opacity: 0; transform: translateX(100%); }
  100% { opacity: 1; transform: translateX(0); }
}
@keyframes gt-slideOutRight {
  from { opacity: 1; transform: translateX(0); }
  to   { opacity: 0; transform: translateX(100%); }
}
@keyframes gt-pulseGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
  50%      { box-shadow: 0 0 8px 2px rgba(34,197,94,0.18); }
}
@keyframes gt-pulseRed {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
  50%      { box-shadow: 0 0 8px 2px rgba(239,68,68,0.18); }
}
@keyframes gt-stepPulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.15); }
}
@keyframes gt-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes mc-cardEnter {
  from { opacity: 0; transform: translateY(24px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes mc-swipeLeft {
  from { opacity: 1; transform: translateX(0) rotate(0deg); }
  to   { opacity: 0; transform: translateX(-120%) rotate(-12deg); }
}
@keyframes mc-swipeRight {
  from { opacity: 1; transform: translateX(0) rotate(0deg); }
  to   { opacity: 0; transform: translateX(120%) rotate(12deg); }
}
@keyframes mc-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.5; }
}
@keyframes mc-blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
`;

// ── Signal polling ──────────────────────────────────────────
interface IncomingSignal {
  id: number;
  event_type: string;
  domain: string;
  email?: string;
  company_name?: string;
  contact_name?: string;
  headcount?: number;
  industry?: string;
  country?: string;
  event_data?: Record<string, unknown>;
  created_at: string;
}

// ── BANT+ Scoring (Skill 13 — Deal Closer) ─────────────────
interface BANTScore {
  budget: number;      // /25
  authority: number;   // /20
  need: number;        // /20
  timing: number;      // /15
  fit: number;         // /10
  proof: number;       // /10
  total: number;       // /100
}

function computeBANT(a: Account): BANTScore {
  // Budget (25): based on revenue estimate & company size
  const rev = a.revenueEstimate || 0;
  const budget = rev >= 50000 ? 25 : rev >= 10000 ? 20 : rev >= 5000 ? 15 : rev >= 1000 ? 10 : 5;

  // Authority (20): has finance lead with title
  const hasLead = !!(a.financeLead?.name && a.financeLead.name.trim());
  const isCLevel = /\b(cfo|cio|cto|vp|director|head|chief)\b/i.test(a.financeLead?.title || '');
  const authority = isCLevel ? 20 : hasLead ? 12 : 4;

  // Need (20): signals strength + hypothesis
  const sigStrength = a.signals.reduce((sum, s) => sum + s.strength, 0);
  const hasHypothesis = !!(a.hypothesis?.summary);
  const need = Math.min(20, (sigStrength >= 10 ? 12 : sigStrength >= 5 ? 8 : 3) + (hasHypothesis ? 8 : 0));

  // Timing (15): attackability + freshness
  const timing = a.attackability === 'now' ? 15 : a.attackability === 'soon' ? 10 : a.attackability === 'later' ? 5 : 2;

  // Fit (10): solo fit + country in primary markets
  const fitMap = { ideal: 10, good: 7, stretch: 4, hard: 2 };
  const fit = fitMap[a.solofit] || 4;

  // Proof (10): scan results + proof level
  const hasScan = a.scan?.status === 'complete';
  const proof = Math.min(10, (hasScan ? 6 : 0) + (a.proofLevel ? Math.round(a.proofLevel / 8.5) : 0));

  return { budget, authority, need, timing, fit, proof, total: budget + authority + need + timing + fit + proof };
}

// ── Path to Close (Skill 13) ────────────────────────────────
type CloseStage = 'scan' | 'exposure' | 'tension' | 'payment';

function getCloseStage(a: Account): CloseStage {
  if (a.outreachStatus === 'sent' || a.outreachStatus === 'replied' || a.leadStatus === 'contacted' || a.leadStatus === 'replied') return 'payment';
  if (a.scan?.status === 'complete' && a.hypothesis?.summary) return 'tension';
  if (a.scan?.status === 'complete') return 'exposure';
  return 'scan';
}

const CLOSE_STAGES: { id: CloseStage; label: string }[] = [
  { id: 'scan', label: 'SCAN' },
  { id: 'exposure', label: 'EXPOSURE' },
  { id: 'tension', label: 'TENSION' },
  { id: 'payment', label: 'PAYMENT' },
];

// ── Outbound Sequence (Skill 17) ────────────────────────────
interface SequenceStep {
  day: number;
  channel: 'email' | 'linkedin' | 'followup';
  label: string;
  done: boolean;
  active: boolean;
  cooldownBlocked: boolean;
}

function getSequenceSteps(a: Account): SequenceStep[] {
  const sentAt = a.sentAt ? new Date(a.sentAt).getTime() : 0;
  const now = Date.now();
  const hoursSinceSent = sentAt ? (now - sentAt) / 3600000 : 0;
  const isSent = a.outreachStatus === 'sent' || a.outreachStatus === 'replied';
  const isReplied = a.outreachStatus === 'replied' || a.leadStatus === 'replied';
  const hasLinkedIn = !!a.financeLead?.linkedIn;

  // 48h rule: if contacted on one channel, other channel grayed out for 48h
  const emailCooldown = isSent && hoursSinceSent < 48;

  return [
    {
      day: 0,
      channel: 'email',
      label: 'D0 Email',
      done: isSent || isReplied,
      active: !isSent && a.readyToSend === true,
      cooldownBlocked: false,
    },
    {
      day: 2,
      channel: 'linkedin',
      label: 'D2 LinkedIn',
      done: false, // Would need linkedin state tracking
      active: isSent && hoursSinceSent >= 48 && hasLinkedIn,
      cooldownBlocked: emailCooldown && hasLinkedIn,
    },
    {
      day: 7,
      channel: 'followup',
      label: 'D7 Follow-up',
      done: (a.followUpCount || 0) > 0 && isReplied,
      active: isSent && hoursSinceSent >= 168 && !isReplied,
      cooldownBlocked: false,
    },
  ];
}

// ── Financial range formatter (Skill 8) ─────────────────────
function formatFinancialRange(low: number, high: number, currency: string = 'EUR'): string {
  const fmt = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${Math.round(n / 1000)}k`;
    return n.toLocaleString();
  };
  return `${fmt(low)}\u2013${fmt(high)} ${currency}`;
}

function formatRevenue(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return n.toLocaleString();
}

// ── Date helpers ────────────────────────────────────────────
function formatDate(iso?: string): string {
  if (!iso) return '\u2014';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return '1d ago';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const d = new Date(iso).getTime();
  return Math.ceil((d - Date.now()) / 86400000);
}

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

export default function CockpitV3() {
  // ── State ────────────────────────────────────────────────
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeView, setActiveView] = useState<ViewTabId>('focus_now');
  const [prevView, setPrevView] = useState<ViewTabId>('focus_now');

  // ── Mission Control State ─────────────────────────────
  type MCMode = 'briefing' | 'approval' | 'done' | 'cockpit';
  const [mcMode, setMcMode] = useState<MCMode>('briefing');
  const [approvalQueue, setApprovalQueue] = useState<Account[]>([]);
  const [approvalIndex, setApprovalIndex] = useState(0);
  const [approvedList, setApprovedList] = useState<Account[]>([]);
  const [passedList, setPassedList] = useState<Account[]>([]);
  const [cardAnim, setCardAnim] = useState<'left' | 'right' | null>(null);
  const [filters, setFilters] = useState<CockpitFilters>(DEFAULT_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailClosing, setDetailClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [tabFadeKey, setTabFadeKey] = useState(0);
  const [archivingIds, setArchivingIds] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);

  // ── Tab change with cross-fade (Skill 9) ──────────────────
  const handleViewChange = useCallback((view: ViewTabId) => {
    setPrevView(activeView);
    setActiveView(view);
    setTabFadeKey(k => k + 1);
  }, [activeView]);

  // ── Detail panel slide-in/out (Skill 9) ───────────────────
  const handleOpenDetail = useCallback((id: string) => {
    setDetailClosing(false);
    setDetailId(id);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailClosing(true);
    setTimeout(() => {
      setDetailId(null);
      setDetailClosing(false);
    }, 300);
  }, []);

  // ── Archive with slide-out (Skill 9) ──────────────────────
  const handleArchiveWithAnimation = useCallback((accountId: string) => {
    setArchivingIds(prev => new Set(prev).add(accountId));
    setTimeout(() => {
      setAccounts(prev => {
        const updated = archiveAccount([...prev], accountId);
        const computed = computeReadyToSend(updated);
        saveAccounts(computed);
        return computed;
      });
      setArchivingIds(prev => {
        const next = new Set(prev);
        next.delete(accountId);
        return next;
      });
    }, 250);
  }, []);

  // ── Mobile detection ─────────────────────────────────────
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ── Load accounts ────────────────────────────────────────
  useEffect(() => {
    try {
      let accs = loadAccounts() as Account[];
      accs = unsnoozeExpired(accs);
      accs = computeReadyToSend(accs);
      setAccounts(accs);
      setLoaded(true);
      // Build approval queue from ready-to-send accounts
      const queue = accs
        .filter(a => a.readyToSend && !a.hiddenFromActiveView)
        .sort((a, b) => (b.score || 0) - (a.score || 0));
      setApprovalQueue(queue);

      // Sync with Sarah (non-blocking)
      fetch('/api/command/sync', { cache: 'no-store' })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.accounts?.length) {
            const domains = new Set(accs.map(a => a.domain));
            const newAccs = data.accounts.filter((a: any) => !domains.has(a.domain));
            if (newAccs.length) {
              const merged = computeReadyToSend([...accs, ...newAccs] as Account[]);
              setAccounts(merged);
              saveAccounts(merged);
            }
          }
        })
        .catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load accounts');
    }
  }, []);

  // ── Signal polling (60s) ─────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    const poll = async () => {
      try {
        const res = await fetch('/api/command/ingest');
        if (!res.ok) return;
        const { events } = await res.json();
        if (!events?.length) return;
        let updated = [...accounts];
        for (const sig of events as IncomingSignal[]) {
          const event: PlatformEvent = {
            type: sig.event_type as PlatformEvent['type'],
            domain: sig.domain, email: sig.email,
            companyName: sig.company_name, contactName: sig.contact_name,
            headcount: sig.headcount, industry: sig.industry,
            country: sig.country, data: sig.event_data, timestamp: sig.created_at,
          };
          const result = processEventIntoAccounts(updated as any[], event);
          updated = result.accounts as Account[];
          if (sig.email && sig.domain) {
            let intel = loadDomainIntel();
            intel = learnDomainPattern(sig.email, sig.contact_name || '', intel);
            saveDomainIntel(intel);
            const resolved = resolveAllEmails(updated as any[], intel);
            updated = resolved.accounts as Account[];
          }
          fetch('/api/command/ingest', {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: [sig.id] }),
          }).catch(() => {});
        }
        const computed = computeReadyToSend(updated);
        setAccounts(computed);
        saveAccounts(computed);
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 60_000);
    return () => clearInterval(interval);
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persist on change ────────────────────────────────────
  const persist = useCallback((accs: Account[]) => {
    const computed = computeReadyToSend(accs);
    setAccounts(computed);
    saveAccounts(computed);
    return computed;
  }, []);

  // ── Action handler ───────────────────────────────────────
  const handleAction = useCallback((accountId: string, action: string, payload?: any) => {
    // Archive uses animated version
    if (action === 'archive') {
      handleArchiveWithAnimation(accountId);
      return;
    }
    setAccounts(prev => {
      let updated = [...prev];
      switch (action) {
        case 'mark_sent':
          updated = markSent(updated, accountId);
          break;
        case 'mark_replied':
          updated = markReplied(updated, accountId);
          break;
        case 'snooze_3d':
          updated = snoozeAccount(updated, accountId, 3);
          break;
        case 'snooze_7d':
          updated = snoozeAccount(updated, accountId, 7);
          break;
        case 'snooze_14d':
          updated = snoozeAccount(updated, accountId, 14);
          break;
        case 'follow_up_3d':
          updated = scheduleFollowUp(updated, accountId, 3);
          break;
        case 'follow_up_7d':
          updated = scheduleFollowUp(updated, accountId, 7);
          break;
        case 'ignore':
          updated = updateAccount(updated, accountId, { leadStatus: 'ignored', hiddenFromActiveView: true, lastActionAt: new Date().toISOString(), lastActionType: 'ignored' } as any);
          break;
        case 'reactivate':
          updated = reactivateAccount(updated, accountId);
          break;
        case 'mark_not_sent':
          updated = updateAccount(updated, accountId, { outreachStatus: 'message_ready', sentAt: undefined, leadStatus: 'ready_to_send', lastActionAt: new Date().toISOString(), lastActionType: 'unmarked_sent' } as any);
          break;
        default:
          break;
      }
      const computed = computeReadyToSend(updated);
      saveAccounts(computed);
      return computed;
    });
  }, [handleArchiveWithAnimation]);

  // ── Bulk actions ─────────────────────────────────────────
  const handleBulkAction = useCallback((action: string) => {
    setAccounts(prev => {
      let updated = [...prev];
      for (const id of selectedIds) {
        switch (action) {
          case 'mark_sent':
            updated = markSent(updated, id);
            break;
          case 'snooze_7d':
            updated = snoozeAccount(updated, id, 7);
            break;
          case 'archive':
            updated = archiveAccount(updated, id);
            break;
        }
      }
      setSelectedIds(new Set());
      const computed = computeReadyToSend(updated);
      saveAccounts(computed);
      return computed;
    });
  }, [selectedIds]);

  // ── Computed views ───────────────────────────────────────
  const viewAccounts = useMemo(() => {
    const viewFiltered = getViewAccounts(accounts, activeView);
    return applyCockpitFilters(viewFiltered, filters);
  }, [accounts, activeView, filters]);

  const viewCounts = useMemo(() => {
    const views = ['focus_now', 'not_sent', 'message_ready', 'draft_created', 'sent', 'waiting_reply', 'follow_up_due', 'replied', 'ignored_archived', 'all'];
    const counts: Record<string, number> = {};
    for (const v of views) {
      counts[v] = getViewAccounts(accounts, v).length;
    }
    return counts;
  }, [accounts]);

  const detailAccount = useMemo(() =>
    detailId ? accounts.find(a => a.id === detailId) || null : null,
  [accounts, detailId]);

  // ── Aggregate metrics (Skill 8 — top stats bar) ──────────
  const metrics = useMemo(() => {
    const active = accounts.filter(a => !a.hiddenFromActiveView && !a.isSnoozed);
    const readyCount = active.filter(a => a.readyToSend).length;
    const followUpsDue = active.filter(a => {
      if (a.outreachStatus === 'follow_up_due') return true;
      if (a.followUpDueAt && new Date(a.followUpDueAt).getTime() <= Date.now()) return true;
      return false;
    }).length;
    const sentCount = active.filter(a => a.outreachStatus === 'sent' || a.outreachStatus === 'replied').length;
    const repliedCount = active.filter(a => a.outreachStatus === 'replied' || a.leadStatus === 'replied').length;

    // Pipeline value as range
    const totalLow = active.reduce((s, a) => s + (a.scan?.exposureLow || Math.round(a.revenueEstimate * 0.6)), 0);
    const totalHigh = active.reduce((s, a) => s + (a.scan?.exposureHigh || a.revenueEstimate), 0);

    // Average BANT
    const bantScores = active.map(a => computeBANT(a).total);
    const avgBant = bantScores.length ? Math.round(bantScores.reduce((a, b) => a + b, 0) / bantScores.length) : 0;

    return {
      total: active.length,
      ready: readyCount,
      followUps: followUpsDue,
      sent: sentCount,
      replied: repliedCount,
      pipelineLow: totalLow,
      pipelineHigh: totalHigh,
      avgBant,
    };
  }, [accounts]);

  // ── Mission Control Handlers ─────────────────────────────
  const handleApprove = useCallback((account: Account) => {
    setCardAnim('right');
    setTimeout(() => {
      setApprovedList(prev => [...prev, account]);
      setCardAnim(null);
      if (approvalIndex + 1 >= approvalQueue.length) {
        setMcMode('done');
      } else {
        setApprovalIndex(i => i + 1);
      }
    }, 380);
  }, [approvalIndex, approvalQueue.length]);

  const handlePass = useCallback((account: Account) => {
    setCardAnim('left');
    setTimeout(() => {
      setPassedList(prev => [...prev, account]);
      setCardAnim(null);
      if (approvalIndex + 1 >= approvalQueue.length) {
        setMcMode('done');
      } else {
        setApprovalIndex(i => i + 1);
      }
    }, 380);
  }, [approvalIndex, approvalQueue.length]);

  const handleEnterApproval = useCallback(() => {
    setApprovalIndex(0);
    setApprovedList([]);
    setPassedList([]);
    setCardAnim(null);
    const queue = accounts
      .filter(a => a.readyToSend && !a.hiddenFromActiveView)
      .sort((a, b) => (b.score || 0) - (a.score || 0));
    setApprovalQueue(queue);
    setMcMode('approval');
  }, [accounts]);

  // ── Mission Control Screens ──────────────────────────────
  if (mcMode === 'briefing') {
    return <MCBriefingScreen
      accounts={accounts}
      metrics={metrics}
      onEnterApproval={handleEnterApproval}
      onOpenCockpit={() => setMcMode('cockpit')}
    />;
  }

  if (mcMode === 'approval') {
    const currentCard = approvalQueue[approvalIndex];
    if (!currentCard) {
      // Empty queue
      return <MCDoneScreen
        approved={approvedList}
        passed={passedList}
        onBackToBriefing={() => setMcMode('briefing')}
        onOpenCockpit={() => setMcMode('cockpit')}
      />;
    }
    return <MCApprovalScreen
      card={currentCard}
      index={approvalIndex}
      total={approvalQueue.length}
      cardAnim={cardAnim}
      onApprove={() => handleApprove(currentCard)}
      onPass={() => handlePass(currentCard)}
      onBackToBriefing={() => setMcMode('briefing')}
    />;
  }

  if (mcMode === 'done') {
    return <MCDoneScreen
      approved={approvedList}
      passed={passedList}
      onBackToBriefing={() => setMcMode('briefing')}
      onOpenCockpit={() => setMcMode('cockpit')}
    />;
  }

  // ── Render ───────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ padding: 40, color: '#DC2626', fontFamily: FONT_MONO, background: '#FFFFFF', minHeight: '100vh' }}>
        <h2 style={{ fontSize: 18, marginBottom: 12, color: '#0F172A' }}>Cockpit Error</h2>
        <pre style={{ fontSize: 12, background: '#F8FAFC', padding: 16, borderRadius: 8, border: '1px solid #E2E8F0', color: '#334155' }}>{error}</pre>
        <button onClick={() => { localStorage.clear(); window.location.reload(); }}
          style={{ marginTop: 16, padding: '8px 16px', background: '#F1F5F9', color: '#334155', border: '1px solid #E2E8F0', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: FONT_BODY }}>
          CLEAR CACHE &amp; RELOAD
        </button>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div style={{
        padding: 60, color: '#94A3B8', fontSize: 13, fontFamily: FONT_MONO,
        background: '#FFFFFF', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 120, height: 3, borderRadius: 2,
            background: 'linear-gradient(90deg, #E2E8F0 25%, #94A3B8 50%, #E2E8F0 75%)',
            backgroundSize: '200% 100%',
            animation: 'gt-shimmer 1.5s ease-in-out infinite',
            marginBottom: 16,
          }} />
          <span>Loading Mission Control...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      background: '#FFFFFF',
      color: '#334155',
      fontFamily: FONT_BODY,
    }}>
      {/* Inject keyframes (Skill 9) */}
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES_CSS }} />

      {/* ══════════════════════════════════════════════════════ */}
      {/* TOP STATS BAR (Skill 8 — Metric card pattern)        */}
      {/* ══════════════════════════════════════════════════════ */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        padding: isMobile ? '10px 12px' : '14px 24px',
        background: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        overflowX: isMobile ? 'auto' : 'visible',
        scrollbarWidth: 'none' as React.CSSProperties['scrollbarWidth'],
        WebkitOverflowScrolling: 'touch',
      }}>
        {/* Ready to Send — green glow (Skill 7) */}
        <MetricCard
          label="READY TO SEND"
          value={metrics.ready}
          unit="prospects"
          accentColor="#16A34A"
          glow={metrics.ready > 0}
          glowAnimation="gt-pulseGlow"
        />
        <StatSeparator />

        {/* Follow-ups Due — red glow (Skill 7) */}
        <MetricCard
          label="FOLLOW-UPS DUE"
          value={metrics.followUps}
          unit="today"
          accentColor={metrics.followUps > 0 ? '#DC2626' : '#94A3B8'}
          glow={metrics.followUps > 0}
          glowAnimation="gt-pulseRed"
        />
        <StatSeparator />

        {/* Sent */}
        <MetricCard
          label="SENT"
          value={metrics.sent}
          unit="contacted"
          accentColor="#0F172A"
        />
        <StatSeparator />

        {/* Replied */}
        <MetricCard
          label="REPLIED"
          value={metrics.replied}
          unit="responses"
          accentColor={metrics.replied > 0 ? '#16A34A' : '#94A3B8'}
        />
        <StatSeparator />

        {/* Pipeline Value — financial range with en-dash (Skill 8) */}
        <div style={{ padding: '6px 16px' }}>
          <div style={{
            fontFamily: FONT_MONO, fontSize: 10, textTransform: 'uppercase' as const,
            letterSpacing: '0.1em', color: '#64748B', marginBottom: 4, fontWeight: 600,
          }}>PIPELINE VALUE</div>
          <div style={{
            fontFamily: FONT_MONO, fontSize: 18, fontWeight: 700, color: '#0F172A',
            letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums',
          }}>
            {formatFinancialRange(metrics.pipelineLow, metrics.pipelineHigh)}
          </div>
        </div>
        <StatSeparator />

        {/* Avg BANT Score */}
        <MetricCard
          label="AVG BANT+"
          value={metrics.avgBant}
          unit="/100"
          accentColor={metrics.avgBant >= 60 ? '#16A34A' : metrics.avgBant >= 40 ? '#0F172A' : '#94A3B8'}
        />

        {/* Total Active — right aligned */}
        <div style={{ marginLeft: 'auto', padding: '6px 16px' }}>
          <div style={{
            fontFamily: FONT_MONO, fontSize: 10, textTransform: 'uppercase' as const,
            letterSpacing: '0.1em', color: '#64748B', marginBottom: 4, fontWeight: 600,
          }}>ACTIVE</div>
          <div style={{
            fontFamily: FONT_MONO, fontSize: 22, fontWeight: 700, color: '#0F172A',
            letterSpacing: '-0.02em', textAlign: 'right' as const,
          }}>
            {metrics.total}
          </div>
        </div>

        {/* Mission Control Button */}
        <button
          onClick={() => setMcMode('briefing')}
          style={{
            marginLeft: 16,
            padding: '7px 14px',
            background: '#060912',
            color: '#22d3ee',
            border: '1px solid rgba(34,211,238,0.25)',
            borderRadius: 7,
            fontFamily: FONT_MONO,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            cursor: 'pointer',
            textTransform: 'uppercase' as const,
            whiteSpace: 'nowrap' as const,
          }}
        >
          ⟵ MISSION CTRL
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* VIEW TABS                                             */}
      {/* ══════════════════════════════════════════════════════ */}
      <ViewTabs activeView={activeView} counts={viewCounts} onChange={handleViewChange} />

      {/* ══════════════════════════════════════════════════════ */}
      {/* FILTERS + ACTION BAR                                  */}
      {/* ══════════════════════════════════════════════════════ */}
      <div style={{ padding: '0' }}>
        <ActionBar
          accounts={viewAccounts}
          selectedIds={selectedIds}
          onBulkAction={(action, ids) => handleBulkAction(action)}
        />
        <QuickFilters filters={filters} onChange={setFilters} />
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* PROSPECT LIST — staggered entrance (Skill 9)          */}
      {/* ══════════════════════════════════════════════════════ */}
      <div
        key={`tab-content-${tabFadeKey}`}
        style={{
          padding: '0 0 80px 0',
          animation: 'gt-fadeTabContent 200ms ease-out',
          overflowX: isMobile ? 'auto' : 'visible',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Column headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          padding: '8px 24px',
          borderBottom: '1px solid #F1F5F9',
          background: '#FAFBFD',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontFamily: FONT_MONO, fontSize: 10, color: '#94A3B8',
            textTransform: 'uppercase' as const, letterSpacing: '0.1em', fontWeight: 600,
          }}>
            <span>{viewAccounts.length} prospect{viewAccounts.length !== 1 ? 's' : ''} in view</span>
            <span style={{ display: 'flex', gap: 24 }}>
              <span>PATH TO CLOSE</span>
              <span>SEQUENCE</span>
              <span>BANT+</span>
            </span>
          </div>
        </div>

        {viewAccounts.length === 0 ? (
          <div style={{
            padding: 60, textAlign: 'center', color: '#94A3B8', fontSize: 13,
            fontFamily: FONT_MONO, animation: 'gt-fadeIn 300ms ease',
          }}>
            {activeView === 'focus_now' ? 'No prospects ready to send. Generate messages or enrich leads.' :
             activeView === 'follow_up_due' ? 'No follow-ups due. All caught up.' :
             `No prospects in this view.`}
          </div>
        ) : (
          viewAccounts.map((account, index) => (
            <ProspectRowEnhanced
              key={account.id}
              account={account}
              index={index}
              isSelected={selectedIds.has(account.id)}
              isArchiving={archivingIds.has(account.id)}
              onSelect={(id) => {
                setSelectedIds(prev => {
                  const next = new Set(prev);
                  next.has(id) ? next.delete(id) : next.add(id);
                  return next;
                });
              }}
              onAction={handleAction}
              onOpenDetail={handleOpenDetail}
            />
          ))
        )}
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* DETAIL PANEL — slide-in from right (Skill 9)          */}
      {/* ══════════════════════════════════════════════════════ */}
      {detailAccount && (
        <DetailPanelEnhanced
          account={detailAccount}
          onAction={handleAction}
          onClose={handleCloseDetail}
          isClosing={detailClosing}
        />
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* KEYBOARD SHORTCUTS                                    */}
      {/* ══════════════════════════════════════════════════════ */}
      <KeyboardHandler
        accounts={viewAccounts}
        selectedIds={selectedIds}
        onAction={handleAction}
        onSelect={setSelectedIds}
        detailId={detailId}
        onOpenDetail={handleOpenDetail}
        onCloseDetail={handleCloseDetail}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// METRIC CARD (Skill 8 — Data Presentation Sculptor)
// ══════════════════════════════════════════════════════════════

function MetricCard({ label, value, unit, accentColor, glow, glowAnimation }: {
  label: string;
  value: number;
  unit: string;
  accentColor: string;
  glow?: boolean;
  glowAnimation?: string;
}) {
  return (
    <div style={{
      padding: '6px 16px',
      borderRadius: 8,
      animation: glow ? `${glowAnimation} 2s ease-in-out infinite` : undefined,
    }}>
      <div style={{
        fontFamily: FONT_MONO, fontSize: 10, textTransform: 'uppercase' as const,
        letterSpacing: '0.1em', color: '#64748B', marginBottom: 4, fontWeight: 600,
      }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{
          fontFamily: FONT_MONO, fontSize: 22, fontWeight: 700, color: accentColor,
          letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
        }}>{value}</span>
        <span style={{
          fontFamily: FONT_MONO, fontSize: 12, color: '#94A3B8', fontWeight: 400,
        }}>{unit}</span>
      </div>
    </div>
  );
}

function StatSeparator() {
  return <div style={{ width: 1, height: 36, background: '#F1F5F9', flexShrink: 0 }} />;
}

// ══════════════════════════════════════════════════════════════
// PATH TO CLOSE INDICATOR (Skill 13 — Deal Closer)
// ══════════════════════════════════════════════════════════════

function PathToClose({ account }: { account: Account }) {
  const currentStage = getCloseStage(account);
  const stageIndex = CLOSE_STAGES.findIndex(s => s.id === currentStage);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {CLOSE_STAGES.map((stage, i) => {
        const isComplete = i < stageIndex;
        const isCurrent = i === stageIndex;
        const color = isComplete ? '#16A34A' : isCurrent ? '#3B82F6' : '#E2E8F0';
        const bgColor = isComplete ? 'rgba(22,163,74,0.06)' : isCurrent ? 'rgba(59,130,246,0.06)' : 'transparent';
        const borderColor = isComplete ? 'rgba(22,163,74,0.15)' : isCurrent ? 'rgba(59,130,246,0.15)' : '#E2E8F0';
        return (
          <div key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Stage badge — 3-layer (Skill 7) */}
            <div style={{
              padding: '2px 6px',
              borderRadius: 3,
              fontSize: 9,
              fontFamily: FONT_MONO,
              fontWeight: 600,
              letterSpacing: '0.05em',
              color,
              background: bgColor,
              border: `1px solid ${borderColor}`,
              animation: isCurrent ? 'gt-stepPulse 2s ease-in-out infinite' : undefined,
            }}>
              {stage.label}
            </div>
            {/* Connector line */}
            {i < CLOSE_STAGES.length - 1 && (
              <div style={{
                width: 8, height: 1,
                background: isComplete ? '#16A34A' : '#E2E8F0',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SEQUENCE TIMELINE (Skill 17 — Outbound Orchestrator)
// ══════════════════════════════════════════════════════════════

function SequenceTimeline({ account }: { account: Account }) {
  const steps = getSequenceSteps(account);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {steps.map((step, i) => {
        const color = step.done ? '#16A34A'
          : step.active ? '#3B82F6'
          : step.cooldownBlocked ? '#F59E0B'
          : '#CBD5E1';
        const bgColor = step.done ? 'rgba(22,163,74,0.06)'
          : step.active ? 'rgba(59,130,246,0.06)'
          : step.cooldownBlocked ? 'rgba(245,158,11,0.06)'
          : 'transparent';
        const borderColor = step.done ? 'rgba(22,163,74,0.15)'
          : step.active ? 'rgba(59,130,246,0.15)'
          : step.cooldownBlocked ? 'rgba(245,158,11,0.15)'
          : '#E2E8F0';
        const title = step.cooldownBlocked
          ? `${step.label} — 48h cooldown active`
          : step.done ? `${step.label} — done`
          : step.active ? `${step.label} — ready`
          : step.label;

        return (
          <div key={step.day} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <div
              title={title}
              style={{
                padding: '2px 5px',
                borderRadius: 3,
                fontSize: 9,
                fontFamily: FONT_MONO,
                fontWeight: 600,
                letterSpacing: '0.03em',
                color,
                background: bgColor,
                border: `1px solid ${borderColor}`,
                opacity: step.cooldownBlocked ? 0.5 : 1,
                textDecoration: step.cooldownBlocked ? 'line-through' : 'none',
              }}
            >
              {step.done ? '\u2713' : ''}{step.label}
            </div>
            {i < steps.length - 1 && (
              <div style={{
                width: 6, height: 1,
                background: step.done ? '#16A34A' : '#E2E8F0',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// BANT+ BADGE (Skill 13)
// ══════════════════════════════════════════════════════════════

function BANTBadge({ account, compact }: { account: Account; compact?: boolean }) {
  const bant = computeBANT(account);
  const color = bant.total >= 70 ? '#16A34A' : bant.total >= 50 ? '#3B82F6' : bant.total >= 30 ? '#F59E0B' : '#94A3B8';
  const bgColor = bant.total >= 70 ? 'rgba(22,163,74,0.06)' : bant.total >= 50 ? 'rgba(59,130,246,0.06)' : bant.total >= 30 ? 'rgba(245,158,11,0.06)' : 'rgba(148,163,184,0.06)';
  const borderColor = bant.total >= 70 ? 'rgba(22,163,74,0.15)' : bant.total >= 50 ? 'rgba(59,130,246,0.15)' : bant.total >= 30 ? 'rgba(245,158,11,0.15)' : 'rgba(148,163,184,0.10)';

  if (compact) {
    return (
      <span
        title={`BANT+ ${bant.total}/100 — B:${bant.budget} A:${bant.authority} N:${bant.need} T:${bant.timing} F:${bant.fit} P:${bant.proof}`}
        style={{
          display: 'inline-flex', alignItems: 'center',
          padding: '2px 7px', borderRadius: 3,
          fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700,
          color, background: bgColor, border: `1px solid ${borderColor}`,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {bant.total}
      </span>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{
          fontFamily: FONT_MONO, fontSize: 28, fontWeight: 700, color,
          lineHeight: 1, letterSpacing: '-0.02em',
        }}>{bant.total}</span>
        <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: '#94A3B8' }}>/100</span>
      </div>
      {/* Breakdown bars */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '3px 8px', alignItems: 'center', fontSize: 10 }}>
        {([
          { key: 'B', val: bant.budget, max: 25 },
          { key: 'A', val: bant.authority, max: 20 },
          { key: 'N', val: bant.need, max: 20 },
          { key: 'T', val: bant.timing, max: 15 },
          { key: 'F', val: bant.fit, max: 10 },
          { key: 'P', val: bant.proof, max: 10 },
        ] as const).map(({ key, val, max }) => (
          <div key={key} style={{ display: 'contents' }}>
            <span style={{ fontFamily: FONT_MONO, color: '#64748B', fontWeight: 600 }}>{key}</span>
            <div style={{
              height: 4, borderRadius: 2, background: '#F1F5F9', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: 2,
                width: `${(val / max) * 100}%`,
                background: val / max >= 0.7 ? '#16A34A' : val / max >= 0.4 ? '#3B82F6' : '#CBD5E1',
                transition: 'width 300ms ease',
              }} />
            </div>
            <span style={{
              fontFamily: FONT_MONO, color: '#94A3B8', textAlign: 'right' as const,
              fontVariantNumeric: 'tabular-nums',
            }}>{val}/{max}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ENHANCED PROSPECT ROW (wraps original + adds skills 9/13/17)
// ══════════════════════════════════════════════════════════════

function ProspectRowEnhanced({
  account, index, isSelected, isArchiving, onSelect, onAction, onOpenDetail,
}: {
  account: Account;
  index: number;
  isSelected: boolean;
  isArchiving: boolean;
  onSelect: (id: string) => void;
  onAction: (id: string, action: string, payload?: string) => void;
  onOpenDetail: (id: string) => void;
}) {
  // Stagger entrance delay (Skill 9): 40ms per item, max 400ms
  const delay = Math.min(index * 40, 400);

  return (
    <div
      style={{
        animation: isArchiving
          ? 'gt-slideOutLeft 250ms ease-out forwards'
          : `gt-slideInRow 200ms ease-out ${delay}ms both`,
      }}
    >
      {/* Original ProspectRow */}
      <ProspectRow
        account={account}
        isSelected={isSelected}
        onSelect={onSelect}
        onAction={onAction}
        onOpenDetail={onOpenDetail}
      />
      {/* Additional skills strip below each row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 24px 8px',
        borderBottom: '1px solid #F8FAFC',
        background: '#FFFFFF',
      }}>
        {/* Path to Close (Skill 13) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <PathToClose account={account} />
          {/* Revenue estimate as range (Skill 8) */}
          {account.scan ? (
            <span style={{
              fontFamily: FONT_MONO, fontSize: 11, color: '#64748B',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {formatFinancialRange(account.scan.exposureLow, account.scan.exposureHigh, account.scan.currency)}
            </span>
          ) : account.revenueEstimate > 0 ? (
            <span style={{
              fontFamily: FONT_MONO, fontSize: 11, color: '#94A3B8',
              fontVariantNumeric: 'tabular-nums',
            }}>
              ~{formatRevenue(account.revenueEstimate)} EUR
            </span>
          ) : null}
        </div>

        {/* Right side: Sequence + BANT */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <SequenceTimeline account={account} />
          <BANTBadge account={account} compact />
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ENHANCED DETAIL PANEL (wraps original + slide animation + BANT)
// ══════════════════════════════════════════════════════════════

function DetailPanelEnhanced({
  account, onAction, onClose, isClosing,
}: {
  account: Account;
  onAction: (id: string, action: string, payload?: string) => void;
  onClose: () => void;
  isClosing: boolean;
}) {
  return (
    <div style={{
      animation: isClosing
        ? 'gt-slideOutRight 300ms cubic-bezier(0.16,1,0.3,1) forwards'
        : 'gt-slideInRight 300ms cubic-bezier(0.16,1,0.3,1)',
    }}>
      {/* Wrap the original DetailPanel but add BANT + sequence sections via overlay */}
      <DetailPanel
        account={account}
        onAction={onAction}
        onClose={onClose}
      />
      {/* BANT+ Score overlay — positioned inside the detail panel */}
      <div style={{
        position: 'fixed',
        bottom: 80,
        right: 20,
        width: 260,
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 10,
        padding: '16px 18px',
        zIndex: 1001,
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        animation: 'gt-fadeIn 300ms ease 150ms both',
      }}>
        <div style={{
          fontFamily: FONT_MONO, fontSize: 10, textTransform: 'uppercase' as const,
          letterSpacing: '0.1em', color: '#64748B', marginBottom: 10, fontWeight: 600,
        }}>BANT+ SCORE</div>
        <BANTBadge account={account} />

        {/* Sequence Timeline */}
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #F1F5F9' }}>
          <div style={{
            fontFamily: FONT_MONO, fontSize: 10, textTransform: 'uppercase' as const,
            letterSpacing: '0.1em', color: '#64748B', marginBottom: 8, fontWeight: 600,
          }}>OUTBOUND SEQUENCE</div>
          <SequenceTimeline account={account} />
          {/* 48h rule indicator */}
          {account.sentAt && (
            <div style={{
              marginTop: 8, fontSize: 10, fontFamily: FONT_MONO, color: '#F59E0B',
            }}>
              {(() => {
                const hours = Math.round((Date.now() - new Date(account.sentAt).getTime()) / 3600000);
                if (hours < 48) return `48h rule: ${48 - hours}h remaining before next channel`;
                return 'Cooldown cleared — next channel available';
              })()}
            </div>
          )}
        </div>

        {/* Path to Close */}
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #F1F5F9' }}>
          <div style={{
            fontFamily: FONT_MONO, fontSize: 10, textTransform: 'uppercase' as const,
            letterSpacing: '0.1em', color: '#64748B', marginBottom: 8, fontWeight: 600,
          }}>PATH TO CLOSE</div>
          <PathToClose account={account} />
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ══════════════════════════════════════════════════════════════

function KeyboardHandler({
  accounts, selectedIds, onAction, onSelect, detailId, onOpenDetail, onCloseDetail,
}: {
  accounts: Account[];
  selectedIds: Set<string>;
  onAction: (id: string, action: string) => void;
  onSelect: (ids: Set<string>) => void;
  detailId: string | null;
  onOpenDetail: (id: string) => void;
  onCloseDetail: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const firstSelected = Array.from(selectedIds)[0];

      switch (e.key.toLowerCase()) {
        case 'escape':
          if (detailId) {
            onCloseDetail();
          } else {
            onSelect(new Set());
          }
          break;
        case 'e': // Email
          if (firstSelected) {
            const acc = accounts.find(a => a.id === firstSelected);
            if (acc?.financeLead?.email) {
              const subject = acc.outreach?.[0]?.subject || `Ghost Tax \u2014 ${acc.company}`;
              const body = acc.outreach?.[0]?.body || '';
              window.open(`mailto:${acc.financeLead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
            }
          }
          break;
        case 's': // Mark Sent
          if (firstSelected) onAction(firstSelected, 'mark_sent');
          break;
        case 'd': // Snooze 3d
          if (firstSelected) onAction(firstSelected, 'snooze_3d');
          break;
        case 'x': // Archive
          if (firstSelected) onAction(firstSelected, 'archive');
          break;
        case 'enter': // Open detail
          if (firstSelected && !detailId) onOpenDetail(firstSelected);
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [accounts, selectedIds, onAction, onSelect, detailId, onOpenDetail, onCloseDetail]);

  return null;
}

// ══════════════════════════════════════════════════════════════
// MISSION CONTROL — DARK THEME PALETTE
// ══════════════════════════════════════════════════════════════

const MC = {
  bg:         '#060912',
  surface:    '#0A0D19',
  panel:      '#0e1221',
  border:     'rgba(36,48,78,0.35)',
  borderHi:   'rgba(34,211,238,0.20)',
  text1:      '#e4e9f4',
  text2:      '#8d9bb5',
  text3:      '#55637d',
  cyan:       '#22d3ee',
  green:      '#34d399',
  amber:      '#f59e0b',
  red:        '#ef4444',
};

// ══════════════════════════════════════════════════════════════
// MC BRIEFING SCREEN
// ══════════════════════════════════════════════════════════════

function MCBriefingScreen({
  accounts,
  metrics,
  onEnterApproval,
  onOpenCockpit,
}: {
  accounts: Account[];
  metrics: { ready: number; followUps: number; sent: number; replied: number; pipelineLow: number; pipelineHigh: number };
  onEnterApproval: () => void;
  onOpenCockpit: () => void;
}) {
  const todayPlan = getTodayPlan();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  // Current window status for primary market
  const primaryMarket = todayPlan.markets[0] || 'DE';
  const windowStatus = isInSendingWindow(primaryMarket);

  // Day of week label
  const dayLabels = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const dayLabel = dayLabels[now.getDay()];

  // Format time
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  // LinkedIn post idea by pillar
  const linkedinIdeas: Record<string, string> = {
    leak_of_week:    '💡 "Votre entreprise paye probablement 3x trop pour ce service SaaS. Voici comment le détecter en 5 min..."',
    contrarian:      '🔥 "Les audits IT coûtent 6 mois et 50k€. Il y a une meilleure façon."',
    social_proof:    '✅ "Client sous NDA : 127k EUR d\'économies détectées en 48h. Voici la méthodologie."',
    founder_journey: '🏗️ "J\'ai passé 3 ans à analyser des stacks SaaS de PME européennes. Ce que j\'ai découvert m\'a surpris."',
    data_insight:    '📊 "En 200+ analyses, aucune entreprise n\'avait zéro exposition. La moyenne est de 23% du budget IT."',
  };
  const linkedinPost = linkedinIdeas[todayPlan.linkedinPostPillar] || linkedinIdeas['data_insight'];

  // Format financial range
  const fmtRange = (lo: number, hi: number) => {
    const f = (n: number) => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n/1000)}k` : `${n}`;
    return `${f(lo)}–${f(hi)} EUR`;
  };

  // Window badge
  const windowBadge = windowStatus.inWindow
    ? { label: `FENÊTRE ACTIVE — ${primaryMarket}`, color: MC.green, dot: true }
    : { label: todayPlan.isFollowUpDay ? 'JOUR FOLLOW-UP' : `Prochaine fenêtre : ${primaryMarket}`, color: MC.text3, dot: false };

  return (
    <div style={{
      minHeight: '100vh',
      background: MC.bg,
      color: MC.text1,
      fontFamily: FONT_BODY,
      position: 'relative',
    }}>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES_CSS }} />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 28px',
        borderBottom: `1px solid ${MC.border}`,
        background: MC.surface,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            fontFamily: FONT_MONO, fontSize: 10, fontWeight: 700,
            letterSpacing: '0.14em', color: MC.cyan, textTransform: 'uppercase',
          }}>GHOST TAX — MISSION CONTROL</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Window status dot */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {windowBadge.dot && (
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: MC.green,
                animation: 'mc-pulse 2s ease-in-out infinite',
              }} />
            )}
            <span style={{
              fontFamily: FONT_MONO, fontSize: 10, fontWeight: 600,
              letterSpacing: '0.1em', color: windowBadge.color,
              textTransform: 'uppercase',
            }}>{windowBadge.label}</span>
          </div>
          <button
            onClick={onOpenCockpit}
            style={{
              padding: '6px 14px',
              background: 'transparent',
              color: MC.text2,
              border: `1px solid ${MC.border}`,
              borderRadius: 6,
              fontFamily: FONT_MONO,
              fontSize: 10, fontWeight: 600,
              letterSpacing: '0.08em',
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            COCKPIT →
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 28px 80px' }}>

        {/* Date + time */}
        <div style={{ marginBottom: 36 }}>
          <div style={{
            fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700,
            letterSpacing: '0.12em', color: MC.text3, textTransform: 'uppercase', marginBottom: 6,
          }}>BRIEFING DU {dayLabel.toUpperCase()}</div>
          <div style={{
            fontFamily: FONT_MONO, fontSize: 32, fontWeight: 700,
            color: MC.text1, letterSpacing: '-0.02em',
          }}>{timeStr}</div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 13, color: MC.text2, marginTop: 4 }}>
            {dateStr} · Marchés cibles : {todayPlan.markets.join(', ')}
          </div>
        </div>

        {/* 3 Counters */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1,
          border: `1px solid ${MC.border}`, borderRadius: 12, overflow: 'hidden',
          marginBottom: 28,
        }}>
          {[
            {
              label: 'PRÊTS À ENVOYER',
              value: metrics.ready,
              unit: 'prospects',
              color: metrics.ready > 0 ? MC.green : MC.text3,
              glow: metrics.ready > 0,
            },
            {
              label: 'FOLLOW-UPS DUS',
              value: metrics.followUps,
              unit: 'aujourd\'hui',
              color: metrics.followUps > 0 ? MC.amber : MC.text3,
              glow: false,
            },
            {
              label: 'PIPELINE',
              value: null,
              unit: fmtRange(metrics.pipelineLow, metrics.pipelineHigh),
              color: MC.cyan,
              glow: false,
            },
          ].map((m, i) => (
            <div key={i} style={{
              background: MC.surface,
              padding: '24px 28px',
              borderRight: i < 2 ? `1px solid ${MC.border}` : 'none',
              boxShadow: m.glow ? `inset 0 0 40px rgba(52,211,153,0.04)` : 'none',
            }}>
              <div style={{
                fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700,
                letterSpacing: '0.14em', color: MC.text3, textTransform: 'uppercase', marginBottom: 10,
              }}>{m.label}</div>
              {m.value !== null ? (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{
                    fontFamily: FONT_MONO, fontSize: 40, fontWeight: 700,
                    color: m.color, letterSpacing: '-0.03em', lineHeight: 1,
                  }}>{m.value}</span>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: MC.text3 }}>{m.unit}</span>
                </div>
              ) : (
                <div style={{
                  fontFamily: FONT_MONO, fontSize: 22, fontWeight: 700,
                  color: m.color, letterSpacing: '-0.02em',
                }}>{m.unit}</div>
              )}
            </div>
          ))}
        </div>

        {/* LinkedIn post idea */}
        <div style={{
          background: MC.surface,
          border: `1px solid ${MC.border}`,
          borderLeft: `3px solid ${MC.cyan}`,
          borderRadius: 10,
          padding: '20px 24px',
          marginBottom: 28,
        }}>
          <div style={{
            fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700,
            letterSpacing: '0.14em', color: MC.cyan, textTransform: 'uppercase', marginBottom: 12,
          }}>POST LINKEDIN DU JOUR · {todayPlan.linkedinPostPillar.replace(/_/g, ' ').toUpperCase()}</div>
          <div style={{
            fontSize: 14, color: MC.text1, lineHeight: 1.6,
          }}>{linkedinPost}</div>
          <div style={{ marginTop: 12, fontSize: 12, color: MC.text3, fontFamily: FONT_MONO }}>
            → Adapte, personalise et publie depuis LinkedIn directement.
          </div>
        </div>

        {/* Sending windows */}
        <div style={{
          background: MC.surface,
          border: `1px solid ${MC.border}`,
          borderRadius: 10,
          padding: '20px 24px',
          marginBottom: 40,
        }}>
          <div style={{
            fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700,
            letterSpacing: '0.14em', color: MC.text3, textTransform: 'uppercase', marginBottom: 14,
          }}>FENÊTRES D'ENVOI</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {todayPlan.windows.map((w, i) => {
              const isActive = windowStatus.inWindow && i === 0;
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px',
                  borderRadius: 7,
                  background: isActive ? 'rgba(52,211,153,0.06)' : MC.panel,
                  border: `1px solid ${isActive ? 'rgba(52,211,153,0.20)' : MC.border}`,
                }}>
                  {isActive && (
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: MC.green, animation: 'mc-pulse 1.5s ease-in-out infinite',
                      flexShrink: 0,
                    }} />
                  )}
                  <span style={{
                    fontFamily: FONT_MONO, fontSize: 13, fontWeight: 700,
                    color: isActive ? MC.green : MC.text2,
                  }}>{w.start} – {w.end} CET</span>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 9, fontWeight: 700, fontFamily: FONT_MONO,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: w.quality === 'primary' ? MC.cyan : MC.text3,
                    background: w.quality === 'primary' ? 'rgba(34,211,238,0.08)' : 'transparent',
                    border: `1px solid ${w.quality === 'primary' ? 'rgba(34,211,238,0.15)' : MC.border}`,
                  }}>{w.quality === 'primary' ? 'PRIME' : 'SECONDAIRE'}</span>
                  <span style={{ fontSize: 12, color: MC.text3 }}>{w.reason}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onEnterApproval}
            disabled={metrics.ready === 0}
            style={{
              flex: 2,
              padding: '18px 28px',
              background: metrics.ready > 0 ? MC.cyan : MC.surface,
              color: metrics.ready > 0 ? '#060912' : MC.text3,
              border: `1px solid ${metrics.ready > 0 ? MC.cyan : MC.border}`,
              borderRadius: 10,
              fontFamily: FONT_MONO,
              fontSize: 13, fontWeight: 800,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              cursor: metrics.ready > 0 ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s ease',
            }}
          >
            {metrics.ready > 0
              ? `⚡ APPROUVER LES ENVOIS (${metrics.ready})`
              : 'AUCUN PROSPECT PRÊT'}
          </button>
          <button
            onClick={onOpenCockpit}
            style={{
              flex: 1,
              padding: '18px 28px',
              background: 'transparent',
              color: MC.text1,
              border: `1px solid ${MC.border}`,
              borderRadius: 10,
              fontFamily: FONT_MONO,
              fontSize: 13, fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            VOIR LE PIPELINE
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MC APPROVAL SCREEN — Tinder-style cards
// ══════════════════════════════════════════════════════════════

function MCApprovalScreen({
  card,
  index,
  total,
  cardAnim,
  onApprove,
  onPass,
  onBackToBriefing,
}: {
  card: Account;
  index: number;
  total: number;
  cardAnim: 'left' | 'right' | null;
  onApprove: () => void;
  onPass: () => void;
  onBackToBriefing: () => void;
}) {
  // Get best outreach message
  const outreachMsg = card.outreach?.[0];
  const channel = outreachMsg?.channel || 'email';

  const handleEmailApprove = async () => {
    // Fire email via API (best-effort), then mark approved
    if (channel === 'email' && card.financeLead?.email && outreachMsg?.body) {
      try {
        await fetch('/api/command/send-approved', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: card.financeLead.email,
            subject: outreachMsg.subject || `Ghost Tax — ${card.company}`,
            textBody: outreachMsg.body,
            domain: card.domain,
            prospectId: card.id,
          }),
        });
      } catch {}
    }
    onApprove();
  };

  const handleLinkedInApprove = () => {
    if (card.financeLead?.linkedIn) {
      // Copy message to clipboard
      if (outreachMsg?.body) {
        navigator.clipboard.writeText(outreachMsg.body).catch(() => {});
      }
      // Open LinkedIn profile
      window.open(card.financeLead.linkedIn, '_blank');
    }
    onApprove();
  };

  const handleApproveClick = () => {
    if (channel === 'linkedin') {
      handleLinkedInApprove();
    } else {
      handleEmailApprove();
    }
  };

  const cardAnimation = cardAnim === 'right'
    ? 'mc-swipeRight 380ms cubic-bezier(0.16,1,0.3,1) forwards'
    : cardAnim === 'left'
    ? 'mc-swipeLeft 380ms cubic-bezier(0.16,1,0.3,1) forwards'
    : 'mc-cardEnter 300ms cubic-bezier(0.16,1,0.3,1) both';

  const progress = ((index) / total) * 100;

  return (
    <div style={{
      minHeight: '100vh',
      background: MC.bg,
      color: MC.text1,
      fontFamily: FONT_BODY,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES_CSS }} />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 28px',
        borderBottom: `1px solid ${MC.border}`,
        background: MC.surface,
        flexShrink: 0,
      }}>
        <button
          onClick={onBackToBriefing}
          style={{
            background: 'transparent', color: MC.text2,
            border: 'none', cursor: 'pointer',
            fontFamily: FONT_MONO, fontSize: 11, fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '4px 0',
          }}
        >
          ← BRIEFING
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: FONT_MONO, fontSize: 10, fontWeight: 700,
            letterSpacing: '0.14em', color: MC.cyan, textTransform: 'uppercase',
          }}>MODE APPROBATION</div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: MC.text3, marginTop: 2 }}>
            {index + 1} / {total}
          </div>
        </div>
        <div style={{ width: 80 }} /> {/* spacer */}
      </div>

      {/* Progress bar */}
      <div style={{ height: 2, background: MC.surface }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: MC.cyan,
          transition: 'width 300ms ease',
        }} />
      </div>

      {/* Card */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '32px 20px 20px',
      }}>
        <div
          key={`card-${card.id}-${index}`}
          style={{
            width: '100%', maxWidth: 520,
            animation: cardAnimation,
          }}
        >
          {/* Company card */}
          <div style={{
            background: MC.surface,
            border: `1px solid ${MC.border}`,
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
          }}>
            {/* Card header */}
            <div style={{
              padding: '24px 28px 20px',
              borderBottom: `1px solid ${MC.border}`,
              background: MC.panel,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{
                    fontSize: 22, fontWeight: 800, color: MC.text1,
                    letterSpacing: '-0.01em', marginBottom: 4,
                  }}>{card.company}</div>
                  <div style={{ fontSize: 13, color: MC.text2 }}>{card.domain}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{
                    fontFamily: FONT_MONO, fontSize: 28, fontWeight: 700,
                    color: (card.score || 0) >= 70 ? MC.green : (card.score || 0) >= 50 ? MC.amber : MC.text2,
                    letterSpacing: '-0.02em', lineHeight: 1,
                  }}>{card.score || '—'}</div>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: MC.text3, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>HEAT SCORE</div>
                </div>
              </div>

              {/* Contact */}
              {card.financeLead?.name && (
                <div style={{
                  marginTop: 14, padding: '10px 14px',
                  background: MC.bg, borderRadius: 8,
                  border: `1px solid ${MC.border}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: `rgba(34,211,238,0.12)`,
                      border: `1px solid rgba(34,211,238,0.20)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: MC.cyan,
                      flexShrink: 0,
                    }}>
                      {card.financeLead.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: MC.text1 }}>{card.financeLead.name}</div>
                      <div style={{ fontSize: 11, color: MC.text2 }}>{card.financeLead.title}</div>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                      <span style={{
                        fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700,
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                        color: channel === 'email' ? MC.cyan : '#a78bfa',
                        padding: '2px 7px',
                        background: channel === 'email' ? 'rgba(34,211,238,0.08)' : 'rgba(167,139,250,0.08)',
                        border: `1px solid ${channel === 'email' ? 'rgba(34,211,238,0.15)' : 'rgba(167,139,250,0.15)'}`,
                        borderRadius: 4,
                      }}>
                        {channel === 'email' ? '@ EMAIL' : 'LI LINKEDIN'}
                      </span>
                      {card.country && (
                        <span style={{ fontFamily: FONT_MONO, fontSize: 9, color: MC.text3 }}>{card.country}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Revenue estimate */}
            {card.revenueEstimate > 0 && (
              <div style={{
                padding: '12px 28px',
                borderBottom: `1px solid ${MC.border}`,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontFamily: FONT_MONO, fontSize: 9, color: MC.text3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  EXPOSITION EST.
                </span>
                <span style={{ fontFamily: FONT_MONO, fontSize: 14, fontWeight: 700, color: MC.green }}>
                  ~{card.revenueEstimate >= 1000 ? `${Math.round(card.revenueEstimate / 1000)}k` : card.revenueEstimate} EUR
                </span>
              </div>
            )}

            {/* Message preview */}
            {outreachMsg?.body && (
              <div style={{ padding: '20px 28px' }}>
                <div style={{
                  fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700,
                  letterSpacing: '0.12em', color: MC.text3, textTransform: 'uppercase', marginBottom: 10,
                }}>APERÇU DU MESSAGE</div>
                {outreachMsg.subject && (
                  <div style={{
                    fontSize: 12, fontWeight: 600, color: MC.text1,
                    marginBottom: 8, fontFamily: FONT_MONO,
                    borderBottom: `1px solid ${MC.border}`, paddingBottom: 8,
                  }}>
                    Objet : {outreachMsg.subject}
                  </div>
                )}
                <div style={{
                  fontSize: 12, color: MC.text2, lineHeight: 1.65,
                  maxHeight: 120, overflow: 'hidden',
                  maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
                }}>
                  {outreachMsg.body}
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button
              onClick={onPass}
              style={{
                flex: 1,
                padding: '16px 0',
                background: 'transparent',
                color: MC.text2,
                border: `1px solid ${MC.border}`,
                borderRadius: 12,
                fontFamily: FONT_MONO,
                fontSize: 13, fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              ← PASSER
            </button>
            <button
              onClick={handleApproveClick}
              style={{
                flex: 2,
                padding: '16px 0',
                background: MC.green,
                color: '#060912',
                border: 'none',
                borderRadius: 12,
                fontFamily: FONT_MONO,
                fontSize: 14, fontWeight: 800,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: '0 0 24px rgba(52,211,153,0.25)',
                transition: 'all 0.15s ease',
              }}
            >
              {channel === 'linkedin' ? 'APPROUVER + OUVRIR LI →' : 'APPROUVER + ENVOYER →'}
            </button>
          </div>

          {/* Hint */}
          <div style={{
            textAlign: 'center', marginTop: 14,
            fontFamily: FONT_MONO, fontSize: 10, color: MC.text3,
          }}>
            {channel === 'linkedin'
              ? 'Le message sera copié dans le presse-papier · LinkedIn s\'ouvrira dans un nouvel onglet'
              : 'L\'email sera envoyé via Resend depuis reports@ghost-tax.com'}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MC DONE SCREEN — Session Summary
// ══════════════════════════════════════════════════════════════

function MCDoneScreen({
  approved,
  passed,
  onBackToBriefing,
  onOpenCockpit,
}: {
  approved: Account[];
  passed: Account[];
  onBackToBriefing: () => void;
  onOpenCockpit: () => void;
}) {
  const totalRevEst = approved.reduce((s, a) => s + (a.revenueEstimate || 0), 0);

  return (
    <div style={{
      minHeight: '100vh',
      background: MC.bg,
      color: MC.text1,
      fontFamily: FONT_BODY,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES_CSS }} />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 28px',
        borderBottom: `1px solid ${MC.border}`,
        background: MC.surface,
      }}>
        <button
          onClick={onBackToBriefing}
          style={{
            background: 'transparent', color: MC.text2,
            border: 'none', cursor: 'pointer',
            fontFamily: FONT_MONO, fontSize: 11, fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 0',
          }}
        >
          ← NOUVEAU BRIEFING
        </button>
        <div style={{
          fontFamily: FONT_MONO, fontSize: 10, fontWeight: 700,
          letterSpacing: '0.14em', color: MC.cyan, textTransform: 'uppercase',
        }}>BILAN DE SESSION</div>
        <button
          onClick={onOpenCockpit}
          style={{
            padding: '6px 14px',
            background: 'transparent', color: MC.text2,
            border: `1px solid ${MC.border}`, borderRadius: 6,
            fontFamily: FONT_MONO, fontSize: 10, fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
          }}
        >
          COCKPIT →
        </button>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '60px 28px' }}>
        {/* Trophy */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            fontSize: 52, marginBottom: 16,
          }}>
            {approved.length > 0 ? '🎯' : '✅'}
          </div>
          <div style={{
            fontSize: 28, fontWeight: 800, color: MC.text1,
            letterSpacing: '-0.02em', marginBottom: 8,
          }}>
            Session terminée
          </div>
          <div style={{ fontSize: 14, color: MC.text2 }}>
            {approved.length > 0
              ? `${approved.length} message${approved.length > 1 ? 's' : ''} approuvé${approved.length > 1 ? 's' : ''} — ${passed.length} passé${passed.length > 1 ? 's' : ''}`
              : 'Aucun envoi cette session'}
          </div>
        </div>

        {/* Stats grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 12, marginBottom: 32,
        }}>
          {[
            { label: 'APPROUVÉS', value: approved.length, color: MC.green },
            { label: 'PASSÉS', value: passed.length, color: MC.text2 },
            {
              label: 'EXPOSITION CIBLÉE',
              value: totalRevEst >= 1000 ? `~${Math.round(totalRevEst / 1000)}k EUR` : `${totalRevEst} EUR`,
              color: MC.cyan,
              isString: true,
            },
            { label: 'MARCHÉS', value: [...new Set(approved.map(a => a.country).filter(Boolean))].join(', ') || '—', isString: true, color: MC.text2 },
          ].map((s, i) => (
            <div key={i} style={{
              background: MC.surface, border: `1px solid ${MC.border}`,
              borderRadius: 10, padding: '20px 22px',
            }}>
              <div style={{
                fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700,
                letterSpacing: '0.14em', color: MC.text3, textTransform: 'uppercase', marginBottom: 8,
              }}>{s.label}</div>
              <div style={{
                fontFamily: FONT_MONO,
                fontSize: s.isString ? 16 : 32,
                fontWeight: 700, color: s.color,
                letterSpacing: '-0.02em',
              }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Approved list */}
        {approved.length > 0 && (
          <div style={{
            background: MC.surface, border: `1px solid ${MC.border}`,
            borderRadius: 10, overflow: 'hidden', marginBottom: 24,
          }}>
            <div style={{
              padding: '14px 20px',
              borderBottom: `1px solid ${MC.border}`,
              fontFamily: FONT_MONO, fontSize: 9, fontWeight: 700,
              letterSpacing: '0.14em', color: MC.text3, textTransform: 'uppercase',
            }}>ENVOIS APPROUVÉS</div>
            {approved.map((a, i) => (
              <div key={a.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 20px',
                borderBottom: i < approved.length - 1 ? `1px solid ${MC.border}` : 'none',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: MC.text1 }}>{a.company}</div>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: MC.text3 }}>{a.financeLead?.name} · {a.financeLead?.title}</div>
                </div>
                <div style={{
                  fontFamily: FONT_MONO, fontSize: 10, fontWeight: 700,
                  color: MC.green, textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>✓ ENVOYÉ</div>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onBackToBriefing}
            style={{
              flex: 1,
              padding: '16px 0',
              background: MC.cyan,
              color: '#060912',
              border: 'none',
              borderRadius: 10,
              fontFamily: FONT_MONO,
              fontSize: 12, fontWeight: 800,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            NOUVEAU BRIEFING
          </button>
          <button
            onClick={onOpenCockpit}
            style={{
              flex: 1,
              padding: '16px 0',
              background: 'transparent',
              color: MC.text1,
              border: `1px solid ${MC.border}`,
              borderRadius: 10,
              fontFamily: FONT_MONO,
              fontSize: 12, fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            VOIR LE PIPELINE
          </button>
        </div>
      </div>
    </div>
  );
}
