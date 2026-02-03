import type { Database } from "../../types";
import { type TypedClient, getCurrentAlt } from "./helpers";

/**
 * Submit a team for a tournament registration.
 * Parses Showdown format text, validates, and stores structured data.
 * If the player already has a team submitted, it replaces it.
 */
export async function submitTeam(
  supabase: TypedClient,
  tournamentId: number,
  rawText: string
) {
  const alt = await getCurrentAlt(supabase);
  if (!alt) {
    throw new Error(
      "Unable to load your account. Please try signing out and back in, or contact support."
    );
  }

  // 1. Find registration
  const { data: registration } = await supabase
    .from("tournament_registrations")
    .select("id, team_id, team_locked, tournament_id")
    .eq("tournament_id", tournamentId)
    .eq("alt_id", alt.id)
    .single();

  if (!registration) {
    throw new Error(
      "You must be registered for this tournament to submit a team."
    );
  }

  if (registration.team_locked) {
    throw new Error("Teams are locked — the tournament has already started.");
  }

  // 2. Get tournament format for validation
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("game_format")
    .eq("id", tournamentId)
    .single();

  if (!tournament) throw new Error("Tournament not found.");

  // 3. Parse and validate (server-side enforcement)
  const { parseAndValidateTeam } = await import("@trainers/validators/team");
  const result = parseAndValidateTeam(rawText, tournament.game_format ?? "");

  if (!result.valid || result.team.length === 0) {
    throw new Error(
      `Team validation failed:\n${result.errors.map((e) => `• ${e.message}`).join("\n")}`
    );
  }

  // 4. If replacing an existing team, delete old data
  if (registration.team_id) {
    const { data: oldTeamPokemon } = await supabase
      .from("team_pokemon")
      .select("pokemon_id")
      .eq("team_id", registration.team_id);

    await supabase
      .from("team_pokemon")
      .delete()
      .eq("team_id", registration.team_id);

    if (oldTeamPokemon?.length) {
      const pokemonIds = oldTeamPokemon.map((tp) => tp.pokemon_id);
      await supabase.from("pokemon").delete().in("id", pokemonIds);
    }

    await supabase.from("teams").delete().eq("id", registration.team_id);
  }

  // 5. Create new team
  const { data: newTeam, error: teamError } = await supabase
    .from("teams")
    .insert({
      name: "Tournament Team",
      created_by: alt.id,
      is_public: false,
    })
    .select("id")
    .single();

  if (teamError || !newTeam) throw new Error("Failed to create team.");

  // 6. Insert pokemon records
  // Note: move1 is required in the schema, so we fall back to empty string
  // gender must match the pokemon_gender enum ("Male" | "Female" | null)
  const pokemonInserts = result.team.map((mon) => ({
    species: mon.species,
    nickname: mon.nickname,
    level: mon.level,
    ability: mon.ability,
    nature: mon.nature,
    held_item: mon.held_item,
    move1: mon.move1 ?? "",
    move2: mon.move2,
    move3: mon.move3,
    move4: mon.move4,
    ev_hp: mon.ev_hp,
    ev_attack: mon.ev_attack,
    ev_defense: mon.ev_defense,
    ev_special_attack: mon.ev_special_attack,
    ev_special_defense: mon.ev_special_defense,
    ev_speed: mon.ev_speed,
    iv_hp: mon.iv_hp,
    iv_attack: mon.iv_attack,
    iv_defense: mon.iv_defense,
    iv_special_attack: mon.iv_special_attack,
    iv_special_defense: mon.iv_special_defense,
    iv_speed: mon.iv_speed,
    tera_type: mon.tera_type,
    gender: mon.gender as Database["public"]["Enums"]["pokemon_gender"] | null,
    is_shiny: mon.is_shiny,
  }));

  const { data: newPokemon, error: pokemonError } = await supabase
    .from("pokemon")
    .insert(pokemonInserts)
    .select("id");

  if (pokemonError || !newPokemon) {
    throw new Error("Failed to create pokemon records.");
  }

  // 7. Link pokemon to team with positions
  const teamPokemonInserts = newPokemon.map((p, index) => ({
    team_id: newTeam.id,
    pokemon_id: p.id,
    team_position: index + 1,
  }));

  const { error: linkError } = await supabase
    .from("team_pokemon")
    .insert(teamPokemonInserts);

  if (linkError) throw new Error("Failed to link pokemon to team.");

  // 8. Update registration with team reference
  const { error: regError } = await supabase
    .from("tournament_registrations")
    .update({
      team_id: newTeam.id,
      team_submitted_at: new Date().toISOString(),
    })
    .eq("id", registration.id);

  if (regError) throw new Error("Failed to update registration with team.");

  return {
    success: true,
    teamId: newTeam.id,
    pokemonCount: result.team.length,
  };
}

/**
 * Select an existing team for a tournament registration.
 * Links a team already owned by the user's alt to their registration.
 * Unlike submitTeam, this does NOT parse/create a new team.
 */
export async function selectTeamForTournament(
  supabase: TypedClient,
  tournamentId: number,
  teamId: number
) {
  const alt = await getCurrentAlt(supabase);
  if (!alt) {
    throw new Error(
      "Unable to load your account. Please try signing out and back in, or contact support."
    );
  }

  // 1. Find registration (must exist, must not be locked)
  const { data: registration } = await supabase
    .from("tournament_registrations")
    .select("id, team_id, team_locked")
    .eq("tournament_id", tournamentId)
    .eq("alt_id", alt.id)
    .single();

  if (!registration) {
    throw new Error(
      "You must be registered for this tournament to submit a team."
    );
  }

  if (registration.team_locked) {
    throw new Error("Teams are locked — the tournament has already started.");
  }

  // 2. Verify the team belongs to this alt
  const { data: team } = await supabase
    .from("teams")
    .select("id, created_by")
    .eq("id", teamId)
    .single();

  if (!team || team.created_by !== alt.id) {
    throw new Error("This team does not belong to your account.");
  }

  // 3. Verify team has pokemon
  const { count } = await supabase
    .from("team_pokemon")
    .select("*", { count: "exact", head: true })
    .eq("team_id", teamId);

  if (!count || count === 0) {
    throw new Error(
      "This team has no Pokemon. Please select a team with Pokemon."
    );
  }

  // 4. Update registration: set team_id, team_submitted_at
  const { error: regError } = await supabase
    .from("tournament_registrations")
    .update({
      team_id: teamId,
      team_submitted_at: new Date().toISOString(),
    })
    .eq("id", registration.id);

  if (regError) throw new Error("Failed to update registration with team.");

  return {
    teamId,
    pokemonCount: count,
  };
}
