/**
 * GHOST TAX — COCKPIT ENGINE
 *
 * Le moteur central qui fait TOURNER le flywheel.
 * Appelé au chargement du cockpit et par le cron quotidien.
 *
 * Ce fichier est le FIL qui connecte les 22 moteurs backend.
 * Sans lui, le cockpit est une coquille vide.
 */

import { loadAccounts, saveAccounts } from './store';
import { selectAngle } from './angles';
import { buildAccountThesis } from './thesis-engine';
import { selectProofs } from './proof-engine';
import { evaluateQualityGate } from './quality-gate';
import { processMessages } from './messages';
import { calcHeatScore } from './hot-queue';
import { selectNextPost, formatForLinkedIn } from './linkedin-content';
import { getTodayPlan, isInSendingWindow } from './sending-windows';
import { getAllPendingFollowUps, getFollowUpsDue } from './follow-up-scheduler';
import { CLAIMS } from '@/lib/claims';
import type { Account } from '@/types/command';

// ── Types ──────────────────────────────────────────────────

export interface CockpitBrief {
  date: string;
  dayOfWeek: string;
  markets: string[];
  isFollowUpDay: boolean;
  linkedinPillar: string;
  sendingWindow: { inWindow: boolean; quality: string; minutesLeft: number };
  isWeekend: boolean;
}

export interface ApprovalItem {
  account: Account;
  heat: number;
  channel: 'email' | 'linkedin';
  message: {
    subject?: string;
    body: string;
    language: string;
  };
  contactEmail?: string;
  contactLinkedin?: string;
  exposureLow: number;
  exposureHigh: number;
  dailyLoss: number;
  confidenceScore: number;
  qualityVerdict: string;
}

export interface CockpitState {
  brief: CockpitBrief;
  approvalQueue: ApprovalItem[];
  autoSentCount: number;
  followUpsDue: number;
  totalSent: number;
  totalReplied: number;
  pipelineValueEUR: number;
  revenueEUR: number;
  linkedinPost: { body: string; pillar: string } | null;
  activityFeed: Array<{ ts: string; icon: string; text: string }>;
}

// ── Brief Builder ──────────────────────────────────────────

export function buildBrief(): CockpitBrief {
  const now = new Date();
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const dow = now.getDay();
  const isWeekend = dow === 0 || dow === 6;

  let plan = { markets: [] as string[], isFollowUpDay: false, linkedinPostPillar: '' };
  try { plan = getTodayPlan(); } catch {}

  let sendingWindow = { inWindow: false, quality: 'avoid', minutesLeft: 0 };
  try { sendingWindow = isInSendingWindow(plan.markets[0] || 'DE'); } catch {}

  return {
    date: now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    dayOfWeek: days[dow],
    markets: plan.markets,
    isFollowUpDay: plan.isFollowUpDay,
    linkedinPillar: plan.linkedinPostPillar,
    sendingWindow,
    isWeekend,
  };
}

// ── Approval Queue Builder ─────────────────────────────────

export function buildApprovalQueue(accounts: Account[]): {
  queue: ApprovalItem[];
  autoSent: number;
} {
  const queue: ApprovalItem[] = [];
  let autoSent = 0;

  for (const account of accounts) {
    if (account.status === 'dropped') continue;
    if (!account.signals || account.signals.length === 0) continue;

    // Calculate heat
    let heat = 0;
    try { heat = calcHeatScore(account).total; } catch { heat = (account as any).score || 0; }

    // Get quality gate verdict
    let verdict = 'approve';
    let score = 50;
    try {
      const angle = selectAngle(account);
      const thesis = buildAccountThesis(account);
      const proofs = selectProofs(account, thesis);
      const gate = evaluateQualityGate(account, thesis, proofs, angle, []);
      verdict = gate.verdict;
      score = gate.totalScore;
    } catch {}

    // Skip snoozed/enrichment needed
    if (verdict === 'snooze' || verdict === 'enrich') continue;

    // Get the best message (from outreach drafts or generate)
    const draft = account.outreach?.find(o => o.status === 'draft');
    if (!draft?.body) continue;

    // Determine channel
    const channel: 'email' | 'linkedin' = draft.channel === 'linkedin' ? 'linkedin' : 'email';

    // Get exposure data
    const exposureLow = account.scan?.exposureLow || account.revenueEstimate * 0.8 || 0;
    const exposureHigh = account.scan?.exposureHigh || account.revenueEstimate * 1.2 || 0;
    const dailyLoss = Math.round(((exposureLow + exposureHigh) / 2) / 365);

    const item: ApprovalItem = {
      account,
      heat,
      channel,
      message: {
        subject: draft.subject,
        body: draft.body,
        language: ['DE', 'AT', 'CH'].includes(account.country) ? 'de' : 'en',
      },
      contactEmail: account.financeLead?.email,
      contactLinkedin: account.financeLead?.linkedIn,
      exposureLow,
      exposureHigh,
      dailyLoss,
      confidenceScore: score,
      qualityVerdict: verdict,
    };

    // Auto-send if score 80+ and email channel
    if (verdict === 'auto_send' && channel === 'email' && account.financeLead?.email) {
      autoSent++;
      // In production, this would call sendOutreachEmail()
      // For now, count it
    } else {
      queue.push(item);
    }
  }

  // Sort by heat (highest first)
  queue.sort((a, b) => b.heat - a.heat);

  return { queue, autoSent };
}

