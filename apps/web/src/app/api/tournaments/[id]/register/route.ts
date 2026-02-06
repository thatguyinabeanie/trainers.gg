/**
 * Tournament Registration API Route
 */

import { type NextRequest, NextResponse } from "next/server";
import { registerForTournament } from "@trainers/supabase/server";
import { type ActionResult } from "@trainers/validators";

/**
 * POST /api/tournaments/:id/register
 * Register for a tournament
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tournamentId = parseInt(id, 10);

    if (isNaN(tournamentId)) {
      const result: ActionResult = {
        success: false,
        error: "Invalid tournament ID",
      };
      return NextResponse.json(result, { status: 400 });
    }

    const body = await request.json();
    const { altId } = body;

    if (!altId) {
      const result: ActionResult = {
        success: false,
        error: "Alt ID is required",
      };
      return NextResponse.json(result, { status: 400 });
    }

    await registerForTournament(tournamentId, { altId });

    const result: ActionResult<{ success: true }> = {
      success: true,
      data: { success: true },
    };

    return NextResponse.json(result);
  } catch (error) {
    const result: ActionResult = {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to register for tournament",
    };

    return NextResponse.json(result, { status: 500 });
  }
}
