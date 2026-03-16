'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { type ReactNode, useEffect, useState, useCallback, Suspense } from 'react';

const NAV: { href: string; label: string }[] = [
  { href: '/command',          label: 'OVERVIEW' },
  { href: '/command/accounts', label: 'ACCOUNTS' },
  { href: '/command/scan',     label: 'SCAN' },
  { href: '/command/outreach', label: 'OUTREACH' },
  { href: '/command/brief',    label: 'BRIEF' },
];

const AUTH_KEY = 'gt-command-auth';
const EXPECTED_SECRET = 'ghost-command-2026';

function CommandLayoutInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [authed, setAuthed] = useState(false);
  const [signalCount, setSignalCount] = useState(0);

  // Auth gate: check URL key or localStorage
  useEffect(() => {
    const urlKey = searchParams.get('key');
    const storedKey = localStorage.getItem(AUTH_KEY);
    if (urlKey === EXPECTED_SECRET) {
      localStorage.setItem(AUTH_KEY, EXPECTED_SECRET);
      setAuthed(true);
      // Clean key from URL
      const url = new URL(window.location.href);
      url.searchParams.delete('key');
      window.history.replaceState({}, '', url.toString());
    } else if (storedKey === EXPECTED_SECRET) {
      setAuthed(true);
    }
  }, [searchParams]);

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: '#060912', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'monospace', color: '#f87171', fontSize: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>UNAUTHORIZED</div>
          <div style={{ color: '#64748b' }}>Access requires valid key parameter.</div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    document.body.style.background = '#060912';
    document.body.style.margin = '0';
    return () => { document.body.style.background = ''; };
  }, []);

  // Poll for signal count (lightweight — just the count)
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
    pollSignals();
    const interval = setInterval(pollSignals, 60_000);
    return () => clearInterval(interval);
  }, [pollSignals]);

  const isActive = (href: string) =>
    href === '/command' ? pathname === '/command' : pathname.startsWith(href);

  return (
    <div style={{ minHeight: '100vh', background: '#060912', color: '#e4e9f4', fontFamily: 'var(--vg-font-mono, monospace)' }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        borderBottom: '1px solid rgba(36,48,78,0.30)',
        background: 'rgba(6,9,18,0.97)', backdropFilter: 'blur(16px)',
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', height: 56 }}>
          <a href="https://ghost-tax.com" style={{ textDecoration: 'none', color: '#3a4560', fontSize: 12, letterSpacing: '0.08em', marginRight: 24 }}>
            ← GHOST-TAX.COM
          </a>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.10em', color: '#e4e9f4', marginRight: 8 }}>
            GHOST TAX
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.16em', color: '#3b82f6', marginRight: 36 }}>
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
                    color: active ? '#e4e9f4' : '#55637d',
                    borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
                    background: active ? 'rgba(59,130,246,0.06)' : 'transparent',
                    transition: 'color 0.1s, border-color 0.1s',
                    position: 'relative',
                  }}
                >
                  {item.label}
                  {/* Signal badge on OVERVIEW tab */}
                  {item.href === '/command' && signalCount > 0 && (
                    <span style={{
                      position: 'absolute', top: 10, right: 4,
                      fontSize: 9, fontWeight: 700, lineHeight: 1,
                      color: '#060912', background: '#ef4444',
                      borderRadius: 8, padding: '2px 5px', minWidth: 14, textAlign: 'center',
                    }}>
                      {signalCount > 9 ? '9+' : signalCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <span style={{ fontSize: 12, color: '#3a4560', letterSpacing: '0.06em' }}>
            {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
          </span>
        </div>
      </header>

      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 24px 80px' }}>
        {children}
      </main>
    </div>
  );
}

export default function CommandLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#060912' }} />}>
      <CommandLayoutInner>{children}</CommandLayoutInner>
    </Suspense>
  );
}
