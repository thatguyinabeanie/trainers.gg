# Species Picker Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the SpeciesPicker's dropdown-based filters with a persistent 3-column layout (left: type/ability/moves + Mega, middle: grouped role presets, right: species list), add per-slot ability columns with hover tooltips and click-to-filter, and a Showdown-style smart search overlay.

**Architecture:** The existing `SpeciesPicker` and `SpeciesFilters` components are gutted and replaced with four new focused files: `species-roles.ts` (data registry), `species-sidebar.tsx` (left + middle panels), `ability-cell.tsx` (single ability column cell), and `species-smart-search.tsx` (search overlay). The `SpeciesPicker` is refactored to compose these pieces and update its column grid. The `@trainers/pokemon` `searchSpecies` function gains an `ability` (single string) and `megaOnly` (boolean) filter; `SpeciesSearchEntry` gains named ability slots.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, shadcn/ui Tooltip (Base UI), `@tanstack/react-virtual`, `@trainers/pokemon` (Dex, searchSpecies, getAbilityShortDesc, isChampionsFormat, ALL_TYPES, getMoveData)

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| **Modify** | `packages/pokemon/src/species-search.ts` | Add `abilitySlot1/2/hidden` to `SpeciesSearchEntry`; add `ability` + `megaOnly` to `searchSpecies` options; add `getAllLegalAbilities` + `getAllLegalMoves` enumerators |
| **Modify** | `packages/pokemon/src/index.ts` | Export the new helpers |
| **Modify** | `packages/pokemon/src/__tests__/species-search.test.ts` | Update for new `SpeciesSearchEntry` shape + new filter options + new helpers |
| **Create** | `apps/web/src/components/team-builder/v2/pickers/filter-state.ts` | `SpeciesFilterState` interface + `DEFAULT_SIDEBAR_FILTERS` constant (extracted to break the sidebar↔role-expansion import cycle) |
| **Create** | `apps/web/src/components/team-builder/v2/pickers/species-roles.ts` | Role preset registry — all 18 presets with group, moves, abilities |
| **Create** | `apps/web/src/components/team-builder/v2/pickers/role-expansion.ts` | Pure helper `applyRole(filters, nextId, userMoves)` for role → filter expansion (replace-within-group / stack-across-group) |
| **Create** | `apps/web/src/components/team-builder/v2/pickers/ability-cell.tsx` | Single ability table cell with shadcn Tooltip + click-to-filter |
| **Create** | `apps/web/src/components/team-builder/v2/pickers/species-sidebar.tsx` | Left panel (type/ability combobox/learns move/mega + team-needs hints) + right panel (role presets) |
| **Create** | `apps/web/src/components/team-builder/v2/pickers/species-smart-search.tsx` | Search overlay shown when query is non-empty |
| **Modify** | `apps/web/src/components/team-builder/v2/pickers/species-picker.tsx` | Wire up new sidebar + smart search; update column grid + headers; switch row from `<button>` to `<div role="row">`; add Mega row styles; add Enter-to-apply-top-filter shortcut |
| **Delete** | `apps/web/src/components/team-builder/v2/pickers/species-filters.tsx` | All logic migrated |
| **Modify** | `apps/web/src/components/team-builder/v2/__tests__/species-picker.test.tsx` | Migrate fixtures to new `SpeciesSearchEntry` shape; add click-to-filter and Enter-to-apply integration tests |
| **Create** | `apps/web/src/components/team-builder/v2/__tests__/role-expansion.test.ts` | Replace/stack semantics for role activation/deactivation |
| **Create** | `apps/web/src/components/team-builder/v2/__tests__/ability-cell.test.tsx` | Click-to-filter callback, em-dash for null, hidden styling |
| **Create** | `apps/web/src/components/team-builder/v2/__tests__/species-sidebar.test.tsx` | Filter state changes, role expansion, Mega toggle, clear all, ability combobox |
| **Create** | `apps/web/src/components/team-builder/v2/__tests__/species-smart-search.test.tsx` | Categorized results, Filter/Select buttons |
| **Create** | `apps/web/src/components/team-builder/v2/__tests__/species-roles.test.ts` | Registry shape, group ordering, getRoleById |

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

