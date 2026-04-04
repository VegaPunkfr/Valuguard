/**
 * GHOST TAX — APOLLO INTELLIGENCE BOT
 *
 * Pas un simple filtre. Un AGENT avec 8 stratégies de chasse,
 * de la mémoire, et de l'apprentissage.
 *
 * Chaque stratégie attaque le marché sous un angle différent.
 * Le bot apprend quelle stratégie convertit et alloue
 * les crédits Apollo en conséquence.
 *
 * Rotation hebdomadaire :
 *   Lun : ICP Hunter (DE) — recherche classique ICP
 *   Mar : Signal Hunter (DE) — prospects avec intent data
 *   Mer : Event Hunter (DE) — nouveaux CFOs, funding, restructuring
 *   Jeu : Tech Stack Hunter (NL/UK) — gros consommateurs SaaS
 *   Ven : Re-engagement — relance des prospects froids avec nouveaux signaux
 */

// ── Types ──────────────────────────────────────────────────

export type HuntStrategy =
  | 'icp_hunter'          // Recherche ICP classique
  | 'signal_hunter'       // Intent data — ils CHERCHENT déjà
  | 'event_hunter'        // Job changes, funding, restructuring
  | 'tech_stack_hunter'   // Dense SaaS stack = high exposure
  | 'competitor_hunter'   // Utilisateurs de Zylo/Productiv/Torii
  | 'lookalike_hunter'    // Similaires aux clients existants
  | 'committee_mapper'    // Buying committee pour les HOT
  | 're_engagement';      // Relance avec nouveaux signaux

export interface HuntResult {
  strategy: HuntStrategy;
  prospects: ApolloProspect[];
  creditsUsed: number;
  searchParams: Record<string, unknown>;
  timestamp: string;
}

export interface ApolloProspect {
  firstName: string;
  lastName: string;
  title: string;
  email?: string;
  emailStatus?: string;
  linkedinUrl?: string;
  company: string;
  domain: string;
  country: string;
  headcount: number;
  industry: string;
  techStack: string[];
  fundingRound?: string;
  fundingDate?: string;
  intentStrength?: string;
  employeeGrowth6m?: number;
  score: number;
  strategy: HuntStrategy;
  timingSignal: string;
  timingUrgency: string;
  whyThisProspect: string;  // Explication humaine de pourquoi ce prospect
}

// ── Mémoire du bot ─────────────────────────────────────────

const BOT_MEMORY_KEY = 'gt-apollo-bot-memory';

interface BotMemory {
  totalHunts: number;
  totalProspectsFound: number;
  creditsUsedThisMonth: number;
  creditsResetDate: string;
  strategyStats: Record<HuntStrategy, {
    timesUsed: number;
    prospectsFound: number;
    prospectsContacted: number;
    replies: number;
    conversions: number;
    avgScore: number;
    replyRate: number;
  }>;
  domainsAlreadyHunted: string[];  // Ne pas chercher 2 fois le même domaine
  lastHuntByStrategy: Record<string, string>;  // ISO date
}

function loadBotMemory(): BotMemory {
  if (typeof window === 'undefined') return createEmptyMemory();
  try {
    const stored = localStorage.getItem(BOT_MEMORY_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return createEmptyMemory();
}

function saveBotMemory(memory: BotMemory): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(BOT_MEMORY_KEY, JSON.stringify(memory)); } catch {}
}

function createEmptyMemory(): BotMemory {
  const strategies: HuntStrategy[] = [
    'icp_hunter', 'signal_hunter', 'event_hunter', 'tech_stack_hunter',
    'competitor_hunter', 'lookalike_hunter', 'committee_mapper', 're_engagement',
  ];
  return {
    totalHunts: 0,
    totalProspectsFound: 0,
    creditsUsedThisMonth: 0,
    creditsResetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
    strategyStats: Object.fromEntries(strategies.map(s => [s, {
      timesUsed: 0, prospectsFound: 0, prospectsContacted: 0,
      replies: 0, conversions: 0, avgScore: 0, replyRate: 0,
    }])) as any,
    domainsAlreadyHunted: [],
    lastHuntByStrategy: {},
  };
}

