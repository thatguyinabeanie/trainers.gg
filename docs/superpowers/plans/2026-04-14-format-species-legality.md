# Format Species Legality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restrict the team builder's species picker, calc-tab defender search, format change, and paste imports to species that are legal for the team's format — using a manual NCP port for Champions M-A and `@pkmn/sim`'s `TeamValidator` for every other registered format.

**Architecture:** One new `packages/pokemon/src/format-legality.ts` module exposing `getLegalSpecies(formatId)` and `isLegalSpecies(species, formatId)`. Champions M-A ships as a static `Set<string>` ported from NCP's pokedex.js. Non-Champions formats compute their legal set lazily via `SimDex.formats.get(...)` + `new TeamValidator(...).validateSet(...)` per species, memoized at module scope. UI surfaces (species table, species detail panel, calc-tab inline search) dim illegal rows with a "Not legal" badge and block selection. Format changes and paste imports hard-fail when illegal species are present.

**Tech Stack:** TypeScript (strict), `@pkmn/sim@0.10.7`, `@pkmn/data`, React 19.2, Next.js 16 App Router, Jest.

**Spec:** `docs/superpowers/specs/2026-04-14-champions-legality-design.md`

---

## File structure

| File | Responsibility |
|---|---|
| `packages/pokemon/src/format-legality.ts` | Public `getLegalSpecies` / `isLegalSpecies`. Internal Champions constant + `@pkmn/sim` cache. |
| `packages/pokemon/src/__tests__/format-legality.test.ts` | Unit tests for all three paths (Champions / sim / permissive). |
| `packages/pokemon/src/index.ts` | Barrel re-exports. |
| `packages/pokemon/src/team-validator.ts` | Replace `[Gen 9] OU` fallback for VGC formats with direct lookup. |
| `apps/web/src/components/team-builder/species-table.tsx` | Per-row `isLegalSpecies` check → dim + badge + block-on-select. |
| `apps/web/src/components/team-builder/species-picker.tsx` | Plumb `formatId` through to SpeciesTable and SpeciesDetail. |
| `apps/web/src/components/team-builder/species-detail.tsx` | Disable "Select with defaults" / "Select blank" buttons + show muted "Not legal" line when species is illegal. |
| `apps/web/src/components/team-builder/damage-calc-tab.tsx` | `InlineSpeciesSearch` dims illegal entries + blocks selection. |
| `apps/web/src/components/team-builder/team-workspace.tsx` | Before persisting format change, compute illegal subset and block with a toast if non-empty. |
| `apps/web/src/components/team-builder/new-team-submit.ts` | After `parseShowdownText`, reject whole when any species is illegal in the target format. |
| `apps/web/src/components/team-builder/import-dialog.tsx` | Per-Pokemon paste: reject if species is illegal for the team's format. |
| `apps/web/src/actions/teams.ts` | Defense-in-depth legality check on the server action that changes a team's format. |

---

## Task 1: Champions M-A static port + permissive fallback

**Files:**
- Create: `packages/pokemon/src/format-legality.ts`
- Create: `packages/pokemon/src/__tests__/format-legality.test.ts`

- [ ] **Step 1: Write the first failing tests**

Create `packages/pokemon/src/__tests__/format-legality.test.ts`:

```ts
import { describe, it, expect } from "@jest/globals";

import { getLegalSpecies, isLegalSpecies } from "../format-legality";

describe("format-legality — Champions M-A", () => {
  const CHAMPIONS = "championsvgc2026regma";

  it("marks Incineroar as legal in Champions M-A", () => {
    expect(isLegalSpecies("Incineroar", CHAMPIONS)).toBe(true);
  });

  it("marks Landorus-Therian as illegal in Champions M-A", () => {
    expect(isLegalSpecies("Landorus-Therian", CHAMPIONS)).toBe(false);
  });

  it("returns a ReadonlySet for Champions M-A", () => {
    const legal = getLegalSpecies(CHAMPIONS);
    expect(legal).toBeInstanceOf(Set);
    expect(legal?.size).toBeGreaterThan(150);
  });

  it("excludes Mega forms (they're item-driven, not separately selectable)", () => {
    const legal = getLegalSpecies(CHAMPIONS);
    expect(legal?.has("Mega Venusaur")).toBe(false);
    expect(legal?.has("Mega Charizard X")).toBe(false);
    expect(legal?.has("Venusaur")).toBe(true);
    expect(legal?.has("Charizard")).toBe(true);
  });

  it("retains distinct battle forms", () => {
    const legal = getLegalSpecies(CHAMPIONS);
    expect(legal?.has("Rotom-Heat")).toBe(true);
    expect(legal?.has("Tauros-Paldea-Combat")).toBe(true);
    expect(legal?.has("Aegislash-Blade")).toBe(true);
    expect(legal?.has("Meowstic-F")).toBe(true);
    expect(legal?.has("Slowking-Galar")).toBe(true);
  });
});

describe("format-legality — permissive fallback", () => {
  it("returns undefined for an unknown format ID", () => {
    expect(getLegalSpecies("unknown-format-id")).toBeUndefined();
  });

  it("isLegalSpecies returns true for any species in an unknown format", () => {
    expect(isLegalSpecies("Landorus-Therian", "unknown-format-id")).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @trainers/pokemon test -- format-legality`
Expected: FAIL, module not found.

- [ ] **Step 3: Create the module with the Champions port and permissive fallback**

Create `packages/pokemon/src/format-legality.ts`:

