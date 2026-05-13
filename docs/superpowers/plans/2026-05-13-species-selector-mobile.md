# Species Selector Mobile — Bottom Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the species picker on mobile by replacing the 340px sidebar rail with a full-viewport-width `Sheet side="bottom"`, making the Pokémon list visible and filterable on phones.

**Architecture:** Two source files change. A new `SpeciesFilterSheet` component wraps the existing `SpeciesSidebar` and `RolePresetsPanel` (both unchanged) inside a `Sheet side="bottom"`. `species-picker.tsx` gains `useIsMobile()` detection, hides the sidebar rail on mobile, adds an active-filter chip strip, and renders the sheet. Desktop layout is completely untouched.

**Tech Stack:** Next.js 16, React 19 with React Compiler (no manual memo), shadcn `Sheet` (Base UI — same primitive family as Dialog, safe to stack), `useIsMobile()` from `@/hooks/use-mobile`, Tailwind CSS 4

**Spec:** `docs/superpowers/specs/2026-05-13-species-selector-mobile-design.md`

---

## File Map

| File | Status | Responsibility |
|------|--------|---------------|
| `apps/web/src/components/team-builder/pickers/species-filter-sheet.tsx` | **Create** | Bottom Sheet: header with "Filters" + "Clear all", scrollable sidebar + role content, "Show N results" footer |
| `apps/web/src/components/team-builder/pickers/species-picker.tsx` | **Modify** | Add mobile detection, `useLayoutEffect` sidebar close, compact count, Filters button, chip strip, conditional sidebar, sheet render |
| `apps/web/src/components/team-builder/pickers/species-filter-sheet.test.tsx` | **Create** | Unit tests co-located with the sheet component |
| `apps/web/src/components/team-builder/__tests__/species-picker-mobile.test.tsx` | **Create** | Mobile-branch tests alongside existing species-picker.test.tsx |

---

## Task 1: Create `SpeciesFilterSheet` — tests first

**Files:**
- Create: `apps/web/src/components/team-builder/pickers/species-filter-sheet.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/components/team-builder/pickers/species-filter-sheet.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DEFAULT_SPECIES_FILTERS } from "./species-filter-state";
import { SpeciesFilterSheet } from "./species-filter-sheet";

jest.mock("./species-sidebar", () => ({
  SpeciesSidebar: () => <div data-testid="species-sidebar" />,
}));
jest.mock("./role-presets-panel", () => ({
  RolePresetsPanel: () => <div data-testid="role-presets-panel" />,
}));

const defaultProps = {
  open: true,
  onOpenChange: jest.fn(),
  filters: DEFAULT_SPECIES_FILTERS,
  onFiltersChange: jest.fn(),
  format: undefined,
  currentTeam: [] as Array<{ species: string }>,
  bucketCount: jest.fn().mockReturnValue(0),
  matchedCount: 42,
  onClearAll: jest.fn(),
};

describe("SpeciesFilterSheet", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders SpeciesSidebar and RolePresetsPanel when open", () => {
    render(<SpeciesFilterSheet {...defaultProps} />);
    expect(screen.getByTestId("species-sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("role-presets-panel")).toBeInTheDocument();
  });

  it("shows Filters heading", () => {
    render(<SpeciesFilterSheet {...defaultProps} />);
    expect(
      screen.getByRole("heading", { name: /^filters$/i })
    ).toBeInTheDocument();
  });

  it("Clear all calls onClearAll then closes the sheet", async () => {
    const user = userEvent.setup();
    const onClearAll = jest.fn();
    const onOpenChange = jest.fn();
    render(
      <SpeciesFilterSheet
        {...defaultProps}
        onClearAll={onClearAll}
        onOpenChange={onOpenChange}
      />
    );
    await user.click(screen.getByRole("button", { name: /clear all/i }));
    expect(onClearAll).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("Show results footer shows matchedCount and closes on click", async () => {
    const user = userEvent.setup();
    const onOpenChange = jest.fn();
    render(
      <SpeciesFilterSheet
        {...defaultProps}
        matchedCount={42}
        onOpenChange={onOpenChange}
      />
    );
    const btn = screen.getByRole("button", { name: /show 42 results/i });
    expect(btn).toBeInTheDocument();
    await user.click(btn);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("does not render content when closed", () => {
    render(<SpeciesFilterSheet {...defaultProps} open={false} />);
    expect(screen.queryByTestId("species-sidebar")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd /Users/gmendoza/source/trainers.gg && pnpm test --filter @trainers/web -- --testPathPattern="species-filter-sheet" 2>&1 | tail -15
```

