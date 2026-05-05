/**
 * Team Pokemon API Route
 *
 * POST /api/teams/:teamId/pokemon — Add a pokemon to a team at a given position.
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  addPokemonToTeam as addPokemonToTeamMutation,
  getTeamWithPokemon,
  type TablesInsert,
} from "@trainers/supabase";
import {
  type ActionResult,
  positiveIntSchema,
  addPokemonInputSchema,
  pokemonPayloadSchema,
  ZodError,
} from "@trainers/validators";
import { getErrorMessage } from "@trainers/utils";

import { createClient } from "@/lib/supabase/server";
import { invalidateTeamDetailCache } from "@/lib/cache-invalidation";
import { findLegalityViolation } from "@/actions/_legality";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId: teamIdStr } = await params;
    const teamId = positiveIntSchema.parse(teamIdStr);

    const body = await request.json();
    const parsed = addPokemonInputSchema.safeParse({
      teamId,
      position: body.position,
    });
    if (!parsed.success) {
      const result: ActionResult = {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
      return NextResponse.json(result, { status: 400 });
    }

    const parsedPokemon = pokemonPayloadSchema.safeParse(body.pokemon);
    if (!parsedPokemon.success) {
      const result: ActionResult = {
        success: false,
        error: parsedPokemon.error.issues[0]?.message ?? "Invalid pokemon data",
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

    // Legality guard
    const team = await getTeamWithPokemon(supabase, teamId);
    if (team === null) {
      const result: ActionResult = {
        success: false,
        error: "Team not found. It may have been deleted.",
      };
      return NextResponse.json(result, { status: 404 });
    }
    if (team.format) {
      const violation = findLegalityViolation(parsedPokemon.data, team.format);
      if (violation) {
        const result: ActionResult = { success: false, error: violation };
        return NextResponse.json(result, { status: 422 });
      }
    }

    const pokemonResult = await addPokemonToTeamMutation(
      supabase,
      parsed.data.teamId,
      parsedPokemon.data as TablesInsert<"pokemon">,
      parsed.data.position
    );
    invalidateTeamDetailCache(teamId);

    const result: ActionResult<{ pokemonId: number }> = {
      success: true,
      data: { pokemonId: pokemonResult.pokemonId },
    };
    return NextResponse.json(result, { status: 201 });
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
      error: getErrorMessage(error, "Failed to add pokemon to team", process.env.NODE_ENV === "production"),
    };
    return NextResponse.json(result, { status: 500 });
  }
}
