# AUDIT COUCHE 1 — Architecture Backend

**Gate** : `AUDIT_COUCHE_1_GATE: BLOCKED`
**Score moyen** : **3.8/10**
**Date** : 18 avril 2026

---

## 1. Inventaire

### Routes API — 86 fichiers (50+ routes uniques)
Par domaine :
- `/api/command/*` : 22 routes
- `/api/cron/*` : 16 routes
- `/api/audit/*` : 3 routes
- `/api/admin/*` : 5 routes
- `/api/outreach/*` : 5 routes
- `/api/stripe/*` : 5 routes
- `/api/scan/*` : 2 routes
- `/api/webhook/*` : 2 routes
- Autres (health, detect, leads, geo, email, intel, etc.) : 21 routes

### Fichiers `lib/` — 123 fichiers
- `lib/outreach/` (7 : gate, quality-gate, mailer, culture-rules, send-window, bootstrap/*)
- `lib/command/` (33 : ai-writer, apollo-bot, messages, enrichment-pipeline)
- Infrastructure : `lib/supabase.ts`, `lib/stripe.ts`, `lib/network/fetch-retry.ts`
- **Root-level** : 50+ fichiers directement à racine — **pas d'organisation par responsabilité**

### Middleware (1)
- `middleware.ts` (237 lignes) — rate limit in-memory, user-agent detection, sensitive path blocking, 6 auth guards distincts, security headers

### Error handling — INCONSISTANT
Patterns observés :
- `throw Error`
- `return NextResponse.json({ error })` (sans code typé)
- `console.error + return`
- Silent fails
- 5+ patterns différents dans 50 routes

---

## 2. Scores (0-10)

| Sous-couche | Score |
|---|---|
| Séparation concerns (domain/app/infra) | 4/10 |
| Consistency patterns (routes/handlers) | 3/10 |
| Type safety | 6/10 |
| Error handling | 2/10 |
| Testability | 3/10 |
| Documentation | 5/10 |

---

## 3. Gaps Top 10

### P0 (Bloquant)
1. **Error handling non typé** — aucune structure centrale d'erreur applicative. Effort 3j.
2. **Absence d'injection de dépendances** — logique métier tight-coupled à supabase/stripe globals. Effort 5j.
3. **Middleware auth répété 6 fois** — pas d'helper réutilisable. Effort 2j.
4. **Pas d'Input validation** — accepte JSON raw sans zod. Effort 4j.

### P1 (Critique)
5. **Lib/ racine non structurée** — 50+ fichiers sans organisation. Effort 2j.
6. **Crons sans isolation** — tous importent supabase, logique métier mixée. Effort 3j.
7. **Rate limiting non thread-safe** — in-memory map non-persistent. Effort 1j.

### P2
8. **Path aliases limités** — only `@/*`. Effort 0.5j.
9. **Error messages leak env structure** ("AUDIT_API_KEY not configured"). Effort 0.5j.
10. **HTTP status codes inconsistants** — 500 vs 503 vs 400 ad-hoc. Effort 1j.

---

## 4. Recommandation architecture cible (DDD-lite)

### Arborescence `lib/`
```
lib/
├── domain/              # Modèles métier purs
│   ├── outreach/       # Prospect, Message, ConvictionState
│   ├── audit/          # AuditRequest, ShadowBill, DecisionMaker
│   ├── pricing/        # Price, PricingLocale
│   └── errors/         # DomainError, ErrorCode enum
├── application/        # Use cases (sans infra)
│   ├── generate-message.ts
│   ├── run-orchestrator.ts
│   └── cron-use-cases/
├── infrastructure/     # Adaptateurs
│   ├── supabase/
│   ├── stripe/
│   ├── resend/
│   └── exa/
├── shared/             # Validations, constants
│   ├── schemas/        # Zod
│   ├── logger/         # Structured logging
│   ├── retry/
│   └── crypto/
└── middleware/         # Auth, rate-limit, error-handler
```

### Naming convention routes
```
/api/v1/{domain}/{resource}/{action}
  domain ∈ { scan, outreach, audit, command, admin, webhook, cron }

POST   /api/v1/scan/batch
GET    /api/v1/scan/{id}/results
POST   /api/v1/outreach/message/send
POST   /api/v1/webhook/stripe
```

### Pattern middleware chainable
```typescript
// lib/middleware/chain.ts
export type Middleware = (req: NextRequest) => Promise<NextResponse | null>;

export async function chainMiddleware(req, middlewares) {
  for (const m of middlewares) {
    const resp = await m(req);
    if (resp) return resp;
  }
  return null;
}

// middleware.ts
const chain = [validateAuth, rateLimit, validateInput, securityHeaders];
```

### Pattern error typé
```typescript
// lib/domain/errors.ts
export enum ErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  UNPROCESSABLE = 'UNPROCESSABLE',
  INTERNAL = 'INTERNAL',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public httpStatus: number,
    public details?: Record<string, any>,
  ) { super(message); }
}
```

---

## 5. Gate

**AUDIT_COUCHE_1_GATE: BLOCKED**

Raisons blocantes :
1. Aucune séparation domain/app/infra — coupling total
2. Error handling primitif — 0 structured logging
3. Auth patterns répétés 6 fois
4. Pas d'input validation — vulnérable
5. Lib/ racine non structurée

Phase 2 peut démarrer UNIQUEMENT après :
- [ ] Créer `lib/domain/errors.ts` avec ErrorCode enum + AppError class
- [ ] Implémenter `lib/infrastructure/` avec repos Supabase
- [ ] Refactorer 10 routes critiques (audit, command, cron/master) vers nouveau pattern
- [ ] Ajouter zod schema validation
- [ ] Créer `lib/middleware/auth.ts` et consolider middleware.ts

**Effort estimé couche 1** : 2-3 semaines (single eng) — en parallèle possible avec couches 2, 5 (non-blocking cross-couche pour audit seulement).
