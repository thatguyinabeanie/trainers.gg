import { z } from "zod";
import { Teams } from "@pkmn/sets";
import { type PokemonSet } from "@pkmn/sets";
import { Dex, TeamValidator } from "@pkmn/sim";

// ---------------------------------------------------------------------------
// Format mapping: trainers.gg game_format → @pkmn/sim format ID
// ---------------------------------------------------------------------------

/**
 * Maps trainers.gg `game_format` values to the corresponding
 * Showdown format IDs used by `@pkmn/sim`.
 */
export const FORMAT_MAP: Record<string, string> = {
  "reg-i": "gen9vgc2025regi",
  "reg-h": "gen9vgc2024regh",
  "reg-g": "gen9vgc2024regg",
  "reg-f": "gen9vgc2024regf",
  "reg-e": "gen9vgc2024rege",
  "reg-d": "gen9vgc2023regd",
  ou: "gen9ou",
  uu: "gen9uu",
  ubers: "gen9ubers",
  lc: "gen9lc",
  "doubles-ou": "gen9doublesou",
  monotype: "gen9monotype",
};

/**
 * Returns the `@pkmn/sim` format string for a given trainers.gg
 * `game_format`, or `null` if the format is not mapped.
 */
export function getPkmnFormat(gameFormat: string): string | null {
  return FORMAT_MAP[gameFormat] ?? null;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single parsed Pokemon matching our database column names. */
export interface ParsedPokemon {
  species: string;
  nickname: string | null;
  level: number;
  ability: string;
  nature: string;
  held_item: string | null;
  move1: string | null;
  move2: string | null;
  move3: string | null;
  move4: string | null;
  ev_hp: number;
  ev_attack: number;
  ev_defense: number;
  ev_special_attack: number;
  ev_special_defense: number;
  ev_speed: number;
  iv_hp: number;
  iv_attack: number;
  iv_defense: number;
  iv_special_attack: number;
  iv_special_defense: number;
  iv_speed: number;
  tera_type: string | null;
  gender: string | null;
  is_shiny: boolean;
}

/** A parsed team of 1-6 Pokemon. */
export type ParsedTeam = ParsedPokemon[];

/** A single validation error. */
export interface ValidationError {
  /** Which validation stage produced the error. */
  source: "parse" | "structure" | "format";
  /** Human-readable error message. */
  message: string;
}

/** Result returned by the combined parse-and-validate pipeline. */
export interface ValidationResult {
  /** Whether the team passed all validation. */
  valid: boolean;
  /** The parsed team (present even when validation fails). */
  team: ParsedTeam;
  /** Collected errors across all stages. Empty when `valid` is true. */
  errors: ValidationError[];
}

// ---------------------------------------------------------------------------
// Pokepaste URL helpers
// ---------------------------------------------------------------------------

const POKEPASTE_REGEX = /^https?:\/\/pokepast\.es\/([a-f0-9]{16})\/?$/i;

/**
 * Detects whether `input` is a Pokepaste URL and, if so, returns
 * the paste ID. Returns `null` for non-Pokepaste input.
 */
export function parsePokepaseUrl(
  input: string
): { isPokepaste: true; pasteId: string } | null {
  const match = input.trim().match(POKEPASTE_REGEX);
  if (!match?.[1]) return null;
  return { isPokepaste: true, pasteId: match[1] };
}

/**
 * Builds the raw-text URL for a given Pokepaste ID.
 */
export function getPokepaseRawUrl(pasteId: string): string {
  return `https://pokepast.es/${pasteId}/raw`;
}

// ---------------------------------------------------------------------------
// Showdown text parsing
// ---------------------------------------------------------------------------

/**
 * Maps a gender code from Showdown ("M" / "F" / "N" / "") to
 * the human-readable string stored in the database.
 */
function mapGender(gender: string | undefined): string | null {
  if (gender === "M") return "Male";
  if (gender === "F") return "Female";
  return null;
}

/**
 * Converts a single `@pkmn/sets` `PokemonSet` to our `ParsedPokemon`
 * shape, mapping field names to database column conventions.
 */
function setToParsedPokemon(set: Partial<PokemonSet<string>>): ParsedPokemon {
  const species = set.species ?? "Unknown";

  return {
    species,
    nickname: set.name && set.name !== species ? set.name : null,
    level: set.level ?? 50,
    ability: set.ability ?? "",
    nature: (set.nature as string) ?? "Hardy",
    held_item: set.item || null,
    move1: set.moves?.[0] ?? null,
    move2: set.moves?.[1] ?? null,
    move3: set.moves?.[2] ?? null,
    move4: set.moves?.[3] ?? null,
    ev_hp: set.evs?.hp ?? 0,
    ev_attack: set.evs?.atk ?? 0,
    ev_defense: set.evs?.def ?? 0,
    ev_special_attack: set.evs?.spa ?? 0,
    ev_special_defense: set.evs?.spd ?? 0,
    ev_speed: set.evs?.spe ?? 0,
    iv_hp: set.ivs?.hp ?? 31,
    iv_attack: set.ivs?.atk ?? 31,
    iv_defense: set.ivs?.def ?? 31,
    iv_special_attack: set.ivs?.spa ?? 31,
    iv_special_defense: set.ivs?.spd ?? 31,
    iv_speed: set.ivs?.spe ?? 31,
    tera_type:
      ((set as Record<string, unknown>).teraType as string | null) ?? null,
    gender: mapGender(set.gender),
    is_shiny: set.shiny ?? false,
  };
}

/**
 * Parses a Showdown export-format string into an array of
 * `ParsedPokemon` objects.
 *
 * Uses `@pkmn/sets` `Teams.importTeam()` under the hood.
 */
export function parseShowdownText(text: string): ParsedTeam {
  const team = Teams.importTeam(text);
  if (!team || team.team.length === 0) {
    return [];
  }
  return team.team.map(setToParsedPokemon);
}

// ---------------------------------------------------------------------------
// Structural validation (format-agnostic)
// ---------------------------------------------------------------------------

/**
 * Performs structural checks on a parsed team:
 * - Team size between 1 and 6
 * - No duplicate species
 * - No duplicate held items
 * - Every Pokemon has at least one move
 * - Every Pokemon has an ability
 */
export function validateTeamStructure(team: ParsedTeam): ValidationError[] {
  const errors: ValidationError[] = [];

  // Team size
  if (team.length === 0) {
    errors.push({
      source: "structure",
      message: "Team must have at least 1 Pokemon.",
    });
    return errors;
  }

  if (team.length > 6) {
    errors.push({
      source: "structure",
      message: "Team cannot have more than 6 Pokemon.",
    });
  }

  // Duplicate species
  const speciesSeen = new Set<string>();
  for (const mon of team) {
    const key = mon.species.toLowerCase();
    if (speciesSeen.has(key)) {
      errors.push({
        source: "structure",
        message: `Duplicate species: ${mon.species}.`,
      });
    }
    speciesSeen.add(key);
  }

  // Duplicate items
  const itemsSeen = new Set<string>();
  for (const mon of team) {
    if (mon.held_item) {
      const key = mon.held_item.toLowerCase();
      if (itemsSeen.has(key)) {
        errors.push({
          source: "structure",
          message: `Duplicate item: ${mon.held_item} (on ${mon.species}).`,
        });
      }
      itemsSeen.add(key);
    }
  }

  // Each mon needs at least one move and an ability
  for (const mon of team) {
    const moves = [mon.move1, mon.move2, mon.move3, mon.move4].filter(Boolean);
    if (moves.length === 0) {
      errors.push({
        source: "structure",
        message: `${mon.species} has no moves.`,
      });
    }
    if (!mon.ability) {
      errors.push({
        source: "structure",
        message: `${mon.species} has no ability.`,
      });
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Format validation (uses @pkmn/sim)
// ---------------------------------------------------------------------------

/**
 * Converts a `ParsedPokemon` back to a `@pkmn/sim` `PokemonSet`
 * for the team validator.
 */
function parsedPokemonToSet(mon: ParsedPokemon): PokemonSet<string> {
  return {
    name: mon.nickname ?? mon.species,
    species: mon.species,
    item: mon.held_item ?? "",
    ability: mon.ability,
    moves: [mon.move1, mon.move2, mon.move3, mon.move4].filter(
      (m): m is string => m !== null
    ),
    nature: mon.nature,
    gender: mon.gender === "Male" ? "M" : mon.gender === "Female" ? "F" : "",
    evs: {
      hp: mon.ev_hp,
      atk: mon.ev_attack,
      def: mon.ev_defense,
      spa: mon.ev_special_attack,
      spd: mon.ev_special_defense,
      spe: mon.ev_speed,
    },
    ivs: {
      hp: mon.iv_hp,
      atk: mon.iv_attack,
      def: mon.iv_defense,
      spa: mon.iv_special_attack,
      spd: mon.iv_special_defense,
      spe: mon.iv_speed,
    },
    level: mon.level,
    shiny: mon.is_shiny,
    teraType: mon.tera_type ?? undefined,
  };
}

/**
 * Validates a parsed team against a specific `@pkmn/sim` format.
 *
 * Returns an empty array if the game format is not mapped in
 * `FORMAT_MAP` (i.e. we cannot validate formats we don't know about).
 */
export function validateTeamFormat(
  team: ParsedTeam,
  gameFormat: string
): ValidationError[] {
  const formatId = getPkmnFormat(gameFormat);
  if (!formatId) return [];

  const errors: ValidationError[] = [];

  try {
    // Build PokemonSet[] for the validator
    const sets = team.map(parsedPokemonToSet);

    // Use the static TeamValidator.get() to obtain a validator
    // for the target format, then validate the team.
    const validator = TeamValidator.get(formatId);
    const problems = validator.validateTeam(sets);

    if (problems && problems.length > 0) {
      for (const problem of problems) {
        errors.push({ source: "format", message: problem });
      }
    }
  } catch (err: unknown) {
    // If the format is unrecognised by @pkmn/sim, surface a
    // single descriptive error rather than crashing.
    const msg =
      err instanceof Error ? err.message : "Unknown format validation error";
    errors.push({
      source: "format",
      message: `Format validation failed: ${msg}`,
    });
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Combined entry point
// ---------------------------------------------------------------------------

/**
 * Parses raw Showdown export text, then runs structural and
 * format-specific validation.
 *
 * @param rawText - The Showdown export string (or Pokepaste body).
 * @param gameFormat - The trainers.gg `game_format` (e.g. "reg-i").
 * @returns A `ValidationResult` with the parsed team and any errors.
 */
export function parseAndValidateTeam(
  rawText: string,
  gameFormat: string
): ValidationResult {
  // 1. Parse
  const team = parseShowdownText(rawText);
  const errors: ValidationError[] = [];

  if (team.length === 0) {
    errors.push({
      source: "parse",
      message: "Could not parse any Pokemon from the provided text.",
    });
    return { valid: false, team, errors };
  }

  // 2. Structural validation
  const structuralErrors = validateTeamStructure(team);
  errors.push(...structuralErrors);

  // 3. Format-specific validation (only if structural checks pass)
  if (structuralErrors.length === 0) {
    const formatErrors = validateTeamFormat(team, gameFormat);
    errors.push(...formatErrors);
  }

  return {
    valid: errors.length === 0,
    team,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Zod schema for server-side input validation
// ---------------------------------------------------------------------------

/**
 * Schema for validating team submission input on the server.
 */
export const teamSubmissionSchema = z.object({
  tournamentId: z.number().int().positive(),
  rawText: z
    .string()
    .min(1, "Team text is required")
    .max(10000, "Team text too long"),
});

/** Input type inferred from `teamSubmissionSchema`. */
export type TeamSubmissionInput = z.infer<typeof teamSubmissionSchema>;
