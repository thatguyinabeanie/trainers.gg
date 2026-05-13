# Species Selector Mobile — Bottom Sheet Design

**Date:** 2026-05-13  
**Status:** Approved  
**Scope:** `apps/web/src/components/team-builder/pickers/`

---

## Context

The species picker dialog opens when a user taps "+ Add Pokémon" in the team builder. On desktop it renders a three-panel layout: a 340px filter sidebar on the left, and the Pokémon list on the right. On mobile (393px viewport) the dialog is `100vw - 2rem` ≈ 361px wide. The sidebar is `flex-shrink-0 w-[340px]` — it claims 340 of those 361px, leaving 21px for the list. The list is rendered but essentially invisible.

**Goal:** On mobile, replace the sidebar rail with a bottom-side `Sheet` that contains the same filter content. The Pokémon list gets the full dialog width. Desktop is untouched.

> **Decision:** Use shadcn `Sheet side="bottom"` rather than Vaul `Drawer`. Both `Dialog` and `Sheet` are Base UI primitives in this codebase, so stacked-modal focus trapping is well-behaved. Vaul has no precedent in this repo (the existing `calc-drawer.tsx`, despite the name, uses `Sheet`). Trade-off: no swipe-to-dismiss gesture, but consistent and de-risked.

---

## Design

### Mobile layout (≤767px)

```
┌─────────────────────────────────────┐
│  Choose species                     │  ← dialog header (sr-only)
├─────────────────────────────────────┤
│  🔍  Search Pokémon…       12/274 ⚙2│  ← search row (compact count + filter)
├─────────────────────────────────────┤
│  [🔥 Fire ×] [Weather ×]            │  ← chip strip (hidden when 0 active)
├─────────────────────────────────────┤
│  Name              Types    BST↓   │  ← column header row
│  Tyranitar-Mega    🪨🌑     700     │
│  Garchomp-Mega     🐉🌍     700     │
│  …                                  │
└─────────────────────────────────────┘
         ↑ tapping ⚙ Filters opens ↓
┌─────────────────────────────────────┐
│  Filters           [Clear all]      │  ← SheetHeader (border-b)
│  ─────────────────────────────────  │
│  TYPE                               │
│  [🔘][🔥][💧][⚡][🌿][❄]...        │
│  ABILITY                            │
│  [type or click…]                   │
│  LEARNS MOVE                        │
│  [type a move…]                     │
│  ROLE                               │
│  [Spread 271] [Weather ✓] [Terrain] │
│  ─────────────────────────────────  │
│  [    Show 12 results    ]          │  ← footer (teal button, closes sheet)
└─────────────────────────────────────┘
```

### Three states

| State | Chip strip | Filter button |
|-------|-----------|---------------|
| No filters active | Hidden | "⚙ Filters" (muted) |
| Filters active | Teal chips, each dismissible | "⚙ Filters 2" (teal + count badge) |
| Sheet open | Visible (dimmed behind scrim) | — |

### Desktop (≥768px)

No changes. The left sidebar rail, collapse toggle, and `CollapsedSidebarStrip` are untouched.

---

## Files

### New: `species-filter-sheet.tsx`

A thin wrapper that puts `SpeciesSidebar` + `RolePresetsPanel` inside a `Sheet side="bottom"`.

```ts
interface SpeciesFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: SpeciesFilterState;
  onFiltersChange: (filters: SpeciesFilterState) => void;
  format: GameFormat | undefined;
  currentTeam: Array<{ species: string }>;
  bucketCount: (roleId: RoleId) => number; // matches RolePresetsPanel's prop shape
  matchedCount: number;
  onClearAll: () => void;
}
```

