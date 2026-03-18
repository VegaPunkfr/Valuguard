/**
 * GHOST TAX — LINKEDIN CONTENT ENGINE
 *
 * Generates daily LinkedIn posts for Hélène's profile.
 * Goal: Position Ghost Tax as the authority on hidden IT cost exposure.
 *
 * Content pillars:
 *   1. IT Cost Leak of the Week — specific, data-backed micro-insight
 *   2. CFO Reality Check — counterintuitive financial observation
 *   3. Ghost Tax Signal — real market signal (anonymized) from our pipeline
 *   4. Industry Benchmark — stat + interpretation
 *   5. Founder POV — Hélène's perspective on SaaS waste
 *
 * Rules:
 *   - "Ghost Tax" = brand name, NEVER translated
 *   - No salesy CTA — value-first, authority-building
 *   - Max 1300 chars (LinkedIn optimal)
 *   - 1 post/day, alternating pillars
 *   - Bilingual: EN for global reach, occasional FR/DE for geo targeting
 *   - Numbers > opinions. Specific > generic.
 *   - End with question to drive engagement
 */

// ── Types ────────────────────────────────────────────────────

export type ContentPillar =
  | 'cost_leak'        // IT Cost Leak of the Week
  | 'cfo_reality'      // CFO Reality Check
  | 'ghost_signal'     // Ghost Tax Signal (anonymized)
  | 'benchmark'        // Industry Benchmark
  | 'founder_pov';     // Founder POV

export type PostLocale = 'en' | 'fr' | 'de';

export interface LinkedInPost {
  id: string;
  pillar: ContentPillar;
  locale: PostLocale;
  body: string;
  charCount: number;
  hashtags: string[];
  scheduledFor?: string;
  postedAt?: string;
  status: 'draft' | 'scheduled' | 'posted' | 'rejected';
  engagement?: { likes: number; comments: number; reposts: number; impressions: number };
}

// ── Pillar Templates ─────────────────────────────────────────

const PILLAR_META: Record<ContentPillar, { label: string; emoji: string; frequency: number }> = {
  cost_leak:    { label: 'IT Cost Leak of the Week', emoji: '💸', frequency: 2 },
  cfo_reality:  { label: 'CFO Reality Check',        emoji: '📊', frequency: 1 },
  ghost_signal: { label: 'Ghost Tax Signal',          emoji: '📡', frequency: 1 },
  benchmark:    { label: 'Industry Benchmark',        emoji: '📈', frequency: 1 },
  founder_pov:  { label: 'Founder POV',               emoji: '💡', frequency: 1 },
};

// ── Post Library — Ready-to-use content ──────────────────────

