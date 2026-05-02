# Species Picker Redesign

**Date:** 2026-05-01
**Branch:** improve-damage-calc (or new branch)

## Summary

Redesign the `SpeciesPicker` and `SpeciesFilters` components to replace the hidden dropdown filter popovers with a persistent left sidebar, add three ability columns with tooltip descriptions, introduce smart Showdown-style search, and expand the role preset system with grouped categories.

---

## 1. Layout

### Dialog shell

- Fixed `height: min(70vh, 640px)` — already implemented, prevents resize-on-search
- `max-width: min(calc(100vw - 2rem), 920px)` — already implemented
- `showCloseButton={false}` replaced with a real `×` close button rendered inside the picker header (not the Dialog chrome)
- Two-column body: **sidebar (196px fixed)** + **list panel (flex-1)**

### Header (full width, above both panels)

```
[ 🔍 Search species, abilities, types, moves… ]   [ 12 of 274 ]  [ × ]
```

- Search input with magnifier icon — focused on open (autoFocus)
- Count badge shows `{filteredCount} of {totalCount}` always, not only when filtered
- Close `×` button (svg icon, not text)

---

## 2. Sidebar

Fixed 196px width, scrollable, `background: muted/50`, separated from list by a border. Sections separated by subtle dividers. "Clear all filters" button pinned to bottom.

### Section 1 — Type (multi-select grid)

- 3-column grid of 18 type chips
- Each chip uses the exact background/text colors from `TYPE_SYMBOL_MAP` in `type-symbol-icon.tsx`
- Active state: `outline: 2px solid white; box-shadow: 0 0 0 3px <type-color>`
- Clicking a chip toggles it; multiple types can be active (OR logic — show mons that have ANY of the selected types)

### Section 2 — Ability (single-select)

- Native `<select>` styled to match the design system
- Options populated from `getAllLegalAbilities(format.id)` (all abilities in the format)
- Placeholder: "Any ability…"
- When set, filters to only mons that have this ability in slot 1, 2, or hidden

### Section 3 — Learns Move (multi-select)

- Search `<input>` — typing searches all moves; pressing Enter or clicking a suggestion adds the move as a chip
- Selected moves shown as teal chips with × to remove
- Quick-pick presets below the input: **Tailwind · Trick Room · Follow Me · Protect · Spore · Fake Out**
- Multiple moves: AND logic — only mons that learn ALL selected moves

### Section 4 — Role (grouped presets) — uses shared `<RolePresetsPanel>` component

Renders the **same** `RolePresetsPanel` component as the move picker. Reads from the **shared role registry** (`role-registry.ts`) — a single 26-role taxonomy across 7 groups (Damage Type / Speed Control / Status / Stat Changes / Defensive / Field / Utility). See §13 *Shared Design* below for the canonical group/role list and chip color palette.

**Multi-select OR logic** (changed from prior "single-select with replace-within-group / stack-across-group" rule):
- `filters.roles: string[]` — array of active role IDs
- Click toggles a role in/out of the array
- Multiple roles can be active across **and within** any group
- A species matches the role filter iff it satisfies **any** active role: `entry.roles.some(roleId => filters.roles.includes(roleId))`

A species "fits" role X iff (a) any of its ability slots matches a name in `role.abilities`, OR (b) it can learn any move in `role.moves`. The role membership is computed once per species during `buildSpeciesSearchIndex` and stored on `SpeciesSearchEntry.roles: string[]` for O(1) per-row checks.

Active role button styling pulls from the **shared group color palette** (§13) — each role inherits its group's color tint when active.

### Section 5 — Format-gated: Mega Only (Champions M-A)

Rendered only when `isChampionsFormat(format)` is true.

```
[ ✦ ]  Mega only         ☑
        Has a Mega form
```

- Purple gem icon (gradient: `#8b5cf6 → #ec4899`)
- Checkbox state: checked = filter to only mons with a Mega form
- Checked styling: purple border + background tint

### Clear all

Button at the bottom of the sidebar. Resets all filter state to `DEFAULT_FILTERS`.

