/**
 * Tournament API Routes
 *
 * RESTful endpoints for mobile app (and future external clients).
 * Calls the same service layer functions as Server Actions.
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  listTournamentsService,
  createTournamentService,
} from "@/lib/services/tournaments";
import { type ActionResult } from "@trainers/validators";

/**
 * GET /api/tournaments
 * List all tournaments grouped by status (active, upcoming, completed)
 */
export async function GET(_request: NextRequest) {
  try {
    const tournaments = await listTournamentsService({ completedLimit: 10 });

    const result: ActionResult<typeof tournaments> = {
      success: true,
      data: tournaments,
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
        error instanceof Error ? error.message : "Failed to list tournaments",
    };

    return NextResponse.json(result, { status: 500 });
  }
}

/**
 * POST /api/tournaments
 * Create a new tournament
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // TODO: Add Zod validation
    const tournament = await createTournamentService(body);

    const result: ActionResult<typeof tournament> = {
      success: true,
      data: tournament,
    };

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const result: ActionResult = {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create tournament",
    };

    return NextResponse.json(result, { status: 500 });
  }
}
