# Move Picker Redesign

**Date:** 2026-05-01

## Summary

Redesign the `MovePicker` component to mirror the new `SpeciesPicker` 3-column shape: persistent left sidebar (Type grid + Category chips), middle sidebar (role presets), and a richer list panel that adds a **Roles** column showing each move's strategic-role chips. Click affordances move to the column data: clicking a Type icon, Category icon, or Role chip applies it as a filter.

## Background

The current `MovePicker` is a single ~820px popover. Its filters are hidden behind column-header dropdowns:

- Type filter — popover from the "Type" header
- Category filter — popover from the "Cat" header
- Search input that matches name + effect + type + category

Pain points (parallel to the old species picker):

- Filters are invisible until clicked → users miss them
- No way to filter by strategic role (Spread, Priority, Speed Control, Sleep moves, etc.)
- Effect column is the only place a move's intent is revealed, and only via free text

The species-picker redesign introduced a sidebar-of-filters + role-presets pattern that solved analogous problems. This spec applies the same pattern to moves.

---

## 1. Layout

### Dialog shell

The `MovePicker` is rendered inside a `Popover` (existing `PopoverContent` from `@/components/ui/popover`) as it is today. **Sizing changes:**

- Width: `max-w-[1100px]` (up from current `820px`) — needed for the 3-column body and the new Roles column
- Height: `height: min(70vh, 640px)` (currently `max-h-[480px]` on the inner scroll wrapper) — fixed-height to prevent resize-on-search jitter, mirroring the species picker fix
- The `PopoverContent` consumer doesn't change shape — only the inner `MovePicker` component's wrapper does

### Body layout

Three columns, top to bottom:

```
┌──────────────────────────────────────────────────────────────────────┐
│  🔍  Search…                                  [42 of 274]   [×]      │  Header
├────────────┬────────────┬────────────────────────────────────────────┤
│ TYPE       │ ROLE       │ Active: [Fire ×] [Special ×]               │  Filter chips
│ [grid]     │ ┌────────┐ ├────────────────────────────────────────────┤
│            │ │ DAMAGE │ │ Type Cat Name        Effect  BP Acc  Roles │  Sticky header
│ CATEGORY   │ │ Spread │ ├────────────────────────────────────────────┤
│ [chips]    │ │ Priority│ │ 🔥  S  Heat Wave   …       95 90% [chips]│
│            │ │ ...    │ │ ⚡  St Thund. Wave …       —  90% [chips]│  Virtualized rows
│ [Clear]    │ └────────┘ │ ...                                        │
│            │ ...        │                                            │
└────────────┴────────────┴────────────────────────────────────────────┘
   160px       170px       flex-1
```

| Column | Width | Contents |
|---|---|---|
| **Left sidebar** | 160px | Type grid (multi-select) + Category chips (multi-select) + Clear all |
| **Middle sidebar** | 170px | Role presets, grouped, with bucket counts |
| **List panel** | flex-1 | Header bar (search + count + close), active filter chips bar, sticky table header, virtualized rows |

---

## 2. Left sidebar — Type + Category

### Type section

- 3-column grid of 18 type chips (same chip styling as species sidebar — pulled from `TYPE_BG` constant)
- Multi-select; clicking toggles the chip
- Active chip: `outline: 2px solid white; box-shadow: 0 0 0 3px <type-color>`
- OR-logic across types: a move matches if its type is in `filters.types`

### Category section

- 3 inline chips: **Physical** (orange dot) · **Special** (blue dot) · **Status** (gray dot)
- Multi-select; selected state uses `bg-primary/10 border-primary/35 text-primary`
- OR-logic: a move matches if its category is in `filters.categories`

### Clear all

- Pinned at the bottom of the left sidebar
- Resets all filter state to `DEFAULT_MOVE_FILTERS`

---

## 3. Middle sidebar — Role presets

Reads from `MOVE_ROLE_PRESETS` (new registry, see §6). Renders 7 group headers in this order:

