import { z } from "zod";
import { Teams } from "@pkmn/sets";
import { type PokemonSet } from "@pkmn/sets";
import { TeamValidator } from "@pkmn/sim";
import {
  isChampionsFormatId,
  getLegalSpecies,
  getLegalItems,
  getLegalMoves,
  isPokemonType,
  isNature,
  LEGALITY_UNAVAILABLE,
  type Nature,
  type PokemonType,
} from "@trainers/pokemon";
import { containsProfanity, PROFANITY_ERROR_MESSAGE } from "./profanity";

// ---------------------------------------------------------------------------
// Format mapping: trainers.gg game_format → @pkmn/sim format ID
// ---------------------------------------------------------------------------

/**
 * Maps trainers.gg `game_format` values to the corresponding
 * Showdown format IDs used by `@pkmn/sim`.
 *
 * `null` = format is recognised by trainers.gg but has no `@pkmn/sim`
 * mapping (e.g. Champions, which uses its own validator).
 */
export const FORMAT_MAP = {
  "reg-i": "gen9vgc2025regi",
  // Champions Reg MA: no @pkmn/sim format ID yet (no Tera, Stat Points instead of EVs/IVs).
  // Champions legality is checked by `validateChampionsLegality()` instead.
  championsvgc2026regma: null,
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
} as const satisfies Record<string, string | null>;

/**
 * The set of `game_format` values trainers.gg recognises today. Derived
 * from `FORMAT_MAP` so adding/removing an entry there automatically
 * widens or narrows this type. Useful when a caller has already
 * validated a format string and wants to discriminate it from arbitrary
 * user input downstream.
 */
export type KnownGameFormat = keyof typeof FORMAT_MAP;

const KNOWN_GAME_FORMAT_SET: ReadonlySet<string> = new Set(
  Object.keys(FORMAT_MAP)
);

/** Runtime guard. Use at boundaries where a `string` may or may not be a recognised game format. */
export function isKnownGameFormat(s: string | null | undefined): s is KnownGameFormat {
  return s != null && KNOWN_GAME_FORMAT_SET.has(s);
}

/**
 * Returns the `@pkmn/sim` format string for a given trainers.gg
 * `game_format`, or `null` if the format is not mapped.
 */
