/**
 * GHOST TAX — EMAIL VALIDATION & ENRICHMENT (SERVER-ONLY)
 *
 * Validates email addresses before they enter the pipeline.
 * Prevents bounces, catches disposable domains, scores email quality.
 *
 * Three validation levels:
 *   1. Format: RFC 5322 basic check
 *   2. Domain: MX record verification + disposable domain detection
 *   3. Quality: Corporate vs free email scoring
 *
 * No external API dependency — uses DNS MX lookups and local lists.
 */

import { promises as dns } from "dns";

// ── Types ────────────────────────────────────────────────

export interface EmailValidation {
  email: string;
  valid: boolean;
  reason?: string;
  quality: "corporate" | "free" | "disposable" | "suspicious" | "unknown";
  qualityScore: number; // 0-100
  domain: string;
  hasMx: boolean;
  isFreeProvider: boolean;
  isDisposable: boolean;
  isRoleBased: boolean;
  suggestedLocale: "en" | "fr" | "de" | null;
}

// ── Free Email Providers ─────────────────────────────────
// Top free email providers globally

const FREE_PROVIDERS = new Set([
  "gmail.com", "googlemail.com",
  "yahoo.com", "yahoo.fr", "yahoo.de", "yahoo.co.uk",
  "outlook.com", "hotmail.com", "hotmail.fr", "hotmail.de", "live.com", "live.fr",
  "aol.com",
  "icloud.com", "me.com", "mac.com",
  "protonmail.com", "proton.me", "pm.me",
  "mail.com", "email.com",
  "gmx.com", "gmx.de", "gmx.fr", "gmx.net",
  "web.de", "t-online.de", "freenet.de", "posteo.de",
  "orange.fr", "wanadoo.fr", "free.fr", "sfr.fr", "laposte.net", "bbox.fr",
  "yandex.com", "yandex.ru",
  "zoho.com", "tutanota.com", "tuta.io",
  "fastmail.com", "hey.com",
  "mailbox.org", "disroot.org",
]);

// ── Disposable Email Providers ───────────────────────────
// Known throwaway/temp email services

const DISPOSABLE_PROVIDERS = new Set([
  "guerrillamail.com", "guerrillamail.de", "grr.la", "guerrillamailblock.com",
  "mailinator.com", "maildrop.cc", "dispostable.com",
  "tempmail.com", "temp-mail.org", "throwaway.email",
  "yopmail.com", "yopmail.fr",
  "10minutemail.com", "10minute.email",
  "trashmail.com", "trashmail.de", "trashmail.net",
  "sharklasers.com", "guerrillamail.info",
  "mailnesia.com", "maildrop.cc",
  "fakeinbox.com", "tempail.com",
  "getnada.com", "emailondeck.com",
  "mohmal.com", "burnermail.io",
  "mailcatch.com", "mintemail.com",
  "harakirimail.com", "spamgourmet.com",
  "mailnull.com", "jetable.org",
  "crazymailing.com", "tempr.email",
]);

// ── Role-Based Prefixes ──────────────────────────────────
// These are generic role emails, not personal

const ROLE_PREFIXES = new Set([
  "info", "contact", "support", "help", "admin", "webmaster",
  "postmaster", "noreply", "no-reply", "mailer-daemon",
  "sales", "marketing", "billing", "office", "hello",
  "team", "general", "enquiries", "feedback", "press",
  "jobs", "careers", "hr", "legal", "compliance",
  "abuse", "security", "privacy",
]);

// ── TLD → Locale Mapping ─────────────────────────────────

const TLD_LOCALE_MAP: Record<string, "en" | "fr" | "de"> = {
  ".fr": "fr",
  ".de": "de",
  ".at": "de",
  ".ch": "de", // Swiss could be FR, default DE
  ".be": "fr",
  ".lu": "fr",
  ".com": "en",
  ".us": "en",
  ".co.uk": "en",
  ".uk": "en",
  ".ca": "en",
  ".au": "en",
  ".io": "en",
  ".co": "en",
};

// Known French/German ISP domains
const FR_DOMAINS = new Set(["orange.fr", "wanadoo.fr", "free.fr", "sfr.fr", "laposte.net", "bbox.fr"]);
const DE_DOMAINS = new Set(["gmx.de", "web.de", "t-online.de", "freenet.de", "posteo.de", "hotmail.de"]);

// ── Format Validation ────────────────────────────────────

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

function isValidFormat(email: string): boolean {
  if (!email || email.length > 254) return false;
  if (!EMAIL_REGEX.test(email)) return false;
  const [local, domain] = email.split("@");
  if (!local || local.length > 64) return false;
  if (!domain || !domain.includes(".")) return false;
  const tld = domain.split(".").pop();
  if (!tld || tld.length < 2) return false;
  return true;
}

// ── MX Record Check ──────────────────────────────────────

async function hasMxRecords(domain: string): Promise<boolean> {
  try {
    const records = await dns.resolveMx(domain);
    return records && records.length > 0;
  } catch {
    // DNS resolution failure — don't reject, just flag
    return false;
  }
}

// ── Locale Detection ─────────────────────────────────────

