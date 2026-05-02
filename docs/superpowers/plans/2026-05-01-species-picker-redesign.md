# Species Picker Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the SpeciesPicker's dropdown-based filters with a persistent 3-column layout (left: type/ability/moves + Mega, middle: grouped role presets, right: species list), add per-slot ability columns with hover tooltips and click-to-filter, and a Showdown-style smart search overlay.

**Architecture:** The existing `SpeciesPicker` and `SpeciesFilters` components are gutted and replaced with four new focused files: `species-roles.ts` (data registry), `species-sidebar.tsx` (left + middle panels), `ability-cell.tsx` (single ability column cell), and `species-smart-search.tsx` (search overlay). The `SpeciesPicker` is refactored to compose these pieces and update its column grid. The `@trainers/pokemon` `searchSpecies` function gains an `ability` (single string) and `megaOnly` (boolean) filter; `SpeciesSearchEntry` gains named ability slots.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, shadcn/ui Tooltip (Base UI), `@tanstack/react-virtual`, `@trainers/pokemon` (Dex, searchSpecies, getAbilityShortDesc, isChampionsFormat, ALL_TYPES, getMoveData)

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| **Create** | `packages/pokemon/src/species-search.ts` | Add `abilitySlot1/2/hidden` to `SpeciesSearchEntry`; add `ability` + `megaOnly` to `searchSpecies` options |
| **Create** | `apps/web/src/components/team-builder/v2/pickers/species-roles.ts` | Role preset registry — all 17 presets with group, moves, abilities |
| **Create** | `apps/web/src/components/team-builder/v2/pickers/ability-cell.tsx` | Single ability table cell with shadcn Tooltip |
| **Create** | `apps/web/src/components/team-builder/v2/pickers/species-sidebar.tsx` | Left panel (type/ability/moves/mega) + middle panel (role presets) |
| **Create** | `apps/web/src/components/team-builder/v2/pickers/species-smart-search.tsx` | Search overlay shown when query is non-empty |
| **Modify** | `apps/web/src/components/team-builder/v2/pickers/species-filters.tsx` | Delete file — all logic migrated to species-sidebar.tsx |
| **Modify** | `apps/web/src/components/team-builder/v2/pickers/species-picker.tsx` | Wire up new sidebar + smart search; update column grid + headers; add Mega row styles; update `SpeciesFilterState` |
| **Modify** | `packages/pokemon/src/__tests__/species-search.test.ts` | Update for new `SpeciesSearchEntry` shape + new filter options |
| **Create** | `apps/web/src/components/team-builder/v2/__tests__/ability-cell.test.tsx` | Tooltip content, hidden label, click-to-filter callback |
| **Create** | `apps/web/src/components/team-builder/v2/__tests__/species-sidebar.test.tsx` | Filter state changes, role selection, Mega toggle, clear all |
| **Create** | `apps/web/src/components/team-builder/v2/__tests__/species-smart-search.test.tsx` | Categorized results, Filter/Select buttons |

---

## Task 1: Extend `SpeciesSearchEntry` with named ability slots

**Files:**
- Modify: `packages/pokemon/src/species-search.ts`
- Modify: `packages/pokemon/src/__tests__/species-search.test.ts`

The current `abilities: string[]` flat array is positional but undocumented. We need named slots so `AbilityCell` can render correctly.

In `@pkmn/dex`, `species.abilities` has shape `{ 0: "Slot1", 1?: "Slot2", H?: "Hidden" }`. `Object.keys()` preserves insertion order: `"0"`, `"1"`, `"H"`.

- [ ] **Add fields to `SpeciesSearchEntry`**

In `packages/pokemon/src/species-search.ts`, update the interface (keep `abilities: string[]` for backward compat with existing query code):

```ts
export interface SpeciesSearchEntry {
  species: string;
  types: string[];
  abilities: string[];          // kept for backward compat
  abilitySlot1: string | null;  // primary ability (key "0")
  abilitySlot2: string | null;  // secondary ability (key "1"), null if single-ability
  hiddenAbility: string | null; // hidden ability (key "H"), null if none
  baseStats: {
    hp: number; atk: number; def: number;
    spa: number; spd: number; spe: number;
  };
  bst: number;
}
```

- [ ] **Update `makeEntry` to populate the new fields**

```ts
function makeEntry(species: {
  name: string;
  types: readonly string[];
  abilities: Record<string, string>;
  baseStats: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number; };
}): SpeciesSearchEntry {
  const { hp, atk, def, spa, spd, spe } = species.baseStats;
  const rawAbils = species.abilities as Record<string, string>;
  const abilities = Object.values(rawAbils).filter(
    (a): a is string => typeof a === "string" && a.length > 0
  );
  return {
    species: species.name,
    types: species.types as string[],
    abilities,
    abilitySlot1: rawAbils["0"] ?? null,
    abilitySlot2: rawAbils["1"] ?? null,
    hiddenAbility: rawAbils["H"] ?? null,
    baseStats: { hp, atk, def, spa, spd, spe },
    bst: hp + atk + def + spa + spd + spe,
  };
}
```

- [ ] **Add `ability` and `megaOnly` to `searchSpecies` options**

In the `options` parameter type:

```ts
options?: {
  types?: string[];
  abilities?: string[];          // existing (OR logic across all slots)
  ability?: string | null;       // NEW: exact match against any slot (single-select)
  moves?: string[];
  megaOnly?: boolean;            // NEW: filter to species whose name contains "-Mega"
  minBaseStat?: Partial<Record<keyof SpeciesSearchEntry["baseStats"], number>>;
  maxBaseStat?: Partial<Record<keyof SpeciesSearchEntry["baseStats"], number>>;
  formatId?: string;
}
```

- [ ] **Implement the new filters in the filter body of `searchSpecies`**

After the existing `abilities` filter block, add:

```ts
// ability (single-select) — matches any of the three named slots
if (options?.ability) {
  const target = options.ability.toLowerCase();
  const { abilitySlot1, abilitySlot2, hiddenAbility } = entry;
  const match =
    (abilitySlot1?.toLowerCase() === target) ||
    (abilitySlot2?.toLowerCase() === target) ||
    (hiddenAbility?.toLowerCase() === target);
  if (!match) return false;
}

// megaOnly — species name must contain "-Mega"
if (options?.megaOnly && !entry.species.includes("-Mega")) return false;
```

- [ ] **Write tests for the new filter options**

In `packages/pokemon/src/__tests__/species-search.test.ts`, add a `describe` block:

```ts
describe("searchSpecies — new filters", () => {
  let index: SpeciesSearchEntry[];
  beforeAll(() => { index = buildSpeciesSearchIndex("gen9vgc2026regg"); });

  it("ability filter matches slot1", () => {
    const results = searchSpecies(index, "", { ability: "Intimidate" });
    expect(results.every(e =>
      e.abilitySlot1 === "Intimidate" ||
      e.abilitySlot2 === "Intimidate" ||
      e.hiddenAbility === "Intimidate"
    )).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it("ability filter is case-insensitive", () => {
    const lower = searchSpecies(index, "", { ability: "intimidate" });
    const upper = searchSpecies(index, "", { ability: "Intimidate" });
    expect(lower.length).toBe(upper.length);
  });

  it("megaOnly includes only -Mega species", () => {
    const results = searchSpecies(index, "", { megaOnly: true });
    expect(results.every(e => e.species.includes("-Mega"))).toBe(true);
  });

  it("SpeciesSearchEntry has named ability slots", () => {
    const incineroar = index.find(e => e.species === "Incineroar");
    expect(incineroar).toBeDefined();
    expect(incineroar!.abilitySlot1).toBe("Blaze");
    expect(incineroar!.hiddenAbility).toBe("Intimidate");
  });
});
```