Expected: FAIL — `Cannot find module './species-filter-sheet'`

---

## Task 2: Implement `SpeciesFilterSheet`

**Files:**
- Create: `apps/web/src/components/team-builder/pickers/species-filter-sheet.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { type GameFormat } from "@trainers/pokemon";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { RolePresetsPanel } from "./role-presets-panel";
import { type RoleId } from "./role-registry";
import { type SpeciesFilterState } from "./species-filter-state";
import { SpeciesSidebar } from "./species-sidebar";

// =============================================================================
// Types
// =============================================================================

interface SpeciesFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: SpeciesFilterState;
  onFiltersChange: (filters: SpeciesFilterState) => void;
  format: GameFormat | undefined;
  currentTeam: Array<{ species: string }>;
  /** Matches RolePresetsPanel's prop shape exactly — (roleId) => count */
  bucketCount: (roleId: RoleId) => number;
  matchedCount: number;
  onClearAll: () => void;
}

// =============================================================================
// SpeciesFilterSheet
// =============================================================================

export function SpeciesFilterSheet({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  format,
  currentTeam,
  bucketCount,
  matchedCount,
  onClearAll,
}: SpeciesFilterSheetProps) {
  function handleClearAll() {
    onClearAll();
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="flex max-h-[85vh] flex-col gap-0 p-0"
      >
        <SheetHeader className="border-border flex shrink-0 flex-row items-center justify-between border-b px-4 py-3 text-left">
          <SheetTitle className="text-sm font-semibold">Filters</SheetTitle>
          <button
            type="button"
            onClick={handleClearAll}
            className="text-primary hover:text-primary/80 text-xs font-medium transition-colors"
          >
            Clear all
          </button>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <SpeciesSidebar
            filters={filters}
            onFiltersChange={onFiltersChange}
            format={format}
            currentTeam={currentTeam}
          />
          <RolePresetsPanel
            selected={filters.roles}
            onChange={(next) => onFiltersChange({ ...filters, roles: next })}
            bucketCount={bucketCount}
          />
        </div>

        <div className="border-border shrink-0 border-t p-3">
          <Button className="w-full" onClick={() => onOpenChange(false)}>
            Show {matchedCount} results
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Run tests — expect all 5 to pass**

```bash
cd /Users/gmendoza/source/trainers.gg && pnpm test --filter @trainers/web -- --testPathPattern="species-filter-sheet" 2>&1 | tail -15
```

Expected: 5 tests PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/team-builder/pickers/species-filter-sheet.tsx \
        apps/web/src/components/team-builder/pickers/species-filter-sheet.test.tsx
git commit -m "feat: add SpeciesFilterSheet mobile bottom sheet component

Wraps SpeciesSidebar + RolePresetsPanel in a Sheet side=bottom for the
mobile species picker. Uses Base UI Sheet (same primitive family as Dialog)
rather than Vaul to avoid focus-trap conflicts."
```

---

## Task 3: Write failing mobile picker tests

**Files:**
- Create: `apps/web/src/components/team-builder/__tests__/species-picker-mobile.test.tsx`

- [ ] **Step 1: Write the tests**

The existing `species-picker.test.tsx` in the same directory mocks `next/image` and `@trainers/pokemon` — copy those same module-level mocks here.

