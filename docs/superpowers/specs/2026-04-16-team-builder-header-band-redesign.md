# Team Builder Header Band Redesign

**Date:** 2026-04-16  
**File:** `apps/web/src/components/team-builder/editor-header-band.tsx`

## Context

The current `EditorHeaderBand` uses two flex rows with inconsistent padding (`gap-x-3` on row 1, `gap-x-0` on row 2). Build fields are cramped with no spacing between them. Identity controls (nickname, gender, shiny, level) wrap awkwardly next to the species name. The separate species picker pill adds redundant UI chrome.

This redesign flattens everything into one 68px horizontal strip with three clearly-separated visual zones, fixing spacing, alignment, and information ordering.

## Layout: Single Bar

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Sprite] Name / Nickname  │  Ability │ Item │ Tera │ Nature  │ ♂♀— ✦ Lv ⋯  │
│          Species · 🌿 🧊   │          │      │      │         │              │
└─────────────────────────────────────────────────────────────────────────────┘
   Zone 1 (identity)           Zone 2 (build fields)         Zone 3 (meta)
```

Height: 68px. Three zones separated by 1px rgba dividers (`rgba(255,255,255,0.07)`), spaced `margin: 10px 0` so they don't span the full height.

---

## Zone 1 — Identity

**Width:** auto, `max-width: ~200px`, `flex-shrink: 0`

**Contents:**
- 40px sprite ring (`bg-primary/10`, rounded-full)
- Text stack:
  - **Primary line:** nickname (if set) or species name — `text-sm font-semibold text-foreground`, truncating
  - **Secondary line:**
    - When no nickname: type pills only (no species name — it's already the primary line)
    - When nickname set: species name (`text-[10.5px] text-muted-foreground`) + type pills inline
  - Both states have two lines, so there is no layout shift when a nickname is added or cleared

**Interactions:**
- **Sprite click** → opens species picker (`onOpenSpeciesPicker`)
- **Primary name line click** → enters inline nickname edit mode (see below)
- **Secondary species name click** → opens species picker
- Zone 1 entire area gets a subtle hover highlight (`hover:bg-white/[0.04]`) with `"Change species"` tooltip on the sprite

**Inline nickname edit:**
- Clicking the primary name line replaces it with a controlled `<input>` (`type="text"`, `maxLength={18}`)
- Same font size and weight as the name text; transparent background, thin border
- Placeholder: species name (dim/muted)
- `onBlur` or `Enter`: commits the value and exits edit mode; if the input is empty or whitespace-only, the nickname is cleared and the species name becomes the primary line again (no blank state)
- `Escape`: cancels and reverts to previous value without committing; focus returns to the primary name element
- After a successful commit, focus returns to the primary name element so the user can continue editing or navigate away
- Species secondary line remains visible during editing

**Removed:** the separate species picker pill button (was a truncated input-like element between the name and gender controls).

---

## Zone 2 — Build Fields

**Width:** `flex: 1`

**Contents:** four equal-flex columns — Ability | Item | Tera | Nature
- Tera column is omitted entirely when `!hasTera` (same logic as before)
- Thin 1px dividers between each column (`vdivider` pattern)
- Each field: `FieldButton` or `FieldStatic` (existing components), padding `px-3 py-0` centered vertically
- Label: `text-[8.5px] font-bold uppercase tracking-wider text-muted-foreground`
- Value: `text-[12.5px] font-medium text-foreground` with trailing `›` chevron

**Removed:** `gap-x-0` cramming from the old row 2.

---

## Zone 3 — Meta Controls

**Width:** `flex-shrink: 0`, `~130px`

**Contents (left to right):**
1. Gender segmented control (♂ / ♀ / —) — existing `GenderButton`
2. Shiny toggle (✦/✧) — existing button
3. Level — `Lv` label + number input (monospace, `w-10`)
4. `⋯` popover (`PokemonDetailsPopover`) — moved here from end of Zone 2

**Removed:** nickname text input (replaced by inline edit in Zone 1).

---

## Interaction Summary

| Target | Behavior |
|---|---|
| Sprite | Opens species picker |
| Primary name (no nickname) | Enters nickname inline edit (adds nickname) |
| Primary name (nickname set) | Enters nickname inline edit (edits nickname) |
| Muted species name | Opens species picker |
| Ability / Item / Tera / Nature field | Opens respective picker (unchanged) |
| Gender segments | 3-state toggle (unchanged) |
| Shiny button | Toggles shiny (unchanged) |
| Level input | Number input 1–100 (unchanged) |
| ⋯ button | Opens Showdown import/export popover (unchanged) |

---

## States: No Nickname vs Nickname Set

**No nickname:**

```text
🌨️  Abomasnow
    🌿 🧊
```

*(Species name is the primary line; types only on secondary. Clicking primary enters add-nickname mode.)*

**Nickname set ("Blizzard King"):**

```text
🌨️  Blizzard King
    Abomasnow · 🌿 🧊
```

*(Primary = nickname, secondary = species + types)*

---

## Verification

1. Open team builder, select any Pokemon
2. Confirm single-bar header renders at 68px with three zones
3. Click sprite → species picker opens
4. Click species name text → species picker opens
5. Click primary name → inline input appears with species name as placeholder
6. Type a nickname, press Enter → nickname persists, secondary line shows species
7. Click nickname text → inline edit resumes with existing value
8. Press Escape → nickname reverts, no change
9. Confirm Ability / Item / Tera / Nature fields have equal widths and individual hover states
10. Confirm ⋯ popover is in Zone 3 and still opens Showdown import/export
11. Toggle format with/without Tera — Tera column appears/disappears, remaining fields expand
12. Verify responsive layout at 393px (mobile), 768px (tablet), and 1280px (desktop) viewports — zones should stack or truncate gracefully without overflow
13. Run `pnpm typecheck` and `pnpm test` — no failures
