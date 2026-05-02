# Move Picker Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Prerequisite:** Phase 1 of `species-picker-redesign.md` (shared infrastructure: `role-registry.ts`, `role-chip.tsx`, `role-presets-panel.tsx`, `filter-chips-bar.tsx`). This plan reuses those four files unchanged.

**Goal:** Replace the MovePicker's column-header dropdown filters with a 3-column layout (left: Type grid + Category chips + search, middle: shared role-presets panel, right: list with new **Roles** column), driven by the same role registry that powers the species picker.

**Architecture:** The `MovePicker` is refactored to compose `MoveSidebar` (its own left panel — Type + Category + Clear) + `RolePresetsPanel` (shared) + `FilterChipsBar` (shared) + a list with new Roles column. Multi-select OR logic across roles, types, and categories. Move-row Roles column uses the shared `<RoleChip>` component identical to species rows. Click affordances on Type icon, Category icon, and Role chips apply filters in place.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, shadcn/ui Tooltip, `@tanstack/react-virtual`, `@trainers/pokemon` (Dex, getMoveData, getLegalMoves, getLearnableMoves, ALL_TYPES)

---

## File Map

### Shared (already built in `species-picker-redesign.md` Phase 1)

These are **prerequisites** — verify each exists before starting this plan:

| Path | Status |
|---|---|
| `apps/web/src/components/team-builder/v2/pickers/role-registry.ts` | Required (Phase 1 Task 1) |
| `apps/web/src/components/team-builder/v2/pickers/role-chip.tsx` | Required (Phase 1 Task 2) |
| `apps/web/src/components/team-builder/v2/pickers/role-presets-panel.tsx` | Required (Phase 1 Task 3) |
| `apps/web/src/components/team-builder/v2/pickers/filter-chips-bar.tsx` | Required (Phase 1 Task 4) |

If any of these are missing, complete the species plan's Phase 1 first.

### Move-picker-specific

| Action | Path | Responsibility |
|---|---|---|
| **Create** | `apps/web/src/components/team-builder/v2/pickers/move-filter-state.ts` | `MoveFilterState` interface + `DEFAULT_MOVE_FILTERS` constant |
| **Create** | `apps/web/src/components/team-builder/v2/pickers/move-sidebar.tsx` | Move-picker's left panel: Type grid + Category chips + Clear all (does NOT include role presets) |
| **Modify** | `apps/web/src/components/team-builder/v2/pickers/move-picker.tsx` | Compose `MoveSidebar` + `RolePresetsPanel` + `FilterChipsBar`; replace column-header filter popovers with plain sortable headers; add Roles column; switch row from `<button>` to `<div role="row">`; click-to-filter on Type/Category icons |
| **Create** | `apps/web/src/components/team-builder/v2/__tests__/move-sidebar.test.tsx` | Filter state changes, click handlers, Clear all |
| **Modify** | `apps/web/src/components/team-builder/v2/__tests__/move-picker.test.tsx` | Update for new column shape; tests for click-to-filter on type/category/role chips and role-filter logic |

---

## Task 1: `move-filter-state.ts`

**Files:**
- Create: `apps/web/src/components/team-builder/v2/pickers/move-filter-state.ts`

- [ ] **Create the file**

```ts
// apps/web/src/components/team-builder/v2/pickers/move-filter-state.ts

export type MoveCategory = "Physical" | "Special" | "Status";

export interface MoveFilterState {
  search: string;            // matches move name + effect + type + category
  types: string[];           // OR — multi-select
  categories: MoveCategory[]; // OR — multi-select
  roles: string[];           // OR — multi-select role IDs
}

export const DEFAULT_MOVE_FILTERS: MoveFilterState = {
  search: "",
  types: [],
  categories: [],
  roles: [],
};
```

(No tests — bare types and constants. Consumed by `move-sidebar.tsx` and `move-picker.tsx`.)

- [ ] **Commit**

```bash
git add apps/web/src/components/team-builder/v2/pickers/move-filter-state.ts
git commit -m "feat(team-builder): move-filter-state types"
```

---

## Task 2: `<MoveSidebar>` (left panel)

