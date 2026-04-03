'use client';

/**
 * GHOST TAX — MISSION CONTROL V7
 * Spec Fellow. Base vierge.
 * Action banner → Approval overlay → Pipeline → LinkedIn → Feed
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { loadAccounts, getAttackNow, getOutreachReady, calcProbability, calcExpectedValue } from '@/lib/command/store';
import { calcHeatScore, buildQueue, loadLedger, getResponseStats } from '@/lib/command/hot-queue';
import { selectAngle } from '@/lib/command/angles';
import { selectChannel } from '@/lib/command/channels';
import { processMessages } from '@/lib/command/messages';
import { assessReadiness } from '@/lib/command/readiness';
import { selectNextPost, formatForLinkedIn } from '@/lib/command/linkedin-content';
import { getTodayPlan, isInSendingWindow } from '@/lib/command/sending-windows';
import { getAllPendingFollowUps } from '@/lib/command/follow-up-scheduler';
import { evaluateQualityGate } from '@/lib/command/quality-gate';
import type { Account, OutreachChannel, MessageVariant } from '@/types/command';

// ── Tokens ───────────────────────────────────────────────
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
const lbl: React.CSSProperties = {
  fontFamily: FM, fontSize: 9, fontWeight: 700,
  letterSpacing: '.14em', color: P.text3,
  textTransform: 'uppercase' as const,
};

// ── Activity feed helpers ─────────────────────────────────
const FEED_KEY = 'gt-activity-feed';
interface FeedEntry { ts: string; icon: string; text: string; }

function loadFeed(): FeedEntry[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(FEED_KEY) || '[]'); } catch { return []; }
}
function pushFeed(icon: string, text: string) {
  const feed = loadFeed();
  feed.unshift({ ts: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), icon, text });
  if (feed.length > 50) feed.length = 50;
  try { localStorage.setItem(FEED_KEY, JSON.stringify(feed)); } catch {}
}

// ── Status dot ────────────────────────────────────────────
function StatusDot({ status }: { status: string }) {
  const color =
    status === 'outreach_ready' || status === 'qualified' ? P.green :
    status === 'contacted' ? '#3B82F6' :
    status === 'replied' ? P.amber :
    status === 'new' ? P.text3 :
    P.text4;
  return <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />;
}

// ── Country flag ──────────────────────────────────────────
function Flag({ country }: { country: string }) {
  const flags: Record<string, string> = { DE: '\u{1F1E9}\u{1F1EA}', NL: '\u{1F1F3}\u{1F1F1}', UK: '\u{1F1EC}\u{1F1E7}', US: '\u{1F1FA}\u{1F1F8}', FR: '\u{1F1EB}\u{1F1F7}', CH: '\u{1F1E8}\u{1F1ED}', AT: '\u{1F1E6}\u{1F1F9}', BE: '\u{1F1E7}\u{1F1EA}' };
  return <span style={{ fontSize: 12 }}>{flags[country] || country}</span>;
}

// ══════════════════════════════════════════════════════════
// ── MAIN PAGE ─────────────────────────────────────────────
// ══════════════════════════════════════════════════════════

export default function MissionControlV7() {
  const [accounts,  setAccounts]  = useState<Account[]>([]);
  const [ready,     setReady]     = useState(false);
  const [approvalMode, setApprovalMode] = useState(false);
  const [approvalIdx,  setApprovalIdx]  = useState(0);
  const [approvedIds,  setApprovedIds]  = useState<Set<string>>(new Set());
  const [skippedIds,   setSkippedIds]   = useState<Set<string>>(new Set());
  const [sessionStart, setSessionStart] = useState(0);
  const [elapsed,      setElapsed]      = useState(0);
  const [copied,       setCopied]       = useState(false);
  const [feed, setFeed] = useState<FeedEntry[]>([]);

  useEffect(() => {
    setAccounts(loadAccounts());
    setFeed(loadFeed());
    setReady(true);
  }, []);

  // Timer for approval mode
  useEffect(() => {
    if (!approvalMode) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - sessionStart) / 1000)), 1000);
    return () => clearInterval(id);
  }, [approvalMode, sessionStart]);

  const ledger = useMemo(() => ready ? loadLedger() : [], [ready]);

  // Pipeline data
  const pipeline = useMemo(() => {
    if (!ready) return [];
    return accounts
      .filter(a => a.status !== 'dropped')
      .map(a => {
        const heat = calcHeatScore(a);
        const angle = selectAngle(a);
        const channel = selectChannel(a);
        return { account: a, heat: heat.total, angle, channel, ev: calcExpectedValue(a), prob: calcProbability(a) };
      })
      .sort((a, b) => b.heat - a.heat);
  }, [accounts, ready]);

  // Accounts with messages to approve
  const toApprove = useMemo(() => {
    if (!ready) return [];
    return accounts
      .filter(a => a.status !== 'dropped' && a.outreach.some(o => o.status === 'draft'))
      .map(a => {
        const heat   = calcHeatScore(a);
        const angle  = selectAngle(a);
        const channel = selectChannel(a);
        const draft  = a.outreach.find(o => o.status === 'draft');
        return { account: a, heat: heat.total, angle, channel, draft, ev: calcExpectedValue(a) };
      })
      .sort((a, b) => b.heat - a.heat);
  }, [accounts, ready]);

  // Metrics
  const metrics = useMemo(() => {
    if (!ready) return { auto: 0, queue: 0, follow: 0, rev: 0 };
    const auto = accounts.filter(a => a.outreach.some(o => o.status === 'draft')).length;
    const queue = pipeline.filter(p => p.heat >= 60).length;
    let follow = 0;
    try { follow = getAllPendingFollowUps().length; } catch {}
    const rev = accounts.filter(a => a.status === 'contacted' || (a as any).status === 'replied').reduce((s, a) => s + (a.revenueEstimate || 0), 0);
    return { auto, queue, follow, rev };
  }, [accounts, pipeline, ready]);

  // LinkedIn post
  const linkedInPost = useMemo(() => {
    try { return selectNextPost(undefined, 'en'); } catch { return null; }
  }, []);

  // Today plan
  const plan = useMemo(() => {
    try { return getTodayPlan(); } catch { return null; }
  }, []);

  const isWeekend = useMemo(() => {
    const d = new Date().getDay();
    return d === 0 || d === 6;
  }, []);

  // ── Approval handlers ──────────────────────────────────
  function startApproval() {
    setApprovalIdx(0);
    setApprovedIds(new Set());
    setSkippedIds(new Set());
    setSessionStart(Date.now());
    setElapsed(0);
    setApprovalMode(true);
  }

  const currentApproval = toApprove[approvalIdx];

  async function handleApprove() {
    if (!currentApproval) return;
    const id = currentApproval.account.id;
    setApprovedIds(prev => new Set(prev).add(id));
    pushFeed('approved', `Email approuv\u00e9 \u2192 ${currentApproval.account.financeLead.name} (${currentApproval.account.company})`);

    // Fire send
    try {
      await fetch('/api/command/send-approved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: id }),
      });
    } catch {}

    if (approvalIdx + 1 < toApprove.length) {
      setApprovalIdx(i => i + 1);
    } else {
      setApprovalMode(false);
      setFeed(loadFeed());
    }
  }

  function handleSkip() {
    if (!currentApproval) return;
    setSkippedIds(prev => new Set(prev).add(currentApproval.account.id));
    if (approvalIdx + 1 < toApprove.length) {
      setApprovalIdx(i => i + 1);
    } else {
      setApprovalMode(false);
      setFeed(loadFeed());
    }
  }

  function handleCopyLinkedIn() {
    if (!linkedInPost) return;
    navigator.clipboard.writeText(formatForLinkedIn(linkedInPost));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!ready) return <div style={{ background: P.bg, minHeight: '100%' }} />;

  // ══════════════════════════════════════════════════════
  // ── APPROVAL OVERLAY ────────────────────────────────
  // ══════════════════════════════════════════════════════
  if (approvalMode && currentApproval) {
    const { account: a, heat, angle, channel, draft, ev } = currentApproval;
    const exposure = a.revenueEstimate || 0;
    const daily = Math.round(exposure / 365);
    const progress = ((approvalIdx + 1) / toApprove.length) * 100;
    const min = Math.floor(elapsed / 60);
    const sec = elapsed % 60;

    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: P.bg, color: P.text1, fontFamily: FS,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Top bar */}
        <div style={{
          height: 48, padding: '0 24px',
          display: 'flex', alignItems: 'center', gap: 16,
          background: P.surface, borderBottom: `1px solid ${P.border}`,
        }}>
          <button onClick={() => setApprovalMode(false)} style={{
            fontFamily: FM, fontSize: 10, color: P.text3, background: 'none',
            border: 'none', cursor: 'pointer', letterSpacing: '.06em',
          }}>
            RETOUR
          </button>
          <span style={{ fontFamily: FM, fontSize: 11, color: P.text1, fontWeight: 700 }}>
            {approvalIdx + 1}/{toApprove.length}
          </span>
          <span style={{ fontFamily: FM, fontSize: 10, color: P.text3 }}>
            {min}:{sec.toString().padStart(2, '0')}
          </span>
          {/* Progress bar */}
          <div style={{ flex: 1, height: 2, background: P.text4, borderRadius: 1 }}>
            <div style={{ width: `${progress}%`, height: '100%', background: P.cyan, borderRadius: 1, transition: 'width .3s' }} />
          </div>
        </div>

        {/* Card */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <div style={{ width: '100%', maxWidth: 560 }}>

            {/* Contact */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{a.financeLead.name}</div>
              <div style={{ fontFamily: FM, fontSize: 11, color: P.text2 }}>
                {a.financeLead.title || 'CFO'} · {a.company}
              </div>
              <div style={{ fontFamily: FM, fontSize: 11, color: P.text3, marginTop: 2 }}>
                <Flag country={a.country} /> {a.country} · {(a as any).headcount || '?'} emp · {(a as any).industry}
              </div>
            </div>

            {/* Exposure box */}
            <div style={{
              background: P.surface, border: `1px solid ${P.border}`,
              borderRadius: 10, padding: '16px 20px', marginBottom: 20,
            }}>
              <div style={{ fontFamily: FM, fontSize: 28, fontWeight: 800, color: P.cyan, letterSpacing: '-.02em' }}>
                {exposure.toLocaleString()} EUR/an
              </div>
              <div style={{ fontFamily: FM, fontSize: 14, fontWeight: 700, color: P.red, marginTop: 4 }}>
                ~{daily} EUR/jour
              </div>
            </div>

            {/* Message */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontFamily: FM, fontSize: 10, color: P.cyan, fontWeight: 700, letterSpacing: '.1em' }}>
                  {channel.primary === 'email' ? 'EMAIL' : 'LINKEDIN'} · Score {heat}
                </span>
              </div>
              {draft && (
                <div style={{
                  background: P.surface, border: `1px solid ${P.border}`,
                  borderRadius: 8, padding: 16, maxHeight: 240, overflowY: 'auto',
                }}>
                  {draft.subject && (
                    <div style={{ fontFamily: FM, fontSize: 12, color: P.text1, marginBottom: 8, fontWeight: 600 }}>
                      {draft.subject}
                    </div>
                  )}
                  <pre style={{
                    fontFamily: FM, fontSize: 12, color: P.text2, lineHeight: 1.7,
                    whiteSpace: 'pre-wrap', margin: 0,
                  }}>
                    {draft.body}
                  </pre>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={handleSkip} style={{
                flex: 1, padding: '14px 0', borderRadius: 8,
                fontFamily: FM, fontSize: 12, fontWeight: 700, letterSpacing: '.1em',
                background: 'transparent', color: P.text3,
                border: `1px solid ${P.border}`, cursor: 'pointer',
              }}>
                PASSER
              </button>
              <button onClick={handleApprove} style={{
                flex: 2, padding: '14px 0', borderRadius: 8,
                fontFamily: FM, fontSize: 12, fontWeight: 700, letterSpacing: '.1em',
                background: P.cyan, color: P.bg,
                border: 'none', cursor: 'pointer',
              }}>
                APPROUVER
              </button>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════
  // ── MAIN VIEW ──────────────────────────────────────
  // ══════════════════════════════════════════════════════
  return (
    <div style={{
      background: P.bg, fontFamily: FS, color: P.text1,
      minHeight: '100%', padding: '28px 28px 80px',
      maxWidth: 800, margin: '0 auto',
    }}>

      {/* ── ZONE 2 — ACTION BANNER ── */}
      {toApprove.length > 0 ? (
        <div style={{
          background: P.surface, border: `1px solid ${P.border}`,
          borderRadius: 12, padding: '24px 28px', marginBottom: 28,
          textAlign: 'center',
        }}>
          <div style={{ fontFamily: FM, fontSize: 13, color: P.text1, marginBottom: 14 }}>
            {toApprove.length} message{toApprove.length > 1 ? 's' : ''} {'\u00e0'} valider · ~{Math.ceil(toApprove.length * 15)}s
          </div>
          <button onClick={startApproval} style={{
            width: '100%', maxWidth: 400, padding: '16px 0',
            borderRadius: 8, border: 'none', cursor: 'pointer',
            fontFamily: FM, fontSize: 13, fontWeight: 800,
            letterSpacing: '.16em', color: P.bg,
            background: P.cyan,
          }}>
            COMMENCER
          </button>
        </div>
      ) : isWeekend ? (
        <div style={{
          background: P.surface, border: `1px solid ${P.border}`,
          borderRadius: 12, padding: '20px 28px', marginBottom: 28,
          textAlign: 'center',
        }}>
          <div style={{ fontFamily: FM, fontSize: 12, color: P.text3 }}>
            Week-end. Le syst{'\u00e8'}me pr{'\u00e9'}pare lundi.
          </div>
        </div>
      ) : (
        <div style={{
          background: P.surface, border: `1px solid ${P.border}`,
          borderRadius: 12, padding: '20px 28px', marginBottom: 28,
          textAlign: 'center',
        }}>
          <div style={{ fontFamily: FM, fontSize: 12, color: P.green }}>
            Rien {'\u00e0'} faire. Prochain briefing demain 8:25.
          </div>
        </div>
      )}

      {/* ── ZONE 3 — METRICS ── */}
      <div style={{
        display: 'flex', gap: 0, marginBottom: 28,
        background: P.surface, border: `1px solid ${P.border}`,
        borderRadius: 10, overflow: 'hidden',
      }}>
        {[
          { n: metrics.auto,   label: 'auto',   color: P.cyan  },
          { n: metrics.queue,  label: 'queue',  color: P.red   },
          { n: metrics.follow, label: 'follow', color: P.amber },
          { n: `${Math.round(metrics.rev / 1000)}k`, label: 'rev', color: P.green },
        ].map((m, i) => (
          <div key={m.label} style={{
            flex: 1, padding: '14px 0', textAlign: 'center',
            borderRight: i < 3 ? `1px solid ${P.border}` : 'none',
          }}>
            <div style={{ fontFamily: FM, fontSize: 20, fontWeight: 800, color: m.color }}>
              {m.n}
            </div>
            <div style={{ fontFamily: FM, fontSize: 9, color: P.text3, letterSpacing: '.1em', marginTop: 2 }}>
              {m.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── ZONE 4 — PIPELINE ── */}
      <div style={{ marginBottom: 28 }}>
        {pipeline.slice(0, 12).map(({ account: a, heat, channel, ev }) => {
          const hCol = heat >= 75 ? P.red : heat >= 60 ? P.amber : heat >= 40 ? '#3B82F6' : P.text3;
          const chIcon = channel.primary === 'email' ? '\u{1F4E7}' : '\u{1F4AC}';
          const stLabel = a.outreach.some(o => o.status === 'draft')
            ? 'pr\u00eat'
            : a.status === 'contacted'
              ? 'envoy\u00e9'
              : (a as any).status === 'replied'
                ? 'r\u00e9pondu'
                : a.status === 'dropped'
                  ? 'drop'
                  : '\u2014';

          return (
            <Link key={a.id} href={`/command/accounts/${a.id}`} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 0', textDecoration: 'none',
              borderBottom: `1px solid ${P.border}`,
            }}>
              <StatusDot status={a.status} />
              <span style={{ fontSize: 13, fontWeight: 600, color: P.text1, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                {a.company}
              </span>
              <span style={{ fontFamily: FM, fontSize: 10, color: P.text2 }}>
                {a.financeLead.title?.split(' ')[0] || 'CFO'} {a.financeLead.name.split(' ')[0]}.{a.financeLead.name.split(' ').pop()?.charAt(0)}
              </span>
              <Flag country={a.country} />
              <span style={{ fontFamily: FM, fontSize: 12, fontWeight: 800, color: hCol, width: 28, textAlign: 'right' as const }}>
                {heat}
              </span>
              <span style={{ fontSize: 11 }}>{chIcon}</span>
              <span style={{ fontFamily: FM, fontSize: 10, color: P.text3, width: 52 }}>{stLabel}</span>
            </Link>
          );
        })}
      </div>

      {/* ── ZONE 5 — LINKEDIN POST ── */}
      {linkedInPost && (
        <div style={{
          background: P.surface, border: `1px solid ${P.border}`,
          borderRadius: 10, padding: '16px 20px', marginBottom: 28,
        }}>
          <div style={{ ...lbl, marginBottom: 8 }}>Post LinkedIn</div>
          <div style={{
            fontFamily: FM, fontSize: 12, color: P.text2, lineHeight: 1.7,
            maxHeight: 80, overflow: 'hidden',
          }}>
            {(linkedInPost as any).hook || (linkedInPost as any).body || ''}
          </div>
          <button onClick={handleCopyLinkedIn} style={{
            fontFamily: FM, fontSize: 10, fontWeight: 700, letterSpacing: '.1em',
            padding: '6px 16px', borderRadius: 5, marginTop: 10,
            cursor: 'pointer', border: `1px solid ${P.cyan}20`,
            background: `${P.cyan}10`, color: copied ? P.green : P.cyan,
          }}>
            {copied ? 'COPI\u00c9' : 'COPIER'}
          </button>
        </div>
      )}

      {/* ── ZONE 6 — ACTIVITY FEED ── */}
      {feed.length > 0 && (
        <div>
          <div style={{ ...lbl, marginBottom: 10 }}>Activit{'\u00e9'}</div>
          {feed.slice(0, 8).map((entry, i) => (
            <div key={i} style={{
              fontFamily: FM, fontSize: 11, color: P.text3,
              padding: '5px 0', borderBottom: i < 7 ? `1px solid ${P.border}` : 'none',
              display: 'flex', gap: 8,
            }}>
              <span style={{ color: P.text4, width: 38, flexShrink: 0 }}>{entry.ts}</span>
              <span>{entry.icon}</span>
              <span style={{ color: P.text2 }}>{entry.text}</span>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
