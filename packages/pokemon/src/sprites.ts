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
};

/**
 * Champions-exclusive Mega forms use official Pokémon Legends: Z-A sprites from Serebii.
 * Showdown's CDN has no sprites for these — they only exist in Legends Z-A / Champions.
 * Returns { url, w: 96, h: 96, pixelated: false } when matched.
 */
const CHAMPIONS_MEGA_SPRITE_URLS: Record<string, string> = {
  // Reg M-A — Pokémon Legends: Z-A / Champions-exclusive Megas
  "Clefable-Mega": "https://www.serebii.net/legendsz-a/pokemon/036-m.png",
  "Victreebel-Mega": "https://www.serebii.net/legendsz-a/pokemon/071-m.png",
  "Starmie-Mega": "https://www.serebii.net/legendsz-a/pokemon/121-m.png",
  "Dragonite-Mega": "https://www.serebii.net/legendsz-a/pokemon/149-m.png",
  "Meganium-Mega": "https://www.serebii.net/legendsz-a/pokemon/154-m.png",
  "Feraligatr-Mega": "https://www.serebii.net/legendsz-a/pokemon/160-m.png",
  "Skarmory-Mega": "https://www.serebii.net/legendsz-a/pokemon/227-m.png",
  "Chimecho-Mega": "https://www.serebii.net/legendsz-a/pokemon/358-m.png",
  "Froslass-Mega": "https://www.serebii.net/legendsz-a/pokemon/478-m.png",
  "Emboar-Mega": "https://www.serebii.net/legendsz-a/pokemon/500-m.png",
  "Excadrill-Mega": "https://www.serebii.net/legendsz-a/pokemon/530-m.png",
  "Chandelure-Mega": "https://www.serebii.net/legendsz-a/pokemon/609-m.png",
  "Golurk-Mega": "https://www.serebii.net/legendsz-a/pokemon/623-m.png",
  "Chesnaught-Mega": "https://www.serebii.net/legendsz-a/pokemon/652-m.png",
  "Delphox-Mega": "https://www.serebii.net/legendsz-a/pokemon/655-m.png",
  "Greninja-Mega": "https://www.serebii.net/legendsz-a/pokemon/658-m.png",
  "Floette-Mega": "https://www.serebii.net/legendsz-a/pokemon/670-m.png",
  "Meowstic-Mega": "https://www.serebii.net/legendsz-a/pokemon/678-m.png",
  "Hawlucha-Mega": "https://www.serebii.net/legendsz-a/pokemon/701-m.png",
  "Crabominable-Mega": "https://www.serebii.net/legendsz-a/pokemon/740-m.png",
  "Drampa-Mega": "https://www.serebii.net/legendsz-a/pokemon/780-m.png",
  "Scovillain-Mega": "https://www.serebii.net/legendsz-a/pokemon/952-m.png",
  "Glimmora-Mega": "https://www.serebii.net/legendsz-a/pokemon/970-m.png",
  // Reg M-B — Champions-exclusive Megas
  "Raichu-Mega-X": "https://www.serebii.net/legendsz-a/pokemon/026-mx.png",
  "Raichu-Mega-Y": "https://www.serebii.net/legendsz-a/pokemon/026-my.png",
  "Staraptor-Mega": "https://www.serebii.net/legendsz-a/pokemon/398-m.png",
  "Scolipede-Mega": "https://www.serebii.net/legendsz-a/pokemon/545-m.png",
  "Scrafty-Mega": "https://www.serebii.net/legendsz-a/pokemon/560-m.png",
  "Eelektross-Mega": "https://www.serebii.net/legendsz-a/pokemon/604-m.png",
  "Pyroar-Mega": "https://www.serebii.net/legendsz-a/pokemon/668-m.png",
  "Malamar-Mega": "https://www.serebii.net/legendsz-a/pokemon/687-m.png",
  "Barbaracle-Mega": "https://www.serebii.net/legendsz-a/pokemon/689-m.png",
  "Dragalge-Mega": "https://www.serebii.net/legendsz-a/pokemon/691-m.png",
  "Falinks-Mega": "https://www.serebii.net/legendsz-a/pokemon/870-m.png",
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
  const championsMegaUrl = CHAMPIONS_MEGA_SPRITE_URLS[species];
  if (championsMegaUrl) {
    return { url: championsMegaUrl, w: 96, h: 96, pixelated: false };
  }

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
