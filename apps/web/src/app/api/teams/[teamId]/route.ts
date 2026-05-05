/**
 * Team Detail API Routes
 *
 * PATCH /api/teams/:teamId — Update team metadata.
 * DELETE /api/teams/:teamId — Delete a team and all its pokemon.
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  updateTeam as updateTeamMutation,
  deleteTeam as deleteTeamMutation,
  getTeamWithPokemon,
} from "@trainers/supabase";
import {
  type ActionResult,
  positiveIntSchema,
  teamUpdateDataSchema,
  ZodError,
} from "@trainers/validators";
import { getErrorMessage } from "@trainers/utils";

import { createClient } from "@/lib/supabase/server";
import { revalidateTeamDetailCache } from "@/lib/cache-invalidation";
import { checkFormatChangeLegality } from "@/actions/format-legality-guard";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId: teamIdStr } = await params;
    const teamId = positiveIntSchema.parse(teamIdStr);

    const body = await request.json();
    const parsedData = teamUpdateDataSchema.safeParse(body);
    if (!parsedData.success) {
      const result: ActionResult = {
        success: false,
        error: parsedData.error.issues[0]?.message ?? "Invalid data",
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

    // Format-change legality guard
    if (parsedData.data.format !== undefined) {
      const team = await getTeamWithPokemon(supabase, teamId);
      if (team === null) {
        const result: ActionResult = {
          success: false,
          error: "Team not found. It may have been deleted.",
        };
        return NextResponse.json(result, { status: 404 });
      }
      const guard = checkFormatChangeLegality(
        team.team_pokemon,
        team.format,
        parsedData.data.format
      );
      if (!guard.ok) {
        const result: ActionResult = {
          success: false,
          error: `These Pokémon aren't legal in the target format: ${guard.illegal.join(", ")}. Remove them before changing format.`,
        };
        return NextResponse.json(result, { status: 422 });
      }
    }

    await updateTeamMutation(supabase, teamId, parsedData.data);
    revalidateTeamDetailCache(teamId);

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
      error: getErrorMessage(error, "Failed to update team", process.env.NODE_ENV === "production"),
    };
    return NextResponse.json(result, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId: teamIdStr } = await params;
    const teamId = positiveIntSchema.parse(teamIdStr);

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      const result: ActionResult = { success: false, error: "Not authenticated." };
      return NextResponse.json(result, { status: 401 });
    }

    await deleteTeamMutation(supabase, teamId);
    revalidateTeamDetailCache(teamId);

    const result: ActionResult = { success: true, data: undefined };
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      const result: ActionResult = {
        success: false,
        error: "Invalid team ID",
      };
      return NextResponse.json(result, { status: 400 });
    }
    const result: ActionResult = {
      success: false,
      error: getErrorMessage(error, "Failed to delete team", process.env.NODE_ENV === "production"),
    };
    return NextResponse.json(result, { status: 500 });
  }
}
