'use client';

/**
 * GHOST TAX — OUTREACH CONSOLE v2
 * Clean rebuild — palette correcte, JetBrains Mono + Inter.
 * Business logic identique v1 — seulement le skin est refait.
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

// ── Design tokens ───────────────────────────────────────────
const P = {
  bg:      '#060912',
  surface: '#0C1019',
  panel:   '#0F1624',
  border:  'rgba(255,255,255,0.06)',
  text1:   '#F1F5F9',
  text2:   '#94A3B8',
  text3:   '#475569',
  text4:   '#2D3A4E',
  cyan:    '#22D3EE',
  green:   '#34D399',
  amber:   '#FBBF24',
  red:     '#F87171',
  blue:    '#60A5FA',
  violet:  '#A78BFA',
  redBg:   'rgba(248,113,113,0.08)',
  blueBg:  'rgba(96,165,250,0.08)',
  greenBg: 'rgba(52,211,153,0.08)',
};
const FM = "var(--vg-font-mono,'JetBrains Mono',monospace)";
const FS = "var(--vg-font-sans,'Inter',system-ui,sans-serif)";

// Shared style helpers
const box: React.CSSProperties = {
  background: P.surface,
  border: `1px solid ${P.border}`,
  borderRadius: 10,
  padding: '18px 22px',
};
const lbl: React.CSSProperties = {
  fontFamily: FM, fontSize: 9, fontWeight: 700,
  letterSpacing: '.18em', color: P.text3,
  textTransform: 'uppercase' as const, marginBottom: 10,
};
const pill = (color: string, bg: string): React.CSSProperties => ({
  fontFamily: FM, fontSize: 10, fontWeight: 700, letterSpacing: '.06em',
  padding: '3px 8px', borderRadius: 4, color, background: bg, display: 'inline-block',
});
const actionBtn = (color: string): React.CSSProperties => ({
  fontFamily: FM, fontSize: 11, fontWeight: 600, padding: '6px 14px', borderRadius: 4,
  background: `${color}12`, color, border: `1px solid ${color}25`, cursor: 'pointer',
  display: 'inline-block', textAlign: 'center' as const,
});

const CH_CLR: Record<string, string> = {
  linkedin: P.blue, email: P.green, hold: '#8B5CF6',
};
const GRADE_CLR: Record<string, string> = {
  strong: P.green, acceptable: P.blue, weak: P.amber, rewrite: P.red,
};
const MSG_TYPE_LABELS: Record<MessageType, string> = {
  linkedin_note:      'LI NOTE',
  linkedin_message:   'LI MSG',
  linkedin_followup:  'LI FOLLOW-UP',
  email_main:         'EMAIL',
  email_followup:     'EMAIL FOLLOW-UP',
  ultra_short:        'ULTRA-SHORT',
};

// ── Tab type ─────────────────────────────────────────────────
type TabId = 'hot' | 'review' | 'all';

// ── Pre-computed account ─────────────────────────────────────
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

// ── Main Component ───────────────────────────────────────────
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
  const [generatedMessages, setGeneratedMessages] = useState<Record<string, MessageVariant[]>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setAccounts(loadAccounts());
    setLedger(loadLedger());
    setLocks(loadLocks());
    setReady(true);
  }, []);

  const persistAccounts = useCallback((u: Account[]) => { setAccounts(u); saveAccounts(u); }, []);
  const persistLedger   = useCallback((l: LedgerEntry[]) => { setLedger(l); saveLedger(l); }, []);
  const persistLocks    = useCallback((l: ContactLock[]) => { setLocks(l); saveLocks(l); }, []);

  // Compute all account states
  const computed = useMemo(() => {
    const map = new Map<string, ComputedAccount>();
    for (const a of accounts) {
      if (a.status === 'dropped') continue;
      const angle    = selectAngle(a);
      const channel  = selectChannel(a);
      const msgs     = generatedMessages[a.id] || [];
      const acctLedger = ledger.filter(e => e.accountId === a.id);
      const readiness  = assessReadiness(a, angle, channel, msgs, acctLedger);
      const heat       = calcHeatScore(a);
      const dup        = checkDuplicateRisk(a.id, accounts, ledger);

      map.set(a.id, {
        account: a, angle, channel, readiness, heat,
        probability:   calcProbability(a),
        expectedValue: calcExpectedValue(a),
        messages:  msgs,
        queueTier: heat.total >= 60 ? 'hot' : heat.total >= 35 ? 'warm' : 'cold',
        duplicateRisk: dup.isDuplicate,
      });
    }
    return map;
  }, [accounts, ledger, generatedMessages]);

  const queue = useMemo(() =>
    buildQueue(accounts.filter(a => a.status !== 'dropped'), ledger),
  [accounts, ledger]);

  const hotAccounts = useMemo(() =>
    queue.hot.map(e => computed.get(e.accountId)).filter(Boolean) as ComputedAccount[],
  [queue, computed]);

  const reviewAccounts = useMemo(() =>
    [...computed.values()].filter(c =>
      c.messages.length > 0 &&
      (c.readiness.status === 'draft_needs_review' || c.readiness.status === 'ready_to_send')
    ).sort((a, b) => b.heat.total - a.heat.total),
  [computed]);

  const allAccounts = useMemo(() =>
    [...computed.values()].sort((a, b) => b.heat.total - a.heat.total),
  [computed]);

  // ── Handlers ─────────────────────────────────────────────
  const handleGenerateMessages = useCallback((accountId: string) => {
    const c = computed.get(accountId);
    if (!c) return;
    const ch = c.channel.primary === 'hold' ? 'email' : c.channel.primary;
    const msgs = processMessages(c.account, c.angle, ch as OutreachChannel);
    setGeneratedMessages(prev => ({ ...prev, [accountId]: msgs }));
    const newEntries = msgs.map(m =>
      createLedgerEntry(accountId, c.account.financeLead.name, m.channel, m.type, m.body)
    );
    persistLedger([...ledger, ...newEntries]);
  }, [computed, ledger, persistLedger]);

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleMarkSent = useCallback((
    accountId: string, channel: OutreachChannel, msgType: MessageType, body: string,
  ) => {
    const c = computed.get(accountId);
    if (!c) return;
    const safety = checkSendSafety(accountId, c.account.financeLead.name, channel, body, ledger, locks);
    if (!safety.safe) { alert(`BLOCKED: ${safety.reason}`); return; }

    let entryId = ledger.find(e =>
      e.accountId === accountId && e.channel === channel && e.messageType === msgType && !e.superseded
    )?.id;

    if (!entryId) {
      const entry = createLedgerEntry(accountId, c.account.financeLead.name, channel, msgType, body);
      entryId = entry.id;
      persistLedger([...ledger, entry]);
    }

    persistLedger(markLedgerSent(ledger, entryId));
    setGeneratedMessages(prev => ({
      ...prev,
      [accountId]: (prev[accountId] || []).map(m =>
        m.type === msgType ? { ...m, status: 'sent' as const } : m
      ),
    }));
  }, [computed, ledger, locks, persistLedger]);

  const handleMarkWaiting = useCallback((accountId: string) => {
    const entries = ledger.filter(e => e.accountId === accountId && e.status === 'sent' && !e.superseded);
    if (entries.length === 0) return;
    persistLedger(markLedgerWaiting(ledger, entries[0].id));
  }, [ledger, persistLedger]);

  const handleMarkNoResponse = useCallback((accountId: string) => {
    const entries = ledger.filter(e => e.accountId === accountId && e.status === 'waiting_response' && !e.superseded);
    if (entries.length === 0) return;
    persistLedger(markLedgerNoResponse(ledger, entries[0].id));
  }, [ledger, persistLedger]);

  const handleHold = useCallback((accountId: string) => {
    const updated = ledger.map(e =>
      e.accountId === accountId && !e.superseded && e.status !== 'sent'
        ? { ...e, superseded: true } : e
    );
    persistLedger(updated);
  }, [ledger, persistLedger]);

  if (!ready) return <div style={{ background: P.bg, minHeight: '100vh' }} />;

  const tabCounts = { hot: hotAccounts.length, review: reviewAccounts.length, all: allAccounts.length };

  // ── Render ─────────────────────────────────────────────
  return (
    <div style={{ background: P.bg, fontFamily: FS, color: P.text1, padding: '32px 28px 80px' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: FM, fontSize: 9, color: P.text3, letterSpacing: '.18em', textTransform: 'uppercase', marginBottom: 6 }}>
          Ghost Tax · Outreach Console
        </div>
        <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 600, letterSpacing: '-.02em' }}>
          Outreach Command
        </h1>
        {/* Queue Stats */}
        <div style={{ display: 'flex', gap: 20, fontFamily: FM, fontSize: 12, color: P.text3 }}>
          <span><span style={{ color: P.red, fontWeight: 700 }}>{queue.stats.hotCount}</span> hot</span>
          <span><span style={{ color: P.blue, fontWeight: 700 }}>{queue.stats.warmCount}</span> warm</span>
          <span><span style={{ color: P.violet, fontWeight: 700 }}>{queue.stats.holdCount}</span> hold</span>
          <span>{queue.stats.slotsAvailable} slots free</span>
          <span>{queue.stats.inCooldown} cooling</span>
          <span>{queue.stats.waitingResponse} awaiting</span>
        </div>
      </div>

      {/* ── Discipline Note ── */}
      <div style={{
        fontFamily: FM, fontSize: 11, color: P.blue, lineHeight: 1.7,
        background: P.blueBg, borderRadius: 8, padding: '12px 16px',
        border: `1px solid rgba(96,165,250,0.12)`, marginBottom: 24,
      }}>
        Research → Channel → Angle → Draft → Critique → Rewrite → Review → Send. Never send without human review. Quality over volume.
      </div>

      {/* ── Tabs ── */}
      <div style={{
        display: 'flex', gap: 0, marginBottom: 24,
        borderBottom: `1px solid ${P.border}`,
      }}>
        {([
          { id: 'hot'    as TabId, label: 'HOT QUEUE',    count: tabCounts.hot,    color: P.red    },
          { id: 'review' as TabId, label: 'REVIEW QUEUE', count: tabCounts.review, color: P.blue   },
          { id: 'all'    as TabId, label: 'ALL ACCOUNTS', count: tabCounts.all,    color: P.text3  },
        ] as const).map(t => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                fontFamily: FM, fontSize: 11, fontWeight: active ? 700 : 400,
                letterSpacing: '.1em', padding: '10px 18px',
                borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                borderBottom: active ? `2px solid ${t.color}` : '2px solid transparent',
                cursor: 'pointer', background: 'transparent',
                color: active ? P.text1 : P.text3,
                marginBottom: -1,
                textTransform: 'uppercase' as const,
              }}
            >
              {t.label}&nbsp;
              <span style={{ color: t.color }}>{t.count}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab content ── */}
      {tab === 'hot' && (
        <HotQueueTab
          accounts={hotAccounts}
          queue={queue}
          expandedId={expandedId}
          expandedMsg={expandedMsg}
          copiedId={copiedId}
          onToggle={id => setExpandedId(expandedId === id ? null : id)}
          onToggleMsg={setExpandedMsg}
          onGenerate={handleGenerateMessages}
          onCopy={handleCopy}
          onMarkSent={handleMarkSent}
          onMarkWaiting={handleMarkWaiting}
          onMarkNoResponse={handleMarkNoResponse}
          onHold={handleHold}
        />
      )}
      {tab === 'review' && (
        <ReviewQueueTab
          accounts={reviewAccounts}
          expandedId={expandedId}
          expandedMsg={expandedMsg}
          copiedId={copiedId}
          onToggle={id => setExpandedId(expandedId === id ? null : id)}
          onToggleMsg={setExpandedMsg}
          onCopy={handleCopy}
          onMarkSent={handleMarkSent}
        />
      )}
      {tab === 'all' && (
        <AllAccountsTab
          accounts={allAccounts}
          expandedId={expandedId}
          onToggle={id => setExpandedId(expandedId === id ? null : id)}
          onGenerate={handleGenerateMessages}
        />
      )}

    </div>
  );
}

