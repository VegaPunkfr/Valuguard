'use client';

/**
 * GHOST TAX — COMMAND SHELL
 * Base vierge. Position fixed z-100.
 * Palette officielle rules/05-ui-brand.md
 */

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const P = {
  bg:      '#060912',
  surface: '#0a0d19',
  panel:   '#0e1221',
  border:  'rgba(36,48,78,0.28)',
  text1:   '#e4e9f4',
  text2:   '#8d9bb5',
  text3:   '#55637d',
  text4:   '#3a4560',
  cyan:    '#22d3ee',
  blue:    '#3b82f6',
  green:   '#34d399',
} as const;

const FM = 'var(--font-mono)';
const FS = 'var(--font-sans)';

const TABS = [
  { id: 'overview',  label: 'OVERVIEW',  href: '/command'          },
  { id: 'accounts',  label: 'ACCOUNTS',  href: '/command/accounts' },
  { id: 'outreach',  label: 'OUTREACH',  href: '/command/outreach' },
  { id: 'scan',      label: 'SCAN',      href: '/command/scan'     },
  { id: 'brief',     label: 'BRIEF',     href: '/command/brief'    },
] as const;

function LiveClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span style={{ fontFamily: FM, fontSize: 10, color: P.text4, letterSpacing: '.1em' }}>
      {time}
    </span>
  );
}

export default function CommandLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const activeTab = [...TABS].reverse().find(t => pathname.startsWith(t.href))?.id ?? 'overview';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: P.bg,
      color: P.text1,
      fontFamily: FS,
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* ── Nav bar ───────────────────────────────────── */}
      <header style={{
        flexShrink: 0,
        height: 48,
        background: P.surface,
        borderBottom: `1px solid ${P.border}`,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 24,
        paddingRight: 24,
        gap: 0,
      }}>

        {/* Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 36 }}>
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: P.cyan,
            boxShadow: `0 0 8px ${P.cyan}80`,
          }} />
          <span style={{
            fontFamily: FM, fontSize: 10, fontWeight: 700,
            letterSpacing: '.22em', color: P.text1,
            textTransform: 'uppercase' as const,
          }}>
            Ghost Tax
          </span>
          <span style={{
            fontFamily: FM, fontSize: 9, color: P.text4,
            letterSpacing: '.1em',
          }}>
            /CMD
          </span>
        </div>

        {/* Tabs */}
        <nav style={{ display: 'flex', alignItems: 'stretch', height: '100%', flex: 1 }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 14px',
                  fontFamily: FM,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '.14em',
                  textDecoration: 'none',
                  color: active ? P.cyan : P.text3,
                  borderBottom: active ? `2px solid ${P.cyan}` : '2px solid transparent',
                  borderTop: '2px solid transparent',
                  transition: 'color .12s',
                  whiteSpace: 'nowrap' as const,
                }}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {/* Clock */}
        <LiveClock />
      </header>

      {/* ── Content ───────────────────────────────────── */}
      <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {children}
      </main>

    </div>
  );
}