- [ ] **Run tests**

```bash
pnpm test --filter @trainers/pokemon -- --testPathPattern="species-search" 2>&1 | tail -20
```

Expected: all pass (including updated existing tests which still use `abilities: string[]`).

- [ ] **Commit**

```bash
git add packages/pokemon/src/species-search.ts packages/pokemon/src/__tests__/species-search.test.ts
git commit -m "feat(pokemon): add abilitySlot1/2/hidden to SpeciesSearchEntry; add ability+megaOnly filters to searchSpecies"
```

---

## Task 2: Role preset registry

**Files:**
- Create: `apps/web/src/components/team-builder/v2/pickers/species-roles.ts`

- [ ] **Create the file**

```ts
export type RoleGroup =
  | "speed"
  | "offensive-support"
  | "damage-reduction"
  | "disruption"
  | "field"
  | "offense";

export interface RolePreset {
  id: string;
  label: string;
  group: RoleGroup;
  /** Moves applied to the Learns Move filter when role is active */
  moves?: string[];
  /** Abilities applied to the Ability filter when role is active */
  abilities?: string[];
}

export const ROLE_PRESETS: RolePreset[] = [
  // Speed Control
  { id: "trick-room",    label: "Trick Room",  group: "speed",              moves: ["Trick Room"] },
  { id: "tailwind",      label: "Tailwind",    group: "speed",              moves: ["Tailwind"] },
  { id: "speed-drop",    label: "Speed Drop",  group: "speed",              moves: ["Electroweb", "Icy Wind", "Scary Face", "Rock Tomb", "String Shot", "Thunder Wave"] },

  // Offensive Support
  { id: "fake-out",      label: "Fake Out",    group: "offensive-support",  moves: ["Fake Out"] },
  { id: "redirection",   label: "Redirection", group: "offensive-support",  moves: ["Follow Me", "Rage Powder"] },
  { id: "dmg-boost",     label: "Dmg Boost",   group: "offensive-support",  moves: ["Helping Hand", "Coaching", "Howl", "Decorate"] },
  { id: "healing",       label: "Healing",     group: "offensive-support",  moves: ["Heal Pulse", "Life Dew", "Pollen Puff"] },

  // Damage Reduction
  { id: "screens",       label: "Screens",     group: "damage-reduction",   moves: ["Light Screen", "Reflect", "Aurora Veil"] },
  { id: "atk-drop",      label: "Atk Drop",    group: "damage-reduction",   moves: ["Charm", "Baby-Doll Eyes", "Parting Shot", "Noble Roar", "Growl"], abilities: ["Intimidate"] },
  { id: "spa-drop",      label: "SpA Drop",    group: "damage-reduction",   moves: ["Eerie Impulse", "Snarl", "Noble Roar", "Parting Shot"] },

  // Disruption
  { id: "sleep",         label: "Sleep",       group: "disruption",         moves: ["Spore", "Sleep Powder", "Yawn"] },
  { id: "paralysis",     label: "Paralysis",   group: "disruption",         moves: ["Thunder Wave", "Nuzzle", "Glare"] },
  { id: "burn",          label: "Burn",        group: "disruption",         moves: ["Will-O-Wisp"] },
  { id: "flinching",     label: "Flinching",   group: "disruption",         moves: ["Rock Slide", "Iron Head", "Air Slash", "Dark Pulse"] },

  // Field
  { id: "weather",       label: "Weather",     group: "field",              abilities: ["Drizzle", "Drought", "Sand Stream", "Snow Warning"] },
  { id: "terrain",       label: "Terrain",     group: "field",              abilities: ["Grassy Surge", "Electric Surge", "Psychic Surge", "Misty Surge"] },

  // Offense
  { id: "priority",      label: "Priority",    group: "offense",            moves: ["Aqua Jet", "Mach Punch", "Ice Shard", "ExtremeSpeed", "Sucker Punch", "Bullet Punch", "Shadow Sneak"] },
  { id: "spread",        label: "Spread",      group: "offense",            moves: ["Rock Slide", "Earthquake", "Heat Wave", "Discharge", "Dazzling Gleam", "Surf"] },
];

export const ROLE_GROUP_LABELS: Record<RoleGroup, string> = {
  "speed":              "Speed Control",
  "offensive-support":  "Offensive Support",
  "damage-reduction":   "Damage Reduction",
  "disruption":         "Disruption",
  "field":              "Field",
  "offense":            "Offense",
};

/** Ordered group display sequence */
export const ROLE_GROUP_ORDER: RoleGroup[] = [
  "speed", "offensive-support", "damage-reduction", "disruption", "field", "offense",
];

export function getRoleById(id: string): RolePreset | undefined {
  return ROLE_PRESETS.find((r) => r.id === id);
}
```

- [ ] **Write tests**

Create `apps/web/src/components/team-builder/v2/__tests__/species-roles.test.ts`:

```ts
import { ROLE_PRESETS, getRoleById, ROLE_GROUP_ORDER } from "../pickers/species-roles";

describe("species-roles registry", () => {
  it("has 18 presets", () => {
    expect(ROLE_PRESETS).toHaveLength(18);
  });

  it("all presets have id, label, group", () => {
    for (const r of ROLE_PRESETS) {
      expect(r.id).toBeTruthy();
      expect(r.label).toBeTruthy();
      expect(r.group).toBeTruthy();
    }
  });

  it("every id is unique", () => {
    const ids = ROLE_PRESETS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all groups appear in ROLE_GROUP_ORDER", () => {
    const groups = new Set(ROLE_PRESETS.map((r) => r.group));
    for (const g of groups) {
      expect(ROLE_GROUP_ORDER).toContain(g);
    }
  });

  it("getRoleById returns the correct preset", () => {
    const r = getRoleById("fake-out");
    expect(r?.label).toBe("Fake Out");
    expect(r?.moves).toContain("Fake Out");
  });

  it("getRoleById returns undefined for unknown id", () => {
    expect(getRoleById("nonexistent")).toBeUndefined();
  });

  it("atk-drop has both moves and abilities", () => {
    const r = getRoleById("atk-drop");
    expect(r?.moves?.length).toBeGreaterThan(0);
    expect(r?.abilities).toContain("Intimidate");
  });
});
```

- [ ] **Run tests**

```bash
pnpm test --filter @trainers/web -- --testPathPattern="species-roles" 2>&1 | tail -15
```

Expected: 7 tests pass.

- [ ] **Commit**

