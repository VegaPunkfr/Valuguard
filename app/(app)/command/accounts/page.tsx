'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import type { Account, AccountStatus, Country, Attackability, SortField, SortDir } from '@/types/command';
import { STATUS_META, ATTACK_META, CONVICTION_META } from '@/types/command';
import { loadAccounts, filterAccounts, sortAccounts, calcProbability } from '@/lib/command/store';

const mono: React.CSSProperties = { fontFamily: 'var(--vg-font-mono, monospace)' };

function Pill({ text, color, bg }: { text: string; color: string; bg: string }) {
  return <span style={{ ...mono, fontSize: 7, fontWeight: 600, letterSpacing: '0.05em', padding: '2px 5px', borderRadius: 2, color, background: bg, whiteSpace: 'nowrap' as const }}>{text}</span>;
}
function fmt(n: number): string { return n >= 1000 ? `€${Math.round(n / 1000)}k` : `€${n}`; }

const SF_C: Record<string, string> = { ideal: '#34d399', good: '#60a5fa', stretch: '#fbbf24', hard: '#f87171' };

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AccountStatus[]>([]);
  const [countryFilter, setCountryFilter] = useState<Country[]>([]);
  const [attackFilter, setAttackFilter] = useState<Attackability[]>([]);
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showDropped, setShowDropped] = useState(false);

  useEffect(() => { setAccounts(loadAccounts()); setReady(true); }, []);

  const filtered = useMemo(() => {
    let r = filterAccounts(accounts, { status: statusFilter.length ? statusFilter : undefined, country: countryFilter.length ? countryFilter : undefined, attackability: attackFilter.length ? attackFilter : undefined, search: search || undefined });
    if (!showDropped) r = r.filter(a => a.status !== 'dropped');
    return sortAccounts(r, sortField, sortDir);
  }, [accounts, statusFilter, countryFilter, attackFilter, search, sortField, sortDir, showDropped]);

  const handleSort = (f: SortField) => { if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortField(f); setSortDir('desc'); } };
  const toggle = <T extends string>(arr: T[], v: T, set: (a: T[]) => void) => set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

  if (!ready) return null;

  return (
    <div style={mono}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#e4e9f4' }}>Accounts Intelligence</span>
        <span style={{ fontSize: 10, color: '#475569' }}>{filtered.length}/{accounts.length}</span>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' as const, alignItems: 'center', background: '#0a0d19', borderRadius: 6, padding: '8px 12px', border: '1px solid rgba(36,48,78,0.18)' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ ...mono, fontSize: 10, background: '#060912', border: '1px solid rgba(36,48,78,0.22)', borderRadius: 3, padding: '4px 8px', color: '#e4e9f4', outline: 'none', width: 160 }} />
        <span style={{ width: 1, height: 16, background: 'rgba(36,48,78,0.22)' }} />
        {(['DE', 'NL', 'UK', 'US'] as Country[]).map(c => (
          <button key={c} onClick={() => toggle(countryFilter, c, setCountryFilter)} style={{ ...mono, fontSize: 8, fontWeight: 600, padding: '2px 7px', borderRadius: 2, cursor: 'pointer', background: countryFilter.includes(c) ? 'rgba(96,165,250,0.12)' : 'transparent', color: countryFilter.includes(c) ? '#60a5fa' : '#475569', border: countryFilter.includes(c) ? '1px solid rgba(96,165,250,0.22)' : '1px solid rgba(36,48,78,0.12)' }}>{c}</button>
        ))}
        <span style={{ width: 1, height: 16, background: 'rgba(36,48,78,0.22)' }} />
        {(['now', 'soon', 'later'] as Attackability[]).map(a => {
          const m = ATTACK_META[a];
          return <button key={a} onClick={() => toggle(attackFilter, a, setAttackFilter)} style={{ ...mono, fontSize: 7, fontWeight: 600, padding: '2px 6px', borderRadius: 2, cursor: 'pointer', background: attackFilter.includes(a) ? m.bg : 'transparent', color: attackFilter.includes(a) ? m.color : '#475569', border: `1px solid ${attackFilter.includes(a) ? m.color + '28' : 'rgba(36,48,78,0.12)'}` }}>{m.label}</button>;
        })}
        <div style={{ flex: 1 }} />
        <label style={{ fontSize: 8, color: '#3a4560', display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
          <input type="checkbox" checked={showDropped} onChange={e => setShowDropped(e.target.checked)} style={{ accentColor: '#f87171' }} /> Dropped
        </label>
      </div>

      {/* Table */}
      <div style={{ background: '#0a0d19', border: '1px solid rgba(36,48,78,0.18)', borderRadius: 6, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(36,48,78,0.22)' }}>
              {[
                { f: 'score' as SortField, l: '#', w: 38 },
                { f: 'company' as SortField, l: 'COMPANY', w: undefined },
                { f: 'country' as SortField, l: 'GEO', w: 36 },
                { f: null, l: 'FINANCE LEAD', w: 130 },
                { f: null, l: 'SIGNAL', w: 170 },
                { f: 'attackability' as SortField, l: 'ATTACK', w: 80 },
                { f: 'conviction' as SortField, l: 'CONV.', w: 60 },
                { f: null, l: 'PROB', w: 44 },
                { f: null, l: 'REV', w: 50 },
                { f: null, l: 'SOLO', w: 44 },
                { f: null, l: 'STATUS', w: 90 },
                { f: null, l: 'LAST EVENT', w: 130 },
              ].map((c, i) => (
                <th key={i} onClick={() => c.f && handleSort(c.f)} style={{ ...mono, fontSize: 7, fontWeight: 600, letterSpacing: '0.10em', color: '#475569', padding: '7px 8px', textAlign: 'left' as const, cursor: c.f ? 'pointer' : 'default', width: c.w, userSelect: 'none' as const }}>
                  {c.l}{c.f && <span style={{ color: sortField === c.f ? '#60a5fa' : '#1e293b', marginLeft: 2 }}>{sortField === c.f ? (sortDir === 'desc' ? '↓' : '↑') : '·'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => {
              const atk = ATTACK_META[a.attackability];
              const conv = CONVICTION_META[a.conviction];
              const st = STATUS_META[a.status];
              const prob = calcProbability(a);
              const lastEvent = a.timeline.length > 0 ? a.timeline[a.timeline.length - 1] : null;
              return (
                <tr key={a.id} style={{ borderBottom: '1px solid rgba(36,48,78,0.08)', opacity: a.status === 'dropped' ? 0.35 : 1 }}>
                  <td style={{ padding: '8px' }}><Link href={`/command/accounts/${a.id}`} style={{ textDecoration: 'none', fontSize: 12, fontWeight: 700, color: conv.color }}>{a.score}</Link></td>
                  <td style={{ padding: '8px' }}>
                    <Link href={`/command/accounts/${a.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#e4e9f4' }}>{a.company} <span style={{ fontSize: 7, color: '#3a4560' }}>T{a.tier}</span></div>
                      <div style={{ fontSize: 8, color: '#475569', marginTop: 1 }}>{a.domain}</div>
                    </Link>
                  </td>
                  <td style={{ fontSize: 9, fontWeight: 600, color: '#94a3b8', padding: '8px' }}>{a.country}</td>
                  <td style={{ padding: '8px' }}>
                    <div style={{ fontSize: 9, color: '#e4e9f4' }}>{a.financeLead.name}</div>
                    <div style={{ fontSize: 7, color: '#475569', marginTop: 1 }}>{a.financeLead.title}</div>
                  </td>
                  <td style={{ padding: '8px' }}><div style={{ fontSize: 8, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, maxWidth: 170 }}>{a.mainSignal}</div></td>
                  <td style={{ padding: '8px' }}><Pill text={atk.label} color={atk.color} bg={atk.bg} /></td>
                  <td style={{ padding: '8px', fontSize: 8, fontWeight: 600, color: conv.color }}>{conv.label}</td>
                  <td style={{ padding: '8px', fontSize: 10, fontWeight: 700, color: prob >= 40 ? '#34d399' : prob >= 25 ? '#60a5fa' : '#fbbf24' }}>{prob}%</td>
                  <td style={{ padding: '8px', fontSize: 9, fontWeight: 600, color: '#e4e9f4' }}>{fmt(a.revenueEstimate)}</td>
                  <td style={{ padding: '8px', fontSize: 7, fontWeight: 600, color: SF_C[a.solofit] || '#64748b' }}>{a.solofit.toUpperCase()}</td>
                  <td style={{ padding: '8px' }}><Pill text={st.label} color={st.color} bg={st.bg} /></td>
                  <td style={{ padding: '8px' }}>
                    {lastEvent && <div style={{ fontSize: 8, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, maxWidth: 130 }}>{lastEvent.detail}</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ fontSize: 10, color: '#3a4560', textAlign: 'center' as const, padding: 28 }}>No accounts match</div>}
      </div>
    </div>
  );
}
