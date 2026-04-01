import type { TypedClient } from "../../client";

/**
 * Create OTS (Open Team Sheet) snapshots for all seeded players in a tournament.
 *
 * Called at tournament start. Reads each player's private team data via service
 * role, then writes only VGC OTS-format fields (species, ability, item, tera type,
 * moves) to tournament_team_sheets. EVs, IVs, nature, and other private details
 * are intentionally excluded — players keep those secret.
 *
 * IMPORTANT: Must be called with a service role client because:
 * 1. It reads private team data that the calling user may not own
 * 2. It writes to tournament_team_sheets which only allows service role INSERT
 *
 * @param supabase - Service role Supabase client
 * @param tournamentId - Tournament to snapshot
 */
export async function createTournamentTeamSheets(
  supabase: TypedClient,
  tournamentId: number
): Promise<void> {
  // Get tournament format for the 'format' column
  const { data: tournament, error: tError } = await supabase
    .from("tournaments")
    .select("game_format")
    .eq("id", tournamentId)
    .single();

  if (tError || !tournament) {
    throw new Error(`Failed to fetch tournament: ${tError?.message}`);
  }

  const format = tournament.game_format ?? "unknown";

  // Get all checked-in registrations with their team + pokemon data.
  // Only seeded players (checked_in status) get snapshots.
  // Uses the tournament_registrations_team_fk hint to disambiguate the FK.
  const { data: registrations, error: rError } = await supabase
    .from("tournament_registrations")
    .select(
      `
      id,
      alt_id,
      team_id,
      team:teams!tournament_registrations_team_fk(
        id,
        team_pokemon(
          team_position,
          pokemon:pokemon!team_pokemon_pokemon_id_fkey(
            species,
            ability,
            held_item,
            tera_type,
            move1,
            move2,
            move3,
            move4
          )
        )
      )
    `
    )
    .eq("tournament_id", tournamentId)
    .eq("status", "checked_in")
    .not("team_id", "is", null);

  if (rError) {
    throw new Error(`Failed to fetch registrations: ${rError.message}`);
  }

  if (!registrations || registrations.length === 0) return;

  // Build snapshot rows — one per Pokemon per player
  const snapshotRows: Array<{
    tournament_id: number;
    registration_id: number;
    alt_id: number;
    team_id: number;
    format: string;
    position: number;
    species: string;
    ability: string;
    held_item: string | null;
    tera_type: string | null;
    move1: string;
    move2: string | null;
    move3: string | null;
    move4: string | null;
  }> = [];

  for (const reg of registrations) {
    if (!reg.team || !reg.team_id) continue;

    // Type assertion for the nested join result
    const team = reg.team as unknown as {
      id: number;
      team_pokemon: Array<{
        team_position: number;
        pokemon: {
          species: string;
          ability: string;
          held_item: string | null;
          tera_type: string | null;
          move1: string;
          move2: string | null;
          move3: string | null;
          move4: string | null;
        } | null;
      }>;
    };

    for (const tp of team.team_pokemon) {
      if (!tp.pokemon) continue;

      snapshotRows.push({
        tournament_id: tournamentId,
        registration_id: reg.id,
        alt_id: reg.alt_id,
        team_id: reg.team_id,
        format,
        position: tp.team_position,
        species: tp.pokemon.species,
        ability: tp.pokemon.ability,
        held_item: tp.pokemon.held_item,
        tera_type: tp.pokemon.tera_type,
        move1: tp.pokemon.move1,
        move2: tp.pokemon.move2,
        move3: tp.pokemon.move3,
        move4: tp.pokemon.move4,
      });
    }
  }

  if (snapshotRows.length === 0) return;

  // Batch insert all snapshot rows
  const { error: insertError } = await supabase
    .from("tournament_team_sheets")
    .insert(snapshotRows);

  if (insertError) {
    throw new Error(
      `Failed to create team sheet snapshots: ${insertError.message}`
    );
  }
}
