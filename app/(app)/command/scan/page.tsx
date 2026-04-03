'use client';

/**
 * GHOST TAX — SCAN CENTER v2
 * Clean rebuild — palette correcte, JetBrains Mono + Inter.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { Account } from '@/types/command';
import { CONVICTION_META } from '@/types/command';
import { loadAccounts, saveAccounts, updateAccount, getScanNeeded } from '@/lib/command/store';

// ── Tokens ─────────────────────────────────────────────────
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

const box: React.CSSProperties = {
  background: P.surface,
  border: `1px solid ${P.border}`,
  borderRadius: 10,
  padding: '20px 24px',
};
const lbl: React.CSSProperties = {
  fontFamily: FM, fontSize: 9, fontWeight: 700,
  letterSpacing: '.18em', color: P.text3,
  textTransform: 'uppercase', marginBottom: 14,
};

export default function ScanPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [ready,    setReady]    = useState(false);

  useEffect(() => {
    setAccounts(loadAccounts());
    setReady(true);
  }, []);

  const persist = useCallback((u: Account[]) => {
    setAccounts(u);
    saveAccounts(u);
  }, []);

  if (!ready) return <div style={{ background: P.bg, minHeight: '100vh' }} />;

  const needsScan = getScanNeeded(accounts);
  const queued    = accounts.filter(a => a.status === 'scan_queued');
  const scanned   = accounts.filter(a => a.scan?.status === 'complete');
  const domains   = needsScan.map(a => a.domain);

  function queueAll() {
    let updated = [...accounts];
    for (const a of needsScan) {
      updated = updateAccount(updated, a.id, { status: 'scan_queued' });
    }
    persist(updated);
  }

  return (
    <div style={{ background: P.bg, fontFamily: FS, color: P.text1, padding: '32px 28px 80px' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: FM, fontSize: 9, color: P.text3, letterSpacing: '.18em', textTransform: 'uppercase', marginBottom: 6 }}>
          Ghost Tax · Scan Center
        </div>
        <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 600, letterSpacing: '-.02em' }}>
          Intelligence Scan
        </h1>
        <div style={{ fontFamily: FM, fontSize: 12, color: P.text3 }}>
          {needsScan.length} à scanner
          {' · '}
          <span style={{ color: P.cyan }}>{queued.length} en queue</span>
          {' · '}
          <span style={{ color: P.green }}>{scanned.length} complétés</span>
        </div>
      </div>

      {/* ── Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>

        {/* Batch scan helper */}
        <div style={box}>
          <div style={lbl}>Batch Scan — Domains</div>
          <pre style={{
            fontFamily: FM, fontSize: 12, color: P.text2,
            margin: '0 0 14px', padding: '14px 16px',
            background: P.bg, borderRadius: 6,
            border: `1px solid ${P.border}`,
            whiteSpace: 'pre-wrap', maxHeight: 200,
            overflowY: 'auto', lineHeight: 1.7,
          }}>
            {domains.length > 0 ? domains.join('\n') : 'Tous les comptes sont scannés ✓'}
          </pre>
          <div style={{ fontFamily: FM, fontSize: 11, color: P.text3, marginBottom: 12, lineHeight: 1.6 }}>
            Endpoint: <span style={{ color: P.cyan }}>POST /api/scan/batch</span><br />
            Requiert: Authorization Bearer CRON_SECRET
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => navigator.clipboard.writeText(domains.join('\n'))}
              style={{
                fontFamily: FM, fontSize: 11, fontWeight: 600,
                padding: '7px 14px', borderRadius: 5, cursor: 'pointer',
                background: 'rgba(34,211,238,0.08)',
                color: P.cyan,
                border: `1px solid rgba(34,211,238,0.18)`,
              }}
            >
              COPIER DOMAINS
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(
                JSON.stringify({ secret: 'YOUR_CRON_SECRET', domains }, null, 2)
              )}
              style={{
                fontFamily: FM, fontSize: 11, fontWeight: 600,
                padding: '7px 14px', borderRadius: 5, cursor: 'pointer',
                background: 'rgba(96,165,250,0.08)',
                color: '#60A5FA',
                border: '1px solid rgba(96,165,250,0.18)',
              }}
            >
              COPIER JSON
            </button>
          </div>
        </div>

        {/* Queue stats */}
        <div style={box}>
          <div style={lbl}>Statut Pipeline</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'À scanner',         value: needsScan.length, color: P.text1 },
              { label: 'En queue',           value: queued.length,    color: P.cyan  },
              { label: 'Scans complets',     value: scanned.length,   color: P.green },
              { label: 'Total comptes',      value: accounts.length,  color: P.text3 },
            ].map(row => (
              <div key={row.label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', borderRadius: 6,
                background: P.bg, border: `1px solid ${P.border}`,
              }}>
                <span style={{ fontFamily: FM, fontSize: 11, color: P.text3 }}>{row.label}</span>
                <span style={{ fontFamily: FM, fontSize: 16, fontWeight: 700, color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>
          {needsScan.length > 0 && (
            <button
              onClick={queueAll}
              style={{
                width: '100%', fontFamily: FM, fontSize: 11, fontWeight: 700,
                padding: '10px 0', borderRadius: 6, cursor: 'pointer',
                background: 'rgba(34,211,238,0.10)',
                color: P.cyan,
                border: `1px solid rgba(34,211,238,0.20)`,
                letterSpacing: '.08em', textTransform: 'uppercase',
              }}
            >
              Mettre tout en queue ({needsScan.length})
            </button>
          )}
        </div>
      </div>

      {/* ── Scan queue ── */}
      <div style={box}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={lbl}>Queue prioritaire ({needsScan.length})</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {needsScan.length === 0 && (
            <div style={{ fontFamily: FM, fontSize: 12, color: P.text3, textAlign: 'center', padding: '20px 0' }}>
              ✓ Aucun compte en attente de scan
            </div>
          )}
          {needsScan.map(a => (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', borderRadius: 6,
              background: a.status === 'scan_queued'
                ? 'rgba(34,211,238,0.04)'
                : P.bg,
              border: `1px solid ${a.status === 'scan_queued'
                ? 'rgba(34,211,238,0.12)'
                : P.border}`,
            }}>
              <span style={{ fontFamily: FM, fontSize: 14, fontWeight: 700, color: CONVICTION_META[a.conviction].color, width: 24 }}>
                {a.score}
              </span>
              <Link href={`/command/accounts/${a.id}`} style={{ textDecoration: 'none', flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: P.text1 }}>{a.company}</span>
                <span style={{ fontFamily: FM, fontSize: 11, color: P.text3, marginLeft: 8 }}>{a.domain}</span>
              </Link>
              <span style={{ fontFamily: FM, fontSize: 10, color: P.text3, flexShrink: 0 }}>
                {a.country} · {a.industry}
              </span>
              <button
                onClick={() => persist(updateAccount(accounts, a.id, { status: 'scan_queued' }))}
                style={{
                  fontFamily: FM, fontSize: 10, fontWeight: 600,
                  padding: '4px 10px', borderRadius: 4,
                  background: a.status === 'scan_queued'
                    ? 'rgba(34,211,238,0.10)' : 'rgba(255,255,255,0.04)',
                  color: a.status === 'scan_queued' ? P.cyan : P.text3,
                  border: `1px solid ${a.status === 'scan_queued' ? 'rgba(34,211,238,0.20)' : P.border}`,
                  cursor: 'pointer', flexShrink: 0,
                }}
              >
                {a.status === 'scan_queued' ? '✓ QUEUED' : '+ QUEUE'}
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
