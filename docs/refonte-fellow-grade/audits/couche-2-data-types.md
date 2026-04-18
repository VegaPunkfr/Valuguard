# AUDIT COUCHE 2 — Data & Types

**Gate** : `AUDIT_COUCHE_2_GATE: BLOCKED`
**Score moyen** : **3.8/10**
**Date** : 18 avril 2026

---

## 1. Inventaire

### Supabase Infrastructure
- **Migrations** : 18 fichiers (001_vault_schema.sql → 20260416120000_outreach_events_v1.sql)
- **Tables Supabase** : 42 CREATE TABLE détectés
- **Naming migrations** : MIXED
  - Legacy (non-timestampé) : 16 fichiers (001_ → 016_)
  - Versionnées (timestamp YYYYMMDDHHMMSS) : 2 fichiers
- **Custom Types** : 1 ENUM `anomaly_type` (12 valeurs)
- **Extensions** : pgvector activée

### TypeScript Types
- `/types/database.ts` (456 lignes) — **stub incomplet** (note « replace with `supabase gen types typescript` output »). Couvre seulement 10 tables ; **32+ tables manquantes**
- `/lib/agents/types.ts` (174 lignes) + `/lib/plugins/types.ts` (229 lignes) — domain types bien nommés
- **Zod Coverage** : **0%** — aucun import `zod` détecté dans le projet (mais Zod est dans node_modules)
- **Drizzle ORM** : Absent

### i18n — Messages (4 locales actuelles)
- **en.json** : 2 733 clés
- **de.json** : 2 690 clés (**43 manquantes**)
- **fr.json** : 2 707 clés (**26 manquantes**)
- **nl.json** : 2 683 clés (**50 manquantes**)
- **Total parité** : 119 clés manquantes cumulées
- **Structure** : Flat key=value (pas de hiérarchie namespaces)
- **Pas préparé pour IT/ES/SV**

### API Validation
- **27 dossiers API** : admin, agents, audit, command, connectors, contact, cron, detect, drip, email, geo, health, indexnow, intel, leads, og, outreach, pulse, referral, report, scan, shadow-bill, signals, strategy, stripe, vault, webhook
- **Validation Pattern** : Aucune Zod schema en frontière API

---

## 2. Scores (0-10)

| Sous-couche | Score |
|---|---|
| Source-of-Truth Types | 2/10 |
| Zod Coverage | 0/10 |
| Migrations Hygiene | 4/10 |
| i18n Completeness (4 locales) | 6/10 |
| Data Integrity (FK, Constraints) | 7/10 |

---

## 3. Gaps critiques Top 10

### P0 (Bloquant)
1. **Zod NOT IN USE** (0 validation en API boundaries) — 27 routes
2. **Database.ts stub incomplete** (32+ tables MISSING) — `/types/database.ts`
3. **Migrations non-timestampées 16/18** — `/supabase/migrations/001_` → `016_`

### P1 (Critique)
4. **i18n 119 keys MISSING** cross-locales (DE 43, FR 26, NL 50)
5. **No Domain Schema Layer** — `/lib/domain/` n'existe pas
6. **No Drizzle ORM** — toutes queries raw Supabase client

### P2 (Important)
7. **Supabase Client NOT fully TYPED** — `/lib/supabase.ts:33`
8. **No i18n Namespace Structure** — flat 2733 keys
9. **RLS Policy Audit Trail absent**
10. **Foreign Keys inconsistent across legacy migrations**

---

## 4. Recommandation structure cible

### Arborescence
```
lib/domain/
├── schema.ts                # Central Zod schemas
├── types.ts                 # Exports from Zod
└── validators/
    ├── api.ts
    └── forms.ts

messages/
└── locales/
    ├── en/ (namespaced JSON par feature)
    ├── de/
    ├── fr/
    ├── nl/
    ├── it/ (NEW 2026)
    ├── es/ (NEW 2026)
    └── sv/ (NEW 2026)
```

### Pattern Zod (exemple)
```typescript
// lib/domain/schema.ts
import { z } from 'zod';

export const AuditRequestSchema = z.object({
  email: z.string().email(),
  company_name: z.string().min(1),
  headcount: z.number().int().positive().optional(),
  status: z.enum(['pending', 'paid', 'processing', 'delivered', 'failed']),
  locale: z.enum(['en', 'de', 'nl', 'fr', 'it', 'es', 'sv']),
});
export type AuditRequest = z.infer<typeof AuditRequestSchema>;
```

### Pipeline
- `supabase db push` hook → auto-generate `/types/database.ts`
- Migration linter (naming, FK, RLS)
- CI : i18n key completeness validator (fail build si missing keys)

---

## 5. Gate

**AUDIT_COUCHE_2_GATE: BLOCKED**

Blockers à lever avant PASS :
1. Implement Zod schemas for 42 Supabase tables
2. Run `supabase gen types typescript` → replace `/types/database.ts`
3. Rename 16 legacy migrations → YYYYMMDDHHMMSS_ format
4. Add missing i18n keys (DE:43, FR:26, NL:50)
5. Create `lib/domain/schema.ts` as single source of truth

**Effort estimé** : 16–20h (1 sprint)
