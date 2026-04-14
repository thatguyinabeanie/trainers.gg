# Champions M-A Format Legality (Species)

## Problem

The team builder's Species picker shows every gen-9 species regardless of the team's format. For VGC Reg I / G / H this is acceptable as a first pass — the illegal slice is a small banlist. For **Champions: VGC 2026 Reg M-A** it breaks the fiction: Champions is gen 10 with a distinct, roughly 200-species roster. Users currently see ~1000+ gen-9 species when building a Champions team, and nothing stops them from picking something the format doesn't support.

This spec covers the **species-only** first pass. Items and move legality are deferred to follow-ups.

## Goal

When a team's `format` is `championsvgc2026regma`, the editor experience reflects the Champions roster:

- The Species picker visually distinguishes legal from illegal species.
- The calc-tab defender search does the same.
- Users cannot switch an existing team into Champions M-A while holding illegal species.
- Users cannot import a Showdown paste into a Champions team when the paste includes illegal species.

All other formats keep today's behavior (no legality filtering).

## Locked-in decisions

1. **Scope — Champions M-A only** for V1. The legality module is designed to accept additional formats later, but the only registered list is Champions.
2. **Species data source** — port NCP VGC Damage Calculator's `POKEDEX_CHAMPIONS` list (`pokedex.js`, lines 18375–18410, captured 2026-04-14) into `packages/pokemon`. Zero runtime dependency on the NCP repo.
3. **Items** — Champions uses the same item pool as gen-9 SV **for now**. A follow-up will narrow using https://www.videogameschronicle.com/guide/pokemon-champions-all-items-in-pokemon-champions/ as the reference.
4. **Picker visual** — all species still render in the table. Illegal rows are dimmed with a "Not legal" badge; click-to-select is blocked.
5. **Existing teams** — switching an already-populated team into Champions M-A is **blocked** when any current Pokemon is illegal. User must remove the illegal ones first.
6. **Paste import** — a paste containing any illegal species into a Champions-format team is **rejected whole**, with an error listing the offending species. The legal ones are not silently imported.

## Architecture

### Data module

New file: `packages/pokemon/src/format-legality.ts`

```ts
/**
 * Species legal in Champions: VGC 2026 Reg M-A.
 * Ported from NCP VGC Damage Calculator's POKEDEX_CHAMPIONS list
 * (pokedex.js lines 18375–18410, captured 2026-04-14).
 * Update manually as the Champions roster expands.
 */
const CHAMPIONS_MA_LEGAL_SPECIES: ReadonlySet<string> = new Set([
  // ~200 entries: Venusaur, Charizard, ... Hydrapple, plus distinct battle forms
  // (Rotom-Heat, Tauros-Paldea-Combat, Ogerpon-Wellspring, etc.).
]);

const LEGAL_SPECIES_BY_FORMAT: Record<string, ReadonlySet<string>> = {
  championsvgc2026regma: CHAMPIONS_MA_LEGAL_SPECIES,
};

/**
 * Returns the set of species legal in the given format, or `undefined`
 * if the format has no registered restriction.
 *
 * Callers treat `undefined` as "all gen-9 species legal" (current behavior).
 */
export function getLegalSpecies(
  formatId: string
): ReadonlySet<string> | undefined {
  return LEGAL_SPECIES_BY_FORMAT[formatId];
}

/**
 * True when `species` is legal in `formatId`. Returns true for any
 * format without a registered legality list (permissive default).
 */
export function isLegalSpecies(species: string, formatId: string): boolean {
  const legal = getLegalSpecies(formatId);
  return legal === undefined || legal.has(species);
}
```

**Important normalizations on import from the NCP list:**

- Drop all `"Mega X"` entries. Megas are item-driven battle transformations, not separately selectable species — "Charizard" is the picker entry, and Charizardite Y activates Mega Charizard Y in battle.
- Retain distinct battle forms: `Tauros-Paldea-Combat`, `Tauros-Paldea-Aqua`, `Tauros-Paldea-Blaze`, `Rotom-Heat/Wash/Frost/Fan/Mow`, `Ogerpon-Wellspring/Hearthflame/Cornerstone`, `Aegislash-Blade/Shield`, `Meowstic-F`, `Basculegion-F`, `Maushold-Three`, `Palafin-Hero`, `Gourgeist-Small/Large/Super`, `Avalugg-Hisui`, `Decidueye-Hisui`, `Goodra-Hisui`, `Ninetales-Alola`, `Arcanine-Hisui`, `Slowking-Galar`, `Slowbro-Galar`, `Stunfisk-Galar`, `Samurott-Hisui`, `Typhlosion-Hisui`, `Zoroark-Hisui`, `Wyrdeer`, `Kleavor`, `Basculegion`, `Sneasler`, `Raichu-Alola`, `Gourgeist-Average`, `Floette-Eternal`, `Lycanroc-Midday/Midnight/Dusk`, `Morpeko-Hangry`, `Mr. Rime`.
- Verify each retained form name matches the string our dex uses. If names differ (e.g., `Gourgeist-Average` vs `Gourgeist`), add a one-time normalization step during import so the legal set uses the dex's canonical names.
- Commit the final set as static data; no build-time derivation from the NCP repo.

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
- Move legality per species.
- Tera type restrictions.
- VGC Reg I / G / H banlists — infra accepts them via `LEGAL_SPECIES_BY_FORMAT`, but no data is shipped.
- "Show all gen-9 species anyway" escape hatch in the picker.
- Build-time derivation of the legal set from NCP — the list is inlined as static data.

