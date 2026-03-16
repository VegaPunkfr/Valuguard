/**
 * GHOST TAX — CHANNEL SELECTION ENGINE
 *
 * Recommends the best outreach channel for each account.
 * Not simplistic rules — weighted scoring across 12+ variables.
 *
 * LinkedIn vs Email vs Hold — with reasoning.
 */

import type { Account, ChannelRecommendation, ChannelSequence, OutreachChannel } from '@/types/command';

// ── Channel Scoring Weights ─────────────────────────────────

interface ChannelScore {
  linkedin: number;
  email: number;
  hold: number;
}

// Country preferences (LinkedIn culture varies by market)
const COUNTRY_CHANNEL: Record<string, ChannelScore> = {
  US: { linkedin: 8, email: 6, hold: 0 },
  UK: { linkedin: 7, email: 7, hold: 0 },
  DE: { linkedin: 5, email: 8, hold: 0 }, // Germans prefer formal email
  NL: { linkedin: 7, email: 6, hold: 0 },
};

// Title seniority → channel preference
function titleScore(title: string): ChannelScore {
  const t = title.toLowerCase();
  if (t.includes('cfo') || t.includes('chief financial'))
    return { linkedin: 6, email: 8, hold: 0 }; // CFOs prefer email — formal
  if (t.includes('vp') || t.includes('vice president'))
    return { linkedin: 7, email: 7, hold: 0 };
  if (t.includes('head of') || t.includes('director'))
    return { linkedin: 7, email: 6, hold: 0 };
  return { linkedin: 6, email: 6, hold: 0 };
}

// Company size → channel
function sizeScore(employeeRange: string): ChannelScore {
  const num = parseInt(employeeRange.replace(/[^0-9]/g, '')) || 200;
  if (num >= 500) return { linkedin: 4, email: 8, hold: 0 }; // Larger = email
  if (num >= 200) return { linkedin: 7, email: 7, hold: 0 };
  return { linkedin: 8, email: 5, hold: 0 }; // Smaller = LinkedIn
}

// Signal type → channel affinity
function signalChannelScore(signalTypes: string[]): ChannelScore {
  let li = 0, em = 0, hold = 0;

  for (const type of signalTypes) {
    switch (type) {
      case 'executive':
      case 'hiring':
        li += 3; em += 1; break; // Social signals → LinkedIn
      case 'restructuring':
      case 'regulatory':
        li += 1; em += 3; break; // Sensitive → email (formal)
      case 'M&A':
        li += 1; em += 3; break; // Corporate event → email
      case 'funding':
      case 'growth':
        li += 2; em += 2; break; // Neutral
      case 'expansion':
        li += 2; em += 2; break;
      case 'transformation':
        li += 2; em += 1; break;
      default:
        li += 1; em += 1;
    }
  }

  return { linkedin: li, email: em, hold };
}

// Signal strength → hold threshold
function signalStrengthScore(signals: Account['signals']): ChannelScore {
  if (signals.length === 0) return { linkedin: 0, email: 0, hold: 10 };

  const avg = signals.reduce((s, sig) => s + sig.strength, 0) / signals.length;
  const max = Math.max(...signals.map(s => s.strength));

  if (max <= 2) return { linkedin: 0, email: 0, hold: 8 }; // Too weak
  if (avg < 3) return { linkedin: 2, email: 2, hold: 4 };
  if (avg >= 4 && max >= 5) return { linkedin: 5, email: 5, hold: 0 }; // Strong
  return { linkedin: 3, email: 3, hold: 1 };
}

// LinkedIn profile availability
function linkedinAvailabilityScore(financeLead: Account['financeLead']): ChannelScore {
  if (financeLead.linkedIn) return { linkedin: 5, email: 0, hold: 0 };
  if (financeLead.name && financeLead.name.split(' ').length >= 2)
    return { linkedin: 2, email: 1, hold: 0 }; // Can search
  return { linkedin: -3, email: 3, hold: 0 }; // Can't find them
}

// Conviction → willingness to reach out
function convictionScore(conviction: Account['conviction']): ChannelScore {
  switch (conviction) {
    case 'very_high': return { linkedin: 3, email: 3, hold: 0 };
    case 'high': return { linkedin: 2, email: 2, hold: 0 };
    case 'moderate': return { linkedin: 1, email: 1, hold: 2 };
    case 'low': return { linkedin: 0, email: 0, hold: 5 };
  }
}

// Attackability check
function attackScore(attackability: Account['attackability']): ChannelScore {
  switch (attackability) {
    case 'now': return { linkedin: 3, email: 3, hold: 0 };
    case 'soon': return { linkedin: 1, email: 1, hold: 2 };
    case 'later': return { linkedin: 0, email: 0, hold: 5 };
    case 'blocked': return { linkedin: 0, email: 0, hold: 10 };
  }
}

// Solofounder fit
function solofitChannelScore(solofit: Account['solofit']): ChannelScore {
  switch (solofit) {
    case 'ideal': return { linkedin: 3, email: 2, hold: 0 };
    case 'good': return { linkedin: 2, email: 2, hold: 0 };
    case 'stretch': return { linkedin: 1, email: 2, hold: 1 }; // More formal for stretch
    case 'hard': return { linkedin: 0, email: 1, hold: 3 };
  }
}

// Scan data influence
function scanScore(scan: Account['scan']): ChannelScore {
  if (!scan) return { linkedin: 0, email: 0, hold: 1 };
  if (scan.status === 'complete' && scan.strengthensHypothesis)
    return { linkedin: 2, email: 4, hold: 0 }; // Proof → email is stronger
  if (scan.status === 'complete')
    return { linkedin: 1, email: 2, hold: 0 };
  return { linkedin: 0, email: 0, hold: 0 };
}

