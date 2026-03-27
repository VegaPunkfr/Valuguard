'use client';

import React from 'react';

// ── Tab definitions ─────────────────────────────────────────

export const VIEW_TABS = [
  { id: 'focus_now',          label: 'Focus Now' },
  { id: 'not_sent',           label: 'Non envoy\u00e9s' },
  { id: 'message_ready',      label: 'Message pr\u00eat' },
  { id: 'draft_created',      label: 'Brouillon' },
  { id: 'sent',               label: 'Envoy\u00e9s' },
  { id: 'waiting_reply',      label: 'Attente r\u00e9ponse' },
  { id: 'follow_up_due',      label: 'Relance due' },
  { id: 'replied',            label: 'R\u00e9pondu' },
  { id: 'ignored_archived',   label: 'Ignor\u00e9s/archiv\u00e9s' },
  { id: 'all',                label: 'Tous' },
] as const;

export type ViewTabId = (typeof VIEW_TABS)[number]['id'];

// ── Styles ──────────────────────────────────────────────────

const S = {
  container: {
    display: 'flex',
    gap: '2px',
    padding: '0 12px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: '#0a0d19',
    overflowX: 'auto' as const,
    scrollbarWidth: 'none' as const,
    fontFamily: 'var(--vg-font-mono, "JetBrains Mono", "Fira Code", monospace)',
  } as React.CSSProperties,
  tab: (active: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '12px 16px',
    fontSize: '12px',
    fontWeight: active ? 600 : 400,
    color: active ? '#e4e9f4' : '#64748b',
    background: 'transparent',
    border: 'none',
    borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap' as const,
    fontFamily: 'inherit',
    letterSpacing: '0.3px',
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
    color: active ? '#0a0d19' : '#94a3b8',
    background: active ? '#3b82f6' : 'rgba(255,255,255,0.06)',
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
