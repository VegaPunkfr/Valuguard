'use client';

/**
 * GHOST TAX — INTELLIGENCE BRIEF
 * Base vierge. Palette officielle.
 */

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { loadAccounts, getAttackNow, getScanNeeded, getOutreachReady, getKillCandidates, calcProbability, calcExpectedValue } from '@/lib/command/store';
import { calcHeatScore, buildQueue, loadLedger } from '@/lib/command/hot-queue';
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

// ── Account Row ───────────────────────────────────────────
function BriefRow({ a, heat, accentColor }: { a: Account; heat: number; accentColor: string }) {
  const hCol = heat >= 60 ? P.red : heat >= 40 ? P.amber : P.text3;
  return (
    <Link href={`/command/accounts/${a.id}`} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 14px', borderBottom: `1px solid ${P.border}`,
      textDecoration: 'none', transition: 'background .1s',
    }}
      onMouseEnter={e => (e.currentTarget.style.background = P.panel)}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <div style={{ fontFamily: FM, fontSize: 12, fontWeight: 800, color: hCol, background: `${hCol}12`, border: `1px solid ${hCol}25`, borderRadius: 4, padding: '1px 0', width: 32, textAlign: 'center' as const, flexShrink: 0 }}>
        {heat}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: P.text1 }}>{a.company}</div>
        <div style={{ fontFamily: FM, fontSize: 9, color: P.text3, marginTop: 1 }}>{a.financeLead.name} · {a.country}</div>
      </div>
      <div style={{ fontFamily: FM, fontSize: 10, color: P.green, fontWeight: 700 }}>€{calcExpectedValue(a).toLocaleString()}</div>
      <span style={pill(accentColor)}>{a.status.toUpperCase()}</span>
    </Link>
  );
}