Create `apps/web/src/components/team-builder/__tests__/species-picker-mobile.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ── next/image mock (JSDOM can't render Next.js Image) ─────────────────────
jest.mock("next/image", () => ({
  __esModule: true,
  default: function MockImage({
    src,
    alt,
    width,
    height,
    ...rest
  }: {
    src: string;
    alt: string;
    width: number;
    height: number;
    [key: string]: unknown;
  }) {
    return <img src={src} alt={alt} width={width} height={height} {...rest} />;
  },
}));

// ── @trainers/pokemon mock ─────────────────────────────────────────────────
jest.mock("@trainers/pokemon", () => ({
  ALL_TYPES: ["Normal", "Fire", "Water"],
  buildSpeciesSearchIndex: jest.fn().mockReturnValue([]),
  getAllLegalMoves: jest.fn().mockReturnValue([]),
  isLegalSpecies: jest.fn().mockReturnValue(true),
  getLegalMoves: jest.fn().mockReturnValue([]),
  getMoveData: jest.fn().mockReturnValue(null),
  searchSpecies: jest.fn().mockReturnValue([]),
}));

jest.mock("@trainers/pokemon/sprites", () => ({
  getPokemonSprite: jest.fn().mockReturnValue("/sprite.png"),
}));

// ── useIsMobile mock ───────────────────────────────────────────────────────
const mockUseIsMobile = jest.fn();
jest.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => mockUseIsMobile(),
}));

// ── Stub heavy child components ────────────────────────────────────────────
jest.mock("../pickers/species-sidebar", () => ({
  SpeciesSidebar: () => <div data-testid="species-sidebar" />,
}));
jest.mock("../pickers/role-presets-panel", () => ({
  RolePresetsPanel: () => <div data-testid="role-presets-panel" />,
}));
jest.mock("../pickers/species-filter-sheet", () => ({
  SpeciesFilterSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="filter-sheet" /> : null,
}));
jest.mock("../pickers/species-smart-search", () => ({
  SpeciesSmartSearch: () => null,
}));
jest.mock("../pickers/species-expanded-panel", () => ({
  SpeciesExpandedPanel: () => null,
}));
jest.mock("../pickers/ability-cell", () => ({
  AbilityCell: () => null,
}));

import { SpeciesPicker } from "../pickers/species-picker";

const defaultProps = {
  value: null,
  format: undefined,
  currentTeam: [] as Array<{ species: string }>,
  onPick: jest.fn(),
  onClose: jest.fn(),
};

describe("SpeciesPicker — conditional mount", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("desktop (default)", () => {
    beforeEach(() => mockUseIsMobile.mockReturnValue(false));

    it("renders the sidebar on desktop", () => {
      render(<SpeciesPicker {...defaultProps} />);
      expect(screen.getByTestId("species-sidebar")).toBeInTheDocument();
    });

    it("does not render SpeciesFilterSheet on desktop", () => {
      render(<SpeciesPicker {...defaultProps} />);
      expect(screen.queryByTestId("filter-sheet")).not.toBeInTheDocument();
    });

    it("shows 'of' count format on desktop", () => {
      render(<SpeciesPicker {...defaultProps} />);
      expect(screen.getByText(/0 of 0/)).toBeInTheDocument();
    });
  });

  describe("mobile filter UI", () => {
    beforeEach(() => mockUseIsMobile.mockReturnValue(true));

    it("hides the sidebar rail on mobile", () => {
      render(<SpeciesPicker {...defaultProps} />);
      expect(screen.queryByTestId("species-sidebar")).not.toBeInTheDocument();
    });

    it("renders a Filters button in the search header", () => {
      render(<SpeciesPicker {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: /open filters/i })
      ).toBeInTheDocument();
    });

    it("opens SpeciesFilterSheet when Filters button is clicked", async () => {
      const user = userEvent.setup();
      render(<SpeciesPicker {...defaultProps} />);
      expect(screen.queryByTestId("filter-sheet")).not.toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /open filters/i }));
      expect(screen.getByTestId("filter-sheet")).toBeInTheDocument();
    });

    it("chip strip is hidden when no filters are active", () => {
      render(<SpeciesPicker {...defaultProps} />);
      // No teal dismissible chip buttons should exist
      const chipButtons = screen
        .queryAllByRole("button")
        .filter((btn) => btn.textContent?.includes("×") && btn !== screen.queryByRole("button", { name: /open filters/i }));
      expect(chipButtons).toHaveLength(0);
    });

    it("uses compact slash count format on mobile", () => {
      render(<SpeciesPicker {...defaultProps} />);
      expect(screen.getByText(/^0\/0$/)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd /Users/gmendoza/source/trainers.gg && pnpm test --filter @trainers/web -- --testPathPattern="species-picker-mobile" 2>&1 | tail -20
```

Expected: FAIL — mobile tests fail because mobile branches don't exist yet in `species-picker.tsx`. Desktop tests may also fail on import if the mocks are incomplete — that's fine at this stage.

---

## Task 4: Wire mobile changes into `species-picker.tsx`

**Files:**
- Modify: `apps/web/src/components/team-builder/pickers/species-picker.tsx`

Do the following edits **in order** — each is a small, targeted change.

- [ ] **Step 1: Update the React import to add `useLayoutEffect`**

Find line 3:
```tsx
import { useEffect, useRef, useState } from "react";
```
Replace with:
```tsx
import { useEffect, useLayoutEffect, useRef, useState } from "react";
```

- [ ] **Step 2: Add `useIsMobile` import**

After the line `import { cn } from "@/lib/utils";`, add:
```tsx
import { useIsMobile } from "@/hooks/use-mobile";
```

- [ ] **Step 3: Update the role-registry import to include `ROLE_PRESETS`**

Find:
```tsx
import { getRolesForMove, getRolesForSpecies, type RoleId } from "./role-registry";
```
Replace with:
```tsx
import {
  getRolesForMove,
  getRolesForSpecies,
  ROLE_PRESETS,
  type RoleId,
} from "./role-registry";
```