**Files:**
- Create: `apps/web/src/components/team-builder/v2/pickers/move-sidebar.tsx`
- Create: `apps/web/src/components/team-builder/v2/__tests__/move-sidebar.test.tsx`

The sidebar is **only** the left panel: Type grid (multi-select) + Category chips (multi-select) + Clear all. The middle role-presets panel is `<RolePresetsPanel>` rendered as a sibling by `MovePicker`.

- [ ] **Failing tests**

```tsx
"use client";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@trainers/pokemon", () => ({
  ALL_TYPES: ["Fire", "Water", "Grass", "Electric"],
}));

import { MoveSidebar } from "../pickers/move-sidebar";
import { DEFAULT_MOVE_FILTERS } from "../pickers/move-filter-state";

function renderSidebar(overrides = {}) {
  return render(
    <MoveSidebar
      filters={DEFAULT_MOVE_FILTERS}
      onFiltersChange={() => {}}
      {...overrides}
    />
  );
}

describe("MoveSidebar", () => {
  it("renders type chips", () => {
    renderSidebar();
    expect(screen.getByText("Fire")).toBeInTheDocument();
  });

  it("renders 3 category chips", () => {
    renderSidebar();
    expect(screen.getByText("Physical")).toBeInTheDocument();
    expect(screen.getByText("Special")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("clicking a type adds it to filters.types", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderSidebar({ onFiltersChange: onChange });
    await user.click(screen.getByText("Fire"));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ types: ["Fire"] }));
  });

  it("clicking an active type toggles it off", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderSidebar({ filters: { ...DEFAULT_MOVE_FILTERS, types: ["Fire"] }, onFiltersChange: onChange });
    await user.click(screen.getByText("Fire"));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ types: [] }));
  });

  it("clicking a category adds it to filters.categories", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderSidebar({ onFiltersChange: onChange });
    await user.click(screen.getByText("Special"));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ categories: ["Special"] }));
  });

  it("Clear all resets to DEFAULT_MOVE_FILTERS", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderSidebar({
      filters: { ...DEFAULT_MOVE_FILTERS, types: ["Fire"], categories: ["Special"] },
      onFiltersChange: onChange,
    });
    await user.click(screen.getByRole("button", { name: /clear/i }));
    expect(onChange).toHaveBeenCalledWith(DEFAULT_MOVE_FILTERS);
  });
});
```

- [ ] **Implement `move-sidebar.tsx`**

