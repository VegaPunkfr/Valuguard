/**
 * GHOST TAX — Design Tokens v1.0
 *
 * Signés le 19 avril 2026 par Claude Opus 4.7 (Fellow product/design lead mandat).
 * Source : docs/doctrine/GHOST-TAX-DOCTRINE.md
 *
 * Cette palette est OPPOSABLE. Aucune valeur ne peut être ajoutée, modifiée ou
 * substituée sans révision explicite d'Edith ET mise à jour de la doctrine.
 *
 * Règles non négociables :
 *   - Palette restreinte à 5 valeurs sémantiques (paper / ink / ink-atten / accent / hairline)
 *   - Typographie : 1 serif + 1 mono, jamais les deux serif, jamais les deux sans-serif
 *   - Border-radius : 0 ou 2 px exclusivement
 *   - Aucun shadow, aucun gradient, aucun blur
 *   - Spacing asymétrique imposé par le contenu, pas par grid mécanique
 *
 * v1 POST-moodboard + matrice typographique : valeurs figées provisoires.
 * v2 sera figée après F-4 (moodboard) + F-5 (matrice typo).
 */

// ══════════════════════════════════════════════════════════════════════
// PALETTE — 5 valeurs sémantiques uniquement
// ══════════════════════════════════════════════════════════════════════

/**
 * Site public (registre : archive de cabinet d'expertise publiée).
 * Fond papier archival chaud, encre profonde non-noire, accent rare notarial.
 */
export const paletteSitePublic = {
  paper:      "#F4EFE4",  // Fond unique, chaud archival
  ink:        "#14120F",  // Encre corps et titres, profond sans être noir pur
  inkAtten:   "#4A4238",  // Encre atténuée pour métadonnées, dateline, source
  accent:     "#8B1E13",  // Rouge-sang notarial, RARE (max 3 occurrences/page)
  hairline:   "#C9BFA9",  // Filet 0.5 px, séparation blocs sans container
} as const;

/**
 * Cockpit (registre : atelier de l'expert en activité).
 * Palette INVERSÉE. Fond charbon mat, encre crème archivale, ambre opératoire rare.
 */
export const paletteCockpit = {
  charcoal:   "#0B0A08",  // Fond unique, charbon mat (pas noir pur #000)
  cream:      "#E6DFC9",  // Encre primaire crème archivale
  creamAtten: "#8A8474",  // Encre atténuée (labels, timestamps)
  amber:      "#D19733",  // Accent opératoire RARE (alerte, confiance faible)
  greenOk:    "#5C7A4A",  // État validé, signature acceptée
  redAlert:   "#B2453A",  // État erreur, blocage
  hairline:   "#2A2620",  // Filet sombre panel separator
} as const;

// ══════════════════════════════════════════════════════════════════════
// TYPOGRAPHIE — 2 familles maximum
// ══════════════════════════════════════════════════════════════════════

/**
 * Site public.
 * Serif : EB Garamond (candidat v1, libre Google Fonts — décision finale
 * après F-5 matrice 3 spécimens côte à côte avec Source Serif 4 et Spectral).
 * Mono : IBM Plex Mono (libre, approuvé IBM, tabular-nums natif).
 */
export const typographyPublic = {
  serif:      "'EB Garamond', 'Source Serif 4', Georgia, serif",
  mono:       "'IBM Plex Mono', 'JetBrains Mono', ui-monospace, monospace",
} as const;

/**
 * Cockpit.
 * Monotypographie stricte : une seule famille mono, aucune serif.
 */
export const typographyCockpit = {
  mono:       "'IBM Plex Mono', ui-monospace, monospace",
} as const;

// ══════════════════════════════════════════════════════════════════════
// ÉCHELLE TYPOGRAPHIQUE
// ══════════════════════════════════════════════════════════════════════

/**
 * Progression irrégulière anti-Perfect-Fifth.
 * Valeurs : 11 / 13 / 16 / 20 / 28 / 40 / 64 (px).
 * Ratio non uniforme pour éviter la régularité SaaS.
 * 11 : labels mono uppercase tracking 0.14em
 * 13 : body mono tabular, notes
 * 16 : body serif corps lecture
 * 20 : sous-titres, lead paragraphs
 * 28 : titres de section
 * 40 : titres de pièce
 * 64 : titres hero + numéros de cote monumentaux
 */
export const typeScale = {
  t11: "11px",
  t13: "13px",
  t16: "16px",
  t20: "20px",
  t28: "28px",
  t40: "40px",
  t64: "64px",
} as const;

