# Revision Protocol — Strategy Drift Detection & Correction

## Purpose

Strategy decays. Markets shift, assumptions expire, proof gets stale, positioning drifts. This protocol forces regular detection and correction before drift becomes crisis.

---

## Five Types of Drift

### 1. Market Drift
The market moved but your strategy didn't.

**Signals**:
- Competitor launched a similar or better product
- Regulatory change affects your value prop (EU AI Act, NIS2, DORA)
- Buyer behavior shifted (new tools, new procurement process)
- Macro conditions changed (budget freezes, hiring freezes, M&A wave)
- Industry analyst coverage shifted focus

**Detection method**: Monthly market scan. Compare current market conditions against the assumptions baked into your strategy docs. Flag any assumption that is no longer true.

**Ghost Tax example**: If FinOps platforms add external spend analysis, the "zero system access" differentiator weakens. If SaaS inflation normalizes, urgency drops.

---

### 2. Positioning Drift
You're describing yourself differently than you intended, or the market perceives you differently than you describe yourself.

**Signals**:
- Prospects describe you using words you don't use
- Your messaging on different channels has diverged (LinkedIn says X, email says Y, website says Z)
- You're attracting the wrong ICP
- Sales conversations (or in Ghost Tax's case, scan usage patterns) don't match your positioning

**Detection method**: Quarterly audit of all messaging surfaces. Compare against positioning statement. Check: Does every touchpoint reinforce the same core message?

**Ghost Tax example**: If website says "Decision Intelligence" but cold emails say "SaaS audit", you have positioning drift. Pick one.

---

### 3. Proof Drift
Your evidence is stale, irrelevant, or has been superseded.

**Signals**:
- Case studies are more than 12 months old
- Market data cited is from previous year
- Competitive comparisons reference features/pricing that changed
- Testimonials are from companies that churned or no longer exist
- Your "results" claims can't be backed by current data

**Detection method**: Monthly proof inventory. List every proof asset, its date, and its current validity.

**Ghost Tax example**: Pre-revenue, proof drift = citing market stats that have been updated. Once you have customers, proof drift = not updating case studies as new (better) results come in.

---

### 4. Pricing Drift
Your price no longer matches your value, your market, or your competition.

**Signals**:
- Win rate dropping without product changes
- Prospects consistently say "too expensive" or (worse) never mention price at all
- Competitors moved their pricing significantly
- Your cost structure changed
- You added features/value but didn't adjust price
- Currency fluctuations changed effective pricing across markets

**Detection method**: Quarterly pricing review. Compare: value delivered vs. price charged, competitor pricing, conversion rates by price point, currency effects on DACH/UK/NL pricing.

**Ghost Tax example**: 490 EUR Rail A was set based on "impulse buy for CFOs" logic. If conversion data shows price resistance, or if delivered value consistently exceeds 490 EUR worth, pricing needs adjustment.

---

### 5. Messaging Drift
Your message evolved organically and no longer matches your strategy.

**Signals**:
- A/B tests keep changing headlines without updating the core message framework
- Different team members (or AI agents) use different language
- Outbound messaging diverged from inbound messaging
- Your best-performing message contradicts your positioning

**Detection method**: Monthly message audit. Pull actual sent messages, actual landing page copy, actual LinkedIn posts. Compare against message-architecture-template.md.

**Ghost Tax example**: If cold emails evolved to emphasize "cost savings" but the strategic positioning is "decision intelligence", messaging has drifted from strategy. Either update strategy or fix messaging.

---

## Monthly Review Checklist

Run this on the first Monday of each month. Time budget: 2 hours maximum.

```
## Monthly Strategy Review — [MONTH YEAR]

### Market Changes
- [ ] Any new competitors or competitor moves?
- [ ] Any regulatory or compliance changes affecting our markets (DE/UK/NL)?
- [ ] Any shifts in buyer behavior or procurement?
- [ ] Any macro-economic changes affecting IT spending?
- [ ] Update market-intelligence file with new data

### Product Changes
- [ ] What did we ship this month?
- [ ] What did we learn from usage data?
- [ ] Any scan completion rate changes?
- [ ] Any checkout funnel changes?
- [ ] Any report delivery or quality changes?

### Hypothesis Review
- [ ] Review all ACTIVE hypotheses in experimentation-loop.md
- [ ] Any ready for verdict (KEEP/KILL/MODIFY)?
- [ ] Any new hypotheses to add?
- [ ] Any experiments to launch?

### Proof Inventory
- [ ] List all proof assets and their current validity
- [ ] Any proof expired or weakened?
- [ ] Any new proof acquired this month?
- [ ] What proof do we need most urgently?

### Pricing Check
- [ ] Conversion rate by price point stable?
- [ ] Any competitor pricing changes?
- [ ] Currency effects on DACH pricing?
- [ ] Any signals of price sensitivity or price indifference?

### Messaging Audit
- [ ] Pull 5 recent cold emails — do they match strategy?
- [ ] Check landing page — does it match current positioning?
- [ ] Check LinkedIn posts — consistent with brand voice?
- [ ] Any message performing significantly better/worse than expected?

### Actions
- [ ] List max 3 strategic adjustments for next month
- [ ] Update any strategy docs that are now out of date
- [ ] Kill any initiatives that monthly data doesn't support
```

---

## Quarterly Strategic Review Format

Deeper review every 3 months. Time budget: half day. Use strategy-review-template.md for the full format.

```
## Q[X] [YEAR] Strategic Review

### 1. Scorecard
| Metric | Target | Actual | Trend | Verdict |
|--------|--------|--------|-------|---------|
| Rail A sales | [N] | [N] | [up/down/flat] | [on track / behind / ahead] |
| Rail B sales | [N] | [N] | [up/down/flat] | [on track / behind / ahead] |
| Scan completions | [N] | [N] | [up/down/flat] | [on track / behind / ahead] |
| Scan-to-purchase conversion | [%] | [%] | [up/down/flat] | [on track / behind / ahead] |
| Revenue | [EUR] | [EUR] | [up/down/flat] | [on track / behind / ahead] |
| CAC | [EUR] | [EUR] | [up/down/flat] | [on track / behind / ahead] |

### 2. What Worked
[Max 3 things. Be specific. Include data.]

### 3. What Failed
[Max 3 things. Be specific. Include data. No euphemisms.]

### 4. Hypothesis Portfolio Review
- Hypotheses validated this quarter: [list]
- Hypotheses killed this quarter: [list]
- Hypotheses still active: [list]
- New hypotheses for next quarter: [list]

### 5. Strategic Bets for Next Quarter
[Max 3. Each must connect to a hypothesis and a revenue target.]

### 6. Kill List
[What are we stopping? Channels, ICPs, messaging, features, experiments.]

### 7. Resource Allocation
[Where does time/money go next quarter? Explicit trade-offs.]
```

---

## Kill Criteria

### When to Abandon a Strategy
- 3 consecutive months of declining key metrics with no identifiable fix
- Core assumption proven false (e.g., "CFOs buy without demos" but data shows they don't)
- Market window closed (competitor captured the position)
- Cost to continue exceeds maximum possible upside

### When to Abandon an ICP
- Conversion rate <1% after 200+ targeted interactions
- Average deal cycle >3x your target
- Retention rate <50% (they buy but don't renew/expand)
- Acquisition cost >LTV
- ICP requires capabilities you don't have and can't build in 90 days

### When to Abandon a Channel
- Cost per qualified lead >3x your best channel after 90 days
- Volume ceiling too low to matter (<10 leads/month at scale)
- Channel requires skills/resources you don't have (e.g., video production, event presence)
- Channel conflicts with brand positioning

### When to Abandon a Price Point
- Win rate <15% with price cited as primary objection (not just mentioned)
- Conversion drops >50% after price increase with no quality improvement
- Market data shows >3 competitors at significantly lower price with comparable offering
- Price requires sales involvement to justify (violates self-serve model)

---

## Strategy Document Version Control

### Versioning Rules
- Every strategy document has a version number: V1.0, V1.1, V2.0, etc.
- Minor updates (data refresh, small wording changes): increment minor version (V1.0 → V1.1)
- Major changes (new ICP, new pricing, new positioning): increment major version (V1.0 → V2.0)
- Every version change includes a changelog entry at the top of the document

### Changelog Format
```
## Changelog
- **V2.1 (2026-04-07)**: Updated DACH pricing from 490 to 590 EUR based on conversion data showing price insensitivity. Killed UK mid-market ICP segment (conversion <1% after 300 interactions).
- **V2.0 (2026-03-01)**: Major revision. Repositioned from "SaaS audit" to "Decision Intelligence". New messaging framework.
- **V1.0 (2026-01-15)**: Initial version.
```

### Documents That Must Be Version-Controlled
1. Master battle plan
2. ICP definitions
3. Pricing structure
4. Messaging framework
5. Competitive positioning
6. Revenue model assumptions

### Review Triggers (Outside Regular Schedule)
- Any single customer interaction that contradicts a core assumption
- Competitor raises >5M EUR or launches directly competing feature
- Conversion rate changes >20% in either direction without explanation
- New regulation announced affecting target markets
- Founder makes a strategic decision that contradicts current docs