// ── Metrics Calculator ─────────────────────────────────────

export function calculateMetrics(accounts: Account[]): {
  totalSent: number;
  totalReplied: number;
  pipelineValueEUR: number;
  revenueEUR: number;
} {
  let totalSent = 0;
  let totalReplied = 0;
  let pipelineValueEUR = 0;
  let revenueEUR = 0;

  for (const a of accounts) {
    if (a.status === 'contacted') totalSent++;
    if (a.status === 'replied') totalReplied++;
    if (a.status === 'converted') revenueEUR += a.revenueEstimate || 490;

    // Pipeline value = exposure × conversion probability × price
    if (a.status !== 'dropped' && a.status !== 'converted') {
      const exposure = a.scan?.exposureHigh || a.revenueEstimate || 0;
      const prob = a.status === 'replied' ? 0.30
        : a.status === 'contacted' ? 0.08
        : a.status === 'outreach_ready' ? 0.04
        : 0.02;
      pipelineValueEUR += Math.round(exposure * prob * 0.01); // rough estimate
    }
  }

  return { totalSent, totalReplied, pipelineValueEUR, revenueEUR };
}

// ── Full Cockpit State Builder ─────────────────────────────

export function buildCockpitState(): CockpitState {
  const accounts = loadAccounts();
  const brief = buildBrief();
  const { queue, autoSent } = buildApprovalQueue(accounts);
  const metrics = calculateMetrics(accounts);

  let followUpsDue = 0;
  try { followUpsDue = getFollowUpsDue().length; } catch {}

  let linkedinPost: { body: string; pillar: string } | null = null;
  try {
    const post = selectNextPost(undefined, 'en');
    if (post) {
      linkedinPost = {
        body: formatForLinkedIn(post),
        pillar: brief.linkedinPillar,
      };
    }
  } catch {}

  // Load activity feed
  let activityFeed: Array<{ ts: string; icon: string; text: string }> = [];
  try {
    if (typeof window !== 'undefined') {
      activityFeed = JSON.parse(localStorage.getItem('gt-activity-feed') || '[]');
    }
  } catch {}

  return {
    brief,
    approvalQueue: queue,
    autoSentCount: autoSent,
    followUpsDue,
    totalSent: metrics.totalSent,
    totalReplied: metrics.totalReplied,
    pipelineValueEUR: metrics.pipelineValueEUR,
    revenueEUR: metrics.revenueEUR,
    linkedinPost,
    activityFeed,
  };
}

// ── Activity Feed Push ─────────────────────────────────────

export function pushActivity(icon: string, text: string) {
  if (typeof window === 'undefined') return;
  try {
    const feed = JSON.parse(localStorage.getItem('gt-activity-feed') || '[]');
    feed.unshift({
      ts: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      icon,
      text,
    });
    if (feed.length > 50) feed.length = 50;
    localStorage.setItem('gt-activity-feed', JSON.stringify(feed));
  } catch {}
}

// ── Tab Title Badge ────────────────────────────────────────

export function updateTabTitle(pendingCount: number) {
  if (typeof document === 'undefined') return;
  const base = 'Mission Control — Ghost Tax';
  document.title = pendingCount > 0 ? `(${pendingCount}) ${base}` : base;
}

// ── Send Approved Email ────────────────────────────────────

export async function sendApprovedEmail(item: ApprovalItem): Promise<boolean> {
  if (!item.contactEmail || !item.message.body) return false;

  try {
    const res = await fetch('/api/command/send-approved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: item.contactEmail,
        subject: item.message.subject || `${item.account.domain} — Ghost Tax`,
        textBody: item.message.body,
        domain: item.account.domain,
        prospectId: item.account.id,
      }),
    });

    if (res.ok) {
      pushActivity('✅', `Email envoyé → ${item.account.financeLead.name} (${item.account.company})`);
      return true;
    }
  } catch {}

  pushActivity('❌', `Échec envoi → ${item.account.financeLead.name}`);
  return false;
}

// ── Copy LinkedIn + Open Profile ───────────────────────────