- [ ] **Step 4: Add `SpeciesFilterSheet` import**

After the line `import { SpeciesExpandedPanel } from "./species-expanded-panel";`, add:
```tsx
import { SpeciesFilterSheet } from "./species-filter-sheet";
```

- [ ] **Step 5: Add the `ROLE_LABEL_BY_ID` map at module scope**

After the `HIGH_STAT_THRESHOLD` constant (around line 50), add:
```tsx
// Map from RoleId → display label for mobile filter chips.
// RoleIds are kebab-case ("trick-room") but labels are title-case ("Trick Room").
const ROLE_LABEL_BY_ID = new Map(
  ROLE_PRESETS.map((preset) => [preset.id, preset.label])
);
```

- [ ] **Step 6: Add `filterSheetOpen` state and `isMobile` hook inside the component**

Inside `SpeciesPicker`, after the line `const [sidebarOpen, setSidebarOpen] = useState(true);`, add:
```tsx
const [filterSheetOpen, setFilterSheetOpen] = useState(false);
const isMobile = useIsMobile();
```

- [ ] **Step 7: Add `useLayoutEffect` to close sidebar pre-paint on mobile**

After the existing `useEffect` that creates the `ResizeObserver` (the one ending with `return () => observer.disconnect()`), add:
```tsx
// Close the desktop sidebar before first browser paint on mobile so users
// never see the 340px panel squash the Pokémon list. useLayoutEffect fires
// synchronously after DOM mutations but before paint.
useLayoutEffect(() => {
  /* eslint-disable react-hooks/set-state-in-effect */
  if (window.innerWidth < 768) {
    setSidebarOpen(false);
  }
  /* eslint-enable react-hooks/set-state-in-effect */
}, []);
```

- [ ] **Step 8: Update the count `<span>` to compact format on mobile**

Find:
```tsx
<span className="text-muted-foreground shrink-0 text-xs tabular-nums">
  {matched.length} of {speciesIndex.length}
</span>
```
Replace with:
```tsx
<span className="text-muted-foreground shrink-0 text-xs tabular-nums">
  {isMobile
    ? `${matched.length}/${speciesIndex.length}`
    : `${matched.length} of ${speciesIndex.length}`}
</span>
```

- [ ] **Step 9: Replace the `w-[88px]` slot with a mobile/desktop conditional**

Find the entire `<div className="flex w-[88px] shrink-0 items-center justify-end">` block (it ends just before the count `<span>`). Replace the whole div:

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
        <>
          Filters{" "}
          <span className="bg-primary text-primary-foreground rounded-sm px-1 text-[9px]">
            {activeFilterCount}
          </span>
        </>
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
        <span aria-hidden="true" className="text-[10px] opacity-70">
          ×
        </span>
      </button>
    )
  )}
</div>
```

- [ ] **Step 10: Add the active filter chip strip**

Find the comment `{/* 3-column body */}` and the `<div className="flex min-h-0 flex-1 overflow-hidden">` that follows it. Insert the chip strip between the closing `</div>` of the search header and this body div:

```tsx
{/* Active filter chips — mobile only, hidden when 0 active filters */}
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
        <span aria-hidden="true" className="opacity-60">
          ×
        </span>
      </button>
    ))}
    {filters.ability && (
      <button
        type="button"
        onClick={() => setFilters((prev) => ({ ...prev, ability: null }))}
        className="bg-primary/5 border-primary/30 text-primary flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
      >
        {filters.ability}
        <span aria-hidden="true" className="opacity-60">
          ×
        </span>
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
        <span aria-hidden="true" className="opacity-60">
          ×
        </span>
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
        <span aria-hidden="true" className="opacity-60">
          ×
        </span>
      </button>
    ))}
    {filters.megaOnly && (
      <button
        type="button"
        onClick={() => setFilters((prev) => ({ ...prev, megaOnly: false }))}
        className="bg-primary/5 border-primary/30 text-primary flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
      >
        Mega only
        <span aria-hidden="true" className="opacity-60">
          ×
        </span>
      </button>
    )}
  </div>
)}
```

- [ ] **Step 11: Conditionally render the left rail — desktop only**

Find this comment + opening div (around line 938):
```tsx
{/* Left rail — collapsible sidebar with smooth transition.
    Expanded: full filter panel (sidebar + roles + clear).
    Collapsed: thin icon strip with filter indicators. */}
<div
  className={cn(
    "border-border flex flex-shrink-0 flex-col border-r transition-[width] duration-200 ease-in-out",
    sidebarOpen ? "w-[340px]" : "w-12"
  )}
