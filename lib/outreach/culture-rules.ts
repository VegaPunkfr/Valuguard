/**
 * GHOST TAX — CULTURE RULES (server-side source of truth)
 *
 * Lit le JSON partagé avec le client (public/cockpit/data/culture-rules.json)
 * et expose des helpers typés pour detectLanguage/detectTone/getPrice.
 *
 * Miroir TS de la const CULTURE_RULES V4 (public/cockpit-v4.html L1611-1617).
 *
 * J2 : ajout des helpers SignalAngle (getSignalAngle, pickSignalAngle) basés sur
 * public/cockpit/data/signal-angles.json (9 angles × 4 langues × openers/consequences).
 */

import cultureRulesJson from '@/public/cockpit/data/culture-rules.json';
import signalAnglesJson from '@/public/cockpit/data/signal-angles.json';

export interface CultureRule {
  label: string;
  tone: string;
  rules: string[];
  maxSentences: number;
  priceLabel: string;
}

export type CountryCode = 'DE' | 'UK' | 'US' | 'NL' | 'FR';

export const CULTURE_RULES: Record<CountryCode, CultureRule> = cultureRulesJson as Record<CountryCode, CultureRule>;

/**
 * Normalise un code pays (input varié : DE/de/Germany/AT/CH/GB/UK/NL/BE/FR/US)
 * vers une clé CountryCode supportée.
 */
export function normalizeCountry(country: string | undefined | null): CountryCode {
  if (!country) return 'US';
  const c = country.toUpperCase().trim();
  if (c === 'DE' || c === 'AT' || c === 'CH' || c === 'GERMANY' || c === 'DEUTSCHLAND' || c === 'AUSTRIA' || c === 'SWITZERLAND') return 'DE';
  if (c === 'UK' || c === 'GB' || c === 'UNITED KINGDOM') return 'UK';
  if (c === 'NL' || c === 'BE' || c === 'NETHERLANDS' || c === 'BELGIUM') return 'NL';
  if (c === 'FR' || c === 'FRANCE') return 'FR';
  return 'US';
}

/**
 * Langue cible pour un prospect donné.
 * B2B convention : DACH → German, NL/BE → English (Dutch lit l'anglais sans friction),
 * UK/US → English, FR → French.
 */
export function detectLanguage(country: string | undefined | null): string {
  const code = normalizeCountry(country);
  if (code === 'DE') return 'German';
  if (code === 'FR') return 'French';
  return 'English';
}

/**
 * Ton culturel recommandé, dérivé de CULTURE_RULES[country].tone.
 * Fallback = profile US direct.
 */
export function detectTone(country: string | undefined | null, headcount?: number, industry?: string): string {
  const code = normalizeCountry(country);
  const rule = CULTURE_RULES[code];

  // Raffinement DE : startup (<300 people) + tech → ton founder-to-founder
  if (code === 'DE') {
    const isStartup = headcount != null && headcount < 300 && industry != null && /tech|saas|software|fintech/i.test(industry);
    if (isStartup) {
      return 'Semi-formal, founder-to-founder. Fast, no corporate padding. Sie form unless very informal LinkedIn.';
    }
    return 'Formal, data-first. Sie form. Precise numbers. No fluff, no superlatives. Germans trust methodology.';
  }

  // NL : ultra-direct
  if (code === 'NL') return 'Ultra-direct, zero fluff. Get to the point in the first sentence. Dutch hate wasted words.';

  // UK : understatement
  if (code === 'UK') return 'Polite but not servile. British understatement: "might be worth a look" > "you MUST see this".';

  // FR : observateur
  if (code === 'FR') return rule?.tone || 'Observateur. Question, pas pitch.';

  // US / fallback : confident benefit-driven
  return 'Confident, benefit-driven. ROI explicit. Social proof matters.';
}

/**
 * Pricing géographique Ghost Tax : DACH = 590€, reste = 490€/$490/£490.
 */
