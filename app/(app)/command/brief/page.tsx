'use client';

/**
 * GHOST TAX — DECISION BRIEF v2
 * Clean rebuild — palette correcte, JetBrains Mono + Inter.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Account } from '@/types/command';
import { CONVICTION_META, ATTACK_META } from '@/types/command';
import {
  loadAccounts,
  getAttackNow,
  getScanNeeded,
  getKillCandidates,
  getOutreachReady,
  calcProbability,
  calcExpectedValue,
} from '@/lib/command/store';

// ── Tokens ─────────────────────────────────────────────────
const P = {
  bg:      '#060912',
  surface: '#0C1019',
  border:  'rgba(255,255,255,0.06)',
  text1:   '#F1F5F9',
  text2:   '#94A3B8',
  text3:   '#475569',
  cyan:    '#22D3EE',
  green:   '#34D399',
  amber:   '#FBBF24',
  red:     '#F87171',
  blue:    '#60A5FA',
  violet:  '#A78BFA',
};
const FM = "var(--vg-font-mono,'JetBrains Mono',monospace)";
const FS = "var(--vg-font-sans,'Inter',system-ui,sans-serif)";

function fmtEur(n: number): string {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M€`
       : n >= 1_000     ? `${Math.round(n / 1_000)}k€`
       : `${n}€`;
}

const FLAGS: Record<string, string> = {
  DE:'🇩🇪', NL:'🇳🇱', AT:'🇦🇹', CH:'🇨🇭', FR:'🇫🇷', GB:'🇬🇧', US:'🇺🇸', BE:'🇧🇪',
};

// ── Account row ────────────────────────────────────────────
function AccountRow({
  account,
  rank,
  accentColor,
}: {
  account: Account;
  rank: number;
  accentColor: string;
}) {
  const atk  = ATTACK_META[account.attackability];
  const conv = CONVICTION_META[account.conviction];
  const prob = calcProbability(account);
  const ev   = calcExpectedValue(account);

  return (
    <Link
      href={`/command/accounts/${account.id}`}
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', borderRadius: 7, marginBottom: 6,
        background: 'rgba(255,255,255,0.02)',
        border: `1px solid ${P.border}`,
        transition: 'background .15s ease',
      }}>
        {/* Rank */}
        <span style={{
          fontFamily: FM, fontSize: 11, fontWeight: 700,
          color: accentColor, width: 20, flexShrink: 0,
        }}>
          #{rank}
        </span>

        {/* Flag */}
        <span style={{ fontSize: 14, flexShrink: 0 }}>
          {FLAGS[account.country] || '🌍'}
        </span>

        {/* Company + domain */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: P.text1, marginBottom: 2 }}>
            {account.company}
          </div>
          <div style={{ fontFamily: FM, fontSize: 10, color: P.text3 }}>
            {account.financeLead.name} · {account.financeLead.title}
          </div>
        </div>

        {/* Signal */}
        <div style={{
          fontFamily: FM, fontSize: 11, color: P.text2,
          maxWidth: 200, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          flexShrink: 1,
        }}>
          {account.mainSignal}
        </div>

        {/* Metrics */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: FM, fontSize: 10, color: atk.color, padding: '3px 7px', borderRadius: 3, background: atk.bg }}>
            {atk.label}
          </span>
          <span style={{ fontFamily: FM, fontSize: 10, color: conv.color }}>
            {conv.label}
          </span>
          <span style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: P.text1 }}>
            {prob}%
          </span>
          <span style={{ fontFamily: FM, fontSize: 11, color: P.green }}>
            {fmtEur(ev)}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── Section card ───────────────────────────────────────────
