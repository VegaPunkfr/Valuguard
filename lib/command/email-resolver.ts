/**
 * GHOST TAX — EMAIL RESOLVER ENGINE
 *
 * Pipeline: Domain Pattern Discovery → Candidate Generation → Verification → Confidence
 *
 * Client-side deterministic logic for pattern detection + candidate generation.
 * Server-side verification via /api/command/verify-email endpoint.
 *
 * Priority order for email truth:
 * 1. Lead-captured email (came from Ghost-Tax form/payment)
 * 2. Pattern-generated + MX verified
 * 3. Pattern-generated + domain has MX but catch-all
 * 4. Pattern-guessed, unverified
 */

import type {
  Account, FinanceLead, EmailStatus, EmailSource,
  DomainEmailIntel, DomainPatternStatus,
} from '@/types/command';

// ── Common Email Patterns (ordered by frequency in B2B) ─────

export const EMAIL_PATTERNS = [
  { id: 'firstname.lastname', build: (f: string, l: string) => `${f}.${l}` },
  { id: 'firstname',          build: (f: string, _l: string) => f },
  { id: 'firstnamelastname',  build: (f: string, l: string) => `${f}${l}` },
  { id: 'f.lastname',         build: (f: string, l: string) => `${f[0]}.${l}` },
  { id: 'flastname',          build: (f: string, l: string) => `${f[0]}${l}` },
  { id: 'lastname',           build: (_f: string, l: string) => l },
  { id: 'lastname.firstname', build: (f: string, l: string) => `${l}.${f}` },
  { id: 'firstname_lastname', build: (f: string, l: string) => `${f}_${l}` },
  { id: 'firstlastname',      build: (f: string, l: string) => `${f[0]}${l}` },
] as const;

// ── Domain Email Intel Store ────────────────────────────────

const DOMAIN_INTEL_KEY = 'gt-domain-email-intel-v1';

export function loadDomainIntel(): Record<string, DomainEmailIntel> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(DOMAIN_INTEL_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch { return {}; }
}

export function saveDomainIntel(intel: Record<string, DomainEmailIntel>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DOMAIN_INTEL_KEY, JSON.stringify(intel));
}

// ── Name Parsing ────────────────────────────────────────────

function parseName(fullName: string): { first: string; last: string } | null {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const first = parts[0].toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z]/g, '');
  const last = parts[parts.length - 1].toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');
  if (!first || !last) return null;
  return { first, last };
}

// ── Pattern Discovery from Known Email ──────────────────────

export function discoverPattern(knownEmail: string, contactName: string): string | null {
  const [localPart, domain] = knownEmail.toLowerCase().split('@');
  if (!localPart || !domain) return null;

  const name = parseName(contactName);
  if (!name) return null;

  for (const pattern of EMAIL_PATTERNS) {
    const candidate = pattern.build(name.first, name.last);
    if (candidate === localPart) return pattern.id;
  }

  return null;
}

// ── Learn Domain Pattern from Lead Email ────────────────────

export function learnDomainPattern(
  email: string,
  contactName: string,
  domainIntel: Record<string, DomainEmailIntel>,
): Record<string, DomainEmailIntel> {
  const [, domain] = email.toLowerCase().split('@');
  if (!domain) return domainIntel;

  const pattern = discoverPattern(email, contactName);
  const existing = domainIntel[domain];

  if (pattern) {
    const confirmedEmails = new Set(existing?.confirmedEmails || []);
    confirmedEmails.add(email.toLowerCase());

    const isReinforced = existing?.pattern === pattern;
    const confidence = isReinforced
      ? Math.min(95, (existing?.patternConfidence || 60) + 15)
      : 70; // New pattern discovery

    return {
      ...domainIntel,
      [domain]: {
        domain,
        pattern,
        patternStatus: confirmedEmails.size >= 2 ? 'confirmed' : 'likely',
        patternConfidence: confidence,
        confirmedEmails: [...confirmedEmails],
        hasMx: existing?.hasMx ?? true, // assume true if came from real lead
        isCatchAll: existing?.isCatchAll ?? false,
        lastCheckedAt: new Date().toISOString(),
      },
    };
  }

  // No pattern match — store the email anyway
  if (existing) {
    const confirmedEmails = new Set(existing.confirmedEmails);
    confirmedEmails.add(email.toLowerCase());
    return {
      ...domainIntel,
      [domain]: { ...existing, confirmedEmails: [...confirmedEmails], lastCheckedAt: new Date().toISOString() },
    };
  }

  return {
    ...domainIntel,
    [domain]: {
      domain,
      patternStatus: 'unknown',
      patternConfidence: 0,
      confirmedEmails: [email.toLowerCase()],
      hasMx: true,
      isCatchAll: false,
      lastCheckedAt: new Date().toISOString(),
    },
  };
}

// ── Candidate Generation ────────────────────────────────────

export interface EmailCandidate {
  email: string;
  pattern: string;
  confidence: number;
  source: EmailSource;
}