// ── Hot Queue Tab ────────────────────────────────────────────
function HotQueueTab({
  accounts, queue, expandedId, expandedMsg, copiedId,
  onToggle, onToggleMsg, onGenerate, onCopy, onMarkSent,
  onMarkWaiting, onMarkNoResponse, onHold,
}: {
  accounts: ComputedAccount[];
  queue: QueueState;
  expandedId: string | null;
  expandedMsg: string | null;
  copiedId: string | null;
  onToggle: (id: string) => void;
  onToggleMsg: (k: string | null) => void;
  onGenerate: (id: string) => void;
  onCopy: (text: string, id: string) => void;
  onMarkSent: (id: string, ch: OutreachChannel, type: MessageType, body: string) => void;
  onMarkWaiting: (id: string) => void;
  onMarkNoResponse: (id: string) => void;
  onHold: (id: string) => void;
}) {
  if (accounts.length === 0) {
    return (
      <div style={{ ...box, textAlign: 'center', padding: '40px 24px' }}>
        <div style={{ fontFamily: FM, fontSize: 13, color: P.text3, marginBottom: 6 }}>
          No accounts in hot queue
        </div>
        <div style={{ fontFamily: FM, fontSize: 11, color: P.text4 }}>
          All accounts below heat threshold (60/100) or in cooldown.
        </div>
      </div>
    );
  }

  return (
    <div>
      {accounts.map((c, i) => (
        <AccountRow
          key={c.account.id}
          c={c}
          rank={i + 1}
          expanded={expandedId === c.account.id}
          expandedMsg={expandedMsg}
          copiedId={copiedId}
          onToggle={() => onToggle(c.account.id)}
          onToggleMsg={onToggleMsg}
          onGenerate={() => onGenerate(c.account.id)}
          onCopy={onCopy}
          onMarkSent={onMarkSent}
          onMarkWaiting={() => onMarkWaiting(c.account.id)}
          onMarkNoResponse={() => onMarkNoResponse(c.account.id)}
          onHold={() => onHold(c.account.id)}
          showHeat
        />
      ))}
    </div>
  );
}

