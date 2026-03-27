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
// Action type is string for flexibility

// ── Styles ──────────────────────────────────────────────────

const S = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    right: 0,
    bottom: 0,
    width: '520px',
    maxWidth: '100vw',
    background: '#FFFFFF',
    borderLeft: '1px solid #E2E8F0',
    boxShadow: '0 8px 32px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.04)',
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
    padding: '16px 20px',
    borderBottom: '1px solid #E2E8F0',
    background: '#FFFFFF',
    flexShrink: 0,
  } as React.CSSProperties,
  headerTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#0F172A',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    flex: 1,
  } as React.CSSProperties,
  closeBtn: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    border: '1px solid #E2E8F0',
    background: '#FFFFFF',
    color: '#64748B',
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    flexShrink: 0,
    marginLeft: '12px',
    transition: 'all 0.15s',
  } as React.CSSProperties,
  body: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '16px 20px',
  } as React.CSSProperties,
  section: {
    marginBottom: '20px',
  } as React.CSSProperties,
  sectionTitle: {
    color: '#64748B',
    fontSize: '10px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    marginBottom: '8px',
    fontWeight: 600,
  } as React.CSSProperties,
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '6px',
  } as React.CSSProperties,
  infoRow: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  } as React.CSSProperties,
  infoLabel: {
    color: '#64748B',
    fontSize: '10px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
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
    background: strength >= 4 ? 'rgba(239,68,68,0.06)' : strength >= 3 ? 'rgba(59,130,246,0.06)' : 'rgba(100,116,139,0.04)',
    border: strength >= 4 ? '1px solid rgba(239,68,68,0.12)' : strength >= 3 ? '1px solid rgba(59,130,246,0.12)' : '1px solid rgba(100,116,139,0.08)',
    color: strength >= 4 ? '#EF4444' : strength >= 3 ? '#3B82F6' : '#64748B',
    fontSize: '11px',
  }),
  msgBox: {
    background: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    padding: '12px 14px',
    marginTop: '6px',
  } as React.CSSProperties,
  msgSubject: {
    color: '#0F172A',
    fontWeight: 600,
    fontSize: '13px',
    marginBottom: '8px',
  } as React.CSSProperties,
  msgBody: {
    color: '#334155',
    fontSize: '13px',
    whiteSpace: 'pre-wrap' as const,
    lineHeight: 1.6,
  } as React.CSSProperties,
  timeline: {
    borderLeft: '2px solid #E2E8F0',
    paddingLeft: '14px',
  } as React.CSSProperties,
  timelineItem: {
    position: 'relative' as const,
    marginBottom: '10px',
    paddingBottom: '10px',
    borderBottom: '1px solid #F1F5F9',
  } as React.CSSProperties,
  timelineDot: (color: string) => ({
    position: 'absolute' as const,
    left: '-19px',
    top: '4px',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: color,
  }),
  timelineDate: {
    color: '#94A3B8',
    fontSize: '10px',
    fontFamily: 'var(--gt-font-ibm-plex, "IBM Plex Mono", monospace)',
  } as React.CSSProperties,
  timelineDetail: {
    color: '#334155',
    fontSize: '12px',
    marginTop: '2px',
  } as React.CSSProperties,
  actionsBar: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '6px',
    padding: '12px 20px',
    borderTop: '1px solid #E2E8F0',
    background: '#F8FAFC',
    flexShrink: 0,
  } as React.CSSProperties,
  actionBtn: (color: string) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 16px',
    borderRadius: '6px',
    border: `1px solid ${color}25`,
    background: `${color}08`,
    color,
    fontSize: '11px',
    fontWeight: 600,
    fontFamily: 'var(--gt-font-dm-sans, "DM Sans", sans-serif)',
    cursor: 'pointer',
    transition: 'all 0.15s',
    textDecoration: 'none',
  } as React.CSSProperties),
  actionBtnEmail: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    background: '#0F172A',
    color: '#FFFFFF',
    fontSize: '13px',
    fontWeight: 700,
    fontFamily: 'var(--gt-font-dm-sans, "DM Sans", sans-serif)',
    cursor: 'pointer',
    transition: 'all 0.15s',
    textDecoration: 'none',
    flex: '1 1 100%',
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
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
    background: 'rgba(0,0,0,0.10)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    zIndex: 999,
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
          <button style={S.closeBtn} onClick={onClose} title="Close">&times;</button>
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
                      style={{ ...S.actionBtn('#3B82F6'), padding: '2px 6px', fontSize: '9px' }}
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
                    <a href={a.financeLead.linkedIn} target="_blank" rel="noopener" style={{ color: '#3B82F6', textDecoration: 'none' }}>
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
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={S.badge(outreachMeta.color, outreachMeta.bg)}>{outreachMeta.icon} {outreachMeta.label}</span>
              <span style={S.badge(nextMeta.color, 'transparent')}>{nextMeta.label}</span>
              {a.nextActionAt && <span style={{ color: '#64748B', fontSize: '10px', alignSelf: 'center' }}>Due: {formatDate(a.nextActionAt)}</span>}
              {a.followUpCount ? <span style={{ color: '#64748B', fontSize: '10px', alignSelf: 'center' }}>Follow-ups: {a.followUpCount}</span> : null}
            </div>
          </div>

          {/* Why Now + Hypothesis */}
          {(a.whyNow || a.hypothesis?.summary) && (
            <div style={S.section}>
              <div style={S.sectionTitle}>THESIS</div>
              {a.whyNow && <div style={{ color: '#334155', marginBottom: '6px' }}><strong style={{ color: '#3B82F6' }}>Why now:</strong> {a.whyNow}</div>}
              {a.hypothesis?.summary && <div style={{ color: '#334155', marginBottom: '6px' }}><strong style={{ color: '#7C3AED' }}>Hypothesis:</strong> {a.hypothesis.summary}</div>}
              {a.hypothesis?.hiddenExposure && a.hypothesis.hiddenExposure.length > 0 && (
                <div style={{ color: '#EF4444', fontSize: '11px', marginTop: '4px' }}>
                  Hidden exposure: {a.hypothesis.hiddenExposure.join(' | ')}
                </div>
              )}
            </div>
          )}

          {/* Signals */}
          <div style={S.section}>
            <div style={S.sectionTitle}>SIGNALS ({a.signals.length})</div>
            {a.signals.length === 0 ? (
              <span style={{ color: '#94A3B8' }}>No signals detected</span>
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
                  <span style={{ ...S.infoValue, color: '#EF4444' }}>
                    {a.scan.exposureLow.toLocaleString()}\u2013{a.scan.exposureHigh.toLocaleString()} {a.scan.currency}
                  </span>
                </div>
              </div>
              {a.scan.summary && <div style={{ color: '#64748B', marginTop: '6px', fontSize: '12px' }}>{a.scan.summary}</div>}
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
                    Subject: {bestMsg.subject}
                    <button
                      style={{ ...S.actionBtn('#3B82F6'), padding: '2px 6px', fontSize: '9px', marginLeft: '8px' }}
                      onClick={() => handleCopy(bestMsg.subject!, 'subject')}
                    >
                      {copiedField === 'subject' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                )}
                <div style={S.msgBody}>{bestMsg.body}</div>
                <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
                  <button
                    style={S.actionBtn('#64748B')}
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
                <div style={{ marginBottom: '6px' }}>
                  {a.strengths.map((s, i) => (
                    <div key={i} style={{ color: '#22C55E', fontSize: '11px', marginBottom: '2px' }}>+ {s}</div>
                  ))}
                </div>
              )}
              {a.weaknesses.length > 0 && (
                <div>
                  {a.weaknesses.map((w, i) => (
                    <div key={i} style={{ color: '#EF4444', fontSize: '11px', marginBottom: '2px' }}>- {w}</div>
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
            <div style={S.section}>
              <div style={S.sectionTitle}>EXECUTION LOG</div>
              {a.executionLog.slice(-10).reverse().map((entry, i) => (
                <div key={i} style={{ marginBottom: '4px', fontSize: '11px' }}>
                  <span style={{ color: '#94A3B8', fontFamily: 'var(--gt-font-ibm-plex, "IBM Plex Mono", monospace)' }}>{formatDate(entry.date)}</span>
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

          {/* Gmail Draft (placeholder -> mailto) */}
          {hasEmail ? (
            <a
              href={buildMailto()}
              style={S.actionBtn('#7C3AED')}
              target="_blank"
              rel="noopener"
            >
              Gmail Draft
            </a>
          ) : (
            <span style={{ ...S.actionBtn('#7C3AED'), ...S.actionBtnDisabled }}>Gmail Draft</span>
          )}

          {/* Copy Email */}
          {hasEmail && (
            <button
              style={S.actionBtn('#3B82F6')}
              onClick={() => { handleCopy(a.financeLead.email!, 'femail'); onAction(a.id, 'copy_email'); }}
            >
              {copiedField === 'femail' ? 'Copied!' : 'Copy Email'}
            </button>
          )}

          {/* Copy Message */}
          {bestMsg && (
            <button
              style={S.actionBtn('#64748B')}
              onClick={() => { handleCopy(bestMsg.body, 'fbody'); onAction(a.id, 'copy_message'); }}
            >
              {copiedField === 'fbody' ? 'Copied!' : 'Copy Msg'}
            </button>
          )}

          {/* Mark Sent */}
          <button
            style={S.actionBtn('#22C55E')}
            onClick={() => onAction(a.id, 'mark_sent')}
          >
            Mark Sent
          </button>

          {/* Snooze */}
          <button
            style={S.actionBtn('#64748B')}
            onClick={() => onAction(a.id, 'snooze_3d')}
          >
            Snooze 3d
          </button>
          <button
            style={S.actionBtn('#64748B')}
            onClick={() => onAction(a.id, 'snooze_7d')}
          >
            Snooze 7d
          </button>

          {/* Archive */}
          <button
            style={S.actionBtn('#EF4444')}
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
              style={S.actionBtn('#3B82F6')}
              onClick={() => onAction(a.id, 'open_linkedin')}
            >
              LinkedIn
            </a>
          ) : (
            <span style={{ ...S.actionBtn('#3B82F6'), ...S.actionBtnDisabled }}>LinkedIn</span>
          )}
        </div>
      </div>
    </>
  );
}