| Group | Roles |
|---|---|
| **Damage Type** | Spread · Priority · Multi-hit |
| **Speed Control** | Trick Room · Tailwind · Speed Drop · Speed Boost |
| **Status** | Sleep · Paralysis · Burn · Poison |
| **Stat Changes** | Boost Self · Boost Ally · Drop Atk · Drop SpA |
| **Defensive** | Screens · Protect · Healing · Drain |
| **Field** | Weather · Terrain · Hazards |
| **Utility** | Redirection · Pivot · Flinching · Disruption |

Each preset row:

- Label on the left (`Spread`, `Priority`, etc.)
- Bucket count on the right (`54`, `17`, etc., right-aligned, mono, muted)
- Active state: `bg-primary/10 text-primary font-semibold`
- Click toggles. Multi-select **across** roles is allowed (you can have both Spread and Priority active — OR logic). Multi-select **within** a row is just one role; clicking the same role again deactivates.

The bucket counts come from the registry at build time (the registry has 361 moves classified across 26 roles).

---

## 4. List panel

### Header bar (top of list panel — same row as sidebar headers)

- 🔍 search input — full width, matches name + effect + type name + category name (preserves existing behavior)
- Count badge: `{filtered} of {total}` always visible (currently only when filtered)
- Close `×` button

### Active filter chips bar

