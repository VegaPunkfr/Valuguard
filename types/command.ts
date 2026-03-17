/**
 * GHOST TAX — FOUNDER MISSION CONTROL
 * Type system v2 — Decision-first, not display-first
 */

// ── Status Machine ───────────────────────────────────────

export type AccountStatus =
  | 'new'
  | 'reviewing'
  | 'scan_queued'
  | 'scanned'
  | 'qualified'
  | 'outreach_ready'
  | 'contacted'
  | 'dropped';

export const STATUS_META: Record<AccountStatus, {
  label: string;
  color: string;
  bg: string;
  border: string;
  order: number;
}> = {
  new:             { label: 'NEW',            color: '#60a5fa', bg: 'rgba(96,165,250,0.10)', border: 'rgba(96,165,250,0.20)', order: 1 },
  reviewing:       { label: 'REVIEWING',      color: '#fbbf24', bg: 'rgba(251,191,36,0.10)', border: 'rgba(251,191,36,0.20)', order: 2 },
  scan_queued:     { label: 'SCAN QUEUED',    color: '#22d3ee', bg: 'rgba(34,211,238,0.10)', border: 'rgba(34,211,238,0.20)', order: 3 },
  scanned:         { label: 'SCANNED',        color: '#2dd4bf', bg: 'rgba(45,212,191,0.10)', border: 'rgba(45,212,191,0.20)', order: 4 },
  qualified:       { label: 'QUALIFIED',      color: '#34d399', bg: 'rgba(52,211,153,0.10)', border: 'rgba(52,211,153,0.20)', order: 5 },
  outreach_ready:  { label: 'OUTREACH READY', color: '#a78bfa', bg: 'rgba(167,139,250,0.10)', border: 'rgba(167,139,250,0.20)', order: 6 },
  contacted:       { label: 'CONTACTED',      color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.15)', order: 7 },
  dropped:         { label: 'DROPPED',        color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.15)', order: 8 },
};

// ── Decision Dimensions ──────────────────────────────────

export type Attackability = 'now' | 'soon' | 'later' | 'blocked';
export type DealPotential = 'high' | 'medium' | 'low';
export type Conviction = 'very_high' | 'high' | 'moderate' | 'low';
export type SoloFit = 'ideal' | 'good' | 'stretch' | 'hard';
export type Country = 'DE' | 'NL' | 'UK' | 'US';
export type Tier = 1 | 2 | 3;

