'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useState, useCallback } from 'react';

const NAV: { href: string; label: string }[] = [
  { href: '/command',          label: 'OVERVIEW' },
  { href: '/command/accounts', label: 'ACCOUNTS' },
  { href: '/command/scan',     label: 'SCAN' },
  { href: '/command/outreach', label: 'OUTREACH' },
  { href: '/command/brief',    label: 'BRIEF' },
];

export default function CommandLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [signalCount, setSignalCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

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

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F8FAFC',
      color: '#0F172A',
      fontFamily: 'var(--gt-font-dm-sans, "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)',
    }}>
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        borderBottom: '1px solid #E2E8F0',
        background: 'rgba(255,255,255,0.80)',
        backdropFilter: 'blur(20px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}>
        <div style={{
          maxWidth: 1400,
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          height: 56,
        }}>
          <a
            href="https://ghost-tax.com"
            style={{
              textDecoration: 'none',
              color: '#94A3B8',
              fontSize: 12,
              letterSpacing: '0.08em',
              marginRight: 24,
              transition: 'color 0.15s',
            }}
          >
            &larr; GHOST-TAX.COM
          </a>

          <span style={{
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: '0.10em',
            color: '#0F172A',
            marginRight: 8,
          }}>
            GHOST TAX
          </span>
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.16em',
            color: '#3B82F6',
            marginRight: 36,
          }}>
            COMMAND
          </span>

          <nav style={{ display: 'flex', gap: 0, flex: 1 }}>
            {NAV.map(item => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    textDecoration: 'none',
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    letterSpacing: '0.10em',
                    padding: '17px 18px 15px',
                    color: active ? '#0F172A' : '#64748B',
                    borderBottom: active ? '2px solid #3B82F6' : '2px solid transparent',
                    background: active ? 'rgba(59,130,246,0.04)' : 'transparent',
                    transition: 'color 0.15s, border-color 0.15s',
                    position: 'relative',
                  }}
                >
                  {item.label}
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
                      textAlign: 'center',
                    }}>
                      {signalCount > 9 ? '9+' : signalCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <span style={{
            fontSize: 12,
            color: '#64748B',
            letterSpacing: '0.06em',
            fontFamily: 'var(--gt-font-ibm-plex, "IBM Plex Mono", monospace)',
          }}>
            {mounted ? new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() : ''}
          </span>
        </div>
      </header>

      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 24px 80px' }}>
        {children}
      </main>
    </div>
  );
}
