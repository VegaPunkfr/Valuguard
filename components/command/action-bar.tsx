'use client';

import React, { useMemo } from 'react';
import type { Account } from '@/types/command';

// ── Styles ──────────────────────────────────────────────────

const S = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 16px',
    background: 'linear-gradient(180deg, rgba(59,130,246,0.04) 0%, rgba(10,13,25,0) 100%)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    fontFamily: 'var(--vg-font-mono, "JetBrains Mono", "Fira Code", monospace)',
    fontSize: '11px',
    color: '#94a3b8',
  } as React.CSSProperties,
  stat: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  } as React.CSSProperties,
  statNumber: (color: string) => ({
    fontSize: '18px',
    fontWeight: 700,
    color,
    lineHeight: 1,
  }),
  statLabel: {
    color: '#64748b',
    fontSize: '10px',
    lineHeight: 1.2,
    maxWidth: '80px',
  } as React.CSSProperties,
  separator: {
    width: '1px',
    height: '28px',
    background: 'rgba(255,255,255,0.06)',
  } as React.CSSProperties,
  bulkSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginLeft: '8px',
    padding: '4px 8px',
    borderRadius: '4px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
  } as React.CSSProperties,
  bulkLabel: {
    color: '#64748b',
    fontSize: '10px',
  } as React.CSSProperties,
  bulkBtn: {
    padding: '4px 10px',
    borderRadius: '3px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)',
    color: '#94a3b8',
    fontSize: '10px',
    fontFamily: 'var(--vg-font-mono, monospace)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  } as React.CSSProperties,
  sendSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginLeft: 'auto',
    padding: '6px 12px',
    borderRadius: '4px',
    background: 'rgba(34,197,94,0.06)',
    border: '1px solid rgba(34,197,94,0.15)',
  } as React.CSSProperties,
  sendInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
    maxWidth: '200px',
  } as React.CSSProperties,
  sendCompany: {
    color: '#e4e9f4',
    fontWeight: 600,
    fontSize: '12px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
  sendContact: {
    color: '#64748b',
    fontSize: '10px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
  sendButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 20px',
    borderRadius: '4px',
    border: '1px solid rgba(34,197,94,0.4)',
    background: 'rgba(34,197,94,0.12)',
    color: '#22c55e',
    fontSize: '13px',
    fontWeight: 700,
    fontFamily: 'var(--vg-font-mono, monospace)',
    cursor: 'pointer',
    transition: 'all 0.15s',
    letterSpacing: '1px',
    textDecoration: 'none',
  } as React.CSSProperties,
  sendButtonDisabled: {
    opacity: 0.3,
    cursor: 'not-allowed',
  } as React.CSSProperties,
  selectedCount: {
    color: '#3b82f6',
    fontWeight: 600,
    fontSize: '11px',
  } as React.CSSProperties,
};

// ── Props ───────────────────────────────────────────────────

export type BulkActionType = 'mark_sent' | 'snooze_7d' | 'archive' | 'select_all';

export interface ActionBarProps {
  accounts: Account[];
  selectedIds: Set<string>;
  onBulkAction: (action: BulkActionType, ids: string[]) => void;
}

// ── Component ───────────────────────────────────────────────

export default function ActionBar({ accounts, selectedIds, onBulkAction }: ActionBarProps) {
  // Compute stats
  const stats = useMemo(() => {
    const now = Date.now();
    const active = accounts.filter(a => !a.hiddenFromActiveView && !a.isSnoozed);
    const readyToSend = active.filter(a => a.readyToSend);
    const followUpsDue = active.filter(a => {
      if (a.outreachStatus === 'follow_up_due') return true;
      if (a.followUpDueAt && new Date(a.followUpDueAt).getTime() <= now) return true;
      return false;
    });
    return {
      ready: readyToSend.length,
      followUps: followUpsDue.length,
      totalActive: active.length,
    };
  }, [accounts]);

  // Find highest priority prospect ready to send
  const topProspect = useMemo(() => {
    return accounts
      .filter(a => a.readyToSend && !a.hiddenFromActiveView && !a.isSnoozed)
      .sort((a, b) => (a.readyToSendRank || 999) - (b.readyToSendRank || 999))[0] || null;
  }, [accounts]);

  const hasEmail = !!(topProspect?.financeLead?.email && topProspect.financeLead.emailStatus !== 'invalid' && topProspect.financeLead.emailStatus !== 'missing');

  const buildMailto = (a: Account): string => {
    const email = a.financeLead?.email;
    if (!email) return '';
    const msg = a.outreach.find(o => o.status === 'draft' || o.status === 'sent') || a.outreach[0];
    const subject = encodeURIComponent(msg?.subject || `Ghost Tax \u2014 ${a.company} SaaS exposure`);
    const body = encodeURIComponent(msg?.body || '');
    return `mailto:${email}?subject=${subject}&body=${body}`;
  };

  const selectedArray = Array.from(selectedIds);

  return (
    <div style={S.bar}>
      {/* Stats */}
      <div style={S.stat}>
        <span style={S.statNumber('#22c55e')}>{stats.ready}</span>
        <span style={S.statLabel}>ready to send</span>
      </div>

      <div style={S.separator} />

      <div style={S.stat}>
        <span style={S.statNumber(stats.followUps > 0 ? '#ef4444' : '#64748b')}>{stats.followUps}</span>
        <span style={S.statLabel}>follow-ups due today</span>
      </div>

      <div style={S.separator} />

      <div style={S.stat}>
        <span style={S.statNumber('#60a5fa')}>{stats.totalActive}</span>
        <span style={S.statLabel}>total active</span>
      </div>

      <div style={S.separator} />

      {/* Bulk Actions */}
      <div style={S.bulkSection}>
        {selectedIds.size > 0 ? (
          <>
            <span style={S.selectedCount}>{selectedIds.size} selected</span>
            <button
              style={{ ...S.bulkBtn, color: '#34d399' }}
              onClick={() => onBulkAction('mark_sent', selectedArray)}
            >
              Mark Sent
            </button>
            <button
              style={S.bulkBtn}
              onClick={() => onBulkAction('snooze_7d', selectedArray)}
            >
              Snooze 7d
            </button>
            <button
              style={{ ...S.bulkBtn, color: '#f87171' }}
              onClick={() => onBulkAction('archive', selectedArray)}
            >
              Archive
            </button>
          </>
        ) : (
          <>
            <span style={S.bulkLabel}>Select prospects for bulk actions</span>
            <button
              style={S.bulkBtn}
              onClick={() => onBulkAction('select_all', accounts.filter(a => !a.hiddenFromActiveView && !a.isSnoozed).map(a => a.id))}
            >
              Select all visible
            </button>
          </>
        )}
      </div>

      {/* 1-Click Send — Top Priority Prospect */}
      {topProspect && (
        <div style={S.sendSection}>
          <div style={S.sendInfo}>
            <div style={S.sendCompany}>{topProspect.company}</div>
            <div style={S.sendContact}>
              {topProspect.financeLead?.name || 'No contact'} {hasEmail ? `\u2014 ${topProspect.financeLead.email}` : ''}
            </div>
          </div>
          {hasEmail ? (
            <a
              href={buildMailto(topProspect)}
              style={S.sendButton}
              onClick={() => onBulkAction('mark_sent', [topProspect.id])}
            >
              SEND
            </a>
          ) : (
            <span style={{ ...S.sendButton, ...S.sendButtonDisabled }}>
              SEND
            </span>
          )}
        </div>
      )}
    </div>
  );
}
