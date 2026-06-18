---
name: adding-a-regulation
description: Use when a new Pokemon Champions regulation has dropped (e.g. Reg M-C) or an existing reg's legal pool has changed — covers the full data-file → registration → flip → test pipeline.
---

# Adding a Champions Regulation

Step-by-step guide for adding a new Champions regulation (e.g. Reg M-C) to the codebase.
All touch-points are in `packages/pokemon/` unless noted. Work top-to-bottom; do not skip steps.

## 1. Source of Truth: Serebii

**Primary source**: `https://www.serebii.net/pokemonchampions/rankedbattle/regulation{x-y}.shtml`
(e.g. `.../regulationm-c.shtml`)

**Workflow**:
1. Open the new reg's page AND the previous reg's page side-by-side.
2. Diff them to isolate the delta (new species, new megas, new items, new abilities).
3. Cross-ref Bulbapedia (`https://bulbapedia.bulbagarden.net/`) for exact spelling of new Megas, stone names, and ability names.
4. Do NOT rely on a single source for item/species counts — Serebii and Bulbapedia can disagree on edge cases. When they differ, verify with an additional source or note the discrepancy in a code comment.

**Capture checklist** (what to harvest from Serebii before touching code):

- [ ] New **legal base species** (PascalCase display names — match existing M-A/M-B convention)
- [ ] New **Mega forms** — forme string pattern: `Base-Mega`, `Base-Mega-X`, `Base-Mega-Y`
- [ ] For each new Mega: its **Mega Stone** name and **post-evolution ability**
- [ ] **Base stats** for every brand-new Champions-exclusive Mega (HP/Atk/Def/SpA/SpD/Spe). Standard Gen 6/7 Megas (Sceptile-Mega, Blaziken-Mega, etc.) fall back to `@pkmn/dex` via `Dex.forGen(6)` — no custom stats needed for those.
- [ ] New **held items** (non-stone items added to the curated pool)
- [ ] New **ability short descriptions** for any ability not in `@pkmn/dex` (brand-new Champions-exclusive abilities)
- [ ] New **type overrides** for Megas whose typing differs from the base form AND is not present in `@pkmn/dex`. Standard Gen 6/7 Megas resolve from the dex — only synthetic Champions Megas with non-obvious type changes need an entry.
- [ ] Any **move overrides** (moves marked `isNonstandard='Past'` in Gen 9 that the format explicitly grants, like Light of Ruin on Floette-Eternal)
- [ ] Any **format-level move/ability bans** (uncommon — M-A and M-B have empty banlists)
- [ ] Any explicit **exclusions** that override the Serebii listing

## 2. Add the Bundle File

Create `packages/pokemon/src/champions-reg-m{x}.ts`. Follow the M-B pattern exactly.

