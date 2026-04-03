'use client';

/**
 * GHOST TAX — SIGNAUX
 * Intent signals par account. Spec V7.
 */

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { loadAccounts } from '@/lib/command/store';
import { calcHeatScore } from '@/lib/command/hot-queue';
import type { Account, Signal } from '@/types/command';

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

const SIGNAL_COLOR: Record<string, string> = {
  hiring: P.cyan, technology: '#3B82F6', funding: P.green,
  executive: P.amber, restructuring: P.red, expansion: P.green,
  regulatory: P.amber, intent: P.cyan,
};

export default function SignauxPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [ready, setReady]       = useState(false);
  const [filter, setFilter]     = useState('all');

  useEffect(() => { setAccounts(loadAccounts()); setReady(true); }, []);

  const data = useMemo(() => {
    return accounts
      .filter(a => a.status !== 'dropped' && a.signals.length > 0)
      .map(a => ({ account: a, heat: calcHeatScore(a).total, signals: a.signals }))
      .sort((a, b) => b.heat - a.heat);
  }, [accounts]);

  const signalTypes = useMemo(() => {
    const types = new Set<string>();
    data.forEach(d => d.signals.forEach(s => types.add(s.type)));
    return ['all', ...Array.from(types).sort()];
  }, [data]);

  const filtered = useMemo(() => {
    if (filter === 'all') return data;
    return data.filter(d => d.signals.some(s => s.type === filter));
  }, [data, filter]);

  const totalSignals = data.reduce((s, d) => s + d.signals.length, 0);

  if (!ready) return <div style={{ background: P.bg, minHeight: '100%' }} />;

  return (
    <div style={{ background: P.bg, fontFamily: FS, color: P.text1, minHeight: '100%', padding: '28px 28px 80px', maxWidth: 800, margin: '0 auto' }}>

      <div style={{ marginBottom: 20 }}>
        <div style={lbl}>Signaux</div>
        <h1 style={{ margin: '6px 0 4px', fontSize: 18, fontWeight: 800, letterSpacing: '-.02em' }}>
          Intent Signals
        </h1>
        <div style={{ fontFamily: FM, fontSize: 10, color: P.text3 }}>
          {totalSignals} signals across {data.length} accounts
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, flexWrap: 'wrap' as const }}>
        {signalTypes.map(t => {
          const active = filter === t;
          return (
            <button key={t} onClick={() => setFilter(t)} style={{
              fontFamily: FM, fontSize: 9, fontWeight: 700, letterSpacing: '.1em',
              padding: '5px 10px', borderRadius: 4, cursor: 'pointer',
              textTransform: 'uppercase' as const,
              background: active ? `${P.cyan}12` : 'transparent',
              color: active ? P.cyan : P.text3,
              border: active ? `1px solid ${P.cyan}25` : `1px solid ${P.border}`,
            }}>
              {t}
            </button>
          );
        })}
      </div>

      {/* Signal list */}
      {filtered.map(({ account: a, heat, signals }) => {
        const filteredSignals = filter === 'all' ? signals : signals.filter(s => s.type === filter);
        const hCol = heat >= 60 ? P.red : heat >= 40 ? P.amber : P.text3;
        return (
          <div key={a.id} style={{
            background: P.surface, border: `1px solid ${P.border}`,
            borderRadius: 10, padding: '14px 18px', marginBottom: 8,
          }}>
            <Link href={`/command/accounts/${a.id}`} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              textDecoration: 'none', marginBottom: filteredSignals.length > 0 ? 10 : 0,
            }}>
              <span style={{ fontFamily: FM, fontSize: 13, fontWeight: 800, color: hCol, width: 28, textAlign: 'right' as const }}>
                {heat}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: P.text1, flex: 1 }}>{a.company}</span>
              <span style={{ fontFamily: FM, fontSize: 10, color: P.text3 }}>{a.country}</span>
              <span style={{ fontFamily: FM, fontSize: 10, color: P.text3 }}>{filteredSignals.length} signal{filteredSignals.length > 1 ? 's' : ''}</span>
            </Link>

            {filteredSignals.map((s, i) => {
              const sCol = SIGNAL_COLOR[s.type] || P.text3;
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'baseline', gap: 8,
                  padding: '4px 0 4px 38px',
                  borderTop: i === 0 ? `1px solid ${P.border}` : 'none',
                }}>
                  <span style={{
                    fontFamily: FM, fontSize: 9, fontWeight: 700, letterSpacing: '.06em',
                    color: sCol, background: `${sCol}12`, border: `1px solid ${sCol}20`,
                    padding: '1px 6px', borderRadius: 3, flexShrink: 0,
                  }}>
                    {s.type.toUpperCase()}
                  </span>
                  <span style={{ fontFamily: FM, fontSize: 11, color: P.text2, flex: 1 }}>{s.detail}</span>
                  <span style={{ fontFamily: FM, fontSize: 9, color: P.text4 }}>
                    str:{s.strength}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontFamily: FM, fontSize: 11, color: P.text4 }}>No signals found</div>
        </div>
      )}
    </div>
  );
}
