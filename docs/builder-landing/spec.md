# Team Builder Landing — Design Spec

**Status:** Design complete, pending implementation plan
**Date:** 2026-06-22
**Relationship to other work:** Complements (does not conflict with) `docs/builder-single-focus-redesign/`, which redesigns the per-Pokémon *editor* middle section. This spec covers the *entry experience* — what you see when you open the builder before editing a specific team.

---

## Context

Today, navigating to `/builder` drops you straight into editing a single team (localStorage-backed, works logged-out). Switching teams means digging through a `File ▾` menu. There is no "here are all my teams" surface — the gap this spec closes.

Pokémon Showdown's teambuilder is the reference standard: it lands on a list of your teams with format folders. **The goal is to beat that standard, not match it** — a rich, organized team-management home that leans into trainers.gg's real differentiators (accounts, alts, tournament/usage data) that Showdown's local-only model cannot offer.

---

## Goals

- A **landing surface** at `/builder` that lists all of a user's teams, richly organized.
- First-class support for **alts** (the key differentiator) without confusing them with the account.
- **Folders**: auto (generation→format), manual (hand-curated), and **Smart Folders** (saved queries).
- A **rich search** across every Pokémon detail, not just team names.
- Works equally well on **desktop and mobile**.
- The empty/first-run state is the *real workspace, just empty* — welcoming, never barren.

## Non-Goals

- Redesigning the editor itself (covered by `builder-single-focus-redesign`).
- Team sharing/social surfaces beyond a basic "Make public" toggle that already exists.
- The exact data source for "sample" starter teams (a follow-up — see Open Questions).

---

## Core Concepts

### Account vs Alt (the un-confusing rule)
- The **top-bar avatar = your account** (the human). Untouched by this feature.
- An **alt = a competitive identity** you own; teams belong to an alt (`teams.created_by → alts.id`).
- There is exactly **one** place to choose which alt you're viewing: the "Viewing" control (below).

### The three folder types
| Type | Icon | Source | Storage |
| --- | --- | --- | --- |
| **Auto** | 🧬 | Derived from each team's generation→format | None (computed) |
| **Manual** | ⭐ | Hand-curated buckets you drag teams into | New: folder + membership |
| **Smart** | ⚡ | A saved query that auto-populates | New: stored criteria/query |

> **Generation taxonomy:** Champions Reg M-A, Reg M-B, and Legends Z-A are all **Generation 9** (with the VGC regs). Auto-folders group as `Gen 9 ▸ {Champions Reg MA, VGC Reg H, Legends ZA, …}`. (Previously undocumented — also being folded into the `parsing-pokemon` skill.)

### Team lifecycle (sync states)
```
☁ Local draft  ──Save to alt──▶  ✓ Synced (on an alt, all devices, auto-saves)
(this device, no alt yet)
```
- **Default:** Local = pre-save scratch. Saving to an alt syncs it from then on.
- **Deliberate option:** a team can be kept **🔒 Local-only** on purpose (a private scratchpad that never leaves the device, even when logged in).
- **Login reconcile:** logging in with local drafts present shows a friendly banner — *"You built N teams on this device — save them to an alt?"* — with `Save to [alt] ▾` / `Keep local`.

---

## Layout

A **two-pane workspace** that lives inside the existing builder chrome (global top bar above, bottom dock below).

```
┌ top bar (global): trainers.gg / Builder · "My Teams" · ⚙ 🔔 · (A) account ┐
├ toolbar: Viewing [All alts][A admin][AK ash][▾ more]  🔍 Search…  [+ New Team] ┤
├──────────────┬───────────────────────────────────────────────────────────────┤
│ RAIL (slim,  │ MAIN: collapsible sections of rich row-cards                   │
│ collapsible) │   ▾ ⚡ Incomplete  (criteria chip)                              │
│ 🏠 All teams │      [row card]                                                 │
│ ⚡ Smart…    │   ▾ 🧬 Champions Reg M-B                                        │
│ 🧬 Gen 9…    │      [row card] [row card]                                      │
│ ⭐ My folders│   ▸ ⭐ Spicy Tech (collapsed)                                   │
└──────────────┴───────────────────────────────────────────────────────────────┘
└ bottom dock (global): disclaimer · © · (editor-only panels hidden on landing) ┘
```

