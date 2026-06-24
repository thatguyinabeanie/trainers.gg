import { fetchInChunks } from "./players";
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

/** Team list item with the owning alt's username for cross-alt views. */
export type CrossAltTeamListItem = TeamListItem & {
  alt_username: string;
};

/** Enriched per-user team: full team row + all pokemon + owning alt + folder membership ids. */
export type EnrichedUserTeam = TeamWithPokemon & {
  alt_username: string;
  alt_id: number;
  /** team_folder_members.folder_id values (raw numeric DB ids) this team belongs to. */
  folder_ids: number[];
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

// =============================================================================
// Cross-Alt Team Queries
// =============================================================================

/**
 * Get all teams across all of a user's alts for the cross-alt landing page.
 * Joins through alts to get the owning alt's username for display.
 * Ordered by updated_at desc (most recently edited first).
 */
export async function getTeamsForUser(
  supabase: TypedClient,
  userId: string
): Promise<CrossAltTeamListItem[]> {
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
      alt:alts!teams_created_by_fkey!inner(username),
      team_pokemon(
        id,
        team_position,
        pokemon:pokemon(id, species, is_shiny)
      )
    `
    )
    .eq("alts.user_id", userId)
    .order("updated_at", { ascending: false });

  if (error)
    throw new Error(`Failed to fetch teams for user: ${error.message}`);

  // Flatten the alt join into alt_username
  return (teams ?? []).map((t) => {
    const { alt, ...rest } = t;
    return {
      ...rest,
      alt_username: (alt as unknown as { username: string })?.username ?? "",
    };
  });
}

/**
 * All teams the user owns across every alt, enriched for the builder landing
 * (search + quick-look read item/ability/tera/moves/nature for all 6 from this
 * one list — no per-row fetch). Includes landing flags + folder membership ids.
 * P-bucket: call with an authenticated client (RLS scopes to the user's alts).
 */
export async function getEnrichedTeamsForUser(
  supabase: TypedClient,
  userId: string
): Promise<EnrichedUserTeam[]> {
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select(
      `
      id,
      name,
      format,
      is_public,
      format_legal,
      description,
      notes,
      tags,
      parent_team_id,
      pinned,
      archived,
      sort_order,
      created_by,
      created_at,
      updated_at,
      alt:alts!teams_created_by_fkey!inner(id, username),
      team_pokemon(
        id,
        pokemon_id,
        team_position,
        pokemon:pokemon(*)
      )
    `
    )
    .eq("alts.user_id", userId)
    .order("updated_at", { ascending: false });

  if (teamsError)
    throw new Error(
      `Failed to fetch enriched teams for user: ${teamsError.message}`
    );

  const teamRows = teams ?? [];
  const teamIds = teamRows.map((t) => t.id);

  // Fetch folder memberships in URI-safe chunks (guards unbounded .in() gotcha)
  const folderMembers =
    teamIds.length > 0
      ? await fetchInChunks(teamIds, (idChunk) =>
          supabase
            .from("team_folder_members")
            .select("team_id, folder_id")
            .in("team_id", idChunk)
        )
      : [];

  // Build a lookup map: teamId → folder_id[]
  const folderMap = new Map<number, number[]>();
  for (const row of folderMembers) {
    const existing = folderMap.get(row.team_id);
    if (existing) {
      existing.push(row.folder_id);
    } else {
      folderMap.set(row.team_id, [row.folder_id]);
    }
  }

  // Map each row to EnrichedUserTeam: flatten alt embed, attach folder_ids
  return teamRows.map((t) => {
    const { alt, ...rest } = t;
    const altEmbed = alt as unknown as { id: number; username: string };
    return {
      ...rest,
      alt_id: altEmbed?.id ?? 0,
      alt_username: altEmbed?.username ?? "",
      folder_ids: folderMap.get(t.id) ?? [],
    };
  });
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