// megaOnly — base species that HAVE a Mega form (not the Mega entries themselves).
// Players select the base species in the picker and pick a Mega Stone item to
// trigger Mega Evolution. So we filter to species where getMegaStoneForSpecies
// returns a non-null mega stone — and we exclude the *-Mega entries themselves
// (those are the *result* forms, not pickable starting points).
if (options?.megaOnly) {
  if (entry.species.includes("-Mega")) return false;
  if (getMegaStoneForSpecies(entry.species) === null) return false;
}
```

Add the import at the top of `species-search.ts` (next to the existing `@pkmn/dex` imports):

```ts
import { getMegaStoneForSpecies } from "./items";
```

(`getMegaStoneForSpecies` already exists in `packages/pokemon/src/items.ts` and is exported from the package barrel — verify with `grep -n "getMegaStoneForSpecies" packages/pokemon/src/items.ts packages/pokemon/src/index.ts`.)

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

  it("megaOnly excludes -Mega entries themselves", () => {
    const results = searchSpecies(index, "", { megaOnly: true });
    expect(results.every(e => !e.species.includes("-Mega"))).toBe(true);
  });

  it("megaOnly includes base species that have a Mega form", () => {
    // Use a Champions Reg M-A index since that's where Megas matter
    const championsIndex = buildSpeciesSearchIndex("championsvgc2026regma");
    const results = searchSpecies(championsIndex, "", { megaOnly: true });
    expect(results.length).toBeGreaterThan(0);
    // Charizard has Mega forms (X and Y) — should be included
    expect(results.some(e => e.species === "Charizard")).toBe(true);
  });

  it("SpeciesSearchEntry has named ability slots", () => {
    const incineroar = index.find(e => e.species === "Incineroar");
    expect(incineroar).toBeDefined();
    expect(incineroar!.abilitySlot1).toBe("Blaze");
    expect(incineroar!.hiddenAbility).toBe("Intimidate");
  });
});
```

- [ ] **Migrate existing `SpeciesSearchEntry` fixtures**

The existing `species-picker.test.tsx` builds entries with `makeEntry({ species, types, abilities, baseStats, bst })`. Update its factory so every entry has the new fields. In `apps/web/src/components/team-builder/v2/__tests__/species-picker.test.tsx`, find the `makeEntry` helper and add the three new fields:

```ts
function makeEntry(overrides: Partial<{
  species: string;
  types: string[];
  abilities: string[];
  abilitySlot1: string | null;
  abilitySlot2: string | null;
  hiddenAbility: string | null;
  baseStats: Record<string, number>;
  bst: number;
}> = {}) {
  const abilities = overrides.abilities ?? ["Pressure"];
  return {
    species: "Garchomp",
    types: ["Dragon", "Ground"],
    abilities,
    abilitySlot1: overrides.abilitySlot1 ?? abilities[0] ?? null,
    abilitySlot2: overrides.abilitySlot2 ?? abilities[1] ?? null,
    hiddenAbility: overrides.hiddenAbility ?? abilities[2] ?? null,
    baseStats: { hp: 108, atk: 130, def: 95, spa: 80, spd: 85, spe: 102 },
    bst: 600,
    ...overrides,
  };
}
```

Run `grep -rn "abilities:" apps/web/src/components/team-builder/v2/__tests__ | grep -v "\.tsx:" | head` to find any remaining inline fixtures and update them.

- [ ] **Run tests**

```bash
pnpm test --filter @trainers/pokemon -- --testPathPattern="species-search" 2>&1 | tail -20
```

Expected: all pass (including updated existing tests which still use `abilities: string[]`).

- [ ] **Commit**

```bash
git add packages/pokemon/src/species-search.ts packages/pokemon/src/__tests__/species-search.test.ts apps/web/src/components/team-builder/v2/__tests__/species-picker.test.tsx
git commit -m "feat(pokemon): add abilitySlot1/2/hidden to SpeciesSearchEntry; add ability+megaOnly filters to searchSpecies"
```

---

## Task 1.5: Format-wide ability and move enumerators

**Files:**
- Modify: `packages/pokemon/src/species-search.ts`
- Modify: `packages/pokemon/src/index.ts` (export the new helpers)
- Modify: `packages/pokemon/src/__tests__/species-search.test.ts`

The sidebar's Ability combobox needs every ability legal in the active format. The smart-search overlay needs every move legal in the active format. Walking the index per render is wasteful — we cache one set per format, built lazily.

- [ ] **Add the helpers to `species-search.ts`**

Append after `searchSpecies`:

```ts
// =============================================================================
// Format-wide ability + move enumerators (cached)
// =============================================================================

const abilitySetCache = new Map<string, string[]>();
const moveSetCache = new Map<string, string[]>();

/**
 * Returns every ability that any species legal in this format can have,
 * across all three slots. Sorted alphabetically. Cached per format.
 */
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

/**
 * Returns every move that any species legal in this format can learn.
 * Sorted alphabetically. Cached per format.
 *
 * Note: this aggregates `getLearnableMoves(species, formatId)` across the
 * full index, which is O(species × moves) on first call. Subsequent calls
 * hit the cache. Build is deferred until first use so the picker open path
 * is unaffected.
 */
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

`getLearnableMoves` is already imported in this file (it's used by `getLowercaseLegalMoves`). If not, add `import { getLearnableMoves } from "./format-legality";` to the existing imports.

- [ ] **Export from the package barrel**

In `packages/pokemon/src/index.ts`, find the existing `export { ... } from "./species-search";` block and add the two new names:

```ts
export {
  buildSpeciesSearchIndex,
  searchSpecies,
  getAllLegalAbilities,
  getAllLegalMoves,
  type SpeciesSearchEntry,
} from "./species-search";
```

(Keep the existing exports — only add the two new ones.)

- [ ] **Write tests**

In `packages/pokemon/src/__tests__/species-search.test.ts`, add:

```ts
describe("getAllLegalAbilities / getAllLegalMoves", () => {
  it("getAllLegalAbilities returns sorted unique abilities for the format", () => {
    const abilities = getAllLegalAbilities("gen9vgc2026regg");
    expect(abilities.length).toBeGreaterThan(50);
    expect([...abilities]).toEqual([...abilities].sort((a, b) => a.localeCompare(b)));
    expect(new Set(abilities).size).toBe(abilities.length);
    expect(abilities).toContain("Intimidate");
  });

  it("getAllLegalAbilities is cached — second call returns the same array reference", () => {
    const a = getAllLegalAbilities("gen9vgc2026regg");
    const b = getAllLegalAbilities("gen9vgc2026regg");
    expect(a).toBe(b);
  });

  it("getAllLegalMoves returns sorted unique move names", () => {
    const moves = getAllLegalMoves("gen9vgc2026regg");
    expect(moves.length).toBeGreaterThan(100);
    expect([...moves]).toEqual([...moves].sort((a, b) => a.localeCompare(b)));
    expect(moves).toContain("Tailwind");
    expect(moves).toContain("Fake Out");
  });
});
```

(Add the two new symbols to the test file's `import { ... } from "../species-search"` line.)

- [ ] **Run tests**

```bash
pnpm test --filter @trainers/pokemon -- --testPathPattern="species-search" 2>&1 | tail -15
```

Expected: all pass.

- [ ] **Commit**

```bash
git add packages/pokemon/src/species-search.ts packages/pokemon/src/index.ts packages/pokemon/src/__tests__/species-search.test.ts
git commit -m "feat(pokemon): add getAllLegalAbilities + getAllLegalMoves enumerators"
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