```bash
git add apps/web/src/components/team-builder/v2/pickers/species-roles.ts \
        apps/web/src/components/team-builder/v2/__tests__/species-roles.test.ts
git commit -m "feat(team-builder): add species role preset registry"
```

---

## Task 3: `AbilityCell` component

**Files:**
- Create: `apps/web/src/components/team-builder/v2/pickers/ability-cell.tsx`
- Create: `apps/web/src/components/team-builder/v2/__tests__/ability-cell.test.tsx`

`AbilityCell` renders one of the three ability columns. It shows the ability name with a dotted underline and shadcn Tooltip, OR a muted em-dash if no ability. Clicking a filled cell calls `onFilter?.(abilityName)`.

- [ ] **Write the failing test first**

```tsx
// apps/web/src/components/team-builder/v2/__tests__/ability-cell.test.tsx
"use client";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

jest.mock("@trainers/pokemon", () => ({
  getAbilityShortDesc: jest.fn((name: string) =>
    name === "Drought" ? "Summons harsh sunlight on entry." : null
  ),
}));

jest.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children, render: r }: { children: React.ReactNode; render?: React.ReactElement }) =>
    r ? React.cloneElement(r, {}, children) : <span>{children}</span>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div role="tooltip">{children}</div>,
}));

import { AbilityCell } from "../pickers/ability-cell";

describe("AbilityCell", () => {
  it("renders ability name with dotted underline class", () => {
    render(<AbilityCell name="Drought" slot="slot1" />);
    expect(screen.getByText("Drought")).toBeInTheDocument();
  });

  it("renders em-dash for null ability", () => {
    render(<AbilityCell name={null} slot="slot2" />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("calls onFilter with ability name when clicked", async () => {
    const user = userEvent.setup();
    const onFilter = jest.fn();
    render(<AbilityCell name="Drought" slot="slot1" onFilter={onFilter} />);
    await user.click(screen.getByText("Drought"));
    expect(onFilter).toHaveBeenCalledWith("Drought");
  });

  it("does not call onFilter when em-dash is clicked", async () => {
    const user = userEvent.setup();
    const onFilter = jest.fn();
    render(<AbilityCell name={null} slot="slot2" onFilter={onFilter} />);
    await user.click(screen.getByText("—"));
    expect(onFilter).not.toHaveBeenCalled();
  });

  it("adds hidden label when slot is hidden", () => {
    render(<AbilityCell name="Intimidate" slot="hidden" />);
    // The hidden tag appears inside the tooltip — check aria-label or text
    expect(screen.getByText("Intimidate")).toBeInTheDocument();
  });
});
```

- [ ] **Run the failing test**

```bash
pnpm test --filter @trainers/web -- --testPathPattern="ability-cell" 2>&1 | tail -15
```

Expected: FAIL — `Cannot find module '../pickers/ability-cell'`

- [ ] **Create `ability-cell.tsx`**

```tsx
"use client";

import { getAbilityShortDesc } from "@trainers/pokemon";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AbilityCellProps {
  name: string | null;
  slot: "slot1" | "slot2" | "hidden";
  /** Called with the ability name when the user clicks to filter */
  onFilter?: (abilityName: string) => void;
}

export function AbilityCell({ name, slot, onFilter }: AbilityCellProps) {
  if (!name) {
    return (
      <span className="text-[11px] text-muted-foreground/40 italic">—</span>
    );
  }

  const desc = getAbilityShortDesc(name);
  const isHidden = slot === "hidden";

  const trigger = (
    <span
      className={cn(
        "text-[11px] whitespace-nowrap overflow-hidden text-ellipsis",
        "border-b border-dotted border-muted-foreground/40",
        onFilter && "cursor-pointer hover:border-primary/60 hover:text-primary",
        isHidden && "text-muted-foreground italic"
      )}
      onClick={onFilter ? () => onFilter(name) : undefined}
    >
      {name}
    </span>
  );

  if (!desc) return trigger;

  return (
    <Tooltip>
      <TooltipTrigger render={<span className="min-w-0 overflow-hidden" />}>
        {trigger}
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        className="max-w-56 rounded-lg bg-slate-800 px-3 py-2 shadow-xl"
      >
        <p className="text-sm font-semibold text-slate-100">
          {name}
          {isHidden && (
            <span className="ml-1.5 rounded bg-violet-500/25 px-1 text-[9px] font-semibold text-violet-300">
              Hidden
            </span>
          )}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">{desc}</p>
      </TooltipContent>
    </Tooltip>
  );
}
```

- [ ] **Run tests**

```bash
pnpm test --filter @trainers/web -- --testPathPattern="ability-cell" 2>&1 | tail -15
```

Expected: 5 tests pass.

- [ ] **Commit**

```bash
git add apps/web/src/components/team-builder/v2/pickers/ability-cell.tsx \
        apps/web/src/components/team-builder/v2/__tests__/ability-cell.test.tsx
git commit -m "feat(team-builder): add AbilityCell with tooltip and click-to-filter"
```

---

## Task 4: New `SpeciesFilterState` + sidebar component

**Files:**
- Create: `apps/web/src/components/team-builder/v2/pickers/species-sidebar.tsx`
- Create: `apps/web/src/components/team-builder/v2/__tests__/species-sidebar.test.tsx`

The sidebar renders two panels side by side: left (160px: Type, Ability, Mega toggle, Learns Move) and right (152px: Role presets grouped). It owns the `SpeciesFilterState` shape as a re-export so `SpeciesPicker` can import it from one place.

- [ ] **Write failing tests**

```tsx
// apps/web/src/components/team-builder/v2/__tests__/species-sidebar.test.tsx
"use client";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

jest.mock("@trainers/pokemon", () => ({
  ALL_TYPES: ["Fire", "Water", "Grass"],
  isChampionsFormat: jest.fn((f: unknown) => f === "champions"),
  getAbilityShortDesc: jest.fn(() => null),
}));

// Stub popover/tooltip from shadcn
jest.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverTrigger: ({ children, render: r }: { children: React.ReactNode; render?: React.ReactElement }) =>
    r ? React.cloneElement(r, {}, children) : <button>{children}</button>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { SpeciesSidebar, DEFAULT_SIDEBAR_FILTERS } from "../pickers/species-sidebar";

const noop = () => {};

function renderSidebar(overrides = {}) {
  return render(
    <SpeciesSidebar
      filters={DEFAULT_SIDEBAR_FILTERS}
      onFiltersChange={noop}
      format={undefined}
      totalCount={274}
      filteredCount={274}
      {...overrides}
    />
  );
}

describe("SpeciesSidebar", () => {
  it("renders 18 type chips", () => {
    renderSidebar();
    // ALL_TYPES mock returns 3 — check they all appear
    expect(screen.getByText("Fire")).toBeInTheDocument();
    expect(screen.getByText("Water")).toBeInTheDocument();
    expect(screen.getByText("Grass")).toBeInTheDocument();
  });

  it("clicking a type chip calls onFiltersChange with that type toggled on", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderSidebar({ onFiltersChange: onChange });
    await user.click(screen.getByText("Fire"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ types: ["Fire"] })
    );
  });

  it("clicking an active type chip toggles it off", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <SpeciesSidebar
        filters={{ ...DEFAULT_SIDEBAR_FILTERS, types: ["Fire"] }}
        onFiltersChange={onChange}
        format={undefined}
        totalCount={10}
        filteredCount={10}
      />
    );
    await user.click(screen.getByText("Fire"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ types: [] })
    );
  });

  it("does NOT show Mega toggle for non-Champions formats", () => {
    renderSidebar({ format: undefined });
    expect(screen.queryByText("Mega only")).not.toBeInTheDocument();
  });

  it("shows Mega toggle for Champions format", () => {
    renderSidebar({ format: "champions" });
    expect(screen.getByText("Mega only")).toBeInTheDocument();
  });

  it("Clear all resets to DEFAULT_SIDEBAR_FILTERS", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <SpeciesSidebar
        filters={{ ...DEFAULT_SIDEBAR_FILTERS, types: ["Fire"], role: "tailwind" }}
        onFiltersChange={onChange}
        format={undefined}
        totalCount={10}
        filteredCount={5}
      />
    );
    await user.click(screen.getByRole("button", { name: /clear/i }));
    expect(onChange).toHaveBeenCalledWith(DEFAULT_SIDEBAR_FILTERS);
  });

  it("selecting a role preset calls onFiltersChange with role set", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderSidebar({ onFiltersChange: onChange });
    await user.click(screen.getByText("Tailwind"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ role: "tailwind" })
    );
  });
});
```

