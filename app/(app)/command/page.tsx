'use client';

/**
 * GHOST TAX — COCKPIT v2 — Execution Command Center
 *
 * Not a database viewer. An execution machine.
 * Every micro-interaction reduces time-to-send.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
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

const S = {
  page: { minHeight: '100vh', background: '#060912', color: '#e4e9f4', fontFamily: 'var(--vg-font-mono, monospace)' } as React.CSSProperties,
  empty: { padding: 60, textAlign: 'center' as const, color: '#475569', fontSize: 13 },
};

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

export default function CockpitV2() {
  // ── State ────────────────────────────────────────────────
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeView, setActiveView] = useState<ViewTabId>('focus_now');
  const [filters, setFilters] = useState<CockpitFilters>(DEFAULT_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // ── Load accounts ────────────────────────────────────────
  useEffect(() => {
    try {
      let accs = loadAccounts() as Account[];
      accs = unsnoozeExpired(accs);
      accs = computeReadyToSend(accs);
      setAccounts(accs);
      setLoaded(true);

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
        // Auto-accept all signals into accounts
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
          // Learn email pattern
          if (sig.email && sig.domain) {
            let intel = loadDomainIntel();
            intel = learnDomainPattern(sig.email, sig.contact_name || '', intel);
            saveDomainIntel(intel);
            const resolved = resolveAllEmails(updated as any[], intel);
            updated = resolved.accounts as Account[];
          }
          // Mark processed server-side
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
        case 'archive':
          updated = archiveAccount(updated, accountId);
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
  }, []);

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

  // ── Render ───────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ padding: 40, color: '#f87171', fontFamily: 'var(--vg-font-mono)' }}>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>Cockpit Error</h2>
        <pre style={{ fontSize: 12, background: '#0a0d19', padding: 16, borderRadius: 8 }}>{error}</pre>
        <button onClick={() => { localStorage.clear(); window.location.reload(); }}
          style={{ marginTop: 16, padding: '8px 16px', background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
          CLEAR CACHE &amp; RELOAD
        </button>
      </div>
    );
  }

  if (!loaded) {
    return <div style={{ padding: 40, color: '#475569', fontSize: 14, fontFamily: 'var(--vg-font-mono)' }}>Loading Mission Control...</div>;
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* View Tabs */}
      <ViewTabs activeView={activeView} counts={viewCounts} onChange={setActiveView} />

      {/* Filters + Action Bar */}
      <div style={{ padding: '16px 24px 0' }}>
        <ActionBar
          accounts={viewAccounts}
          selectedIds={selectedIds}
          onBulkAction={(action, ids) => handleBulkAction(action)}
        />
        <QuickFilters filters={filters} onChange={setFilters} />
      </div>

      {/* Prospect List */}
      <div style={{ padding: '8px 24px 80px' }}>
        {viewAccounts.length === 0 ? (
          <div style={S.empty}>
            {activeView === 'focus_now' ? 'No prospects ready to send. Generate messages or enrich leads.' :
             activeView === 'follow_up_due' ? 'No follow-ups due. All caught up.' :
             `No prospects in "${activeView}" view.`}
          </div>
        ) : (
          viewAccounts.map(account => (
            <ProspectRow
              key={account.id}
              account={account}
              isSelected={selectedIds.has(account.id)}
              onSelect={(id) => {
                setSelectedIds(prev => {
                  const next = new Set(prev);
                  next.has(id) ? next.delete(id) : next.add(id);
                  return next;
                });
              }}
              onAction={handleAction}
              onOpenDetail={(id) => setDetailId(id)}
            />
          ))
        )}
      </div>

      {/* Detail Panel (side panel) */}
      {detailAccount && (
        <DetailPanel
          account={detailAccount}
          onAction={handleAction}
          onClose={() => setDetailId(null)}
        />
      )}

      {/* Keyboard shortcuts */}
      <KeyboardHandler
        accounts={viewAccounts}
        selectedIds={selectedIds}
        onAction={handleAction}
        onSelect={setSelectedIds}
        detailId={detailId}
        onOpenDetail={setDetailId}
      />
    </div>
  );
}

// ── Keyboard Shortcuts ──────────────────────────────────────
function KeyboardHandler({
  accounts, selectedIds, onAction, onSelect, detailId, onOpenDetail,
}: {
  accounts: Account[];
  selectedIds: Set<string>;
  onAction: (id: string, action: string) => void;
  onSelect: (ids: Set<string>) => void;
  detailId: string | null;
  onOpenDetail: (id: string | null) => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const firstSelected = Array.from(selectedIds)[0];

      switch (e.key.toLowerCase()) {
        case 'escape':
          onOpenDetail(null);
          onSelect(new Set());
          break;
        case 'e': // Email
          if (firstSelected) {
            const acc = accounts.find(a => a.id === firstSelected);
            if (acc?.financeLead?.email) {
              const subject = acc.outreach?.[0]?.subject || `Ghost Tax — ${acc.company}`;
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
  }, [accounts, selectedIds, onAction, onSelect, detailId, onOpenDetail]);

  return null;
}