```ts
/**
 * Format species legality.
 *
 * - Champions: VGC 2026 Reg M-A uses a static port of NCP VGC Damage
 *   Calculator's POKEDEX_CHAMPIONS list (pokedex.js lines 18378–18409,
 *   captured 2026-04-14), because @pkmn/sim doesn't know gen 10.
 * - Other formats are resolved via @pkmn/sim (see Task 2).
 * - Unknown / unresolvable formats return `undefined` and callers treat
 *   that as "permissive — all legal."
 */

// =============================================================================
// Champions: VGC 2026 Reg M-A
// =============================================================================

/**
 * Every species selectable in Champions: VGC 2026 Reg M-A.
 *
 * Ported from NCP calc (pokedex.js lines 18378–18409). Megas are
 * item-driven battle transformations, not separately selectable species,
 * so every "Mega X" entry from NCP is dropped here. Distinct battle
 * forms (Rotom-Heat, Tauros-Paldea-Combat, Ogerpon-Wellspring, etc.)
 * are retained.
 */
const CHAMPIONS_MA_LEGAL_SPECIES: ReadonlySet<string> = new Set([
  // Base forms — Pokemon available from launch of Champions
  "Venusaur", "Charizard", "Blastoise", "Beedrill", "Pidgeot", "Arbok",
  "Pikachu", "Raichu", "Clefable", "Ninetales", "Arcanine", "Alakazam",
  "Machamp", "Victreebel", "Slowbro", "Gengar", "Kangaskhan", "Starmie",
  "Pinsir", "Tauros", "Gyarados", "Ditto", "Vaporeon", "Jolteon", "Flareon",
  "Aerodactyl", "Snorlax", "Dragonite", "Meganium", "Typhlosion",
  "Feraligatr", "Ariados", "Ampharos", "Azumarill", "Politoed", "Espeon",
  "Umbreon", "Slowking", "Forretress", "Steelix", "Scizor", "Heracross",
  "Skarmory", "Houndoom", "Tyranitar", "Pelipper", "Gardevoir", "Sableye",
  "Aggron", "Medicham", "Manectric", "Sharpedo", "Camerupt", "Torkoal",
  "Altaria", "Milotic", "Castform", "Banette", "Chimecho", "Absol", "Glalie",
  "Torterra", "Infernape", "Empoleon", "Luxray", "Roserade", "Rampardos",
  "Bastiodon", "Lopunny", "Spiritomb", "Garchomp", "Lucario", "Hippowdon",
  "Toxicroak", "Abomasnow", "Weavile", "Rhyperior", "Leafeon", "Glaceon",
  "Gliscor", "Mamoswine", "Gallade", "Froslass", "Rotom", "Serperior",
  "Emboar", "Samurott", "Watchog", "Liepard", "Simisage", "Simisear",
  "Simipour", "Excadrill", "Audino", "Conkeldurr", "Whimsicott",
  "Krookodile", "Cofagrigus", "Garbodor", "Zoroark", "Reuniclus",
  "Vanilluxe", "Emolga", "Chandelure", "Beartic", "Stunfisk", "Golurk",
  "Hydreigon", "Volcarona", "Chesnaught", "Delphox", "Greninja",
  "Diggersby", "Talonflame", "Vivillon", "Floette-Eternal", "Florges",
  "Pangoro", "Furfrou", "Meowstic", "Aegislash", "Aromatisse", "Slurpuff",
  "Clawitzer", "Heliolisk", "Tyrantrum", "Aurorus", "Sylveon", "Hawlucha",
  "Dedenne", "Goodra", "Klefki", "Trevenant", "Gourgeist-Average",
  "Avalugg", "Noivern", "Decidueye", "Incineroar", "Primarina", "Toucannon",
  "Crabominable", "Lycanroc-Midday", "Toxapex", "Mudsdale", "Araquanid",
  "Tsareena", "Oranguru", "Passimian", "Mimikyu", "Drampa", "Kommo-o",
  "Corviknight", "Flapple", "Appletun", "Sandaconda", "Polteageist",
  "Hatterene", "Mr. Rime", "Runerigus", "Alcremie", "Morpeko", "Dragapult",
  "Wyrdeer", "Kleavor", "Basculegion", "Sneasler", "Meowscarada",
  "Skeledirge", "Quaquaval", "Maushold", "Garganacl", "Armarouge",
  "Ceruledge", "Bellibolt", "Scovillain", "Espathra", "Tinkaton", "Palafin",
  "Orthworm", "Glimmora", "Farigiraf", "Kingambit", "Sinistcha",
  "Archaludon", "Hydrapple",
  // Regional / battle-distinct alt forms
  "Raichu-Alola", "Ninetales-Alola", "Arcanine-Hisui", "Slowbro-Galar",
  "Tauros-Paldea-Combat", "Tauros-Paldea-Aqua", "Tauros-Paldea-Blaze",
  "Typhlosion-Hisui", "Slowking-Galar", "Samurott-Hisui", "Zoroark-Hisui",
  "Stunfisk-Galar", "Meowstic-F", "Aegislash-Shield", "Aegislash-Blade",
  "Goodra-Hisui", "Gourgeist-Small", "Gourgeist-Large", "Gourgeist-Super",
  "Avalugg-Hisui", "Decidueye-Hisui", "Lycanroc-Midnight", "Lycanroc-Dusk",
  "Morpeko-Hangry", "Basculegion-F", "Maushold-Three", "Palafin-Hero",
  "Rotom-Heat", "Rotom-Wash", "Rotom-Frost", "Rotom-Fan", "Rotom-Mow",
]);

// =============================================================================
// Public API
// =============================================================================

/**
 * Returns the set of species legal in the given format, or `undefined`
 * if legality cannot be determined (treat as permissive).
 */
export function getLegalSpecies(
  formatId: string
): ReadonlySet<string> | undefined {
  if (formatId === "championsvgc2026regma") {
    return CHAMPIONS_MA_LEGAL_SPECIES;
  }
  // Task 2 adds the @pkmn/sim path here.
  return undefined;
}

/**
 * True when `species` is legal in `formatId`. Returns true for any
 * format without computable legality (permissive default).
 */
export function isLegalSpecies(species: string, formatId: string): boolean {
  const legal = getLegalSpecies(formatId);
  return legal === undefined || legal.has(species);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @trainers/pokemon test -- format-legality`
Expected: PASS, 7/7.

- [ ] **Step 5: Commit**

```bash
git add packages/pokemon/src/format-legality.ts packages/pokemon/src/__tests__/format-legality.test.ts
git commit -m "feat(pokemon): add format-legality module with Champions M-A static port"
```

---

## Task 2: `@pkmn/sim`-backed legality for VGC and Smogon formats

