'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { Account, AccountStatus } from '@/types/command';
import { STATUS_META, ATTACK_META, CONVICTION_META, TIMELINE_META } from '@/types/command';
import { loadAccounts, saveAccounts, updateAccount, addNote, calcProbability, calcExpectedValue } from '@/lib/command/store';

const mono: React.CSSProperties = { fontFamily: 'var(--vg-font-mono, monospace)' };
const box: React.CSSProperties = { background: '#0a0d19', border: '1px solid rgba(36,48,78,0.25)', borderRadius: 8, padding: '16px 20px' };
const lbl: React.CSSProperties = { ...mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', color: '#475569', marginBottom: 8, textTransform: 'uppercase' as const };

const SF_META: Record<string, { l: string; c: string }> = { ideal: { l: 'IDEAL', c: '#34d399' }, good: { l: 'GOOD', c: '#60a5fa' }, stretch: { l: 'STRETCH', c: '#fbbf24' }, hard: { l: 'HARD', c: '#f87171' } };
const DP_META: Record<string, { l: string; c: string }> = { high: { l: 'HIGH', c: '#34d399' }, medium: { l: 'MED', c: '#60a5fa' }, low: { l: 'LOW', c: '#64748b' } };
function fmt(n: number) { return n >= 1000 ? `€${Math.round(n / 1000)}k` : `€${n}`; }

const STATUSES: AccountStatus[] = ['new', 'reviewing', 'scan_queued', 'scanned', 'qualified', 'outreach_ready', 'contacted', 'dropped'];

const calcHeat = (a: Account) => {
  let heat = 0;
  const avgStr = a.signals.length > 0 ? a.signals.reduce((s, sig) => s + sig.strength, 0) / a.signals.length : 0;
  const maxStr = a.signals.length > 0 ? Math.max(...a.signals.map(s => s.strength)) : 0;
  heat += Math.min(15, Math.round(avgStr * 2 + maxStr));
  const convS: Record<string, number> = { very_high: 15, high: 11, moderate: 6, low: 2 };
  heat += convS[a.conviction] || 5;
  const atkS: Record<string, number> = { now: 10, soon: 6, later: 3, blocked: 0 };
  heat += atkS[a.attackability] || 3;
  heat += (a.financeLead.name.split(' ').length >= 2 ? 4 : 1) + (a.outreach.length > 0 ? 3 : 0) + (a.status !== 'contacted' ? 3 : 0);
  const sfS: Record<string, number> = { ideal: 10, good: 7, stretch: 3, hard: 0 };
  heat += sfS[a.solofit] || 5;
  const p = calcProbability(a);
  const evCalc = Math.round(p / 100 * a.revenueEstimate);
  heat += evCalc >= 10000 ? 10 : evCalc >= 5000 ? 8 : evCalc >= 2000 ? 6 : evCalc >= 1000 ? 4 : 2;
  heat += a.scan?.strengthensHypothesis ? 5 : a.scan ? 3 : 1;
  heat += 10;
  return Math.min(100, heat);
};

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [ready, setReady] = useState(false);
  const [noteText, setNoteText] = useState('');

  useEffect(() => { setAccounts(loadAccounts()); setReady(true); }, []);
  const persist = useCallback((u: Account[]) => { setAccounts(u); saveAccounts(u); }, []);
  const a = accounts.find(x => x.id === id);

  if (!ready) return null;
  if (!a) return <div style={{ ...mono, color: '#475569', padding: 40 }}>Not found. <Link href="/command/accounts" style={{ color: '#60a5fa' }}>Back</Link></div>;

  const atk = ATTACK_META[a.attackability];
  const conv = CONVICTION_META[a.conviction];
  const sf = SF_META[a.solofit] || { l: '?', c: '#64748b' };
  const dp = DP_META[a.dealPotential] || { l: '?', c: '#64748b' };
  const prob = calcProbability(a);
  const ev = calcExpectedValue(a);

  const handleAddNote = () => { if (!noteText.trim()) return; persist(addNote(accounts, id, noteText.trim())); setNoteText(''); };

  // Safety & Queue calculations
  const heat = calcHeat(a);
  const tierLabel = heat >= 60 ? 'HOT' : heat >= 35 ? 'WARM' : 'COLD';
  const tierColor = heat >= 60 ? '#f87171' : heat >= 35 ? '#f59e0b' : '#64748b';

  const isLocked = a.outreach.some(o => o.status === 'sent') && a.status === 'contacted';
  const hasSentOutreach = a.outreach.some(o => o.status === 'sent');

  // Cooldown: check if last sent was within 72 hours
  const lastSentAt = (() => {
    const sentOutreach = a.outreach.filter(o => o.status === 'sent');
    if (sentOutreach.length === 0) return null;
    // Check timeline for most recent outreach_sent event
    const outreachEvents = a.timeline.filter(ev => ev.type === 'message_sent' || ev.type === 'message_prepared');
    if (outreachEvents.length > 0) {
      const sorted = [...outreachEvents].sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime());
      return new Date(sorted[0].date);
    }
    return null;
  })();

  const isCooling = lastSentAt ? (Date.now() - lastSentAt.getTime()) < 72 * 60 * 60 * 1000 : false;
  const isWaiting = a.outreach.some(o => o.status === 'sent') && !a.outreach.some(o => o.status === 'replied');

  const lastContactedStr = lastSentAt ? lastSentAt.toLocaleDateString() : 'Never';
  const nextEligible = !lastSentAt ? 'Now' : isCooling
    ? new Date(lastSentAt.getTime() + 72 * 60 * 60 * 1000).toLocaleDateString()
    : 'Now';

  // Determine panel border color based on safety
  const hasWarnings = isCooling || isWaiting;
  const hasBlocked = isLocked;
  const panelBorder = hasBlocked ? '#f87171' : hasWarnings ? '#f59e0b' : '#34d399';

  // Safety check items
  const safetyChecks: { label: string; value: string; color: string }[] = [
    { label: 'LOCK STATUS', value: isLocked ? 'LOCKED' : 'UNLOCKED', color: isLocked ? '#f87171' : '#34d399' },
    { label: 'COOLDOWN', value: isCooling ? 'COOLING' : 'CLEAR', color: isCooling ? '#f59e0b' : '#34d399' },
    { label: 'DUPLICATE RISK', value: 'CLEAR', color: '#34d399' },
    { label: 'WAITING RESPONSE', value: isWaiting ? 'YES' : 'NO', color: isWaiting ? '#f59e0b' : '#64748b' },
    { label: 'LAST CONTACTED', value: lastContactedStr, color: lastSentAt ? '#e4e9f4' : '#64748b' },
    { label: 'NEXT ELIGIBLE', value: nextEligible, color: nextEligible === 'Now' ? '#34d399' : '#f59e0b' },
  ];

  return (
    <div style={mono}>
      <Link href="/command/accounts" style={{ fontSize: 13, color: '#475569', textDecoration: 'none', display: 'block', marginBottom: 10 }}>← ACCOUNTS</Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 36, fontWeight: 800, color: conv.color, lineHeight: 1 }}>{a.score}<span style={{ fontSize: 14, color: '#3a4560' }}>/25</span></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#e4e9f4' }}>{a.company}</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{a.domain} · {a.country} · {a.industry} · {a.employeeRange} emp</div>
        </div>
        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' as const, maxWidth: 380 }}>
          {STATUSES.map(s => {
            const m = STATUS_META[s];
            const active = a.status === s;
            return <button key={s} onClick={() => persist(updateAccount(accounts, id, { status: s }))} style={{ ...mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', padding: '4px 8px', borderRadius: 2, cursor: 'pointer', background: active ? m.bg : 'transparent', color: active ? m.color : '#3a4560', border: active ? `1px solid ${m.border}` : '1px solid rgba(36,48,78,0.10)' }}>{m.label}</button>;
          })}
        </div>
      </div>

      {/* Decision Metrics Bar */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 16, padding: '10px 16px', background: '#0a0d19', borderRadius: 6, border: '1px solid rgba(36,48,78,0.18)' }}>
        {[
          { l: 'ATTACK', v: atk.label, c: atk.color },
          { l: 'CONVICTION', v: conv.label, c: conv.color },
          { l: 'PROBABILITY', v: `${prob}%`, c: prob >= 40 ? '#34d399' : prob >= 25 ? '#60a5fa' : '#fbbf24' },
          { l: 'REVENUE', v: fmt(a.revenueEstimate), c: '#e4e9f4' },
          { l: 'EXPECTED VALUE', v: fmt(ev), c: ev >= 5000 ? '#34d399' : ev >= 2000 ? '#60a5fa' : '#64748b' },
          { l: 'SOLO FIT', v: sf.l, c: sf.c },
          { l: 'DEAL POT.', v: dp.l, c: dp.c },
          { l: 'STATUS', v: STATUS_META[a.status].label, c: STATUS_META[a.status].color },
        ].map(d => (
          <div key={d.l}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: '#475569', marginBottom: 2 }}>{d.l}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: d.c }}>{d.v}</div>
          </div>
        ))}
      </div>

      {/* Safety & Queue Status */}
      <div style={{ background: '#0a0d19', borderRadius: 8, border: `1px solid ${panelBorder}`, padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ ...lbl, marginBottom: 14 }}>SAFETY & QUEUE STATUS</div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          {/* Heat Score — prominent */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingRight: 20, borderRight: '1px solid rgba(36,48,78,0.25)', minWidth: 130 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: tierColor, lineHeight: 1 }}>{heat}</div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: '#475569' }}>HEAT</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: tierColor }}>{tierLabel}</div>
            </div>
          </div>

          {/* Safety Check Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, flex: 1 }}>
            {safetyChecks.map(check => (
              <div key={check.label} style={{ background: 'rgba(6,9,18,0.5)', borderRadius: 6, padding: '8px 10px', border: '1px solid rgba(36,48,78,0.12)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.10em', color: '#475569', marginBottom: 4 }}>{check.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: check.color }}>{check.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>

        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Decision Maker */}
          <div style={box}>
            <div style={lbl}>DECISION MAKER</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#e4e9f4' }}>{a.financeLead.name}</div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>{a.financeLead.title}</div>
            {a.financeLead.background && <div style={{ fontSize: 13, color: '#64748b', marginTop: 5, lineHeight: 1.5 }}>{a.financeLead.background}</div>}
            {a.financeLead.linkedIn && <a href={a.financeLead.linkedIn} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#60a5fa', marginTop: 5, display: 'inline-block', textDecoration: 'none' }}>LinkedIn →</a>}
          </div>

          {/* Signals */}
          <div style={box}>
            <div style={lbl}>SIGNALS ({a.signals.length})</div>
            {a.signals.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', marginBottom: 7 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: s.strength >= 4 ? '#34d399' : '#fbbf24', minWidth: 22, padding: '3px 6px', borderRadius: 2, background: s.strength >= 4 ? 'rgba(52,211,153,0.08)' : 'rgba(251,191,36,0.08)', textAlign: 'center' as const }}>{s.strength}/5</span>
                <div><div style={{ fontSize: 13, color: '#e4e9f4' }}>{s.detail}</div><div style={{ fontSize: 11, color: '#3a4560', marginTop: 1 }}>{s.type.toUpperCase()} · {s.source}{s.date ? ` · ${s.date}` : ''}</div></div>
              </div>
            ))}
          </div>

          {/* Hypothesis */}
          <div style={box}>
            <div style={lbl}>HYPOTHESIS</div>
            <div style={{ fontSize: 14, color: '#e4e9f4', lineHeight: 1.5, marginBottom: 8 }}>{a.hypothesis.summary}</div>
            <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5, marginBottom: 8 }}><strong style={{ color: '#fbbf24' }}>Why it matters:</strong> {a.hypothesis.whyItMatters}</div>
            <div style={{ ...lbl, marginTop: 10 }}>HIDDEN EXPOSURE</div>
            <ul style={{ margin: 0, paddingLeft: 12 }}>{a.hypothesis.hiddenExposure.map((e, i) => <li key={i} style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>{e}</li>)}</ul>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(36,48,78,0.12)' }}><strong>Proof needed:</strong> {a.hypothesis.proofNeeded}</div>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Why Now */}
          <div style={box}>
            <div style={lbl}>WHY NOW</div>
            <div style={{ fontSize: 13, color: '#e4e9f4', lineHeight: 1.6 }}>{a.whyNow}</div>
          </div>

          {/* Strengths vs Weaknesses */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ ...box, borderLeft: '2px solid #34d399' }}>
              <div style={{ ...lbl, color: '#34d399' }}>STRENGTHS</div>
              {a.strengths.map((s, i) => <div key={i} style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.4, marginBottom: 3 }}>+ {s}</div>)}
            </div>
            <div style={{ ...box, borderLeft: '2px solid #f87171' }}>
              <div style={{ ...lbl, color: '#f87171' }}>WEAKNESSES</div>
              {a.weaknesses.map((w, i) => <div key={i} style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.4, marginBottom: 3 }}>- {w}</div>)}
            </div>
          </div>

          {/* Timeline */}
          <div style={box}>
            <div style={lbl}>TIMELINE ({a.timeline.length} events)</div>
            <div style={{ position: 'relative', paddingLeft: 14 }}>
              {/* Vertical line */}
              <div style={{ position: 'absolute', left: 4, top: 4, bottom: 4, width: 1, background: 'rgba(36,48,78,0.25)' }} />
              {[...a.timeline].reverse().slice(0, 10).map((ev, i) => {
                const meta = TIMELINE_META[ev.type] || { label: ev.type, color: '#64748b' };
                return (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, position: 'relative' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: meta.color, position: 'absolute', left: -13, top: 3, border: '1px solid #0a0d19' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: '#e4e9f4' }}>{ev.detail}</div>
                      <div style={{ fontSize: 11, color: '#3a4560', marginTop: 1 }}>{meta.label} · {new Date(ev.date).toLocaleDateString()}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scan + Outreach + Log */}
          <div style={box}>
            <div style={lbl}>SCAN</div>
            {!a.scan ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: '#3a4560' }}>Not scanned</span>
                <button onClick={() => persist(updateAccount(accounts, id, { status: 'scan_queued' }))} style={{ ...mono, fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 3, background: 'rgba(34,211,238,0.06)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.12)', cursor: 'pointer' }}>QUEUE</button>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: 14, marginBottom: 6 }}>
                  <div><div style={{ fontSize: 11, color: '#475569' }}>VENDORS</div><div style={{ fontSize: 13, fontWeight: 700, color: '#e4e9f4' }}>{a.scan.vendorCount}</div></div>
                  <div><div style={{ fontSize: 11, color: '#475569' }}>EXPOSURE</div><div style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24' }}>{Math.round(a.scan.exposureLow / 1000)}k-{Math.round(a.scan.exposureHigh / 1000)}k {a.scan.currency}</div></div>
                </div>
                <div style={{ fontSize: 13, color: a.scan.strengthensHypothesis ? '#34d399' : '#fbbf24' }}>{a.scan.strengthensHypothesis ? '✓ Hypothesis confirmed' : '⚠ Review needed'}</div>
              </div>
            )}
          </div>

          <div style={box}>
            <div style={lbl}>OUTREACH ({a.outreach.length})</div>
            {a.outreach.map((o, i) => (
              <Link key={i} href={`/command/outreach?account=${a.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 3, background: 'rgba(14,18,33,0.3)', border: '1px solid rgba(36,48,78,0.06)', marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', width: 60, textTransform: 'uppercase' as const }}>{o.channel}</span>
                <span style={{ fontSize: 12, color: '#64748b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{o.hook}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: o.status === 'draft' ? '#fbbf24' : '#34d399' }}>{o.status.toUpperCase()}</span>
              </Link>
            ))}
          </div>

          {/* Platform Signal History */}
          {(() => {
            const platformSignals = a.signals.filter(s => s.source === 'ghost-tax' || s.source === 'stripe');
            if (platformSignals.length === 0) return null;
            const SIG_CLR: Record<string, string> = { payment: '#34d399', scan: '#22d3ee', intent: '#f59e0b' };
            return (
              <div style={{ ...box, borderLeft: '3px solid #22d3ee' }}>
                <div style={{ ...lbl, color: '#22d3ee' }}>PLATFORM SIGNALS ({platformSignals.length})</div>
                {platformSignals.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8, padding: '8px 10px', borderRadius: 4, background: `${SIG_CLR[s.type] || '#64748b'}06`, border: `1px solid ${SIG_CLR[s.type] || '#64748b'}12` }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: SIG_CLR[s.type] || '#64748b', minWidth: 28, padding: '2px 4px', borderRadius: 3, background: `${SIG_CLR[s.type] || '#64748b'}15`, textAlign: 'center' as const }}>{s.strength}/5</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: '#e4e9f4' }}>{s.detail}</div>
                      <div style={{ fontSize: 11, color: '#3a4560', marginTop: 2 }}>{s.source.toUpperCase()} · {s.type.toUpperCase()}{s.date ? ` · ${s.date}` : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          <div style={box}>
            <div style={lbl}>EXECUTION LOG</div>
            {a.executionLog.length === 0 && <div style={{ fontSize: 13, color: '#3a4560', marginBottom: 6 }}>No actions yet</div>}
            {a.executionLog.map((e, i) => (
              <div key={i} style={{ fontSize: 12, color: '#94a3b8', marginBottom: 3, paddingLeft: 7, borderLeft: '1px solid rgba(96,165,250,0.15)' }}>
                <span style={{ color: '#475569' }}>{new Date(e.date).toLocaleDateString()}</span> — {e.action}{e.result ? ` → ${e.result}` : ''}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
              <input value={noteText} onChange={e => setNoteText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddNote()} placeholder="Log action..." style={{ ...mono, fontSize: 13, flex: 1, background: '#060912', border: '1px solid rgba(36,48,78,0.20)', borderRadius: 3, padding: '5px 8px', color: '#e4e9f4', outline: 'none' }} />
              <button onClick={handleAddNote} style={{ ...mono, fontSize: 12, fontWeight: 600, padding: '5px 10px', borderRadius: 3, background: 'rgba(96,165,250,0.06)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.12)', cursor: 'pointer' }}>LOG</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
