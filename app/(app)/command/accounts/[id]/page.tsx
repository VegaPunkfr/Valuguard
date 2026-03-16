'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { Account, AccountStatus } from '@/types/command';
import { STATUS_META, ATTACK_META, CONVICTION_META, TIMELINE_META } from '@/types/command';
import { loadAccounts, saveAccounts, updateAccount, addNote, calcProbability, calcExpectedValue } from '@/lib/command/store';

const mono: React.CSSProperties = { fontFamily: 'var(--vg-font-mono, monospace)' };
const box: React.CSSProperties = { background: '#0a0d19', border: '1px solid rgba(36,48,78,0.25)', borderRadius: 8, padding: '16px 20px' };
const lbl: React.CSSProperties = { ...mono, fontSize: 8, fontWeight: 600, letterSpacing: '0.16em', color: '#475569', marginBottom: 8, textTransform: 'uppercase' as const };

const SF_META: Record<string, { l: string; c: string }> = { ideal: { l: 'IDEAL', c: '#34d399' }, good: { l: 'GOOD', c: '#60a5fa' }, stretch: { l: 'STRETCH', c: '#fbbf24' }, hard: { l: 'HARD', c: '#f87171' } };
const DP_META: Record<string, { l: string; c: string }> = { high: { l: 'HIGH', c: '#34d399' }, medium: { l: 'MED', c: '#60a5fa' }, low: { l: 'LOW', c: '#64748b' } };
function fmt(n: number) { return n >= 1000 ? `€${Math.round(n / 1000)}k` : `€${n}`; }

