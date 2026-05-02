# Species Picker Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the SpeciesPicker's dropdown-based filters with a 3-column layout (left: type/ability/moves + Mega, middle: shared role-presets panel, right: list with ability columns + Roles column), driven by a unified role registry shared with the move-picker redesign.

**Architecture:** A new `pickers/role-registry.ts` defines all 26 strategic roles (used by both pickers). Three new shared React components — `RoleChip`, `RolePresetsPanel`, `FilterChipsBar` — render identically in species and move pickers. The `SpeciesPicker` is refactored to compose `SpeciesSidebar` (its own left panel) + `RolePresetsPanel` (shared middle panel) + a list with new Roles column. Multi-select OR logic across roles replaces the old single-select-with-replace-within-group complexity, eliminating `applyRole` and `userMoves` tracking entirely.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, shadcn/ui Tooltip, `@tanstack/react-virtual`, `@trainers/pokemon` (Dex, searchSpecies, getAbilityShortDesc, isChampionsFormat, getMegaStoneForSpecies, ALL_TYPES, getLearnableMoves)

---

## File Map

### Shared (consumed by both pickers — also referenced from `move-picker-redesign.md`)

| Action | Path | Responsibility |
|---|---|---|
| **Create** | `apps/web/src/components/team-builder/v2/pickers/role-registry.ts` | 26 roles × 7 groups; group color tokens; `getRolesForMove(name)` and `getRolesForSpecies(...)` lookups |
| **Create** | `apps/web/src/components/team-builder/v2/pickers/role-chip.tsx` | `<RoleChip roleId onClick>` — colored pill rendered in row Roles columns and as the active visual for sidebar role buttons |
| **Create** | `apps/web/src/components/team-builder/v2/pickers/role-presets-panel.tsx` | Middle-column sidebar component listing all role presets grouped, with bucket counts and active state |
| **Create** | `apps/web/src/components/team-builder/v2/pickers/filter-chips-bar.tsx` | Active filter chip strip rendered above each list |
| **Create** | `apps/web/src/components/team-builder/v2/__tests__/role-registry.test.ts` | Group/role coverage, color tokens, getRolesForMove |
| **Create** | `apps/web/src/components/team-builder/v2/__tests__/role-chip.test.tsx` | Renders correct color per group; click handler |
| **Create** | `apps/web/src/components/team-builder/v2/__tests__/role-presets-panel.test.tsx` | Multi-select toggle, bucket counts, group ordering |
| **Create** | `apps/web/src/components/team-builder/v2/__tests__/filter-chips-bar.test.tsx` | Renders chips, click removes filter |

### `@trainers/pokemon` package changes

| Action | Path | Responsibility |
|---|---|---|
| **Modify** | `packages/pokemon/src/species-search.ts` | Add `abilitySlot1/2/hiddenAbility` + `roles` to `SpeciesSearchEntry`; add `ability`, `megaOnly`, `roles` filters to `searchSpecies`; add `getAllLegalAbilities` + `getAllLegalMoves` helpers; thread `getRoles` resolver through `buildSpeciesSearchIndex` |
| **Modify** | `packages/pokemon/src/index.ts` | Export new helpers |
| **Modify** | `packages/pokemon/src/__tests__/species-search.test.ts` | Tests for new shape + filters |

### Species-picker-specific

| Action | Path | Responsibility |
|---|---|---|
| **Create** | `apps/web/src/components/team-builder/v2/pickers/species-filter-state.ts` | `SpeciesFilterState` interface + `DEFAULT_SPECIES_FILTERS` constant |
| **Create** | `apps/web/src/components/team-builder/v2/pickers/ability-cell.tsx` | Ability table cell with shadcn Tooltip + click-to-filter |
| **Create** | `apps/web/src/components/team-builder/v2/pickers/species-sidebar.tsx` | Left-only panel: Type grid + Ability combobox + Mega toggle + Learns Move (no role presets — those live in the shared `<RolePresetsPanel>`) |
| **Create** | `apps/web/src/components/team-builder/v2/pickers/species-smart-search.tsx` | Showdown-style search overlay shown when query non-empty |
| **Modify** | `apps/web/src/components/team-builder/v2/pickers/species-picker.tsx` | Compose `SpeciesSidebar` + `RolePresetsPanel` + `FilterChipsBar`; new column grid (sprite/name/types/abil1/abil2/hidden/stats/BST/**Roles**); `<div role="row">`; click Type icon → filter; Enter shortcut |
| **Delete** | `apps/web/src/components/team-builder/v2/pickers/species-filters.tsx` | All logic migrated |
| **Modify** | `apps/web/src/components/team-builder/v2/__tests__/species-picker.test.tsx` | Update fixtures; click-to-filter tests; Roles column |
| **Create** | `apps/web/src/components/team-builder/v2/__tests__/ability-cell.test.tsx` | Click-to-filter, em-dash, hidden styling |
| **Create** | `apps/web/src/components/team-builder/v2/__tests__/species-sidebar.test.tsx` | Filter state, Mega toggle, ability combobox, clear all |
| **Create** | `apps/web/src/components/team-builder/v2/__tests__/species-smart-search.test.tsx` | Categorized results, Filter/Select buttons |

### Eliminated from prior plan

- `role-expansion.ts` — gone (multi-select OR replaces it)
- `species-roles.ts` — gone (now `role-registry.ts` is shared)
- `filter-state.ts` (with shared `SpeciesFilterState`) — replaced by `species-filter-state.ts` (no longer needs to break a circular import since `role-expansion.ts` is gone)
- `applyRole` helper + 7 tests for replace-within-group / stack-across-group / preserve-user-moves — gone

---

## Phase 1 — Shared infrastructure

These four tasks are independent — any order works.

### Task 1: Role registry with 26 roles, group colors, lookups

**Files:**
- Create: `apps/web/src/components/team-builder/v2/pickers/role-registry.ts`
- Create: `apps/web/src/components/team-builder/v2/__tests__/role-registry.test.ts`

The registry is the single source of truth for both pickers. Generated from `docs/design/2026-05-01-champions-ma-move-roles.md` plus the 3 ability-driven roles from species spec §13.

- [ ] **Convert markdown registry to TypeScript data**

The markdown has the canonical move list per role. One-time conversion script (no commit, just a node REPL):

```bash
node -e "
const fs = require('fs');
const md = fs.readFileSync('docs/design/2026-05-01-champions-ma-move-roles.md', 'utf8');
const sections = md.split(/^### /m).slice(1);
const result = {};
for (const section of sections) {
  const idMatch = section.match(/\*\*id:\*\* \`([\w-]+)\`/);
  if (!idMatch) continue;
  const id = idMatch[1];
  const moves = section.split('\n').filter(l => l.startsWith('- ')).map(l => l.replace('- ', '').trim());
  result[id] = moves;
}
console.log(JSON.stringify(result, null, 2));
" > /tmp/roles.json
```

Inspect `/tmp/roles.json` then paste move arrays into `role-registry.ts` below.

- [ ] **Create `role-registry.ts`**

```ts
import { getLearnableMoves } from "@trainers/pokemon";

// =============================================================================
// Types
// =============================================================================

export type RoleGroup =
  | "damage-type" | "speed-control" | "status"
  | "stat-changes" | "defensive" | "field" | "utility";

export interface RolePreset {
  id: string;
  label: string;
  group: RoleGroup;
  /** Moves that ARE this role. */
  moves?: string[];
  /** Abilities that IMPLY this role (used only for species fit). */
  abilities?: string[];
}