export async function handleLinkedInApproval(item: ApprovalItem): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(item.message.body);

    if (item.contactLinkedin) {
      window.open(item.contactLinkedin, '_blank', 'noopener,noreferrer');
    }

    pushActivity('💬', `LinkedIn copié → ${item.account.financeLead.name} (${item.account.company})`);
    return true;
  } catch {
    // Fallback clipboard
    const ta = document.createElement('textarea');
    ta.value = item.message.body;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);

    if (item.contactLinkedin) {
      window.open(item.contactLinkedin, '_blank');
    }

    pushActivity('💬', `LinkedIn copié → ${item.account.financeLead.name}`);
    return true;
  }
}

// ── Keyboard Shortcuts ─────────────────────────────────────

export function setupKeyboardShortcuts(
  onApprove: () => void,
  onSkip: () => void,
  onEscape: () => void,
): () => void {
  function handler(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
      e.preventDefault();
      onApprove();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onApprove();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onSkip();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onEscape();
    }
  }

  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}

// ── AI Message Generation (calls server-side API) ──────────

export async function generateAIMessage(
  account: Account,
  channel: 'email' | 'linkedin_dm' = 'email',
  sequenceStep: 'M1' | 'M2' | 'M3' | 'M4' | 'M5' = 'M1',
): Promise<{ subject?: string; body: string; language: string } | null> {
  try {
    const res = await fetch('/api/command/generate-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prospect: {
          company: account.company,
          domain: account.domain,
          country: account.country,
          industry: (account as any).industry || '',
          headcount: (account as any).headcount || 0,
          financeLead: account.financeLead,
          signals: account.signals || [],
          revenueEstimate: account.revenueEstimate || 0,
        },
        channel,
        sequenceStep,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return {
      subject: data.subject,
      body: data.body,
      language: data.language || 'en',
    };
  } catch {
    return null;
  }
}

// ── Generate Missing Messages for All Prospects ───────────

export async function generateMissingMessages(
  accounts: Account[],
): Promise<number> {
  let generated = 0;

  for (const account of accounts) {
    if (account.status === 'dropped') continue;
    if (!account.signals || account.signals.length === 0) continue;

    // Skip if already has a draft
    const hasDraft = account.outreach?.some((o: any) => o.status === 'draft');
    if (hasDraft) continue;

    // Skip if no finance lead
    if (!account.financeLead?.name) continue;

    // Determine channel
    const channel = account.financeLead?.email ? 'email' : 'linkedin_dm';

    const msg = await generateAIMessage(account, channel, 'M1');
    if (!msg) continue;

    // Add draft to account outreach
    if (!account.outreach) (account as any).outreach = [];
    account.outreach.push({
      channel: channel === 'linkedin_dm' ? 'linkedin' : 'email',
      status: 'draft',
      subject: msg.subject || '',
      body: msg.body,
      createdAt: new Date().toISOString(),
    } as any);

    pushActivity('\ud83e\udd16', `Message IA g\u00e9n\u00e9r\u00e9 pour ${account.company} (${msg.language})`);
    generated++;
  }

  if (generated > 0) {
    saveAccounts(accounts);
  }

  return generated;
}

// ── Auto-Pipeline : remplit le cockpit automatiquement ────

/**
 * Appelle /api/command/auto-pipeline pour chercher des prospects
 * sur Apollo, générer des messages IA, et les injecter dans le cockpit.
 *
 * Appelé automatiquement au chargement du cockpit si la queue est vide.
 * Edith ne fait RIEN — le cockpit se remplit tout seul.
 */
export async function runAutoPipeline(): Promise<{
  added: number;
  withMessages: number;
}> {
  try {
    const res = await fetch('/api/command/auto-pipeline');
    if (!res.ok) return { added: 0, withMessages: 0 };

    const data = await res.json();
    const newProspects = data.prospects || [];

    if (newProspects.length === 0) return { added: 0, withMessages: 0 };

    // Merge into existing accounts
    const accounts = loadAccounts();
    const existingDomains = new Set(accounts.map(a => a.domain));
    let added = 0;

    for (const prospect of newProspects) {
      if (existingDomains.has(prospect.domain)) continue;
      accounts.push(prospect as any);
      added++;
      pushActivity('🔍', `Nouveau prospect : ${prospect.company} (${prospect.country})`);
    }

    if (added > 0) {
      saveAccounts(accounts);
    }

    return {
      added,
      withMessages: newProspects.filter((p: any) => p.outreach?.length > 0).length,
    };
  } catch {
    return { added: 0, withMessages: 0 };
  }
}

// ── Formatting Helpers ────────────────────────────────────

export function fmtEur(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M €`;
  if (amount >= 1_000) return `${Math.round(amount / 1_000)}k €`;
  return `${Math.round(amount)} €`;
}

export function fmtDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}