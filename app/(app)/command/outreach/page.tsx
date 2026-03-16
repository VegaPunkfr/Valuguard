'use client';

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
import { processMessages, critiqueMessage as critiqueSingle } from '@/lib/command/messages';
import { assessReadiness } from '@/lib/command/readiness';
import {
  calcHeatScore, buildQueue, loadLedger, saveLedger, loadLocks, saveLocks,
  createLedgerEntry, checkSendSafety, markLedgerSent, markLedgerWaiting,
  markLedgerNoResponse, supersedeLedgerEntry, messageFingerprint,
  checkDuplicateRisk, type QueueState, type QueueEntry,
} from '@/lib/command/hot-queue';

// ── Style Tokens ────────────────────────────────────────────

const mono: React.CSSProperties = { fontFamily: 'var(--vg-font-mono, monospace)' };
const box: React.CSSProperties = { background: '#0a0d19', border: '1px solid rgba(36,48,78,0.25)', borderRadius: 8, padding: '14px 18px' };
const lbl: React.CSSProperties = { ...mono, fontSize: 8, fontWeight: 600, letterSpacing: '0.16em', color: '#475569', textTransform: 'uppercase' as const };
const pill = (color: string, bg: string): React.CSSProperties => ({
  ...mono, fontSize: 7, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 7px',
  borderRadius: 3, color, background: bg, display: 'inline-block',
});

const CH_CLR: Record<string, string> = { linkedin: '#60a5fa', email: '#34d399', hold: '#f59e0b' };
const GRADE_CLR: Record<string, string> = { strong: '#34d399', acceptable: '#60a5fa', weak: '#fbbf24', rewrite: '#f87171' };
const MSG_TYPE_LABELS: Record<MessageType, string> = {
  linkedin_note: 'LI NOTE', linkedin_message: 'LI MESSAGE', linkedin_followup: 'LI FOLLOW-UP',
  email_main: 'EMAIL', email_followup: 'EMAIL FOLLOW-UP', ultra_short: 'ULTRA-SHORT',
};

// ── Tab types ───────────────────────────────────────────────

type TabId = 'hot' | 'review' | 'all';

// ── Pre-computed account state ──────────────────────────────

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

// ── Main Component ──────────────────────────────────────────

