/**
 * Pokemon sprite URL utilities.
 *
 * Uses @pkmn/img for Pokemon and item sprites (handles all forms/variants
 * correctly), and Showdown's CDN directly for type icons.
 *
 * @module @trainers/pokemon/sprites
 */

import { Sprites, Icons } from "@pkmn/img";

export interface SpriteData {
  url: string;
  w: number;
  h: number;
  pixelated: boolean;
}

/**
 * Pokemon sprite style preference.
 * - gen5: Static pixel art (Gen 5 style)
 * - gen5ani: Animated pixel art (Gen 5 animated)
 * - ani: Modern animated sprites
 */
export type SpritePreference = "gen5" | "gen5ani" | "ani";

// Some data sources (RK9, Limitless) store form names with descriptive suffixes
// that @pkmn/img doesn't recognize. Map them to Showdown-compatible slugs.
const SPECIES_SLUG_OVERRIDES: Record<string, string> = {
  "calyrex-shadow-rider": "calyrex-shadow",
  "calyrex-ice-rider": "calyrex-ice",
  "urshifu-rapid-strike-style": "urshifu-rapid-strike",
  "ogerpon-hearthflame-mask": "ogerpon-hearthflame",
  "ogerpon-wellspring-mask": "ogerpon-wellspring",
  "ogerpon-cornerstone-mask": "ogerpon-cornerstone",
  "zacian-crowned-sword": "zacian-crowned",
  "zamazenta-crowned-shield": "zamazenta-crowned",
  "giratina-origin-forme": "giratina-origin",
  // Champions-exclusive Mega forms → fall back to base form.
  // Official Gen 6/7 Megas (Garchomp-Mega, Charizard-Mega-X, etc.) are NOT listed —
  // they have real sprites on the Showdown CDN.
  // Reg M-A custom Megas
  "Chandelure-Mega": "Chandelure",
  "Chesnaught-Mega": "Chesnaught",
  "Chimecho-Mega": "Chimecho",
  "Clefable-Mega": "Clefable",
  "Crabominable-Mega": "Crabominable",
  "Delphox-Mega": "Delphox",
  "Dragonite-Mega": "Dragonite",
  "Drampa-Mega": "Drampa",
  "Emboar-Mega": "Emboar",
  "Excadrill-Mega": "Excadrill",
  "Feraligatr-Mega": "Feraligatr",
  "Floette-Mega": "Floette",
  "Froslass-Mega": "Froslass",
  "Glimmora-Mega": "Glimmora",
  "Golurk-Mega": "Golurk",
  "Greninja-Mega": "Greninja",
  "Hawlucha-Mega": "Hawlucha",
  "Meganium-Mega": "Meganium",
  "Meowstic-Mega": "Meowstic",
  "Scovillain-Mega": "Scovillain",
  "Skarmory-Mega": "Skarmory",
  "Starmie-Mega": "Starmie",
  "Victreebel-Mega": "Victreebel",
  // Reg M-B custom Megas
  "Raichu-Mega-X": "Raichu",
  "Raichu-Mega-Y": "Raichu",
  "Staraptor-Mega": "Staraptor",
  "Scolipede-Mega": "Scolipede",
  "Scrafty-Mega": "Scrafty",
  "Eelektross-Mega": "Eelektross",
  "Pyroar-Mega": "Pyroar",
  "Malamar-Mega": "Malamar",
  "Barbaracle-Mega": "Barbaracle",
  "Dragalge-Mega": "Dragalge",
  "Falinks-Mega": "Falinks",
};

/**
 * Get sprite data for a Pokemon species.
 * Handles all forms and variants (Ogerpon-Hearthflame, Urshifu-Rapid-Strike, etc.).
 * Normalizes data-source slugs that differ from Showdown conventions.
 */
export function getPokemonSprite(
  species: string,
  options?: {
    shiny?: boolean;
    gender?: "M" | "F";
    spriteStyle?: SpritePreference;
  }
): SpriteData {
  const normalized = SPECIES_SLUG_OVERRIDES[species] ?? species;
  const sprite = Sprites.getPokemon(normalized, {
    gen: options?.spriteStyle ?? "gen5",
    shiny: options?.shiny,
    gender: options?.gender,
  });
  return {
    url: sprite.url,
    w: sprite.w,
    h: sprite.h,
    pixelated: sprite.pixelated ?? false,
  };
}

/**
 * Get inline style string for rendering an item icon from the spritesheet.
 */
export function getItemSpriteStyle(item: string): string {
  return Icons.getItem(item).style;
}

/**
 * Get the Pokemon Showdown type icon URL for a given type name.
 * Type names are capitalized (e.g., "Fire", "Water", "Stellar").
 */
export function getShowdownTypeIconUrl(type: string): string {
  return `https://play.pokemonshowdown.com/sprites/types/${type}.png`;
}

/**
 * Get the Pokemon Showdown Tera type icon URL for a given type name.
 * These are the crystallized gem-shaped icons specific to Terastallization.
 * Type names are capitalized (e.g., "Fire" → "TeraFire").
 */
export function getShowdownTeraTypeIconUrl(type: string): string {
  return `https://play.pokemonshowdown.com/sprites/types/Tera${type}.png`;
}

// Trainer sprites
export {
  type TrainerSprite,
  FEATURED_TRAINERS,
  getTrainerSpriteUrl,
} from "./trainers";
