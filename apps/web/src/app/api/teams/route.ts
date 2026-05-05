/**
 * Teams API Route
 *
 * POST /api/teams — Create a new team for an alt.
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  createTeam as createTeamMutation,
} from "@trainers/supabase";
import {
  type ActionResult,
  createTeamInputSchema,
  ZodError,
} from "@trainers/validators";
import { getErrorMessage } from "@trainers/utils";

import { createClient } from "@/lib/supabase/server";
import { invalidateTeamDetailCache } from "@/lib/cache-invalidation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createTeamInputSchema.safeParse(body);
    if (!parsed.success) {
      const result: ActionResult = {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
      return NextResponse.json(result, { status: 400 });
    }

    const supabase = await createClient();

    // Verify the caller owns this alt
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      const result: ActionResult = { success: false, error: "Not authenticated." };
      return NextResponse.json(result, { status: 401 });
    }

    const { data: ownedAlt } = await supabase
      .from("alts")
      .select("id")
      .eq("id", parsed.data.altId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!ownedAlt) {
      const result: ActionResult = { success: false, error: "You do not own this alt." };
      return NextResponse.json(result, { status: 403 });
    }

    const teamResult = await createTeamMutation(
      supabase,
      parsed.data.altId,
      parsed.data.name,
      parsed.data.format
    );
    invalidateTeamDetailCache(teamResult.id);

    const result: ActionResult<{ id: number }> = {
      success: true,
      data: { id: teamResult.id },
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
      error: getErrorMessage(error, "Failed to create team", process.env.NODE_ENV === "production"),
    };
    return NextResponse.json(result, { status: 500 });
  }
}