// ── Main Selection Function ─────────────────────────────────

export function selectChannel(account: Account): ChannelRecommendation {
  const signalTypes = account.signals.map(s => s.type);

  // Aggregate scores
  const scores: ChannelScore = { linkedin: 0, email: 0, hold: 0 };
  const components = [
    COUNTRY_CHANNEL[account.country] || { linkedin: 5, email: 5, hold: 0 },
    titleScore(account.financeLead.title),
    sizeScore(account.employeeRange),
    signalChannelScore(signalTypes),
    signalStrengthScore(account.signals),
    linkedinAvailabilityScore(account.financeLead),
    convictionScore(account.conviction),
    attackScore(account.attackability),
    solofitChannelScore(account.solofit),
    scanScore(account.scan),
  ];

  for (const c of components) {
    scores.linkedin += c.linkedin;
    scores.email += c.email;
    scores.hold += c.hold;
  }

  // Determine recommendation
  const total = scores.linkedin + scores.email + scores.hold;
  const holdRatio = total > 0 ? scores.hold / total : 0;

  // If hold dominates → recommend hold
  if (holdRatio > 0.4 || scores.hold > Math.max(scores.linkedin, scores.email) * 1.5) {
    return {
      primary: 'hold',
      sequence: 'hold',
      confidence: Math.min(85, Math.round(scores.hold / total * 100)),
      reasoning: buildHoldReasoning(account),
      whyPrimary: 'Signal strength, conviction, or attackability insufficient for outreach.',
      whyNotOthers: 'Sending now risks weak messaging and reputation damage.',
    };
  }

  // Determine primary/secondary
  const liWins = scores.linkedin > scores.email;
  const primary: OutreachChannel = liWins ? 'linkedin' : 'email';
  const secondary: OutreachChannel = liWins ? 'email' : 'linkedin';
  const gap = Math.abs(scores.linkedin - scores.email);

  // Sequence logic
  let sequence: ChannelSequence;
  if (gap > 8) {
    sequence = primary === 'linkedin' ? 'linkedin_only' : 'email_only';
  } else {
    sequence = primary === 'linkedin' ? 'linkedin_first' : 'email_first';
  }

  // Confidence: based on gap strength + overall signal strength
  const maxChannel = Math.max(scores.linkedin, scores.email);
  const rawConf = Math.round((maxChannel / (total - scores.hold)) * 100);
  const confidence = Math.min(85, Math.max(20, rawConf));

  return {
    primary,
    secondary: gap <= 8 ? secondary : undefined,
    sequence,
    confidence,
    reasoning: buildChannelReasoning(account, primary, secondary, scores, gap),
    whyPrimary: buildWhyPrimary(account, primary),
    whyNotOthers: buildWhyNot(account, primary, secondary, gap),
  };
}

// ── Reasoning Builders ──────────────────────────────────────

function buildHoldReasoning(a: Account): string {
  const parts: string[] = [];
  if (a.conviction === 'low') parts.push('conviction too low');
  if (a.attackability === 'blocked') parts.push('account blocked');
  if (a.attackability === 'later') parts.push('timing not right');
  if (a.signals.length === 0) parts.push('no signals detected');
  if (a.signals.every(s => s.strength <= 2)) parts.push('all signals weak (≤2/5)');
  return `Hold recommended: ${parts.join(', ') || 'insufficient evidence for quality outreach'}.`;
}

function buildChannelReasoning(a: Account, primary: OutreachChannel, secondary: OutreachChannel, scores: ChannelScore, gap: number): string {
  const parts: string[] = [];
  if (primary === 'linkedin') {
    if (a.financeLead.linkedIn) parts.push('LinkedIn profile available');
    if (['US', 'UK', 'NL'].includes(a.country)) parts.push(`${a.country} market favors LinkedIn`);
    if (a.signals.some(s => s.type === 'hiring' || s.type === 'executive')) parts.push('social signal matches LinkedIn');
  } else {
    if (a.country === 'DE') parts.push('DE market prefers formal email');
    if (a.financeLead.title.toLowerCase().includes('cfo')) parts.push('CFO seniority favors email');
    if (a.scan?.strengthensHypothesis) parts.push('scan data supports evidence-based email');
    if (a.signals.some(s => s.type === 'restructuring' || s.type === 'M&A')) parts.push('sensitive signal suits email');
  }
  if (gap <= 8) parts.push(`secondary ${secondary} viable (gap: ${gap}pt)`);
  return parts.join('. ') + '.';
}

function buildWhyPrimary(a: Account, primary: OutreachChannel): string {
  if (primary === 'linkedin') {
    return `LinkedIn offers informal entry, works well for ${a.country} market with ${a.financeLead.title}-level contacts. Connection before pitch.`;
  }
  return `Email provides formal, evidence-based first contact. Better for ${a.financeLead.title} at ${a.employeeRange}-employee company in ${a.country}.`;
}

function buildWhyNot(a: Account, primary: OutreachChannel, secondary: OutreachChannel, gap: number): string {
  if (gap > 8) {
    return primary === 'linkedin'
      ? `Email: ${a.country === 'DE' ? 'despite DE preference, ' : ''}signal type and contact profile strongly favor LinkedIn. Email as cold-open may feel too formal.`
      : `LinkedIn: scoring gap too wide (${gap}pt). ${a.financeLead.title} in ${a.country} expects formal approach.`;
  }
  return `Both channels viable. ${secondary} is backup if ${primary} gets no response within 7 days.`;
}