- Below the header bar, above the sticky table header
- Renders only when at least one filter is active
- Chips for: each active type, each active category, the active ability filter equivalent (none here — moves don't have abilities), each active role, and each active learnable-move filter (none — we ARE the move list)
- All chips use the teal primary palette (no purple-mega equivalent)
- Click a chip → removes that filter

### Sticky table header

Grid template: `grid-cols-[26px_26px_140px_240px_38px_46px_minmax(140px,1fr)]`

| Col | Width | Header label | Sortable? |
|---|---|---|---|
| Type icon | 26px | (none) | No |
| Cat icon | 26px | (none) | No |
| Name | 140px | "Name" | Yes — toggles asc/desc |
| Effect | 240px | "Effect" | No |
| BP | 38px | "BP" | Yes — desc by default |
| Acc | 46px | "Acc" | Yes — desc by default |
| Roles | `minmax(140px, 1fr)` | "Roles" | No |

Sort state: same shape as today (`{ col, dir }`), defaults to `{ col: "name", dir: "asc" }`.

### Data rows

Use a `<div role="row" tabIndex={0} onClick={onSelect}>` (NOT `<button>` — same accessibility fix as species picker). Pressing `Enter` or `Space` selects the move.

- **Type icon** (26px) — round colored circle with lucide-style SVG, identical styling to species picker `TypeSymbolIcon`. `onClick={(e) => { e.stopPropagation(); onTypeFilter(move.type); }}` — adds the type to `filters.types`. `title="Click to filter by Fire"`.
- **Category icon** (26px) — square colored chip (`P` / `S` / `St` for Physical / Special / Status). Same click affordance: adds to `filters.categories`.
- **Name** (140px) — bold, truncated with ellipsis, `title=` for full name on hover.
- **Effect** (240px) — `text-muted-foreground` body text, truncated with ellipsis, `title=` for full description on hover.
- **BP** (38px) — mono, right-aligned, tabular-nums. Shows `—` (muted) when status move or no BP.
- **Acc** (46px) — mono, right-aligned. Shows `—` when "always hits" (Showdown's `accuracy === true`).
- **Roles cell** (`1fr`) — wraps a `<div onClick={stopPropagation}>` containing a horizontal flex of role chips. See §5 for chip details. The cell has no max-height; chips wrap to additional lines and the row grows in height to fit. Empty when the move is in zero roles.

Selected row (the move currently picked into the slot, if any): `bg-primary/6`.

---

## 5. Role chips inside rows — uses shared `<RoleChip>` component

Move row chips use the **same `<RoleChip>` component** as species rows. Component lives in `pickers/role-chip.tsx`. See the species spec §13 *Shared Design* for the canonical group color palette and chip component contract.

```tsx
<div onClick={(e) => e.stopPropagation()} className="flex flex-wrap gap-1">
  {getRolesForMove(move.name).map((roleId) => (
    <RoleChip
      key={roleId}
      roleId={roleId}
      onClick={() => onRoleFilter(roleId)}
    />
  ))}
</div>
```

Wrap behavior: `flex-wrap`, `gap: 3px`. If a move has many roles (Parting Shot has 4: Drop Atk, Drop SpA, Pivot, Disruption), all show — there's no overflow `+N` indicator since the row grows to fit. This keeps the strategic profile fully visible.

---

## 6. Move-role registry

The registry already exists at `docs/design/2026-05-01-champions-ma-move-roles.md` — generated by classifying all Gen 9 moves (filtered with the same `isNonstandard` rules `format-legality.ts` uses) into the 26 roles. Total: **361 moves classified across 26 roles**, with overlap allowed.

### Format

```ts
// apps/web/src/components/team-builder/v2/pickers/move-roles.ts

export type MoveRoleGroup =
  | "damage-type" | "speed-control" | "status"
  | "stat-changes" | "defensive" | "field" | "utility";

export interface MoveRolePreset {
  id: string;
  label: string;
  group: MoveRoleGroup;
  /** Move names belonging to this role (matches @pkmn/dex move names) */
  moves: string[];
}

export const MOVE_ROLE_PRESETS: MoveRolePreset[] = [
  { id: "spread",        label: "Spread",        group: "damage-type",   moves: [...] },
  // ... 26 entries total
];

export const MOVE_ROLE_GROUP_LABELS: Record<MoveRoleGroup, string> = {
  "damage-type":   "Damage Type",
  "speed-control": "Speed Control",
  "status":        "Status",
  "stat-changes":  "Stat Changes",
  "defensive":     "Defensive",
  "field":         "Field",
  "utility":       "Utility",
};

export const MOVE_ROLE_GROUP_ORDER: MoveRoleGroup[] = [
  "damage-type", "speed-control", "status", "stat-changes",
  "defensive", "field", "utility",
];
```

### Lookup helper

```ts
/** Returns all role IDs a move belongs to. O(1) via cached reverse-index. */
export function getRolesForMove(moveName: string): string[] { /* ... */ }
```

The reverse index is built lazily (single pass over `MOVE_ROLE_PRESETS` on first call, memoized).

### Source / regeneration

The registry markdown documents the regeneration recipe — if the taxonomy changes or new moves enter the format, run the script described in the registry's source notes. The TypeScript file is generated *from* the markdown; for v1 this conversion is a one-time manual step.

---

## 7. Filter state

```ts
export interface MoveFilterState {
  search: string;            // text matches name + effect + type + category
  types: string[];           // OR
  categories: ("Physical" | "Special" | "Status")[];  // OR
  roles: string[];           // OR — matches if move has ANY of these role IDs
}

export const DEFAULT_MOVE_FILTERS: MoveFilterState = {
  search: "",
  types: [],
  categories: [],
  roles: [],
};
```

Filtering pipeline (per row):

1. Type filter: `if (filters.types.length && !filters.types.includes(move.type)) return false;`
2. Category filter: `if (filters.categories.length && !filters.categories.includes(move.category)) return false;`
3. Role filter: `if (filters.roles.length && !filters.roles.some(roleId => moveHasRole(move.name, roleId))) return false;`
4. Search: matches `move.name` + `move.shortDesc` + `move.type` + `move.category` (preserves current behavior)

The `value` prop (currently-selected move) and the species-legal-moves prefiltering (`getLegalMoves(species, format.id)`) stay unchanged.

---

## 8. Component breakdown

### Shared files (consumed by both pickers — see species spec §13)

| File | Purpose |
|---|---|
| `apps/web/src/components/team-builder/v2/pickers/role-registry.ts` | Single 26-role taxonomy + group color palette + `getRolesForMove(name)` and `getRolesForSpecies(entry, formatId)` lookups |
| `apps/web/src/components/team-builder/v2/pickers/role-chip.tsx` | `<RoleChip>` — colored pill rendered in row Roles columns and active-state of sidebar role buttons |
| `apps/web/src/components/team-builder/v2/pickers/role-presets-panel.tsx` | Middle-column sidebar component listing all role presets, grouped, with bucket counts and active state |
| `apps/web/src/components/team-builder/v2/pickers/filter-chips-bar.tsx` | Active filter chip strip rendered above each list |

### Move-picker-specific files to create

| File | Purpose |
|---|---|
| `apps/web/src/components/team-builder/v2/pickers/move-filter-state.ts` | `MoveFilterState` interface + `DEFAULT_MOVE_FILTERS` constant |
| `apps/web/src/components/team-builder/v2/pickers/move-sidebar.tsx` | Move-picker's left panel (Type grid + Category chips + Clear) — does NOT include role presets (that's `<RolePresetsPanel>` rendered separately) |

### Files to modify

| File | Change |
|---|---|
| `apps/web/src/components/team-builder/v2/pickers/move-picker.tsx` | Wire up `<MoveSidebar>` + `<RolePresetsPanel>` + `<FilterChipsBar>`; replace column-header filter popovers with plain sortable headers; add Roles column with `<RoleChip>`s; switch row from `<button>` to `<div role="row">` |
| `apps/web/src/components/team-builder/v2/__tests__/move-picker.test.tsx` | Update for new column shape; add tests for click-to-filter on type/category/role chips |

### Move-role markdown → TypeScript conversion

The registry at `docs/design/2026-05-01-champions-ma-move-roles.md` is converted to TS during implementation. For v1 this is a small Node script run once; the script is committed alongside the registry .ts so the conversion is reproducible.

---

## 9. Click-to-filter affordances

| Click target | Action |
|---|---|
| Type icon in row | Adds the move's type to `filters.types` (toggle if already there) |
| Category icon in row | Adds the move's category to `filters.categories` (toggle) |
| Role chip in row | Adds the role ID to `filters.roles` (toggle) |
| Type chip in left sidebar | Toggles in `filters.types` |
| Category chip in left sidebar | Toggles in `filters.categories` |
| Role preset in middle sidebar | Toggles in `filters.roles` |
| Active filter chip in chips bar | Removes that filter |

All click targets in row inner cells use `e.stopPropagation()` so the row's own `onClick` (which selects the move) doesn't fire.

---

## 10. Scope-out

- **Smart search overlay** — moves don't have the cross-category ambiguity that species do (you don't search "fire" hoping to find moves of type Fire; the type filter is right there). Skip.
- **Priority column** — folded into the `[Priority]` role chip; no separate column needed.
- **Custom role builder** — users can't create their own roles. The 26-role taxonomy is fixed.
- **Per-format role overrides** — Champions M-A has no format-level move bans, so the same registry serves any future Champions regulation. If a future format bans, e.g., Trick Room, the registry would need a per-format banlist. Out of scope for v1.

---

## 11. Testing

- Unit tests for `move-roles.ts`: registry length (26 roles), unique IDs, all groups appear in `MOVE_ROLE_GROUP_ORDER`, `getRolesForMove("Heat Wave")` returns `["spread", "burn"]`, etc.
- Unit tests for `MoveSidebar`: type/category/role click handlers fire `onFiltersChange` with expected payloads; clear all resets to defaults.
- Unit tests for `MoveRoleChips`: renders one chip per role; clicking calls `onRoleFilter(roleId)` with stop-propagation.
- Update `move-picker.test.tsx`: integration tests for click-to-filter (clicking a Fire type icon adds Fire to filter chips), role-filter logic (selecting "Spread" role shows only Spread moves), and the new column shape (Roles column present, role chips render).

---

## 12. Open question (deferred to implementation)

**Markdown → TypeScript pipeline for the registry.** Two options:

1. **One-time hand conversion** — implementer parses the markdown manually into the `MOVE_ROLE_PRESETS` array. Simplest for v1.
2. **Build-time codegen** — a script reads the markdown and generates `move-roles.generated.ts`. More robust if the taxonomy evolves.

Pick during implementation; either is consistent with the spec.