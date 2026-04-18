/**
 * GHOST TAX — QUALITY GATE (server-side)
 *
 * Portage TypeScript de la fonction V4 qualityGate (public/cockpit-v4.html L1801-1916)
 * et de son helper normalizeText (L1791-1799).
 *
 * 4 layers (A Technical / B Linguistic / C Business / D Compliance) → decision
 *   BLOCK | REGENERATE | PASS_DRAFT_ONLY | PASS_SEND
 */

import aiBlacklistJson from '@/public/cockpit/data/ai-blacklist.json';

const AI_BLACKLIST: string[] = aiBlacklistJson as string[];

export type GateDecision = 'BLOCK' | 'REGENERATE' | 'PASS_SEND' | 'PASS_DRAFT_ONLY';
export type GateSeverity = 'WARN' | 'HARD_BLOCK' | 'REGENERATE' | 'INFO';
export type GateLayer = 'A' | 'B' | 'C' | 'D';
export type GateMode = 'standard' | 'internal_test';

export interface GateScores {
  technical: number;
  linguistic: number;
  business: number;
  compliance: number;
}

export interface GateHardBlocker {
  code: string;
  layer: GateLayer;
  message: string;
}

export interface GateAuditEntry {
  code: string;
  severity: GateSeverity;
}

export interface GateResult {
  decision: GateDecision;
  scores: GateScores;
  hardBlockers: GateHardBlocker[];
  regenerateHints: string[];
  auditLog: GateAuditEntry[];
  auditLogString: string;
}

export interface GateProspect {
  co?: string;
  lang?: string;
  industry?: string;
  size?: string;
  contact?: { name?: string; email?: string };
}

export function normalizeText(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .replace(/Ã¤/g, 'ä').replace(/Ã¶/g, 'ö').replace(/Ã¼/g, 'ü')
    .replace(/Ã„/g, 'Ä').replace(/Ã–/g, 'Ö').replace(/Ãœ/g, 'Ü')
    .replace(/ÃŸ/g, 'ß').replace(/â‚¬/g, '€')
    .replace(/Ã©/g, 'é').replace(/Ã¨/g, 'è').replace(/Ã /g, 'à')
    .replace(/\uFFFD/g, '');
}

interface CheckEntry {
  category: 'technical' | 'linguistic' | 'business' | 'compliance';
  label: string;
  pass: boolean;
  severity: GateSeverity;
  detail: string;
}

function layerOf(cat: CheckEntry['category']): GateLayer {
  if (cat === 'technical') return 'A';
  if (cat === 'linguistic') return 'B';
  if (cat === 'business') return 'C';
  return 'D';
}

