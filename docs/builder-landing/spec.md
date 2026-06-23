# Team Builder Landing — Full Design Spec

**Status:** Design complete, pending implementation plan
**Date:** 2026-06-22
**Companion docs:** [`README.md`](./README.md) (overview + mockup gallery) · `docs/builder-single-focus-redesign/` (the editor middle-section work — separate, non-overlapping)

> Every wireframe referenced below lives in [`mockups/`](./mockups/) as both a PNG and a self-contained HTML you can open in a browser. The **Decision Log** (§16) records why each choice won and what was rejected, each linked to its mock.

---

## 1. Context

Navigating to `/builder` today drops you **straight into editing a single team** (localStorage-backed, works logged-out). Switching teams means digging through a `File ▾` menu. There is no "here are all my teams" surface.

Pokémon Showdown's teambuilder is the reference standard: it lands on a list of your teams with format folders, stored only in the browser. **The goal is to beat that standard, not match it** — a rich, organized team-management home that leans into trainers.gg's real differentiators (accounts, **alts**, tournament/usage data) that Showdown's local-only model cannot offer.

---

## 2. Goals / Non-Goals

**Goals**
- A landing surface at `/builder` that lists all of a user's teams, richly organized.
- First-class **alts** support (the key differentiator) without confusing them with the account.
- **Folders**: auto (generation→format), manual (hand-curated), and **Smart Folders** (saved queries).
- A **rich search** across every Pokémon detail, not just team names.
- Equal desktop and mobile quality.
- An empty/first-run state that is *the real workspace, just empty* — welcoming, never barren.

**Non-Goals**
- Redesigning the editor itself (`builder-single-focus-redesign` owns that).
- Social/sharing surfaces beyond the existing "Make public" toggle.
- Finalizing the data source for "sample" starter teams (a follow-up — see §15).

---

## 3. Core Concepts

### 3.1 Account vs Alt (the un-confusing rule)
- **Top-bar avatar = your account** (the human). Untouched by this feature.
- An **alt = a competitive identity** you own; teams belong to an alt (`teams.created_by → alts.id`).
- There is exactly **one** place to choose which alt you're viewing — the "Viewing" control (§5). Alts are deliberately **not** a section in the folder rail, to avoid duplicating the account/alt distinction the chrome already carries.

### 3.2 The three folder types
| Type | Icon | Source | Storage |
| --- | --- | --- | --- |
| **Auto** | 🧬 | Derived from each team's generation→format | None (computed) |
| **Manual** | ⭐ | Hand-curated buckets you drag teams into | New: folder + membership |
| **Smart** | ⚡ | A saved query that auto-populates | New: stored criteria/query |

### 3.3 Generation taxonomy (was undocumented)
Champions **Reg M-A, Reg M-B, and Legends Z-A are all Generation 9** — same generation as the VGC regs (Reg H, etc.). Auto-folders group as `Gen 9 ▸ {Champions Reg MA, VGC Reg H, Legends ZA, …}`. Also being folded into the `parsing-pokemon` skill so it lives beyond this doc.

### 3.4 Team lifecycle (sync states)
```
☁ Local draft  ──Save to alt──▶  ✓ Synced (on an alt, all devices, auto-saves)
(this device, no alt yet)                              │
        └────────────── 🔒 Local-only (deliberate, sticky) ──────────────┘
```
See §9 for full behavior.

---

## 4. Layout & Chrome Integration

A **two-pane workspace** nested inside the existing builder chrome (global top bar above, bottom dock below). On the landing, the editor-only dock panels (Type matchups / Speed tiers / Damage calc) are hidden; the disclaimer + © remain.

```
┌ top bar (global): trainers.gg / Builder · "My Teams" · ⚙ 🔔 · (A) account ┐
├ toolbar: Viewing [All alts][A admin][AK ash][▾ more]   🔍 Search…   [+ New Team] ┤
├──────────────┬───────────────────────────────────────────────────────────────┤
│ RAIL (slim,  │ MAIN: collapsible sections of rich row-cards                   │
│ collapsible) │   ▾ ⚡ Incomplete  (criteria chip)                              │
│ 🏠 All teams │      [row card]                                                 │
│ ⚡ Smart…    │   ▾ 🧬 Champions Reg M-B                                        │
│ 🧬 Gen 9…    │      [row card] [row card]                                      │
│ ⭐ My folders│   ▸ ⭐ Spicy Tech (collapsed)                                   │
└──────────────┴───────────────────────────────────────────────────────────────┘
└ bottom dock (global): disclaimer · © ────────────────────────────────────────┘
```

