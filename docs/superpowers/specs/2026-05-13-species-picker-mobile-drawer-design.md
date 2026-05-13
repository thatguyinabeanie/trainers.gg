# Species Picker Mobile Drawer — Design Spec

**Date:** 2026-05-13
**Status:** Approved for implementation
**Supersedes:** Mobile filter changes from `2026-05-13-species-selector-mobile-design.md` (the `SpeciesFilterSheet` overlay approach)

## Goal

Replace the centered `Dialog` species picker on mobile with a bottom drawer that rises from the bottom of the viewport. The drawer contains two swappable panels — a mobile-optimized species list and an inline filters panel — eliminating the previous "Sheet on top of Dialog" stacking and giving the filter UI a full-screen, native-feeling experience.

## Background

The previous mobile work (commit `843803f`) made the species picker's internal sidebar collapse on mobile and surfaced filters via a separate `Sheet side="bottom"` that opened on top of the existing centered `Dialog`. That fixed the "21px-wide list" bug but left two problems visible in screenshots:

1. The picker itself is still a centered floating modal with a ring border — feels like a desktop dialog squeezed onto a phone, not a mobile-native pattern.
2. The species rows still use the desktop grid (sprite + name + types + abilities + 6 stat columns), so the abilities column clips on the right and the stat columns are effectively invisible.

This spec replaces that approach. Instead of patching the desktop picker for mobile, we ship a dedicated mobile component that owns its own layout, container, and panel-switching state.

## Architecture

### Component layout

```text
SpeciesPickerDialog (existing — entry point)
  ├─ Desktop (isMobile=false): Dialog + SpeciesPicker  ← unchanged
  └─ Mobile (isMobile=true):  SpeciesPickerMobile      ← new

SpeciesPickerMobile (new — self-contained)
  ├─ Sheet side="bottom", h=95vh
  ├─ State:
  │    - view: "list" | "filters"
  │    - filters: SpeciesFilterState
  │    - query: string
  │    - sort: SortState
  ├─ List view:
  │    - SpeciesMobileSearchBar  (search input + Filters button + count)
  │    - SpeciesMobileChipStrip  (active filter pills, when activeFilterCount > 0)
  │    - SpeciesMobileList       (virtualized list of SpeciesMobileRow)
  └─ Filters view:
       - SpeciesMobileFiltersHeader  (Back · Filters · Clear all)
       - SpeciesSidebar              (reused from desktop — type grid, ability, moves)
       - RolePresetsPanel            (reused from desktop)
       - "Show N results" footer button
```

### Files

| Path | Status | Responsibility |
|------|--------|---------------|
| `apps/web/src/components/team-builder/pickers/species-picker-dialog.tsx` | Modify | Conditionally render `SpeciesPickerMobile` on mobile, `Dialog + SpeciesPicker` on desktop |
| `apps/web/src/components/team-builder/pickers/species-picker-mobile.tsx` | **Create** | Mobile-only bottom drawer with panel switching and own filter/query/sort state |
| `apps/web/src/components/team-builder/pickers/species-mobile-row.tsx` | **Create** | Compact mobile row: sprite + name + types + ability chips + single-line stats |
| `apps/web/src/components/team-builder/pickers/species-picker.tsx` | Modify | **Revert** mobile additions from previous sprint (filterSheetOpen state, useIsMobile, useLayoutEffect, chip strip, conditional rail, SpeciesFilterSheet render) |
| `apps/web/src/components/team-builder/pickers/species-filter-sheet.tsx` | **Delete** | Superseded by inline filters panel in `SpeciesPickerMobile` |
| `apps/web/src/components/team-builder/pickers/__tests__/species-filter-sheet.test.tsx` | **Delete** | Tests for deleted component |
| `apps/web/src/components/team-builder/__tests__/species-picker-mobile.test.tsx` | Modify | Remove tests for the previous mobile-in-species-picker approach; tests now target SpeciesPickerMobile |
| `apps/web/src/components/team-builder/pickers/__tests__/species-picker-mobile.test.tsx` | **Create** | New tests for `SpeciesPickerMobile` panel switching and row rendering |
| `apps/web/src/components/team-builder/pickers/__tests__/species-mobile-row.test.tsx` | **Create** | Unit tests for the mobile row component |