>
```

Wrap the entire left-rail `<div>` with a conditional. The left rail starts at the comment `{/* Left rail — collapsible sidebar...*/}` and its closing `</div>` sits immediately before `<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">` (the right panel). Make two edits:

**Before the comment**, insert:
```tsx
{/* Left rail — desktop only. Mobile uses SpeciesFilterSheet instead. */}
{!isMobile && (
```

**After the left-rail's closing `</div>`** (the one before the right-panel div), insert:
```tsx
)}
```

The result looks like:
```tsx
{!isMobile && (
  <div
    className={cn(
      "border-border flex flex-shrink-0 flex-col border-r transition-[width] duration-200 ease-in-out",
      sidebarOpen ? "w-[340px]" : "w-12"
    )}
  >
    {sidebarOpen ? (
      // ... existing expanded sidebar JSX — DO NOT CHANGE ...
    ) : (
      <CollapsedSidebarStrip
        filters={filters}
        onExpand={() => setSidebarOpen(true)}
      />
    )}
  </div>
)}
```
```

- [ ] **Step 12: Render `SpeciesFilterSheet`**

Find the very last line of the component's return statement — the closing `</div>` of the outermost container div (the one with `data-testid="species-picker"`). Insert just before it:

```tsx
{/* Mobile-only filter bottom sheet — full-viewport-width via SheetPortal */}
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

## Task 5: Verify all tests pass and commit

**Files:** (no new files)

- [ ] **Step 1: Run the mobile picker tests**

```bash
cd /Users/gmendoza/source/trainers.gg && pnpm test --filter @trainers/web -- --testPathPattern="species-picker-mobile" 2>&1 | tail -25
```

Expected: all 8 tests PASS. If any fail, fix the issue before continuing.

- [ ] **Step 2: Run the full test suite to catch regressions**

```bash
cd /Users/gmendoza/source/trainers.gg && pnpm test --filter @trainers/web 2>&1 | tail -30
```

Expected: all tests PASS (including existing `species-picker.test.tsx` which tests desktop behavior).

- [ ] **Step 3: Typecheck**

```bash
cd /Users/gmendoza/source/trainers.gg && pnpm typecheck 2>&1 | grep -iE "error" | head -20
```

Expected: 0 errors.

- [ ] **Step 4: Lint**

```bash
cd /Users/gmendoza/source/trainers.gg && pnpm lint --filter @trainers/web 2>&1 | grep -iE "error" | head -20
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/team-builder/pickers/species-picker.tsx \
        apps/web/src/components/team-builder/__tests__/species-picker-mobile.test.tsx
git commit -m "feat: mobile species picker — bottom sheet filter UI

On mobile (< 768px) the 340px sidebar rail is replaced by a full-viewport-
width Sheet bottom drawer. The Pokémon list is now full-width on mobile.

- useIsMobile() + useLayoutEffect to hide sidebar before first paint
- Compact count format: '12/274' on mobile, '12 of 274' on desktop
- Mobile Filters button in search header with active-count badge
- Dismissible filter chip strip (types, ability, moves, roles, mega-only)
- Role chips use ROLE_LABEL_BY_ID for human-readable labels (not kebab IDs)
- Desktop layout completely unchanged"
```

---

## Task 6: Visual smoke test

- [ ] **Step 1: Start dev server**

```bash
cd /Users/gmendoza/source/trainers.gg && pnpm dev:web 2>&1 | tail -5
```

- [ ] **Step 2: Test mobile in browser**

Open http://localhost:3000/builder in Chrome DevTools at 393×852 (iPhone 15 Pro preset).

Verify each step:

1. Click "+ Add Pokémon" → full-width Pokémon list is visible; "⚙ Filters" button appears in search header
2. Count shows as `274/274` (not "274 of 274")
3. Tap "⚙ Filters" → Sheet slides up from the **full width of the viewport** (edge to edge)
4. Sheet shows: Filters heading, "Clear all" button, type grid, ability input, move input, role presets, "Show 274 results" footer
5. Select Fire type → sheet shows filtered count; tap "Show N results" → sheet closes, chip strip appears with "🔥 Fire ×"
6. Select "Trick Room" role preset in the sheet → close → chip shows "Trick Room ×" (NOT "trick-room ×")
7. Tap "Trick Room ×" chip → filter cleared, chip disappears
8. Tap "⚙ Filters 1" button (shows teal with count badge) → sheet reopens, Fire still selected
9. Set viewport to 1280px → desktop sidebar rail present and functional, no regressions

- [ ] **Step 3: Done ✓**
