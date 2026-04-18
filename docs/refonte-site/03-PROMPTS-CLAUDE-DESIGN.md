# Prompts Claude Design — copier-coller prêts à l'emploi

**Usage** : va sur `claude.ai/design`, crée un nouveau projet, copie le prompt correspondant à ta phase, laisse tourner.
**Ordre non modifiable** : PROMPT 0 avant tous les autres. Il extrait le design system qui sera réutilisé partout.

---

## PROMPT 0 — Extraction du Design System Ghost Tax (Étage 1)

**À utiliser en premier. 1 fois. Dimanche matin.**

**Setup requis avant** :
1. Connecte ton GitHub `VegaPunkfr/Valuguard` à Claude Design
2. Prépare une screenshot PNG de `https://ghost-tax.com/` homepage (desktop 1440px width)
3. Prépare ton logo (si tu as un SVG/PNG versionné)

**Prompt à coller** :

```
PROJECT: Ghost Tax — Design System Extraction

CONTEXT:
Ghost Tax is a B2B decision-intelligence product sold to CFOs in DACH, UK, 
Netherlands, and US markets. Current site (https://ghost-tax.com) sits in an 
"awkward middle" between SMB SaaS marketing and institutional CFO-grade. 
We're refounding the design system to fully commit to Fellow-grade institutional.

TASK:
1. Read the repository `public/cockpit-v6.html` (monolithic HTML with 4000+ 
   lines of CSS custom properties, typography tokens, color variables).
2. Read the uploaded homepage screenshot.
3. Extract the KEPT design tokens (what's already institutional-grade):
   - Color palette with hex values
   - Typography stack (font families, weights in use, scale)
   - Spacing rhythm (padding/margin values)
   - Border radius system
   - Shadow/elevation system
   - Grain texture overlays if present

4. Identify the REJECTED tokens (what reads as SMB/startup):
   - Emoji usage in navigation or UI
   - Gradient CTAs
   - Velocity repetition words ("48h" mentioned 6× on homepage)
   - Inconsistent capitalization ("21detection phases" without space)
   - Belief-system language ("doctrine is..." phrasing)
   - Mixed-currency pricing displays
   - Exclamation marks

5. Output:
   a. JSON schema of KEPT tokens (copy-paste into Tailwind config)
   b. Markdown list of REJECTED tokens with 1-line rationale per
   c. 3 mood-board reference images showing what "Fellow-grade" means 
      visually (think: Stripe docs, Brex landing, Linear marketing pages, 
      Vercel app)
   d. Recommended typography pairing (one display face, one body face, 
      one mono face) with weight hierarchy (400/500/600/700)

CONSTRAINTS:
- Do NOT propose visual changes yet. This is extraction + audit only.
- Do NOT add photos, illustrations, or stock imagery.
- Preserve the cyan/gold accent convention if it appears in cockpit-v6.html.
- Preserve the JetBrains Mono + Bebas Neue + Inter stack if present.

DELIVERABLE FORMAT: One design system document (can be exported as PDF 
or folder). Structure: Tokens → Rejected → Mood Board → Typography Pairing.
```

---

## PROMPT 1 — Homepage refonte (Étage 2, page P0)

**À utiliser APRÈS le Prompt 0. Étage 2 = wireframes.**

**Prompt à coller** :