export function getPkmnFormat(gameFormat: string): string | null {
  return (FORMAT_MAP as Record<string, string | null>)[gameFormat] ?? null;
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
  nature: Nature;
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
  tera_type: PokemonType | null;
  gender: ParsedPokemonGender;
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
 * Pokemon gender as stored in the DB. Mirrors the `pokemon_gender`
 * enum in `packages/supabase/src/types.ts` (no genderless / unknown
 * column on the table, hence `null` for everything else).
 */
export type ParsedPokemonGender = "Male" | "Female" | null;

/**
 * Maps a gender code from Showdown ("M" / "F" / "N" / "") to
 * the human-readable string stored in the database.
 */
function mapGender(gender: string | undefined): ParsedPokemonGender {
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
    // Coerce unknown natures to "Hardy" (the canonical neutral nature) so a
    // typo or future nature in the set doesn't bleed into the typed column.
    nature: isNature(set.nature) ? set.nature : "Hardy",
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
    tera_type: (() => {
      const raw = (set as Record<string, unknown>).teraType;
      // Drop unknown values — keeps the column to the 18-type union and
      // protects downstream consumers from typo'd Tera strings.
      return typeof raw === "string" && isPokemonType(raw) ? raw : null;
    })(),
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
// Structural validation (format-agnostic + format-specific)
// ---------------------------------------------------------------------------

/** Pokemon Champions Reg MA: max 32 Stat Points per stat, 66 total. */
function validateChampionsStatPoints(
  team: ParsedTeam,
  errors: ValidationError[]
): void {
  const STAT_MAX = 32;
  const TOTAL_MAX = 66;
  const STAT_NAMES = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"] as const;

  for (const mon of team) {
    const stats = [
      mon.ev_hp,
      mon.ev_attack,
      mon.ev_defense,
      mon.ev_special_attack,
      mon.ev_special_defense,
      mon.ev_speed,
    ];

    for (let i = 0; i < stats.length; i++) {
      const val = stats[i] ?? 0;
      if (val > STAT_MAX) {
        errors.push({
          source: "structure",
          message: `${mon.species} has ${val} Stat Points in ${STAT_NAMES[i]} (max ${STAT_MAX}).`,
        });
      }
    }

    const total = stats.reduce((sum, v) => sum + (v ?? 0), 0);
    if (total > TOTAL_MAX) {
      errors.push({
        source: "structure",
        message: `${mon.species} has ${total} total Stat Points (max ${TOTAL_MAX}).`,
      });
    }
  }
}

/**
 * Performs structural checks on a parsed team:
 * - Team size between 1 and 6
 * - No duplicate species
 * - No duplicate held items
 * - Every Pokemon has at least one move
 * - Every Pokemon has an ability
 * - Pokemon nicknames do not contain profanity
 * - Champions format (championsvgc2026regma): Stat Point limits (max 32 per stat, 66 total)
 */
export function validateTeamStructure(
  team: ParsedTeam,
  gameFormat?: string
): ValidationError[] {
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
  // Also check nicknames for profanity
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
    // Check nickname for profanity
    if (mon.nickname && containsProfanity(mon.nickname)) {
      errors.push({
        source: "structure",
        message: `Pokemon nickname "${mon.nickname}" contains inappropriate content.`,
      });
    }
  }

  if (gameFormat !== undefined && isChampionsFormatId(gameFormat)) {
    validateChampionsStatPoints(team, errors);
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Format validation (uses @pkmn/sim)
// ---------------------------------------------------------------------------

/**
 * Champions-specific legality check.
 *
 * `@pkmn/sim` does not yet support Pokemon Champions formats. Until it does,
 * we run a focused legality pass for Champions teams using the species/item/move
 * banlists exposed by `@trainers/pokemon`.
 *
 * Checks:
 *  - No Tera type set on any Pokemon (Champions removes Terastallization)
 *  - Every species is on the legal list for the format
 *  - Every held item is on the legal list for the format
 *  - Every move slot uses a legal move for the format
 *
 * Stat-point validation lives in `validateChampionsStatPoints` (structural pass).
 */
export function validateChampionsLegality(
  team: ParsedTeam,
  formatId: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  const legalSpecies = getLegalSpecies(formatId);
  const legalItems = getLegalItems(formatId);

  // Gate-path failure: when the validator threw mid-iteration we cannot
  // confidently approve the team. Surface a single error and bail — better
  // than silently legalizing a possibly-illegal team.
  if (
    legalSpecies === LEGALITY_UNAVAILABLE ||
    legalItems === LEGALITY_UNAVAILABLE
  ) {
    errors.push({
      source: "format",
      message:
        "Legality check is temporarily unavailable. Please try again in a moment.",
    });
    return errors;
  }

  for (const mon of team) {
    if (mon.tera_type) {
      errors.push({
        source: "format",
        message: `${mon.species} has a Tera type, but Pokemon Champions does not allow Terastallization.`,
      });
    }

    if (legalSpecies !== undefined && !legalSpecies.has(mon.species)) {
      errors.push({
        source: "format",
        message: `${mon.species} is not legal in this Champions format.`,
      });
    }

    if (
      legalItems !== undefined &&
      mon.held_item !== null &&
      mon.held_item !== "" &&
      !legalItems.has(mon.held_item)
    ) {
      errors.push({
        source: "format",
        message: `${mon.species}'s item "${mon.held_item}" is not legal in this Champions format.`,
      });
    }

    const legalMoves = getLegalMoves(mon.species, formatId);
    if (legalMoves === LEGALITY_UNAVAILABLE) {
      errors.push({
        source: "format",
        message: `Move legality check unavailable for ${mon.species}. Please try again in a moment.`,
      });
      continue;
    }
    if (legalMoves !== undefined) {
      for (const move of [mon.move1, mon.move2, mon.move3, mon.move4]) {
        if (move !== null && move !== "" && !legalMoves.has(move)) {
          errors.push({
            source: "format",
            message: `${mon.species}'s move "${move}" is not legal in this Champions format.`,
          });
        }
      }
    }
  }

  return errors;
}

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
/** Hard cap for raw team text. Mirrors `teamSubmissionSchema.rawText.max`
 *  so the parser doesn't process arbitrarily large payloads even if a
 *  caller bypasses the schema. */
const RAW_TEAM_TEXT_MAX = 10_000;

export function parseAndValidateTeam(
  rawText: string,
  gameFormat: string
): ValidationResult {
  // 0a. Reject oversized payloads before any parser work.
  const errors: ValidationError[] = [];
  if (rawText.length > RAW_TEAM_TEXT_MAX) {
    errors.push({
      source: "structure",
      message: `Team text exceeds maximum length (${RAW_TEAM_TEXT_MAX} characters).`,
    });
    return { valid: false, team: [], errors };
  }

  // 0b. Check raw text for profanity before parsing
  if (containsProfanity(rawText)) {
    errors.push({
      source: "structure",
      message: PROFANITY_ERROR_MESSAGE,
    });
    return { valid: false, team: [], errors };
  }

  // 1. Parse
  const team = parseShowdownText(rawText);

  if (team.length === 0) {
    errors.push({
      source: "parse",
      message: "Could not parse any Pokemon from the provided text.",
    });
    return { valid: false, team, errors };
  }

  // 2. Structural validation
  const structuralErrors = validateTeamStructure(team, gameFormat);
  errors.push(...structuralErrors);

  // 3. Format-specific validation (only if structural checks pass)
  if (structuralErrors.length === 0) {
    const formatErrors = isChampionsFormatId(gameFormat)
      ? validateChampionsLegality(team, gameFormat)
      : validateTeamFormat(team, gameFormat);
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
    .max(10000, "Team text too long")
    .refine((val) => !containsProfanity(val), {
      message: PROFANITY_ERROR_MESSAGE,
    }),
});

/** Input type inferred from `teamSubmissionSchema`. */
export type TeamSubmissionInput = z.infer<typeof teamSubmissionSchema>;
