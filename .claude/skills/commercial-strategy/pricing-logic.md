# Pricing Logic — Ghost Tax Commercial Strategy

## Why €490 Works

The number is not arbitrary. It sits at the intersection of three constraints:

1. **CFO discretionary threshold.** In most European mid-market companies (100-2000 employees), a CFO can approve €500 without a committee, a procurement process, or a business case. This is petty cash for a finance executive. The moment you cross ~€1,000, you trigger approval workflows that add weeks and kill conversion.

2. **Credibility floor.** Below €200, the offer reads as a toy — a SaaS tool pretending to be intelligence. A CFO won't take a €99 "IT cost report" seriously. It pattern-matches to cheap automated tools, not to the strategic decision support Ghost Tax actually delivers.

3. **Impulse ceiling.** At €490, the risk calculus is: "If this report finds even one €10K savings opportunity, I got 20x return. If it's useless, I lost the equivalent of a team dinner." No rational CFO agonizes over this decision. That's the point.

**The behavioral math:** €490 is low enough to buy on curiosity, high enough to read as professional, and cheap enough that a bad outcome doesn't damage the buyer's credibility internally.

---

## Geo-Pricing: DACH at €590

**Why DACH pays more:**
- German IT budgets are 15-25% higher than UK/NL equivalents for same-size companies
- German procurement culture values thoroughness — a higher price signals more rigorous analysis
- VAT-inclusive expectations differ; €590 pre-VAT lands at ~€702 with German MwSt, still under €750 discretionary threshold
- German CFOs are more suspicious of cheap tools than UK counterparts

**Why not more than €590:**
- Ghost Tax has zero brand recognition. Premium pricing requires proof. €590 is the maximum credible price for an unknown vendor selling intelligence based on public data
- Going to €690+ triggers the "who are you to charge this?" objection before the free scan can answer it
- The goal is volume at this stage, not margin optimization. With COGS at ~€2.50, the difference between €490 and €590 is noise on margins but meaningful on conversion

**Implementation:** `lib/pricing.ts` handles geo-detection. DACH (DE/AT/CH) routes to €590. UK/NL/rest routes to €490. No user-facing toggle — pricing is automatic based on company HQ location detected during scan.

---

## The "490 vs Alternatives" Frame

This is the single most important pricing argument. Never defend €490 in isolation. Always frame against alternatives:

| Alternative | Cost | Timeline | What You Get |
|---|---|---|---|
| **Ghost Tax Rail A** | **€490** | **48 hours** | Decision Pack with vendor map, savings estimates, action items |
| Zylo / Productiv | €50,000-150,000/yr | 3-6 months to value | SaaS management platform (requires integration, internal champion, ongoing subscription) |
| Big 4 IT audit | €80,000-300,000 | 4-8 months | Comprehensive audit (requires months of interviews, system access, internal resources) |
| Internal audit | €0 direct cost | 6-12 months | Self-directed analysis (requires dedicated FTE, cross-department coordination, tool procurement) |
| Do nothing | €0 | Immediate | Continue overspending estimated €200K-1M+/year |

**The frame that converts:** "You can spend €490 to find out in 48 hours what a Big 4 firm would charge €150K and 6 months to tell you. The worst case is you wasted €490. The best case is you found six figures in savings before your next board meeting."

**The frame that kills conversion:** "Our report is only €490." The word "only" signals you think it's cheap, which signals you think it might not be worth it.

---

## Price Anchoring Strategy

**On the pricing page:**
- Rail C (€20K+) is listed first or most prominently — it anchors the visitor's perception of what IT cost intelligence costs
- Rail B (€4,990) appears as the "recommended" option — it's the rational middle
- Rail A (€490) appears as "Start Here" — it's the obvious entry point after seeing the anchors

**In content and outreach:**
- Always mention what the alternatives cost BEFORE mentioning Ghost Tax pricing
- Reference "the average IT cost audit costs €80K-300K" in every context where pricing appears
- The free scan teaser should include a line like "companies like yours typically overspend €X — a full analysis of this would normally cost €80K+"

**Never do:**
- Compare to other €500 products (different category, wrong anchor)
- List Rail A pricing without Rail B and Rail C visible
- Use percentage discounts (signals negotiable pricing)

---

## Discount Policy

**Public pricing is non-negotiable.** €490 (€590 DACH) is the price. No volume discounts, no "reach out for custom pricing," no enterprise tiers on Rail A.