// ── Sélection de stratégie ─────────────────────────────────

export function selectTodayStrategy(): HuntStrategy {
  const dow = new Date().getDay(); // 0=dim, 1=lun...
  const memory = loadBotMemory();

  // Rotation de base par jour
  const baseRotation: Record<number, HuntStrategy> = {
    1: 'icp_hunter',        // Lundi : ICP classique DE
    2: 'signal_hunter',     // Mardi : intent data DE
    3: 'event_hunter',      // Mercredi : job changes, funding DE
    4: 'tech_stack_hunter', // Jeudi : gros SaaS stack NL/UK
    5: 're_engagement',     // Vendredi : relance + analyse
  };

  const base = baseRotation[dow];
  if (!base) return 'icp_hunter'; // Week-end fallback

  // ADAPTATION : si une stratégie a un reply rate 2x meilleur,
  // on la substitue 30% du temps
  if (memory.totalHunts > 30) {
    const stats = Object.entries(memory.strategyStats)
      .filter(([_, s]) => s.timesUsed >= 5)
      .map(([name, s]) => ({ name: name as HuntStrategy, replyRate: s.replyRate }))
      .sort((a, b) => b.replyRate - a.replyRate);

    if (stats.length >= 2 && stats[0].replyRate > stats[1].replyRate * 2) {
      if (Math.random() < 0.3) return stats[0].name; // 30% du temps, utilise la meilleure
    }
  }

  return base;
}

// ── Paramètres de recherche par stratégie ───────────────────

export function buildSearchParams(strategy: HuntStrategy): {
  apolloParams: Record<string, unknown>;
  markets: string[];
  description: string;
} {
  switch (strategy) {
    case 'icp_hunter':
      return {
        markets: ['Germany'],
        description: 'Recherche ICP classique : CFO/CIO, 100-500 emp, tech/SaaS, Allemagne',
        apolloParams: {
          person_titles: ['CFO', 'Chief Financial Officer', 'CIO', 'Chief Information Officer'],
          organization_num_employees_ranges: ['101,500'],
          person_locations: ['Germany'],
          per_page: 15,
        },
      };

    case 'signal_hunter':
      return {
        markets: ['Germany'],
        description: 'Prospects avec signaux d\'intention ACTIFS — ils cherchent déjà',
        apolloParams: {
          person_titles: ['CFO', 'Chief Financial Officer', 'CIO', 'VP IT', 'VP Finance'],
          organization_num_employees_ranges: ['51,500'],
          person_locations: ['Germany'],
          // Apollo intent : companies actively researching relevant topics
          q_keywords: 'SaaS cost OR IT audit OR software spend OR FinOps OR cloud optimization',
          per_page: 15,
        },
      };

    case 'event_hunter':
      return {
        markets: ['Germany'],
        description: 'Événements récents : nouveau CFO, levée de fonds, restructuration',
        apolloParams: {
          person_titles: ['CFO', 'Chief Financial Officer', 'CIO'],
          organization_num_employees_ranges: ['51,1000'],
          person_locations: ['Germany'],
          // Priorité aux changements récents
          person_seniorities: ['c_suite', 'vp'],
          per_page: 15,
        },
      };

    case 'tech_stack_hunter':
      return {
        markets: ['Netherlands', 'United Kingdom'],
        description: 'Entreprises avec stack SaaS dense (NL/UK) = haute exposition',
        apolloParams: {
          person_titles: ['CFO', 'CIO', 'VP IT', 'IT Director', 'Head of IT'],
          organization_num_employees_ranges: ['101,500'],
          person_locations: ['Netherlands', 'United Kingdom'],
          // Filtre par tech stack dense
          q_organization_keyword_tags: ['SaaS', 'Cloud', 'AWS', 'Salesforce'],
          per_page: 15,
        },
      };

    case 'competitor_hunter':
      return {
        markets: ['Germany', 'Netherlands', 'United Kingdom'],
        description: 'Entreprises utilisant Zylo/Productiv/Torii — déjà conscientes du problème',
        apolloParams: {
          person_titles: ['CFO', 'CIO', 'VP IT', 'Head of Procurement'],
          organization_num_employees_ranges: ['201,1000'],
          // Cherche les utilisateurs de nos concurrents
          q_organization_keyword_tags: ['Zylo', 'Productiv', 'Torii', 'BetterCloud', 'Zluri'],
          per_page: 10,
        },
      };

    case 'lookalike_hunter':
      return {
        markets: ['Germany'],
        description: 'Entreprises similaires aux clients existants',
        apolloParams: {
          person_titles: ['CFO', 'Chief Financial Officer'],
          organization_num_employees_ranges: ['101,300'],
          person_locations: ['Germany'],
          // Même industrie que nos meilleurs clients
          q_organization_keyword_tags: ['SaaS', 'B2B', 'fintech'],
          per_page: 10,
        },
      };

    case 'committee_mapper':
      return {
        markets: ['Germany'],
        description: 'Mapping buying committee pour les prospects HOT (CFO + CIO + Procurement)',
        apolloParams: {
          // Sera rempli dynamiquement avec les domaines HOT
          person_titles: ['CFO', 'CIO', 'VP IT', 'Head of Procurement', 'Procurement Director'],
          per_page: 20,
        },
      };

    case 're_engagement':
      return {
        markets: ['Germany', 'Netherlands', 'United Kingdom'],
        description: 'Relance des prospects froids — nouveaux signaux détectés ?',
        apolloParams: {
          // Sera rempli dynamiquement avec les domaines froids
          person_titles: ['CFO', 'CIO'],
          per_page: 10,
        },
      };
  }
}