// ── Review Queue Tab ─────────────────────────────────────────
function ReviewQueueTab({
  accounts, expandedId, expandedMsg, copiedId,
  onToggle, onToggleMsg, onCopy, onMarkSent,
}: {
  accounts: ComputedAccount[];
  expandedId: string | null;
  expandedMsg: string | null;
  copiedId: string | null;
  onToggle: (id: string) => void;
  onToggleMsg: (k: string | null) => void;
  onCopy: (text: string, id: string) => void;
  onMarkSent: (id: string, ch: OutreachChannel, type: MessageType, body: string) => void;
}) {
  if (accounts.length === 0) {
    return (
      <div style={{ ...box, textAlign: 'center', padding: '40px 24px' }}>
        <div style={{ fontFamily: FM, fontSize: 13, color: P.text3, marginBottom: 6 }}>
          No messages pending review
        </div>
        <div style={{ fontFamily: FM, fontSize: 11, color: P.text4 }}>
          Generate messages from the Hot Queue tab first.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ ...lbl, color: P.blue, marginBottom: 12 }}>
        Messages ready for review ({accounts.length})
      </div>
      {accounts.map(c => (
        <AccountRow
          key={c.account.id}
          c={c}
          expanded={expandedId === c.account.id}
          expandedMsg={expandedMsg}
          copiedId={copiedId}
          onToggle={() => onToggle(c.account.id)}
          onToggleMsg={onToggleMsg}
          onCopy={onCopy}
          onMarkSent={onMarkSent}
          showMessages
        />
      ))}
    </div>
  );
}