function OutreachConsole() {
  const searchParams = useSearchParams();
  const focusAccount = searchParams.get('account');

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [locks, setLocks] = useState<ContactLock[]>([]);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<TabId>('hot');
  const [expandedId, setExpandedId] = useState<string | null>(focusAccount);
  const [expandedMsg, setExpandedMsg] = useState<string | null>(null);
  const [generatedMessages, setGeneratedMessages] = useState<Record<string, MessageVariant[]>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    setAccounts(loadAccounts());
    setLedger(loadLedger());
    setLocks(loadLocks());
    setReady(true);
  }, []);

  const persistAccounts = useCallback((u: Account[]) => { setAccounts(u); saveAccounts(u); }, []);
  const persistLedger = useCallback((l: LedgerEntry[]) => { setLedger(l); saveLedger(l); }, []);
  const persistLocks = useCallback((l: ContactLock[]) => { setLocks(l); saveLocks(l); }, []);

  // Compute all account states
  const computed = useMemo(() => {
    const map = new Map<string, ComputedAccount>();
    for (const a of accounts) {
      if (a.status === 'dropped') continue;
      const angle = selectAngle(a);
      const channel = selectChannel(a);
      const msgs = generatedMessages[a.id] || [];
      const accountLedger = ledger.filter(e => e.accountId === a.id);
      const readiness = assessReadiness(a, angle, channel, msgs, accountLedger);
      const heat = calcHeatScore(a);
      const dup = checkDuplicateRisk(a.id, accounts, ledger);

      map.set(a.id, {
        account: a,
        angle, channel, readiness, heat,
        probability: calcProbability(a),
        expectedValue: calcExpectedValue(a),
        messages: msgs,
        queueTier: heat.total >= 60 ? 'hot' : heat.total >= 35 ? 'warm' : 'cold',
        duplicateRisk: dup.isDuplicate,
      });
    }
    return map;
  }, [accounts, ledger, generatedMessages]);

  // Build queue
  const queue = useMemo(() => buildQueue(accounts.filter(a => a.status !== 'dropped'), ledger), [accounts, ledger]);

  // Get computed by queue tier
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

  // ── Actions ─────────────────────────────────────────────

  const handleGenerateMessages = useCallback((accountId: string) => {
    const c = computed.get(accountId);
    if (!c) return;
    const channel = c.channel.primary === 'hold' ? 'email' : c.channel.primary;
    const msgs = processMessages(c.account, c.angle, channel as OutreachChannel);
    setGeneratedMessages(prev => ({ ...prev, [accountId]: msgs }));

    // Create ledger entries
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

  const handleMarkSent = useCallback((accountId: string, channel: OutreachChannel, msgType: MessageType, body: string) => {
    const c = computed.get(accountId);
    if (!c) return;

    const safety = checkSendSafety(accountId, c.account.financeLead.name, channel, body, ledger, locks);
    if (!safety.safe) {
      alert(`BLOCKED: ${safety.reason}`);
      return;
    }

    // Find or create ledger entry
    let entryId = ledger.find(e =>
      e.accountId === accountId && e.channel === channel && e.messageType === msgType && !e.superseded
    )?.id;

    if (!entryId) {
      const entry = createLedgerEntry(accountId, c.account.financeLead.name, channel, msgType, body);
      entryId = entry.id;
      persistLedger([...ledger, entry]);
    }

    // Mark sent + add cooldown
    const updated = markLedgerSent(ledger, entryId);
    persistLedger(updated);

    // Update message status
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
    const c = computed.get(accountId);
    if (!c) return;
    // Supersede active entries
    const updated = ledger.map(e =>
      e.accountId === accountId && !e.superseded && e.status !== 'sent'
        ? { ...e, superseded: true }
        : e
    );
    persistLedger(updated);
  }, [computed, ledger, persistLedger]);

  if (!ready) return null;

  // ── Tab Counts ────────────────────────────────────────

  const tabCounts = { hot: hotAccounts.length, review: reviewAccounts.length, all: allAccounts.length };

  return (
    <div style={mono}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 4 }}>
        <h1 style={{ fontSize: 16, fontWeight: 700, color: '#e4e9f4', margin: 0 }}>Outreach Command</h1>
        <span style={{ fontSize: 9, color: '#3b82f6', fontWeight: 600, letterSpacing: '0.12em' }}>SEMI-AUTO</span>
      </div>

      {/* Queue Stats Bar */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 16, fontSize: 9, color: '#64748b' }}>
        <span><b style={{ color: '#ef4444' }}>{queue.stats.hotCount}</b> hot</span>
        <span><b style={{ color: '#f59e0b' }}>{queue.stats.warmCount}</b> warm</span>
        <span><b style={{ color: '#3b82f6' }}>{queue.stats.holdCount}</b> hold</span>
        <span>{queue.stats.slotsAvailable} slots free</span>
        <span>{queue.stats.inCooldown} cooling</span>
        <span>{queue.stats.waitingResponse} awaiting</span>
      </div>

      {/* Discipline */}
      <div style={{ fontSize: 8, color: '#fbbf24', lineHeight: 1.6, background: 'rgba(251,191,36,0.03)', borderRadius: 6, padding: '8px 12px', border: '1px solid rgba(251,191,36,0.08)', marginBottom: 16 }}>
        Research → Channel → Angle → Draft → Critique → Rewrite → Review → Send. Never send without human review. Quality over volume.
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid rgba(36,48,78,0.20)' }}>
        {([
          { id: 'hot' as TabId, label: 'HOT QUEUE', count: tabCounts.hot, color: '#ef4444' },
          { id: 'review' as TabId, label: 'REVIEW QUEUE', count: tabCounts.review, color: '#fbbf24' },
          { id: 'all' as TabId, label: 'ALL ACCOUNTS', count: tabCounts.all, color: '#64748b' },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              ...mono, fontSize: 9, fontWeight: tab === t.id ? 700 : 400,
              letterSpacing: '0.12em', padding: '10px 16px', border: 'none', cursor: 'pointer',
              color: tab === t.id ? '#e4e9f4' : '#55637d', background: 'transparent',
              borderBottom: tab === t.id ? `2px solid ${t.color}` : '2px solid transparent',
            }}
          >
            {t.label} <span style={{ color: t.color, marginLeft: 4 }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Content */}
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

// ── Hot Queue Tab ───────────────────────────────────────────

function HotQueueTab({ accounts, queue, expandedId, expandedMsg, copiedId, onToggle, onToggleMsg, onGenerate, onCopy, onMarkSent, onMarkWaiting, onMarkNoResponse, onHold }: {
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
      <div style={{ ...box, textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>No accounts in hot queue</div>
        <div style={{ fontSize: 9, color: '#475569' }}>All accounts below heat threshold (60/100) or in cooldown.</div>
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

// ── Review Queue Tab ────────────────────────────────────────

function ReviewQueueTab({ accounts, expandedId, expandedMsg, copiedId, onToggle, onToggleMsg, onCopy, onMarkSent }: {
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
      <div style={{ ...box, textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 11, color: '#64748b' }}>No messages pending review</div>
        <div style={{ fontSize: 9, color: '#475569' }}>Generate messages from the Hot Queue tab first.</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ ...lbl, color: '#fbbf24', marginBottom: 10 }}>
        MESSAGES READY FOR REVIEW ({accounts.length})
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

// ── All Accounts Tab ────────────────────────────────────────

function AllAccountsTab({ accounts, expandedId, onToggle, onGenerate }: {
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
          <div key={tier} style={{ marginBottom: 20 }}>
            <div style={{ ...lbl, color: meta.color, marginBottom: 8 }}>
              {meta.label} ({tierAccounts.length})
            </div>
            {tierAccounts.map(c => (
              <div key={c.account.id} style={{ ...box, marginBottom: 6, padding: '10px 14px' }}>
                <div onClick={() => onToggle(c.account.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <HeatBadge score={c.heat.total} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#e4e9f4', flex: 1 }}>{c.account.company}</span>
                  <span style={{ fontSize: 8, color: '#64748b' }}>{c.account.financeLead.name}</span>
                  <span style={{ fontSize: 8, color: '#475569' }}>{c.account.country}</span>
                  <span style={pill(CH_CLR[c.channel.primary] || '#64748b', `${CH_CLR[c.channel.primary] || '#64748b'}18`)}>
                    {c.channel.primary.toUpperCase()}
                  </span>
                  <ReadinessBadge status={c.readiness.status} />
                  <span style={{ fontSize: 8, color: '#475569' }}>EV €{c.expectedValue.toLocaleString()}</span>
                </div>
                {expandedId === c.account.id && (
                  <div style={{ marginTop: 10 }}>
                    <IntelGrid c={c} />
                    {c.messages.length === 0 && c.readiness.status !== 'do_not_send' && (
                      <button onClick={() => onGenerate(c.account.id)} style={actionBtn('#3b82f6')}>
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

// ── Account Row (reusable) ──────────────────────────────────

function AccountRow({ c, rank, expanded, expandedMsg, copiedId, onToggle, onToggleMsg, onGenerate, onCopy, onMarkSent, onMarkWaiting, onMarkNoResponse, onHold, showHeat, showMessages }: {
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
        {rank && <span style={{ fontSize: 9, fontWeight: 700, color: '#3a4560', width: 20, textAlign: 'right' }}>#{rank}</span>}
        <HeatBadge score={c.heat.total} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#e4e9f4' }}>{c.account.company}</span>
          <span style={{ fontSize: 9, color: '#64748b', marginLeft: 8 }}>{c.account.financeLead.name}</span>
        </div>
        <span style={{ fontSize: 8, color: '#475569' }}>{c.account.country}</span>
        <span style={pill(CH_CLR[c.channel.primary] || '#64748b', `${CH_CLR[c.channel.primary] || '#64748b'}18`)}>
          {c.channel.primary.toUpperCase()}
        </span>
        <span style={{ fontSize: 8, color: '#475569' }}>{c.angle.primary.label.split(' ').slice(0, 3).join(' ')}</span>
        <ReadinessBadge status={c.readiness.status} />
        <span style={{ fontSize: 8, color: '#94a3b8', fontWeight: 600 }}>P:{c.probability}%</span>
        <span style={{ fontSize: 8, color: '#34d399', fontWeight: 600 }}>EV:€{c.expectedValue.toLocaleString()}</span>
        {c.duplicateRisk && <span style={pill('#f87171', 'rgba(248,113,113,0.12)')}>DUP RISK</span>}
        <span style={{ fontSize: 11, color: '#3a4560' }}>{expanded ? '▾' : '▸'}</span>
      </div>

      {/* Expanded Detail */}
      {expanded && (
        <div style={{ marginTop: 14 }}>
          {/* Intelligence Grid */}
          <IntelGrid c={c} />

          {/* Channel Analysis */}
          <ChannelPanel c={c} />

          {/* Angle Analysis */}
          <AnglePanel c={c} />

          {/* Readiness Assessment */}
          <ReadinessPanel c={c} />

          {/* Messages */}
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
              <button onClick={onGenerate} style={actionBtn('#3b82f6')}>GENERATE MESSAGES</button>
            )}
            {c.account.financeLead.linkedIn && (
              <a href={c.account.financeLead.linkedIn} target="_blank" rel="noopener" style={{ ...actionBtn('#60a5fa'), textDecoration: 'none' }}>
                OPEN LINKEDIN
              </a>
            )}
            {onCopy && c.channel.primary === 'email' && c.messages.find(m => m.type === 'email_main') && (
              <button onClick={() => {
                const msg = c.messages.find(m => m.type === 'email_main')!;
                const mailto = `mailto:?subject=${encodeURIComponent(msg.subject || '')}&body=${encodeURIComponent(msg.body)}`;
                window.open(mailto);
              }} style={actionBtn('#34d399')}>
                OPEN IN EMAIL CLIENT
              </button>
            )}
            <Link href={`/command/accounts/${c.account.id}`} style={{ ...actionBtn('#64748b'), textDecoration: 'none' }}>
              VIEW ACCOUNT
            </Link>
            {onMarkWaiting && <button onClick={onMarkWaiting} style={actionBtn('#f59e0b')}>MARK WAITING</button>}
            {onMarkNoResponse && <button onClick={onMarkNoResponse} style={actionBtn('#94a3b8')}>NO RESPONSE</button>}
            {onHold && <button onClick={onHold} style={actionBtn('#f87171')}>HOLD</button>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Intelligence Grid ───────────────────────────────────────

function IntelGrid({ c }: { c: ComputedAccount }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, marginBottom: 12 }}>
      <MetricCell label="HEAT" value={`${c.heat.total}/100`} color={c.heat.total >= 60 ? '#ef4444' : c.heat.total >= 35 ? '#f59e0b' : '#64748b'} />
      <MetricCell label="PROBABILITY" value={`${c.probability}%`} color="#60a5fa" />
      <MetricCell label="EXPECTED VALUE" value={`€${c.expectedValue.toLocaleString()}`} color="#34d399" />
      <MetricCell label="REVENUE EST." value={`€${c.account.revenueEstimate.toLocaleString()}`} color="#94a3b8" />
      <MetricCell label="CHANNEL" value={c.channel.primary.toUpperCase()} color={CH_CLR[c.channel.primary] || '#64748b'} />
      <MetricCell label="CHANNEL CONF." value={`${c.channel.confidence}%`} color="#475569" />
      <MetricCell label="ANGLE CONF." value={`${c.angle.confidence}%`} color="#475569" />
      <MetricCell label="SOLOFIT" value={c.account.solofit.toUpperCase()} color={c.account.solofit === 'ideal' ? '#34d399' : c.account.solofit === 'good' ? '#60a5fa' : '#fbbf24'} />
    </div>
  );
}

function MetricCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: '8px 10px', borderRadius: 6, background: 'rgba(14,18,33,0.5)', border: '1px solid rgba(36,48,78,0.12)' }}>
      <div style={{ ...lbl, fontSize: 7, marginBottom: 3 }}>{label}</div>
      <div style={{ ...mono, fontSize: 12, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

// ── Channel Panel ───────────────────────────────────────────

function ChannelPanel({ c }: { c: ComputedAccount }) {
  return (
    <div style={{ padding: '10px 14px', borderRadius: 6, background: 'rgba(59,130,246,0.03)', border: '1px solid rgba(59,130,246,0.08)', marginBottom: 10 }}>
      <div style={{ ...lbl, color: '#3b82f6', marginBottom: 6, fontSize: 7 }}>CHANNEL RECOMMENDATION</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 2 }}><b style={{ color: '#e4e9f4' }}>Primary:</b> {c.channel.primary.toUpperCase()}</div>
          {c.channel.secondary && (
            <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 2 }}><b style={{ color: '#e4e9f4' }}>Secondary:</b> {c.channel.secondary.toUpperCase()}</div>
          )}
          <div style={{ fontSize: 9, color: '#94a3b8' }}><b style={{ color: '#e4e9f4' }}>Sequence:</b> {c.channel.sequence.replace(/_/g, ' ')}</div>
        </div>
        <div>
          <div style={{ fontSize: 8, color: '#64748b', lineHeight: 1.6 }}><b style={{ color: '#60a5fa' }}>Why:</b> {c.channel.whyPrimary}</div>
          <div style={{ fontSize: 8, color: '#64748b', lineHeight: 1.6, marginTop: 4 }}><b style={{ color: '#475569' }}>Why not other:</b> {c.channel.whyNotOthers}</div>
        </div>
      </div>
    </div>
  );
}

// ── Angle Panel ─────────────────────────────────────────────

function AnglePanel({ c }: { c: ComputedAccount }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
      {/* Primary Angle */}
      <div style={{ padding: '10px 14px', borderRadius: 6, background: 'rgba(52,211,153,0.03)', border: '1px solid rgba(52,211,153,0.08)' }}>
        <div style={{ ...lbl, color: '#34d399', marginBottom: 4, fontSize: 7 }}>PRIMARY ANGLE</div>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#e4e9f4', marginBottom: 4 }}>{c.angle.primary.label}</div>
        <div style={{ fontSize: 8, color: '#94a3b8', lineHeight: 1.5, marginBottom: 3 }}>
          <b style={{ color: '#fbbf24' }}>CFO tension:</b> {c.angle.primary.cfoTension}
        </div>
        <div style={{ fontSize: 8, color: '#94a3b8', lineHeight: 1.5, marginBottom: 3 }}>
          <b style={{ color: '#60a5fa' }}>Financial reading:</b> {c.angle.primary.financialReading}
        </div>
        <div style={{ fontSize: 8, color: '#f87171', lineHeight: 1.5 }}>
          <b>Avoid:</b> {c.angle.primary.avoid}
        </div>
      </div>

      {/* Secondary + Why Not */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {c.angle.secondary && (
          <div style={{ padding: '10px 14px', borderRadius: 6, background: 'rgba(96,165,250,0.03)', border: '1px solid rgba(96,165,250,0.08)' }}>
            <div style={{ ...lbl, color: '#60a5fa', marginBottom: 3, fontSize: 7 }}>SECONDARY ANGLE</div>
            <div style={{ fontSize: 9, fontWeight: 500, color: '#e4e9f4' }}>{c.angle.secondary.label}</div>
            <div style={{ fontSize: 8, color: '#64748b', marginTop: 2 }}>{c.angle.secondary.cfoTension.slice(0, 100)}...</div>
          </div>
        )}
        <div style={{ padding: '10px 14px', borderRadius: 6, background: 'rgba(14,18,33,0.4)', border: '1px solid rgba(36,48,78,0.08)' }}>
          <div style={{ ...lbl, color: '#475569', marginBottom: 3, fontSize: 7 }}>WHY NOT OTHER ANGLES</div>
          <div style={{ fontSize: 8, color: '#64748b', lineHeight: 1.5 }}>{c.angle.whyNotOthers}</div>
        </div>
        <div style={{ padding: '10px 14px', borderRadius: 6, background: 'rgba(14,18,33,0.4)', border: '1px solid rgba(36,48,78,0.08)' }}>
          <div style={{ ...lbl, color: '#475569', marginBottom: 3, fontSize: 7 }}>WHY NOW</div>
          <div style={{ fontSize: 8, color: '#94a3b8', lineHeight: 1.5 }}>{c.account.whyNow}</div>
        </div>
      </div>
    </div>
  );
}

// ── Readiness Panel ─────────────────────────────────────────

function ReadinessPanel({ c }: { c: ComputedAccount }) {
  const meta = READINESS_META[c.readiness.status];
  return (
    <div style={{ padding: '10px 14px', borderRadius: 6, background: `${meta.color}08`, border: `1px solid ${meta.color}15`, marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div style={{ ...lbl, color: meta.color, fontSize: 7, margin: 0 }}>OUTREACH READINESS</div>
        <ReadinessBadge status={c.readiness.status} />
      </div>
      {c.readiness.blockers.length > 0 && (
        <div style={{ marginBottom: 4 }}>
          {c.readiness.blockers.map((b, i) => (
            <div key={i} style={{ fontSize: 8, color: '#f87171', lineHeight: 1.5 }}>— {b}</div>
          ))}
        </div>
      )}
      {c.readiness.reasons.length > 0 && (
        <div>
          {c.readiness.reasons.map((r, i) => (
            <div key={i} style={{ fontSize: 8, color: '#94a3b8', lineHeight: 1.5 }}>+ {r}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Messages Panel ──────────────────────────────────────────

function MessagesPanel({ c, expandedMsg, copiedId, onToggleMsg, onCopy, onMarkSent }: {
  c: ComputedAccount;
  expandedMsg: string | null;
  copiedId: string | null;
  onToggleMsg: (k: string | null) => void;
  onCopy: (text: string, id: string) => void;
  onMarkSent?: (id: string, ch: OutreachChannel, type: MessageType, body: string) => void;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ ...lbl, color: '#a78bfa', marginBottom: 6, fontSize: 7 }}>MESSAGES ({c.messages.length})</div>
      {c.messages.map(msg => {
        const msgKey = `${c.account.id}-${msg.id}`;
        const isOpen = expandedMsg === msgKey;
        const grade = msg.critique?.overallGrade || 'draft';
        const gradeColor = GRADE_CLR[grade] || '#64748b';

        return (
          <div key={msg.id} style={{ marginBottom: 4, borderRadius: 6, border: `1px solid ${gradeColor}12`, overflow: 'hidden' }}>
            {/* Message Header */}
            <div onClick={() => onToggleMsg(isOpen ? null : msgKey)} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', cursor: 'pointer',
              background: `${gradeColor}06`,
            }}>
              <span style={{ ...mono, fontSize: 7, fontWeight: 700, color: CH_CLR[msg.channel] || '#64748b', width: 90 }}>
                {MSG_TYPE_LABELS[msg.type] || msg.type}
              </span>
              <span style={{ fontSize: 8, color: '#64748b', flex: 1 }}>{msg.body.split('\n')[0].slice(0, 60)}...</span>
              <span style={{ fontSize: 7, color: '#475569' }}>{msg.wordCount}w</span>
              {msg.critique && (
                <span style={pill(gradeColor, `${gradeColor}15`)}>{grade.toUpperCase()}</span>
              )}
              {msg.status === 'sent' && <span style={pill('#34d399', 'rgba(52,211,153,0.12)')}>SENT</span>}
              {msg.rewriteSummary && <span style={{ fontSize: 7, color: '#a78bfa' }}>REWRITTEN</span>}
            </div>

            {/* Expanded Message */}
            {isOpen && (
              <div style={{ padding: 12, background: 'rgba(6,9,18,0.5)' }}>
                {/* Critique */}
                {msg.critique && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {msg.critique.issues.length > 0 && (
                        <div style={{ padding: '8px 10px', borderRadius: 4, background: 'rgba(248,113,113,0.03)', border: '1px solid rgba(248,113,113,0.06)' }}>
                          <div style={{ ...lbl, color: '#f87171', marginBottom: 3, fontSize: 7 }}>ISSUES</div>
                          {msg.critique.issues.map((issue, j) => (
                            <div key={j} style={{ fontSize: 8, color: '#f87171', lineHeight: 1.5 }}>— {issue}</div>
                          ))}
                        </div>
                      )}
                      {msg.critique.strengths.length > 0 && (
                        <div style={{ padding: '8px 10px', borderRadius: 4, background: 'rgba(52,211,153,0.03)', border: '1px solid rgba(52,211,153,0.06)' }}>
                          <div style={{ ...lbl, color: '#34d399', marginBottom: 3, fontSize: 7 }}>STRENGTHS</div>
                          {msg.critique.strengths.map((s, j) => (
                            <div key={j} style={{ fontSize: 8, color: '#34d399', lineHeight: 1.5 }}>+ {s}</div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 6 }}>
                      <b style={{ color: gradeColor }}>Score: {msg.critique.score}/12</b> — {msg.critique.summary}
                    </div>
                  </div>
                )}

                {/* Rewrite note */}
                {msg.rewriteSummary && (
                  <div style={{ fontSize: 8, color: '#a78bfa', marginBottom: 8, padding: '4px 8px', borderRadius: 3, background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.08)' }}>
                    {msg.rewriteSummary}
                  </div>
                )}

                {/* Subject */}
                {msg.subject && <div style={{ fontSize: 9, color: '#e4e9f4', marginBottom: 6 }}><b>Subject:</b> {msg.subject}</div>}

                {/* Body */}
                <pre style={{
                  ...mono, fontSize: 9, color: '#94a3b8', lineHeight: 1.6, whiteSpace: 'pre-wrap',
                  margin: 0, padding: 12, background: '#060912', borderRadius: 4, border: '1px solid rgba(36,48,78,0.12)',
                }}>{msg.body}</pre>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button onClick={() => onCopy(msg.body, msg.id)} style={actionBtn(copiedId === msg.id ? '#34d399' : '#60a5fa')}>
                    {copiedId === msg.id ? 'COPIED' : 'COPY'}
                  </button>
                  {msg.subject && (
                    <button onClick={() => onCopy(`Subject: ${msg.subject}\n\n${msg.body}`, `${msg.id}-full`)} style={actionBtn('#60a5fa')}>
                      COPY WITH SUBJECT
                    </button>
                  )}
                  {msg.status !== 'sent' && onMarkSent && (
                    <button onClick={() => onMarkSent(c.account.id, msg.channel, msg.type, msg.body)} style={actionBtn('#34d399')}>
                      MARK SENT
                    </button>
                  )}
                  {msg.channel === 'email' && msg.subject && (
                    <button onClick={() => {
                      const mailto = `mailto:?subject=${encodeURIComponent(msg.subject!)}&body=${encodeURIComponent(msg.body)}`;
                      window.open(mailto);
                    }} style={actionBtn('#34d399')}>
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

// ── Small Components ────────────────────────────────────────

function HeatBadge({ score }: { score: number }) {
  const color = score >= 60 ? '#ef4444' : score >= 35 ? '#f59e0b' : '#64748b';
  return (
    <span style={{
      ...mono, fontSize: 10, fontWeight: 700, color, width: 30, textAlign: 'center',
      padding: '2px 0', borderRadius: 3, background: `${color}12`,
    }}>
      {score}
    </span>
  );
}

function ReadinessBadge({ status }: { status: ReadinessStatus }) {
  const meta = READINESS_META[status];
  return <span style={pill(meta.color, meta.bg)}>{meta.label}</span>;
}

function actionBtn(color: string): React.CSSProperties {
  return {
    ...mono, fontSize: 8, fontWeight: 600, padding: '4px 10px', borderRadius: 3,
    background: `${color}0a`, color, border: `1px solid ${color}20`, cursor: 'pointer',
    display: 'inline-block', textAlign: 'center',
  };
}

// ── Page Export ──────────────────────────────────────────────

export default function OutreachPage() {
  return (
    <Suspense fallback={<div style={{ fontFamily: 'var(--vg-font-mono, monospace)', color: '#475569', padding: 40 }}>Loading outreach command...</div>}>
      <OutreachConsole />
    </Suspense>
  );
}