const POST_TEMPLATES: Array<{
  pillar: ContentPillar;
  locale: PostLocale;
  body: string;
  hashtags: string[];
}> = [
  // ── Cost Leak of the Week ──────────────────────────────
  {
    pillar: 'cost_leak',
    locale: 'en',
    body: `The average B2B company with 200+ employees has 12-18 SaaS tools that nobody uses anymore.

Not "underused." Not "occasionally needed." Completely abandoned.

These zombie licenses auto-renew every year because:
→ The person who signed them left
→ The team migrated to a different tool
→ Nobody knows who owns the contract

Typical cost: 15-25% of total SaaS spend. For a 300-person company, that's 80K-200K EUR/year. Silently bleeding.

The fix takes 48 hours. The hard part is knowing where to look.

How many tools does your company pay for that nobody opened this quarter?`,
    hashtags: ['GhostTax', 'SaaSWaste', 'CFO', 'ITCosts', 'FinOps'],
  },
  {
    pillar: 'cost_leak',
    locale: 'en',
    body: `After every restructuring, headcount drops.

Software contracts don't.

I've seen companies reduce staff by 30% and keep 100% of their SaaS licenses running for 6-12 months after.

The finance team is busy managing the restructuring. Nobody thinks about the 47 tools that now serve fewer people at the same price.

This isn't negligence. It's a structural blind spot.

Annual contracts + annual budget cycles + no central owner = guaranteed waste.

If your company restructured in the last 12 months, when was the last time someone audited the software stack?`,
    hashtags: ['GhostTax', 'Restructuring', 'SaaSCosts', 'CFO', 'CostOptimization'],
  },
  {
    pillar: 'cost_leak',
    locale: 'de',
    body: `Nach jeder Restrukturierung sinkt die Mitarbeiterzahl.

Die Softwareverträge nicht.

Ich habe Unternehmen gesehen, die 30% der Belegschaft abbauen — und 100% der SaaS-Lizenzen 6-12 Monate weiterlaufen lassen.

Das Finanzteam ist mit der Restrukturierung beschäftigt. Niemand denkt an die 47 Tools, die jetzt weniger Nutzer zu gleichen Kosten bedienen.

Das ist keine Fahrlässigkeit. Das ist ein struktureller blinder Fleck.

Jahresverträge + jährliche Budgetzyklen + kein zentraler Verantwortlicher = garantierte Verschwendung.

Wann hat zuletzt jemand den Software-Stack Ihres Unternehmens geprüft?`,
    hashtags: ['GhostTax', 'SaaSKosten', 'CFO', 'Restrukturierung', 'FinOps'],
  },
  {
    pillar: 'cost_leak',
    locale: 'fr',
    body: `Après chaque restructuration, les effectifs baissent.

Les contrats logiciels, non.

J'ai vu des entreprises réduire leurs équipes de 30% — et garder 100% de leurs licences SaaS actives pendant 6 à 12 mois.

L'équipe finance gère la restructuration. Personne ne pense aux 47 outils qui servent désormais moins d'utilisateurs au même prix.

Ce n'est pas de la négligence. C'est un angle mort structurel.

Contrats annuels + cycles budgétaires annuels + pas de responsable central = gaspillage garanti.

Quand quelqu'un a-t-il vérifié le stack logiciel de votre entreprise pour la dernière fois ?`,
    hashtags: ['GhostTax', 'CoutsIT', 'CFO', 'SaaS', 'Restructuration'],
  },

  // ── CFO Reality Check ──────────────────────────────────
  {
    pillar: 'cfo_reality',
    locale: 'en',
    body: `Unpopular opinion: Most CFOs don't know their real software spend.

Not because they're bad at their job. Because the data doesn't exist in one place.

→ Engineering buys tools on corporate cards
→ Marketing signs annual contracts independently
→ IT manages some licenses but not all
→ Departments expense SaaS through different cost centers

The CFO sees total IT spend in the P&L. But the breakdown? The per-seat economics? The overlap between tools?

That's scattered across 4-7 systems that don't talk to each other.

This is why external scans find 12-20% waste that internal teams miss. Fresh eyes + structured methodology > institutional knowledge.

What's the one line item in your IT budget you'd love to audit but never have time for?`,
    hashtags: ['GhostTax', 'CFO', 'SaaSSpend', 'FinanceLeadership', 'CostVisibility'],
  },
  {
    pillar: 'cfo_reality',
    locale: 'en',
    body: `The most expensive software your company uses isn't the one with the biggest contract.

It's the one nobody evaluates at renewal.

Auto-renewal clauses are designed to exploit inertia. The vendor knows you'll forget. The contract renews. The price stays (or goes up 5-8%).

In 200+ analyses, I've never seen a company where every SaaS contract was actively evaluated before renewal.

Not once.

The companies that save the most aren't the ones that negotiate hardest. They're the ones that remember to negotiate at all.

Do you know which contracts auto-renew in the next 90 days?`,
    hashtags: ['GhostTax', 'SaaS', 'ContractManagement', 'CFO', 'Procurement'],
  },

  // ── Ghost Tax Signal ───────────────────────────────────
  {
    pillar: 'ghost_signal',
    locale: 'en',
    body: `Ghost Tax Signal — March 2026

What we're seeing across European B2B companies right now:

→ AI tool adoption is up 340% YoY. AI spend governance is up 12%.
→ Average company has 3.7 AI tools. 1.2 of them overlap in functionality.
→ 67% of AI subscriptions were signed by individual contributors, not IT.

Translation: companies are accumulating AI costs faster than any category in history, with less oversight than any category in history.

This is the next wave of ghost spend. Not SaaS licenses from 2019. AI tools signed in 2025 that nobody tracks.

The companies that audit this now will save 6-figure sums. The ones that wait will have a much harder conversation with the board in 12 months.

Is anyone in your org tracking AI tool spend centrally?`,
    hashtags: ['GhostTax', 'AISpend', 'ShadowAI', 'CFO', 'AIGovernance'],
  },
  {
    pillar: 'ghost_signal',
    locale: 'fr',
    body: `Ghost Tax Signal — Mars 2026

Ce qu'on observe en ce moment dans les entreprises B2B européennes :

→ L'adoption d'outils IA a augmenté de 340% sur un an. La gouvernance des dépenses IA : +12%.
→ L'entreprise moyenne a 3,7 outils IA. 1,2 d'entre eux font la même chose.
→ 67% des abonnements IA ont été signés par des contributeurs individuels, pas par l'IT.

Traduction : les entreprises accumulent des coûts IA plus vite que n'importe quelle catégorie dans l'histoire, avec moins de contrôle que n'importe quelle catégorie dans l'histoire.

C'est la prochaine vague de dépenses fantômes. Pas les licences SaaS de 2019. Les outils IA signés en 2025 que personne ne suit.

Quelqu'un dans votre organisation suit-il les dépenses en outils IA de manière centralisée ?`,
    hashtags: ['GhostTax', 'DepensesIA', 'ShadowAI', 'CFO', 'GouvernanceIA'],
  },

  // ── Industry Benchmark ─────────────────────────────────
  {
    pillar: 'benchmark',
    locale: 'en',
    body: `B2B SaaS Spend Benchmark — 2026 data

Companies with 200-500 employees:
→ Median SaaS spend: €840/employee/year
→ Top quartile: €1,200+/employee/year
→ Bottom quartile: €520/employee/year

The gap between top and bottom quartile is 2.3x.

That's not because efficient companies use fewer tools. It's because inefficient companies pay for the same capability 2-3 times across different tools.

The #1 overlap we detect: project management (Asana + Monday + Jira + Notion — all four in the same company, different teams).

#2: Communication (Slack + Teams + both paying enterprise tier).

#3: Cloud storage (Google Drive + Dropbox + OneDrive + SharePoint).

Where does your company sit on this curve?`,
    hashtags: ['GhostTax', 'SaaSBenchmark', 'ITSpend', 'CFO', 'B2B'],
  },

  // ── Founder POV ────────────────────────────────────────
  {
    pillar: 'founder_pov',
    locale: 'en',
    body: `I built Ghost Tax because I kept seeing the same pattern.

Smart companies. Experienced CFOs. Solid finance teams.

And 15-25% of their software budget going to tools that nobody uses, contracts that nobody reviews, and overlaps that nobody sees.

Not because they're careless. Because the system is designed to hide this.

→ Vendors optimize for auto-renewal
→ Departments buy independently
→ Nobody owns the full picture
→ Annual budget cycles mean waste compounds for 12 months before anyone looks

Ghost Tax doesn't sell software. We deliver a 48-hour diagnostic that shows exactly where the money goes.

If the numbers are meaningful, we talk. If not, you've lost nothing.

That's it. No demo. No 6-month implementation. No annual contract.

Just clarity.`,
    hashtags: ['GhostTax', 'Founder', 'SaaS', 'CFO', 'Startup'],
  },
  {
    pillar: 'founder_pov',
    locale: 'fr',
    body: `J'ai créé Ghost Tax parce que je voyais toujours le même schéma.

Des entreprises intelligentes. Des CFOs expérimentés. Des équipes finance solides.

Et 15 à 25% de leur budget logiciel qui part dans des outils que personne n'utilise, des contrats que personne ne revoit, et des doublons que personne ne voit.

Pas par négligence. Parce que le système est conçu pour cacher ça.

→ Les éditeurs optimisent pour le renouvellement automatique
→ Les départements achètent indépendamment
→ Personne n'a la vue d'ensemble
→ Les cycles budgétaires annuels font que le gaspillage s'accumule 12 mois avant que quelqu'un ne regarde

Ghost Tax ne vend pas de logiciel. On livre un diagnostic en 48h qui montre exactement où va l'argent.

Si les chiffres sont significatifs, on en parle. Sinon, vous n'avez rien perdu.

C'est tout. Pas de démo. Pas d'implémentation de 6 mois. Pas de contrat annuel.

Juste de la clarté.`,
    hashtags: ['GhostTax', 'Fondatrice', 'SaaS', 'CFO', 'Startup'],
  },
];

