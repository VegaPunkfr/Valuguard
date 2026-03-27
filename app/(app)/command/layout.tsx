'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useState, useCallback } from 'react';

/* ─── Navigation spine ─── */
const NAV: { href: string; label: string }[] = [
  { href: '/command',          label: 'OVERVIEW' },
  { href: '/command/accounts', label: 'ACCOUNTS' },
  { href: '/command/scan',     label: 'SCAN' },
  { href: '/command/outreach', label: 'OUTREACH' },
  { href: '/command/brief',    label: 'BRIEF' },
];

/* ─── Inline SVG noise texture (no external file) ─── */
const NOISE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`;

/* ─── Keyframe injection (runs once) ─── */
const STYLE_ID = 'gt-command-keyframes';

function injectKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes gt-signal-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.50); }
      50%      { box-shadow: 0 0 0 6px rgba(239,68,68,0); }
    }
    @keyframes gt-tab-underline-in {
      from { transform: scaleX(0); }
      to   { transform: scaleX(1); }
    }
  `;
  document.head.appendChild(style);
}

/* ═══════════════════════════════════════════════════════════════
   COMMAND LAYOUT — Premium fintech cockpit
   Layers: base color → radial glow → SVG grain → content
   ═══════════════════════════════════════════════════════════════ */

export default function CommandLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [signalCount, setSignalCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    injectKeyframes();
  }, []);

  /* ─── Signal polling ─── */
  const pollSignals = useCallback(async () => {
    try {
      const res = await fetch('/api/command/ingest');
      if (res.ok) {
        const json = await res.json();
        setSignalCount(json.events?.length || 0);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    pollSignals();
    const interval = setInterval(pollSignals, 60_000);
    return () => clearInterval(interval);
  }, [mounted, pollSignals]);

  const isActive = (href: string) =>
    href === '/command' ? pathname === '/command' : pathname.startsWith(href);

  /* ─────────────────────────────────────────────────────────── */

  return (
    <div style={{
      minHeight: '100vh',
      position: 'relative',
      background: '#FAFBFD',
      color: '#0F172A',
      fontFamily: 'var(--gt-font-dm-sans, "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)',
    }}>

      {/* ── Layer 1: Radial gradient glow at top center ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(59,130,246,0.03) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* ── Layer 2: SVG noise grain overlay ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: NOISE_SVG,
          backgroundRepeat: 'repeat',
          backgroundSize: 256,
          opacity: 0.02,
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* ══════════════════════════════════════════════════════
          NAVBAR — White glass, Apple-calibrated
          ══════════════════════════════════════════════════════ */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(20px) saturate(1.3)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{
          maxWidth: 1440,
          margin: '0 auto',
          padding: '0 32px',
          display: 'flex',
          alignItems: 'center',
          height: 56,
        }}>

          {/* ── Back link ── */}
          <a
            href="https://ghost-tax.com"
            style={{
              textDecoration: 'none',
              color: '#94A3B8',
              fontSize: 12,
              letterSpacing: '0.08em',
              marginRight: 24,
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#64748B'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#94A3B8'; }}
          >
            &larr; GHOST-TAX.COM
          </a>

          {/* ── Logo ── */}
          <span style={{
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: '0.10em',
            color: '#0F172A',
            marginRight: 8,
            userSelect: 'none',
          }}>
            GHOST TAX
          </span>
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.16em',
            color: '#3B82F6',
            marginRight: 36,
            userSelect: 'none',
          }}>
            COMMAND
          </span>

          {/* ── Nav tabs ── */}
          <nav style={{ display: 'flex', gap: 0, flex: 1, height: '100%' }}>
            {NAV.map(item => {
              const active = isActive(item.href);
              const hovered = hoveredTab === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onMouseEnter={() => setHoveredTab(item.href)}
                  onMouseLeave={() => setHoveredTab(null)}
                  style={{
                    textDecoration: 'none',
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    letterSpacing: '0.10em',
                    padding: '0 18px',
                    display: 'flex',
                    alignItems: 'center',
                    position: 'relative',
                    color: active
                      ? '#0F172A'
                      : hovered
                        ? '#64748B'
                        : '#94A3B8',
                    background: active ? 'rgba(59,130,246,0.04)' : 'transparent',
                    transition: 'color 0.2s ease, background 0.2s ease',
                    height: 56,
                    boxSizing: 'border-box',
                  }}
                >
                  {item.label}

                  {/* ── Animated underline (::after equivalent) ── */}
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 18,
                      right: 18,
                      height: 2,
                      background: '#3B82F6',
                      borderRadius: '2px 2px 0 0',
                      transform: active ? 'scaleX(1)' : 'scaleX(0)',
                      transformOrigin: 'center',
                      transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  />

                  {/* ── Signal badge with pulse ── */}
                  {item.href === '/command' && signalCount > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: 10,
                      right: 4,
                      fontSize: 9,
                      fontWeight: 700,
                      lineHeight: 1,
                      color: '#FFFFFF',
                      background: '#EF4444',
                      borderRadius: 8,
                      padding: '2px 5px',
                      minWidth: 14,
                      textAlign: 'center' as const,
                      animation: 'gt-signal-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    }}>
                      {signalCount > 9 ? '9+' : signalCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* ── Date stamp ── */}
          <span style={{
            fontSize: 12,
            color: '#64748B',
            letterSpacing: '0.06em',
            fontFamily: 'var(--gt-font-ibm-plex, "IBM Plex Mono", monospace)',
          }}>
            {mounted
              ? new Date()
                  .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                  .toUpperCase()
              : ''
            }
          </span>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════
          MAIN CONTENT
          ══════════════════════════════════════════════════════ */}
      <main style={{
        position: 'relative',
        zIndex: 2,
        maxWidth: 1440,
        margin: '0 auto',
        padding: '24px 32px 80px',
      }}>
        {children}
      </main>
    </div>
  );
}