Structure:
- `<Sheet open={open} onOpenChange={onOpenChange}>` from `@/components/ui/sheet`
- `<SheetContent side="bottom" showCloseButton={false} className="max-h-[85vh] flex flex-col p-0">` — bottom-side sheet, 85% viewport max
- `<SheetHeader>`: visible header row containing `<SheetTitle>Filters</SheetTitle>` on the left and a "Clear all" button on the right (button calls `onClearAll` then `onOpenChange(false)`). Use `border-b` for separation.
- Scrollable body: `<div className="min-h-0 flex-1 overflow-y-auto">` wrapping `<SpeciesSidebar filters onFiltersChange format currentTeam />` then `<RolePresetsPanel selected onChange bucketCount />`
- Sticky footer: `<div className="border-t p-3">` with a teal `Button` "Show {matchedCount} results" that calls `onOpenChange(false)`.

### Modified: `species-picker.tsx`

**1. New imports**

```ts
import { useEffect, useLayoutEffect, useRef, useState } from "react"; // add useLayoutEffect
import { useIsMobile } from "@/hooks/use-mobile";
import { ROLE_PRESETS } from "./role-registry"; // for chip labels
import { SpeciesFilterSheet } from "./species-filter-sheet";
```

Also add to the existing utility section, just before the component:

```ts
// Build a lookup map from RoleId → display label, once at module scope.
const ROLE_LABEL_BY_ID = new Map(
  ROLE_PRESETS.map((preset) => [preset.id, preset.label])
);
```

**2. New state** (after `sidebarOpen`)

```ts
const [filterSheetOpen, setFilterSheetOpen] = useState(false);
```

**3. Pre-paint sidebar close** — add immediately after the existing `useEffect` that measures scroll margin

```ts
useLayoutEffect(() => {
  /* eslint-disable react-hooks/set-state-in-effect */
  if (window.innerWidth < 768) {
    setSidebarOpen(false);
  }
  /* eslint-enable react-hooks/set-state-in-effect */
}, []);
```

**4. isMobile hook call** (alongside other hooks near top of component)

```ts
const isMobile = useIsMobile();
```

**5. Search header — mobile filter button + compact count**

On mobile the search header is tight. Two changes:

1. The "N of M" count `<span>` (currently `{matched.length} of {speciesIndex.length}`) becomes `{matched.length}/{speciesIndex.length}` on mobile to save horizontal space. Wrap that span in conditional class:
   ```tsx
   <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
     {isMobile
       ? `${matched.length}/${speciesIndex.length}`
       : `${matched.length} of ${speciesIndex.length}`}
   </span>
   ```

2. The existing `w-[88px]` reserved slot currently shows the "N filters ×" clear-all button on desktop. On mobile, replace it with a compact filter trigger:

```tsx
<div className="flex w-[88px] shrink-0 items-center justify-end">
  {isMobile ? (
    <button
      type="button"
      onClick={() => setFilterSheetOpen(true)}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors",
        activeFilterCount > 0
          ? "bg-primary/5 border-primary/30 text-primary hover:bg-primary/10"
          : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
      aria-label={`Open filters${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ""}`}
    >
      <Filter className="size-3" />
      {activeFilterCount > 0 ? (
        <>Filters <span className="bg-primary text-primary-foreground rounded-sm px-1 text-[9px]">{activeFilterCount}</span></>
      ) : (
        "Filters"
      )}
    </button>
  ) : (
    activeFilterCount > 0 && (
      <button
        type="button"
        onClick={clearAllFilters}
        className="text-primary hover:bg-primary/10 border-primary/30 bg-primary/5 inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors"
        aria-label={`Clear ${activeFilterCount} active ${activeFilterCount === 1 ? "filter" : "filters"}`}
      >
        {activeFilterCount}{" "}
        {activeFilterCount === 1 ? "filter" : "filters"}
        <span aria-hidden="true" className="text-[10px] opacity-70">×</span>
      </button>
    )
  )}
</div>
```

**6. Active filter chip strip** — add a new row immediately after the search header `<div>`, before the column-sort header row:

