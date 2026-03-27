'use client';

import React, { useState, useEffect, useCallback } from 'react';

// ── Filter State ────────────────────────────────────────────

export interface CockpitFilters {
  sent: 'all' | 'sent' | 'not_sent';
  messageReady: 'all' | 'ready' | 'absent';
  emailVerified: 'all' | 'verified' | 'not_verified';
  hasContact: 'all' | 'with' | 'without';
  language: string[];       // 'en' | 'fr' | 'de' | 'nl'
  country: string[];        // 'DE' | 'NL' | 'UK' | 'US'
  temperature: string[];    // 'hot' | 'warm' | 'cold'
  nextActionType: string[]; // NextActionType values
}

export const DEFAULT_FILTERS: CockpitFilters = {
  sent: 'all',
  messageReady: 'all',
  emailVerified: 'all',
  hasContact: 'all',
  language: [],
  country: [],
  temperature: [],
  nextActionType: [],
};

const STORAGE_KEY = 'gt-cockpit-filters-v1';

// ── Premium White Theme Styles ──────────────────────────────

const S = {
  bar: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
    gap: '6px',
    padding: '12px 20px',
    background: '#FFFFFF',
    borderBottom: '1px solid #F1F5F9',
    fontFamily: 'var(--gt-font-dm-sans, "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)',
    fontSize: '12px',
  } as React.CSSProperties,
  group: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  } as React.CSSProperties,
  groupLabel: {
    color: '#64748B',
    fontSize: '10px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    marginRight: '2px',
    userSelect: 'none' as const,
    fontWeight: 600,
  } as React.CSSProperties,
  pill: (active: boolean) => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: '5px 12px',
    borderRadius: '6px',
    border: active ? '1px solid #3B82F6' : '1px solid #E2E8F0',
    background: active ? '#EFF6FF' : '#F1F5F9',
    color: active ? '#2563EB' : '#64748B',
    fontSize: '12px',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    transition: 'all 0.12s ease',
    userSelect: 'none' as const,
    fontFamily: 'inherit',
  } as React.CSSProperties),
  separator: {
    width: '1px',
    height: '20px',
    background: '#F1F5F9',
    margin: '0 4px',
    flexShrink: 0,
  } as React.CSSProperties,
  clearBtn: {
    padding: '5px 12px',
    borderRadius: '6px',
    border: 'none',
    background: 'transparent',
    color: '#DC2626',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    marginLeft: 'auto',
    transition: 'all 0.12s ease',
    textDecoration: 'none',
  } as React.CSSProperties,
};

// ── Helpers ─────────────────────────────────────────────────

function toggleArray(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
}

function cycleTriState(current: string, values: string[]): string {
  const idx = values.indexOf(current);
  return values[(idx + 1) % values.length];
}

function hasActiveFilters(f: CockpitFilters): boolean {
  return (
    f.sent !== 'all' ||
    f.messageReady !== 'all' ||
    f.emailVerified !== 'all' ||
    f.hasContact !== 'all' ||
    f.language.length > 0 ||
    f.country.length > 0 ||
    f.temperature.length > 0 ||
    f.nextActionType.length > 0
  );
}

// ── Props ───────────────────────────────────────────────────

export interface QuickFiltersProps {
  filters: CockpitFilters;
  onChange: (filters: CockpitFilters) => void;
}

// ── Component ───────────────────────────────────────────────