function detectLocale(email: string, domain: string): "en" | "fr" | "de" | null {
  // Check known ISP domains first
  if (FR_DOMAINS.has(domain)) return "fr";
  if (DE_DOMAINS.has(domain)) return "de";

  // Check TLD
  for (const [tld, locale] of Object.entries(TLD_LOCALE_MAP)) {
    if (domain.endsWith(tld)) return locale;
  }

  // Check email suffix patterns
  const lowerEmail = email.toLowerCase();
  if (lowerEmail.includes(".fr") || lowerEmail.includes("@fr.")) return "fr";
  if (lowerEmail.includes(".de") || lowerEmail.includes("@de.")) return "de";

  return null;
}

// ── Quality Scoring ──────────────────────────────────────

function scoreEmailQuality(
  domain: string,
  localPart: string,
  isFree: boolean,
  isDisposable: boolean,
  isRole: boolean,
  hasMx: boolean,
): number {
  let score = 50; // Base score

  // Corporate domain = highest quality
  if (!isFree && !isDisposable && hasMx) {
    score += 35;
  }

  // Free provider = lower quality but not disqualifying
  if (isFree) {
    score -= 20;
  }

  // Disposable = very low quality
  if (isDisposable) {
    score -= 45;
  }

  // Role-based = slightly lower (info@, contact@)
  if (isRole) {
    score -= 10;
  }

  // No MX = suspicious
  if (!hasMx) {
    score -= 15;
  }

  // Bonus for common corporate TLDs
  if (domain.endsWith(".com") || domain.endsWith(".io") || domain.endsWith(".co")) {
    score += 5;
  }

  // Bonus for EU corporate domains
  if (domain.endsWith(".de") || domain.endsWith(".fr") || domain.endsWith(".eu")) {
    score += 5;
  }

  // Penalty for suspicious local parts
  if (/^[a-z]{1,2}[0-9]{3,}@/.test(localPart + "@")) {
    score -= 10; // a123456@... pattern
  }

  return Math.max(0, Math.min(100, score));
}

// ── Main Validation Function ─────────────────────────────

export async function validateEmail(email: string): Promise<EmailValidation> {
  const normalized = email.trim().toLowerCase();
  const parts = normalized.split("@");

  if (parts.length !== 2) {
    return {
      email: normalized,
      valid: false,
      reason: "Invalid email format",
      quality: "unknown",
      qualityScore: 0,
      domain: "",
      hasMx: false,
      isFreeProvider: false,
      isDisposable: false,
      isRoleBased: false,
      suggestedLocale: null,
    };
  }

  const [localPart, domain] = parts;

  // Format check
  if (!isValidFormat(normalized)) {
    return {
      email: normalized,
      valid: false,
      reason: "Invalid email format",
      quality: "unknown",
      qualityScore: 0,
      domain,
      hasMx: false,
      isFreeProvider: false,
      isDisposable: false,
      isRoleBased: false,
      suggestedLocale: null,
    };
  }

  const isFree = FREE_PROVIDERS.has(domain);
  const isDisposable = DISPOSABLE_PROVIDERS.has(domain);
  const isRole = ROLE_PREFIXES.has(localPart.split(/[.+]/)[0]);

  // Disposable emails are invalid for our pipeline
  if (isDisposable) {
    return {
      email: normalized,
      valid: false,
      reason: "Disposable email address",
      quality: "disposable",
      qualityScore: 5,
      domain,
      hasMx: false,
      isFreeProvider: false,
      isDisposable: true,
      isRoleBased: isRole,
      suggestedLocale: null,
    };
  }

  // MX record check (async, with timeout)
  const hasMx = await Promise.race([
    hasMxRecords(domain),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 3000)), // Assume OK on timeout
  ]);

  const qualityScore = scoreEmailQuality(domain, localPart, isFree, isDisposable, isRole, hasMx);

  const quality: EmailValidation["quality"] =
    isDisposable ? "disposable" :
    !hasMx && !isFree ? "suspicious" :
    isFree ? "free" :
    "corporate";

  const suggestedLocale = detectLocale(normalized, domain);

  return {
    email: normalized,
    valid: true,
    quality,
    qualityScore,
    domain,
    hasMx,
    isFreeProvider: isFree,
    isDisposable: false,
    isRoleBased: isRole,
    suggestedLocale,
  };
}

// ── Batch Validation ─────────────────────────────────────

export async function validateEmails(emails: string[]): Promise<EmailValidation[]> {
  // Process in parallel batches of 10 (DNS rate limiting)
  const results: EmailValidation[] = [];
  const batchSize = 10;

  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(validateEmail));
    results.push(...batchResults);
  }

  return results;
}

// ── Quick Check (no MX lookup) ───────────────────────────

export function quickValidateEmail(email: string): {
  valid: boolean;
  isFree: boolean;
  isDisposable: boolean;
  domain: string;
} {
  const normalized = email.trim().toLowerCase();
  const parts = normalized.split("@");

  if (parts.length !== 2 || !isValidFormat(normalized)) {
    return { valid: false, isFree: false, isDisposable: false, domain: "" };
  }

  const domain = parts[1];
  return {
    valid: true,
    isFree: FREE_PROVIDERS.has(domain),
    isDisposable: DISPOSABLE_PROVIDERS.has(domain),
    domain,
  };
}

// ── Extract Company Domain ───────────────────────────────

export function extractCompanyDomain(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  const parts = normalized.split("@");
  if (parts.length !== 2) return null;

  const domain = parts[1];
  if (FREE_PROVIDERS.has(domain) || DISPOSABLE_PROVIDERS.has(domain)) {
    return null; // Can't extract company from free email
  }

  return domain;
}
