# i18n — Stratégie marchés 2026

**Décision** : passer de **4 locales → 7 locales** pour couvrir les marchés européens SaaS-audit B2B les plus rentables en 2026.

---

## Les 7 locales retenues

### CORE (existant — à préserver)

#### 🇬🇧 EN (English)
- **Marché** : US (Fortune 500+mid), UK (post-Brexit fintech London), Irlande (tech HQ européen Google/Meta/LinkedIn), catch-all pour autres pays
- **ARPU** : premium ($490 US / £490 UK / €490 autres)
- **Priorité** : #1 — le plus de CFO anglophones, y compris sur les autres marchés
- **Volume TAM B2B** : ~500k companies 100-500 HC

#### 🇩🇪 DE (Deutsch)
- **Marché** : Allemagne (marché #1 DACH, 340k companies mid-market), Autriche, Suisse germanophone
- **ARPU** : **590€** (pricing DACH déjà en place)
- **Priorité** : #2 — plus grand marché SaaS mid-market EU, CFOs institutionnels
- **Volume TAM** : ~380k companies 100-500 HC

#### 🇳🇱 NL (Nederlands)
- **Marché** : Pays-Bas (petit mais ARPU correct, CFOs ultra-directs), Belgique flamande
- **ARPU** : 490€
- **Priorité** : #3 — conversion rate supposé élevé sur segment aligné culturellement
- **Volume TAM** : ~90k companies 100-500 HC

#### 🇫🇷 FR (Français)
- **Marché** : France (tech hub Paris, scale-ups), Belgique wallonne, Luxembourg (finance!)
- **ARPU** : 490€ (secondaire selon mémoire Edith — pas priorité commerciale)
- **Priorité** : #4 — existant, pas d'investissement nouveau mais maintenu
- **Volume TAM** : ~200k companies 100-500 HC

### EXPANSION 2026 (NEW — à ajouter)

#### 🇮🇹 IT (Italiano)
- **Marché** : Italie (Milan fintech scene, Turin manufacturing, Rome gov-tech)
- **ARPU cible** : 490€
- **Priorité** : #5 — sous-pénétré par les concurrents (Zylo/Vendr focus US+UK), opportunité segment manufacturing mid-market qui modernise son stack 2025-2026
- **Volume TAM** : ~250k companies 100-500 HC
- **Signal business** : CFOs italiens très intéressés par cost optimization post-Covid, SaaS penetration accelerating (sources: Deloitte Italy CFO Survey 2025, Flexera Italy 2024)

#### 🇪🇸 ES (Español)
- **Marché** : Espagne (Barcelona tech boom, Madrid fintech, València emerging)
- **ARPU cible** : 490€
- **Priorité** : #6 — Startup scene mature, SaaS category early-majority, concurrents non établis localement
- **Volume TAM** : ~200k companies 100-500 HC
- **Signal business** : Barcelona et Madrid parmi top 10 EU tech hubs 2025-2026, SaaS spend croissance 18%/an (source: ACCIÓ Barcelona 2025)
- **Extension possible** : LATAM (Mexico, Colombia) si succès ES → phase 2

#### 🇸🇪 SV (Svenska)
- **Marché** : Suède (Stockholm tech hub — Klarna, Spotify, iZettle), Scandinavia élargie (DK/NO/FI via Stockholm)
- **ARPU cible** : **590€** (ARPU le plus élevé d'Europe après Suisse)
- **Priorité** : #7 mais **potentiel élevé** — CFOs scandinaves très sophistiqués, anglophones parfaits, mais acheter en SV = signal de respect commercial massif
- **Volume TAM** : ~60k companies 100-500 HC (Suède seule) + Scandinavia = ~150k total
- **Signal business** : marché SaaS le plus pénétré d'Europe (Flexera 2024), CFOs très éduqués sur FinOps, prêts à payer le premium

---

## Pricing matrix par locale + IP

```typescript
// lib/pricing.ts — à refondre dans Phase 2
const PRICING = {
  detection: {
    'en-US': { amount: 490, currency: 'USD', display: '$490' },
    'en-GB': { amount: 490, currency: 'GBP', display: '£490' },
    'en-IE': { amount: 490, currency: 'EUR', display: '€490' },
    'en':    { amount: 490, currency: 'EUR', display: '€490' }, // catch-all
    'de-DE': { amount: 590, currency: 'EUR', display: '590€' },
    'de-AT': { amount: 590, currency: 'EUR', display: '590€' },
    'de-CH': { amount: 590, currency: 'CHF', display: '590 CHF' },
    'nl-NL': { amount: 490, currency: 'EUR', display: '€490' },
    'nl-BE': { amount: 490, currency: 'EUR', display: '€490' },
    'fr-FR': { amount: 490, currency: 'EUR', display: '490€' },
    'fr-BE': { amount: 490, currency: 'EUR', display: '490€' },
    'fr-LU': { amount: 490, currency: 'EUR', display: '490€' },
    'it-IT': { amount: 490, currency: 'EUR', display: '€490' },
    'es-ES': { amount: 490, currency: 'EUR', display: '€490' },
    'sv-SE': { amount: 590, currency: 'EUR', display: '590€' }, // ARPU premium
  },
  // ... stabilization, mission, monitoring
}
```

---

## hreflang matrix (SEO)

Chaque page marketing doit avoir ces tags dans le head :

```html
<link rel="alternate" hreflang="en" href="https://ghost-tax.com/" />
<link rel="alternate" hreflang="en-US" href="https://ghost-tax.com/us/" />
<link rel="alternate" hreflang="en-GB" href="https://ghost-tax.com/uk/" />
<link rel="alternate" hreflang="de" href="https://ghost-tax.com/de/" />
<link rel="alternate" hreflang="de-DE" href="https://ghost-tax.com/de/" />
<link rel="alternate" hreflang="de-AT" href="https://ghost-tax.com/at/" />
<link rel="alternate" hreflang="de-CH" href="https://ghost-tax.com/ch/" />
<link rel="alternate" hreflang="nl" href="https://ghost-tax.com/nl/" />
<link rel="alternate" hreflang="fr" href="https://ghost-tax.com/fr/" />
<link rel="alternate" hreflang="it" href="https://ghost-tax.com/it/" />
<link rel="alternate" hreflang="es" href="https://ghost-tax.com/es/" />
<link rel="alternate" hreflang="sv" href="https://ghost-tax.com/sv/" />
<link rel="alternate" hreflang="x-default" href="https://ghost-tax.com/" />
```

---

## Traduction — qui, comment, qualité ?

**Règle d'or Edith (doctrine Divers.txt)** : *"pas de jargon marketing creux, pas d'IA-sounding"*.

**Pipeline de traduction** :

1. **EN = source** — toutes nouvelles strings écrites en EN d'abord
2. **Traduction DE/NL/FR/IT/ES/SV** par agent Claude Opus 4.7 avec prompt strict "reject AI-sounding phrases, use CFO-native idioms of the target language"
3. **Validation humaine** — Edith relit chaque locale (ou pour SV, on cherche un native speaker à 50€ Upwork pour review une fois, puis on se fie aux pattern extraits)
4. **A/B test** sur les locales NEW (IT/ES/SV) — landing page variant A vs B pendant 2 semaines pour valider le register

**Skill mobilisé** : `i18n-architect` (structure), `i18n-sync` (sync automatique), `message-intelligence` (tone par marché).

---

## Déploiement par phase

### Phase 1 (audit) — non-impactant
Locales existantes conservées comme tel pendant l'audit.

### Phase 2 (fondations backend) — préparation structure
- Migration `next-intl` complet (ou framework équivalent si pas en place)
- URL routing `/[locale]/` pour les 7 locales
- Fallback hierarchy : `en-US` → `en` → `en` (catch-all)
- CI check : string hardcodée FR/EN en composant = fail build

### Phase 3 (frontend) — ajout progressif des 3 nouvelles locales
- S1 : routage `it`, `es`, `sv` live mais pages vides ou stub EN
- S2 : traductions `it` + `es` complétées
- S3 : traduction `sv` complétée (plus de soin, registre premium)

### Phase 4 (SEO) — go live
- hreflang complet
- sitemap par locale
- Google Search Console : ajouter propriété pour `it`, `es`, `sv`
- Monitor indexation pendant 2 semaines

---

## Impact business estimé

**Volume TAM cumulé** : 250k (IT) + 200k (ES) + 60k (SV core) + 90k (SV extended) = **~600k nouveaux prospects accessibles** en ajoutant ces 3 locales.

**Conversion rate estimé** :
- IT : 0.5-0.8% (marché tiède)
- ES : 0.4-0.7% (marché émergent)
- SV : 1.0-1.5% (marché mature + premium)

**Revenue potentiel an 1** :
- IT : 200-400 clients × 490€ = **98-196k€**
- ES : 100-200 clients × 490€ = **49-98k€**
- SV : 60-90 clients × 590€ = **35-53k€**
- **Total upside 3 nouvelles locales** : **180-350k€ ARR** (en supposant funnel Apollo équivalent mis en place)

Ces chiffres sont théoriques — dépend du funnel outbound actif dans chaque pays. **Sans Apollo DACH-IT, UK-ES, Scandinavia-SV outbound**, tu captures juste de l'inbound SEO = 10-20% de ces chiffres.

**Recommandation** : déployer les 7 locales **techniquement** cette refonte, puis lancer Apollo outbound sur IT+ES+SV **seulement après avoir validé que le funnel Apollo-DACH/UK/NL convertit** (donc post-juin 2026).

---

## Risque principal

**Traduction IA-sounding en langue inconnue**. Si une CFO italienne reçoit un email Ghost Tax avec des italianismes douteux, elle bounce instantanément. Mitigation :
- SV en particulier : commission 1 review native speaker ponctuel (50€ Upwork)
- IT et ES : moins critique (langues latines, patterns plus proches de FR)
- Monitor les premiers replies sur IT/ES — si on voit des "your Italian is weird", on corrige

**Risque secondaire** : over-stretching opérationnel. 7 locales = 7 fois plus de strings à maintenir à chaque update. Skill `i18n-sync` doit être déployé en continu pour éviter la dérive.