export default function QuickFilters({ filters, onChange }: QuickFiltersProps) {
  const [clearHover, setClearHover] = useState(false);
  const [hoverPill, setHoverPill] = useState<string | null>(null);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch {}
  }, [filters]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CockpitFilters;
        // Validate shape
        if (parsed && typeof parsed.sent === 'string') {
          onChange(parsed);
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = useCallback((patch: Partial<CockpitFilters>) => {
    onChange({ ...filters, ...patch });
  }, [filters, onChange]);

  // ── Tri-state pills ──

  const TriPill = ({ label, value, options, field }: {
    label: string;
    value: string;
    options: string[];
    field: keyof CockpitFilters;
  }) => {
    const displayMap: Record<string, string> = {
      all: label,
      sent: 'Sent',
      not_sent: 'Not sent',
      ready: 'Ready',
      absent: 'Absent',
      verified: 'Verified',
      not_verified: 'Not verified',
      with: 'With contact',
      without: 'No contact',
    };
    const isActive = value !== 'all';
    const pillKey = `tri-${field}`;
    const isHovered = hoverPill === pillKey;
    return (
      <button
        style={{
          ...S.pill(isActive),
          ...(isHovered && !isActive ? { background: '#F8FAFC' } : {}),
        }}
        onClick={() => update({ [field]: cycleTriState(value, options) } as Partial<CockpitFilters>)}
        onMouseEnter={() => setHoverPill(pillKey)}
        onMouseLeave={() => setHoverPill(null)}
        title={`Click to cycle: ${options.join(' -> ')}`}
      >
        {displayMap[value] || value}
      </button>
    );
  };

  // ── Toggle array pills ──

  const TogglePills = ({ values, selected, field }: {
    values: { id: string; label: string }[];
    selected: string[];
    field: 'language' | 'country' | 'temperature' | 'nextActionType';
  }) => (
    <>
      {values.map(v => {
        const isActive = selected.includes(v.id);
        const pillKey = `${field}-${v.id}`;
        const isHovered = hoverPill === pillKey;
        return (
          <button
            key={v.id}
            style={{
              ...S.pill(isActive),
              ...(isHovered && !isActive ? { background: '#F8FAFC' } : {}),
            }}
            onClick={() => update({ [field]: toggleArray(selected, v.id) })}
            onMouseEnter={() => setHoverPill(pillKey)}
            onMouseLeave={() => setHoverPill(null)}
          >
            {v.label}
          </button>
        );
      })}
    </>
  );

  return (
    <div style={S.bar}>
      {/* Sent / Not Sent */}
      <div style={S.group}>
        <span style={S.groupLabel}>Sent</span>
        <TriPill label="All" value={filters.sent} options={['all', 'sent', 'not_sent']} field="sent" />
      </div>

      <div style={S.separator} />

      {/* Message Ready */}
      <div style={S.group}>
        <span style={S.groupLabel}>Msg</span>
        <TriPill label="All" value={filters.messageReady} options={['all', 'ready', 'absent']} field="messageReady" />
      </div>

      <div style={S.separator} />

      {/* Email Verified */}
      <div style={S.group}>
        <span style={S.groupLabel}>Email</span>
        <TriPill label="All" value={filters.emailVerified} options={['all', 'verified', 'not_verified']} field="emailVerified" />
      </div>

      <div style={S.separator} />

      {/* Has Contact */}
      <div style={S.group}>
        <span style={S.groupLabel}>Contact</span>
        <TriPill label="All" value={filters.hasContact} options={['all', 'with', 'without']} field="hasContact" />
      </div>

      <div style={S.separator} />

      {/* Language */}
      <div style={S.group}>
        <span style={S.groupLabel}>Lang</span>
        <TogglePills
          values={[
            { id: 'en', label: 'EN' },
            { id: 'fr', label: 'FR' },
            { id: 'de', label: 'DE' },
            { id: 'nl', label: 'NL' },
          ]}
          selected={filters.language}
          field="language"
        />
      </div>

      <div style={S.separator} />

      {/* Country */}
      <div style={S.group}>
        <span style={S.groupLabel}>Country</span>
        <TogglePills
          values={[
            { id: 'DE', label: 'DE' },
            { id: 'NL', label: 'NL' },
            { id: 'UK', label: 'UK' },
            { id: 'US', label: 'US' },
          ]}
          selected={filters.country}
          field="country"
        />
      </div>

      <div style={S.separator} />

      {/* Temperature */}
      <div style={S.group}>
        <span style={S.groupLabel}>Temp</span>
        <TogglePills
          values={[
            { id: 'hot', label: 'HOT' },
            { id: 'warm', label: 'WARM' },
            { id: 'cold', label: 'COLD' },
          ]}
          selected={filters.temperature}
          field="temperature"
        />
      </div>

      <div style={S.separator} />

      {/* Next Action */}
      <div style={S.group}>
        <span style={S.groupLabel}>Next</span>
        <TogglePills
          values={[
            { id: 'send_now', label: 'Send' },
            { id: 'follow_up_in_3_days', label: 'FU 3d' },
            { id: 'follow_up_in_7_days', label: 'FU 7d' },
            { id: 'verify_email', label: 'Verify' },
            { id: 'wait_for_reply', label: 'Wait' },
          ]}
          selected={filters.nextActionType}
          field="nextActionType"
        />
      </div>

      {/* Clear all */}
      {hasActiveFilters(filters) && (
        <>
          <div style={S.separator} />
          <button
            style={{
              ...S.clearBtn,
              textDecoration: clearHover ? 'underline' : 'none',
            }}
            onClick={() => onChange(DEFAULT_FILTERS)}
            onMouseEnter={() => setClearHover(true)}
            onMouseLeave={() => setClearHover(false)}
          >
            Clear all
          </button>
        </>
      )}
    </div>
  );
}

// ── Filter application helper ───────────────────────────────

export function applyCockpitFilters(
  accounts: import('@/types/command').Account[],
  filters: CockpitFilters
): import('@/types/command').Account[] {
  return accounts.filter(a => {
    // Sent
    if (filters.sent === 'sent' && a.outreachStatus !== 'sent' && a.outreachStatus !== 'replied') return false;
    if (filters.sent === 'not_sent' && (a.outreachStatus === 'sent' || a.outreachStatus === 'replied')) return false;

    // Message Ready
    if (filters.messageReady === 'ready' && a.outreachStatus !== 'message_ready' && a.outreachStatus !== 'draft_created' && (!a.outreach || a.outreach.length === 0)) return false;
    if (filters.messageReady === 'absent' && (a.outreachStatus === 'message_ready' || a.outreachStatus === 'draft_created' || (a.outreach && a.outreach.length > 0))) return false;

    // Email Verified
    const hasVerifiedEmail = a.financeLead?.emailStatus === 'verified' || a.financeLead?.emailStatus === 'likely_valid';
    if (filters.emailVerified === 'verified' && !hasVerifiedEmail) return false;
    if (filters.emailVerified === 'not_verified' && hasVerifiedEmail) return false;

    // Has Contact
    const hasContact = !!(a.financeLead?.name && a.financeLead.name.trim());
    if (filters.hasContact === 'with' && !hasContact) return false;
    if (filters.hasContact === 'without' && hasContact) return false;

    // Language
    if (filters.language.length > 0) {
      const lang = a.detectedLanguage || (a.country === 'DE' ? 'de' : a.country === 'NL' ? 'nl' : 'en');
      if (!filters.language.includes(lang)) return false;
    }

    // Country
    if (filters.country.length > 0 && !filters.country.includes(a.country)) return false;

    // Temperature
    if (filters.temperature.length > 0) {
      const tier = a.score >= 18 ? 'hot' : a.score >= 12 ? 'warm' : 'cold';
      if (!filters.temperature.includes(tier)) return false;
    }

    // Next Action Type
    if (filters.nextActionType.length > 0) {
      if (!a.nextActionType || !filters.nextActionType.includes(a.nextActionType)) return false;
    }

    return true;
  });
}