```
PROJECT: Ghost Tax — Homepage Redesign (Fellow-Grade Institutional)

INPUT: Use the Ghost Tax design system extracted in the previous session.

TARGET AUDIENCE: CFO / Head of Finance / Group Controller at European B2B 
companies (100-500 employees), DACH primarily, UK and Netherlands secondary. 
They are skeptical of SaaS marketing. They trust Big 4 methodology reports, 
Gartner, Flexera. They decide fast when credibility is established, slow 
otherwise.

ANTI-PATTERNS TO REJECT (hard constraints):
- No emojis anywhere
- No stock photos of people around laptops
- No gradient CTAs (flat buttons only)
- No "Join 10,000+ CFOs" style fake social proof
- No floating tooltips with marketing copy
- No exclamation marks in copy
- No "doctrine is..." / "belief system" phrasing
- "48h" mentioned maximum ONCE on the page
- No mixed currency display (EUR for DACH/FR/NL, GBP for UK, USD for US — 
  detect via IP, show one)
- No capitalization errors like "21detection phases" — always space-separated

STRUCTURE (fixed order):

1. HERO (above the fold)
   - Headline: short declarative statement. Example structure: 
     "Your SaaS spend hides 18-32% waste. We measure it in 48h."
     (NO all-caps unless it's the brand name. Weight-based hierarchy.)
   - Subheadline: one sentence explaining the mechanism (public signals, 
     no integration)
   - ONE primary CTA: "Launch a free scan" 
     (NOT "See my exposure" — too consumer-y)
   - ONE secondary CTA: "View sample report" 
     (NOT "Learn more")
   - Under the fold: 4 analyst citations as lift quotes (Gartner, Flexera, 
     Vertice, FinOps Foundation) with source + year visible
   - NO live counter of "€X detected today" (feels gamified)

2. CREDIBILITY BAR (3 signals)
   - 21 phases · audited methodology (link to /methodology)
   - Delivery SLA 48h (median 31h, 2024 cohort)
   - Confidence capped at 85/100 (no neural networks, deterministic rules)

3. PROBLEM FRAMING (3 data points)
   - Pattern 1: SaaS inflation 12.2% annually (source: Vertice 2025)
   - Pattern 2: 42% mid-market CFOs cut SaaS budgets H1 2026 (source: Flexera)
   - Pattern 3: 30% enterprise SaaS licenses idle/duplicate by end 2026 
     (source: Gartner)
   
   Each point is a lift quote with source visible. NOT a bulleted marketing 
   list.

4. WHAT WE MEASURE (4 deliverables, disaggregated stakeholders)
   - CFO memo (4-6 pages): exposure ranges, confidence bands
   - CIO brief (2-3 pages): technical stack redundancy findings
   - Board one-pager: benchmark peer position, cost of delay
   - Procurement playbook: renegotiation levers per vendor

5. SAMPLE REPORT PREVIEW
   - One anonymized case: "Fintech, 180 HC, DE, Q3 2024. Exposure estimated 
     127k → post-audit actual 142k. Variance +11%, within confidence band."
   - CTA: "Download sample Decision Pack" (link to /sample-report)

6. PRICING SNAPSHOT (3-tier condensed)
   - Detection 490€ (one-time, 48h)
   - Stabilization 4990€ (detection + 90-day roadmap)
   - Monitoring 1990€/mo (continuous post-delivery, add-on)
   - CTA per tier: "Start scan", "Get roadmap", "Book consultation"

7. FOOTER (trust)
   - Methodology link
   - Privacy / Terms / Imprint (DACH legal compliance)
   - Language selector (EN / DE / FR / NL)
   - NO social icons, NO marketing blog links

DESIGN DIRECTION:
- Density: medium (not sparse startup, not dense legal). Think Stripe docs.
- Color: noir dominant, cyan accent (#5FD4E0 or similar), gold for warnings 
  (#E8B149), alert red sparingly
- Typography: hierarchy by weight, not by caps or size. Bebas Neue for hero 
  only, Inter for body, JetBrains Mono for data/numbers
- Whitespace: minimum 80px between sections, 32px between subsections
- Grid: 12-col desktop, single-col mobile. Max content width 1200px.
- Images: NO photos. OK for abstract data visualizations (quartile charts, 
  timeline, peer benchmark bars). All data viz must be accompanied by source.

OUTPUT:
- Wireframe (Claude Design native format)
- Annotations per section: what it does + why (rationale for CFO buyer)
- Responsive breakpoints: desktop 1440px, tablet 768px, mobile 375px
- Export bundle when ready: "handoff to Claude Code"

DO NOT PROCEED to high-fidelity yet. Wireframe only. I'll review and iterate 
before you produce the high-fi version.
```

---

## PROMPT 2 — `/sample-report` refonte (Étage 2, page P0)

**C'est LA page pivot de conversion. Priorité équivalente à la homepage.**

**Prompt à coller** :