// ── Section ───────────────────────────────────────────────
function Section({
  title, color, accounts, heatMap, empty,
}: {
  title: string; color: string; accounts: Account[]; heatMap: Map<string, number>; empty: string;
}) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ width: 3, height: 14, borderRadius: 2, background: color, flexShrink: 0 }} />
        <span style={lbl(color)}>{title} — {accounts.length}</span>
      </div>
      <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10, overflow: 'hidden' }}>
        {!accounts.length ? (
          <div style={{ padding: '20px 16px', textAlign: 'center' }}>
            <span style={{ fontFamily: FM, fontSize: 10, color: P.text4 }}>{empty}</span>
          </div>
        ) : (
          accounts.slice(0, 6).map(a => (
            <BriefRow key={a.id} a={a} heat={heatMap.get(a.id) || 0} accentColor={color} />
          ))
        )}
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────
export default function BriefPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [ready,    setReady]    = useState(false);

  useEffect(() => {
    setAccounts(loadAccounts());
    setReady(true);
  }, []);

  const ledger = useMemo(() => (ready ? loadLedger() : []), [ready]);

  const heatMap = useMemo(() =>
    new Map(accounts.map(a => [a.id, calcHeatScore(a).total])),
  [accounts]);

  const attackNow     = useMemo(() => getAttackNow(accounts),     [accounts]);
  const outreachReady = useMemo(() => getOutreachReady(accounts), [accounts]);
  const scanNeeded    = useMemo(() => getScanNeeded(accounts),    [accounts]);
  const killCandidates = useMemo(() => getKillCandidates(accounts), [accounts]);

  const queue = useMemo(() => {
    if (!ready) return null;
    return buildQueue(accounts.filter(a => a.status !== 'dropped'), ledger);
  }, [accounts, ledger, ready]);

  const pipelineValue = useMemo(() =>
    accounts.filter(a => a.status !== 'dropped').reduce((s, a) => s + calcExpectedValue(a), 0),
  [accounts]);

  const contacted = useMemo(() =>
    accounts.filter(a => a.status === 'contacted').length,
  [accounts]);

  if (!ready) return <div style={{ background: P.bg, minHeight: '100%' }} />;

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div style={{ background: P.bg, fontFamily: FS, color: P.text1, minHeight: '100%', padding: '28px 28px 80px' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 24 }}>
        <span style={lbl(P.cyan)}>Ghost Tax · Brief</span>
        <h1 style={{ margin: '6px 0 2px', fontSize: 20, fontWeight: 800, letterSpacing: '-.02em' }}>
          Intelligence Brief
        </h1>
        <div style={{ fontFamily: FM, fontSize: 10, color: P.text3 }}>{today}</div>
      </div>

      {/* ── KPI Strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 32 }}>
        {[
          { label: 'ATTACK NOW',    value: attackNow.length,          color: P.red    },
          { label: 'HOT QUEUE',     value: queue?.stats.hotCount ?? 0, color: P.amber  },
          { label: 'OUTREACH READY',value: outreachReady.length,      color: P.blueHi },
          { label: 'CONTACTED',     value: contacted,                  color: P.blue   },
          { label: 'SCAN NEEDED',   value: scanNeeded.length,         color: P.amber  },
          { label: 'PIPELINE EV',   value: `€${Math.round(pipelineValue / 1000)}k`, color: P.green },
        ].map(s => (
          <div key={s.label} style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10, padding: '16px 20px' }}>
            <div style={lbl()}>{s.label}</div>
            <div style={{ fontFamily: FM, fontSize: 24, fontWeight: 800, color: s.color, marginTop: 4, letterSpacing: '-.02em' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Executive Summary ── */}
      <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10, padding: '20px 24px', marginBottom: 32 }}>
        <div style={{ ...lbl(P.cyan), marginBottom: 10 }}>Executive Summary</div>
        <div style={{ fontFamily: FM, fontSize: 12, color: P.text2, lineHeight: 1.8 }}>
          {attackNow.length > 0
            ? `${attackNow.length} account${attackNow.length > 1 ? 's' : ''} at maximum attack readiness.`
            : 'No accounts at maximum attack readiness — move qualified prospects up.'}{' '}
          {queue?.stats.hotCount ? `${queue.stats.hotCount} hot (heat ≥ 60), ${queue.stats.warmCount} warm. ` : ''}
          {outreachReady.length > 0
            ? `${outreachReady.length} message${outreachReady.length > 1 ? 's' : ''} ready to send. Review and deploy.`
            : 'Generate messages for your top accounts in Outreach Console.'}{' '}
          {scanNeeded.length > 0
            ? `${scanNeeded.length} accounts need scanning to strengthen intelligence.`
            : 'All accounts scanned.'}
        </div>
      </div>

      {/* ── Sections ── */}
      <Section title="Attack Now"      color={P.red}    accounts={attackNow}      heatMap={heatMap} empty="No accounts at attack now — check attackability scores" />
      <Section title="Outreach Ready"  color={P.blueHi} accounts={outreachReady}  heatMap={heatMap} empty="No messages ready — generate from Outreach Console" />
      <Section title="Scan Needed"     color={P.amber}  accounts={scanNeeded}     heatMap={heatMap} empty="All accounts scanned" />
      <Section title="Kill Review"     color={P.text3}  accounts={killCandidates} heatMap={heatMap} empty="No candidates to drop" />

      {/* ── Actions ── */}
      <div style={{ marginTop: 32 }}>
        <div style={{ ...lbl(), marginBottom: 12 }}>Quick Actions</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
          {[
            { label: 'OUTREACH CONSOLE', href: '/command/outreach', color: P.red    },
            { label: 'SCAN CENTER',      href: '/command/scan',     color: P.amber  },
            { label: 'ALL ACCOUNTS',     href: '/command/accounts', color: P.blue   },
          ].map(link => (
            <Link key={link.href} href={link.href} style={{
              fontFamily: FM, fontSize: 10, fontWeight: 700, letterSpacing: '.12em',
              padding: '10px 18px', borderRadius: 6, textDecoration: 'none',
              background: `${link.color}08`, color: link.color, border: `1px solid ${link.color}20`,
            }}>
              {link.label}
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