- **Rail** = jump-nav / table of contents (folders only; collapsible, folds away).
- **Main** = collapsible sections. Selecting a rail node scopes the main area; "All teams" shows everything grouped into sections. Nothing is hidden behind drilling — sections expand/collapse in place.

This pairing is the merge of two folder-surface options (sections + rail) — see Decision 7. The chrome facts come from the live builder screenshots reviewed during design.

---

## 5. The "Viewing" Alt Control

![Alt pills + overflow dropdown — few-alts and many-alts states](mockups/alt-combo.png)

*Mock: [alt-combo.html](mockups/alt-combo.html)*

Alts surface as one-click **pills**, led by **"All alts"**. The account avatar stays in the top-right corner, visually distinct.

**States:**
- **Few alts** — all pills visible; one click switches scope.
- **Many alts** — extras fold into a **`▾ N more`** dropdown that opens the full list plus "Manage alts".

When **All alts** is active, each team row carries a small **alt mini-badge** so ownership stays legible across alts.

> Earlier options (scope-dropdown vs tabs) are in [alt-model.html](mockups/alt-model.html). See Decision 5.

---

## 6. Rich Search

![Smart search with grouped suggestions and match reasons](mockups/rich-search.png)

*Mock: [rich-search.html](mockups/rich-search.html)*

A **smart single field** (command-palette style), scoped to the current "Viewing" selection with an `in: All alts` escape hatch.

- **Matches across:** team name, and per Pokémon — species, nickname, item, ability, all four moves, nature, tera type.
- **As you type:** grouped suggestions appear (Moves / Pokémon / Items / …). Pick one to lock a precise filter, or press enter for "anything containing this."
- **Predicates** beyond free text: `incomplete`, `illegal`, `legal`, `has:tyranitar`, `format:reg-h`.
- **Results explain the match** — e.g. *"matched `Move: Protect` on Tyranitar"* — and **highlight the matching sprite(s)**.

> See Decision 6 for smart-field vs explicit filter-builder.

---

## 7. Organization: Rail + Sections

![Combined rail + collapsible sections, with Smart Folders](mockups/smart-folders.png)

*Mock: [smart-folders.html](mockups/smart-folders.html) · folder-surface options explored in [folders.html](mockups/folders.html)*

### 7.1 Rail (left, slim, collapsible)
Groups, top to bottom:
- `🏠 All teams (count)`
- `⚡ Smart` — seeded defaults + user-created (see §8)
- `🧬 Gen 9` — auto format sub-items (Reg M-B, Reg H, Legends ZA…); appears only once at least one team exists
- `⭐ My folders` — manual folders + `+ New folder`

Each item shows a live count. The rail collapses to reclaim width.

### 7.2 Main sections
The selected rail node scopes the main area. "All teams" renders everything as **collapsible sections** (`▾`/`▸`) grouped by generation→format and then manual/smart folders. Smart Folder sections show their **criteria as a chip** (e.g. `< 6 Pokémon`).

---

## 8. Smart Folders ⚡

![Smart Folders in the rail + criteria chip in the section header](mockups/smart-folders.png)

*Mock: [smart-folders.html](mockups/smart-folders.html)*

A Smart Folder is a **saved search that auto-populates**. Created **two ways** (both supported):

1. **Save from search** — run any query in the smart search, click **"Save as Smart Folder"**, name it.
2. **Criteria builder** — a small rule builder for precise/compound rules that are awkward to type, e.g. `Format is Reg H AND has Incineroar AND missing item`.