export function generateCandidates(
  contactName: string,
  domain: string,
  domainIntel: Record<string, DomainEmailIntel>,
): EmailCandidate[] {
  const name = parseName(contactName);
  if (!name) return [];

  const intel = domainIntel[domain];
  const candidates: EmailCandidate[] = [];

  // If domain has a confirmed/likely pattern, use it first
  if (intel?.pattern && (intel.patternStatus === 'confirmed' || intel.patternStatus === 'likely')) {
    const patternDef = EMAIL_PATTERNS.find(p => p.id === intel.pattern);
    if (patternDef) {
      candidates.push({
        email: `${patternDef.build(name.first, name.last)}@${domain}`,
        pattern: intel.pattern,
        confidence: intel.patternConfidence,
        source: 'pattern_generated',
      });
    }
  }

  // Generate alternatives (lower confidence)
  for (const p of EMAIL_PATTERNS) {
    if (p.id === intel?.pattern) continue; // Already added
    const email = `${p.build(name.first, name.last)}@${domain}`;
    if (candidates.some(c => c.email === email)) continue;
    candidates.push({
      email,
      pattern: p.id,
      confidence: intel?.patternStatus === 'confirmed' ? 15 : 30, // Low if we already have a better one
      source: 'pattern_generated',
    });
  }

  return candidates;
}

// ── Resolve Email for a Contact ─────────────────────────────

export interface ResolvedEmail {
  email: string | null;
  status: EmailStatus;
  source: EmailSource;
  confidence: number;
  pattern?: string;
  candidates: EmailCandidate[];
  needsVerification: boolean;
}

export function resolveEmail(
  account: Account,
  domainIntel: Record<string, DomainEmailIntel>,
): ResolvedEmail {
  const lead = account.financeLead;

  // Priority 1: Already has a verified/lead-captured email
  if (lead.email && (lead.emailStatus === 'verified' || lead.emailStatus === 'likely_valid')) {
    return {
      email: lead.email,
      status: lead.emailStatus,
      source: lead.emailSource || 'manual',
      confidence: lead.emailConfidence || 90,
      pattern: lead.emailPattern,
      candidates: [],
      needsVerification: false,
    };
  }

  // Priority 2: Email from lead capture (Ghost-Tax form)
  if (lead.email && lead.emailSource === 'lead_captured') {
    return {
      email: lead.email,
      status: 'likely_valid',
      source: 'lead_captured',
      confidence: 85,
      candidates: [],
      needsVerification: false,
    };
  }

  // Priority 3: Has an email already (manual or enrichment)
  if (lead.email && lead.emailStatus !== 'invalid') {
    return {
      email: lead.email,
      status: lead.emailStatus || 'guessed',
      source: lead.emailSource || 'manual',
      confidence: lead.emailConfidence || 50,
      pattern: lead.emailPattern,
      candidates: [],
      needsVerification: lead.emailStatus !== 'verified',
    };
  }

  // Priority 4: Generate candidates from domain pattern
  if (lead.name && lead.name.split(' ').length >= 2) {
    const candidates = generateCandidates(lead.name, account.domain, domainIntel);
    const intel = domainIntel[account.domain];

    if (candidates.length > 0) {
      const best = candidates[0];
      const isCatchAll = intel?.isCatchAll || false;

      return {
        email: best.email,
        status: isCatchAll ? 'catch_all' : (best.confidence >= 60 ? 'likely_valid' : 'guessed'),
        source: 'pattern_generated',
        confidence: best.confidence,
        pattern: best.pattern,
        candidates,
        needsVerification: true,
      };
    }
  }

  // No name or no candidates
  return {
    email: null,
    status: 'missing',
    source: 'pattern_generated',
    confidence: 0,
    candidates: [],
    needsVerification: false,
  };
}

// ── Apply Resolution to Account ─────────────────────────────

export function applyEmailResolution(
  account: Account,
  resolution: ResolvedEmail,
): Account {
  return {
    ...account,
    financeLead: {
      ...account.financeLead,
      email: resolution.email || account.financeLead.email,
      emailStatus: resolution.status,
      emailSource: resolution.source,
      emailConfidence: resolution.confidence,
      emailPattern: resolution.pattern,
      lastEmailCheckedAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
  };
}

// ── Batch Resolve All Accounts ──────────────────────────────

export function resolveAllEmails(
  accounts: Account[],
  domainIntel: Record<string, DomainEmailIntel>,
): { accounts: Account[]; updated: number } {
  let updated = 0;
  const result = accounts.map(a => {
    // Skip if already verified
    if (a.financeLead.emailStatus === 'verified') return a;
    // Skip dropped
    if (a.status === 'dropped') return a;

    const resolution = resolveEmail(a, domainIntel);
    if (resolution.email && resolution.email !== a.financeLead.email) {
      updated++;
      return applyEmailResolution(a, resolution);
    }
    // Update status even if email unchanged
    if (resolution.status !== a.financeLead.emailStatus) {
      updated++;
      return applyEmailResolution(a, resolution);
    }
    return a;
  });

  return { accounts: result, updated };
}

// ── Process Incoming Lead Email → Learn Pattern ─────────────

export function processLeadEmail(
  accounts: Account[],
  email: string,
  domain: string,
  contactName: string | undefined,
  domainIntel: Record<string, DomainEmailIntel>,
): { accounts: Account[]; domainIntel: Record<string, DomainEmailIntel> } {
  // Learn pattern from the incoming email
  let updatedIntel = domainIntel;
  if (contactName) {
    updatedIntel = learnDomainPattern(email, contactName, domainIntel);
  }

  // Find the account for this domain and update its email if relevant
  const updatedAccounts = accounts.map(a => {
    if (a.domain !== domain) return a;
    // If this account's contact matches, set email directly
    if (a.financeLead.email) return a; // Don't overwrite existing
    return {
      ...a,
      financeLead: {
        ...a.financeLead,
        email,
        emailStatus: 'likely_valid' as const,
        emailSource: 'lead_captured' as const,
        emailConfidence: 85,
        lastEmailCheckedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    };
  });

  return { accounts: updatedAccounts, domainIntel: updatedIntel };
}