```typescript
/**
 * Champions: VGC 202X Reg M-{X} — self-contained legality bundle.
 *
 * M-{X} is a strict superset of M-{prev}: every species, item, move rule,
 * and ability rule from M-{prev} carries forward unchanged. This file
 * imports `REG_M{PREV}_BUNDLE` and adds the M-{X} delta on top.
 *
 * This file is a LEAF — do NOT import from format-legality or stats-calculator
 * (circular dependency risk).
 */

import {
  type ChampionsRegBundle,
  type MegaStatBlock,
  REG_M{PREV}_BUNDLE,
} from "./champions-reg-m{prev}";

// ── New base species ──────────────────────────────────────────────────────────
const CHAMPIONS_M{X}_NEW_BASE_SPECIES: readonly string[] = [
  "NewSpecies1",
  // …
];

// ── New mega stone entries (declare `as const` — widens the union type) ──────
const MEGA_M{X}_STONE_ENTRIES = [
  ["NewSpecies1-Mega", "NewSpecies1ite"],
  // …
] as const;

// ── New mega ability entries (`as const`) ────────────────────────────────────
const MEGA_M{X}_ABILITY_ENTRIES = [
  ["NewSpecies1-Mega", "AbilityName"],
  // …
] as const;

// ── Derive mega form strings from stone entries ───────────────────────────────
const CHAMPIONS_M{X}_MEGA_FORMS: readonly string[] =
  MEGA_M{X}_STONE_ENTRIES.map(([megaSpecies]) => megaSpecies);

// ── Legal species: previous bundle + new base + new megas ────────────────────
const CHAMPIONS_M{X}_LEGAL_SPECIES: ReadonlySet<string> = new Set([
  ...REG_M{PREV}_BUNDLE.legalSpecies,
  ...CHAMPIONS_M{X}_NEW_BASE_SPECIES,
  ...CHAMPIONS_M{X}_MEGA_FORMS,
]);

// ── Legal items: previous bundle + new stones + new held items ───────────────
const CHAMPIONS_M{X}_LEGAL_ITEMS: ReadonlySet<string> = new Set([
  ...REG_M{PREV}_BUNDLE.legalItems,
  "NewSpecies1ite",
  // … held items …
]);

// ── Mega stats for brand-new Champions-exclusive megas only ──────────────────
// Standard Gen 6/7 megas (Sceptile-Mega, Blaziken-Mega, etc.) are resolved
// by stats-calculator via Dex.forGen(6) — do NOT add entries for them here.
const CHAMPIONS_M{X}_MEGA_STATS: ReadonlyMap<string, MegaStatBlock> = new Map([
  ["NewSpecies1-Mega", { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }],
]);

// ── Type overrides — ONLY for megas with non-obvious type changes ─────────────
// Standard Gen 6/7 megas resolve from @pkmn/dex. Add only synthetic Champions
// megas where the typing differs from the base and isn't already in @pkmn/dex.
const CHAMPIONS_M{X}_MEGA_TYPES: ReadonlyMap<string, readonly string[]> =
  new Map([
    // ["NewSpecies1-Mega", ["Type1", "Type2"]],
  ] as const);

// ── Custom ability descriptions for brand-new abilities ──────────────────────
// Only add abilities absent from @pkmn/dex (Champions-exclusive synthetic abilities).
const CHAMPIONS_M{X}_ABILITY_DESCS: ReadonlyMap<string, string> = new Map([
  ["BrandNewAbility", "One-sentence description of what it does."],
]);

// ── Derived type exports (consumed by format-legality) ───────────────────────
export type MegaSpeciesWithStoneFromM{X}Bundle =
  (typeof MEGA_M{X}_STONE_ENTRIES)[number][0];

export type MegaSpeciesWithAbilityFromM{X}Bundle =
  (typeof MEGA_M{X}_ABILITY_ENTRIES)[number][0];

// ── Bundle export ─────────────────────────────────────────────────────────────
export const REG_M{X}_BUNDLE: ChampionsRegBundle = {
  legalSpecies: CHAMPIONS_M{X}_LEGAL_SPECIES,
  legalItems: CHAMPIONS_M{X}_LEGAL_ITEMS,
  moveOverrides: REG_M{PREV}_BUNDLE.moveOverrides, // inherit unless changed
  moveBanlist: REG_M{PREV}_BUNDLE.moveBanlist,
  abilityBanlist: REG_M{PREV}_BUNDLE.abilityBanlist,
  megaStones: [...REG_M{PREV}_BUNDLE.megaStones, ...MEGA_M{X}_STONE_ENTRIES],
  megaAbilities: [...REG_M{PREV}_BUNDLE.megaAbilities, ...MEGA_M{X}_ABILITY_ENTRIES],
  megaStats: new Map([...REG_M{PREV}_BUNDLE.megaStats, ...CHAMPIONS_M{X}_MEGA_STATS]),
  megaTypes: CHAMPIONS_M{X}_MEGA_TYPES,
  abilityDescs: CHAMPIONS_M{X}_ABILITY_DESCS,
};
```

**Key rules for bundle fields**:

| Field | Rule |
| --- | --- |
| `megaStones` / `megaAbilities` | Spread previous bundle first, then new entries. The `as const` declaration makes TypeScript widen the union types automatically — adding a row is the only change needed. |
| `megaStats` | Brand-new Champions-exclusive megas only. Standard Gen 6/7 megas (Sceptile-Mega, Swampert-Mega, etc.) are NOT listed — `getBaseStats()` in `stats-calculator.ts` falls through to `Dex.forGen(6)`. |
| `megaTypes` | Only megas whose typing differs from the base AND is absent from `@pkmn/dex`. Standard Gen 6/7 megas already have correct types in the dex. |
| `abilityDescs` | Only brand-new ability names not in `@pkmn/dex` (Champions-exclusive synthetic abilities). Ability *effects* in the calc are a separate change to the `@smogon/calc` submodule — the bundle only needs names/stats/types/descs. |
| `moveOverrides` | Moves tagged `isNonstandard='Past'` in Gen 9 that the format explicitly grants. Inherit from previous bundle unless a new Past-move is introduced. |

## 3. Register in format-legality.ts

In `packages/pokemon/src/format-legality.ts`:

**A. Import the new bundle and its derived types** (alongside the existing imports):

```typescript
import {
  type MegaSpeciesWithAbilityFromM{X}Bundle,
  type MegaSpeciesWithStoneFromM{X}Bundle,
  REG_M{X}_BUNDLE,
} from "./champions-reg-m{x}";
```

**B. Add the format ID constant** (in the "Format ID Constants" section):

```typescript
export const CHAMPIONS_M{X}_FORMAT_ID = "gen9championsvgc2026regm{x}";
```

**C. Add to `CHAMPIONS_LEGALITY_BY_ID`**:

```typescript
const CHAMPIONS_LEGALITY_BY_ID: Record<string, ChampionsRegBundle> = {
  [CHAMPIONS_MA_FORMAT_ID]: REG_MA_BUNDLE,
  [CHAMPIONS_MB_FORMAT_ID]: REG_MB_BUNDLE,
  [CHAMPIONS_M{X}_FORMAT_ID]: REG_M{X}_BUNDLE, // ← add
};
```

**D. Widen the global mega union types**:

```typescript
export type MegaSpeciesWithStone =
  | MegaSpeciesWithStoneFromBundle      // M-A
  | MegaSpeciesWithStoneFromMBBundle    // M-B
  | MegaSpeciesWithStoneFromM{X}Bundle; // M-{X}  ← add

export type MegaSpeciesWithAbility =
  | MegaSpeciesWithAbilityFromBundle
  | MegaSpeciesWithAbilityFromMBBundle
  | MegaSpeciesWithAbilityFromM{X}Bundle; // ← add
```

**E. Add to `ALL_CHAMPIONS_BUNDLES`**:

```typescript
const ALL_CHAMPIONS_BUNDLES: readonly ChampionsRegBundle[] = [
  REG_MA_BUNDLE,
  REG_MB_BUNDLE,
  REG_M{X}_BUNDLE, // ← add
];
```

## 4. Register in formats.ts

In `packages/pokemon/src/formats.ts`:

**A. Add to `VGC_FORMATS`** (at the top, newest first):

```typescript
{
  id: "gen9championsvgc2026regm{x}",
  game: "Pokemon Champions",
  gameShort: "Champions",
  generation: 9,
  category: "VGC",
  year: 2026,
  regulation: "M-{X}",
  label: "Champions: Reg M-{X}",
  showdownName: "[Champions] VGC 2026 Reg M-{X}",
  doubles: true,
  active: true,   // ← new reg is active
},
```

Set the previous reg's `active` to `false` at the same time.

**B. Add to `SIM_UNSUPPORTED_FORMAT_IDS`**:

```typescript
export const SIM_UNSUPPORTED_FORMAT_IDS: ReadonlySet<string> = new Set([
  "gen9championsvgc2026regma",
  "gen9championsvgc2026regmb",
  "gen9championsvgc2026regm{x}", // ← add
]);
```

## 5. Register in stats-calculator.ts

In `packages/pokemon/src/stats-calculator.ts`, add the new bundle to both composed maps:

```typescript
import { REG_M{X}_BUNDLE } from "./champions-reg-m{x}";

const CHAMPIONS_EXCLUSIVE_MEGA_STATS = new Map([
  ...REG_MA_BUNDLE.megaStats,
  ...REG_MB_BUNDLE.megaStats,
  ...REG_M{X}_BUNDLE.megaStats, // ← add
]);

const CHAMPIONS_MEGA_TYPE_OVERRIDES = new Map([
  ...REG_MA_BUNDLE.megaTypes,
  ...REG_MB_BUNDLE.megaTypes,
  ...REG_M{X}_BUNDLE.megaTypes, // ← add
]);
```