```tsx
"use client";
import { ALL_TYPES } from "@trainers/pokemon";

import { cn } from "@/lib/utils";

import {
  DEFAULT_MOVE_FILTERS, type MoveCategory, type MoveFilterState,
} from "./move-filter-state";

const TYPE_BG: Record<string, string> = {
  Normal:   "bg-stone-400 text-white",
  Bug:      "bg-lime-500 text-white",
  Dark:     "bg-stone-700 text-white",
  Dragon:   "bg-indigo-600 text-white",
  Electric: "bg-yellow-400 text-black",
  Fairy:    "bg-pink-400 text-white",
  Fighting: "bg-red-700 text-white",
  Fire:     "bg-orange-500 text-white",
  Flying:   "bg-sky-300 text-black",
  Ghost:    "bg-purple-600 text-white",
  Grass:    "bg-green-500 text-white",
  Ground:   "bg-amber-600 text-white",
  Ice:      "bg-cyan-300 text-black",
  Poison:   "bg-purple-500 text-white",
  Psychic:  "bg-pink-500 text-white",
  Rock:     "bg-amber-700 text-white",
  Steel:    "bg-slate-400 text-black",
  Water:    "bg-blue-500 text-white",
};

const CATEGORY_DOT: Record<MoveCategory, string> = {
  Physical: "bg-orange-500",
  Special:  "bg-blue-500",
  Status:   "bg-slate-400",
};

interface MoveSidebarProps {
  filters: MoveFilterState;
  onFiltersChange: (filters: MoveFilterState) => void;
}

export function MoveSidebar({ filters, onFiltersChange }: MoveSidebarProps) {
  function toggleType(type: string) {
    const next = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    onFiltersChange({ ...filters, types: next });
  }

  function toggleCategory(cat: MoveCategory) {
    const next = filters.categories.includes(cat)
      ? filters.categories.filter((c) => c !== cat)
      : [...filters.categories, cat];
    onFiltersChange({ ...filters, categories: next });
  }

  function clearAll() {
    onFiltersChange(DEFAULT_MOVE_FILTERS);
  }

  return (
    <div className="flex w-40 flex-shrink-0 flex-col overflow-y-auto bg-muted/30 border-r border-border">
      {/* Type */}
      <div className="border-b border-border/60 p-2.5">
        <span className="mb-1.5 block text-[8.5px] font-bold uppercase tracking-widest text-muted-foreground">Type</span>
        <div className="grid grid-cols-3 gap-1">
          {(ALL_TYPES as readonly string[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => toggleType(type)}
              className={cn(
                "rounded px-0.5 py-1 text-[9px] font-bold transition-all",
                filters.types.includes(type)
                  ? cn(TYPE_BG[type] ?? "bg-muted text-foreground", "outline outline-2 outline-offset-0 outline-white shadow-[0_0_0_3px_currentColor]")
                  : (TYPE_BG[type] ?? "bg-muted text-foreground")
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div className="border-b border-border/60 p-2.5">
        <span className="mb-1.5 block text-[8.5px] font-bold uppercase tracking-widest text-muted-foreground">Category</span>
        <div className="flex flex-wrap gap-1">
          {(["Physical", "Special", "Status"] as const).map((cat) => {
            const isActive = filters.categories.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold transition-colors",
                  isActive
                    ? "border-primary/35 bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                )}
              >
                <span className={cn("inline-block size-2.5 rounded-sm", CATEGORY_DOT[cat])} />
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Clear all */}
      <div className="mt-auto border-t border-border p-2.5">
        <button
          type="button"
          onClick={clearAll}
          className="w-full rounded-md border border-border bg-background py-1 text-[11px] text-muted-foreground hover:border-destructive/50 hover:text-destructive transition-colors"
        >
          Clear all filters
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Run tests + commit**

```bash
pnpm test --filter @trainers/web -- --testPathPattern="move-sidebar" 2>&1 | tail -10
git add apps/web/src/components/team-builder/v2/pickers/move-sidebar.tsx \
        apps/web/src/components/team-builder/v2/__tests__/move-sidebar.test.tsx
git commit -m "feat(team-builder): MoveSidebar (left panel — Type/Category/Clear)"
```

---

## Task 3: Refactor `MovePicker` — wire it all up

**Files:**
- Modify: `apps/web/src/components/team-builder/v2/pickers/move-picker.tsx`
- Modify: `apps/web/src/components/team-builder/v2/__tests__/move-picker.test.tsx`

The integration. `MovePicker` becomes the orchestrator: holds `MoveFilterState`, renders `MoveSidebar` + `RolePresetsPanel` + `FilterChipsBar` + a virtualized list with the new Roles column.

- [ ] **Replace `move-picker.tsx`**

Key implementation points:

1. **Container**: Same `bg-popover ... rounded-lg border shadow-md` wrapper. Width bumped from `820px` to `1100px`. Height fixed at `h-[min(70vh,640px)]`.

2. **Header bar** (full width, top):

```tsx
<div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2 flex-shrink-0">
  <SearchIcon /* ... */ />
  <input value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} placeholder="Search by name, effect, type, category…" className="bg-transparent outline-none flex-1 text-sm" autoFocus />
  <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
    {sorted.length} of {speciesLegalMoves.length}
  </span>
  <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground">×</button>