// =============================================================================
// Registry — 26 roles across 7 groups
// =============================================================================

export const ROLE_PRESETS: RolePreset[] = [
  // Damage Type
  { id: "spread",      label: "Spread",      group: "damage-type",   moves: [/* paste 54 from JSON */] },
  { id: "priority",    label: "Priority",    group: "damage-type",   moves: [/* 17 */] },
  { id: "multi-hit",   label: "Multi-hit",   group: "damage-type",   moves: [/* 22 */] },

  // Speed Control
  { id: "trick-room",  label: "Trick Room",  group: "speed-control", moves: ["Trick Room"] },
  { id: "tailwind",    label: "Tailwind",    group: "speed-control", moves: ["Tailwind"] },
  { id: "speed-drop",  label: "Speed Drop",  group: "speed-control", moves: [/* 38 */] },
  { id: "speed-boost", label: "Speed Boost", group: "speed-control", moves: [/* 17 */] },

  // Status
  { id: "sleep",       label: "Sleep",       group: "status",        moves: [/* 8 */] },
  { id: "paralysis",   label: "Paralysis",   group: "status",        moves: [/* 21 */] },
  { id: "burn",        label: "Burn",        group: "status",        moves: [/* 22 */] },
  { id: "poison",      label: "Poison",      group: "status",        moves: [/* 20 */] },

  // Stat Changes
  { id: "boost-self",  label: "Boost Self",  group: "stat-changes",  moves: [/* 53 */] },
  { id: "boost-ally",  label: "Boost Ally",  group: "stat-changes",  moves: [/* 14 */] },
  { id: "drop-atk",    label: "Drop Atk",    group: "stat-changes",  moves: [/* 19 */],
                                                                       abilities: ["Intimidate"] },
  { id: "drop-spa",    label: "Drop SpA",    group: "stat-changes",  moves: [/* 13 */] },

  // Defensive
  { id: "screens",     label: "Screens",     group: "defensive",     moves: ["Light Screen", "Reflect", "Aurora Veil"] },
  { id: "protect",     label: "Protect",     group: "defensive",     moves: [/* 9 */] },
  { id: "healing",     label: "Healing",     group: "defensive",     moves: [/* 22 */] },
  { id: "drain",       label: "Drain",       group: "defensive",     moves: [/* 13 */] },

  // Field
  { id: "weather",     label: "Weather",     group: "field",         moves: [/* 5 */],
                                                                       abilities: ["Drizzle", "Drought", "Sand Stream", "Snow Warning"] },
  { id: "terrain",     label: "Terrain",     group: "field",         moves: [/* 4 */],
                                                                       abilities: ["Grassy Surge", "Electric Surge", "Psychic Surge", "Misty Surge"] },
  { id: "hazards",     label: "Hazards",     group: "field",         moves: [/* 6 */] },

  // Utility
  { id: "redirection", label: "Redirection", group: "utility",       moves: ["Follow Me", "Rage Powder", "Spotlight", "Ally Switch"] },
  { id: "pivot",       label: "Pivot",       group: "utility",       moves: [/* 9 */] },
  { id: "flinching",   label: "Flinching",   group: "utility",       moves: [/* 25 */] },
  { id: "disruption",  label: "Disruption",  group: "utility",       moves: [/* 29 */] },
];

export const ROLE_GROUP_LABELS: Record<RoleGroup, string> = {
  "damage-type":   "Damage Type",
  "speed-control": "Speed Control",
  "status":        "Status",
  "stat-changes":  "Stat Changes",
  "defensive":     "Defensive",
  "field":         "Field",
  "utility":       "Utility",
};

export const ROLE_GROUP_ORDER: RoleGroup[] = [
  "damage-type", "speed-control", "status", "stat-changes",
  "defensive", "field", "utility",
];

// =============================================================================
// Group color palette — Tailwind class strings, single source of truth
// =============================================================================

export interface GroupColors {
  /** Combined classes for the chip pill (background + border + text) */
  chip: string;
  /** Background-only class for active state of sidebar role buttons */
  active: string;
  /** Text-only class for the role's label color */
  text: string;
}

export const GROUP_COLORS: Record<RoleGroup, GroupColors> = {
  "damage-type":   { chip:   "bg-rose-500/8 border-rose-500/25 text-rose-700 dark:text-rose-300",
                     active: "bg-rose-500/10",
                     text:   "text-rose-700 dark:text-rose-300" },
  "speed-control": { chip:   "bg-violet-500/8 border-violet-500/25 text-violet-700 dark:text-violet-300",
                     active: "bg-violet-500/10",
                     text:   "text-violet-700 dark:text-violet-300" },
  "status":        { chip:   "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400",
                     active: "bg-amber-500/12",
                     text:   "text-amber-700 dark:text-amber-400" },
  "stat-changes":  { chip:   "bg-emerald-500/8 border-emerald-500/28 text-emerald-700 dark:text-emerald-400",
                     active: "bg-emerald-500/10",
                     text:   "text-emerald-700 dark:text-emerald-400" },
  "defensive":     { chip:   "bg-sky-500/8 border-sky-500/25 text-sky-700 dark:text-sky-300",
                     active: "bg-sky-500/10",
                     text:   "text-sky-700 dark:text-sky-300" },
  "field":         { chip:   "bg-lime-500/10 border-lime-500/28 text-lime-700 dark:text-lime-400",
                     active: "bg-lime-500/12",
                     text:   "text-lime-700 dark:text-lime-400" },
  "utility":       { chip:   "bg-slate-500/10 border-slate-500/30 text-slate-600 dark:text-slate-400",
                     active: "bg-slate-500/12",
                     text:   "text-slate-600 dark:text-slate-400" },
};

// =============================================================================
// Lookups
// =============================================================================

export function getRoleById(id: string): RolePreset | undefined {
  return ROLE_PRESETS.find((r) => r.id === id);
}

let _rolesByMove: Map<string, string[]> | null = null;
function getRolesByMoveIndex(): Map<string, string[]> {
  if (_rolesByMove) return _rolesByMove;
  const m = new Map<string, string[]>();
  for (const role of ROLE_PRESETS) {
    if (!role.moves) continue;
    for (const move of role.moves) {
      const list = m.get(move) ?? [];
      list.push(role.id);
      m.set(move, list);
    }
  }
  _rolesByMove = m;
  return m;
}

/** O(1) — returns role IDs for a move name; empty if move is in no role. */
export function getRolesForMove(moveName: string): string[] {
  return getRolesByMoveIndex().get(moveName) ?? [];
}

/**
 * Compute role IDs for a species:
 * - Any of its abilities matches a name in role.abilities, OR
 * - It can learn any move in role.moves
 *
 * Called once per species during buildSpeciesSearchIndex.
 */
