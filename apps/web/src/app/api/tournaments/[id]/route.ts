/**
 * Tournament Detail API Routes
 *
 * RESTful endpoints for specific tournament operations.
 */

import { type NextRequest, NextResponse } from "next/server";
import { getTournamentById, updateTournament } from "@trainers/supabase/server";
import { type ActionResult } from "@trainers/validators";

/**
 * GET /api/tournaments/:id
 * Get tournament details by ID
 */
export async function GET(
  _request: NextRequest,
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

    const tournament = await getTournamentById(tournamentId);

    if (!tournament) {
      const result: ActionResult = {
        success: false,
        error: "Tournament not found",
      };
      return NextResponse.json(result, { status: 404 });
    }

    const result: ActionResult<typeof tournament> = {
      success: true,
      data: tournament,
    };

    return NextResponse.json(result, {
      headers: {
        "Cache-Control":
          "public, max-age=60, s-maxage=60, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    const result: ActionResult = {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to get tournament",
    };

    return NextResponse.json(result, { status: 500 });
  }
}

/**
 * PATCH /api/tournaments/:id
 * Update tournament details
 */
export async function PATCH(
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

    // TODO: Add Zod validation
    await updateTournament(tournamentId, body);

    const result: ActionResult<{ success: true }> = {
      success: true,
      data: { success: true },
    };

    return NextResponse.json(result);
  } catch (error) {
    const result: ActionResult = {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update tournament",
    };

    return NextResponse.json(result, { status: 500 });
  }
}