</div>
```

3. **State**:

```ts
const [filters, setFilters] = useState<MoveFilterState>(DEFAULT_MOVE_FILTERS);
const [sort, setSort] = useState<SortState>({ col: "name", dir: "asc" });
```

4. **Move list**: pull from `getLegalMoves(species, format.id) ?? getLearnableMoves(species)` (existing logic); for each move call `getMoveData(name)`; build `rows: MoveRow[]` and apply filters in pipeline order:

```ts
const rows = legalMoveNames
  .map((name) => ({ name, data: getMoveData(name) }))
  .filter((r) => {
    // Type filter
    if (filters.types.length && r.data?.type && !filters.types.includes(r.data.type)) return false;
    // Category filter
    if (filters.categories.length && r.data?.category && !filters.categories.includes(r.data.category)) return false;
    // Role filter (OR — match if move has ANY active role)
    if (filters.roles.length) {
      const moveRoles = getRolesForMove(r.name);
      if (!filters.roles.some((id) => moveRoles.includes(id))) return false;
    }
    // Search filter
    const q = filters.search.toLowerCase();
    if (q) {
      const matches =
        r.name.toLowerCase().includes(q) ||
        r.data?.shortDesc?.toLowerCase().includes(q) ||
        r.data?.type?.toLowerCase().includes(q) ||
        r.data?.category?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    return true;
  });
const sorted = sortMoves(rows, sort);
```

5. **Body layout** (3 columns):

```tsx
<div className="flex flex-1 min-h-0 overflow-hidden">
  <MoveSidebar filters={filters} onFiltersChange={setFilters} />
  <RolePresetsPanel
    selected={filters.roles}
    onChange={(roles) => setFilters((f) => ({ ...f, roles }))}
    bucketCount={bucketCount}
  />
  <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
    <FilterChipsBar chips={buildFilterChips()} />
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      {/* table header + virtualized rows */}
    </div>
  </div>
</div>
```

6. **Bucket counts** for `RolePresetsPanel`:

```ts
const bucketCount = useMemo(() => {
  const counts = new Map<string, number>();
  for (const r of rows) {
    for (const id of getRolesForMove(r.name)) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return (id: string) => counts.get(id) ?? 0;
}, [rows]);
```

7. **Filter chips**:

```ts
function buildFilterChips(): FilterChip[] {
  const chips: FilterChip[] = [];
  for (const t of filters.types) chips.push({ id: `t-${t}`, label: t,
    onRemove: () => setFilters((f) => ({ ...f, types: f.types.filter((x) => x !== t) })) });
  for (const c of filters.categories) chips.push({ id: `c-${c}`, label: c,
    onRemove: () => setFilters((f) => ({ ...f, categories: f.categories.filter((x) => x !== c) })) });
  for (const r of filters.roles) {
    const role = getRoleById(r);
    chips.push({ id: `r-${r}`, label: `Role: ${role?.label ?? r}`,
      onRemove: () => setFilters((f) => ({ ...f, roles: f.roles.filter((x) => x !== r) })) });
  }
  return chips;
}
```

8. **Column grid** (matches spec §4):

```ts
const ROW_GRID = "grid-cols-[26px_26px_140px_240px_38px_46px_minmax(140px,1fr)]";
```

Columns: Type icon · Cat icon · Name · Effect · BP · Acc · Roles.

9. **Sticky table header**: plain sortable buttons (drop the type/category filter popovers — those filters live in the sidebar now).

```tsx
<div className={cn("bg-card sticky top-0 z-20 grid items-center gap-2 border-b px-3 py-1.5 text-[10px] font-semibold uppercase", ROW_GRID)}>
  <span /> {/* Type icon column has no header label */}
  <span /> {/* Cat icon column */}
  <SortBtn col="name" label="Name" align="left" />
  <span className="text-muted-foreground text-left">Effect</span>
  <SortBtn col="bp" label="BP" align="right" />
  <SortBtn col="acc" label="Acc" align="right" />
  <span className="text-muted-foreground text-left">Roles</span>
</div>
```

10. **Row component** (`<div role="row">`, NOT `<button>`):

```tsx
function MoveRow({ row, isSelected, onSelect, onTypeFilter, onCategoryFilter, onRoleFilter }: MoveRowProps) {
  const { name, data } = row;
  function handleKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(); }
  }
  return (
    <div
      role="row" tabIndex={0}
      onClick={onSelect} onKeyDown={handleKey}
      aria-label={`Select ${name}`}
      className={cn(
        "grid h-12 cursor-pointer items-center gap-2 border-b px-3 outline-none hover:bg-accent focus-visible:bg-accent",
        ROW_GRID,
        isSelected && "bg-accent text-accent-foreground"
      )}
    >
      {/* Type icon — clickable */}
      <span role="presentation" onClick={(e) => { if (data?.type) { e.stopPropagation(); onTypeFilter(data.type); } }}>
        {data?.type
          ? <img src={getShowdownTypeIconUrl(data.type)} alt={data.type} className="h-6 w-auto cursor-pointer [image-rendering:pixelated]" title={`Filter by ${data.type}`} />
          : <span className="text-muted-foreground text-xs">—</span>}
      </span>

      {/* Category icon — clickable */}
      <span role="presentation" onClick={(e) => { if (data?.category) { e.stopPropagation(); onCategoryFilter(data.category); } }}>
        {data?.category && CATEGORY_ICON_URLS[data.category]
          ? <img src={CATEGORY_ICON_URLS[data.category]} alt={data.category} className="h-6 w-auto cursor-pointer [image-rendering:pixelated]" title={`Filter by ${data.category}`} />
          : <span className="text-muted-foreground font-mono text-xs">{categoryLetter(data?.category)}</span>}
      </span>

      {/* Name */}
      <span className="min-w-0 truncate text-sm font-medium" title={name}>{name}</span>

      {/* Effect */}
      <span className="min-w-0 truncate text-xs text-muted-foreground" title={data?.shortDesc ?? undefined}>
        {data?.shortDesc && data.shortDesc !== "No additional effect." ? data.shortDesc : ""}
      </span>

      {/* BP */}
      <span className="text-right font-mono text-xs tabular-nums text-muted-foreground">
        {data?.basePower && data.basePower > 0 ? data.basePower : "—"}
      </span>

      {/* Acc */}
      <span className="text-right font-mono text-xs tabular-nums text-muted-foreground">
        {data?.accuracy === true || !data?.accuracy ? "—" : `${data.accuracy}%`}
      </span>

      {/* Roles — clickable chips */}
      <div role="presentation" onClick={(e) => e.stopPropagation()} className="flex flex-wrap gap-1 min-w-0">
        {getRolesForMove(name).map((roleId) => (
          <RoleChip key={roleId} roleId={roleId} onClick={onRoleFilter} />
        ))}
      </div>
    </div>
  );
}
```

11. **Type/Category/Role click handlers**:

```ts
function handleTypeFilter(type: string) {
  setFilters((f) => f.types.includes(type)
    ? { ...f, types: f.types.filter((t) => t !== type) }
    : { ...f, types: [...f.types, type] });
}
function handleCategoryFilter(cat: MoveCategory) {
  setFilters((f) => f.categories.includes(cat)
    ? { ...f, categories: f.categories.filter((c) => c !== cat) }
    : { ...f, categories: [...f.categories, cat] });
}
function handleRoleFilter(roleId: string) {
  setFilters((f) => f.roles.includes(roleId)
    ? { ...f, roles: f.roles.filter((r) => r !== roleId) }
    : { ...f, roles: [...f.roles, roleId] });
}
```

12. **Imports needed**:

```ts
import {
  ALL_TYPES, getLearnableMoves, getLegalMoves, getMoveData,
  type GameFormat,
} from "@trainers/pokemon";
import { getShowdownTypeIconUrl } from "@trainers/pokemon/sprites";
import { CATEGORY_ICON_URLS } from "../../move-category-ui";

