import type { TypedClient } from "../client";
import type { Tables } from "../types";

/**
 * OTS (Open Team Sheet) data for a single Pokemon.
 * Contains only VGC OTS-visible fields — no EVs, IVs, nature.
 */
export interface TeamSheetPokemon {
  position: number;
  species: string;
  ability: string;
  heldItem: string | null;
  teraType: string | null;
  move1: string;
  move2: string | null;
  move3: string | null;
  move4: string | null;
}

/** A player's full OTS for a tournament (up to 6 Pokemon) */
export interface PlayerTeamSheet {
  registrationId: number;
  altId: number;
  teamId: number;
  format: string;
  pokemon: TeamSheetPokemon[];
}

type TeamSheetRow = Tables<"tournament_team_sheets">;

/** Map a DB row to the camelCase TeamSheetPokemon interface */
function rowToPokemon(row: TeamSheetRow): TeamSheetPokemon {
  return {
    position: row.position,
    species: row.species,
    ability: row.ability,
    heldItem: row.held_item,
    teraType: row.tera_type,
    move1: row.move1,
    move2: row.move2,
    move3: row.move3,
    move4: row.move4,
  };
}

/** Build a PlayerTeamSheet from a set of rows (all same registration) */
function rowsToSheet(rows: TeamSheetRow[]): PlayerTeamSheet | null {
  if (rows.length === 0) return null;
  const first = rows[0];
  if (!first) return null;
  return {
    registrationId: first.registration_id,
    altId: first.alt_id,
    teamId: first.team_id,
    format: first.format,
    pokemon: rows.map(rowToPokemon),
  };
}

/**
 * Get all visible team sheets for a tournament.
 * Returns one PlayerTeamSheet per registered player.
 * Only returns data if snapshots exist (tournament has started).
 */
export async function getTournamentTeamSheets(
  supabase: TypedClient,
  tournamentId: number
): Promise<PlayerTeamSheet[]> {
  const { data, error } = await supabase
    .from("tournament_team_sheets")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("registration_id")
    .order("position");

  if (error) throw new Error(`Failed to fetch team sheets: ${error.message}`);
  if (!data || data.length === 0) return [];

  const grouped = new Map<number, TeamSheetRow[]>();

  for (const row of data) {
    const existing = grouped.get(row.registration_id);
    if (existing) {
      existing.push(row);
    } else {
      grouped.set(row.registration_id, [row]);
    }
  }

  return Array.from(grouped.values())
    .map(rowsToSheet)
    .filter((s): s is PlayerTeamSheet => s !== null);
}

/**
 * Get a single player's OTS for a tournament.
 */
export async function getTeamSheetByRegistration(
  supabase: TypedClient,
  registrationId: number
): Promise<PlayerTeamSheet | null> {
  const { data, error } = await supabase
    .from("tournament_team_sheets")
    .select("*")
    .eq("registration_id", registrationId)
    .order("position");

  if (error) throw new Error(`Failed to fetch team sheet: ${error.message}`);
  if (!data || data.length === 0) return null;

  return rowsToSheet(data);
}

/**
 * Get both players' OTS for a match.
 * Used on the match page to display opponent team sheets.
 */
export async function getMatchTeamSheets(
  supabase: TypedClient,
  tournamentId: number,
  player1AltId: number,
  player2AltId: number
): Promise<{
  player1: PlayerTeamSheet | null;
  player2: PlayerTeamSheet | null;
}> {
  const { data, error } = await supabase
    .from("tournament_team_sheets")
    .select("*")
    .eq("tournament_id", tournamentId)
    .in("alt_id", [player1AltId, player2AltId])
    .order("alt_id")
    .order("position");

  if (error)
    throw new Error(`Failed to fetch match team sheets: ${error.message}`);
  if (!data || data.length === 0) return { player1: null, player2: null };

  return {
    player1: rowsToSheet(data.filter((r) => r.alt_id === player1AltId)),
    player2: rowsToSheet(data.filter((r) => r.alt_id === player2AltId)),
  };
}
