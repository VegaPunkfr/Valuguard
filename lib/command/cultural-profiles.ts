/**
 * GHOST TAX — CULTURAL INTELLIGENCE PROFILES
 *
 * Encodes how to communicate with prospects based on their
 * country, company type, and role. Not just translation —
 * THINKING like a native business person.
 */

export interface CulturalProfile {
  language: "de" | "en" | "fr" | "nl";
  formality: "formal" | "semi-formal" | "informal";
  addressForm: string;           // "Sie" | "Du" | "you" | "vous"
  toneDescriptors: string[];     // For AI writer prompt
  structurePreference: string;   // How to structure the message
  tabooPatterns: string[];       // What to NEVER say
  persuasionStyle: string;       // What convinces this culture
  signatureStyle: string;        // How to sign off
  maxWords: { linkedin: number; email: number };
}

const PROFILES: Record<string, CulturalProfile> = {
  // ── German Mittelstand (100-500 emp, traditional) ──
  DE_MITTELSTAND: {
    language: "de",
    formality: "formal",
    addressForm: "Sie",
    toneDescriptors: [
      "direct and factual",
      "data-first, conclusion-second",
      "precise numbers with ranges",
      "no fluff, no superlatives",
      "respectful but not servile",
    ],
    structurePreference: "Lead with the three findings. Then the exposure number. Then the offer. No storytelling.",
    tabooPatterns: [
      "buzzwords in English mixed into German",
      "exclamation marks",
      "emojis",
      "casual tone",
      "'Du' form unless prospect uses it on LinkedIn",
      "claims without data backing",
      "'innovative' or 'cutting-edge' or 'game-changing'",
    ],
    persuasionStyle: "Germans trust NUMBERS and METHODOLOGY. Show the exact process (21 phases), the confidence interval, the data sources. They buy when they understand HOW you know, not just WHAT you found.",
    signatureStyle: "Jean-Étienne\nGhost Tax · ghost-tax.com",
    maxWords: { linkedin: 130, email: 200 },
  },

  // ── German Startup (Berlin/Munich tech scene) ──
  DE_STARTUP: {
    language: "de",
    formality: "semi-formal",
    addressForm: "Sie",  // Still Sie unless their LinkedIn is very informal
    toneDescriptors: [
      "founder-to-founder",
      "direct, slightly informal",
      "can reference startup ecosystem",
      "fast-paced, no corporate padding",
    ],
    structurePreference: "Short hook with the most surprising finding. Then 2 data points. Then the link. No preamble.",
    tabooPatterns: [
      "corporate language",
      "lengthy introductions",
      "formulas like 'Sehr geehrte Damen und Herren'",
      "'solution' or 'Lösung'",
    ],
    persuasionStyle: "Startup CFOs value SPEED and ROI. '590€ vs 630€/day lost' is the argument. They buy on impulse if the data is convincing enough.",
    signatureStyle: "Jean-Étienne",
    maxWords: { linkedin: 110, email: 170 },
  },

  // ── Dutch ──
  NL: {
    language: "en",  // Dutch B2B is in English
    formality: "informal",
    addressForm: "you",
    toneDescriptors: [
      "ultra-direct, zero fluff",
      "get to the point in the first sentence",
      "Dutch hate wasted words",
      "pragmatic, value-focused",
      "matter-of-fact, no emotional manipulation",
    ],
    structurePreference: "First sentence = the number. Second sentence = the evidence. Third sentence = the offer. Done. The Dutch will respect brevity more than any other culture.",
    tabooPatterns: [
      "small talk",
      "compliments about their company",
      "lengthy explanations",
      "indirect language",
      "'I would like to' or 'perhaps'",
      "more than 3 sentences before the point",
    ],
    persuasionStyle: "The Dutch buy when they see PRACTICAL VALUE with MINIMAL EFFORT. '€490, 48h, zero integration' is perfect for Dutch pragmatism.",
    signatureStyle: "Jean-Étienne",
    maxWords: { linkedin: 90, email: 140 },
  },

  // ── British ──
  UK: {
    language: "en",
    formality: "semi-formal",
    addressForm: "you",
    toneDescriptors: [
      "polite but not servile",
      "understated confidence",
      "British understatement works: 'might be worth a look' > 'you MUST see this'",
      "factual with a touch of dry wit acceptable",
    ],
    structurePreference: "Open with a factual observation about their company. Present findings modestly ('we noticed...' not 'we discovered...'). Offer as 'might be useful' not 'you need this'.",
    tabooPatterns: [
      "aggressive sales language",
      "American-style enthusiasm",
      "overclaiming",
      "'reach out' or 'touch base'",
      "fake familiarity",
    ],
    persuasionStyle: "The British value UNDERSTATEMENT and COMPETENCE. Show you did your homework without boasting. They buy when they feel the vendor is quietly excellent, not loudly promotional.",
    signatureStyle: "Jean-Étienne\nGhost Tax",
    maxWords: { linkedin: 120, email: 180 },
  },

  // ── American ──
  US: {
    language: "en",
    formality: "informal",
    addressForm: "you",
    toneDescriptors: [
      "confident and benefit-driven",
      "ROI explicit and upfront",
      "storytelling works better than raw data",
      "social proof matters ('companies like yours')",
    ],
    structurePreference: "Lead with the BENEFIT (how much they save), not the finding (what we detected). Frame as opportunity, not problem. End with clear ROI math.",
    tabooPatterns: [
      "passive voice",
      "being too modest",
      "not mentioning the ROI explicitly",
    ],
    persuasionStyle: "Americans buy OUTCOMES. 'This pays for itself in 18 hours' is more powerful than 'we detected 320k EUR exposure'. They want to know what they GET, not just what's wrong.",
    signatureStyle: "Jean-Étienne\nFounder, Ghost Tax",
    maxWords: { linkedin: 120, email: 180 },
  },
};

// ── Profile Detection ──────────────────────────────

export function detectCulturalProfile(
  country: string,
  headcount?: number,
  industry?: string,
): CulturalProfile {
  const c = country.toUpperCase();

  if (c === "DE" || c === "AT") {
    // Detect Mittelstand vs Startup
    const isStartup = (headcount && headcount < 300) &&
      (industry && /tech|saas|software|fintech|ai/i.test(industry));
    return isStartup ? PROFILES.DE_STARTUP : PROFILES.DE_MITTELSTAND;
  }

  if (c === "CH") return PROFILES.DE_MITTELSTAND; // Swiss-German defaults formal
  if (c === "NL" || c === "BE") return PROFILES.NL;
  if (c === "UK" || c === "GB" || c === "IE") return PROFILES.UK;
  if (c === "US" || c === "CA" || c === "AU") return PROFILES.US;

  // Default: English, semi-formal
  return PROFILES.UK;
}

export function getProfileForPrompt(profile: CulturalProfile): string {
  return [
    `LANGUAGE: ${profile.language === "de" ? "German" : profile.language === "fr" ? "French" : "English"}`,
    `FORMALITY: ${profile.formality} (use "${profile.addressForm}")`,
    `TONE: ${profile.toneDescriptors.join("; ")}`,
    `STRUCTURE: ${profile.structurePreference}`,
    `NEVER: ${profile.tabooPatterns.join("; ")}`,
    `PERSUASION: ${profile.persuasionStyle}`,
    `SIGN OFF AS: ${profile.signatureStyle}`,
    `MAX WORDS: ${profile.maxWords.linkedin} (LinkedIn) / ${profile.maxWords.email} (email)`,
  ].join("\n");
}