// ── All Accounts Tab ─────────────────────────────────────────
function AllAccountsTab({
  accounts, expandedId, onToggle, onGenerate,
}: {
  accounts: ComputedAccount[];
  expandedId: string | null;
  onToggle: (id: string) => void;
  onGenerate: (id: string) => void;
}) {
  return (
    <div>
      {(['hot', 'warm', 'cold', 'hold'] as QueueTier[]).map(tier => {
        const tierAccounts = accounts.filter(c => c.queueTier === tier);
        if (tierAccounts.length === 0) return null;
        const meta = QUEUE_TIER_META[tier];
        return (
          <div key={tier} style={{ marginBottom: 24 }}>
            <div style={{ ...lbl, color: meta.color, marginBottom: 10 }}>
              {meta.label} ({tierAccounts.length})
            </div>
            {tierAccounts.map(c => (
              <div key={c.account.id} style={{ ...box, marginBottom: 6, padding: '10px 14px' }}>
                <div
                  onClick={() => onToggle(c.account.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                >
                  <HeatBadge score={c.heat.total} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: P.text1, flex: 1 }}>
                    {c.account.company}
                  </span>
                  <span style={{ fontFamily: FM, fontSize: 11, color: P.text3 }}>
                    {c.account.financeLead.name}
                  </span>
                  <span style={{ fontFamily: FM, fontSize: 11, color: P.text3 }}>
                    {c.account.country}
                  </span>
                  <span style={pill(CH_CLR[c.channel.primary] || P.text3, `${CH_CLR[c.channel.primary] || P.text3}18`)}>
                    {c.channel.primary.toUpperCase()}
                  </span>
                  <ReadinessBadge status={c.readiness.status} />
                  <span style={{ fontFamily: FM, fontSize: 11, color: P.text3 }}>
                    EV €{c.expectedValue.toLocaleString()}
                  </span>
                </div>
                {expandedId === c.account.id && (
                  <div style={{ marginTop: 12 }}>
                    <IntelGrid c={c} />
                    {c.messages.length === 0 && c.readiness.status !== 'do_not_send' && (
                      <button onClick={() => onGenerate(c.account.id)} style={actionBtn(P.blue)}>
                        GENERATE MESSAGES
                      </button>
                    )}
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

// ── Account Row ──────────────────────────────────────────────
function AccountRow({
  c, rank, expanded, expandedMsg, copiedId,
  onToggle, onToggleMsg, onGenerate, onCopy, onMarkSent,
  onMarkWaiting, onMarkNoResponse, onHold,
  showHeat, showMessages,
}: {
  c: ComputedAccount;
  rank?: number;
  expanded: boolean;
  expandedMsg?: string | null;
  copiedId?: string | null;
  onToggle: () => void;
  onToggleMsg?: (k: string | null) => void;
  onGenerate?: () => void;
  onCopy?: (text: string, id: string) => void;
  onMarkSent?: (id: string, ch: OutreachChannel, type: MessageType, body: string) => void;
  onMarkWaiting?: () => void;
  onMarkNoResponse?: () => void;
  onHold?: () => void;
  showHeat?: boolean;
  showMessages?: boolean;
}) {
  return (
    <div style={{ ...box, marginBottom: 8 }}>
      {/* Collapsed Header */}
      <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        {rank !== undefined && (
          <span style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: P.text4, width: 24, textAlign: 'right' }}>
            #{rank}
          </span>
        )}
        <HeatBadge score={c.heat.total} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: P.text1 }}>{c.account.company}</span>
          <span style={{ fontFamily: FM, fontSize: 11, color: P.text3, marginLeft: 8 }}>
            {c.account.financeLead.name}
          </span>
        </div>
        <span style={{ fontFamily: FM, fontSize: 11, color: P.text3 }}>{c.account.country}</span>
        <span style={pill(CH_CLR[c.channel.primary] || P.text3, `${CH_CLR[c.channel.primary] || P.text3}18`)}>
          {c.channel.primary.toUpperCase()}
        </span>
        <span style={{ fontFamily: FM, fontSize: 11, color: P.text3 }}>
          {c.angle.primary.label.split(' ').slice(0, 3).join(' ')}
        </span>
        <ReadinessBadge status={c.readiness.status} />
        <span style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: P.text2 }}>
          P:{c.probability}%
        </span>
        <span style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: P.green }}>
          EV:€{c.expectedValue.toLocaleString()}
        </span>
        {c.duplicateRisk && (
          <span style={pill(P.red, 'rgba(248,113,113,0.12)')}>DUP RISK</span>
        )}
        <span style={{ fontFamily: FM, fontSize: 11, color: P.text4 }}>
          {expanded ? '▾' : '▸'}
        </span>
      </div>

      {/* Expanded Detail */}
      {expanded && (
        <div style={{ marginTop: 14 }}>
          <IntelGrid c={c} />
          <ChannelPanel c={c} />
          <AnglePanel c={c} />
          <ReadinessPanel c={c} />

          {c.messages.length > 0 && onToggleMsg && onCopy && (
            <MessagesPanel
              c={c}
              expandedMsg={expandedMsg || null}
              copiedId={copiedId || null}
              onToggleMsg={onToggleMsg}
              onCopy={onCopy}
              onMarkSent={onMarkSent}
            />
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
            {c.messages.length === 0 && onGenerate && c.readiness.status !== 'do_not_send' && (
              <button onClick={onGenerate} style={actionBtn(P.blue)}>GENERATE MESSAGES</button>
            )}
            {c.account.financeLead.linkedIn && (
              <a href={c.account.financeLead.linkedIn} target="_blank" rel="noopener"
                style={{ ...actionBtn(P.blue), textDecoration: 'none' }}>
                OPEN LINKEDIN
              </a>
            )}
            {onCopy && c.channel.primary === 'email' && c.messages.find(m => m.type === 'email_main') && (
              <button onClick={() => {
                const msg = c.messages.find(m => m.type === 'email_main')!;
                window.open(`mailto:?subject=${encodeURIComponent(msg.subject || '')}&body=${encodeURIComponent(msg.body)}`);
              }} style={actionBtn(P.green)}>
                OPEN IN EMAIL CLIENT
              </button>
            )}
            <Link href={`/command/accounts/${c.account.id}`}
              style={{ ...actionBtn(P.text3), textDecoration: 'none' }}>
              VIEW ACCOUNT
            </Link>
            {onMarkWaiting && (
              <button onClick={onMarkWaiting} style={actionBtn(P.blue)}>MARK WAITING</button>
            )}
            {onMarkNoResponse && (
              <button onClick={onMarkNoResponse} style={actionBtn(P.text2)}>NO RESPONSE</button>
            )}
            {onHold && (
              <button onClick={onHold} style={actionBtn(P.red)}>HOLD</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Intelligence Grid ────────────────────────────────────────
function IntelGrid({ c }: { c: ComputedAccount }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
      gap: 8, marginBottom: 12,
    }}>
      <MetricCell label="HEAT"        value={`${c.heat.total}/100`}   color={c.heat.total >= 60 ? P.red : c.heat.total >= 35 ? P.blue : P.text3} />
      <MetricCell label="PROBABILITY" value={`${c.probability}%`}     color={P.blue} />
      <MetricCell label="EXP. VALUE"  value={`€${c.expectedValue.toLocaleString()}`} color={P.green} />
      <MetricCell label="REVENUE EST."value={`€${c.account.revenueEstimate.toLocaleString()}`} color={P.text2} />
      <MetricCell label="CHANNEL"     value={c.channel.primary.toUpperCase()} color={CH_CLR[c.channel.primary] || P.text3} />
      <MetricCell label="CH CONF."    value={`${c.channel.confidence}%`}  color={P.text3} />
      <MetricCell label="ANG CONF."   value={`${c.angle.confidence}%`}   color={P.text3} />
      <MetricCell label="SOLOFIT"     value={c.account.solofit.toUpperCase()} color={c.account.solofit === 'ideal' ? P.green : P.blue} />
    </div>
  );
}

function MetricCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: '8px 10px', borderRadius: 6, background: P.panel, border: `1px solid ${P.border}` }}>
      <div style={{ ...lbl, fontSize: 9, marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: FM, fontSize: 14, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

// ── Channel Panel ────────────────────────────────────────────
function ChannelPanel({ c }: { c: ComputedAccount }) {
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 6, marginBottom: 10,
      background: 'rgba(96,165,250,0.03)', border: '1px solid rgba(96,165,250,0.08)',
    }}>
      <div style={{ ...lbl, color: P.blue, marginBottom: 6 }}>Channel Recommendation</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <div style={{ fontFamily: FM, fontSize: 12, color: P.text2, marginBottom: 2 }}>
            <b style={{ color: P.text1 }}>Primary:</b> {c.channel.primary.toUpperCase()}
          </div>
          {c.channel.secondary && (
            <div style={{ fontFamily: FM, fontSize: 12, color: P.text2, marginBottom: 2 }}>
              <b style={{ color: P.text1 }}>Secondary:</b> {c.channel.secondary.toUpperCase()}
            </div>
          )}
          <div style={{ fontFamily: FM, fontSize: 12, color: P.text2 }}>
            <b style={{ color: P.text1 }}>Sequence:</b> {c.channel.sequence.replace(/_/g, ' ')}
          </div>
        </div>
        <div>
          <div style={{ fontFamily: FM, fontSize: 11, color: P.text3, lineHeight: 1.6 }}>
            <b style={{ color: P.blue }}>Why: </b>{c.channel.whyPrimary}
          </div>
          <div style={{ fontFamily: FM, fontSize: 11, color: P.text3, lineHeight: 1.6, marginTop: 4 }}>
            <b style={{ color: P.text4 }}>Why not: </b>{c.channel.whyNotOthers}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Angle Panel ──────────────────────────────────────────────
function AnglePanel({ c }: { c: ComputedAccount }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
      <div style={{
        padding: '10px 14px', borderRadius: 6,
        background: 'rgba(52,211,153,0.03)', border: '1px solid rgba(52,211,153,0.08)',
      }}>
        <div style={{ ...lbl, color: P.green, marginBottom: 4 }}>Primary Angle</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: P.text1, marginBottom: 6 }}>
          {c.angle.primary.label}
        </div>
        <div style={{ fontFamily: FM, fontSize: 11, color: P.text2, lineHeight: 1.6, marginBottom: 2 }}>
          <b style={{ color: P.blue }}>CFO tension: </b>{c.angle.primary.cfoTension}
        </div>
        <div style={{ fontFamily: FM, fontSize: 11, color: P.text2, lineHeight: 1.6, marginBottom: 2 }}>
          <b style={{ color: P.blue }}>Financial: </b>{c.angle.primary.financialReading}
        </div>
        <div style={{ fontFamily: FM, fontSize: 11, color: P.red, lineHeight: 1.6 }}>
          <b>Avoid: </b>{c.angle.primary.avoid}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {c.angle.secondary && (
          <div style={{
            padding: '10px 14px', borderRadius: 6,
            background: 'rgba(96,165,250,0.03)', border: '1px solid rgba(96,165,250,0.08)',
          }}>
            <div style={{ ...lbl, color: P.blue, marginBottom: 3 }}>Secondary Angle</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: P.text1 }}>
              {c.angle.secondary.label}
            </div>
            <div style={{ fontFamily: FM, fontSize: 11, color: P.text3, marginTop: 2 }}>
              {c.angle.secondary.cfoTension.slice(0, 100)}…
            </div>
          </div>
        )}
        <div style={{ padding: '10px 14px', borderRadius: 6, background: P.panel, border: `1px solid ${P.border}` }}>
          <div style={{ ...lbl, marginBottom: 3 }}>Why not other angles</div>
          <div style={{ fontFamily: FM, fontSize: 11, color: P.text3, lineHeight: 1.5 }}>
            {c.angle.whyNotOthers}
          </div>
        </div>
        <div style={{ padding: '10px 14px', borderRadius: 6, background: P.panel, border: `1px solid ${P.border}` }}>
          <div style={{ ...lbl, marginBottom: 3 }}>Why now</div>
          <div style={{ fontFamily: FM, fontSize: 11, color: P.text2, lineHeight: 1.6 }}>
            {c.account.whyNow}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Readiness Panel ──────────────────────────────────────────
function ReadinessPanel({ c }: { c: ComputedAccount }) {
  const meta = READINESS_META[c.readiness.status];
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 6, marginBottom: 10,
      background: `${meta.color}06`, border: `1px solid ${meta.color}12`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div style={{ ...lbl, color: meta.color, margin: 0 }}>Outreach Readiness</div>
        <ReadinessBadge status={c.readiness.status} />
      </div>
      {c.readiness.blockers.length > 0 && (
        <div style={{ marginBottom: 4 }}>
          {c.readiness.blockers.map((b, i) => (
            <div key={i} style={{ fontFamily: FM, fontSize: 11, color: P.red, lineHeight: 1.6 }}>— {b}</div>
          ))}
        </div>
      )}
      {c.readiness.reasons.length > 0 && (
        <div>
          {c.readiness.reasons.map((r, i) => (
            <div key={i} style={{ fontFamily: FM, fontSize: 11, color: P.text2, lineHeight: 1.6 }}>+ {r}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Messages Panel ───────────────────────────────────────────
function MessagesPanel({
  c, expandedMsg, copiedId, onToggleMsg, onCopy, onMarkSent,
}: {
  c: ComputedAccount;
  expandedMsg: string | null;
  copiedId: string | null;
  onToggleMsg: (k: string | null) => void;
  onCopy: (text: string, id: string) => void;
  onMarkSent?: (id: string, ch: OutreachChannel, type: MessageType, body: string) => void;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ ...lbl, color: P.violet, marginBottom: 6 }}>
        Messages ({c.messages.length})
      </div>
      {c.messages.map(msg => {
        const msgKey    = `${c.account.id}-${msg.id}`;
        const isOpen    = expandedMsg === msgKey;
        const grade     = msg.critique?.overallGrade || 'draft';
        const gradeColor = GRADE_CLR[grade] || P.text3;

        return (
          <div key={msg.id} style={{
            marginBottom: 4, borderRadius: 6, overflow: 'hidden',
            border: `1px solid ${gradeColor}18`,
          }}>
            {/* Message Header */}
            <div
              onClick={() => onToggleMsg(isOpen ? null : msgKey)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 10px', cursor: 'pointer',
                background: `${gradeColor}05`,
              }}
            >
              <span style={{
                fontFamily: FM, fontSize: 10, fontWeight: 700,
                color: CH_CLR[msg.channel] || P.text3, width: 90,
              }}>
                {MSG_TYPE_LABELS[msg.type] || msg.type}
              </span>
              <span style={{ fontFamily: FM, fontSize: 11, color: P.text3, flex: 1 }}>
                {msg.body.split('\n')[0].slice(0, 60)}…
              </span>
              <span style={{ fontFamily: FM, fontSize: 10, color: P.text4 }}>{msg.wordCount}w</span>
              {msg.critique && (
                <span style={pill(gradeColor, `${gradeColor}15`)}>{grade.toUpperCase()}</span>
              )}
              {msg.status === 'sent' && (
                <span style={pill(P.green, 'rgba(52,211,153,0.12)')}>SENT</span>
              )}
              {msg.rewriteSummary && (
                <span style={{ fontFamily: FM, fontSize: 10, color: P.violet }}>REWRITTEN</span>
              )}
            </div>

            {/* Expanded Message */}
            {isOpen && (
              <div style={{ padding: 12, background: 'rgba(6,9,18,0.6)' }}>
                {/* Critique */}
                {msg.critique && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {msg.critique.issues.length > 0 && (
                        <div style={{
                          padding: '8px 10px', borderRadius: 4,
                          background: 'rgba(248,113,113,0.03)', border: '1px solid rgba(248,113,113,0.06)',
                        }}>
                          <div style={{ ...lbl, color: P.red, marginBottom: 3 }}>Issues</div>
                          {msg.critique.issues.map((issue, j) => (
                            <div key={j} style={{ fontFamily: FM, fontSize: 11, color: P.red, lineHeight: 1.6 }}>— {issue}</div>
                          ))}
                        </div>
                      )}
                      {msg.critique.strengths.length > 0 && (
                        <div style={{
                          padding: '8px 10px', borderRadius: 4,
                          background: 'rgba(52,211,153,0.03)', border: '1px solid rgba(52,211,153,0.06)',
                        }}>
                          <div style={{ ...lbl, color: P.green, marginBottom: 3 }}>Strengths</div>
                          {msg.critique.strengths.map((s, j) => (
                            <div key={j} style={{ fontFamily: FM, fontSize: 11, color: P.green, lineHeight: 1.6 }}>+ {s}</div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ fontFamily: FM, fontSize: 11, color: P.text2, marginTop: 6 }}>
                      <b style={{ color: gradeColor }}>Score: {msg.critique.score}/12</b> — {msg.critique.summary}
                    </div>
                  </div>
                )}

                {msg.rewriteSummary && (
                  <div style={{
                    fontFamily: FM, fontSize: 11, color: P.violet, marginBottom: 8,
                    padding: '4px 8px', borderRadius: 3,
                    background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.08)',
                  }}>
                    {msg.rewriteSummary}
                  </div>
                )}

                {msg.subject && (
                  <div style={{ fontFamily: FM, fontSize: 12, color: P.text1, marginBottom: 6 }}>
                    <b>Subject:</b> {msg.subject}
                  </div>
                )}

                <pre style={{
                  fontFamily: FM, fontSize: 12, color: P.text2, lineHeight: 1.6,
                  whiteSpace: 'pre-wrap', margin: 0, padding: 12,
                  background: P.bg, borderRadius: 4, border: `1px solid ${P.border}`,
                }}>
                  {msg.body}
                </pre>

                {/* Message Actions */}
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button onClick={() => onCopy(msg.body, msg.id)} style={actionBtn(copiedId === msg.id ? P.green : P.blue)}>
                    {copiedId === msg.id ? 'COPIED' : 'COPY'}
                  </button>
                  {msg.subject && (
                    <button onClick={() => onCopy(`Subject: ${msg.subject}\n\n${msg.body}`, `${msg.id}-full`)} style={actionBtn(P.blue)}>
                      COPY WITH SUBJECT
                    </button>
                  )}
                  {msg.status !== 'sent' && onMarkSent && (
                    <button onClick={() => onMarkSent(c.account.id, msg.channel, msg.type, msg.body)} style={actionBtn(P.green)}>
                      MARK SENT
                    </button>
                  )}
                  {msg.channel === 'email' && msg.subject && (
                    <button onClick={() => {
                      window.open(`mailto:?subject=${encodeURIComponent(msg.subject!)}&body=${encodeURIComponent(msg.body)}`);
                    }} style={actionBtn(P.green)}>
                      OPEN EMAIL CLIENT
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Small Components ─────────────────────────────────────────
function HeatBadge({ score }: { score: number }) {
  const color = score >= 60 ? P.red : score >= 35 ? P.blue : P.text3;
  return (
    <span style={{
      fontFamily: FM, fontSize: 13, fontWeight: 700, color,
      width: 36, textAlign: 'center',
      padding: '3px 0', borderRadius: 4, background: `${color}12`,
    }}>
      {score}
    </span>
  );
}

function ReadinessBadge({ status }: { status: ReadinessStatus }) {
  const meta = READINESS_META[status];
  return <span style={pill(meta.color, meta.bg)}>{meta.label}</span>;
}

// ── Page Export ──────────────────────────────────────────────
export default function OutreachPage() {
  return (
    <Suspense fallback={
      <div style={{ background: P.bg, minHeight: '100vh', fontFamily: FM, color: P.text3, padding: 40 }}>
        Loading outreach command…
      </div>
    }>
      <OutreachConsole />
    </Suspense>
  );
}