## 6. Register in abilities.ts

In `packages/pokemon/src/abilities.ts`, add the new bundle to the merged ability descs map:

```typescript
import { REG_M{X}_BUNDLE } from "./champions-reg-m{x}";

const MERGED_ABILITY_DESCS: ReadonlyMap<string, string> = new Map([
  ...REG_MA_BUNDLE.abilityDescs,
  ...REG_MB_BUNDLE.abilityDescs,
  ...REG_M{X}_BUNDLE.abilityDescs, // ← add
]);
```

## 7. Register in regulation-calendar.ts

In `packages/pokemon/src/regulation-calendar.ts`, add to `CHAMPIONS_CALENDAR`:

```typescript
export const CHAMPIONS_CALENDAR: readonly RegulationPeriod[] = [
  // Close the previous reg the day before the new one starts:
  {
    start: "2026-05-01",
    end: "2026-06-16",
    formatId: "gen9championsvgc2026regma",
    regulation: "M-A",
    label: "Champions: Reg M-A",
  },
  {
    start: "2026-06-17",
    end: "2026-MM-DD",            // ← close M-B the day before M-{X} starts
    formatId: "gen9championsvgc2026regmb",
    regulation: "M-B",
    label: "Champions: Reg M-B",
  },
  {
    start: "2026-MM-DD",          // ← M-{X} start date (from official announcement)
    end: "2099-12-31",            // ← open-ended until next reg is announced
    formatId: "gen9championsvgc2026regm{x}",
    regulation: "M-{X}",
    label: "Champions: Reg M-{X}",
  },
] as const;
```

## 8. Register in meta-speed-tiers.ts

In `packages/pokemon/src/meta-speed-tiers.ts`:

```typescript
const CHAMPIONS_REGM{X}_SPEED_TIERS: MetaSpeedEntry[] = [
  // Inherit all M-{prev} entries (M-{X} is a superset)
  ...CHAMPIONS_REGM{PREV}_SPEED_TIERS,
  // Add speed tier entries for new Megas as meta data becomes available.
  // Stat formula (L50): floor((2*base + 31 + floor(252/4)) * 50 / 100 + 5)
];

// Add to TIERS_BY_FORMAT:
const TIERS_BY_FORMAT: Record<string, MetaSpeedEntry[]> = {
  gen9championsvgc2026regma: CHAMPIONS_REGMA_SPEED_TIERS,
  gen9championsvgc2026regmb: CHAMPIONS_REGMB_SPEED_TIERS,
  gen9championsvgc2026regm{x}: CHAMPIONS_REGM{X}_SPEED_TIERS, // ← add
};
```

## 9. Register in validators/src/team.ts

In `packages/validators/src/team.ts`, add `null` entries in `FORMAT_MAP` for the new reg (Champions uses its own validator, not `@pkmn/sim`):

```typescript
export const FORMAT_MAP = {
  // …existing entries…
  gen9championsvgc2026regma: null,
  gen9championsvgc2026regmb: null,
  gen9championsvgc2026regm{x}: null, // ← add
} as const satisfies Record<string, string | null>;
```

## 10. Register in game-data.ts

In `apps/web/src/components/tournaments/shared/game-data.ts`, add to the `champions` array in `GAME_FORMATS` (newest first):

```typescript
champions: [
  { id: "gen9championsvgc2026regm{x}", name: "Regulation M-{X}" }, // ← add at top
  { id: "gen9championsvgc2026regmb", name: "Regulation M-B" },
  { id: "gen9championsvgc2026regma", name: "Regulation M-A" },
],
```

## 11. Tests

Add tests in `packages/pokemon/src/__tests__/`:

