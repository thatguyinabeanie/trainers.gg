# Monetization & Ads

The revenue (money-_in_) companion to `docs/cost-model.md` (cost, money-_out_). Where the cost
doc asks "how do we accrue and contain hosting cost," this one asks "how does trainers.gg earn —
and what guardrails apply." It goes deep on **ads**, the near-term lever.

The high-level revenue picture lives in the `product-vision` skill (the source of truth for
_which_ streams exist); this doc is the detailed working-through of ads specifically. Companion to:

- `docs/cost-model.md` — the cost side; ads exist partly to offset that bill.
- `.claude/skills/product-vision/SKILL.md` — the revenue-streams table (coaching, ads, premium).
- `docs/marketing.md` — brand positioning (the _trust > reach_ stance that shapes ad choices).

---

## TL;DR

- **Ads are a deferred lever, not a launch feature.** `product-vision` already lists advertising
  as _"Planned — not a priority, added once the community is established."_ This doc records the
  path, it does not green-light shipping ads.
- **Brand pulls against ads.** Our own positioning: _"Ads buy reach; reach isn't our bottleneck.
  Trust is."_ Whatever we run must protect trust first.
- **Compliance is the gate, not a footnote.** The audience is **all ages**. Serving ads to minors
  triggers **COPPA** (US) and **GDPR-K** (EU). A privacy policy + an age-gating decision are
  **prerequisites** before any ad ships.
- **Safest first step is the least ad-like one** — direct sponsorships / house ads and contextual
  (non-personalized) ads, on adult-facing public pages only.

---

## Revenue streams at a glance

The three streams and their status come from `product-vision` — don't duplicate that table, link
to it. Summary for context:

| Stream                    | Status (per product-vision) | This doc?                                            |
| ------------------------- | --------------------------- | --------------------------------------------------- |
| Coaching-marketplace fees | Coming Soon                 | No — see `product-vision`.                           |
| **Advertising**           | **Planned** (deferred)      | **Yes — the focus below.**                           |
| Premium features          | Not yet defined             | No — community-first; monetization follows adoption. |

Ads are the focus here because they're the stream most entangled with **cost** (they offset it)
and with **compliance** (all-ages audience) — so they need the most working-through before anyone
acts.

---

## Ads as a cost-offset lever

Ads are one way to offset the hosting bill in `docs/cost-model.md` once traffic is meaningful.
Two things have to be true first: (1) enough audience that ad revenue clears the friction it adds,
and (2) the compliance gate below is resolved.

**Rough revenue framework (a formula, not a forecast):**

```
monthly ad revenue ≈ monthly ad impressions × fill rate × (CPM ÷ 1000)

  monthly ad impressions ≈ page views × ad slots per page
  fill rate               = share of slots an advertiser actually buys (0–1)
  CPM                     = revenue per 1,000 filled impressions (set by the network/deal)
```

> 📐 **Illustrative only — plug in real numbers before trusting any total.** Display CPMs for an
> all-ages, contextual (non-personalized) gaming/hobby audience tend to be **low** (often low
> single-digit dollars), and fill rate is rarely 100%. Treat ad revenue as a _modest offset_ to
> cost, not a primary income line, until proven otherwise. Confirm real CPM + fill with whatever
> network or sponsor is actually chosen — same rule as the cost doc: don't trust hardcoded numbers.

The takeaway: ads can chip at the hosting bill, but the realistic ceiling for a community-scale,
brand-safe, contextual setup is small. That reframes ads as "nice offset," not "the business."

---

## Compliance is the gate (COPPA / GDPR-K)

This is the part that decides _whether_ and _how_ ads can run at all.

- **Audience is all ages.** The product is explicitly for all ages, and `users.birth_date` is
  captured (`packages/supabase/src/types.ts`, validated via `packages/validators/src/user.ts`).
  So we have the data to know some users are minors — which means we can't claim ignorance.
- **No privacy/compliance doc exists today.** There is no privacy policy, age-gating flow, or
  consent mechanism in the codebase. All of that is prerequisite work, not yet started.

**Regulatory shape (general — not legal advice; confirm with counsel):**

| Regime           | What it broadly means for ads to minors                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **COPPA** (US)   | Behavioral/targeted advertising to children **under 13** is restricted; collecting their personal info (incl. persistent ad identifiers) needs verifiable parental consent. "Mixed-audience" sites may age-screen and treat under-13 users differently. |
| **GDPR-K** (EU)  | Children's data gets special protection; the age of valid consent for data processing is **13–16 depending on member state**. Behavioral ads to children are problematic.                                                                              |