export function getRolesForSpecies(
  abilities: { slot1: string | null; slot2: string | null; hidden: string | null },
  speciesName: string,
  formatId: string
): string[] {
  const learnable = getLearnableMoves(speciesName, formatId) ?? [];
  const learnableSet = new Set(learnable);
  const out: string[] = [];

  for (const role of ROLE_PRESETS) {
    let matches = false;

    if (role.abilities) {
      for (const ab of role.abilities) {
        if (abilities.slot1 === ab || abilities.slot2 === ab || abilities.hidden === ab) {
          matches = true;
          break;
        }
      }
    }

    if (!matches && role.moves) {
      for (const move of role.moves) {
        if (learnableSet.has(move)) {
          matches = true;
          break;
        }
      }
    }

    if (matches) out.push(role.id);
  }
  return out;
}
```

- [ ] **Tests**

```ts
// __tests__/role-registry.test.ts
import {
  ROLE_PRESETS, ROLE_GROUP_ORDER, GROUP_COLORS,
  getRoleById, getRolesForMove,
} from "../pickers/role-registry";

describe("role-registry", () => {
  it("has 26 presets", () => { expect(ROLE_PRESETS).toHaveLength(26); });

  it("every group in ROLE_GROUP_ORDER has at least one preset", () => {
    for (const g of ROLE_GROUP_ORDER) {
      expect(ROLE_PRESETS.some((r) => r.group === g)).toBe(true);
    }
  });

  it("every preset id is unique", () => {
    const ids = ROLE_PRESETS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("GROUP_COLORS has an entry per group", () => {
    for (const g of ROLE_GROUP_ORDER) expect(GROUP_COLORS[g]).toBeDefined();
  });

  it("getRolesForMove returns role ids for a known move", () => {
    expect(getRolesForMove("Heat Wave")).toEqual(expect.arrayContaining(["spread", "burn"]));
  });

  it("getRolesForMove returns empty for an unknown move", () => {
    expect(getRolesForMove("Tackle")).toEqual([]);
  });

  it("drop-atk has Intimidate ability", () => {
    expect(getRoleById("drop-atk")?.abilities).toContain("Intimidate");
  });
});
```

(`getRolesForSpecies` needs heavier mocking — covered indirectly via species-search integration tests in Task 5.)

- [ ] **Run + commit**

```bash
pnpm test --filter @trainers/web -- --testPathPattern="role-registry" 2>&1 | tail -15
git add apps/web/src/components/team-builder/v2/pickers/role-registry.ts \
        apps/web/src/components/team-builder/v2/__tests__/role-registry.test.ts
git commit -m "feat(team-builder): shared role registry (26 roles, 7 groups, color tokens)"
```

---

### Task 2: `<RoleChip>` shared component

**Files:**
- Create: `apps/web/src/components/team-builder/v2/pickers/role-chip.tsx`
- Create: `apps/web/src/components/team-builder/v2/__tests__/role-chip.test.tsx`

- [ ] **Failing test**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { RoleChip } from "../pickers/role-chip";

describe("RoleChip", () => {
  it("renders the role label", () => {
    render(<RoleChip roleId="spread" />);
    expect(screen.getByText("Spread")).toBeInTheDocument();
  });

  it("calls onClick with the role id", async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(<RoleChip roleId="spread" onClick={onClick} />);
    await user.click(screen.getByText("Spread"));
    expect(onClick).toHaveBeenCalledWith("spread");
  });

  it("renders nothing for an unknown role id", () => {
    const { container } = render(<RoleChip roleId="bogus" />);
    expect(container.firstChild).toBeNull();
  });

  it("applies the group's chip class", () => {
    render(<RoleChip roleId="spread" />);
    expect(screen.getByText("Spread").className).toMatch(/rose/);
  });
});
```

- [ ] **Implement `role-chip.tsx`**

```tsx
"use client";
import { cn } from "@/lib/utils";
import { GROUP_COLORS, getRoleById } from "./role-registry";

interface RoleChipProps {
  roleId: string;
  onClick?: (roleId: string) => void;
  className?: string;
}

export function RoleChip({ roleId, onClick, className }: RoleChipProps) {
  const role = getRoleById(roleId);
  if (!role) return null;
  const colors = GROUP_COLORS[role.group];

  return (
    <button
      type="button"
      onClick={onClick ? (e) => { e.stopPropagation(); onClick(roleId); } : undefined}
      className={cn(
        "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9.5px] font-semibold transition-all",
        onClick && "cursor-pointer hover:-translate-y-px",
        colors.chip,
        className
      )}
    >
      {role.label}
    </button>
  );
}
```

- [ ] **Run + commit**

```bash
pnpm test --filter @trainers/web -- --testPathPattern="role-chip" 2>&1 | tail -10
git add apps/web/src/components/team-builder/v2/pickers/role-chip.tsx \
        apps/web/src/components/team-builder/v2/__tests__/role-chip.test.tsx
git commit -m "feat(team-builder): <RoleChip> shared component"
```

---

### Task 3: `<RolePresetsPanel>` shared middle-column sidebar

**Files:**
- Create: `apps/web/src/components/team-builder/v2/pickers/role-presets-panel.tsx`
- Create: `apps/web/src/components/team-builder/v2/__tests__/role-presets-panel.test.tsx`

- [ ] **Failing tests**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { RolePresetsPanel } from "../pickers/role-presets-panel";

describe("RolePresetsPanel", () => {
  const noop = () => {};
  const zero = () => 0;

  it("renders all 7 group headers", () => {
    render(<RolePresetsPanel selected={[]} onChange={noop} bucketCount={zero} />);
    for (const label of ["Damage Type", "Speed Control", "Status", "Stat Changes", "Defensive", "Field", "Utility"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("renders bucket counts from the prop", () => {
    render(<RolePresetsPanel selected={[]} onChange={noop} bucketCount={(id) => id === "spread" ? 54 : 0} />);
    expect(screen.getByText("54")).toBeInTheDocument();
  });

  it("clicking a role toggles it on", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<RolePresetsPanel selected={[]} onChange={onChange} bucketCount={zero} />);
    await user.click(screen.getByText("Spread"));
    expect(onChange).toHaveBeenCalledWith(["spread"]);
  });

  it("clicking an active role toggles it off", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<RolePresetsPanel selected={["spread"]} onChange={onChange} bucketCount={zero} />);
    await user.click(screen.getByText("Spread"));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("clicking a different role stacks (multi-select OR)", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<RolePresetsPanel selected={["spread"]} onChange={onChange} bucketCount={zero} />);
    await user.click(screen.getByText("Priority"));
    expect(onChange).toHaveBeenCalledWith(["spread", "priority"]);
  });
});
```

- [ ] **Implement `role-presets-panel.tsx`**

```tsx
"use client";
import { cn } from "@/lib/utils";
import {
  GROUP_COLORS, ROLE_GROUP_LABELS, ROLE_GROUP_ORDER, ROLE_PRESETS,
} from "./role-registry";

interface RolePresetsPanelProps {
  selected: string[];
  onChange: (next: string[]) => void;
  bucketCount: (roleId: string) => number;
  className?: string;
}

export function RolePresetsPanel({ selected, onChange, bucketCount, className }: RolePresetsPanelProps) {
  function toggle(roleId: string) {
    if (selected.includes(roleId)) onChange(selected.filter((r) => r !== roleId));
    else onChange([...selected, roleId]);
  }

  return (
    <div className={cn("flex w-[170px] flex-shrink-0 flex-col overflow-y-auto bg-muted/20 px-0 py-2.5", className)}>
      <span className="block px-3 pb-1.5 text-[8.5px] font-bold uppercase tracking-widest text-muted-foreground">Role</span>

      {ROLE_GROUP_ORDER.map((group) => {
        const presets = ROLE_PRESETS.filter((r) => r.group === group);
        return (
          <div key={group} className="mb-1">
            <span className="block px-3 pb-0.5 pt-1.5 text-[7.5px] font-bold uppercase tracking-widest text-muted-foreground/50">
              {ROLE_GROUP_LABELS[group]}
            </span>
            {presets.map((preset) => {
              const isActive = selected.includes(preset.id);
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => toggle(preset.id)}
                  className={cn(
                    "flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-[11px] transition-colors",
                    isActive
                      ? cn(GROUP_COLORS[group].active, GROUP_COLORS[group].text, "font-semibold")
                      : "text-foreground/70 hover:bg-muted"
                  )}
                >
                  {preset.label}
                  <span className={cn(
                    "ml-auto font-mono text-[8.5px] tabular-nums",
                    isActive ? "" : "text-muted-foreground/60"
                  )}>
                    {bucketCount(preset.id)}
                  </span>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Run + commit**

```bash
pnpm test --filter @trainers/web -- --testPathPattern="role-presets-panel" 2>&1 | tail -10
git add apps/web/src/components/team-builder/v2/pickers/role-presets-panel.tsx \
        apps/web/src/components/team-builder/v2/__tests__/role-presets-panel.test.tsx
git commit -m "feat(team-builder): <RolePresetsPanel> shared component"
```

---

### Task 4: `<FilterChipsBar>` shared component

**Files:**
- Create: `apps/web/src/components/team-builder/v2/pickers/filter-chips-bar.tsx`
- Create: `apps/web/src/components/team-builder/v2/__tests__/filter-chips-bar.test.tsx`

- [ ] **Failing tests**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FilterChipsBar, type FilterChip } from "../pickers/filter-chips-bar";

describe("FilterChipsBar", () => {
  it("returns null when no chips", () => {
    const { container } = render(<FilterChipsBar chips={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders one chip per item", () => {
    const chips: FilterChip[] = [
      { id: "fire", label: "Fire", onRemove: jest.fn() },
      { id: "spread", label: "Role: Spread", onRemove: jest.fn() },
    ];
    render(<FilterChipsBar chips={chips} />);
    expect(screen.getByText("Fire")).toBeInTheDocument();
    expect(screen.getByText("Role: Spread")).toBeInTheDocument();
  });

  it("calls onRemove on chip click", async () => {
    const user = userEvent.setup();
    const onRemove = jest.fn();
    render(<FilterChipsBar chips={[{ id: "fire", label: "Fire", onRemove }]} />);
    await user.click(screen.getByText("Fire"));
    expect(onRemove).toHaveBeenCalled();
  });
});
```

- [ ] **Implement `filter-chips-bar.tsx`**

```tsx
"use client";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterChip {
  id: string;
  label: string;
  onRemove: () => void;
  /** undefined → primary teal, "mega" → purple */
  tone?: "primary" | "mega";
}

interface FilterChipsBarProps {
  chips: FilterChip[];
  className?: string;
}

export function FilterChipsBar({ chips, className }: FilterChipsBarProps) {
  if (chips.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5 border-b border-border/50 bg-muted/20 px-4 py-1.5", className)}>
      <span className="text-[10.5px] text-muted-foreground">Active:</span>
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={chip.onRemove}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold",
            chip.tone === "mega"
              ? "border border-violet-400/25 bg-violet-500/8 text-violet-700 dark:text-violet-300"
              : "border border-primary/25 bg-primary/8 text-primary"
          )}
        >
          {chip.label} <X className="size-2.5 opacity-50" />
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Run + commit**

```bash
pnpm test --filter @trainers/web -- --testPathPattern="filter-chips-bar" 2>&1 | tail -10
git add apps/web/src/components/team-builder/v2/pickers/filter-chips-bar.tsx \
        apps/web/src/components/team-builder/v2/__tests__/filter-chips-bar.test.tsx
git commit -m "feat(team-builder): <FilterChipsBar> shared component"
```

---

## Phase 2 — `@trainers/pokemon` package changes

### Task 5: Extend `SpeciesSearchEntry` and `searchSpecies` filters

**Files:**
- Modify: `packages/pokemon/src/species-search.ts`
- Modify: `packages/pokemon/src/index.ts`
- Modify: `packages/pokemon/src/__tests__/species-search.test.ts`
- Modify: `apps/web/src/components/team-builder/v2/__tests__/species-picker.test.tsx` (fixture migration)

The package can't import from `apps/web/`, so it accepts an optional `getRoles` resolver callback that the web app supplies (using the shared registry from Task 1).

- [ ] **Update `SpeciesSearchEntry` shape**

```ts
export interface SpeciesSearchEntry {
  species: string;
  types: string[];
  abilities: string[];          // kept for back-compat
  abilitySlot1: string | null;
  abilitySlot2: string | null;
  hiddenAbility: string | null;
  /** Role IDs this species fits — populated by buildSpeciesSearchIndex when
   *  a getRoles resolver is supplied. Empty otherwise. */
  roles: string[];
  baseStats: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number; };
  bst: number;
}
```

- [ ] **Update `makeEntry` and `buildSpeciesSearchIndex`**

```ts
export type GetRolesFn = (
  abilities: { slot1: string | null; slot2: string | null; hidden: string | null },
  speciesName: string,
  formatId: string
) => string[];

function makeEntry(
  species: { name: string; types: readonly string[]; abilities: Record<string, string>;
             baseStats: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number; }; },
  getRoles: GetRolesFn | undefined,
  formatId: string
): SpeciesSearchEntry {
  const { hp, atk, def, spa, spd, spe } = species.baseStats;
  const rawAbils = species.abilities as Record<string, string>;
  const abilities = Object.values(rawAbils).filter(
    (a): a is string => typeof a === "string" && a.length > 0
  );
  const slot1 = rawAbils["0"] ?? null;
  const slot2 = rawAbils["1"] ?? null;
  const hidden = rawAbils["H"] ?? null;
  const roles = getRoles
    ? getRoles({ slot1, slot2, hidden }, species.name, formatId)
    : [];
  return {
    species: species.name, types: species.types as string[],
    abilities, abilitySlot1: slot1, abilitySlot2: slot2, hiddenAbility: hidden,
    roles,
    baseStats: { hp, atk, def, spa, spd, spe },
    bst: hp + atk + def + spa + spd + spe,
  };
}

export function buildSpeciesSearchIndex(
  formatId: string,
  getRoles?: GetRolesFn
): SpeciesSearchEntry[] {
  // ... existing body, but pass `getRoles` and `formatId` into every makeEntry call
}
```

- [ ] **Add `ability`, `megaOnly`, `roles` filters to `searchSpecies`**

```ts
options?: {
  // ... existing fields
  ability?: string | null;
  megaOnly?: boolean;
  roles?: string[];
}
```

Filter body additions (after the existing `abilities` block):

```ts
if (options?.ability) {
  const target = options.ability.toLowerCase();
  const match =
    (entry.abilitySlot1?.toLowerCase() === target) ||
    (entry.abilitySlot2?.toLowerCase() === target) ||
    (entry.hiddenAbility?.toLowerCase() === target);
  if (!match) return false;
}

if (options?.megaOnly) {
  if (entry.species.includes("-Mega")) return false;
  if (getMegaStoneForSpecies(entry.species) === null) return false;
}

if (options?.roles && options.roles.length > 0) {
  const hasAny = options.roles.some((roleId) => entry.roles.includes(roleId));
  if (!hasAny) return false;
}
```

Add `import { getMegaStoneForSpecies } from "./items";` at the top of `species-search.ts`.

- [ ] **Add `getAllLegalAbilities` + `getAllLegalMoves`**

```ts
const abilitySetCache = new Map<string, string[]>();
const moveSetCache = new Map<string, string[]>();

export function getAllLegalAbilities(formatId: string): string[] {
  const cached = abilitySetCache.get(formatId);
  if (cached) return cached;
  const index = buildSpeciesSearchIndex(formatId);
  const set = new Set<string>();
  for (const entry of index) {
    if (entry.abilitySlot1) set.add(entry.abilitySlot1);
    if (entry.abilitySlot2) set.add(entry.abilitySlot2);
    if (entry.hiddenAbility) set.add(entry.hiddenAbility);
  }
  const sorted = Array.from(set).sort((a, b) => a.localeCompare(b));
  abilitySetCache.set(formatId, sorted);
  return sorted;
}

export function getAllLegalMoves(formatId: string): string[] {
  const cached = moveSetCache.get(formatId);
  if (cached) return cached;
  const index = buildSpeciesSearchIndex(formatId);
  const set = new Set<string>();
  for (const entry of index) {
    const moves = getLearnableMoves(entry.species, formatId);
    if (!moves) continue;
    for (const m of moves) set.add(m);
  }
  const sorted = Array.from(set).sort((a, b) => a.localeCompare(b));
  moveSetCache.set(formatId, sorted);
  return sorted;
}
```

If `getLearnableMoves` isn't already imported, add: `import { getLearnableMoves } from "./format-legality";`

- [ ] **Export from barrel**

`packages/pokemon/src/index.ts`:

```ts
export {
  buildSpeciesSearchIndex,
  searchSpecies,
  getAllLegalAbilities,
  getAllLegalMoves,
  type GetRolesFn,
  type SpeciesSearchEntry,
} from "./species-search";
```

- [ ] **Tests** (combined into one describe block)

```ts
describe("SpeciesSearchEntry — new fields", () => {
  let index: SpeciesSearchEntry[];
  beforeAll(() => { index = buildSpeciesSearchIndex("gen9vgc2026regg"); });

  it("has named ability slots", () => {
    const incineroar = index.find((e) => e.species === "Incineroar")!;
    expect(incineroar.abilitySlot1).toBe("Blaze");
    expect(incineroar.hiddenAbility).toBe("Intimidate");
  });

  it("roles defaults to empty without a resolver", () => {
    expect(index[0]!.roles).toEqual([]);
  });

  it("buildSpeciesSearchIndex with a resolver populates roles", () => {
    const idx = buildSpeciesSearchIndex("gen9vgc2026regg",
      (_abil, species) => species === "Incineroar" ? ["fake-out", "drop-atk"] : []
    );
    const incineroar = idx.find((e) => e.species === "Incineroar")!;
    expect(incineroar.roles).toEqual(["fake-out", "drop-atk"]);
  });
});

describe("searchSpecies — new filters", () => {
  let index: SpeciesSearchEntry[];
  beforeAll(() => { index = buildSpeciesSearchIndex("gen9vgc2026regg"); });

  it("ability filter matches any slot", () => {
    const results = searchSpecies(index, "", { ability: "Intimidate" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((e) =>
      e.abilitySlot1 === "Intimidate" || e.abilitySlot2 === "Intimidate" || e.hiddenAbility === "Intimidate"
    )).toBe(true);
  });

  it("megaOnly excludes -Mega entries themselves", () => {
    const championsIndex = buildSpeciesSearchIndex("championsvgc2026regma");
    const results = searchSpecies(championsIndex, "", { megaOnly: true });
    expect(results.every((e) => !e.species.includes("-Mega"))).toBe(true);
  });

  it("megaOnly includes Charizard (has Mega forms)", () => {
    const championsIndex = buildSpeciesSearchIndex("championsvgc2026regma");
    const results = searchSpecies(championsIndex, "", { megaOnly: true });
    expect(results.some((e) => e.species === "Charizard")).toBe(true);
  });

  it("roles filter matches species with any active role", () => {
    const idx = buildSpeciesSearchIndex("gen9vgc2026regg",
      (_abil, species) => species === "Incineroar" ? ["fake-out"] : []
    );
    const results = searchSpecies(idx, "", { roles: ["fake-out"] });
    expect(results.some((e) => e.species === "Incineroar")).toBe(true);
  });
});

describe("getAllLegalAbilities / getAllLegalMoves", () => {
  it("getAllLegalAbilities returns sorted unique abilities", () => {
    const a = getAllLegalAbilities("gen9vgc2026regg");
    expect(a.length).toBeGreaterThan(50);
    expect([...a]).toEqual([...a].sort((x, y) => x.localeCompare(y)));
    expect(a).toContain("Intimidate");
  });

  it("getAllLegalAbilities is cached (same array reference on second call)", () => {
    const a = getAllLegalAbilities("gen9vgc2026regg");
    const b = getAllLegalAbilities("gen9vgc2026regg");
    expect(a).toBe(b);
  });

  it("getAllLegalMoves returns sorted unique moves", () => {
    const m = getAllLegalMoves("gen9vgc2026regg");
    expect(m.length).toBeGreaterThan(100);
    expect(m).toContain("Tailwind");
  });
});
```

- [ ] **Migrate species-picker test fixtures**

`apps/web/src/components/team-builder/v2/__tests__/species-picker.test.tsx` `makeEntry` factory:

```ts
function makeEntry(overrides: Partial<{
  species: string;
  types: string[];
  abilities: string[];
  abilitySlot1: string | null;
  abilitySlot2: string | null;
  hiddenAbility: string | null;
  roles: string[];
  baseStats: Record<string, number>;
  bst: number;
}> = {}) {
  const abilities = overrides.abilities ?? ["Pressure"];
  return {
    species: "Garchomp", types: ["Dragon", "Ground"],
    abilities,
    abilitySlot1: overrides.abilitySlot1 ?? abilities[0] ?? null,
    abilitySlot2: overrides.abilitySlot2 ?? abilities[1] ?? null,
    hiddenAbility: overrides.hiddenAbility ?? abilities[2] ?? null,
    roles: overrides.roles ?? [],
    baseStats: { hp: 108, atk: 130, def: 95, spa: 80, spd: 85, spe: 102 },
    bst: 600,
    ...overrides,
  };
}
```

- [ ] **Run + commit**

```bash
pnpm test --filter @trainers/pokemon -- --testPathPattern="species-search" 2>&1 | tail -20
git add packages/pokemon/src/species-search.ts packages/pokemon/src/index.ts \
        packages/pokemon/src/__tests__/species-search.test.ts \
        apps/web/src/components/team-builder/v2/__tests__/species-picker.test.tsx
git commit -m "feat(pokemon): SpeciesSearchEntry slots+roles; ability/megaOnly/roles filters; format-wide enumerators"
```

---

## Phase 3 — Species picker

### Task 6: `species-filter-state.ts` + `<AbilityCell>`

**Files:**
- Create: `apps/web/src/components/team-builder/v2/pickers/species-filter-state.ts`
- Create: `apps/web/src/components/team-builder/v2/pickers/ability-cell.tsx`
- Create: `apps/web/src/components/team-builder/v2/__tests__/ability-cell.test.tsx`

- [ ] **Create `species-filter-state.ts`**

```ts
export interface SpeciesFilterState {
  types: string[];
  ability: string | null;
  moves: string[];
  roles: string[];
  megaOnly: boolean;
}

export const DEFAULT_SPECIES_FILTERS: SpeciesFilterState = {
  types: [], ability: null, moves: [], roles: [], megaOnly: false,
};
```

- [ ] **Failing tests for `AbilityCell`**

```tsx
jest.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children, render: r }: { children: React.ReactNode; render?: React.ReactElement }) =>
    r ? React.cloneElement(r, {}, children) : <span>{children}</span>,
  TooltipContent: () => null,
}));

jest.mock("@trainers/pokemon", () => ({
  getAbilityShortDesc: jest.fn((n: string) => n === "Drought" ? "Sets sun on entry." : null),
}));

import { AbilityCell } from "../pickers/ability-cell";

describe("AbilityCell", () => {
  it("renders ability name", () => {
    render(<AbilityCell name="Drought" slot="slot1" />);
    expect(screen.getByText("Drought")).toBeInTheDocument();
  });
  it("renders em-dash for null", () => {
    render(<AbilityCell name={null} slot="slot2" />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
  it("calls onFilter on click", async () => {
    const user = userEvent.setup();
    const onFilter = jest.fn();
    render(<AbilityCell name="Drought" slot="slot1" onFilter={onFilter} />);
    await user.click(screen.getByText("Drought"));
    expect(onFilter).toHaveBeenCalledWith("Drought");
  });
  it("hidden slot renders italic", () => {
    render(<AbilityCell name="Intimidate" slot="hidden" />);
    expect(screen.getByText("Intimidate").className).toMatch(/italic/);
  });
  it("does not call onFilter when em-dash clicked", async () => {
    const user = userEvent.setup();
    const onFilter = jest.fn();
    render(<AbilityCell name={null} slot="slot2" onFilter={onFilter} />);
    await user.click(screen.getByText("—"));
    expect(onFilter).not.toHaveBeenCalled();
  });
});
```

- [ ] **Implement `ability-cell.tsx`**

```tsx
"use client";
import { getAbilityShortDesc } from "@trainers/pokemon";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AbilityCellProps {
  name: string | null;
  slot: "slot1" | "slot2" | "hidden";
  onFilter?: (abilityName: string) => void;
}

export function AbilityCell({ name, slot, onFilter }: AbilityCellProps) {
  if (!name) return <span className="text-[11px] italic text-muted-foreground/40">—</span>;

  const desc = getAbilityShortDesc(name);
  const isHidden = slot === "hidden";

  const trigger = (
    <span
      className={cn(
        "inline-block max-w-full whitespace-nowrap overflow-hidden text-ellipsis text-[11px] leading-snug",
        "border-b border-dotted border-muted-foreground/40",
        onFilter && "cursor-pointer hover:border-primary/60 hover:text-primary",
        isHidden && "italic text-muted-foreground"
      )}
      onClick={onFilter ? () => onFilter(name) : undefined}
    >
      {name}
    </span>
  );

  if (!desc) return trigger;

  return (
    <Tooltip>
      <TooltipTrigger render={<span className="min-w-0 overflow-hidden" />}>{trigger}</TooltipTrigger>
      <TooltipContent side="top" align="start" className="max-w-56 rounded-lg bg-slate-800 px-3 py-2 shadow-xl">
        <p className="text-sm font-semibold text-slate-100">
          {name}
          {isHidden && (
            <span className="ml-1.5 rounded bg-violet-500/25 px-1 text-[9px] font-semibold text-violet-300">Hidden</span>
          )}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">{desc}</p>
      </TooltipContent>
    </Tooltip>
  );
}
```

- [ ] **Run + commit**

```bash
pnpm test --filter @trainers/web -- --testPathPattern="ability-cell" 2>&1 | tail -10
git add apps/web/src/components/team-builder/v2/pickers/species-filter-state.ts \
        apps/web/src/components/team-builder/v2/pickers/ability-cell.tsx \
        apps/web/src/components/team-builder/v2/__tests__/ability-cell.test.tsx
git commit -m "feat(team-builder): species-filter-state + AbilityCell"
```

---

### Task 7: `<SpeciesSidebar>` (left panel only)

**Files:**
- Create: `apps/web/src/components/team-builder/v2/pickers/species-sidebar.tsx`
- Create: `apps/web/src/components/team-builder/v2/__tests__/species-sidebar.test.tsx`

The sidebar is **only** the left panel: Type grid + Ability combobox + Mega toggle (Champions only) + Learns Move + Clear all + team-needs hints. The middle role-presets panel is `<RolePresetsPanel>` rendered as a sibling by `SpeciesPicker`.

- [ ] **Failing tests**

```tsx
jest.mock("@trainers/pokemon", () => ({
  ALL_TYPES: ["Fire", "Water", "Grass"],
  isChampionsFormat: jest.fn((f: { id?: string } | undefined) => f?.id === "championsvgc2026regma"),
  getAllLegalAbilities: jest.fn(() => ["Drought", "Drizzle", "Intimidate"]),
  calculateTeamSynergy: jest.fn(() => null),
}));

import { SpeciesSidebar } from "../pickers/species-sidebar";
import { DEFAULT_SPECIES_FILTERS } from "../pickers/species-filter-state";

const championsFormat = { id: "championsvgc2026regma" } as never;

function renderSidebar(overrides = {}) {
  return render(
    <SpeciesSidebar
      filters={DEFAULT_SPECIES_FILTERS}
      onFiltersChange={() => {}}
      format={undefined}
      currentTeam={[]}
      {...overrides}
    />
  );
}

describe("SpeciesSidebar", () => {
  it("renders type chips", () => {
    renderSidebar();
    expect(screen.getByText("Fire")).toBeInTheDocument();
  });

  it("clicking a type adds it to filters.types", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderSidebar({ onFiltersChange: onChange });
    await user.click(screen.getByText("Fire"));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ types: ["Fire"] }));
  });

  it("Mega toggle hidden for non-Champions", () => {
    renderSidebar();
    expect(screen.queryByText("Mega only")).not.toBeInTheDocument();
  });

  it("Mega toggle visible for Champions", () => {
    renderSidebar({ format: championsFormat });
    expect(screen.getByText("Mega only")).toBeInTheDocument();
  });

  it("Clear all resets filters", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderSidebar({
      filters: { ...DEFAULT_SPECIES_FILTERS, types: ["Fire"], roles: ["spread"] },
      onFiltersChange: onChange,
    });
    await user.click(screen.getByRole("button", { name: /clear/i }));
    expect(onChange).toHaveBeenCalledWith(DEFAULT_SPECIES_FILTERS);
  });

  it("ability datalist lists abilities from getAllLegalAbilities", () => {
    renderSidebar({ format: { id: "gen9vgc2026regg" } as never });
    expect(screen.getByText("Intimidate", { selector: "option" })).toBeInTheDocument();
  });
});
```

- [ ] **Implement `species-sidebar.tsx`**

The sidebar layout (top to bottom):

1. **Type grid**: 3-column grid of 18 chips using `TYPE_BG` colors. Multi-select; active chip has `outline + box-shadow`. After the grid, render team-needs hints if `currentTeam` has members and `calculateTeamSynergy` returns uncovered weak types.

2. **Ability combobox**: `<input list="species-picker-abilities">` + `<datalist>` populated from `getAllLegalAbilities(format.id)`. Displays "Click any ability in the table to filter" hint when value is empty.

3. **Champions M-A** (only when `isChampionsFormat(format)`): Mega-only toggle button with gradient gem icon and checkbox.

4. **Learns Move**: search input that adds moves on Enter; selected moves shown as chips with `×`; quick-pick buttons (Tailwind, Trick Room, Follow Me, Protect, Spore, Fake Out) below.

5. **Clear all filters** button at the bottom.

```ts
interface SpeciesSidebarProps {
  filters: SpeciesFilterState;
  onFiltersChange: (filters: SpeciesFilterState) => void;
  format: GameFormat | undefined;
  currentTeam: Array<{ species: string }>;
}
```

(Drop the `userMoves` ref and `applyRole` import — both gone. The sidebar does NOT touch `filters.roles`.)

- [ ] **Run + commit**

```bash
pnpm test --filter @trainers/web -- --testPathPattern="species-sidebar" 2>&1 | tail -10
git add apps/web/src/components/team-builder/v2/pickers/species-sidebar.tsx \
        apps/web/src/components/team-builder/v2/__tests__/species-sidebar.test.tsx
git commit -m "feat(team-builder): SpeciesSidebar (left panel — Type/Ability/Mega/Moves)"
```

---

### Task 8: `<SpeciesSmartSearch>` overlay

**Files:**
- Create: `apps/web/src/components/team-builder/v2/pickers/species-smart-search.tsx`
- Create: `apps/web/src/components/team-builder/v2/__tests__/species-smart-search.test.tsx`

Overlay shown when the search query is non-empty. Categorizes matches: Type, Moves, Abilities, Pokémon. Each non-Pokémon row has a Filter button; species rows have a Select button.

- [ ] **Tests + implementation**

(Reuse the implementation from the earlier plan version verbatim — uses `getAllLegalMoves(format.id)` from Task 5, ALL_TYPES for types, walks the index for abilities, name match for species.)

```tsx
jest.mock("@trainers/pokemon", () => ({
  ALL_TYPES: ["Fire", "Water", "Grass", "Dragon"],
  getAllLegalMoves: jest.fn(() => ["Tailwind", "Trick Room", "Fire Blast", "Fire Punch"]),
  getAbilityShortDesc: jest.fn((n: string) => `${n} short desc`),
}));
```

(Same test cases as the earlier plan version: Type category appears, Ability category appears, species rows have Select, clicking Filter calls onFilter, clicking Select calls onPick.)

- [ ] **Run + commit**

```bash
pnpm test --filter @trainers/web -- --testPathPattern="species-smart-search" 2>&1 | tail -10
git add apps/web/src/components/team-builder/v2/pickers/species-smart-search.tsx \
        apps/web/src/components/team-builder/v2/__tests__/species-smart-search.test.tsx
git commit -m "feat(team-builder): SpeciesSmartSearch overlay"
```

---

### Task 9: Refactor `SpeciesPicker` — wire it all up

**Files:**
- Modify: `apps/web/src/components/team-builder/v2/pickers/species-picker.tsx`
- Delete: `apps/web/src/components/team-builder/v2/pickers/species-filters.tsx`
- Modify: `apps/web/src/components/team-builder/v2/__tests__/species-picker.test.tsx`

The integration. `SpeciesPicker` becomes the orchestrator: holds `SpeciesFilterState`, builds the index with the `getRolesForSpecies` resolver, renders sidebar + `RolePresetsPanel` + `FilterChipsBar` + smart-search-or-list.

- [ ] **Replace `species-picker.tsx`**

Key implementation points:

1. **Index build**:

   ```ts
   const fullIndex = useMemo(
     () => buildSpeciesSearchIndex(format?.id ?? DEFAULT_FORMAT_ID, getRolesForSpecies),
     [format?.id]
   );
   ```

2. **State**: `useState<SpeciesFilterState>(DEFAULT_SPECIES_FILTERS)` + `useState("")` for query + sort state.

3. **Search call**:

   ```ts
   const matched = searchSpecies(speciesIndex, query, {
     types: filters.types.length ? filters.types : undefined,
     ability: filters.ability ?? undefined,
     moves: filters.moves.length ? filters.moves : undefined,
     megaOnly: filters.megaOnly || undefined,
     roles: filters.roles.length ? filters.roles : undefined,
     formatId: format?.id,
   });
   ```

4. **Body layout**: `<div class="body flex flex-1 min-h-0 overflow-hidden">` with three children:

   ```tsx
   <SpeciesSidebar filters={filters} onFiltersChange={setFilters} format={format} currentTeam={currentTeam} />
   <RolePresetsPanel selected={filters.roles} onChange={(roles) => setFilters((f) => ({ ...f, roles }))} bucketCount={bucketCount} />
   <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
     <FilterChipsBar chips={buildFilterChips()} />
     {isSearching ? <SpeciesSmartSearch ... /> : <list panel>}
   </div>
   ```

5. **Bucket counts** (memo-ed live counts based on current matches):

   ```ts
   const bucketCount = useMemo(() => {
     const counts = new Map<string, number>();
     for (const e of matched) for (const r of e.roles) counts.set(r, (counts.get(r) ?? 0) + 1);
     return (roleId: string) => counts.get(roleId) ?? 0;
   }, [matched]);
   ```

6. **Click handlers**:

   ```ts
   function handleTypeFilter(type: string) {
     setFilters((f) => f.types.includes(type)
       ? { ...f, types: f.types.filter((t) => t !== type) }
       : { ...f, types: [...f.types, type] });
   }
   function handleAbilityFilter(ability: string) { setFilters((f) => ({ ...f, ability })); }
   function handleRoleFilter(roleId: string) {
     setFilters((f) => f.roles.includes(roleId)
       ? { ...f, roles: f.roles.filter((r) => r !== roleId) }
       : { ...f, roles: [...f.roles, roleId] });
   }
   function handleRolePresetSelect(id: string) {
     const preset = getRoleById(id);
     if (filters.roles.includes(id)) {
       setFilters((f) => ({ ...f, role: null, moves: null, abilities: null, roles: f.roles.filter((r) => r !== id) }));
     } else {
       setFilters((f) => ({
         ...f,
         roles: [...f.roles, id],
         moves: preset?.moves ?? null,
         abilities: preset?.abilities ?? null,
       }));
     }
   }
   ```

   Use `handleRolePresetSelect` as the `onChange` handler for `<RolePresetsPanel>` so that selecting a preset also populates `filters.moves` and `filters.abilities` from the preset definition. Deselecting clears those fields.

7. **`buildFilterChips()`**:

   ```ts
   function buildFilterChips(): FilterChip[] {
     const chips: FilterChip[] = [];
     for (const t of filters.types) chips.push({
       id: `t-${t}`, label: t,
       onRemove: () => setFilters((f) => ({ ...f, types: f.types.filter((x) => x !== t) })),
     });
     if (filters.ability) chips.push({
       id: "a", label: `Ability: ${filters.ability}`,
       onRemove: () => setFilters((f) => ({ ...f, ability: null })),
     });
     for (const m of filters.moves) chips.push({
       id: `m-${m}`, label: `Learns: ${m}`,
       onRemove: () => setFilters((f) => ({ ...f, moves: f.moves.filter((x) => x !== m) })),
     });
     for (const r of filters.roles) {
       const role = getRoleById(r);
       chips.push({
         id: `r-${r}`, label: `Role: ${role?.label ?? r}`,
         onRemove: () => setFilters((f) => ({ ...f, roles: f.roles.filter((x) => x !== r) })),
       });
     }
     if (filters.megaOnly) chips.push({
       id: "mega", label: "Mega only", tone: "mega",
       onRemove: () => setFilters((f) => ({ ...f, megaOnly: false })),
     });
     return chips;
   }
   ```

8. **Row component (`SpeciesRow`)**:

```tsx
function SpeciesRow({ entry, isCurrent, onSelect, onTypeFilter, onAbilityFilter, onRoleFilter }: SpeciesRowProps) {
  const sprite = getPokemonSprite(entry.species);
  const isMega = entry.species.includes("-Mega");

  function handleKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(); }
  }

  return (
    <div
      role="row" tabIndex={0}
      onClick={onSelect} onKeyDown={handleKey}
      aria-label={`Select ${entry.species}`}
      className={cn(
        "hover:bg-muted/60 focus-visible:bg-muted/60 grid w-full cursor-pointer items-center gap-3 border-b px-4 py-2 outline-none",
        ROW_GRID,
        isCurrent && "bg-primary/6",
        isMega && "border-l-2 border-l-violet-400/35"
      )}
    >
      {/* Sprite, name, types, abilities, stats — same as the prior plan */}

      {/* Each TypeSymbolIcon now wired to onClick */}
      <div className="flex items-center gap-1">
        {entry.types.map((type) => (
          <span key={type} role="presentation" onClick={(e) => { e.stopPropagation(); onTypeFilter(type); }}>
            <TypeSymbolIcon type={type as Parameters<typeof TypeSymbolIcon>[0]["type"]} size={18} />
          </span>
        ))}
      </div>

      {/* Ability cells (same as prior plan) — onFilter prop drives click-to-filter */}
      <div role="presentation" onClick={(e) => e.stopPropagation()} className="min-w-0 overflow-hidden">
        <AbilityCell name={entry.abilitySlot1} slot="slot1" onFilter={onAbilityFilter} />
      </div>
      {/* ... slot2, hidden ... */}

      {/* Stats — same as prior plan */}

      {/* NEW: Roles column */}
      <div role="presentation" onClick={(e) => e.stopPropagation()} className="flex flex-wrap gap-1 min-w-0">
        {entry.roles.map((roleId) => (
          <RoleChip key={roleId} roleId={roleId} onClick={onRoleFilter} />
        ))}
      </div>
    </div>
  );
}
```

9. **Column grid update**:

   ```ts
   const ROW_GRID = "grid-cols-[44px_minmax(100px,1fr)_44px_80px_80px_76px_repeat(6,24px)_36px_minmax(140px,180px)]";
   ```

10. **Header keyboard shortcut** (`handleSearchKeyDown`): same Enter-to-apply-top-filter logic from the earlier plan version.

- [ ] **Delete `species-filters.tsx`**

```bash
rm apps/web/src/components/team-builder/v2/pickers/species-filters.tsx
```

- [ ] **Update integration tests**

Add to `species-picker.test.tsx`:

```tsx
describe("SpeciesPicker — click-to-filter and keyboard shortcuts", () => {
  it("clicking an ability sets filters.ability via the sidebar", async () => {
    const user = userEvent.setup();
    render(<SpeciesPicker value={null} format={undefined} currentTeam={[]} onPick={jest.fn()} onClose={jest.fn()} />);
    await user.click(screen.getByText("Drought"));
    const input = screen.getByPlaceholderText(/Any ability/i) as HTMLInputElement;
    expect(input.value).toBe("Drought");
  });

  it("clicking a Type icon adds it to type filter", async () => {
    const user = userEvent.setup();
    render(<SpeciesPicker /* ... */ />);
    const fireIcon = screen.getAllByRole("img", { name: "Fire" })[0];
    await user.click(fireIcon!);
    expect(await screen.findByText("Fire", { selector: "button" })).toBeInTheDocument();
  });

  it("clicking a role chip in a row toggles it", async () => {
    const user = userEvent.setup();
    render(<SpeciesPicker /* mocked entry with roles=['fake-out'] */ />);
    await user.click(screen.getByText("Fake Out", { selector: "button" }));
    expect(await screen.findByText("Role: Fake Out")).toBeInTheDocument();
  });

  it("Enter on the search input picks an exact species", async () => {
    const user = userEvent.setup();
    const onPick = jest.fn();
    render(<SpeciesPicker /* ... */ onPick={onPick} />);
    await user.type(screen.getByPlaceholderText(/Search species/i), "Garchomp{Enter}");
    expect(onPick).toHaveBeenCalledWith("Garchomp");
  });
});
```

(The existing test mocks for `useVirtualizer` and `Image` continue working. Extend the `@trainers/pokemon` mock factory to expose `getAllLegalAbilities`, `getAllLegalMoves`, `calculateTeamSynergy`, `isChampionsFormat`, `getMegaStoneForSpecies`, and `buildSpeciesSearchIndex` to accept the resolver. Extend the `./role-registry` mock factory with `getRolesForMove` — this function is imported from `./role-registry`, not from `@trainers/pokemon`.)

- [ ] **Run + commit**

```bash
pnpm test --filter @trainers/web -- --testPathPattern="species-picker" 2>&1 | tail -20
git add apps/web/src/components/team-builder/v2/pickers/species-picker.tsx \
        apps/web/src/components/team-builder/v2/__tests__/species-picker.test.tsx
git rm apps/web/src/components/team-builder/v2/pickers/species-filters.tsx
git commit -m "feat(team-builder): SpeciesPicker — Roles column + multi-select roles + click-to-filter"
```

---

## Phase 4 — Pre-push

### Task 10: Lint, typecheck, full test suite, push

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

**Spec coverage (against species spec §1–§13):**
- §1 Dialog shell — Task 9 ✓
- §2 Sidebar (Type/Ability/Mega/LearnsMove) — Task 7 ✓
- §2 Role presets (shared panel, multi-select OR) — Tasks 1, 3 ✓
- §3 Filter chips bar — Tasks 4, 9 ✓
- §4 List with new Roles column + click-Type-icon-to-filter — Task 9 ✓
- §5 Ability cells with tooltip + click-to-filter — Task 6 ✓
- §6 Smart search overlay (with Enter shortcut) — Tasks 8, 9 ✓
- §7 SpeciesFilterState (multi-select roles, megaOnly) — Tasks 5, 6 ✓
- §13 Shared design (registry, RoleChip, RolePresetsPanel, FilterChipsBar, GROUP_COLORS, getRolesForSpecies) — Tasks 1–4 ✓

**Eliminated complexity vs. prior plan version:**
- `applyRole` helper — gone
- `userMoves` ref tracking — gone
- `role-expansion.ts` + 7 tests for replace-within-group/stack-across-group/preserve-user-moves — gone
- `filter-state.ts` (separate file to break a circular import) — gone (no cycle since `role-expansion.ts` is gone)
- `species-roles.ts` — replaced by shared `role-registry.ts`
- The plan is ~30% smaller while covering more functionality

**Parallel paths:** Phase 1 tasks (shared infrastructure) are independent — any order. Phase 2 (pokemon package) is independent of Phase 1. Phase 3 depends on both. Tasks within Phase 3 are roughly linear (data → components → integration).
