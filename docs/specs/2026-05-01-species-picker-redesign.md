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
- Options populated from `getAbilities()` (all abilities in the format)
- Placeholder: "Any ability…"
- When set, filters to only mons that have this ability in slot 1, 2, or hidden

### Section 3 — Learns Move (multi-select)

- Search `<input>` — typing searches all moves; pressing Enter or clicking a suggestion adds the move as a chip
- Selected moves shown as teal chips with × to remove
- Quick-pick presets below the input: **Tailwind · Trick Room · Follow Me · Protect · Spore · Fake Out**
- Multiple moves: AND logic — only mons that learn ALL selected moves

### Section 4 — Role (grouped presets)

Preset buttons with section group labels. Selecting a role applies its moves/abilities to the Learns Move / Ability filters. Selecting a second role in the same group replaces the first. Selecting one from a different group stacks.

```
SPEED CONTROL
  ⚡  Trick Room          Trick Room
  💨  Tailwind            Tailwind
  📉  Speed Drop          Electroweb, Icy Wind, Scary Face, Rock Tomb…

OFFENSIVE SUPPORT
  👋  Fake Out            Fake Out
  🎯  Redirection         Follow Me, Rage Powder
  🚀  Damage Boosting     Helping Hand, Coaching, Howl, Decorate
  💊  Healing             Heal Pulse, Life Dew, Pollen Puff

DAMAGE REDUCTION
  🛡  Screens             Light Screen, Reflect, Aurora Veil
  ↓A  Atk Drop           Charm, Baby-Doll Eyes, Parting Shot, Noble Roar
                          [+ Intimidate ability]
  ↓S  SpA Drop           Eerie Impulse, Snarl, Noble Roar, Parting Shot

DISRUPTION
  💤  Sleep               Spore, Sleep Powder, Yawn
  ⚡  Paralysis           Thunder Wave, Nuzzle, Glare
  🔥  Burn                Will-O-Wisp
  😵  Flinching           Rock Slide, Iron Head, Air Slash, Dark Pulse

FIELD
  🌧  Weather             Drizzle, Drought, Sand Stream, Snow Warning
  🌿  Terrain             Grassy Surge, Electric Surge, Psychic Surge, Misty Surge

OFFENSE
  ➡  Priority            Aqua Jet, Mach Punch, Ice Shard, ExtremeSpeed, Sucker Punch
  💥  Spread              Rock Slide, Earthquake, Heat Wave, Discharge, Dazzling Gleam
```

Active role button: `background: primary/10; color: primary; font-weight: 600`

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
grid-template-columns: 44px minmax(100px,1fr) 44px 80px 80px 76px repeat(6,24px) 36px
```

| Col | Width | Content |
|---|---|---|
| Sprite | 44px | Round circle, `primary/8` bg, 36×36 sprite image (pixelated) |
| Name | `1fr` | Bold species name; Mega rows: `color: indigo-700` |
| Types | 44px | 1–2 `TypeSymbolIcon` at size 18 |
| Ability 1 | 80px | See §5 |
| Ability 2 | 80px | See §5 |
| Hidden | 76px | See §5 — italic, muted, labeled "Hidden" in header with `color: violet-400` |
| HP–Spe | 24px × 6 | Mono tabular-nums; values ≥110 in `teal-600 font-semibold` |
| BST | 36px | Mono bold; `border-left: 1px solid border` |

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
  types: string[];
  ability: string | null;        // was: abilities: string[] → now single-select
  moves: string[];
  role: string | null;
  megaOnly: boolean;             // new
  // minBaseStat / maxBaseStat removed — replaced by sidebar role presets
}
```

### Role preset registry

New file: `species-roles.ts` alongside `species-filters.tsx`

```ts
export interface RolePreset {
  id: string;
  label: string;
  group: 'speed' | 'offensive-support' | 'damage-reduction' | 'disruption' | 'field' | 'offense';
  moves?: string[];
  abilities?: string[];
}
```

All 17 role presets defined here. Sidebar reads from this registry.

### `searchSpecies` / filter changes

- `ability` filter: single string match against any of the three ability slots
- `megaOnly`: filter by species name containing "-Mega" (or a `hasMegaForm` flag in the search index if available)
- Stats min/max filter removed from the search call (no longer in the UI)

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

- Unit tests for `species-roles.ts` preset registry (correct moves/abilities for each role)
- Update `species-picker` tests: new `SpeciesFilterState` shape, Mega filter, ability single-select
- Tooltip visibility test (ability cell hover) — use `userEvent.hover`
- Smart search overlay: typing shows categories, "Filter" click applies filter and clears input