> ⚠️ **COPPA rules were updated recently — confirm current requirements with counsel before
> relying on any specific here.** This table is the _shape_ of the obligation, not a compliance plan.

**Handling options (in order of brand + compliance safety):**

1. **Contextual / non-personalized ads only** _(recommended default)_ — ads chosen by page topic,
   not by user profile. No behavioral tracking ⇒ the COPPA/GDPR-K burden largely falls away, and
   it fits the brand. The realistic starting point.
2. **Age-gate + personalized only for verified adults** — serve behavioral ads only to users
   confirmed 18+ (or local adult age); minors get contextual or none. Requires real age-gating —
   a meaningful build, not just reading `birth_date`.
3. **No ads to logged-in minors at all** — simplest conservative stance; pairs with #1 for
   logged-out/public traffic.

---

## Brand fit & guardrails

The brand is **community-first, warm, _not_ esports** — and _trust > reach_. Ads must not make the
site feel like an ad-saturated gamer portal (the explicit anti-reference). Guardrails:

- ❌ **No intrusive formats** — no interstitials, autoplay video, pop-ups, or layout-shifting ads.
- ✅ **Prefer relevant / house ads** — TCG shops, tournament sponsors, our own feature promos —
  over generic remnant inventory.
- 📏 **Density limits** — few slots, clearly bounded; the content is the product, not the ad.
- 🏷️ **Label clearly** — sponsored/ad content is unambiguously marked. Trust first.

---

## Placement options (options, not decisions)

| Could fit (adult-facing, public, content-adjacent) | Avoid                                            |
| -------------------------------------------------- | ------------------------------------------------ |
| Public content pages (e.g. `/data` meta explorer, public tournament listings) | Inside the team builder workflow                 |
| Sidebar / between-content slots on those pages     | Match / battle / live-event flows                |
|                                                    | Anything served to a logged-in minor             |

These are candidates to weigh later, not a chosen layout.

---

## Ad-network candidates (options + tradeoffs)

Ordered by brand fit and lowest compliance burden first:

1. **Direct sponsorships / house ads** — best brand fit, fully contextual, **sidesteps
   behavioral-ad compliance** (no third-party tracking). Most manual to sell. The natural first move.
2. **Contextual ad networks** — non-personalized inventory keyed to page topic. Moderate effort;
   keeps the compliance burden low. The scalable version of #1.
3. **Personalized / behavioral networks** — highest revenue potential, **highest compliance and
   brand risk**; only viable behind robust age-gating, and even then questionable for an all-ages
   community site.

> 🔎 **Verify each network's child-audience / mixed-audience policy before adopting it** — major
> networks have specific rules (and sometimes outright restrictions) for sites that reach children.

---

## Rollout sequence

Each phase is gated on _community established_ (per product-vision) **and** the compliance gate.

- **Phase 0 — Prerequisites (blocking):** publish a privacy policy; decide age-gating; confirm a
  cost/traffic trigger that makes ads worth the friction.
- **Phase 1 — Direct sponsorships / house ads:** lowest risk, contextual, no third-party tracking.
- **Phase 2 — Contextual network ads:** adult-facing public pages only, density-limited.
- **Phase 3 — Revisit personalized:** _only_ if verified age-gating exists and the brand/compliance
  case clears. May simply never be worth it.

---

## Open decisions & owners

| Decision                                                       | Owner            | Status   |
| ------------------------------------------------------------- | ---------------- | -------- |
| Whether/when to run ads at all (community-established trigger) | Product          | Deferred |
| Privacy policy + age-gating approach (COPPA / GDPR-K)          | Legal / Compliance | **Prerequisite — not started** |
| Network vs. direct-sponsorship choice                         | Product          | Deferred |
| Implementation (ad slots, consent, CSP, components)           | Eng / Infra      | Deferred — **separate code-touching branch** |

All deferred. **No ad code, consent banner, privacy page, or age-gating is built on this branch** —
this doc records the strategy and constraints only.

---

## Related docs

- `docs/cost-model.md` — the cost side ads are meant to offset.
- `.claude/skills/product-vision/SKILL.md` — the revenue-streams table (source of truth).
- `docs/marketing.md` — brand positioning (_trust > reach_).
- `.claude/skills/competitive-landscape/SKILL.md` — positioning vs. other platforms.
- `docs/decisions/2026-06-11-data-access-and-rls-decisions.md` — cost/architecture context.