---

## 3. Applied Filter Chips Bar

Horizontal bar between header and column headers. Only rendered when at least one filter is active.

```
Active:  [Fire ×]  [Dragon ×]  [Role: Fake Out ×]  [Learns: Fake Out ×]  [Mega only ×]
```

- Teal chips for type/role/move/ability filters
- Purple chip for Mega only
- Clicking a chip removes that filter
- "Active:" label in muted text

---

## 4. List Panel — Column Layout

Sticky header row + virtualized body (existing `useVirtualizer` stays).

### Column grid

```
grid-template-columns: 44px minmax(100px,1fr) 44px 80px 80px 76px repeat(6,24px) 36px minmax(140px,180px)
```

| Col | Width | Content |
|---|---|---|
| Sprite | 44px | Round circle, `primary/8` bg, 36×36 sprite image (pixelated) |
| Name | `1fr` | Bold species name; Mega rows: `color: indigo-700` |
| Types | 44px | 1–2 `TypeSymbolIcon` at size 18. **Click → adds that type to `filters.types`** (`stopPropagation` so row-select doesn't fire) |
| Ability 1 | 80px | See §5 — click → adds ability to `filters.ability` |
| Ability 2 | 80px | See §5 |
| Hidden | 76px | See §5 — italic, muted, labeled "Hidden" in header with `color: violet-400` |
| HP–Spe | 24px × 6 | Mono tabular-nums; values ≥110 in `teal-600 font-semibold` |
| BST | 36px | Mono bold; `border-left: 1px solid border` |
| **Roles** | `minmax(140px,180px)` | **NEW**: flex-wrap of `<RoleChip>`s for the species' role memberships. Click any chip → toggles that role in `filters.roles`. Empty when species fits no role. Same component as the move picker (§13). |

### Mega row treatment

- `border-left: 2px solid rgba(139,92,246,0.35)` on the row
- Species name: `color: indigo-700 dark:indigo-400`
- Sprite bubble: `bg-violet-500/10` instead of teal

### Selected row

`background: primary/6` — the currently active species in the team slot.

---

## 5. Ability Columns with Tooltips

Each ability column renders an `AbilityCell`:

```tsx
// abil-name styling:
// - Has ability: dotted underline (border-bottom: 1px dotted muted-fg), cursor: default
// - No ability (slot 2 or hidden): "—" in muted/italic, no underline
// - Hidden ability: italic + muted foreground color
// - Tooltip on hover: shadcn <Tooltip> from @/components/ui/tooltip
```

### Tooltip content

Dark card (`bg-slate-800`, `rounded-lg`, `p-3`, `shadow-xl`):

```
Tough Claws                    [Hidden]   ← tag only for hidden slot
Powers up moves that make direct contact by 30%.
```

- Name: `text-sm font-semibold text-slate-100`
- Hidden tag: `text-[9px] font-semibold bg-violet-500/25 text-violet-300 rounded px-1`
- Description: `text-xs text-slate-400 leading-relaxed mt-1`
- Tooltip side: `"top"`, `align: "start"`

Ability descriptions sourced from the existing `@trainers/pokemon` data layer (same source as `AbilityPicker`).

---

## 6. Smart Search (Showdown-style)

When the search input is non-empty, an overlay panel replaces the list body:

### Overlay structure

Categories rendered in order (skip empty categories):

1. **Type** — if query matches a type name exactly or partially
2. **Moves** — moves whose name starts with or contains the query
3. **Abilities** — abilities whose name starts with or contains the query
4. **Pokémon** — species whose name matches the query (direct picks)

### Each suggestion row

```
[type badge / move name / ability name]    [description text]    [Filter] or [Select]
```

- **Filter** button: applies it to the sidebar filter (type chip, move chip, ability select)
- **Select** button: only on Pokémon rows — directly calls `onPick(species)`
- Keyboard: `↵` on the search input applies the top Filter result if no Pokémon matches exactly

### After applying a filter via search

- Search input clears
- Overlay closes, list returns
- Applied filter appears in the chip bar
- Sidebar reflects the new active state

---

## 7. Data / State Changes

### `SpeciesFilterState` additions

```ts
export interface SpeciesFilterState {
  types: string[];                  // OR — multi-select
  ability: string | null;           // single-select (replaces old `abilities: string[]`)
  moves: string[];                  // AND — multi-select
  roles: string[];                  // OR — multi-select, was `role: string | null` (CHANGED)
  megaOnly: boolean;                // new
  // minBaseStat / maxBaseStat removed
}
```

### Role registry — shared with move picker

The role registry is a **single shared file** (`role-registry.ts`) consumed by both pickers. See §13 *Shared Design* for the full taxonomy. The previous "species-roles.ts" file with the 18 species-specific role presets is **deleted** — all role data is unified.

### `SpeciesSearchEntry` additions

```ts
export interface SpeciesSearchEntry {
  // ... existing fields
  /** Role IDs this species fits (from the shared role registry). Computed during
   *  buildSpeciesSearchIndex by checking ability slots against role.abilities and
   *  learnable moves against role.moves. */
  roles: string[];
}
```

### `searchSpecies` filter changes

- `ability` filter: single string match against any of the three ability slots
- `megaOnly`: uses `getMegaStoneForSpecies(entry.species) !== null` (excludes `*-Mega` entries themselves; matches base species that *have* Mega forms)
- `roles` filter (NEW, replaces `role`):
  ```ts
  if (options?.roles && options.roles.length > 0) {
    const matches = options.roles.some((roleId) => entry.roles.includes(roleId));
    if (!matches) return false;
  }
  ```
- Stats min/max filter removed from the search call (no longer in the UI)
- **`applyRole` helper and `role-expansion.ts` are deleted entirely** — multi-select OR replaces all replace-within-group / stack-across-group / userMoves logic

---

## 8. Component Breakdown

### Files to create

| File | Purpose |
|---|---|
| `species-roles.ts` | Role preset registry (id, label, group, moves, abilities) |
| `species-sidebar.tsx` | The 196px left panel — Type, Ability, Moves, Role, Mega sections |
| `species-smart-search.tsx` | Overlay panel shown when typing |
| `ability-cell.tsx` | Ability name + Tooltip for a single ability column |

### Files to modify

| File | Change |
|---|---|
| `species-picker.tsx` | Add sidebar + smart search; update column grid; update column headers; add Mega row styles |
| `species-filters.tsx` | Deprecate/remove — logic moves into `species-sidebar.tsx` |

---

## 9. Scope Out

- Stats min/max sliders — removed (sidebar is full enough without them)
- "Top 20 / Rising / Niche" tier chips — keep hidden/disabled for now, meta data not yet available
- Mobile layout — picker is desktop-only for now (opens in a Dialog, mobile users get the same view)

---

## 10. Testing

- Unit tests for `role-registry.ts` (shared) — correct group/role mapping, `getRolesForMove`, `getRolesForSpecies`, color tokens
- Update `species-picker` tests: new `SpeciesFilterState` shape (multi-select roles), Mega filter, ability single-select, click-to-filter on type icon, click-to-filter on role chip
- Tooltip visibility test (ability cell hover) — use `userEvent.hover`
- Smart search overlay: typing shows categories, "Filter" click applies filter and clears input
- Roles column rendering: a species with role memberships renders one `<RoleChip>` per role with the correct group color

---

## 13. Shared Design (DRY between species-picker and move-picker)

To prevent drift between the two pickers, the following are **single shared files** consumed by both:

### Shared files

| File | Purpose |
|---|---|
| `apps/web/src/components/team-builder/v2/pickers/role-registry.ts` | Single role taxonomy: 26 roles across 7 groups; group color tokens; `getRolesForMove(name)` and `getRolesForSpecies(entry, formatId)` lookups |
| `apps/web/src/components/team-builder/v2/pickers/role-chip.tsx` | `<RoleChip role onClick>` — renders one role pill with its group's color tint; used in row Roles columns and as the active-state visual for sidebar role buttons |
| `apps/web/src/components/team-builder/v2/pickers/role-presets-panel.tsx` | The middle-column sidebar of grouped role buttons with bucket counts; used by **both** pickers (`<RolePresetsPanel selected={filters.roles} onChange={...} />`) |
| `apps/web/src/components/team-builder/v2/pickers/filter-chips-bar.tsx` | The active-filter chip strip rendered above each list (`<FilterChipsBar chips={...} />`); used by both pickers |

### Role taxonomy (canonical)

```ts
export type RoleGroup =
  | "damage-type" | "speed-control" | "status"
  | "stat-changes" | "defensive" | "field" | "utility";

export interface RolePreset {
  id: string;
  label: string;
  group: RoleGroup;
  /** Moves that ARE this role (for move filtering and species-fit derivation). */
  moves?: string[];
  /** Abilities that IMPLY this role (used only for species fit). */
  abilities?: string[];
}
```

26 presets total — see registry markdown at `docs/design/2026-05-01-champions-ma-move-roles.md` for the move data. The **abilities** field augments the registry for the 3 ability-driven roles:

| Role | Abilities |
|---|---|
| Atk Drop | Intimidate |
| Weather | Drizzle, Drought, Sand Stream, Snow Warning |
| Terrain | Grassy Surge, Electric Surge, Psychic Surge, Misty Surge |

### Group color palette (canonical)

Both pickers' role chips and active-state role buttons use this palette. The color is keyed on `RoleGroup`:

| Group | Token | Background tint | Border | Text |
|---|---|---|---|---|
| Damage Type | `rose` | `bg-rose-500/8` | `border-rose-500/25` | `text-rose-700 dark:text-rose-300` |
| Speed Control | `violet` | `bg-violet-500/8` | `border-violet-500/25` | `text-violet-700 dark:text-violet-300` |
| Status | `amber` | `bg-amber-500/10` | `border-amber-500/30` | `text-amber-700 dark:text-amber-400` |
| Stat Changes | `emerald` | `bg-emerald-500/8` | `border-emerald-500/28` | `text-emerald-700 dark:text-emerald-400` |
| Defensive | `sky` | `bg-sky-500/8` | `border-sky-500/25` | `text-sky-700 dark:text-sky-300` |
| Field | `lime` | `bg-lime-500/10` | `border-lime-500/28` | `text-lime-700 dark:text-lime-400` |
| Utility | `slate` | `bg-slate-500/10` | `border-slate-500/30` | `text-slate-600 dark:text-slate-400` |

Note on Mega purple overlap: the Mega-only sidebar toggle uses violet in the species sidebar. Speed Control role chips also use violet. These appear in distinct visual contexts (sidebar gem icon + label vs. inline pill in a row), and the Mega toggle is format-gated to Champions M-A only — confusion is unlikely. Documented here so it's not "fixed" later by accident.

### Lookup helpers

```ts
/** O(1) via memoized reverse-index. Returns role IDs for a move name. */
export function getRolesForMove(moveName: string): string[];

/** Computes role IDs for a species — checks ability slots against role.abilities,
 *  then checks species' learnable moves against role.moves. Caches per (species, formatId). */
export function getRolesForSpecies(
  entry: SpeciesSearchEntry,
  formatId: string
): string[];
```

`getRolesForSpecies` is called once per species during `buildSpeciesSearchIndex` and the result is stored on `SpeciesSearchEntry.roles`. The species picker reads `entry.roles` directly — no per-row computation.

### Click-to-filter consistency (both pickers)

| Click target | Action |
|---|---|
| Type icon in row | Adds the type to `filters.types` (toggle if already there) |
| Ability cell in row (species only) | Sets `filters.ability` to that ability |
| Role chip in row (Roles column) | Toggles the role ID in `filters.roles` |
| Role button in sidebar (`<RolePresetsPanel>`) | Toggles the role ID in `filters.roles` |
| Active filter chip in `<FilterChipsBar>` | Removes that filter |

All in-row click handlers use `e.stopPropagation()` to prevent the row's `onClick` (select species/move) from firing.
