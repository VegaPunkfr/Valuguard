// Recon Ledger State Machine & Ops Manager — ES Module
import { updateOpsState, logAction } from './recon-api.js';

export const STATES = ['discovered','reviewed','shortlisted','contacted','replied','nurturing','deferred','qualified','closed','suppressed'];

export const TRANSITIONS = {
  discovered: ['reviewed', 'suppressed'],
  reviewed: ['shortlisted', 'suppressed', 'deferred'],
  shortlisted: ['contacted', 'deferred', 'suppressed'],
  contacted: ['replied', 'deferred', 'suppressed'],
  replied: ['nurturing', 'qualified', 'suppressed'],
  nurturing: ['qualified', 'deferred', 'suppressed'],
  deferred: ['discovered'],
  qualified: ['closed', 'suppressed'],
  closed: [],
  suppressed: []
};

export function canTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

export function getNextStates(currentStatus) {
  return TRANSITIONS[currentStatus] || [];
}

export async function transitionEntity(entityId, newStatus, reason = '') {
  const stateRes = await updateOpsState(entityId, { status: newStatus, last_transition_at: new Date().toISOString() });
  if (stateRes.error) return stateRes;
  await logAction('person', entityId, 'status_change', { new_status: newStatus, reason });
  return stateRes;
}

// Priority scoring — higher = more urgent
export function calculatePriority(entity, opsState, actions = []) {
  let score = 0;
  const now = Date.now();

  // Appearance count — seen in multiple sessions = higher value
  score += Math.min((entity.appearance_count || 1) * 8, 40);

  // Data confidence — more data = higher priority
  const confidence = entity.data_confidence || 0;
  score += Math.round(confidence * 25);

  // Has verified email = critical for outreach
  if (entity.email && entity.email_status === 'verified') score += 20;
  else if (entity.email) score += 10;

  // Recency — last seen recently = boost
  if (entity.last_seen_at) {
    const daysSince = (now - new Date(entity.last_seen_at).getTime()) / 86400000;
    if (daysSince < 3) score += 15;
    else if (daysSince < 7) score += 10;
    else if (daysSince < 14) score += 5;
  }

  // Job changed recently = high intent signal
  if (entity.job_changed) score += 15;

  // Seniority bonus
  const seniority = (entity.seniority || '').toLowerCase();
  if (seniority === 'c_suite' || seniority === 'vp') score += 12;
  else if (seniority === 'director') score += 8;
  else if (seniority === 'manager') score += 4;

  // Action history — entities with no actions yet need attention
  if (actions.length === 0) score += 10;

  // Ops state modifiers
  if (opsState) {
    if (opsState.actionable_now) score += 5;
    if (opsState.next_action_due_at && new Date(opsState.next_action_due_at).getTime() <= now) score += 10;
  }

  return Math.min(score, 100);
}

// Freshness grading
export function calculateFreshness(lastSeenAt) {
  if (!lastSeenAt) return { grade: 'stale', days: Infinity, color: '#9ca3af' };
  const days = Math.floor((Date.now() - new Date(lastSeenAt).getTime()) / 86400000);
  if (days <= 3) return { grade: 'fresh', days, color: '#22c55e' };
  if (days <= 14) return { grade: 'warm', days, color: '#f59e0b' };
  if (days <= 30) return { grade: 'aging', days, color: '#f97316' };
  return { grade: 'stale', days, color: '#9ca3af' };
}

// Filter entities that are actionable right now
export function filterActionable(entities, opsStates) {
  const now = Date.now();
  return entities.filter(e => {
    const ops = opsStates[e.id];
    if (!ops) return false;
    if (!ops.actionable_now) return false;
    if (ops.next_action_due_at && new Date(ops.next_action_due_at).getTime() > now) return false;
    return true;
  });
}

// Dedup key generation
export function personDedupeKey({ email, name, company, domain }) {
  if (email) return `email:${email.toLowerCase().trim()}`;
  const normName = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const normCompany = (domain || company || '').toLowerCase().replace(/[^a-z0-9.]/g, '');
  if (normName && normCompany) return `name:${normName}@${normCompany}`;
  return `raw:${normName || 'unknown'}-${normCompany || 'unknown'}-${Date.now()}`;
}

export function companyDedupeKey({ domain, name }) {
  if (domain) return `domain:${domain.toLowerCase().replace(/^www\./, '').trim()}`;
  if (name) return `name:${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  return `raw:unknown-${Date.now()}`;
}
