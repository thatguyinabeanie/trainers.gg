/**
 * fixtures.ts
 *
 * Canonical fixture helpers for the team-builder landing test suite.
 * Import `makeDraftRecord` and `makeFilledSlot` instead of duplicating
 * inline object literals in each test file.
 *
 * Conforms to the full `LocalDraftRecord` v3 shape including Milestone-B
 * fields: `pinned`, `archived`, `sortOrder`, `folderIds`.
 */

import { type TeamWithPokemon } from "@trainers/supabase";

import { type LocalDraftRecord } from "../../persistence/local-drafts-types";

// =============================================================================
// Team-pokemon slot helpers
// =============================================================================

/** Options for constructing a filled pokemon slot. */
export interface FilledSlotOptions {
  species?: string;
  ability?: string | null;
  move1?: string | null;
  move2?: string | null;
  move3?: string | null;
  move4?: string | null;
  held_item?: string | null;
  tera_type?: string | null;
  format_legal?: boolean | null;
  is_shiny?: boolean | null;
  nature?: string | null;
  level?: number;
}

/**
 * Build a fully-typed filled `team_pokemon` slot.
 *
 * Defaults to a valid Pikachu slot (Static + Thunderbolt) so callers only
 * need to pass the fields relevant to the test scenario.
 */
export function makeFilledSlot(
  species: string,
  opts: FilledSlotOptions & { id?: number; position?: number } = {}
): TeamWithPokemon["team_pokemon"][number] {
  const id = opts.id ?? 1;
  const position = opts.position ?? 0;
  return {
    id,
    pokemon_id: id,
    team_position: position,
    pokemon: {
      id,
      species,
      ability: opts.ability !== undefined ? opts.ability : "Static",
      move1: opts.move1 !== undefined ? opts.move1 : "Thunderbolt",
      move2: opts.move2 !== undefined ? opts.move2 : null,
      move3: opts.move3 !== undefined ? opts.move3 : null,
      move4: opts.move4 !== undefined ? opts.move4 : null,
      nature: opts.nature !== undefined ? opts.nature : "Timid",
      nickname: null,
      notes: null,
      held_item: opts.held_item !== undefined ? opts.held_item : null,
      tera_type: opts.tera_type !== undefined ? opts.tera_type : null,
      gender: null,
      is_shiny: opts.is_shiny !== undefined ? opts.is_shiny : false,
      level: opts.level !== undefined ? opts.level : 50,
      format_legal: opts.format_legal !== undefined ? opts.format_legal : null,
      created_at: "2024-01-01T00:00:00Z",
      ev_hp: 0,
      ev_attack: 0,
      ev_defense: 0,
      ev_special_attack: 0,
      ev_special_defense: 0,
      ev_speed: 0,
      iv_hp: 31,
      iv_attack: 31,
      iv_defense: 31,
      iv_special_attack: 31,
      iv_special_defense: 31,
      iv_speed: 31,
    },
  };
}

/**
 * Build a null slot (position placeholder, no pokemon assigned).
 * Used to occupy a roster position without counting as a filled slot.
 */
export function makeNullSlot(
  id: number,
  position: number
): TeamWithPokemon["team_pokemon"][number] {
  return { id, pokemon_id: id, team_position: position, pokemon: null };
}

// =============================================================================
// Draft record factory
// =============================================================================

/** Partial overrides accepted by `makeDraftRecord`. */
export interface DraftRecordOverrides {
  id?: string;
  /** Top-level team overrides; merged on top of the default team shape. */
  team?: Partial<Omit<TeamWithPokemon, "team_pokemon">> & {
    team_pokemon?: TeamWithPokemon["team_pokemon"];
  };
  createdAt?: string;
  updatedAt?: string;
  pinned?: boolean;
  archived?: boolean;
  sortOrder?: number | null;
  folderIds?: string[];
}

/**
 * Build a fully-typed `LocalDraftRecord` with sensible defaults for ALL fields
 * including the Milestone-B attributes (`pinned`, `archived`, `sortOrder`,
 * `folderIds`). Callers pass only the fields relevant to the test scenario.
 *
 * The default team mirrors `createEmptyTeam()` from `local-drafts-store.ts`:
 * - `format`: "gen9vgc2026regi" (current active SV regulation)
 * - `team_pokemon`: empty array
 * - `name`: "Untitled Team"
 */
export function makeDraftRecord(
  overrides: DraftRecordOverrides = {}
): LocalDraftRecord {
  const {
    id = "local-ab12",
    team: teamOverrides = {},
    createdAt = "2024-01-01T00:00:00Z",
    updatedAt = "2024-06-01T00:00:00Z",
    pinned = false,
    archived = false,
    sortOrder = null,
    folderIds = [],
  } = overrides;

  const { team_pokemon, ...restTeamOverrides } = teamOverrides;

  const team: TeamWithPokemon = {
    id: -1,
    name: "Untitled Team",
    format: "gen9vgc2026regi",
    format_legal: null,
    description: null,
    notes: null,
    tags: null,
    is_public: null,
    parent_team_id: null,
    created_by: -1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    team_pokemon: team_pokemon ?? [],
    ...restTeamOverrides,
  };

  return { id, team, createdAt, updatedAt, pinned, archived, sortOrder, folderIds };
}