```
PROJECT: Ghost Tax — Sample Report page Redesign

INPUT: Use the Ghost Tax design system.

CURRENT PROBLEM:
The existing /sample-report page (https://ghost-tax.com/sample-report) shows 
a "Decision Pack preview" with: executive summary, quantified exposure, 
spend breakdown, entropy metric κ, peer position P82. It feels like a 
professional audit deliverable.

BUT the CFO audit I ran identifies 6 critical trust gaps:
1. "95% conf." claimed without validation mechanism
2. No failure mode disclosure (what if private infra? unreleased HC?)
3. "P82 vs SaaS scale-ups" — peer benchmark opacity (which cohort? size?)
4. One synthetic sample "Nexus Digital" doesn't validate generalizability
5. "Top 5 recovery actions" promised but never itemized in preview (vapor)
6. No audit trail / reconciliation protocol

TARGET: Fellow-grade institutional preview that makes a CFO say 
"I want this Decision Pack for my company" and click Buy immediately.

STRUCTURE:

1. HERO
   - Title: "Sample Decision Pack — anonymized European fintech, Q3 2024"
   - Subhead: "Full 14-page report delivered in 31h. Post-audit variance: 
     +11% vs actual (within confidence band)."
   - CTA: "Download full PDF (12MB)" — no gate, just download
   - Secondary CTA: "Start my scan — €490"

2. METHODOLOGY BOX (sticky sidebar or top ribbon)
   - "Cohort definition: 180-250 HC, SaaS/MarTech, €3-8M ARR, N=247 orgs, 
     Q4 2025"
   - "Confidence scoring: 0-85 cap, weighted on 4 inputs (public signal 
     richness, historical pattern match, baseline source, peer cohort fit)"
   - "Validation cohort: 78% hit rate within ±15% on 247 audits"

3. EXECUTIVE SUMMARY (extracted page from Decision Pack)
   - Exposure: €127k–€340k estimated (confidence 68/85)
   - Median peer: €180k (P50 cohort)
   - Patterns detected: [list 3 with prevalence %]
   - Top recovery action: "Salesforce auto-renewal in 45 days. Volume stacking 
     discount 18-22% typical. Negotiation template in Section 7."

4. ONE VENDOR DEEP DIVE (the killer proof)
   - "Salesforce — inferred spend trace"
   - DNS signal detected: salesforce.com CNAME chain
   - SKU inferred: Sales Cloud Unlimited + Service Cloud Professional
   - Estimated cost: €72k-€94k annually (confidence 74)
   - Benchmark: peer median €65k (P50 cohort, 220 orgs)
   - Recovery lever: renewal window 2025-Q2; volume stacking + multi-year 
     commitment discount 15-22% typical
   - Post-audit actual: €81k (within confidence band, variance +3%)

5. CONFIDENCE BAND EXPLAINED
   - Small table: "Observed signal (95 conf) / Inferred pattern (68 conf) / 
     Estimated cost (74 conf) / Benchmark (89 conf) — Aggregate: 81.5 conf, 
     capped at 85"
   - NOT a single "95% confidence" claim. Disaggregated.

6. BOUNDARIES (explicit list)
   - "What we detect: public signals, DNS, job posts, case studies, 
     partner directories"
   - "What we CANNOT detect: private infrastructure, unreleased headcount, 
     unlisted vendors, internal billing reconciliation, real-time changes"
   - "What we validate post-delivery: optional 30-min reconciliation call 
     against your vendor master list. Confidence bands revised if variance >10%."

7. CTA SECTION (bottom)
   - Primary: "Start my scan — €490" (link to checkout)
   - Secondary: "Book methodology walkthrough — 30 min" (link to calendar)
   - NO "no calls" messaging anywhere

DESIGN DIRECTION:
- This page is ALLOWED to be slightly more dense. CFO reading time 8-12 min.
- Extensive use of data tables, quartile bars, confidence heatmaps.
- Typography: body Inter 16/1.6, data JetBrains Mono 14/1.4
- Visual: PDF preview mockup dominates above fold (simulate the actual 
  Decision Pack artwork)

OUTPUT: wireframe + annotations. NOT high-fi yet.
```

---

## PROMPT 3 — `/methodology` refonte (Étage 2, page P1)

**Prompt à coller** :

