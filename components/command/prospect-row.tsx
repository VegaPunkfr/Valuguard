'use client';

import React, { useState, useCallback } from 'react';
import type {
  Account,
  LeadStatus,
  OutreachStatusV2,
  NextActionType,
  QueueTier,
} from '@/types/command';
import {
  LEAD_STATUS_META,
  OUTREACH_STATUS_META,
  NEXT_ACTION_META,
  QUEUE_TIER_META,
  EMAIL_STATUS_META,
} from '@/types/command';

// ── Styles ──────────────────────────────────────────────────

const S = {
  row: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 1fr 1.4fr 60px 90px 100px 110px auto',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    fontFamily: 'var(--vg-font-mono, "JetBrains Mono", "Fira Code", monospace)',
    fontSize: '13px',
    color: '#e4e9f4',
    cursor: 'pointer',
    transition: 'background 0.15s',
    minHeight: '52px',
  } as React.CSSProperties,
  rowHover: {
    background: 'rgba(59,130,246,0.08)',
  } as React.CSSProperties,
  cell: (flex: number, minW?: number) => ({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  }),
  badge: (color: string, bg: string) => ({
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.4px',
    color,
    background: bg || `${color}15`,
    whiteSpace: 'nowrap' as const,
  }),
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '5px 10px',
    borderRadius: '4px',
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.04)',
    color: '#cbd5e1',
    fontSize: '11px',
    fontFamily: 'var(--vg-font-mono, monospace)',
    cursor: 'pointer',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
  btnDisabled: {
    opacity: 0.3,
    cursor: 'not-allowed',
  } as React.CSSProperties,
  actions: {
    display: 'flex',
    gap: '6px',
    flexShrink: 0,
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,
  detail: {
    background: 'rgba(59,130,246,0.04)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    padding: '20px 24px',
    fontFamily: 'var(--vg-font-mono, monospace)',
    fontSize: '12px',
    color: '#cbd5e1',
  } as React.CSSProperties,
  detailSection: {
    marginBottom: '12px',
  } as React.CSSProperties,
  detailLabel: {
    color: '#64748b',
    fontSize: '10px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    marginBottom: '4px',
  } as React.CSSProperties,
  signalPill: {
    display: 'inline-block',
    padding: '2px 6px',
    margin: '2px 4px 2px 0',
    borderRadius: '3px',
    background: 'rgba(96,165,250,0.08)',
    color: '#60a5fa',
    fontSize: '10px',
  } as React.CSSProperties,
  timeline: {
    borderLeft: '2px solid rgba(255,255,255,0.06)',
    paddingLeft: '12px',
    marginTop: '8px',
  } as React.CSSProperties,
  timelineItem: {
    marginBottom: '6px',
    lineHeight: 1.4,
  } as React.CSSProperties,
  timelineDate: {
    color: '#475569',
    fontSize: '10px',
    marginRight: '8px',
  } as React.CSSProperties,
  msgPreview: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '4px',
    padding: '10px 12px',
    marginTop: '6px',
    whiteSpace: 'pre-wrap' as const,
    lineHeight: 1.5,
    color: '#cbd5e1',
    fontSize: '11px',
  } as React.CSSProperties,
  heatDot: (tier: string) => ({
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginRight: '4px',
    background: tier === 'hot' ? '#ef4444' : tier === 'warm' ? '#f59e0b' : '#64748b',
    boxShadow: tier === 'hot' ? '0 0 6px rgba(239,68,68,0.5)' : 'none',
  }),
  readyDot: (ready: boolean) => ({
    display: 'inline-block',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: ready ? '#34d399' : '#475569',
    boxShadow: ready ? '0 0 4px rgba(52,211,153,0.4)' : 'none',
  }),
  tooltip: {
    position: 'relative' as const,
    display: 'inline-block',
  },
} as const;

// ── Helpers ─────────────────────────────────────────────────

function getHeatTier(account: Account): QueueTier {
  if (account.score >= 18) return 'hot';
  if (account.score >= 12) return 'warm';
  return 'cold';
}