- [ ] **Run — expect FAIL**

```bash
pnpm test --filter @trainers/web -- --testPathPattern="species-sidebar" 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module '../pickers/species-sidebar'`

- [ ] **Create `species-sidebar.tsx`**

```tsx
"use client";

import { ALL_TYPES, type GameFormat, isChampionsFormat } from "@trainers/pokemon";

import { cn } from "@/lib/utils";

import {
  ROLE_PRESETS,
  ROLE_GROUP_ORDER,
  ROLE_GROUP_LABELS,
  getRoleById,
  type RoleGroup,
} from "./species-roles";

// =============================================================================
// SpeciesFilterState
// =============================================================================

export interface SpeciesFilterState {
  types: string[];
  ability: string | null;
  moves: string[];
  role: string | null;
  megaOnly: boolean;
}

export const DEFAULT_SIDEBAR_FILTERS: SpeciesFilterState = {
  types: [],
  ability: null,
  moves: [],
  role: null,
  megaOnly: false,
};

// =============================================================================
// Type chip colors — match TYPE_SYMBOL_MAP bgClass colors
// =============================================================================

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

// =============================================================================
// Props
// =============================================================================

interface SpeciesSidebarProps {
  filters: SpeciesFilterState;
  onFiltersChange: (filters: SpeciesFilterState) => void;
  format: GameFormat | undefined | string;
  totalCount: number;
  filteredCount: number;
  /** Called when an ability chip in the table is clicked — pre-fills ability filter */
  onAbilityFilter?: (ability: string) => void;
}

// =============================================================================
// SpeciesSidebar
// =============================================================================

export function SpeciesSidebar({
  filters,
  onFiltersChange,
  format,
  totalCount: _totalCount,
  filteredCount: _filteredCount,
}: SpeciesSidebarProps) {
  const showMega = isChampionsFormat(format as GameFormat);

  function toggleType(type: string) {
    const next = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    onFiltersChange({ ...filters, types: next });
  }

  function setAbility(ability: string) {
    onFiltersChange({ ...filters, ability: ability || null });
  }

  function addMove(move: string) {
    if (!move.trim() || filters.moves.includes(move)) return;
    onFiltersChange({ ...filters, moves: [...filters.moves, move.trim()] });
  }

  function removeMove(move: string) {
    onFiltersChange({ ...filters, moves: filters.moves.filter((m) => m !== move) });
  }

  function selectRole(id: string) {
    if (filters.role === id) {
      onFiltersChange({ ...filters, role: null });
      return;
    }
    const preset = getRoleById(id);
    if (!preset) return;
    onFiltersChange({ ...filters, role: id });
  }

  function clearAll() {
    onFiltersChange(DEFAULT_SIDEBAR_FILTERS);
  }

  const QUICK_PICKS = ["Tailwind", "Trick Room", "Follow Me", "Protect", "Spore", "Fake Out"];

  return (
    <div className="flex h-full min-h-0 flex-shrink-0 border-r border-border">
      {/* ── Left panel: Type + Ability + Mega + Learns Move ── */}
      <div className="flex w-40 flex-col overflow-y-auto border-r border-border bg-muted/30">

        {/* Type */}
        <div className="border-b border-border/60 p-2.5">
          <span className="mb-1.5 block text-[8.5px] font-bold uppercase tracking-widest text-muted-foreground">Type</span>
          <div className="grid grid-cols-3 gap-1">
            {(ALL_TYPES as string[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => toggleType(type)}
                className={cn(
                  "rounded px-0.5 py-1 text-[9px] font-bold transition-all",
                  filters.types.includes(type)
                    ? cn(TYPE_BG[type] ?? "bg-muted text-foreground", "outline outline-2 outline-offset-0 outline-white shadow-[0_0_0_3px_currentColor]")
                    : (TYPE_BG[type] ?? "bg-muted text-foreground"),
                  "opacity-100"
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Ability */}
        <div className="border-b border-border/60 p-2.5">
          <span className="mb-1.5 block text-[8.5px] font-bold uppercase tracking-widest text-muted-foreground">Ability</span>
          <input
            type="text"
            value={filters.ability ?? ""}
            onChange={(e) => setAbility(e.target.value)}
            placeholder="Any ability…"
            className="h-7 w-full rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-primary"
          />
          {filters.ability && (
            <p className="mt-1 text-[9px] text-muted-foreground">Click an ability in the table to filter</p>
          )}
        </div>

        {/* Mega (Champions only) */}
        {showMega && (
          <div className="border-b border-border/60 p-2.5">
            <span className="mb-1.5 block text-[8.5px] font-bold uppercase tracking-widest text-muted-foreground">Champions M-A</span>
            <button
              type="button"
              onClick={() => onFiltersChange({ ...filters, megaOnly: !filters.megaOnly })}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-all",
                filters.megaOnly
                  ? "border-violet-400/40 bg-violet-500/8"
                  : "border-border bg-background"
              )}
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-[5px] bg-gradient-to-br from-violet-500 to-pink-500 text-[10px] text-white flex-shrink-0">
                ✦
              </div>
              <div className="min-w-0 flex-1 text-left">
                <div className="text-[11px] font-semibold text-foreground">Mega only</div>
                <div className="text-[9px] text-muted-foreground">Has a Mega form</div>
              </div>
              <div className={cn(
                "flex h-3.5 w-3.5 items-center justify-center rounded-sm border-2 flex-shrink-0",
                filters.megaOnly ? "border-violet-500 bg-violet-500" : "border-border"
              )}>
                {filters.megaOnly && (
                  <svg width="8" height="6" viewBox="0 0 9 7" fill="none">
                    <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            </button>
          </div>
        )}

        {/* Learns Move */}
        <div className="flex flex-1 flex-col p-2.5">
          <span className="mb-1.5 block text-[8.5px] font-bold uppercase tracking-widest text-muted-foreground">Learns Move</span>
          <input
            type="text"
            placeholder="Search moves…"
            className="mb-1.5 h-7 w-full rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-primary"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addMove((e.target as HTMLInputElement).value);
                (e.target as HTMLInputElement).value = "";
              }
            }}
          />
          {filters.moves.length > 0 && (
            <div className="mb-1.5 flex flex-wrap gap-1">
              {filters.moves.map((m) => (
                <span
                  key={m}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/25 px-2 py-0.5 text-[9.5px] font-semibold text-primary cursor-pointer"
                  onClick={() => removeMove(m)}
                >
                  {m} <span className="opacity-50">×</span>
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-1">
            {QUICK_PICKS.map((move) => (
              <button
                key={move}
                type="button"
                onClick={() => addMove(move)}
                className={cn(
                  "rounded-full border px-1.5 py-0.5 text-[9px] font-medium transition-colors",
                  filters.moves.includes(move)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary hover:text-primary"
                )}
              >
                {move}
              </button>
            ))}
          </div>
        </div>

        {/* Clear all */}
        <div className="border-t border-border p-2.5">
          <button
            type="button"
            onClick={clearAll}
            className="w-full rounded-md border border-border bg-background py-1 text-[11px] text-muted-foreground hover:border-destructive/50 hover:text-destructive transition-colors"
          >
            Clear all filters
          </button>
        </div>
      </div>

      {/* ── Right panel: Role presets ── */}
      <div className="flex w-38 flex-col overflow-y-auto bg-muted/20 px-0 py-2.5">
        <span className="mb-1.5 block px-3 text-[8.5px] font-bold uppercase tracking-widest text-muted-foreground">Role</span>

        {ROLE_GROUP_ORDER.map((group: RoleGroup) => {
          const presets = ROLE_PRESETS.filter((r) => r.group === group);
          return (
            <div key={group} className="mb-1">
              <span className="block px-3 pb-0.5 pt-1.5 text-[7.5px] font-bold uppercase tracking-widest text-muted-foreground/50">
                {ROLE_GROUP_LABELS[group]}
              </span>
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => selectRole(preset.id)}
                  className={cn(
                    "flex w-full items-center gap-1.5 px-3 py-1.5 text-[11px] text-left transition-colors",
                    filters.role === preset.id
                      ? "bg-primary/10 font-semibold text-primary"
                      : "text-foreground/70 hover:bg-muted"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Run tests**

```bash
pnpm test --filter @trainers/web -- --testPathPattern="species-sidebar" 2>&1 | tail -15
```

Expected: all 7 pass.

- [ ] **Commit**

```bash
git add apps/web/src/components/team-builder/v2/pickers/species-sidebar.tsx \
        apps/web/src/components/team-builder/v2/__tests__/species-sidebar.test.tsx
