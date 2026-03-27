'use client';

import React from 'react';

// ── Tab definitions ─────────────────────────────────────────

export const VIEW_TABS = [
  { id: 'focus_now',          label: 'Focus Now' },
  { id: 'not_sent',           label: 'Non envoyés' },
  { id: 'message_ready',      label: 'Message prêt' },
  { id: 'draft_created',      label: 'Brouillon' },
  { id: 'sent',               label: 'Envoyés' },
  { id: 'waiting_reply',      label: 'Attente réponse' },
  { id: 'follow_up_due',      label: 'Relance due' },
  { id: 'replied',            label: 'Répondu' },
  { id: 'ignored_archived',   label: 'Ignorés/archivés' },
  { id: 'all',                label: 'Tous' },
] as const;

export type ViewTabId = (typeof VIEW_TABS)[number]['id'];

// ── Styles ──────────────────────────────────────────────────

const S = {
  container: {
    display: 'flex',
    gap: '2px',
    padding: '0 12px',
    borderBottom: '1px solid #E2E8F0',
    background: '#FFFFFF',
    overflowX: 'auto' as const,
    scrollbarWidth: 'none' as const,
    fontFamily: 'var(--gt-font-dm-sans, "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)',
  } as React.CSSProperties,
  tab: (active: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '12px 16px',
    fontSize: '13px',
    fontWeight: active ? 600 : 400,
    color: active ? '#0F172A' : '#64748B',
    background: 'transparent',
    border: 'none',
    borderBottom: active ? '2px solid #3B82F6' : '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap' as const,
    fontFamily: 'inherit',
    letterSpacing: '0.02em',
  } as React.CSSProperties),
  count: (active: boolean) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '18px',
    height: '18px',
    padding: '0 5px',
    borderRadius: '9px',
    fontSize: '10px',
    fontWeight: 700,
    fontFamily: 'var(--gt-font-ibm-plex, "IBM Plex Mono", monospace)',
    color: active ? '#FFFFFF' : '#64748B',
    background: active ? '#3B82F6' : '#F1F5F9',
    letterSpacing: '0',
  } as React.CSSProperties),
};

// ── Props ───────────────────────────────────────────────────

export interface ViewTabsProps {
  activeView: ViewTabId;
  counts: Record<string, number>;
  onChange: (view: ViewTabId) => void;
}

// ── Component ───────────────────────────────────────────────

export default function ViewTabs({ activeView, counts, onChange }: ViewTabsProps) {
  return (
    <div style={S.container} role="tablist">
      {VIEW_TABS.map((tab) => {
        const active = activeView === tab.id;
        const count = counts[tab.id] ?? 0;
        return (
          <button
            key={tab.id}
            style={S.tab(active)}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
            <span style={S.count(active)}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}
