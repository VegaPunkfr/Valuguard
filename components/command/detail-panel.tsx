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
    background: '#0c1021',
    borderLeft: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '-8px 0 32px rgba(0,0,0,0.6)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column' as const,
    fontFamily: 'var(--vg-font-mono, "JetBrains Mono", "Fira Code", monospace)',
    fontSize: '11px',
    color: '#e4e9f4',
    overflow: 'hidden',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(59,130,246,0.03)',
    flexShrink: 0,
  } as React.CSSProperties,
  headerTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#e4e9f4',
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
    borderRadius: '4px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)',
    color: '#94a3b8',
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    flexShrink: 0,
    marginLeft: '12px',
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
    color: '#475569',
    fontSize: '9px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1.2px',
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
    color: '#475569',
    fontSize: '9px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.8px',
  } as React.CSSProperties,
  infoValue: {
    color: '#cbd5e1',
    fontSize: '12px',
  } as React.CSSProperties,
  badge: (color: string, bg: string) => ({
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '3px',
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
    borderRadius: '3px',
    background: strength >= 4 ? 'rgba(239,68,68,0.08)' : strength >= 3 ? 'rgba(59,130,246,0.08)' : 'rgba(100,116,139,0.06)',
    color: strength >= 4 ? '#ef4444' : strength >= 3 ? '#60a5fa' : '#64748b',
    fontSize: '10px',
  }),
  msgBox: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '4px',
    padding: '12px 14px',
    marginTop: '6px',
  } as React.CSSProperties,
  msgSubject: {
    color: '#e4e9f4',
    fontWeight: 600,
    fontSize: '12px',
    marginBottom: '8px',
  } as React.CSSProperties,
  msgBody: {
    color: '#94a3b8',
    fontSize: '11px',
    whiteSpace: 'pre-wrap' as const,
    lineHeight: 1.6,
  } as React.CSSProperties,
  timeline: {
    borderLeft: '2px solid rgba(255,255,255,0.06)',
    paddingLeft: '14px',
  } as React.CSSProperties,
  timelineItem: {
    position: 'relative' as const,
    marginBottom: '10px',
    paddingBottom: '10px',
    borderBottom: '1px solid rgba(255,255,255,0.02)',
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
    color: '#475569',
    fontSize: '10px',
  } as React.CSSProperties,
  timelineDetail: {
    color: '#cbd5e1',
    fontSize: '11px',
    marginTop: '2px',
  } as React.CSSProperties,
  actionsBar: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '6px',
    padding: '12px 20px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.01)',
    flexShrink: 0,
  } as React.CSSProperties,
  actionBtn: (color: string) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    borderRadius: '4px',
    border: `1px solid ${color}33`,
    background: `${color}0a`,
    color,
    fontSize: '10px',
    fontWeight: 600,
    fontFamily: 'var(--vg-font-mono, monospace)',
    cursor: 'pointer',
    transition: 'all 0.15s',
    textDecoration: 'none',
  } as React.CSSProperties),
  actionBtnDisabled: {
    opacity: 0.3,
    cursor: 'not-allowed',
  } as React.CSSProperties,
  copyFeedback: {
    color: '#34d399',
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
    background: 'rgba(0,0,0,0.4)',
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
                  <span style={{ ...S.infoValue, color: hasEmail ? '#cbd5e1' : '#475569' }}>
                    {a.financeLead?.email || 'No email'}
                  </span>
                  {emailMeta && <span style={S.badge(emailMeta.color, 'transparent')}>{emailMeta.label}</span>}
                  {hasEmail && (
                    <button
                      style={{ ...S.actionBtn('#3b82f6'), padding: '2px 6px', fontSize: '9px' }}
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
                    <a href={a.financeLead.linkedIn} target="_blank" rel="noopener" style={{ color: '#60a5fa', textDecoration: 'none' }}>
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
              {a.nextActionAt && <span style={{ color: '#64748b', fontSize: '10px', alignSelf: 'center' }}>Due: {formatDate(a.nextActionAt)}</span>}
              {a.followUpCount ? <span style={{ color: '#64748b', fontSize: '10px', alignSelf: 'center' }}>Follow-ups: {a.followUpCount}</span> : null}
            </div>
          </div>

          {/* Why Now + Hypothesis */}
          {(a.whyNow || a.hypothesis?.summary) && (
            <div style={S.section}>
              <div style={S.sectionTitle}>THESIS</div>
              {a.whyNow && <div style={{ color: '#cbd5e1', marginBottom: '6px' }}><strong style={{ color: '#60a5fa' }}>Why now:</strong> {a.whyNow}</div>}
              {a.hypothesis?.summary && <div style={{ color: '#cbd5e1', marginBottom: '6px' }}><strong style={{ color: '#a78bfa' }}>Hypothesis:</strong> {a.hypothesis.summary}</div>}
              {a.hypothesis?.hiddenExposure && a.hypothesis.hiddenExposure.length > 0 && (
                <div style={{ color: '#f87171', fontSize: '10px', marginTop: '4px' }}>
                  Hidden exposure: {a.hypothesis.hiddenExposure.join(' | ')}
                </div>
              )}
            </div>
          )}

          {/* Signals */}
          <div style={S.section}>
            <div style={S.sectionTitle}>SIGNALS ({a.signals.length})</div>
            {a.signals.length === 0 ? (
              <span style={{ color: '#475569' }}>No signals detected</span>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {a.signals.map((sig, i) => (
                  <span key={i} style={S.signalPill(sig.strength)}>
                    <strong>[{sig.strength}]</strong> {sig.type}: {sig.detail}
                    {sig.source && <span style={{ color: '#475569', marginLeft: '4px' }}>({sig.source})</span>}
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
                  <span style={{ ...S.infoValue, color: '#f87171' }}>
                    {a.scan.exposureLow.toLocaleString()}\u2013{a.scan.exposureHigh.toLocaleString()} {a.scan.currency}
                  </span>
                </div>
              </div>
              {a.scan.summary && <div style={{ color: '#94a3b8', marginTop: '6px' }}>{a.scan.summary}</div>}
            </div>
          )}

          {/* Message Preview */}
          {bestMsg && (
            <div style={S.section}>
              <div style={S.sectionTitle}>
                MESSAGE PREVIEW
                <span style={{ marginLeft: '8px', color: '#475569', fontWeight: 400 }}>({bestMsg.channel})</span>
              </div>
              <div style={S.msgBox}>
                {bestMsg.subject && (
                  <div style={S.msgSubject}>
                    Subject: {bestMsg.subject}
                    <button
                      style={{ ...S.actionBtn('#3b82f6'), padding: '2px 6px', fontSize: '9px', marginLeft: '8px' }}
                      onClick={() => handleCopy(bestMsg.subject!, 'subject')}
                    >
                      {copiedField === 'subject' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                )}
                <div style={S.msgBody}>{bestMsg.body}</div>
                <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
                  <button
                    style={S.actionBtn('#94a3b8')}
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
                    <div key={i} style={{ color: '#34d399', fontSize: '10px', marginBottom: '2px' }}>+ {s}</div>
                  ))}
                </div>
              )}
              {a.weaknesses.length > 0 && (
                <div>
                  {a.weaknesses.map((w, i) => (
                    <div key={i} style={{ color: '#f87171', fontSize: '10px', marginBottom: '2px' }}>- {w}</div>
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
                  const meta = TIMELINE_META[evt.type] || { label: evt.type, color: '#64748b' };
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
                <div key={i} style={{ marginBottom: '4px', fontSize: '10px' }}>
                  <span style={{ color: '#475569' }}>{formatDate(entry.date)}</span>
                  <span style={{ color: '#94a3b8', marginLeft: '8px' }}>{entry.action}</span>
                  {entry.result && <span style={{ color: '#64748b', marginLeft: '4px' }}>({entry.result})</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons Footer */}
        <div style={S.actionsBar}>
          {/* Email Compose */}
          {hasEmail ? (
            <a
              href={buildMailto()}
              style={S.actionBtn('#3b82f6')}
              onClick={() => onAction(a.id, 'email')}
            >
              @ Email
            </a>
          ) : (
            <span style={{ ...S.actionBtn('#3b82f6'), ...S.actionBtnDisabled }}>@ No email</span>
          )}

          {/* Gmail Draft (placeholder -> mailto) */}
          {hasEmail ? (
            <a
              href={buildMailto()}
              style={S.actionBtn('#a78bfa')}
              target="_blank"
              rel="noopener"
            >
              Gmail Draft
            </a>
          ) : (
            <span style={{ ...S.actionBtn('#a78bfa'), ...S.actionBtnDisabled }}>Gmail Draft</span>
          )}

          {/* Copy Email */}
          {hasEmail && (
            <button
              style={S.actionBtn('#60a5fa')}
              onClick={() => { handleCopy(a.financeLead.email!, 'femail'); onAction(a.id, 'copy_email'); }}
            >
              {copiedField === 'femail' ? 'Copied!' : 'Copy Email'}
            </button>
          )}

          {/* Copy Message */}
          {bestMsg && (
            <button
              style={S.actionBtn('#94a3b8')}
              onClick={() => { handleCopy(bestMsg.body, 'fbody'); onAction(a.id, 'copy_message'); }}
            >
              {copiedField === 'fbody' ? 'Copied!' : 'Copy Msg'}
            </button>
          )}

          {/* Mark Sent */}
          <button
            style={S.actionBtn('#34d399')}
            onClick={() => onAction(a.id, 'mark_sent')}
          >
            Mark Sent
          </button>

          {/* Snooze */}
          <button
            style={S.actionBtn('#64748b')}
            onClick={() => onAction(a.id, 'snooze_3d')}
          >
            Snooze 3d
          </button>
          <button
            style={S.actionBtn('#64748b')}
            onClick={() => onAction(a.id, 'snooze_7d')}
          >
            Snooze 7d
          </button>

          {/* Archive */}
          <button
            style={S.actionBtn('#f87171')}
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
              style={S.actionBtn('#60a5fa')}
              onClick={() => onAction(a.id, 'open_linkedin')}
            >
              LinkedIn
            </a>
          ) : (
            <span style={{ ...S.actionBtn('#60a5fa'), ...S.actionBtnDisabled }}>LinkedIn</span>
          )}
        </div>
      </div>
    </>
  );
}
