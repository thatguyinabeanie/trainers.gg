/**
 * Reorder Pokemon API Route
 *
 * PATCH /api/teams/:teamId/pokemon/reorder — Reorder pokemon positions within a team.
 */

import { type NextRequest, NextResponse } from "next/server";
import { reorderTeamPokemon as reorderTeamPokemonMutation } from "@trainers/supabase";
import {
  type ActionResult,
  positiveIntSchema,
  reorderTeamPokemonInputSchema,
  ZodError,
} from "@trainers/validators";
import { getErrorMessage } from "@trainers/utils";

import { createClient } from "@/lib/supabase/server";
import { revalidateTeamDetailCache } from "@/lib/cache-invalidation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId: teamIdStr } = await params;
    const teamId = positiveIntSchema.parse(teamIdStr);

    const body = await request.json();
    const parsed = reorderTeamPokemonInputSchema.safeParse({
      teamId,
      positions: body.positions,
    });
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

    await reorderTeamPokemonMutation(
      supabase,
      parsed.data.teamId,
      parsed.data.positions
    );
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
      error: getErrorMessage(error, "Failed to reorder team pokemon", process.env.NODE_ENV === "production"),
    };
    return NextResponse.json(result, { status: 500 });
  }
}
