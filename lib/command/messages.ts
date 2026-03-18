/**
 * GHOST TAX — MESSAGE ENGINE + CRITIC + REWRITER
 *
 * Generates CFO-grade outreach messages from the COMPLETE dossier:
 *   - Thesis (L4): the "why now" and CFO pain
 *   - Proofs (L5-L7): specific evidence statements
 *   - Angle: the outreach framing
 *   - Account: company + contact specifics
 *
 * Pipeline: Dossier → Draft → Critique → Rewrite → Final
 *
 * NOT a template engine. Each message is built from thesis-derived
 * observations, proof-backed evidence, and CFO-specific tensions.
 *
 * Backward compatible: works with or without thesis/proofs.
 * When thesis is provided, messages are significantly more specific.
 */

import type {
  Account, MessageVariant, MessageType, CritiqueResult,
  OutreachChannel,
} from '@/types/command';
import type { SelectedAngle } from './angles';
import type { ThesisResult } from './thesis-engine';
import type { ProofSelection, Proof } from './proof-engine';

// ── Message Generation ──────────────────────────────────────

interface MessageContext {
  account: Account;
  angle: SelectedAngle;
  channel: OutreachChannel;
  thesis?: ThesisResult;
  proofs?: ProofSelection;
}

function uid(): string {
  return `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function wordCount(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

const now = () => new Date().toISOString();

// ── Observation Builder (thesis-aware) ──────────────────────

function buildObservation(ctx: MessageContext): string {
  const { account, thesis } = ctx;

  // If thesis available, use L3 account reading (specific, evidence-backed)
  if (thesis?.l3) {
    const reading = thesis.l3.whatIsChanging;
    // Trim to 1 sentence if too long
    const firstSentence = reading.split('.')[0] + '.';
    if (firstSentence.length > 15) return firstSentence;
  }

  // If thesis L4 has a proofHook, use it as opener context
  if (thesis?.l4?.proofHook && thesis.l4.strengthScore >= 50) {
    return `${thesis.l4.proofHook.split('.')[0]}.`;
  }

  // Fallback: old behavior (signal[0] based)
  const s = account.signals[0];
  if (!s) return `${account.company} is in a phase that often creates hidden cost exposure.`;

  switch (s.type) {
    case 'hiring':
      return `${account.company} is hiring ${s.detail.includes('VP') || s.detail.includes('Director') ? 'a senior finance role' : 'in finance'}. That usually signals the current structure is stretched.`;
    case 'executive':
      return `Congratulations on the ${account.financeLead.title} role at ${account.company}.`;
    case 'restructuring':
      return `${account.company} has been through a significant restructuring. One line that rarely auto-adjusts after downsizing: software licenses.`;
    case 'M&A':
      return `${account.company}'s merger means two complete tech stacks running in parallel — and two complete cost structures.`;
    case 'funding':
      return `With ${s.detail.includes('€') || s.detail.includes('$') ? s.detail.split(',')[0] : 'recent funding'}, ${account.company} is scaling fast. Software costs tend to scale faster.`;
    case 'growth':
      return `${account.company}'s growth trajectory means tools are being signed faster than reviewed.`;
    case 'expansion':
      return `Expanding to new markets adds a second layer of compliance, cloud, and operational tools. That transition typically adds 20-30% to the SaaS stack.`;
    case 'regulatory':
      return `Under regulatory scrutiny, every unaccounted cost weakens the credibility of the finance function.`;
    case 'transformation':
      return `During transformation, internal tooling evolves faster than the controls around it.`;
    default:
      return `${account.company} is in a phase where software costs tend to drift without visibility.`;
  }
}

// ── Financial Reading Builder (thesis-aware) ─────────────────

