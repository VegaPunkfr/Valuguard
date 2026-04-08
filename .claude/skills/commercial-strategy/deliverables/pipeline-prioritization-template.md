# Pipeline Prioritization Template — Scoring and Prioritization Framework

## Purpose

Not all prospects are equal. This framework scores, ranks, and routes every prospect to ensure time goes to the highest-value opportunities first. Critical for a solo founder with zero sales team.

---

## 1. Lead Scoring Model

### Fit Score (Does this prospect match our ICP?)

| Criterion | Weight | Score 0 | Score 1 | Score 2 | Score 3 |
|-----------|--------|---------|---------|---------|---------|
| Company size | 20% | <50 employees | 50-199 | 200-2000 | 2000+ with mid-market culture |
| Geography | 20% | Outside target markets | Adjacent market | UK or NL | DACH |
| IT spend indicators | 20% | <10 SaaS tools visible | 10-30 tools | 30-50 tools | 50+ tools or known high IT spend |
| Role match | 20% | Unknown role | IT/Ops | VP Finance | CFO / Finance Director |
| No anti-patterns | 20% | Multiple anti-patterns | One anti-pattern | Clean but unverified | Verified clean |

**Fit Score** = Weighted sum (max 3.0)

### Intent Score (Is this prospect showing buying signals?)

| Signal | Points |
|--------|--------|
| Completed free scan | +30 |
| Visited pricing page | +20 |
| Opened email 3+ times | +15 |
| Replied to email (positive) | +25 |
| Clicked CTA in email | +10 |
| Downloaded sample report | +20 |
| Multiple visits from same company domain | +25 |
| LinkedIn profile view after outreach | +5 |
| Visited checkout page | +35 |
| Started checkout but abandoned | +40 |
| Replied to email (negative/unsubscribe) | -50 |
| Bounced email | -100 |

**Intent Score** = Sum of all signals (no cap)

### Combined Priority Score

```
Priority = (Fit Score x 30) + Intent Score

Tiers:
  HOT (Priority > 100):   Immediate action. Same-day response.
  WARM (Priority 50-100):  Next-day action. Personalized follow-up.
  COOL (Priority 20-49):   Batch weekly. Automated sequence.
  COLD (Priority < 20):    Nurture only. Monthly content drip.
  DEAD (Priority < 0):     Remove from active pipeline.
```

---

## 2. Pipeline Stages

| Stage | Definition | Entry Criteria | Exit Criteria | Max Time in Stage |
|-------|-----------|---------------|---------------|-------------------|
| **S0: Identified** | Prospect matches ICP, not yet contacted | Passes fit score threshold | First touch sent | 7 days |
| **S1: Contacted** | First outreach sent | Email or LinkedIn message delivered | Response received OR 3 touches completed | 21 days |
| **S2: Engaged** | Prospect responded or completed scan | Any positive engagement signal | Scan completed OR pricing page visited | 14 days |
| **S3: Evaluating** | Prospect is actively considering purchase | Scan completed + pricing page visit | Checkout initiated OR explicit "not now" | 14 days |
| **S4: Checkout** | Prospect initiated purchase | Checkout page reached | Payment completed OR abandoned | 3 days |
| **S5: Won** | Payment received | Payment confirmed | Report delivered | 48 hours |
| **S6: Delivered** | Report delivered | Report sent | Rail B opportunity identified OR closed | 30 days |
| **LOST** | Prospect explicitly declined or went dark | Unsubscribed, bounced, or no response after full sequence | N/A | N/A |

---

## 3. Pipeline View

```
## Pipeline Snapshot — Week of [DATE]

| Stage | Count | Value (EUR) | Avg Days in Stage | Conversion to Next |
|-------|-------|-------------|-------------------|--------------------|
| S0: Identified | [N] | [N x 490] | [DAYS] | [%] |
| S1: Contacted | [N] | [N x 490] | [DAYS] | [%] |
| S2: Engaged | [N] | [N x 490] | [DAYS] | [%] |
| S3: Evaluating | [N] | [N x 490] | [DAYS] | [%] |
| S4: Checkout | [N] | [N x 490] | [DAYS] | [%] |
| S5: Won | [N] | [ACTUAL EUR] | [DAYS] | — |
| S6: Delivered | [N] | [ACTUAL EUR] | [DAYS] | [% to Rail B] |
| LOST (this week) | [N] | — | — | — |

**Total pipeline value**: [EUR]
**Weighted pipeline value**: [EUR — adjusted by stage conversion probability]
**Pipeline velocity**: [EUR per week moving through to Won]
```