**Files:**
- Modify: `packages/pokemon/src/format-legality.ts`
- Modify: `packages/pokemon/src/__tests__/format-legality.test.ts`

Background: `@pkmn/sim@0.10.7` registers VGC formats as display-name strings (e.g., `"[Gen 9] VGC 2026 Reg I"` — see `node_modules/@pkmn/sim/build/cjs/config/formats.js:282`). `SimDex.formats.get(name)` returns the format spec; `new TeamValidator(format, SimDex).validateSet(set, {})` returns `string[] | null` (null = legal).

- [ ] **Step 1: Add failing tests for the sim path and the sim-id mapping**

Append to `packages/pokemon/src/__tests__/format-legality.test.ts`:

```ts
describe("format-legality — @pkmn/sim path", () => {
  const REG_I = "gen9vgc2026regi";
  const REG_G = "gen9vgc2024regg";

  it("marks Incineroar as legal in VGC Reg I", () => {
    expect(isLegalSpecies("Incineroar", REG_I)).toBe(true);
  });

  it("marks Miraidon as illegal in VGC Reg I (restricted legendary)", () => {
    expect(isLegalSpecies("Miraidon", REG_I)).toBe(false);
  });

  it("returns a non-empty set for VGC Reg I", () => {
    const legal = getLegalSpecies(REG_I);
    expect(legal).toBeInstanceOf(Set);
    expect(legal?.size).toBeGreaterThan(100);
  });

  it("marks Mewtwo legal in Reg G (restricted-legendary format)", () => {
    // Reg G permits one restricted legendary per team.
    expect(isLegalSpecies("Mewtwo", REG_G)).toBe(true);
  });

  it("memoizes the set — repeated calls return the same instance", () => {
    const first = getLegalSpecies(REG_I);
    const second = getLegalSpecies(REG_I);
    expect(first).toBe(second);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @trainers/pokemon test -- format-legality`
Expected: FAIL on the four sim-path tests; Champions + permissive tests still pass.

- [ ] **Step 3: Implement the sim path**

Replace the `getLegalSpecies` function and add internal helpers in `packages/pokemon/src/format-legality.ts`. The file now ends like this:

```ts
// =============================================================================
// @pkmn/sim-backed legality
// =============================================================================

import { Dex as SimDex, TeamValidator } from "@pkmn/sim";
import type { PokemonSet, Species } from "@pkmn/sim";

/**
 * Map our format IDs to the Showdown format display name that
 * `@pkmn/sim` registers. Formats not listed here fall back to
 * `undefined` (permissive) until someone adds them.
 */
const SIM_FORMAT_NAME_BY_ID: Record<string, string> = {
  gen9vgc2026regi: "[Gen 9] VGC 2026 Reg I",
  gen9vgc2026regf: "[Gen 9] VGC 2026 Reg F",
  gen9vgc2024regg: "[Gen 9] VGC 2024 Reg G",
  gen9vgc2024regh: "[Gen 9] VGC 2024 Reg H",
  gen9ou: "[Gen 9] OU",
  gen9uu: "[Gen 9] UU",
  gen9ru: "[Gen 9] RU",
  gen9nu: "[Gen 9] NU",
  gen9pu: "[Gen 9] PU",
  gen9lc: "[Gen 9] LC",
  gen9monotype: "[Gen 9] Monotype",
  gen9anythinggoes: "[Gen 9] Anything Goes",
  gen9ubers: "[Gen 9] Ubers",
};

const simSetCache = new Map<string, ReadonlySet<string>>();

/**
 * Build a minimal valid-looking PokemonSet for a species, used as a probe
 * for `TeamValidator.validateSet`. Only the species matters for the
 * species-legality check; other fields are filled with safe defaults.
 */
function probeSet(species: Species): PokemonSet {
  return {
    name: species.name,
    species: species.name,
    item: "",
    ability: species.abilities[0] ?? "",
    moves: [],
    nature: "Hardy",
    gender: "",
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    level: 50,
    shiny: false,
  };
}

/**
 * Compute the legal-species set for a format registered in @pkmn/sim.
 * Iterates the gen-9 species table and filters via TeamValidator.
 */
function computeLegalSpeciesFromSim(
  formatId: string
): ReadonlySet<string> | undefined {
  const cached = simSetCache.get(formatId);
  if (cached) return cached;

  const simName = SIM_FORMAT_NAME_BY_ID[formatId];
  if (!simName) return undefined;

  const format = SimDex.formats.get(simName);
  if (!format?.exists) return undefined;

  const validator = new TeamValidator(format, SimDex);
  const gen = SimDex.forGen(9);
  const legal = new Set<string>();

  for (const species of gen.species.all()) {
    if (!species.exists) continue;
    if (species.isNonstandard && species.isNonstandard !== "Unobtainable") {
      continue;
    }
    // validateSet returns null when the set passes all format rules,
    // or an array of issue strings when it fails. Species-level bans
    // (restricted legendaries, banned Pokémon) surface here.
    const issues = validator.validateSet(probeSet(species), {});
    if (issues === null) legal.add(species.name);
  }

  simSetCache.set(formatId, legal);
  return legal;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Returns the set of species legal in the given format, or `undefined`
 * if legality cannot be determined (treat as permissive).
 */
export function getLegalSpecies(
  formatId: string
): ReadonlySet<string> | undefined {
  if (formatId === "championsvgc2026regma") {
    return CHAMPIONS_MA_LEGAL_SPECIES;
  }
  return computeLegalSpeciesFromSim(formatId);
}

/**
 * True when `species` is legal in `formatId`. Returns true for any
 * format without computable legality (permissive default).
 */
export function isLegalSpecies(species: string, formatId: string): boolean {
  const legal = getLegalSpecies(formatId);
  return legal === undefined || legal.has(species);
}
```