export const ATTACK_META: Record<Attackability, { label: string; color: string; bg: string }> = {
  now:     { label: 'ATTACK NOW',  color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  soon:    { label: 'SCAN FIRST',  color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  later:   { label: 'HOLD',        color: '#fbbf24', bg: 'rgba(251,191,36,0.10)' },
  blocked: { label: 'BLOCKED',     color: '#f87171', bg: 'rgba(248,113,113,0.10)' },
};

export const CONVICTION_META: Record<Conviction, { label: string; color: string; score: number }> = {
  very_high: { label: 'VERY HIGH', color: '#34d399', score: 4 },
  high:      { label: 'HIGH',      color: '#60a5fa', score: 3 },
  moderate:  { label: 'MODERATE',   color: '#fbbf24', score: 2 },
  low:       { label: 'LOW',       color: '#64748b', score: 1 },
};

// ── Core Entities ────────────────────────────────────────

export type EmailStatus = 'verified' | 'likely_valid' | 'catch_all' | 'guessed' | 'missing' | 'invalid';
export type EmailSource = 'lead_captured' | 'pattern_generated' | 'manual' | 'enrichment';
export type DomainPatternStatus = 'confirmed' | 'likely' | 'guessed' | 'unknown' | 'catch_all';

export interface FinanceLead {
  name: string;
  title: string;
  linkedIn?: string;
  background?: string;
  // Email resolution
  email?: string;
  emailStatus?: EmailStatus;
  emailSource?: EmailSource;
  emailConfidence?: number; // 0-100
  emailPattern?: string; // e.g. "firstname.lastname"
  lastEmailCheckedAt?: string;
}

export interface DomainEmailIntel {
  domain: string;
  pattern?: string; // e.g. "firstname.lastname"
  patternStatus: DomainPatternStatus;
  patternConfidence: number; // 0-100
  confirmedEmails: string[]; // emails known to work on this domain
  hasMx: boolean;
  isCatchAll: boolean;
  lastCheckedAt: string;
}

export const EMAIL_STATUS_META: Record<EmailStatus, { label: string; color: string; gmailAllowed: boolean }> = {
  verified:    { label: 'VERIFIED',    color: '#34d399', gmailAllowed: true },
  likely_valid:{ label: 'LIKELY',      color: '#60a5fa', gmailAllowed: true },
  catch_all:   { label: 'CATCH-ALL',   color: '#f59e0b', gmailAllowed: false },
  guessed:     { label: 'UNVERIFIED',  color: '#64748b', gmailAllowed: false },
  missing:     { label: 'NO EMAIL',    color: '#3a4560', gmailAllowed: false },
  invalid:     { label: 'INVALID',     color: '#f87171', gmailAllowed: false },
};

export interface Signal {
  type: string;
  detail: string;
  source: string;
  date?: string;
  strength: number; // 1-5
}

export interface Hypothesis {
  summary: string;
  whyItMatters: string;
  hiddenExposure: string[];
  proofNeeded: string;
}

export interface ScanResult {
  status: 'pending' | 'complete' | 'failed';
  vendorCount: number;
  vendors: string[];
  exposureLow: number;
  exposureHigh: number;
  currency: 'EUR' | 'USD';
  signals: number;
  summary: string;
  strengthensHypothesis: boolean;
  scannedAt: string;
}

export interface OutreachDraft {
  channel: 'linkedin' | 'email' | 'followup' | 'short';
  subject?: string;
  body: string;
  hook: string;
  status: 'draft' | 'sent' | 'opened' | 'replied';
  sentAt?: string;
}

export type TimelineEventType =
  | 'signal_detected' | 'account_created' | 'scan_started' | 'scan_completed'
  | 'hypothesis_updated' | 'message_prepared' | 'message_sent' | 'response_received'
  | 'meeting_scheduled' | 'account_killed' | 'status_changed' | 'note_added';

export const TIMELINE_META: Record<TimelineEventType, { label: string; color: string }> = {
  signal_detected:    { label: 'Signal detected',    color: '#60a5fa' },
  account_created:    { label: 'Account created',    color: '#94a3b8' },
  scan_started:       { label: 'Scan started',       color: '#22d3ee' },
  scan_completed:     { label: 'Scan completed',     color: '#2dd4bf' },
  hypothesis_updated: { label: 'Hypothesis updated', color: '#fbbf24' },
  message_prepared:   { label: 'Message prepared',   color: '#a78bfa' },
  message_sent:       { label: 'Message sent',       color: '#34d399' },
  response_received:  { label: 'Response received',  color: '#34d399' },
  meeting_scheduled:  { label: 'Meeting scheduled',  color: '#34d399' },
  account_killed:     { label: 'Account killed',     color: '#f87171' },
  status_changed:     { label: 'Status changed',     color: '#94a3b8' },
  note_added:         { label: 'Note added',         color: '#64748b' },
};

export interface TimelineEvent {
  type: TimelineEventType;
  detail: string;
  date: string;
}

export interface ExecutionEntry {
  action: string;
  date: string;
  result?: string;
}

export interface Account {
  id: string;
  company: string;
  domain: string;
  country: Country;
  industry: string;
  employeeRange: string;
  website: string;

  // Pipeline
  status: AccountStatus;
  score: number; // 0-25
  tier: Tier;

  // Decision dimensions
  attackability: Attackability;
  dealPotential: DealPotential;
  conviction: Conviction;
  solofit: SoloFit;

  // Contact
  financeLead: FinanceLead;

  // Intelligence
  signals: Signal[];
  mainSignal: string;
  whyNow: string;
  hypothesis: Hypothesis;
  strengths: string[];
  weaknesses: string[];

  // Scan
  scan?: ScanResult;

  // Outreach
  outreach: OutreachDraft[];

  // Timeline & execution
  timeline: TimelineEvent[];
  executionLog: ExecutionEntry[];
  nextAction: string;
  killReason?: string;

  // Revenue estimate (EUR, rough)
  revenueEstimate: number;

  // Enrichment pipeline state
  enrichmentStatus?: EnrichmentStatus;
  qualityScore?: number;     // 0-100 from quality gate
  thesisStrength?: number;   // 0-85 from thesis engine
  proofLevel?: number;       // 0-85 from proof engine

  // Meta
  createdAt: string;
  updatedAt: string;
}

// ── Filters ──────────────────────────────────────────────

export interface AccountFilters {
  status?: AccountStatus[];
  country?: Country[];
  tier?: Tier[];
  attackability?: Attackability[];
  conviction?: Conviction[];
  search?: string;
}

export type SortField = 'score' | 'company' | 'status' | 'country' | 'attackability' | 'conviction' | 'updatedAt' | 'heat' | 'expectedValue';
export type SortDir = 'asc' | 'desc';

// ── Outreach Engine v2 — Semi-Automatic Precision System ────

// Channel Selection
export type OutreachChannel = 'linkedin' | 'email';
export type ChannelSequence = 'linkedin_first' | 'email_first' | 'linkedin_only' | 'email_only' | 'hold';

export interface ChannelRecommendation {
  primary: OutreachChannel | 'hold';
  secondary?: OutreachChannel;
  sequence: ChannelSequence;
  confidence: number; // 0-100, capped 85
  reasoning: string;
  whyPrimary: string;
  whyNotOthers: string;
}

// Message System
export type MessageType = 'linkedin_note' | 'linkedin_message' | 'linkedin_followup' | 'email_main' | 'email_followup' | 'ultra_short';

export interface MessageVariant {
  id: string;
  type: MessageType;
  channel: OutreachChannel;
  subject?: string;
  body: string;
  wordCount: number;
  version: number;
  status: MessageVariantStatus;
  critique?: CritiqueResult;
  rewriteSummary?: string;
  createdAt: string;
  updatedAt: string;
}

export type MessageVariantStatus = 'draft' | 'critique_done' | 'rewritten' | 'review_needed' | 'ready' | 'approved' | 'sent';

// Enhanced Critique
export interface CritiqueResult {
  isGeneric: boolean;
  isTooLong: boolean;
  soundsAI: boolean;
  exploitsSignal: boolean;
  angleCoherent: boolean;
  tooCommercial: boolean;
  tooAbstract: boolean;
  hasReasonToReply: boolean;
  isInterchangeable: boolean;
  cfoGrade: boolean;
  channelToneMatch: boolean;
  overclaimsEvidence: boolean;
  overallGrade: 'strong' | 'acceptable' | 'weak' | 'rewrite';
  score: number; // 0-12
  issues: string[];
  strengths: string[];
  summary: string;
}

// Outreach Readiness
export type ReadinessStatus = 'ready_to_draft' | 'draft_needs_review' | 'not_ready' | 'ready_to_send' | 'hold' | 'do_not_send';

export interface OutreachReadiness {
  status: ReadinessStatus;
  reasons: string[];
  blockers: string[];
  confidence: number;
}

export const READINESS_META: Record<ReadinessStatus, { label: string; color: string; bg: string }> = {
  ready_to_send:    { label: 'READY TO SEND',    color: '#34d399', bg: 'rgba(52,211,153,0.10)' },
  ready_to_draft:   { label: 'READY TO DRAFT',   color: '#60a5fa', bg: 'rgba(96,165,250,0.10)' },
  draft_needs_review: { label: 'NEEDS REVIEW',   color: '#fbbf24', bg: 'rgba(251,191,36,0.10)' },
  not_ready:        { label: 'NOT READY',         color: '#64748b', bg: 'rgba(100,116,139,0.10)' },
  hold:             { label: 'HOLD',              color: '#f59e0b', bg: 'rgba(245,158,11,0.10)' },
  do_not_send:      { label: 'DO NOT SEND',       color: '#f87171', bg: 'rgba(248,113,113,0.10)' },
};

// LinkedIn Manual State
export type LinkedInStatus = 'not_started' | 'note_ready' | 'connection_sent' | 'connected' | 'message_sent' | 'waiting' | 'replied' | 'no_response' | 'hold';

export interface LinkedInState {
  profileUrl?: string;
  connectionNote?: string;
  message?: string;
  followup?: string;
  status: LinkedInStatus;
  lastActionAt?: string;
}

// Gmail Draft State
export type GmailDraftStatus = 'generating' | 'draft_created' | 'reviewed' | 'approved' | 'sent';

export interface GmailDraftState {
  subject: string;
  body: string;
  to?: string;
  status: GmailDraftStatus;
  createdAt?: string;
  reviewedAt?: string;
  sentAt?: string;
}

// ── Enrichment Pipeline ─────────────────────────────────────

export type EnrichmentStatus =
  | 'pending'
  | 'signals_collected'
  | 'thesis_built'
  | 'proofs_selected'
  | 'quality_checked'
  | 'messages_generated'
  | 'ready_for_review'
  | 'blocked';

export const ENRICHMENT_META: Record<EnrichmentStatus, { label: string; color: string; order: number }> = {
  pending:            { label: 'PENDING',          color: '#64748b', order: 1 },
  signals_collected:  { label: 'SIGNALS',          color: '#22d3ee', order: 2 },
  thesis_built:       { label: 'THESIS',           color: '#60a5fa', order: 3 },
  proofs_selected:    { label: 'PROOFS',           color: '#a78bfa', order: 4 },
  quality_checked:    { label: 'QUALITY GATE',     color: '#fbbf24', order: 5 },
  messages_generated: { label: 'MESSAGES',         color: '#2dd4bf', order: 6 },
  ready_for_review:   { label: 'READY FOR REVIEW', color: '#34d399', order: 7 },
  blocked:            { label: 'BLOCKED',          color: '#f87171', order: 8 },
};

// ── Hot Queue Engine ────────────────────────────────────────

export interface HeatScore {
  total: number; // 0-100
  breakdown: {
    signalFreshness: number;   // 0-15
    signalStrength: number;    // 0-15
    angleQuality: number;      // 0-15
    outreachReadiness: number; // 0-10
    channelClarity: number;    // 0-10
    responseProb: number;      // 0-10
    solofitScore: number;      // 0-10
    expectedValue: number;     // 0-10
    proofLevel: number;        // 0-5
  };
}

export type QueueTier = 'hot' | 'warm' | 'cold' | 'hold' | 'killed';

export const QUEUE_TIER_META: Record<QueueTier, { label: string; color: string; bg: string }> = {
  hot:    { label: 'HOT',    color: '#ef4444', bg: 'rgba(239,68,68,0.10)' },
  warm:   { label: 'WARM',   color: '#f59e0b', bg: 'rgba(245,158,11,0.10)' },
  cold:   { label: 'COLD',   color: '#64748b', bg: 'rgba(100,116,139,0.10)' },
  hold:   { label: 'HOLD',   color: '#3b82f6', bg: 'rgba(59,130,246,0.10)' },
  killed: { label: 'KILLED', color: '#475569', bg: 'rgba(71,85,105,0.08)' },
};

// ── Outreach Ledger — Contact Safety ────────────────────────

export interface LedgerEntry {
  id: string;
  accountId: string;
  contactName: string;
  channel: OutreachChannel;
  messageType: MessageType;
  messageFingerprint: string;
  status: LedgerStatus;
  draftCreatedAt?: string;
  sentAt?: string;
  cooldownUntil?: string;
  locked: boolean;
  superseded: boolean;
}

export type LedgerStatus = 'draft_created' | 'approved' | 'sent' | 'waiting_response' | 'replied' | 'no_response' | 'bounced';

export interface ContactLock {
  accountId: string;
  contactName: string;
  channel: OutreachChannel;
  lockedAt: string;
  reason: string;
  expiresAt?: string;
}

// Cooldown: 72h after send, 168h (7d) after no_response
export const COOLDOWN_HOURS: Record<string, number> = {
  after_send: 72,
  after_no_response: 168,
  after_bounce: 720, // 30 days
};

// ── Computed Outreach State (per account) ───────────────────

export interface AccountOutreachState {
  channelRec: ChannelRecommendation;
  readiness: OutreachReadiness;
  heat: HeatScore;
  queueTier: QueueTier;
  messages: MessageVariant[];
  linkedIn: LinkedInState;
  gmail: GmailDraftState | null;
  ledgerEntries: LedgerEntry[];
  locks: ContactLock[];
  isLocked: boolean;
  inCooldown: boolean;
  cooldownUntil?: string;
  duplicateRisk: boolean;
  waitingResponse: boolean;
}