export function qualityGate(
  subjectRaw: string | undefined,
  bodyRaw: string | undefined,
  prospect: GateProspect,
  mode: GateMode = 'standard'
): GateResult {
  const subject = normalizeText(subjectRaw);
  const body = normalizeText(bodyRaw);
  const lower = body.toLowerCase();
  const words = body.split(/\s+/).filter(Boolean).length;

  const checks: CheckEntry[] = [];
  const hardBlockers: GateHardBlocker[] = [];
  const regenerateHints: string[] = [];
  const auditEntries: GateAuditEntry[] = [];

  function addCheck(
    category: CheckEntry['category'],
    label: string,
    pass: boolean,
    severity: GateSeverity,
    detail: string
  ): void {
    checks.push({ category, label, pass, severity, detail });
    auditEntries.push({ code: label, severity: pass ? 'INFO' : severity });
    if (!pass && severity === 'HARD_BLOCK') {
      hardBlockers.push({ code: label, layer: layerOf(category), message: detail || label });
    }
    if (!pass && severity === 'REGENERATE') {
      regenerateHints.push(detail || label);
    }
  }

  // ── A. TECHNICAL INTEGRITY ──
  const corruptRx = /\uFFFD|\\uFFFD|ï¿½|Ã¤|Ã¶|Ã¼|Ã©|Ã¨|Ã |ÃŸ|Ã„|Ã–|Ãœ/;
  addCheck('technical', 'CORRUPT_CHARS', !corruptRx.test(body) && !corruptRx.test(subject), 'HARD_BLOCK', 'Caractères corrompus détectés');
  addCheck('technical', 'EMPTY_SUBJECT', subject.length >= 5, 'HARD_BLOCK', 'Sujet vide ou trop court');
  addCheck('technical', 'EMPTY_BODY', body.length >= 20, 'HARD_BLOCK', 'Corps vide ou trop court');
  const placeholderRx = /\{\{|(\$\{(?!.*\}))|\[NAME\]|\[COMPANY\]|\bundefined\b|\bnull\b/;
  addCheck('technical', 'UNRESOLVED_PLACEHOLDER', !placeholderRx.test(body), 'HARD_BLOCK', 'Placeholder non résolu dans le message');
  const brokenLinkRx = /https?:\/\/(undefined|null)/;
  addCheck('technical', 'MALFORMED_LINK', !brokenLinkRx.test(body), 'WARN', 'Lien malformé détecté');

  // ── B. LINGUISTIC QUALITY ──
  const lang = prospect?.lang || 'en';
  const langMarkers: Record<string, string[]> = {
    de: ['ich', 'und', 'der', 'die', 'das', 'nicht', 'für', 'bei', 'mit', 'auch', 'ein', 'den', 'dem'],
    en: ['the', 'and', 'you', 'your', 'that', 'this', 'with', 'have', 'from', 'been', 'are', 'was', 'not'],
    fr: ['les', 'des', 'que', 'une', 'pour', 'dans', 'est', 'pas', 'avec', 'qui', 'sur', 'son', 'ont'],
    nl: ['het', 'van', 'een', 'dat', 'met', 'voor', 'niet', 'aan', 'ook', 'als', 'maar', 'nog', 'wel'],
  };
  const markers = langMarkers[lang] || langMarkers.en;
  const markerCount = markers.filter((m) => lower.includes(m)).length;
  addCheck('linguistic', 'WRONG_LANGUAGE', markerCount >= 3, 'HARD_BLOCK', `Langue attendue: ${lang}, seulement ${markerCount} marqueurs trouvés`);

  addCheck('linguistic', 'TOO_SHORT', words >= 40, 'REGENERATE', `Trop court: ${words} mots (min 40)`);
  addCheck('linguistic', 'TOO_LONG', words <= 150, 'REGENERATE', `Trop long: ${words} mots (max 150)`);

  const trimmed = body.trim();
  addCheck('linguistic', 'NO_CTA', /\?\s*$/.test(trimmed), 'REGENERATE', 'Le message ne finit pas par une question');

  const aiHits = AI_BLACKLIST.filter((phrase) => lower.includes(phrase));
  addCheck('linguistic', 'AI_BLACKLIST', aiHits.length === 0, 'HARD_BLOCK', `Phrase IA détectée: "${aiHits[0] || ''}"`);

  // Repetition : même 4-gram apparaît 2+ fois
  const fourGrams: string[] = [];
  const bodyWords = body.split(/\s+/);
  for (let i = 0; i <= bodyWords.length - 4; i++) {
    fourGrams.push(bodyWords.slice(i, i + 4).join(' ').toLowerCase());
  }
  const seen = new Set<string>();
  let hasRepeat = false;
  for (const g of fourGrams) {
    if (seen.has(g)) { hasRepeat = true; break; }
    seen.add(g);
  }
  addCheck('linguistic', 'REPETITION', !hasRepeat, 'REGENERATE', 'Phrase de 4+ mots répétée');

  // ── C. BUSINESS CREDIBILITY ──
  const coName = prospect?.co || '';
  addCheck('business', 'NO_COMPANY_NAME', !!(coName && lower.includes(coName.toLowerCase())), 'HARD_BLOCK', `Nom d'entreprise "${coName}" absent du message`);

  const hasIndustry = !!(prospect?.industry && lower.includes((prospect.industry.split('·')[0] || '').trim().toLowerCase()));
  const hasSize = !!(prospect?.size && lower.includes(prospect.size.toLowerCase()));
  const hasContactName = !!(prospect?.contact?.name && lower.includes(prospect.contact.name.split(' ')[0].toLowerCase()));
  const hasCompany = !!(coName && lower.includes(coName.toLowerCase()));
  const personalized = hasIndustry || hasSize || hasContactName || hasCompany;
  addCheck('business', 'NO_PERSONALIZATION', personalized, 'HARD_BLOCK', 'Aucune personnalisation (industrie, taille, contact, ou entreprise)');

  const bigClaimRx = /[\d.,]+\s*(millions?|M)\s*(EUR|€|\$|£)/i;
  const hedgeRx = /i['']ve seen|typically|ich habe gesehen|j['']ai vu|en moyenne|usually|erfahrungsgemäß/i;
  const hasBigClaim = bigClaimRx.test(body);
  const hasHedge = hedgeRx.test(body);
  addCheck('business', 'UNDEFENDED_CLAIM', !(hasBigClaim && !hasHedge), 'REGENERATE', 'Chiffre > 1M sans langage de nuance');

  const signalWords = ['hiring', 'funding', 'restructur', 'renewal', 'migration', 'compliance', 'acquisition', 'merger', 'layoff', 'cost.?cut', 'saas.?spend', 'cloud', 'audit', 'dora', 'einstell', 'finanzier', 'restruktur', 'verlänger', 'übernahm'];
  const hasSignal = signalWords.some((w) => new RegExp(w, 'i').test(body));
  addCheck('business', 'NO_SIGNAL', hasSignal, 'REGENERATE', 'Aucun signal business référencé');

  // ── D. GHOST TAX COMPLIANCE ──
  const spamWords = ['guaranteed', 'exclusive offer', 'limited time', 'act now', 'free trial', 'no obligation', '100% guaranteed'];
  const spamHits = spamWords.filter((w) => lower.includes(w));
  addCheck('compliance', 'SPAM_WORDS', spamHits.length === 0, 'HARD_BLOCK', `Mot spam détecté: "${spamHits[0] || ''}"`);

  const hasPS = /p\.s\./i.test(body);
  const isDACH = lang === 'de';
  addCheck('compliance', 'NO_PS', !(isDACH && !hasPS), 'REGENERATE', 'P.S. manquant (requis pour DACH)');

  const hypeWords = ['revolutionary', 'game-changing', 'incredible', 'amazing', 'unbelievable'];
  const hypeHits = hypeWords.filter((w) => lower.includes(w));
  addCheck('compliance', 'HYPE_LANGUAGE', hypeHits.length === 0, 'REGENERATE', `Langage hype: "${hypeHits[0] || ''}"`);

  const corpVoice = ['our analysis', 'our platform', 'our solution', 'we offer'];
  const corpHits = corpVoice.filter((w) => lower.includes(w));
  addCheck('compliance', 'CORPORATE_VOICE', corpHits.length === 0, 'REGENERATE', `Voix corporate: "${corpHits[0] || ''}"`);

  // ── SCORING ──
  function catScore(cat: CheckEntry['category']): number {
    const catChecks = checks.filter((c) => c.category === cat);
    if (!catChecks.length) return 100;
    const passed = catChecks.filter((c) => c.pass).length;
    return Math.round((passed / catChecks.length) * 100);
  }
  const scores: GateScores = {
    technical: catScore('technical'),
    linguistic: catScore('linguistic'),
    business: catScore('business'),
    compliance: catScore('compliance'),
  };

  // ── DECISION ENGINE ──
  let decision: GateDecision;
  if (hardBlockers.length > 0) decision = 'BLOCK';
  else if (scores.technical < 60) decision = 'BLOCK';
  else if (scores.linguistic < 50) decision = 'REGENERATE';
  else if (scores.business < 50) decision = 'REGENERATE';
  else if (scores.compliance < 70) decision = 'REGENERATE';
  else if (mode === 'internal_test') decision = 'PASS_DRAFT_ONLY';
  else decision = 'PASS_SEND';

  const blockersStr = hardBlockers.length
    ? 'BLOCKERS:' + hardBlockers.map((h) => h.code).join(',') + ' | '
    : '';
  const auditLogString = `[QG] ${decision} | T:${scores.technical} L:${scores.linguistic} B:${scores.business} C:${scores.compliance} | ${blockersStr}${prospect?.co || '?'} → ${prospect?.contact?.email || '?'}`;

  return {
    decision,
    scores,
    hardBlockers,
    regenerateHints,
    auditLog: auditEntries,
    auditLogString,
  };
}
