/**
 * GHOST TAX — MESSAGE ENGINE + CRITIC + REWRITER
 *
 * Generates CFO-grade outreach messages from angle + signal data.
 * Then critiques them. Then rewrites to fix issues.
 *
 * Pipeline: Angle → Draft → Critique → Rewrite → Final
 *
 * NOT a template engine. Each message is built from account-specific
 * observations, CFO tensions, and financial readings.
 */

import type {
  Account, MessageVariant, MessageType, CritiqueResult,
  OutreachChannel,
} from '@/types/command';
import type { SelectedAngle } from './angles';

// ── Message Generation ──────────────────────────────────────

interface MessageContext {
  account: Account;
  angle: SelectedAngle;
  channel: OutreachChannel;
}

function uid(): string {
  return `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function wordCount(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

const now = () => new Date().toISOString();

// Build observation line from strongest signal
function buildObservation(a: Account): string {
  const s = a.signals[0];
  if (!s) return `${a.company} is in a phase that often creates hidden cost exposure.`;

  const detail = s.detail.length > 120 ? s.detail.slice(0, 117) + '...' : s.detail;

  switch (s.type) {
    case 'hiring':
      return `${a.company} is hiring ${detail.includes('VP') || detail.includes('Director') ? 'a senior finance role' : 'in finance'}. That usually signals the current structure is stretched.`;
    case 'executive':
      return `Congratulations on the ${a.financeLead.title} role at ${a.company}.`;
    case 'restructuring':
      return `${a.company} has been through a significant restructuring. One line that rarely auto-adjusts after downsizing: software licenses.`;
    case 'M&A':
      return `${a.company}'s merger means two complete tech stacks running in parallel — and two complete cost structures.`;
    case 'funding':
      return `With ${detail.includes('€') || detail.includes('$') ? detail.split(',')[0] : 'recent funding'}, ${a.company} is scaling fast. Software costs tend to scale faster.`;
    case 'growth':
      return `${a.company}'s growth trajectory means tools are being signed faster than reviewed.`;
    case 'expansion':
      return `Expanding to new markets adds a second layer of compliance, cloud, and operational tools. That transition typically adds 20-30% to the SaaS stack.`;
    case 'regulatory':
      return `Under regulatory scrutiny, every unaccounted cost weakens the credibility of the finance function.`;
    case 'transformation':
      return `During transformation, internal tooling evolves faster than the controls around it.`;
    default:
      return `${a.company} is in a phase where software costs tend to drift without visibility.`;
  }
}

// Build financial reading from angle
function buildFinancialReading(ctx: MessageContext): string {
  const { angle, account } = ctx;
  const reading = angle.primary.financialReading;

  // Make it specific with numbers when possible
  if (account.scan?.strengthensHypothesis) {
    const { exposureLow, exposureHigh, currency } = account.scan;
    const fmt = (n: number) => n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`;
    return `A scan shows ${account.scan.vendorCount} vendors and ${fmt(exposureLow)}-${fmt(exposureHigh)} ${currency} in estimated exposure. ${reading.split('.')[0]}.`;
  }

  return reading;
}

// Build the core message body
function buildMessageBody(ctx: MessageContext, type: MessageType): string {
  const { account, angle, channel } = ctx;
  const firstName = account.financeLead.name.split(' ')[0];
  const obs = buildObservation(account);
  const reading = buildFinancialReading(ctx);

  switch (type) {
    case 'linkedin_note': {
      // Max 300 chars for LinkedIn connection note
      const note = `${firstName} — ${obs.split('.')[0]}. I run financial exposure scans for ${account.industry.toLowerCase().includes('fintech') ? 'fintech' : 'B2B tech'} companies. Would a quick diagnostic be useful?`;
      return note.length > 290 ? note.slice(0, 287) + '...' : note;
    }

    case 'linkedin_message':
      return `${firstName},\n\n${obs}\n\n${reading.split('.').slice(0, 2).join('.')}.\n\nI run financial exposure scans for companies in your exact phase. 48h, no call needed. Would it be useful?\n\n— Edith`;

    case 'linkedin_followup':
      return `${firstName} — quick follow-up on the exposure scan.\n\n${angle.primary.financialReading.split('.')[0]}. For a ${account.employeeRange}-person company, that typically means ${account.scan ? `${Math.round(account.scan.exposureLow / 1000)}k-${Math.round(account.scan.exposureHigh / 1000)}k ${account.scan.currency}` : '12-20% of annual software costs'}.\n\nHappy to share what a scan surfaces. No commitment.\n\n— Edith`;

    case 'email_main': {
      const subject = buildEmailSubject(ctx);
      return `${firstName},\n\n${obs}\n\n${reading}\n\nI specialize in detecting this kind of hidden financial exposure in SaaS, cloud, and software spend.${account.scan?.strengthensHypothesis ? ` A preliminary scan of ${account.domain} confirms the pattern.` : ''}\n\nNo call needed. I can deliver a structured diagnostic in 48h. If the numbers are meaningful, we talk. If not, you've lost nothing.\n\nEdith\nGhost Tax — ghost-tax.com`;
    }

    case 'email_followup': {
      return `${firstName} — following up.\n\n${angle.primary.financialReading.split('.')[0]}. In companies at ${account.company}'s stage, this typically represents ${account.scan ? `${Math.round(account.scan.exposureLow / 1000)}k-${Math.round(account.scan.exposureHigh / 1000)}k ${account.scan.currency}/year` : '12-20% of annual software spend'}.\n\nA 48h scan would tell you if ${account.company} is in that range.\n\n— Edith`;
    }

    case 'ultra_short':
      return `${firstName} — ${obs.split('.')[0].replace(account.company, '').replace(/^\s*is\s*/i, '').trim()}. Would a 48h exposure scan be useful? ghost-tax.com`;

    default:
      return '';
  }
}

