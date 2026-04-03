'use client';

/**
 * GHOST TAX — SÉQUENCES
 * Follow-ups programmés + outreach status. Spec V7.
 */

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { loadAccounts } from '@/lib/command/store';
import { calcHeatScore, loadLedger } from '@/lib/command/hot-queue';
import { getAllPendingFollowUps, getFollowUpStats, type ScheduledFollowUp } from '@/lib/command/follow-up-scheduler';
import type { Account, LedgerEntry } from '@/types/command';

const P = {
  bg:      '#060912',
  surface: '#0C1019',
  border:  'rgba(255,255,255,0.06)',
  text1:   '#F1F5F9',
  text2:   '#94A3B8',
  text3:   '#475569',
  text4:   '#2D3A4E',
  cyan:    '#22D3EE',
  green:   '#34D399',
  amber:   '#FBBF24',
  red:     '#F87171',
} as const;
const FM = "var(--vg-font-mono,'JetBrains Mono',monospace)";
const FS = "var(--vg-font-sans,'Inter',system-ui,sans-serif)";
const lbl: React.CSSProperties = { fontFamily: FM, fontSize: 9, fontWeight: 700, letterSpacing: '.14em', color: P.text3, textTransform: 'uppercase' as const };

export default function SequencesPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => { setAccounts(loadAccounts()); setReady(true); }, []);

  const ledger = useMemo(() => ready ? loadLedger() : [], [ready]);

  const followUps = useMemo<ScheduledFollowUp[]>(() => {
    try { return getAllPendingFollowUps(); } catch { return []; }
  }, [ready]);

  const stats = useMemo(() => {
    try { return getFollowUpStats(); } catch { return { pending: 0, sent: 0, cancelled: 0, overdue: 0 }; }
  }, [ready]);

  // Outreach history from ledger
  const sentEntries = useMemo(() =>
    ledger.filter(e => e.status === 'sent').sort((a, b) => (b.sentAt || '').localeCompare(a.sentAt || '')),
  [ledger]);

  const waitingEntries = useMemo(() =>
    ledger.filter(e => e.status === 'waiting_response' && !e.superseded),
  [ledger]);

  const accountMap = useMemo(() => {
    const m = new Map<string, Account>();
    accounts.forEach(a => m.set(a.id, a));
    return m;
  }, [accounts]);

  if (!ready) return <div style={{ background: P.bg, minHeight: '100%' }} />;

  return (
    <div style={{ background: P.bg, fontFamily: FS, color: P.text1, minHeight: '100%', padding: '28px 28px 80px', maxWidth: 800, margin: '0 auto' }}>

      <div style={{ marginBottom: 20 }}>
        <div style={lbl}>S{'\u00e9'}quences</div>
        <h1 style={{ margin: '6px 0 0', fontSize: 18, fontWeight: 800, letterSpacing: '-.02em' }}>
          Follow-up Sequences
        </h1>
      </div>

      {/* Stats */}
      <div style={{
        display: 'flex', gap: 0, marginBottom: 28,
        background: P.surface, border: `1px solid ${P.border}`,
        borderRadius: 10, overflow: 'hidden',
      }}>
        {[
          { n: stats.pending,   label: 'pending',   color: P.amber },
          { n: stats.overdue,   label: 'overdue',   color: P.red   },
          { n: stats.sent,      label: 'sent',      color: P.green },
          { n: waitingEntries.length, label: 'awaiting', color: P.cyan },
        ].map((m, i) => (
          <div key={m.label} style={{
            flex: 1, padding: '14px 0', textAlign: 'center',
            borderRight: i < 3 ? `1px solid ${P.border}` : 'none',
          }}>
            <div style={{ fontFamily: FM, fontSize: 20, fontWeight: 800, color: m.color }}>{m.n}</div>
            <div style={{ fontFamily: FM, fontSize: 9, color: P.text3, letterSpacing: '.1em', marginTop: 2 }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Pending Follow-ups */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ ...lbl, marginBottom: 12, color: P.amber }}>
          Follow-ups programm{'\u00e9'}s — {followUps.length}
        </div>
        {followUps.length === 0 ? (
          <div style={{ fontFamily: FM, fontSize: 11, color: P.text4, padding: '16px 0' }}>
            Aucun follow-up programm{'\u00e9'}. Les s{'\u00e9'}quences se cr{'\u00e9'}ent automatiquement apr{'\u00e8'}s envoi.
          </div>
        ) : (
          followUps.map((fu, i) => {
            const dueDate = new Date(fu.scheduledFor);
            const now = new Date();
            const isOverdue = dueDate < now;
            const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / 86400000);
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 0', borderBottom: `1px solid ${P.border}`,
              }}>
                <span style={{
                  fontFamily: FM, fontSize: 9, fontWeight: 700, letterSpacing: '.06em',
                  color: isOverdue ? P.red : P.amber,
                  background: isOverdue ? `${P.red}12` : `${P.amber}12`,
                  border: `1px solid ${isOverdue ? P.red : P.amber}20`,
                  padding: '2px 6px', borderRadius: 3, flexShrink: 0,
                }}>
                  {fu.step.toUpperCase()}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: P.text1, flex: 1 }}>{fu.domain}</span>
                <span style={{ fontFamily: FM, fontSize: 10, color: isOverdue ? P.red : P.text3 }}>
                  {isOverdue ? `${Math.abs(daysUntil)}j overdue` : `J+${daysUntil}`}
                </span>
                <span style={{ fontFamily: FM, fontSize: 10, color: P.text4 }}>
                  {dueDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Waiting Response */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ ...lbl, marginBottom: 12, color: P.cyan }}>
          En attente de r{'\u00e9'}ponse — {waitingEntries.length}
        </div>
        {waitingEntries.length === 0 ? (
          <div style={{ fontFamily: FM, fontSize: 11, color: P.text4, padding: '16px 0' }}>
            Aucun message en attente de r{'\u00e9'}ponse.
          </div>
        ) : (
          waitingEntries.map(entry => {
            const a = accountMap.get(entry.accountId);
            return (
              <div key={entry.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 0', borderBottom: `1px solid ${P.border}`,
              }}>
                <span style={{
                  fontFamily: FM, fontSize: 9, fontWeight: 700, letterSpacing: '.06em',
                  color: P.cyan, background: `${P.cyan}12`, border: `1px solid ${P.cyan}20`,
                  padding: '2px 6px', borderRadius: 3,
                }}>
                  {entry.channel.toUpperCase()}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: P.text1, flex: 1 }}>
                  {a?.company || entry.contactName}
                </span>
                <span style={{ fontFamily: FM, fontSize: 10, color: P.text3 }}>
                  {entry.contactName}
                </span>
                <span style={{ fontFamily: FM, fontSize: 10, color: P.text4 }}>
                  {entry.sentAt ? new Date(entry.sentAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Recent Sent */}
      <div>
        <div style={{ ...lbl, marginBottom: 12, color: P.green }}>
          R{'\u00e9'}cemment envoy{'\u00e9'}s — {sentEntries.length}
        </div>
        {sentEntries.slice(0, 10).map(entry => {
          const a = accountMap.get(entry.accountId);
          return (
            <div key={entry.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 0', borderBottom: `1px solid ${P.border}`,
            }}>
              <span style={{ fontFamily: FM, fontSize: 9, fontWeight: 700, color: P.green, background: `${P.green}12`, border: `1px solid ${P.green}20`, padding: '2px 6px', borderRadius: 3, letterSpacing: '.06em' }}>
                SENT
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: P.text1, flex: 1 }}>{a?.company || entry.contactName}</span>
              <span style={{ fontFamily: FM, fontSize: 10, color: P.text3 }}>{entry.channel}</span>
              <span style={{ fontFamily: FM, fontSize: 10, color: P.text4 }}>
                {entry.sentAt ? new Date(entry.sentAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'}
              </span>
            </div>
          );
        })}
      </div>

    </div>
  );
}