```tsx
{isMobile && activeFilterCount > 0 && (
  <div className="border-border flex gap-1.5 overflow-x-auto border-b px-3 py-1.5 [scrollbar-width:none]">
    {filters.types.map((type) => (
      <button
        key={type}
        type="button"
        onClick={() =>
          setFilters((prev) => ({
            ...prev,
            types: prev.types.filter((t) => t !== type),
          }))
        }
        className="bg-primary/5 border-primary/30 text-primary flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
      >
        <TypeSymbolIcon type={type} className="size-3" />
        {type}
        <span aria-hidden="true" className="opacity-60">×</span>
      </button>
    ))}
    {filters.ability && (
      <button
        type="button"
        onClick={() => setFilters((prev) => ({ ...prev, ability: null }))}
        className="bg-primary/5 border-primary/30 text-primary flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
      >
        {filters.ability}
        <span aria-hidden="true" className="opacity-60">×</span>
      </button>
    )}
    {filters.moves.map((move) => (
      <button
        key={move}
        type="button"
        onClick={() =>
          setFilters((prev) => ({
            ...prev,
            moves: prev.moves.filter((m) => m !== move),
          }))
        }
        className="bg-primary/5 border-primary/30 text-primary flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
      >
        {move}
        <span aria-hidden="true" className="opacity-60">×</span>
      </button>
    ))}
    {filters.roles.map((roleId) => (
      <button
        key={roleId}
        type="button"
        onClick={() =>
          setFilters((prev) => ({
            ...prev,
            roles: prev.roles.filter((r) => r !== roleId),
          }))
        }
        className="bg-primary/5 border-primary/30 text-primary flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
      >
        {ROLE_LABEL_BY_ID.get(roleId) ?? roleId}
        <span aria-hidden="true" className="opacity-60">×</span>
      </button>
    ))}
    {filters.megaOnly && (
      <button
        type="button"
        onClick={() => setFilters((prev) => ({ ...prev, megaOnly: false }))}
        className="bg-primary/5 border-primary/30 text-primary flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
      >
        Mega only
        <span aria-hidden="true" className="opacity-60">×</span>
      </button>
    )}
  </div>
)}
```

**7. Conditionally render the left rail** — wrap the existing left-rail div in `{!isMobile && ( ... )}`

**8. Render the filter sheet** — add `<SpeciesFilterSheet>` just before the closing tag of the outer container. Rename the state `filterDrawerOpen` → `filterSheetOpen` (and its setter) throughout the picker for consistency:

```tsx
{isMobile && (
  <SpeciesFilterSheet
    open={filterSheetOpen}
    onOpenChange={setFilterSheetOpen}
    filters={filters}
    onFiltersChange={setFilters}
    format={format}
    currentTeam={currentTeam ?? []}
    bucketCount={bucketCount}
    matchedCount={matched.length}
    onClearAll={clearAllFilters}
  />
)}
```

---

## Implementation Notes

- **`bucketCount` is a function**, not a Map: `(roleId: RoleId) => number` — pass through to `SpeciesFilterSheet` as-is (RolePresetsPanel already consumes this exact shape at `role-presets-panel.tsx:36`)
- **Role IDs are lowercase kebab-case** (`"trick-room"`, `"speed-drop"`) — never render them raw. Use the `ROLE_LABEL_BY_ID` map built from `ROLE_PRESETS` for chip display text. `RolePreset.label` already contains the canonical display name.
- `matched` is the filtered species array — `matched.length` feeds "Show N results"
- **Full viewport width** — `SheetContent side="bottom"` uses `inset-x-0` and renders via `SheetPortal` to `document.body`, so it spans the full 100vw of the viewport regardless of the parent Dialog's `calc(100vw-2rem)` width. No override needed.
- `TypeSymbolIcon` is already imported in `species-picker.tsx`
- Do NOT manually `useMemo` anything — React Compiler handles it
- **z-index:** `Dialog` and `Sheet` are both `z-50` Base UI primitives. Since the `Sheet` mounts later in the React tree, it stacks above the Dialog naturally. The `SheetContent` already animates and dims a backdrop, so the Dialog's overlay shows through dimmed (acceptable). If visually too busy, add `className="z-[60]"` on `SheetContent` to fully cover the dialog overlay.
- **Mobile sheet should auto-close when a Pokémon is selected** — `onPick` in the picker (which calls `onClose` from the dialog) already dismisses the dialog. The sheet's `open` is local state in `species-picker.tsx`, so it tears down with the dialog. No explicit handling needed.