## Compatibility note

Champions is gen 10, but `@pkmn/dex` currently caps at gen 9. The species-search index already clamps to gen 9 for any format whose declared generation is higher (`speed-tiers.ts` uses the same clamp). The NCP-ported Champions roster is a subset of the gen-9 national dex (including Hisui / Paldea / Galar forms), so every legal species in V1 resolves to an existing dex entry. If Champions introduces truly gen-10-exclusive species later, a separate effort (dex extension) would be required to support them visually; until then, the legality check only validates names.

## Test plan

### Unit (`packages/pokemon`)

- `isLegalSpecies("Incineroar", "championsvgc2026regma")` → true.
- `isLegalSpecies("Landorus-Therian", "championsvgc2026regma")` → false.
- `isLegalSpecies("Landorus-Therian", "gen9vgc2026regi")` → true (no registered list → permissive).
- `getLegalSpecies("championsvgc2026regma")` returns a set of exactly the NCP-ported entries.
- `getLegalSpecies("gen9vgc2026regi")` → undefined.
- Data integrity: no "Mega X" entries in the set; all retained battle forms present.

### Component (`apps/web`)

- `species-picker.test.tsx` — at Champions M-A format, illegal rows render with `opacity-50` + "Not legal" badge; clicking them does not fire `onSelect`.
- `species-picker.test.tsx` — at a non-Champions format, no "Not legal" badges appear and every row is selectable (regression).
- `damage-calc-tab.test.tsx` — `InlineSpeciesSearch` on a Champions team dims illegal matches and blocks selection.
- Format-change guard test — attempting to change a team holding Landorus-T to Champions format fails with the expected error and the team row is not updated.
- Paste import guard test — `submitNewTeam` with a Champions-format target and a paste containing Mewtwo returns `{ status: "error" }` and does not call `createTeamAction` or `addPokemonToTeamAction`.

### Manual / end-to-end (post-implementation smoke)

1. Create a Champions: Reg M-A team → species picker dims roughly ~800 species. Searching "Landorus" shows Landorus-T dimmed.
2. Pick Incineroar — succeeds, becomes slot 1.
3. Switch the team's format to VGC Reg I via the header → succeeds; Landorus now shows as legal again in the picker.
4. Switch back to Champions M-A with Landorus on the team → blocked with the listed-species dialog. Team format unchanged.
5. Import a VGC paste containing Flutter Mane + Incineroar into a Champions team → rejected whole, error names Flutter Mane.
6. Calc-tab defender search: "Flutter" on Champions team → Flutter Mane dimmed, not selectable.

## Files touched

| File | Change |
|---|---|
| `packages/pokemon/src/format-legality.ts` | **New** — `CHAMPIONS_MA_LEGAL_SPECIES` set, `getLegalSpecies`, `isLegalSpecies`. |
| `packages/pokemon/src/__tests__/format-legality.test.ts` | **New** — unit tests per plan above. |
| `packages/pokemon/src/index.ts` | Re-export `getLegalSpecies`, `isLegalSpecies`. |
| `apps/web/src/components/team-builder/species-picker.tsx` | Receive `formatId`; pass to `species-table.tsx`. |
| `apps/web/src/components/team-builder/species-table.tsx` | Check `isLegalSpecies` per row; apply dim + badge + block-on-select. |
| `apps/web/src/components/team-builder/damage-calc-tab.tsx` | `InlineSpeciesSearch` — same treatment for defender species. |
| `apps/web/src/components/team-builder/team-workspace.tsx` | Before persisting format change, run the legality guard and surface the blocking message. |
| `apps/web/src/components/team-builder/new-team-submit.ts` | After `parseShowdownText`, reject paste when illegal species found for the target format. |
| `apps/web/src/components/team-builder/import-dialog.tsx` | Same guard for per-Pokemon paste into an existing team. |
| `apps/web/src/actions/teams.ts` | If a Server Action handles format updates, add a defense-in-depth legality check so bypassing the client-side guard still fails. |

## Verification

Running the verification steps in the Test plan section once implementation lands is how we confirm the feature works. `pnpm lint`, `pnpm typecheck`, and `pnpm test` stay green as always before push.