**Seeded defaults** ship in the rail (editable / removable), shown muted at count 0 until they match:
| Name | Criteria |
| --- | --- |
| Incomplete | `< 6 Pokémon` |
| Illegal | `format_legal = false` |
| Recently edited | updated within the last N days |

> See Decision 8 (creation method) and Decision 12 (seeding).

---

## 9. Sync / Local ↔ Account

![Local to Synced lifecycle, with login-reconcile banner](mockups/sync-model.png)

*Mock: [sync-model.html](mockups/sync-model.html)*

**Default behavior (pre-save scratch):**
- Build freely with no account → **☁ Local draft** (this device, no alt yet).
- Click **"Save to [alt]"** → becomes **✓ Synced**; from then it lives in your account and auto-saves across devices.
- Rule of thumb: **Local = not saved yet, Synced = saved & automatic.**

**Deliberate Local-only (sticky):**
- A team can be kept **🔒 Local-only** on purpose — a private scratchpad that never leaves the device, even while logged in. Set via the row's `⋯` menu (toggle). Carries a subtle "easy to lose if you clear the browser" caveat.

**Login reconcile banner** (shown when logging in with local drafts present):
> 👋 Welcome back — you built **N teams** on this device while signed out. Save them to an alt?  · `[Save to admin_trainer ▾]` `[Keep local]`

**Badges:** `☁ Local` (gray) · `🔒 Local-only` (gray, lock) · `✓ Synced` (teal).

> See Decision 9.

---

## 10. Team Row — Anatomy & Actions

![Row actions menu + move-between-alts via menu and drag](mockups/row-actions.png)

*Mock: [row-actions.html](mockups/row-actions.html)*

### 10.1 Row anatomy
`[6 sprites] · Team name · last-edited · format pill · sync badge · alt mini-badge (when viewing All alts) · ⋯`

Empty slots render as muted circles (e.g. a 4/6 draft shows two empty). Hovering elevates the row and reveals an **Open** quick-action + the `⋯`.

### 10.2 `⋯` menu (always available — the a11y / mobile path)
- Open / Edit · Rename · Duplicate
- **Move to alt ▸** (reassigns owner) · **Duplicate to alt ▸** (copies) · Move to folder ▸
- Keep local-only (toggle) · Export (Showdown paste) · Share / Make public
- Delete (destructive, styled red)

### 10.3 Moving between alts
- **Menu:** `Move to alt ▸` opens a submenu of the user's alts (current alt marked).
- **Drag (enhancement):** drag a row onto an **alt pill** to move it, or onto a **folder** in the rail to file it.
- **Move** reassigns ownership; **Duplicate to alt** copies (the existing fork behavior).

> See Decision 10 (menus + drag vs menus only).

---

## 11. Empty / First-Run States

![Empty state rendered inside the full shell](mockups/empty-merged.png)

*Mock: [empty-merged.html](mockups/empty-merged.html) · on-ramp options in [empty-states.html](mockups/empty-states.html)*

The full shell renders even with zero teams — alt pills, search, and rail (with muted seeded Smart Folders) are all present so the **structure is learnable immediately**. The welcome content sits **inside the main content area** where teams will appear (it is not a full-page takeover).

**Welcome content (logged-in, zero teams):**
- Headline: *"No teams yet — let's fix that"*
- Sub: *"Draft a squad, run the numbers, and organize it all here. Your first team shows up in this space."*
- On-ramps: **+ Build from scratch** (primary) · **📋 Import a paste** · **✨ Start from a sample**
- 🧬 Gen 9 auto-group hidden until ≥1 team exists.

**Guest variant:** top-right becomes **"Sign in"**; the alt pill row becomes a subtle *"Sign in to organize across alts."* Everything else identical. First-run headline reads *"Let's build your first team"* with a guest note: *"Building as a guest — your teams save to this device. Sign in to sync everywhere & organize across alts."*

**Smaller empties:**
- Empty folder: *"Nothing in ⭐ Spicy Tech yet — drag teams here, or + New team."*
- No search results: *"No teams match 'gholdengo'. Try another name, Pokémon, or move."*
- Empty smart folder: *"No teams are Incomplete right now — nice work. 🎉"*

