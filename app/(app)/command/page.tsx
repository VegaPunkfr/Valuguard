'use client';

/**
 * GHOST TAX — COMMAND OVERVIEW
 * Base vierge. Logique métier conservée.
 */

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { loadAccounts } from '@/lib/command/store';
import { calcHeatScore, buildQueue, loadLedger } from '@/lib/command/hot-queue';
import type { Account } from '@/types/command';

// ── Tokens (règles officielles 05-ui-brand.md) ────────────
const P = {
  bg:       '#060912',
  surface:  '#0a0d19',
  panel:    '#0e1221',
  inset:    '#121828',
  border:   'rgba(36,48,78,0.28)',
  borderSt: 'rgba(36,48,78,0.40)',
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
function heatColor(score: number) {
  if (score >= 75) return P.red;
  if (score >= 60) return P.amber;
  if (score >= 40) return P.blue;
  return P.text3;
}

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

function StatBox({
  value, label, sub, color,
}: {
  value: string | number;
  label: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div style={{
      background: P.surface,
      border: `1px solid ${P.border}`,
      borderRadius: 10,
      padding: '20px 22px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      <Label>{label}</Label>
      <div style={{
        fontFamily: FM, fontSize: 28, fontWeight: 800,
        color: color ?? P.text1,
        letterSpacing: '-.02em',
        lineHeight: 1,
      }}>
        {value}
      </div>
      {sub && <div style={{ fontFamily: FM, fontSize: 10, color: P.text3 }}>{sub}</div>}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────
export default function CommandOverview() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setAccounts(loadAccounts());
    setReady(true);
  }, []);

  const ledger = useMemo(() => {
    if (!ready) return [];
    return loadLedger();
  }, [ready]);

  const queue = useMemo(() => {
    if (!ready) return null;
    return buildQueue(accounts.filter(a => a.status !== 'dropped'), ledger);
  }, [accounts, ledger, ready]);

  const hotAccounts = useMemo(() => {
    if (!ready) return [];
    return accounts
      .filter(a => a.status !== 'dropped')
      .map(a => ({ account: a, heat: calcHeatScore(a) }))
      .sort((a, b) => b.heat.total - a.heat.total)
      .slice(0, 8);
  }, [accounts, ready]);

  const stats = useMemo(() => {
    const active    = accounts.filter(a => a.status !== 'dropped');
    const contacted = accounts.filter(a => a.status === 'contacted');
    const scanReady = accounts.filter(a => !a.scan && a.status !== 'dropped');
    const revenue   = active.reduce((s, a) => s + (a.revenueEstimate || 0), 0);
    return { active: active.length, contacted: contacted.length, scanReady: scanReady.length, revenue };
  }, [accounts]);

  if (!ready) {
    return (
      <div style={{ background: P.bg, minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: FM, fontSize: 11, color: P.text4 }}>LOADING…</span>
      </div>
    );
  }

  return (
    <div style={{ background: P.bg, fontFamily: FS, color: P.text1, minHeight: '100%', padding: '28px 28px 80px' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <Label color={P.cyan}>Ghost Tax · Mission Control</Label>
        <h1 style={{
          margin: '6px 0 0', fontSize: 20, fontWeight: 800,
          letterSpacing: '-.02em', color: P.text1,
        }}>
          Command Overview
        </h1>
      </div>

      {/* ── KPI Row ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: 12,
        marginBottom: 32,
      }}>
        <StatBox value={stats.active}      label="Active accounts" />
        <StatBox value={queue?.stats.hotCount ?? 0} label="Hot queue" color={P.red} sub="heat ≥ 60" />
        <StatBox value={queue?.stats.warmCount ?? 0} label="Warm queue" color={P.amber} sub="heat 35–59" />
        <StatBox value={stats.contacted}   label="Contacted" color={P.blue} />
        <StatBox value={stats.scanReady}   label="Scan needed" color={P.amber} />
        <StatBox
          value={`€${Math.round(stats.revenue / 1000)}k`}
          label="Pipeline value"
          color={P.green}
          sub="estimated"
        />
      </div>

      {/* ── Hot Queue Table ── */}
      <section style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <Label color={P.red}>Hot Queue — Attack Now</Label>
          <Link href="/command/outreach" style={{ fontFamily: FM, fontSize: 9, color: P.blue, textDecoration: 'none', letterSpacing: '.1em' }}>
            VIEW ALL →
          </Link>
        </div>

        <div style={{
          background: P.surface,
          border: `1px solid ${P.border}`,
          borderRadius: 10,
          overflow: 'hidden',
        }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '52px 1fr 120px 80px 90px 100px 80px',
            padding: '10px 16px',
            borderBottom: `1px solid ${P.border}`,
          }}>
            {['HEAT', 'COMPANY', 'CONTACT', 'COUNTRY', 'CHANNEL', 'EV', 'STATUS'].map(h => (
              <Label key={h}>{h}</Label>
            ))}
          </div>

          {/* Rows */}
          {hotAccounts.length === 0 ? (
            <div style={{ padding: '28px 16px', textAlign: 'center' }}>
              <span style={{ fontFamily: FM, fontSize: 11, color: P.text4 }}>No accounts yet — run a scan</span>
            </div>
          ) : (
            hotAccounts.map(({ account: a, heat }) => {
              const col = heatColor(heat.total);
              return (
                <Link
                  key={a.id}
                  href={`/command/accounts/${a.id}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '52px 1fr 120px 80px 90px 100px 80px',
                    padding: '11px 16px',
                    borderBottom: `1px solid ${P.border}`,
                    textDecoration: 'none',
                    alignItems: 'center',
                    transition: 'background .1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = P.panel)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Heat */}
                  <div style={{
                    fontFamily: FM, fontSize: 13, fontWeight: 800,
                    color: col,
                    background: `${col}12`,
                    border: `1px solid ${col}30`,
                    borderRadius: 5,
                    padding: '2px 0',
                    textAlign: 'center',
                    width: 38,
                  }}>
                    {heat.total}
                  </div>

                  {/* Company */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: P.text1 }}>{a.company}</div>
                    <div style={{ fontFamily: FM, fontSize: 10, color: P.text3, marginTop: 1 }}>{a.domain}</div>
                  </div>

                  {/* Contact */}
                  <div style={{ fontFamily: FM, fontSize: 11, color: P.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                    {a.financeLead.name}
                  </div>

                  {/* Country */}
                  <div style={{ fontFamily: FM, fontSize: 11, color: P.text3 }}>{a.country}</div>

                  {/* Channel */}
                  <div style={{ fontFamily: FM, fontSize: 10, fontWeight: 700, color: P.blue, letterSpacing: '.06em' }}>
                    {(a.preferredChannel || 'LINKEDIN').toUpperCase()}
                  </div>

                  {/* EV */}
                  <div style={{ fontFamily: FM, fontSize: 12, fontWeight: 700, color: P.green }}>
                    €{(a.revenueEstimate || 0).toLocaleString()}
                  </div>

                  {/* Status */}
                  <div>
                    <span style={{
                      fontFamily: FM, fontSize: 9, fontWeight: 700,
                      color: P.amber, background: `${P.amber}10`,
                      border: `1px solid ${P.amber}20`,
                      borderRadius: 4, padding: '2px 7px',
                      letterSpacing: '.06em',
                    }}>
                      {a.status.toUpperCase()}
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </section>

      {/* ── Quick links ── */}
      <section>
        <Label>Quick actions</Label>
        <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' as const }}>
          {[
            { label: 'OUTREACH CONSOLE',  href: '/command/outreach', color: P.red     },
            { label: 'SCAN QUEUE',        href: '/command/scan',     color: P.amber   },
            { label: 'ACCOUNTS',          href: '/command/accounts', color: P.blue    },
            { label: 'INTELLIGENCE BRIEF',href: '/command/brief',    color: P.cyan    },
          ].map(link => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                fontFamily: FM, fontSize: 10, fontWeight: 700,
                letterSpacing: '.12em', padding: '10px 18px',
                borderRadius: 6, textDecoration: 'none',
                background: `${link.color}08`,
                color: link.color,
                border: `1px solid ${link.color}20`,
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}