export function getPrice(country: string | undefined | null): number {
  const code = normalizeCountry(country);
  return code === 'DE' ? 590 : 490;
}

/**
 * Label visible du prix pour un country code (conservé depuis CULTURE_RULES).
 */
export function getPriceLabel(country: string | undefined | null): string {
  const code = normalizeCountry(country);
  return CULTURE_RULES[code]?.priceLabel || '€490';
}

// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL ANGLES (J2) — 9 angles × 4 langues × openers/consequences/ctas
// Source : public/cockpit/data/signal-angles.json
// Miroir TS de la const SIGNAL_ANGLES V4 (public/cockpit-v4.html L1632-1744)
// ─────────────────────────────────────────────────────────────────────────────

export type SignalAngleType =
  | 'FUNDING'
  | 'HIRING_IT'
  | 'COST_CUTTING'
  | 'NEW_EXEC'
  | 'M_AND_A'
  | 'SAAS_COMPLAINTS'
  | 'RENEWAL'
  | 'COMPLIANCE'
  | 'CLOUD_MIGRATION';

export type SignalLang = 'en' | 'de' | 'fr' | 'nl';

export interface SignalAngleDefinition {
  angle: string;
  label: string;
  openers: Record<SignalLang, string[]>;
  consequences: Record<SignalLang, string>;
}

interface SignalAnglesJsonShape {
  FUNDING: SignalAngleDefinition;
  HIRING_IT: SignalAngleDefinition;
  COST_CUTTING: SignalAngleDefinition;
  NEW_EXEC: SignalAngleDefinition;
  M_AND_A: SignalAngleDefinition;
  SAAS_COMPLAINTS: SignalAngleDefinition;
  RENEWAL: SignalAngleDefinition;
  COMPLIANCE: SignalAngleDefinition;
  CLOUD_MIGRATION: SignalAngleDefinition;
  _ctas: Record<SignalLang, string>;
}

const SIGNAL_ANGLES_DATA = signalAnglesJson as SignalAnglesJsonShape;

export const SIGNAL_ANGLES: Record<SignalAngleType, SignalAngleDefinition> = {
  FUNDING: SIGNAL_ANGLES_DATA.FUNDING,
  HIRING_IT: SIGNAL_ANGLES_DATA.HIRING_IT,
  COST_CUTTING: SIGNAL_ANGLES_DATA.COST_CUTTING,
  NEW_EXEC: SIGNAL_ANGLES_DATA.NEW_EXEC,
  M_AND_A: SIGNAL_ANGLES_DATA.M_AND_A,
  SAAS_COMPLAINTS: SIGNAL_ANGLES_DATA.SAAS_COMPLAINTS,
  RENEWAL: SIGNAL_ANGLES_DATA.RENEWAL,
  COMPLIANCE: SIGNAL_ANGLES_DATA.COMPLIANCE,
  CLOUD_MIGRATION: SIGNAL_ANGLES_DATA.CLOUD_MIGRATION,
};

export const SIGNAL_CTAS: Record<SignalLang, string> = SIGNAL_ANGLES_DATA._ctas;

export interface SignalAnglePick {
  type: SignalAngleType;
  label: string;
  opener: string;
  consequence: string;
  cta: string;
}

/**
 * Retourne une triplette {opener, consequence, cta, label} prête à injecter
 * dans un prompt Haiku pour un angle donné dans une langue donnée.
 *
 * - Si `variant` est fourni, il est utilisé modulo le nombre d'openers dispos
 *   (pour les angles à 3 openers, variant 0/1/2 sélectionne le bon).
 * - Fallback langue : si la langue demandée n'a pas d'opener, on retombe sur 'en'.
 * - Fallback angle : si le type n'existe pas, retourne `FUNDING` + opener[0].
 */