> See Decision 11 (on-ramps) and Decision 12 (render-real-shell merge + seeding).

---

## 12. Navigation & New Team

![Landing to editor routing + reused New Team dialog](mockups/routing.png)

*Mock: [routing.html](mockups/routing.html)*

**Route per team.** `/builder` = landing; opening a team navigates to its **own URL** (`/builder/t/[id]`).
- Browser back returns to the list; links are shareable/bookmarkable; account teams load server-side (SSR).
- Local drafts get a stable local id (e.g. `/builder/t/local-ab12`).
- This is a real refactor: today's single `/builder` page splits into a **landing route** + an **editor route**.

**New Team** reuses the existing `NewTeamDialog`: `Name` + `Format ▾` + `Save to [alt] ▾ / keep Local` + `Empty | Import paste` mode → lands you in the editor.

> See the routing decision in §16.

---

## 13. Mobile

![Mobile single-column landing with Folders bottom sheet](mockups/mobile.png)

*Mock: [mobile.html](mockups/mobile.html)*

Single column, equal priority:
- Alt pills collapse into the **"Viewing" dropdown**; search goes full-width.
- A **"Folders" button opens the full rail tree as a bottom sheet** — thumb-reachable, matches the app's bottom-sheet pattern, scales to nesting.
- Sections stack and collapse; **tap a card → editor**; **tap `⋯` → actions bottom sheet** (hover has no mobile equivalent); drag falls back to the menus.
- `+ New` floats as a bottom-right FAB.

> See Decision 13 (bottom sheet vs drawer vs chips).

---

## 14. Provenance — Mockups → Decisions