function getBestMessage(account: Account): { subject?: string; body: string } | null {
  const ready = account.outreach.find(o => o.status === 'draft' || o.status === 'sent');
  if (ready) return { subject: ready.subject, body: ready.body };
  if (account.outreach.length > 0) return { subject: account.outreach[0].subject, body: account.outreach[0].body };
  return null;
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return '1d ago';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function buildMailtoUrl(account: Account): string {
  const email = account.financeLead?.email;
  if (!email) return '';
  const msg = getBestMessage(account);
  const subject = encodeURIComponent(msg?.subject || `Ghost Tax — ${account.company} SaaS exposure`);
  const body = encodeURIComponent(msg?.body || '');
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

// ── Props ───────────────────────────────────────────────────

export type ProspectAction =
  | 'email'
  | 'copy_email'
  | 'copy_message'
  | 'mark_sent'
  | 'snooze_3d'
  | 'snooze_7d'
  | 'archive'
  | 'open_linkedin';

export interface ProspectRowProps {
  account: Account;
  onAction: (accountId: string, action: string, payload?: string) => void;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onOpenDetail?: (id: string) => void;
}

// ── Component ───────────────────────────────────────────────

export default function ProspectRow({ account, onAction, isSelected, onSelect, onOpenDetail }: ProspectRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const heat = getHeatTier(account);
  const hasEmail = !!(account.financeLead?.email && account.financeLead.emailStatus !== 'invalid' && account.financeLead.emailStatus !== 'missing');
  const msg = getBestMessage(account);
  const leadMeta = LEAD_STATUS_META[account.leadStatus || 'new'];
  const outreachMeta = OUTREACH_STATUS_META[account.outreachStatus || 'no_message_generated'];
  const nextMeta = NEXT_ACTION_META[account.nextActionType || 'send_now'];
  const emailMeta = account.financeLead?.emailStatus ? EMAIL_STATUS_META[account.financeLead.emailStatus] : null;
  const heatMeta = QUEUE_TIER_META[heat];

  const handleCopy = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    });
  }, []);

  const stopProp = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  // ── Row ──

  return (
    <>
      <div
        style={{ ...S.row, ...(hovered ? S.rowHover : {}) }}
        onClick={() => setExpanded(!expanded)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        role="row"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpanded(!expanded); }}
      >
        {/* Company */}
        <div style={S.cell(1.5, 120)}>
          <span style={{ color: '#e4e9f4', fontWeight: 600 }}>{account.company}</span>
        </div>

        {/* Contact */}
        <div style={S.cell(1.2, 100)}>
          <span>{account.financeLead?.name || '—'}</span>
        </div>

        {/* Email */}
        <div style={S.cell(1.3, 110)}>
          <span style={{ color: hasEmail ? '#94a3b8' : '#475569' }}>
            {account.financeLead?.email || 'no email'}
          </span>
          {emailMeta && (
            <span style={{ ...S.badge(emailMeta.color, 'transparent'), fontSize: '9px', marginLeft: '4px' }}>
              {emailMeta.label}
            </span>
          )}
        </div>

        {/* Language */}
        <div style={S.cell(0.4, 32)}>
          <span style={{ color: '#64748b' }}>
            {(account.detectedLanguage || 'en').toUpperCase()}
          </span>
        </div>

        {/* Heat */}
        <div style={S.cell(0.5, 50)}>
          <span style={S.heatDot(heat)} />
          <span style={{ color: heatMeta.color, fontSize: '10px', fontWeight: 600 }}>
            {heatMeta.label}
          </span>
        </div>

        {/* Lead Status */}
        <div style={S.cell(0.8, 70)}>
          <span style={S.badge(leadMeta.color, leadMeta.bg)}>
            {leadMeta.label}
          </span>
        </div>

        {/* Outreach Status */}
        <div style={S.cell(0.8, 70)}>
          <span style={S.badge(outreachMeta.color, outreachMeta.bg)}>
            {outreachMeta.icon} {outreachMeta.label}
          </span>
        </div>

        {/* Next Action */}
        <div style={S.cell(0.8, 70)}>
          <span style={S.badge(nextMeta.color, 'transparent')}>
            {nextMeta.label}
          </span>
        </div>

        {/* Next Action Date */}
        <div style={S.cell(0.5, 50)}>
          <span style={{ color: '#64748b', fontSize: '10px' }}>
            {formatDate(account.nextActionAt || account.followUpDueAt)}
          </span>
        </div>

        {/* Source */}
        <div style={S.cell(0.4, 36)}>
          <span style={{ color: '#475569', fontSize: '10px' }}>
            {account.country}
          </span>
        </div>

        {/* Message Ready Indicator */}
        <div style={S.cell(0.3, 20)}>
          <span style={S.readyDot(!!msg)} title={msg ? 'Message ready' : 'No message'} />
        </div>

        {/* Quick Actions */}
        <div style={S.actions} onClick={stopProp}>
          {/* Email */}
          {hasEmail ? (
            <a
              href={buildMailtoUrl(account)}
              style={{ ...S.btn, color: '#3b82f6', textDecoration: 'none' }}
              title={`Email ${account.financeLead.email}`}
              onClick={(e) => { e.stopPropagation(); onAction(account.id, 'email'); }}
            >
              @
            </a>
          ) : (
            <span style={{ ...S.btn, ...S.btnDisabled }} title="No email">
              @
            </span>
          )}

          {/* Copy Email */}
          <button
            style={{ ...S.btn, ...(hasEmail ? {} : S.btnDisabled) }}
            title={hasEmail ? 'Copy email' : 'No email'}
            disabled={!hasEmail}
            onClick={(e) => {
              e.stopPropagation();
              if (account.financeLead?.email) {
                handleCopy(account.financeLead.email, 'email');
                onAction(account.id, 'copy_email');
              }
            }}
          >
            {copiedField === 'email' ? '!' : 'cp'}
          </button>

          {/* Copy Message */}
          <button
            style={{ ...S.btn, ...(msg ? {} : S.btnDisabled) }}
            title={msg ? 'Copy message body' : 'No message'}
            disabled={!msg}
            onClick={(e) => {
              e.stopPropagation();
              if (msg) {
                handleCopy(msg.body, 'msg');
                onAction(account.id, 'copy_message');
              }
            }}
          >
            {copiedField === 'msg' ? '!' : 'msg'}
          </button>

          {/* Mark Sent */}
          <button
            style={{ ...S.btn, color: '#34d399' }}
            title="Mark as sent"
            onClick={(e) => { e.stopPropagation(); onAction(account.id, 'mark_sent'); }}
          >
            ok
          </button>

          {/* Snooze 3d */}
          <button
            style={S.btn}
            title="Snooze 3 days"
            onClick={(e) => { e.stopPropagation(); onAction(account.id, 'snooze_3d'); }}
          >
            3d
          </button>

          {/* Snooze 7d */}
          <button
            style={S.btn}
            title="Snooze 7 days"
            onClick={(e) => { e.stopPropagation(); onAction(account.id, 'snooze_7d'); }}
          >
            7d
          </button>

          {/* Archive */}
          <button
            style={{ ...S.btn, color: '#f87171' }}
            title="Archive"
            onClick={(e) => { e.stopPropagation(); onAction(account.id, 'archive'); }}
          >
            x
          </button>

          {/* LinkedIn */}
          <button
            style={{ ...S.btn, ...(account.financeLead?.linkedIn ? { color: '#60a5fa' } : S.btnDisabled) }}
            title={account.financeLead?.linkedIn ? 'Open LinkedIn' : 'No LinkedIn URL'}
            disabled={!account.financeLead?.linkedIn}
            onClick={(e) => {
              e.stopPropagation();
              if (account.financeLead?.linkedIn) {
                window.open(account.financeLead.linkedIn, '_blank');
                onAction(account.id, 'open_linkedin');
              }
            }}
          >
            in
          </button>
        </div>
      </div>

      {/* ── Expanded Detail Panel ── */}
      {expanded && (
        <div style={S.detail}>
          {/* Signals */}
          <div style={S.detailSection}>
            <div style={S.detailLabel}>SIGNALS ({account.signals.length})</div>
            {account.signals.length === 0 ? (
              <span style={{ color: '#475569' }}>No signals detected</span>
            ) : (
              account.signals.map((sig, i) => (
                <span key={i} style={S.signalPill}>
                  [{sig.strength}] {sig.type}: {sig.detail}
                </span>
              ))
            )}
          </div>

          {/* Why Now */}
          {account.whyNow && (
            <div style={S.detailSection}>
              <div style={S.detailLabel}>WHY NOW</div>
              <div style={{ color: '#cbd5e1' }}>{account.whyNow}</div>
            </div>
          )}

          {/* Hypothesis */}
          {account.hypothesis?.summary && (
            <div style={S.detailSection}>
              <div style={S.detailLabel}>HYPOTHESIS</div>
              <div style={{ color: '#cbd5e1' }}>{account.hypothesis.summary}</div>
              {account.hypothesis.hiddenExposure.length > 0 && (
                <div style={{ marginTop: '4px', color: '#f87171', fontSize: '10px' }}>
                  Exposure: {account.hypothesis.hiddenExposure.join(' | ')}
                </div>
              )}
            </div>
          )}

          {/* Message Preview */}
          {msg && (
            <div style={S.detailSection}>
              <div style={S.detailLabel}>MESSAGE PREVIEW</div>
              {msg.subject && (
                <div style={{ color: '#e4e9f4', fontWeight: 600, marginBottom: '4px' }}>
                  Subject: {msg.subject}
                </div>
              )}
              <div style={S.msgPreview}>{msg.body}</div>
            </div>
          )}

          {/* History Timeline */}
          {account.timeline.length > 0 && (
            <div style={S.detailSection}>
              <div style={S.detailLabel}>HISTORY</div>
              <div style={S.timeline}>
                {account.timeline.slice(-10).reverse().map((evt, i) => (
                  <div key={i} style={S.timelineItem}>
                    <span style={S.timelineDate}>{formatDate(evt.date)}</span>
                    <span style={{ color: '#cbd5e1' }}>{evt.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
