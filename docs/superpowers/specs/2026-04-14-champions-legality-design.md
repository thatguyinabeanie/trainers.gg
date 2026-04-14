# Format Species Legality

## Problem

The team builder's Species picker shows every gen-9 species regardless of the team's format. This is wrong in two ways:

1. **Champions: VGC 2026 Reg M-A** is gen 10 with a distinct, roughly 200-species roster. Users currently see ~1000+ gen-9 species when building a Champions team and nothing prevents selecting something outside the format.
2. **VGC Reg I / G / H and other Smogon formats** have their own banlists (restricted legendaries, Mythicals, etc.). Today those restrictions are invisible in the picker too.

This spec covers **species-only** legality for all active formats. Items and move legality are deferred to follow-ups.

## Goal

When a team has a format whose legality we can determine, the editor experience reflects that format:

- The Species picker visually distinguishes legal from illegal species.
- The calc-tab defender search does the same.
- Users cannot switch an existing team into a stricter format while holding illegal species.
- Users cannot import a Showdown paste whose species are illegal in the target format.

For formats where we cannot determine legality (unknown format ID, legacy Smogon tiers we don't model, etc.), behavior falls back to today's permissive "all gen-9 species legal" default.

## Locked-in decisions

1. **Scope — all active formats in our registry**, not just Champions M-A. The legality API has one entry point; data comes from two sources.
2. **Data sources:**
   - **Champions: VGC 2026 Reg M-A** — ported NCP VGC Damage Calculator `POKEDEX_CHAMPIONS` list (`pokedex.js`, lines 18375–18410, captured 2026-04-14) as a static TS `Set`. `@pkmn/sim` doesn't know about Champions (gen 10), so a hand-maintained port is the only option.
   - **Every other registered format (VGC Reg I/G/H, Smogon tiers, etc.)** — derived from `@pkmn/sim`'s `Dex.formats.get(...)` + `TeamValidator`. For each species in the generation, check it against the format's banlist / restricted list and collect the legal subset.
3. **Items** — Champions uses the same item pool as gen-9 SV **for now**. A follow-up will narrow using https://www.videogameschronicle.com/guide/pokemon-champions-all-items-in-pokemon-champions/. Non-Champions item legality is also deferred.
4. **Picker visual** — all species still render in the table. Illegal rows are dimmed with a "Not legal" badge; click-to-select is blocked.
5. **Existing teams** — switching an already-populated team into a stricter format is **blocked** when any current Pokemon is illegal. User removes illegal ones first.
6. **Paste import** — a paste containing illegal species for the target format is **rejected whole**, with an error listing the offending species.

## Architecture

### Data module

New file: `packages/pokemon/src/format-legality.ts`

The module has one public entry point, `getLegalSpecies(formatId)`, that dispatches between two internal sources:

```ts
/**
 * Returns the set of species legal in the given format, or `undefined`
 * if legality cannot be determined for this format (treat as permissive).
 *
 * Dispatches to:
 * - Static port for Champions: VGC 2026 Reg M-A (gen 10, not in @pkmn/sim).
 * - @pkmn/sim's TeamValidator for every other registered format.
 */
export function getLegalSpecies(formatId: string): ReadonlySet<string> | undefined;

/**
 * True when `species` is legal in `formatId`. Returns true for any format
 * without computable legality (permissive default).
 */
export function isLegalSpecies(species: string, formatId: string): boolean;
```

#### Source A — Champions M-A (static port)

```ts
const CHAMPIONS_MA_LEGAL_SPECIES: ReadonlySet<string> = new Set([
  // ~200 entries: Venusaur, Charizard, ... Hydrapple, plus distinct battle forms
  // (Rotom-Heat, Tauros-Paldea-Combat, Ogerpon-Wellspring, etc.).
]);
```

**Normalizations on import from the NCP list:**

- Drop all `"Mega X"` entries. Megas are item-driven battle transformations, not separately selectable species — "Charizard" is the picker entry, and Charizardite Y activates Mega Charizard Y in battle.
- Retain distinct battle forms: `Tauros-Paldea-Combat`, `Tauros-Paldea-Aqua`, `Tauros-Paldea-Blaze`, `Rotom-Heat/Wash/Frost/Fan/Mow`, `Ogerpon-Wellspring/Hearthflame/Cornerstone`, `Aegislash-Blade/Shield`, `Meowstic-F`, `Basculegion-F`, `Maushold-Three`, `Palafin-Hero`, `Gourgeist-Small/Large/Super`, `Avalugg-Hisui`, `Decidueye-Hisui`, `Goodra-Hisui`, `Ninetales-Alola`, `Arcanine-Hisui`, `Slowking-Galar`, `Slowbro-Galar`, `Stunfisk-Galar`, `Samurott-Hisui`, `Typhlosion-Hisui`, `Zoroark-Hisui`, `Wyrdeer`, `Kleavor`, `Basculegion`, `Sneasler`, `Raichu-Alola`, `Gourgeist-Average`, `Floette-Eternal`, `Lycanroc-Midday/Midnight/Dusk`, `Morpeko-Hangry`, `Mr. Rime`.
- Verify each retained form name matches the string our dex uses. If names differ, add a one-time normalization step during import so the legal set uses the dex's canonical names.
- Commit the final set as static data; no build-time derivation from the NCP repo.

#### Source B — `@pkmn/sim` for every other format

For VGC (Reg I / G / H) and Smogon tiers, derive the legal set once per format and cache:

```ts
import { Dex as SimDex, TeamValidator } from "@pkmn/sim";

const simSetCache = new Map<string, ReadonlySet<string>>();

function computeLegalSpeciesFromSim(
  formatId: string
): ReadonlySet<string> | undefined {
  const cached = simSetCache.get(formatId);
  if (cached) return cached;

  // Resolve our format ID (e.g. "gen9vgc2024regg") to the Showdown format
  // @pkmn/sim expects. The existing SUPPORTED_FORMATS map in team-validator.ts
  // handles VGC/OU/etc. fallbacks; extend it or query Dex.formats directly.
  const format = SimDex.formats.get(showdownIdFor(formatId));
  if (!format?.exists) return undefined;

  const validator = new TeamValidator(format, SimDex);
  const gen = format.mod ? SimDex.forGen(format.mod) : SimDex;
  const legal = new Set<string>();

  for (const species of gen.species.all()) {
    if (!species.exists || species.isNonstandard) continue;
    // TeamValidator exposes checkSpecies/checkCanLearn-style helpers.
    // Use validator.checkSpecies (or the equivalent API) to validate a minimal
    // set for the species. A null return from the underlying check means
    // "legal"; any returned issue string means "not legal for this format".
    const issues = validator.checkSpecies?.(species) ?? null;
    if (!issues) legal.add(species.name);
  }

  const frozen: ReadonlySet<string> = legal;
  simSetCache.set(formatId, frozen);
  return frozen;
}
```

Notes on `@pkmn/sim` integration:

- The precise `TeamValidator` method for a per-species check varies by version. Implementation must verify the right API (likely `validator.validateSet({species, ...}, ...)` with a minimal set, or iterating `format.ruleset` manually and checking the banlist / restricted lists). If `checkSpecies` isn't available, fall back to:
  1. Building a minimal `PokemonSet` for the species with a valid ability/nature/moves,
  2. Running `validator.validateSet(set)`,
  3. Treating "no issues" as legal.
- Results are cached per format ID at module scope. The first call per format pays the cost; subsequent calls are O(1).
- If `SimDex.formats.get` returns a non-existent format, `getLegalSpecies` returns `undefined` — permissive fallback.
- The existing `SUPPORTED_FORMATS` map in `team-validator.ts` falls back to `[Gen 9] OU` for unsupported formats. This is wrong for legality (OU's banlist differs from VGC's). Replace with direct lookup into `SimDex.formats` using the actual Showdown IDs (`gen9vgc2024regg`, `gen9vgc2024regh`, `gen9vgc2024regi`, etc.); where `@pkmn/sim` truly doesn't register a format, return `undefined`.

### Species picker integration

`apps/web/src/components/team-builder/species-picker.tsx` and `species-table.tsx`:

- Accept (or read from an existing prop chain) the active `formatId`.
- The table continues to iterate every matching search result. For each row, call `isLegalSpecies(row.species, formatId)`.
- When `!isLegal`:
  - Row renders with `opacity-50` and `aria-disabled="true"`.
  - A `Badge` labeled "Not legal" renders next to the species name.
  - `onSelect` / `onRowClick` becomes a no-op for the row (the table's `preview` handler may still fire, so the user can still see the species detail — it just can't be added).
  - The detail panel's primary "Select" / "Select with popular set" / "Select blank" buttons render disabled, accompanied by a muted line: "Not legal in Champions: Reg M-A."
- Search, type/ability/move filters, and sorting operate unchanged over the full gen-9 set — illegal species are still discoverable by search; they just cannot be added to the team.

### Calc-tab defender species search

`apps/web/src/components/team-builder/damage-calc-tab.tsx` — `InlineSpeciesSearch`:

- Same model: all matching species appear in the dropdown; illegal ones render dimmed with the "Not legal" badge and cannot be selected.
- Rationale: the user's mental model is "the format decides what exists" — consistency with the main picker matters more than ease of sandboxing.

### Format-change guard

`TeamWorkspace` (wherever the team's `format` field is editable — likely via a Server Action that updates the team row):

- Before persisting a format change to a format with a registered legality list, compute the illegal subset of current team Pokemon species.
- If the subset is non-empty, **block the change** and surface a blocking dialog / toast:

  > "Can't change format to Champions: VGC 2026 Reg M-A. These Pokémon aren't legal in this format: Landorus-T, Mewtwo. Remove or replace them first."

- If the subset is empty, proceed as today.
- The guard only fires on format **changes**. Creating a new Champions-format team is always fine (the team starts empty).

### Paste import guard

Two import entry points must honor the guard:

1. `apps/web/src/components/team-builder/new-team-submit.ts` (`submitNewTeam`) — whole-team paste on create.
2. `apps/web/src/components/team-builder/import-dialog.tsx` — per-Pokemon paste into an existing team.

Both paths:

- After `parseShowdownText`, when the target format has a registered legality list, compute the illegal subset of parsed species.
- If any are illegal: return / surface an error listing the offending species. Do not insert any Pokemon from that paste.
- If all are legal: proceed as today.

Rationale: partial imports "silently drop illegal species" would feel deceptive. An explicit rejection preserves user trust.

### Out of scope

- Item legality (follow-up, URL source noted).
- Move legality per species (Validator `checkCanLearn` exists but not wired here).
- Tera type restrictions per format.
- Ability legality beyond what species-level legality implies.
- "Show all gen-9 species anyway" escape hatch in the picker.
- Build-time derivation of the Champions legal set — the list is inlined as static data.

## Compatibility notes

- **Gen 10 (Champions)**: `@pkmn/dex` caps at gen 9. The species-search index already clamps to gen 9 for higher-gen formats (`speed-tiers.ts` uses the same clamp). The NCP-ported Champions roster is a subset of the gen-9 national dex (including Hisui / Paldea / Galar forms), so every legal species in V1 resolves to an existing dex entry. Champions-exclusive gen-10 additions would need a separate dex-extension effort — out of scope.
- **`@pkmn/sim` format coverage**: VGC regulation formats (`gen9vgc2024regi`, `regh`, `regg`, etc.) are registered in `@pkmn/sim` with their official banlists. Smogon tiers (OU/UU/RU/NU/PU/LC/Monotype/AG) are also registered. If a format in our app's registry doesn't resolve in `@pkmn/sim`, `getLegalSpecies` returns `undefined` and the picker stays permissive — no worse than today.
- **Form naming**: `@pkmn/sim` species use dex-canonical names (e.g. "Rotom-Heat"). The NCP Champions port uses similar but not identical conventions; the import-time normalization step ensures both sources agree on the canonical name our picker emits.

## Test plan

### Unit (`packages/pokemon`)

**Champions (static-port path):**

- `isLegalSpecies("Incineroar", "championsvgc2026regma")` → true.
- `isLegalSpecies("Landorus-Therian", "championsvgc2026regma")` → false.
- `getLegalSpecies("championsvgc2026regma")` returns exactly the NCP-ported set.
- Data integrity: no "Mega X" entries; all retained battle forms present.

**VGC / Smogon (`@pkmn/sim` path):**

- `isLegalSpecies("Miraidon", "gen9vgc2024regi")` → false (Reg I bans restricted legendaries).
- `isLegalSpecies("Incineroar", "gen9vgc2024regi")` → true.
- `isLegalSpecies("Mewtwo", "gen9ubers")` → true.
- `isLegalSpecies("Mewtwo", "gen9ou")` → false.
- `getLegalSpecies("gen9vgc2024regh")` is a ReadonlySet whose size matches the expected Reg H pool size (spot-check with a known count).
- Cache behavior: calling `getLegalSpecies` twice for the same format returns the same `Set` instance (proves memoization).

**Permissive fallback:**

- `isLegalSpecies("Landorus-Therian", "unknown-format-id")` → true.
- `getLegalSpecies("unknown-format-id")` → undefined.

### Component (`apps/web`)

- `species-picker.test.tsx` — at Champions M-A format, illegal rows render with `opacity-50` + "Not legal" badge; clicking them does not fire `onSelect`. Regression: at VGC Reg I, restricted legendaries (Miraidon, Koraidon) get the same treatment.
- `species-picker.test.tsx` — at a format whose legality we can't determine (permissive fallback), no "Not legal" badges appear.
- `damage-calc-tab.test.tsx` — `InlineSpeciesSearch` on a Reg I team dims restricted-legendary matches and blocks selection.
- Format-change guard test — attempting to change a team holding Miraidon to `gen9vgc2024regi` fails with the expected error and the team row is not updated.
- Format-change guard test — attempting to change a team holding Landorus-T to Champions M-A fails with the expected error.
- Paste import guard test — `submitNewTeam` with a Reg I target + a paste containing Miraidon returns `{ status: "error" }` and does not call `createTeamAction` or `addPokemonToTeamAction`.

### Manual / end-to-end (post-implementation smoke)

1. Create a Champions: Reg M-A team → species picker dims roughly ~800 species. Searching "Landorus" shows Landorus-T dimmed.
2. Pick Incineroar — succeeds, becomes slot 1.
3. Create a VGC Reg I team → searching "Miraidon" shows Miraidon dimmed with the "Not legal" badge; Incineroar selectable.
4. Switch the Champions team's format to VGC Reg I via the header → succeeds; Landorus now shows as legal again in the picker (Reg I allows it).
5. Switch back to Champions M-A with Landorus still on the team → blocked with the listed-species dialog. Team format unchanged.
6. Import a VGC paste containing Flutter Mane + Incineroar into a Champions team → rejected whole, error names Flutter Mane.
7. Import a paste with Miraidon into a Reg I team → rejected whole, error names Miraidon.
8. Calc-tab defender search on Champions team: "Flutter" → Flutter Mane dimmed, not selectable.
9. Calc-tab defender search on Reg I team: "Miraidon" → dimmed, not selectable.

## Files touched

| File | Change |
|---|---|
| `packages/pokemon/src/format-legality.ts` | **New** — Champions static set, `computeLegalSpeciesFromSim`, `simSetCache`, `getLegalSpecies`, `isLegalSpecies`. |
| `packages/pokemon/src/__tests__/format-legality.test.ts` | **New** — unit tests per plan above (Champions path + `@pkmn/sim` path + permissive fallback). |
| `packages/pokemon/src/index.ts` | Re-export `getLegalSpecies`, `isLegalSpecies`. |
| `packages/pokemon/src/team-validator.ts` | Replace "[Gen 9] OU" fallback for VGC formats with direct `SimDex.formats.get(formatId)` lookup. If the format doesn't exist in `@pkmn/sim`, surface that as a distinct error instead of silently validating against OU. (This fixes a pre-existing correctness bug surfaced by this work.) |
| `apps/web/src/components/team-builder/species-picker.tsx` | Receive `formatId`; pass to `species-table.tsx`. |
| `apps/web/src/components/team-builder/species-table.tsx` | Check `isLegalSpecies` per row; apply dim + badge + block-on-select. |
| `apps/web/src/components/team-builder/damage-calc-tab.tsx` | `InlineSpeciesSearch` — same treatment for defender species. |
| `apps/web/src/components/team-builder/team-workspace.tsx` | Before persisting format change, run the legality guard and surface the blocking message. |
| `apps/web/src/components/team-builder/new-team-submit.ts` | After `parseShowdownText`, reject paste when illegal species found for the target format. |
| `apps/web/src/components/team-builder/import-dialog.tsx` | Same guard for per-Pokemon paste into an existing team. |
| `apps/web/src/actions/teams.ts` | If a Server Action handles format updates, add a defense-in-depth legality check so bypassing the client-side guard still fails. |

## Verification

Running the verification steps in the Test plan section once implementation lands is how we confirm the feature works. `pnpm lint`, `pnpm typecheck`, and `pnpm test` stay green as always before push.