function buildEmailSubject(ctx: MessageContext): string {
  const { account, angle } = ctx;
  const firstName = account.financeLead.name.split(' ')[0];

  switch (angle.primary.type) {
    case 'finance_hiring_gap':
      return `${account.company} — VP Finance hire + a head start`;
    case 'new_cfo_audit':
      return `${firstName} — 90-day diagnostic shortcut`;
    case 'post_restructuring_zombies':
      return `Post-restructuring — the cost line that doesn't auto-adjust`;
    case 'post_merger_duplication':
      return `${account.company} — quantifying post-merger stack overlap`;
    case 'scale_cost_drift':
      return `${account.company} — software costs growing faster than revenue?`;
    case 'scan_confirmed_exposure':
      return `${account.company} — scan results ready`;
    case 'regulatory_cost_pressure':
      return `Cost discipline evidence — ${account.company}`;
    case 'expansion_stack_split':
      return `${account.company} — multi-market cost duplication`;
    case 'ironic_self_audit':
      return `Honest question for ${account.company}'s finance team`;
    default:
      return `${account.company} — hidden cost exposure`;
  }
}

// ── Generate All Message Variants ───────────────────────────

export function generateMessages(account: Account, angle: SelectedAngle, channel: OutreachChannel): MessageVariant[] {
  const ctx: MessageContext = { account, angle, channel };
  const variants: MessageVariant[] = [];

  const types: { type: MessageType; ch: OutreachChannel }[] =
    channel === 'linkedin'
      ? [
          { type: 'linkedin_note', ch: 'linkedin' },
          { type: 'linkedin_message', ch: 'linkedin' },
          { type: 'linkedin_followup', ch: 'linkedin' },
          { type: 'ultra_short', ch: 'linkedin' },
        ]
      : [
          { type: 'email_main', ch: 'email' },
          { type: 'email_followup', ch: 'email' },
          { type: 'ultra_short', ch: 'email' },
        ];

  for (const { type, ch } of types) {
    const body = buildMessageBody({ ...ctx, channel: ch }, type);
    const subject = type === 'email_main' ? buildEmailSubject({ ...ctx, channel: ch }) :
                    type === 'email_followup' ? `Re: ${buildEmailSubject({ ...ctx, channel: ch })}` : undefined;

    variants.push({
      id: uid(),
      type,
      channel: ch,
      subject,
      body,
      wordCount: wordCount(body),
      version: 1,
      status: 'draft',
      createdAt: now(),
      updatedAt: now(),
    });
  }

  return variants;
}

// ── Critic Engine ───────────────────────────────────────────

const GENERIC_PHRASES = [
  'we help companies', 'hope you are well', 'hope you\'re well',
  'i wanted to reach out', 'touching base', 'just checking in',
  'save money', 'reduce costs', 'best practices', 'industry leader',
  'synergize', 'leverage our', 'circle back', 'game-changing',
  'revolutionary', 'incredible opportunity',
];

const SALESY_PHRASES = [
  'amazing', 'incredible', 'game-changing', 'revolutionary',
  'exclusive offer', 'limited time', 'act now', 'don\'t miss',
  'guaranteed', 'risk-free', 'no-brainer', 'once-in-a-lifetime',
];

const AI_PATTERNS = [
  'i\'d be happy to', 'i would be delighted', 'please don\'t hesitate',
  'at your earliest convenience', 'i trust this finds you well',
  'in today\'s rapidly evolving', 'in the ever-changing landscape',
  'it is worth noting that', 'it goes without saying',
  'needless to say', 'at the end of the day',
];

