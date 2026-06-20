import {
  getCanonicalBaseSpecies,
  getLegalAbilities,
  getLegalItems,
  getLegalMoves,
  getLegalSpecies,
  getLegalTeraTypes,
  isMegaSpeciesWithStone,
  LEGALITY_UNAVAILABLE,
} from "@trainers/pokemon";
import { logError } from "@trainers/utils";

import { type TypedClient, getCurrentAlt } from "./helpers";
import {
  type ParsedPokemon,
  type ValidationError,
} from "@trainers/validators/team";

export type SubmitTeamResult =
  | {
      success: true;
      teamId: number;
      pokemonCount: number;
      teamName: string;
      species: string[];
    }
  | {
      success: false;
      errors: string[];
    };

/**
 * Submit a team for a tournament registration.
 * Parses Showdown format text, validates, and stores structured data.
 * If the player already has a team submitted, it replaces it.
 */
export async function submitTeam(
  supabase: TypedClient,
  tournamentId: number,
  rawText: string
): Promise<SubmitTeamResult> {
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
    // Return structured errors instead of throwing
    return {
      success: false,
      errors: result.errors.map((e: ValidationError) => e.message),
    };
  }

  // 4. If replacing an existing team, delete old data. Each step is checked
  //    individually — a silent ignored failure here leaves orphan team_pokemon
  //    or pokemon rows pointing at a now-replaced team. We surface the error
  //    via `logError` so ops can see it, but continue with the new-team
  //    insert so the user-facing flow doesn't deadlock; recovery is by
  //    cleanup migration rather than by client retry.
  if (registration.team_id) {
    const oldTeamId = registration.team_id;

    const { data: oldTeamPokemon, error: selectErr } = await supabase
      .from("team_pokemon")
      .select("pokemon_id")
      .eq("team_id", oldTeamId);
    if (selectErr) {
      logError("submitTeam.fetchOldTeamPokemon", selectErr, {
        oldTeamId,
        altId: alt.id,
      });
    }

    const { error: tpDeleteErr } = await supabase
      .from("team_pokemon")
      .delete()
      .eq("team_id", oldTeamId);
    if (tpDeleteErr) {
      logError("submitTeam.deleteOldTeamPokemon", tpDeleteErr, {
        oldTeamId,
        altId: alt.id,
      });
    }

    if (oldTeamPokemon?.length) {
      const pokemonIds = oldTeamPokemon.map((tp) => tp.pokemon_id);
      const { error: pkmnDeleteErr } = await supabase
        .from("pokemon")
        .delete()
        .in("id", pokemonIds);
      if (pkmnDeleteErr) {
        logError("submitTeam.deleteOldPokemon", pkmnDeleteErr, {
          oldTeamId,
          pokemonCount: pokemonIds.length,
        });
      }
    }

    const { error: teamDeleteErr } = await supabase
      .from("teams")
      .delete()
      .eq("id", oldTeamId);
    if (teamDeleteErr) {
      logError("submitTeam.deleteOldTeam", teamDeleteErr, {
        oldTeamId,
        altId: alt.id,
      });
    }
  }

  // 5. Create new team
  const { data: newTeam, error: teamError } = await supabase
    .from("teams")
    .insert({
      name: "Tournament Team",
      created_by: alt.id,
      is_public: false,
    })
    .select("id, name")
    .single();

  if (teamError || !newTeam) throw new Error("Failed to create team.");

  // 6. Insert pokemon records.
  // move1 is required in the schema → fall back to empty string.
  // `mon.gender` is `ParsedPokemonGender = "Male" | "Female" | null`,
  // structurally identical to the `pokemon_gender` enum, so no cast needed.
  const pokemonInserts = result.team.map((mon: ParsedPokemon) => ({
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
    gender: mon.gender,
    is_shiny: mon.is_shiny,
  }));

  const { data: newPokemon, error: pokemonError } = await supabase
    .from("pokemon")
    .insert(pokemonInserts)
    .select("id");

  if (pokemonError || !newPokemon) {
    // Log the postgres detail for ops/triage; throw a user-safe generic so
    // RLS policy text and table names never reach the public tournament page.
    console.error(
      "submitTeam: failed to create pokemon records",
      pokemonError ?? "no data returned"
    );
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
    teamName: newTeam.name ?? "Unnamed Team",
    species: result.team.map((mon: ParsedPokemon) => mon.species),
  };
}

export type SelectTeamResult =
  | {
      success: true;
      teamId: number;
      pokemonCount: number;
      teamName: string;
      species: string[];
    }
  | {
      success: false;
      errors: string[];
    };

/**
 * Select an existing team for a tournament registration.
 * Links a team already owned by the user's alt to their registration.
 * Currently does not validate the team against the tournament format.
 */
