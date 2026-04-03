'use client';

/**
 * GHOST TAX — INTELLIGENCE
 * Response rates, learning engine stats. Spec V7.
 */

import { useState, useEffect, useMemo } from 'react';
import { loadAccounts } from '@/lib/command/store';
import { getResponseStats, recalcHeatWeights, type ResponseStats } from '@/lib/command/hot-queue';
import type { Account } from '@/types/command';

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

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10, padding: '16px 20px' }}>
      <div style={lbl}>{label}</div>
      <div style={{ fontFamily: FM, fontSize: 24, fontWeight: 800, color, marginTop: 4, letterSpacing: '-.02em' }}>{value}</div>
      {sub && <div style={{ fontFamily: FM, fontSize: 10, color: P.text3, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function RateBar({ label, rate, color }: { label: string; rate: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
      <span style={{ fontFamily: FM, fontSize: 11, color: P.text2, width: 100, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 4, background: P.text4, borderRadius: 2 }}>
        <div style={{ width: `${Math.min(rate, 100)}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color, width: 40, textAlign: 'right' as const }}>
        {rate.toFixed(1)}%
      </span>
    </div>
  );
}

export default function IntelligencePage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => { setAccounts(loadAccounts()); setReady(true); }, []);

  const stats: any = useMemo(() => {
    try { return getResponseStats() as any; } catch { return null; }
  }, [ready]);

  const weights = useMemo(() => {
    try { return recalcHeatWeights(); } catch { return null; }
  }, [ready]);

  const accountStats = useMemo(() => {
    const active    = accounts.filter(a => a.status !== 'dropped');
    const contacted = accounts.filter(a => a.status === 'contacted');
    const replied   = accounts.filter(a => (a as any).status === 'replied');
    return { active: active.length, contacted: contacted.length, replied: replied.length };
  }, [accounts]);

  if (!ready) return <div style={{ background: P.bg, minHeight: '100%' }} />;

  return (
    <div style={{ background: P.bg, fontFamily: FS, color: P.text1, minHeight: '100%', padding: '28px 28px 80px', maxWidth: 800, margin: '0 auto' }}>

      <div style={{ marginBottom: 24 }}>
        <div style={lbl}>Intelligence</div>
        <h1 style={{ margin: '6px 0 0', fontSize: 18, fontWeight: 800, letterSpacing: '-.02em' }}>
          Learning Engine
        </h1>
      </div>

      {/* Overview stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 32 }}>
        <StatCard label="Total envoy{'\u00e9'}s" value={(stats as any)?.totalSent ?? 0} color={P.cyan} />
        <StatCard label="R{'\u00e9'}ponses" value={(stats as any)?.totalReplied ?? 0} color={P.green} sub={stats ? `${(((stats as any).totalReplied / Math.max((stats as any).totalSent, 1)) * 100).toFixed(1)}% taux` : '—'} />
        <StatCard label="Contact{'\u00e9'}s" value={accountStats.contacted} color={P.amber} />
        <StatCard label="Actifs" value={accountStats.active} color={P.text2} />
      </div>

      {/* Response rates by dimension */}
      {stats && (
        <>
          {/* By Channel */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ ...lbl, marginBottom: 12, color: P.cyan }}>Taux par canal</div>
            <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10, padding: '14px 18px' }}>
              {stats.byChannel && Object.entries(stats.byChannel).map(([ch, data]: [string, any]) => (
                <RateBar key={ch} label={ch.toUpperCase()} rate={data.replyRate * 100} color={ch === 'email' ? P.green : P.cyan} />
              ))}
              {(!stats.byChannel || Object.keys(stats.byChannel).length === 0) && (
                <div style={{ fontFamily: FM, fontSize: 11, color: P.text4, padding: '8px 0' }}>
                  Pas assez de donn{'\u00e9'}es — envoyez 10+ messages pour voir les taux.
                </div>
              )}
            </div>
          </div>

          {/* By Country */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ ...lbl, marginBottom: 12, color: P.amber }}>Taux par pays</div>
            <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10, padding: '14px 18px' }}>
              {stats.byCountry && Object.entries(stats.byCountry).map(([c, data]: [string, any]) => (
                <RateBar key={c} label={c} rate={data.replyRate * 100} color={P.amber} />
              ))}
              {(!stats.byCountry || Object.keys(stats.byCountry).length === 0) && (
                <div style={{ fontFamily: FM, fontSize: 11, color: P.text4, padding: '8px 0' }}>
                  Pas assez de donn{'\u00e9'}es.
                </div>
              )}
            </div>
          </div>

          {/* By Angle */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ ...lbl, marginBottom: 12, color: P.green }}>Taux par angle</div>
            <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10, padding: '14px 18px' }}>
              {stats.byAngle && Object.entries(stats.byAngle).map(([a, data]: [string, any]) => (
                <RateBar key={a} label={a.replace(/_/g, ' ')} rate={data.replyRate * 100} color={P.green} />
              ))}
              {(!stats.byAngle || Object.keys(stats.byAngle).length === 0) && (
                <div style={{ fontFamily: FM, fontSize: 11, color: P.text4, padding: '8px 0' }}>
                  Pas assez de donn{'\u00e9'}es.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Heat Weights (if recalculated) */}
      {weights && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ ...lbl, marginBottom: 12, color: P.red }}>Heat Weights (recalcul{'\u00e9'}s)</div>
          <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10, padding: '14px 18px' }}>
            {Object.entries(weights).map(([dim, w]) => (
              <div key={dim} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                <span style={{ fontFamily: FM, fontSize: 11, color: P.text2, flex: 1 }}>{dim}</span>
                <span style={{ fontFamily: FM, fontSize: 12, fontWeight: 700, color: P.text1 }}>{(w as number).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Learning status */}
      <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10, padding: '16px 20px' }}>
        <div style={lbl}>Statut du mod{'\u00e8'}le</div>
        <div style={{ fontFamily: FM, fontSize: 12, color: P.text2, lineHeight: 1.7, marginTop: 8 }}>
          {(stats?.totalSent ?? 0) < 30
            ? `${stats?.totalSent ?? 0}/30 envois — Le moteur d\u2019apprentissage s\u2019active apr\u00e8s 30 envois. Continuez l\u2019outreach.`
            : (stats?.totalSent ?? 0) < 50
              ? `${stats?.totalSent ?? 0}/50 envois — Heat score recalcul\u00e9. Pr\u00e9diction de probabilit\u00e9 \u00e0 50 envois.`
              : `${stats?.totalSent ?? 0} envois — Mod\u00e8le actif. Heat weights et probabilit\u00e9s de r\u00e9ponse calibr\u00e9s.`
          }
        </div>
      </div>

    </div>
  );
}
