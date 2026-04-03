'use client';

/**
 * GHOST TAX — ACCOUNTS CONSOLE
 * Base vierge. Palette officielle. Logique métier conservée.
 */

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { loadAccounts, saveAccounts, calcProbability, calcExpectedValue } from '@/lib/command/store';
import { calcHeatScore } from '@/lib/command/hot-queue';
import type { Account, AccountStatus } from '@/types/command';

// ── Tokens ───────────────────────────────────────────────
const P = {
  bg:       '#060912',
  surface:  '#0a0d19',
  panel:    '#0e1221',
  border:   'rgba(36,48,78,0.28)',
  text1:    '#e4e9f4',
  text2:    '#8d9bb5',
  text3:    '#55637d',
  text4:    '#3a4560',
  green:    '#34d399',
  amber:    '#f59e0b',
  red:      '#ef4444',
  blue:     '#3b82f6',
  blueHi:   '#60a5fa',
  cyan:     '#22d3ee',
} as const;
const FM = 'var(--font-mono)';
const FS = 'var(--font-sans)';

// ── Helpers ───────────────────────────────────────────────
const heatColor = (n: number) => n >= 75 ? P.red : n >= 60 ? P.amber : n >= 40 ? P.blue : P.text3;

function Label({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      fontFamily: FM, fontSize: 9, fontWeight: 700,
      letterSpacing: '.16em', textTransform: 'uppercase' as const,
      color: color ?? P.text3,
    }}>
      {children}
    </span>
  );
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontFamily: FM, fontSize: 9, fontWeight: 700, letterSpacing: '.08em',
      padding: '2px 8px', borderRadius: 4,
      color, background: `${color}12`, border: `1px solid ${color}25`,
      display: 'inline-block',
    }}>
      {label}
    </span>
  );
}

const STATUS_COLOR: Record<string, string> = {
  new:            P.text3,
  qualified:      P.cyan,
  outreach_ready: P.blue,
  contacted:      P.amber,
  replied:        P.green,
  dropped:        P.red,
};

// ── Sort state ────────────────────────────────────────────
type SortField = 'heat' | 'company' | 'ev' | 'probability' | 'country';

