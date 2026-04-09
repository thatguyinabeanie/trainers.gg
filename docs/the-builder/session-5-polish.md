# Session 5: Mobile, Polish, Edge Cases

> **Rename session to:** `the-builder-s5-polish`
> **Branch:** `the-builder` (continue from Session 4's commits)
> **Model:** Sonnet 1M (systematic work, well-defined tasks)
> **Estimated scope:** Mobile responsive layout, accessibility, edge cases, final QA
> **Parallelism:** 2 subagent tracks (Track G: mobile layout, Track H: polish + edge cases)

## How To Start This Session

1. Open a new Claude Code conversation
2. Rename it to `the-builder-s5-polish`
3. Verify Sessions 1-4 are complete: `pnpm lint && pnpm typecheck && pnpm test`
4. Send this as your first message:

```
Read docs/the-builder/session-5-polish.md and docs/the-builder/context.md.
Execute using subagent-driven development with parallel subagents for Track G and Track H.
Branch: the-builder. Do not push. Commit frequently with descriptive messages.
This is the FINAL session. After completion, run the full QA checklist at the bottom of the session file.
```

## Prerequisites

- Sessions 1-4 are complete
- The full builder is functional on desktop: teams list, editor, species picker, context tabs, validation, import/export
- Read `docs/the-builder/context.md` for mobile layout design (Section 4, "Mobile layout" row)

## Feature Flag Gating

The team builder must be behind a feature flag for staged rollout. The builder is heavily client-side (editor, pickers, calc), so the flag should be available in the JWT to avoid extra DB calls on every page load.

**Implementation:**

1. **Add `team_builder_access` to the JWT** — extend `custom_access_token_hook` in a new migration to include a `team_builder_access` boolean claim. Derive it from a `feature_flags` row or a new site role (e.g., `team_builder_beta`). The JWT approach means the client can read the flag directly from the session token without a server round-trip.

2. **Gate the routes** — in `proxy.ts` (or the teams layout), check the JWT claim. If the user doesn't have `team_builder_access`, redirect to a "coming soon" or 404 page. The teams list page and builder workspace routes should both be gated:
   - `/dashboard/alts/[handle]/teams`
   - `/dashboard/alts/[handle]/teams/new`
   - `/dashboard/alts/[handle]/teams/[teamId]`

3. **Hide the sidebar link** — conditionally render the "Teams" sidebar nav item based on the JWT claim (use the same pattern as `useSiteAdmin()` but reading `team_builder_access` from the token).

4. **Rollout strategy:**
   - Start with `enabled: false` + `allowed_users` allowlist for internal testing
   - Flip to `enabled: true` when ready for all users
   - Remove the flag entirely once stable (clean up JWT hook, route guards, sidebar conditional)

## Parallel Track Assignments

### Track G: Mobile Responsive Layout

**Subagent instructions:** You are making the team builder responsive for mobile devices. Do NOT change desktop functionality — only add responsive behavior.

**Design decisions (from brainstorm):**

- Dashboard sidebar: hidden on mobile (already handled by existing dashboard layout)
- Team strip: horizontal scroll (already works, just verify touch scrolling)
- Editor + context panel: stacked vertically (NOT side-by-side)
- Context panel tabs: scrollable horizontal tab bar below the editor
- Species picker: table stacks above detail (or detail becomes an expandable section within the table)

**Files to modify (add responsive styles/behavior):**

```
apps/web/src/app/(dashboard)/dashboard/alts/[handle]/teams/[teamId]/
  page.tsx                    — Switch layout from split to stacked at breakpoint

apps/web/src/components/team-builder/
  team-strip.tsx              — Verify horizontal scroll + touch, smaller chips on mobile
  pokemon-editor.tsx          — Full-width on mobile, compact field layout
  ev-editor.tsx               — Full-width bars, touch-friendly drag targets (44px min)
  context-panel.tsx           — Below editor on mobile, scrollable tabs
  species-picker.tsx          — Full-screen on mobile, table above detail or single column
  species-table.tsx           — Horizontal scroll for stat columns, or reduce columns shown
  validation-panel.tsx        — Full-width on mobile
  import-dialog.tsx           — Full-screen sheet on mobile
  team-card.tsx               — Stack layout on narrow screens
```

**Responsive approach:**

- Mobile-first with `min-width` media queries (Tailwind: `md:` and `lg:` prefixes)
- Content-driven breakpoints — find where the split panel breaks naturally
- The split panel likely breaks around `md` (768px) — below that, stack vertically
- Touch targets: minimum 44x44px for all interactive elements (buttons, chips, picker rows, EV bars)
- Use `@media (hover: none)` to adapt hover-dependent interactions for touch

**Workspace layout on mobile:**

```
+--------------------------------+
| Header (team name, actions)    |
+--------------------------------+
| Team strip (horizontal scroll) |
+--------------------------------+
| Editor (full width)            |
|  Species name, fields, moves   |
|  EVs, IVs, notes              |
+--------------------------------+
| Context tabs (scrollable)      |
|  [Types] [Speed] [Calc]       |
|  Tab content area              |
+--------------------------------+
```

**Species picker on mobile:**

```
+--------------------------------+
| Search bar                     |
+--------------------------------+
| Filter chips (horizontal scroll)|
+--------------------------------+
| Species list (full width)      |
|  Each row: sprite, name, types |
|  Tap to expand inline:         |
|    Stats, moves, team fit      |
|    [Select] [Cancel]           |
+--------------------------------+
```

On mobile, the table + detail split doesn't fit. Instead, show a compact list where tapping a species expands it inline to show the detail content (stats, moves, team fit). The table columns reduce to just sprite + name + types + BST on mobile. Full stat columns only visible on wider screens.

**Key things to verify on mobile:**

- EV bar dragging works with touch (use touch events, not just mouse)
- Pickers (move, item, ability, nature, tera) work as full-screen sheets on mobile
- Species picker search and filters are usable
- Type coverage matrix scrolls horizontally if too wide
- Speed tier list is readable
- Damage calc inputs are touch-friendly
- Validation panel is accessible

---

### Track H: Polish + Edge Cases

**Subagent instructions:** You are handling polish, accessibility, and edge cases across the entire builder. Focus on things that could break or degrade the experience.

**Edge cases to handle:**

1. **Empty team states:**
   - 0 Pokemon: workspace shows add/import prompts (verify this works cleanly)
   - 1-5 Pokemon: verify all tabs handle partial teams (type coverage with 1 Pokemon, speed tiers with 2, etc.)
   - Delete last Pokemon: returns to empty state

2. **Species edge cases:**
   - Pokemon with forms (Rotom-Wash, Urshifu-Rapid-Strike, Ogerpon-Hearthflame): verify species picker shows forms correctly, sprites work, abilities are correct per form
   - Genderless Pokemon: gender selector hidden
   - Single-gender Pokemon: gender auto-set, selector shows but locked
   - Pokemon with no hidden ability: hidden ability indicator doesn't appear
   - Pokemon with a single ability: ability picker shows one option

3. **Format edge cases:**
   - Switching a team's format: what happens to Pokemon that are now illegal? Show validation errors but don't delete them
   - Pokemon Champions format: verify IVs hidden, tera types work correctly, format-specific rules apply
   - Multiple formats: verify the species picker filters to the correct format

4. **EV/IV edge cases:**
   - EV total exactly 510: counter shows 0 remaining, no error
   - EV total 0: valid state, no error
   - Dragging EV bar when total would exceed 510: cap at remaining EVs
   - IV of 0: valid (common for Foul Play/confusion, Trick Room)
   - Nature-boosted stat with 0 EVs: bump ticks should still show (first bump might be at 4 or 8 EVs)

5. **Move edge cases:**
   - Moves with 0 BP (status moves): show "—" for BP, not "0"
   - Moves with variable BP (e.g., Flail): show the mechanic, not a number
   - STAB filter in move picker: correctly identifies STAB based on Pokemon's types (including tera type STAB?)

6. **Import edge cases:**
   - Malformed Showdown paste: clear error message, don't crash
   - Paste with only 1-5 Pokemon: imports what's there, leaves remaining slots empty
   - Paste with Pokemon not in the format: imports and shows validation error
   - Pokepaste URL that 404s: show "Could not fetch paste" error
   - Very long nicknames: truncate in display, preserve in data

7. **Auto-save edge cases:**
   - Rapid edits (clicking through many moves quickly): debounce handles this, verify only final state saves
   - Network error during save: show "Save failed — retrying" and retry
   - Navigating away with unsaved changes: browser beforeunload warning OR let auto-save handle it (save triggers before navigation)

8. **Performance:**
   - Species picker with 234+ species: verify search is responsive (<100ms)
   - Type coverage matrix with 6 Pokemon × 18 types: verify rendering is fast
   - Damage calc with multiple calcs: verify no jank
   - Drag-and-drop reordering: smooth animation

**Accessibility:**

9. **Keyboard navigation:**
   - Tab through all interactive elements in logical order
   - Species picker: arrow keys to navigate list, Enter to select, Escape to cancel
   - Move/item/ability pickers: same pattern
   - EV editor: arrow keys or number input for fine control (not just drag)

10. **Focus management:**
    - Opening a picker: focus moves to search input
    - Closing a picker: focus returns to the field that opened it
    - Selecting a Pokemon in strip: focus moves to editor
    - Validation panel: clicking an issue focuses the relevant field

11. **Screen reader support:**
    - All interactive elements have labels
    - EV bars have aria-label with stat name + value ("Attack EVs: 252")
    - Type coverage cells have aria-label ("Fire vs Chien-Pao: 2x weak")
    - Validation errors announced via aria-live region

12. **Visual accessibility:**
    - Stat colors (green high, red low) also use font-weight as redundant cue
    - Type coverage matrix doesn't rely solely on color (includes text symbols: ½, 2, 4, 0)
    - Focus rings visible on all interactive elements (`:focus-visible`)

**Polish items:**

13. **Loading states:**
    - Teams list: skeleton cards while loading
    - Workspace: skeleton layout while fetching team data
    - Species picker: skeleton table while building search index
    - Auto-save indicator: subtle "Saving..." → "Saved" in header

14. **Empty states:**
    - Teams list with no teams: illustrated empty state with create/import CTAs
    - Species picker with no search results: "No Pokemon match your filters"
    - Damage calc with no Pokemon selected: "Select a Pokemon to see damage calcs"

15. **Toasts/feedback:**
    - "Copied to clipboard" after export
    - "Team created" after creating new team
    - "Pokemon added" after selecting from picker
    - "Team forked" after forking
    - Use existing `toast()` from sonner

16. **Error boundaries:**
    - Wrap the workspace in an error boundary
    - If @smogon/calc throws on a weird input, catch and show "Unable to calculate" instead of crashing

## Verification

After both tracks merge — this is the final QA pass:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm dev:web

# Desktop QA:
# 1. Full flow: create team → add 6 Pokemon → edit all fields → validate → export
# 2. Import a Showdown paste for the test team from the brainstorm:
#    (Chien-Pao / Urshifu-R / Tornadus / Lando-T / Amoonguss / Gholdengo)
# 3. Verify all EV spreads, natures, moves, items match after import
# 4. Types tab: verify defensive coverage matrix is correct for this team
# 5. Speed tab: verify speed tiers make sense (Chien-Pao fastest, Amoonguss slowest)
# 6. Calc tab: verify damage calcs run without errors
# 7. Fork team → verify copy is identical with parent_team_id set
# 8. Delete a Pokemon → verify slot becomes empty
# 9. Change species → verify picker works, team fit analysis shows
# 10. Drag reorder → verify positions update
# 11. Validation: add duplicate items → verify all 3 layers show errors
# 12. Export → reimport → verify identical

# Mobile QA (use browser responsive mode or actual device):
# 13. Teams list renders cleanly on 375px width
# 14. Workspace stacks editor above tabs
# 15. Team strip scrolls horizontally with touch
# 16. EV bars draggable with touch
# 17. Species picker works on mobile
# 18. All pickers open as full-screen sheets
# 19. All touch targets ≥ 44px

# Edge case QA:
# 20. Import malformed paste → error message, no crash
# 21. Species with forms (Urshifu-Rapid-Strike) → correct data
# 22. 0 EVs, 0 IVs Pokemon → valid
# 23. Rapid field edits → debounce works, final state saves
# 24. Tab through the entire interface with keyboard only
```

After all checks pass:

```bash
pnpm lint
pnpm typecheck
pnpm test
# If E2E tests exist for the builder:
pnpm test:e2e
```

Commit with a descriptive message. Do NOT push until the user reviews and approves.

## After Session 5

The team builder is complete for V1. The `the-builder` branch has all work across 5 sessions. One PR to `main`.

**What's ready:**

- Teams list page with format filters
- Full editor workspace with all fields
- Species picker with data table, search, filters, team fit analysis
- Types, Speed, Calc context tabs
- Three-layer validation
- Import/export (Showdown paste, Pokepaste URL)
- Fork with parent link
- Drag-and-drop reorder
- Auto-save with debounce
- Mobile responsive layout
- Accessibility baseline
- Meta schema tables (empty, ready for data pipeline)
- External players table (empty, ready for Limitless/RK9)

**What comes next (separate PRs):**

- Meta data pipeline (Limitless webhook, RK9 scraper, Showdown replay parser)
- Meta UI integration (drawer + inline tooltips)
- VGC Pastes data import
- Matchup planning (SPAMS)
- Match tracking (PASRS)
- Team versioning/branching UI
- Collaborative editing
- trainers.gg shareable links
