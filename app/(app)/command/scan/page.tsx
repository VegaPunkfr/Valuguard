'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { Account } from '@/types/command';
import { CONVICTION_META } from '@/types/command';
import { loadAccounts, saveAccounts, updateAccount, getScanNeeded } from '@/lib/command/store';

const mono: React.CSSProperties = { fontFamily: 'var(--vg-font-mono, monospace)' };
const box: React.CSSProperties = { background: '#0a0d19', border: '1px solid rgba(36,48,78,0.25)', borderRadius: 8, padding: '16px 20px' };
const lbl: React.CSSProperties = { ...mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', color: '#475569', marginBottom: 10, textTransform: 'uppercase' as const };

export default function ScanPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => { setAccounts(loadAccounts()); setReady(true); }, []);
  const persist = useCallback((u: Account[]) => { setAccounts(u); saveAccounts(u); }, []);

  if (!ready) return null;

  const needsScan = getScanNeeded(accounts);
  const queued = accounts.filter(a => a.status === 'scan_queued');
  const scanned = accounts.filter(a => a.scan?.status === 'complete');
  const domains = needsScan.map(a => a.domain);

  return (
    <div style={mono}>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#e4e9f4', marginBottom: 4 }}>Scan Center</div>
      <div style={{ fontSize: 13, color: '#475569', marginBottom: 20 }}>
        {needsScan.length} unscanned · {queued.length} queued · {scanned.length} complete
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Batch scan */}
        <div style={box}>
          <div style={lbl}>BATCH SCAN — DOMAINS</div>
          <pre style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 10px', padding: 12, background: '#060912', borderRadius: 4, border: '1px solid rgba(36,48,78,0.15)', whiteSpace: 'pre-wrap' as const }}>
            {domains.length > 0 ? domains.join('\n') : 'All accounts scanned'}
          </pre>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 10, lineHeight: 1.5 }}>
            Run via <code style={{ color: '#22d3ee' }}>POST /api/scan/batch</code> with CRON_SECRET
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => navigator.clipboard.writeText(domains.join('\n'))} style={{ ...mono, fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 4, background: 'rgba(34,211,238,0.08)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.15)', cursor: 'pointer' }}>COPY DOMAINS</button>
            <button onClick={() => navigator.clipboard.writeText(JSON.stringify({ secret: 'YOUR_CRON_SECRET', domains }, null, 2))} style={{ ...mono, fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 4, background: 'rgba(96,165,250,0.08)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.15)', cursor: 'pointer' }}>COPY JSON</button>
          </div>
        </div>

        {/* Queue */}
        <div style={box}>
          <div style={lbl}>SCAN QUEUE — Priority order</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {needsScan.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 4, background: a.status === 'scan_queued' ? 'rgba(34,211,238,0.04)' : 'rgba(14,18,33,0.3)', border: `1px solid ${a.status === 'scan_queued' ? 'rgba(34,211,238,0.12)' : 'rgba(36,48,78,0.08)'}` }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: CONVICTION_META[a.conviction].color, width: 22 }}>{a.score}</span>
                <Link href={`/command/accounts/${a.id}`} style={{ textDecoration: 'none', flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#e4e9f4' }}>{a.company}</span>
                  <span style={{ fontSize: 13, color: '#475569', marginLeft: 6 }}>{a.domain}</span>
                </Link>
                {a.status !== 'scan_queued'
                  ? <button onClick={() => persist(updateAccount(accounts, a.id, { status: 'scan_queued' }))} style={{ ...mono, fontSize: 12, fontWeight: 600, padding: '5px 10px', borderRadius: 3, background: 'rgba(34,211,238,0.06)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.12)', cursor: 'pointer' }}>QUEUE</button>
                  : <span style={{ fontSize: 12, fontWeight: 600, color: '#22d3ee' }}>QUEUED</span>
                }
              </div>
            ))}
            {needsScan.length === 0 && <div style={{ fontSize: 13, color: '#34d399' }}>All accounts scanned</div>}
          </div>
        </div>
      </div>

      {/* Completed scans */}
      {scanned.length > 0 && (
        <div style={box}>
          <div style={lbl}>COMPLETED SCANS — Decision required</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {scanned.map(a => (
              <Link key={a.id} href={`/command/accounts/${a.id}`} style={{ textDecoration: 'none', padding: '12px 14px', borderRadius: 6, background: 'rgba(14,18,33,0.4)', border: '1px solid rgba(36,48,78,0.12)' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#e4e9f4', marginBottom: 6 }}>{a.company}</div>
                <div style={{ display: 'flex', gap: 12, marginBottom: 6 }}>
                  <div><div style={{ fontSize: 11, color: '#475569' }}>VENDORS</div><div style={{ fontSize: 13, fontWeight: 700, color: '#60a5fa' }}>{a.scan?.vendorCount}</div></div>
                  <div><div style={{ fontSize: 11, color: '#475569' }}>EXPOSURE</div><div style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24' }}>{Math.round((a.scan?.exposureLow ?? 0) / 1000)}k-{Math.round((a.scan?.exposureHigh ?? 0) / 1000)}k</div></div>
                </div>
                <div style={{ fontSize: 13, color: a.scan?.strengthensHypothesis ? '#34d399' : '#fbbf24' }}>
                  {a.scan?.strengthensHypothesis ? '✓ Hypothesis confirmed — promote' : '⚠ Hypothesis weak — review or drop'}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
