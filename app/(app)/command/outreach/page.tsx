'use client';

/**
 * GHOST TAX — OUTREACH CONSOLE
 * Base vierge. Toute la logique métier conservée.
 */

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type {
  Account, MessageVariant, OutreachChannel, LedgerEntry, ContactLock,
  ReadinessStatus, QueueTier, MessageType,
} from '@/types/command';
import { READINESS_META, QUEUE_TIER_META } from '@/types/command';
import { loadAccounts, saveAccounts, calcProbability, calcExpectedValue } from '@/lib/command/store';
import { selectAngle, type SelectedAngle } from '@/lib/command/angles';
import { selectChannel } from '@/lib/command/channels';
import { processMessages } from '@/lib/command/messages';
import { assessReadiness } from '@/lib/command/readiness';
import {
  calcHeatScore, buildQueue, loadLedger, saveLedger, loadLocks, saveLocks,
  createLedgerEntry, checkSendSafety, markLedgerSent, markLedgerWaiting,
  markLedgerNoResponse, checkDuplicateRisk, type QueueState,
} from '@/lib/command/hot-queue';

// ── Tokens ───────────────────────────────────────────────
const P = {
  bg:      '#060912',
  surface: '#0a0d19',
  panel:   '#0e1221',
  border:  'rgba(36,48,78,0.28)',
  text1:   '#e4e9f4',
  text2:   '#8d9bb5',
  text3:   '#55637d',
  text4:   '#3a4560',
  green:   '#34d399',
  amber:   '#f59e0b',
  red:     '#ef4444',
  blue:    '#3b82f6',
  blueHi:  '#60a5fa',
  cyan:    '#22d3ee',
  violet:  '#a78bfa',
} as const;
const FM = 'var(--font-mono)';
const FS = 'var(--font-sans)';