import { DEFAULT_MOVE_FILTERS, type MoveCategory, type MoveFilterState } from "./move-filter-state";
import { FilterChipsBar, type FilterChip } from "./filter-chips-bar";
import { MoveSidebar } from "./move-sidebar";
import { RoleChip } from "./role-chip";
import { RolePresetsPanel } from "./role-presets-panel";
import { getRoleById, getRolesForMove } from "./role-registry";
```

- [ ] **Update integration tests**

`__tests__/move-picker.test.tsx`:

```tsx
describe("MovePicker — click-to-filter", () => {
  it("clicking a Type icon adds it to filters.types", async () => {
    const user = userEvent.setup();
    render(<MovePicker /* ... */ />);
    const fireIcon = screen.getAllByAltText("Fire")[0];
    await user.click(fireIcon!);
    expect(await screen.findByText("Fire", { selector: "button" })).toBeInTheDocument();
  });

  it("clicking a Category icon adds it to filters.categories", async () => {
    const user = userEvent.setup();
    render(<MovePicker /* ... */ />);
    const physIcon = screen.getAllByAltText("Physical")[0];
    await user.click(physIcon!);
    expect(await screen.findByText("Physical", { selector: "button" })).toBeInTheDocument();
  });

  it("clicking a role chip in a row toggles filters.roles", async () => {
    const user = userEvent.setup();
    render(<MovePicker /* mocked move with roles=['spread'] */ />);
    await user.click(screen.getByText("Spread", { selector: "button" }));
    expect(await screen.findByText("Role: Spread")).toBeInTheDocument();
  });
});

