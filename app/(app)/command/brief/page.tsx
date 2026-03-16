'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Account } from '@/types/command';
import { CONVICTION_META, ATTACK_META } from '@/types/command';
import { loadAccounts, getAttackNow, getScanNeeded, getKillCandidates, getOutreachReady } from '@/lib/command/store';

const mono: React.CSSProperties = { fontFamily: 'var(--vg-font-mono, monospace)' };
const box: React.CSSProperties = { background: '#0a0d19', border: '1px solid rgba(36,48,78,0.25)', borderRadius: 8, padding: '16px 20px' };
const lbl: React.CSSProperties = { ...mono, fontSize: 8, fontWeight: 600, letterSpacing: '0.16em', color: '#475569', marginBottom: 10, textTransform: 'uppercase' as const };

export default function BriefPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => { setAccounts(loadAccounts()); setReady(true); }, []);
  if (!ready) return null;

  const active = accounts.filter(a => a.status !== 'dropped');
  const attackNow = getAttackNow(accounts);
  const scanNeeded = getScanNeeded(accounts);
  const killCandidates = getKillCandidates(accounts);
  const outreachReady = getOutreachReady(accounts);
  const top1 = attackNow[0];
  const top2 = attackNow[1];

  return (
    <div style={mono}>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#e4e9f4', marginBottom: 2 }}>Decision Brief</div>
      <div style={{ fontSize: 10, color: '#475569', marginBottom: 20 }}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>

      {/* Executive summary */}
      <div style={{ ...box, borderLeft: '3px solid #60a5fa', marginBottom: 16 }}>
        <div style={{ ...lbl, color: '#60a5fa' }}>EXECUTIVE SUMMARY</div>
        <div style={{ fontSize: 12, color: '#e4e9f4', lineHeight: 1.7 }}>
          <p style={{ margin: '0 0 8px' }}>
            Pipeline: <strong>{active.length}</strong> comptes actifs.
            <strong style={{ color: '#34d399' }}> {attackNow.length}</strong> prêts à attaquer.
            <strong style={{ color: '#22d3ee' }}> {scanNeeded.length}</strong> non scannés.
            <strong style={{ color: '#a78bfa' }}> {outreachReady.length}</strong> outreach ready.
          </p>
          {top1 && <p style={{ margin: '0 0 8px' }}>
            <strong style={{ color: '#34d399' }}>Priorité #1: {top1.company}</strong> (score {top1.score}/25).
            {top1.mainSignal}. {top1.outreach.length > 0 ? `${top1.outreach.filter(o => o.status === 'draft').length} messages prêts.` : 'Messages non rédigés.'}
          </p>}
          {top2 && <p style={{ margin: '0 0 8px' }}>
            <strong style={{ color: '#60a5fa' }}>Priorité #2: {top2.company}</strong> (score {top2.score}/25).
            {top2.mainSignal}.
          </p>}
          {killCandidates.length > 0 && <p style={{ margin: '0 0 8px', color: '#f87171' }}>
            {killCandidates.length} compte(s) à évaluer pour élimination: {killCandidates.map(a => a.company).join(', ')}.
          </p>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Recommendations */}
        <div style={box}>
          <div style={lbl}>RECOMMENDATIONS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {attackNow.slice(0, 2).map(a => (
              <div key={a.id} style={{ padding: '10px 12px', borderRadius: 6, background: 'rgba(52,211,153,0.04)', border: '1px solid rgba(52,211,153,0.10)' }}>
                <div style={{ fontSize: 8, fontWeight: 600, letterSpacing: '0.12em', color: '#34d399', marginBottom: 3 }}>ATTACK NOW</div>
                <Link href={`/command/accounts/${a.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#e4e9f4' }}>{a.company} <span style={{ fontSize: 9, color: '#64748b' }}>({a.financeLead.name})</span></div>
                </Link>
                <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 3, lineHeight: 1.5 }}>{a.whyNow}</div>
              </div>
            ))}
            {active.filter(a => a.attackability === 'soon').slice(0, 2).map(a => (
              <div key={a.id} style={{ padding: '10px 12px', borderRadius: 6, background: 'rgba(96,165,250,0.04)', border: '1px solid rgba(96,165,250,0.10)' }}>
                <div style={{ fontSize: 8, fontWeight: 600, letterSpacing: '0.12em', color: '#60a5fa', marginBottom: 3 }}>SCAN FIRST, THEN DECIDE</div>
                <Link href={`/command/accounts/${a.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#e4e9f4' }}>{a.company}</div>
                </Link>
                <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 3, lineHeight: 1.5 }}>{a.whyNow}</div>
              </div>
            ))}
            {killCandidates.length > 0 && killCandidates.slice(0, 1).map(a => (
              <div key={a.id} style={{ padding: '10px 12px', borderRadius: 6, background: 'rgba(248,113,113,0.04)', border: '1px solid rgba(248,113,113,0.10)' }}>
                <div style={{ fontSize: 8, fontWeight: 600, letterSpacing: '0.12em', color: '#f87171', marginBottom: 3 }}>CONSIDER DROPPING</div>
                <Link href={`/command/accounts/${a.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>{a.company}</div>
                </Link>
                <div style={{ fontSize: 9, color: '#64748b', marginTop: 3, lineHeight: 1.5 }}>
                  {a.weaknesses.length > 0 ? a.weaknesses[0] : 'Conviction too low to justify time investment.'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risks + Intel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={box}>
            <div style={lbl}>STRATEGIC RISKS</div>
            {[
              { risk: `${scanNeeded.length} accounts unscanned — hypotheses unvalidated`, sev: scanNeeded.length > 3 ? 'high' : 'med' },
              { risk: 'No US/UK accounts in final pipeline — DACH concentration', sev: 'low' },
              { risk: 'All contacts are CFOs — no alternative entry points if unresponsive', sev: 'med' },
              { risk: `${killCandidates.length} weak account(s) consuming pipeline attention`, sev: killCandidates.length > 0 ? 'med' : 'low' },
            ].map((r, i) => (
              <div key={i} style={{ fontSize: 9, color: '#94a3b8', lineHeight: 1.5, padding: '6px 10px', borderRadius: 4, marginBottom: 4, borderLeft: `2px solid ${r.sev === 'high' ? '#f87171' : r.sev === 'med' ? '#fbbf24' : '#475569'}`, background: r.sev === 'high' ? 'rgba(248,113,113,0.04)' : r.sev === 'med' ? 'rgba(251,191,36,0.04)' : 'rgba(71,85,105,0.04)' }}>
                {r.risk}
              </div>
            ))}
          </div>

          <div style={box}>
            <div style={lbl}>MARKET INTELLIGENCE — 2026</div>
            {[
              'SaaS spend/employee: $9,100/yr (Zylo 2026) — up 27% in 2 years',
              'AI pricing increases: 8-12% avg, aggressive movers 15-25%',
              '78% IT leaders report unexpected AI charges (2026)',
              'Tech layoffs: 45,000+ early 2026 — zombie licenses industry-wide',
              'Avg enterprise SaaS: $55.7M/yr (flat app count, rising costs)',
            ].map((d, i) => (
              <div key={i} style={{ fontSize: 9, color: '#94a3b8', lineHeight: 1.5, paddingLeft: 10, borderLeft: '1px solid rgba(96,165,250,0.12)', marginBottom: 4 }}>{d}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Week plan */}
      <div style={box}>
        <div style={lbl}>EXECUTION PLAN — THIS WEEK</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {[
            { day: 'MON', tasks: ['Scan all 8 domains', 'Find 5 LinkedIn profiles', `Connect #1: ${top1?.financeLead.name || '—'}`] },
            { day: 'TUE', tasks: [`Email #1: ${top1?.company || '—'}`, `Connect #2: ${top2?.financeLead.name || '—'}`] },
            { day: 'WED', tasks: [`Email #2: ${top2?.company || '—'}`, 'Connect #3-4: Mambu, Razor'] },
            { day: 'THU', tasks: ['Email #3-4: Mambu, Razor', 'Connect #5: Circula'] },
            { day: 'FRI', tasks: ['Email #5: Circula', 'Check email opens', 'Prep follow-ups J+5'] },
          ].map(d => (
            <div key={d.day} style={{ padding: '10px 12px', borderRadius: 6, background: 'rgba(14,18,33,0.4)', border: '1px solid rgba(36,48,78,0.10)' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#60a5fa', marginBottom: 6, letterSpacing: '0.1em' }}>{d.day}</div>
              {d.tasks.map((t, i) => <div key={i} style={{ fontSize: 9, color: '#94a3b8', lineHeight: 1.5, marginBottom: 2 }}>{t}</div>)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