(Delete the placeholder `getLegalSpecies` / `isLegalSpecies` from Task 1 — this block replaces them.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @trainers/pokemon test -- format-legality`
Expected: PASS, 12/12.

If `validateSet` rejects something we expected to be legal (e.g., Incineroar), the most common cause is the probe set having an invalid ability for that species. Inspect `validator.validateSet(probeSet(species), {})` returns for the failing case and fall back to `species.abilities.H ?? species.abilities[0] ?? "No Ability"` (iterate through all available ability slots).

- [ ] **Step 5: Commit**

```bash
git add packages/pokemon/src/format-legality.ts packages/pokemon/src/__tests__/format-legality.test.ts
git commit -m "feat(pokemon): compute legal species from @pkmn/sim for VGC + Smogon formats"
```

---

## Task 3: Re-export + fix team-validator's wrong VGC fallback

**Files:**
- Modify: `packages/pokemon/src/index.ts`
- Modify: `packages/pokemon/src/team-validator.ts`
- Modify: `packages/pokemon/src/__tests__/team-validator.test.ts` (check for regressions)

- [ ] **Step 1: Re-export from the barrel**

Read `packages/pokemon/src/index.ts` and find the existing `// Team validator (using @pkmn/sim)` section (around line 112). Add a new sibling section below it:

```ts
// Format legality
export { getLegalSpecies, isLegalSpecies } from "./format-legality";
```

- [ ] **Step 2: Verify it still builds**

Run: `pnpm --filter @trainers/pokemon typecheck`
Expected: PASS.

- [ ] **Step 3: Fix the SUPPORTED_FORMATS map so VGC formats use real VGC rulesets**

Read `packages/pokemon/src/team-validator.ts`. Replace the `SUPPORTED_FORMATS` object (lines 34–55) with:

```ts
// Supported competitive formats — mapping our format IDs to the Showdown
// format display name `@pkmn/sim` registers. Formats without a direct
// match are intentionally absent; callers fall back to a permissive code
// path when a format isn't supported here.
export const SUPPORTED_FORMATS = {
  // VGC (Video Game Championship) formats
  gen9vgc2024regg: "[Gen 9] VGC 2024 Reg G",
  gen9vgc2024regh: "[Gen 9] VGC 2024 Reg H",
  gen9vgc2026regi: "[Gen 9] VGC 2026 Reg I",
  gen9vgc2026regf: "[Gen 9] VGC 2026 Reg F",

  // Smogon Singles
  gen9ou: "[Gen 9] OU",
  gen9uu: "[Gen 9] UU",
  gen9ru: "[Gen 9] RU",
  gen9nu: "[Gen 9] NU",
  gen9pu: "[Gen 9] PU",
  gen9lc: "[Gen 9] LC",
  gen9monotype: "[Gen 9] Monotype",
  gen9anythinggoes: "[Gen 9] Anything Goes",
  gen9ubers: "[Gen 9] Ubers",
} as const;
```

If any other code in `team-validator.ts` references removed keys (e.g., `gen9vgc2024`, `gen9battlestadium`, `gen9nationaldex`), update them to use one of the new keys or throw a clear error (`throw new Error(\`Format \${formatId} is not registered; add it to SUPPORTED_FORMATS\`);`).

- [ ] **Step 4: Update or add a test that Reg I actually restricts Miraidon via team-validator**

If `packages/pokemon/src/__tests__/team-validator.test.ts` has tests that reference the removed format IDs (`gen9vgc2024`, `gen9battlestadium`, `gen9nationaldex`), rename them to `gen9vgc2026regi` or `gen9vgc2024regh`. Add this regression test to the `AdvancedTeamValidator` describe block:

```ts
it("flags a restricted legendary (Miraidon) as illegal in VGC Reg I", () => {
  const validator = new AdvancedTeamValidator("gen9vgc2026regi");
  const result = validator.validateTeam([
    {
      species: "Miraidon",
      name: "Miraidon",
      item: "",
      ability: "Hadron Engine",
      nature: "Timid",
      moves: ["Electro Drift"],
      evs: { hp: 0, atk: 0, def: 0, spa: 252, spd: 4, spe: 252 },
      ivs: { hp: 31, atk: 0, def: 31, spa: 31, spd: 31, spe: 31 },
      level: 50,
      gender: "",
    },
  ]);
  expect(result.isValid).toBe(false);
});
```

- [ ] **Step 5: Run all pokemon tests to check for regressions**

Run: `pnpm --filter @trainers/pokemon test`
Expected: All suites pass. If old tests rely on the removed format IDs, update them to the new IDs.

- [ ] **Step 6: Commit**

```bash
git add packages/pokemon/src/index.ts packages/pokemon/src/team-validator.ts packages/pokemon/src/__tests__/team-validator.test.ts
git commit -m "fix(pokemon): use real VGC rulesets in team validator instead of OU fallback"
```

---

## Task 4: Species table — dim illegal rows + block selection

**Files:**
- Modify: `apps/web/src/components/team-builder/species-table.tsx`
- Modify: `apps/web/src/components/team-builder/__tests__/species-table.test.tsx`

- [ ] **Step 1: Add failing tests for the legality treatment**

Open `apps/web/src/components/team-builder/__tests__/species-table.test.tsx`. Add a new `describe` block near the end:

```tsx
describe("SpeciesTable — format legality", () => {
  it("dims illegal species and shows a 'Not legal' badge", () => {
    const entries = [
      makeSpeciesEntry({ species: "Incineroar" }),
      makeSpeciesEntry({ species: "Landorus-Therian" }),
    ];
    render(
      <SpeciesTable
        entries={entries}
        formatId="championsvgc2026regma"
        onSelect={jest.fn()}
        onPreview={jest.fn()}
        currentTeam={[]}
        currentSpecies={null}
        previewedSpecies={null}
      />
    );
    const landorusRow = screen.getByRole("row", { name: /Landorus-Therian/i });
    expect(landorusRow).toHaveClass("opacity-50");
    expect(
      within(landorusRow).getByText("Not legal")
    ).toBeInTheDocument();
  });

  it("does not call onSelect when an illegal row is clicked", () => {
    const onSelect = jest.fn();
    const entries = [makeSpeciesEntry({ species: "Landorus-Therian" })];
    render(
      <SpeciesTable
        entries={entries}
        formatId="championsvgc2026regma"
        onSelect={onSelect}
        onPreview={jest.fn()}
        currentTeam={[]}
        currentSpecies={null}
        previewedSpecies={null}
      />
    );
    fireEvent.click(screen.getByRole("row", { name: /Landorus-Therian/i }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("still allows preview on illegal rows", () => {
    const onPreview = jest.fn();
    const entries = [makeSpeciesEntry({ species: "Landorus-Therian" })];
    render(
      <SpeciesTable
        entries={entries}
        formatId="championsvgc2026regma"
        onSelect={jest.fn()}
        onPreview={onPreview}
        currentTeam={[]}
        currentSpecies={null}
        previewedSpecies={null}
      />
    );
    fireEvent.click(screen.getByRole("row", { name: /Landorus-Therian/i }));
    expect(onPreview).toHaveBeenCalledWith("Landorus-Therian");
  });

  it("when formatId has no registered legality, no rows are dimmed", () => {
    const entries = [makeSpeciesEntry({ species: "Landorus-Therian" })];
    render(
      <SpeciesTable
        entries={entries}
        formatId="unknown-format"
        onSelect={jest.fn()}
        onPreview={jest.fn()}
        currentTeam={[]}
        currentSpecies={null}
        previewedSpecies={null}
      />
    );
    const row = screen.getByRole("row", { name: /Landorus-Therian/i });
    expect(row).not.toHaveClass("opacity-50");
    expect(
      within(row).queryByText("Not legal")
    ).not.toBeInTheDocument();
  });
});
```

(Adjust the `makeSpeciesEntry` / imports to match what already exists in that test file. If a fixture helper doesn't exist, extract the shape used in earlier tests into a local helper.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @trainers/web test -- species-table`
Expected: FAIL — component doesn't accept `formatId` yet.

- [ ] **Step 3: Wire `formatId` through the component**

Open `apps/web/src/components/team-builder/species-table.tsx`.

Add to the imports at the top:

```tsx
import { isLegalSpecies } from "@trainers/pokemon";
import { Badge } from "@/components/ui/badge";
```

Extend the `SpeciesTableProps` interface to include:

```tsx
/**
 * Active format. When set and the format has legality data, rows for
 * illegal species are dimmed and their select clicks are blocked.
 */
formatId?: string;
```

In the row-rendering section, compute `const legal = formatId ? isLegalSpecies(entry.species, formatId) : true;` for each row. Then:

1. Add `opacity-50` to the row's `className` when `!legal` (via `cn(..., !legal && "opacity-50")`).
2. When rendering the species-name cell, if `!legal`, append a "Not legal" `Badge` inline:
   ```tsx
   {!legal && (
     <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground ml-2 text-[10px]">
       Not legal
     </Badge>
   )}
   ```
3. The existing row click handler must fire `onPreview(species)` unconditionally but call `onSelect(species)` only when `legal`. Search for the existing click handler (`onClick={...}` on the row element) and wrap the `onSelect` call in `if (legal)`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @trainers/web test -- species-table`
Expected: PASS. If the "row" aria-query in the tests doesn't match because you don't use role=row, adjust selectors to use what the component actually renders.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/team-builder/species-table.tsx apps/web/src/components/team-builder/__tests__/species-table.test.tsx
git commit -m "feat(builder): dim illegal species rows with 'Not legal' badge"
```

---

## Task 5: Species picker — plumb formatId + detail panel treatment

**Files:**
- Modify: `apps/web/src/components/team-builder/species-picker.tsx`
- Modify: `apps/web/src/components/team-builder/species-detail.tsx`
- Modify: `apps/web/src/components/team-builder/team-workspace.tsx` (pass format to picker)
- Modify: `apps/web/src/components/team-builder/__tests__/species-picker.test.tsx`

- [ ] **Step 1: Add failing tests for the detail panel's legality treatment**

Add to `apps/web/src/components/team-builder/__tests__/species-picker.test.tsx`:

```tsx
describe("SpeciesPicker — illegal species in the detail panel", () => {
  it("disables 'Select with defaults' and 'Select blank' when the previewed species is illegal", () => {
    const onSelect = jest.fn();
    render(
      <SpeciesPicker
        speciesIndex={[
          makeIndexEntry({ species: "Landorus-Therian" }),
          makeIndexEntry({ species: "Incineroar" }),
        ]}
        currentTeam={[]}
        currentSpecies={null}
        formatId="championsvgc2026regma"
        onSelect={onSelect}
        onCancel={jest.fn()}
      />
    );
    // Preview the illegal species
    fireEvent.click(screen.getByText("Landorus-Therian"));

    const defaultsBtn = screen.getByRole("button", {
      name: /Select with popular set|Select with defaults/i,
    });
    const blankBtn = screen.getByRole("button", { name: /Select blank/i });

    expect(defaultsBtn).toBeDisabled();
    expect(blankBtn).toBeDisabled();
    expect(screen.getByText(/Not legal in this format/i)).toBeInTheDocument();

    fireEvent.click(defaultsBtn);
    fireEvent.click(blankBtn);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("leaves Select buttons enabled for legal species", () => {
    render(
      <SpeciesPicker
        speciesIndex={[makeIndexEntry({ species: "Incineroar" })]}
        currentTeam={[]}
        currentSpecies={null}
        formatId="championsvgc2026regma"
        onSelect={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    fireEvent.click(screen.getByText("Incineroar"));
    expect(
      screen.getByRole("button", { name: /Select with popular set|Select with defaults/i })
    ).not.toBeDisabled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @trainers/web test -- species-picker`
Expected: FAIL — `formatId` prop doesn't exist.

- [ ] **Step 3: Add `formatId` to SpeciesPicker and thread it**

Edit `apps/web/src/components/team-builder/species-picker.tsx`. Extend `SpeciesPickerProps`:

```tsx
interface SpeciesPickerProps {
  speciesIndex: SpeciesSearchEntry[];
  currentTeam: Array<{ species: string }>;
  currentSpecies: string | null;
  /** Active format ID — used to apply species legality filtering. */
  formatId?: string;
  onSelect: (species: string, mode: "defaults" | "blank") => void;
  onCancel: () => void;
}
```

Destructure `formatId` in the component signature. Pass it to `<SpeciesTable formatId={formatId} ... />` and to `<SpeciesDetail formatId={formatId} ... />`.

- [ ] **Step 4: Update SpeciesDetail to respect legality**

Open `apps/web/src/components/team-builder/species-detail.tsx`. Add to imports:

```tsx
import { isLegalSpecies } from "@trainers/pokemon";
```

Extend the props interface to include `formatId?: string`.

Find the footer section that renders the "Select with popular set" and "Select blank" buttons. Immediately before those buttons, compute:

```tsx
const legal = formatId ? isLegalSpecies(species, formatId) : true;
```

Spread `disabled={!legal}` onto both buttons. Immediately above the button row, render:

```tsx
{!legal && (
  <p className="text-muted-foreground mb-2 text-xs">
    Not legal in this format.
  </p>
)}
```

- [ ] **Step 5: Pass `formatId` from the workspace**

Open `apps/web/src/components/team-builder/team-workspace.tsx`. Find the `<SpeciesPicker ... />` render site. Add the prop:

```tsx
<SpeciesPicker
  speciesIndex={speciesIndex}
  currentTeam={/* existing */}
  currentSpecies={/* existing */}
  formatId={format?.id}
  onSelect={/* existing */}
  onCancel={/* existing */}
/>
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm --filter @trainers/web test -- species-picker species-detail`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/team-builder/species-picker.tsx \
        apps/web/src/components/team-builder/species-detail.tsx \
        apps/web/src/components/team-builder/team-workspace.tsx \
        apps/web/src/components/team-builder/__tests__/species-picker.test.tsx
git commit -m "feat(builder): plumb formatId through species picker + disable Select on illegal species"
```

---

## Task 6: Calc-tab defender species search — apply legality

**Files:**
- Modify: `apps/web/src/components/team-builder/damage-calc-tab.tsx`
- Modify: `apps/web/src/components/team-builder/__tests__/damage-calc-tab.test.tsx`

- [ ] **Step 1: Add failing test for `InlineSpeciesSearch` legality treatment**

In `apps/web/src/components/team-builder/__tests__/damage-calc-tab.test.tsx`, add:

```tsx
describe("Calc tab defender search — format legality", () => {
  it("dims illegal candidates and blocks selection", async () => {
    // Render the calc tab with a Reg I team containing an attacker.
    // Details: reuse the suite's existing render helper, pass format
    // `gen9vgc2026regi`, and programmatically interact with the defender
    // species input.
    const { rerender, ...utils } = renderCalcTab({ formatId: "gen9vgc2026regi" });

    // Type "Miraidon" into the defender search
    await utils.user.type(
      screen.getByRole("combobox", { name: /defender/i }),
      "Miraidon"
    );

    const miraidonOption = screen.getByText(/^Miraidon$/).closest("li");
    expect(miraidonOption).toHaveClass("opacity-50");
    expect(
      within(miraidonOption!).getByText("Not legal")
    ).toBeInTheDocument();

    fireEvent.click(miraidonOption!);
    // Defender species should NOT have changed — still default.
    expect(utils.getDefenderSpecies()).not.toBe("Miraidon");
  });
});
```

(Adjust according to the existing renderCalcTab helper and interaction patterns in that test file. If the helper exposes `user` via testing-library-user-event, use that; if not, substitute `fireEvent.change` on the input.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @trainers/web test -- damage-calc-tab`
Expected: FAIL.

- [ ] **Step 3: Add legality to `InlineSpeciesSearch`**

Open `apps/web/src/components/team-builder/damage-calc-tab.tsx`. Find `InlineSpeciesSearch` (around line 704). Add to that file's imports (near the top):

```tsx
import { isLegalSpecies } from "@trainers/pokemon";
```

In `InlineSpeciesSearch`, compute per-option legality as matches are rendered:

```tsx
const legal = formatId ? isLegalSpecies(name, formatId) : true;
```

Wrap each option row's wrapper with a conditional class + badge:

```tsx
<li
  key={name}
  className={cn(
    "cursor-pointer px-2 py-1 text-sm",
    !legal && "opacity-50",
    /* existing classes */
  )}
  onClick={() => {
    if (!legal) return;
    onChange(name);
  }}
>
  {name}
  {!legal && (
    <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground ml-2 text-[10px]">
      Not legal
    </Badge>
  )}
</li>
```

The existing component signature already receives `formatId` (see line ~700 in the file). No API change needed; just update the render.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @trainers/web test -- damage-calc-tab`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/team-builder/damage-calc-tab.tsx \
        apps/web/src/components/team-builder/__tests__/damage-calc-tab.test.tsx
git commit -m "feat(builder): dim illegal defender species in calc-tab inline search"
```

---

## Task 7: Format-change guard — client + server action

**Files:**
- Modify: `apps/web/src/actions/teams.ts`
- Modify: `apps/web/src/components/team-builder/team-workspace.tsx` (or wherever the format-change control lives)
- Create: `apps/web/src/actions/__tests__/teams-format-change.test.ts`

- [ ] **Step 1: Locate the Server Action that updates a team's format**

Run: `grep -n "format" apps/web/src/actions/teams.ts`.
Expected: find an existing `updateTeamAction` / `updateTeamFormatAction` / similar. Record the exact name.

If no dedicated action exists, the format is updated inside `updateTeamAction`. If that's the case, the guard goes there.

- [ ] **Step 2: Write the failing test for the server-side guard**

Create `apps/web/src/actions/__tests__/teams-format-change.test.ts`. Structure to match other server-action tests in the project (mock Supabase via the project's test-utils). Essentials:

```ts
describe("updateTeamAction — format legality guard", () => {
  it("rejects a format change to gen9vgc2026regi when the team holds Miraidon", async () => {
    const supabase = makeMockSupabaseWithTeam({
      teamId: 42,
      format: "gen9vgc2024regh",
      pokemon: [{ species: "Miraidon" }, { species: "Incineroar" }],
    });

    const result = await updateTeamActionInner(supabase, {
      teamId: 42,
      format: "gen9vgc2026regi",
    });

    expect(result).toEqual({
      success: false,
      error: expect.stringContaining("Miraidon"),
    });
    expect(supabase.updateCalls).toHaveLength(0);
  });

  it("allows a format change when all team species are legal in the target format", async () => {
    const supabase = makeMockSupabaseWithTeam({
      teamId: 42,
      format: "gen9vgc2024regh",
      pokemon: [{ species: "Incineroar" }, { species: "Rillaboom" }],
    });

    const result = await updateTeamActionInner(supabase, {
      teamId: 42,
      format: "gen9vgc2026regi",
    });

    expect(result).toEqual({ success: true, data: expect.anything() });
  });

  it("skips the guard entirely when the target format has no registered legality", async () => {
    const supabase = makeMockSupabaseWithTeam({
      teamId: 42,
      format: "gen9vgc2024regh",
      pokemon: [{ species: "Miraidon" }],
    });

    const result = await updateTeamActionInner(supabase, {
      teamId: 42,
      format: "unknown-format-id",
    });

    expect(result.success).toBe(true);
  });
});
```

Exact mock helpers depend on project patterns — match what's used in other `apps/web/src/actions/__tests__/*.test.ts` files.

- [ ] **Step 3: Run the test and verify it fails**

Run: `pnpm --filter @trainers/web test -- teams-format-change`
Expected: FAIL.

- [ ] **Step 4: Add the guard in the server action**

In `apps/web/src/actions/teams.ts`, in `updateTeamAction` (or wherever `format` is updated on a team), add:

```ts
import { getLegalSpecies } from "@trainers/pokemon";

// ... inside updateTeamAction, before the update statement:
if (input.format !== undefined && input.format !== existingTeam.format) {
  const legalSet = getLegalSpecies(input.format);
  if (legalSet !== undefined) {
    const illegal = existingTeam.team_pokemon
      .map((p) => p.pokemon?.species)
      .filter((s): s is string => Boolean(s) && !legalSet.has(s));
    if (illegal.length > 0) {
      return {
        success: false,
        error: `These Pokémon aren't legal in the target format: ${illegal.join(", ")}. Remove them before changing format.`,
      };
    }
  }
}
```

`existingTeam` needs to already include `team_pokemon` with species joined. If the action currently does not fetch them, add a prefetching query (use the existing `getTeamWithPokemon` if available; otherwise issue a focused select).

- [ ] **Step 5: Add the client-side guard**

In `team-workspace.tsx` (or wherever a format-change control lives — the header bar's format badge may be clickable, or there's a settings sheet), the user flow is: select a new format → call the server action → handle the result.

On a non-success result from the server action, surface the error via the existing `sonner` toast helper (search for `toast.error` usage elsewhere in the workspace for the pattern):

```tsx
const result = await updateTeamAction({ teamId: team.id, format: newFormatId });
if (!result.success) {
  toast.error(result.error);
  return; // don't refresh local state
}
```

The server guard is authoritative; the client just reacts. No need for a duplicate check client-side unless the UX wants instant-feedback before the round-trip — not required for V1.

- [ ] **Step 6: Run the test and verify it passes**

Run: `pnpm --filter @trainers/web test -- teams-format-change`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/actions/teams.ts \
        apps/web/src/actions/__tests__/teams-format-change.test.ts \
        apps/web/src/components/team-builder/team-workspace.tsx
git commit -m "feat(builder): block format change when team holds species illegal in target"
```

