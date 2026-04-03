'use client';

/**
 * GHOST TAX — MISSION CONTROL SHELL V7
 * Spec Fellow. Position fixed z-100.
 * Nav: PIPELINE · SIGNAUX · SÉQUENCES · INTELLIGENCE
 */

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isInSendingWindow } from '@/lib/command/sending-windows';

const P = {
  bg:      '#060912',
  surface: '#0C1019',
  border:  'rgba(255,255,255,0.06)',
  text1:   '#F1F5F9',
  text2:   '#94A3B8',
  text3:   '#475569',
  cyan:    '#22D3EE',
  green:   '#34D399',
} as const;
const FM = "var(--vg-font-mono,'JetBrains Mono',monospace)";
const FS = "var(--vg-font-sans,'Inter',system-ui,sans-serif)";

const TABS = [
  { id: 'pipeline',     label: 'PIPELINE',     href: '/command'            },
  { id: 'signaux',      label: 'SIGNAUX',      href: '/command/accounts'   },
  { id: 'sequences',    label: 'SÉQUENCES',    href: '/command/outreach'   },
  { id: 'intelligence', label: 'INTELLIGENCE', href: '/command/scan'       },
] as const;

function LiveClock() {
  const [text, setText] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const d = now.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
      const t = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      setText(`${d} · ${t}`);
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  return <span>{text}</span>;
}

function SendingWindowBadge() {
  const [badge, setBadge] = useState('');
  useEffect(() => {
    try {
      const de = isInSendingWindow('DE');
      if (de.inWindow) setBadge(`DE ${de.minutesLeft}min`);
      else {
        const nl = isInSendingWindow('NL');
        if (nl.inWindow) setBadge(`NL ${nl.minutesLeft}min`);
      }
    } catch { /* sending-windows may not be ready */ }
  }, []);
  if (!badge) return null;
  return (
    <span style={{
      fontFamily: FM, fontSize: 9, fontWeight: 700, letterSpacing: '.06em',
      padding: '2px 8px', borderRadius: 4,
      color: P.green, background: `${P.green}12`, border: `1px solid ${P.green}20`,
    }}>
      {badge}
    </span>
  );
}

export default function CommandLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const activeTab = [...TABS].reverse().find(t => pathname.startsWith(t.href))?.id ?? 'pipeline';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: P.bg, color: P.text1, fontFamily: FS,
      display: 'flex', flexDirection: 'column',
    }}>

      {/* ── Header 48px ── */}
      <header style={{
        flexShrink: 0, height: 48,
        background: P.surface,
        borderBottom: `1px solid ${P.border}`,
        display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: 0,
      }}>

        {/* GT wordmark */}
        <span style={{
          fontFamily: FM, fontSize: 10, fontWeight: 700,
          letterSpacing: '.18em', color: P.text2,
          marginRight: 24,
        }}>
          GT
        </span>

        {/* Label */}
        <span style={{
          fontFamily: FM, fontSize: 9, letterSpacing: '.1em',
          color: P.text3, marginRight: 24,
        }}>
          MISSION CONTROL
        </span>

        {/* Nav tabs */}
        <nav style={{ display: 'flex', alignItems: 'stretch', height: '100%', flex: 1 }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                style={{
                  display: 'flex', alignItems: 'center',
                  padding: '0 14px',
                  fontFamily: FM, fontSize: 10, fontWeight: active ? 700 : 500,
                  letterSpacing: '.12em',
                  textDecoration: 'none',
                  color: active ? P.cyan : P.text3,
                  borderBottom: active ? `2px solid ${P.cyan}` : '2px solid transparent',
                  borderTop: '2px solid transparent',
                  transition: 'color .12s',
                }}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side: date + window */}
        <div style={{
          fontFamily: FM, fontSize: 10, color: P.text3,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <LiveClock />
          <SendingWindowBadge />
        </div>
      </header>

      {/* ── Content ── */}
      <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {children}
      </main>

    </div>
  );
}