const WORD_LIMITS: Record<MessageType, number> = {
  linkedin_note: 45,
  linkedin_message: 120,
  linkedin_followup: 80,
  email_main: 180,
  email_followup: 100,
  ultra_short: 35,
};

export function critiqueMessage(
  message: MessageVariant,
  account: Account,
  angle: SelectedAngle,
): CritiqueResult {
  const body = message.body.toLowerCase();
  const wc = message.wordCount;
  const limit = WORD_LIMITS[message.type] || 150;
  const issues: string[] = [];
  const strengths: string[] = [];

  // 1. Generic check
  const isGeneric = GENERIC_PHRASES.some(p => body.includes(p));
  if (isGeneric) issues.push('Contains generic phrases — rewrite to be specific.');
  else strengths.push('No generic filler detected.');

  // 2. Length check
  const isTooLong = wc > limit;
  if (isTooLong) issues.push(`Too long: ${wc} words (limit: ${limit} for ${message.type}).`);
  else strengths.push(`Good length: ${wc}/${limit} words.`);

  // 3. AI-sounding check
  const soundsAI = AI_PATTERNS.some(p => body.includes(p));
  if (soundsAI) issues.push('Contains AI-typical phrasing. Sounds machine-generated.');
  else strengths.push('Doesn\'t sound AI-generated.');

  // 4. Signal exploitation
  const mainWords = account.mainSignal.toLowerCase().split(/\s+/).filter(w => w.length > 4);
  const exploitsSignal = mainWords.some(w => body.includes(w));
  if (!exploitsSignal) issues.push('Doesn\'t reference the main signal. The angle is disconnected from intelligence.');
  else strengths.push('References main signal directly.');

  // 5. Angle coherence
  const angleWords = angle.primary.label.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const angleCoherent = angleWords.some(w => body.includes(w)) || exploitsSignal;
  if (!angleCoherent) issues.push('Angle not reflected in message body.');

  // 6. Too commercial
  const tooCommercial = SALESY_PHRASES.some(p => body.includes(p));
  if (tooCommercial) issues.push('Too salesy. Remove marketing language.');
  else strengths.push('Tone is professional, not salesy.');

  // 7. Too abstract
  const hasNumbers = /\d/.test(message.body);
  const hasCompanyName = body.includes(account.company.toLowerCase());
  const tooAbstract = !hasNumbers && !hasCompanyName;
  if (tooAbstract) issues.push('Too abstract — no numbers, no company name. Add specifics.');

  // 8. Reason to reply
  const hasQuestion = message.body.includes('?');
  const hasReasonToReply = hasQuestion;
  if (!hasReasonToReply) issues.push('No question or reason to reply. CFO will skip.');
  else strengths.push('Ends with clear question — gives reason to reply.');

  // 9. Interchangeable test
  const firstName = account.financeLead.name.split(' ')[0].toLowerCase();
  const hasFirstName = body.includes(firstName);
  const isInterchangeable = !hasFirstName && !hasCompanyName;
  if (isInterchangeable) issues.push('Message could be sent to anyone. Not specific enough.');

  // 10. CFO grade
  const cfoGrade = !tooCommercial && !isGeneric && !soundsAI && (wc <= limit * 1.2);
  if (cfoGrade) strengths.push('Tone is CFO-appropriate.');
  else if (!cfoGrade) issues.push('Tone not CFO-grade. Too informal, too long, or too salesy.');

  // 11. Channel-tone match
  const channelToneMatch = (message.channel === 'linkedin' && wc <= 150) ||
                           (message.channel === 'email' && wc <= 200);
  if (!channelToneMatch && wc > 200) issues.push(`Too long for ${message.channel}. Shorten.`);

  // 12. Overclaims evidence
  const overclaimPatterns = ['guaranteed', 'certain', 'proven', 'always', 'never fails', '100%'];
  const overclaimsEvidence = overclaimPatterns.some(p => body.includes(p));
  if (overclaimsEvidence) issues.push('Overclaims evidence. Ghost Tax doctrine: ranges, not certainties.');

  // Score & grade
  const checks = [
    !isGeneric, !isTooLong, !soundsAI, exploitsSignal, angleCoherent,
    !tooCommercial, !tooAbstract, hasReasonToReply, !isInterchangeable,
    cfoGrade, channelToneMatch, !overclaimsEvidence,
  ];
  const score = checks.filter(Boolean).length;
  const overallGrade: CritiqueResult['overallGrade'] =
    score >= 10 ? 'strong' : score >= 8 ? 'acceptable' : score >= 6 ? 'weak' : 'rewrite';

  // Summary
  const summary = score >= 10
    ? 'Message is strong. Specific, concise, CFO-appropriate. Ready for review.'
    : score >= 8
    ? `Acceptable with ${issues.length} minor issue${issues.length > 1 ? 's' : ''}. Review before sending.`
    : score >= 6
    ? `Weak — ${issues.length} issues found. Rewrite recommended before review.`
    : `Needs full rewrite. ${issues.length} significant issues.`;

  return {
    isGeneric, isTooLong, soundsAI, exploitsSignal, angleCoherent,
    tooCommercial, tooAbstract, hasReasonToReply, isInterchangeable,
    cfoGrade, channelToneMatch, overclaimsEvidence,
    overallGrade, score, issues, strengths, summary,
  };
}