// ── Score un prospect selon sa stratégie ────────────────────

export function scoreProspect(person: any, strategy: HuntStrategy): {
  score: number;
  whyThisProspect: string;
} {
  let score = 0;
  const reasons: string[] = [];
  const org = person.organization || {};
  const title = (person.title || '').toLowerCase();
  const emp = org.estimated_num_employees || 0;

  // Base : titre
  if (/\bcfo\b|chief financial/i.test(title)) { score += 20; reasons.push('CFO — décideur budget'); }
  else if (/\bcio\b|chief information|cto/i.test(title)) { score += 18; reasons.push('CIO — décideur IT'); }
  else if (/\bvp\b/i.test(title)) { score += 15; reasons.push('VP — influence directe'); }
  else { score += 8; reasons.push('Director level'); }

  // Taille
  if (emp >= 100 && emp <= 500) { score += 15; reasons.push(`${emp} emp = sweet spot ICP`); }
  else if (emp > 500) { score += 10; reasons.push(`${emp} emp = enterprise`); }

  // Email
  if (person.email && person.email_status === 'verified') { score += 10; reasons.push('Email vérifié'); }

  // Bonus par stratégie
  switch (strategy) {
    case 'signal_hunter':
      if (person.intent_strength === 'high') { score += 25; reasons.push('🔥 Intent HIGH — cherche activement'); }
      else if (person.intent_strength === 'medium') { score += 15; reasons.push('Intent medium'); }
      break;

    case 'event_hunter':
      if (person.employment_history?.[0]?.start_date) {
        const months = (Date.now() - new Date(person.employment_history[0].start_date).getTime()) / (1000*60*60*24*30);
        if (months < 6) { score += 25; reasons.push(`🆕 Nouveau en poste (${Math.round(months)}m) — fenêtre 90j`); }
      }
      if (org.latest_funding_round_date) {
        const months = (Date.now() - new Date(org.latest_funding_round_date).getTime()) / (1000*60*60*24*30);
        if (months < 12) { score += 15; reasons.push(`💰 Funding il y a ${Math.round(months)}m`); }
      }
      break;

    case 'tech_stack_hunter':
      const techCount = (org.technology_names || []).length;
      if (techCount >= 20) { score += 25; reasons.push(`🔧 ${techCount} outils SaaS = haute exposition`); }
      else if (techCount >= 10) { score += 15; reasons.push(`${techCount} outils SaaS`); }
      break;

    case 'competitor_hunter':
      const techs = (org.technology_names || []).map((t: string) => t.toLowerCase());
      if (techs.some((t: string) => /zylo|productiv|torii|bettercloud/i.test(t))) {
        score += 25; reasons.push('🎯 Utilise un concurrent — déjà conscient du problème');
      }
      break;
  }

  // Industry bonus
  const industry = (org.industry || '').toLowerCase();
  if (/software|saas|tech|fintech|cloud/i.test(industry)) { score += 10; reasons.push('Industrie tech/SaaS'); }

  // Growth
  if (org.estimated_num_employees_growth_6m > 15) { score += 10; reasons.push(`📈 Croissance +${org.estimated_num_employees_growth_6m}% en 6m`); }

  return {
    score: Math.min(score, 100),
    whyThisProspect: reasons.join(' · '),
  };
}