export function getSignalAngle(
  type: SignalAngleType,
  lang: SignalLang,
  variant: number = 0,
): SignalAnglePick {
  const angle = SIGNAL_ANGLES[type] || SIGNAL_ANGLES.FUNDING;
  const openers = angle.openers[lang] || angle.openers.en;
  const consequence = angle.consequences[lang] || angle.consequences.en;
  const cta = SIGNAL_CTAS[lang] || SIGNAL_CTAS.en;

  const safeVariant = openers.length > 0 ? Math.abs(variant) % openers.length : 0;
  const opener = openers[safeVariant] || openers[0] || '';

  return {
    type,
    label: angle.label,
    opener,
    consequence,
    cta,
  };
}

/**
 * Normalise un signal brut Apollo/Exa (string libre) vers un SignalAngleType.
 * Accepte `primarySignal` (string) et/ou un array de `signals` (concat + match).
 *
 * Mapping testé sur patterns observés en prod Apollo :
 *   - "post-funding", "series b", "raised" → FUNDING
 *   - "new cfo", "new cto", "leadership change" → NEW_EXEC
 *   - "hiring finance", "finance team growing" → HIRING_IT
 *   - "restructuring", "layoff", "cost-cutting" → COST_CUTTING
 *   - "merger", "acquisition", "acquired" → M_AND_A
 *   - "cloud cost post", "saas complaint" → SAAS_COMPLAINTS
 *   - "renewal", "contract end" → RENEWAL
 *   - "dora", "compliance", "audit" → COMPLIANCE
 *   - "cloud migration", "aws migration" → CLOUD_MIGRATION
 *
 * Fallback : FUNDING (angle le plus universel).
 */
export function pickSignalAngle(
  primarySignal: string | undefined | null,
  signals: string[] = [],
): SignalAngleType {
  const haystack = [primarySignal || '', ...signals].join(' ').toLowerCase();

  if (!haystack.trim()) return 'FUNDING';

  // Order matters: specific patterns first (M_AND_A before "acquisition" confusion)
  if (/\bm&a\b|\bmerger\b|\bacquisition\b|\bacquired\b|\bacqui-hire\b|\bfusion\b|\bübernahm/.test(haystack)) {
    return 'M_AND_A';
  }
  if (/\bnew\s+(cfo|cto|ceo|coo|exec|executive|leader)\b|leadership\s+change|führungswechsel|nouveau\s+(cfo|directeur)/.test(haystack)) {
    return 'NEW_EXEC';
  }
  if (/post[-\s]?funding|series\s+[a-d]\b|\braised\b|\bfunding\b|finanzier|\bfundraise\b|levée|levé|tour\s+de\s+table/.test(haystack)) {
    return 'FUNDING';
  }
  if (/hiring\s+(finance|it|cfo|controller)|finance\s+(team|hiring)|finanzbereich|recrut.*finance|finance.*recrut/.test(haystack)) {
    return 'HIRING_IT';
  }
  if (/\blayoff\b|restructur|restructur.*|cost[-\s]?cut|cost\s+reduction|downsiz|sparmaßnahm|abbau|plan\s+social/.test(haystack)) {
    return 'COST_CUTTING';
  }
  if (/saas\s+(complaint|pain|cost)|cloud\s+(cost|bill)\s+post|public.*pain|linkedin\s+post.*cost/.test(haystack)) {
    return 'SAAS_COMPLAINTS';
  }
  if (/\brenewal\b|contract\s+end|verlängerung|renouvellement|contrat.*fin/.test(haystack)) {
    return 'RENEWAL';
  }
  if (/\bdora\b|\bbafin\b|compliance|audit|soc\s?2|iso\s?27|\brgpd\b|\bgdpr\b/.test(haystack)) {
    return 'COMPLIANCE';
  }
  if (/cloud\s+migration|aws\s+migration|azure\s+migration|gcp\s+migration|migration.*cloud|cloud.*migrat/.test(haystack)) {
    return 'CLOUD_MIGRATION';
  }

  return 'FUNDING';
}