// ── Main ─────────────────────────────────────────────────
export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('heat');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    setAccounts(loadAccounts());
    setReady(true);
  }, []);

  const computed = useMemo(() =>
    accounts.map(a => ({
      a,
      heat: calcHeatScore(a).total,
      prob: calcProbability(a),
      ev:   calcExpectedValue(a),
    })),
  [accounts]);

  const filtered = useMemo(() => {
    let list = computed;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(({ a }) =>
        a.company.toLowerCase().includes(q) ||
        a.domain.toLowerCase().includes(q) ||
        a.country.toLowerCase().includes(q) ||
        a.financeLead.name.toLowerCase().includes(q)
      );
    }
    if (filterStatus !== 'all') {
      list = list.filter(({ a }) => a.status === filterStatus);
    }
    return [...list].sort((x, y) => {
      let cmp = 0;
      if (sortField === 'heat')        cmp = x.heat - y.heat;
      else if (sortField === 'ev')     cmp = x.ev - y.ev;
      else if (sortField === 'probability') cmp = x.prob - y.prob;
      else if (sortField === 'company')     cmp = x.a.company.localeCompare(y.a.company);
      else if (sortField === 'country')     cmp = x.a.country.localeCompare(y.a.country);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [computed, search, filterStatus, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  }

  function SortTh({ field, label }: { field: SortField; label: string }) {
    const active = sortField === field;
    return (
      <span
        onClick={() => toggleSort(field)}
        style={{
          fontFamily: FM, fontSize: 9, fontWeight: 700, letterSpacing: '.14em',
          textTransform: 'uppercase' as const,
          color: active ? P.cyan : P.text3,
          cursor: 'pointer', userSelect: 'none' as const,
          display: 'inline-flex', alignItems: 'center', gap: 3,
        }}
      >
        {label}
        {active && <span style={{ fontSize: 8 }}>{sortDir === 'asc' ? '▲' : '▼'}</span>}
      </span>
    );
  }

  if (!ready) return <div style={{ background: P.bg, minHeight: '100%' }} />;

  const statuses = ['all', 'new', 'qualified', 'outreach_ready', 'contacted', 'replied', 'dropped'];

  return (
    <div style={{ background: P.bg, fontFamily: FS, color: P.text1, minHeight: '100%', padding: '28px 28px 80px' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 20 }}>
        <Label color={P.cyan}>Ghost Tax · Accounts</Label>
        <h1 style={{ margin: '6px 0 0', fontSize: 20, fontWeight: 800, letterSpacing: '-.02em' }}>
          Account Intelligence
        </h1>
        <div style={{ fontFamily: FM, fontSize: 10, color: P.text3, marginTop: 4 }}>
          {filtered.length} / {accounts.length} accounts
        </div>
      </div>

      {/* ── Controls ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' as const, alignItems: 'center' }}>
        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search company, domain, contact…"
          style={{
            fontFamily: FM, fontSize: 11, padding: '8px 14px',
            background: P.surface, border: `1px solid ${P.border}`,
            borderRadius: 6, color: P.text1, outline: 'none',
            width: 260,
          }}
        />

        {/* Status filter */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const }}>
          {statuses.map(s => {
            const active = filterStatus === s;
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                style={{
                  fontFamily: FM, fontSize: 9, fontWeight: 700, letterSpacing: '.1em',
                  padding: '6px 12px', borderRadius: 5, cursor: 'pointer',
                  textTransform: 'uppercase' as const,
                  background: active ? `${P.cyan}15` : 'transparent',
                  color: active ? P.cyan : P.text3,
                  border: active ? `1px solid ${P.cyan}30` : `1px solid ${P.border}`,
                }}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{
        background: P.surface, border: `1px solid ${P.border}`,
        borderRadius: 10, overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '56px 1fr 130px 70px 90px 90px 100px 90px',
          padding: '10px 16px',
          borderBottom: `1px solid ${P.border}`,
          gap: 8,
        }}>
          <SortTh field="heat"        label="Heat" />
          <SortTh field="company"     label="Company" />
          <span style={{ fontFamily: FM, fontSize: 9, fontWeight: 700, letterSpacing: '.14em', color: P.text3, textTransform: 'uppercase' as const }}>Contact</span>
          <SortTh field="country"     label="Ctry" />
          <span style={{ fontFamily: FM, fontSize: 9, fontWeight: 700, letterSpacing: '.14em', color: P.text3, textTransform: 'uppercase' as const }}>Status</span>
          <SortTh field="probability" label="P(%)" />
          <SortTh field="ev"          label="EV" />
          <span style={{ fontFamily: FM, fontSize: 9, fontWeight: 700, letterSpacing: '.14em', color: P.text3, textTransform: 'uppercase' as const }}>Solofit</span>
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center' }}>
            <span style={{ fontFamily: FM, fontSize: 11, color: P.text4 }}>No accounts match</span>
          </div>
        ) : (
          filtered.map(({ a, heat, prob, ev }) => {
            const col = heatColor(heat);
            const stCol = STATUS_COLOR[a.status] || P.text3;
            return (
              <Link
                key={a.id}
                href={`/command/accounts/${a.id}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '56px 1fr 130px 70px 90px 90px 100px 90px',
                  padding: '11px 16px',
                  borderBottom: `1px solid ${P.border}`,
                  textDecoration: 'none',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'background .1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = P.panel)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Heat */}
                <div style={{
                  fontFamily: FM, fontSize: 13, fontWeight: 800, color: col,
                  background: `${col}12`, border: `1px solid ${col}28`,
                  borderRadius: 5, padding: '2px 0',
                  textAlign: 'center', width: 38,
                }}>
                  {heat}
                </div>

                {/* Company */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: P.text1 }}>{a.company}</div>
                  <div style={{ fontFamily: FM, fontSize: 10, color: P.text4, marginTop: 1 }}>{a.domain}</div>
                </div>

                {/* Contact */}
                <div style={{ fontFamily: FM, fontSize: 11, color: P.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                  {a.financeLead.name}
                </div>

                {/* Country */}
                <div style={{ fontFamily: FM, fontSize: 11, color: P.text3 }}>{a.country}</div>

                {/* Status */}
                <Pill label={a.status.toUpperCase()} color={stCol} />

                {/* Probability */}
                <div style={{ fontFamily: FM, fontSize: 12, fontWeight: 700, color: P.blueHi }}>{prob}%</div>

                {/* EV */}
                <div style={{ fontFamily: FM, fontSize: 12, fontWeight: 700, color: P.green }}>
                  €{ev.toLocaleString()}
                </div>

                {/* Solofit */}
                <Pill
                  label={a.solofit.toUpperCase()}
                  color={a.solofit === 'ideal' ? P.green : a.solofit === 'good' ? P.blueHi : P.text3}
                />
              </Link>
            );
          })
        )}
      </div>

    </div>
  );
}