// Tooltip mock — strip the tooltip content entirely so the trigger-side text
// is the only place the ability name appears. The real tooltip is hover-only
// and tested via integration; we just need the trigger semantics here.
jest.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children, render: r }: { children: React.ReactNode; render?: React.ReactElement }) =>
    r ? React.cloneElement(r, {}, children) : <span>{children}</span>,
  TooltipContent: () => null,  // hidden in tests so getByText is unambiguous
}));

import { AbilityCell } from "../pickers/ability-cell";

describe("AbilityCell", () => {
  it("renders ability name", () => {
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

  it("renders italic styling for hidden slot", () => {
    render(<AbilityCell name="Intimidate" slot="hidden" />);
    const span = screen.getByText("Intimidate");
    expect(span.className).toMatch(/italic/);
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
- Create: `apps/web/src/components/team-builder/v2/pickers/filter-state.ts` (`SpeciesFilterState` interface + `DEFAULT_SIDEBAR_FILTERS` — extracted to break the `species-sidebar` ↔ `role-expansion` cycle)
- Create: `apps/web/src/components/team-builder/v2/pickers/role-expansion.ts` (pure helper for role → filter expansion)
- Create: `apps/web/src/components/team-builder/v2/pickers/species-sidebar.tsx`
- Create: `apps/web/src/components/team-builder/v2/__tests__/role-expansion.test.ts`
- Create: `apps/web/src/components/team-builder/v2/__tests__/species-sidebar.test.tsx`

The sidebar renders two panels side by side: left (160px: Type, Ability combobox, Mega toggle, Learns Move, "team needs" hints) and right (152px: Role presets grouped). It owns the `SpeciesFilterState` shape as a re-export so `SpeciesPicker` can import it from one place.

### Role expansion semantics

When the user clicks a role preset, we replace any role *from the same group* and stack with roles from *other groups*. The role's `moves` and `abilities` arrays are then expanded into the active `filters.moves` and `filters.ability`:

- `moves`: union — the selected role's moves are added to `filters.moves` (no removal of moves not from the role; user-added moves stay)
- `abilities`: a role can specify zero or one ability hint (the spec only has `Intimidate` for `atk-drop`). If the role has an ability, set `filters.ability` to it. Selecting another role with no ability does *not* clear it.
- Toggling the same role off: remove the role's moves from `filters.moves` (only the moves that came from the role; preserve any move the user added independently). Clear `filters.ability` only if it equals the role's ability.

To make "remove what the role added" tractable, we track which moves came from the active role separately. Implementation: extract a pure helper `applyRole(filters, presetId | null)` that takes the current filter state plus the *new* role id (or null to deactivate) and returns the next filter state. The helper assumes the previous role can be looked up via `filters.role`.

### Step 0: Extract filter state types

- [ ] **Create `filter-state.ts`**

```ts
// apps/web/src/components/team-builder/v2/pickers/filter-state.ts

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
```

(No tests — these are bare types/constants. They will be consumed by `role-expansion.ts`, `species-sidebar.tsx`, and `species-picker.tsx`.)

### Step A: role expansion helper (pure function, TDD)

- [ ] **Write failing tests for `applyRole`**

```ts
// apps/web/src/components/team-builder/v2/__tests__/role-expansion.test.ts
import { DEFAULT_SIDEBAR_FILTERS } from "../pickers/filter-state";
import { applyRole } from "../pickers/role-expansion";

describe("applyRole", () => {
  it("activating a role from no role adds its moves and ability", () => {
    const next = applyRole(DEFAULT_SIDEBAR_FILTERS, "atk-drop");
    expect(next.role).toBe("atk-drop");
    expect(next.moves).toEqual(expect.arrayContaining(["Charm", "Parting Shot"]));
    expect(next.ability).toBe("Intimidate");
  });

  it("activating a role with no ability does not change ability", () => {
    const start = { ...DEFAULT_SIDEBAR_FILTERS, ability: "Drought" };
    const next = applyRole(start, "tailwind");
    expect(next.role).toBe("tailwind");
    expect(next.ability).toBe("Drought");
    expect(next.moves).toContain("Tailwind");
  });

  it("switching role within the same group removes the prior role's moves", () => {
    const a = applyRole(DEFAULT_SIDEBAR_FILTERS, "tailwind");
    const b = applyRole(a, "trick-room");
    expect(b.role).toBe("trick-room");
    expect(b.moves).not.toContain("Tailwind");
    expect(b.moves).toContain("Trick Room");
  });

  it("switching role across groups stacks moves from both", () => {
    const a = applyRole(DEFAULT_SIDEBAR_FILTERS, "tailwind");        // Speed
    const b = applyRole(a, "fake-out");                              // Offensive Support
    expect(b.role).toBe("fake-out");
    expect(b.moves).toContain("Tailwind");  // prior speed role's moves stay
    expect(b.moves).toContain("Fake Out");
  });

  it("deactivating a role (toggle off) removes its moves and clears its ability", () => {
    const a = applyRole(DEFAULT_SIDEBAR_FILTERS, "atk-drop");
    expect(a.ability).toBe("Intimidate");
    const b = applyRole(a, null);
    expect(b.role).toBeNull();
    expect(b.moves).not.toContain("Charm");
    expect(b.ability).toBeNull();
  });

  it("does not remove a move that the user added independently", () => {
    const userAdded = { ...DEFAULT_SIDEBAR_FILTERS, moves: ["Tailwind"] };
    const a = applyRole(userAdded, "tailwind");           // role moves include Tailwind
    const b = applyRole(a, null);                          // deactivate role
    // Tailwind should remain because the user had it before the role activated
    expect(b.moves).toContain("Tailwind");
  });

  it("preserves user's manually-set ability when deactivating a role", () => {
    const userAdded = { ...DEFAULT_SIDEBAR_FILTERS, ability: "Drought" };
    const a = applyRole(userAdded, "tailwind");           // tailwind has no ability
    const b = applyRole(a, null);
    expect(b.ability).toBe("Drought");
  });
});
```

- [ ] **Run — expect FAIL** (`Cannot find module '../pickers/role-expansion'`)

- [ ] **Implement `role-expansion.ts`**

```ts
// apps/web/src/components/team-builder/v2/pickers/role-expansion.ts
import { type SpeciesFilterState } from "./filter-state";
import { getRoleById } from "./species-roles";

/**
 * Apply (or deactivate) a role preset to a filter state.
 *
 * - Activating a role:
 *   - If a role from the same group is currently active, remove its moves first
 *     (replace-within-group semantics).
 *   - Add the new role's moves to filters.moves (union; preserves user-added moves).
 *   - If the new role has an ability hint, overwrite filters.ability.
 * - Deactivating a role (id === null):
 *   - Remove the prior role's moves *unless* they were also present before the
 *     role was activated (heuristic: if the move appears in another active
 *     filter source, keep it). Since we don't track provenance per move, we
 *     fall back to: remove the role's moves only if they aren't covered by
 *     another currently-active role.
 *   - Clear filters.ability only if it equals the prior role's ability hint.
 *
 * The "preserve user-added moves" guarantee in the toggle-off test relies on
 * this approximation: a move is preserved across deactivation iff (a) it is
 * also a move of another active role OR (b) it was already in filters.moves
 * before the role was activated. Since we only track the *current* role id,
 * we approximate (b) by checking whether the move appears in a SUPER-set we
 * compute by passing through the activation path. In practice, callers
 * should snapshot user-added moves separately if precise undo is needed.
 *
 * For the picker UI, this approximation is fine: users mostly toggle one role
 * on, then either replace within group or stack across groups. The toggle-off
 * case is rare and the worst case is "moves stay until Clear all".
 */
export function applyRole(
  current: SpeciesFilterState,
  nextRoleId: string | null
): SpeciesFilterState {
  const prevRole = current.role ? getRoleById(current.role) : null;
  const nextRole = nextRoleId ? getRoleById(nextRoleId) : null;

  // Removing the previous role's moves — but only those NOT in the new role.
  let moves = [...current.moves];
  if (prevRole?.moves) {
    const keepMoves = new Set(nextRole?.moves ?? []);
    moves = moves.filter(
      (m) => !prevRole.moves!.includes(m) || keepMoves.has(m)
    );
  }

  // Adding the new role's moves (union)
  if (nextRole?.moves) {
    for (const m of nextRole.moves) {
      if (!moves.includes(m)) moves.push(m);
    }
  }

  // Ability: overwrite if new role specifies one; clear if deactivating and
  // current ability matches the prev role's ability.
  let ability = current.ability;
  if (nextRole?.abilities && nextRole.abilities.length > 0) {
    ability = nextRole.abilities[0]!;
  } else if (!nextRole && prevRole?.abilities?.includes(ability ?? "")) {
    ability = null;
  }

  return {
    ...current,
    role: nextRoleId,
    moves,
    ability,
  };
}
```

- [ ] **Run tests — expect ALL PASS**

```bash
pnpm test --filter @trainers/web -- --testPathPattern="role-expansion" 2>&1 | tail -15
```

Note: the "preserves user-added moves on toggle-off" test passes only because `applyRole(userAdded, "tailwind")` passes through the `prevRole = null` path (no prior role's moves to remove), so `Tailwind` is preserved when the role is later turned off — because the prevRole *is* tailwind whose moves include Tailwind, and we remove it. **This contradicts the test.**

Fix: the helper needs an explicit "user-added moves" snapshot. Update the API:

```ts
export function applyRole(
  current: SpeciesFilterState,
  nextRoleId: string | null,
  /** Moves the user added outside of any role (preserved across toggles). */
  userMoves: string[] = []
): SpeciesFilterState {
  // ... same logic, but the final filter step:
  moves = moves.filter(
    (m) => !prevRole?.moves?.includes(m) || keepMoves.has(m) || userMoves.includes(m)
  );
  // (and the move-add step is unchanged)
}
```

Then `SpeciesSidebar` tracks a `userMoves` ref of moves the user added directly via the input/quick-pick (NOT via role activation), and passes it to `applyRole`. Update the test to pass `userMoves: ["Tailwind"]` in that one case.

- [ ] **Update the test for the new signature**

```ts
it("does not remove a user-added move that overlaps a role's moves", () => {
  const userAdded = { ...DEFAULT_SIDEBAR_FILTERS, moves: ["Tailwind"] };
  const a = applyRole(userAdded, "tailwind", ["Tailwind"]);  // user had Tailwind
  const b = applyRole(a, null, ["Tailwind"]);
  expect(b.moves).toContain("Tailwind");
});
```

- [ ] **Re-run — expect ALL PASS**

- [ ] **Commit role helper alone before tackling the sidebar**

```bash
git add apps/web/src/components/team-builder/v2/pickers/role-expansion.ts \
        apps/web/src/components/team-builder/v2/__tests__/role-expansion.test.ts
git commit -m "feat(team-builder): add applyRole helper for sidebar role expansion"
```

### Step B: SpeciesSidebar component

- [ ] **Write failing tests**

```tsx
// apps/web/src/components/team-builder/v2/__tests__/species-sidebar.test.tsx
"use client";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

jest.mock("@trainers/pokemon", () => ({
  ALL_TYPES: ["Fire", "Water", "Grass"],
  isChampionsFormat: jest.fn((f: unknown) => (f as { id?: string })?.id === "championsvgc2026regma"),
  getAllLegalAbilities: jest.fn(() => ["Drought", "Drizzle", "Intimidate"]),
  calculateTeamSynergy: jest.fn(() => null),
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

const championsFormat = { id: "championsvgc2026regma" } as never;
const noFormat = undefined;

function renderSidebar(overrides: Record<string, unknown> = {}) {
  return render(
    <SpeciesSidebar
      filters={DEFAULT_SIDEBAR_FILTERS}
      onFiltersChange={noop}
      format={noFormat}
      currentTeam={[]}
      totalCount={274}
      filteredCount={274}
      {...overrides}
    />
  );
}

describe("SpeciesSidebar", () => {
  it("renders all type chips from ALL_TYPES", () => {
    renderSidebar();
    expect(screen.getByText("Fire")).toBeInTheDocument();
    expect(screen.getByText("Water")).toBeInTheDocument();
    expect(screen.getByText("Grass")).toBeInTheDocument();
  });

  it("clicking a type chip calls onFiltersChange with that type added", async () => {
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
    renderSidebar({
      filters: { ...DEFAULT_SIDEBAR_FILTERS, types: ["Fire"] },
      onFiltersChange: onChange,
    });
    await user.click(screen.getByText("Fire"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ types: [] })
    );
  });

  it("does NOT show Mega toggle for non-Champions formats", () => {
    renderSidebar({ format: noFormat });
    expect(screen.queryByText("Mega only")).not.toBeInTheDocument();
  });

  it("shows Mega toggle for Champions M-A format", () => {
    renderSidebar({ format: championsFormat });
    expect(screen.getByText("Mega only")).toBeInTheDocument();
  });

  it("Clear all resets to DEFAULT_SIDEBAR_FILTERS", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderSidebar({
      filters: { ...DEFAULT_SIDEBAR_FILTERS, types: ["Fire"], role: "tailwind" },
      onFiltersChange: onChange,
    });
    await user.click(screen.getByRole("button", { name: /clear/i }));
    expect(onChange).toHaveBeenCalledWith(DEFAULT_SIDEBAR_FILTERS);
  });

  it("selecting a role expands its moves into filters.moves", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderSidebar({ onFiltersChange: onChange });
    await user.click(screen.getByText("Tailwind"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ role: "tailwind", moves: ["Tailwind"] })
    );
  });

  it("selecting a role with an ability hint sets filters.ability", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderSidebar({ onFiltersChange: onChange });
    await user.click(screen.getByText("Atk Drop"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ role: "atk-drop", ability: "Intimidate" })
    );
  });

  it("clicking the active role toggles it off", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderSidebar({
      filters: { ...DEFAULT_SIDEBAR_FILTERS, role: "tailwind", moves: ["Tailwind"] },
      onFiltersChange: onChange,
    });
    await user.click(screen.getByText("Tailwind"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ role: null })
    );
  });

  it("ability combobox lists abilities from getAllLegalAbilities", () => {
    renderSidebar({ format: { id: "gen9vgc2026regg" } as never });
    // The datalist should contain Intimidate
    expect(screen.getByText("Intimidate", { selector: "option" })).toBeInTheDocument();
  });

  it("typing into the ability combobox calls onFiltersChange when matched", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderSidebar({ onFiltersChange: onChange });
    const input = screen.getByPlaceholderText(/Any ability/i);
    await user.type(input, "Intimidate");
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ ability: "Intimidate" })
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

import { useMemo, useRef } from "react";

import {
  ALL_TYPES,
  calculateTeamSynergy,
  getAllLegalAbilities,
  isChampionsFormat,
  type GameFormat,
} from "@trainers/pokemon";

import { cn } from "@/lib/utils";

import {
  DEFAULT_SIDEBAR_FILTERS,
  type SpeciesFilterState,
} from "./filter-state";
import { applyRole } from "./role-expansion";
import {
  ROLE_PRESETS,
  ROLE_GROUP_ORDER,
  ROLE_GROUP_LABELS,
  type RoleGroup,
} from "./species-roles";

// Re-export so `species-picker.tsx` can grab everything from one entry point
export {
  DEFAULT_SIDEBAR_FILTERS,
  type SpeciesFilterState,
} from "./filter-state";

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
  format: GameFormat | undefined;
  /** Sibling species on the team — drives "team needs" synergy hints */
  currentTeam: Array<{ species: string }>;
  totalCount: number;
  filteredCount: number;
}

// =============================================================================
// SpeciesSidebar
// =============================================================================

export function SpeciesSidebar({
  filters,
  onFiltersChange,
  format,
  currentTeam,
  totalCount: _totalCount,
  filteredCount: _filteredCount,
}: SpeciesSidebarProps) {
  const showMega = isChampionsFormat(format);

  // Track moves the user added directly (not via role activation) so applyRole
  // can preserve them across role toggles. The ref is updated whenever the user
  // adds/removes moves through the input or quick-picks — NOT when applyRole adds.
  const userMovesRef = useRef<string[]>(filters.moves.filter((m) => {
    // On first mount, treat any moves NOT contributed by the active role as user-added
    if (!filters.role) return true;
    const role = ROLE_PRESETS.find((r) => r.id === filters.role);
    return !role?.moves?.includes(m);
  }));

  // List of abilities legal in this format — drives the datalist
  const legalAbilities = useMemo(
    () => (format?.id ? getAllLegalAbilities(format.id) : []),
    [format?.id]
  );

  // Team synergy: types the team is weak to ≥2× and not yet covered
  const synergy = currentTeam.length > 0 ? calculateTeamSynergy(currentTeam) : null;
  const neededTypes = synergy
    ? (ALL_TYPES as readonly string[]).filter((type) => {
        const weakCount = synergy.sharedWeaknesses[type as never] ?? 0;
        return weakCount >= 2 && synergy.uncoveredTypes.has(type as never);
      })
    : [];

  function toggleType(type: string) {
    const next = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    onFiltersChange({ ...filters, types: next });
  }

  function setAbility(ability: string) {
    // Only commit when the typed value matches an actual legal ability — otherwise
    // store the partial string so the user can keep typing, but the search treats
    // it as no-match.
    onFiltersChange({ ...filters, ability: ability.trim() || null });
  }

  function addMove(move: string) {
    const trimmed = move.trim();
    if (!trimmed || filters.moves.includes(trimmed)) return;
    if (!userMovesRef.current.includes(trimmed)) {
      userMovesRef.current = [...userMovesRef.current, trimmed];
    }
    onFiltersChange({ ...filters, moves: [...filters.moves, trimmed] });
  }

  function removeMove(move: string) {
    userMovesRef.current = userMovesRef.current.filter((m) => m !== move);
    onFiltersChange({ ...filters, moves: filters.moves.filter((m) => m !== move) });
  }

  function selectRole(id: string) {
    const nextId = filters.role === id ? null : id;
    onFiltersChange(applyRole(filters, nextId, userMovesRef.current));
  }

  function clearAll() {
    userMovesRef.current = [];
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

          {/* Team-needs hints — types the current team is weak to and uncovered */}
          {neededTypes.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1">
              <span className="text-[9px] text-muted-foreground">Team needs:</span>
              {neededTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleType(type)}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[9px] font-bold transition-opacity",
                    filters.types.includes(type)
                      ? (TYPE_BG[type] ?? "bg-muted text-foreground")
                      : cn(TYPE_BG[type] ?? "bg-muted text-foreground", "opacity-60 hover:opacity-100")
                  )}
                >
                  ✦ {type}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Ability — combobox: typed value with datalist of all legal abilities */}
        <div className="border-b border-border/60 p-2.5">
          <span className="mb-1.5 block text-[8.5px] font-bold uppercase tracking-widest text-muted-foreground">Ability</span>
          <input
            list="species-picker-abilities"
            type="text"
            value={filters.ability ?? ""}
            onChange={(e) => setAbility(e.target.value)}
            placeholder="Any ability…"
            className="h-7 w-full rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-primary"
          />
          <datalist id="species-picker-abilities">
            {legalAbilities.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
          {!filters.ability && (
            <p className="mt-1 text-[9px] text-muted-foreground">Click any ability in the table to filter</p>
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
  getAllLegalMoves: jest.fn(() => ["Tailwind", "Trick Room", "Fire Blast", "Fire Punch"]),
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

import { useMemo } from "react";

import {
  ALL_TYPES,
  getAbilityShortDesc,
  getAllLegalMoves,
  type GameFormat,
  type SpeciesSearchEntry,
} from "@trainers/pokemon";

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

export function SpeciesSmartSearch({
  query,
  index,
  format,
  onFilter,
  onPick,
}: SpeciesSmartSearchProps) {
  const q = query.toLowerCase();

  // Types
  const matchedTypes = (ALL_TYPES as readonly string[]).filter((t) =>
    t.toLowerCase().includes(q)
  ).slice(0, MAX_PER_CATEGORY);

  // Moves — pulled from the format's full legal-move set (cached in @trainers/pokemon)
  const allMoves = useMemo(
    () => (format?.id ? getAllLegalMoves(format.id) : []),
    [format?.id]
  );
  const matchedMoves = allMoves.filter((m) =>
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
  getAllLegalAbilities,
  getAllLegalMoves,
  isLegalSpecies,
  searchSpecies,
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

  // Use a div with role="row" + tabIndex so we can have nested clickable
  // ability cells. <button> inside <button> is invalid HTML and triggers
  // hydration warnings.
  function handleKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    }
  }

  return (
    <div
      role="row"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKey}
      aria-label={`Select ${entry.species}`}
      className={cn(
        "hover:bg-muted/60 focus-visible:bg-muted/60 grid w-full cursor-pointer items-center gap-3 border-b px-4 py-2 text-left transition-colors outline-none",
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

      {/* Ability cells — onClick stopPropagation so they don't trigger row select */}
      <div role="presentation" onClick={(e) => e.stopPropagation()} className="min-w-0 overflow-hidden">
        <AbilityCell name={entry.abilitySlot1} slot="slot1" onFilter={onAbilityFilter} />
      </div>
      <div role="presentation" onClick={(e) => e.stopPropagation()} className="min-w-0 overflow-hidden">
        <AbilityCell name={entry.abilitySlot2} slot="slot2" onFilter={onAbilityFilter} />
      </div>
      <div role="presentation" onClick={(e) => e.stopPropagation()} className="min-w-0 overflow-hidden">
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
    </div>
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

export function SpeciesPicker({ value, format, currentTeam = [], onPick, onClose }: SpeciesPickerProps) {
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

  /**
   * Enter on the search input applies the top suggestion if no exact species match.
   * Suggestion priority: exact species > type > move > ability > first species.
   */
  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const q = query.trim();
    if (!q) return;
    e.preventDefault();
    // Exact species match → pick directly
    const exact = speciesIndex.find((entry) => entry.species.toLowerCase() === q.toLowerCase());
    if (exact) { onPick(exact.species); return; }
    // Otherwise apply the top suggestion: type → move → ability
    const lowerQ = q.toLowerCase();
    const topType = (["Normal","Fire","Water","Grass","Electric","Ice","Fighting","Poison","Ground","Flying","Psychic","Bug","Rock","Ghost","Dragon","Dark","Steel","Fairy"] as const)
      .find((t) => t.toLowerCase().includes(lowerQ));
    if (topType) { handleSmartFilter({ type: topType }); return; }
    const topMove = format?.id
      ? getAllLegalMoves(format.id).find((m) => m.toLowerCase().includes(lowerQ))
      : undefined;
    if (topMove) { handleSmartFilter({ move: topMove }); return; }
    const topAbility = format?.id
      ? getAllLegalAbilities(format.id).find((a) => a.toLowerCase().includes(lowerQ))
      : undefined;
    if (topAbility) { handleSmartFilter({ ability: topAbility }); return; }
    // Fallback: first species in the matched list
    const firstSpecies = speciesIndex.find((e) => e.species.toLowerCase().includes(lowerQ));
    if (firstSpecies) onPick(firstSpecies.species);
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
          onKeyDown={handleSearchKeyDown}
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
          currentTeam={currentTeam}
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

- [ ] **Add integration test for click-to-filter and Enter-to-apply-top-filter**

Append to `apps/web/src/components/team-builder/v2/__tests__/species-picker.test.tsx`:

```tsx
describe("SpeciesPicker — click-to-filter and keyboard shortcuts", () => {
  it("clicking an ability in a row sets filters.ability via the sidebar", async () => {
    const user = userEvent.setup();
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        currentTeam={[]}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    // The mock index includes a row with abilitySlot1 = "Drought"
    // After clicking, the ability combobox should reflect it
    const droughtCell = screen.getByText("Drought");
    await user.click(droughtCell);
    const abilityInput = screen.getByPlaceholderText(/Any ability/i) as HTMLInputElement;
    expect(abilityInput.value).toBe("Drought");
  });

  it("Enter on the search input with an exact species name picks that species", async () => {
    const user = userEvent.setup();
    const onPick = jest.fn();
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        currentTeam={[]}
        onPick={onPick}
        onClose={jest.fn()}
      />
    );
    const search = screen.getByPlaceholderText(/Search species/i);
    await user.type(search, "Garchomp{Enter}");
    expect(onPick).toHaveBeenCalledWith("Garchomp");
  });

  it("Enter with a partial type query applies it as a type filter", async () => {
    const user = userEvent.setup();
    render(
      <SpeciesPicker
        value={null}
        format={undefined}
        currentTeam={[]}
        onPick={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const search = screen.getByPlaceholderText(/Search species/i);
    await user.type(search, "drag{Enter}");
    // After Enter, the type chip "Dragon" should be active in the sidebar
    const filterChip = await screen.findByText("Dragon", { selector: "button" });
    expect(filterChip).toBeInTheDocument();
  });
});
```

(The test file already mocks `useVirtualizer`, `Image`, and `@trainers/pokemon` — those mocks remain and just need to be extended to expose `getAllLegalAbilities`, `getAllLegalMoves`, `calculateTeamSynergy`, and `isChampionsFormat` from the existing mock factory.)

- [ ] **Run all team-builder tests**

```bash
pnpm test --filter @trainers/web -- --testPathPattern="team-builder" 2>&1 | tail -30
```

Expected: all pass (some may need import path updates from `species-filters` → `species-sidebar`).

- [ ] **Commit**

```bash
git add apps/web/src/components/team-builder/v2/pickers/species-picker.tsx \
        apps/web/src/components/team-builder/v2/__tests__/species-picker.test.tsx
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
- §2 Sidebar (type grid, ability combobox via datalist, learns move, role presets, mega toggle) — Tasks 2, 4 ✓
- §2.4 Role expansion (moves/abilities into filters; replace-within-group / stack-across-group) — Task 4 (`role-expansion.ts`) ✓
- §2.5 Mega-only filter (Champions M-A only, base species that have a Mega form) — Task 1 (corrected from string-match to `getMegaStoneForSpecies`) ✓
- §3 Applied filter chips bar — Task 6 (`FilterChips`) ✓
- §4 Column grid with ability columns, Mega row treatment — Task 6 (`SpeciesRow` as `<div role="row">`) ✓
- §5 Ability cells with tooltip + click-to-filter — Tasks 3, 6 ✓
- §6 Smart search overlay — Task 5 ✓
- §6 Enter on search applies top filter result — Task 6 (`handleSearchKeyDown`) ✓
- §7 `SpeciesFilterState` changes (ability single-select, megaOnly, remove min/maxBaseStat) — Tasks 1, 4 ✓
- §8 Files to create/modify — all covered ✓
- §10 Testing — unit tests in every task; integration test for click-to-filter and Enter-to-apply ✓

**Preserved behavior (not in original Task 6):**
- Team synergy "✦ Covers Type" hints under the type grid — Task 4 `SpeciesSidebar` ✓
- `currentTeam` prop continues flowing from `IdentityLane` through `SpeciesPicker` to `SpeciesSidebar` ✓

**Placeholder scan:** No TBDs, no "implement later", all code blocks present. ✓

**Accessibility:**
- `SpeciesRow` changed from `<button>` to `<div role="row" tabIndex={0}>` to allow nested clickable ability cells without nested-button validity errors. Keyboard support via `Enter` / `Space`. ✓
- Ability cells use `<span>` with click handler — wrapped in `<div role="presentation" onClick={stopPropagation}>` so they don't trigger row select. ✓

**Type consistency:**
- `SpeciesFilterState` defined in Task 4 (`species-sidebar.tsx`), imported in Tasks 4 (`role-expansion.ts`) and Task 6 — consistent field names (`ability`, `megaOnly`, `role`, `types`, `moves`). ✓
- `SpeciesSearchEntry.abilitySlot1/2/hiddenAbility` defined in Task 1, consumed in Tasks 3, 6 — consistent. ✓
- `applyRole(filters, nextId, userMoves)` signature defined in Task 4 step A, consumed by `selectRole` in Task 4 step B — consistent. ✓
- `getAllLegalAbilities` / `getAllLegalMoves` defined in Task 1.5, consumed in Task 4 (sidebar combobox) and Tasks 5/6 (smart search + Enter shortcut) — consistent. ✓
- `FilterAction` shape `{ type?, move?, ability? }` defined in Task 5, consumed in Task 6 `handleSmartFilter` — consistent. ✓
- `getMegaStoneForSpecies` already exported from `@trainers/pokemon`; verified during Task 1. ✓
