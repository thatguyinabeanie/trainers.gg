# Hero Page — Journey Narrative Redesign

**Date:** 2026-03-25
**Status:** Approved

## Context

The current hero page (`apps/web/src/app/page.tsx`) highlights Tournaments, Organizations, and Analytics in a feature card grid. It does not communicate the platform's unique differentiators — particularly the Alts system, team privacy model, and community discovery features. This redesign reframes the page around the competitive player's journey, surfacing what makes trainers.gg distinct from any other Pokemon site.

**Primary audience:** Competitive players (not organizers).

---

## Design Decision: Journey Narrative Layout

The page is restructured as an 8-step narrative that walks a competitive player through their life on the platform. Each step has:

- A step number + label (e.g. `01 — Identity`)
- A headline
- A 2–3 sentence description
- A small illustrative UI preview (alternating left/right)

Coming Soon features use an amber badge and are teased rather than hidden — they signal platform direction and build anticipation.

---

## Hero Banner

**Headline:** Your home for competitive Pokémon *(unchanged)*

**Subheading:** Build your competitive identity, keep your strategies secret, and connect with players who take the game as seriously as you do.

**CTAs:** Get Started (primary) · Explore Players (secondary, links to `/players`)

---

## Steps

### 01 — Identity
**Headline:** One account. Every version of yourself.

**Copy:** Create multiple alts and compete under any name — public or private, your choice. Each alt has its own teams, stats, and tournament history, so your strategies stay organized no matter how many identities you run. No juggling accounts.

**UI preview:** Two alts shown with their teams nested underneath, each team showing 🌐 or 🔒 status.

---

### 02 — Teams
**Headline:** Your strategies stay secret until you play them.

**Copy:** Teams are private by default. They only go public once you've played them in a tournament — no meta leaks, no early reveals, no accidental scouting.

**UI preview:** Team list showing one private team ("Not yet played") and one public team ("Spring Cup 2026 · 6-2").

---

### 03 — Build Smarter *(Coming Soon)*
**Headline:** Build with the meta, not against it.

**Copy:** The team builder surfaces what's actually working — usage rates, win rates, and popular cores drawn from publicly played tournament teams on trainers.gg. Coming soon: full analytics including data from official regionals.

**UI preview:** Meta usage bar chart (Miraidon 41%, Tornadus 34%, Incineroar 29%) with amber "Regionals data integration coming soon" callout.

**Note:** Data source is teams publicly played on trainers.gg. Regionals data integration is a separate future milestone (no existing ticket at time of writing).

---

### 04 — Compete
**Headline:** Run events built for competitive Pokémon.

**Copy:** Organize tournaments with Swiss pairings, automatic standings, and bracket play. Players get results tracked to their profile automatically — no manual record keeping.

**UI preview:** Round 3 pairings list.

**Scope note:** Frame around running events — do not mention "local tournaments" as that is not a supported use case.

---

### 05 — Profile
**Headline:** Your competitive story, one link.

**Copy:** Every tournament, team, and result lives on your public profile. Share it with organizers, teammates, or opponents — one link that shows exactly how you play.

**UI preview:** Player profile card showing tournament count, win rate, article count.

---

### 06 — Articles *(Coming Soon)*
**Headline:** Write. Share. Remember.

**Copy:** Anyone can publish guides, team reports, and tournament recaps. Use articles as private notes for your own team, or share insights with the whole community.

**UI preview:** Two article cards with title, author, and read count.

---

### 07 — Coaching *(Coming Soon)*
**Headline:** Level up with a personal coach.

**Copy:** Coaches are discoverable in the player directory and on their profile — identified by a coach badge so you always know who's available to help. Coming soon: book sessions directly, share your teams for session prep without copy-pasting, and get personalized guidance from players who know the meta.

**UI preview:** Player directory snippet showing two entries — one with a "Coach" badge next to the username.

**Scope note:** The coach badge in the directory and on profiles is Phase 1 (TGG-257). Team sharing for sessions is Phase 3 (TGG-275) — teased in copy as coming soon, not presented as near-term.

**Linear tickets:** [TGG-257](https://linear.app/thatguyinabeanie/issue/TGG-257) — Profile coaching tab integration · [TGG-275](https://linear.app/thatguyinabeanie/issue/TGG-275) — In-session shared workspace.

---

### 08 — Community
**Headline:** Find who's competing — and where they hang out.

**Copy:** Search players by format, country, or name and browse the leaderboard. Coming soon: a searchable index of competitive Pokémon Discord servers — find your community in one place.

**UI preview:** Player directory leaderboard (top 2 entries) + amber "Discord Server Index — Coming soon" callout.

**Linear ticket:** [TGG-328](https://linear.app/thatguyinabeanie/issue/TGG-328) — Discord Server Index feature.

---

## Closing CTA

**Headline:** Ready to build your competitive identity?

**Subheading:** Join trainers.gg and start your journey.

**Button:** Create your account

---

## Implementation Notes

### Files to modify
- `apps/web/src/app/page.tsx` — main hero page, replace feature card grid with journey sections
- `apps/web/src/components/landing/feature-cards.tsx` — replace or repurpose for journey layout
- `apps/web/src/components/landing/coming-soon-cards.tsx` — may be replaced by inline "coming soon" badges on journey steps

**All per-step UI previews are static JSX** — hardcoded illustrative data only, no live queries. Do not wire real data to the preview panels.

### New components likely needed
- `apps/web/src/components/landing/journey-section.tsx` — reusable left/right alternating section wrapper
- Inline UI preview components per step (can be static/decorative, not real data)

### Existing components to keep
- `apps/web/src/components/landing/hero-cta.tsx` — auth-aware CTA buttons, keep as-is
- `apps/web/src/components/landing/upcoming-tournaments-preview.tsx` — consider whether to keep the live tournament preview below the journey sections or remove it
- `apps/web/src/components/landing/upcoming-tournaments-skeleton.tsx` — keep if tournaments preview stays

### Styling
- Step labels: small uppercase teal (`text-primary`) with step number
- Coming Soon badge: amber (`text-amber-500 bg-amber-500/10`)
- Alternating layout: odd steps text-left/preview-right, even steps preview-left/text-right
- Follows existing minimal flat design: no borders, subtle background differentiation

### Tests
- Update existing landing component tests
- Add tests for journey section rendering and coming-soon badge display

---

## What This Replaces

| Old | New |
|-----|-----|
| Feature card grid (Tournaments, Organizations, Analytics) | 8-step journey narrative |
| Coming Soon cards (Team Builder, Coaching) | Inline "Coming soon" badges on Steps 03, 06, and 07 |
| Generic subheading | Player-focused subheading emphasizing identity + secrecy + community |