const STATUSES: AccountStatus[] = ['new', 'reviewing', 'scan_queued', 'scanned', 'qualified', 'outreach_ready', 'contacted', 'dropped'];

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

  return (
    <div style={mono}>
      <Link href="/command/accounts" style={{ fontSize: 9, color: '#475569', textDecoration: 'none', display: 'block', marginBottom: 10 }}>← ACCOUNTS</Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: conv.color, lineHeight: 1 }}>{a.score}<span style={{ fontSize: 11, color: '#3a4560' }}>/25</span></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#e4e9f4' }}>{a.company}</div>
          <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{a.domain} · {a.country} · {a.industry} · {a.employeeRange} emp</div>
        </div>
        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' as const, maxWidth: 380 }}>
          {STATUSES.map(s => {
            const m = STATUS_META[s];
            const active = a.status === s;
            return <button key={s} onClick={() => persist(updateAccount(accounts, id, { status: s }))} style={{ ...mono, fontSize: 7, fontWeight: 600, letterSpacing: '0.05em', padding: '2px 5px', borderRadius: 2, cursor: 'pointer', background: active ? m.bg : 'transparent', color: active ? m.color : '#3a4560', border: active ? `1px solid ${m.border}` : '1px solid rgba(36,48,78,0.10)' }}>{m.label}</button>;
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
            <div style={{ fontSize: 7, fontWeight: 600, letterSpacing: '0.12em', color: '#475569', marginBottom: 2 }}>{d.l}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: d.c }}>{d.v}</div>
          </div>
        ))}
      </div>

      {/* Two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>

        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Decision Maker */}
          <div style={box}>
            <div style={lbl}>DECISION MAKER</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#e4e9f4' }}>{a.financeLead.name}</div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{a.financeLead.title}</div>
            {a.financeLead.background && <div style={{ fontSize: 9, color: '#64748b', marginTop: 5, lineHeight: 1.5 }}>{a.financeLead.background}</div>}
            {a.financeLead.linkedIn && <a href={a.financeLead.linkedIn} target="_blank" rel="noopener noreferrer" style={{ fontSize: 9, color: '#60a5fa', marginTop: 5, display: 'inline-block', textDecoration: 'none' }}>LinkedIn →</a>}
          </div>

          {/* Signals */}
          <div style={box}>
            <div style={lbl}>SIGNALS ({a.signals.length})</div>
            {a.signals.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', marginBottom: 7 }}>
                <span style={{ fontSize: 8, fontWeight: 700, color: s.strength >= 4 ? '#34d399' : '#fbbf24', minWidth: 22, padding: '1px 3px', borderRadius: 2, background: s.strength >= 4 ? 'rgba(52,211,153,0.08)' : 'rgba(251,191,36,0.08)', textAlign: 'center' as const }}>{s.strength}/5</span>
                <div><div style={{ fontSize: 9, color: '#e4e9f4' }}>{s.detail}</div><div style={{ fontSize: 7, color: '#3a4560', marginTop: 1 }}>{s.type.toUpperCase()} · {s.source}{s.date ? ` · ${s.date}` : ''}</div></div>
              </div>
            ))}
          </div>

          {/* Hypothesis */}
          <div style={box}>
            <div style={lbl}>HYPOTHESIS</div>
            <div style={{ fontSize: 11, color: '#e4e9f4', lineHeight: 1.5, marginBottom: 8 }}>{a.hypothesis.summary}</div>
            <div style={{ fontSize: 9, color: '#94a3b8', lineHeight: 1.5, marginBottom: 8 }}><strong style={{ color: '#fbbf24' }}>Why it matters:</strong> {a.hypothesis.whyItMatters}</div>
            <div style={{ ...lbl, marginTop: 10 }}>HIDDEN EXPOSURE</div>
            <ul style={{ margin: 0, paddingLeft: 12 }}>{a.hypothesis.hiddenExposure.map((e, i) => <li key={i} style={{ fontSize: 9, color: '#94a3b8', lineHeight: 1.5 }}>{e}</li>)}</ul>
            <div style={{ fontSize: 8, color: '#64748b', marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(36,48,78,0.12)' }}><strong>Proof needed:</strong> {a.hypothesis.proofNeeded}</div>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Why Now */}
          <div style={box}>
            <div style={lbl}>WHY NOW</div>
            <div style={{ fontSize: 10, color: '#e4e9f4', lineHeight: 1.6 }}>{a.whyNow}</div>
          </div>

          {/* Strengths vs Weaknesses */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ ...box, borderLeft: '2px solid #34d399' }}>
              <div style={{ ...lbl, color: '#34d399' }}>STRENGTHS</div>
              {a.strengths.map((s, i) => <div key={i} style={{ fontSize: 9, color: '#94a3b8', lineHeight: 1.4, marginBottom: 3 }}>+ {s}</div>)}
            </div>
            <div style={{ ...box, borderLeft: '2px solid #f87171' }}>
              <div style={{ ...lbl, color: '#f87171' }}>WEAKNESSES</div>
              {a.weaknesses.map((w, i) => <div key={i} style={{ fontSize: 9, color: '#94a3b8', lineHeight: 1.4, marginBottom: 3 }}>- {w}</div>)}
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
                      <div style={{ fontSize: 9, color: '#e4e9f4' }}>{ev.detail}</div>
                      <div style={{ fontSize: 7, color: '#3a4560', marginTop: 1 }}>{meta.label} · {new Date(ev.date).toLocaleDateString()}</div>
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
                <span style={{ fontSize: 9, color: '#3a4560' }}>Not scanned</span>
                <button onClick={() => persist(updateAccount(accounts, id, { status: 'scan_queued' }))} style={{ ...mono, fontSize: 8, fontWeight: 600, padding: '4px 10px', borderRadius: 3, background: 'rgba(34,211,238,0.06)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.12)', cursor: 'pointer' }}>QUEUE</button>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: 14, marginBottom: 6 }}>
                  <div><div style={{ fontSize: 7, color: '#475569' }}>VENDORS</div><div style={{ fontSize: 13, fontWeight: 700, color: '#e4e9f4' }}>{a.scan.vendorCount}</div></div>
                  <div><div style={{ fontSize: 7, color: '#475569' }}>EXPOSURE</div><div style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24' }}>{Math.round(a.scan.exposureLow / 1000)}k-{Math.round(a.scan.exposureHigh / 1000)}k {a.scan.currency}</div></div>
                </div>
                <div style={{ fontSize: 9, color: a.scan.strengthensHypothesis ? '#34d399' : '#fbbf24' }}>{a.scan.strengthensHypothesis ? '✓ Hypothesis confirmed' : '⚠ Review needed'}</div>
              </div>
            )}
          </div>

          <div style={box}>
            <div style={lbl}>OUTREACH ({a.outreach.length})</div>
            {a.outreach.map((o, i) => (
              <Link key={i} href={`/command/outreach?account=${a.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 3, background: 'rgba(14,18,33,0.3)', border: '1px solid rgba(36,48,78,0.06)', marginBottom: 3 }}>
                <span style={{ fontSize: 8, fontWeight: 600, color: '#94a3b8', width: 60, textTransform: 'uppercase' as const }}>{o.channel}</span>
                <span style={{ fontSize: 8, color: '#64748b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{o.hook}</span>
                <span style={{ fontSize: 7, fontWeight: 600, color: o.status === 'draft' ? '#fbbf24' : '#34d399' }}>{o.status.toUpperCase()}</span>
              </Link>
            ))}
          </div>

          <div style={box}>
            <div style={lbl}>EXECUTION LOG</div>
            {a.executionLog.length === 0 && <div style={{ fontSize: 9, color: '#3a4560', marginBottom: 6 }}>No actions yet</div>}
            {a.executionLog.map((e, i) => (
              <div key={i} style={{ fontSize: 8, color: '#94a3b8', marginBottom: 3, paddingLeft: 7, borderLeft: '1px solid rgba(96,165,250,0.15)' }}>
                <span style={{ color: '#475569' }}>{new Date(e.date).toLocaleDateString()}</span> — {e.action}{e.result ? ` → ${e.result}` : ''}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
              <input value={noteText} onChange={e => setNoteText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddNote()} placeholder="Log action..." style={{ ...mono, fontSize: 9, flex: 1, background: '#060912', border: '1px solid rgba(36,48,78,0.20)', borderRadius: 3, padding: '5px 8px', color: '#e4e9f4', outline: 'none' }} />
              <button onClick={handleAddNote} style={{ ...mono, fontSize: 8, fontWeight: 600, padding: '5px 10px', borderRadius: 3, background: 'rgba(96,165,250,0.06)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.12)', cursor: 'pointer' }}>LOG</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