- **Rail** = jump-nav / table of contents. Lists all three folder types **(not alts — those are in the toolbar pills)**. Collapsible (folds away). This keeps the side-pane light enough to address the earlier hesitation.
- **Main** = collapsible sections. Selecting a rail node scopes the main area; "All teams" shows everything grouped into sections. Nothing is hidden behind drilling — sections expand/collapse in place.

### Alt model — "Viewing" pills + overflow dropdown
- Alts surface as one-click **pills** led by **"All alts"**. With a few alts, all are visible.
- Past a limit, extras fold into a **`▾ more`** dropdown (which also holds "Manage alts").
- Account avatar stays in the top-right corner, visually distinct from the alt pills.

### Row-card anatomy
A full-width card (rich like a card, scannable like a list row):
`[6 sprites] · Team name · last-edited · format pill · sync badge (☁ Local / ✓ Synced) · alt mini-badge (when viewing All alts) · ⋯`

---

## Rich Search

A **smart single field** (command-palette style), scoped to the current "Viewing" selection with an `in: All alts` escape hatch.

- Fuzzy-matches across: team name, and per Pokémon — species, nickname, item, ability, all four moves, nature, tera type.
- As you type, **grouped suggestions** appear (Moves / Pokémon / Items / …). Pick one to lock a precise filter, or press enter for "anything containing this."
- Supports predicates beyond text: `incomplete`, `illegal`, `legal`, `has:tyranitar`, `format:reg-h`.
- **Results explain the match** ("matched `Move: Protect` on Tyranitar") and **highlight the matching sprite(s)**.

### Smart Folders
A Smart Folder is a **saved search that auto-populates**. Created two ways (both supported):
1. **Save from search** — run any query, click **"Save as Smart Folder"**, name it.
2. **Criteria builder** — a small rule builder for precise/compound rules (`Format is Reg H AND has Incineroar AND missing item`) that are awkward to type.

**Seeded defaults** ship in the rail (editable/removable): **Incomplete** (`< 6 Pokémon`), **Illegal** (`format_legal = false`), **Recently edited**. They demonstrate the feature and become useful the moment a team exists. Shown muted at count 0.

---

## Team Row Actions

Every action lives in the `⋯` menu (always available, mobile/a11y-safe). **Drag-and-drop is an enhancement on top**, never the only path:
- Drag a row onto an **alt pill** → move it to that alt.
- Drag a row onto a **folder** in the rail → file it.

`⋯` menu contents:
- Open / Edit · Rename · Duplicate
- **Move to alt ▸** (reassigns owner) · **Duplicate to alt ▸** (copies) · Move to folder ▸
- Keep local-only (toggle) · Export (Showdown paste) · Share / Make public
- Delete