**Strategic exceptions (private, code-based):**
- Early adopter codes for first 20 clients: 20% off (€392/€472 DACH) — creates urgency, builds reference base
- Industry-specific launch codes for targeted verticals: 15% off — tracks which verticals convert
- Partner/referral codes: 10% off — attribution mechanism

**How codes work:**
- Time-limited (expire in 14 days)
- Single-use or limited-use (max 5 redemptions per code)
- Never advertised publicly — delivered via direct outreach or content
- Tracked: every code maps to a campaign, so conversion attribution is clean

**Why never discount publicly:**
- A visible discount on a €490 product signals desperation
- It trains buyers to wait for sales
- At 99.5% margin, discounting is revenue destruction for zero cost benefit

---

## Bundle Economics: A→B Upsell

**Target conversion rate:** 10-12% of Rail A buyers upgrade to Rail B within 30 days.

**The math:**
- 100 Rail A sales = €49,000 revenue
- 10-12 upgrade to Rail B = €49,900-59,880 additional revenue
- Total from 100 initial buyers: ~€100K-109K
- Blended revenue per initial buyer: ~€1,000-1,090
- With Rail C (1-2% of Rail A over 12 months): blended LTV approaches €1,990

**What drives the 10-12%:**
- Report quality: if the Rail A report surfaces credible, specific findings, the CFO wants more
- Internal circulation: report gets forwarded → more stakeholders → more pressure to act → Rail B becomes "let's do this properly"
- Timing: Rail B offer appears in the report AND in a follow-up email 7 days post-delivery, timed to when the CFO has had time to read and share

**What kills the upsell:**
- Rail A report is generic or thin → no credibility → no upgrade
- Follow-up is aggressive or salesy → buyer retreats
- Rail B pricing isn't visible in the original report → upgrade feels like a bait-and-switch

---

## Free Must Stay Free, Paid Must Stay Non-Negotiable

**The free scan is free because:**
- It costs €0.05-0.15 to run
- It's the qualification mechanism — it filters out bad-fit companies before they waste a purchase
- It's the proof mechanism — it demonstrates capability before asking for money
- It's the viral mechanism — shareable results drive organic traffic
- Making it paid would kill the top of funnel entirely for an unknown brand

**The paid report is non-negotiable because:**
- Any price flexibility signals that the value is uncertain
- "Contact us for pricing" is code for "we don't know what this is worth" — death for self-serve
- At €490, negotiation is absurd — you don't haggle over the price of a business book
- Fixed pricing enables fully automated checkout with zero human intervention

---

## Pricing Credibility

**The "too cheap" problem:**
- A €490 IT cost analysis sounds suspicious to someone used to €100K+ Big 4 engagements
- Solution: the free scan proves capability BEFORE price is revealed. By the time the visitor sees €490, they've already seen Ghost Tax identify their vendors and estimate their spend. The question shifts from "is this real?" to "this is real and it's only €490?"
- The methodology page, sample report, and confidence-level framework all pre-answer "how can this be so cheap?" — the answer is: no consultants, no system access, no 6-month timeline. AI + public data + benchmarks.

**The "too expensive for estimates" problem:**
- Some buyers will say "I'm not paying €490 for guesses"
- Solution: confidence levels on every estimate, transparent methodology, and the "money-back if we can't identify at least 5 vendors" guarantee (costs nothing because the scan already verified this before checkout)
- The free scan already showed them 2-3 findings. They know it works. €490 is for the full picture.

---

## Cost Structure

| Item | Cost per Report |
|---|---|
| AI inference (GPT-4/Claude API calls) | ~€1.50-2.00 |
| Data enrichment (public sources, DNS, tech stack detection) | ~€0.30-0.50 |
| Infrastructure (compute, storage, delivery) | ~€0.10-0.20 |
| **Total COGS** | **~€2.00-2.70** |
| **Gross margin** | **99.4-99.6%** |

**Breakeven analysis:**
- Fixed costs (tools, hosting, domains): ~€200/month
- At €490/report: breakeven at 1 report/month
- At 10 reports/month: €4,700 profit after COGS
- At 50 reports/month: €24,350 profit after COGS

The margin structure means every pricing decision is about conversion optimization, not cost management. The question is never "can we afford to deliver this?" — it's always "how do we get the next buyer to checkout?"