---

## Task 8: Paste import guards — whole-team + per-Pokemon

**Files:**
- Modify: `apps/web/src/components/team-builder/new-team-submit.ts`
- Modify: `apps/web/src/components/team-builder/__tests__/new-team-submit.test.ts`
- Modify: `apps/web/src/components/team-builder/import-dialog.tsx`
- Modify: `apps/web/src/components/team-builder/__tests__/import-dialog.test.tsx`

- [ ] **Step 1: Add failing test for `submitNewTeam` illegal-paste rejection**

In `new-team-submit.test.ts`, add:

```ts
describe("submitNewTeam — format legality", () => {
  it("rejects the whole paste when it contains species illegal for the target format", async () => {
    const input = {
      altId: 1,
      name: "Test",
      format: "championsvgc2026regma",
      mode: "import" as const,
      paste:
        "Miraidon @ Life Orb\nAbility: Hadron Engine\nEVs: 4 HP / 252 SpA / 252 Spe\nTimid Nature\n- Electro Drift\n\nIncineroar @ Safety Goggles\nAbility: Intimidate\nEVs: 252 HP / 4 Atk / 252 Def\nImpish Nature\n- Fake Out",
    };
    (parseShowdownText as jest.Mock).mockReturnValue([
      { species: "Miraidon", ability: "Hadron Engine", nature: "Timid", move1: "Electro Drift", ev_hp: 4, ev_special_attack: 252, ev_speed: 252, level: 50, /* minimal rest */ } as any,
      { species: "Incineroar", ability: "Intimidate", nature: "Impish", move1: "Fake Out", ev_hp: 252, ev_attack: 4, ev_defense: 252, level: 50, /* minimal rest */ } as any,
    ]);

    const result = await submitNewTeam(input);

    expect(result).toEqual({
      status: "error",
      error: expect.stringContaining("Miraidon"),
    });
    expect(createTeamAction).not.toHaveBeenCalled();
    expect(addPokemonToTeamAction).not.toHaveBeenCalled();
  });

  it("proceeds when every pasted species is legal in the target format", async () => {
    const input = {
      altId: 1,
      name: "Test",
      format: "championsvgc2026regma",
      mode: "import" as const,
      paste: "Incineroar @ Safety Goggles\nAbility: Intimidate\n- Fake Out",
    };
    (parseShowdownText as jest.Mock).mockReturnValue([
      { species: "Incineroar", ability: "Intimidate", nature: "Impish", move1: "Fake Out", ev_hp: 0, ev_attack: 0, ev_defense: 0, ev_special_attack: 0, ev_special_defense: 0, ev_speed: 0, level: 50 } as any,
    ]);
    (createTeamAction as jest.Mock).mockResolvedValue({
      success: true,
      data: { id: 99 },
    });
    (addPokemonToTeamAction as jest.Mock).mockResolvedValue({ success: true });

    const result = await submitNewTeam(input);

    expect(result).toEqual({ status: "ok", teamId: 99 });
    expect(createTeamAction).toHaveBeenCalled();
  });
});
```