> **Move to alt** reassigns `teams.created_by` to another alt the user owns — a **new capability** (today's `updateTeam` does not permit changing the owner; `forkTeam` only copies). See Implementation Considerations.

---

## Empty / First-Run

The full shell renders even with zero teams — alt pills, search, and rail (with muted seeded Smart Folders) are all present so the structure is learnable immediately. The welcome content sits **inside the main content area** where teams will appear:

- Headline + three on-ramps: **+ Build from scratch** (primary) · **📋 Import a paste** · **✨ Start from a sample**.
- 🧬 Gen 9 auto-group is hidden until at least one team exists.
- **Guest variant:** top-right becomes "Sign in"; the alt pill row becomes a subtle "Sign in to organize across alts." Everything else identical.

Smaller empties are designed too: empty folder (drag hint), no-search-results (suggest other terms), empty smart folder (e.g. "No teams Incomplete — nice work 🎉").

---

## Navigation & New Team

**Route per team.** `/builder` = landing; opening a team navigates to its **own URL** (`/builder/t/[id]`).
- Browser back returns to the list; links are shareable/bookmarkable; account teams load server-side (SSR).
- Local drafts get a stable local id (e.g. `/builder/t/local-ab12`).
- This is a real refactor: today's single `/builder` page splits into a **landing route** + an **editor route**.

**New Team** reuses the existing `NewTeamDialog`: name + format + `Save to [alt] ▾ / keep Local` + Empty/Import mode → lands you in the editor.

---

## Mobile

Single column, equal priority:
- Alt pills collapse into the **"Viewing" dropdown**; search goes full-width.
- A **"Folders" button opens the full rail tree as a bottom sheet** (thumb-reachable; matches the app's bottom-sheet pattern; scales to nesting).
- Sections stack and collapse; tap a card → editor; tap `⋯` → **actions bottom sheet** (hover has no mobile equivalent); drag falls back to the menus.
- `+ New` floats as a bottom-right FAB.

---

## Implementation Considerations (for the planning phase)

**Reuse (already exists):**
- Components: `apps/web/src/components/team-builder/` — `team-card.tsx`, `all-teams-client.tsx`, `teams-list-client.tsx`, `local-builder-workspace.tsx`, `NewTeamDialog`.
- Queries: `packages/supabase/src/queries/teams.ts` — `getTeamsForUser(userId)` (cross-alt list), `getTeamsForAltList`, `getTeamWithPokemon`.
- Mutations: `packages/supabase/src/mutations/teams.ts` — `createTeam`, `updateTeam`, `deleteTeam`, `forkTeam`.
- Server actions / API: `apps/web/src/actions/teams.ts`, `apps/web/src/lib/api/teams-client.ts`.
- Sprites: `getPokemonSprite(species)` → `{ url, w, h, pixelated }`.

**New capabilities needed:**
1. **Folders schema** — manual folders (folder rows + team↔folder membership) and Smart Folders (stored criteria/query). Auto-folders are derived (no storage). RLS scoped to the owning user.
2. **Move-to-alt (owner reassign)** mutation/RPC — reassign `teams.created_by`; RLS must verify the user owns *both* source and target alts.
3. **Rich-search data path** — `getTeamsForUser` is intentionally lightweight (species + `is_shiny` only). Searching moves/items/abilities needs fuller per-Pokémon data: either a heavier list query or a dedicated search RPC. Decide in planning.
4. **Routing split** — landing route + `/builder/t/[id]` editor route; local-draft id scheme.
5. **Unified list merge** — reconcile localStorage drafts with `getTeamsForUser` results into one badged list; login-reconcile banner flow.

**Data model (reference):** `teams` (`id`, `name`, `created_by → alts.id`, `format`, `is_public`, `format_legal`, `parent_team_id`, `updated_at`), `team_pokemon` (junction), `pokemon` (per-instance details).

---

## Open Questions / Follow-ups

- **Sample on-ramp source** — hand-curated vs data-driven from the shipped Meta Explorer / usage data. Resolve before building the "Start from a sample" button (can ship the other two on-ramps first).
- **Search execution** — client-side over a fuller fetched list vs a server-side search RPC (perf + data-access decision; see `deciding-data-access`).
- **Folder nesting depth** — manual folders flat vs nestable (start flat unless a need emerges).

---

## Locked Decisions Summary

| Area | Decision |
| --- | --- |
| Teams source | Unified list: local drafts + account teams, badged |
| Layout | Two-pane: collapsible rail + collapsible sections of rich row-cards (not flat) |
| Alts | "Viewing" pills + overflow dropdown; account avatar separate; alts not in the rail |
| Search | Smart field (fuzzy + grouped suggestions + predicates); match reasons + sprite highlight |
| Folders | Auto (🧬 Gen 9→format) + Manual (⭐) + Smart (⚡) |
| Smart Folders | Save-from-search **and** criteria builder; seeded defaults (Incomplete/Illegal/Recent) |
| Sync | Local = pre-save scratch (auto-sync once saved) **plus** deliberate Local-only; login reconcile banner |
| Move between alts | ⋯ "Move to alt" (reassign owner) + "Duplicate to alt" (copy); drag onto alt pill |
| Row interactions | Menus (always) + drag-and-drop (enhancement) |
| Empty/first-run | Full shell renders; welcome + 3 on-ramps inside main area; guest variant |
| Routing | Route per team: `/builder` landing + `/builder/t/[id]` editor |
| Mobile | Single column; alt dropdown; Folders → bottom sheet; actions → bottom sheet; `+ New` FAB |
