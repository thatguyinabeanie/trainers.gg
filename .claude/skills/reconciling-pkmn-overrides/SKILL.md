---
name: reconciling-pkmn-overrides
description: Use after bumping any @pkmn/* dependency or the vendor/damage-calc submodule, or as a periodic audit, to detect and remove hardcoded Champions overrides that upstream now provides.
---

# Reconciling @pkmn Overrides

Maintenance audit for pruning Champions/synthetic-Mega overrides that upstream `@pkmn/dex`, `@pkmn/sim`, or the `@smogon/calc` fork now supplies — preventing silent drift where our value shadows a corrected upstream value.

For adding a **new** regulation, see `adding-a-regulation` instead. This skill only covers the pruning side.

## When to Run

- After any `@pkmn/*` version bump in `packages/pokemon/package.json`
- After moving the `vendor/damage-calc` submodule pointer (`git submodule update` or bumping the commit)
- As a periodic audit (quarterly is reasonable)

---

## What We Hardcode and Why

Each row lists the bundle field, the file/symbol that owns it, and the upstream source that would replace it if upstream adds Champions support.

| Override category | Field / symbol | File | Upstream replacement |
|---|---|---|---|
| **Synthetic-mega base stats** | `megaStats` / `CHAMPIONS_EXCLUSIVE_MEGA_STATS` | `champions-reg-ma.ts`, `champions-reg-mb.ts`, `stats-calculator.ts` | `Dex.forGen(9).species.get(megaName).baseStats` (or Gen 6 fallback) |
| **Synthetic-mega type overrides** | `megaTypes` / `CHAMPIONS_MEGA_TYPE_OVERRIDES` | `champions-reg-mb.ts` (2 entries: Staraptor-Mega, Barbaracle-Mega), `stats-calculator.ts` | `Dex.forGen(9).species.get(megaName).types` (or Gen 6 fallback) |
| **Brand-new ability descriptions** | `abilityDescs` / `MERGED_ABILITY_DESCS` | `champions-reg-mb.ts` (2 entries: Eelevate, Fire Mane), `abilities.ts` | `Dex.forGen(9).abilities.get(name).shortDesc` |
| **Mega → stone mappings (Champions-exclusive)** | `megaStones` in each bundle | `champions-reg-ma.ts` (23 entries), `champions-reg-mb.ts` (16 entries) | `@pkmn/dex` item data + species formes — currently absent for all Champions megas |
| **Mega → post-evolution ability (Champions-exclusive)** | `megaAbilities` in each bundle | `champions-reg-ma.ts` (~30 Champions entries), `champions-reg-mb.ts` (16 entries) | `Dex.forGen(9).species.get(megaName).abilities[0]` — currently absent |
| **Past-tagged move grants** | `moveOverrides` | `champions-reg-ma.ts` (1 entry: Floette-Eternal / Floette-Mega → Light of Ruin) | `@pkmn/sim` learnset once `isNonstandard:'Past'` filter is relaxed for Champions |
| **Calc mechanics for Champions abilities** | (not a bundle field — lives in `vendor/damage-calc`) | `vendor/damage-calc/calc/src/mechanics/champions.ts`, `data/species.ts` (`CHAMPIONS_LIST`), `data/abilities.ts` (`CHAMPIONS` array), `data/moves.ts` (`CHAMPIONS_PATCH`) | Upstream `@smogon/calc` if it ever adds Champions support — see `syncing-calc-fork-upstream` skill for the merge procedure |
| **Curated legal-species lists** | `legalSpecies` in each bundle | `champions-reg-ma.ts` (~170 entries M-A), `champions-reg-mb.ts` (extends M-A) | Would shrink/vanish if `@pkmn/sim` ships a Champions format |
| **Curated legal-items lists** | `legalItems` in each bundle | `champions-reg-ma.ts` (30 + 59 mega stones + 28 berries), `champions-reg-mb.ts` (extends M-A) | Same — `@pkmn/sim` Champions format would gate items |
| **`SIM_UNSUPPORTED_FORMAT_IDS`** | `SIM_UNSUPPORTED_FORMAT_IDS` | `formats.ts` | Remove an entry once `@pkmn/sim` registers a matching Champions format |

**Why we hardcode at all:** `@pkmn/dex` and `@pkmn/sim` follow the main-series game data. Champions is a mobile game that introduces synthetic Megas, brand-new abilities, and a curated item/species pool that has never appeared in a console game. Until upstream packages add Champions support, we own all of it.

---

## Audit Procedure

Run these probes for each category after every `@pkmn/*` bump. Mirror the exact resolver pattern from the source file so the probe gives a true-positive signal.

### 1. Synthetic-mega base stats (`megaStats`)

For each entry in `REG_MA_BUNDLE.megaStats` and `REG_MB_BUNDLE.megaStats`:

```ts
import { Dex } from "@pkmn/dex";

const mon9 = Dex.forGen(9).species.get("Eelektross-Mega");
const mon6 = Dex.forGen(6).species.get("Eelektross-Mega");

// Prune condition: upstream now has the forme with valid baseStats
if ((mon9?.exists || mon6?.exists) && mon9?.baseStats) {
  // Delete the entry from CHAMPIONS_MB_MEGA_STATS (or MA equivalent).
  // getBaseStats() will find it via the Gen 9 / Gen 6 fallback path.
}
```

**Prune action:** remove the key from the `new Map([...])` literal in the bundle file, and remove the spread in `stats-calculator.ts` if the bundle's `megaStats` map becomes empty.

### 2. Mega type overrides (`megaTypes`)

For each of the 2 M-B entries (`Staraptor-Mega`, `Barbaracle-Mega`):

```ts
const mon = Dex.forGen(9).species.get("Staraptor-Mega") ??
            Dex.forGen(6).species.get("Staraptor-Mega");

// Prune condition: upstream types array now matches our override
if (mon?.exists && mon.types.join(",") === "Fighting,Flying") {
  // Drop the Staraptor-Mega entry from CHAMPIONS_MB_MEGA_TYPES.
  // getChampionsMegaTypeOverride() will return null → getSpeciesTypes()
  // falls through to the dex.
}
```

**Prune action:** remove the key from `CHAMPIONS_MB_MEGA_TYPES`. If the map becomes empty, the function in `stats-calculator.ts` still compiles fine (empty Map).

### 3. Brand-new ability descriptions (`abilityDescs`)

For each of the 2 M-B entries (`Eelevate`, `Fire Mane`):

```ts
const ab = Dex.forGen(9).abilities.get("Eelevate");

// Prune condition: upstream now knows this ability
if (ab?.exists && (ab.shortDesc || ab.desc)) {
  // Drop the "Eelevate" key from CHAMPIONS_MB_ABILITY_DESCS.
  // getAbilityShortDesc() falls through to the @pkmn/dex lookup.
}
```

**Prune action:** remove the key from `CHAMPIONS_MB_ABILITY_DESCS`. Also verify the calc fork now implements the effect (see category 7 below).

### 4. Mega → stone mappings (`megaStones`)

Check whether `@pkmn/dex` now registers the item and links it to the forme:

```ts
const item = Dex.forGen(9).items.get("Eelektrossite");
const forme = Dex.forGen(9).species.get("Eelektross-Mega");

// Prune condition: dex knows the item AND links it to the mega forme
if (item?.exists && forme?.exists && forme.requiredItem === "Eelektrossite") {
  // Drop the ["Eelektross-Mega", "Eelektrossite"] tuple from the bundle.
}
```

**Prune action:** removing a stone tuple also requires removing the corresponding species from `legalSpecies` (if the dex now includes it) and removing the item from `legalItems`.

### 5. Mega → post-evolution ability (`megaAbilities`)

```ts
const forme = Dex.forGen(9).species.get("Eelektross-Mega");

// Prune condition: dex knows the forme and its ability
if (forme?.exists && forme.abilities[0]) {
  // Verify the ability matches our tuple value.
  // If it matches, drop the ["Eelektross-Mega", "Eelevate"] entry from megaAbilities.
}
```

**Prune action:** If upstream ability differs from our value, do NOT silently delete — the discrepancy is a bug. Open an issue or correct our value.

### 6. Past-tagged move grants (`moveOverrides`)

```ts
import { Dex as SimDex, TeamValidator } from "@pkmn/sim";

// Check if Floette-Eternal can now learn Light of Ruin in Gen 9 sim
const format = SimDex.formats.get("[Gen 9] Anything Goes");
const validator = format ? new TeamValidator(format, SimDex) : null;
const species = SimDex.forGen(9).species.get("Floette-Eternal");
const move = SimDex.forGen(9).moves.get("Light of Ruin");

if (validator && species?.exists && move?.exists) {
  const issue = validator.checkCanLearn(move, species);
  if (issue === null) {
    // Upstream now allows it — drop the Floette-Eternal / Floette-Mega
    // overrides from CHAMPIONS_MA_MOVE_OVERRIDES.
  }
}
```

### 7. Calc mechanics — `vendor/damage-calc` fork divergence

The bundle itself has no field for battle mechanics. Check the fork's divergence from upstream `@smogon/calc` periodically:

```bash
# From repo root — compare fork to upstream smogon/damage-calc
git -C vendor/damage-calc log --oneline upstream/master..HEAD | head -20
```

If upstream added Champions ability implementations (e.g. Eelevate, Fire Mane), evaluate whether our fork's patches are now redundant. Merging upstream reductions must be tested carefully — the calc fork is the primary correctness source for damage numbers.

### 8. `SIM_UNSUPPORTED_FORMAT_IDS` / `legalSpecies` / `legalItems`

These remain necessary as long as `@pkmn/sim` has no Champions format. Check once per `@pkmn/sim` major version:

```ts
import { Dex as SimDex } from "@pkmn/sim";
const fmt = SimDex.formats.get("[Champions] VGC 2026 Reg M-B");
if (fmt?.exists) {
  // @pkmn/sim now ships a Champions format.
  // Evaluate whether legalSpecies / legalItems can be delegated to it
  // and remove the format IDs from SIM_UNSUPPORTED_FORMAT_IDS.
}
```

---

## Decision Rule

Keep an override only if upstream **still lacks** the data. If upstream now provides the value:
- **Matching upstream:** delete the override and let the resolver fall through.
- **Disagreeing upstream:** do NOT delete silently — our override shadows the correction. Investigate which is correct, fix the discrepancy, then delete the override.

---

## Guard-Test Pattern

Add one test per override key asserting it is **absent from** the upstream dex. When upstream adds support, the test flips red, prompting removal.

Test location: `packages/pokemon/src/__tests__/pkmn-override-guards.test.ts` (create if absent).

```ts
import { Dex } from "@pkmn/dex";
import { REG_MB_BUNDLE } from "../champions-reg-mb";

describe("@pkmn upstream absence guards — flip red when upstream adds Champions data", () => {
  it("Eelektross-Mega is absent from @pkmn/dex Gen 9 (megaStats guard)", () => {
    const mon = Dex.forGen(9).species.get("Eelektross-Mega");
    expect(mon?.exists).toBeFalsy();
  });

  it("Staraptor-Mega has no type override in @pkmn/dex Gen 9 (megaTypes guard)", () => {
    const mon = Dex.forGen(9).species.get("Staraptor-Mega");
    // If this starts existing with types ["Fighting","Flying"],
    // remove Staraptor-Mega from CHAMPIONS_MB_MEGA_TYPES.
    expect(mon?.exists).toBeFalsy();
  });

  it("Eelevate is absent from @pkmn/dex Gen 9 (abilityDescs guard)", () => {
    const ab = Dex.forGen(9).abilities.get("Eelevate");
    expect(ab?.exists).toBeFalsy();
  });

  it("Fire Mane is absent from @pkmn/dex Gen 9 (abilityDescs guard)", () => {
    const ab = Dex.forGen(9).abilities.get("Fire Mane");
    expect(ab?.exists).toBeFalsy();
  });
});
```

Add one test per `megaStats` key, one per `megaTypes` key, and one per `abilityDescs` key. Stone/ability mappings for Champions-exclusive megas can use a representative sample rather than exhaustive coverage.

---

## Verify After Pruning

```bash
# Initialize the calc submodule if freshly cloned
git submodule update --init --recursive

# Run targeted checks — no need to run the full suite
pnpm typecheck --filter @trainers/pokemon --filter @trainers/validators
pnpm test --filter @trainers/pokemon --filter @trainers/validators
```

Confirm the pruned code path (e.g. `getBaseStats()` with a formerly-overridden species) returns the same values as before by adding or updating an assertion in the relevant test.
