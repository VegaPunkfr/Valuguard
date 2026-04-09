# GHOST TAX — Architecture Multi-Agents Outreach
## Remplacement du Pipeline de Messages Génériques

**Version**: 1.0 | **Date**: 2026-04-06 | **Statut**: Design Document

---

## 1. DIAGNOSTIC DU SYSTÈME ACTUEL

### Le flux actuel

```
Cockpit → POST /api/intel (scan 21 phases NDJSON)
       → Parse NDJSON côté client → extraire exposure/signals
       → POST /api/command/generate-message (Claude Haiku, 1 seul appel)
       → Afficher message
```

### 4 causes racines des messages génériques

**Cause #1 — Données scan PERDUES en transit.** Le parsing NDJSON ne capture que `parsed.phase === 'complete' || parsed.exposureLow`. Or l'exposition est dans la phase `exposure`, les signaux dans `proof`, le contexte dans `context`. Le cockpit ne capture JAMAIS ces phases → `scan: undefined`.

**Cause #2 — Zéro mémoire.** Le générateur reçoit un prospect en isolation. Pas d'historique, pas de pgvector, pas de buying committees.

**Cause #3 — Un seul LLM call, aucun contrôle qualité.** Haiku génère et on envoie. Personne ne vérifie.

**Cause #4 — pgvector ignoré.** `lib/vectors.ts` stocke company_profiles, financial_signals, audit_cases, remediation_patterns. Le générateur ne les interroge JAMAIS.

### Chiffrage de l'impact

| Métrique | Actuel (estimé) | Cible V2 |
|----------|-----------------|----------|
| Messages avec données spécifiques | ~15% | >90% |
| Taux de réponse cold email | ~1-2% | 5-8% |
| Messages rejetés par QA | 0% (pas de QA) | 30-40% (rejet → réécriture) |
| Temps de génération | ~2s | ~6-8s |

---

## 2. ARCHITECTURE CIBLE

```
┌─────────────────────────────────────────────────────────────────┐
│                    OUTREACH INTELLIGENCE ROOM                    │
│                                                                  │
│  ┌─────────────────┐   ┌─────────────────┐   ┌──────────────┐  │
│  │ AGENT CHERCHEUR  │──>│ AGENT RÉDACTEUR  │──>│AGENT CRITIQUE│  │
│  │    (RAG+Intel)   │   │   (Composition)  │   │  (QA Gate)   │  │
│  └────────┬────────┘   └────────┬────────┘   └──────┬───────┘  │
│           │                     │                     │          │
│     pgvector query        Claude Sonnet          Rejection?     │
│     + scan_results        structured output      — OUI —> ↺    │
│     + outreach_memory     + données Chercheur    — NON —> OK   │
│     + osint_prospects                                           │
│     + buying_committees                                         │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              MÉMOIRE COGNITIVE (Supabase)                   │  │
│  │  Long-terme:  outreach_memory + vg_vectors + scan_results  │  │
│  │  Court-terme: Contexte in-pipeline (JSON agent→agent)      │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Design pattern** : Pipeline TypeScript pur, identique au pattern `lib/agents/orchestrator.ts` existant. Chaque agent = fonction async qui reçoit le contexte des agents précédents.

---

## 3. AGENT CHERCHEUR (RAG + Intel)

### Mission
Assembler TOUTES les données disponibles sur un prospect. **Zéro appel LLM** — agent de data retrieval pur.

### 5 Couches de Données (en parallèle, ~200-400ms)

```typescript
interface ResearchContext {
  // Couche 1: Scan Intel (données du pipeline 21 phases)
  scanData: {
    exposure: { lowEur: number; highEur: number; confidence: number };
    signals: ProofSignal[];
    lossVelocity: LossVelocity;
    peerComparison: PeerComparison;
    techFootprint: string[];
    decisionPressure: number;
    costOfDelay: CostOfDelay;
  } | null;

  // Couche 2: pgvector RAG (entreprises similaires + patterns)
  similarCompanies: SimilarityResult[];
  similarLeakPatterns: SimilarityResult[];
  sectorBenchmarks: SimilarityResult[];
  winningPatterns: SimilarityResult[];

  // Couche 3: Historique Outreach (mémoire longue)
  outreachHistory: {
    previousMessages: OutreachMemoryEntry[];
    lastContactDate: Date | null;
    totalTouches: number;
    responseReceived: boolean;
    sequencePosition: number;
  };

