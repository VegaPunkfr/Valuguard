/**
 * GHOST TAX — SUPABASE REALTIME CLIENT (Browser-side)
 *
 * This client is for the cockpit ONLY (command.ghost-tax.com).
 * It subscribes to Sarah's prospects table via WebSocket.
 *
 * When Sarah inserts/updates a prospect, the cockpit sees it instantly.
 * No polling, no sync, no merge. One source of truth.
 */

import { createClient, type RealtimeChannel } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Browser-side client (anon key, RLS enforced)
export const supabaseBrowser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

// ── Types ────────────────────────────────────────────────

export type ProspectTier = 'raw' | 'qualified' | 'hot';

export interface SarahProspect {
  id: string;
  entreprise: string;
  contact: string;
  email: string;
  role: string;
  statut: string;
  score_opportunite: number;
  valeur_estimee: number;
  source: string;
  derniere_interaction: string;
  objection_principale: string | null;
  notes: any;
  stage_history: any;
  tier: ProspectTier;
  signals: any[];
  email_status: string;
  email_confidence: number;
  country: string | null;
  industry: string | null;
  headcount: number | null;
  thesis: string | null;
  domain: string | null;
  enrichment_status: string | null;
  quality_score: number | null;
  thesis_strength: number | null;
  proof_level: number | null;
  created_at: string;
}

// ── Fetch all prospects ──────────────────────────────────

export async function fetchProspects(): Promise<SarahProspect[]> {
  const { data, error } = await supabaseBrowser
    .from('prospects')
    .select('*')
    .order('score_opportunite', { ascending: false })
    .limit(200);

  if (error) {
    console.error('[Realtime] Fetch error:', error.message);
    return [];
  }

  return (data || []) as SarahProspect[];
}

// ── Subscribe to realtime changes ────────────────────────

export function subscribeToProspects(
  onInsert: (prospect: SarahProspect) => void,
  onUpdate: (prospect: SarahProspect) => void,
  onDelete: (id: string) => void,
): RealtimeChannel {
  const channel = supabaseBrowser
    .channel('prospects-realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'prospects' },
      (payload) => onInsert(payload.new as SarahProspect),
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'prospects' },
      (payload) => onUpdate(payload.new as SarahProspect),
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'prospects' },
      (payload) => onDelete((payload.old as any).id),
    )
    .subscribe((status) => {
      console.log('[Realtime] Subscription status:', status);
    });

  return channel;
}

// ── Unsubscribe ──────────────────────────────────────────

export function unsubscribeFromProspects(channel: RealtimeChannel): void {
  supabaseBrowser.removeChannel(channel);
}

// ── Convert Sarah prospect → cockpit Account format ──────

export function prospectToAccount(p: SarahProspect) {
  const domain = p.domain || p.email?.split('@')[1] || p.entreprise?.toLowerCase().replace(/\s+/g, '') + '.com';
  const score = Math.min(25, Math.round((p.score_opportunite || 0) / 4));

  const statusMap: Record<string, string> = {
    nouveau: 'new',
    engaged: 'reviewing',
    interested: 'qualified',
    proposal: 'outreach_ready',
    negotiating: 'contacted',
    closed: 'contacted',
    lost: 'dropped',
    stalled: 'dropped',
    contacté: 'contacted',
  };

  const attackability = p.score_opportunite >= 70 ? 'now'
    : p.score_opportunite >= 40 ? 'soon'
    : p.score_opportunite >= 20 ? 'later'
    : 'blocked';

  const conviction = p.score_opportunite >= 80 ? 'very_high'
    : p.score_opportunite >= 60 ? 'high'
    : p.score_opportunite >= 40 ? 'moderate'
    : 'low';

  const detectCountry = (d: string) => {
    const tld = d.split('.').pop()?.toLowerCase();
    if (tld === 'de' || tld === 'at' || tld === 'ch') return 'DE';
    if (tld === 'nl') return 'NL';
    if (tld === 'uk' || tld === 'co') return 'UK';
    if (tld === 'fr' || tld === 'be') return 'FR';
    return 'US';
  };

  return {
    id: p.id || domain.replace(/\./g, '-'),
    company: p.entreprise || domain,
    domain,
    country: p.country || detectCountry(domain),
    industry: p.industry || 'Unknown',
    employeeRange: p.headcount ? `~${p.headcount}` : 'Unknown',
    website: `https://${domain}`,
    status: statusMap[p.statut] || 'new',
    score,
    tier: p.tier === 'hot' ? 1 : p.tier === 'qualified' ? 2 : 3,
    attackability,
    dealPotential: (p.valeur_estimee || 490) >= 4900 ? 'high' : 'medium',
    conviction,
    solofit: 'good',
    financeLead: {
      name: p.contact || 'Unknown',
      title: p.role || 'Finance',
      email: p.email?.startsWith('contact@') ? undefined : p.email,
      emailStatus: p.email_status || (p.email?.startsWith('contact@') ? 'missing' : 'likely_valid'),
      emailConfidence: p.email_confidence || 0,
    },
    signals: p.signals || [{
      type: 'intent',
      detail: `Source: ${p.source || 'sarah'}. Score: ${p.score_opportunite || 0}/100.`,
      source: 'sarah',
      strength: Math.min(5, Math.round((p.score_opportunite || 0) / 20)),
    }],
    mainSignal: p.thesis || `Sarah — ${p.source || 'auto-detected'} (score ${p.score_opportunite}/100)`,
    whyNow: p.thesis || 'Detected by Sarah — qualify further.',
    hypothesis: {
      summary: `${p.entreprise || domain} — ${p.source || 'auto-detected'}.`,
      whyItMatters: p.thesis || 'Auto-detected prospect.',
      hiddenExposure: [],
      proofNeeded: 'Run enrichment to validate.',
    },
    strengths: p.tier === 'hot' ? ['Curated W12 target'] : ['Auto-detected by Sarah'],
    weaknesses: p.contact === 'Unknown' || !p.contact ? ['No contact identified'] : [],
    outreach: [],
    timeline: [{
      type: 'account_created',
      detail: `Sarah ${p.source || 'auto'} — tier: ${p.tier || 'raw'}`,
      date: p.created_at || new Date().toISOString(),
    }],
    executionLog: [],
    nextAction: p.tier === 'hot' ? 'Review and send outreach' : 'Enrich: find CFO, resolve email, build thesis.',
    revenueEstimate: p.valeur_estimee || 490,
    // Enrichment pipeline state
    enrichmentStatus: p.enrichment_status || 'pending',
    qualityScore: p.quality_score || undefined,
    thesisStrength: p.thesis_strength || undefined,
    proofLevel: p.proof_level || undefined,
    // Extra: Sarah-specific fields
    sarahId: p.id,
    sarahTier: p.tier || 'raw',
    sarahScore: p.score_opportunite,
    sarahSource: p.source,
    createdAt: p.created_at || new Date().toISOString(),
    updatedAt: p.derniere_interaction || new Date().toISOString(),
  };
}