Match the existing test file's mock patterns for `parseShowdownText`, `createTeamAction`, and `addPokemonToTeamAction` — they're already mocked elsewhere in the file.

- [ ] **Step 2: Run the test and verify it fails**

Run: `pnpm --filter @trainers/web test -- new-team-submit`
Expected: FAIL.

- [ ] **Step 3: Add the guard to `submitNewTeam`**

In `apps/web/src/components/team-builder/new-team-submit.ts`, after `parseShowdownText(input.paste.trim())` returns but before iterating `toImport`, add:

```ts
import { getLegalSpecies } from "@trainers/pokemon";

// ... inside submitNewTeam, after `const parsed = parseShowdownText(...)`:
const legalSet = getLegalSpecies(input.format);
if (legalSet !== undefined) {
  const illegal = parsed
    .map((p) => p.species)
    .filter((species): species is string => Boolean(species) && !legalSet.has(species));
  if (illegal.length > 0) {
    return {
      status: "error",
      error: `Cannot import. These Pokémon aren't legal in ${input.format}: ${illegal.join(", ")}.`,
    };
  }
}
```

The rejection happens **before** `createTeamAction` — no team row is created on a rejected import.

- [ ] **Step 4: Run the test and verify it passes**

Run: `pnpm --filter @trainers/web test -- new-team-submit`
Expected: PASS.

- [ ] **Step 5: Add failing test for `ImportDialog` per-Pokemon legality**

In `apps/web/src/components/team-builder/__tests__/import-dialog.test.tsx` (create if doesn't exist; match existing dialog test patterns):

```tsx
describe("ImportDialog — per-Pokemon format legality", () => {
  it("refuses to import a Pokemon whose species is illegal in the team's format", async () => {
    const onImport = jest.fn();
    render(
      <ImportDialog
        open={true}
        onOpenChange={jest.fn()}
        teamId={1}
        formatId="championsvgc2026regma"
        onImport={onImport}
      />
    );
    // Paste an illegal Pokemon
    fireEvent.change(screen.getByLabelText(/paste/i), {
      target: {
        value:
          "Miraidon @ Life Orb\nAbility: Hadron Engine\nEVs: 4 HP / 252 SpA / 252 Spe\nTimid Nature\n- Electro Drift",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /import/i }));

    expect(
      await screen.findByText(/not legal.*Miraidon|Miraidon.*not legal/i)
    ).toBeInTheDocument();
    expect(onImport).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: Add the guard to `ImportDialog`**

Open `apps/web/src/components/team-builder/import-dialog.tsx`. Add import:

```tsx
import { getLegalSpecies } from "@trainers/pokemon";
```

Add `formatId: string` (or `formatId?: string`) to the props interface and destructure it in the component.

Inside the paste-submit handler, after `parseShowdownText`, add:

```tsx
const legalSet = formatId ? getLegalSpecies(formatId) : undefined;
if (legalSet !== undefined) {
  const illegal = parsed
    .map((p) => p.species)
    .filter((species): species is string => Boolean(species) && !legalSet.has(species));
  if (illegal.length > 0) {
    setError(`These Pokémon aren't legal in this format: ${illegal.join(", ")}.`);
    return;
  }
}
```

(If the dialog doesn't currently have an `error` state, add `const [error, setError] = useState<string | null>(null);` and render it inside the dialog body: `{error && <p className="text-destructive text-sm">{error}</p>}`.)

- [ ] **Step 7: Pass `formatId` into ImportDialog from its caller**

Find where `<ImportDialog ... />` is rendered in the workspace. Add the prop `formatId={format?.id}`.

- [ ] **Step 8: Run both test suites**

Run: `pnpm --filter @trainers/web test -- new-team-submit import-dialog`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/components/team-builder/new-team-submit.ts \
        apps/web/src/components/team-builder/__tests__/new-team-submit.test.ts \
        apps/web/src/components/team-builder/import-dialog.tsx \
        apps/web/src/components/team-builder/__tests__/import-dialog.test.tsx \
        apps/web/src/components/team-builder/team-workspace.tsx
git commit -m "feat(builder): reject paste imports containing species illegal in target format"
```

---

## Task 9: Final verification

- [ ] **Step 1: Run the full web test suite**

Run: `pnpm test --filter @trainers/web`
Expected: 203+ suites pass; total test count is at least 3481 (the pre-change baseline) plus the new cases added in this plan.

- [ ] **Step 2: Run the full pokemon test suite**

Run: `pnpm --filter @trainers/pokemon test`
Expected: PASS.

- [ ] **Step 3: Full lint + typecheck across the monorepo**

Run: `pnpm lint` then `pnpm typecheck`
Expected: 11/11 packages pass on each.

- [ ] **Step 4: Manual browser smoke (per spec Verification section)**

Start `pnpm dev:web`. Sign in as `admin@trainers.local` / `Password123!`. Run through the 9 manual smoke steps listed in `docs/superpowers/specs/2026-04-14-champions-legality-design.md` under **Manual / end-to-end (post-implementation smoke)**.

Capture any regression — don't push until every smoke step is green.

- [ ] **Step 5: Commit any smoke-test fixes**

If any manual step surfaced a bug, fix it and commit with a clear message. If everything passed, no commit needed.

---

## Notes on `@pkmn/sim` API verification

Task 2 depends on `TeamValidator.validateSet(set, teamHas)` returning `string[] | null`. If, during implementation, the actual API differs (e.g., a version mismatch changes the method name), fall back to `new TeamValidator(format, SimDex).validateTeam([set])` and inspect the returned issues array — the species-level ban shows up in the first entry. Treat "no issues referencing this species" as legal.

If the sim probe is too slow for the initial call (iterating ~1000 species against a validator), consider short-circuiting the loop via `format.banlist` / `format.restricted` directly (both are arrays on the format spec). That is a performance optimization; correctness comes from `validateSet` — start there.