### Why a dedicated mobile component (vs. responsive `SpeciesPicker`)

The desktop `SpeciesPicker` is a 1,169-line file built around a wide table grid (`grid-cols-[20px_56px_minmax(170px,2fr)_72px_minmax(120px,1.5fr)_repeat(6,48px)_48px_minmax(0,2fr)]`). Forcing one component to switch between that grid and a mobile card layout would require conditional rendering inside dozens of locations and would entangle the two layouts permanently. A separate `SpeciesPickerMobile`:

- Keeps the desktop code path untouched and easy to reason about
- Lets the mobile rows use a simple flex layout instead of a 12-column grid
- Allows clean panel-switching state without polluting desktop state
- Is the same pattern as `staff-client.tsx` / `StaffMobileList` (mobile-responsiveness rule's recommended split)

The trade-off is some duplicated logic (filtering, sorting, search). The filter/search functions themselves (`searchSpecies`, `sortSpecies`, `buildSpeciesSearchIndex`) are already extracted from `@trainers/pokemon` and reusable — only the React state shape and JSX are duplicated.

## Visual Design

### Drawer container

- `Sheet side="bottom"` from `@/components/ui/sheet` (Base UI Dialog primitive)
- `className="h-[95vh] flex flex-col gap-0 p-0"` — drawer rises to ~95% of viewport, 5% peek of background page at top
- `showCloseButton={false}` — drag handle visually communicates dismissibility; backdrop tap or "Show N results" closes
- Top-of-drawer drag handle: `<div className="bg-muted-foreground/20 mx-auto mt-2 mb-1 h-1 w-9 rounded-full" />`
- Border-radius top corners only: `rounded-t-[20px] rounded-b-none`

### List view layout

```text
┌─────────────────────────────────────┐  ↑ 95vh
│            ▬▬                       │  drag handle
├─────────────────────────────────────┤
│ 🔍  Search Pokémon…   ⚙ Filters  274/274
├─────────────────────────────────────┤
│ 🔥 Fire ×   Sand Force ×           │  chip strip (only when filters active)
├─────────────────────────────────────┤
│                                     │
│  [sprite] Garchomp-Mega    🐲 🌍   │
│           Sand Force · Rough Skin   │
│           HP·108 Atk·170 Def·115 …  │  ← scrollable list
│                                     │
│  [sprite] Palafin-Hero      💧     │
│           Zero to Hero              │
│           HP·100 Atk·160 Def·97 …   │
│                                     │
│  …                                  │
└─────────────────────────────────────┘
```

**Search bar:** flex row, height ~44px, border-bottom. Search icon + input (flex-1) + Filters button + count badge. The Filters button:
- Default state: outline button "⚙ Filters"
- Active state (`activeFilterCount > 0`): teal-filled with badge `⚙ Filters 2` where the `2` is in a contrasting pill

**Chip strip:** Only renders when `activeFilterCount > 0`. Horizontal-scrollable row of dismissible pills (same as the strip we built in the previous sprint — types, ability, moves, roles, megaOnly). Tapping × removes that filter. `border-b border-border px-3 py-1.5 [scrollbar-width:none]`.

### Mobile row layout

Each row in the species list is a 3-line card:

```text
┌────────────────────────────────────────────────┐
│  [40px sprite]  Garchomp-Mega        🐲 🌍   │  ← line 1
│                 [Sand Force] [Rough Skin]      │  ← line 2 (ability chips)
│                 HP 108 · Atk 170 · Def 115 · …│  ← line 3 (compact stats)
└────────────────────────────────────────────────┘
```

- Container: `flex gap-2.5 px-3 py-2 border-b border-border`
- Sprite: `size-10` circle, teal-tinted background (matches existing `bg-primary/5 border-primary/30`)
- Row body: `flex-1 min-w-0`
  - **Line 1:** name (`text-sm font-semibold`) + types (right-aligned 2 type-symbol icons, 18×18)
  - **Line 2:** ability chips — teal pills (`bg-primary/5 border-primary/30 text-primary text-[10px] px-1.5 py-0.5 rounded-md`). Show **all** abilities from the species' ability list.
  - **Line 3:** stat line, flex with `gap-1.5`, font-size `text-[10px]`:
    - 6 stat pairs: label `<span className={cn("font-bold opacity-60", STAT_HEADER_COLORS.hp)}>HP</span>` + value `<span className={cn("font-semibold tabular-nums", STAT_HEADER_COLORS.hp)}>108</span>`
    - One BST pair at end: `<span className="font-bold opacity-60 text-foreground">BST</span>` + `<span className="font-bold tabular-nums text-foreground">700</span>`
    - Reuse the existing `STAT_HEADER_COLORS` map from `species-picker.tsx:227` (export it from a shared file or duplicate the constant — see implementation notes). The map is:
      - `hp: "text-rose-500 dark:text-rose-400"`
      - `atk: "text-orange-500 dark:text-orange-400"`
      - `def: "text-amber-500 dark:text-amber-400"`
      - `spa: "text-sky-500 dark:text-sky-400"`
      - `spd: "text-emerald-500 dark:text-emerald-400"`
      - `spe: "text-fuchsia-500 dark:text-fuchsia-400"`
      - `bst: "text-foreground"`
- Tap row: calls `onPick(species)` (closes the drawer via `onOpenChange(false)` in parent)
- Visual feedback: `active:bg-muted/50`

**No** expand/collapse chevron on mobile. The desktop "expand to see moves" feature is dropped on mobile — it doesn't fit the mobile layout cleanly. Users who need that detail can use desktop or tap a Pokémon to add it and see details in the team builder.

### Filters view layout

```text
┌─────────────────────────────────────┐
│            ▬▬                       │  drag handle
├─────────────────────────────────────┤
│  ‹ Back     Filters         Clear all
├─────────────────────────────────────┤
│  TYPE                               │
│  [type grid — 6 cols × 3 rows]      │
│                                     │
│  ABILITY                            │
│  [____________________________]     │
│                                     │
│  LEARNS MOVE                        │
│  [____________________________]     │
│                                     │
│  ROLE                               │
│  Damage Type     Defensive          │
│  Spread     271  Screens     149    │  ← scrollable
│  Priority   164  Protect     273    │
│  …                                  │
├─────────────────────────────────────┤
│         [ Show 12 results ]         │  ← footer
└─────────────────────────────────────┘
```

**Header:** `flex items-center px-3 py-3 border-b border-border`
- Back button: `‹ Back` — text + chevron-left icon, calls `setView("list")`
- Title: `Filters` (text-sm font-semibold, centered or left-aligned)
- Clear all: text-link on the right (`text-muted-foreground hover:text-foreground`), calls `clearAllFilters()` and `setView("list")`

**Body:** Scrollable, contains the existing `SpeciesSidebar` and `RolePresetsPanel` components (unchanged — they already render correctly in narrow containers).

**Footer:** Sticky bottom button `<Button className="w-full">Show {matchedCount} results</Button>`. Calls `setView("list")`.

### Animations

- Drawer slide-up: handled by Base UI Sheet (~200ms cubic-bezier).
- Panel switch (list ↔ filters): instant for now. If users feel disoriented, can add a slide animation later — out of scope for this spec.
- Drag handle: visual only. No swipe-to-dismiss gesture in this iteration (Base UI Sheet handles backdrop-tap dismiss and Esc-key dismiss).

## State Management

`SpeciesPickerMobile` owns:

```ts
type View = "list" | "filters";

const [view, setView] = useState<View>("list");
const [query, setQuery] = useState("");
const [filters, setFilters] = useState<SpeciesFilterState>(DEFAULT_SPECIES_FILTERS);
const [sort, setSort] = useState<SortState>({ col: "bst", dir: "desc" });
```

Derived per render (compiler memoizes):

```ts
const fullIndex = buildSpeciesSearchIndex(format?.id ?? DEFAULT_FORMAT_ID, getRolesForSpecies);
const speciesIndex = format?.id ? fullIndex.filter(e => isLegalSpecies(e.species, format.id)) : fullIndex;
const filtered = searchSpecies(speciesIndex, query, { ...filters });
const matched = sortSpecies(filtered, sort);
const activeFilterCount = filters.types.length + filters.moves.length + filters.roles.length + (filters.ability ? 1 : 0) + (filters.megaOnly ? 1 : 0);
const roleCounts = ...;  // same as desktop
const bucketCount = (roleId: string) => roleCounts.get(roleId) ?? 0;
```

These computations are duplicated from `species-picker.tsx`. To keep them in sync long-term, the **pure data helpers** (`searchSpecies`, `sortSpecies`, `buildSpeciesSearchIndex`, `isLegalSpecies`) already live in `@trainers/pokemon` — only the React orchestration is duplicated, which is acceptable.

### Sort on mobile

The mobile row layout doesn't surface column headers, so the user can't tap-to-sort like on desktop. For this iteration:
- **Default sort: BST descending** (same as desktop default — surfaces strongest mons first)
- **No sort UI on mobile** — users who need custom sort use desktop

This is intentional YAGNI. If user feedback indicates need, a sort dropdown can be added later.

### Pick handler

```ts
function handlePick(species: string) {
  onPick(species);          // forwards to consumer
  onOpenChange(false);      // closes drawer
}
```

When `onOpenChange(false)` fires, the drawer animates out. State (filters, query, view) is preserved by default unless the consumer remounts the component. The next time the drawer opens, the user sees their previous filter state — same UX as desktop.

## Component APIs

### `SpeciesPickerMobile`

```ts
interface SpeciesPickerMobileProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string | null;
  format: GameFormat | undefined;
  currentTeam?: Array<{ species: string }>;
  onPick: (species: string) => void;
}
```

Same surface as `SpeciesPickerDialog` so it can be a drop-in replacement on mobile.

### `SpeciesMobileRow`

```ts
interface SpeciesMobileRowProps {
  entry: SpeciesSearchEntry;  // the existing rich entry type
  onPick: (species: string) => void;
  isSelected?: boolean;       // for current-slot highlight (matches desktop behavior)
}
```

Pure presentational. Reads `entry.species`, `entry.types`, `entry.abilities`, `entry.baseStats`, `entry.bst` and renders the three-line card.

### Shared `STAT_HEADER_COLORS` constant

The `STAT_HEADER_COLORS` map currently lives inside `species-picker.tsx` (not exported). The mobile row needs it too. Approach: **extract** it to a new file `apps/web/src/components/team-builder/pickers/stat-header-colors.ts` and import in both `species-picker.tsx` and `species-mobile-row.tsx`. Single source of truth, no duplication. This is a small, in-scope refactor since we're already touching both files.

### `SpeciesPickerDialog` (modified)

Add an `isMobile` branch:

```tsx
export function SpeciesPickerDialog(props: SpeciesPickerDialogProps) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return <SpeciesPickerMobile {...props} />;
  }
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent ...>...</DialogContent>
    </Dialog>
  );
}
```

## Cleanup From Previous Sprint

Revert from `species-picker.tsx`:
- `useLayoutEffect` import (no longer needed)
- `useIsMobile` import (no longer needed)
- `ROLE_PRESETS`, `ROLE_LABEL_BY_ID` map (chip strip is now in `SpeciesPickerMobile`)
- `SpeciesFilterSheet` import
- `filterSheetOpen` state, `isMobile` hook call
- `useLayoutEffect` block that closed sidebar on mobile
- Mobile/desktop conditional in the count `<span>`
- Mobile Filters button branch in the `w-[88px]` slot
- Active filter chip strip
- `{!isMobile && (...)}` wrapping the left rail
- `{isMobile && <SpeciesFilterSheet …/>}` at end of return

Delete entirely:
- `apps/web/src/components/team-builder/pickers/species-filter-sheet.tsx`
- `apps/web/src/components/team-builder/pickers/__tests__/species-filter-sheet.test.tsx`
- `apps/web/src/components/team-builder/__tests__/species-picker-mobile.test.tsx` (the existing version that tests `SpeciesPicker`'s mobile branches — superseded by new tests targeting `SpeciesPickerMobile`)

Net result: `species-picker.tsx` is back to its desktop-only state (same as before the previous sprint), and all mobile concerns live in the dedicated `SpeciesPickerMobile` component tree.

## Testing

### Unit tests

**`species-mobile-row.test.tsx`** — Pure rendering tests:
- Renders sprite, name, types
- Renders all ability chips
- Renders all 6 stat values with correct colors
- Renders BST
- `onPick` called with `entry.species` on click

**`species-picker-mobile.test.tsx`** — Behavioral tests:
- `describe("list view")`: renders search bar, Filters button, mobile rows; tapping a row calls `onPick` and `onOpenChange(false)`
- `describe("filters view")`: tapping Filters button switches `view` to `"filters"`; renders Back button, SpeciesSidebar, RolePresetsPanel, "Show N results" button; tapping Back returns to list; tapping Show returns to list
- `describe("chip strip")`: hidden when no filters active; visible with correct chips when filters present; tapping × removes that filter
- `describe("Clear all")`: clears filters and switches back to list view

Use Fishery factories for `SpeciesSearchEntry` (create one in `tooling/test-utils/src/factories/` if it doesn't exist — see writing-tests skill).

### E2E (Playwright)

Out of scope for this spec — the existing E2E suite already covers the dialog → onPick flow for desktop. Mobile E2E can be added later if needed.

### Visual smoke

After implementation, verify in Chrome DevTools at 393×852:
1. Tap "+ Add Pokémon" → drawer rises from bottom (not centered dialog)
2. Drawer is full viewport width, drag handle visible at top
3. List shows mobile rows with sprite + name + types + abilities + compact stats
4. Tap Filters → panel swaps to filters view (no new sheet on top)
5. Select Fire type → tap "Show N results" → returns to list, chip shows "🔥 Fire ×"
6. Tap chip × → filter removed
7. Tap "Clear all" in filters → returns to list with no filters
8. Tap a species → drawer closes, mon appears in slot
9. At 1280px viewport: desktop dialog still works exactly as before — no regressions

## Out of Scope

These are explicitly NOT in this design — defer to future iterations:

- Row expansion to show moves on mobile (desktop has this; mobile drops it for now)
- Tap-to-sort on mobile (no column headers — default BST-desc is good enough)
- Swipe-to-dismiss gesture on the drawer (Base UI handles backdrop tap + Esc)
- Sliding panel-switch animation (instant swap for v1; can add transition later)
- Smart search panel on mobile (the desktop banner that promotes query → filter chips)
- Sticky stat-header on mobile (no stat columns to sort)
- Refactoring `species-picker.tsx` itself for shared logic with mobile

## Related

- Previous sprint design: `docs/superpowers/specs/2026-05-13-species-selector-mobile-design.md` (superseded by this spec for everything except the chip-strip pattern, which is reused)
- Mobile-responsiveness rule: `.claude/rules/mobile-responsiveness.md` (conditional mount, useLayoutEffect, tap targets)
- Web UI catalog: `.claude/rules/web-ui-catalog.md` (Sheet, Button, etc.)
