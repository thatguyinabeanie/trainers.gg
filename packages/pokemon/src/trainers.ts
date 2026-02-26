/**
 * Trainer sprite metadata and URL utilities.
 *
 * Provides a curated list of iconic Pokemon trainers and a helper
 * to build Showdown CDN URLs for their sprites.
 *
 * @module @trainers/pokemon/sprites (re-exported)
 */

/** A trainer sprite entry with display name and Showdown CDN filename. */
export interface TrainerSprite {
  /** Human-readable trainer name (e.g., "Cynthia"). */
  name: string;
  /** Showdown CDN filename without extension (e.g., "cynthia"). */
  filename: string;
}

/**
 * Curated list of iconic trainers whose sprites are available on the
 * Pokemon Showdown CDN. Grouped by role (Champions, Gym Leaders, etc.)
 * but stored as a flat array for easy consumption.
 */
export const FEATURED_TRAINERS: readonly TrainerSprite[] = [
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

  // Gym Leaders — Kanto
  { name: "Brock", filename: "brock" },
  { name: "Misty", filename: "misty" },
  { name: "Lt. Surge", filename: "ltsurge" },
  { name: "Erika", filename: "erika" },
  { name: "Sabrina", filename: "sabrina" },
  { name: "Blaine", filename: "blaine" },
  { name: "Giovanni", filename: "giovanni" },

  // Gym Leaders — Johto
  { name: "Bugsy", filename: "bugsy" },
  { name: "Whitney", filename: "whitney" },
  { name: "Morty", filename: "morty" },
  { name: "Chuck", filename: "chuck" },
  { name: "Jasmine", filename: "jasmine" },
  { name: "Pryce", filename: "pryce" },
  { name: "Clair", filename: "clair" },

  // Gym Leaders — Hoenn
  { name: "Roxanne", filename: "roxanne" },
  { name: "Brawly", filename: "brawly" },
  { name: "Wattson", filename: "wattson" },
  { name: "Flannery", filename: "flannery" },
  { name: "Norman", filename: "norman" },
  { name: "Winona", filename: "winona" },

  // Gym Leaders — Sinnoh
  { name: "Roark", filename: "roark" },
  { name: "Gardenia", filename: "gardenia" },
  { name: "Maylene", filename: "maylene" },
  { name: "Crasher Wake", filename: "crasherwake" },
  { name: "Fantina", filename: "fantina" },
  { name: "Volkner", filename: "volkner" },

  // Gym Leaders — Unova
  { name: "Elesa", filename: "elesa" },
  { name: "Clay", filename: "clay" },
  { name: "Skyla", filename: "skyla" },
  { name: "Drayden", filename: "drayden" },
  { name: "Roxie", filename: "roxie" },

  // Gym Leaders — Galar
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

  // Rivals & NPCs
  { name: "N", filename: "n" },
  { name: "Silver", filename: "silver" },
  { name: "Marnie", filename: "marnie" },
  { name: "Hop", filename: "hop" },
  { name: "Bede", filename: "bede" },
  { name: "Gloria", filename: "gloria" },

  // Professors
  { name: "Prof. Oak", filename: "oak" },
  { name: "Prof. Sycamore", filename: "sycamore" },
  { name: "Prof. Kukui", filename: "kukui" },

  // Villains
  { name: "Archie", filename: "archie" },
  { name: "Maxie", filename: "maxie" },
  { name: "Cyrus", filename: "cyrus" },
  { name: "Ghetsis", filename: "ghetsis" },
  { name: "Lysandre", filename: "lysandre" },
] as const;

/**
 * Build a full Showdown CDN URL for a trainer sprite.
 *
 * @param filename - The trainer's CDN filename (e.g., "cynthia")
 * @returns Full URL to the trainer's PNG sprite
 */
export function getTrainerSpriteUrl(filename: string): string {
  return `https://play.pokemonshowdown.com/sprites/trainers/${filename}.png`;
}