// ── Détecte le timing signal ────────────────────────────────

export function detectTimingFromApollo(person: any): { signal: string; urgency: string } {
  const org = person.organization || {};

  if (person.intent_strength === 'high') return { signal: 'active_research', urgency: 'critical' };

  if (person.employment_history?.[0]?.start_date) {
    const months = (Date.now() - new Date(person.employment_history[0].start_date).getTime()) / (1000*60*60*24*30);
    if (months < 6) return { signal: 'new_executive', urgency: 'critical' };
  }

  if (org.latest_funding_round_date) {
    const months = (Date.now() - new Date(org.latest_funding_round_date).getTime()) / (1000*60*60*24*30);
    if (months < 6) return { signal: 'post_funding', urgency: 'high' };
  }

  if (org.estimated_num_employees_growth_6m > 20) return { signal: 'rapid_growth', urgency: 'high' };

  return { signal: 'general_fit', urgency: 'medium' };
}

// ── Le bot construit le résultat ────────────────────────────

export function processApolloResults(
  people: any[],
  strategy: HuntStrategy,
  memory: BotMemory,
): ApolloProspect[] {
  return people
    .map(person => {
      const org = person.organization || {};
      const domain = org.primary_domain || '';

      // Skip si déjà chassé
      if (memory.domainsAlreadyHunted.includes(domain)) return null;

      const { score, whyThisProspect } = scoreProspect(person, strategy);
      const timing = detectTimingFromApollo(person);

      // Ne garder que les 50+
      if (score < 50) return null;

      const country = (person.country || '').includes('Germany') ? 'DE'
        : (person.country || '').includes('Netherlands') ? 'NL'
        : (person.country || '').includes('United Kingdom') ? 'UK' : 'DE';

      return {
        firstName: person.first_name || '',
        lastName: person.last_name || '',
        title: person.title || '',
        email: person.email || undefined,
        emailStatus: person.email_status || undefined,
        linkedinUrl: person.linkedin_url || undefined,
        company: org.name || domain,
        domain,
        country,
        headcount: org.estimated_num_employees || 0,
        industry: org.industry || 'Technology',
        techStack: (org.technology_names || []).slice(0, 10),
        fundingRound: org.latest_funding_stage || undefined,
        fundingDate: org.latest_funding_round_date || undefined,
        intentStrength: person.intent_strength || undefined,
        employeeGrowth6m: org.estimated_num_employees_growth_6m || undefined,
        score,
        strategy,
        timingSignal: timing.signal,
        timingUrgency: timing.urgency,
        whyThisProspect,
      } as ApolloProspect;
    })
    .filter(Boolean)
    .sort((a, b) => (b?.score || 0) - (a?.score || 0))
    .slice(0, 5) as ApolloProspect[];
}

