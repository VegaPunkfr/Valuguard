'use client';

import React, { useMemo } from 'react';
import type { Account } from '@/types/command';

// ── Premium White Theme Styles ──────────────────────────────

const S = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 20px',
    background: '#FFFFFF',
    borderBottom: '1px solid #E2E8F0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    fontFamily: 'var(--gt-font-dm-sans, "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)',
    fontSize: '12px',
    color: '#334155',
  } as React.CSSProperties,
  statBox: (accentColor: string, hasShadow: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 14px',
    borderRadius: '10px',
    background: '#FFFFFF',
    boxShadow: hasShadow
      ? `0 0 0 1px rgba(${accentColor},0.12), 0 2px 8px rgba(${accentColor},0.06)`
      : '0 0 0 1px rgba(226,232,240,0.8)',
  } as React.CSSProperties),
  statNumber: (color: string) => ({
    fontSize: '22px',
    fontWeight: 700,
    color,
    lineHeight: 1,
    fontFamily: 'var(--gt-font-ibm-plex, "IBM Plex Mono", monospace)',
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '-0.02em',
  }),
  statLabel: {
    color: '#64748B',
    fontSize: '11px',
    lineHeight: 1.3,
    maxWidth: '80px',
    fontWeight: 500,
  } as React.CSSProperties,
  separator: {
    width: '1px',
    height: '32px',
    background: '#F1F5F9',
  } as React.CSSProperties,
  bulkSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginLeft: '8px',
    padding: '8px 14px',
    borderRadius: '10px',
    background: '#FAFBFD',
    border: '1px solid #F1F5F9',
  } as React.CSSProperties,
  bulkLabel: {
    color: '#64748B',
    fontSize: '11px',
    fontWeight: 500,
  } as React.CSSProperties,
  bulkBtn: {
    padding: '6px 14px',
    borderRadius: '6px',
    border: '1px solid #CBD5E1',
    background: '#FFFFFF',
    color: '#334155',
    fontSize: '12px',
    fontWeight: 500,
    fontFamily: 'var(--gt-font-dm-sans, "DM Sans", sans-serif)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as React.CSSProperties,
  sendSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginLeft: 'auto',
    padding: '8px 16px',
    borderRadius: '10px',
    background: '#FFFFFF',
    border: '1px solid rgba(34,197,94,0.20)',
    boxShadow: '0 0 0 1px rgba(34,197,94,0.12), 0 2px 8px rgba(34,197,94,0.06)',
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
    fontWeight: 600,
    fontFamily: 'var(--gt-font-dm-sans, "DM Sans", sans-serif)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    letterSpacing: '0.03em',
    textDecoration: 'none',
    boxShadow: '0 2px 8px rgba(15,23,42,0.15), 0 1px 3px rgba(15,23,42,0.10)',
  } as React.CSSProperties,
  sendButtonDisabled: {
    opacity: 0.3,
    cursor: 'not-allowed',
  } as React.CSSProperties,
  selectedCount: {
    color: '#2563EB',
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
      {/* Stats — Ready to Send */}
      <div style={S.statBox('34,197,94', true)}>
        <span style={S.statNumber('#16A34A')}>{stats.ready}</span>
        <span style={S.statLabel}>ready to send</span>
      </div>

      <div style={S.separator} />

      {/* Stats — Follow-ups Due */}
      <div style={S.statBox('220,38,38', stats.followUps > 0)}>
        <span style={S.statNumber(stats.followUps > 0 ? '#DC2626' : '#94A3B8')}>{stats.followUps}</span>
        <span style={S.statLabel}>follow-ups due today</span>
      </div>

      <div style={S.separator} />

      {/* Stats — Total Active */}
      <div style={S.statBox('226,232,240', false)}>
        <span style={S.statNumber('#0F172A')}>{stats.totalActive}</span>
        <span style={S.statLabel}>total active</span>
      </div>

      <div style={S.separator} />

      {/* Bulk Actions */}
      <div style={S.bulkSection}>
        {selectedIds.size > 0 ? (
          <>
            <span style={S.selectedCount}>{selectedIds.size} selected</span>
            <button
              style={{ ...S.bulkBtn, color: '#16A34A', borderColor: 'rgba(22,163,74,0.30)' }}
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
              style={{ ...S.bulkBtn, color: '#DC2626', borderColor: 'rgba(220,38,38,0.30)' }}
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
