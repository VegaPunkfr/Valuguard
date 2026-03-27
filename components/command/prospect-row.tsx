'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
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

// ── Font stacks ─────────────────────────────────────────────
const FONT_BODY = 'var(--gt-font-dm-sans, "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const FONT_MONO = 'var(--gt-font-ibm-plex, "IBM Plex Mono", "SF Mono", "Fira Code", monospace)';

// ── Styles ──────────────────────────────────────────────────

const S = {
  /* ── Row container ── */
  row: {
    display: 'grid',
    gridTemplateColumns: '1.8fr 1fr 1.4fr 50px 80px 95px 105px auto',
    alignItems: 'center',
    gap: '14px',
    padding: '0 20px',
    borderBottom: '1px solid #F1F5F9',
    fontFamily: FONT_BODY,
    fontSize: '13px',
    color: '#334155',
    cursor: 'pointer',
    transition: 'background 200ms ease, box-shadow 200ms ease, transform 200ms ease',
    height: '60px',
    background: '#FFFFFF',
    position: 'relative' as const,
    borderLeft: '3px solid transparent',
  } as React.CSSProperties,

  rowHover: {
    background: '#FAFBFD',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    transform: 'translateY(-1px)',
  } as React.CSSProperties,

  rowSelected: {
    background: '#EFF6FF',
    borderLeft: '3px solid #3B82F6',
  } as React.CSSProperties,

  /* ── Cell ── */
  cell: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,

  /* ── Company name — visual hierarchy anchor ── */
  companyName: {
    color: '#0F172A',
    fontWeight: 700,
    fontSize: '16px',
    letterSpacing: '-0.01em',
    lineHeight: 1.2,
  } as React.CSSProperties,

  /* ── Badge system ── */
  badge: (color: string, bg?: string) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.3px',
    color,
    background: bg || `${color}14`,
    whiteSpace: 'nowrap' as const,
    lineHeight: 1.3,
  }),

  /* ── Email button — THE CENTERPIECE ── */
  btnEmail: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '8px 18px',
    borderRadius: '8px',
    border: 'none',
    background: '#0F172A',
    color: '#FFFFFF',
    fontSize: '12px',
    fontWeight: 700,
    fontFamily: FONT_BODY,
    cursor: 'pointer',
    transition: 'all 200ms ease',
    whiteSpace: 'nowrap' as const,
    textDecoration: 'none',
    boxShadow: '0 1px 3px rgba(15,23,42,0.08)',
    letterSpacing: '0.5px',
    lineHeight: 1,
  } as React.CSSProperties,

  btnEmailHover: {
    background: '#1E293B',
    boxShadow: '0 4px 12px rgba(15,23,42,0.15)',
    transform: 'scale(1.02)',
  } as React.CSSProperties,

  btnEmailActive: {
    transform: 'scale(0.98)',
    boxShadow: '0 1px 2px rgba(15,23,42,0.08)',
  } as React.CSSProperties,

  btnEmailDisabled: {
    background: '#E2E8F0',
    color: '#94A3B8',
    cursor: 'not-allowed',
    boxShadow: 'none',
  } as React.CSSProperties,

  /* ── Quick action buttons ── */
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px 14px',
    borderRadius: '6px',
    border: '1px solid #E2E8F0',
    background: '#FFFFFF',
    color: '#334155',
    fontSize: '12px',
    fontFamily: FONT_BODY,
    cursor: 'pointer',
    transition: 'all 150ms ease',
    whiteSpace: 'nowrap' as const,
    fontWeight: 500,
    lineHeight: 1,
  } as React.CSSProperties,

  btnHoverDefault: {
    background: '#F8FAFC',
    borderColor: '#CBD5E1',
  } as React.CSSProperties,

  btnGreen: {
    border: '1px solid rgba(34,197,94,0.3)',
    color: '#16A34A',
  } as React.CSSProperties,

  btnGreenHover: {
    background: 'rgba(34,197,94,0.04)',
    borderColor: 'rgba(34,197,94,0.5)',
  } as React.CSSProperties,

  btnRed: {
    border: '1px solid rgba(239,68,68,0.2)',
    color: '#DC2626',
  } as React.CSSProperties,

  btnRedHover: {
    background: 'rgba(239,68,68,0.04)',
    borderColor: 'rgba(239,68,68,0.35)',
  } as React.CSSProperties,

  btnSnooze: {
    border: '1px solid #E2E8F0',
    color: '#64748B',
  } as React.CSSProperties,

  btnSnoozeHover: {
    background: '#F8FAFC',
    borderColor: '#CBD5E1',
  } as React.CSSProperties,

  btnLinkedIn: {
    color: '#3B82F6',
    border: '1px solid rgba(59,130,246,0.2)',
  } as React.CSSProperties,

  btnDisabled: {
    opacity: 0.35,
    cursor: 'not-allowed',
    pointerEvents: 'none' as const,
  } as React.CSSProperties,

  /* ── Actions container ── */
  actions: {
    display: 'flex',
    gap: '6px',
    flexShrink: 0,
    alignItems: 'center',
  } as React.CSSProperties,

  /* ── Expanded detail panel ── */
  detailOuter: (open: boolean) => ({
    maxHeight: open ? '600px' : '0px',
    overflow: 'hidden' as const,
    transition: 'max-height 300ms ease',
  }),

  detail: {
    background: '#FAFBFD',
    borderTop: '1px solid #E2E8F0',
    padding: '20px 24px',
    fontFamily: FONT_BODY,
    fontSize: '13px',
    color: '#334155',
  } as React.CSSProperties,

  detailSection: {
    marginBottom: '14px',
  } as React.CSSProperties,

  detailLabel: {
    color: '#64748B',
    fontSize: '10px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.12em',
    marginBottom: '6px',
    fontWeight: 600,
    fontFamily: FONT_MONO,
  } as React.CSSProperties,

  signalPill: {
    display: 'inline-block',
    padding: '3px 8px',
    margin: '2px 4px 2px 0',
    borderRadius: '4px',
    background: 'rgba(59,130,246,0.06)',
    color: '#3B82F6',
    fontSize: '11px',
    border: '1px solid rgba(59,130,246,0.10)',
    fontFamily: FONT_MONO,
  } as React.CSSProperties,

  timeline: {
    borderLeft: '2px solid #E2E8F0',
    paddingLeft: '14px',
    marginTop: '8px',
  } as React.CSSProperties,

  timelineItem: {
    marginBottom: '8px',
    lineHeight: 1.5,
    fontSize: '12px',
  } as React.CSSProperties,

  timelineDate: {
    color: '#94A3B8',
    fontSize: '10px',
    marginRight: '8px',
    fontFamily: FONT_MONO,
  } as React.CSSProperties,

  msgPreview: {
    background: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    padding: '12px 14px',
    marginTop: '8px',
    whiteSpace: 'pre-wrap' as const,
    lineHeight: 1.6,
    color: '#334155',
    fontSize: '13px',
    fontFamily: FONT_BODY,
  } as React.CSSProperties,

  heatDot: (tier: string) => ({
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginRight: '5px',
    background: tier === 'hot' ? '#EF4444' : tier === 'warm' ? '#F59E0B' : '#94A3B8',
    boxShadow: tier === 'hot' ? '0 0 6px rgba(239,68,68,0.4)' : 'none',
    flexShrink: 0,
  }),

  readyDot: (ready: boolean) => ({
    display: 'inline-block',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: ready ? '#22C55E' : '#CBD5E1',
    boxShadow: ready ? '0 0 4px rgba(34,197,94,0.4)' : 'none',
  }),

  /* ── Data/metric text ── */
  dataText: {
    fontFamily: FONT_MONO,
    fontSize: '11px',
    color: '#94A3B8',
  } as React.CSSProperties,

  contactText: {
    color: '#334155',
    fontSize: '13px',
  } as React.CSSProperties,

  emailText: (hasEmail: boolean) => ({
    color: hasEmail ? '#64748B' : '#CBD5E1',
    fontSize: '13px',
    fontFamily: FONT_MONO,
  }),

  emailStatusBadge: {
    fontSize: '9px',
    marginLeft: '4px',
    fontWeight: 600,
  } as React.CSSProperties,
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