/** Line-heights différenciés par fonction */
export const lineHeights = {
  tightDisplay: 1.05,   // Titres hero, cotes monumentales
  tightTitle:   1.15,   // Titres de section
  medium:       1.35,   // Lead paragraphs
  reading:      1.55,   // Body serif reading column
  monoData:     1.4,    // Tabular mono
} as const;

/** Weights autorisés */
export const weights = {
  regular:  400,
  medium:   500,
  bold:     700,
} as const;

/** Tracking (letter-spacing) */
export const tracking = {
  labelMono: "0.14em",    // Labels mono uppercase
  display:   "-0.01em",   // Titres serif, légère compression
  body:      "0",         // Body, valeur neutre
} as const;

// ══════════════════════════════════════════════════════════════════════
// RYTHME SPATIAL — spacing asymétrique
// ══════════════════════════════════════════════════════════════════════

/**
 * Valeurs 4 / 8 / 16 / 24 / 40 / 72 / 112 / 160.
 * Progression Fibonacci-like IRRÉGULIÈRE.
 * Usage : le designer choisit l'espacement selon le poids du contenu adjacent,
 * pas selon une grid mécanique.
 */
export const spacing = {
  s4:   "4px",
  s8:   "8px",
  s16:  "16px",
  s24:  "24px",
  s40:  "40px",
  s72:  "72px",
  s112: "112px",
  s160: "160px",
} as const;

// ══════════════════════════════════════════════════════════════════════
// RADII — 0 ou 2 px, jamais plus
// ══════════════════════════════════════════════════════════════════════

/**
 * Règle doctrinale : border-radius ∈ {0, 2}.
 * Le 2 px est réservé aux inputs de formulaire.
 * Tout le reste : 0.
 */
export const radius = {
  none:   "0",
  input:  "2px",  // UNIQUEMENT sur <input>, <textarea>, <select>
} as const;

// ══════════════════════════════════════════════════════════════════════
// FILETS (hairlines) — 0.5 px, les seules lignes séparatrices autorisées
// ══════════════════════════════════════════════════════════════════════

export const hairline = {
  width:    "0.5px",
  public:   paletteSitePublic.hairline,
  cockpit:  paletteCockpit.hairline,
} as const;

// ══════════════════════════════════════════════════════════════════════
// READING COLUMN — largeurs maximales pour confort de lecture
// ══════════════════════════════════════════════════════════════════════

/**
 * Largeurs de colonne de lecture par surface.
 * Les 62-72 caractères par ligne sont l'optimum éditorial pour serif.
 */
export const readingColumn = {
  body:     "680px",   // Lead paragraphs, body reading
  dense:    "820px",   // Tableaux et blocs serrés
  narrow:   "520px",   // Commande d'expertise (formulaire intake)
} as const;

// ══════════════════════════════════════════════════════════════════════
// INVARIANTS — ce qui ne change PAS entre locales
// ══════════════════════════════════════════════════════════════════════

export const invariantsI18n = [
  "palette",
  "typography families",
  "hairlines",
  "weight hierarchy",
  "cote documentaire (Pièce Nº)",
  "dateline format (signée le + version + hash)",
  "signature expert en bas de page",
  "interdits lexicaux (platform, SaaS, transform, ...)",
  "interdits formels (cards, gradients, CTA filled, ...)",
] as const;

// ══════════════════════════════════════════════════════════════════════
// INTERDITS ENCODÉS — à importer par validators runtime
// ══════════════════════════════════════════════════════════════════════

export const forbiddenLexical = [
  "platform", "plateforme", "SaaS", "solution", "tool", "outil", "app",
  "AI-powered", "intelligent", "seamless", "transform your",
  "unlock", "game-changing", "revolutionary", "incredible",
] as const;

export const forbiddenVisual = {
  borderRadiusMaxPx:   2,
  gradients:           false,
  backdropFilter:      false,
  liftOnHover:         false,
  featureGrid:         false,
  tierPricingCards:    false,
  trustLogoStrip:      false,
  filledColoredCTA:    false,
  emoji:               false,
  exclamationEndOfSentence: false,
} as const;

// ══════════════════════════════════════════════════════════════════════
// META
// ══════════════════════════════════════════════════════════════════════

export const doctrineMeta = {
  version:           "1.0",
  signedAt:          "2026-04-19",
  signedBy:          "Claude Opus 4.7 (Fellow mandat)",
  nextRevision:      "Post F-4 moodboard + F-5 matrice typographique",
  opposableDoc:      "docs/doctrine/GHOST-TAX-DOCTRINE.md",
  enforcedBySkill:   ".claude/skills/ghost-tax-doctrine/SKILL.md",
} as const;
