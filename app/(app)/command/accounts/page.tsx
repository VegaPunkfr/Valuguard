'use client';

/**
 * GHOST TAX — ACCOUNTS INTELLIGENCE v2
 *
 * Clean rebuild — base saine, palette correcte, JetBrains Mono + Inter.
 * Toute la logique de filtrage/tri conservée.
 */

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import type { Account, AccountStatus, Country, Attackability, SortField, SortDir } from '@/types/command';
import { STATUS_META, ATTACK_META, CONVICTION_META, EMAIL_STATUS_META } from '@/types/command';
import { loadAccounts, filterAccounts, sortAccounts, calcProbability } from '@/lib/command/store';

// ── Design tokens ──────────────────────────────────────────
const P = {
  bg:      '#060912',
  surface: '#0C1019',
  panel:   '#0F1624',
  border:  'rgba(255,255,255,0.06)',
  text1:   '#F1F5F9',
  text2:   '#94A3B8',
  text3:   '#475569',
  cyan:    '#22D3EE',
  green:   '#34D399',
  red:     '#F87171',
};
const FM = "var(--vg-font-mono,'JetBrains Mono',monospace)";
const FS = "var(--vg-font-sans,'Inter',system-ui,sans-serif)";

// ── Heat calc ──────────────────────────────────────────────
function calcHeat(a: Account): number {
  let heat = 10;
  const avgStr = a.signals.length > 0
    ? a.signals.reduce((s, sig) => s + sig.strength, 0) / a.signals.length
    : 0;
  const maxStr = a.signals.length > 0 ? Math.max(...a.signals.map(s => s.strength)) : 0;
  heat += Math.min(15, Math.round(avgStr * 2 + maxStr));
  const convS: Record<string, number> = { very_high: 15, high: 11, moderate: 6, low: 2 };
  const atkS:  Record<string, number> = { now: 10, soon: 6, later: 3, blocked: 0 };
  const sfS:   Record<string, number> = { ideal: 10, good: 7, stretch: 3, hard: 0 };
  heat += convS[a.conviction] || 5;
  heat += atkS[a.attackability] || 3;
  heat += sfS[a.solofit] || 5;
  heat += a.financeLead.name.split(' ').length >= 2 ? 4 : 1;
  heat += a.outreach.length > 0 ? 3 : 0;
  heat += a.status !== 'contacted' ? 3 : 0;
  const prob = calcProbability(a);
  const ev   = Math.round(prob / 100 * a.revenueEstimate);
  heat += ev >= 10000 ? 10 : ev >= 5000 ? 8 : ev >= 2000 ? 6 : ev >= 1000 ? 4 : 2;
  heat += a.scan?.strengthensHypothesis ? 5 : a.scan ? 3 : 1;
  return Math.min(100, heat);
}

function heatColor(h: number): string {
  return h >= 60 ? '#EF4444' : h >= 35 ? '#60A5FA' : P.text3;
}

function fmt(n: number): string {
  return n >= 1000 ? `€${Math.round(n / 1000)}k` : `€${n}`;
}

function safetyPill(a: Account): { text: string; color: string; bg: string } {
  if (a.status === 'contacted') return { text: 'CONTACTED', color: P.text2, bg: 'rgba(148,163,184,0.10)' };
  if (a.status === 'dropped')   return { text: 'DROPPED',   color: P.red,   bg: 'rgba(248,113,113,0.10)' };
  if (a.outreach.some(o => o.status === 'sent'))   return { text: 'SENT',    color: P.green, bg: 'rgba(52,211,153,0.10)' };
  if (a.attackability === 'blocked')                return { text: 'BLOCKED', color: P.red,   bg: 'rgba(248,113,113,0.10)' };
  if (a.outreach.some(o => o.status === 'draft'))  return { text: 'DRAFT',   color: '#60A5FA', bg: 'rgba(96,165,250,0.10)' };
  return { text: 'CLEAR', color: P.green, bg: 'rgba(52,211,153,0.10)' };
}

function emailPill(a: Account): { text: string; color: string; bg: string } {
  const status = a.financeLead.emailStatus || 'missing';
  const meta   = EMAIL_STATUS_META[status] || EMAIL_STATUS_META.missing;
  return { text: meta.label, color: meta.color, bg: `${meta.color}20` };
}

