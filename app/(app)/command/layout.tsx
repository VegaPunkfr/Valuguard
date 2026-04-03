'use client';

/**
 * GHOST TAX — COMMAND COCKPIT LAYOUT v3
 *
 * Architecture: position:fixed fullscreen shell qui couvre le app layout
 * (Navbar + Footer) et fournit un environnement 100% dark.
 *
 * Zindex hierarchy:
 *   app layout Navbar  ~50
 *   command layout     100  ← ce fichier
 *   approval overlay   400  ← dans page.tsx
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

// ── Design tokens ──────────────────────────────────────────
const P = {
  bg:     '#060912',
  surface:'#0C1019',
  border: 'rgba(255,255,255,0.06)',
  text1:  '#F1F5F9',
  text3:  '#475569',
  cyan:   '#22D3EE',
};

const F = {
  mono: "var(--vg-font-mono,'JetBrains Mono',monospace)",
  sans: "var(--vg-font-sans,'Inter',system-ui,sans-serif)",
};

// ── Nav items ──────────────────────────────────────────────
const NAV = [
  { href: '/command',          label: 'OVERVIEW'  },
  { href: '/command/accounts', label: 'ACCOUNTS'  },
  { href: '/command/outreach', label: 'OUTREACH'  },
  { href: '/command/scan',     label: 'SCAN'      },
  { href: '/command/brief',    label: 'BRIEF'     },
] as const;

// ── Layout ─────────────────────────────────────────────────
export default function CommandLayout({ children }: { children: ReactNode }) {
  const pathname   = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  function isActive(href: string): boolean {
    return href === '/command'
      ? pathname === '/command'
      : pathname.startsWith(href);
  }

  return (
    <div style={{
      position:       'fixed',
      inset:          0,
      zIndex:         100,
      background:     P.bg,
      color:          P.text1,
      fontFamily:     F.sans,
      display:        'flex',
      flexDirection:  'column',
    }}>

      {/* ════════════════════════════════════════════════════
          TOP BAR — 52px, dark surface, nav tabs
         ════════════════════════════════════════════════════ */}
      <header style={{
        flexShrink:   0,
        height:       52,
        background:   P.surface,
        borderBottom: `1px solid ${P.border}`,
        display:      'flex',
        alignItems:   'center',
        padding:      '0 28px',
      }}>

        {/* Wordmark → back to home */}
        <a
          href="/"
          style={{
            fontFamily:     F.mono,
            fontSize:       10,
            fontWeight:     700,
            letterSpacing:  '.18em',
            textTransform:  'uppercase',
            color:          P.text3,
            textDecoration: 'none',
            marginRight:    32,
            flexShrink:     0,
          }}
        >
          Ghost Tax
        </a>

        {/* Nav tabs */}
        <nav style={{
          display:     'flex',
          alignItems:  'stretch',
          height:      '100%',
          flex:        1,
          overflow:    'hidden',
        }}>
          {NAV.map(item => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display:        'flex',
                  alignItems:     'center',
                  padding:        '0 16px',
                  fontFamily:     F.mono,
                  fontSize:       11,
                  fontWeight:     active ? 700 : 400,
                  letterSpacing:  '.1em',
                  color:          active ? P.cyan : P.text3,
                  textDecoration: 'none',
                  borderBottom:   active
                    ? `2px solid ${P.cyan}`
                    : '2px solid transparent',
                  marginBottom:   -1,
                  whiteSpace:     'nowrap',
                  flexShrink:     0,
                  transition:     'color .15s ease, border-color .15s ease',
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Date stamp */}
        {mounted && (
          <span style={{
            fontFamily:    F.mono,
            fontSize:      10,
            color:         P.text3,
            letterSpacing: '.06em',
            flexShrink:    0,
          }}>
            {new Date()
              .toLocaleDateString('fr-FR', {
                day: '2-digit', month: 'short', year: 'numeric',
              })
              .toUpperCase()}
          </span>
        )}
      </header>

      {/* ════════════════════════════════════════════════════
          CONTENT AREA — scrollable, dark
         ════════════════════════════════════════════════════ */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </main>

    </div>
  );
}