  // Couche 4: OSINT enrichment (Apollo/Exa)
  enrichment: {
    companyName: string; industry: string; headcount: number;
    techStack: string[]; recentNews: string[];
    jobPostings: string[]; fundingRound: string | null;
  };

  // Couche 5: Buying Committee Intel
  buyingCommittee: {
    isActive: boolean;
    stakeholders: { name: string; title: string; conviction: number }[];
    stage: 'forming' | 'evaluating' | 'deciding' | 'ready';
    recommendedRail: 'A' | 'B_STABILIZE' | 'B_MONITOR';
  } | null;
}
```

### Implémentation — Requêtes Parallèles

```typescript
// lib/agents/outreach/researcher.ts
export async function executeResearcher(
  prospect: ProspectInput,
  scanRunId?: string,
): Promise<{ data: ResearchContext; phase: AgentPhaseResult }> {
  const [
    scanData, similarCompanies, similarLeaks, sectorBench,
    winningPatterns, outreachHist, buyingCommittee,
  ] = await Promise.all([
    fetchScanResults(prospect.domain),
    findSimilarCompanies(`${prospect.company} ${prospect.industry} ${prospect.headcount} employees`, 5),
    findSimilarLeakPatterns(/* signals du scan ou industry defaults */),
    searchSimilar(`${prospect.industry} sector benchmark SaaS spend`, { category: 'sector_reference' }),
    searchSimilar(`${prospect.industry} ${prospect.country} email M1 success`, { category: 'winning_pattern' }),
    fetchOutreachHistory(prospect.domain, prospect.email),
    fetchBuyingCommittee(prospect.domain),
  ]);
  // Assembler ResearchContext...
}
```

---

## 4. AGENT RÉDACTEUR

### Modèle LLM : Claude Sonnet 4 (pas Haiku)

- Haiku trop superficiel pour la rédaction de qualité
- Coût : ~$0.003/message — négligeable face à 490 EUR/conversion
- Budget : 300 messages/jour = ~$1/jour

### Prompt Adaptatif par Richesse des Données

| Richesse | Mode | Comportement |
|----------|------|-------------|
| < 30/100 | ABORT | Ne pas générer, données insuffisantes |
| 30-50 | Humble | Message court, un seul chiffre |
| 50-75 | Standard | 2-3 chiffres spécifiques |
| 75+ | Sniper | Chaque phrase = fait vérifiable |

### Adaptation par Séquence

| Step | Stratégie | Données Prioritaires |
|------|-----------|---------------------|
| M1 | Premier contact — "Comment sait-elle ça?" | scan.signals[0], scan.exposure, enrichment.techStack |
| M2 | J+3 — Peer pressure | similarCompanies (même secteur, pertes comparées) |
| M3 | J+7 — Coût du retard | scan.costOfDelay, (dailyLoss x jours écoulés) |
| M4 | J+10 — Angle différent | enrichment.recentNews, enrichment.jobPostings, buyingCommittee |
| M5 | J+14 — Breakup | Minimaliste. Lien scan gratuit. Sous 60 mots. |

---

## 5. AGENT CRITIQUE

### 5 Tests Automatiques (Code, pas LLM)

1. **Test d'interchangeabilité** : Retirer nom entreprise + domaine → s'il reste < 2 marqueurs spécifiques → FAIL
2. **Chiffres spécifiques** : Minimum 2 chiffres qui ne sont pas le prix 490/590
3. **Nom entreprise en première ligne** : OBLIGATOIRE
4. **Phrases bannies** : "I hope this finds you well", "Our platform", "Book a call", "innovative solution", etc.
5. **Word count** : Email max 125 mots, LinkedIn DM max 80 mots

### LLM Judgement (Haiku — suffisant pour du QA)

Persona "CFO allemand cynique" qui reçoit 200 emails/semaine et en lit 3. Verdict : SEND / REWRITE / REJECT.

### Boucle de Retry

```
Rédacteur génère → Critique évalue
  → SEND: on envoie
  → REWRITE: Rédacteur re-génère avec instructions du Critique (max 2 retries)
  → REJECT 3x: log, prospect marqué 'needs_manual_review'
```

---

## 6. ORCHESTRATION

```
POST /api/command/generate-message-v2
  │
  ├─ [1] Chercheur (~300ms, 0 LLM)
  │    7 requêtes Supabase en parallèle
  │
  │  richness < 30? → ABORT
  │
  ├─ [2] Rédacteur (~2-3s, Claude Sonnet 4)
  │
  ├─ [3] Critique (~1-2s, tests code + Haiku)
  │    SEND? → sortie
  │    REWRITE? → retour [2] (max 2x)
  │
  ├─ [4] Persistance outreach_memory (fire-and-forget)
  │
  └─ Response JSON
