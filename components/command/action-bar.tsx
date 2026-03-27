'use client';

import React, { useMemo } from 'react';
import type { Account } from '@/types/command';

// ── Styles ──────────────────────────────────────────────────

const S = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 16px',
    background: '#FFFFFF',
    borderBottom: '1px solid #E2E8F0',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    fontFamily: 'var(--gt-font-dm-sans, "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)',
    fontSize: '12px',
    color: '#334155',
  } as React.CSSProperties,
  stat: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  } as React.CSSProperties,
  statNumber: (color: string) => ({
    fontSize: '20px',
    fontWeight: 700,
    color,
    lineHeight: 1,
    fontFamily: 'var(--gt-font-ibm-plex, "IBM Plex Mono", monospace)',
    fontVariantNumeric: 'tabular-nums',
  }),
  statLabel: {
    color: '#64748B',
    fontSize: '11px',
    lineHeight: 1.2,
    maxWidth: '80px',
  } as React.CSSProperties,
  separator: {
    width: '1px',
    height: '28px',
    background: '#E2E8F0',
  } as React.CSSProperties,
  bulkSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginLeft: '8px',
    padding: '6px 10px',
    borderRadius: '8px',
    background: '#F8FAFC',
    border: '1px solid #E2E8F0',
  } as React.CSSProperties,
  bulkLabel: {
    color: '#64748B',
    fontSize: '11px',
  } as React.CSSProperties,
  bulkBtn: {
    padding: '5px 12px',
    borderRadius: '6px',
    border: '1px solid #CBD5E1',
    background: '#FFFFFF',
    color: '#334155',
    fontSize: '11px',
    fontWeight: 500,
    fontFamily: 'var(--gt-font-dm-sans, "DM Sans", sans-serif)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  } as React.CSSProperties,
  sendSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginLeft: 'auto',
    padding: '8px 14px',
    borderRadius: '10px',
    background: '#FFFFFF',
    border: '1px solid rgba(34,197,94,0.20)',
    boxShadow: '0 0 0 1px rgba(34,197,94,0.15), 0 4px 16px rgba(34,197,94,0.08)',
  } as React.CSSProperties,
  sendInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
    maxWidth: '200px',
  } as React.CSSProperties,
  sendCompany: {
    color: '#0F172A',
    fontWeight: 600,
    fontSize: '13px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
  sendContact: {
    color: '#64748B',
    fontSize: '11px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
  sendButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 24px',
    borderRadius: '8px',
    border: 'none',
    background: '#0F172A',
    color: '#FFFFFF',
    fontSize: '14px',
    fontWeight: 700,
    fontFamily: 'var(--gt-font-dm-sans, "DM Sans", sans-serif)',
    cursor: 'pointer',
    transition: 'all 0.15s',
    letterSpacing: '0.05em',
    textDecoration: 'none',
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
  } as React.CSSProperties,
  sendButtonDisabled: {
    opacity: 0.3,
    cursor: 'not-allowed',
  } as React.CSSProperties,
  selectedCount: {
    color: '#3B82F6',
    fontWeight: 600,
    fontSize: '12px',
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
        <span style={S.statNumber('#22C55E')}>{stats.ready}</span>
        <span style={S.statLabel}>ready to send</span>
      </div>

      <div style={S.separator} />

      <div style={S.stat}>
        <span style={S.statNumber(stats.followUps > 0 ? '#EF4444' : '#64748B')}>{stats.followUps}</span>
        <span style={S.statLabel}>follow-ups due today</span>
      </div>

      <div style={S.separator} />

      <div style={S.stat}>
        <span style={S.statNumber('#3B82F6')}>{stats.totalActive}</span>
        <span style={S.statLabel}>total active</span>
      </div>

      <div style={S.separator} />

      {/* Bulk Actions */}
      <div style={S.bulkSection}>
        {selectedIds.size > 0 ? (
          <>
            <span style={S.selectedCount}>{selectedIds.size} selected</span>
            <button
              style={{ ...S.bulkBtn, color: '#22C55E', borderColor: 'rgba(34,197,94,0.3)' }}
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
              style={{ ...S.bulkBtn, color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)' }}
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
