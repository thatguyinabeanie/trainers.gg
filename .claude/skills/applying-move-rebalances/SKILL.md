---
name: applying-move-rebalances
description: Use when a Champions regulation patch rebalances moves or changes ability mechanics, OR when a new reg adds Megas/species that must be wired into the damage calculator (vendor/damage-calc/calc/).
---

# Applying Move Rebalances & Calc Wiring

Home for all knowledge about the `@smogon/calc` fork at `vendor/damage-calc/calc/`. Covers
move/ability mechanic changes, new-Mega registration, tests, and the build + ship workflow.

See `adding-a-regulation` for the legality side (`packages/pokemon/`). See
`syncing-calc-fork-upstream` for rebasing the fork on upstream `@smogon/calc` changes.

---

## Two Parallel Data Worlds

The codebase has **two independent representations** of every Pokemon. They do not share data.

| World | Package | Purpose | Stats source |
|---|---|---|---|
| Builder / legality | `packages/pokemon/` | Team construction, legal pool | `@pkmn/dex` |
| Damage calculator | `vendor/damage-calc/calc/` | In-battle damage snapshots | Fork's own `src/data/` |

**Critical rule:** Updating `packages/pokemon/` does NOT make the calc support a species. Both
sides must be updated independently. A Mega working in the builder is NOT proof it works in the
calc — M-B shipped with zero Megas calc-supported because the species were never registered here.

---

## The Four Edit Points

Every change to the calc lives in exactly one of these files:

| What to change | File |
|---|---|
| New species / Mega defs, stat blocks | `calc/src/data/species.ts` |
| Move rebalances (bp, type, flags) | `calc/src/data/moves.ts` |
| New ability names (membership) | `calc/src/data/abilities.ts` |
| Ability damage effects (type boost, immunity) | `calc/src/mechanics/champions.ts` |
| New Mega Stone → forme mapping | `calc/src/data/items.ts` |

---

## 1. Species Registration (`species.ts`)

`CHAMPIONS_LIST` is the source of truth for the Champions gen-0 calc dex. It is a flat
alphabetical array of every species string the calc can instantiate.

The build merges `SV[species]` data for every entry in `CHAMPIONS_LIST` then applies
`CHAMPIONS_PATCH` on top. `otherFormes` is then filtered to only include species also in
`CHAMPIONS_LIST` — so a Mega absent from the list is silently dropped, making the base species
unable to mega-evolve.

**Both the base species AND each Mega forme must be in `CHAMPIONS_LIST` (alphabetical).** To add
a new Mega:
1. Add both `'Wobbuffet'` and `'Wobbuffet-Mega'` to `CHAMPIONS_LIST` alphabetically.
2. Add a SV-era forme def in the `SV` block if one doesn't already exist (custom Champions
   Megas need a full stat block; standard Gen 6/7 Megas usually already have SV entries).
3. If the base species' `otherFormes` in SV already includes the Mega, nothing more is needed.
   If not, add it via `CHAMPIONS_PATCH`:

```typescript
const CHAMPIONS_PATCH: {[name: string]: DeepPartial<SpeciesData>} = {
  'Floette-Eternal': {otherFormes: ['Floette-Mega']}, // SV entry lacks this forme
  'Floette-Mega': {baseSpecies: 'Floette-Eternal'},   // fix base species pointer
};
```

---

## 2. Move Rebalances (`moves.ts`)

All Champions-format move changes go in `CHAMPIONS_PATCH` near the bottom of `moves.ts`:

```typescript
const CHAMPIONS_PATCH: {[name: string]: DeepPartial<MoveData>} = {
  'Apple Acid': {bp: 90},       // base power change
  'Growth':     {type: 'Grass'}, // type change
  'Crush Claw': {isSlicing: true}, // flag addition
};
```

### What to encode vs skip

Only encode properties that change a **damage snapshot**. Skip properties that are purely
battle-state (accuracy, PP, secondary-effect %, status conditions, switch-out resets, etc.).