```

---

## 7. MÉMOIRE COGNITIVE — 2 nouvelles tables Supabase

### Table `scan_results`

```sql
CREATE TABLE scan_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain          TEXT NOT NULL UNIQUE,
  exposure_low    INTEGER,
  exposure_high   INTEGER,
  confidence      INTEGER,
  daily_loss      INTEGER,
  signals         JSONB DEFAULT '[]',
  tech_footprint  JSONB DEFAULT '[]',
  peer_comparison JSONB DEFAULT '{}',
  loss_velocity   JSONB DEFAULT '{}',
  decision_pressure INTEGER DEFAULT 0,
  full_result     JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### Table `outreach_memory`

```sql
CREATE TABLE outreach_memory (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain            TEXT NOT NULL,
  email             TEXT,
  channel           TEXT NOT NULL,
  sequence_step     TEXT NOT NULL,
  subject           TEXT,
  body              TEXT NOT NULL,
  language          TEXT DEFAULT 'en',
  quality_score     INTEGER DEFAULT 0,
  data_richness     INTEGER DEFAULT 0,
  data_points       JSONB DEFAULT '[]',
  rejection_count   INTEGER DEFAULT 0,
  sent_at           TIMESTAMPTZ,
  opened_at         TIMESTAMPTZ,
  replied_at        TIMESTAMPTZ,
  reply_sentiment   TEXT CHECK (reply_sentiment IN ('positive','neutral','negative','bounce')),
  converted         BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### Feedback Loop — Apprentissage

Quand un message reçoit une réponse positive :
1. Extraire les `data_points` utilisés
2. Stocker un vecteur dans `vg_vectors` avec category = `winning_pattern`
3. Le Chercheur requête ensuite pour trouver quelles stratégies fonctionnent

---

## 8. BUDGET

| Composant | Modèle | Coût/message | 50 msg/jour |
|-----------|--------|-------------|-------------|
| Chercheur | Aucun (DB) | $0 | $0 |
| Rédacteur | Claude Sonnet 4 | ~$0.003 | $0.15-0.45 |
| Critique | Claude Haiku 4.5 | ~$0.0003 | $0.015-0.045 |
| Embeddings | text-embedding-3-small | ~$0.00002 | $0.001 |
| **TOTAL** | | | **~$0.20-0.50/jour** |

---

## 9. PLAN D'IMPLÉMENTATION (6 jours)

| Phase | Jours | Livrables |
|-------|-------|-----------|
| 1. Fondations | J1-J2 | Migrations SQL. Modifier `/api/intel` pour stocker dans scan_results. Créer types + researcher.ts |
| 2. Agents | J3-J4 | writer.ts, critique.ts, orchestrator.ts dans `lib/agents/outreach/` |
| 3. Intégration | J5 | Route `generate-message-v2`. Modifier cockpit. Fix parsing NDJSON |
| 4. Feedback Loop | J6 | Tracking ouvertures/réponses. Cron winning_patterns → pgvector |

### Arborescence Cible

```
lib/agents/outreach/
  types.ts           # ResearchContext, WriterOutput, CritiqueResult
  researcher.ts      # Agent Chercheur (0 LLM, DB queries)
  writer.ts          # Agent Rédacteur (Claude Sonnet)
  critique.ts        # Agent Critique (code tests + Haiku QA)
  orchestrator.ts    # Pipeline avec boucle retry

app/api/command/
  generate-message-v2/route.ts    # V2 multi-agents

supabase/migrations/
  013_scan_results.sql
  014_outreach_memory.sql
```

---

## 10. V1 vs V2

| Aspect | V1 (actuel) | V2 (multi-agents) |
|--------|-------------|-------------------|
| Architecture | 1 appel Haiku | 3 agents séquentiels |
| Données prospect | Passées par client (souvent vides) | Chercheur interroge 7 sources Supabase |
| RAG | Aucun | pgvector sur 7 catégories |
| Mémoire | Aucune | outreach_memory + feedback loop |
| Contrôle qualité | Aucun | 5 tests code + LLM Critique |
| Retry sur mauvaise qualité | Non | Max 3 tentatives |
| Coût | ~$0.0003/msg | ~$0.005/msg |
| Temps | ~2s | ~6-8s |
| Messages spécifiques | ~15% | >90% (cible) |