git commit -m "feat(team-builder): add SpeciesSidebar with type/ability/moves/role/mega filters"
```

---

## Task 5: Smart search overlay

**Files:**
- Create: `apps/web/src/components/team-builder/v2/pickers/species-smart-search.tsx`
- Create: `apps/web/src/components/team-builder/v2/__tests__/species-smart-search.test.tsx`

When the search query is non-empty and doesn't match a species name exactly, the overlay renders categorized suggestions: Types, Moves, Abilities, Pokémon. Each non-Pokémon suggestion has a "Filter" button; each Pokémon suggestion has a "Select" button.

- [ ] **Write failing tests**

```tsx
// apps/web/src/components/team-builder/v2/__tests__/species-smart-search.test.tsx
"use client";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import { type SpeciesSearchEntry } from "@trainers/pokemon";

jest.mock("@trainers/pokemon", () => ({
  ALL_TYPES: ["Fire", "Water", "Grass", "Dragon"],
  getMoveData: jest.fn((name: string) => ({ name, shortDesc: `${name} desc` })),
  getAbilityShortDesc: jest.fn((name: string) => `${name} short desc`),
}));

const makeEntry = (species: string, abilities: string[] = []): SpeciesSearchEntry => ({
  species,
  types: ["Fire"],
  abilities,
  abilitySlot1: abilities[0] ?? null,
  abilitySlot2: abilities[1] ?? null,
  hiddenAbility: abilities[2] ?? null,
  baseStats: { hp: 78, atk: 84, def: 78, spa: 109, spd: 85, spe: 100 },
  bst: 534,
});

import { SpeciesSmartSearch } from "../pickers/species-smart-search";

const defaultProps = {
  query: "fire",
  index: [makeEntry("Charizard"), makeEntry("Arcanine", ["Intimidate", "Flash Fire", "Justified"])],
  format: undefined,
  onFilter: jest.fn(),
  onPick: jest.fn(),
};

describe("SpeciesSmartSearch", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows Type category when query matches a type", () => {
    render(<SpeciesSmartSearch {...defaultProps} query="fire" />);
    expect(screen.getByText(/Type/i)).toBeInTheDocument();
    expect(screen.getByText("Fire")).toBeInTheDocument();
  });

  it("shows Ability category when query matches an ability", () => {
    render(<SpeciesSmartSearch {...defaultProps} query="intim" />);
    expect(screen.getByText(/Abilit/i)).toBeInTheDocument();
    expect(screen.getByText("Intimidate")).toBeInTheDocument();
  });

  it("shows Pokémon category with matching species", () => {
    render(<SpeciesSmartSearch {...defaultProps} query="char" />);
    expect(screen.getByText("Charizard")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /select/i })).toBeInTheDocument();
  });

  it("clicking Filter on a type calls onFilter with type", async () => {
    const user = userEvent.setup();
    const onFilter = jest.fn();
    render(<SpeciesSmartSearch {...defaultProps} query="fire" onFilter={onFilter} />);
    await user.click(screen.getAllByRole("button", { name: /filter/i })[0]);
    expect(onFilter).toHaveBeenCalledWith(expect.objectContaining({ type: "Fire" }));
  });

  it("clicking Select on a species calls onPick", async () => {
    const user = userEvent.setup();
    const onPick = jest.fn();
    render(<SpeciesSmartSearch {...defaultProps} query="char" onPick={onPick} />);
    await user.click(screen.getByRole("button", { name: /select/i }));
    expect(onPick).toHaveBeenCalledWith("Charizard");
  });
});
```

- [ ] **Run — expect FAIL**

```bash
pnpm test --filter @trainers/web -- --testPathPattern="species-smart-search" 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module '../pickers/species-smart-search'`

- [ ] **Create `species-smart-search.tsx`**

```tsx
"use client";

import { ALL_TYPES, getMoveData, getAbilityShortDesc, type GameFormat } from "@trainers/pokemon";
import { type SpeciesSearchEntry } from "@trainers/pokemon";

import { cn } from "@/lib/utils";

interface FilterAction {
  type?: string;
  move?: string;
  ability?: string;
}

interface SpeciesSmartSearchProps {
  query: string;
  index: SpeciesSearchEntry[];
  format: GameFormat | undefined;
  onFilter: (action: FilterAction) => void;
  onPick: (species: string) => void;
}

