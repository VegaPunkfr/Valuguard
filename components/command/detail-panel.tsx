'use client';

import React, { useState, useCallback } from 'react';
import type { Account } from '@/types/command';
import {
  LEAD_STATUS_META,
  OUTREACH_STATUS_META,
  NEXT_ACTION_META,
  QUEUE_TIER_META,
  EMAIL_STATUS_META,
  STATUS_META,
  ATTACK_META,
  CONVICTION_META,
  TIMELINE_META,
} from '@/types/command';

// ── Premium White Theme Styles ──────────────────────────────

const S = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    right: 0,
    bottom: 0,
    width: '540px',
    maxWidth: '100vw',
    background: '#FFFFFF',
    border: 'none',
    boxShadow: '-8px 0 32px rgba(0,0,0,0.08), -2px 0 8px rgba(0,0,0,0.04)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column' as const,
    fontFamily: 'var(--gt-font-dm-sans, "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)',
    fontSize: '12px',
    color: '#334155',
    overflow: 'hidden',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px',
    borderBottom: '1px solid #F1F5F9',
    background: '#FFFFFF',
    flexShrink: 0,
  } as React.CSSProperties,
  headerTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#0F172A',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    flex: 1,
    letterSpacing: '-0.01em',
  } as React.CSSProperties,
  closeBtn: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    border: 'none',
    background: 'transparent',
    color: '#64748B',
    fontSize: '16px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    flexShrink: 0,
    marginLeft: '12px',
    transition: 'background 0.15s ease',
  } as React.CSSProperties,
  closeBtnHoverClass: 'detail-panel-close-hover',
  body: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '0 20px',
  } as React.CSSProperties,
  section: {
    padding: '16px 0',
    borderBottom: '1px solid #F1F5F9',
  } as React.CSSProperties,
  sectionLast: {
    padding: '16px 0',
    borderBottom: 'none',
  } as React.CSSProperties,
  sectionTitle: {
    color: '#64748B',
    fontSize: '10px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    marginBottom: '10px',
    fontWeight: 600,
  } as React.CSSProperties,
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
  } as React.CSSProperties,
  infoRow: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '3px',
  } as React.CSSProperties,
  infoLabel: {
    color: '#64748B',
    fontSize: '10px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    fontWeight: 600,
  } as React.CSSProperties,
  infoValue: {
    color: '#0F172A',
    fontSize: '13px',
    fontFamily: 'var(--gt-font-ibm-plex, "IBM Plex Mono", monospace)',
  } as React.CSSProperties,
  badge: (color: string, bg: string) => ({
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.5px',
    color,
    background: bg,
  }),
  signalPill: (strength: number) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 8px',
    margin: '2px 4px 2px 0',
    borderRadius: '4px',
    background: strength >= 4 ? 'rgba(220,38,38,0.05)' : strength >= 3 ? 'rgba(37,99,235,0.05)' : 'rgba(100,116,139,0.04)',
    border: strength >= 4 ? '1px solid rgba(220,38,38,0.15)' : strength >= 3 ? '1px solid rgba(37,99,235,0.15)' : '1px solid rgba(100,116,139,0.10)',
    color: strength >= 4 ? '#DC2626' : strength >= 3 ? '#2563EB' : '#94A3B8',
    fontSize: '11px',
    fontWeight: 500,
  }),
  msgBox: {
    background: '#FAFBFD',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    padding: '14px 16px',
    marginTop: '8px',
  } as React.CSSProperties,
  msgSubject: {
    color: '#0F172A',
    fontWeight: 600,
    fontSize: '14px',
    marginBottom: '10px',
    lineHeight: 1.4,
  } as React.CSSProperties,
  msgBody: {
    color: '#334155',
    fontSize: '14px',
    whiteSpace: 'pre-wrap' as const,
    lineHeight: 1.65,
  } as React.CSSProperties,
  timeline: {
    borderLeft: '2px solid #E2E8F0',
    paddingLeft: '16px',
  } as React.CSSProperties,
  timelineItem: {
    position: 'relative' as const,
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: '1px solid #F1F5F9',
  } as React.CSSProperties,
  timelineDot: (color: string) => ({
    position: 'absolute' as const,
    left: '-21px',
    top: '4px',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: color,
    boxShadow: `0 0 0 3px #FFFFFF, 0 0 0 4px ${color}30`,
  }),
  timelineDate: {
    color: '#94A3B8',
    fontSize: '10px',
    fontFamily: 'var(--gt-font-ibm-plex, "IBM Plex Mono", monospace)',
  } as React.CSSProperties,
  timelineDetail: {
    color: '#334155',
    fontSize: '12px',
    marginTop: '3px',
    lineHeight: 1.4,
  } as React.CSSProperties,
  actionsBar: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
    padding: '16px 20px',
    borderTop: '1px solid #E2E8F0',
    background: '#FAFBFD',
    flexShrink: 0,
  } as React.CSSProperties,
  actionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #CBD5E1',
    background: '#FFFFFF',
    color: '#334155',
    fontSize: '12px',
    fontWeight: 500,
    fontFamily: 'var(--gt-font-dm-sans, "DM Sans", sans-serif)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    textDecoration: 'none',
  } as React.CSSProperties,
  actionBtnEmail: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    width: '100%',
    padding: '12px 20px',
    borderRadius: '8px',
    border: 'none',
    background: '#0F172A',
    color: '#FFFFFF',
    fontSize: '14px',
    fontWeight: 700,
    fontFamily: 'var(--gt-font-dm-sans, "DM Sans", sans-serif)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    textDecoration: 'none',
    boxShadow: '0 2px 8px rgba(15,23,42,0.15), 0 1px 3px rgba(15,23,42,0.10)',
    letterSpacing: '0.02em',
  } as React.CSSProperties,
  actionBtnDisabled: {
    opacity: 0.3,
    cursor: 'not-allowed',
  } as React.CSSProperties,
  copyFeedback: {
    color: '#22C55E',
    fontSize: '10px',
    marginLeft: '4px',
    fontWeight: 600,
  } as React.CSSProperties,
  backdrop: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(15,23,42,0.08)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    zIndex: 999,
  } as React.CSSProperties,
  copyBtnInline: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 6px',
    borderRadius: '4px',
    border: '1px solid #E2E8F0',
    background: '#FFFFFF',
    color: '#64748B',
    fontSize: '9px',
    fontWeight: 600,
    fontFamily: 'var(--gt-font-dm-sans, "DM Sans", sans-serif)',
    cursor: 'pointer',
    transition: 'all 0.12s ease',
    letterSpacing: '0.03em',
    textTransform: 'uppercase' as const,
  } as React.CSSProperties,
};

