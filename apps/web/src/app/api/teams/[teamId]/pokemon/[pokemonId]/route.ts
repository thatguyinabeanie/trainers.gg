/**
 * Pokemon Detail API Routes
 *
 * PATCH /api/teams/:teamId/pokemon/:pokemonId — Update a pokemon's data.
 * DELETE /api/teams/:teamId/pokemon/:pokemonId — Remove a pokemon from a team.
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  updatePokemon as updatePokemonMutation,
  removePokemonFromTeam as removePokemonFromTeamMutation,
  getTeamWithPokemon,
  type TablesUpdate,
} from "@trainers/supabase";
import {
  type ActionResult,
  positiveIntSchema,
  pokemonUpdateSchema,
  ZodError,
} from "@trainers/validators";
import { getErrorMessage } from "@trainers/utils";

import { createClient } from "@/lib/supabase/server";
import { invalidateTeamDetailCache } from "@/lib/cache-invalidation";
import { findLegalityViolation } from "@/actions/_legality";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; pokemonId: string }> }
) {
  try {
    const { teamId: teamIdStr, pokemonId: pokemonIdStr } = await params;
    const teamId = positiveIntSchema.parse(teamIdStr);
    const pokemonId = positiveIntSchema.parse(pokemonIdStr);

    const body = await request.json();
    const parsedData = pokemonUpdateSchema.safeParse(body);
    if (!parsedData.success) {
      const result: ActionResult = {
        success: false,
        error: parsedData.error.issues[0]?.message ?? "Invalid pokemon data",
      };
      return NextResponse.json(result, { status: 400 });
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      const result: ActionResult = { success: false, error: "Not authenticated." };
      return NextResponse.json(result, { status: 401 });
    }

    // Legality guard — merge current fields with incoming updates
    const team = await getTeamWithPokemon(supabase, teamId);
    if (team === null) {
      const result: ActionResult = {
        success: false,
        error: "Team not found. It may have been deleted.",
      };
      return NextResponse.json(result, { status: 404 });
    }
    if (team.format) {
      const currentSlot = team.team_pokemon.find(
        (slot) => slot.pokemon_id === pokemonId
      );
      const currentPokemon = currentSlot?.pokemon;
      if (!currentPokemon) {
        const result: ActionResult = {
          success: false,
          error: "Pokemon not found on this team.",
        };
        return NextResponse.json(result, { status: 404 });
      }
      const merged = { ...currentPokemon, ...parsedData.data };
      const violation = findLegalityViolation(merged, team.format);
      if (violation) {
        const result: ActionResult = { success: false, error: violation };
        return NextResponse.json(result, { status: 422 });
      }
    }

    await updatePokemonMutation(
      supabase,
      teamId,
      pokemonId,
      parsedData.data as Partial<TablesUpdate<"pokemon">>
    );
    invalidateTeamDetailCache(teamId);

    const result: ActionResult = { success: true, data: undefined };
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      const result: ActionResult = {
        success: false,
        error: error.issues[0]?.message ?? "Invalid input",
      };
      return NextResponse.json(result, { status: 400 });
    }
    const result: ActionResult = {
      success: false,
      error: getErrorMessage(error, "Failed to update pokemon", process.env.NODE_ENV === "production"),
    };
    return NextResponse.json(result, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; pokemonId: string }> }
) {
  try {
    const { teamId: teamIdStr, pokemonId: pokemonIdStr } = await params;
    const teamId = positiveIntSchema.parse(teamIdStr);
    const pokemonId = positiveIntSchema.parse(pokemonIdStr);

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      const result: ActionResult = { success: false, error: "Not authenticated." };
      return NextResponse.json(result, { status: 401 });
    }

    await removePokemonFromTeamMutation(supabase, teamId, pokemonId);
    invalidateTeamDetailCache(teamId);

    const result: ActionResult = { success: true, data: undefined };
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      const result: ActionResult = {
        success: false,
        error: "Invalid input",
      };
      return NextResponse.json(result, { status: 400 });
    }
    const result: ActionResult = {
      success: false,
      error: getErrorMessage(error, "Failed to remove pokemon", process.env.NODE_ENV === "production"),
    };
    return NextResponse.json(result, { status: 500 });
  }
}
