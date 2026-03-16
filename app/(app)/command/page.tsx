'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { processEventIntoAccounts, type PlatformEvent } from '@/lib/command/bridge';
import { loadDomainIntel, saveDomainIntel, learnDomainPattern, resolveAllEmails } from '@/lib/command/email-resolver';

const mono: React.CSSProperties = { fontFamily: 'var(--vg-font-mono, monospace)' };
const box: React.CSSProperties = { background: '#0a0d19', border: '1px solid rgba(36,48,78,0.25)', borderRadius: 10, padding: '20px 24px' };
const lbl: React.CSSProperties = { ...mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', color: '#475569', marginBottom: 12, textTransform: 'uppercase' as const };

function fmt(n: number): string { return n >= 1000 ? `€${Math.round(n / 1000)}k` : `€${n}`; }

const MAX_QUEUE = 30;

// ── Incoming Signal types ────────────────────────────────
interface IncomingSignal {
  id: number;
  event_type: string;
  domain: string;
  email?: string;
  company_name?: string;
  contact_name?: string;
  headcount?: number;
  industry?: string;
  country?: string;
  event_data?: Record<string, unknown>;
  created_at: string;
}

const EVT_CLR: Record<string, string> = {
  lead_captured: '#60a5fa',
  scan_completed: '#22d3ee',
  payment_completed: '#34d399',
  checkout_abandoned: '#f59e0b',
  contact_form_submitted: '#a78bfa',
  high_intent_detected: '#f59e0b',
  return_visit: '#64748b',
  memo_copied: '#ef4444',
};
const EVT_LABEL: Record<string, string> = {
  lead_captured: 'LEAD',
  scan_completed: 'SCAN',
  payment_completed: 'PAYMENT',
  checkout_abandoned: 'ABANDON',
  contact_form_submitted: 'CONTACT',
  high_intent_detected: 'INTENT',
  return_visit: 'RETURN',
  memo_copied: 'MEMO',
};

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
  const [storeRef, setStoreRef] = useState<{ saveAccounts: (a: any[]) => void } | null>(null);
  const [signals, setSignals] = useState<IncomingSignal[]>([]);
  const [signalLoading, setSignalLoading] = useState(false);
  const [processedIds, setProcessedIds] = useState<Set<number>>(new Set());

  // Load accounts
  useEffect(() => {
    try {
      import('@/lib/command/store').then(mod => {
        try {
          const accounts = mod.loadAccounts();
          setData({ accounts: accounts as typeof data extends null ? never : NonNullable<typeof data>['accounts'] });
          setStoreRef({ saveAccounts: mod.saveAccounts });
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

  // Poll for incoming signals
  const fetchSignals = useCallback(async () => {
    try {
      setSignalLoading(true);
      const res = await fetch('/api/command/ingest');
      if (res.ok) {
        const json = await res.json();
        setSignals(json.events || []);
      }
    } catch { /* silent */ }
    finally { setSignalLoading(false); }
  }, []);

  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 60_000); // Poll every 60s
    return () => clearInterval(interval);
  }, [fetchSignals]);

  // Mark event as processed server-side
  const markProcessed = useCallback(async (id: number) => {
    try {
      await fetch('/api/command/ingest', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });
    } catch { /* non-fatal */ }
  }, []);

  // Accept a signal → process into accounts via bridge + mark server-side
  const acceptSignal = useCallback((signal: IncomingSignal) => {
    if (!data || !storeRef) return;
    const event: PlatformEvent = {
      type: signal.event_type as PlatformEvent['type'],
      domain: signal.domain,
      email: signal.email,
      companyName: signal.company_name,
      contactName: signal.contact_name,
      headcount: signal.headcount,
      industry: signal.industry,
      country: signal.country,
      data: signal.event_data,
      timestamp: signal.created_at,
    };
    const result = processEventIntoAccounts(data.accounts as any[], event);
    let updatedAccounts = result.accounts;

    // Learn email pattern from incoming lead emails
    if (signal.email && signal.domain) {
      let domainIntel = loadDomainIntel();
      domainIntel = learnDomainPattern(signal.email, signal.contact_name || '', domainIntel);
      saveDomainIntel(domainIntel);
      // Resolve emails for all accounts using updated intel
      const resolved = resolveAllEmails(updatedAccounts as any[], domainIntel);
      updatedAccounts = resolved.accounts;
    }

    setData({ accounts: updatedAccounts as any });
    storeRef.saveAccounts(updatedAccounts);
    setProcessedIds(prev => new Set([...prev, signal.id]));
    markProcessed(signal.id);
  }, [data, storeRef, markProcessed]);

  // Dismiss a signal + mark server-side
  const dismissSignal = useCallback((id: number) => {
    setProcessedIds(prev => new Set([...prev, id]));
    markProcessed(id);
  }, [markProcessed]);

  if (error) {
    return (
      <div style={{ ...mono, color: '#f87171', padding: 40 }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Command Center Error</div>
        <pre style={{ fontSize: 13, color: '#f87171', background: '#0a0d19', padding: 16, borderRadius: 8, whiteSpace: 'pre-wrap' as const }}>{error}</pre>
        <button onClick={() => { try { localStorage.clear(); } catch {} window.location.reload(); }}
          style={{ ...mono, marginTop: 16, fontSize: 12, padding: '10px 20px', background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 6, cursor: 'pointer' }}>
          CLEAR CACHE & RELOAD
        </button>
      </div>
    );
  }

  if (!data) {
    return <div style={{ ...mono, color: '#475569', padding: 40, fontSize: 14 }}>Loading Mission Control...</div>;
  }

  const accounts = data.accounts;
  const active = accounts.filter(a => a.status !== 'dropped');
  const attackNow = active.filter(a => a.attackability === 'now').sort((a, b) => b.score - a.score);
  const scanNeeded = active.filter(a => !a.scan).sort((a, b) => b.score - a.score);
  const outreachReady = active.filter(a => a.outreach.length > 0 && a.outreach.some(o => o.status === 'draft') && a.attackability === 'now');
  const killCandidates = active.filter(a => a.conviction === 'low' || a.attackability === 'blocked' || a.weaknesses.length > a.strengths.length);

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

  // --- HOT QUEUE: inline heat score ---
  const calcHeat = (a: typeof accounts[0]) => {
    let heat = 0;
    // Signal strength (0-15)
    const avgStr = a.signals.length > 0 ? a.signals.reduce((s, sig) => s + sig.strength, 0) / a.signals.length : 0;
    const maxStr = a.signals.length > 0 ? Math.max(...a.signals.map(s => s.strength)) : 0;
    heat += Math.min(15, Math.round(avgStr * 2 + maxStr));
    // Conviction (0-15)
    const convScores: Record<string, number> = { very_high: 15, high: 11, moderate: 6, low: 2 };
    heat += convScores[a.conviction] || 5;
    // Attackability (0-10)
    const atkScores: Record<string, number> = { now: 10, soon: 6, later: 3, blocked: 0 };
    heat += atkScores[a.attackability] || 3;
    // Contact quality (0-10)
    heat += (a.financeLead.name.split(' ').length >= 2 ? 4 : 1) + (a.outreach.length > 0 ? 3 : 0) + (a.status !== 'contacted' ? 3 : 0);
    // Solofit (0-10)
    const sfScores: Record<string, number> = { ideal: 10, good: 7, stretch: 3, hard: 0 };
    heat += sfScores[a.solofit] || 5;
    // EV (0-10)
    const ev = Math.round(calcProb(a) / 100 * a.revenueEstimate);
    heat += ev >= 10000 ? 10 : ev >= 5000 ? 8 : ev >= 2000 ? 6 : ev >= 1000 ? 4 : 2;
    // Proof (0-5)
    heat += a.scan?.strengthensHypothesis ? 5 : a.scan ? 3 : 1;
    // Signal freshness (0-15)
    heat += 10; // approximate for overview
    return Math.min(100, heat);
  };

  // HOT QUEUE classification
  const classifyHeat = (score: number): 'hot' | 'warm' | 'hold' => {
    if (score >= 60) return 'hot';
    if (score >= 35) return 'warm';
    return 'hold';
  };

  const queueEntries = active.map(a => ({
    ...a,
    heat: calcHeat(a),
    tier: classifyHeat(calcHeat(a)),
  })).sort((a, b) => b.heat - a.heat);

  const hotCount = queueEntries.filter(e => e.tier === 'hot').length;
  const warmCount = queueEntries.filter(e => e.tier === 'warm').length;
  const holdCount = queueEntries.filter(e => e.tier === 'hold').length;
  const slotsFree = Math.max(0, MAX_QUEUE - queueEntries.length);
  const coolingCount = accounts.filter(a => a.status === 'contacted').length;
  const awaitingCount = active.filter(a => !a.scan && a.attackability !== 'now').length;

  const HEAT_CLR = (score: number) => score >= 60 ? '#ef4444' : score >= 35 ? '#f59e0b' : '#64748b';
  const HEAT_BG = (score: number) => score >= 60 ? 'rgba(239,68,68,0.12)' : score >= 35 ? 'rgba(245,158,11,0.12)' : 'rgba(100,116,139,0.08)';

  const totalPipeline = active.reduce((s, a) => s + a.revenueEstimate, 0);
  const weightedPipeline = active.reduce((s, a) => s + calcEV(a), 0);
  const topEV = [...active].sort((a, b) => calcEV(b) - calcEV(a)).slice(0, 3);

  const CONV_CLR: Record<string, string> = { very_high: '#34d399', high: '#60a5fa', moderate: '#fbbf24', low: '#64748b' };
  const ATK_LBL: Record<string, string> = { now: 'ATTACK NOW', soon: 'SCAN FIRST', later: 'HOLD', blocked: 'BLOCKED' };
  const ATK_CLR: Record<string, string> = { now: '#34d399', soon: '#60a5fa', later: '#fbbf24', blocked: '#f87171' };

  return (
    <div style={mono}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 24 }}>
        <span style={{ fontSize: 24, fontWeight: 700, color: '#e4e9f4' }}>Mission Control</span>
        <span style={{ fontSize: 13, color: '#475569' }}>
          {active.length} active · {attackNow.length} attack now · Pipeline {fmt(totalPipeline)} · Weighted {fmt(weightedPipeline)}
        </span>
      </div>

      {/* INCOMING SIGNALS — Live platform events */}
      {(() => {
        const pending = signals.filter(s => !processedIds.has(s.id));
        if (pending.length === 0 && !signalLoading) return null;
        return (
          <div style={{ ...box, borderLeft: '3px solid #22d3ee', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ ...lbl, color: '#22d3ee', margin: 0 }}>
                INCOMING SIGNALS {pending.length > 0 && <span style={{ color: '#e4e9f4', fontWeight: 700 }}>({pending.length})</span>}
              </div>
              <button onClick={fetchSignals} disabled={signalLoading}
                style={{ ...mono, fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 4, background: 'rgba(34,211,238,0.06)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.12)', cursor: 'pointer', opacity: signalLoading ? 0.5 : 1 }}>
                {signalLoading ? 'POLLING...' : 'REFRESH'}
              </button>
            </div>
            {pending.length === 0 && signalLoading && (
              <div style={{ fontSize: 12, color: '#475569' }}>Checking for new signals...</div>
            )}
            {pending.map(sig => {
              const clr = EVT_CLR[sig.event_type] || '#64748b';
              const label = EVT_LABEL[sig.event_type] || sig.event_type.toUpperCase();
              const ago = Math.round((Date.now() - new Date(sig.created_at).getTime()) / 60000);
              const agoStr = ago < 60 ? `${ago}m ago` : ago < 1440 ? `${Math.round(ago / 60)}h ago` : `${Math.round(ago / 1440)}d ago`;
              return (
                <div key={sig.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 6, background: `${clr}06`, border: `1px solid ${clr}15`, marginBottom: 6 }}>
                  <span style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '3px 8px', borderRadius: 3, color: clr, background: `${clr}18` }}>
                    {label}
                  </span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#e4e9f4' }}>{sig.company_name || sig.domain}</span>
                    <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>{sig.domain}</span>
                    {sig.email && <span style={{ fontSize: 11, color: '#475569', marginLeft: 8 }}>{sig.email}</span>}
                  </div>
                  <span style={{ fontSize: 11, color: '#3a4560' }}>{agoStr}</span>
                  <button onClick={() => acceptSignal(sig)}
                    style={{ ...mono, fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 4, background: 'rgba(52,211,153,0.08)', color: '#34d399', border: '1px solid rgba(52,211,153,0.15)', cursor: 'pointer' }}>
                    ACCEPT
                  </button>
                  <button onClick={() => dismissSignal(sig.id)}
                    style={{ ...mono, fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 4, background: 'rgba(100,116,139,0.06)', color: '#64748b', border: '1px solid rgba(100,116,139,0.10)', cursor: 'pointer' }}>
                    DISMISS
                  </button>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* ATTACK NOW + TOP EV */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ ...box, borderLeft: '3px solid #34d399' }}>
          <div style={{ ...lbl, color: '#34d399' }}>ATTACK NOW</div>
          {attackNow.length === 0 ? <div style={{ fontSize: 13, color: '#3a4560' }}>No accounts ready</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {attackNow.slice(0, 4).map((a, i) => {
                const prob = calcProb(a);
                const ev = calcEV(a);
                return (
                  <Link key={a.id} href={`/command/accounts/${a.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 8, background: i === 0 ? 'rgba(52,211,153,0.04)' : 'rgba(14,18,33,0.3)', border: i === 0 ? '1px solid rgba(52,211,153,0.12)' : '1px solid rgba(36,48,78,0.08)' }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: i === 0 ? '#34d399' : '#3a4560', width: 26, textAlign: 'center' as const }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#e4e9f4' }}>{a.company}</span>
                        <span style={{ fontSize: 12, color: '#475569' }}>{a.country}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{a.mainSignal}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 14, flexShrink: 0 }}>
                      <div style={{ textAlign: 'center' as const }}><div style={{ fontSize: 15, fontWeight: 700, color: prob >= 40 ? '#34d399' : '#60a5fa' }}>{prob}%</div><div style={{ fontSize: 10, color: '#3a4560' }}>PROB</div></div>
                      <div style={{ textAlign: 'center' as const }}><div style={{ fontSize: 15, fontWeight: 700, color: '#e4e9f4' }}>{fmt(a.revenueEstimate)}</div><div style={{ fontSize: 10, color: '#3a4560' }}>REV</div></div>
                      <div style={{ textAlign: 'center' as const }}><div style={{ fontSize: 15, fontWeight: 700, color: ev >= 5000 ? '#34d399' : '#60a5fa' }}>{fmt(ev)}</div><div style={{ fontSize: 10, color: '#3a4560' }}>EV</div></div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        <div style={{ ...box, borderLeft: '3px solid #a78bfa' }}>
          <div style={{ ...lbl, color: '#a78bfa' }}>TOP EXPECTED VALUE</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topEV.map(a => {
              const prob = calcProb(a);
              const ev = calcEV(a);
              return (
                <Link key={a.id} href={`/command/accounts/${a.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 6, background: 'rgba(14,18,33,0.3)', border: '1px solid rgba(36,48,78,0.08)' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#e4e9f4', flex: 1 }}>{a.company}</span>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{prob}% × {fmt(a.revenueEstimate)}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#a78bfa' }}>{fmt(ev)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* HOT QUEUE LIVE */}
      <div style={{ ...box, borderLeft: '3px solid #ef4444', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', color: '#ef4444', textTransform: 'uppercase' as const }}>
            HOT QUEUE LIVE ({queueEntries.length}/{MAX_QUEUE})
          </div>
          <Link href="/command/outreach" style={{ ...mono, fontSize: 12, color: '#ef4444', textDecoration: 'none' }}>
            View Hot Queue →
          </Link>
        </div>

        {/* Stats bar */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 13, flexWrap: 'wrap' as const }}>
          <span><span style={{ fontWeight: 700, color: '#ef4444' }}>{hotCount}</span> <span style={{ color: '#64748b' }}>hot</span></span>
          <span><span style={{ fontWeight: 700, color: '#f59e0b' }}>{warmCount}</span> <span style={{ color: '#64748b' }}>warm</span></span>
          <span><span style={{ fontWeight: 700, color: '#64748b' }}>{holdCount}</span> <span style={{ color: '#64748b' }}>hold</span></span>
          <span style={{ color: '#3a4560' }}>|</span>
          <span><span style={{ fontWeight: 700, color: '#475569' }}>{slotsFree}</span> <span style={{ color: '#64748b' }}>slots free</span></span>
          <span><span style={{ fontWeight: 700, color: '#475569' }}>{coolingCount}</span> <span style={{ color: '#64748b' }}>cooling</span></span>
          <span><span style={{ fontWeight: 700, color: '#475569' }}>{awaitingCount}</span> <span style={{ color: '#64748b' }}>awaiting</span></span>
        </div>

        {/* Top 5 hot accounts */}
        {queueEntries.length === 0 ? (
          <div style={{ fontSize: 13, color: '#3a4560' }}>No accounts in queue</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {queueEntries.slice(0, 5).map((a, i) => {
              const heatClr = HEAT_CLR(a.heat);
              const heatBg = HEAT_BG(a.heat);
              const hasSent = a.outreach.some(o => o.status === 'sent');
              const isContacted = a.status === 'contacted';
              const channelRec = a.attackability === 'now' ? 'EMAIL' : a.attackability === 'soon' ? 'LINKEDIN' : 'HOLD';

              return (
                <Link key={a.id} href={`/command/accounts/${a.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: 'rgba(14,18,33,0.3)', border: '1px solid rgba(36,48,78,0.08)' }}>
                  {/* Rank */}
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#3a4560', width: 20, textAlign: 'center' as const }}>{i + 1}</span>

                  {/* Heat badge */}
                  <span style={{
                    fontSize: 14, fontWeight: 700, color: heatClr,
                    background: heatBg, padding: '2px 8px', borderRadius: 4,
                    minWidth: 36, textAlign: 'center' as const,
                  }}>
                    {a.heat}
                  </span>

                  {/* Company + Contact */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#e4e9f4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                      {a.company}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                      {a.financeLead.name}{a.financeLead.title ? ` — ${a.financeLead.title}` : ''}
                    </div>
                  </div>

                  {/* Channel recommendation */}
                  <span style={{
                    fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
                    color: channelRec === 'EMAIL' ? '#34d399' : channelRec === 'LINKEDIN' ? '#60a5fa' : '#64748b',
                    padding: '2px 8px', borderRadius: 4,
                    background: channelRec === 'EMAIL' ? 'rgba(52,211,153,0.08)' : channelRec === 'LINKEDIN' ? 'rgba(96,165,250,0.08)' : 'rgba(100,116,139,0.06)',
                  }}>
                    {channelRec}
                  </span>

                  {/* Status pills */}
                  {isContacted ? (
                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', color: '#64748b', background: 'rgba(100,116,139,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                      CONTACTED
                    </span>
                  ) : hasSent ? (
                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', color: '#34d399', background: 'rgba(52,211,153,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                      SENT
                    </span>
                  ) : a.outreach.length > 0 ? (
                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', color: '#34d399', background: 'rgba(52,211,153,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                      READY
                    </span>
                  ) : (
                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', color: '#64748b', background: 'rgba(100,116,139,0.06)', padding: '2px 8px', borderRadius: 4 }}>
                      NOT READY
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* SCAN + OUTREACH + KILL */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ ...box, borderLeft: '3px solid #22d3ee' }}>
          <div style={{ ...lbl, color: '#22d3ee' }}>SCAN NEXT ({scanNeeded.length})</div>
          {scanNeeded.slice(0, 3).map(a => (
            <Link key={a.id} href={`/command/accounts/${a.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: CONV_CLR[a.conviction] || '#64748b', width: 24 }}>{a.score}</span>
              <span style={{ fontSize: 13, color: '#e4e9f4' }}>{a.company}</span>
              <span style={{ fontSize: 11, color: '#475569' }}>{a.domain}</span>
            </Link>
          ))}
          <Link href="/command/scan" style={{ ...mono, fontSize: 12, color: '#22d3ee', textDecoration: 'none', marginTop: 6, display: 'block' }}>Scan Center →</Link>
        </div>
        <div style={{ ...box, borderLeft: '3px solid #a78bfa' }}>
          <div style={{ ...lbl, color: '#a78bfa' }}>OUTREACH READY ({outreachReady.length})</div>
          {outreachReady.length === 0 ? <div style={{ fontSize: 12, color: '#3a4560' }}>Scan first, qualify, then outreach</div> : outreachReady.slice(0, 3).map(a => (
            <div key={a.id} style={{ fontSize: 13, color: '#e4e9f4', marginBottom: 6 }}>{a.company} <span style={{ fontSize: 11, color: '#64748b' }}>{a.outreach.filter(o => o.status === 'draft').length} drafts</span></div>
          ))}
          <Link href="/command/outreach" style={{ ...mono, fontSize: 12, color: '#a78bfa', textDecoration: 'none', marginTop: 6, display: 'block' }}>Outreach Console →</Link>
        </div>
        <div style={{ ...box, borderLeft: '3px solid #f87171' }}>
          <div style={{ ...lbl, color: '#f87171' }}>KILL FAST ({killCandidates.length})</div>
          {killCandidates.length === 0 ? <div style={{ fontSize: 12, color: '#34d399' }}>Pipeline clean</div> : killCandidates.map(a => (
            <Link key={a.id} href={`/command/accounts/${a.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: '#94a3b8' }}>{a.company}</span>
              <span style={{ fontSize: 11, color: '#f87171' }}>{a.conviction === 'low' ? 'Low conv.' : 'Weak hyp.'}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Pipeline + Next Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={box}>
          <div style={lbl}>PIPELINE</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              { n: active.length, l: 'Active', c: '#e4e9f4' },
              { n: attackNow.length, l: 'Attack Now', c: '#34d399' },
              { n: accounts.filter(a => a.status === 'contacted').length, l: 'Contacted', c: '#94a3b8' },
              { n: accounts.filter(a => a.status === 'dropped').length, l: 'Dropped', c: '#f87171' },
            ].map(m => (
              <div key={m.l} style={{ textAlign: 'center' as const }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: m.c, lineHeight: 1 }}>{m.n}</div>
                <div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.1em', marginTop: 4 }}>{m.l.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={box}>
          <div style={lbl}>NEXT ACTIONS</div>
          {[...active].sort((a, b) => b.score - a.score).slice(0, 5).map(a => (
            <Link key={a.id} href={`/command/accounts/${a.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: CONV_CLR[a.conviction] || '#64748b', width: 22 }}>{a.score}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', width: 90 }}>{a.company}</span>
              <span style={{ fontSize: 12, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{a.nextAction}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