// ── Helpers ─────────────────────────────────────────────────

function formatDate(iso?: string): string {
  if (!iso) return '\u2014';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function getHeatTier(score: number): string {
  if (score >= 18) return 'hot';
  if (score >= 12) return 'warm';
  return 'cold';
}

// ── Props ───────────────────────────────────────────────────

export interface DetailPanelProps {
  account: Account;
  onAction: (accountId: string, action: string, payload?: string) => void;
  onClose: () => void;
}

// ── Component ───────────────────────────────────────────────

export default function DetailPanel({ account, onAction, onClose }: DetailPanelProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [closeHover, setCloseHover] = useState(false);
  const a = account;

  const hasEmail = !!(a.financeLead?.email && a.financeLead.emailStatus !== 'invalid' && a.financeLead.emailStatus !== 'missing');
  const leadMeta = LEAD_STATUS_META[a.leadStatus || 'new'];
  const outreachMeta = OUTREACH_STATUS_META[a.outreachStatus || 'no_message_generated'];
  const nextMeta = NEXT_ACTION_META[a.nextActionType || 'send_now'];
  const statusMeta = STATUS_META[a.status];
  const attackMeta = ATTACK_META[a.attackability];
  const convictionMeta = CONVICTION_META[a.conviction];
  const emailMeta = a.financeLead?.emailStatus ? EMAIL_STATUS_META[a.financeLead.emailStatus] : null;
  const heat = getHeatTier(a.score);
  const heatMeta = QUEUE_TIER_META[heat as keyof typeof QUEUE_TIER_META];

  const bestMsg = a.outreach.find(o => o.status === 'draft' || o.status === 'sent') || a.outreach[0] || null;

  const handleCopy = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  }, []);

  const buildMailto = (): string => {
    const email = a.financeLead?.email;
    if (!email) return '';
    const subject = encodeURIComponent(bestMsg?.subject || `Ghost Tax \u2014 ${a.company} SaaS exposure`);
    const body = encodeURIComponent(bestMsg?.body || '');
    return `mailto:${email}?subject=${subject}&body=${body}`;
  };

  return (
    <>
      {/* Backdrop */}
      <div style={S.backdrop} onClick={onClose} />

      {/* Panel */}
      <div style={S.overlay}>
        {/* Header */}
        <div style={S.header}>
          <div style={S.headerTitle}>{a.company}</div>
          <span style={S.badge(heatMeta.color, heatMeta.bg)}>{heatMeta.label}</span>
          <span style={{ ...S.badge(leadMeta.color, leadMeta.bg), marginLeft: '6px' }}>{leadMeta.label}</span>
          <button
            style={{
              ...S.closeBtn,
              background: closeHover ? '#F1F5F9' : 'transparent',
            }}
            onClick={onClose}
            onMouseEnter={() => setCloseHover(true)}
            onMouseLeave={() => setCloseHover(false)}
            title="Close"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div style={S.body}>
          {/* Account Info */}
          <div style={S.section}>
            <div style={S.sectionTitle}>ACCOUNT INFO</div>
            <div style={S.infoGrid}>
              <div style={S.infoRow}>
                <span style={S.infoLabel}>Domain</span>
                <span style={S.infoValue}>{a.domain}</span>
              </div>
              <div style={S.infoRow}>
                <span style={S.infoLabel}>Country</span>
                <span style={S.infoValue}>{a.country}</span>
              </div>
              <div style={S.infoRow}>
                <span style={S.infoLabel}>Industry</span>
                <span style={S.infoValue}>{a.industry}</span>
              </div>
              <div style={S.infoRow}>
                <span style={S.infoLabel}>Employees</span>
                <span style={S.infoValue}>{a.employeeRange}</span>
              </div>
              <div style={S.infoRow}>
                <span style={S.infoLabel}>Score</span>
                <span style={S.infoValue}>{a.score}/25</span>
              </div>
              <div style={S.infoRow}>
                <span style={S.infoLabel}>Tier</span>
                <span style={S.infoValue}>T{a.tier}</span>
              </div>
              <div style={S.infoRow}>
                <span style={S.infoLabel}>Attackability</span>
                <span style={S.badge(attackMeta.color, attackMeta.bg)}>{attackMeta.label}</span>
              </div>
              <div style={S.infoRow}>
                <span style={S.infoLabel}>Conviction</span>
                <span style={{ ...S.infoValue, color: convictionMeta.color }}>{convictionMeta.label}</span>
              </div>
              <div style={S.infoRow}>
                <span style={S.infoLabel}>Status</span>
                <span style={S.badge(statusMeta.color, statusMeta.bg)}>{statusMeta.label}</span>
              </div>
              <div style={S.infoRow}>
                <span style={S.infoLabel}>Revenue Est.</span>
                <span style={S.infoValue}>{a.revenueEstimate.toLocaleString()} EUR</span>
              </div>
              <div style={S.infoRow}>
                <span style={S.infoLabel}>Language</span>
                <span style={S.infoValue}>{(a.detectedLanguage || 'en').toUpperCase()}</span>
              </div>
              <div style={S.infoRow}>
                <span style={S.infoLabel}>Website</span>
                <span style={S.infoValue}>{a.website || a.domain}</span>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div style={S.section}>
            <div style={S.sectionTitle}>CONTACT</div>
            <div style={S.infoGrid}>
              <div style={S.infoRow}>
                <span style={S.infoLabel}>Name</span>
                <span style={S.infoValue}>{a.financeLead?.name || '\u2014'}</span>
              </div>
              <div style={S.infoRow}>
                <span style={S.infoLabel}>Title</span>
                <span style={S.infoValue}>{a.financeLead?.title || '\u2014'}</span>
              </div>
              <div style={S.infoRow}>
                <span style={S.infoLabel}>Email</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ ...S.infoValue, color: hasEmail ? '#0F172A' : '#94A3B8' }}>
                    {a.financeLead?.email || 'No email'}
                  </span>
                  {emailMeta && <span style={S.badge(emailMeta.color, 'transparent')}>{emailMeta.label}</span>}
                  {hasEmail && (
                    <button
                      style={S.copyBtnInline}
                      onClick={() => handleCopy(a.financeLead.email!, 'email')}
                    >
                      {copiedField === 'email' ? 'Copied!' : 'Copy'}
                    </button>
                  )}
                </span>
              </div>
              <div style={S.infoRow}>
                <span style={S.infoLabel}>LinkedIn</span>
                <span style={S.infoValue}>
                  {a.financeLead?.linkedIn ? (
                    <a href={a.financeLead.linkedIn} target="_blank" rel="noopener" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 500 }}>
                      Open profile
                    </a>
                  ) : '\u2014'}
                </span>
              </div>
            </div>
          </div>

          {/* Outreach Status */}
          <div style={S.section}>
            <div style={S.sectionTitle}>OUTREACH STATUS</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={S.badge(outreachMeta.color, outreachMeta.bg)}>{outreachMeta.icon} {outreachMeta.label}</span>
              <span style={S.badge(nextMeta.color, 'transparent')}>{nextMeta.label}</span>
              {a.nextActionAt && <span style={{ color: '#64748B', fontSize: '10px' }}>Due: {formatDate(a.nextActionAt)}</span>}
              {a.followUpCount ? <span style={{ color: '#64748B', fontSize: '10px' }}>Follow-ups: {a.followUpCount}</span> : null}
            </div>
          </div>

          {/* Why Now + Hypothesis */}
          {(a.whyNow || a.hypothesis?.summary) && (
            <div style={S.section}>
              <div style={S.sectionTitle}>THESIS</div>
              {a.whyNow && <div style={{ color: '#334155', marginBottom: '6px', fontSize: '13px', lineHeight: 1.5 }}><strong style={{ color: '#2563EB' }}>Why now:</strong> {a.whyNow}</div>}
              {a.hypothesis?.summary && <div style={{ color: '#334155', marginBottom: '6px', fontSize: '13px', lineHeight: 1.5 }}><strong style={{ color: '#7C3AED' }}>Hypothesis:</strong> {a.hypothesis.summary}</div>}
              {a.hypothesis?.hiddenExposure && a.hypothesis.hiddenExposure.length > 0 && (
                <div style={{ color: '#DC2626', fontSize: '11px', marginTop: '6px', fontWeight: 500 }}>
                  Hidden exposure: {a.hypothesis.hiddenExposure.join(' | ')}
                </div>
              )}
            </div>
          )}

          {/* Signals */}
          <div style={S.section}>
            <div style={S.sectionTitle}>SIGNALS ({a.signals.length})</div>
            {a.signals.length === 0 ? (
              <span style={{ color: '#94A3B8', fontSize: '12px' }}>No signals detected</span>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {a.signals.map((sig, i) => (
                  <span key={i} style={S.signalPill(sig.strength)}>
                    <strong>[{sig.strength}]</strong> {sig.type}: {sig.detail}
                    {sig.source && <span style={{ color: '#94A3B8', marginLeft: '4px' }}>({sig.source})</span>}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Scan Results */}
          {a.scan && (
            <div style={S.section}>
              <div style={S.sectionTitle}>SCAN RESULTS</div>
              <div style={S.infoGrid}>
                <div style={S.infoRow}>
                  <span style={S.infoLabel}>Vendors</span>
                  <span style={S.infoValue}>{a.scan.vendorCount} ({a.scan.vendors.slice(0, 5).join(', ')})</span>
                </div>
                <div style={S.infoRow}>
                  <span style={S.infoLabel}>Exposure</span>
                  <span style={{ ...S.infoValue, color: '#DC2626', fontWeight: 600 }}>
                    {a.scan.exposureLow.toLocaleString()}\u2013{a.scan.exposureHigh.toLocaleString()} {a.scan.currency}
                  </span>
                </div>
              </div>
              {a.scan.summary && <div style={{ color: '#64748B', marginTop: '8px', fontSize: '12px', lineHeight: 1.5 }}>{a.scan.summary}</div>}
            </div>
          )}

          {/* Message Preview */}
          {bestMsg && (
            <div style={S.section}>
              <div style={S.sectionTitle}>
                MESSAGE PREVIEW
                <span style={{ marginLeft: '8px', color: '#94A3B8', fontWeight: 400 }}>({bestMsg.channel})</span>
              </div>
              <div style={S.msgBox}>
                {bestMsg.subject && (
                  <div style={S.msgSubject}>
                    <span>Subject: {bestMsg.subject}</span>
                    <button
                      style={{ ...S.copyBtnInline, marginLeft: '8px' }}
                      onClick={() => handleCopy(bestMsg.subject!, 'subject')}
                    >
                      {copiedField === 'subject' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                )}
                <div style={S.msgBody}>{bestMsg.body}</div>
                <div style={{ marginTop: '10px', display: 'flex', gap: '6px' }}>
                  <button
                    style={S.copyBtnInline}
                    onClick={() => handleCopy(bestMsg.body, 'body')}
                  >
                    {copiedField === 'body' ? 'Copied!' : 'Copy body'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Strengths / Weaknesses */}
          {(a.strengths.length > 0 || a.weaknesses.length > 0) && (
            <div style={S.section}>
              <div style={S.sectionTitle}>STRENGTHS & WEAKNESSES</div>
              {a.strengths.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  {a.strengths.map((s, i) => (
                    <div key={i} style={{ color: '#16A34A', fontSize: '12px', marginBottom: '3px', lineHeight: 1.4 }}>+ {s}</div>
                  ))}
                </div>
              )}
              {a.weaknesses.length > 0 && (
                <div>
                  {a.weaknesses.map((w, i) => (
                    <div key={i} style={{ color: '#DC2626', fontSize: '12px', marginBottom: '3px', lineHeight: 1.4 }}>- {w}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* History Timeline */}
          {a.timeline.length > 0 && (
            <div style={S.section}>
              <div style={S.sectionTitle}>HISTORY ({a.timeline.length} events)</div>
              <div style={S.timeline}>
                {a.timeline.slice(-15).reverse().map((evt, i) => {
                  const meta = TIMELINE_META[evt.type] || { label: evt.type, color: '#64748B' };
                  return (
                    <div key={i} style={S.timelineItem}>
                      <div style={S.timelineDot(meta.color)} />
                      <div style={S.timelineDate}>{formatDate(evt.date)}</div>
                      <div style={S.timelineDetail}>
                        <strong style={{ color: meta.color }}>{meta.label}</strong>: {evt.detail}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Execution Log */}
          {a.executionLog.length > 0 && (
            <div style={S.sectionLast}>
              <div style={S.sectionTitle}>EXECUTION LOG</div>
              {a.executionLog.slice(-10).reverse().map((entry, i) => (
                <div key={i} style={{ marginBottom: '6px', fontSize: '12px', lineHeight: 1.4 }}>
                  <span style={{ color: '#94A3B8', fontFamily: 'var(--gt-font-ibm-plex, "IBM Plex Mono", monospace)', fontSize: '10px' }}>{formatDate(entry.date)}</span>
                  <span style={{ color: '#334155', marginLeft: '8px' }}>{entry.action}</span>
                  {entry.result && <span style={{ color: '#64748B', marginLeft: '4px' }}>({entry.result})</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons Footer */}
        <div style={S.actionsBar}>
          {/* EMAIL — Full width primary button */}
          {hasEmail ? (
            <a
              href={buildMailto()}
              style={S.actionBtnEmail}
              onClick={() => onAction(a.id, 'email')}
            >
              EMAIL {a.financeLead?.email}
            </a>
          ) : (
            <span style={{ ...S.actionBtnEmail, ...S.actionBtnDisabled }}>NO EMAIL AVAILABLE</span>
          )}

          {/* Gmail Draft */}
          {hasEmail ? (
            <a
              href={buildMailto()}
              style={{ ...S.actionBtn, color: '#7C3AED', borderColor: 'rgba(124,58,237,0.25)' }}
              target="_blank"
              rel="noopener"
            >
              Gmail Draft
            </a>
          ) : (
            <span style={{ ...S.actionBtn, ...S.actionBtnDisabled, color: '#7C3AED' }}>Gmail Draft</span>
          )}

          {/* Copy Email */}
          {hasEmail && (
            <button
              style={{ ...S.actionBtn, color: '#2563EB', borderColor: 'rgba(37,99,235,0.25)' }}
              onClick={() => { handleCopy(a.financeLead.email!, 'femail'); onAction(a.id, 'copy_email'); }}
            >
              {copiedField === 'femail' ? 'Copied!' : 'Copy Email'}
            </button>
          )}

          {/* Copy Message */}
          {bestMsg && (
            <button
              style={S.actionBtn}
              onClick={() => { handleCopy(bestMsg.body, 'fbody'); onAction(a.id, 'copy_message'); }}
            >
              {copiedField === 'fbody' ? 'Copied!' : 'Copy Msg'}
            </button>
          )}

          {/* Mark Sent */}
          <button
            style={{ ...S.actionBtn, color: '#16A34A', borderColor: 'rgba(22,163,74,0.25)' }}
            onClick={() => onAction(a.id, 'mark_sent')}
          >
            Mark Sent
          </button>

          {/* Snooze */}
          <button
            style={S.actionBtn}
            onClick={() => onAction(a.id, 'snooze_3d')}
          >
            Snooze 3d
          </button>
          <button
            style={S.actionBtn}
            onClick={() => onAction(a.id, 'snooze_7d')}
          >
            Snooze 7d
          </button>

          {/* Archive */}
          <button
            style={{ ...S.actionBtn, color: '#DC2626', borderColor: 'rgba(220,38,38,0.25)' }}
            onClick={() => onAction(a.id, 'archive')}
          >
            Archive
          </button>

          {/* LinkedIn */}
          {a.financeLead?.linkedIn ? (
            <a
              href={a.financeLead.linkedIn}
              target="_blank"
              rel="noopener"
              style={{ ...S.actionBtn, color: '#2563EB', borderColor: 'rgba(37,99,235,0.25)' }}
              onClick={() => onAction(a.id, 'open_linkedin')}
            >
              LinkedIn
            </a>
          ) : (
            <span style={{ ...S.actionBtn, ...S.actionBtnDisabled }}>LinkedIn</span>
          )}
        </div>
      </div>
    </>
  );
}
