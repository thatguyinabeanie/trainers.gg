# Sprite Picker Expansion Design

## Summary

Expand the avatar SpritePicker from Pokemon-only to support Pokemon, Trainers, and Type icons. Replace the combobox UI with a tabbed visual grid picker (emoji-picker pattern) inside the existing Popover.

## Categories

| Category | Source                               | Count             | URL Pattern                                            |
| -------- | ------------------------------------ | ----------------- | ------------------------------------------------------ |
| Pokemon  | `@pkmn/img` via `getPokemonSprite()` | ~1,200 species    | `play.pokemonshowdown.com/sprites/gen5/...`            |
| Trainers | Showdown CDN                         | ~2,800 sprites    | `play.pokemonshowdown.com/sprites/trainers/{name}.png` |
| Types    | Showdown CDN                         | 19 (18 + Stellar) | `play.pokemonshowdown.com/sprites/types/{Type}.png`    |

Items (spritesheet, not standalone URLs) are deferred.

## Component Architecture

```
SpritePicker (props: altId, currentAvatarUrl, onAvatarChange)
+-- Search input (filters current tab, hidden for Types)
+-- Tabs (Pokemon | Trainers | Types)
|   +-- PokemonGrid: featured ~50 by default, search filters all ~1,200
|   +-- TrainerGrid: featured ~60 by default, search reaches all ~2,800
|   +-- TypeGrid: all 19 in a single grid (no search needed)
+-- Remove avatar link (if avatar is set)
```

## Visual Design

- **Popover width:** `w-80` (320px)
- **Grid:** 6-column, 40x40px cells, 8px gap
- **Sprite rendering:** `image-pixelated` for Pokemon (pixel art), normal for trainers/types
- **Hover:** `bg-muted` highlight on cells
- **Selected:** `ring-2 ring-primary` indicator
- **Scroll area:** ~240px fixed height, scrollable grid
- **Search placeholder:** Changes per tab ("Search Pokemon...", "Search trainers...")
- **Selection flow:** Click sprite -> saves immediately -> popover closes -> avatar updates

## Featured Sets (Curated)

### Pokemon (~50)

Gen 1 starters + evolutions, Pikachu, Eevee + eeveelutions, popular legendaries (Mewtwo, Rayquaza, Giratina, Arceus), popular competitive mons (Incineroar, Rillaboom, Flutter Mane, Iron Hands), fan favorites.

### Trainers (~60)

Champions (Cynthia, Red, Leon, Steven, Iris), gym leaders (Brock, Misty, Elesa, Raihan), protagonists (Red, Leaf, Ethan, Dawn), iconic NPCs (Professor Oak, N, Team Rocket).

## File Changes

### New Files

1. **`packages/pokemon/src/trainers.ts`**
   - `FEATURED_TRAINERS`: `{ name: string, filename: string }[]` (~60 curated entries)
   - `getAllTrainerFilenames()`: Full list of ~2,800 filenames (static array)
   - `getTrainerSpriteUrl(filename)`: Template URL builder
   - Exported via `@trainers/pokemon/sprites` entry point

2. **`packages/pokemon/src/featured-pokemon.ts`**
   - `FEATURED_POKEMON`: `string[]` of ~50 curated species names
   - Exported via `@trainers/pokemon` main entry point

### Modified Files

1. **`packages/pokemon/src/sprites.ts`** — Re-export trainer utilities
2. **`apps/web/src/components/profile/sprite-picker.tsx`** — Complete rewrite as tabbed grid picker

### Unchanged

- **`apps/web/src/actions/alt-avatar.ts`** — URL prefix validation (`play.pokemonshowdown.com/sprites/`) already covers trainers and types
- **Database schema** — `avatar_url` stays a plain string column

## No New Dependencies

All data comes from existing `@pkmn/img` package and Showdown CDN URLs.
