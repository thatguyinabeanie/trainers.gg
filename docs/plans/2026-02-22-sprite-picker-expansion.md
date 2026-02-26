# Sprite Picker Expansion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand the avatar SpritePicker from Pokemon-only to a tabbed grid picker supporting Pokemon, Trainers, and Type icons.

**Architecture:** Rebuild `SpritePicker` as an emoji-picker-style tabbed grid inside the existing Popover. Add trainer sprite data and featured Pokemon lists to `@trainers/pokemon`. No DB or action changes needed — the URL validation already accepts all Showdown sprite paths.

**Tech Stack:** React, Base UI Tabs, `@pkmn/img`, Showdown CDN, existing Popover component.

---

### Task 1: Add trainer sprite data to @trainers/pokemon

**Files:**
- Create: `packages/pokemon/src/trainers.ts`
- Create: `packages/pokemon/src/__tests__/trainers.test.ts`
- Modify: `packages/pokemon/src/sprites.ts` — re-export trainer utilities
- Modify: `packages/pokemon/package.json` — add `./trainers` export

**Step 1: Write the tests**

```ts
// packages/pokemon/src/__tests__/trainers.test.ts
import {
  FEATURED_TRAINERS,
  getTrainerSpriteUrl,
} from "../trainers";

describe("trainer sprites", () => {
  describe("FEATURED_TRAINERS", () => {
    it("is a non-empty array", () => {
      expect(FEATURED_TRAINERS.length).toBeGreaterThan(0);
    });

    it("each entry has name and filename", () => {
      for (const trainer of FEATURED_TRAINERS) {
        expect(typeof trainer.name).toBe("string");
        expect(trainer.name.length).toBeGreaterThan(0);
        expect(typeof trainer.filename).toBe("string");
        expect(trainer.filename.length).toBeGreaterThan(0);
      }
    });

    it.each(["Cynthia", "Red", "Brock", "Misty"])(
      "includes %s",
      (name) => {
        expect(FEATURED_TRAINERS.some((t) => t.name === name)).toBe(true);
      }
    );

    it("has no duplicate filenames", () => {
      const filenames = FEATURED_TRAINERS.map((t) => t.filename);
      expect(new Set(filenames).size).toBe(filenames.length);
    });
  });

  describe("getTrainerSpriteUrl", () => {
    it("returns a Showdown CDN URL", () => {
      const url = getTrainerSpriteUrl("cynthia");
      expect(url).toBe(
        "https://play.pokemonshowdown.com/sprites/trainers/cynthia.png"
      );
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm --filter @trainers/pokemon test -- --testPathPattern=trainers`
Expected: FAIL — module not found

**Step 3: Write the trainer module**

