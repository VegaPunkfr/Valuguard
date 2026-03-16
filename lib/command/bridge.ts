/**
 * GHOST TAX — EVENT BRIDGE
 *
 * Connects the public Ghost-Tax surface to the Founder Mission Control.
 *
 * Architecture Decision:
 * ─────────────────────
 * Ghost-Tax is a single Next.js 15 app with 3 strict surface zones:
 *
 *   PUBLIC   (marketing)  — Attracts, convinces, converts, captures signals
 *   CLIENT   (app)        — Post-conversion: dashboard, vault, report, intel
 *   FOUNDER  (command)    — Private: accounts, hot queue, outreach, brief
 *
 * This bridge is the ONLY authorized pathway for data to flow
 * from PUBLIC/CLIENT surfaces into the FOUNDER surface.
 *
 * Why a bridge, not direct coupling:
 * - The founder cockpit uses localStorage (fast, offline-capable, no auth)
 * - The public site uses Supabase (persistent, multi-device)
 * - Direct coupling would make the cockpit depend on Supabase availability
 * - The bridge translates platform events into command-native objects
 *
 * Event Flow:
 *   Platform Event (Supabase) → Bridge → Command Account (localStorage)
 *
 *   Examples:
 *   - Lead captured → create/enrich account
 *   - Scan completed → add scan results to account
 *   - Payment completed → upgrade account status + revenue estimate
 *   - Checkout abandoned → add signal "intent detected"
 *
 * What this bridge does NOT do:
 * - It never exposes command data to the public surface
 * - It never pushes founder decisions back to Supabase automatically
 * - It never auto-sends outreach (human-in-the-loop)
 */

import type {
  Account, AccountStatus, Signal, Attackability, Conviction,
  DealPotential, SoloFit, Country, Tier,
} from '@/types/command';

// ── Platform Event Types ────────────────────────────────────

export type PlatformEventType =
  | 'lead_captured'
  | 'scan_requested'
  | 'scan_completed'
  | 'payment_completed'
  | 'checkout_abandoned'
  | 'report_generated'
  | 'contact_form_submitted'
  | 'high_intent_detected'
  | 'return_visit'
  | 'memo_copied';

