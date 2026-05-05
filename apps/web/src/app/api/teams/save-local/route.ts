/**
 * Save Local Team API Route
 *
 * POST /api/teams/save-local — Persist a locally-built team to the user's account.
 * Bulk-creates the team and all its pokemon in sequence.
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  createTeam as createTeamMutation,
  addPokemonToTeam as addPokemonToTeamMutation,
  type TablesInsert,
} from "@trainers/supabase";
import {
  type ActionResult,
  positiveIntSchema,
  pokemonPayloadSchema,
  z,
  ZodError,
} from "@trainers/validators";
import { getErrorMessage } from "@trainers/utils";

import { createClient } from "@/lib/supabase/server";
import { invalidateTeamDetailCache } from "@/lib/cache-invalidation";

// Schema for the save-local request body
const saveLocalBodySchema = z.object({
  altId: positiveIntSchema,
  name: z.string().min(1).max(100),
  format: z.string().min(1),
  pokemon: z.array(pokemonPayloadSchema).max(6),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = saveLocalBodySchema.safeParse(body);
    if (!parsed.success) {
      const result: ActionResult = {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
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

    // Verify the caller owns this alt
    const { data: ownedAlt } = await supabase
      .from("alts")
      .select("id, username")
      .eq("id", parsed.data.altId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!ownedAlt) {
      const result: ActionResult = { success: false, error: "You do not own this alt." };
      return NextResponse.json(result, { status: 403 });
    }

    // Create the team
    const teamResult = await createTeamMutation(
      supabase,
      parsed.data.altId,
      parsed.data.name,
      parsed.data.format
    );

    // Add each pokemon sequentially (position = array index + 1)
    for (let i = 0; i < parsed.data.pokemon.length; i++) {
      const pokemon = parsed.data.pokemon[i]!;
      await addPokemonToTeamMutation(
        supabase,
        teamResult.id,
        pokemon as TablesInsert<"pokemon">,
        i + 1
      );
    }

    invalidateTeamDetailCache(teamResult.id);

    const redirectUrl = `/dashboard/alts/${ownedAlt.username}/teams/${teamResult.id}`;
    const result: ActionResult<{ teamId: number; redirectUrl: string }> = {
      success: true,
      data: { teamId: teamResult.id, redirectUrl },
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
      error: getErrorMessage(error, "Failed to save local team", process.env.NODE_ENV === "production"),
    };
    return NextResponse.json(result, { status: 500 });
  }
}