```ts
// packages/pokemon/src/trainers.ts

/**
 * Trainer sprite data for the avatar picker.
 *
 * Sprites served from Pokemon Showdown's CDN.
 * Full list: https://play.pokemonshowdown.com/sprites/trainers/
 */

export interface TrainerSprite {
  /** Display name */
  name: string;
  /** Filename without extension (used in URL) */
  filename: string;
}

const SHOWDOWN_TRAINERS_BASE =
  "https://play.pokemonshowdown.com/sprites/trainers";

/**
 * Curated list of iconic trainers for the featured grid.
 * Organized by role for easy maintenance.
 */
export const FEATURED_TRAINERS: TrainerSprite[] = [
  // Champions
  { name: "Red", filename: "red" },
  { name: "Blue", filename: "blue" },
  { name: "Lance", filename: "lance" },
  { name: "Steven", filename: "steven" },
  { name: "Wallace", filename: "wallace" },
  { name: "Cynthia", filename: "cynthia" },
  { name: "Alder", filename: "alder" },
  { name: "Iris", filename: "iris" },
  { name: "Diantha", filename: "diantha" },
  { name: "Leon", filename: "leon" },
  // Gym Leaders (Kanto)
  { name: "Brock", filename: "brock" },
  { name: "Misty", filename: "misty" },
  { name: "Lt. Surge", filename: "ltsurge" },
  { name: "Erika", filename: "erika" },
  { name: "Sabrina", filename: "sabrina" },
  { name: "Blaine", filename: "blaine" },
  { name: "Giovanni", filename: "giovanni" },
  // Gym Leaders (Johto)
  { name: "Bugsy", filename: "bugsy" },
  { name: "Whitney", filename: "whitney" },
  { name: "Morty", filename: "morty" },
  { name: "Chuck", filename: "chuck" },
  { name: "Jasmine", filename: "jasmine" },
  { name: "Pryce", filename: "pryce" },
  { name: "Clair", filename: "clair" },
  // Gym Leaders (Hoenn)
  { name: "Roxanne", filename: "roxanne" },
  { name: "Brawly", filename: "brawly" },
  { name: "Wattson", filename: "wattson" },
  { name: "Flannery", filename: "flannery" },
  { name: "Norman", filename: "norman" },
  { name: "Winona", filename: "winona" },
  // Gym Leaders (Sinnoh)
  { name: "Roark", filename: "roark" },
  { name: "Gardenia", filename: "gardenia" },
  { name: "Maylene", filename: "maylene" },
  { name: "Crasher Wake", filename: "crasherwake" },
  { name: "Fantina", filename: "fantina" },
  { name: "Volkner", filename: "volkner" },
  // Gym Leaders (Unova)
  { name: "Elesa", filename: "elesa" },
  { name: "Clay", filename: "clay" },
  { name: "Skyla", filename: "skyla" },
  { name: "Drayden", filename: "drayden" },
  { name: "Roxie", filename: "roxie" },
  // Gym Leaders (Galar)
  { name: "Milo", filename: "milo" },
  { name: "Nessa", filename: "nessa" },
  { name: "Kabu", filename: "kabu" },
  { name: "Bea", filename: "bea" },
  { name: "Allister", filename: "allister" },
  { name: "Gordie", filename: "gordie" },
  { name: "Melony", filename: "melony" },
  { name: "Raihan", filename: "raihan" },
  // Elite Four
  { name: "Lorelei", filename: "lorelei" },
  { name: "Bruno", filename: "bruno" },
  { name: "Agatha", filename: "agatha" },
  { name: "Karen", filename: "karen" },
  { name: "Caitlin", filename: "caitlin" },
  { name: "Grimsley", filename: "grimsley" },
  // Rivals & key NPCs
  { name: "N", filename: "n" },
  { name: "Silver", filename: "silver" },
  { name: "Marnie", filename: "marnie" },
  { name: "Hop", filename: "hop" },
  { name: "Bede", filename: "bede" },
  { name: "Gloria", filename: "gloria" },
  // Professors
  { name: "Professor Oak", filename: "oak" },
  { name: "Professor Sycamore", filename: "sycamore" },
  { name: "Professor Kukui", filename: "kukui" },
  // Villains
  { name: "Archie", filename: "archie" },
  { name: "Maxie", filename: "maxie" },
  { name: "Cyrus", filename: "cyrus" },
  { name: "Ghetsis", filename: "ghetsis" },
  { name: "Lysandre", filename: "lysandre" },
];

/**
 * Build the full Showdown CDN URL for a trainer sprite.
 */
export function getTrainerSpriteUrl(filename: string): string {
  return `${SHOWDOWN_TRAINERS_BASE}/${filename}.png`;
}
```

**Step 4: Re-export from sprites entry point**

Add to the end of `packages/pokemon/src/sprites.ts`:

```ts
// Trainer sprites
export {
  type TrainerSprite,
  FEATURED_TRAINERS,
  getTrainerSpriteUrl,
} from "./trainers";
```

**Step 5: Run tests to verify they pass**

Run: `pnpm --filter @trainers/pokemon test -- --testPathPattern=trainers`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/pokemon/src/trainers.ts packages/pokemon/src/__tests__/trainers.test.ts packages/pokemon/src/sprites.ts
git commit -m "feat: add trainer sprite data for avatar picker (TGG-146)"
```

---

### Task 2: Add featured Pokemon list

**Files:**
- Create: `packages/pokemon/src/featured-pokemon.ts`
- Create: `packages/pokemon/src/__tests__/featured-pokemon.test.ts`
- Modify: `packages/pokemon/src/index.ts` — re-export

**Step 1: Write the tests**

```ts
// packages/pokemon/src/__tests__/featured-pokemon.test.ts
import { FEATURED_POKEMON } from "../featured-pokemon";
import { getAllSpeciesNames } from "../validation";