export async function selectTeamForTournament(
  supabase: TypedClient,
  tournamentId: number,
  teamId: number
): Promise<SelectTeamResult> {
  const alt = await getCurrentAlt(supabase);
  if (!alt) {
    throw new Error(
      "Unable to load your account. Please try signing out and back in, or contact support."
    );
  }

  // 1. Find registration (must exist, must not be locked) and the
  //    tournament's game_format so we can validate the selected team
  //    against the format the player is registering for.
  const { data: registration } = await supabase
    .from("tournament_registrations")
    .select("id, team_id, team_locked, tournaments!inner(game_format)")
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

  const gameFormat = registration.tournaments?.game_format ?? null;

  // 2. Verify the team belongs to this alt and fetch its Pokemon with
  //    the fields needed to gate against `gameFormat`.
  const { data: team } = await supabase
    .from("teams")
    .select(
      `
      id,
      name,
      created_by,
      team_pokemon!inner (
        team_position,
        pokemon!inner (
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
    `
    )
    .eq("id", teamId)
    .order("team_position", {
      referencedTable: "team_pokemon",
      ascending: true,
    })
    .single();

  if (!team || team.created_by !== alt.id) {
    throw new Error("This team does not belong to your account.");
  }

  // Already sorted by team_position via query ordering
  const teamPokemon = (team.team_pokemon ?? [])
    .map((tp) => tp.pokemon)
    .filter((p): p is NonNullable<typeof p> => p !== null);

  if (teamPokemon.length === 0) {
    return {
      success: false,
      errors: ["This team has no Pokemon. Please select a team with Pokemon."],
    };
  }

  // 3. Format legality — gate path. Unknown formats are permissive
  //    (`getLegal*` returns undefined), so existing tournaments without a
  //    legality registry behave as before. When the underlying validator
  //    threw mid-iteration (`LEGALITY_UNAVAILABLE` sentinel), we fail
  //    closed: better to ask the user to retry than to silently approve a
  //    possibly-illegal team.
  if (gameFormat) {
    const UNAVAILABLE =
      "Legality check is temporarily unavailable. Please try again in a moment.";
    const legalSpecies = getLegalSpecies(gameFormat);
    const legalItems = getLegalItems(gameFormat);
    const legalTera = getLegalTeraTypes(gameFormat);
    if (
      legalSpecies === LEGALITY_UNAVAILABLE ||
      legalItems === LEGALITY_UNAVAILABLE ||
      legalTera === LEGALITY_UNAVAILABLE
    ) {
      return { success: false, errors: [UNAVAILABLE] };
    }

    const legalityErrors: string[] = [];
    for (const mon of teamPokemon) {
      const species = mon.species ?? "";
      const label = species || "Pokemon";
      if (species && legalSpecies !== undefined && !legalSpecies.has(species)) {
        legalityErrors.push(
          `${label} is not legal in this tournament's format.`
        );
      }
      if (
        mon.held_item &&
        legalItems !== undefined &&
        !legalItems.has(mon.held_item)
      ) {
        legalityErrors.push(
          `${label}'s held item "${mon.held_item}" is not legal in this format.`
        );
      }
      if (mon.ability) {
        // Mega forms: validate against base species' ability pool, mirroring
        // the isLegalAbility helper's normalization.
        const lookupSpecies = isMegaSpeciesWithStone(species)
          ? getCanonicalBaseSpecies(species)
          : species;
        const legalAbilities = getLegalAbilities(lookupSpecies, gameFormat);
        if (legalAbilities === LEGALITY_UNAVAILABLE) {
          return { success: false, errors: [UNAVAILABLE] };
        }
        if (legalAbilities !== undefined && !legalAbilities.has(mon.ability)) {
          legalityErrors.push(
            `${label}'s ability "${mon.ability}" is not legal in this format.`
          );
        }
      }
      if (
        mon.tera_type &&
        legalTera !== undefined &&
        !legalTera.has(mon.tera_type)
      ) {
        legalityErrors.push(
          `${label}'s Tera type "${mon.tera_type}" is not allowed in this format.`
        );
      }
      const moves = [mon.move1, mon.move2, mon.move3, mon.move4].filter(
        (m): m is string => Boolean(m)
      );
      if (moves.length > 0) {
        const legalMoves = getLegalMoves(species, gameFormat);
        if (legalMoves === LEGALITY_UNAVAILABLE) {
          return { success: false, errors: [UNAVAILABLE] };
        }
        if (legalMoves !== undefined) {
          for (const move of moves) {
            if (!legalMoves.has(move)) {
              legalityErrors.push(
                `${label} cannot legally use "${move}" in this format.`
              );
            }
          }
        }
      }
    }

    if (legalityErrors.length > 0) {
      return { success: false, errors: legalityErrors };
    }
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
    success: true,
    teamId,
    pokemonCount: teamPokemon.length,
    teamName: team.name ?? "Unnamed Team",
    species: teamPokemon.map((mon) => mon.species ?? "Unknown"),
  };
}