```typescript
// champions-reg-m{x}.test.ts
describe("REG_M{X}_BUNDLE", () => {
  it("is a superset of REG_M{PREV}_BUNDLE (legalSpecies)", () => {
    for (const species of REG_M{PREV}_BUNDLE.legalSpecies) {
      expect(REG_M{X}_BUNDLE.legalSpecies.has(species)).toBe(true);
    }
  });

  it("is a superset of REG_M{PREV}_BUNDLE (legalItems)", () => {
    for (const item of REG_M{PREV}_BUNDLE.legalItems) {
      expect(REG_M{X}_BUNDLE.legalItems.has(item)).toBe(true);
    }
  });

  it("contains all new mega species", () => {
    expect(REG_M{X}_BUNDLE.legalSpecies.has("NewSpecies1-Mega")).toBe(true);
  });

  it("contains the new mega stone", () => {
    expect(REG_M{X}_BUNDLE.legalItems.has("NewSpecies1ite")).toBe(true);
  });

  it("maps mega stones correctly", () => {
    const stoneMap = new Map(REG_M{X}_BUNDLE.megaStones);
    expect(stoneMap.get("NewSpecies1-Mega")).toBe("NewSpecies1ite");
  });
});

// format-legality.test.ts additions
describe("CHAMPIONS_M{X}_FORMAT_ID", () => {
  it("is registered in getLegalSpecies", () => {
    const result = getLegalSpecies(CHAMPIONS_M{X}_FORMAT_ID);
    expect(result).toBeInstanceOf(Set);
  });

  it("accepts a known M-{X} species as legal", () => {
    expect(isLegalSpecies("NewSpecies1", CHAMPIONS_M{X}_FORMAT_ID)).toBe(true);
  });

  it("rejects a species not in M-{X}", () => {
    expect(isLegalSpecies("Dialga", CHAMPIONS_M{X}_FORMAT_ID)).toBe(false);
  });
});
```

Validation smoke test in `packages/validators/src/__tests__/`:

```typescript
it("accepts a valid M-{X} Champions team", () => {
  const result = validateChampionsTeam(sampleM{X}Team, CHAMPIONS_M{X}_FORMAT_ID);
  expect(result.success).toBe(true);
});
```

Run with:
```bash
pnpm test --filter @trainers/pokemon
pnpm test --filter @trainers/validators
pnpm typecheck --filter @trainers/pokemon --filter @trainers/validators
```

## Gotchas

- **String casing must match exactly.** Species, item, ability, and stone names use PascalCase display names (e.g. `"Greninja-Mega"`, not `"greninja-mega"`). A typo causes `.has()` to silently return `false` at runtime — legality checks become permissive rather than throwing.

- **Standard Gen 6/7 mega stats are NOT needed in the bundle.** `getBaseStats()` in `stats-calculator.ts` falls through to `Dex.forGen(6)` for any species with `exists: true` in Gen 6. Adding them redundantly is harmless but misleading.

- **Type overrides: dex-resolvable megas don't need entries.** `getChampionsMegaTypeOverride()` is only called when the dex can't resolve the type. Standard Gen 6/7 megas (Gyarados-Mega → Water/Dark) are in the dex; adding them to `megaTypes` would shadow the dex and could introduce staleness.

- **Ability effects in the calc are a separate change.** The bundle `abilityDescs` field provides UI description text only. If a brand-new ability (e.g. "Eelevate") has battle mechanics, those must be added to the `@smogon/calc` fork in `vendor/damage-calc/`. Run `git submodule update --init --recursive` before running local typecheck/test on a freshly cloned repo.

- **The `as const` on stone/ability entry arrays is load-bearing.** TypeScript derives the `MegaSpeciesWithStone{X}` union type from the literal tuples. Omitting `as const` widens the type to `string[]` and breaks the union composition in `format-legality.ts`.

- **Calendar end dates must be day-before.** Close the previous regulation's calendar entry the day before the new one starts (e.g. M-B closes `"2026-MM-DD"` and M-{X} opens the next day). Overlapping date ranges cause `getChampionsFormatForDate()` to return the first match, masking the new reg.

- **`SIM_UNSUPPORTED_FORMAT_IDS` must include every Champions reg.** Without this, `buildVgcShowdownNameMap()` would include the new format ID in the sim-backed map, and `computeLegalSpeciesFromSim()` would silently return `undefined` for it (no matching Showdown format) instead of routing to the bundle.
