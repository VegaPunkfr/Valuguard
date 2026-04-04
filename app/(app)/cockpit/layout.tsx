/**
 * GHOST TAX COCKPIT V3 — Standalone Layout
 * No navbar, no footer, no terrain background.
 * The cockpit IS the entire viewport.
 */
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ghost Tax · Cockpit',
  description: 'Mission Control — Ghost Tax AI Financial Control Plane',
};

export default function CockpitLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: '100vh', overflow: 'hidden', background: '#05060E', color: 'rgba(255,255,255,0.94)' }}>
      {children}
    </div>
  );
}