describe("MovePicker — sidebar filters", () => {
  it("clicking a sidebar Type chip filters the list", async () => {
    const user = userEvent.setup();
    render(<MovePicker /* ... */ />);
    // Sidebar Fire chip vs row Fire icon — ensure the sidebar's chip is clicked
    const sidebarFire = within(screen.getByLabelText("sidebar")).getByText("Fire");
    await user.click(sidebarFire);
    // Result count should drop
    // ...
  });

  it("clicking a sidebar Role preset adds to filters.roles", async () => {
    const user = userEvent.setup();
    render(<MovePicker /* ... */ />);
    await user.click(screen.getByText("Spread"));
    // The role panel button shows active state; rows filter to spread moves
    // ...
  });
});
```

(Existing mocks for `useVirtualizer`, `Image`, and `@trainers/pokemon` continue working. Add `getRolesForMove` to the `@trainers/pokemon` mock factory if it's referenced.)

- [ ] **Run + commit**

```bash
pnpm test --filter @trainers/web -- --testPathPattern="move-picker" 2>&1 | tail -20
git add apps/web/src/components/team-builder/v2/pickers/move-picker.tsx \
        apps/web/src/components/team-builder/v2/__tests__/move-picker.test.tsx
git commit -m "feat(team-builder): MovePicker — Roles column + sidebar filters + click-to-filter"
```

---

## Task 4: Pre-push checks

- [ ] **Lint**

```bash
pnpm lint 2>&1 | grep -E "error|warning" | grep -v node_modules | head -20
```

Expected: 0 errors.

- [ ] **Typecheck**

```bash
pnpm typecheck 2>&1 | tail -10
```

Expected: 0 errors.

- [ ] **Full test suite**

```bash
pnpm test 2>&1 | tail -20
```

Expected: all pass.

- [ ] **Push**

```bash
git push origin <branch-name>
```

---

## Self-Review

**Spec coverage (against move spec §1–§12):**
- §1 Layout (3 columns, fixed height, 1100px) — Task 3 ✓
- §2 Left sidebar (Type + Category + Clear) — Task 2 ✓
- §3 Middle role-presets panel — shared (Phase 1 of species plan) ✓
- §4 List panel (header, count, filter chips, table) — Task 3 ✓
- §5 Role chips inside rows (uses shared `<RoleChip>`) — Task 3 ✓
- §6 Move-role registry — shared (Phase 1 Task 1 of species plan) ✓
- §7 `MoveFilterState` (search, types, categories, roles) — Task 1 ✓
- §8 Component breakdown — covered in File Map ✓
- §9 Click-to-filter affordances — Task 3 ✓
- §10 Scope-out (no smart search, no Priority column, no custom roles) — preserved ✓
- §11 Testing — unit + integration tests in Tasks 2, 3 ✓

**DRY validation:**
- 4 shared files (role-registry, role-chip, role-presets-panel, filter-chips-bar) reused unchanged from species plan
- Move-picker-specific code is only `move-filter-state.ts`, `move-sidebar.tsx`, and the `move-picker.tsx` refactor — ~3 files of new picker-specific code
- Group color palette is single-sourced from `role-registry.GROUP_COLORS`
- The `<RoleChip>` component renders identically in species rows and move rows

**Parallel paths:** Tasks 1, 2 are independent and can run in parallel. Task 3 depends on both. Task 4 is a single sequential pre-push gate.