// ── Hover Button Hook ───────────────────────────────────────

function useHover() {
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);
  const handlers = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => { setHovered(false); setActive(false); },
    onMouseDown: () => setActive(true),
    onMouseUp: () => setActive(false),
  };
  return { hovered, active, handlers };
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

// ── Micro-interaction button wrapper ────────────────────────

function ActionButton({
  children,
  style,
  hoverStyle,
  disabled,
  title,
  onClick,
}: {
  children: React.ReactNode;
  style: React.CSSProperties;
  hoverStyle?: React.CSSProperties;
  disabled?: boolean;
  title?: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const { hovered, active, handlers } = useHover();

  const computedStyle: React.CSSProperties = {
    ...S.btn,
    ...style,
    ...(disabled ? S.btnDisabled : {}),
    ...(!disabled && hovered ? (hoverStyle || S.btnHoverDefault) : {}),
    ...(!disabled && active ? { transform: 'scale(0.98)', transitionDuration: '0.06s' } : {}),
  };

  return (
    <button
      style={computedStyle}
      disabled={disabled}
      title={title}
      onClick={onClick}
      {...(disabled ? {} : handlers)}
    >
      {children}
    </button>
  );
}

// ── Email Pill Button ───────────────────────────────────────

function EmailPill({
  account,
  hasEmail,
  onAction,
}: {
  account: Account;
  hasEmail: boolean;
  onAction: (accountId: string, action: string) => void;
}) {
  const { hovered, active, handlers } = useHover();

  if (!hasEmail) {
    return (
      <span
        style={{ ...S.btnEmail, ...S.btnEmailDisabled }}
        title="No valid email"
      >
        \u2709 EMAIL
      </span>
    );
  }

  const computedStyle: React.CSSProperties = {
    ...S.btnEmail,
    ...(hovered ? S.btnEmailHover : {}),
    ...(active ? S.btnEmailActive : {}),
  };

  return (
    <a
      href={buildMailtoUrl(account)}
      style={computedStyle}
      title={`Email ${account.financeLead?.email}`}
      onClick={(e) => {
        e.stopPropagation();
        onAction(account.id, 'email');
      }}
      {...handlers}
    >
      \u2709 EMAIL
    </a>
  );
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

  // Compute row style with hover + selection states
  const rowStyle: React.CSSProperties = {
    ...S.row,
    ...(hovered ? S.rowHover : {}),
    ...(isSelected ? S.rowSelected : {}),
  };

  return (
    <>
      {/* ── Row ── */}
      <div
        style={rowStyle}
        onClick={() => setExpanded(!expanded)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        role="row"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
      >
        {/* ── Company — 16px 700 weight, visual anchor ── */}
        <div style={S.cell}>
          <div style={S.companyName}>{account.company}</div>
          <div style={{ ...S.dataText, marginTop: '2px' }}>
            {account.country}
            {account.score > 0 && (
              <span style={{ marginLeft: '8px', color: heatMeta.color, fontWeight: 600 }}>
                {account.score}pt
              </span>
            )}
          </div>
        </div>

        {/* ── Contact ── */}
        <div style={S.cell}>
          <span style={S.contactText}>
            {account.financeLead?.name || '\u2014'}
          </span>
        </div>

        {/* ── Email ── */}
        <div style={S.cell}>
          <span style={S.emailText(hasEmail)}>
            {account.financeLead?.email || 'no email'}
          </span>
          {emailMeta && (
            <span style={{ ...S.emailStatusBadge, color: emailMeta.color }}>
              {emailMeta.label}
            </span>
          )}
        </div>

        {/* ── Language ── */}
        <div style={S.cell}>
          <span style={{ ...S.dataText, fontSize: '11px', fontWeight: 500 }}>
            {(account.detectedLanguage || 'en').toUpperCase()}
          </span>
        </div>

        {/* ── Heat tier ── */}
        <div style={{ ...S.cell, display: 'flex', alignItems: 'center' }}>
          <span style={S.heatDot(heat)} />
          <span style={{ color: heatMeta.color, fontSize: '11px', fontWeight: 600, fontFamily: FONT_BODY }}>
            {heatMeta.label}
          </span>
        </div>

        {/* ── Lead Status badge ── */}
        <div style={S.cell}>
          <span style={S.badge(leadMeta.color, leadMeta.bg)}>
            {leadMeta.label}
          </span>
        </div>

        {/* ── Outreach Status badge with icon prefix ── */}
        <div style={S.cell}>
          <span style={S.badge(outreachMeta.color, outreachMeta.bg)}>
            {outreachMeta.icon} {outreachMeta.label}
          </span>
        </div>

        {/* ── Quick Actions — email button dominates ── */}
        <div style={S.actions} onClick={stopProp}>
          {/* Email — THE CENTERPIECE pill */}
          <EmailPill account={account} hasEmail={hasEmail} onAction={onAction} />

          {/* Copy Email */}
          <ActionButton
            style={{}}
            disabled={!hasEmail}
            title={hasEmail ? 'Copy email address' : 'No email available'}
            onClick={(e) => {
              e.stopPropagation();
              if (account.financeLead?.email) {
                handleCopy(account.financeLead.email, 'email');
                onAction(account.id, 'copy_email');
              }
            }}
          >
            {copiedField === 'email' ? '\u2713' : '\u2398'}
          </ActionButton>

          {/* Copy Message */}
          <ActionButton
            style={{}}
            disabled={!msg}
            title={msg ? 'Copy message body' : 'No message available'}
            onClick={(e) => {
              e.stopPropagation();
              if (msg) {
                handleCopy(msg.body, 'msg');
                onAction(account.id, 'copy_message');
              }
            }}
          >
            {copiedField === 'msg' ? '\u2713' : '\u2709'}
          </ActionButton>

          {/* Mark Sent — green */}
          <ActionButton
            style={S.btnGreen}
            hoverStyle={{ ...S.btnGreenHover }}
            title="Mark as sent"
            onClick={(e) => {
              e.stopPropagation();
              onAction(account.id, 'mark_sent');
            }}
          >
            Sent
          </ActionButton>

          {/* Snooze 3d — neutral */}
          <ActionButton
            style={S.btnSnooze}
            hoverStyle={S.btnSnoozeHover}
            title="Snooze 3 days"
            onClick={(e) => {
              e.stopPropagation();
              onAction(account.id, 'snooze_3d');
            }}
          >
            3d
          </ActionButton>

          {/* Snooze 7d — neutral */}
          <ActionButton
            style={S.btnSnooze}
            hoverStyle={S.btnSnoozeHover}
            title="Snooze 7 days"
            onClick={(e) => {
              e.stopPropagation();
              onAction(account.id, 'snooze_7d');
            }}
          >
            7d
          </ActionButton>

          {/* Archive — red */}
          <ActionButton
            style={S.btnRed}
            hoverStyle={S.btnRedHover}
            title="Archive prospect"
            onClick={(e) => {
              e.stopPropagation();
              onAction(account.id, 'archive');
            }}
          >
            Archive
          </ActionButton>

          {/* LinkedIn */}
          <ActionButton
            style={S.btnLinkedIn}
            disabled={!account.financeLead?.linkedIn}
            title={account.financeLead?.linkedIn ? 'Open LinkedIn profile' : 'No LinkedIn URL'}
            onClick={(e) => {
              e.stopPropagation();
              if (account.financeLead?.linkedIn) {
                window.open(account.financeLead.linkedIn, '_blank');
                onAction(account.id, 'open_linkedin');
              }
            }}
          >
            in
          </ActionButton>
        </div>
      </div>

      {/* ── Expanded Detail Panel — smooth height transition ── */}
      <div style={S.detailOuter(expanded)}>
        {expanded && (
          <div style={S.detail}>
            {/* ── 2-column layout for detail sections ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Left column */}
              <div>
                {/* Signals */}
                <div style={S.detailSection}>
                  <div style={S.detailLabel}>SIGNALS ({account.signals.length})</div>
                  {account.signals.length === 0 ? (
                    <span style={{ color: '#94A3B8', fontSize: '12px' }}>No signals detected</span>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {account.signals.map((sig, i) => (
                        <span key={i} style={S.signalPill}>
                          [{sig.strength}] {sig.type}: {sig.detail}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Why Now */}
                {account.whyNow && (
                  <div style={S.detailSection}>
                    <div style={S.detailLabel}>WHY NOW</div>
                    <div style={{ color: '#334155', lineHeight: 1.5 }}>{account.whyNow}</div>
                  </div>
                )}

                {/* Hypothesis */}
                {account.hypothesis?.summary && (
                  <div style={S.detailSection}>
                    <div style={S.detailLabel}>HYPOTHESIS</div>
                    <div style={{ color: '#334155', lineHeight: 1.5 }}>{account.hypothesis.summary}</div>
                    {account.hypothesis.hiddenExposure.length > 0 && (
                      <div style={{
                        marginTop: '6px',
                        color: '#DC2626',
                        fontSize: '11px',
                        fontWeight: 600,
                        fontFamily: FONT_MONO,
                      }}>
                        Exposure: {account.hypothesis.hiddenExposure.join(' \u2502 ')}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right column */}
              <div>
                {/* Next Action */}
                <div style={S.detailSection}>
                  <div style={S.detailLabel}>NEXT ACTION</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: nextMeta.color, fontSize: '13px', fontWeight: 600 }}>
                      {nextMeta.label}
                    </span>
                    <span style={S.dataText}>
                      {formatDate(account.nextActionAt || account.followUpDueAt)}
                    </span>
                  </div>
                </div>

                {/* Score breakdown */}
                <div style={S.detailSection}>
                  <div style={S.detailLabel}>SCORE</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      fontFamily: FONT_MONO,
                      fontSize: '24px',
                      fontWeight: 700,
                      color: heatMeta.color,
                    }}>
                      {account.score}
                    </span>
                    <span style={{ ...S.badge(heatMeta.color, `${heatMeta.color}14`) }}>
                      {heatMeta.label.toUpperCase()}
                    </span>
                    <span style={S.readyDot(!!msg)} />
                    <span style={{ ...S.dataText, fontSize: '10px' }}>
                      {msg ? 'Message ready' : 'No message'}
                    </span>
                  </div>
                </div>

                {/* History Timeline */}
                {account.timeline.length > 0 && (
                  <div style={S.detailSection}>
                    <div style={S.detailLabel}>HISTORY</div>
                    <div style={S.timeline}>
                      {account.timeline.slice(-8).reverse().map((evt, i) => (
                        <div key={i} style={S.timelineItem}>
                          <span style={S.timelineDate}>{formatDate(evt.date)}</span>
                          <span style={{ color: '#334155' }}>{evt.detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Message Preview — full width below grid ── */}
            {msg && (
              <div style={{ ...S.detailSection, marginTop: '4px' }}>
                <div style={S.detailLabel}>MESSAGE PREVIEW</div>
                {msg.subject && (
                  <div style={{
                    color: '#0F172A',
                    fontWeight: 600,
                    fontSize: '13px',
                    marginBottom: '6px',
                  }}>
                    Subject: {msg.subject}
                  </div>
                )}
                <div style={S.msgPreview}>{msg.body}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
