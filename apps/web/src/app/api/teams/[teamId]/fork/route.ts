/**
 * Fork Team API Route
 *
 * POST /api/teams/:teamId/fork — Fork a team (full copy with parent reference).
 */

import { type NextRequest, NextResponse } from "next/server";
import { forkTeam as forkTeamMutation } from "@trainers/supabase";
import {
  type ActionResult,
  positiveIntSchema,
  forkTeamInputSchema,
  ZodError,
} from "@trainers/validators";
import { getErrorMessage } from "@trainers/utils";

import { createClient } from "@/lib/supabase/server";
import { revalidateTeamDetailCache } from "@/lib/cache-invalidation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId: teamIdStr } = await params;
    const sourceTeamId = positiveIntSchema.parse(teamIdStr);

    const body = await request.json();
    const parsed = forkTeamInputSchema.safeParse({
      sourceTeamId,
      targetAltId: body.targetAltId,
      newName: body.newName,
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

    const teamResult = await forkTeamMutation(
      supabase,
      parsed.data.sourceTeamId,
      parsed.data.targetAltId,
      parsed.data.newName
    );
    revalidateTeamDetailCache(teamResult.id);

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
      error: getErrorMessage(error, "Failed to fork team", process.env.NODE_ENV === "production"),
    };
    return NextResponse.json(result, { status: 500 });
  }
}