```
PROJECT: Ghost Tax — Methodology page Redesign

INPUT: Ghost Tax design system.

CURRENT PROBLEM:
Existing page (/methodology) has 47% of claims without citation, uses 
belief-system language ("Phase order is doctrine"), baseline circularity 
("12-22% is typical Ghost Tax range" = the assumption, not the validation), 
and unsourced "380 EUR/employee/month" figure.

TARGET: Publicly auditable methodology that a Big 4 partner could review 
without objection.

STRUCTURE:

1. HEADER
   - Title: "Methodology — 21 phases, deterministic rules, bounded inference"
   - Subhead: "Calibrated on N=247 cases (Q3 2024 – Q1 2026). Open for 
     independent audit."

2. PIPELINE OVERVIEW (expandable phase list)
   - 21 phases, each with:
     - Name (short, technical)
     - Input type (public signal / internal data / inference output)
     - Process type (heuristic classification / deterministic rule / 
       statistical estimate)
     - Output type (tag / pattern / estimate / confidence delta)
     - Empirical calibration (e.g. "+5pt conf from 1-3 Exa sources, 
       +15pt from 4-6, +25pt from 7+, based on 200-case validation 2024 Q3")
   
   Phase order is fixed because each consumes prior phase output. State that 
   factually. NOT "doctrine is..."

3. INFERENCE PATTERNS TABLE
   Each of the 7 patterns (AI Tool Redundancy, Observability Overlap, etc.) 
   gets a row:
   - Pattern name
   - Trigger rule (plain language)
   - Prevalence in cohort (%)
   - False positive rate (%)
   - Example of a true positive (anonymized)
   - Example of a false positive (anonymized, so CFO sees the limitations)

4. BASELINE SOURCES
   - Replace "Flexera 2024, Zylo 2024, Gartner 2025 composite" with direct 
     links to each primary report
   - Show breakdown: "Per-employee monthly SaaS spend: €320 (Flexera 2024, 
     n=2800 orgs) / €410 (Zylo 2024, n=1200 orgs) / €380 (Gartner 2025, 
     n=450 orgs). Ghost Tax weighted composite: €380/HC/mo (weighted by 
     sample size)."
   - Disclose if Ghost Tax's target cohort matches source assumptions 
     (industry, size, region)

5. CONFIDENCE MODEL (empirical)
   - Show the exact weights per input with empirical calibration source
   - Show the validation cohort: "N=247 cases, Q3 2024 – Q1 2026. 
     Predicted range captured actual post-audit value 78% of the time 
     within ±15%, 92% within ±25%."

6. BOUNDARIES (prominent, not buried)
   - Comparison table: "What Ghost Tax does detect | What requires internal 
     data | What requires manual audit"
   - Checkmarks, not bullets.

7. OPEN AUDIT INVITATION
   - "We publish methodology with the rigor expected by institutional buyers. 
     Independent audit firms may request full validation data under NDA."
   - CTA: "Request methodology review" (email link to jerome@ghost-tax.com 
     or similar)

DESIGN DIRECTION:
- Very dense, technical page. Expected reader: CFO's technical advisor or 
  Big 4 partner.
- No marketing decorations. Minimal color (black + cyan for data, nothing 
  else).
- Table-heavy. Code blocks for phase definitions OK.

OUTPUT: wireframe + annotations.
```

---

## PROMPT 4 — `/pricing` refonte (Étage 2, page P1)

**Prompt à coller** :

```
PROJECT: Ghost Tax — Pricing page Redesign

INPUT: Ghost Tax design system.

CURRENT PROBLEM:
- Monitoring tier (1990€/mo) sits confusingly between Detection (490€) 
  and Stabilization (4990€) in the pricing hierarchy
- "REQUEST PROPOSAL" CTA for Stabilization is mushy compared to 
  direct "See my exposure" for Detection
- Mission tier vague ("from 20.000€" with email-only CTA)
- 3-screen scrolling comparison table (Stripe condenses to 5 rows)
- No self-qualification mechanism (calculator)

TARGET: Clean 3-tier (+ add-on), clear progression, self-qualification tool, 
CFO-frictionless checkout.

STRUCTURE:

1. HEADER
   - Title: "Pricing — flat fees, no hidden subscription"
   - Subhead: "One-time Detection, add-on Monitoring, enterprise Mission."

2. TIER CARDS (3 main tiers, equal weight, Stabilization visually prominent)
   
   Detection — 490€ (one-time, 590€ DACH)
   - 21-phase scan, 48h delivery median 31h
   - CFO memo + CIO brief + Board one-pager
   - Confidence bands disclosed
   - 30-day money-back if <15% addressable savings
   - CTA: "Start scan"
   
   Stabilization — 4990€ (one-time, flat)
   - Everything in Detection +
   - 90-day roadmap
   - Renegotiation playbook (5 vendor templates)
   - Post-audit reconciliation call
   - 2 follow-up check-ins (30d, 90d)
   - CTA: "Get roadmap"
   
   Mission — from 20 000€ (quoted)
   - Everything in Stabilization +
   - Multi-entity scan (up to 8 subsidiaries)
   - Executive presentation (onsite or remote)
   - Custom benchmarking cohort
   - Board-level support
   - CTA: "Book 30-min scope call"

3. MONITORING ADD-ON (below main tiers, NOT as 4th tier)
   - Continuous post-delivery: 1990€/mo
   - Available only after Detection/Stabilization/Mission delivery
   - Features: quarterly re-scan, renewal alerts, vendor watch
   - CTA: "Add monitoring" (inline, on existing contracts)

4. SELF-QUALIFICATION CALCULATOR
   - Slider: "Annual SaaS + Cloud spend: [500k EUR - 10M EUR]"
   - Output: "Likely savings identified: 
     12-22% (€60k-€130k based on similar cohorts)"
   - Inline CTA: "Start scan to quantify"

5. COMPARISON TABLE (condensed, 5-6 rows MAX)
   - Detection / Stabilization / Mission columns
   - Rows: delivery time, deliverables, post-support, confidence guarantee, 
     refund policy, upgrade path

6. GUARANTEES (3 bullets)
   - Delivery SLA 48h median
   - Money-back if <15% addressable
   - GDPR-compliant, zero access, public signals only

7. FOOTER CTA (sticky on mobile)
   - "Not sure which tier? Launch a free scan first."

DESIGN DIRECTION:
- Cards with equal visual weight, Stabilization slightly elevated (badge: 
  "Most chosen by peer cohort")
- Monochrome except for one accent color (cyan) on Stabilization
- No gradients on CTAs
- Typography: pricing number Bebas Neue 64pt, tier name Inter 500 18pt, 
  body 16/1.6

OUTPUT: wireframe + annotations.
```