// ── Rewriter Engine ─────────────────────────────────────────

export function rewriteMessage(
  message: MessageVariant,
  critique: CritiqueResult,
  account: Account,
  angle: SelectedAngle,
): MessageVariant {
  let body = message.body;
  const changes: string[] = [];

  // 1. Remove generic phrases
  if (critique.isGeneric) {
    for (const phrase of GENERIC_PHRASES) {
      const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      if (regex.test(body)) {
        body = body.replace(regex, '').replace(/\s{2,}/g, ' ').trim();
        changes.push('Removed generic phrasing.');
      }
    }
  }

  // 2. Remove AI patterns
  if (critique.soundsAI) {
    for (const phrase of AI_PATTERNS) {
      const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      if (regex.test(body)) {
        body = body.replace(regex, '').replace(/\s{2,}/g, ' ').trim();
        changes.push('Removed AI-sounding phrasing.');
      }
    }
  }

  // 3. Remove salesy language
  if (critique.tooCommercial) {
    for (const phrase of SALESY_PHRASES) {
      const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      if (regex.test(body)) {
        body = body.replace(regex, '').replace(/\s{2,}/g, ' ').trim();
        changes.push('Removed sales language.');
      }
    }
  }

  // 4. Inject signal reference if missing
  if (!critique.exploitsSignal) {
    const signalRef = account.signals[0]?.detail.split(',')[0] || account.mainSignal.split('.')[0];
    // Insert after first line
    const lines = body.split('\n');
    if (lines.length > 2) {
      lines.splice(2, 0, `\nI noticed ${signalRef.toLowerCase()}.`);
      body = lines.join('\n');
      changes.push('Added signal reference.');
    }
  }

  // 5. Add question if missing
  if (!critique.hasReasonToReply && !body.includes('?')) {
    body = body.replace(/\n\n— Edith/, '\n\nWould a quick diagnostic be useful?\n\n— Edith');
    changes.push('Added closing question.');
  }

  // 6. Trim if too long
  if (critique.isTooLong) {
    const limit = WORD_LIMITS[message.type] || 150;
    const words = body.split(/\s+/);
    if (words.length > limit * 1.3) {
      // Remove middle paragraph (usually the weakest)
      const paras = body.split('\n\n');
      if (paras.length > 3) {
        const midIndex = Math.floor(paras.length / 2);
        paras.splice(midIndex, 1);
        body = paras.join('\n\n');
        changes.push('Removed weakest middle paragraph for brevity.');
      }
    }
  }

  // Clean up any double spaces or empty lines
  body = body.replace(/\n{3,}/g, '\n\n').replace(/  +/g, ' ').trim();

  const rewriteSummary = changes.length > 0
    ? `Rewrite applied: ${changes.join(' ')}`
    : 'No automated fixes applied. Manual review recommended.';

  return {
    ...message,
    body,
    wordCount: wordCount(body),
    version: message.version + 1,
    status: changes.length > 0 ? 'rewritten' : 'review_needed',
    rewriteSummary,
    updatedAt: now(),
  };
}

// ── Full Pipeline: Generate → Critique → Rewrite ────────────

export function processMessages(
  account: Account,
  angle: SelectedAngle,
  channel: OutreachChannel,
): MessageVariant[] {
  // 1. Generate drafts
  const drafts = generateMessages(account, angle, channel);

  // 2. Critique each
  const critiqued = drafts.map(msg => {
    const critique = critiqueMessage(msg, account, angle);
    return { ...msg, critique, status: 'critique_done' as const };
  });

  // 3. Rewrite weak/rewrite ones
  const final = critiqued.map(msg => {
    if (msg.critique && (msg.critique.overallGrade === 'weak' || msg.critique.overallGrade === 'rewrite')) {
      const rewritten = rewriteMessage(msg, msg.critique, account, angle);
      // Re-critique after rewrite
      const newCritique = critiqueMessage(rewritten, account, angle);
      return { ...rewritten, critique: newCritique };
    }
    // Mark acceptable/strong as review_needed (human must still validate)
    return { ...msg, status: msg.critique?.overallGrade === 'strong' ? 'ready' as const : 'review_needed' as const };
  });

  return final;
}

// ── Export subject builder for Gmail integration ─────────────

export { buildEmailSubject };
