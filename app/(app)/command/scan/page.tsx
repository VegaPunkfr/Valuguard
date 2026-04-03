'use client';

/**
 * GHOST TAX — SCAN CENTER
 * Base vierge. Palette officielle.
 */

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { loadAccounts, saveAccounts, getScanNeeded } from '@/lib/command/store';
import { calcHeatScore } from '@/lib/command/hot-queue';
import type { Account } from '@/types/command';

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
} as const;
const FM = 'var(--font-mono)';
const FS = 'var(--font-sans)';

const lbl = (c?: string): React.CSSProperties => ({
  fontFamily: FM, fontSize: 9, fontWeight: 700, letterSpacing: '.16em',
  textTransform: 'uppercase' as const, color: c ?? P.text3,
});
const pill = (color: string): React.CSSProperties => ({
  fontFamily: FM, fontSize: 9, fontWeight: 700, padding: '2px 7px',
  borderRadius: 4, color, background: `${color}12`, border: `1px solid ${color}22`,
  display: 'inline-block', letterSpacing: '.06em',
});

// ── Main ─────────────────────────────────────────────────
export default function ScanPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [queued,   setQueued]   = useState<Set<string>>(new Set());
  const [ready,    setReady]    = useState(false);

  useEffect(() => {
    setAccounts(loadAccounts());
    setReady(true);
  }, []);

  const scanNeeded = useMemo(() => getScanNeeded(accounts), [accounts]);
  const scanned    = useMemo(() => accounts.filter(a => !!a.scan && a.status !== 'dropped').sort((a, b) => (b.scan?.completedAt || '').localeCompare(a.scan?.completedAt || '')), [accounts]);

  const heatByAccount = useMemo(() =>
    new Map(accounts.map(a => [a.id, calcHeatScore(a).total])),
  [accounts]);

  function toggleQueue(id: string) {
    setQueued(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }
  function queueAll() { setQueued(new Set(scanNeeded.map(a => a.id))); }
  function clearQueue() { setQueued(new Set()); }

  if (!ready) return <div style={{ background: P.bg, minHeight: '100%' }} />;

  return (
    <div style={{ background: P.bg, fontFamily: FS, color: P.text1, minHeight: '100%', padding: '28px 28px 80px' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 20 }}>
        <span style={lbl(P.cyan)}>Ghost Tax · Scan</span>
        <h1 style={{ margin: '6px 0 0', fontSize: 20, fontWeight: 800, letterSpacing: '-.02em' }}>Scan Center</h1>
      </div>

      {/* ── Stats strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'SCAN NEEDED',  value: scanNeeded.length, color: P.amber },
          { label: 'QUEUED',       value: queued.size,       color: P.blue  },
          { label: 'COMPLETED',    value: scanned.length,    color: P.green },
          { label: 'TOTAL',        value: accounts.filter(a => a.status !== 'dropped').length, color: P.text2 },
        ].map(s => (
          <div key={s.label} style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10, padding: '16px 20px' }}>
            <div style={lbl()}>{s.label}</div>
            <div style={{ fontFamily: FM, fontSize: 26, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Two columns ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>

        {/* Scan Needed */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={lbl(P.amber)}>Scan needed — {scanNeeded.length}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={queueAll} style={{ fontFamily: FM, fontSize: 9, fontWeight: 700, letterSpacing: '.1em', padding: '5px 10px', borderRadius: 4, cursor: 'pointer', background: `${P.blue}10`, color: P.blue, border: `1px solid ${P.blue}22` }}>QUEUE ALL</button>
              <button onClick={clearQueue} style={{ fontFamily: FM, fontSize: 9, fontWeight: 700, letterSpacing: '.1em', padding: '5px 10px', borderRadius: 4, cursor: 'pointer', background: 'transparent', color: P.text3, border: `1px solid ${P.border}` }}>CLEAR</button>
            </div>
          </div>

          <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10, overflow: 'hidden' }}>
            {!scanNeeded.length ? (
              <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                <span style={{ fontFamily: FM, fontSize: 10, color: P.text4 }}>All accounts scanned</span>
              </div>
            ) : (
              scanNeeded.map(a => {
                const heat = heatByAccount.get(a.id) || 0;
                const inQ  = queued.has(a.id);
                const hCol = heat >= 60 ? P.red : heat >= 40 ? P.amber : P.text3;
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: `1px solid ${P.border}` }}>
                    <div style={{ fontFamily: FM, fontSize: 12, fontWeight: 800, color: hCol, background: `${hCol}12`, border: `1px solid ${hCol}25`, borderRadius: 4, padding: '1px 0', width: 32, textAlign: 'center' as const }}>
                      {heat}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: P.text1 }}>{a.company}</div>
                      <div style={{ fontFamily: FM, fontSize: 9, color: P.text3, marginTop: 1 }}>{a.country} · {a.industry}</div>
                    </div>
                    <button onClick={() => toggleQueue(a.id)} style={{ fontFamily: FM, fontSize: 9, fontWeight: 700, letterSpacing: '.08em', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', background: inQ ? `${P.amber}12` : 'transparent', color: inQ ? P.amber : P.text3, border: `1px solid ${inQ ? P.amber + '30' : P.border}` }}>
                      {inQ ? 'IN QUEUE' : 'QUEUE'}
                    </button>
                    <Link href={`/command/accounts/${a.id}`} style={{ fontFamily: FM, fontSize: 9, color: P.blue, textDecoration: 'none', letterSpacing: '.06em' }}>VIEW</Link>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recently Scanned */}
        <div>
          <div style={{ marginBottom: 12 }}>
            <span style={lbl(P.green)}>Recently scanned — {scanned.length}</span>
          </div>

          <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10, overflow: 'hidden' }}>
            {!scanned.length ? (
              <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                <span style={{ fontFamily: FM, fontSize: 10, color: P.text4 }}>No scans yet</span>
              </div>
            ) : (
              scanned.slice(0, 15).map(a => {
                const heat = heatByAccount.get(a.id) || 0;
                const hCol = heat >= 60 ? P.red : heat >= 40 ? P.amber : P.text3;
                return (
                  <Link key={a.id} href={`/command/accounts/${a.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: `1px solid ${P.border}`, textDecoration: 'none', transition: 'background .1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = P.panel)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div style={{ fontFamily: FM, fontSize: 12, fontWeight: 800, color: hCol, background: `${hCol}12`, border: `1px solid ${hCol}25`, borderRadius: 4, padding: '1px 0', width: 32, textAlign: 'center' as const }}>
                      {heat}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: P.text1 }}>{a.company}</div>
                      <div style={{ fontFamily: FM, fontSize: 9, color: P.text3, marginTop: 1 }}>{a.country} · {a.scan?.completedAt?.slice(0, 10) || '—'}</div>
                    </div>
                    <span style={pill(P.green)}>SCANNED</span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Queue ── */}
      {queued.size > 0 && (
        <div>
          <div style={{ marginBottom: 12 }}>
            <span style={lbl(P.blue)}>Active queue — {queued.size} accounts</span>
          </div>
          <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10, padding: '16px 20px' }}>
            <div style={{ fontFamily: FM, fontSize: 11, color: P.text2, lineHeight: 1.8 }}>
              {[...queued].map(id => {
                const a = accounts.find(x => x.id === id);
                if (!a) return null;
                return (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: P.amber, flexShrink: 0 }} />
                    <span style={{ color: P.text1, fontWeight: 600 }}>{a.company}</span>
                    <span style={{ color: P.text3 }}>{a.country} · {a.financeLead.name}</span>
                    <button onClick={() => toggleQueue(id)} style={{ fontFamily: FM, fontSize: 8, color: P.red, background: 'transparent', border: 'none', cursor: 'pointer', marginLeft: 'auto' }}>REMOVE</button>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 14, fontFamily: FM, fontSize: 10, color: P.text3 }}>
              Tip: run the scan in your terminal with <code style={{ color: P.cyan, background: `${P.cyan}10`, padding: '1px 6px', borderRadius: 3 }}>npm run scan</code> or trigger via the Make S4 cron.
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