---

## Tests

`.claude/rules/mobile-responsiveness.md` requires a `describe("conditional mount")` block for any `useIsMobile()` branch.

### New: `species-filter-sheet.test.tsx`

Co-locate with the component in `apps/web/src/components/team-builder/pickers/__tests__/species-filter-sheet.test.tsx`.

Cases:
1. **renders sidebar + role presets inside Sheet body** — assert both children are in the DOM when `open={true}`
2. **"Clear all" header button calls `onClearAll` then `onOpenChange(false)`** — click, assert both mocks fired in order
3. **"Show N results" footer button labels match `matchedCount` prop and calls `onOpenChange(false)`** — render with `matchedCount={42}`, assert text contains "42" and click invokes mock
4. **`onFiltersChange` from SpeciesSidebar bubbles up** — simulate a filter change inside `SpeciesSidebar`, assert prop fires

### Update: `species-picker.test.tsx` (or co-located picker tests)

Add a `describe("mobile filter UI")` block following the mobile-responsiveness pattern:

```tsx
const mockUseIsMobile = jest.fn();
jest.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mockUseIsMobile(),
}));

beforeEach(() => {
  mockUseIsMobile.mockReturnValue(false); // desktop default
});

describe("mobile filter UI", () => {
  beforeEach(() => mockUseIsMobile.mockReturnValue(true));

  it("hides desktop sidebar rail on mobile", () => { /* assert sidebar not in DOM */ });
  it("renders mobile Filters button in search header", () => { /* assert button visible */ });
  it("opens SpeciesFilterSheet when Filters button clicked", () => { /* click, assert sheet open */ });
  it("shows chip strip only when filters are active", () => { /* assert hidden initially */ });
  it("removing a type chip clears that specific type filter", () => { /* select fire, click chip × */ });
  it("role chip shows display label not raw kebab-case id", () => { /* select trick-room, assert chip says 'Trick Room' */ });
  it("compact count format on mobile", () => { /* assert '12/274' not '12 of 274' */ });
});
```

Reuse the existing desktop tests — they should pass unchanged because the mock defaults to `false`.

---

## What Doesn't Change

- `species-picker-dialog.tsx` — dialog sizing untouched
- `SpeciesSidebar` — props interface untouched, reused as-is inside the drawer
- `RolePresetsPanel` — props interface untouched, reused as-is inside the drawer
- `CollapsedSidebarStrip` — still rendered on desktop when sidebar is collapsed
- All filter state and filtering logic
- Desktop layout

---

## Verification

1. Run `pnpm dev:web` and open `http://localhost:3000/builder` (or `builder.trainers.gg`)
2. Open DevTools → set viewport to 393×852 (iPhone 15 Pro)
3. Click "+ Add Pokémon" on any slot
4. **Expect:** full-width Pokémon list visible; "⚙ Filters" button in search header
5. Tap "⚙ Filters" → bottom sheet slides up from the bottom of the screen, **spanning the full viewport width** (not constrained by the dialog's margins)
6. Sheet shows type grid, ability, move, role sections, "Clear all" header, and "Show N results" footer
7. Select Fire type → chip strip appears in picker header; count badge on Filters button updates
8. Tap a chip → that filter is removed; chip disappears
9. Tap a role preset (e.g., "Trick Room") → chip strip shows "Trick Room ×" (NOT "trick-room ×")
10. Sheet "Show N results" button → sheet closes, list updates with filtered count
11. Pick a Pokémon while sheet is open → dialog closes cleanly
12. Set viewport back to 1280px → desktop sidebar rail unchanged
13. Run `pnpm typecheck && pnpm lint && pnpm test` — all pass