---

## 4. Daily Prioritization Queue

For a solo founder, this is the daily action list. Generated from pipeline data.

```
## Today's Actions — [DATE]

### MUST DO (Hot prospects, time-sensitive)
1. [PROSPECT] — [STAGE] — [ACTION NEEDED] — [WHY URGENT]
2. [PROSPECT] — [STAGE] — [ACTION NEEDED] — [WHY URGENT]

### SHOULD DO (Warm prospects, important but not urgent)
3. [PROSPECT] — [STAGE] — [ACTION NEEDED]
4. [PROSPECT] — [STAGE] — [ACTION NEEDED]

### BATCH (Cool prospects, automate or batch)
- [N] prospects need first touch — scheduled for [TIME]
- [N] prospects need follow-up — automated drip handles

### SKIP TODAY
- [N] cold prospects in nurture — no action needed
- [N] prospects waiting (in sequence, not yet due for next touch)
```

---

## 5. Stale Pipeline Rules

Prospects that sit too long in a stage are wasting mental energy. Enforce these limits.

| Rule | Trigger | Action |
|------|---------|--------|
| S1 timeout | In "Contacted" > 21 days, no response | Move to LOST. Add to re-engagement list for 90 days later. |
| S2 timeout | In "Engaged" > 14 days, no progression | Send break-up email. If no response in 72h, move to LOST. |
| S3 timeout | In "Evaluating" > 14 days | Send urgency message (findings expire, market data refreshes). If no action in 7 days, move to COOL. |
| S4 timeout | In "Checkout" > 3 days (abandoned) | Send checkout recovery email. If no completion in 48h, move back to S3. |
| Dead email | Email bounced | Remove immediately. Do not retry. |
| Explicit no | Prospect said "not interested" | Respect it. Move to LOST. Re-engage in 6 months only if trigger event detected. |

---

## 6. Pipeline Health Metrics

Review weekly.

| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| S0 → S1 conversion (Identified → Contacted) | >90% | 70-90% | <70% |
| S1 → S2 conversion (Contacted → Engaged) | >15% | 8-15% | <8% |
| S2 → S3 conversion (Engaged → Evaluating) | >30% | 15-30% | <15% |
| S3 → S5 conversion (Evaluating → Won) | >20% | 10-20% | <10% |
| Average days S0 → S5 | <30 | 30-60 | >60 |
| Pipeline coverage ratio (pipeline value / target revenue) | >3x | 2-3x | <2x |
| Stale prospects (% in any stage > max time) | <10% | 10-25% | >25% |

---

## 7. Market-Specific Prioritization

| Factor | DACH | UK | NL |
|--------|------|-----|-----|
| Price point | 590 EUR | 490 EUR | 490 EUR |
| Revenue per win | Higher | Standard | Standard |
| Decision speed (typical) | Slower (2-4 weeks) | Faster (1-2 weeks) | Medium (1-3 weeks) |
| Priority multiplier | 1.2x (higher revenue) | 1.0x | 1.0x |
| Best outreach days | Tue-Thu | Tue-Thu | Tue-Thu |
| Language | German or English | English | English |

Apply market multiplier to Priority Score for cross-market comparison.

---

## 8. Re-Engagement Protocol

For LOST prospects that might become viable again:

| Time Since Lost | Trigger to Re-Engage | Action |
|----------------|---------------------|--------|
| 90 days | New content published relevant to their industry | Send value-first email (no pitch) |
| 90 days | Trigger event detected (new CFO, M&A, etc.) | Treat as new S0 prospect with context |
| 180 days | Market shift (new regulation, vendor price hike) | Send market intelligence email |
| Never | They explicitly said "never contact again" | Respect it permanently |
