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
    padding: '14px 16px',
    borderBottom: '1px solid #F1F5F9',
    fontFamily: 'var(--gt-font-dm-sans, "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)',
    fontSize: '14px',
    color: '#334155',
    cursor: 'pointer',
    transition: 'background 0.15s',
    minHeight: '56px',
    background: '#FFFFFF',
  } as React.CSSProperties,
  rowHover: {
    background: '#F8FAFC',
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
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #E2E8F0',
    background: '#FFFFFF',
    color: '#334155',
    fontSize: '12px',
    fontFamily: 'var(--gt-font-dm-sans, "DM Sans", sans-serif)',
    cursor: 'pointer',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap' as const,
    fontWeight: 500,
  } as React.CSSProperties,
  btnEmail: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px 14px',
    borderRadius: '6px',
    border: 'none',
    background: '#0F172A',
    color: '#FFFFFF',
    fontSize: '12px',
    fontWeight: 700,
    fontFamily: 'var(--gt-font-dm-sans, "DM Sans", sans-serif)',
    cursor: 'pointer',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap' as const,
    textDecoration: 'none',
    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
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
    background: '#F8FAFC',
    borderTop: '1px solid #E2E8F0',
    borderBottom: '1px solid #E2E8F0',
    padding: '20px 24px',
    fontFamily: 'var(--gt-font-dm-sans, "DM Sans", sans-serif)',
    fontSize: '13px',
    color: '#334155',
  } as React.CSSProperties,
  detailSection: {
    marginBottom: '12px',
  } as React.CSSProperties,
  detailLabel: {
    color: '#64748B',
    fontSize: '10px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    marginBottom: '4px',
    fontWeight: 600,
  } as React.CSSProperties,
  signalPill: {
    display: 'inline-block',
    padding: '2px 6px',
    margin: '2px 4px 2px 0',
    borderRadius: '4px',
    background: 'rgba(59,130,246,0.06)',
    color: '#3B82F6',
    fontSize: '11px',
    border: '1px solid rgba(59,130,246,0.10)',
  } as React.CSSProperties,
  timeline: {
    borderLeft: '2px solid #E2E8F0',
    paddingLeft: '12px',
    marginTop: '8px',
  } as React.CSSProperties,
  timelineItem: {
    marginBottom: '6px',
    lineHeight: 1.4,
  } as React.CSSProperties,
  timelineDate: {
    color: '#94A3B8',
    fontSize: '10px',
    marginRight: '8px',
    fontFamily: 'var(--gt-font-ibm-plex, "IBM Plex Mono", monospace)',
  } as React.CSSProperties,
  msgPreview: {
    background: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: '6px',
    padding: '10px 12px',
    marginTop: '6px',
    whiteSpace: 'pre-wrap' as const,
    lineHeight: 1.5,
    color: '#334155',
    fontSize: '13px',
  } as React.CSSProperties,
  heatDot: (tier: string) => ({
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginRight: '4px',
    background: tier === 'hot' ? '#EF4444' : tier === 'warm' ? '#F59E0B' : '#94A3B8',
    boxShadow: tier === 'hot' ? '0 0 6px rgba(239,68,68,0.4)' : 'none',
  }),
  readyDot: (ready: boolean) => ({
    display: 'inline-block',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: ready ? '#22C55E' : '#CBD5E1',
    boxShadow: ready ? '0 0 4px rgba(34,197,94,0.4)' : 'none',
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

function buildMailtoUrl(account: Account): string {
  const email = account.financeLead?.email;
  if (!email) return '';
  const msg = getBestMessage(account);
  const subject = encodeURIComponent(msg?.subject || `Ghost Tax \u2014 ${account.company} SaaS exposure`);
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
          <span style={{ color: '#0F172A', fontWeight: 600 }}>{account.company}</span>
        </div>

        {/* Contact */}
        <div style={S.cell(1.2, 100)}>
          <span style={{ color: '#334155' }}>{account.financeLead?.name || '\u2014'}</span>
        </div>

        {/* Email */}
        <div style={S.cell(1.3, 110)}>
          <span style={{ color: hasEmail ? '#64748B' : '#CBD5E1' }}>
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
          <span style={{ color: '#64748B', fontSize: '12px' }}>
            {(account.detectedLanguage || 'en').toUpperCase()}
          </span>
        </div>

        {/* Heat */}
        <div style={S.cell(0.5, 50)}>
          <span style={S.heatDot(heat)} />
          <span style={{ color: heatMeta.color, fontSize: '11px', fontWeight: 600 }}>
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
          <span style={{
            color: '#94A3B8',
            fontSize: '11px',
            fontFamily: 'var(--gt-font-ibm-plex, "IBM Plex Mono", monospace)',
          }}>
            {formatDate(account.nextActionAt || account.followUpDueAt)}
          </span>
        </div>

        {/* Source */}
        <div style={S.cell(0.4, 36)}>
          <span style={{ color: '#94A3B8', fontSize: '11px' }}>
            {account.country}
          </span>
        </div>

        {/* Message Ready Indicator */}
        <div style={S.cell(0.3, 20)}>
          <span style={S.readyDot(!!msg)} title={msg ? 'Message ready' : 'No message'} />
        </div>

        {/* Quick Actions */}
        <div style={S.actions} onClick={stopProp}>
          {/* Email — THE biggest button */}
          {hasEmail ? (
            <a
              href={buildMailtoUrl(account)}
              style={S.btnEmail}
              title={`Email ${account.financeLead.email}`}
              onClick={(e) => { e.stopPropagation(); onAction(account.id, 'email'); }}
            >
              EMAIL
            </a>
          ) : (
            <span style={{ ...S.btnEmail, ...S.btnDisabled }} title="No email">
              EMAIL
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
            style={{ ...S.btn, color: '#22C55E', borderColor: 'rgba(34,197,94,0.3)' }}
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
            style={{ ...S.btn, color: '#EF4444', borderColor: 'rgba(239,68,68,0.2)' }}
            title="Archive"
            onClick={(e) => { e.stopPropagation(); onAction(account.id, 'archive'); }}
          >
            x
          </button>

          {/* LinkedIn */}
          <button
            style={{ ...S.btn, ...(account.financeLead?.linkedIn ? { color: '#3B82F6', borderColor: 'rgba(59,130,246,0.2)' } : S.btnDisabled) }}
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
              <span style={{ color: '#94A3B8' }}>No signals detected</span>
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
              <div style={{ color: '#334155' }}>{account.whyNow}</div>
            </div>
          )}

          {/* Hypothesis */}
          {account.hypothesis?.summary && (
            <div style={S.detailSection}>
              <div style={S.detailLabel}>HYPOTHESIS</div>
              <div style={{ color: '#334155' }}>{account.hypothesis.summary}</div>
              {account.hypothesis.hiddenExposure.length > 0 && (
                <div style={{ marginTop: '4px', color: '#EF4444', fontSize: '11px' }}>
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
                <div style={{ color: '#0F172A', fontWeight: 600, marginBottom: '4px' }}>
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
                    <span style={{ color: '#334155' }}>{evt.detail}</span>
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