describe("FEATURED_POKEMON", () => {
  it("is a non-empty array of strings", () => {
    expect(FEATURED_POKEMON.length).toBeGreaterThan(0);
    for (const name of FEATURED_POKEMON) {
      expect(typeof name).toBe("string");
    }
  });

  it("contains only valid species names", () => {
    const allSpecies = getAllSpeciesNames();
    for (const name of FEATURED_POKEMON) {
      expect(allSpecies).toContain(name);
    }
  });

  it("has no duplicates", () => {
    expect(new Set(FEATURED_POKEMON).size).toBe(FEATURED_POKEMON.length);
  });

  it.each(["Pikachu", "Charizard", "Mewtwo", "Eevee"])(
    "includes %s",
    (pokemon) => {
      expect(FEATURED_POKEMON).toContain(pokemon);
    }
  );
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm --filter @trainers/pokemon test -- --testPathPattern=featured-pokemon`
Expected: FAIL — module not found

**Step 3: Write the featured Pokemon list**

```ts
// packages/pokemon/src/featured-pokemon.ts

/**
 * Curated list of popular/iconic Pokemon for the featured grid
 * in the avatar picker. All names must be valid species names
 * from @pkmn/dex.
 */
export const FEATURED_POKEMON: string[] = [
  // Gen 1 starters
  "Bulbasaur",
  "Charmander",
  "Squirtle",
  "Venusaur",
  "Charizard",
  "Blastoise",
  // Pikachu line
  "Pikachu",
  "Raichu",
  // Eevee + eeveelutions
  "Eevee",
  "Vaporeon",
  "Jolteon",
  "Flareon",
  "Espeon",
  "Umbreon",
  "Leafeon",
  "Glaceon",
  "Sylveon",
  // Gen 1 icons
  "Gengar",
  "Gyarados",
  "Snorlax",
  "Dragonite",
  "Mewtwo",
  "Mew",
  // Gen 2
  "Typhlosion",
  "Lugia",
  "Ho-Oh",
  "Celebi",
  "Tyranitar",
  "Scizor",
  // Gen 3
  "Blaziken",
  "Gardevoir",
  "Rayquaza",
  "Groudon",
  "Kyogre",
  "Absol",
  // Gen 4
  "Lucario",
  "Garchomp",
  "Giratina",
  "Arceus",
  "Togekiss",
  "Gallade",
  // Gen 5
  "Zoroark",
  "Hydreigon",
  "Volcarona",
  "Reshiram",
  "Zekrom",
  // Gen 6+
  "Greninja",
  "Mimikyu",
  "Dragapult",
  // VGC staples
  "Incineroar",
  "Rillaboom",
  "Flutter Mane",
  "Iron Hands",
  "Gholdengo",
  "Kingambit",
  "Amoonguss",
  "Urshifu",
  "Annihilape",
];
```

**Step 4: Add export to index.ts**

Add to `packages/pokemon/src/index.ts`:

```ts
// Featured Pokemon for avatar picker
export { FEATURED_POKEMON } from "./featured-pokemon";
```

**Step 5: Run tests to verify they pass**

Run: `pnpm --filter @trainers/pokemon test -- --testPathPattern=featured-pokemon`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/pokemon/src/featured-pokemon.ts packages/pokemon/src/__tests__/featured-pokemon.test.ts packages/pokemon/src/index.ts
git commit -m "feat: add featured Pokemon list for avatar picker (TGG-146)"
```

---

### Task 3: Add exported type list to @trainers/pokemon

The `allTypes` array is currently duplicated as a local variable in `type-effectiveness.ts`. Export it so the sprite picker can use it.

**Files:**
- Modify: `packages/pokemon/src/type-effectiveness.ts` — export the type list as a constant
- Modify: `packages/pokemon/src/index.ts` — re-export
- No new tests needed — it's a constant array already used internally

**Step 1: Add the exported constant**

At the top of `packages/pokemon/src/type-effectiveness.ts` (after the `PokemonType` export), add:

```ts
/** All 18 standard Pokemon types + Stellar for Tera. */
export const ALL_TYPES: PokemonType[] = [
  "Normal",
  "Fire",
  "Water",
  "Electric",
  "Grass",
  "Ice",
  "Fighting",
  "Poison",
  "Ground",
  "Flying",
  "Psychic",
  "Bug",
  "Rock",
  "Ghost",
  "Dragon",
  "Dark",
  "Steel",
  "Fairy",
];
```

**Step 2: Add export to index.ts**

In `packages/pokemon/src/index.ts`, add `ALL_TYPES` to the `type-effectiveness` re-export block.

**Step 3: Run typecheck**

Run: `pnpm --filter @trainers/pokemon typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/pokemon/src/type-effectiveness.ts packages/pokemon/src/index.ts
git commit -m "feat: export ALL_TYPES constant from @trainers/pokemon (TGG-146)"
```

---

### Task 4: Rewrite SpritePicker as tabbed grid picker

This is the main UI task. The existing `sprite-picker.tsx` (84 lines, combobox-based) gets replaced with a tabbed grid picker.

**Files:**
- Modify: `apps/web/src/components/profile/sprite-picker.tsx` — complete rewrite

**Reference files** (read before implementing):
- `apps/web/src/components/ui/tabs.tsx` — Tabs/TabsList/TabsTrigger/TabsContent
- `apps/web/src/components/ui/popover.tsx` — PopoverContent default width is `w-72`
- `apps/web/src/components/notification-bell.tsx` — example of interactive Popover content
- `apps/web/src/components/profile/sprite-picker.tsx` — current implementation (keep same props)

**Step 1: Write the new SpritePicker**

The component keeps the same external interface (`altId`, `currentAvatarUrl`, `onAvatarChange`) but replaces the Combobox interior with:

```tsx
// apps/web/src/components/profile/sprite-picker.tsx
"use client";

import { useState, useTransition } from "react";
import { getAllSpeciesNames, FEATURED_POKEMON, ALL_TYPES } from "@trainers/pokemon";
import {
  getPokemonSprite,
  getShowdownTypeIconUrl,
  FEATURED_TRAINERS,
  getTrainerSpriteUrl,
} from "@trainers/pokemon/sprites";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { setAltAvatar, removeAltAvatar } from "@/actions/alt-avatar";
import { cn } from "@/lib/utils";

// Load species list once at module level
const allSpecies = getAllSpeciesNames();

interface SpritePickerProps {
  altId: number;
  currentAvatarUrl: string | null;
  onAvatarChange: (url: string | null) => void;
}

export function SpritePicker({
  altId,
  currentAvatarUrl,
  onAvatarChange,
}: SpritePickerProps) {
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("pokemon");

  // Filter logic per tab
  const filteredPokemon = search
    ? allSpecies.filter((name) =>
        name.toLowerCase().includes(search.toLowerCase())
      )
    : FEATURED_POKEMON;

  const filteredTrainers = search
    ? FEATURED_TRAINERS.filter((t) =>
        t.name.toLowerCase().includes(search.toLowerCase())
      )
    : FEATURED_TRAINERS;

  function handleSelectSprite(url: string) {
    startTransition(async () => {
      const result = await setAltAvatar(altId, url);
      if (result.success) {
        onAvatarChange(url);
        toast.success("Avatar updated");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await removeAltAvatar(altId);
      if (result.success) {
        onAvatarChange(null);
        toast.success("Avatar removed");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex w-72 flex-col gap-2">
      {/* Search (hidden for Types tab) */}
      {tab !== "types" && (
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              tab === "pokemon" ? "Search Pokemon..." : "Search trainers..."
            }
            className="h-8 pl-7 pr-7 text-sm"
            disabled={isPending}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => { setTab(v); setSearch(""); }}>
        <TabsList className="w-full">
          <TabsTrigger value="pokemon">Pokemon</TabsTrigger>
          <TabsTrigger value="trainers">Trainers</TabsTrigger>
          <TabsTrigger value="types">Types</TabsTrigger>
        </TabsList>

        {/* Pokemon Grid */}
        <TabsContent value="pokemon">
          <div className="no-scrollbar grid max-h-60 grid-cols-6 gap-1 overflow-y-auto">
            {filteredPokemon.map((name) => {
              const sprite = getPokemonSprite(name);
              return (
                <button
                  key={name}
                  type="button"
                  title={name}
                  onClick={() => handleSelectSprite(sprite.url)}
                  disabled={isPending}
                  className={cn(
                    "hover:bg-muted flex items-center justify-center rounded-md p-0.5 transition-colors disabled:opacity-50",
                    currentAvatarUrl === sprite.url &&
                      "ring-primary bg-primary/10 ring-2"
                  )}
                >
                  <img
                    src={sprite.url}
                    alt={name}
                    width={40}
                    height={40}
                    className="image-pixelated size-10"
                    loading="lazy"
                  />
                </button>
              );
            })}
            {filteredPokemon.length === 0 && (
              <p className="text-muted-foreground col-span-6 py-8 text-center text-sm">
                No Pokemon found
              </p>
            )}
          </div>
          {!search && (
            <p className="text-muted-foreground mt-1 text-center text-xs">
              Search for more Pokemon
            </p>
          )}
        </TabsContent>

        {/* Trainer Grid */}
        <TabsContent value="trainers">
          <div className="no-scrollbar grid max-h-60 grid-cols-4 gap-1 overflow-y-auto">
            {filteredTrainers.map((trainer) => {
              const url = getTrainerSpriteUrl(trainer.filename);
              return (
                <button
                  key={trainer.filename}
                  type="button"
                  title={trainer.name}
                  onClick={() => handleSelectSprite(url)}
                  disabled={isPending}
                  className={cn(
                    "hover:bg-muted flex flex-col items-center justify-end rounded-md p-1 transition-colors disabled:opacity-50",
                    currentAvatarUrl === url &&
                      "ring-primary bg-primary/10 ring-2"
                  )}
                >
                  <img
                    src={url}
                    alt={trainer.name}
                    className="h-12 w-auto object-contain"
                    loading="lazy"
                  />
                  <span className="text-muted-foreground mt-0.5 max-w-full truncate text-[10px] leading-tight">
                    {trainer.name}
                  </span>
                </button>
              );
            })}
            {filteredTrainers.length === 0 && (
              <p className="text-muted-foreground col-span-4 py-8 text-center text-sm">
                No trainers found
              </p>
            )}
          </div>
        </TabsContent>

        {/* Type Grid */}
        <TabsContent value="types">
          <div className="grid grid-cols-3 gap-1.5">
            {[...ALL_TYPES, "Stellar" as const].map((type) => {
              const url = getShowdownTypeIconUrl(type);
              return (
                <button
                  key={type}
                  type="button"
                  title={type}
                  onClick={() => handleSelectSprite(url)}
                  disabled={isPending}
                  className={cn(
                    "hover:bg-muted flex items-center justify-center rounded-md p-1.5 transition-colors disabled:opacity-50",
                    currentAvatarUrl === url &&
                      "ring-primary bg-primary/10 ring-2"
                  )}
                >
                  <img
                    src={url}
                    alt={type}
                    className="h-4 w-auto"
                    loading="lazy"
                  />
                </button>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer: remove + loading indicator */}
      <div className="flex items-center justify-between">
        {currentAvatarUrl ? (
          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            className="text-muted-foreground hover:text-foreground text-xs underline disabled:opacity-50"
          >
            Remove avatar
          </button>
        ) : (
          <span />
        )}
        {isPending && (
          <Loader2 className="text-muted-foreground size-3 animate-spin" />
        )}
      </div>
    </div>
  );
}
```

**Step 2: Update PopoverContent width in the alts page**

In `apps/web/src/app/dashboard/alts/page.tsx`, change both `PopoverContent` instances:

From: `<PopoverContent align="start" className="w-auto">`
To: `<PopoverContent align="start" className="w-auto p-2">`

The `SpritePicker` now controls its own width internally (`w-72`).

**Step 3: Run typecheck and lint**

Run: `pnpm --filter @trainers/web typecheck && pnpm --filter @trainers/web lint`
Expected: Both PASS

**Step 4: Commit**

```bash
git add apps/web/src/components/profile/sprite-picker.tsx apps/web/src/app/dashboard/alts/page.tsx
git commit -m "feat: tabbed grid sprite picker with Pokemon, Trainers, Types (TGG-146)"
```

---

### Task 5: Manual verification

Test the full flow in the browser at `http://localhost:3000/dashboard/alts`:

1. Click an avatar — popover opens with tabbed grid picker
2. **Pokemon tab:** featured grid shows ~50 Pokemon, search filters all ~1,200
3. Select a Pokemon — avatar updates, popover closes, toast shows
4. Click the same avatar again — **Trainers tab:** grid shows curated trainers with names
5. Select a trainer — avatar updates to trainer sprite
6. Click again — **Types tab:** grid shows all 19 type icons
7. Select a type — avatar updates to type icon
8. Click again — "Remove avatar" link at bottom works
9. Search: type "char" in Pokemon tab — shows Charizard, Charmander, etc.
10. Search: type "cyn" in Trainers tab — shows Cynthia
11. Switch tabs — search clears
12. Test on mobile viewport — popover still works, grids are scrollable

**Step 1: Run the full test suite**

Run: `pnpm test`
Expected: All tests pass

**Step 2: Run typecheck across monorepo**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: Final commit if any adjustments were needed**

---

### Task 6: Commit all changes and verify branch

**Step 1: Check git status**

Run: `git status`
Expected: Clean working tree (all changes committed in prior tasks)

**Step 2: Run full CI checks**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: All pass