function Section({
  title, color, children, count,
}: {
  title: string;
  color: string;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <div style={{
      background: P.surface,
      border: `1px solid ${P.border}`,
      borderRadius: 10, padding: '20px 24px',
      marginBottom: 16,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <div style={{
          fontFamily: FM, fontSize: 9, fontWeight: 700,
          letterSpacing: '.18em', textTransform: 'uppercase', color,
        }}>
          {title}
        </div>
        {count !== undefined && (
          <span style={{
            fontFamily: FM, fontSize: 14, fontWeight: 700, color,
          }}>
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────
export default function BriefPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [ready,    setReady]    = useState(false);

  useEffect(() => {
    setAccounts(loadAccounts());
    setReady(true);
  }, []);

  if (!ready) return <div style={{ background: P.bg, minHeight: '100vh' }} />;

  const active        = accounts.filter(a => a.status !== 'dropped');
  const attackNow     = getAttackNow(accounts);
  const scanNeeded    = getScanNeeded(accounts);
  const killCandidates = getKillCandidates(accounts);
  const outreachReady = getOutreachReady(accounts);
  const sentToday     = accounts.filter(a => a.outreach.some(o => o.status === 'sent'));

  const top1 = attackNow[0];
  const top2 = attackNow[1];

  const totalPipeline = active.reduce((s, a) => s + calcExpectedValue(a), 0);

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div style={{ background: P.bg, fontFamily: FS, color: P.text1, padding: '32px 28px 80px' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: FM, fontSize: 9, color: P.text3, letterSpacing: '.18em', textTransform: 'uppercase', marginBottom: 6 }}>
          Ghost Tax · Decision Brief
        </div>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 600, letterSpacing: '-.02em' }}>
          {today.charAt(0).toUpperCase() + today.slice(1)}
        </h1>
        <div style={{ fontFamily: FM, fontSize: 12, color: P.text3 }}>
          {active.length} comptes actifs · Pipeline EV:{' '}
          <span style={{ color: P.green }}>{fmtEur(totalPipeline)}</span>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5,1fr)',
        gap: 10, marginBottom: 28,
      }}>
        {[
          { label: 'Attack Now',     value: attackNow.length,     color: P.green  },
          { label: 'Outreach Ready', value: outreachReady.length, color: P.violet },
          { label: 'Scan Needed',    value: scanNeeded.length,    color: P.cyan   },
          { label: 'Sent',           value: sentToday.length,     color: P.text1  },
          { label: 'Kill Review',    value: killCandidates.length,color: P.red    },
        ].map(k => (
          <div key={k.label} style={{
            background: P.surface, border: `1px solid ${P.border}`,
            borderRadius: 8, padding: '14px 16px',
          }}>
            <div style={{ fontFamily: FM, fontSize: 22, fontWeight: 700, color: k.color, lineHeight: 1 }}>
              {k.value}
            </div>
            <div style={{ fontFamily: FM, fontSize: 9, color: P.text3, marginTop: 6, letterSpacing: '.08em', textTransform: 'uppercase' }}>
              {k.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Executive summary ── */}
      <div style={{
        background: P.surface,
        borderLeft: `3px solid ${P.blue}`,
        border: `1px solid ${P.border}`,
        borderRadius: 10, padding: '20px 24px',
        marginBottom: 16,
      }}>
        <div style={{ fontFamily: FM, fontSize: 9, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: P.blue, marginBottom: 14 }}>
          Synthèse Exécutive
        </div>
        <div style={{ fontSize: 14, color: P.text1, lineHeight: 1.8 }}>
          Pipeline actif: <strong style={{ color: P.text1 }}>{active.length} comptes</strong>.{' '}
          <strong style={{ color: P.green }}>{attackNow.length} prêts à attaquer</strong> ·{' '}
          <strong style={{ color: P.cyan }}>{scanNeeded.length} non scannés</strong> ·{' '}
          <strong style={{ color: P.violet }}>{outreachReady.length} outreach ready</strong>.
        </div>
        {top1 && (
          <div style={{ marginTop: 12, fontSize: 14, color: P.text2, lineHeight: 1.7 }}>
            <strong style={{ color: P.green }}>Priorité #1 : {top1.company}</strong>{' '}
            (score {top1.score}/25 · {calcProbability(top1)}% · EV {fmtEur(calcExpectedValue(top1))}).{' '}
            {top1.mainSignal}.{' '}
            {top1.outreach.filter(o => o.status === 'draft').length > 0
              ? `${top1.outreach.filter(o => o.status === 'draft').length} message(s) prêts.`
              : 'Messages non rédigés.'}
          </div>
        )}
        {top2 && (
          <div style={{ marginTop: 8, fontSize: 14, color: P.text2, lineHeight: 1.7 }}>
            <strong style={{ color: P.blue }}>Priorité #2 : {top2.company}</strong>{' '}
            (score {top2.score}/25 · EV {fmtEur(calcExpectedValue(top2))}).{' '}
            {top2.mainSignal}.
          </div>
        )}
        {killCandidates.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 13, color: P.red, lineHeight: 1.6 }}>
            ⚠️ {killCandidates.length} compte(s) à évaluer pour élimination :{' '}
            {killCandidates.map(a => a.company).join(', ')}.
          </div>
        )}
      </div>

      {/* ── Attack Now ── */}
      {attackNow.length > 0 && (
        <Section title="Attack Now — Contacter cette semaine" color={P.green} count={attackNow.length}>
          {attackNow.slice(0, 5).map((a, i) => (
            <AccountRow key={a.id} account={a} rank={i + 1} accentColor={P.green} />
          ))}
        </Section>
      )}

      {/* ── Outreach Ready ── */}
      {outreachReady.length > 0 && (
        <Section title="Outreach Ready — Messages prêts à envoyer" color={P.violet} count={outreachReady.length}>
          {outreachReady.slice(0, 5).map((a, i) => (
            <AccountRow key={a.id} account={a} rank={i + 1} accentColor={P.violet} />
          ))}
          {outreachReady.length > 0 && (
            <Link
              href="/command"
              style={{
                display: 'block', marginTop: 8,
                fontFamily: FM, fontSize: 11, color: P.cyan,
                textDecoration: 'none', textAlign: 'center',
                padding: '8px', borderRadius: 6,
                border: `1px solid ${P.border}`,
              }}
            >
              Approuver via Mission Control →
            </Link>
          )}
        </Section>
      )}

      {/* ── Scan Needed ── */}
      {scanNeeded.length > 0 && (
        <Section title="Scan Needed — Intelligence manquante" color={P.cyan} count={scanNeeded.length}>
          {scanNeeded.slice(0, 5).map((a, i) => (
            <AccountRow key={a.id} account={a} rank={i + 1} accentColor={P.cyan} />
          ))}
          <Link
            href="/command/scan"
            style={{
              display: 'block', marginTop: 8,
              fontFamily: FM, fontSize: 11, color: P.cyan,
              textDecoration: 'none', textAlign: 'center',
              padding: '8px', borderRadius: 6,
              border: `1px solid ${P.border}`,
            }}
          >
            Gérer les scans →
          </Link>
        </Section>
      )}

      {/* ── Kill Review ── */}
      {killCandidates.length > 0 && (
        <Section title="Kill Review — Comptes à éliminer" color={P.red} count={killCandidates.length}>
          {killCandidates.slice(0, 5).map((a, i) => (
            <AccountRow key={a.id} account={a} rank={i + 1} accentColor={P.red} />
          ))}
        </Section>
      )}

      {/* ── Actions checklist ── */}
      <div style={{
        background: P.surface,
        border: `1px solid ${P.border}`,
        borderRadius: 10, padding: '20px 24px',
      }}>
        <div style={{ fontFamily: FM, fontSize: 9, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: P.amber, marginBottom: 16 }}>
          Actions d&apos;aujourd&apos;hui
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {attackNow.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: FM, fontSize: 12, color: P.text2 }}>
              <span style={{ color: P.green }}>→</span>
              Contacter {attackNow[0]?.company} via{' '}
              {attackNow[0]?.outreach.find(o => o.status === 'draft')?.channel || 'LinkedIn'}
            </div>
          )}
          {scanNeeded.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: FM, fontSize: 12, color: P.text2 }}>
              <span style={{ color: P.cyan }}>→</span>
              Scanner {scanNeeded[0]?.domain} ({scanNeeded.length} en attente)
            </div>
          )}
          {outreachReady.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: FM, fontSize: 12, color: P.text2 }}>
              <span style={{ color: P.violet }}>→</span>
              Approuver {outreachReady.length} message(s) via Mission Control
            </div>
          )}
          {killCandidates.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: FM, fontSize: 12, color: P.text2 }}>
              <span style={{ color: P.red }}>→</span>
              Évaluer {killCandidates[0]?.company} pour élimination
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