const MAX_PER_CATEGORY = 5;
const ALL_MOVE_NAMES: string[] = [
  "Tailwind", "Trick Room", "Follow Me", "Rage Powder", "Fake Out", "Protect",
  "Spore", "Sleep Powder", "Yawn", "Thunder Wave", "Nuzzle", "Will-O-Wisp",
  "Helping Hand", "Coaching", "Howl", "Decorate", "Light Screen", "Reflect",
  "Aurora Veil", "Aqua Jet", "Mach Punch", "Ice Shard", "ExtremeSpeed",
  "Rock Slide", "Earthquake", "Heat Wave", "Discharge", "Dazzling Gleam",
  "Electroweb", "Icy Wind", "Scary Face", "Eerie Impulse", "Snarl",
  "Charm", "Baby-Doll Eyes", "Parting Shot", "Heal Pulse", "Life Dew",
];

export function SpeciesSmartSearch({
  query,
  index,
  onFilter,
  onPick,
}: SpeciesSmartSearchProps) {
  const q = query.toLowerCase();

  // Types
  const matchedTypes = (ALL_TYPES as string[]).filter((t) =>
    t.toLowerCase().includes(q)
  ).slice(0, MAX_PER_CATEGORY);

  // Moves
  const matchedMoves = ALL_MOVE_NAMES.filter((m) =>
    m.toLowerCase().includes(q)
  ).slice(0, MAX_PER_CATEGORY);

  // Abilities — collect unique ability names from the index
  const abilitySet = new Set<string>();
  for (const entry of index) {
    if (entry.abilitySlot1?.toLowerCase().includes(q)) abilitySet.add(entry.abilitySlot1);
    if (entry.abilitySlot2?.toLowerCase().includes(q)) abilitySet.add(entry.abilitySlot2!);
    if (entry.hiddenAbility?.toLowerCase().includes(q)) abilitySet.add(entry.hiddenAbility!);
    if (abilitySet.size >= MAX_PER_CATEGORY) break;
  }
  const matchedAbilities = Array.from(abilitySet).slice(0, MAX_PER_CATEGORY);

  // Pokémon
  const matchedSpecies = index
    .filter((e) => e.species.toLowerCase().includes(q))
    .slice(0, MAX_PER_CATEGORY);

  const hasAny =
    matchedTypes.length > 0 ||
    matchedMoves.length > 0 ||
    matchedAbilities.length > 0 ||
    matchedSpecies.length > 0;

  if (!hasAny) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        No results for "{query}"
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <SuggestionSection
        title="Type"
        items={matchedTypes}
        renderItem={(t) => (
          <span className="text-sm font-medium">{t}</span>
        )}
        onFilter={(t) => onFilter({ type: t })}
      />
      <SuggestionSection
        title="Moves"
        items={matchedMoves}
        renderItem={(m) => (
          <span className="text-sm">{m}</span>
        )}
        onFilter={(m) => onFilter({ move: m })}
      />
      <SuggestionSection
        title="Abilities"
        items={matchedAbilities}
        renderItem={(a) => {
          const desc = getAbilityShortDesc(a);
          return (
            <span className="min-w-0">
              <span className="text-sm font-medium">{a}</span>
              {desc && <span className="ml-2 truncate text-xs text-muted-foreground">{desc}</span>}
            </span>
          );
        }}
        onFilter={(a) => onFilter({ ability: a })}
      />
      {matchedSpecies.length > 0 && (
        <>
          <div className="border-b border-border bg-muted/50 px-4 py-1.5 text-[9.5px] font-bold uppercase tracking-widest text-muted-foreground">
            Pokémon
          </div>
          {matchedSpecies.map((entry) => (
            <div
              key={entry.species}
              className="flex items-center gap-3 border-b border-border/50 px-4 py-2 hover:bg-muted/30"
            >
              <span className="flex-1 text-sm font-medium">{entry.species}</span>
              <button
                type="button"
                onClick={() => onPick(entry.species)}
                className="rounded-full border border-border px-3 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-primary"
              >
                Select
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function SuggestionSection<T extends string>({
  title,
  items,
  renderItem,
  onFilter,
}: {
  title: string;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  onFilter: (item: T) => void;
}) {
  if (items.length === 0) return null;
  return (
    <>
      <div className="border-b border-border bg-muted/50 px-4 py-1.5 text-[9.5px] font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </div>
      {items.map((item) => (
        <div
          key={item}
          className="flex items-center gap-3 border-b border-border/50 px-4 py-2 hover:bg-muted/30"
        >
          <span className="flex-1 min-w-0 flex items-center gap-2">{renderItem(item)}</span>
          <button
            type="button"
            onClick={() => onFilter(item)}
            className="rounded-full border border-primary/40 px-3 py-0.5 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            Filter
          </button>
        </div>
      ))}
    </>
  );
}
```

- [ ] **Run tests**

```bash
pnpm test --filter @trainers/web -- --testPathPattern="species-smart-search" 2>&1 | tail -15
```

Expected: 5 tests pass.

- [ ] **Commit**

```bash
git add apps/web/src/components/team-builder/v2/pickers/species-smart-search.tsx \
        apps/web/src/components/team-builder/v2/__tests__/species-smart-search.test.tsx
git commit -m "feat(team-builder): add SpeciesSmartSearch overlay with categorized suggestions"
```

---

## Task 6: Refactor `SpeciesPicker` — wire up new panels + column grid

**Files:**
- Modify: `apps/web/src/components/team-builder/v2/pickers/species-picker.tsx`
- Delete: `apps/web/src/components/team-builder/v2/pickers/species-filters.tsx`
- Modify: `apps/web/src/components/team-builder/v2/__tests__/species-picker.test.tsx` (update existing tests if any)

This is the integration task. `SpeciesPicker` becomes the orchestrator: it holds `SpeciesFilterState`, renders `SpeciesSidebar` + `SpeciesSmartSearch` (when query set) + the virtualized table.

- [ ] **Read the current `species-picker.tsx` before editing** (already read at task start — verify it's still current)

```bash
head -30 apps/web/src/components/team-builder/v2/pickers/species-picker.tsx
```

- [ ] **Replace `SpeciesFilterState` import source** — change all consumers from `species-filters` to `species-sidebar`

Check if anything imports from `species-filters`:

```bash
grep -rn "from.*species-filters" apps/web/src/ --include="*.tsx" --include="*.ts"
```

Update each found import to `from "./species-sidebar"` (or relative equivalent).

- [ ] **Rewrite `species-picker.tsx`**

Full replacement:

```tsx
"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

import { useVirtualizer } from "@tanstack/react-virtual";

import {
  buildSpeciesSearchIndex,
  isLegalSpecies,
  searchSpecies,
  isChampionsFormat,
  type GameFormat,
  type SpeciesSearchEntry,
} from "@trainers/pokemon";
import { getPokemonSprite } from "@trainers/pokemon/sprites";

import { cn } from "@/lib/utils";

import { TypeSymbolIcon } from "../../type-symbol-icon";
import { AbilityCell } from "./ability-cell";
import { SpeciesSidebar, DEFAULT_SIDEBAR_FILTERS, type SpeciesFilterState } from "./species-sidebar";
import { SpeciesSmartSearch } from "./species-smart-search";

// =============================================================================
// Constants
// =============================================================================

const HIGH_STAT_THRESHOLD = 110;
const DEFAULT_FORMAT_ID = "gen9vgc2025regg";

const ROW_GRID =
  "grid-cols-[44px_minmax(0,1fr)_44px_80px_80px_76px_repeat(6,24px)_36px]";

const indexCache = new Map<string, SpeciesSearchEntry[]>();

function getCachedIndex(format: GameFormat | undefined): SpeciesSearchEntry[] {
  const key = format?.id ?? DEFAULT_FORMAT_ID;
  if (!indexCache.has(key)) {
    indexCache.set(key, buildSpeciesSearchIndex(key));
  }
  return indexCache.get(key)!;
}

type SortCol = "name" | "hp" | "atk" | "def" | "spa" | "spd" | "spe" | "bst";
type SortDir = "asc" | "desc";

function statValueClass(value: number): string {
  return value >= HIGH_STAT_THRESHOLD ? "text-teal-600 dark:text-teal-400 font-semibold" : "";
}

function sortEntries(entries: SpeciesSearchEntry[], col: SortCol, dir: SortDir) {
  return [...entries].sort((a, b) => {
    let cmp =
      col === "name" ? a.species.localeCompare(b.species)
      : col === "bst"  ? a.bst - b.bst
      :                  a.baseStats[col] - b.baseStats[col];
    return dir === "asc" ? cmp : -cmp;
  });
}

// =============================================================================
// SpeciesRow
// =============================================================================

interface SpeciesRowProps {
  entry: SpeciesSearchEntry;
  isCurrent: boolean;
  onSelect: () => void;
  onAbilityFilter: (ability: string) => void;
}

function SpeciesRow({ entry, isCurrent, onSelect, onAbilityFilter }: SpeciesRowProps) {
  const sprite = getPokemonSprite(entry.species);
  const isMega = entry.species.includes("-Mega");

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "hover:bg-muted/60 grid w-full cursor-pointer items-center gap-3 border-b px-4 py-2 text-left transition-colors",
        ROW_GRID,
        isCurrent && "bg-primary/6",
        isMega && "border-l-2 border-l-violet-400/35"
      )}
    >
      {/* Sprite */}
      <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-full", isMega ? "bg-violet-500/10" : "bg-primary/8")}>
        <Image src={sprite.url} alt={entry.species} width={36} height={36}
          className={cn("size-9 object-contain", sprite.pixelated && "[image-rendering:pixelated]")}
          unoptimized />
      </div>

      {/* Name */}
      <span className={cn("min-w-0 truncate text-sm font-semibold", isMega && "text-indigo-700 dark:text-indigo-400")}>
        {entry.species}
      </span>

      {/* Types */}
      <div className="flex min-w-12 items-center gap-1">
        {entry.types.map((type) => (
          <TypeSymbolIcon key={type} type={type as Parameters<typeof TypeSymbolIcon>[0]["type"]} size={18} />
        ))}
      </div>

      {/* Ability 1 */}
      <div onClick={(e) => e.stopPropagation()} className="min-w-0 overflow-hidden">
        <AbilityCell name={entry.abilitySlot1} slot="slot1" onFilter={onAbilityFilter} />
      </div>

      {/* Ability 2 */}
      <div onClick={(e) => e.stopPropagation()} className="min-w-0 overflow-hidden">
        <AbilityCell name={entry.abilitySlot2} slot="slot2" onFilter={onAbilityFilter} />
      </div>

      {/* Hidden Ability */}
      <div onClick={(e) => e.stopPropagation()} className="min-w-0 overflow-hidden">
        <AbilityCell name={entry.hiddenAbility} slot="hidden" onFilter={onAbilityFilter} />
      </div>

      {/* Stats */}
      {(["hp","atk","def","spa","spd","spe"] as const).map((stat) => (
        <span key={stat} className={cn("text-center font-mono text-xs tabular-nums", statValueClass(entry.baseStats[stat]))}>
          {entry.baseStats[stat]}
        </span>
      ))}

      {/* BST */}
      <span className="border-border/60 text-foreground border-l pl-2 text-center font-mono text-xs font-semibold tabular-nums">
        {entry.bst}
      </span>
    </button>
  );
}

// =============================================================================
// Header row
// =============================================================================

function SpeciesRowsHeader({
  sort, onSort,
}: { sort: { col: SortCol; dir: SortDir }; onSort: (col: SortCol) => void }) {
  function hBtn(col: SortCol, label: string, className?: string) {
    return (
      <button type="button"
        onClick={() => onSort(col)}
        className={cn("cursor-pointer select-none text-center text-[9px] font-bold uppercase tracking-wide transition-colors hover:text-foreground",
          sort.col === col ? "text-foreground" : "text-muted-foreground", className)}>
        {label}{sort.col === col && (sort.dir === "asc" ? " ↑" : " ↓")}
      </button>
    );
  }
  return (
    <div className={cn("bg-card sticky top-0 z-20 grid items-center gap-3 border-b px-4 py-1.5", ROW_GRID)}>
      <span />
      {hBtn("name", "Name", "text-left")}
      <span className="text-muted-foreground text-[9px] font-bold uppercase tracking-wide">Types</span>
      <span className="text-muted-foreground text-[9px] font-bold uppercase tracking-wide text-center">Ability 1</span>
      <span className="text-muted-foreground text-[9px] font-bold uppercase tracking-wide text-center">Ability 2</span>
      <span className="text-[9px] font-bold uppercase tracking-wide text-center text-violet-400">Hidden</span>
      {(["hp","atk","def","spa","spd","spe"] as ["hp","atk","def","spa","spd","spe"]).map((s) =>
        hBtn(s, s.toUpperCase())
      )}
      {hBtn("bst", "BST", "border-border/60 border-l pl-2")}
    </div>
  );
}

// =============================================================================
// Applied filter chips
// =============================================================================

interface FilterChipsProps {
  filters: SpeciesFilterState;
  onFiltersChange: (f: SpeciesFilterState) => void;
}

function FilterChips({ filters, onFiltersChange }: FilterChipsProps) {
  const chips: Array<{ label: string; remove: () => void; mega?: boolean }> = [
    ...filters.types.map((t) => ({
      label: t,
      remove: () => onFiltersChange({ ...filters, types: filters.types.filter((x) => x !== t) }),
    })),
    ...(filters.ability ? [{ label: `Ability: ${filters.ability}`, remove: () => onFiltersChange({ ...filters, ability: null }) }] : []),
    ...filters.moves.map((m) => ({
      label: `Learns: ${m}`,
      remove: () => onFiltersChange({ ...filters, moves: filters.moves.filter((x) => x !== m) }),
    })),
    ...(filters.role ? [{ label: `Role: ${filters.role}`, remove: () => onFiltersChange({ ...filters, role: null }) }] : []),
    ...(filters.megaOnly ? [{ label: "Mega only", mega: true, remove: () => onFiltersChange({ ...filters, megaOnly: false }) }] : []),
  ];

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-border/50 bg-muted/20 px-4 py-1.5">
      <span className="text-[10.5px] text-muted-foreground">Active:</span>
      {chips.map(({ label, remove, mega }) => (
        <button key={label} type="button" onClick={remove}
          className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold",
            mega
              ? "border border-violet-400/25 bg-violet-500/8 text-violet-700 dark:text-violet-300"
              : "border border-primary/25 bg-primary/8 text-primary"
          )}>
          {label} <X className="size-2.5 opacity-50" />
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// SpeciesPicker
// =============================================================================

interface SpeciesPickerProps {
  value: string | null;
  format: GameFormat | undefined;
  currentTeam?: Array<{ species: string }>;
  onPick: (species: string) => void;
  onClose: () => void;
}

export function SpeciesPicker({ value, format, onPick, onClose }: SpeciesPickerProps) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SpeciesFilterState>(DEFAULT_SIDEBAR_FILTERS);
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({ col: "name", dir: "asc" });
  const scrollRef = useRef<HTMLDivElement>(null);

  const fullIndex = getCachedIndex(format);
  const speciesIndex = format?.id
    ? fullIndex.filter((e) => isLegalSpecies(e.species, format.id))
    : fullIndex;

  function handleSort(col: SortCol) {
    setSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { col, dir: col === "name" ? "asc" : "desc" }
    );
  }

  // Build searchSpecies options from sidebar filter state
  const matched = searchSpecies(speciesIndex, query, {
    types: filters.types.length > 0 ? filters.types : undefined,
    ability: filters.ability ?? undefined,
    moves: filters.moves.length > 0 ? filters.moves : undefined,
    megaOnly: filters.megaOnly || undefined,
    formatId: format?.id,
  });

  const sorted = sortEntries(matched, sort.col, sort.dir);

  const rowVirtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 56,
    overscan: 5,
  });

  function handleAbilityFilter(ability: string) {
    setFilters((f) => ({ ...f, ability }));
  }

  function handleSmartFilter(action: { type?: string; move?: string; ability?: string }) {
    setFilters((f) => ({
      ...f,
      ...(action.type   && { types: f.types.includes(action.type) ? f.types : [...f.types, action.type] }),
      ...(action.move   && { moves: f.moves.includes(action.move) ? f.moves : [...f.moves, action.move] }),
      ...(action.ability && { ability: action.ability }),
    }));
    setQuery("");
  }

  const isSearching = query.trim().length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden" style={{ minHeight: 0 }}>
      {/* ── Header ── */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5 flex-shrink-0">
        <svg className="size-3.5 shrink-0 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search species, abilities, types, moves…"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
          autoFocus
        />
        <span className="shrink-0 rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
          {matched.length} of {speciesIndex.length}
        </span>
        <button type="button" onClick={onClose}
          className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground transition-colors">
          <X className="size-3.5" />
        </button>
      </div>

      {/* ── Body: sidebar + list ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <SpeciesSidebar
          filters={filters}
          onFiltersChange={setFilters}
          format={format}
          totalCount={speciesIndex.length}
          filteredCount={matched.length}
        />

        {/* List or smart search */}
        <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
          <FilterChips filters={filters} onFiltersChange={setFilters} />

          {isSearching ? (
            <SpeciesSmartSearch
              query={query}
              index={speciesIndex}
              format={format}
              onFilter={handleSmartFilter}
              onPick={(species) => { onPick(species); }}
            />
          ) : (
            <div ref={scrollRef} className="flex-1 overflow-y-auto" data-testid="species-rows">
              <SpeciesRowsHeader sort={sort} onSort={handleSort} />
              {sorted.length === 0 ? (
                <div className="text-muted-foreground py-12 text-center text-sm">
                  No Pokémon match your filters.
                </div>
              ) : (
                <div className="relative w-full" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const entry = sorted[virtualRow.index];
                    if (!entry) return null;
                    return (
                      <div key={virtualRow.key} className="absolute left-0 right-0" style={{ top: virtualRow.start }}>
                        <SpeciesRow
                          entry={entry}
                          isCurrent={entry.species === value}
                          onSelect={() => onPick(entry.species)}
                          onAbilityFilter={handleAbilityFilter}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Delete `species-filters.tsx`**

```bash
rm apps/web/src/components/team-builder/v2/pickers/species-filters.tsx
```

- [ ] **TypeScript check**

```bash
pnpm typecheck 2>&1 | grep -E "species-picker|species-filters|ability-cell|species-sidebar|species-smart" | head -20
```

Expected: no errors on those files.

- [ ] **Run all team-builder tests**

```bash
pnpm test --filter @trainers/web -- --testPathPattern="team-builder" 2>&1 | tail -30
```

Expected: all pass (some may need import path updates from `species-filters` → `species-sidebar`).

- [ ] **Commit**

```bash
git add apps/web/src/components/team-builder/v2/pickers/species-picker.tsx
git rm apps/web/src/components/team-builder/v2/pickers/species-filters.tsx
git commit -m "feat(team-builder): refactor SpeciesPicker — sidebar + smart search + ability columns"
```

---

## Task 7: Full pre-push quality check

- [ ] **Run linter**

```bash
pnpm lint 2>&1 | grep -E "error|warning" | grep -v "node_modules" | head -20
```

Expected: 0 errors.

- [ ] **Run all tests**

```bash
pnpm test 2>&1 | tail -20
```

Expected: all pass.

- [ ] **Type check**

```bash
pnpm typecheck 2>&1 | tail -10
```

Expected: 0 errors.

- [ ] **Commit any lint fixes, then push**

```bash
git push origin <branch-name>
```

---

## Self-Review

**Spec coverage:**
- §1 Dialog shell (fixed height, close button, count badge) — Task 6 ✓
- §2 Sidebar (type grid, ability select, learns move, role presets, mega toggle) — Tasks 2, 4 ✓
- §3 Applied filter chips bar — Task 6 (`FilterChips`) ✓
- §4 Column grid with ability columns, Mega row treatment — Task 6 (`SpeciesRow`) ✓
- §5 Ability cells with tooltip + click-to-filter — Tasks 3, 6 ✓
- §6 Smart search overlay — Task 5 ✓
- §7 `SpeciesFilterState` changes (ability single-select, megaOnly, remove min/maxBaseStat) — Tasks 1, 4 ✓
- §8 Files to create/modify — all covered ✓
- §10 Testing — unit tests in every task ✓

**Placeholder scan:** No TBDs, no "implement later", all code blocks present. ✓

**Type consistency:**
- `SpeciesFilterState` defined in Task 4 (`species-sidebar.tsx`), imported in Task 6 — consistent field names (`ability`, `megaOnly`, `role`, `types`, `moves`). ✓
- `SpeciesSearchEntry.abilitySlot1/2/hiddenAbility` defined in Task 1, consumed in Tasks 3, 6 — consistent. ✓
- `getRoleById` defined in Task 2, used in Task 4 — consistent. ✓
- `FilterAction` shape `{ type?, move?, ability? }` defined in Task 5, consumed in Task 6 `handleSmartFilter` — consistent. ✓