function buildFinancialReading(ctx: MessageContext): string {
  const { account, thesis, angle } = ctx;

  // If thesis has a specific financial reading, use it
  if (thesis?.l4?.financialReading && thesis.l4.strengthScore >= 40) {
    return thesis.l4.financialReading;
  }

  // Fallback: scan data or generic angle reading
  if (account.scan?.strengthensHypothesis) {
    const { exposureLow, exposureHigh, currency, vendorCount } = account.scan;
    const fmt = (n: number) => n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`;
    return `A scan shows ${vendorCount} vendors and ${fmt(exposureLow)}-${fmt(exposureHigh)} ${currency} in estimated exposure. ${angle.primary.financialReading.split('.')[0]}.`;
  }

  return angle.primary.financialReading;
}

// ── Proof Line Builder ──────────────────────────────────────

function buildProofLine(ctx: MessageContext): string {
  const { proofs, account } = ctx;

  if (!proofs || proofs.selected.length === 0) {
    // Fallback: no proofs, use scan or nothing
    if (account.scan?.strengthensHypothesis) {
      return `A preliminary scan of ${account.domain} confirms the pattern.`;
    }
    return '';
  }

  // Pick the best proof (highest specificity + observed)
  const best = proofs.selected.find(p => p.specificity === 'high' && p.evidenceClass === 'observed')
    || proofs.selected.find(p => p.specificity === 'high')
    || proofs.selected[0];

  // Short version for messages
  const statement = best.statement.length > 120
    ? best.statement.slice(0, 117) + '...'
    : best.statement;

  return statement;
}

// ── Why Now Builder (thesis-aware) ──────────────────────────

function buildWhyNow(ctx: MessageContext): string {
  const { thesis, account, angle } = ctx;

  if (thesis?.l4?.whyNow && thesis.l4.strengthScore >= 50) {
    // Use thesis why now, trimmed to 2 sentences max
    const sentences = thesis.l4.whyNow.split('. ').slice(0, 2);
    return sentences.join('. ') + (sentences.length > 0 && !sentences[sentences.length - 1].endsWith('.') ? '.' : '');
  }

  // Fallback: timing from L3
  if (thesis?.l3?.timingWindow) {
    return `${thesis.l3.whatIsChanging.split('.')[0]}. Window: ${thesis.l3.timingWindow}.`;
  }

  return angle.primary.cfoTension;
}

// ── Locale Detection ────────────────────────────────────────
// RULE: Always localize by prospect country. DE→German formal. FR→French. EN default.
// RULE: "Ghost Tax" is a BRAND NAME — NEVER translate it.

type MessageLocale = 'en' | 'de' | 'fr';

function detectLocale(country: string): MessageLocale {
  const c = country?.toUpperCase();
  if (c === 'DE' || c === 'AT' || c === 'CH') return 'de';
  if (c === 'FR' || c === 'BE') return 'fr';
  return 'en';
}

// Localized strings — Ghost Tax is NEVER translated
const L = {
  en: {
    iRun: 'I run financial exposure scans for',
    wouldDiag: 'Would a quick diagnostic be useful?',
    companies: 'companies',
    noCall: 'No call needed. I can deliver a structured diagnostic in 48h. If the numbers are meaningful, we talk. If not, you\'ve lost nothing.',
    specialize: 'I specialize in detecting this kind of hidden financial exposure in SaaS, cloud, and software spend.',
    followUp: 'quick follow-up on the exposure scan.',
    forCompany: 'For a',
    personCompany: '-person company, that typically means',
    happy: 'Happy to share what a scan surfaces. No commitment.',
    followingUp: 'following up.',
    inCompanies: 'In companies at',
    stage: '\'s stage, this typically represents',
    scan48: 'A 48h scan would tell you if',
    inRange: 'is in that range.',
    wouldScan: 'Would a 48h exposure scan be useful?',
    annualSw: 'of annual software costs',
    annualSpend: 'of annual software spend',
    iRunPhase: 'I run financial exposure scans for companies in your exact phase. 48h, no call needed. Would it be useful?',
  },
  de: {
    iRun: 'Ich führe Finanzexpositionsanalysen durch für',
    wouldDiag: 'Wäre eine kurze Diagnostik nützlich?',
    companies: 'Unternehmen',
    noCall: 'Kein Anruf nötig. Ich liefere eine strukturierte Diagnostik in 48h. Wenn die Zahlen relevant sind, sprechen wir. Wenn nicht, haben Sie nichts verloren.',
    specialize: 'Ich bin spezialisiert auf die Erkennung versteckter Finanzexposition in SaaS-, Cloud- und Softwareausgaben.',
    followUp: 'kurzes Follow-up zur Expositionsanalyse.',
    forCompany: 'Für ein',
    personCompany: '-Personen-Unternehmen bedeutet das typischerweise',
    happy: 'Gerne teile ich, was eine Analyse aufdeckt. Keine Verpflichtung.',
    followingUp: 'kurzes Follow-up.',
    inCompanies: 'Bei Unternehmen in der Phase von',
    stage: ' entspricht das typischerweise',
    scan48: 'Eine 48h-Analyse würde zeigen, ob',
    inRange: 'in diesem Bereich liegt.',
    wouldScan: 'Wäre eine 48h-Expositionsanalyse nützlich?',
    annualSw: 'der jährlichen Softwarekosten',
    annualSpend: 'der jährlichen Softwareausgaben',
    iRunPhase: 'Ich führe Finanzexpositionsanalysen für Unternehmen in Ihrer exakten Phase durch. 48h, kein Anruf nötig. Wäre das nützlich?',
  },
  fr: {
    iRun: 'Je réalise des analyses d\'exposition financière pour les',
    wouldDiag: 'Un diagnostic rapide serait-il utile ?',
    companies: 'entreprises',
    noCall: 'Pas d\'appel nécessaire. Je peux livrer un diagnostic structuré en 48h. Si les chiffres sont significatifs, nous en parlons. Sinon, vous n\'avez rien perdu.',
    specialize: 'Je suis spécialisée dans la détection d\'exposition financière cachée dans les dépenses SaaS, cloud et logiciels.',
    followUp: 'suivi rapide concernant l\'analyse d\'exposition.',
    forCompany: 'Pour une entreprise de',
    personCompany: ' personnes, cela représente typiquement',
    happy: 'Je serais ravie de partager ce qu\'une analyse révèle. Sans engagement.',
    followingUp: 'suivi rapide.',
    inCompanies: 'Dans les entreprises au stade de',
    stage: ', cela représente typiquement',
    scan48: 'Une analyse de 48h montrerait si',
    inRange: 'se situe dans cette fourchette.',
    wouldScan: 'Une analyse d\'exposition en 48h serait-elle utile ?',
    annualSw: 'des coûts logiciels annuels',
    annualSpend: 'des dépenses logicielles annuelles',
    iRunPhase: 'Je réalise des analyses d\'exposition financière pour les entreprises dans votre phase exacte. 48h, pas d\'appel nécessaire. Cela serait-il utile ?',
  },
};

// ── Core Message Body Builder ───────────────────────────────

function buildMessageBody(ctx: MessageContext, type: MessageType): string {
  const { account, angle } = ctx;
  const firstName = account.financeLead.name.split(' ')[0];
  const obs = buildObservation(ctx);
  const reading = buildFinancialReading(ctx);
  const proof = buildProofLine(ctx);
  const locale = detectLocale(account.country);
  const t = L[locale];

  switch (type) {
    case 'linkedin_note': {
      const hook = ctx.thesis?.l4?.cfoPain
        ? ctx.thesis.l4.cfoPain.split('.')[0]
        : obs.split('.')[0];
      const industry = account.industry.toLowerCase().includes('fintech') ? 'fintech' : 'B2B tech';
      const note = `${firstName} — ${hook}. ${t.iRun} ${industry} ${t.companies}. ${t.wouldDiag}`;
      return note.length > 290 ? note.slice(0, 287) + '...' : note;
    }

    case 'linkedin_message': {
      const parts = [`${firstName},`, '', obs];
      if (proof) parts.push('', proof);
      parts.push('', reading.split('.').slice(0, 2).join('.') + '.');
      parts.push('', t.iRunPhase);
      parts.push('', '— Hélène');
      return parts.join('\n');
    }

    case 'linkedin_followup': {
      const followupReading = ctx.thesis?.l4?.financialReading
        ? ctx.thesis.l4.financialReading.split('.')[0]
        : angle.primary.financialReading.split('.')[0];

      const exposure = account.scan
        ? `${Math.round(account.scan.exposureLow / 1000)}k-${Math.round(account.scan.exposureHigh / 1000)}k ${account.scan.currency}`
        : `12-20% ${t.annualSw}`;

      return `${firstName} — ${t.followUp}\n\n${followupReading}. ${t.forCompany} ${account.employeeRange}${t.personCompany} ${exposure}.\n\n${t.happy}\n\n— Hélène`;
    }

    case 'email_main': {
      const parts = [`${firstName},`, '', obs];
      if (proof) parts.push('', proof);
      parts.push('', reading);
      parts.push('', t.specialize);
      parts.push('', t.noCall);
      // Signature — Ghost Tax is NEVER translated
      parts.push('', 'Hélène', 'Ghost Tax — ghost-tax.com');
      return parts.join('\n');
    }

    case 'email_followup': {
      const followupReading = ctx.thesis?.l4?.financialReading
        ? ctx.thesis.l4.financialReading.split('.')[0]
        : angle.primary.financialReading.split('.')[0];

      const exposure = account.scan
        ? `${Math.round(account.scan.exposureLow / 1000)}k-${Math.round(account.scan.exposureHigh / 1000)}k ${account.scan.currency}/year`
        : `12-20% ${t.annualSpend}`;

      return `${firstName} — ${t.followingUp}\n\n${followupReading}. ${t.inCompanies} ${account.company}${t.stage} ${exposure}.\n\n${t.scan48} ${account.company} ${t.inRange}\n\n— Hélène`;
    }

    case 'ultra_short': {
      const hook = ctx.thesis?.l4?.cfoPain
        ? ctx.thesis.l4.cfoPain.split('.')[0].replace(account.company, '').replace(/^\s*/, '').trim()
        : obs.split('.')[0].replace(account.company, '').replace(/^\s*is\s*/i, '').trim();
      return `${firstName} — ${hook}. ${t.wouldScan} ghost-tax.com`;
    }

    default:
      return '';
  }
}

function buildEmailSubject(ctx: MessageContext): string {
  const { account, angle, thesis } = ctx;
  const firstName = account.financeLead.name.split(' ')[0];

  // If thesis has strong timing urgency, reflect it in subject
  if (thesis?.l3?.windowUrgency === 'closing' && thesis.l4.strengthScore >= 60) {
    switch (angle.primary.type) {
      case 'new_cfo_audit':
        return `${firstName} — your 90-day window is open`;
      case 'post_restructuring_zombies':
        return `${account.company} — contracts auto-renew in ${thesis.l3.timingWindow.includes('60') ? '60' : '90'} days`;
      case 'finance_hiring_gap':
        return `${account.company} — baseline before your new hire starts`;
    }
  }

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

/**
 * Generate messages from complete dossier (thesis + proofs).
 * Backward compatible: thesis and proofs are optional.
 */
export function generateMessages(
  account: Account,
  angle: SelectedAngle,
  channel: OutreachChannel,
  thesis?: ThesisResult,
  proofs?: ProofSelection,
): MessageVariant[] {
  const ctx: MessageContext = { account, angle, channel, thesis, proofs };
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
    const lines = body.split('\n');
    if (lines.length > 2) {
      lines.splice(2, 0, `\nI noticed ${signalRef.toLowerCase()}.`);
      body = lines.join('\n');
      changes.push('Added signal reference.');
    }
  }

  // 5. Add question if missing
  if (!critique.hasReasonToReply && !body.includes('?')) {
    body = body.replace(/\n\n— Hélène/, '\n\nWould a quick diagnostic be useful?\n\n— Hélène');
    if (!body.includes('?')) {
      body = body.replace(/\n\n— Edith/, '\n\nWould a quick diagnostic be useful?\n\n— Edith');
    }
    changes.push('Added closing question.');
  }

  // 6. Trim if too long
  if (critique.isTooLong) {
    const limit = WORD_LIMITS[message.type] || 150;
    const words = body.split(/\s+/);
    if (words.length > limit * 1.3) {
      const paras = body.split('\n\n');
      if (paras.length > 3) {
        const midIndex = Math.floor(paras.length / 2);
        paras.splice(midIndex, 1);
        body = paras.join('\n\n');
        changes.push('Removed weakest middle paragraph for brevity.');
      }
    }
  }

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

/**
 * Complete message pipeline with thesis + proofs support.
 * Backward compatible: works without thesis/proofs.
 */
export function processMessages(
  account: Account,
  angle: SelectedAngle,
  channel: OutreachChannel,
  thesis?: ThesisResult,
  proofs?: ProofSelection,
): MessageVariant[] {
  // 1. Generate drafts (thesis-aware)
  const drafts = generateMessages(account, angle, channel, thesis, proofs);

  // 2. Critique each
  const critiqued = drafts.map(msg => {
    const critique = critiqueMessage(msg, account, angle);
    return { ...msg, critique, status: 'critique_done' as const };
  });

  // 3. Rewrite weak/rewrite ones
  const final = critiqued.map(msg => {
    if (msg.critique && (msg.critique.overallGrade === 'weak' || msg.critique.overallGrade === 'rewrite')) {
      const rewritten = rewriteMessage(msg, msg.critique, account, angle);
      const newCritique = critiqueMessage(rewritten, account, angle);
      return { ...rewritten, critique: newCritique };
    }
    return { ...msg, status: msg.critique?.overallGrade === 'strong' ? 'ready' as const : 'review_needed' as const };
  });

  return final;
}

// ── Export subject builder for Gmail integration ─────────────

export { buildEmailSubject };
