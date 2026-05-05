/**
 * Transfer Team API Route
 *
 * POST /api/teams/:teamId/transfer — Transfer a team to a different alt owned by the same user.
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  type ActionResult,
  positiveIntSchema,
  transferTeamInputSchema,
  ZodError,
} from "@trainers/validators";
import { getErrorMessage } from "@trainers/utils";

import { createClient } from "@/lib/supabase/server";
import { invalidateTeamDetailCache } from "@/lib/cache-invalidation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId: teamIdStr } = await params;
    const teamId = positiveIntSchema.parse(teamIdStr);

    const body = await request.json();
    const parsed = transferTeamInputSchema.safeParse({
      teamId,
      targetAltId: body.targetAltId,
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

    // Verify the target alt belongs to this user
    const { data: targetAlt, error: targetAltError } = await supabase
      .from("alts")
      .select("id")
      .eq("id", parsed.data.targetAltId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (targetAltError) {
      const result: ActionResult = {
        success: false,
        error: getErrorMessage(targetAltError, "Failed to verify alt ownership"),
      };
      return NextResponse.json(result, { status: 500 });
    }
    if (!targetAlt) {
      const result: ActionResult = {
        success: false,
        error: "Target alt not found or not owned by you.",
      };
      return NextResponse.json(result, { status: 403 });
    }

    const { data, error } = await supabase
      .from("teams")
      .update({ created_by: parsed.data.targetAltId })
      .eq("id", parsed.data.teamId)
      .select("id")
      .single();

    if (error || !data) {
      const result: ActionResult = {
        success: false,
        error: "Failed to transfer team — team not found or access denied.",
      };
      return NextResponse.json(result, { status: 404 });
    }

    invalidateTeamDetailCache(parsed.data.teamId);

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
      error: getErrorMessage(error, "Failed to transfer team", process.env.NODE_ENV === "production"),
    };
    return NextResponse.json(result, { status: 500 });
  }
}
