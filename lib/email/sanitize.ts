/**
 * GHOST TAX — Centralized Email Text Sanitation
 *
 * Single source of truth for all text cleanup before email rendering.
 * Called by: send-approved, cron orchestrator, sprint API, cockpit JS (via API).
 *
 * Handles: mojibake, replacement chars, smart quotes, zero-width chars,
 * internal markers, placeholder detection.
 */

// Fix mojibake (UTF-8 bytes misread as Latin-1)
const MOJIBAKE_MAP: [RegExp, string][] = [
  [/Ã¤/g, 'ä'], [/Ã¶/g, 'ö'], [/Ã¼/g, 'ü'],
  [/Ã„/g, 'Ä'], [/Ã–/g, 'Ö'], [/Ãœ/g, 'Ü'],
  [/ÃŸ/g, 'ß'], [/Ã©/g, 'é'], [/Ã¨/g, 'è'], [/Ã /g, 'à'],
  [/â‚¬/g, '€'],
];

// Internal/review markers that must never appear in client-facing subjects
const INTERNAL_MARKERS = /\[REVIEW[^\]]*\]|\[TEST[^\]]*\]|\[DRAFT[^\]]*\]|\[PREVIEW[^\]]*\]|\[INTERNAL[^\]]*\]|\[TODO[^\]]*\]/gi;

// Unresolved placeholders
const PLACEHOLDER_PATTERN = /\{\{[^}]*\}?\}?|\$\{[^}]*\}?|\[NAME\]|\[COMPANY\]|\bundefined\b|\bnull\b/;

// Mojibake detection (pre-normalization)
const MOJIBAKE_DETECT = /\uFFFD|ï¿½|Ã¤|Ã¶|Ã¼|Ã©|Ã¨|Ã |ÃŸ|Ã„|Ã–|Ãœ/;

// Spam phrases for compliance checks
const SPAM_PHRASES = [
  'guaranteed savings', 'exclusive offer', 'limited time', 'act now',
  'free trial', 'no obligation', '100% guaranteed', 'click here now',
  'unsubscribe',
];

/**
 * Core text sanitizer — fixes mojibake, strips replacement chars,
 * normalizes quotes and whitespace.
 */
export function sanitizeEmailText(text: string | null | undefined): string {
  if (!text) return '';
  let t = text;
  // 1. Fix mojibake
  for (const [pattern, replacement] of MOJIBAKE_MAP) {
    t = t.replace(pattern, replacement);
  }
  // 2. Remove replacement character U+FFFD
  t = t.replace(/\uFFFD/g, '');
  // 3. Normalize quotes
  t = t.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
  // 4. Remove soft hyphens and zero-width chars
  t = t.replace(/[\u00AD\u200B\u200C\u200D\uFEFF]/g, '');
  // 5. Collapse multiple spaces (but preserve newlines)
  t = t.replace(/[^\S\n]+/g, ' ');
  return t;
}

/**
 * Subject-specific sanitizer — also strips internal markers like [REVIEW], [TEST], etc.
 */
export function sanitizeSubject(subject: string): string {
  let s = sanitizeEmailText(subject);
  // Strip internal markers
  s = s.replace(INTERNAL_MARKERS, '').trim().replace(/\s{2,}/g, ' ');
  return s;
}

/**
 * Detect if text still contains U+FFFD replacement characters.
 */
export function hasCorruptChars(text: string): boolean {
  return /\uFFFD/.test(text);
}

/**
 * Detect if text contains mojibake patterns (pre-normalization check).
 */
export function hasMojibake(text: string): boolean {
  return MOJIBAKE_DETECT.test(text);
}

/**
 * Detect internal review/test markers in subject line.
 */
export function hasInternalMarkers(subject: string): boolean {
  return INTERNAL_MARKERS.test(subject);
}

/**
 * Detect unresolved placeholders like {{name}}, ${var}, [COMPANY], undefined, null.
 */
export function hasPlaceholders(text: string): boolean {
  return PLACEHOLDER_PATTERN.test(text);
}

/**
 * Detect spam/compliance trigger phrases.
 */
export function hasSpamPhrases(text: string): string | null {
  const lower = text.toLowerCase();
  return SPAM_PHRASES.find(p => lower.includes(p)) || null;
}

export interface EmailValidationResult {
  valid: boolean;
  errors: string[];
  gate: string;
}

/**
 * Full pre-send validation. Returns structured result with all errors found.
 * Does NOT sanitize — call sanitizeEmailText/sanitizeSubject first.
 */
export function validateEmailBeforeSend(params: {
  subject: string;
  body: string;
  to: string;
  ctaUrl?: string;
}): EmailValidationResult {
  const errors: string[] = [];

  // Subject checks
  if (!params.subject || params.subject.trim().length < 5) {
    errors.push('EMPTY_SUBJECT: Subject too short or empty');
  }
  if (hasCorruptChars(params.subject)) {
    errors.push('CORRUPT_SUBJECT: Subject contains corrupted characters');
  }
  if (hasMojibake(params.subject)) {
    errors.push('MOJIBAKE_SUBJECT: Subject contains mojibake patterns');
  }
  if (hasInternalMarkers(params.subject)) {
    errors.push('MARKERS_SUBJECT: Subject contains internal review markers');
  }

  // Body checks
  if (!params.body || params.body.trim().length < 50) {
    errors.push('EMPTY_BODY: Body too short');
  }
  if (hasCorruptChars(params.body)) {
    errors.push('CORRUPT_BODY: Body contains corrupted characters');
  }
  if (hasMojibake(params.body)) {
    errors.push('MOJIBAKE_BODY: Body contains mojibake patterns');
  }
  if (hasPlaceholders(params.body)) {
    errors.push('PLACEHOLDER: Body contains unresolved placeholders');
  }

  // Spam check
  const spamHit = hasSpamPhrases(params.body);
  if (spamHit) {
    errors.push(`SPAM: Spam phrase detected: "${spamHit}"`);
  }

  // Recipient
  if (!params.to || !params.to.includes('@')) {
    errors.push('INVALID_RECIPIENT: Invalid recipient email');
  }

  // CTA URL safety
  if (params.ctaUrl && !/^https:\/\/ghost-tax\.com/.test(params.ctaUrl)) {
    errors.push('BAD_CTA_URL: CTA URL does not point to ghost-tax.com');
  }

  const gate = errors.length === 0 ? 'PASS' : errors[0].split(':')[0];
  return { valid: errors.length === 0, errors, gate };
}