const box  = (): React.CSSProperties => ({ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10, padding: '18px 22px' });
const lbl  = (c?: string): React.CSSProperties => ({ fontFamily: FM, fontSize: 9, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase' as const, color: c ?? P.text3 });
const pill = (color: string): React.CSSProperties => ({ fontFamily: FM, fontSize: 9, fontWeight: 700, letterSpacing: '.08em', padding: '2px 7px', borderRadius: 4, color, background: `${color}12`, border: `1px solid ${color}22`, display: 'inline-block' });
const btn  = (color: string): React.CSSProperties => ({ fontFamily: FM, fontSize: 10, fontWeight: 700, letterSpacing: '.1em', padding: '6px 14px', borderRadius: 5, cursor: 'pointer', background: `${color}10`, color, border: `1px solid ${color}22` });

const CH_CLR: Record<string, string> = { linkedin: P.blueHi, email: P.green, hold: P.violet };
const GRADE_CLR: Record<string, string> = { strong: P.green, acceptable: P.blueHi, weak: P.amber, rewrite: P.red };
const MSG_LABELS: Record<MessageType, string> = {
  linkedin_note: 'LI NOTE', linkedin_message: 'LI MSG', linkedin_followup: 'LI F/UP',
  email_main: 'EMAIL', email_followup: 'EMAIL F/UP', ultra_short: 'ULTRA-SHORT',
};

type TabId = 'hot' | 'review' | 'all';

interface ComputedAccount {
  account: Account;
  angle: SelectedAngle;
  channel: ReturnType<typeof selectChannel>;
  readiness: ReturnType<typeof assessReadiness>;
  heat: ReturnType<typeof calcHeatScore>;
  probability: number;
  expectedValue: number;
  messages: MessageVariant[];
  queueTier: QueueTier;
  duplicateRisk: boolean;
}

// ── Console ───────────────────────────────────────────────
function OutreachConsole() {
  const searchParams  = useSearchParams();
  const focusAccount  = searchParams.get('account');

  const [accounts,  setAccounts]  = useState<Account[]>([]);
  const [ledger,    setLedger]    = useState<LedgerEntry[]>([]);
  const [locks,     setLocks]     = useState<ContactLock[]>([]);
  const [ready,     setReady]     = useState(false);
  const [tab,       setTab]       = useState<TabId>('hot');
  const [expandedId,  setExpandedId]  = useState<string | null>(focusAccount);
  const [expandedMsg, setExpandedMsg] = useState<string | null>(null);
  const [generated, setGenerated] = useState<Record<string, MessageVariant[]>>({});
  const [copiedId,  setCopiedId]  = useState<string | null>(null);

  useEffect(() => {
    setAccounts(loadAccounts());
    setLedger(loadLedger());
    setLocks(loadLocks());
    setReady(true);
  }, []);

  const persistLedger = useCallback((l: LedgerEntry[]) => { setLedger(l); saveLedger(l); }, []);

  const computed = useMemo(() => {
    const map = new Map<string, ComputedAccount>();
    for (const a of accounts) {
      if (a.status === 'dropped') continue;
      const angle      = selectAngle(a);
      const channel    = selectChannel(a);
      const msgs       = generated[a.id] || [];
      const acctLedger = ledger.filter(e => e.accountId === a.id);
      const readiness  = assessReadiness(a, angle, channel, msgs, acctLedger);
      const heat       = calcHeatScore(a);
      const dup        = checkDuplicateRisk(a.id, accounts, ledger);
      map.set(a.id, {
        account: a, angle, channel, readiness, heat,
        probability: calcProbability(a), expectedValue: calcExpectedValue(a),
        messages: msgs,
        queueTier: heat.total >= 60 ? 'hot' : heat.total >= 35 ? 'warm' : 'cold',
        duplicateRisk: dup.isDuplicate,
      });
    }
    return map;
  }, [accounts, ledger, generated]);

  const queue          = useMemo(() => buildQueue(accounts.filter(a => a.status !== 'dropped'), ledger), [accounts, ledger]);
  const hotAccounts    = useMemo(() => queue.hot.map(e => computed.get(e.accountId)).filter(Boolean) as ComputedAccount[], [queue, computed]);
  const reviewAccounts = useMemo(() => [...computed.values()].filter(c => c.messages.length > 0 && (c.readiness.status === 'draft_needs_review' || c.readiness.status === 'ready_to_send')).sort((a, b) => b.heat.total - a.heat.total), [computed]);
  const allAccounts    = useMemo(() => [...computed.values()].sort((a, b) => b.heat.total - a.heat.total), [computed]);

  const handleGenerate = useCallback((accountId: string) => {
    const c = computed.get(accountId);
    if (!c) return;
    const ch   = c.channel.primary === 'hold' ? 'email' : c.channel.primary;
    const msgs = processMessages(c.account, c.angle, ch as OutreachChannel);
    setGenerated(prev => ({ ...prev, [accountId]: msgs }));
    persistLedger([...ledger, ...msgs.map(m => createLedgerEntry(accountId, c.account.financeLead.name, m.channel, m.type, m.body))]);
  }, [computed, ledger, persistLedger]);

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleMarkSent = useCallback((accountId: string, channel: OutreachChannel, msgType: MessageType, body: string) => {
    const c = computed.get(accountId);
    if (!c) return;
    const safety = checkSendSafety(accountId, c.account.financeLead.name, channel, body, ledger, locks);
    if (!safety.safe) { alert(`BLOCKED: ${safety.reason}`); return; }
    let entryId = ledger.find(e => e.accountId === accountId && e.channel === channel && e.messageType === msgType && !e.superseded)?.id;
    if (!entryId) {
      const entry = createLedgerEntry(accountId, c.account.financeLead.name, channel, msgType, body);
      entryId = entry.id;
      persistLedger([...ledger, entry]);
    }
    persistLedger(markLedgerSent(ledger, entryId));
    setGenerated(prev => ({ ...prev, [accountId]: (prev[accountId] || []).map(m => m.type === msgType ? { ...m, status: 'sent' as const } : m) }));
  }, [computed, ledger, locks, persistLedger]);

  const handleMarkWaiting    = useCallback((id: string) => { const e = ledger.filter(x => x.accountId === id && x.status === 'sent' && !x.superseded); if (e.length) persistLedger(markLedgerWaiting(ledger, e[0].id)); }, [ledger, persistLedger]);
  const handleMarkNoResponse = useCallback((id: string) => { const e = ledger.filter(x => x.accountId === id && x.status === 'waiting_response' && !x.superseded); if (e.length) persistLedger(markLedgerNoResponse(ledger, e[0].id)); }, [ledger, persistLedger]);
  const handleHold           = useCallback((id: string) => { persistLedger(ledger.map(e => e.accountId === id && !e.superseded && e.status !== 'sent' ? { ...e, superseded: true } : e)); }, [ledger, persistLedger]);

  if (!ready) return <div style={{ background: P.bg, minHeight: '100%' }} />;

  return (
    <div style={{ background: P.bg, fontFamily: FS, color: P.text1, minHeight: '100%', padding: '28px 28px 80px' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <span style={lbl(P.cyan)}>Ghost Tax · Outreach</span>
        <h1 style={{ margin: '6px 0 4px', fontSize: 20, fontWeight: 800, letterSpacing: '-.02em' }}>Outreach Console</h1>
        <div style={{ display: 'flex', gap: 20, ...lbl() }}>
          <span><span style={{ color: P.red, fontSize: 12, fontWeight: 800 }}>{queue.stats.hotCount}</span> hot</span>
          <span><span style={{ color: P.amber, fontSize: 12, fontWeight: 800 }}>{queue.stats.warmCount}</span> warm</span>
          <span>{queue.stats.slotsAvailable} slots · {queue.stats.inCooldown} cooling · {queue.stats.waitingResponse} awaiting</span>
        </div>
      </div>

      {/* Doctrine */}
      <div style={{ fontFamily: FM, fontSize: 10, color: P.blueHi, lineHeight: 1.7, background: `${P.blue}06`, borderRadius: 8, padding: '10px 14px', border: `1px solid ${P.blue}12`, marginBottom: 22 }}>
        Research → Channel → Angle → Draft → Critique → Rewrite → Review → Send. Quality over volume.
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${P.border}`, marginBottom: 22 }}>
        {([
          { id: 'hot'    as TabId, label: 'HOT QUEUE',    n: hotAccounts.length,    color: P.red    },
          { id: 'review' as TabId, label: 'REVIEW QUEUE', n: reviewAccounts.length, color: P.blueHi },
          { id: 'all'    as TabId, label: 'ALL ACCOUNTS', n: allAccounts.length,    color: P.text3  },
        ] as const).map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              fontFamily: FM, fontSize: 10, fontWeight: 700, letterSpacing: '.12em',
              padding: '9px 16px', background: 'transparent', cursor: 'pointer',
              color: active ? P.text1 : P.text3, textTransform: 'uppercase' as const,
              borderTop: 'none', borderLeft: 'none', borderRight: 'none',
              borderBottom: active ? `2px solid ${t.color}` : '2px solid transparent',
              marginBottom: -1,
            }}>
              {t.label} <span style={{ color: t.color, marginLeft: 4 }}>{t.n}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {tab === 'hot'    && <HotTab    accounts={hotAccounts}    queue={queue} expandedId={expandedId} expandedMsg={expandedMsg} copiedId={copiedId} onToggle={id => setExpandedId(expandedId === id ? null : id)} onToggleMsg={setExpandedMsg} onGenerate={handleGenerate} onCopy={handleCopy} onMarkSent={handleMarkSent} onMarkWaiting={handleMarkWaiting} onMarkNoResponse={handleMarkNoResponse} onHold={handleHold} />}
      {tab === 'review' && <ReviewTab accounts={reviewAccounts} expandedId={expandedId} expandedMsg={expandedMsg} copiedId={copiedId} onToggle={id => setExpandedId(expandedId === id ? null : id)} onToggleMsg={setExpandedMsg} onCopy={handleCopy} onMarkSent={handleMarkSent} />}
      {tab === 'all'    && <AllTab    accounts={allAccounts}    expandedId={expandedId} onToggle={id => setExpandedId(expandedId === id ? null : id)} onGenerate={handleGenerate} />}

    </div>
  );
}

// ── Hot Tab ───────────────────────────────────────────────
function HotTab({ accounts, queue, expandedId, expandedMsg, copiedId, onToggle, onToggleMsg, onGenerate, onCopy, onMarkSent, onMarkWaiting, onMarkNoResponse, onHold }: { accounts: ComputedAccount[]; queue: QueueState; expandedId: string | null; expandedMsg: string | null; copiedId: string | null; onToggle: (id: string) => void; onToggleMsg: (k: string | null) => void; onGenerate: (id: string) => void; onCopy: (t: string, id: string) => void; onMarkSent: (id: string, ch: OutreachChannel, t: MessageType, b: string) => void; onMarkWaiting: (id: string) => void; onMarkNoResponse: (id: string) => void; onHold: (id: string) => void; }) {
  if (!accounts.length) return (<div style={{ ...box(), textAlign: 'center', padding: '40px 24px' }}><div style={lbl()}>No hot accounts — heat ≥ 60 or in cooldown</div></div>);
  return <div>{accounts.map((c, i) => <AccountRow key={c.account.id} c={c} rank={i + 1} expanded={expandedId === c.account.id} expandedMsg={expandedMsg} copiedId={copiedId} onToggle={() => onToggle(c.account.id)} onToggleMsg={onToggleMsg} onGenerate={() => onGenerate(c.account.id)} onCopy={onCopy} onMarkSent={onMarkSent} onMarkWaiting={() => onMarkWaiting(c.account.id)} onMarkNoResponse={() => onMarkNoResponse(c.account.id)} onHold={() => onHold(c.account.id)} />)}</div>;
}

// ── Review Tab ────────────────────────────────────────────
function ReviewTab({ accounts, expandedId, expandedMsg, copiedId, onToggle, onToggleMsg, onCopy, onMarkSent }: { accounts: ComputedAccount[]; expandedId: string | null; expandedMsg: string | null; copiedId: string | null; onToggle: (id: string) => void; onToggleMsg: (k: string | null) => void; onCopy: (t: string, id: string) => void; onMarkSent: (id: string, ch: OutreachChannel, t: MessageType, b: string) => void; }) {
  if (!accounts.length) return (<div style={{ ...box(), textAlign: 'center', padding: '40px 24px' }}><div style={lbl()}>No messages pending review</div></div>);
  return <div><div style={{ ...lbl(P.blueHi), marginBottom: 12 }}>Ready for review — {accounts.length}</div>{accounts.map(c => <AccountRow key={c.account.id} c={c} expanded={expandedId === c.account.id} expandedMsg={expandedMsg} copiedId={copiedId} onToggle={() => onToggle(c.account.id)} onToggleMsg={onToggleMsg} onCopy={onCopy} onMarkSent={onMarkSent} showMessages />)}</div>;
}

// ── All Tab ───────────────────────────────────────────────
function AllTab({ accounts, expandedId, onToggle, onGenerate }: { accounts: ComputedAccount[]; expandedId: string | null; onToggle: (id: string) => void; onGenerate: (id: string) => void; }) {
  return (
    <div>
      {(['hot', 'warm', 'cold', 'hold'] as QueueTier[]).map(tier => {
        const list = accounts.filter(c => c.queueTier === tier);
        if (!list.length) return null;
        const meta = QUEUE_TIER_META[tier];
        return (
          <div key={tier} style={{ marginBottom: 24 }}>
            <div style={{ ...lbl(meta.color), marginBottom: 10 }}>{meta.label} — {list.length}</div>
            {list.map(c => (
              <div key={c.account.id} style={{ ...box(), marginBottom: 6, padding: '10px 14px' }}>
                <div onClick={() => onToggle(c.account.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <HeatBadge score={c.heat.total} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: P.text1, flex: 1 }}>{c.account.company}</span>
                  <span style={{ fontFamily: FM, fontSize: 10, color: P.text3 }}>{c.account.country}</span>
                  <span style={pill(CH_CLR[c.channel.primary] || P.text3)}>{c.channel.primary.toUpperCase()}</span>
                  <ReadinessBadge status={c.readiness.status} />
                  <span style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: P.green }}>€{c.expectedValue.toLocaleString()}</span>
                </div>
                {expandedId === c.account.id && (
                  <div style={{ marginTop: 12 }}>
                    <IntelGrid c={c} />
                    {!c.messages.length && c.readiness.status !== 'do_not_send' && (<button onClick={() => onGenerate(c.account.id)} style={btn(P.blue)}>GENERATE MESSAGES</button>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ── Account Row ───────────────────────────────────────────
function AccountRow({ c, rank, expanded, expandedMsg, copiedId, onToggle, onToggleMsg, onGenerate, onCopy, onMarkSent, onMarkWaiting, onMarkNoResponse, onHold, showMessages }: {
  c: ComputedAccount; rank?: number; expanded: boolean; expandedMsg?: string | null; copiedId?: string | null;
  onToggle: () => void; onToggleMsg?: (k: string | null) => void; onGenerate?: () => void;
  onCopy?: (t: string, id: string) => void; onMarkSent?: (id: string, ch: OutreachChannel, t: MessageType, b: string) => void;
  onMarkWaiting?: () => void; onMarkNoResponse?: () => void; onHold?: () => void; showMessages?: boolean;
}) {
  return (
    <div style={{ ...box(), marginBottom: 8 }}>
      <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        {rank !== undefined && <span style={{ fontFamily: FM, fontSize: 11, color: P.text4, width: 22, textAlign: 'right' as const }}>#{rank}</span>}
        <HeatBadge score={c.heat.total} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: P.text1 }}>{c.account.company}</span>
          <span style={{ fontFamily: FM, fontSize: 10, color: P.text3, marginLeft: 8 }}>{c.account.financeLead.name}</span>
        </div>
        <span style={{ fontFamily: FM, fontSize: 10, color: P.text3 }}>{c.account.country}</span>
        <span style={pill(CH_CLR[c.channel.primary] || P.text3)}>{c.channel.primary.toUpperCase()}</span>
        <ReadinessBadge status={c.readiness.status} />
        <span style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: P.text2 }}>P:{c.probability}%</span>
        <span style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: P.green }}>€{c.expectedValue.toLocaleString()}</span>
        {c.duplicateRisk && <span style={pill(P.red)}>DUP</span>}
        <span style={{ fontFamily: FM, fontSize: 10, color: P.text4 }}>{expanded ? '▾' : '▸'}</span>
      </div>

      {expanded && (
        <div style={{ marginTop: 14 }}>
          <IntelGrid c={c} />
          <div style={{ padding: '10px 14px', borderRadius: 6, background: `${P.blue}04`, border: `1px solid ${P.blue}10`, marginBottom: 10 }}>
            <div style={{ ...lbl(P.blueHi), marginBottom: 4 }}>Channel</div>
            <div style={{ fontFamily: FM, fontSize: 11, color: P.text2, lineHeight: 1.6 }}>
              <b style={{ color: P.text1 }}>Primary:</b> {c.channel.primary.toUpperCase()}{c.channel.secondary && <> · <b style={{ color: P.text1 }}>Sec:</b> {c.channel.secondary.toUpperCase()}</>}
              <br /><span style={{ color: P.blueHi }}>Why: </span>{c.channel.whyPrimary}
            </div>
          </div>
          <div style={{ padding: '10px 14px', borderRadius: 6, background: `${P.green}04`, border: `1px solid ${P.green}10`, marginBottom: 10 }}>
            <div style={{ ...lbl(P.green), marginBottom: 4 }}>Angle — {c.angle.primary.label}</div>
            <div style={{ fontFamily: FM, fontSize: 11, color: P.text2, lineHeight: 1.6 }}><b style={{ color: P.blueHi }}>CFO tension: </b>{c.angle.primary.cfoTension}</div>
          </div>
          <ReadinessPanel c={c} />
          {c.messages.length > 0 && onToggleMsg && onCopy && (<MessagesPanel c={c} expandedMsg={expandedMsg || null} copiedId={copiedId || null} onToggleMsg={onToggleMsg} onCopy={onCopy} onMarkSent={onMarkSent} />)}
          <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' as const }}>
            {!c.messages.length && onGenerate && c.readiness.status !== 'do_not_send' && (<button onClick={onGenerate} style={btn(P.blue)}>GENERATE MESSAGES</button>)}
            {c.account.financeLead.linkedIn && (<a href={c.account.financeLead.linkedIn} target="_blank" rel="noopener" style={{ ...btn(P.blueHi), textDecoration: 'none' }}>OPEN LINKEDIN</a>)}
            <Link href={`/command/accounts/${c.account.id}`} style={{ ...btn(P.text3), textDecoration: 'none' }}>VIEW ACCOUNT</Link>
            {onMarkWaiting    && <button onClick={onMarkWaiting}    style={btn(P.blue)}>MARK WAITING</button>}
            {onMarkNoResponse && <button onClick={onMarkNoResponse} style={btn(P.text2)}>NO RESPONSE</button>}
            {onHold           && <button onClick={onHold}           style={btn(P.red)}>HOLD</button>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Intel Grid ────────────────────────────────────────────
function IntelGrid({ c }: { c: ComputedAccount }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8, marginBottom: 12 }}>
      {[
        { label: 'HEAT',         value: `${c.heat.total}/100`,                   color: c.heat.total >= 60 ? P.red : c.heat.total >= 35 ? P.amber : P.text3 },
        { label: 'PROBABILITY',  value: `${c.probability}%`,                     color: P.blueHi },
        { label: 'EXP. VALUE',   value: `€${c.expectedValue.toLocaleString()}`,  color: P.green },
        { label: 'REVENUE EST.', value: `€${c.account.revenueEstimate.toLocaleString()}`, color: P.text2 },
        { label: 'CHANNEL',      value: c.channel.primary.toUpperCase(),         color: CH_CLR[c.channel.primary] || P.text3 },
        { label: 'SOLOFIT',      value: c.account.solofit.toUpperCase(),         color: c.account.solofit === 'ideal' ? P.green : P.blueHi },
      ].map(cell => (
        <div key={cell.label} style={{ padding: '8px 10px', borderRadius: 6, background: P.panel, border: `1px solid ${P.border}` }}>
          <div style={lbl()}>{cell.label}</div>
          <div style={{ fontFamily: FM, fontSize: 14, fontWeight: 800, color: cell.color, marginTop: 3 }}>{cell.value}</div>
        </div>
      ))}
    </div>
  );
}

// ── Readiness Panel ───────────────────────────────────────
function ReadinessPanel({ c }: { c: ComputedAccount }) {
  const meta = READINESS_META[c.readiness.status];
  return (
    <div style={{ padding: '10px 14px', borderRadius: 6, background: `${meta.color}05`, border: `1px solid ${meta.color}12`, marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div style={lbl(meta.color)}>Readiness</div>
        <span style={pill(meta.color)}>{meta.label}</span>
      </div>
      {c.readiness.blockers.map((b, i) => <div key={i} style={{ fontFamily: FM, fontSize: 10, color: P.red, lineHeight: 1.7 }}>— {b}</div>)}
      {c.readiness.reasons.map((r, i)  => <div key={i} style={{ fontFamily: FM, fontSize: 10, color: P.text2, lineHeight: 1.7 }}>+ {r}</div>)}
    </div>
  );
}

// ── Messages Panel ────────────────────────────────────────
function MessagesPanel({ c, expandedMsg, copiedId, onToggleMsg, onCopy, onMarkSent }: {
  c: ComputedAccount; expandedMsg: string | null; copiedId: string | null;
  onToggleMsg: (k: string | null) => void; onCopy: (t: string, id: string) => void;
  onMarkSent?: (id: string, ch: OutreachChannel, t: MessageType, b: string) => void;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ ...lbl(P.violet), marginBottom: 6 }}>Messages — {c.messages.length}</div>
      {c.messages.map(msg => {
        const key    = `${c.account.id}-${msg.id}`;
        const isOpen = expandedMsg === key;
        const grade  = msg.critique?.overallGrade || 'draft';
        const gCol   = GRADE_CLR[grade] || P.text3;
        return (
          <div key={msg.id} style={{ marginBottom: 4, borderRadius: 6, overflow: 'hidden', border: `1px solid ${gCol}15` }}>
            <div onClick={() => onToggleMsg(isOpen ? null : key)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', cursor: 'pointer', background: `${gCol}05` }}>
              <span style={{ fontFamily: FM, fontSize: 10, fontWeight: 700, color: CH_CLR[msg.channel] || P.text3, width: 90 }}>{MSG_LABELS[msg.type] || msg.type}</span>
              <span style={{ fontFamily: FM, fontSize: 10, color: P.text3, flex: 1 }}>{msg.body.split('\n')[0].slice(0, 60)}…</span>
              <span style={{ fontFamily: FM, fontSize: 9, color: P.text4 }}>{msg.wordCount}w</span>
              {msg.critique && <span style={pill(gCol)}>{grade.toUpperCase()}</span>}
              {msg.status === 'sent' && <span style={pill(P.green)}>SENT</span>}
            </div>
            {isOpen && (
              <div style={{ padding: 12, background: 'rgba(4,6,15,0.6)' }}>
                {msg.subject && <div style={{ fontFamily: FM, fontSize: 12, color: P.text1, marginBottom: 6 }}><b>Subject:</b> {msg.subject}</div>}
                <pre style={{ fontFamily: FM, fontSize: 12, color: P.text2, lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0, padding: 12, background: P.bg, borderRadius: 4, border: `1px solid ${P.border}` }}>{msg.body}</pre>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button onClick={() => onCopy(msg.body, msg.id)} style={btn(copiedId === msg.id ? P.green : P.blueHi)}>{copiedId === msg.id ? 'COPIED' : 'COPY'}</button>
                  {msg.subject && <button onClick={() => onCopy(`Subject: ${msg.subject}\n\n${msg.body}`, `${msg.id}-full`)} style={btn(P.blueHi)}>COPY + SUBJECT</button>}
                  {msg.status !== 'sent' && onMarkSent && <button onClick={() => onMarkSent(c.account.id, msg.channel, msg.type, msg.body)} style={btn(P.green)}>MARK SENT</button>}
                  {msg.channel === 'email' && msg.subject && <button onClick={() => window.open(`mailto:?subject=${encodeURIComponent(msg.subject!)}&body=${encodeURIComponent(msg.body)}`)} style={btn(P.green)}>EMAIL CLIENT</button>}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Atoms ─────────────────────────────────────────────────
function HeatBadge({ score }: { score: number }) {
  const color = score >= 75 ? P.red : score >= 60 ? P.amber : score >= 40 ? P.blue : P.text3;
  return <span style={{ fontFamily: FM, fontSize: 13, fontWeight: 800, color, background: `${color}12`, border: `1px solid ${color}28`, borderRadius: 5, padding: '2px 0', width: 36, textAlign: 'center' as const, display: 'inline-block' }}>{score}</span>;
}
function ReadinessBadge({ status }: { status: ReadinessStatus }) {
  return <span style={pill(READINESS_META[status].color)}>{READINESS_META[status].label}</span>;
}

// ── Export ────────────────────────────────────────────────
export default function OutreachPage() {
  return (
    <Suspense fallback={<div style={{ background: P.bg, minHeight: '100%' }} />}>
      <OutreachConsole />
    </Suspense>
  );
}