---

## PROMPT 5 — Finalisation (après review wireframes)

**À utiliser SEULEMENT après avoir validé les wireframes des 4 pages P0+P1.**

```
PROJECT: Ghost Tax — High-Fidelity Production Design

INPUT: Approved wireframes for / (homepage), /sample-report, /methodology, 
/pricing.

TASK:
1. Produce high-fidelity mockups for each approved wireframe
2. Maintain full fidelity to the design system extracted in Prompt 0
3. Apply responsive breakpoints (1440, 1024, 768, 375)
4. For each page, export:
   - PNG at 2x resolution (for visual review)
   - HTML + CSS standalone (for Claude Code implementation)
   - Claude Code handoff bundle (structured instruction package)

CONSTRAINT:
- Preserve all anti-pattern rejections (no emojis, no gradient CTAs, no 
  stock photos, etc.)
- Match the tone of the approved wireframes exactly
- NO new design directions. Execution only.

OUTPUT: 4 handoff bundles, one per page. Label: "Ready for Claude Code 
implementation".
```

---

## Usage recommandé

**Dimanche 19 avril matin (2h)** :
1. Prompt 0 → extraction design system (30-40 min)
2. Prompt 1 → wireframe homepage (30-40 min)
3. Review du wireframe, me le partager pour validation

**Dimanche 19 avril après-midi (2h)** :
4. Prompt 2 → wireframe sample-report (30 min)
5. Prompt 3 → wireframe methodology (30 min)
6. Prompt 4 → wireframe pricing (30 min)
7. Me partager l'ensemble

**Lundi 20 avril matin (10 min)** :
8. Je review les 4 wireframes en chat, je te dis go ou pas
9. Si go → Prompt 5 → high-fidelity mockups (Claude Design tourne)

**Lundi 20 avril après-midi** : tu ne touches pas, Touch 1 Apollo se prépare (ne pas mélanger focus).

**Mardi 21 avril** : **ZÉRO design work.** Focus Apollo replies.

**Mercredi 22 avril** : récupère les handoff bundles, me les transmets via chat.

**Jeudi-vendredi 23-24 avril** : je code l'implémentation via skill `/refonte-site` (à créer).

**Samedi 25 avril** : site live.

---

## Rappels critiques

1. **JAMAIS Claude Design et Claude Code simultanément** — même sur Max 5x.
2. **Toujours laisser 20-30% de quota disponible** — les replies Apollo mardi peuvent arriver en urgence, tu ne veux pas te faire lockout.
3. **Valide un wireframe à la fois, pas tous en batch** — si Claude Design dérive, tu le corriges tôt.
4. **Screenshots + copie textes** de chaque session pour référence. Claude Design est en research preview, les données peuvent disparaître.