The design was built one decision at a time with a live visual companion. Full index in [`README.md`](./README.md#mockup-gallery); each mock below is in [`mockups/`](./mockups/) (PNG + HTML):

| # | Mock | Drove |
| --- | --- | --- |
| 1 | [layout](mockups/layout.html) | landing layout → blend (Decision 2) |
| 2 | [layout-hybrid](mockups/layout-hybrid.html) | not flat (Decision 3) |
| 3 | [org-hierarchy](mockups/org-hierarchy.html) | superseded org tree (§16) |
| 4 | [alt-model](mockups/alt-model.html) | alt control options (Decision 4) |
| 5 | [alt-combo](mockups/alt-combo.html) | alt pills + overflow (Decision 5) |
| 6 | [rich-search](mockups/rich-search.html) | smart search (Decision 6) |
| 7 | [folders](mockups/folders.html) | folder surface (Decision 7) |
| 8 | [smart-folders](mockups/smart-folders.html) | rail+sections + Smart Folders (Decisions 7, 8) |
| 9 | [sync-model](mockups/sync-model.html) | sync model (Decision 9) |
| 10 | [row-actions](mockups/row-actions.html) | row actions + move-between-alts (Decision 10) |
| 11 | [empty-states](mockups/empty-states.html) | on-ramps (Decision 11) |
| 12 | [empty-merged](mockups/empty-merged.html) | full-shell empty + seeding (Decision 12) |
| 13 | [mobile](mockups/mobile.html) | mobile folders (Decision 13) |
| — | [routing](mockups/routing.html) | route-per-team (§16) |

---

## 15. Implementation Considerations

**Reuse (already exists):**
- Components: `apps/web/src/components/team-builder/` — `team-card.tsx`, `all-teams-client.tsx`, `teams-list-client.tsx`, `local-builder-workspace.tsx`, `NewTeamDialog`.
- Queries: `packages/supabase/src/queries/teams.ts` — `getTeamsForUser(userId)`, `getTeamsForAltList`, `getTeamWithPokemon`.
- Mutations: `packages/supabase/src/mutations/teams.ts` — `createTeam`, `updateTeam`, `deleteTeam`, `forkTeam`.
- Server actions / API: `apps/web/src/actions/teams.ts`, `apps/web/src/lib/api/teams-client.ts`.
- Sprites: `getPokemonSprite(species)` → `{ url, w, h, pixelated }`.

**New capabilities needed:**
1. **Folders schema** — manual folders (folder rows + team↔folder membership) and Smart Folders (stored criteria/query). Auto-folders are derived (no storage). RLS scoped to the owning user.
2. **Move-to-alt (owner reassign)** mutation/RPC — reassign `teams.created_by`; RLS must verify the user owns *both* source and target alts. (`updateTeam` does not permit owner changes today; `forkTeam` only copies.)
3. **Rich-search data path** — `getTeamsForUser` is intentionally lightweight (species + `is_shiny`). Searching moves/items/abilities needs fuller per-Pokémon data: a heavier list query or a dedicated search RPC (see `deciding-data-access`).
4. **Routing split** — landing route + `/builder/t/[id]` editor route; local-draft id scheme.
5. **Unified list merge** — reconcile localStorage drafts with `getTeamsForUser` into one badged list; the login-reconcile banner flow.

**Data model (reference):** `teams` (`id`, `name`, `created_by → alts.id`, `format`, `is_public`, `format_legal`, `parent_team_id`, `updated_at`), `team_pokemon` (junction), `pokemon` (per-instance details).

---

## 16. Decision Log

Each entry: the question, options explored, the choice, why, and what was rejected — linked to its mock in [`mockups/`](./mockups/).

### D1 — Teams source
**Q:** What does "all your teams" contain? **Options:** account-only · local-only · unified. **Chosen:** **Unified** (local drafts + account teams, badged). **Why:** anonymous users still get a list; logged-in users see everything; preserves the local-first flow. **Rejected:** account-only (breaks build-without-account), local-only (ignores the account/alt differentiator).

### D2 — Landing layout · [layout](mockups/layout.html)
**Q:** Card grid vs Showdown-style list vs persistent sidebar? **Chosen:** a **blend** — full-width "row cards" (scannable like a list, rich like a card). **Why:** richer than a dense list, denser than a 3-up grid. **Rejected:** pure card grid (too sparse), pure dense list (too plain), sidebar-switcher-only (loses the landing moment).

### D3 — Row-cards: flat vs grouped · [layout-hybrid](mockups/layout-hybrid.html)
**Q:** One flat stream vs grouped sections? **Chosen:** **not flat** — rich, organized, foldered. **Why:** the explicit goal is to *beat* Showdown, not produce something simpler; users need folders for formats. **Rejected:** flat sorted-by-recent (too simple).

### D4 / D5 — Alt control · [alt-model](mockups/alt-model.html) → [alt-combo](mockups/alt-combo.html)
**Q:** How are alts represented without confusing them with the account? **Options:** scope dropdown · always-visible tabs · combination. **Chosen:** **pills + overflow dropdown** ("Viewing" pills, extras fold into `▾ more`); account avatar stays separate; alts are **not** in the folder rail. **Why:** one-click switching that scales; reuses the existing alt-dropdown concept; keeps the differentiator visible without duplicating the chrome. **Rejected:** dropdown-only (hides alts), tabs-only (crowd with many alts), alt-as-rail-section (duplicates account/alt distinction → confusing).

### D6 — Search · [rich-search](mockups/rich-search.html)
**Q:** Smart single field vs explicit filter-builder? **Chosen:** **smart field** (fuzzy + grouped suggestions + predicates; results show match reasons + sprite highlight). **Why:** fast and approachable, scales from casual to power use; reused to create Smart Folders. **Rejected:** filter-builder dropdowns (heavier, more clicks) — though its facets live on inside the criteria builder (D8).

### D7 — Folder surface · [folders](mockups/folders.html)
**Q:** Folder browser (drill-in) vs collapsible sections vs left rail? **Chosen:** **combine sections + rail** (rail = jump-nav, sections = grouped content). **Why:** sections keep everything visible; the rail gives fast navigation and demonstrates structure; together they're rich without forcing drilling. **Rejected:** folder-browser/drill-in (hides teams behind clicks), sections-only (no fast nav), rail-only (the user was hesitant about a pure side-pane).

### D8 — Smart Folder creation · [smart-folders](mockups/smart-folders.html)
**Q:** Save-from-search only vs also a criteria builder? **Chosen:** **both**. **Why:** save-from-search is instant and reuses the search; the criteria builder handles precise/compound rules that are awkward to type. **Rejected:** save-from-search only (can't easily express compound rules).

### D9 — Sync model · [sync-model](mockups/sync-model.html)
**Q:** Is "local-only" just the pre-save state, or a deliberate sticky choice? **Chosen:** **both** — pre-save scratch by default (auto-sync once saved), plus a deliberate 🔒 Local-only option. **Why:** simple default for everyone; power option for private tech. **Rejected:** auto-sync-only (no private scratchpad), explicit-only (more concepts for everyone).

### D10 — Row actions + move-between-alts · [row-actions](mockups/row-actions.html)
**Q:** Menus only vs menus + drag-and-drop? **Chosen:** **menus + drag** (menus do everything and are the a11y/mobile path; drag onto alt pill / folder is an enhancement). **Why:** tactile on desktop without making drag the only path. **Rejected:** menus-only (loses the rich feel power users expect).

### Routing · [routing](mockups/routing.html)
**Q:** Own URL per team vs in-place swap? **Chosen:** **route per team** (`/builder/t/[id]`). **Why:** working back button, shareable links, SSR for account teams. **Rejected:** in-place swap (no deep links, faked back button). Note: a real refactor splitting today's single page.

### D11 — Empty on-ramps · [empty-states](mockups/empty-states.html)
**Q:** Two on-ramps (scratch + import) vs three (+ sample)? **Chosen:** **three** (sample source TBD, likely data-driven from the Meta Explorer). **Why:** the sample door beats the blank canvas for newcomers. **Rejected:** two-only (loses newcomer help).

### D12 — Empty rendered in the real shell + seeding · [empty-merged](mockups/empty-merged.html)
**Q:** Full-page welcome takeover vs render the real workspace empty? And seed Smart Folders? **Chosen:** **render the real shell** with the welcome inside the main area; **seed defaults** (Incomplete / Illegal / Recently edited). **Why:** structure is learnable from minute one; seeded folders demonstrate the feature and pay off immediately. **Rejected:** full-page takeover (hides the layout), empty rail (barren, undiscoverable).

### D13 — Mobile folders · [mobile](mockups/mobile.html)
**Q:** Bottom sheet vs hamburger drawer vs horizontal chips? **Chosen:** **"Folders" → bottom sheet**. **Why:** thumb-reachable, matches the app's bottom-sheet pattern, scales to nesting. **Rejected:** drawer (top-left thumb stretch; competes with global nav), chips (cramped, weak for nesting).

### Superseded — Org hierarchy · [org-hierarchy](mockups/org-hierarchy.html)
An early model placed alts *inside* the org tree (alt-first vs multi-lens). **Superseded** once we recognized alts already live in the chrome (account avatar + alt dropdown) — moving alts to the "Viewing" pills (D5) and keeping the rail folders-only. Kept here for provenance.

---

## 17. Locked Decisions Summary

| Area | Decision |
| --- | --- |
| Teams source | Unified list: local drafts + account teams, badged |
| Layout | Two-pane: collapsible rail + collapsible sections of rich row-cards (not flat) |
| Alts | "Viewing" pills + overflow dropdown; account avatar separate; alts not in the rail |
| Search | Smart field (fuzzy + grouped suggestions + predicates); match reasons + sprite highlight |
| Folders | Auto (🧬 Gen 9→format) + Manual (⭐) + Smart (⚡) |
| Smart Folders | Save-from-search **and** criteria builder; seeded defaults (Incomplete/Illegal/Recently edited) |
| Sync | Local = pre-save scratch (auto-sync once saved) **plus** deliberate Local-only; login reconcile banner |
| Move between alts | ⋯ "Move to alt" (reassign owner) + "Duplicate to alt" (copy); drag onto alt pill |
| Row interactions | Menus (always) + drag-and-drop (enhancement) |
| Empty/first-run | Full shell renders; welcome + 3 on-ramps inside main area; guest variant |
| Routing | Route per team: `/builder` landing + `/builder/t/[id]` editor |
| Mobile | Single column; alt dropdown; Folders → bottom sheet; actions → bottom sheet; `+ New` FAB |