export interface PlatformEvent {
  type: PlatformEventType;
  domain: string;
  email?: string;
  companyName?: string;
  contactName?: string;
  headcount?: number;
  industry?: string;
  country?: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

// ── Domain → Country Detection ──────────────────────────────

function detectCountry(domain: string, country?: string): Country {
  if (country) {
    const c = country.toUpperCase();
    if (c === 'DE' || c === 'AT' || c === 'CH') return 'DE';
    if (c === 'NL') return 'NL';
    if (c === 'GB' || c === 'UK') return 'UK';
    if (c === 'US') return 'US';
  }
  const tld = domain.split('.').pop()?.toLowerCase();
  if (tld === 'de' || tld === 'at' || tld === 'ch') return 'DE';
  if (tld === 'nl') return 'NL';
  if (tld === 'uk' || tld === 'co') return 'UK';
  return 'US'; // default
}

// ── Headcount → Employee Range ──────────────────────────────

function headcountToRange(headcount?: number): string {
  if (!headcount) return 'Unknown';
  if (headcount < 50) return '1-49';
  if (headcount < 200) return '50-199';
  if (headcount < 500) return '200-499';
  if (headcount < 1000) return '500-999';
  return '1000+';
}

// ── Headcount → Solofit ─────────────────────────────────────

function headcountToSolofit(headcount?: number): SoloFit {
  if (!headcount) return 'good';
  if (headcount <= 300) return 'ideal';
  if (headcount <= 600) return 'good';
  if (headcount <= 1000) return 'stretch';
  return 'hard';
}

// ── Headcount → Revenue Estimate ────────────────────────────

function estimateRevenue(headcount?: number, industry?: string): number {
  const base = headcount && headcount >= 200 ? 10000 : 3000;
  if (industry?.toLowerCase().includes('fintech') || industry?.toLowerCase().includes('bank')) return base * 2;
  if (industry?.toLowerCase().includes('saas') || industry?.toLowerCase().includes('tech')) return base * 1.5;
  return base;
}

// ── Create Account from Platform Event ──────────────────────

export function createAccountFromEvent(event: PlatformEvent): Account {
  const now = new Date().toISOString();
  const id = event.domain.replace(/\./g, '-').toLowerCase();
  const country = detectCountry(event.domain, event.country);

  const signals: Signal[] = [];

  switch (event.type) {
    case 'lead_captured':
      signals.push({
        type: 'intent',
        detail: `Lead captured via Ghost-Tax (${event.email || event.domain})`,
        source: 'ghost-tax',
        date: event.timestamp.split('T')[0],
        strength: 3,
      });
      break;
    case 'scan_completed':
      signals.push({
        type: 'scan',
        detail: `Self-serve scan completed on ghost-tax.com`,
        source: 'ghost-tax',
        date: event.timestamp.split('T')[0],
        strength: 4,
      });
      break;
    case 'payment_completed':
      signals.push({
        type: 'payment',
        detail: `Paid for full exposure analysis (€490)`,
        source: 'stripe',
        date: event.timestamp.split('T')[0],
        strength: 5,
      });
      break;
    case 'checkout_abandoned':
      signals.push({
        type: 'intent',
        detail: `Started checkout but abandoned — high intent, price hesitation`,
        source: 'ghost-tax',
        date: event.timestamp.split('T')[0],
        strength: 3,
      });
      break;
    case 'high_intent_detected':
      signals.push({
        type: 'intent',
        detail: `High-intent behavior: ${(event.data?.pages as string[])?.join(', ') || 'multiple pages visited'}`,
        source: 'ghost-tax',
        date: event.timestamp.split('T')[0],
        strength: 3,
      });
      break;
    default:
      signals.push({
        type: 'intent',
        detail: `Platform event: ${event.type}`,
        source: 'ghost-tax',
        date: event.timestamp.split('T')[0],
        strength: 2,
      });
  }

  return {
    id,
    company: event.companyName || event.domain.split('.')[0].charAt(0).toUpperCase() + event.domain.split('.')[0].slice(1),
    domain: event.domain,
    country,
    industry: event.industry || 'Unknown',
    employeeRange: headcountToRange(event.headcount),
    website: `https://${event.domain}`,
    status: event.type === 'payment_completed' ? 'qualified' : 'new',
    score: event.type === 'payment_completed' ? 15 : event.type === 'scan_completed' ? 10 : 5,
    tier: (event.type === 'payment_completed' ? 1 : 2) as Tier,
    attackability: event.type === 'payment_completed' ? 'now' : 'soon',
    dealPotential: (event.headcount && event.headcount >= 200 ? 'medium' : 'low') as DealPotential,
    conviction: event.type === 'payment_completed' ? 'high' : 'moderate',
    solofit: headcountToSolofit(event.headcount),
    financeLead: {
      name: event.contactName || 'Unknown',
      title: 'Finance',
    },
    signals,
    mainSignal: signals[0]?.detail || 'Platform event detected',
    whyNow: event.type === 'payment_completed'
      ? 'Already paid — deliver exceptional value and upsell to Rail B.'
      : event.type === 'scan_completed'
      ? 'Completed free scan — interested enough to try. Follow up with specific findings.'
      : 'Showed interest on Ghost-Tax. Qualify further before outreach.',
    hypothesis: {
      summary: `${event.companyName || event.domain} showed interest via Ghost-Tax ${event.type.replace(/_/g, ' ')}.`,
      whyItMatters: 'Self-identified prospect — they came to us, not the other way around.',
      hiddenExposure: [],
      proofNeeded: 'Run full Exa scan to validate hypothesis and find CFO contact.',
    },
    strengths: ['Self-identified — came to Ghost-Tax voluntarily'],
    weaknesses: ['Contact unknown — need to identify CFO/finance lead'],
    outreach: [],
    timeline: [{
      type: 'signal_detected',
      detail: `Platform event: ${event.type.replace(/_/g, ' ')}`,
      date: now,
    }],
    executionLog: [],
    nextAction: event.type === 'payment_completed'
      ? 'Deliver report, then follow up for Rail B upsell'
      : 'Run Exa scan, identify CFO, qualify for outreach',
    revenueEstimate: estimateRevenue(event.headcount, event.industry),
    createdAt: now,
    updatedAt: now,
  };
}

// ── Enrich Existing Account with New Event ──────────────────

export function enrichAccountWithEvent(
  account: Account,
  event: PlatformEvent,
): Account {
  const now = new Date().toISOString();
  const newSignals: Signal[] = [...account.signals];
  const newTimeline = [...account.timeline];

  switch (event.type) {
    case 'scan_completed':
      newSignals.push({
        type: 'scan',
        detail: 'Self-serve scan completed on ghost-tax.com',
        source: 'ghost-tax',
        date: event.timestamp.split('T')[0],
        strength: 4,
      });
      newTimeline.push({ type: 'scan_completed', detail: 'Free scan completed via Ghost-Tax', date: now });
      break;

    case 'payment_completed':
      newSignals.push({
        type: 'payment',
        detail: 'Paid for full exposure analysis (€490)',
        source: 'stripe',
        date: event.timestamp.split('T')[0],
        strength: 5,
      });
      newTimeline.push({ type: 'status_changed', detail: 'Payment received — qualified', date: now });
      break;

    case 'checkout_abandoned':
      newSignals.push({
        type: 'intent',
        detail: 'Started checkout but abandoned',
        source: 'ghost-tax',
        date: event.timestamp.split('T')[0],
        strength: 3,
      });
      newTimeline.push({ type: 'signal_detected', detail: 'Checkout abandoned — high intent', date: now });
      break;

    case 'high_intent_detected':
      newSignals.push({
        type: 'intent',
        detail: `High-intent behavior detected`,
        source: 'ghost-tax',
        date: event.timestamp.split('T')[0],
        strength: 3,
      });
      break;

    case 'return_visit':
      newTimeline.push({ type: 'signal_detected', detail: 'Return visit to Ghost-Tax', date: now });
      break;

    case 'memo_copied':
      newSignals.push({
        type: 'intent',
        detail: 'Copied CFO memo from free scan — sharing internally',
        source: 'ghost-tax',
        date: event.timestamp.split('T')[0],
        strength: 4,
      });
      newTimeline.push({ type: 'signal_detected', detail: 'CFO memo copied — internal sharing likely', date: now });
      break;
  }

  // Recalculate score based on new signals
  const avgStrength = newSignals.length > 0
    ? newSignals.reduce((s, sig) => s + sig.strength, 0) / newSignals.length
    : 0;
  const newScore = Math.min(25, Math.round(avgStrength * 5));

  // Upgrade status if payment
  const newStatus: AccountStatus = event.type === 'payment_completed'
    ? 'qualified'
    : account.status;

  // Upgrade conviction if strong signal
  const bestConviction = event.type === 'payment_completed' ? 'high'
    : event.type === 'scan_completed' && account.conviction === 'low' ? 'moderate'
    : account.conviction;

  return {
    ...account,
    signals: newSignals,
    timeline: newTimeline,
    score: Math.max(account.score, newScore),
    status: newStatus,
    conviction: bestConviction as Conviction,
    mainSignal: newSignals.length > 0
      ? newSignals.sort((a, b) => b.strength - a.strength)[0].detail
      : account.mainSignal,
    updatedAt: now,
    // Update contact if we now have more info
    ...(event.contactName && account.financeLead.name === 'Unknown'
      ? { financeLead: { ...account.financeLead, name: event.contactName } }
      : {}),
    ...(event.headcount && account.employeeRange === 'Unknown'
      ? {
          employeeRange: headcountToRange(event.headcount),
          solofit: headcountToSolofit(event.headcount),
          revenueEstimate: Math.max(account.revenueEstimate, estimateRevenue(event.headcount, event.industry)),
        }
      : {}),
  };
}

// ── Process Event into Account Store ────────────────────────

export function processEventIntoAccounts(
  accounts: Account[],
  event: PlatformEvent,
): { accounts: Account[]; action: 'created' | 'enriched' | 'ignored'; accountId: string | null } {
  // Find existing account by domain
  const existing = accounts.find(a => a.domain === event.domain);

  if (existing) {
    // Don't enrich dropped accounts
    if (existing.status === 'dropped') {
      return { accounts, action: 'ignored', accountId: existing.id };
    }
    const enriched = enrichAccountWithEvent(existing, event);
    return {
      accounts: accounts.map(a => a.id === existing.id ? enriched : a),
      action: 'enriched',
      accountId: existing.id,
    };
  }

  // Create new account
  const newAccount = createAccountFromEvent(event);

  // Check for duplicate domain
  if (accounts.some(a => a.domain === event.domain)) {
    return { accounts, action: 'ignored', accountId: null };
  }

  return {
    accounts: [...accounts, newAccount],
    action: 'created',
    accountId: newAccount.id,
  };
}
