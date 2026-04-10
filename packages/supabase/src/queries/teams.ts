import type { TypedClient } from "../client";
import type { Tables } from "../types";

// =============================================================================
// Types
// =============================================================================

/** Full team row with all associated pokemon via the team_pokemon join table. */
export type TeamWithPokemon = Tables<"teams"> & {
  team_pokemon: Array<{
    id: number;
    pokemon_id: number;
    team_position: number;
    pokemon: Tables<"pokemon"> | null;
  }>;
};

/** Lightweight team shape for list views — only the fields needed for the card UI. */
export type TeamListItem = Pick<
  Tables<"teams">,
  "id" | "name" | "format" | "is_public" | "updated_at" | "created_at"
> & {
  team_pokemon: Array<{
    id: number;
    team_position: number;
    pokemon: {
      id: number;
      species: string | null;
      is_shiny: boolean | null;
    } | null;
  }>;
};

// =============================================================================
// Team Queries
// =============================================================================

/**
 * Get all teams for an alt with minimal pokemon data for the list view.
 * Only fetches species and is_shiny from pokemon (enough for sprites).
 * Use `getTeamsForAltFull` when full pokemon fields are needed (workspace).
 */
export async function getTeamsForAltList(
  supabase: TypedClient,
  altId: number
): Promise<TeamListItem[]> {
  const { data: teams, error } = await supabase
    .from("teams")
    .select(
      `
      id,
      name,
      format,
      is_public,
      updated_at,
      created_at,
      team_pokemon(
        id,
        team_position,
        pokemon:pokemon(id, species, is_shiny)
      )
    `
    )
    .eq("created_by", altId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch teams for alt: ${error.message}`);
  return teams ?? [];
}

/**
 * Get all teams for an alt with full pokemon data, ordered by updated_at desc.
 * Returns the complete team builder shape (all pokemon fields).
 * Note: named `getTeamsForAltFull` to distinguish from the lightweight `getTeamsForAlt`
 * in tournaments.ts which only returns species names for the alt management UI.
 */
export async function getTeamsForAltFull(
  supabase: TypedClient,
  altId: number
): Promise<TeamWithPokemon[]> {
  const { data: teams, error } = await supabase
    .from("teams")
    .select(
      `
      *,
      team_pokemon(
        id,
        pokemon_id,
        team_position,
        pokemon:pokemon(*)
      )
    `
    )
    .eq("created_by", altId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch teams for alt: ${error.message}`);
  return teams ?? [];
}

/**
 * Get a single team with all its pokemon via the team_pokemon join table.
 * Returns null if the team does not exist or is not accessible.
 */
export async function getTeamWithPokemon(
  supabase: TypedClient,
  teamId: number
): Promise<TeamWithPokemon | null> {
  const { data: team, error } = await supabase
    .from("teams")
    .select(
      `
      *,
      team_pokemon(
        id,
        pokemon_id,
        team_position,
        pokemon:pokemon(*)
      )
    `
    )
    .eq("id", teamId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch team: ${error.message}`);

  return team;
}

/**
 * Get teams for an alt filtered by format with full pokemon data.
 * Returns the complete team builder shape ordered by updated_at desc.
 * Note: named `getTeamsForAltByFormatFull` to distinguish from any lightweight variants.
 */
export async function getTeamsForAltByFormatFull(
  supabase: TypedClient,
  altId: number,
  format: string
): Promise<TeamWithPokemon[]> {
  const { data: teams, error } = await supabase
    .from("teams")
    .select(
      `
      *,
      team_pokemon(
        id,
        pokemon_id,
        team_position,
        pokemon:pokemon(*)
      )
    `
    )
    .eq("created_by", altId)
    .eq("format", format)
    .order("updated_at", { ascending: false });

  if (error)
    throw new Error(
      `Failed to fetch teams for alt by format: ${error.message}`
    );
  return teams ?? [];
}