// ── Met à jour la mémoire après une chasse ──────────────────

export function updateBotMemory(
  strategy: HuntStrategy,
  prospects: ApolloProspect[],
  creditsUsed: number,
): void {
  const memory = loadBotMemory();

  memory.totalHunts++;
  memory.totalProspectsFound += prospects.length;
  memory.creditsUsedThisMonth += creditsUsed;

  // Stats par stratégie
  const stats = memory.strategyStats[strategy];
  if (stats) {
    stats.timesUsed++;
    stats.prospectsFound += prospects.length;
    stats.avgScore = prospects.length > 0
      ? Math.round((stats.avgScore * (stats.prospectsFound - prospects.length) + prospects.reduce((s, p) => s + p.score, 0)) / stats.prospectsFound)
      : stats.avgScore;
  }

  // Marquer les domaines comme chassés
  for (const p of prospects) {
    if (p.domain && !memory.domainsAlreadyHunted.includes(p.domain)) {
      memory.domainsAlreadyHunted.push(p.domain);
    }
  }

  // Garder max 500 domaines en mémoire
  if (memory.domainsAlreadyHunted.length > 500) {
    memory.domainsAlreadyHunted = memory.domainsAlreadyHunted.slice(-500);
  }

  memory.lastHuntByStrategy[strategy] = new Date().toISOString();

  saveBotMemory(memory);
}

// ── Enregistre une réponse pour l'apprentissage ─────────────

export function recordBotOutcome(
  strategy: HuntStrategy,
  outcome: 'contacted' | 'replied' | 'converted',
): void {
  const memory = loadBotMemory();
  const stats = memory.strategyStats[strategy];
  if (!stats) return;

  if (outcome === 'contacted') stats.prospectsContacted++;
  if (outcome === 'replied') { stats.replies++; stats.prospectsContacted = Math.max(stats.prospectsContacted, stats.replies); }
  if (outcome === 'converted') { stats.conversions++; }

  // Recalculer le reply rate
  stats.replyRate = stats.prospectsContacted > 0
    ? Math.round((stats.replies / stats.prospectsContacted) * 100)
    : 0;

  saveBotMemory(memory);
}

// ── Dashboard du bot ────────────────────────────────────────

export function getBotDashboard(): {
  totalHunts: number;
  totalProspectsFound: number;
  creditsUsedThisMonth: number;
  creditsRemaining: number;
  bestStrategy: { name: string; replyRate: number } | null;
  worstStrategy: { name: string; replyRate: number } | null;
  strategyBreakdown: Array<{ name: string; used: number; found: number; replyRate: number }>;
  domainsHunted: number;
  todayStrategy: HuntStrategy;
  todayDescription: string;
} {
  const memory = loadBotMemory();
  const todayStrategy = selectTodayStrategy();
  const { description } = buildSearchParams(todayStrategy);

  const breakdown = Object.entries(memory.strategyStats)
    .filter(([_, s]) => s.timesUsed > 0)
    .map(([name, s]) => ({ name, used: s.timesUsed, found: s.prospectsFound, replyRate: s.replyRate }))
    .sort((a, b) => b.replyRate - a.replyRate);

  return {
    totalHunts: memory.totalHunts,
    totalProspectsFound: memory.totalProspectsFound,
    creditsUsedThisMonth: memory.creditsUsedThisMonth,
    creditsRemaining: 416 - memory.creditsUsedThisMonth, // 5000/an ≈ 416/mois
    bestStrategy: breakdown.length > 0 ? { name: breakdown[0].name, replyRate: breakdown[0].replyRate } : null,
    worstStrategy: breakdown.length > 1 ? { name: breakdown[breakdown.length - 1].name, replyRate: breakdown[breakdown.length - 1].replyRate } : null,
    strategyBreakdown: breakdown,
    domainsHunted: memory.domainsAlreadyHunted.length,
    todayStrategy,
    todayDescription: description,
  };
}
