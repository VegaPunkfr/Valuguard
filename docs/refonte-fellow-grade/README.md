# Refonte Fellow-Grade — Ghost Tax

**Démarré** : 18 avril 2026 soir
**Protocole** : `.claude/skills/refonte-fellow-grade/SKILL.md`
**Stratégie** : B (Incremental parallèle, 4 semaines calendaires)
**Scope** : 8 couches × 7 locales × ligne par ligne

---

## Structure dossier

- `audits/` — 8 rapports Phase 1 (1 par couche)
- `checkpoints/` — transitions entre agents (1 par sous-couche)
- `adr/` (futur) — décisions architecturales non-triviales
- `README.md` — ce fichier

---

## Les 8 couches

| # | Couche | Phase | Timeline | Skills critiques |
|---|---|---|---|---|
| 1 | Architecture backend | 2 | S1-S2 | system-architecture, v5-backend, ssot-guardian |
| 2 | Data & types | 2 | S2 | ssot-guardian, i18n-architect, financial-modeler |
| 3 | Sécurité & compliance | 2 | S2 | security-audit, compliance-checker |
| 4 | Observabilité & ops | 2 | S3 | deployment-guardian, crisis-manager |
| 5 | Frontend design system | 3 | S1-S3 | typography-maestro, color-intelligence, cinematic-layout-composer |
| 6 | Frontend exécution | 3 | S2-S3 | responsive-fluid-master, ui-ux-pro-max, data-presentation-sculptor |
| 7 | Performance + SEO + i18n | 4 | S4 | seo-guardian, v5-ai-seo, seo-hreflang |
| 8 | Produit (Cockpit + Decision Pack) | 4 | S4 | data-presentation-sculptor, /pdf-artisan (à créer) |

## Les 7 locales cibles

| Code | Langue | Marché | Pricing |
|---|---|---|---|
| `en` | English | US + UK + IE + catch-all | $490 / £490 / €490 |
| `de` | Deutsch | DE + AT + CH | 590€ DACH |
| `nl` | Nederlands | NL + BE-VL | 490€ |
| `fr` | Français | FR + BE-WA + LU | 490€ |
| `it` | Italiano | IT | 490€ (NEW 2026) |
| `es` | Español | ES | 490€ (NEW 2026) |
| `sv` | Svenska | SE + Scandinavia | 590€ (ARPU premium, NEW 2026) |

---

## Phase 1 — Audit complet (démarré 18 avril soir)

8 agents Explore en parallèle auditent les 8 couches ligne par ligne. Livrables attendus avant dimanche matin.

### Status par couche

- [ ] Couche 1 — Architecture backend
- [ ] Couche 2 — Data & types
- [ ] Couche 3 — Sécurité & compliance
- [ ] Couche 4 — Observabilité & ops
- [ ] Couche 5 — Frontend design system
- [ ] Couche 6 — Frontend exécution
- [ ] Couche 7 — Performance + SEO
- [ ] Couche 8 — Produit (Cockpit + Decision Pack)

Consolidation finale : `audits/00-PRIORISATION-CONSOLIDEE.md` (produit après les 8 rapports).

---

## Prochaine action (Edith)

1. Lire les 8 rapports dimanche matin (45 min)
2. Valider la priorisation / ajuster si besoin
3. Dire "go Phase 2" quand prête
4. Je démarre Phase 2 Fondations backend en background tandis que tu te concentres sur Touch 1 Apollo mardi

Zéro touch sur prod pendant Phase 1 (lecture seule).