// ── Content Selection ────────────────────────────────────────

function uid(): string {
  return `lp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Pick the next post based on pillar rotation and locale preference.
 * Avoids repeating the same pillar two days in a row.
 */
export function selectNextPost(
  previousPillar?: ContentPillar,
  preferredLocale: PostLocale = 'en',
): LinkedInPost {
  // Filter by locale preference (80% preferred, 20% other for variety)
  const usePreferred = Math.random() < 0.8;
  let candidates = POST_TEMPLATES.filter(t =>
    usePreferred ? t.locale === preferredLocale : t.locale !== preferredLocale
  );

  // Avoid same pillar as last post
  if (previousPillar) {
    const filtered = candidates.filter(t => t.pillar !== previousPillar);
    if (filtered.length > 0) candidates = filtered;
  }

  // Fallback to all templates if too restrictive
  if (candidates.length === 0) candidates = POST_TEMPLATES;

  // Random selection
  const template = candidates[Math.floor(Math.random() * candidates.length)];

  return {
    id: uid(),
    pillar: template.pillar,
    locale: template.locale,
    body: template.body,
    charCount: template.body.length,
    hashtags: template.hashtags,
    status: 'draft',
  };
}

/**
 * Get all posts for a given pillar (for review/editing).
 */
export function getPostsByPillar(pillar: ContentPillar): typeof POST_TEMPLATES {
  return POST_TEMPLATES.filter(t => t.pillar === pillar);
}

/**
 * Format post body with hashtags for LinkedIn.
 */
export function formatForLinkedIn(post: LinkedInPost): string {
  const tags = post.hashtags.map(h => `#${h}`).join(' ');
  return `${post.body}\n\n${tags}`;
}

/**
 * Get weekly content calendar (7 posts, rotating pillars).
 */
export function generateWeeklyCalendar(
  startDate: Date = new Date(),
  preferredLocale: PostLocale = 'en',
): LinkedInPost[] {
  const calendar: LinkedInPost[] = [];
  let lastPillar: ContentPillar | undefined;

  for (let i = 0; i < 7; i++) {
    const post = selectNextPost(lastPillar, preferredLocale);
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    date.setHours(8, 30, 0, 0); // Post at 8:30 AM

    post.scheduledFor = date.toISOString();
    calendar.push(post);
    lastPillar = post.pillar;
  }

  return calendar;
}

export { PILLAR_META, POST_TEMPLATES };
