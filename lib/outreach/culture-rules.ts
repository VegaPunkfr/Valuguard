/**
 * GHOST TAX — CULTURE RULES (server-side source of truth)
 *
 * Lit le JSON partagé avec le client (public/cockpit/data/culture-rules.json)
 * et expose des helpers typés pour detectLanguage/detectTone/getPrice.
 *
 * Miroir TS de la const CULTURE_RULES V4 (public/cockpit-v4.html L1611-1617).
 */

import cultureRulesJson from '@/public/cockpit/data/culture-rules.json';

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