// ── Pill component ─────────────────────────────────────────
function Pill({ text, color, bg }: { text: string; color: string; bg: string }) {
  return (
    <span style={{
      fontFamily: FM, fontSize: 10, fontWeight: 700,
      letterSpacing: '.06em', padding: '3px 8px',
      borderRadius: 3, color, background: bg,
      whiteSpace: 'nowrap',
    }}>
      {text}
    </span>
  );
}

// ── Sortable header cell ───────────────────────────────────
function SortTh({
  label, field, sortField, sortDir, onSort, width,
}: {
  label: string;
  field: SortField | null;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (f: SortField) => void;
  width?: number;
}) {
  return (
    <th
      onClick={() => field && onSort(field)}
      style={{
        fontFamily: FM, fontSize: 10, fontWeight: 600,
        letterSpacing: '.1em', color: P.text3,
        padding: '8px 10px', textAlign: 'left',
        cursor: field ? 'pointer' : 'default',
        userSelect: 'none',
        width: width ?? undefined,
        borderBottom: `1px solid ${P.border}`,
        background: P.surface,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
      {field && (
        <span style={{ color: sortField === field ? P.cyan : '#2A3550', marginLeft: 3 }}>
          {sortField === field ? (sortDir === 'desc' ? '↓' : '↑') : '·'}
        </span>
      )}
    </th>
  );
}

// ── Main ───────────────────────────────────────────────────
export default function AccountsPage() {
  const [accounts,      setAccounts]      = useState<Account[]>([]);
  const [ready,         setReady]         = useState(false);
  const [search,        setSearch]        = useState('');
  const [statusFilter,  setStatusFilter]  = useState<AccountStatus[]>([]);
  const [countryFilter, setCountryFilter] = useState<Country[]>([]);
  const [attackFilter,  setAttackFilter]  = useState<Attackability[]>([]);
  const [sortField,     setSortField]     = useState<SortField>('score');
  const [sortDir,       setSortDir]       = useState<SortDir>('desc');
  const [showDropped,   setShowDropped]   = useState(false);

  useEffect(() => {
    setAccounts(loadAccounts());
    setReady(true);
  }, []);

  const filtered = useMemo(() => {
    let r = filterAccounts(accounts, {
      status:      statusFilter.length  ? statusFilter  : undefined,
      country:     countryFilter.length ? countryFilter : undefined,
      attackability: attackFilter.length ? attackFilter : undefined,
      search:      search || undefined,
    });
    if (!showDropped) r = r.filter(a => a.status !== 'dropped');
    if (sortField === 'heat') {
      const sorted = [...r].sort((a, b) => calcHeat(b) - calcHeat(a));
      return sortDir === 'asc' ? sorted.reverse() : sorted;
    }
    return sortAccounts(r, sortField, sortDir);
  }, [accounts, statusFilter, countryFilter, attackFilter, search, sortField, sortDir, showDropped]);

  function handleSort(f: SortField) {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(f); setSortDir('desc'); }
  }
  function toggle<T extends string>(arr: T[], v: T, set: (a: T[]) => void) {
    set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
  }

  if (!ready) return <div style={{ background: P.bg, minHeight: '100vh' }} />;

  return (
    <div style={{ background: P.bg, fontFamily: FS, color: P.text1, padding: '32px 28px 80px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: FM, fontSize: 9, color: P.text3, letterSpacing: '.18em', textTransform: 'uppercase', marginBottom: 6 }}>
            Ghost Tax · Accounts Intelligence
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-.02em', color: P.text1 }}>
            Pipeline
          </h1>
        </div>
        <span style={{ fontFamily: FM, fontSize: 12, color: P.text3 }}>
          {filtered.length} / {accounts.filter(a => showDropped || a.status !== 'dropped').length}
        </span>
      </div>

      {/* ── Filters ── */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 20,
        flexWrap: 'wrap', alignItems: 'center',
        background: P.surface, borderRadius: 8,
        padding: '10px 14px', border: `1px solid ${P.border}`,
      }}>
        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Recherche…"
          style={{
            fontFamily: FM, fontSize: 12,
            background: P.bg,
            border: `1px solid ${P.border}`,
            borderRadius: 4, padding: '6px 12px',
            color: P.text1, outline: 'none',
            width: 160,
          }}
        />

        <span style={{ width: 1, height: 16, background: P.border }} />

        {/* Country filter */}
        {(['DE','NL','UK','US'] as Country[]).map(c => (
          <button
            key={c}
            onClick={() => toggle(countryFilter, c, setCountryFilter)}
            style={{
              fontFamily: FM, fontSize: 11, fontWeight: 600,
              padding: '4px 10px', borderRadius: 4, cursor: 'pointer',
              background: countryFilter.includes(c) ? 'rgba(34,211,238,0.10)' : 'transparent',
              color:  countryFilter.includes(c) ? P.cyan : P.text3,
              border: `1px solid ${countryFilter.includes(c) ? P.cyan + '28' : P.border}`,
            }}
          >
            {c}
          </button>
        ))}

        <span style={{ width: 1, height: 16, background: P.border }} />

        {/* Attackability filter */}
        {(['now','soon','later'] as Attackability[]).map(a => {
          const m = ATTACK_META[a];
          return (
            <button
              key={a}
              onClick={() => toggle(attackFilter, a, setAttackFilter)}
              style={{
                fontFamily: FM, fontSize: 10, fontWeight: 600,
                padding: '4px 9px', borderRadius: 4, cursor: 'pointer',
                background: attackFilter.includes(a) ? m.bg : 'transparent',
                color:  attackFilter.includes(a) ? m.color : P.text3,
                border: `1px solid ${attackFilter.includes(a) ? m.color + '28' : P.border}`,
              }}
            >
              {m.label}
            </button>
          );
        })}

        <div style={{ flex: 1 }} />

        {/* Dropped toggle */}
        <label style={{
          fontFamily: FM, fontSize: 11, color: P.text3,
          display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={showDropped}
            onChange={e => setShowDropped(e.target.checked)}
            style={{ accentColor: P.red }}
          />
          Dropped
        </label>
      </div>

      {/* ── Table ── */}
      <div style={{
        background: P.surface,
        border: `1px solid ${P.border}`,
        borderRadius: 8, overflowX: 'auto',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
          <thead>
            <tr>
              <SortTh label="#"       field="score"       sortField={sortField} sortDir={sortDir} onSort={handleSort} width={40} />
              <SortTh label="HEAT"    field="heat"        sortField={sortField} sortDir={sortDir} onSort={handleSort} width={52} />
              <SortTh label="COMPANY" field="company"     sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <SortTh label="GEO"     field="country"     sortField={sortField} sortDir={sortDir} onSort={handleSort} width={40} />
              <SortTh label="CONTACT" field={null}        sortField={sortField} sortDir={sortDir} onSort={handleSort} width={140} />
              <SortTh label="SIGNAL"  field={null}        sortField={sortField} sortDir={sortDir} onSort={handleSort} width={180} />
              <SortTh label="ATTACK"  field="attackability" sortField={sortField} sortDir={sortDir} onSort={handleSort} width={90} />
              <SortTh label="CONV."   field="conviction"  sortField={sortField} sortDir={sortDir} onSort={handleSort} width={70} />
              <SortTh label="PROB"    field={null}        sortField={sortField} sortDir={sortDir} onSort={handleSort} width={50} />
              <SortTh label="REV"     field={null}        sortField={sortField} sortDir={sortDir} onSort={handleSort} width={55} />
              <SortTh label="SOLO"    field={null}        sortField={sortField} sortDir={sortDir} onSort={handleSort} width={48} />
              <SortTh label="STATUS"  field={null}        sortField={sortField} sortDir={sortDir} onSort={handleSort} width={110} />
              <SortTh label="EMAIL"   field={null}        sortField={sortField} sortDir={sortDir} onSort={handleSort} width={80} />
              <SortTh label="SAFETY"  field={null}        sortField={sortField} sortDir={sortDir} onSort={handleSort} width={88} />
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => {
              const atk    = ATTACK_META[a.attackability];
              const conv   = CONVICTION_META[a.conviction];
              const st     = STATUS_META[a.status];
              const prob   = calcProbability(a);
              const heat   = calcHeat(a);
              const safety = safetyPill(a);
              const epill  = emailPill(a);
              const sfC: Record<string,string> = { ideal: P.green, good: '#60A5FA', stretch: '#60A5FA', hard: P.red };
              return (
                <tr
                  key={a.id}
                  style={{
                    borderBottom: `1px solid ${P.border}`,
                    opacity: a.status === 'dropped' ? 0.35 : 1,
                  }}
                >
                  {/* Score */}
                  <td style={{ padding: '8px 10px' }}>
                    <Link href={`/command/accounts/${a.id}`} style={{ textDecoration: 'none', fontFamily: FM, fontSize: 13, fontWeight: 700, color: conv.color }}>
                      {a.score}
                    </Link>
                  </td>
                  {/* Heat */}
                  <td style={{ padding: '8px 10px', fontFamily: FM, fontSize: 13, fontWeight: 700, color: heatColor(heat) }}>
                    {heat}
                  </td>
                  {/* Company */}
                  <td style={{ padding: '8px 10px' }}>
                    <Link href={`/command/accounts/${a.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{ fontFamily: FS, fontSize: 13, fontWeight: 600, color: P.text1 }}>
                        {a.company}
                        <span style={{ fontFamily: FM, fontSize: 10, color: P.text3, marginLeft: 6 }}>T{a.tier}</span>
                      </div>
                      <div style={{ fontFamily: FM, fontSize: 11, color: P.text3, marginTop: 2 }}>{a.domain}</div>
                    </Link>
                  </td>
                  {/* Geo */}
                  <td style={{ padding: '8px 10px', fontFamily: FM, fontSize: 12, fontWeight: 600, color: P.text2 }}>
                    {a.country}
                  </td>
                  {/* Contact */}
                  <td style={{ padding: '8px 10px' }}>
                    <div style={{ fontSize: 12, color: P.text1 }}>{a.financeLead.name}</div>
                    <div style={{ fontFamily: FM, fontSize: 10, color: P.text3, marginTop: 2 }}>{a.financeLead.title}</div>
                  </td>
                  {/* Signal */}
                  <td style={{ padding: '8px 10px' }}>
                    <div style={{ fontFamily: FM, fontSize: 11, color: P.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                      {a.mainSignal}
                    </div>
                  </td>
                  {/* Attack */}
                  <td style={{ padding: '8px 10px' }}>
                    <Pill text={atk.label} color={atk.color} bg={atk.bg} />
                  </td>
                  {/* Conviction */}
                  <td style={{ padding: '8px 10px', fontFamily: FM, fontSize: 11, fontWeight: 600, color: conv.color }}>
                    {conv.label}
                  </td>
                  {/* Probability */}
                  <td style={{ padding: '8px 10px', fontFamily: FM, fontSize: 12, fontWeight: 700, color: prob >= 40 ? P.green : '#60A5FA' }}>
                    {prob}%
                  </td>
                  {/* Revenue */}
                  <td style={{ padding: '8px 10px', fontFamily: FM, fontSize: 12, fontWeight: 600, color: P.text1 }}>
                    {fmt(a.revenueEstimate)}
                  </td>
                  {/* Solofit */}
                  <td style={{ padding: '8px 10px', fontFamily: FM, fontSize: 10, fontWeight: 600, color: sfC[a.solofit] || P.text3 }}>
                    {a.solofit.toUpperCase()}
                  </td>
                  {/* Status */}
                  <td style={{ padding: '8px 10px' }}>
                    <Pill text={st.label} color={st.color} bg={st.bg} />
                  </td>
                  {/* Email */}
                  <td style={{ padding: '8px 10px' }}>
                    <Pill text={epill.text} color={epill.color} bg={epill.bg} />
                  </td>
                  {/* Safety */}
                  <td style={{ padding: '8px 10px' }}>
                    <Pill text={safety.text} color={safety.color} bg={safety.bg} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div style={{
            fontFamily: FM, fontSize: 13, color: P.text3,
            textAlign: 'center', padding: '32px 0',
          }}>
            Aucun compte ne correspond aux filtres
          </div>
        )}
      </div>

    </div>
  );
}