| Property | Encode? | Why |
|---|---|---|
| `bp` (base power) | Yes | Directly scales damage output |
| `type` | Yes | Changes STAB, type effectiveness, ability interactions |
| `isSlicing` | Yes | Enables Sharpness ability 1.5× modifier |
| `isSound` | Yes | Affects Punk Rock, Soundproof, throat-spray |
| Crit ratio change | No | Crits are a separate roll, not the snapshot |
| Secondary-effect % | No | Doesn't affect the damage calculation |
| Accuracy / PP | No | Not modelled in the calc |
| Rage Fist reset | No | Battle-state; but its 350 BP cap IS encoded (it's a BP limit) |

---

## 3. Ability Membership (`abilities.ts`)

Any new Champions-exclusive ability name must appear in the `CHAMPIONS` array in `abilities.ts`.
The array is the gen-0 ability roster — if the name is absent, the UI can't select it and
`attacker.hasAbility('MyAbility')` silently returns false.

```typescript
const CHAMPIONS = [
  // ... alphabetical list
  'Eelevate',   // Ground immunity (Mega Eelektross)
  'Fire Mane',  // Fire-type 1.5× boost (Mega Pyroar)
  // ...
];
```

---

## 4. Ability Effects (`mechanics/champions.ts`)

### Type-boost ability (mirrors Steelworker / Flash Fire pattern)

Add an `else if` branch in `calculateAtModsChampions`. 6144/4096 = 1.5×; 8192/4096 = 2×
(Huge Power); 2048/4096 = 0.5× for defensive nerfs (Heatproof, Thick Fat).

```typescript
// calculateAtModsChampions() — 1.5× Fire boost example
} else if (attacker.hasAbility('Fire Mane') && move.hasType('Fire')) {
  atMods.push(6144);
  desc.attackerAbility = attacker.ability;
}
```

### Type-immunity ability (mirrors Levitate / Eelevate pattern)

Add the ability name to the early-return 0-damage guard block in `calculateDamageChampions`:

```typescript
(move.hasType('Ground') &&
  !field.isGravity && defender.hasAbility('Levitate', 'Eelevate')) ||
```

Add `!field.isGravity` for levitation-type immunities; omit it for unconditional immunities
(Earth Eater, etc.).

---

## 5. Mega Stone Registration (`items.ts`)

New Mega Stones need two entries:

1. The stone string in the `CHAMPIONS` item array (alphabetical).
2. A mapping in `ZA_MEGA_STONES` (or the equivalent Champions-specific stones map):
   `Pyroarite: {Pyroar: 'Pyroar-Mega'}`.

```typescript
const ZA_MEGA_STONES: {[stone: string]: {[species: string]: string}} = {
  // ...
  Pyroarite: {Pyroar: 'Pyroar-Mega'},
  // ...
};

const CHAMPIONS = [
  // ...
  'Pyroarite',  // must also appear here
  // ...
];
```

---

## 6. Tests (`calc/src/test/calc.test.ts`)

All Champions calc tests live **inside** the `inGen(0, ({calculate, Pokemon, Move, Field}) => …)`
block under `describe('Champions', …)`. Using top-level helpers throws `species undefined`
for Champions-only Megas — they default to gen 9.

Write three tests per type-boost ability (boosted vs control, non-matching type, description
string) and three per immunity (ground hit → 0, Gravity exception, non-matching type → nonzero):

```typescript
// Type-boost pattern (Fire Mane reference)
inGen(0, ({calculate, Pokemon, Move}) => {
  describe('Fire Mane (Mega Pyroar)', () => {
    const defender = Pokemon('Blastoise');

    test('boosts matching type 1.5×', () => {
      const withMane    = Pokemon('Pyroar-Mega', {ability: 'Fire Mane'});
      const withoutMane = Pokemon('Pyroar-Mega', {ability: 'Unnerve'});
      const boosted   = calculate(withMane,    defender, Move('Flamethrower'));
      const unboosted = calculate(withoutMane, defender, Move('Flamethrower'));
      expect(boosted.range()[0]).toBeGreaterThan(unboosted.range()[0]);
    });

    test('does not boost non-matching type', () => {
      const withMane    = Pokemon('Pyroar-Mega', {ability: 'Fire Mane'});
      const withoutMane = Pokemon('Pyroar-Mega', {ability: 'Unnerve'});
      expect(calculate(withMane, defender, Move('Hyper Voice')).range())
        .toEqual(calculate(withoutMane, defender, Move('Hyper Voice')).range());
    });

    test('appears in damage description', () => {
      expect(calculate(Pokemon('Pyroar-Mega', {ability: 'Fire Mane'}),
                       defender, Move('Flamethrower')).desc()).toContain('Fire Mane');
    });
  });

  // Immunity pattern (Eelevate reference)
  describe('Eelevate (Mega Eelektross)', () => {
    const eelevate = Pokemon('Eelektross-Mega', {ability: 'Eelevate'});
    const gchomp   = Pokemon('Garchomp');

    test('grants immunity to Ground moves', () => {
      expect(calculate(gchomp, eelevate, Move('Earthquake')).damage).toBe(0);
    });
    test('immunity suppressed by Gravity', () => {
      expect(calculate(gchomp, eelevate, Move('Earthquake'),
                       Field({isGravity: true})).damage).not.toBe(0);
    });
    test('does not affect non-Ground moves', () => {
      expect(calculate(gchomp, eelevate, Move('Surf')).damage).not.toBe(0);
    });
  });
});
```

---

## Registration Checklist (New Mega / Species)

Run through this for every Mega added in a new reg. Each gap is a silent failure.

- [ ] **Forme def exists in `SV` block** — stat block (`bs`), `types`, `weightkg`, `abilities`, `baseSpecies` all present
- [ ] **Base species in `CHAMPIONS_LIST`** — alphabetically ordered
- [ ] **Mega forme in `CHAMPIONS_LIST`** — alphabetically ordered (absence silently drops it from `otherFormes`)
- [ ] **Base species' `otherFormes` includes the Mega** — either in the SV entry or via `CHAMPIONS_PATCH`
- [ ] **Mega Stone in `ZA_MEGA_STONES`** (or equivalent map) with correct `{BaseSpecies: 'Base-Mega'}` mapping
- [ ] **Stone string in `CHAMPIONS` items array** (`items.ts`)
- [ ] **New ability name in `CHAMPIONS` abilities array** (`abilities.ts`) if ability is Champions-exclusive
- [ ] **Ability damage effect implemented** in `calculateAtModsChampions` or the immunity block (`mechanics/champions.ts`)
- [ ] **Tests written** inside `inGen(0, ...)` — boost test, control test, description test; immunity test + Gravity exception
- [ ] `npm run build` from `calc/` — zero errors, `dist/` regenerated
- [ ] `npm test` from `calc/` — full suite passes (0 failures)

---

## Build + Submodule + Ship Workflow

The calc ships its **committed `dist/`** so pnpm can symlink it deterministically. Always rebuild
after every `src/` change.

```bash
# 1. Make all src/ edits, then:
cd vendor/damage-calc/calc
npm run build     # regenerates dist/ — must be committed
npm test          # full suite, must be 0 failures

# 2. Commit inside the submodule (fork: thatguyinabeanie/damage-calc, branch: master)
cd vendor/damage-calc
git add calc/src/ calc/dist/
git commit -m "champions: <describe change>"
git push origin master   # push access to the fork required; CI/Vercel fetch this commit

# 3. Bump the submodule pointer in the main repo
cd ../..   # back to repo root
git add vendor/damage-calc
# Then commit + push the main repo (orchestrator handles this)

# 4. Verify main-repo packages still typecheck
pnpm typecheck --filter @trainers/pokemon --filter @trainers/validators
```

**Never change the `@smogon/calc` dependency back to a git tarball** (`github:...#sha&path:/calc`).
The submodule + `file:` path is required for pnpm's `--frozen-lockfile` in CI. See the "Gotchas"
section in the root `CLAUDE.md` for the full explanation.
