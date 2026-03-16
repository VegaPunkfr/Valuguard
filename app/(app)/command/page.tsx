'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const mono: React.CSSProperties = { fontFamily: 'var(--vg-font-mono, monospace)' };
const box: React.CSSProperties = { background: '#0a0d19', border: '1px solid rgba(36,48,78,0.25)', borderRadius: 8, padding: '16px 20px' };
const lbl: React.CSSProperties = { ...mono, fontSize: 8, fontWeight: 600, letterSpacing: '0.16em', color: '#475569', marginBottom: 10, textTransform: 'uppercase' as const };

function fmt(n: number): string { return n >= 1000 ? `€${Math.round(n / 1000)}k` : `€${n}`; }

export default function CommandOverview() {
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    accounts: Array<{
      id: string; company: string; domain: string; country: string; score: number;
      mainSignal: string; attackability: string; conviction: string; solofit: string;
      dealPotential: string; revenueEstimate: number; status: string;
      financeLead: { name: string; title: string };
      outreach: Array<{ status: string }>;
      timeline: Array<{ detail: string; date: string }>;
      scan?: { strengthensHypothesis: boolean };
      signals: Array<{ strength: number }>;
      nextAction: string;
      weaknesses: string[];
      strengths: string[];
    }>;
  } | null>(null);

  useEffect(() => {
    try {
      // Dynamic import to isolate any module errors
      import('@/lib/command/store').then(mod => {
        try {
          const accounts = mod.loadAccounts();
          setData({ accounts: accounts as typeof data extends null ? never : NonNullable<typeof data>['accounts'] });
        } catch (e) {
          setError(`loadAccounts failed: ${e instanceof Error ? e.message : String(e)}`);
        }
      }).catch(e => {
        setError(`Import failed: ${e instanceof Error ? e.message : String(e)}`);
      });
    } catch (e) {
      setError(`Init failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, []);

  if (error) {
    return (
      <div style={{ ...mono, color: '#f87171', padding: 40 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Command Center Error</div>
        <pre style={{ fontSize: 11, color: '#f87171', background: '#0a0d19', padding: 16, borderRadius: 8, whiteSpace: 'pre-wrap' as const }}>{error}</pre>
        <button onClick={() => { try { localStorage.clear(); } catch {} window.location.reload(); }}
          style={{ ...mono, marginTop: 16, fontSize: 10, padding: '8px 16px', background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 6, cursor: 'pointer' }}>
          CLEAR CACHE & RELOAD
        </button>
      </div>
    );
  }

  if (!data) {
    return <div style={{ ...mono, color: '#475569', padding: 40 }}>Loading Mission Control...</div>;
  }

  const accounts = data.accounts;
  const active = accounts.filter(a => a.status !== 'dropped');
  const attackNow = active.filter(a => a.attackability === 'now').sort((a, b) => b.score - a.score);
  const scanNeeded = active.filter(a => !a.scan).sort((a, b) => b.score - a.score);
  const outreachReady = active.filter(a => a.outreach.length > 0 && a.outreach.some(o => o.status === 'draft') && a.attackability === 'now');
  const killCandidates = active.filter(a => a.conviction === 'low' || a.attackability === 'blocked' || a.weaknesses.length > a.strengths.length);

  // Simple probability calc inline (no external dependency)
  const calcProb = (a: typeof accounts[0]) => {
    const atkP: Record<string, number> = { now: 28, soon: 16, later: 7, blocked: 2 };
    const conP: Record<string, number> = { very_high: 22, high: 16, moderate: 8, low: 3 };
    const sfP: Record<string, number> = { ideal: 10, good: 7, stretch: 3, hard: 1 };
    let p = (atkP[a.attackability] || 10) + (conP[a.conviction] || 5) + (sfP[a.solofit] || 5);
    const avg = a.signals.length > 0 ? a.signals.reduce((s, sig) => s + sig.strength, 0) / a.signals.length : 0;
    if (avg >= 4) p += 4;
    if (a.scan?.strengthensHypothesis) p += 6;
    return Math.min(70, Math.max(1, p));
  };
  const calcEV = (a: typeof accounts[0]) => Math.round(calcProb(a) / 100 * a.revenueEstimate);

  const totalPipeline = active.reduce((s, a) => s + a.revenueEstimate, 0);
  const weightedPipeline = active.reduce((s, a) => s + calcEV(a), 0);
  const topEV = [...active].sort((a, b) => calcEV(b) - calcEV(a)).slice(0, 3);

  const CONV_CLR: Record<string, string> = { very_high: '#34d399', high: '#60a5fa', moderate: '#fbbf24', low: '#64748b' };
  const ATK_LBL: Record<string, string> = { now: 'ATTACK NOW', soon: 'SCAN FIRST', later: 'HOLD', blocked: 'BLOCKED' };
  const ATK_CLR: Record<string, string> = { now: '#34d399', soon: '#60a5fa', later: '#fbbf24', blocked: '#f87171' };

  return (
    <div style={mono}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 20 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#e4e9f4' }}>Mission Control</span>
        <span style={{ fontSize: 10, color: '#475569' }}>
          {active.length} active · {attackNow.length} attack now · Pipeline {fmt(totalPipeline)} · Weighted {fmt(weightedPipeline)}
        </span>
      </div>

      {/* ATTACK NOW + TOP EV */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ ...box, borderLeft: '3px solid #34d399' }}>
          <div style={{ ...lbl, color: '#34d399' }}>ATTACK NOW</div>
          {attackNow.length === 0 ? <div style={{ fontSize: 10, color: '#3a4560' }}>No accounts ready</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {attackNow.slice(0, 4).map((a, i) => {
                const prob = calcProb(a);
                const ev = calcEV(a);
                return (
                  <Link key={a.id} href={`/command/accounts/${a.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 6, background: i === 0 ? 'rgba(52,211,153,0.04)' : 'rgba(14,18,33,0.3)', border: i === 0 ? '1px solid rgba(52,211,153,0.12)' : '1px solid rgba(36,48,78,0.08)' }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: i === 0 ? '#34d399' : '#3a4560', width: 22, textAlign: 'center' as const }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#e4e9f4' }}>{a.company}</span>
                        <span style={{ fontSize: 8, color: '#475569' }}>{a.country}</span>
                      </div>
                      <div style={{ fontSize: 9, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{a.mainSignal}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                      <div style={{ textAlign: 'center' as const }}><div style={{ fontSize: 12, fontWeight: 700, color: prob >= 40 ? '#34d399' : '#60a5fa' }}>{prob}%</div><div style={{ fontSize: 7, color: '#3a4560' }}>PROB</div></div>
                      <div style={{ textAlign: 'center' as const }}><div style={{ fontSize: 12, fontWeight: 700, color: '#e4e9f4' }}>{fmt(a.revenueEstimate)}</div><div style={{ fontSize: 7, color: '#3a4560' }}>REV</div></div>
                      <div style={{ textAlign: 'center' as const }}><div style={{ fontSize: 12, fontWeight: 700, color: ev >= 5000 ? '#34d399' : '#60a5fa' }}>{fmt(ev)}</div><div style={{ fontSize: 7, color: '#3a4560' }}>EV</div></div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        <div style={{ ...box, borderLeft: '3px solid #a78bfa' }}>
          <div style={{ ...lbl, color: '#a78bfa' }}>TOP EXPECTED VALUE</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {topEV.map(a => {
              const prob = calcProb(a);
              const ev = calcEV(a);
              return (
                <Link key={a.id} href={`/command/accounts/${a.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 4, background: 'rgba(14,18,33,0.3)', border: '1px solid rgba(36,48,78,0.08)' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#e4e9f4', flex: 1 }}>{a.company}</span>
                  <span style={{ fontSize: 10, color: '#64748b' }}>{prob}% × {fmt(a.revenueEstimate)}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa' }}>{fmt(ev)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* SCAN + OUTREACH + KILL */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ ...box, borderLeft: '3px solid #22d3ee' }}>
          <div style={{ ...lbl, color: '#22d3ee' }}>SCAN NEXT ({scanNeeded.length})</div>
          {scanNeeded.slice(0, 3).map(a => (
            <Link key={a.id} href={`/command/accounts/${a.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: CONV_CLR[a.conviction] || '#64748b', width: 20 }}>{a.score}</span>
              <span style={{ fontSize: 10, color: '#e4e9f4' }}>{a.company}</span>
              <span style={{ fontSize: 8, color: '#475569' }}>{a.domain}</span>
            </Link>
          ))}
          <Link href="/command/scan" style={{ ...mono, fontSize: 9, color: '#22d3ee', textDecoration: 'none', marginTop: 4, display: 'block' }}>Scan Center →</Link>
        </div>
        <div style={{ ...box, borderLeft: '3px solid #a78bfa' }}>
          <div style={{ ...lbl, color: '#a78bfa' }}>OUTREACH READY ({outreachReady.length})</div>
          {outreachReady.length === 0 ? <div style={{ fontSize: 9, color: '#3a4560' }}>Scan first, qualify, then outreach</div> : outreachReady.slice(0, 3).map(a => (
            <div key={a.id} style={{ fontSize: 10, color: '#e4e9f4', marginBottom: 4 }}>{a.company} <span style={{ fontSize: 8, color: '#64748b' }}>{a.outreach.filter(o => o.status === 'draft').length} drafts</span></div>
          ))}
          <Link href="/command/outreach" style={{ ...mono, fontSize: 9, color: '#a78bfa', textDecoration: 'none', marginTop: 4, display: 'block' }}>Outreach Console →</Link>
        </div>
        <div style={{ ...box, borderLeft: '3px solid #f87171' }}>
          <div style={{ ...lbl, color: '#f87171' }}>KILL FAST ({killCandidates.length})</div>
          {killCandidates.length === 0 ? <div style={{ fontSize: 9, color: '#34d399' }}>Pipeline clean</div> : killCandidates.map(a => (
            <Link key={a.id} href={`/command/accounts/${a.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: '#94a3b8' }}>{a.company}</span>
              <span style={{ fontSize: 8, color: '#f87171' }}>{a.conviction === 'low' ? 'Low conv.' : 'Weak hyp.'}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Pipeline + Next Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={box}>
          <div style={lbl}>PIPELINE</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { n: active.length, l: 'Active', c: '#e4e9f4' },
              { n: attackNow.length, l: 'Attack Now', c: '#34d399' },
              { n: accounts.filter(a => a.status === 'contacted').length, l: 'Contacted', c: '#94a3b8' },
              { n: accounts.filter(a => a.status === 'dropped').length, l: 'Dropped', c: '#f87171' },
            ].map(m => (
              <div key={m.l} style={{ textAlign: 'center' as const }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: m.c, lineHeight: 1 }}>{m.n}</div>
                <div style={{ fontSize: 7, color: '#475569', letterSpacing: '0.1em', marginTop: 3 }}>{m.l.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={box}>
          <div style={lbl}>NEXT ACTIONS</div>
          {[...active].sort((a, b) => b.score - a.score).slice(0, 5).map(a => (
            <Link key={a.id} href={`/command/accounts/${a.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: CONV_CLR[a.conviction] || '#64748b', width: 18 }}>{a.score}</span>
              <span style={{ fontSize: 9, fontWeight: 600, color: '#94a3b8', width: 72 }}>{a.company}</span>
              <span style={{ fontSize: 9, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{a.nextAction}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
